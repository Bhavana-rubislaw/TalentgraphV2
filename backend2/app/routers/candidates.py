"""
Candidate routes
Profile management, job profiles, applications, file uploads
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
        "email": candidate.email
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
    
    session.add(candidate)
    session.commit()
    session.refresh(candidate)
    logger.info(f"[CANDIDATE PROFILE] Profile updated successfully - Candidate ID: {candidate.id}")
    
    return {"message": "Profile updated", "candidate_id": candidate.id}


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
    """Upload a resume file"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Create unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{candidate.id}_{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / "resumes" / filename
    file_path.parent.mkdir(exist_ok=True)
    
    # Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database
    resume = Resume(
        candidate_id=candidate.id,
        filename=file.filename,
        storage_path=str(file_path)
    )
    session.add(resume)
    session.commit()
    session.refresh(resume)
    
    return {
        "message": "Resume uploaded successfully",
        "resume_id": resume.id,
        "filename": resume.filename
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
    """Upload a certification file"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Create unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{candidate.id}_{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / "certifications" / filename
    file_path.parent.mkdir(exist_ok=True)
    
    # Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database
    certification = Certification(
        candidate_id=candidate.id,
        name=name or file.filename,
        issuer=issuer,
        filename=file.filename,
        storage_path=str(file_path),
        issued_date=issued_date,
        expiry_date=expiry_date
    )
    session.add(certification)
    session.commit()
    session.refresh(certification)
    
    return {
        "message": "Certification uploaded successfully",
        "certification_id": certification.id,
        "name": certification.name
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
