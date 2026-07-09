"""
Credits management routes
Balance, purchase, and transaction history for company credits
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import Company, CreditTransaction
from app.security import get_current_user
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/credits", tags=["Credits"])


# ─── helpers ─────────────────────────────────────────────────────────────────

def _require_company_roles(current_user: dict) -> None:
    role = (current_user.get("role") or "").lower()
    if role not in {"admin", "hr", "recruiter"}:
        raise HTTPException(status_code=403, detail="Company account required")


def _get_primary_company(session: Session, user_id: int) -> Company:
    company = session.exec(select(Company).where(Company.user_id == user_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    if company.parent_company_id:
        parent = session.get(Company, company.parent_company_id)
        if parent:
            return parent
    return company


# ─── schemas ──────────────────────────────────────────────────────────────────

class CreditPurchaseRequest(BaseModel):
    amount: int          # number of credits to add
    description: Optional[str] = None


class TransactionRead(BaseModel):
    id: int
    type: str
    amount: int
    description: Optional[str]
    transaction_date: str


# ─── routes ───────────────────────────────────────────────────────────────────

@router.get("/balance", response_model=dict)
def get_balance(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get current credit balance for the caller's primary company."""
    _require_company_roles(current_user)
    company = _get_primary_company(session, current_user["user_id"])
    return {"balance": company.current_credits or 0, "company_id": company.id}


@router.post("/purchase", response_model=dict)
def purchase_credits(
    body: CreditPurchaseRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Add purchased credits to the company balance (Admin only).

    In production this endpoint is called after a payment gateway confirms purchase.
    On localhost you can call it directly for testing.
    """
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    company = _get_primary_company(session, current_user["user_id"])
    company.current_credits = (company.current_credits or 0) + body.amount
    session.add(company)

    txn = CreditTransaction(
        company_id=company.id,
        type="purchase",
        amount=body.amount,
        description=body.description or f"Manual credit purchase: {body.amount} credits",
    )
    session.add(txn)
    session.commit()

    logger.info(f"[CREDITS] +{body.amount} credits added to company {company.id}")
    return {
        "ok": True,
        "new_balance": company.current_credits,
        "credits_added": body.amount,
    }


@router.get("/transactions", response_model=List[TransactionRead])
def list_transactions(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Get credit transaction history for the caller's company (Admin/HR)."""
    role = (current_user.get("role") or "").lower()
    if role not in {"admin", "hr"}:
        raise HTTPException(status_code=403, detail="Admin or HR access required")

    company = _get_primary_company(session, current_user["user_id"])
    txns = session.exec(
        select(CreditTransaction)
        .where(CreditTransaction.company_id == company.id)
        .order_by(CreditTransaction.transaction_date.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return [
        TransactionRead(
            id=t.id,
            type=t.type,
            amount=t.amount,
            description=t.description,
            transaction_date=t.transaction_date.isoformat(),
        )
        for t in txns
    ]
