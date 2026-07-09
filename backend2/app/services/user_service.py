"""
User Identity Service — TalentGraph V2
=======================================
Normalizes user identity lookup across routers.
Handles inconsistencies between 'email' and 'sub' in JWT tokens.
"""

import logging
from typing import Dict, Optional
from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import User, Candidate, Company

logger = logging.getLogger(__name__)


class UserService:
    """Centralized service for user identity resolution."""
    
    @staticmethod
    def get_user_from_token(
        session: Session,
        current_user: Dict,
        required: bool = True
    ) -> Optional[User]:
        """
        Resolve User from JWT token payload.
        Handles both 'email' and 'sub' fields for compatibility.
        
        Args:
            session: Database session
            current_user: JWT token payload dict
            required: If True, raise 404 if user not found; if False, return None
            
        Returns:
            User object or None
            
        Raises:
            HTTPException 404 if user not found and required=True
        """
        # Try 'email' field first (most common)
        email = current_user.get("email") or current_user.get("sub")
        
        if not email:
            logger.error("[USER] No email or sub in token payload")
            if required:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            return None
        
        user = session.exec(
            select(User).where(User.email == email)
        ).first()
        
        if not user and required:
            logger.error(f"[USER] User not found: {email}")
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    
    @staticmethod
    def get_email_from_token(current_user: Dict) -> str:
        """
        Extract email from token payload (email or sub field).
        
        Args:
            current_user: JWT token payload dict
            
        Returns:
            Email string
            
        Raises:
            HTTPException 401 if no email found
        """
        email = current_user.get("email") or current_user.get("sub")
        
        if not email:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing email/sub"
            )
        
        return email
    
    @staticmethod
    def get_candidate_profile(
        session: Session,
        user: User,
        required: bool = True
    ) -> Optional[Candidate]:
        """
        Get Candidate profile for a user.
        
        Args:
            session: Database session
            user: User object
            required: If True, raise 404 if not found
            
        Returns:
            Candidate object or None
        """
        candidate = session.exec(
            select(Candidate).where(Candidate.user_id == user.id)
        ).first()
        
        if not candidate and required:
            raise HTTPException(
                status_code=404,
                detail="Candidate profile not found"
            )
        
        return candidate
    
    @staticmethod
    def get_company_profile(
        session: Session,
        user: User,
        required: bool = True
    ) -> Optional[Company]:
        """
        Get Company profile for a user.
        
        Args:
            session: Database session
            user: User object
            required: If True, raise 404 if not found
            
        Returns:
            Company object or None
        """
        company = session.exec(
            select(Company).where(Company.user_id == user.id)
        ).first()
        
        if not company and required:
            raise HTTPException(
                status_code=404,
                detail="Company profile not found"
            )
        
        return company
    
    @staticmethod
    def require_role(user: User, allowed_roles: list) -> None:
        """
        Verify user has one of the allowed roles.
        
        Args:
            user: User object
            allowed_roles: List of allowed role strings
            
        Raises:
            HTTPException 403 if role not allowed
        """
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )


# Convenience functions for backward compatibility
def get_current_user_email(current_user: Dict) -> str:
    """Get email from current_user token payload."""
    return UserService.get_email_from_token(current_user)


def resolve_user(session: Session, current_user: Dict) -> User:
    """Resolve User object from token."""
    return UserService.get_user_from_token(session, current_user, required=True)
