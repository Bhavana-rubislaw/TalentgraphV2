"""
Billing Router for TalentGraph
===============================
Handles Stripe subscription management and billing portal integration

Endpoints:
- POST /billing/create-checkout-session - Create Stripe checkout for new subscription
- GET /billing/subscription - Get current subscription details
- POST /billing/portal-session - Create Stripe billing portal session
- POST /billing/webhooks/stripe - Process Stripe webhook events

Features:
- Three subscription tiers (Starter, Professional, Enterprise)
- Entitlement management
- Webhook idempotency
- Invoice tracking
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models import (
    Subscription, Invoice, PaymentEvent, Entitlement,
    SubscriptionStatus, InvoiceStatus, Company, User
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing"])

# Import billing service (to be created)
try:
    from app.services.billing_service import BillingService
    billing_service = BillingService()
except ImportError:
    logger.warning("BillingService not available, billing endpoints will fail")
    billing_service = None


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class CreateCheckoutSessionRequest(BaseModel):
    """Request to create Stripe checkout session"""
    plan_code: str  # starter, professional, enterprise
    billing_period: str = "month"  # month or year


class CreateCheckoutSessionResponse(BaseModel):
    """Response with Stripe checkout URL"""
    checkout_url: str
    session_id: str


class SubscriptionResponse(BaseModel):
    """Current subscription details"""
    id: int
    company_id: int
    plan_code: str
    plan_name: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    amount: int
    currency: str
    billing_period: str
    trial_end: Optional[datetime]
    cancel_at_period_end: bool
    entitlements: list[Dict[str, Any]]


class PortalSessionResponse(BaseModel):
    """Stripe billing portal URL"""
    portal_url: str


# ═══════════════════════════════════════════════════════════════════════════
# CHECKOUT & SUBSCRIPTION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/create-checkout-session", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create Stripe checkout session for new subscription
    
    Flow:
    1. Validate plan_code
    2. Check for existing active subscription
    3. Create Stripe checkout session
    4. Return checkout URL for redirect
    """
    
    if not billing_service:
        raise HTTPException(status_code=503, detail="Billing service unavailable")
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated with user")
    
    # Validate plan
    valid_plans = ["starter", "professional", "enterprise"]
    if request.plan_code not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Choose from: {valid_plans}")
    
    # Check for existing active subscription
    existing_sub = session.exec(
        select(Subscription).where(
            Subscription.company_id == company_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
        )
    ).first()
    
    if existing_sub:
        raise HTTPException(
            status_code=400,
            detail="Company already has an active subscription. Use billing portal to change plan."
        )
    
    # Get company
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Create checkout session
    try:
        checkout_url, session_id = billing_service.create_checkout_session(
            company_id=company_id,
            plan_code=request.plan_code,
            billing_period=request.billing_period,
            customer_email=company.email or current_user.get("email")
        )
        
        logger.info(f"Created checkout session {session_id} for company {company_id}")
        
        return CreateCheckoutSessionResponse(
            checkout_url=checkout_url,
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get current subscription for company
    
    Returns None if no active subscription
    """
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated with user")
    
    # Get active subscription
    subscription = session.exec(
        select(Subscription).where(
            Subscription.company_id == company_id,
            Subscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
                SubscriptionStatus.PAST_DUE
            ])
        ).order_by(Subscription.created_at.desc())
    ).first()
    
    if not subscription:
        return None
    
    # Get entitlements
    entitlements = session.exec(
        select(Entitlement).where(Entitlement.company_id == company_id)
    ).all()
    
    # Map plan codes to names
    plan_names = {
        "starter": "Starter Plan",
        "professional": "Professional Plan",
        "enterprise": "Enterprise Plan"
    }
    
    return SubscriptionResponse(
        id=subscription.id,
        company_id=subscription.company_id,
        plan_code=subscription.plan_code,
        plan_name=plan_names.get(subscription.plan_code, subscription.plan_code),
        status=subscription.status.value,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        amount=subscription.amount,
        currency=subscription.currency,
        billing_period=subscription.billing_period,
        trial_end=subscription.trial_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        entitlements=[
            {
                "feature_code": e.feature_code,
                "is_enabled": e.is_enabled,
                "usage_limit": e.usage_limit,
                "current_usage": e.current_usage
            }
            for e in entitlements
        ]
    )


@router.post("/portal-session", response_model=PortalSessionResponse)
async def create_portal_session(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create Stripe billing portal session
    
    Redirects to Stripe portal where customers can:
    - Update payment method
    - View invoices
    - Cancel subscription
    - Update billing details
    """
    
    if not billing_service:
        raise HTTPException(status_code=503, detail="Billing service unavailable")
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated with user")
    
    # Get subscription (need Stripe customer ID)
    subscription = session.exec(
        select(Subscription).where(
            Subscription.company_id == company_id
        ).order_by(Subscription.created_at.desc())
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=404,
            detail="No subscription found. Create a subscription first."
        )
    
    try:
        portal_url = billing_service.create_portal_session(
            customer_id=subscription.stripe_customer_id
        )
        
        logger.info(f"Created portal session for company {company_id}")
        
        return PortalSessionResponse(portal_url=portal_url)
        
    except Exception as e:
        logger.error(f"Failed to create portal session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create portal session")


# ═══════════════════════════════════════════════════════════════════════════
# STRIPE WEBHOOK HANDLER
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/stripe")
async def handle_stripe_webhook(
    request: Request,
    session: Session = Depends(get_session),
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")
):
    """
    Process Stripe webhook events
    
    Handles:
    - checkout.session.completed (new subscription)
    - customer.subscription.updated (plan changes, cancellations)
    - customer.subscription.deleted (final cancellation)
    - invoice.paid (successful payment)
    - invoice.payment_failed (failed payment)
    
    Ensures idempotency via provider_event_id
    """
    
    if not billing_service:
        raise HTTPException(status_code=503, detail="Billing service unavailable")
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook signature
    if not stripe_signature:
        logger.warning("Missing Stripe signature header")
        raise HTTPException(status_code=400, detail="Missing signature")
    
    try:
        event = billing_service.verify_webhook(body, stripe_signature)
    except Exception as e:
        logger.warning(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    event_id = event['id']
    event_type = event['type']
    
    logger.info(f"Received Stripe webhook: {event_type} (ID: {event_id})")
    
    # Check for duplicate (idempotency)
    existing_event = session.exec(
        select(PaymentEvent).where(
            PaymentEvent.provider_event_id == event_id
        )
    ).first()
    
    if existing_event and existing_event.processed:
        logger.info(f"Duplicate event already processed: {event_id}")
        return {"status": "duplicate"}
    
    # Create or update payment event
    if not existing_event:
        payment_event = PaymentEvent(
            provider_name="stripe",
            provider_event_id=event_id,
            event_type=event_type,
            payload_json=event
        )
        session.add(payment_event)
        session.flush()
    else:
        payment_event = existing_event
    
    # Process event
    try:
        result = billing_service.handle_webhook_event(session, event)
        
        # Mark as processed
        payment_event.processed = True
        payment_event.processed_at = datetime.now(timezone.utc)
        
        session.commit()
        
        logger.info(f"Successfully processed webhook {event_id}: {result}")
        
        return {"status": "processed", "result": result}
        
    except Exception as e:
        logger.error(f"Error processing webhook {event_id}: {e}", exc_info=True)
        
        # Mark as failed
        payment_event.processing_error = str(e)
        payment_event.retry_count += 1
        
        session.commit()
        
        # Don't raise exception - return 200 to prevent Stripe retries
        # We'll manually retry failed events via worker
        return {"status": "error", "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# ENTITLEMENT CHECKING (Utility)
# ═══════════════════════════════════════════════════════════════════════════

def check_entitlement(
    session: Session,
    company_id: int,
    feature_code: str
) -> bool:
    """
    Check if company has access to feature
    
    Used in other routers to gate premium features
    """
    
    entitlement = session.exec(
        select(Entitlement).where(
            Entitlement.company_id == company_id,
            Entitlement.feature_code == feature_code
        )
    ).first()
    
    if not entitlement:
        return False
    
    return entitlement.is_enabled


def require_entitlement(feature_code: str):
    """
    Decorator to require entitlement for endpoint
    
    Usage:
        @router.get("/premium-feature")
        @require_entitlement("analytics_advanced_enabled")
        async def premium_endpoint(...):
            pass
    """
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract session and current_user from kwargs
            session = kwargs.get("session")
            current_user = kwargs.get("current_user")
            
            if not session or not current_user:
                raise HTTPException(status_code=500, detail="Missing dependencies")
            
            company_id = current_user.get("company_id")
            if not company_id:
                raise HTTPException(status_code=400, detail="No company associated")
            
            # Check entitlement
            if not check_entitlement(session, company_id, feature_code):
                raise HTTPException(
                    status_code=403,
                    detail=f"This feature requires '{feature_code}' entitlement. Upgrade your plan."
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    
    return decorator
