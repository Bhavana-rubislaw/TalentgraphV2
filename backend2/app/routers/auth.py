"""
Authentication routes - signup, login, token management
With rate limiting, account lockout, and generic error messages for security
"""

from typing import Optional, Set

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Company, UserRole
from app.schemas import (
    UserCreate, UserLogin,
    CandidateSignUp, CandidateLogin,
    CompanySignUp, CompanyLogin
)
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.auth_constants import LOGIN_FAIL_MSG, SIGNUP_NEUTRAL_MSG
from app.middleware.rate_limiting import limiter, RATE_LIMITS
from app.services import login_attempts
from app.core.logging_config import get_logger
from app.services.profile_completion_service import get_profile_completion_status

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Fixed hash checked against for unknown emails so login timing doesn't reveal
# whether an account exists.
_DUMMY_PASSWORD_HASH = hash_password("Dummy_Placeholder_Hash_123")


def _authenticate(session: Session, email: str, password: str, allowed_roles: Optional[Set[UserRole]] = None) -> User:
    """
    Shared login path for every role-specific login endpoint.

    Every failure mode - unknown email, wrong password, inactive account,
    wrong role/portal, or an active lockout - raises the exact same generic
    401 so none of these states can be distinguished from the outside.
    """
    email_lower = email.lower()
    user = session.exec(select(User).where(User.email == email_lower)).first()

    if user is not None and login_attempts.is_blocked(user):
        logger.warning(f"[AUTH] Login rejected (locked/throttled): {email_lower}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAIL_MSG)

    is_valid, new_hash = verify_password(password, user.password_hash if user else _DUMMY_PASSWORD_HASH)

    if not user or not is_valid:
        if user:
            login_attempts.register_failure(session, user)
        logger.warning(f"[AUTH] Failed login attempt for email: {email_lower}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAIL_MSG)

    if not user.is_active or (allowed_roles is not None and user.role not in allowed_roles):
        login_attempts.register_failure(session, user)
        logger.warning(f"[AUTH] Login blocked by account state/role for: {email_lower}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAIL_MSG)

    # Migrate legacy (e.g. bcrypt) hashes to the preferred scheme (Argon2) on
    # successful login - passlib already produced the new hash for us.
    if new_hash:
        user.password_hash = new_hash
        session.add(user)
        session.commit()
        session.refresh(user)

    login_attempts.reset_attempts(session, user)
    logger.info(f"[AUTH] Successful login - Email: {user.email}, Role: {user.role}, User ID: {user.id}")
    return user


@router.post("/signup", response_model=dict)
@limiter.limit(RATE_LIMITS["auth"])
def signup(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user (Candidate or Company). Input shape is validated by the UserCreate schema."""
    email_lower = user_data.email.lower()
    logger.info(f"[SIGNUP] Attempting signup for user_type: {user_data.user_type}")

    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning("[SIGNUP] Signup attempted for an existing email")
        return {"ok": True, "message": SIGNUP_NEUTRAL_MSG}

    if user_data.user_type == "candidate":
        role = UserRole.CANDIDATE
    else:
        role_map = {
            "admin": UserRole.ADMIN,
            "hr": UserRole.HR,
            "recruiter": UserRole.RECRUITER
        }
        role = role_map[user_data.company_role]

    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=hash_password(user_data.password),
        role=role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[SIGNUP] User created successfully - ID: {new_user.id}, Role: {new_user.role}")

    if user_data.user_type == "company":
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

    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": SIGNUP_NEUTRAL_MSG,
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": user_data.user_type,
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/login", response_model=dict)
@limiter.limit("10/minute")
def login(request: Request, credentials: UserLogin, session: Session = Depends(get_session)):
    """Login user with email and password (legacy unified endpoint)"""
    user = _authenticate(session, credentials.email, credentials.password)

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)

    user_type = "candidate" if user.role == UserRole.CANDIDATE else "company"
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
@limiter.limit(RATE_LIMITS["auth"])
def candidate_signup(request: Request, user_data: CandidateSignUp, session: Session = Depends(get_session)):
    """Register a new candidate account"""
    email_lower = user_data.email.lower()
    logger.info("[CANDIDATE_SIGNUP] Attempting signup")

    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning("[CANDIDATE_SIGNUP] Signup attempted for an existing email")
        return {"ok": True, "message": SIGNUP_NEUTRAL_MSG}

    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=hash_password(user_data.password),
        role=UserRole.CANDIDATE
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[CANDIDATE_SIGNUP] User created successfully - ID: {new_user.id}")

    token_data = {
        "sub": new_user.email,
        "user_id": new_user.id,
        "role": new_user.role
    }
    token = create_access_token(token_data)

    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": SIGNUP_NEUTRAL_MSG,
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": "candidate",
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/candidate/login", response_model=dict)
@limiter.limit("10/minute")
def candidate_login(request: Request, credentials: CandidateLogin, session: Session = Depends(get_session)):
    """Login for candidate users only"""
    user = _authenticate(session, credentials.email, credentials.password, allowed_roles={UserRole.CANDIDATE})

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)

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
@limiter.limit(RATE_LIMITS["auth"])
def company_signup(request: Request, user_data: CompanySignUp, session: Session = Depends(get_session)):
    """Register a new company account (HR or Recruiter only, not Admin)"""
    email_lower = user_data.email.lower()
    logger.info(f"[COMPANY_SIGNUP] Attempting signup for role: {user_data.company_role}")

    existing_user = session.exec(select(User).where(User.email == email_lower)).first()
    if existing_user:
        logger.warning("[COMPANY_SIGNUP] Signup attempted for an existing email")
        return {"ok": True, "message": SIGNUP_NEUTRAL_MSG}

    role_map = {
        "hr": UserRole.HR,
        "recruiter": UserRole.RECRUITER
    }
    role = role_map[user_data.company_role]

    new_user = User(
        email=email_lower,
        full_name=user_data.full_name or email_lower.split("@")[0],
        password_hash=hash_password(user_data.password),
        role=role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    logger.info(f"[COMPANY_SIGNUP] User created successfully - ID: {new_user.id}, Role: {new_user.role}")

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

    is_profile_complete = get_profile_completion_status(session, new_user)

    return {
        "ok": True,
        "message": SIGNUP_NEUTRAL_MSG,
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "user_type": "company",
        "token": token,
        "token_type": "bearer",
        "is_profile_complete": is_profile_complete
    }


@router.post("/admin/login", response_model=dict)
@limiter.limit("10/minute")
def admin_login(request: Request, credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for system admin only"""
    user = _authenticate(session, credentials.email, credentials.password, allowed_roles={UserRole.ADMIN})

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)

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
@limiter.limit("10/minute")
def company_login(request: Request, credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for company users (HR and Recruiters only, not Admins)"""
    user = _authenticate(
        session, credentials.email, credentials.password,
        allowed_roles={UserRole.HR, UserRole.RECRUITER}
    )

    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    company_name = company.company_name if company else ""

    token_data = {
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role
    }
    token = create_access_token(token_data)

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
