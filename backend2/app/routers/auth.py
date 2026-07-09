"""
Authentication routes - signup, login, token management
With rate limiting for security
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Candidate, Company, UserRole
from app.schemas import (
    UserCreate, UserLogin,
    CandidateSignUp, CandidateLogin,
    CompanySignUp, CompanyLogin
)
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.logging_config import get_logger, log_change
from app.services.profile_completion_service import get_profile_completion_status

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=dict)
def signup(user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user (Candidate or Company)"""
    email_lower = user_data.email.lower()
    logger.info(f"[SIGNUP] Attempting signup for email: {email_lower}, user_type: {user_data.user_type}")
    
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning(f"[SIGNUP] Email already registered: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate user_type
    if user_data.user_type not in ["candidate", "company"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_type. Must be 'candidate' or 'company'"
        )
    
    # Validate company_role for company users
    if user_data.user_type == "company":
        if not user_data.company_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_role required for company users"
            )
        if user_data.company_role.lower() not in ["admin", "hr", "recruiter"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_role must be admin, hr, or recruiter"
            )
    
    # Map user_type and company_role to UserRole enum
    if user_data.user_type == "candidate":
        role = UserRole.CANDIDATE
    else:
        role_map = {
            "admin": UserRole.ADMIN,
            "hr": UserRole.HR,
            "recruiter": UserRole.RECRUITER
        }
        role = role_map[user_data.company_role.lower()]
    
    # Create user with validated password
    try:
        password_hash = hash_password(user_data.password)
    except ValueError as e:
        logger.warning(f"[SIGNUP] Password validation failed for {email_lower}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=password_hash,
        role=role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[SIGNUP] User created successfully - ID: {new_user.id}, Email: {new_user.email}, Role: {new_user.role}")
    
    # Create candidate or company profile
    if user_data.user_type == "candidate":
        # Candidate profiles are created later when they complete their profile
        pass
    else:
        # Create company profile
        company = Company(
            user_id=new_user.id,
            company_name="",  # To be filled later
            company_email=email_lower,
            employee_type=user_data.company_role.upper()
        )
        session.add(company)
        session.commit()
        logger.info(f"[SIGNUP] Company profile created for User ID {new_user.id}")
    
    token_data = {
        "sub": new_user.email,
        "email": new_user.email,
        "user_id": new_user.id,
        "role": new_user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[SIGNUP] Token generated for user: {new_user.email}")
    
    # Check profile completion
    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": f"Signup successful! You can now login with {email_lower}",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": user_data.user_type,
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/login", response_model=dict)
def login(credentials: UserLogin, session: Session = Depends(get_session)):
    """Login user with email and password (legacy unified endpoint)"""
    email_lower = credentials.email.lower()
    logger.info(f"[LOGIN] Login attempt for email: {email_lower}")
    user = session.exec(select(User).where(User.email == email_lower)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"[LOGIN] Failed login attempt for email: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        logger.warning(f"[LOGIN] Inactive account login attempt: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[LOGIN] Successful login - Email: {user.email}, Role: {user.role}, User ID: {user.id}")
    
    # Determine user_type from role
    user_type = "candidate" if user.role == UserRole.CANDIDATE else "company"
    
    # Check profile completion
    is_profile_complete = get_profile_completion_status(session, user)

    return {
        "message": "Login successful",
        "access_token": token,  # For backward compatibility
        "token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "user_type": user_type,
        "is_profile_complete": is_profile_complete
    }


# ============================================================================
# CANDIDATE-SPECIFIC AUTH ENDPOINTS
# ============================================================================

@router.post("/candidate/signup", response_model=dict)
def candidate_signup(user_data: CandidateSignUp, session: Session = Depends(get_session)):
    """Register a new candidate account"""
    email_lower = user_data.email.lower()
    logger.info(f"[CANDIDATE_SIGNUP] Attempting signup for email: {email_lower}")
    
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning(f"[CANDIDATE_SIGNUP] Email already registered: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=hash_password(user_data.password),
        role=UserRole.CANDIDATE
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[CANDIDATE_SIGNUP] User created successfully - ID: {new_user.id}, Email: {new_user.email}")
    
    token_data = {
        "sub": new_user.email,
        "user_id": new_user.id,
        "role": new_user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[CANDIDATE_SIGNUP] Token generated for user: {new_user.email}")
    
    # Check profile completion (will be false for new signups)
    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": f"Candidate signup successful! You can now login with {email_lower}",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": "candidate",
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/candidate/login", response_model=dict)
def candidate_login(credentials: CandidateLogin, session: Session = Depends(get_session)):
    """Login for candidate users only"""
    email_lower = credentials.email.lower()
    logger.info(f"[CANDIDATE_LOGIN] Login attempt for email: {email_lower}")
    
    # Find user
    user = session.exec(select(User).where(User.email == email_lower)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"[CANDIDATE_LOGIN] Failed login attempt for email: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check user type
    if user.role != UserRole.CANDIDATE:
        logger.warning(f"[CANDIDATE_LOGIN] Non-candidate tried to login: {email_lower} (role: {user.role})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This login is for candidates only. Please use the company login."
        )

    if not user.is_active:
        logger.warning(f"[CANDIDATE_LOGIN] Inactive account login attempt: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[CANDIDATE_LOGIN] Successful login - Email: {user.email}, User ID: {user.id}")
    
    # Check profile completion
    is_profile_complete = get_profile_completion_status(session, user)

    return {
        "message": "Candidate login successful",
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "user_type": "candidate",
        "is_profile_complete": is_profile_complete
    }


# ============================================================================
# COMPANY-SPECIFIC AUTH ENDPOINTS
# ============================================================================

@router.post("/company/signup", response_model=dict)
def company_signup(user_data: CompanySignUp, session: Session = Depends(get_session)):
    """Register a new company account (HR or Recruiter only, not Admin)"""
    email_lower = user_data.email.lower()
    logger.info(f"[COMPANY_SIGNUP] Attempting signup for email: {email_lower}, role: {user_data.company_role}")
    
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning(f"[COMPANY_SIGNUP] Email already registered: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate company_role - exclude admin
    if user_data.company_role.lower() not in ["hr", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="company_role must be 'hr' or 'recruiter'. Admin accounts cannot be created through signup."
        )
    
    # Map company_role to UserRole enum
    role_map = {
        "hr": UserRole.HR,
        "recruiter": UserRole.RECRUITER
    }
    role = role_map[user_data.company_role.lower()]
    
    # Create user
    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=hash_password(user_data.password),
        role=role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[COMPANY_SIGNUP] User created successfully - ID: {new_user.id}, Email: {new_user.email}, Role: {new_user.role}")
    
    # Create company profile
    company = Company(
        user_id=new_user.id,
        company_name="",  # To be filled later
        company_email=email_lower,
        employee_type=user_data.company_role.upper()
    )
    session.add(company)
    session.commit()
    logger.info(f"[COMPANY_SIGNUP] Company profile created for User ID {new_user.id}")
    
    token_data = {
        "sub": new_user.email,
        "email": new_user.email,
        "user_id": new_user.id,
        "role": new_user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[COMPANY_SIGNUP] Token generated for user: {new_user.email}")
    
    # Check profile completion (will be false for new signups)
    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": f"Company signup successful! You can now login with {email_lower}",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": "company",
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/admin/login", response_model=dict)
def admin_login(credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for system admin only (talentgraph.interviews@gmail.com)"""
    email_lower = credentials.email.lower()
    logger.info(f"[ADMIN_LOGIN] Login attempt for email: {email_lower}")
    
    # Find user
    user = session.exec(select(User).where(User.email == email_lower)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"[ADMIN_LOGIN] Failed login attempt for email: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is actually an admin
    if user.role != UserRole.ADMIN:
        logger.warning(f"[ADMIN_LOGIN] Non-admin tried to login: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This login is for system administrators only."
        )

    if not user.is_active:
        logger.warning(f"[ADMIN_LOGIN] Inactive account login attempt: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[ADMIN_LOGIN] Successful login - Email: {user.email}, User ID: {user.id}, Role: {user.role}")

    return {
        "message": "Admin login successful",
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "user_type": "admin",
        "is_profile_complete": True
    }


@router.post("/company/login", response_model=dict)
def company_login(credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for company users (HR and Recruiters only, not Admins)"""
    email_lower = credentials.email.lower()
    logger.info(f"[COMPANY_LOGIN] Login attempt for email: {email_lower}")
    
    # Find user
    user = session.exec(select(User).where(User.email == email_lower)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"[COMPANY_LOGIN] Failed login attempt for email: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check user type
    if user.role == UserRole.CANDIDATE:
        logger.warning(f"[COMPANY_LOGIN] Candidate tried to login: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This login is for company users only. Please use the candidate login."
        )
    
    # Exclude admins from company login
    if user.role == UserRole.ADMIN:
        logger.warning(f"[COMPANY_LOGIN] Admin tried to login via company login: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System administrators must use the admin login. Please contact support."
        )

    if not user.is_active:
        logger.warning(f"[COMPANY_LOGIN] Inactive account login attempt: {email_lower}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Get company details
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    company_name = company.company_name if company else ""

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)
    logger.info(f"[COMPANY_LOGIN] Successful login - Email: {user.email}, User ID: {user.id}, Role: {user.role}")
    
    # Check profile completion
    is_profile_complete = get_profile_completion_status(session, user)

    return {
        "message": "Company login successful",
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "company_name": company_name,
        "role": user.role,
        "user_type": "company",
        "is_profile_complete": is_profile_complete
    }


@router.get("/me", response_model=dict)
def get_current_user_info(current_user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    """Get current user info from token"""
    logger.info(f"[AUTH] Get current user info - sub: {current_user.get('sub')}, JWT role: {current_user.get('role')}")
    user_id = current_user.get("user_id")
    user = session.get(User, user_id)

    # If the user no longer exists in the DB (e.g. after a DB reset), treat the
    # token as expired so the frontend clears localStorage and redirects to login.
    if not user:
        logger.warning(f"[AUTH] /me: user_id {user_id} not found in DB – invalidating token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Always use the DB as source-of-truth for role so the frontend reflects any
    # role changes and doesn't show the wrong dashboard.
    result = {
        "email": user.email,
        "user_id": user.id,
        "role": user.role,        # DB role – not the JWT claim
        "full_name": user.full_name,
    }
    
    # Check profile completion
    is_profile_complete = get_profile_completion_status(session, user)
    result["is_profile_complete"] = is_profile_complete
    
    logger.info(f"[AUTH] /me returning - user_id: {user.id}, email: {user.email}, DB role: {user.role}, role type: {type(user.role)}, profile_complete: {is_profile_complete}")

    # If company user, include company info
    if user.role != UserRole.CANDIDATE:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        result["company_name"] = company.company_name if company else ""

    return result


@router.get("/users/search", response_model=list)
def search_users(
    q: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Search users by name or email for participant selection
    Returns: List of {id, full_name, email, role}
    """
    search_term = f"%{q.lower()}%"
    
    # Search by email or full_name (case-insensitive)
    from sqlalchemy import or_, func
    users = session.exec(
        select(User).where(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(User.full_name).like(search_term)
            )
        ).limit(limit)
    ).all()
    
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]
