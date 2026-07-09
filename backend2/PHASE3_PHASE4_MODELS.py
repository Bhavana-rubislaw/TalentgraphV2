"""
TalentGraph Phase 3 & 4 Model Extensions
=========================================
These models should be added to backend2/app/models.py

IMPORTANT: Also add these enums to the existing models.py:
- AttachmentScanStatus
- EmailProvider  
- SubscriptionStatus
- InvoiceStatus
- AnalyticsEventType
"""

from typing import Optional
from datetime import datetime, date, timezone
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS - Add these to the enum section in models.py
# ═══════════════════════════════════════════════════════════════════════════

class AttachmentScanStatus(str, Enum):
    """File attachment virus scan status"""
    PENDING = "pending"
    SCANNING = "scanning"
    CLEAN = "clean"
    BLOCKED = "blocked"
    FAILED = "failed"


class EmailProvider(str, Enum):
    """Email service provider types"""
    SENDGRID = "sendgrid"
    POSTMARK = "postmark"
    MAILGUN = "mailgun"


class SubscriptionStatus(str, Enum):
    """Stripe subscription status"""
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"


class InvoiceStatus(str, Enum):
    """Invoice payment status"""
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class AnalyticsEventType(str, Enum):
    """Types of analytics events tracked"""
    # Job events
    JOB_VIEWED = "job_viewed"
    JOB_CREATED = "job_created"
    JOB_EDITED = "job_edited"
    JOB_FROZEN = "job_frozen"
    JOB_REOPENED = "job_reopened"
    JOB_EXPIRED = "job_expired"
    JOB_EXPIRING_SOON = "job_expiring_soon"
    
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


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3.1: MESSAGING ATTACHMENTS
# ═══════════════════════════════════════════════════════════════════════════

class MessageAttachment(SQLModel, table=True):
    """
    File attachments for messages
    
    Security model:
    - Files stored in object storage (S3/GCS), not in database
    - Virus scanning before download allowed
    - Tenant isolation via storage key path
    - Short-lived presigned URLs for downloads
    """
    __tablename__ = "message_attachment"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="message.id", index=True)
    
    # Storage metadata
    storage_provider: str = Field(default="s3")  # "s3", "gcs", "azure"
    storage_key: str = Field(index=True)  # unique object key with tenant isolation
    storage_bucket: str
    
    # File metadata
    original_filename: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str = Field(index=True)  # for deduplication
    
    # Security - virus scanning
    scan_status: AttachmentScanStatus = Field(default=AttachmentScanStatus.PENDING, index=True)
    scan_message: Optional[str] = None
    scan_completed_at: Optional[datetime] = None
    
    # Audit trail
    uploaded_by_user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    expires_at: Optional[datetime] = None  # optional expiration for temp files
    
    # Relationships
    message: Optional["Message"] = Relationship(back_populates="attachments")
    uploaded_by: Optional["User"] = Relationship()


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3.2: INBOUND EMAIL THREADING
# ═══════════════════════════════════════════════════════════════════════════

class EmailThreadLink(SQLModel, table=True):
    """
    Maps external email threads back to TalentGraph entities
    
    Purpose:
    - When candidate replies via email instead of app
    - Email provider webhook posts inbound email here
    - We create in-app Message and notify recruiter
    
    Security:
    - Unique action tokens with expiration
    - Token embedded in reply-to address
    - Tenant isolation via company_id
    """
    __tablename__ = "email_thread_link"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Provider information
    provider_name: str = Field(index=True)  # "sendgrid", "postmark", "mailgun"
    provider_thread_id: Optional[str] = Field(index=True)
    provider_message_id: str = Field(index=True, unique=True)
    
    # Mapping to TalentGraph entities
    conversation_id: Optional[int] = Field(foreign_key="conversation.id", index=True)
    meeting_id: Optional[int] = Field(foreign_key="meeting.id", index=True)
    
    # Participants (for authorization)
    candidate_user_id: int = Field(foreign_key="user.id", index=True)
    recruiter_user_id: int = Field(foreign_key="user.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Authentication token for tokenized actions
    action_token: str = Field(unique=True, index=True)  # embedded in reply-to address
    token_expires_at: datetime
    
    # Email metadata
    subject: str
    from_email: str
    to_email: str  # contains tokenized reply address
    
    # Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_inbound_at: Optional[datetime] = None
    inbound_count: int = Field(default=0)
    
    # Relationships
    conversation: Optional["Conversation"] = Relationship()
    meeting: Optional["Meeting"] = Relationship()


class InboundEmailEvent(SQLModel, table=True):
    """
    Audit log for inbound emails from candidates
    
    Purpose:
    - Track every inbound email received
    - Support debugging and compliance
    - Idempotency via provider_event_id
    """
    __tablename__ = "inbound_email_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Provider information (for idempotency)
    provider_name: str
    provider_event_id: str = Field(unique=True, index=True)
    
    # Email metadata
    from_email: str = Field(index=True)
    to_email: str = Field(index=True)
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    
    # Processing status
    thread_link_id: Optional[int] = Field(foreign_key="email_thread_link.id")
    message_created_id: Optional[int] = Field(foreign_key="message.id")
    processed: bool = Field(default=False, index=True)
    processing_error: Optional[str] = None
    
    # Audit trail
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4.1: SUBSCRIPTIONS & BILLING
# ═══════════════════════════════════════════════════════════════════════════

class Subscription(SQLModel, table=True):
    """
    Company subscription tracking (Stripe integration)
    
    Business rules:
    - One subscription per company
    - Trial period supported
    - Seat-based billing
    - Cancel at period end (grace period)
    """
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
    
    # Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    company: Optional["Company"] = Relationship(back_populates="subscription")


class Invoice(SQLModel, table=True):
    """
    Invoice records from Stripe
    
    Purpose:
    - Track payment history
    - Provide invoice links to customers
    - Support accounting/reporting
    """
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
    
    # URLs (from Stripe)
    hosted_invoice_url: Optional[str] = None
    invoice_pdf_url: Optional[str] = None
    
    # Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    company: Optional["Company"] = Relationship()
    subscription: Optional["Subscription"] = Relationship()


class PaymentEvent(SQLModel, table=True):
    """
    Stripe webhook event log
    
    Purpose:
    - Idempotency for webhook processing
    - Audit trail for payment events
    - Support debugging and retry logic
    """
    __tablename__ = "payment_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(foreign_key="company.id", index=True)
    subscription_id: Optional[int] = Field(foreign_key="subscription.id", index=True)
    
    # Provider information
    provider_name: str = Field(default="stripe")
    provider_event_id: str = Field(unique=True, index=True)  # for idempotency
    event_type: str = Field(index=True)  # "subscription.created", "invoice.paid", etc.
    
    # Payload (store full event for debugging)
    payload_json: str  # JSON string of full Stripe event
    
    # Processing status
    processed: bool = Field(default=False, index=True)
    processed_at: Optional[datetime] = None
    processing_error: Optional[str] = None
    retry_count: int = Field(default=0)
    
    # Audit trail
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Entitlement(SQLModel, table=True):
    """
    Feature entitlements for companies
    
    Purpose:
    - Gate premium features based on subscription plan
    - Track usage against limits
    - Support add-ons and custom entitlements
    
    Feature codes:
    - scheduler_enabled
    - calendar_sync_enabled
    - analytics_advanced_enabled
    - video_integrations_enabled
    - job_postings_limit
    - seat_limit
    """
    __tablename__ = "entitlement"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Feature
    feature_code: str = Field(index=True)
    is_enabled: bool = Field(default=True, index=True)
    
    # Limits (optional)
    usage_limit: Optional[int] = None  # e.g., max 5 job postings
    current_usage: int = Field(default=0)
    seat_limit: Optional[int] = None
    
    # Validity
    expires_at: Optional[datetime] = None
    
    # Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    company: Optional["Company"] = Relationship()
    
    # Unique constraint: one row per company + feature
    __table_args__ = (
        UniqueConstraint('company_id', 'feature_code', name='uix_company_feature'),
    )


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4.2: ANALYTICS EVENT PIPELINE
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsEvent(SQLModel, table=True):
    """
    Append-only analytics event log
    
    Design principles:
    - Never update or delete events (append-only)
    - Aggregated into rollup tables by workers
    - Tenant isolated by company_id
    - Correlation IDs for tracking user journeys
    
    Storage considerations:
    - Will grow large over time
    - Consider partitioning by date
    - Consider archiving old events to cold storage
    """
    __tablename__ = "analytics_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Tenant isolation
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Actor
    user_id: Optional[int] = Field(foreign_key="user.id", index=True)
    
    # Event details
    event_type: AnalyticsEventType = Field(index=True)
    event_time: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )
    
    # Entity references (flexible - depends on event type)
    entity_type: Optional[str] = Field(index=True)  # "job_posting", "candidate", "application"
    entity_id: Optional[int] = Field(index=True)
    
    # Common entity shortcuts (for query performance)
    job_posting_id: Optional[int] = Field(foreign_key="jobposting.id", index=True)
    candidate_id: Optional[int] = Field(foreign_key="candidate.id", index=True)
    application_id: Optional[int] = Field(foreign_key="application.id", index=True)
    
    # Flexible metadata (JSON for additional context)
    metadata_json: Optional[str] = None
    
    # Correlation (for tracking user journeys)
    session_id: Optional[str] = Field(index=True)
    correlation_id: Optional[str] = Field(index=True)
    
    # NOTE: No updated_at - this is append-only!


class AnalyticsRollupDaily(SQLModel, table=True):
    """
    Daily aggregated analytics
    
    Purpose:
    - Fast queries for dashboards
    - Reduces load on events table
    - Pre-computed metrics
    
    Aggregation:
    - Generated by daily worker
    - Sums events from analytics_event table
    - Can be regenerated if needed
    """
    __tablename__ = "analytics_rollup_daily"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Dimensions
    company_id: int = Field(foreign_key="company.id", index=True)
    rollup_date: date = Field(index=True)  # Renamed from 'date' to avoid conflict
    job_posting_id: Optional[int] = Field(foreign_key="jobposting.id", index=True)
    
    # Metrics (simplified names to match analytics_service.py usage)
    views: int = Field(default=0)
    likes: int = Field(default=0)
    applications: int = Field(default=0)
    interviews_scheduled: int = Field(default=0)
    interviews_completed: int = Field(default=0)
    offers_made: int = Field(default=0)
    hires: int = Field(default=0)
    
    # Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    company: Optional["Company"] = Relationship()
    job_posting: Optional["JobPosting"] = Relationship()
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('company_id', 'rollup_date', 'job_posting_id', name='uix_rollup_daily'),
    )


# ═══════════════════════════════════════════════════════════════════════════
# MODEL RELATIONSHIP UPDATES
# ═══════════════════════════════════════════════════════════════════════════

"""
Add these relationship fields to existing models:

## In Message model:
    attachments: List["MessageAttachment"] = Relationship(back_populates="message")

## In Company model:
    subscription: Optional["Subscription"] = Relationship(back_populates="company")
    stripe_customer_id: Optional[str] = Field(default=None, index=True)

## In Meeting model:
    email_thread_links: List["EmailThreadLink"] = Relationship(back_populates="meeting")

## In Conversation model:
    email_thread_links: List["EmailThreadLink"] = Relationship(back_populates="conversation")
"""


# ═══════════════════════════════════════════════════════════════════════════
# MIGRATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

"""
To apply these models to the database:

1. Add all model classes and enums to backend2/app/models.py

2. Update existing models with relationships (see above)

3. Run migration:
   cd backend2
   python -c "
   from app.database import engine
   from app.models import *
   from sqlmodel import SQLModel
   SQLModel.metadata.create_all(engine)
   print('✅ Phase 3 & 4 models migrated successfully')
   "

4. Verify tables exist:
   psql -d talentgraph_v2 -c "\\dt"
   
   Should show:
   - message_attachment
   - email_thread_link
   - inbound_email_event
   - subscription
   - invoice
   - payment_event
   - entitlement
   - analytics_event
   - analytics_rollup_daily
"""
