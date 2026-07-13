"""Shared helpers for authenticated user, candidate, and company lookups."""

from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Candidate, Company, User


class UserContextService:
    @staticmethod
    def get_user_by_email_or_404(session: Session, email: str) -> User:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    def get_candidate_for_user_or_404(
        session: Session,
        user_id: int,
        *,
        detail: str = "Candidate not found",
    ) -> Candidate:
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user_id)).first()
        if not candidate:
            raise HTTPException(status_code=404, detail=detail)
        return candidate

    @staticmethod
    def get_company_for_user_or_403(
        session: Session,
        user_id: int,
        *,
        detail: str = "No company profile found",
    ) -> Company:
        company = session.exec(select(Company).where(Company.user_id == user_id)).first()
        if not company:
            raise HTTPException(status_code=403, detail=detail)
        return company

    @staticmethod
    def get_company_namespace_ids(session: Session, company_name: str) -> list[int]:
        return list(session.exec(select(Company.id).where(Company.company_name == company_name)).all())

    @staticmethod
    def get_user_by_id_optional(session: Session, user_id: int) -> Optional[User]:
        return session.get(User, user_id)
