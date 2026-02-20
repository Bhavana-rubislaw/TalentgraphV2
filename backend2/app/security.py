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

# Password hashing - Argon2 (matching original backend)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


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
