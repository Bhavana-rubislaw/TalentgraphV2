"""
Company routes
Recruiter/Admin company profile management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Company, User
from app.schemas import CompanyRead, CompanyCreate, CompanyProfileSetup, CompanyProfileUpdate
from app.security import get_current_user
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/company", tags=["Company"])


@router.post("/profile", response_model=dict)
def create_company_profile(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create company profile (for recruiters/admins)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if company already exists
    existing = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company profile already exists for this user")
    
    company = Company(
        user_id=user.id,
        **company_data.dict()
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    
    return {
        "message": "Company profile created",
        "company_id": company.id,
        "company_name": company.company_name,
        "employee_type": company.employee_type
    }


@router.get("/profile", response_model=CompanyRead)
def get_company_profile(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get company profile"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    return company


@router.put("/profile", response_model=dict)
def update_company_profile(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update company profile"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    for key, value in company_data.dict().items():
        setattr(company, key, value)
    
    session.add(company)
    session.commit()
    session.refresh(company)
    
    return {"message": "Company profile updated", "company_id": company.id}


@router.post("/setup-profile", response_model=dict)
def setup_company_profile(
    profile_data: CompanyProfileSetup,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Complete company profile setup after signup"""
    logger.info(f"[COMPANY SETUP] Starting profile setup for user: {current_user['email']}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get existing company profile (created during signup)
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Update user full name
    user.full_name = profile_data.full_name
    
    # Update company profile
    company.company_name = profile_data.company_name
    company.employee_type = profile_data.company_role.upper()
    company.company_website = profile_data.company_website
    company.company_location = profile_data.company_location
    company.department = profile_data.department
    company.phone_number = profile_data.phone_number
    company.linkedin_profile = profile_data.linkedin_profile
    company.hiring_focus = profile_data.hiring_focus
    company.company_description = profile_data.company_description
    company.profile_complete = True
    company.updated_at = datetime.utcnow()
    
    session.add(user)
    session.add(company)
    session.commit()
    session.refresh(company)
    
    logger.info(f"[COMPANY SETUP] Profile setup completed for user: {user.email}, company: {company.company_name}")
    
    return {
        "message": "Company profile setup completed",
        "company_id": company.id,
        "company_name": company.company_name,
        "profile_complete": True
    }


@router.get("/profile-status", response_model=dict)
def get_profile_status(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Check if company profile setup is complete"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        return {"profile_complete": False, "company_exists": False}
    
    return {
        "profile_complete": company.profile_complete,
        "company_exists": True,
        "company_name": company.company_name
    }


@router.put("/update-profile", response_model=dict)
def update_extended_profile(
    profile_data: CompanyProfileUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update extended company profile fields"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Update user full_name if provided
    update_data = profile_data.dict(exclude_unset=True)
    if 'full_name' in update_data:
        user.full_name = update_data.pop('full_name')
        session.add(user)

    # Update only provided company fields
    for key, value in update_data.items():
        setattr(company, key, value)

    company.updated_at = datetime.utcnow()

    session.add(company)
    session.commit()
    session.refresh(company)
    
    return {"message": "Company profile updated", "company_id": company.id}
