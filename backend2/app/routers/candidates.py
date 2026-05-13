"""
Candidate routes
Profile management, job profiles, applications, file uploads
Resume parsing endpoint added for job preferences auto-fill
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlmodel import Session, select
from typing import List, Optional
from pathlib import Path
import shutil
from datetime import datetime
from app.database import get_session
from app.models import Candidate, JobProfile, User, Resume, Certification, Skill, LocationPreference
from app.schemas import (
    CandidateRead, CandidateCreate, JobProfileRead, JobProfileCreate,
    ResumeRead, CertificationRead, SkillCreate, LocationPreferenceCreate
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/candidates", tags=["Candidates"])

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@router.get("/profile-status", response_model=dict)
def get_candidate_profile_status(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Check if candidate profile setup is complete"""
    logger.info(f"[CANDIDATE PROFILE] Profile status check for user: {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[CANDIDATE PROFILE] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        logger.info(f"[CANDIDATE PROFILE] No profile found for user ID: {user.id}")
        return {"profile_complete": False, "profile_exists": False}
    
    logger.info(f"[CANDIDATE PROFILE] Profile status - Complete: {candidate.profile_complete}")
    return {
        "profile_complete": candidate.profile_complete,
        "profile_exists": True,
        "candidate_id": candidate.id,
        "name": candidate.name
    }


@router.post("/profile", response_model=dict)
def create_candidate_profile(
    candidate_data: CandidateCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create candidate profile after signup"""
    logger.info(f"[CANDIDATE PROFILE] Create profile request for user: {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[CANDIDATE PROFILE] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if candidate already exists
    existing = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if existing:
        logger.warning(f"[CANDIDATE PROFILE] Profile already exists for user ID: {user.id}")
        raise HTTPException(status_code=400, detail="Candidate profile already exists")
    
    candidate = Candidate(
        user_id=user.id,
        profile_complete=True,
        **candidate_data.dict()
    )
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    logger.info(f"[CANDIDATE PROFILE] Profile created successfully - Candidate ID: {candidate.id}, User: {user.email}")
    
    return {
        "message": "Candidate profile created",
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "profile_complete": True
    }


@router.get("/profile", response_model=CandidateRead)
def get_candidate_profile(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get candidate's profile"""
    logger.info(f"[CANDIDATE PROFILE] Get profile request for user: {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[CANDIDATE PROFILE] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        logger.error(f"[CANDIDATE PROFILE] Candidate profile not found for user ID: {user.id}")
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    logger.info(f"[CANDIDATE PROFILE] Profile retrieved successfully - Candidate ID: {candidate.id}")
    return candidate


@router.put("/profile", response_model=dict)
def update_candidate_profile(
    candidate_data: CandidateCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update candidate profile"""
    logger.info(f"[CANDIDATE PROFILE] Update profile request for user: {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[CANDIDATE PROFILE] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        logger.error(f"[CANDIDATE PROFILE] Candidate profile not found for user ID: {user.id}")
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Update fields
    for key, value in candidate_data.dict().items():
        setattr(candidate, key, value)
    
    # Mark profile as complete when updated
    candidate.profile_complete = True
    
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    logger.info(f"[CANDIDATE PROFILE] Profile updated successfully - Candidate ID: {candidate.id}")
    
    return {
        "message": "Profile updated",
        "candidate_id": candidate.id,
        "profile_complete": True
    }


@router.post("/job-profiles", response_model=dict)
def create_job_profile(
    job_profile_data: JobProfileCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new job profile (dating app style) with skills and location preferences"""
    logger.info(f"[JOB PROFILE] Create job profile request for user: {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[JOB PROFILE] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        logger.error(f"[JOB PROFILE] Candidate profile not found for user ID: {user.id}")
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Extract nested data
    skills_data = job_profile_data.dict().pop("skills", [])
    location_prefs_data = job_profile_data.dict().pop("location_preferences", [])
    logger.info(f"[JOB PROFILE] Creating profile with {len(skills_data)} skills and {len(location_prefs_data)} locations")
    
    # Create job profile
    job_profile = JobProfile(
        candidate_id=candidate.id,
        **job_profile_data.dict(exclude={"skills", "location_preferences"})
    )
    session.add(job_profile)
    session.commit()
    session.refresh(job_profile)
    logger.info(f"[JOB PROFILE] Job profile created - ID: {job_profile.id}, Candidate ID: {candidate.id}")
    
    # Add skills
    for skill_data in skills_data:
        skill = Skill(
            job_profile_id=job_profile.id,
            **skill_data
        )
        session.add(skill)
    
    # Add location preferences (max 3)
    for loc_data in location_prefs_data[:3]:
        loc_pref = LocationPreference(
            job_profile_id=job_profile.id,
            **loc_data
        )
        session.add(loc_pref)
    
    session.commit()
    session.refresh(job_profile)
    
    return {
        "message": "Job profile created",
        "job_profile_id": job_profile.id,
        "profile_name": job_profile.profile_name
    }


@router.get("/job-profiles", response_model=List[JobProfileRead])
def get_job_profiles(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all job profiles for candidate"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return candidate.job_profiles


@router.get("/skill-catalogs", response_model=dict)
def get_candidate_skill_catalogs():
    """Get skill and certification catalogs for candidate job preferences"""
    from app.routers.job_postings import TECHNICAL_SKILLS_CATALOG, SOFT_SKILLS_CATALOG, CERTIFICATIONS_CATALOG
    return {
        "technical_skills": sorted(TECHNICAL_SKILLS_CATALOG),
        "soft_skills": sorted(SOFT_SKILLS_CATALOG),
        "certifications": sorted(CERTIFICATIONS_CATALOG),
    }


@router.put("/job-profiles/{job_profile_id}", response_model=dict)
def update_job_profile(
    job_profile_id: int,
    job_profile_data: JobProfileCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update a job profile with skills and location preferences"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    # Update scalar fields (exclude nested relationships)
    data_dict = job_profile_data.dict(exclude={"skills", "location_preferences"})
    for key, value in data_dict.items():
        setattr(job_profile, key, value)
    job_profile.updated_at = datetime.utcnow()
    
    # Replace skills: delete old, insert new
    old_skills = session.exec(select(Skill).where(Skill.job_profile_id == job_profile_id)).all()
    for s in old_skills:
        session.delete(s)
    for skill_data in job_profile_data.skills:
        session.add(Skill(job_profile_id=job_profile_id, **skill_data.dict()))
    
    # Replace location preferences: delete old, insert new
    old_locs = session.exec(select(LocationPreference).where(LocationPreference.job_profile_id == job_profile_id)).all()
    for loc in old_locs:
        session.delete(loc)
    for loc_data in job_profile_data.location_preferences[:5]:
        session.add(LocationPreference(job_profile_id=job_profile_id, **loc_data.dict()))
    
    session.add(job_profile)
    session.commit()
    session.refresh(job_profile)
    
    return {"message": "Job profile updated", "job_profile_id": job_profile.id}


@router.delete("/job-profiles/{job_profile_id}", response_model=dict)
def delete_job_profile(
    job_profile_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a job profile"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    session.delete(job_profile)
    session.commit()
    
    return {"message": "Job profile deleted"}


# ============ FILE UPLOADS ============

@router.post("/resumes/upload", response_model=dict)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a resume file with comprehensive security validation"""
    from app.core.file_validation import validate_resume_upload, FileValidator
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Validate file upload (size, type, content, security)
    try:
        content, mime_type, file_hash = validate_resume_upload(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail="File validation failed")
    
    # Sanitize filename
    safe_filename = FileValidator.sanitize_filename(file.filename or "resume")
    
    # Create unique filename with hash prefix for integrity
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{candidate.id}_{timestamp}_{file_hash[:8]}_{safe_filename}"
    file_path = UPLOAD_DIR / "resumes" / filename
    file_path.parent.mkdir(exist_ok=True, parents=True, mode=0o755)
    
    # Save validated content to file
    try:
        with file_path.open("wb") as buffer:
            buffer.write(content)
        # Set restrictive file permissions
        file_path.chmod(0o644)
    except Exception as e:
        logger.error(f"Failed to save resume file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Save to database with metadata
    resume = Resume(
        candidate_id=candidate.id,
        filename=safe_filename,
        storage_path=str(file_path)
    )
    session.add(resume)
    session.commit()
    session.refresh(resume)
    
    logger.info(f"Resume uploaded successfully: candidate={candidate.id}, file={filename}, hash={file_hash[:8]}")
    
    return {
        "message": "Resume uploaded successfully",
        "resume_id": resume.id,
        "filename": resume.filename,
        "file_hash": file_hash[:8],
        "mime_type": mime_type
    }


@router.get("/resumes", response_model=List[ResumeRead])
def get_resumes(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all resumes for current candidate"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return candidate.resumes


@router.delete("/resumes/{resume_id}", response_model=dict)
def delete_resume(
    resume_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a resume"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume = session.get(Resume, resume_id)
    if not resume or resume.candidate.user_id != user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Delete file
    file_path = Path(resume.storage_path)
    if file_path.exists():
        file_path.unlink()
    
    session.delete(resume)
    session.commit()
    
    return {"message": "Resume deleted"}


@router.post("/certifications/upload", response_model=dict)
async def upload_certification(
    file: UploadFile = File(...),
    name: str = "",
    issuer: Optional[str] = None,
    issued_date: Optional[str] = None,
    expiry_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a certification file with comprehensive security validation"""
    from app.core.file_validation import validate_certification_upload, FileValidator
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Validate file upload (size, type, content, security)
    try:
        content, mime_type, file_hash = validate_certification_upload(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Certification validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail="File validation failed")
    
    # Sanitize filename
    safe_filename = FileValidator.sanitize_filename(file.filename or "certification")
    
    # Create unique filename with hash prefix
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{candidate.id}_{timestamp}_{file_hash[:8]}_{safe_filename}"
    file_path = UPLOAD_DIR / "certifications" / filename
    file_path.parent.mkdir(exist_ok=True, parents=True, mode=0o755)
    
    # Save validated content to file
    try:
        with file_path.open("wb") as buffer:
            buffer.write(content)
        file_path.chmod(0o644)
    except Exception as e:
        logger.error(f"Failed to save certification file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Save to database
    certification = Certification(
        candidate_id=candidate.id,
        name=name or safe_filename,
        issuer=issuer,
        filename=safe_filename,
        storage_path=str(file_path),
        issued_date=issued_date,
        expiry_date=expiry_date
    )
    session.add(certification)
    session.commit()
    session.refresh(certification)
    
    logger.info(f"Certification uploaded: candidate={candidate.id}, file={filename}, hash={file_hash[:8]}")
    
    return {
        "message": "Certification uploaded successfully",
        "certification_id": certification.id,
        "name": certification.name,
        "file_hash": file_hash[:8]
    }


@router.get("/certifications", response_model=List[CertificationRead])
def get_certifications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all certifications for current candidate"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return candidate.certifications


@router.delete("/certifications/{certification_id}", response_model=dict)
def delete_certification(
    certification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a certification"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    certification = session.get(Certification, certification_id)
    if not certification or certification.candidate.user_id != user.id:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    # Delete file
    if certification.storage_path:
        file_path = Path(certification.storage_path)
        if file_path.exists():
            file_path.unlink()
    
    session.delete(certification)
    session.commit()
    
    return {"message": "Certification deleted"}


# ============ RESUME PARSING FOR JOB PREFERENCES ============

@router.post("/parse-resume-for-job-preferences", response_model=dict)
async def parse_resume_for_job_preferences(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Parse resume to auto-fill job preference fields (Partial Resume Assist).
    
    This endpoint extracts:
    - Skills (technical)
    - Years of experience
    - Seniority level
    - Job titles / preferred roles
    - Education level
    - Certifications
    - LinkedIn, GitHub, Portfolio URLs
    
    Fields NOT extracted (require manual input):
    - Salary expectations
    - Work type preferences
    - Location preferences
    - Travel willingness
    - Notice period
    - Work authorization
    """
    from app.services.resume_parser import ResumeParser
    
    logger.info(f"[RESUME PARSING] Job preferences parsing request from user: {current_user['email']}")
    
    # Validate user exists
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        logger.error(f"[RESUME PARSING] User not found: {current_user['email']}")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file exists
    if not file.filename:
        logger.error("[RESUME PARSING] No filename provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Log file details
    logger.info(f"[RESUME PARSING] File upload details - Name: {file.filename}, Content-Type: {file.content_type}")
    
    # Validate file type
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
    if file_ext not in allowed_extensions:
        logger.error(f"[RESUME PARSING] Invalid file type: {file_ext}")
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Please upload PDF, DOCX, DOC, or TXT files only. Received: {file_ext}"
        )
    
    # Validate file size (10MB limit)
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    logger.info(f"[RESUME PARSING] File size: {file_size_mb:.2f}MB")
    
    if file_size_mb > 10:
        logger.error(f"[RESUME PARSING] File too large: {file_size_mb:.2f}MB")
        raise HTTPException(
            status_code=400, 
            detail=f"File size must be under 10MB. Your file is {file_size_mb:.2f}MB"
        )
    
    # Validate file is not empty
    if len(content) == 0:
        logger.error("[RESUME PARSING] Empty file uploaded")
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    # Save to temporary file for parsing
    import tempfile
    temp_file_path = None
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"[RESUME PARSING] Starting text extraction from: {file.filename}")
        
        # Extract text from resume
        try:
            resume_text = ResumeParser.extract_text_from_file(temp_file_path)
            
            if not resume_text or len(resume_text.strip()) < 50:
                logger.error("[RESUME PARSING] Insufficient text extracted from resume")
                raise HTTPException(
                    status_code=400, 
                    detail="Could not extract sufficient text from resume. Please ensure the file is not password-protected or corrupted."
                )
            
            logger.info(f"[RESUME PARSING] Successfully extracted {len(resume_text)} characters from resume")
        
        except ImportError as e:
            logger.error(f"[RESUME PARSING] Missing required library: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail="Resume parsing library not available. Please contact support."
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"[RESUME PARSING] Text extraction failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to extract text from resume: {str(e)}. Please ensure the file is readable and not corrupted."
            )
        
        # Parse resume for job preferences
        try:
            logger.info(f"[RESUME PARSING] Starting job preferences parsing for user: {current_user['email']}")
            parsed_data = ResumeParser.parse_resume_for_job_preferences(resume_text)
            
            # Count successfully parsed fields (with confidence > 0.5)
            parsed_field_count = sum(
                1 for k, v in parsed_data.items() 
                if k.endswith('_confidence') and v >= 0.5
            )
            
            logger.info(f"[RESUME PARSING] Successfully parsed {parsed_field_count} fields from resume")
            logger.info(f"[RESUME PARSING] Parsed fields: {[k.replace('_confidence', '') for k, v in parsed_data.items() if k.endswith('_confidence') and v >= 0.5]}")
            
            # Debug: Log all confidence scores
            logger.info(f"[RESUME PARSING] All confidence scores: {[(k, v) for k, v in parsed_data.items() if k.endswith('_confidence')]}")
            
            # Structure response to match frontend expectations
            response = {
                "success": True,
                "message": f"Resume parsed successfully. {parsed_field_count} fields auto-filled.",
                "data": {
                    "skills": parsed_data.get('skills', []),
                    "skills_confidence": parsed_data.get('skills_confidence', 0.0),
                    "years_of_experience": parsed_data.get('years_of_experience'),
                    "years_of_experience_confidence": parsed_data.get('years_of_experience_confidence', 0.0),
                    "seniority_level": parsed_data.get('seniority_level'),
                    "seniority_level_confidence": parsed_data.get('seniority_level_confidence', 0.0),
                    "job_titles": parsed_data.get('job_titles', []),
                    "job_titles_confidence": parsed_data.get('job_titles_confidence', 0.0),
                    "preferred_job_titles": parsed_data.get('preferred_job_titles', []),
                    "preferred_job_titles_confidence": parsed_data.get('preferred_job_titles_confidence', 0.0),
                    "highest_education": parsed_data.get('highest_education'),
                    "highest_education_confidence": parsed_data.get('highest_education_confidence', 0.0),
                    "certifications": parsed_data.get('certifications', []),
                    "certifications_confidence": parsed_data.get('certifications_confidence', 0.0),
                    "linkedin_url": parsed_data.get('linkedin_url'),
                    "linkedin_url_confidence": parsed_data.get('linkedin_url_confidence', 0.0),
                    "github_url": parsed_data.get('github_url'),
                    "github_url_confidence": parsed_data.get('github_url_confidence', 0.0),
                    "portfolio_url": parsed_data.get('portfolio_url'),
                    "portfolio_url_confidence": parsed_data.get('portfolio_url_confidence', 0.0),
                }
            }
            
            logger.info(f"[RESUME PARSING] Parsing completed successfully for user: {current_user['email']}")
            return response
        
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"[RESUME PARSING] Parsing failed with exception: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to parse resume content: {str(e)}. Please try again or contact support."
            )
    
    finally:
        # Clean up temporary file
        if temp_file_path and Path(temp_file_path).exists():
            try:
                Path(temp_file_path).unlink()
                logger.debug(f"[RESUME PARSING] Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"[RESUME PARSING] Failed to delete temporary file: {str(e)}")
