"""
Profile Completion Service
Centralized logic for checking if user profiles are complete.
"""
from typing import Optional
from sqlmodel import Session, select
from app.models import User, Candidate, Company, UserRole


def is_value_complete(value) -> bool:
    """Check if a value is considered complete (not null, not empty string)."""
    if value is None:
        return False
    if isinstance(value, str) and value.strip() == "":
        return False
    return True


def check_candidate_profile_completion(db: Session, user_id: int) -> bool:
    """
    Check if a candidate profile is complete.
    
    Required fields for candidate:
    - name
    - email
    - phone
    - residential_address
    - location_state
    - location_county
    - location_zipcode
    
    Returns:
        bool: True if all required fields are filled, False otherwise
    """
    statement = select(Candidate).where(Candidate.user_id == user_id)
    candidate = db.exec(statement).first()
    
    if not candidate:
        return False
    
    # Check if profile_complete flag is already set
    if candidate.profile_complete:
        return True
    
    # Dynamically check required fields
    required_fields = [
        candidate.name,
        candidate.email,
        candidate.phone,
        candidate.residential_address,
        candidate.location_state,
        candidate.location_county,
        candidate.location_zipcode,
    ]
    
    return all(is_value_complete(field) for field in required_fields)


def check_company_profile_completion(db: Session, user_id: int) -> bool:
    """
    Check if a company/recruiter profile is complete.
    
    Required fields for company:
    - company_name
    - employee_type
    - User.full_name
    
    Returns:
        bool: True if all required fields are filled, False otherwise
    """
    statement = select(Company).where(Company.user_id == user_id)
    company = db.exec(statement).first()
    
    if not company:
        return False
    
    # Check if profile_complete flag is already set
    if company.profile_complete:
        return True
    
    # Get user for full_name check
    user_statement = select(User).where(User.id == user_id)
    user = db.exec(user_statement).first()
    
    if not user:
        return False
    
    # Dynamically check required fields
    required_fields = [
        company.company_name,
        company.employee_type,
        user.full_name,
    ]
    
    return all(is_value_complete(field) for field in required_fields)


def get_profile_completion_status(db: Session, user: User) -> bool:
    """
    Get profile completion status for any user type.
    
    Args:
        db: Database session
        user: User object
    
    Returns:
        bool: True if profile is complete, False otherwise
    """
    if user.role == UserRole.CANDIDATE:
        return check_candidate_profile_completion(db, user.id)
    elif user.role in [UserRole.ADMIN, UserRole.HR, UserRole.RECRUITER]:
        return check_company_profile_completion(db, user.id)
    else:
        # Unknown role, consider incomplete
        return False
