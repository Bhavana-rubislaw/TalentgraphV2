"""
Candidate onboarding routes with resume-assisted profile creation
Supports manual fill and resume auto-parse paths
"""

import logging
import json
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlmodel import Session, select
from typing import Optional
from pathlib import Path
from datetime import datetime
import shutil

from app.database import get_session
from app.models import User, Candidate, ResumeDraftProfile, ParseStatus, ReviewStatus
from app.schemas import (
    ResumeDraftProfileRead,
    ResumeDraftProfileUpdate,
    ResumeDraftFinalizeRequest,
    CandidateCreate
)
from app.security import get_current_user
from app.services.resume_parser import ResumeParser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/candidates/onboarding", tags=["Candidate Onboarding"])

# Create uploads directory for resume drafts
DRAFT_UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "resume_drafts"
DRAFT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-resume", response_model=ResumeDraftProfileRead)
async def upload_resume_and_create_draft(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Upload resume, parse it, and create a draft profile.
    This does NOT create the final Candidate profile.
    """
    logger.info(f"[RESUME ONBOARDING] Resume upload request from user: {current_user['email']}")
    
    # Get user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has a completed candidate profile
    existing_candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if existing_candidate and existing_candidate.profile_complete:
        raise HTTPException(
            status_code=400,
            detail="Profile already complete. Use profile update endpoint instead."
        )
    
    # Validate file type
    allowed_extensions = ['.pdf', '.docx', '.doc']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Delete existing draft if present
    existing_draft = session.exec(
        select(ResumeDraftProfile).where(ResumeDraftProfile.user_id == user.id)
    ).first()
    if existing_draft:
        logger.info(f"[RESUME ONBOARDING] Deleting existing draft for user {user.id}")
        session.delete(existing_draft)
        session.commit()
    
    # Save uploaded file
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"user_{user.id}_{timestamp}{file_ext}"
    file_path = DRAFT_UPLOAD_DIR / safe_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"[RESUME ONBOARDING] Resume saved to: {file_path}")
    except Exception as e:
        logger.error(f"[RESUME ONBOARDING] Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save resume file")
    
    # Create draft record (parsing status = PARSING)
    draft = ResumeDraftProfile(
        user_id=user.id,
        resume_filename=file.filename,
        resume_storage_path=str(file_path),
        parse_status=ParseStatus.PARSING,
        review_status=ReviewStatus.PENDING
    )
    session.add(draft)
    session.commit()
    session.refresh(draft)
    
    # Parse resume
    try:
        logger.info(f"[RESUME ONBOARDING] Starting resume parsing for draft {draft.id}")
        
        # Extract text from file
        text = ResumeParser.extract_text_from_file(str(file_path))
        logger.info(f"[RESUME ONBOARDING] Extracted {len(text)} characters from resume")
        
        # Parse fields
        parsed_data = ResumeParser.parse_resume(text)
        
        # Update draft with parsed data
        for field, value in parsed_data.items():
            if hasattr(draft, field):
                setattr(draft, field, value)
        
        # Identify missing required fields
        missing_fields = ResumeParser.identify_missing_required_fields(parsed_data)
        draft.missing_required_fields = json.dumps(missing_fields)
        
        # Mark parsing as complete
        draft.parse_status = ParseStatus.COMPLETED
        draft.updated_at = datetime.utcnow()
        
        session.add(draft)
        session.commit()
        session.refresh(draft)
        
        logger.info(
            f"[RESUME ONBOARDING] Parsing complete. "
            f"Extracted {sum(1 for k in parsed_data.keys() if not k.endswith('_confidence') and parsed_data[k])} fields. "
            f"Missing {len(missing_fields)} required fields."
        )
        
    except Exception as e:
        logger.error(f"[RESUME ONBOARDING] Parsing failed: {e}")
        draft.parse_status = ParseStatus.FAILED
        draft.parse_error = str(e)
        session.add(draft)
        session.commit()
        session.refresh(draft)
        
        raise HTTPException(
            status_code=500,
            detail=f"Resume parsing failed: {str(e)}"
        )
    
    # Convert to response format
    response = _draft_to_response(draft)
    return response


@router.get("/draft", response_model=ResumeDraftProfileRead)
def get_draft_profile(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get the current draft profile (if exists)"""
    logger.info(f"[RESUME ONBOARDING] Get draft request from user: {current_user['email']}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    draft = session.exec(
        select(ResumeDraftProfile).where(ResumeDraftProfile.user_id == user.id)
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="No draft profile found")
    
    return _draft_to_response(draft)


@router.put("/draft", response_model=ResumeDraftProfileRead)
def update_draft_profile(
    update_data: ResumeDraftProfileUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update draft profile with user corrections before finalization"""
    logger.info(f"[RESUME ONBOARDING] Update draft request from user: {current_user['email']}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    draft = session.exec(
        select(ResumeDraftProfile).where(ResumeDraftProfile.user_id == user.id)
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="No draft profile found")
    
    # Update fields that were provided
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(draft, field):
            setattr(draft, field, value)
    
    # Recalculate missing required fields
    parsed_data = {
        'name': draft.name,
        'email': draft.email,
        'phone': draft.phone,
        'residential_address': draft.residential_address,
        'location_state': draft.location_state,
        'location_county': draft.location_county,
        'location_zipcode': draft.location_zipcode,
        'name_confidence': draft.name_confidence or 1.0,
        'email_confidence': draft.email_confidence or 1.0,
        'phone_confidence': draft.phone_confidence or 1.0,
        'residential_address_confidence': draft.residential_address_confidence or 1.0,
        'location_state_confidence': draft.location_state_confidence or 1.0,
        'location_county_confidence': draft.location_county_confidence or 1.0,
        'location_zipcode_confidence': draft.location_zipcode_confidence or 1.0,
    }
    
    missing_fields = ResumeParser.identify_missing_required_fields(parsed_data)
    draft.missing_required_fields = json.dumps(missing_fields)
    draft.updated_at = datetime.utcnow()
    
    session.add(draft)
    session.commit()
    session.refresh(draft)
    
    logger.info(f"[RESUME ONBOARDING] Draft updated. Missing fields: {missing_fields}")
    
    return _draft_to_response(draft)


@router.post("/finalize", response_model=dict)
def finalize_draft_and_create_profile(
    finalize_request: ResumeDraftFinalizeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Finalize draft profile and create actual Candidate profile.
    Performs strict validation on required fields.
    Onboarding is complete only after this succeeds.
    """
    logger.info(f"[RESUME ONBOARDING] Finalize request from user: {current_user['email']}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    draft = session.exec(
        select(ResumeDraftProfile).where(ResumeDraftProfile.user_id == user.id)
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="No draft profile found")
    
    # Check if parsing was successful
    if draft.parse_status != ParseStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize: parsing status is {draft.parse_status}"
        )
    
    # Strict validation: check all required fields (same as CandidateCreate)
    required_fields = {
        'name': draft.name,
        'email': draft.email,
        'phone': draft.phone,
        'residential_address': draft.residential_address,
        'location_state': draft.location_state,
        'location_county': draft.location_county,
        'location_zipcode': draft.location_zipcode,
    }
    
    missing = [field for field, value in required_fields.items() if not value or not str(value).strip()]
    
    if missing:
        logger.warning(f"[RESUME ONBOARDING] Finalization failed - missing required fields: {missing}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required fields. Please fill all mandatory information.",
                "missing_fields": missing
            }
        )
    
    # Check if candidate profile already exists
    existing_candidate = session.exec(
        select(Candidate).where(Candidate.user_id == user.id)
    ).first()
    
    if existing_candidate:
        logger.warning(f"[RESUME ONBOARDING] Candidate profile already exists for user {user.id}")
        raise HTTPException(status_code=400, detail="Candidate profile already exists")
    
    # Create Candidate profile from draft
    try:
        candidate = Candidate(
            user_id=user.id,
            name=draft.name,
            email=draft.email,
            phone=draft.phone,
            residential_address=draft.residential_address,
            location_state=draft.location_state,
            location_county=draft.location_county,
            location_zipcode=draft.location_zipcode,
            linkedin_url=draft.linkedin_url,
            github_url=draft.github_url,
            portfolio_url=draft.portfolio_url,
            profile_summary=draft.profile_summary,
            profile_complete=True  # Mark as complete since all required fields are present
        )
        
        session.add(candidate)
        
        # Mark draft as reviewed and finalized
        draft.review_status = ReviewStatus.REVIEWED
        draft.finalized_at = datetime.utcnow()
        session.add(draft)
        
        session.commit()
        session.refresh(candidate)
        
        logger.info(
            f"[RESUME ONBOARDING] Candidate profile created successfully - "
            f"Candidate ID: {candidate.id}, User: {user.email}"
        )
        
        return {
            "message": "Profile finalized successfully",
            "candidate_id": candidate.id,
            "profile_complete": True,
            "name": candidate.name,
            "email": candidate.email
        }
        
    except Exception as e:
        logger.error(f"[RESUME ONBOARDING] Error creating candidate profile: {e}")
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create candidate profile: {str(e)}"
        )


@router.delete("/draft")
def delete_draft_profile(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete draft profile (user wants to start over or use manual path)"""
    logger.info(f"[RESUME ONBOARDING] Delete draft request from user: {current_user['email']}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    draft = session.exec(
        select(ResumeDraftProfile).where(ResumeDraftProfile.user_id == user.id)
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="No draft profile found")
    
    # Delete resume file if exists
    try:
        file_path = Path(draft.resume_storage_path)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"[RESUME ONBOARDING] Deleted resume file: {file_path}")
    except Exception as e:
        logger.warning(f"[RESUME ONBOARDING] Could not delete resume file: {e}")
    
    session.delete(draft)
    session.commit()
    
    logger.info(f"[RESUME ONBOARDING] Draft deleted for user {user.id}")
    
    return {"message": "Draft profile deleted successfully"}


def _draft_to_response(draft: ResumeDraftProfile) -> ResumeDraftProfileRead:
    """Convert draft model to response schema"""
    missing_fields = None
    if draft.missing_required_fields:
        try:
            missing_fields = json.loads(draft.missing_required_fields)
        except json.JSONDecodeError:
            missing_fields = []
    
    return ResumeDraftProfileRead(
        id=draft.id,
        user_id=draft.user_id,
        resume_filename=draft.resume_filename,
        name=draft.name,
        email=draft.email,
        phone=draft.phone,
        residential_address=draft.residential_address,
        location_state=draft.location_state,
        location_county=draft.location_county,
        location_zipcode=draft.location_zipcode,
        linkedin_url=draft.linkedin_url,
        github_url=draft.github_url,
        portfolio_url=draft.portfolio_url,
        profile_summary=draft.profile_summary,
        name_confidence=draft.name_confidence,
        email_confidence=draft.email_confidence,
        phone_confidence=draft.phone_confidence,
        residential_address_confidence=draft.residential_address_confidence,
        location_state_confidence=draft.location_state_confidence,
        location_county_confidence=draft.location_county_confidence,
        location_zipcode_confidence=draft.location_zipcode_confidence,
        linkedin_url_confidence=draft.linkedin_url_confidence,
        github_url_confidence=draft.github_url_confidence,
        portfolio_url_confidence=draft.portfolio_url_confidence,
        profile_summary_confidence=draft.profile_summary_confidence,
        parse_status=draft.parse_status.value,
        review_status=draft.review_status.value,
        missing_required_fields=missing_fields,
        parse_error=draft.parse_error,
        created_at=draft.created_at,
        updated_at=draft.updated_at
    )
