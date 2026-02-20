"""
Company routes
Recruiter/Admin company profile management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import Company, User
from app.schemas import CompanyRead, CompanyCreate
from app.security import get_current_user

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
