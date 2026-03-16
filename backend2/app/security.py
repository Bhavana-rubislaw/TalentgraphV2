"""
Security utilities: JWT, password hashing, token validation.
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status, Header

# Configuration
APP_ENV = os.getenv("APP_ENV", "development").lower()
JWT_SECRET = os.getenv("APP_JWT_SECRET")
if not JWT_SECRET:
    if APP_ENV == "development":
        JWT_SECRET = "dev-secret-key-change-in-production"
    else:
        raise RuntimeError("APP_JWT_SECRET must be set in non-development environments")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = int(os.getenv("APP_JWT_EXP_HOURS", "24"))

# Password hashing - Support both Argon2 and bcrypt for compatibility
# Argon2 is preferred for new hashes, bcrypt is supported for existing data
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password[:128])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    return pwd_context.verify(plain_password[:128], hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=JWT_EXP_HOURS))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract user info from JWT token in Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decode_token(token)


async def get_current_user_id(current_user: dict = Depends(get_current_user)) -> int:
    """Get user_id from current token."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no user_id"
        )
    return user_id


# ─── Role-based access control helpers ─────────────────────────────────────────

COMPANY_ROLES = {"recruiter", "hr", "admin"}
CANDIDATE_ROLE = "candidate"


def require_candidate_role(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce candidate-only access."""
    role = current_user.get("role", "").lower()
    if role != CANDIDATE_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Candidate role required, got: {role}"
        )
    return current_user


def require_company_role(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce company-side role access (recruiter/hr/admin)."""
    role = current_user.get("role", "").lower()
    if role not in COMPANY_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Company role required (recruiter/hr/admin), got: {role}"
        )
    return current_user


# ─── Company ownership validation ──────────────────────────────────────────────

def get_user_company_id(session, user_id: int) -> int:
    """
    Get the company_id for a company-side user.
    Raises 404 if user has no company profile.
    """
    from app.models import Company  # Import here to avoid circular dependency
    from sqlmodel import select
    
    company = session.exec(select(Company).where(Company.user_id == user_id)).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found for user"
        )
    return company.id


def verify_company_owns_job(session, company_id: int, job_id: int) -> None:
    """
    Verify that a job posting belongs to the specified company.
    Raises 403 if ownership check fails.
    """
    from app.models import JobPosting
    from sqlmodel import select
    
    job = session.exec(select(JobPosting).where(JobPosting.id == job_id)).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job posting {job_id} not found"
        )
    
    if job.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this job posting"
        )


def get_user_candidate_id(session, user_id: int) -> int:
    """
    Get the candidate_id for a candidate user.
    Raises 404 if user has no candidate profile.
    """
    from app.models import Candidate
    from sqlmodel import select
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user_id)).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found for user"
        )
    return candidate.id
