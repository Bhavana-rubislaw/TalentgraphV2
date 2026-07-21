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
    CompanySignUp, CompanyLogin,
    OtpVerifyRequest, OtpResendRequest
)
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.auth_constants import LOGIN_FAIL_MSG, SIGNUP_NEUTRAL_MSG
from app.middleware.rate_limiting import limiter, RATE_LIMITS
from app.services import login_attempts
from app.services import email_otp
from app.services.email_service import EmailService
from app.core.logging_config import get_logger
from app.services.profile_completion_service import get_profile_completion_status

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Fixed hash checked against for unknown emails so login timing doesn't reveal
# whether an account exists.
_DUMMY_PASSWORD_HASH = hash_password("Dummy_Placeholder_Hash_123")

OTP_FAIL_MSG = "Invalid or expired code"
OTP_SENT_MSG = "If the details are valid, a verification code has been sent to your email"


def _send_otp(session: Session, user: User, purpose: str) -> None:
    """Issue a fresh OTP for user+purpose and email it. Email failures are
    logged, not raised - the resend endpoint is the recovery path."""
    code = email_otp.issue_otp(session, user, purpose)
    subject, html, text = email_otp.build_otp_email(code, purpose)
    try:
        EmailService().send_email(
            to_email=user.email, subject=subject, html_content=html, plain_content=text
        )
    except Exception as e:
        logger.error(f"[OTP] Failed to send {purpose} code to user {user.id}: {e}")


def _notify_existing_account(email_lower: str, full_name: str) -> None:
    """Signup attempted with an already-registered email: tell the inbox
    owner privately (the HTTP response stays neutral)."""
    try:
        EmailService().send_email(
            to_email=email_lower,
            subject="You already have a TalentGraph account",
            html_content=(
                f"<p>Hi {full_name},</p><p>Someone (probably you) tried to sign up for TalentGraph "
                "with this email address, but it's already registered. You can sign in with your "
                "existing account instead.</p><p>If this wasn't you, you can safely ignore this email.</p>"
            ),
            plain_content=(
                f"Hi {full_name},\n\nSomeone (probably you) tried to sign up for TalentGraph with this "
                "email address, but it's already registered. You can sign in with your existing account "
                "instead.\n\nIf this wasn't you, you can safely ignore this email."
            ),
        )
    except Exception as e:
        logger.error(f"[SIGNUP] Failed to send existing-account notice: {e}")


def _otp_pending_response(email_lower: str, user_type: str, message: str) -> dict:
    return {
        "ok": True,
        "otp_required": True,
        "message": message,
        "email": email_lower,
        "user_type": user_type,
    }


def _full_auth_response(session: Session, user: User, message: str) -> dict:
    token = create_access_token({
        "sub": user.email,
        "email": user.email,
        "user_id": user.id,
        "role": user.role,
    })
    if user.role == UserRole.CANDIDATE:
        user_type = "candidate"
    elif user.role == UserRole.ADMIN:
        user_type = "admin"
    else:
        user_type = "company"

    response = {
        "ok": True,
        "message": message,
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "user_type": user_type,
        # Admins have no candidate/company profile to complete.
        "is_profile_complete": True if user_type == "admin" else get_profile_completion_status(session, user),
    }
    if user_type == "company":
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        response["company_name"] = company.company_name if company else ""
    return response


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
        _notify_existing_account(email_lower, existing_user.full_name or "there")
        return _otp_pending_response(email_lower, "candidate", SIGNUP_NEUTRAL_MSG)

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

    _send_otp(session, new_user, email_otp.PURPOSE_SIGNUP)
    return _otp_pending_response(email_lower, "candidate", SIGNUP_NEUTRAL_MSG)


@router.post("/candidate/login", response_model=dict)
@limiter.limit("10/minute")
def candidate_login(request: Request, credentials: CandidateLogin, session: Session = Depends(get_session)):
    """Login for candidate users only. Password success triggers an email
    OTP; the session token is issued by /auth/verify-otp."""
    user = _authenticate(session, credentials.email, credentials.password, allowed_roles={UserRole.CANDIDATE})

    _send_otp(session, user, email_otp.PURPOSE_LOGIN)
    return _otp_pending_response(user.email, "candidate", OTP_SENT_MSG)


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
        _notify_existing_account(email_lower, existing_user.full_name or "there")
        return _otp_pending_response(email_lower, "company", SIGNUP_NEUTRAL_MSG)

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

    _send_otp(session, new_user, email_otp.PURPOSE_SIGNUP)
    return _otp_pending_response(email_lower, "company", SIGNUP_NEUTRAL_MSG)


@router.post("/admin/login", response_model=dict)
@limiter.limit("10/minute")
def admin_login(request: Request, credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for system admin only. Password success triggers an email
    OTP, same as candidate/company login; the session token is issued by
    /auth/verify-otp."""
    user = _authenticate(session, credentials.email, credentials.password, allowed_roles={UserRole.ADMIN})

    _send_otp(session, user, email_otp.PURPOSE_LOGIN)
    return _otp_pending_response(user.email, "admin", OTP_SENT_MSG)


# ============================================================================
# EMAIL OTP (signup verification + login 2FA)
# ============================================================================

@router.post("/verify-otp", response_model=dict)
@limiter.limit(RATE_LIMITS["auth"])
def verify_otp(request: Request, data: OtpVerifyRequest, session: Session = Depends(get_session)):
    """Exchange a valid emailed code for a session token.

    A login-purpose record only exists after a successful password check,
    so this endpoint cannot be used to skip the password. Every failure
    mode returns the same generic 401.
    """
    email_lower = data.email.lower()
    user = session.exec(select(User).where(User.email == email_lower)).first()

    if user is None or not email_otp.verify_otp(session, user, data.purpose, data.code):
        logger.warning(f"[OTP] Failed {data.purpose} verification attempt")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=OTP_FAIL_MSG)

    # Either purpose proves inbox ownership.
    if not user.is_email_verified:
        user.is_email_verified = True
        session.add(user)
        session.commit()
        session.refresh(user)

    return _full_auth_response(session, user, "Verification successful")


@router.post("/resend-otp", response_model=dict)
@limiter.limit("3/minute")
def resend_otp(request: Request, data: OtpResendRequest, session: Session = Depends(get_session)):
    """Re-issue a pending code. Response is neutral regardless of whether
    anything was sent, and codes are only re-issued where a flow is
    actually in progress (unverified signup, or a live login OTP)."""
    email_lower = data.email.lower()
    user = session.exec(select(User).where(User.email == email_lower)).first()

    should_send = user is not None and (
        (data.purpose == email_otp.PURPOSE_SIGNUP and not user.is_email_verified)
        or (data.purpose == email_otp.PURPOSE_LOGIN and email_otp.has_pending_otp(session, user, email_otp.PURPOSE_LOGIN))
    )
    if should_send:
        _send_otp(session, user, data.purpose)

    return {"ok": True, "message": OTP_SENT_MSG}


@router.post("/company/login", response_model=dict)
@limiter.limit("10/minute")
def company_login(request: Request, credentials: CompanyLogin, session: Session = Depends(get_session)):
    """Login for company users (HR and Recruiters only, not Admins).
    Password success triggers an email OTP; the session token is issued by
    /auth/verify-otp."""
    user = _authenticate(
        session, credentials.email, credentials.password,
        allowed_roles={UserRole.HR, UserRole.RECRUITER}
    )

    _send_otp(session, user, email_otp.PURPOSE_LOGIN)
    return _otp_pending_response(user.email, "company", OTP_SENT_MSG)


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
