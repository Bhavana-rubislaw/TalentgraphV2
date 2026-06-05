"""
Subscription and billing routes
Credits, subscription plans, and company billing management
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import (
    Company, User, SubscriptionPlan, CompanySubscription, 
    CreditTransaction, UserRole
)
from app.schemas import (
    SubscriptionPlanRead, SubscriptionPlanCreate,
    CompanySubscriptionRead, CompanySubscriptionCreate,
    CreditTransactionRead, CreditTransactionCreate,
    CompanyCreditsRead
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Billing"])


# ============================================================================
# SUBSCRIPTION PLAN ENDPOINTS
# ============================================================================

@router.post("/plans", response_model=dict)
def create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new subscription plan (Admin only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create subscription plans"
        )
    
    # Check if plan already exists
    existing = session.exec(select(SubscriptionPlan).where(SubscriptionPlan.name == plan_data.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription plan with this name already exists"
        )
    
    plan = SubscriptionPlan(**plan_data.dict())
    session.add(plan)
    session.commit()
    session.refresh(plan)
    
    logger.info(f"[SUBSCRIPTION] New plan created: {plan.name} (ID: {plan.id})")
    
    return {
        "message": "Subscription plan created successfully",
        "plan_id": plan.id,
        "plan_name": plan.name
    }


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def get_subscription_plans(
    session: Session = Depends(get_session)
):
    """Get all active subscription plans"""
    plans = session.exec(
        select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)
    ).all()
    return plans


@router.get("/plans/{plan_id}", response_model=SubscriptionPlanRead)
def get_subscription_plan(
    plan_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific subscription plan"""
    plan = session.get(SubscriptionPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    return plan


# ============================================================================
# COMPANY SUBSCRIPTION ENDPOINTS
# ============================================================================

@router.get("/my", response_model=CompanySubscriptionRead)
def get_company_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get current company's subscription details"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    subscription = session.exec(
        select(CompanySubscription).where(CompanySubscription.company_id == company.id)
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    return subscription


@router.post("/purchase", response_model=dict)
def purchase_subscription(
    subscription_data: CompanySubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Purchase a new subscription for the company (Admin only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can purchase subscriptions"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Check if plan exists
    plan = session.get(SubscriptionPlan, subscription_data.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Check if company already has an active subscription
    existing = session.exec(
        select(CompanySubscription).where(
            (CompanySubscription.company_id == company.id) &
            (CompanySubscription.status == "active")
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company already has an active subscription"
        )
    
    # Create new subscription
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30)  # 30-day trial or monthly subscription
    
    subscription = CompanySubscription(
        company_id=company.id,
        plan_id=plan.id,
        start_date=start_date,
        end_date=end_date,
        status="active",
        auto_renew=subscription_data.auto_renew
    )
    session.add(subscription)
    
    # Add credits to company
    company.current_credits += plan.credits_included
    
    # Log credit transaction
    transaction = CreditTransaction(
        company_id=company.id,
        type="purchase",
        amount=plan.credits_included,
        description=f"Subscription to {plan.name} plan"
    )
    session.add(transaction)
    
    session.commit()
    session.refresh(subscription)
    
    logger.info(f"[SUBSCRIPTION] Company {company.id} subscribed to plan {plan.name}")
    
    return {
        "message": "Subscription purchased successfully",
        "subscription_id": subscription.id,
        "plan_name": plan.name,
        "credits_added": plan.credits_included,
        "end_date": end_date.isoformat()
    }


@router.post("/cancel", response_model=dict)
def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Cancel the company's subscription (Admin only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can cancel subscriptions"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    subscription = session.exec(
        select(CompanySubscription).where(CompanySubscription.company_id == company.id)
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    subscription.status = "cancelled"
    session.add(subscription)
    session.commit()
    
    logger.info(f"[SUBSCRIPTION] Company {company.id} cancelled subscription")
    
    return {"message": "Subscription cancelled successfully"}


# ============================================================================
# CREDITS ENDPOINTS
# ============================================================================

@router.get("/credits/balance", response_model=CompanyCreditsRead)
def get_credit_balance(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get current company's credit balance"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    subscription = session.exec(
        select(CompanySubscription).where(CompanySubscription.company_id == company.id)
    ).first()
    
    plan_info = {}
    if subscription:
        plan = session.get(SubscriptionPlan, subscription.plan_id)
        plan_info = {
            "plan_id": plan.id,
            "plan_name": plan.name,
            "credits_included": plan.credits_included,
            "subscription_status": subscription.status
        }
    
    return CompanyCreditsRead(
        current_credits=company.current_credits,
        **plan_info
    )


@router.post("/credits/purchase", response_model=dict)
def purchase_credits(
    amount: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Purchase additional credits for the company (Admin only)"""
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit amount must be positive"
        )
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can purchase credits"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Add credits
    company.current_credits += amount
    
    # Log transaction
    transaction = CreditTransaction(
        company_id=company.id,
        type="purchase",
        amount=amount,
        description=f"Manual credit purchase: {amount} credits"
    )
    session.add(transaction)
    session.commit()
    
    logger.info(f"[CREDITS] Company {company.id} purchased {amount} credits")
    
    return {
        "message": "Credits purchased successfully",
        "credits_added": amount,
        "new_balance": company.current_credits
    }


@router.get("/credits/transactions", response_model=list[CreditTransactionRead])
def get_credit_transactions(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get credit transaction history for the company"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    transactions = session.exec(
        select(CreditTransaction).where(CreditTransaction.company_id == company.id)
    ).all()
    
    return transactions


@router.post("/credits/deduct", response_model=dict)
def deduct_credits(
    amount: int,
    description: str = "Job posting",
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Deduct credits from company (internal use for job postings, etc.)"""
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit amount must be positive"
        )
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Check if company has enough credits
    if company.current_credits < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient credits. Current balance: {company.current_credits}, Required: {amount}"
        )
    
    # Deduct credits
    company.current_credits -= amount
    
    # Log transaction
    transaction = CreditTransaction(
        company_id=company.id,
        type="usage",
        amount=-amount,
        description=description
    )
    session.add(transaction)
    session.commit()
    
    logger.info(f"[CREDITS] Company {company.id} deducted {amount} credits for {description}")
    
    return {
        "message": "Credits deducted successfully",
        "credits_deducted": amount,
        "new_balance": company.current_credits
    }
