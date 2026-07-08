"""
Query Helper — TalentGraph V2
==============================
Centralizes the most-repeated DB lookup patterns so every router can call a
single function instead of duplicating the same select() boilerplate.

Usage:
    from app.services.query_helper import get_current_user_obj, get_candidate_by_user_id

    user = get_current_user_obj(session, current_user)   # replaces 30× repeated pattern
    candidate = get_candidate_by_user_id(session, user.id)
"""

from typing import Optional
from sqlmodel import Session, select

from app.models import User, Candidate, Company


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    """Fetch a User row by email address (case-sensitive, exact match)."""
    return session.exec(select(User).where(User.email == email)).first()


def get_current_user_obj(session: Session, current_user: dict) -> Optional[User]:
    """
    Resolve the JWT-decoded current_user dict to a full User ORM object.

    Replaces the pattern repeated in every router:
        session.exec(select(User).where(User.email == current_user["email"])).first()
    """
    return get_user_by_email(session, current_user["email"])


def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
    """Fetch a User row by primary key."""
    return session.get(User, user_id)


def get_candidate_by_user_id(session: Session, user_id: int) -> Optional[Candidate]:
    """Return the Candidate profile owned by a given user_id, or None."""
    return session.exec(
        select(Candidate).where(Candidate.user_id == user_id)
    ).first()


def get_company_by_user_id(session: Session, user_id: int) -> Optional[Company]:
    """Return the Company record owned by a given user_id, or None."""
    return session.exec(
        select(Company).where(Company.user_id == user_id)
    ).first()
