"""
Subscription management routes
Endpoints for subscription plans and company subscriptions
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Company, CompanySubscription, CreditTransaction,
    SubscriptionPlan, User, UserRole,
)
from app.security import get_current_user
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# ─── helpers ─────────────────────────────────────────────────────────────────

def _require_company_roles(current_user: dict) -> None:
    role = (current_user.get("role") or "").lower()
    if role not in {"admin", "hr", "recruiter"}:
        raise HTTPException(status_code=403, detail="Company account required")


def _get_primary_company(session: Session, user_id: int) -> Company:
    """Return the primary company for this user (follows parent_company_id chain)."""
    company = session.exec(select(Company).where(Company.user_id == user_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    if company.parent_company_id:
        parent = session.get(Company, company.parent_company_id)
        if parent:
            return parent
    return company


def _require_admin(current_user: dict) -> None:
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ─── schemas ──────────────────────────────────────────────────────────────────

class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 0.0
    currency: str = "USD"
    credits_included: int = 0
    job_post_limit: int = 5
    team_member_limit: int = 1


class PlanRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    currency: str
    credits_included: int
    job_post_limit: int
    team_member_limit: int
    is_active: bool


class PurchaseRequest(BaseModel):
    plan_id: int
    auto_renew: bool = True


class SubscriptionRead(BaseModel):
    id: int
    company_id: int
    plan_id: int
    plan_name: str
    start_date: str
    end_date: str
    status: str
    auto_renew: bool
    credits_included: int
    job_post_limit: int
    team_member_limit: int


# ─── routes ───────────────────────────────────────────────────────────────────

@router.post("/plans", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_plan(
    body: PlanCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new subscription plan (system admin only)."""
    _require_admin(current_user)

    if session.exec(select(SubscriptionPlan).where(SubscriptionPlan.name == body.name)).first():
        raise HTTPException(status_code=409, detail="Plan with this name already exists")

    plan = SubscriptionPlan(**body.model_dump())
    session.add(plan)
    session.commit()
    session.refresh(plan)
    logger.info(f"[SUBSCRIPTIONS] Plan created: {plan.name} (id={plan.id})")
    return {"ok": True, "plan_id": plan.id, "name": plan.name}


@router.get("/plans", response_model=List[PlanRead])
def list_plans(
    session: Session = Depends(get_session),
):
    """List all active subscription plans (public)."""
    plans = session.exec(select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)).all()
    return [
        PlanRead(
            id=p.id,
            name=p.name,
            description=p.description,
            price=p.price,
            currency=p.currency,
            credits_included=p.credits_included,
            job_post_limit=p.job_post_limit,
            team_member_limit=p.team_member_limit,
            is_active=p.is_active,
        )
        for p in plans
    ]


@router.get("/my", response_model=Optional[SubscriptionRead])
def get_my_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get current active subscription for the caller's primary company."""
    _require_company_roles(current_user)
    company = _get_primary_company(session, current_user["user_id"])

    sub = session.exec(
        select(CompanySubscription)
        .where(CompanySubscription.company_id == company.id)
        .where(CompanySubscription.status == "active")
        .order_by(CompanySubscription.created_at.desc())
    ).first()

    if not sub:
        return None

    plan = session.get(SubscriptionPlan, sub.plan_id)
    return SubscriptionRead(
        id=sub.id,
        company_id=sub.company_id,
        plan_id=sub.plan_id,
        plan_name=plan.name if plan else "Unknown",
        start_date=sub.start_date.isoformat(),
        end_date=sub.end_date.isoformat(),
        status=sub.status,
        auto_renew=sub.auto_renew,
        credits_included=plan.credits_included if plan else 0,
        job_post_limit=plan.job_post_limit if plan else 0,
        team_member_limit=plan.team_member_limit if plan else 1,
    )


@router.post("/purchase", response_model=dict)
def purchase_subscription(
    body: PurchaseRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Purchase or upgrade a subscription plan (Admin only)."""
    _require_admin(current_user)
    company = _get_primary_company(session, current_user["user_id"])

    plan = session.get(SubscriptionPlan, body.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Subscription plan not found or inactive")

    # Cancel existing active subscription
    existing = session.exec(
        select(CompanySubscription)
        .where(CompanySubscription.company_id == company.id)
        .where(CompanySubscription.status == "active")
    ).first()
    if existing:
        existing.status = "cancelled"
        existing.updated_at = datetime.now(timezone.utc)
        session.add(existing)

    now = datetime.now(timezone.utc)
    sub = CompanySubscription(
        company_id=company.id,
        plan_id=plan.id,
        start_date=now,
        end_date=now + timedelta(days=30),
        status="active",
        auto_renew=body.auto_renew,
    )
    session.add(sub)

    # Grant included credits
    if plan.credits_included > 0:
        company.current_credits = (company.current_credits or 0) + plan.credits_included
        session.add(company)
        txn = CreditTransaction(
            company_id=company.id,
            type="subscription_grant",
            amount=plan.credits_included,
            description=f"Credits from '{plan.name}' subscription purchase",
        )
        session.add(txn)

    session.commit()
    session.refresh(sub)
    logger.info(
        f"[SUBSCRIPTIONS] Company {company.id} purchased plan '{plan.name}' (sub_id={sub.id})"
    )
    return {
        "ok": True,
        "subscription_id": sub.id,
        "plan": plan.name,
        "end_date": sub.end_date.isoformat(),
        "credits_granted": plan.credits_included,
    }


@router.post("/cancel", response_model=dict)
def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cancel the current active subscription (Admin only)."""
    _require_admin(current_user)
    company = _get_primary_company(session, current_user["user_id"])

    sub = session.exec(
        select(CompanySubscription)
        .where(CompanySubscription.company_id == company.id)
        .where(CompanySubscription.status == "active")
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")

    sub.status = "cancelled"
    sub.auto_renew = False
    sub.updated_at = datetime.now(timezone.utc)
    session.add(sub)
    session.commit()
    logger.info(f"[SUBSCRIPTIONS] Company {company.id} cancelled subscription {sub.id}")
    return {"ok": True, "message": "Subscription cancelled"}
