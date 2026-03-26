# TalentGraph Phase 3 & 4 Implementation Plan (Part 2)
## Billing, Analytics, and Automation

---

## Phase 4.1: Stripe Subscriptions & Billing

### Database Models

#### New Table: `subscription`
```python
class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"


class Subscription(SQLModel, table=True):
    """Company subscription tracking"""
    __tablename__ = "subscription"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", unique=True, index=True)
    
    # Stripe identifiers
    stripe_customer_id: str = Field(index=True)
    stripe_subscription_id: str = Field(unique=True, index=True)
    
    # Plan details
    plan_code: str = Field(index=True)  # "starter", "professional", "enterprise"
    status: SubscriptionStatus = Field(index=True)
    
    # Billing
    seat_count: int = Field(default=1)
    amount_per_period: int  # cents
    currency: str = Field(default="usd")
    interval: str = Field(default="month")  # "month", "year"
    
    # Trial
    trial_ends_at: Optional[datetime] = None
    
    # Billing cycle
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = Field(default=False)
    canceled_at: Optional[datetime] = None
    
    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    company: Optional["Company"] = Relationship(back_populates="subscription")
```

#### New Table: `invoice`
```python
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class Invoice(SQLModel, table=True):
    """Invoice records from Stripe"""
    __tablename__ = "invoice"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    subscription_id: Optional[int] = Field(foreign_key="subscription.id", index=True)
    
    # Stripe identifiers
    stripe_invoice_id: str = Field(unique=True, index=True)
    stripe_customer_id: str
    
    # Invoice details
    amount_due: int  # cents
    amount_paid: int  # cents
    currency: str = Field(default="usd")
    status: InvoiceStatus = Field(index=True)
    
    # Dates
    issued_at: datetime
    due_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    # URLs
    hosted_invoice_url: Optional[str] = None
    invoice_pdf_url: Optional[str] = None
    
    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

#### New Table: `payment_event`
```python
class PaymentEvent(SQLModel, table=True):
    """Stripe webhook event log"""
    __tablename__ = "payment_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(foreign_key="company.id", index=True)
    subscription_id: Optional[int] = Field(foreign_key="subscription.id", index=True)
    
    # Provider information
    provider_name: str = Field(default="stripe")
    provider_event_id: str = Field(unique=True, index=True)
    event_type: str = Field(index=True)
    
    # Payload
    payload_json: str  # Store full Stripe event
    
    # Processing
    processed: bool = Field(default=False, index=True)
    processed_at: Optional[datetime] = None
    processing_error: Optional[str] = None
    retry_count: int = Field(default=0)
    
    # Audit
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

#### New Table: `entitlement`
```python
class Entitlement(SQLModel, table=True):
    """Feature entitlements for companies"""
    __tablename__ = "entitlement"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Feature
    feature_code: str = Field(index=True)  # "scheduler", "calendar_sync", "analytics_advanced"
    is_enabled: bool = Field(default=True, index=True)
    
    # Limits
    usage_limit: Optional[int] = None  # e.g., max job postings
    current_usage: int = Field(default=0)
    seat_limit: Optional[int] = None
    
    # Validity
    expires_at: Optional[datetime] = None
    
    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Unique constraint: one row per company + feature
    __table_args__ = (
        UniqueConstraint('company_id', 'feature_code', name='uix_company_feature'),
    )
```

### Plan Configuration

#### Default Plans
```python
SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter",
        "price": 9900,  # $99/month
        "interval": "month",
        "features": {
            "job_postings_limit": 5,
            "seat_limit": 2,
            "scheduler_enabled": True,
            "calendar_sync_enabled": False,
            "analytics_advanced_enabled": False,
            "video_integrations_enabled": False
        }
    },
    "professional": {
        "name": "Professional",
        "price": 29900,  # $299/month
        "interval": "month",
        "features": {
            "job_postings_limit": 25,
            "seat_limit": 10,
            "scheduler_enabled": True,
            "calendar_sync_enabled": True,
            "analytics_advanced_enabled": True,
            "video_integrations_enabled": True
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 99900,  # $999/month
        "interval": "month",
        "features": {
            "job_postings_limit": None,  # unlimited
            "seat_limit": None,  # unlimited
            "scheduler_enabled": True,
            "calendar_sync_enabled": True,
            "analytics_advanced_enabled": True,
            "video_integrations_enabled": True,
            "priority_support": True,
            "custom_integrations": True
        }
    }
}
```

### Billing Service

**Path**: `backend2/app/services/billing_service.py`

```python
"""
Billing Service for TalentGraph
Stripe integration for subscriptions
"""

import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models import (
    Company, Subscription, Invoice, PaymentEvent,
    Entitlement, SubscriptionStatus, InvoiceStatus
)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')


class BillingService:
    """Handles all billing operations"""
    
    SUBSCRIPTION_PLANS = {
        "starter": {
            "name": "Starter",
            "price": 9900,
            "features": ["scheduler_enabled"]
        },
        "professional": {
            "name": "Professional",
            "price": 29900,
            "features": [
                "scheduler_enabled",
                "calendar_sync_enabled",
                "analytics_advanced_enabled"
            ]
        },
        "enterprise": {
            "name": "Enterprise",
            "price": 99900,
            "features": [
                "scheduler_enabled",
                "calendar_sync_enabled",
                "analytics_advanced_enabled",
                "video_integrations_enabled"
            ]
        }
    }
    
    def __init__(self, session: Session):
        self.session = session
    
    async def create_checkout_session(
        self,
        company_id: int,
        plan_code: str,
        success_url: str,
        cancel_url: str
    ) -> str:
        """Create Stripe checkout session for new subscription"""
        
        company = self.session.get(Company, company_id)
        if not company:
            raise ValueError("Company not found")
        
        plan = self.SUBSCRIPTION_PLANS.get(plan_code)
        if not plan:
            raise ValueError(f"Invalid plan: {plan_code}")
        
        # Get or create Stripe customer
        if not company.stripe_customer_id:
            customer = stripe.Customer.create(
                email=company.email,
                name=company.name,
                metadata={"company_id": company_id}
            )
            company.stripe_customer_id = customer.id
            self.session.add(company)
            self.session.commit()
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=company.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': plan['name'],
                    },
                    'unit_amount': plan['price'],
                    'recurring': {
                        'interval': 'month'
                    }
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'company_id': company_id,
                'plan_code': plan_code
            }
        )
        
        return checkout_session.url
    
    async def create_portal_session(
        self,
        company_id: int,
        return_url: str
    ) -> str:
        """Create Stripe billing portal session for subscription management"""
        
        company = self.session.get(Company, company_id)
        if not company or not company.stripe_customer_id:
            raise ValueError("Company has no Stripe customer")
        
        portal_session = stripe.billing_portal.Session.create(
            customer=company.stripe_customer_id,
            return_url=return_url
        )
        
        return portal_session.url
    
    async def handle_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> None:
        """Process Stripe webhook event"""
        
        event_id = event_data['id']
        event_type = event_data['type']
        
        # Check for duplicate event
        existing = self.session.exec(
            select(PaymentEvent).where(PaymentEvent.provider_event_id == event_id)
        ).first()
        
        if existing:
            return  # Already processed (idempotency)
        
        # Create event record
        event_record = PaymentEvent(
            provider_event_id=event_id,
            event_type=event_type,
            payload_json=str(event_data),
            received_at=datetime.now(timezone.utc)
        )
        self.session.add(event_record)
        
        try:
            # Route to appropriate handler
            if event_type == 'checkout.session.completed':
                await self._handle_checkout_completed(event_data)
            elif event_type == 'customer.subscription.created':
                await self._handle_subscription_created(event_data)
            elif event_type == 'customer.subscription.updated':
                await self._handle_subscription_updated(event_data)
            elif event_type == 'customer.subscription.deleted':
                await self._handle_subscription_deleted(event_data)
            elif event_type == 'invoice.paid':
                await self._handle_invoice_paid(event_data)
            elif event_type == 'invoice.payment_failed':
                await self._handle_invoice_payment_failed(event_data)
            
            event_record.processed = True
            event_record.processed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            event_record.processing_error = str(e)
            event_record.retry_count += 1
            raise
        
        finally:
            self.session.commit()
    
    async def _handle_subscription_created(self, event_data: Dict[str, Any]) -> None:
        """Handle subscription.created webhook"""
        
        stripe_sub = event_data['data']['object']
        company_id = int(stripe_sub['metadata'].get('company_id'))
        plan_code = stripe_sub['metadata'].get('plan_code')
        
        subscription = Subscription(
            company_id=company_id,
            stripe_customer_id=stripe_sub['customer'],
            stripe_subscription_id=stripe_sub['id'],
            plan_code=plan_code,
            status=SubscriptionStatus(stripe_sub['status']),
            seat_count=1,
            amount_per_period=stripe_sub['items']['data'][0]['price']['unit_amount'],
            currency=stripe_sub['currency'],
            interval=stripe_sub['items']['data'][0]['price']['recurring']['interval'],
            current_period_start=datetime.fromtimestamp(stripe_sub['current_period_start'], tz=timezone.utc),
            current_period_end=datetime.fromtimestamp(stripe_sub['current_period_end'], tz=timezone.utc)
        )
        
        if stripe_sub.get('trial_end'):
            subscription.trial_ends_at = datetime.fromtimestamp(stripe_sub['trial_end'], tz=timezone.utc)
        
        self.session.add(subscription)
        self.session.commit()
        
        # Grant entitlements
        await self._grant_plan_entitlements(company_id, plan_code)
    
    async def _grant_plan_entitlements(
        self,
        company_id: int,
        plan_code: str
    ) -> None:
        """Grant feature entitlements based on plan"""
        
        plan = self.SUBSCRIPTION_PLANS.get(plan_code)
        if not plan:
            return
        
        for feature_code in plan['features']:
            # Check if entitlement already exists
            existing = self.session.exec(
                select(Entitlement).where(
                    Entitlement.company_id == company_id,
                    Entitlement.feature_code == feature_code
                )
            ).first()
            
            if existing:
                existing.is_enabled = True
                existing.updated_at = datetime.now(timezone.utc)
            else:
                entitlement = Entitlement(
                    company_id=company_id,
                    feature_code=feature_code,
                    is_enabled=True
                )
                self.session.add(entitlement)
        
        self.session.commit()
    
    def check_entitlement(
        self,
        company_id: int,
        feature_code: str
    ) -> bool:
        """Check if company has access to a feature"""
        
        entitlement = self.session.exec(
            select(Entitlement).where(
                Entitlement.company_id == company_id,
                Entitlement.feature_code == feature_code
            )
        ).first()
        
        if not entitlement:
            return False
        
        if not entitlement.is_enabled:
            return False
        
        # Check expiration
        if entitlement.expires_at and entitlement.expires_at < datetime.now(timezone.utc):
            return False
        
        # Check usage limits
        if entitlement.usage_limit and entitlement.current_usage >= entitlement.usage_limit:
            return False
        
        return True
    
    def increment_usage(
        self,
        company_id: int,
        feature_code: str,
        amount: int = 1
    ) -> None:
        """Increment usage counter for a feature"""
        
        entitlement = self.session.exec(
            select(Entitlement).where(
                Entitlement.company_id == company_id,
                Entitlement.feature_code == feature_code
            )
        ).first()
        
        if entitlement:
            entitlement.current_usage += amount
            self.session.add(entitlement)
            self.session.commit()
```

### Billing Router

**Path**: `backend2/app/routers/billing.py`

```python
"""
Billing and subscription router
"""

import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlmodel import Session, select
import stripe

from app.database import get_session
from app.models import Company, Subscription, Invoice
from app.security import get_current_user
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutSessionRequest(BaseModel):
    plan_code: str


class SubscriptionResponse(BaseModel):
    id: int
    plan_code: str
    status: str
    current_period_end: datetime
    cancel_at_period_end: bool


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create Stripe checkout session for subscription"""
    
    # Only admins can manage billing
    if current_user.get("role") not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company = session.exec(
        select(Company).join(User).where(User.id == current_user["user_id"])
    ).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    billing_service = BillingService(session)
    
    success_url = f"{os.getenv('FRONTEND_URL')}/billing/success"
    cancel_url = f"{os.getenv('FRONTEND_URL')}/billing"
    
    checkout_url = await billing_service.create_checkout_session(
        company_id=company.id,
        plan_code=request.plan_code,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    return {"checkout_url": checkout_url}


@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get current subscription for company"""
    
    company = session.exec(
        select(Company).join(User).where(User.id == current_user["user_id"])
    ).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    subscription = session.exec(
        select(Subscription).where(Subscription.company_id == company.id)
    ).first()
    
    if not subscription:
        return None
    
    return SubscriptionResponse(
        id=subscription.id,
        plan_code=subscription.plan_code,
        status=subscription.status,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end
    )


@router.post("/portal-session")
async def create_portal_session(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create Stripe billing portal session"""
    
    company = session.exec(
        select(Company).join(User).where(User.id == current_user["user_id"])
    ).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    billing_service = BillingService(session)
    
    return_url = f"{os.getenv('FRONTEND_URL')}/billing"
    
    portal_url = await billing_service.create_portal_session(
        company_id=company.id,
        return_url=return_url
    )
    
    return {"portal_url": portal_url}


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    session: Session = Depends(get_session),
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """Handle Stripe webhooks"""
    
    payload = await request.body()
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    billing_service = BillingService(session)
    
    try:
        await billing_service.handle_webhook_event(event)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Processing failed")
```

### Entitlement Middleware

**Path**: `backend2/app/middleware/entitlement.py`

```python
"""
Entitlement checking middleware and decorators
"""

from functools import wraps
from fastapi import HTTPException
from sqlmodel import Session

from app.services.billing_service import BillingService


def require_entitlement(feature_code: str):
    """Decorator to enforce feature entitlement"""
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract session and current_user from kwargs
            session: Session = kwargs.get('session')
            current_user: dict = kwargs.get('current_user')
            
            if not session or not current_user:
                raise HTTPException(status_code=500, detail="Missing dependencies")
            
            # Get company_id from current_user
            company_id = current_user.get('company_id')
            if not company_id:
                raise HTTPException(status_code=403, detail="No company association")
            
            # Check entitlement
            billing_service = BillingService(session)
            if not billing_service.check_entitlement(company_id, feature_code):
                raise HTTPException(
                    status_code=403,
                    detail=f"Feature '{feature_code}' not available on your plan"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    
    return decorator
```

### Usage Example

```python
from app.middleware.entitlement import require_entitlement

@router.post("/meetings/schedule")
@require_entitlement("scheduler_enabled")
async def schedule_meeting(
    request: MeetingRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Schedule meeting - requires scheduler entitlement"""
    # ... implementation
```

---

## Phase 4.2: Analytics Event Pipeline

### Database Models

#### New Table: `analytics_event`
```python
class AnalyticsEventType(str, Enum):
    # Job events
    JOB_VIEWED = "job_viewed"
    JOB_CREATED = "job_created"
    JOB_EDITED = "job_edited"
    JOB_FROZEN = "job_frozen"
    JOB_REOPENED = "job_reopened"
    JOB_EXPIRED = "job_expired"
    
    # Candidate events
    CANDIDATE_VIEWED = "candidate_viewed"
    PROFILE_SEARCHED = "profile_searched"
    
    # Swipe events
    SWIPE_LIKE = "swipe_like"
    SWIPE_PASS = "swipe_pass"
    
    # Application events
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_REVIEWED = "application_reviewed"
    APPLICATION_SHORTLISTED = "application_shortlisted"
    APPLICATION_REJECTED = "application_rejected"
    
    # Communication events
    MESSAGE_SENT = "message_sent"
    CONVERSATION_STARTED = "conversation_started"
    
    # Interview events
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_RESCHEDULED = "interview_rescheduled"
    INTERVIEW_CANCELED = "interview_canceled"
    INTERVIEW_COMPLETED = "interview_completed"
    
    # Outcome events
    OFFER_EXTENDED = "offer_extended"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    HIRE_COMPLETED = "hire_completed"


class AnalyticsEvent(SQLModel, table=True):
    """Append-only analytics event log"""
    __tablename__ = "analytics_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Tenant isolation
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Actor
    user_id: Optional[int] = Field(foreign_key="user.id", index=True)
    
    # Event details
    event_type: AnalyticsEventType = Field(index=True)
    event_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    # Entity references
    entity_type: Optional[str] = Field(index=True)  # "job_posting", "candidate", "application"
    entity_id: Optional[int] = Field(index=True)
    
    # Common entity shortcuts
    job_posting_id: Optional[int] = Field(foreign_key="jobposting.id", index=True)
    candidate_id: Optional[int] = Field(foreign_key="candidate.id", index=True)
    application_id: Optional[int] = Field(foreign_key="application.id", index=True)
    
    # Flexible metadata
    metadata_json: Optional[str] = None  # JSON string for additional context
    
    # Correlation
    session_id: Optional[str] = Field(index=True)
    correlation_id: Optional[str] = Field(index=True)
    
    # Do NOT add updated_at - this is append-only
```

#### New Table: `analytics_rollup_daily`
```python
class AnalyticsRollupDaily(SQLModel, table=True):
    """Daily aggregated analytics"""
    __tablename__ = "analytics_rollup_daily"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Dimensions
    company_id: int = Field(foreign_key="company.id", index=True)
    date: date = Field(index=True)
    job_posting_id: Optional[int] = Field(foreign_key="jobposting.id", index=True)
    
    # Job metrics
    job_views: int = Field(default=0)
    job_likes: int = Field(default=0)
    job_passes: int = Field(default=0)
    
    # Application metrics
    applications_submitted: int = Field(default=0)
    applications_reviewed: int = Field(default=0)
    applications_shortlisted: int = Field(default=0)
    applications_rejected: int = Field(default=0)
    
    # Communication metrics
    conversations_started: int = Field(default=0)
    messages_sent: int = Field(default=0)
    
    # Interview metrics
    interviews_scheduled: int = Field(default=0)
    interviews_completed: int = Field(default=0)
    
    # Conversion metrics
    offers_extended: int = Field(default=0)
    hires_completed: int = Field(default=0)
    
    # Computed at aggregation time
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('company_id', 'date', 'job_posting_id', name='uix_rollup_daily'),
    )
```

### Analytics Service

**Path**: `backend2/app/services/analytics_service.py`

```python
"""
Analytics event tracking service
"""

import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime, date, timezone
from sqlmodel import Session, select, func

from app.models import (
    AnalyticsEvent, AnalyticsRollupDaily,
    AnalyticsEventType
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Event tracking and aggregation"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def track_event(
        self,
        company_id: int,
        event_type: AnalyticsEventType,
        user_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        job_posting_id: Optional[int] = None,
        candidate_id: Optional[int] = None,
        application_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> AnalyticsEvent:
        """Track an analytics event"""
        
        event = AnalyticsEvent(
            company_id=company_id,
            user_id=user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            job_posting_id=job_posting_id,
            candidate_id=candidate_id,
            application_id=application_id,
            metadata_json=json.dumps(metadata) if metadata else None,
            session_id=session_id,
            correlation_id=correlation_id
        )
        
        self.session.add(event)
        self.session.commit()
        
        logger.info(f"Tracked event: {event_type} for company {company_id}")
        
        return event
    
    def aggregate_daily(
        self,
        company_id: int,
        target_date: date
    ) -> None:
        """Aggregate events for a specific date"""
        
        # Get all events for the date
        start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        
        events = self.session.exec(
            select(AnalyticsEvent).where(
                AnalyticsEvent.company_id == company_id,
                AnalyticsEvent.event_time >= start_dt,
                AnalyticsEvent.event_time < end_dt
            )
        ).all()
        
        # Group by job_posting_id
        job_metrics = {}
        
        for event in events:
            job_id = event.job_posting_id or 0  # 0 for company-wide
            
            if job_id not in job_metrics:
                job_metrics[job_id] = {
                    'job_views': 0,
                    'job_likes': 0,
                    'job_passes': 0,
                    'applications_submitted': 0,
                    'applications_reviewed': 0,
                    'applications_shortlisted': 0,
                    'applications_rejected': 0,
                    'conversations_started': 0,
                    'messages_sent': 0,
                    'interviews_scheduled': 0,
                    'interviews_completed': 0,
                    'offers_extended': 0,
                    'hires_completed': 0
                }
            
            metrics = job_metrics[job_id]
            
            # Map event types to metrics
            if event.event_type == AnalyticsEventType.JOB_VIEWED:
                metrics['job_views'] += 1
            elif event.event_type == AnalyticsEventType.SWIPE_LIKE:
                metrics['job_likes'] += 1
            elif event.event_type == AnalyticsEventType.SWIPE_PASS:
                metrics['job_passes'] += 1
            elif event.event_type == AnalyticsEventType.APPLICATION_SUBMITTED:
                metrics['applications_submitted'] += 1
            elif event.event_type == AnalyticsEventType.APPLICATION_REVIEWED:
                metrics['applications_reviewed'] += 1
            elif event.event_type == AnalyticsEventType.APPLICATION_SHORTLISTED:
                metrics['applications_shortlisted'] += 1
            elif event.event_type == AnalyticsEventType.APPLICATION_REJECTED:
                metrics['applications_rejected'] += 1
            elif event.event_type == AnalyticsEventType.CONVERSATION_STARTED:
                metrics['conversations_started'] += 1
            elif event.event_type == AnalyticsEventType.MESSAGE_SENT:
                metrics['messages_sent'] += 1
            elif event.event_type == AnalyticsEventType.INTERVIEW_SCHEDULED:
                metrics['interviews_scheduled'] += 1
            elif event.event_type == AnalyticsEventType.INTERVIEW_COMPLETED:
                metrics['interviews_completed'] += 1
            elif event.event_type == AnalyticsEventType.OFFER_EXTENDED:
                metrics['offers_extended'] += 1
            elif event.event_type == AnalyticsEventType.HIRE_COMPLETED:
                metrics['hires_completed'] += 1
        
        # Upsert rollup records
        for job_id, metrics in job_metrics.items():
            rollup = self.session.exec(
                select(AnalyticsRollupDaily).where(
                    AnalyticsRollupDaily.company_id == company_id,
                    AnalyticsRollupDaily.date == target_date,
                    AnalyticsRollupDaily.job_posting_id == (job_id if job_id > 0 else None)
                )
            ).first()
            
            if rollup:
                # Update existing
                for key, value in metrics.items():
                    setattr(rollup, key, value)
                rollup.updated_at = datetime.now(timezone.utc)
            else:
                # Create new
                rollup = AnalyticsRollupDaily(
                    company_id=company_id,
                    date=target_date,
                    job_posting_id=job_id if job_id > 0 else None,
                    **metrics
                )
                self.session.add(rollup)
        
        self.session.commit()
        logger.info(f"Aggregated analytics for company {company_id} date {target_date}")
    
    def get_job_funnel(
        self,
        company_id: int,
        job_posting_id: int,
        date_range_days: int = 30
    ) -> Dict[str, int]:
        """Get recruitment funnel metrics for a job"""
        
        start_date = date.today() - timedelta(days=date_range_days)
        
        rollups = self.session.exec(
            select(AnalyticsRollupDaily).where(
                AnalyticsRollupDaily.company_id == company_id,
                AnalyticsRollupDaily.job_posting_id == job_posting_id,
                AnalyticsRollupDaily.date >= start_date
            )
        ).all()
        
        # Sum across all days
        funnel = {
            'views': sum(r.job_views for r in rollups),
            'likes': sum(r.job_likes for r in rollups),
            'applications': sum(r.applications_submitted for r in rollups),
            'interviews': sum(r.interviews_scheduled for r in rollups),
            'offers': sum(r.offers_extended for r in rollups),
            'hires': sum(r.hires_completed for r in rollups)
        }
        
        # Calculate conversion rates
        if funnel['views'] > 0:
            funnel['like_rate'] = funnel['likes'] / funnel['views']
            funnel['application_rate'] = funnel['applications'] / funnel['views']
        
        if funnel['applications'] > 0:
            funnel['interview_rate'] = funnel['interviews'] / funnel['applications']
        
        if funnel['interviews'] > 0:
            funnel['offer_rate'] = funnel['offers'] / funnel['interviews']
        
        if funnel['offers'] > 0:
            funnel['hire_rate'] = funnel['hires'] / funnel['offers']
        
        return funnel
```

### Analytics Router

**Path**: `backend2/app/routers/analytics.py`

```python
"""
Analytics and reporting endpoints
"""

import logging
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_session
from app.models import Company, User
from app.security import get_current_user
from app.services.analytics_service import AnalyticsService
from app.middleware.entitlement import require_entitlement

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


class FunnelMetrics(BaseModel):
    views: int
    likes: int
    applications: int
    interviews: int
    offers: int
    hires: int
    like_rate: Optional[float] = None
    application_rate: Optional[float] = None
    interview_rate: Optional[float] = None
    offer_rate: Optional[float] = None
    hire_rate: Optional[float] = None


@router.get("/recruiter/overview")
async def get_recruiter_overview(
    date_range_days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recruiter overview analytics"""
    
    company_id = current_user.get('company_id')
    if not company_id:
        raise HTTPException(status_code=403, detail="No company association")
    
    analytics_service = AnalyticsService(session)
    
    # Get aggregated metrics for date range
    start_date = date.today() - timedelta(days=date_range_days)
    
    rollups = session.exec(
        select(AnalyticsRollupDaily).where(
            AnalyticsRollupDaily.company_id == company_id,
            AnalyticsRollupDaily.date >= start_date
        )
    ).all()
    
    # Sum across all jobs
    total_metrics = {
        'job_views': sum(r.job_views for r in rollups),
        'applications': sum(r.applications_submitted for r in rollups),
        'interviews': sum(r.interviews_scheduled for r in rollups),
        'offers': sum(r.offers_extended for r in rollups),
        'hires': sum(r.hires_completed for r in rollups)
    }
    
    return total_metrics


@router.get("/recruiter/funnel", response_model=FunnelMetrics)
@require_entitlement("analytics_advanced_enabled")
async def get_funnel_analytics(
    job_posting_id: int,
    date_range_days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get advanced funnel analytics for a job - premium feature"""
    
    company_id = current_user.get('company_id')
    if not company_id:
        raise HTTPException(status_code=403, detail="No company association")
    
    analytics_service = AnalyticsService(session)
    
    funnel = analytics_service.get_job_funnel(
        company_id=company_id,
        job_posting_id=job_posting_id,
        date_range_days=date_range_days
    )
    
    return FunnelMetrics(**funnel)
```

---

## Phase 4.3: Automated Lifecycle Actions

### Background Worker System

**Path**: `backend2/app/workers/lifecycle_worker.py`

```python
"""
Job lifecycle automation worker
Runs scheduled checks for expiration, auto-freeze, notifications
"""

import logging
from datetime import datetime, timedelta, timezone, date
from typing import List
from sqlmodel import Session, select

from app.database import engine
from app.models import (
    JobPosting, JobPostingStatus, Notification,
    Company, User
)
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


class LifecycleWorker:
    """Automated job lifecycle management"""
    
    def __init__(self):
        self.session = Session(engine)
        self.analytics = AnalyticsService(self.session)
    
    def run(self):
        """Main worker entry point - called by scheduler"""
        try:
            logger.info("Starting lifecycle worker run")
            
            self.check_expiring_jobs()
            self.auto_freeze_expired_jobs()
            self.notify_reopened_jobs()
            
            logger.info("Lifecycle worker run completed")
        
        except Exception as e:
            logger.error(f"Lifecycle worker error: {e}", exc_info=True)
        
        finally:
            self.session.close()
    
    def check_expiring_jobs(self):
        """Send notifications for jobs expiring soon"""
        
        # Find jobs expiring in 3 days
        expiry_threshold = date.today() + timedelta(days=3)
        
        jobs = self.session.exec(
            select(JobPosting).where(
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.application_end_date == expiry_threshold
            )
        ).all()
        
        for job in jobs:
            # Track analytics event
            self.analytics.track_event(
                company_id=job.company_id,
                event_type=AnalyticsEventType.JOB_EXPIRING_SOON,
                job_posting_id=job.id,
                metadata={'days_remaining': 3}
            )
            
            # Notify recruiters
            self._notify_company_users(
                company_id=job.company_id,
                title="Job expiring soon",
                message=f"Job '{job.title}' will expire in 3 days",
                notification_type="job_lifecycle",
                entity_id=job.id
            )
        
        logger.info(f"Checked {len(jobs)} expiring jobs")
    
    def auto_freeze_expired_jobs(self):
        """Automatically freeze jobs past their end date"""
        
        today = date.today()
        
        jobs = self.session.exec(
            select(JobPosting).where(
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.application_end_date < today
            )
        ).all()
        
        for job in jobs:
            # Freeze the job
            job.status = JobPostingStatus.FROZEN
            job.updated_at = datetime.now(timezone.utc)
            
            # Track event
            self.analytics.track_event(
                company_id=job.company_id,
                event_type=AnalyticsEventType.JOB_EXPIRED,
                job_posting_id=job.id
            )
            
            # Notify company
            self._notify_company_users(
                company_id=job.company_id,
                title="Job auto-frozen",
                message=f"Job '{job.title}' was automatically frozen after expiration",
                notification_type="job_lifecycle",
                entity_id=job.id
            )
        
        self.session.commit()
        logger.info(f"Auto-frozen {len(jobs)} expired jobs")
    
    def notify_reopened_jobs(self):
        """Notify relevant candidates when jobs are reopened"""
        
        # Find jobs reopened in the last 24 hours
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        
        jobs = self.session.exec(
            select(JobPosting).where(
                JobPosting.status == JobPostingStatus.REPOSTED,
                JobPosting.updated_at >= yesterday
            )
        ).all()
        
        for job in jobs:
            # Find previous applicants or interested candidates
            previous_applicants = self._get_previous_applicants(job.id)
            
            for candidate in previous_applicants:
                # Send notification
                notification = Notification(
                    user_id=candidate.user_id,
                    title="Job reopened",
                    message=f"Good news! '{job.title}' is accepting applications again",
                    notification_type="job_reopened",
                    entity_id=job.id,
                    created_at=datetime.now(timezone.utc)
                )
                self.session.add(notification)
            
            self.session.commit()
        
        logger.info(f"Notified candidates for {len(jobs)} reopened jobs")
    
    def _notify_company_users(
        self,
        company_id: int,
        title: str,
        message: str,
        notification_type: str,
        entity_id: int
    ):
        """Send notification to all admin/recruiter users in company"""
        
        users = self.session.exec(
            select(User).where(
                User.company_id == company_id,
                User.role.in_(["admin", "recruiter"])
            )
        ).all()
        
        for user in users:
            notification = Notification(
                user_id=user.id,
                title=title,
                message=message,
                notification_type=notification_type,
                entity_id=entity_id,
                created_at=datetime.now(timezone.utc)
            )
            self.session.add(notification)
        
        self.session.commit()
    
    def _get_previous_applicants(self, job_id: int) -> List:
        """Get candidates who previously applied to this job"""
        from app.models import Application, Candidate
        
        # Simplified - in real implementation, add more filters
        applications = self.session.exec(
            select(Application).where(
                Application.job_posting_id == job_id
            )
        ).all()
        
        candidate_ids = {app.candidate_id for app in applications}
        candidates = [self.session.get(Candidate, cid) for cid in candidate_ids]
        
        return [c for c in candidates if c]


# For running as scheduled job
if __name__ == "__main__":
    worker = LifecycleWorker()
    worker.run()
```

### Worker Scheduler

**Path**: `backend2/app/workers/scheduler.py`

```python
"""
Background worker scheduler using APScheduler
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.workers.lifecycle_worker import LifecycleWorker
from app.workers.analytics_worker import AnalyticsAggregationWorker
from app.workers.reminder_worker import ReminderWorker

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def start_workers():
    """Initialize and start all background workers"""
    
    # Lifecycle automation - runs daily at 2 AM UTC
    scheduler.add_job(
        func=run_lifecycle_worker,
        trigger=CronTrigger(hour=2, minute=0),
        id='lifecycle_worker',
        name='Job lifecycle automation',
        replace_existing=True
    )
    
    # Analytics aggregation - runs daily at 3 AM UTC
    scheduler.add_job(
        func=run_analytics_aggregation,
        trigger=CronTrigger(hour=3, minute=0).
        id='analytics_aggregation',
        name='Daily analytics aggregation',
        replace_existing=True
    )
    
    # Reminder worker - runs every hour
    scheduler.add_job(
        func=run_reminder_worker,
        trigger=CronTrigger(minute=0),
        id='reminder_worker',
        name='Send scheduled reminders',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Background workers started")


def stop_workers():
    """Gracefully shutdown workers"""
    scheduler.shutdown()
    logger.info("Background workers stopped")


def run_lifecycle_worker():
    try:
        worker = LifecycleWorker()
        worker.run()
    except Exception as e:
        logger.error(f"Lifecycle worker failed: {e}", exc_info=True)


def run_analytics_aggregation():
    try:
        worker = AnalyticsAggregationWorker()
        worker.run()
    except Exception as e:
        logger.error(f"Analytics aggregation failed: {e}", exc_info=True)


def run_reminder_worker():
    try:
        worker = ReminderWorker()
        worker.run()
    except Exception as e:
        logger.error(f"Reminder worker failed: {e}", exc_info=True)
```

---

## Implementation Checklist

### Phase 3.1: Attachments ✅
- [ ] Add MessageAttachment model to models.py
- [ ] Create storage_service.py with S3 provider
- [ ] Add attachment router endpoints
- [ ] Update Message model with attachments relationship
- [ ] Create AttachmentUploader frontend component
- [ ] Create AttachmentList frontend component
- [ ] Add AWS S3 credentials to .env
- [ ] Test upload/download flow
- [ ] Add virus scanning queue (async)

### Phase 3.2: Email Threading ✅
- [ ] Add EmailThreadLink and InboundEmailEvent models
- [ ] Create email_service.py with SendGrid provider
- [ ] Create emailwebhooks.py router
- [ ] Add tokenized meeting action endpoints
- [ ] Update interview email templates
- [ ] Configure SendGrid inbound parse
- [ ] Test inbound email mapping
- [ ] Add recruiter unified inbox view

### Phase 4.1: Billing ✅
- [ ] Add Subscription, Invoice, PaymentEvent, Entitlement models
- [ ] Create billing_service.py
- [ ] Create billing.py router
- [ ] Add Stripe webhook handler
- [ ] Create entitlement middleware
- [ ] Add feature gates to premium endpoints
- [ ] Create Billing frontend page
- [ ] Test checkout flow
- [ ] Test subscription management

### Phase 4.2: Analytics ✅
- [ ] Add AnalyticsEvent and AnalyticsRollupDaily models
- [ ] Create analytics_service.py
- [ ] Add analytics.py router
- [ ] Integrate event tracking in existing endpoints
- [ ] Create aggregation worker
- [ ] Build analytics dashboard frontend
- [ ] Create funnel visualization
- [ ] Test daily rollup job

### Phase 4.3: Lifecycle ✅
- [ ] Create lifecycle_worker.py
- [ ] Add scheduler.py
- [ ] Add lifecycle notifications
- [ ] Test expiring job alerts
- [ ] Test auto-freeze logic
- [ ] Test reopened job notifications
- [ ] Update main.py to start workers

### Infrastructure ✅
- [ ] Add boto3 for S3 (pip install boto3)
- [ ] Add sendgrid (pip install sendgrid)
- [ ] Add stripe (pip install stripe)
- [ ] Add apscheduler (pip install apscheduler)
- [ ] Configure AWS credentials
- [ ] Configure SendGrid API keys
- [ ] Configure Stripe API keys
- [ ] Add environment variables

---

## Environment Variables

Add to `backend2/.env`:

```bash
# Object Storage
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=talentgraph-attachments
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key
SENDGRID_WEBHOOK_SECRET=your_secret
SENDGRID_FROM_EMAIL=noreply@talentgraph.com
REPLY_TO_DOMAIN=talentgraph.com

# Billing
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# App URLs
APP_BASE_URL=https://talentgraph.com
FRONTEND_URL=http://localhost:3003
```

---

## Rollout Strategy

### Week 1: Phase 3.1 MVP
- Deploy attachments with S3 storage
- Basic file upload/download
- Manual virus scan review initially

### Week 2: Phase 3.2 MVP
- Deploy email threading
- SendGrid inbound parse setup
- Test with limited users

### Week 3: Phase 4.1 Soft Launch  
- Enable billing for new companies only
- Test subscription flow
- Monitor Stripe webhooks

### Week 4: Analytics + Automation
- Deploy analytics event tracking
- Start daily aggregation jobs
- Enable lifecycle automation

### Week 5: Full Production
- Enable feature flags for all users
- Monitor performance
- Collect feedback

---

**END OF IMPLEMENTATION PLAN**
