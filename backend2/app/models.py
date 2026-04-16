"""
SQLModel Data Models for TalentGraph V2
Candidate-centric talent marketplace with enhanced job profiles and postings
"""

from typing import Optional, List
from datetime import datetime, date
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field, Relationship, Column, Date
from sqlalchemy import Enum as SQLEnum
from enum import Enum


class UserRole(str, Enum):
    CANDIDATE = "candidate"
    ADMIN = "admin"
    HR = "hr"
    RECRUITER = "recruiter"


class WorkType(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class EmploymentType(str, Enum):
    FT = "ft"
    PT = "pt"
    CONTRACT = "contract"
    C2C = "c2c"
    W2 = "w2"


class VisaStatus(str, Enum):
    US_CITIZEN = "us_citizen"
    US_GREEN_CARD = "us_green_card"
    US_VISA = "us_visa"
    EU_CITIZEN = "eu_citizen"
    UK_CITIZEN = "uk_citizen"
    WORK_VISA = "work_visa"


class CurrencyType(str, Enum):
    USD = "usd"
    GBP = "gbp"
    EUR = "eur"


class JobPostingStatus(str, Enum):
    """
    Job posting lifecycle status
    - active: Currently open and accepting applications
    - frozen: Temporarily closed, not accepting new applications, preserved in system
    - reposted: Reopened/relisted posting that was previously frozen
    - cancelled: Permanently closed, position no longer hiring (cannot be reactivated)
    """
    ACTIVE = "active"
    FROZEN = "frozen"
    REPOSTED = "reposted"
    CANCELLED = "cancelled"


class MeetingStatus(str, Enum):
    """
    Meeting lifecycle status
    - scheduled: Meeting confirmed and scheduled
    - cancelled: Meeting cancelled by either party
    - reschedule_requested: Candidate requested reschedule
    - rescheduled: Meeting was rescheduled by recruiter
    - completed: Meeting took place
    - no_show: Meeting time passed without attendance
    """
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    RESCHEDULE_REQUESTED = "reschedule_requested"
    RESCHEDULED = "rescheduled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class MeetingType(str, Enum):
    """
    Type of meeting
    - interview: Job interview (recruiter + candidate)
    - screening: Initial candidate screening
    - follow_up: Follow-up discussion
    - other: Generic meeting
    """
    INTERVIEW = "interview"
    SCREENING = "screening"
    FOLLOW_UP = "follow_up"
    OTHER = "other"


class CalendarProvider(str, Enum):
    """Calendar provider types"""
    GOOGLE = "google"
    MICROSOFT = "microsoft"


class VideoProvider(str, Enum):
    """Video conferencing provider types"""
    ZOOM = "zoom"
    MICROSOFT_TEAMS = "microsoft_teams"
    GOOGLE_MEET = "google_meet"


class AnalyticsEventType(str, Enum):
    """Analytics event types for tracking user actions"""
    # Job events
    JOB_VIEWED = "job_viewed"
    JOB_LIKED = "job_liked"
    JOB_EXPIRED = "job_expired"
    
    # Application events
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_VIEWED = "application_viewed"
    APPLICATION_STATUS_CHANGED = "application_status_changed"
    
    # Interview events
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_COMPLETED = "interview_completed"
    INTERVIEW_CANCELLED = "interview_cancelled"
    
    # Hiring events
    OFFER_MADE = "offer_made"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    CANDIDATE_HIRED = "candidate_hired"
    CANDIDATE_REJECTED = "candidate_rejected"
    
    # Communication events
    MESSAGE_SENT = "message_sent"
    MESSAGE_READ = "message_read"
    EMAIL_SENT = "email_sent"
    EMAIL_OPENED = "email_opened"
    EMAIL_CLICKED = "email_clicked"
    
    # Other events
    SEARCH_PERFORMED = "search_performed"
    PROFILE_VIEWED = "profile_viewed"
    PAYMENT_COMPLETED = "payment_completed"
    GOOGLE_MEET = "google_meet"
    OTHER = "other"


# ============ USER MODELS ============

class User(SQLModel, table=True):
    """Base user model for candidates, recruiters, admins"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    password_hash: str
    role: UserRole = Field(default=UserRole.CANDIDATE)
    is_active: bool = Field(default=True)
    last_seen_at: Optional[datetime] = Field(default=None)  # presence tracking
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Optional["Candidate"] = Relationship(back_populates="user")
    company: Optional["Company"] = Relationship(back_populates="user")


# ============ CANDIDATE MODELS ============

class Candidate(SQLModel, table=True):
    """Candidate profile core information"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    name: str
    email: str = Field(index=True)
    phone: str
    residential_address: str
    location_state: str
    location_county: str
    location_zipcode: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    profile_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="candidate")
    resumes: List["Resume"] = Relationship(back_populates="candidate")
    certifications: List["Certification"] = Relationship(back_populates="candidate")
    job_profiles: List["JobProfile"] = Relationship(back_populates="candidate")
    matches: List["Match"] = Relationship(back_populates="candidate")
    swipes: List["Swipe"] = Relationship(back_populates="candidate")
    applications: List["Application"] = Relationship(back_populates="candidate")


class Resume(SQLModel, table=True):
    """Resume uploads for candidates"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    filename: str
    storage_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="resumes")


class Certification(SQLModel, table=True):
    """Certifications for candidates"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    name: str
    issuer: Optional[str] = None
    filename: Optional[str] = None
    storage_path: Optional[str] = None
    issued_date: Optional[str] = None
    expiry_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="certifications")


class Skill(SQLModel, table=True):
    """Skills associated with a job profile"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    skill_name: str
    skill_category: str  # technical, functional, soft
    proficiency_level: int = Field(default=3)  # 1-5 rating
    
    # Relationships
    job_profile: "JobProfile" = Relationship(back_populates="skills")


class LocationPreference(SQLModel, table=True):
    """Location preferences for job profiles (up to 3 per profile)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    city: str
    state: str
    country: Optional[str] = None
    
    # Relationships
    job_profile: "JobProfile" = Relationship(back_populates="location_preferences")


class JobProfile(SQLModel, table=True):
    """Multiple job profiles per candidate (dating app profiles)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    profile_name: str
    product_vendor: str  # Oracle, SAP, etc.
    product_type: str
    job_role: str
    years_of_experience: int
    worktype: WorkType
    employment_type: EmploymentType
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    resume_id: Optional[int] = Field(default=None, foreign_key="resume.id")
    certification_ids: Optional[str] = None  # JSON stringified list of cert IDs
    visa_status: VisaStatus
    ethnicity: Optional[str] = None
    availability_date: Optional[str] = None
    profile_summary: Optional[str] = None
    # ── NEW: Role & Domain ──
    preferred_job_titles: Optional[str] = None   # JSON array
    job_category: Optional[str] = None           # JSON array
    seniority_level: Optional[str] = None        # Entry/Junior/Mid/Senior/Lead/Manager
    # ── NEW: Work Style ──
    travel_willingness: Optional[str] = None     # none/occasional/frequent
    shift_preference: Optional[str] = None       # day/night/flexible
    # ── NEW: Location Extras ──
    remote_acceptance: Optional[str] = None      # fully_remote/remote_country/remote_anywhere
    relocation_willingness: Optional[str] = None # yes/no/depends
    # ── NEW: Compensation Extras ──
    pay_type: Optional[str] = None               # hourly/annually
    negotiability: Optional[str] = None          # fixed/negotiable/depends
    # ── NEW: Skills Extras ──
    core_strengths: Optional[str] = None         # JSON array (2-5 strengths)
    # ── NEW: Experience & Availability ──
    relevant_experience: Optional[int] = None
    notice_period: Optional[str] = None          # immediate/2weeks/1month/2months/3months
    start_date_preference: Optional[str] = None  # ISO date string
    # ── NEW: Authorization ──
    security_clearance: Optional[str] = None     # none/eligible/active
    # ── NEW: Education ──
    highest_education: Optional[str] = None      # high_school/associate/bachelor/master/doctorate
    # ── NEW: Resume Attachments ──
    primary_resume_id: Optional[int] = None
    attached_resume_ids: Optional[str] = None    # JSON array of resume IDs
    # ── NEW: Socials / Hyperlinks ──
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="job_profiles")
    skills: List[Skill] = Relationship(back_populates="job_profile")
    location_preferences: List[LocationPreference] = Relationship(back_populates="job_profile")
    matches: List["Match"] = Relationship(back_populates="job_profile")


# ============ COMPANY MODELS ============

class Company(SQLModel, table=True):
    """Company/Recruiter profile"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    company_name: str
    company_email: str = Field(index=True)
    employee_type: str  # Admin, HR, Recruiter/Manager
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="company")
    job_postings: List["JobPosting"] = Relationship(back_populates="company")
    matches: List["Match"] = Relationship(back_populates="company")
    swipes: List["Swipe"] = Relationship(back_populates="company")


class JobPostingSkill(SQLModel, table=True):
    """Skills required for a job posting with ratings"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_posting_id: int = Field(foreign_key="jobposting.id", index=True)
    skill_name: str
    skill_category: str  # "technical" or "soft"
    rating: int = Field(default=3)  # 1-10 rating
    
    # Relationships
    job_posting: "JobPosting" = Relationship(back_populates="posting_skills")


class JobPosting(SQLModel, table=True):
    """Job postings created by recruiters"""
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    job_title: str
    product_vendor: str  # Oracle, SAP, etc.
    product_type: str
    job_role: str
    seniority_level: str  # e.g., "Entry, Junior, Mid, Senior, Lead, Manager, Director"
    worktype: WorkType
    location: str
    employment_type: EmploymentType
    start_date: str
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    job_description: str
    required_skills: Optional[str] = None  # JSON: [{"skill": "Python", "category": "technical"}, ...]
    # New fields for Job Posting Builder
    end_date: Optional[str] = None
    job_category: Optional[str] = None
    travel_requirements: Optional[str] = None  # None, 0-10%, 10-25%, 25-50%, 50%+
    visa_info: Optional[str] = None  # US Citizen, GC, H1B, OPT, CPT, etc.
    education_qualifications: Optional[str] = None  # JSON array
    certifications_required: Optional[str] = None  # JSON array
    pay_type: Optional[str] = None  # "hourly" or "annually"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)  # Legacy field, kept for backward compatibility
    
    # Job Posting Lifecycle Management
    status: JobPostingStatus = Field(default=JobPostingStatus.ACTIVE)
    frozen_at: Optional[datetime] = None
    reposted_at: Optional[datetime] = None
    last_reactivated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)
    
    # Relationships
    company: Company = Relationship(back_populates="job_postings")
    applications: List["Application"] = Relationship(back_populates="job_posting")
    matches: List["Match"] = Relationship(back_populates="job_posting")
    posting_skills: List["JobPostingSkill"] = Relationship(back_populates="job_posting")


# ============ INTERACTION MODELS ============

class Swipe(SQLModel, table=True):
    """Swipe interactions (like/pass) from both candidates and recruiters"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    job_posting_id: int = Field(foreign_key="jobposting.id")
    action: str  # "like", "pass", "ask_to_apply"
    action_by: str  # "candidate" or "recruiter"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="swipes")
    company: Company = Relationship(back_populates="swipes")


class Match(SQLModel, table=True):
    """Mutual match between candidate and recruiter"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    job_posting_id: int = Field(foreign_key="jobposting.id")
    match_percentage: float = Field(default=0)
    match_reason: Optional[str] = None  # Why they matched
    candidate_liked: bool = Field(default=False)
    company_liked: bool = Field(default=False)
    candidate_asked_to_apply: bool = Field(default=False)
    company_asked_to_apply: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="matches")
    job_profile: JobProfile = Relationship(back_populates="matches")
    company: Company = Relationship(back_populates="matches")
    job_posting: JobPosting = Relationship(back_populates="matches")


class Application(SQLModel, table=True):
    """Application from candidate to job posting"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    job_posting_id: int = Field(foreign_key="jobposting.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    status: str = Field(default="applied")  # applied, scheduled, under_review, shortlisted, selected, rejected
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Recruiter notes (internal only, not visible to candidate)
    recruiter_notes: Optional[str] = Field(default=None)
    notes_updated_at: Optional[datetime] = Field(default=None)
    
    # Audit fields for tracking status changes
    last_status_updated_at: Optional[datetime] = Field(default=None)
    last_status_updated_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="applications")
    job_posting: JobPosting = Relationship(back_populates="applications")


# ============ NOTIFICATION MODEL ============

class Notification(SQLModel, table=True):
    """In-app notifications for candidates and recruiters"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    type: Optional[str] = Field(default="general")  # notification type (general, message, alert, etc.)
    title: str
    message: str
    event_type: str  # match, invite, application, status_update, shortlisted
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = Field(default=None)  # Timestamp when notification was marked as read
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # JSON payload: {"route": "...", "route_context": {...}}
    payload: Optional[str] = Field(default=None)


# ============ AUDIT / ACTIVITY EVENT LOG ============

class ActivityEvent(SQLModel, table=True):
    """Immutable append-only audit log of every UI-triggered mutation.

    Rules:
    - No UPDATE or DELETE on this table (application-enforced).
    - Rows are written in the same transaction as the operational change.
    - before_value / after_value are serialised JSON strings (safe subset).
    - dedupe_key prevents storing the same logical event twice (optional).
    """
    __tablename__ = "activityevent"

    id: Optional[int] = Field(default=None, primary_key=True)

    # What changed
    entity_type: str  # application | swipe | notification | match | job_posting | profile | company
    entity_id: str    # stringified int / uuid of the affected row
    action: str       # created | updated | status_changed | read | bulk_read | deleted
                      # liked | passed | invited | withdrawn | submitted | offered | rejected

    # Snapshot (JSON strings – serialised safe subsets, nullable)
    before_value: Optional[str] = Field(default=None)
    after_value: Optional[str] = Field(default=None)

    # Who
    performed_by_user_id: int = Field(index=True)
    performed_by_role: str  # candidate | recruiter | hr | admin

    # When – ALWAYS server-stamped UTC
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Tracing
    request_id: Optional[str] = Field(default=None, index=True)
    source: str = Field(default="web")  # web | ios | android

    # Deduplication (unique constraint enforced at DB level via migration)
    dedupe_key: Optional[str] = Field(default=None)


class SystemLog(SQLModel, table=True):
    """System-wide logging for debugging and monitoring.
    
    Captures all application logs for persistence beyond file system.
    Survives deployments, restarts, and allows querying historical logs.
    """
    __tablename__ = "systemlog"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Log metadata
    timestamp: datetime = Field(index=True)
    level: str = Field(index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    logger: str  # logger name (module hierarchy)
    message: str  # log message
    module: str  # Python module name
    function: str  # Function name where log originated
    line_number: int  # Line number in source
    
    # Request tracing
    request_id: Optional[str] = Field(default=None, index=True)
    user_id: Optional[int] = Field(default=None, index=True)
    
    # Change tracking
    action: Optional[str] = Field(default=None, index=True)  # create, update, delete, etc.
    entity_type: Optional[str] = Field(default=None, index=True)  # user, job, application, etc.
    entity_id: Optional[str] = Field(default=None)
    
    # Additional context (JSON)
    log_metadata: Optional[str] = Field(default=None)  # Serialized JSON metadata
    exception: Optional[str] = Field(default=None)  # Exception traceback if any
    
    # Housekeeping
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============ CHAT MODELS ============

class Conversation(SQLModel, table=True):
    """One conversation per (candidate, recruiter-company, job_posting)."""
    __tablename__ = "conversation"
    __table_args__ = (
        UniqueConstraint("company_id", "candidate_id", "job_posting_id",
                         name="uq_conversation_company_candidate_job"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    job_posting_id: int = Field(foreign_key="jobposting.id", index=True)
    created_by_user_id: int = Field(foreign_key="user.id")
    last_message_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    messages: List["Message"] = Relationship(back_populates="conversation")


class Message(SQLModel, table=True):
    """A single chat message inside a Conversation."""
    __tablename__ = "message"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id", index=True)
    sender_user_id: int = Field(foreign_key="user.id", index=True)
    sender_role: Optional[str] = Field(default=None)  # "candidate", "recruiter", "hr", "admin"
    text: str
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = Field(default=None)  # Timestamp when message was read
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    conversation: Conversation = Relationship(back_populates="messages")


# ============ DIRECT MESSAGING MODELS (WhatsApp-style) ============

class DirectConversation(SQLModel, table=True):
    """Direct conversation between recruiter and candidate (no job posting requirement)."""
    __tablename__ = "direct_conversation"
    __table_args__ = (
        UniqueConstraint("recruiter_user_id", "candidate_user_id",
                         name="uq_direct_conversation_recruiter_candidate"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    recruiter_user_id: int = Field(foreign_key="user.id", index=True)
    candidate_user_id: int = Field(foreign_key="user.id", index=True)
    created_by_user_id: int = Field(foreign_key="user.id", index=True)  # Always recruiter
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: Optional[datetime] = Field(default=None)

    # Relationships
    direct_messages: List["DirectMessage"] = Relationship(back_populates="direct_conversation")


class DirectMessage(SQLModel, table=True):
    """A message in a direct conversation."""
    __tablename__ = "direct_message"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="direct_conversation.id", index=True)
    sender_user_id: int = Field(foreign_key="user.id", index=True)
    receiver_user_id: int = Field(foreign_key="user.id", index=True)
    content: str
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    direct_conversation: DirectConversation = Relationship(back_populates="direct_messages")


# ============ MEETING & SCHEDULING MODELS ============

class Meeting(SQLModel, table=True):
    """
    First-class Meeting domain model for interview scheduling
    Represents scheduled meetings between recruiters and candidates
    """
    __tablename__ = "meeting"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Core meeting details
    title: str = Field(index=True)
    description: Optional[str] = None
    meeting_type: MeetingType = Field(
        default=MeetingType.INTERVIEW,
        sa_column=Column(SQLEnum(MeetingType, values_callable=lambda obj: [e.value for e in obj]))
    )
    status: MeetingStatus = Field(
        default=MeetingStatus.SCHEDULED,
        sa_column=Column(SQLEnum(MeetingStatus, values_callable=lambda obj: [e.value for e in obj]), index=True)
    )
    
    # Time & duration
    scheduled_start: datetime = Field(index=True)  # UTC timestamp
    scheduled_end: datetime = Field(index=True)    # UTC timestamp
    duration_minutes: int = Field(default=60)
    timezone: str = Field(default="UTC")  # IANA timezone (e.g., "America/New_York")
    
    # Organizer & context
    organizer_user_id: int = Field(foreign_key="user.id", index=True)  # Who created/scheduled
    job_posting_id: Optional[int] = Field(default=None, foreign_key="jobposting.id", index=True)
    match_id: Optional[int] = Field(default=None, foreign_key="match.id", index=True)
    application_id: Optional[int] = Field(default=None, foreign_key="application.id", index=True)
    
    # Meeting location/link
    location: Optional[str] = None  # Physical address or "Virtual"
    video_meeting_url: Optional[str] = None  # Zoom/Teams/Meet link
    video_provider: Optional[str] = None  # "zoom", "teams", "meet", etc.
    
    # Calendar sync
    google_calendar_event_id: Optional[str] = None
    microsoft_calendar_event_id: Optional[str] = None
    
    # Cancellation tracking
    cancelled_at: Optional[datetime] = None
    cancelled_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    cancellation_reason: Optional[str] = None
    
    # Reschedule request tracking (candidate requests, recruiter approves/rejects)
    reschedule_requested_at: Optional[datetime] = None
    reschedule_requested_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    reschedule_request_reason: Optional[str] = None
    reschedule_request_preferred_times: Optional[str] = None  # JSON array of preferred times
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    participants: List["MeetingParticipant"] = Relationship(back_populates="meeting")


class MeetingParticipant(SQLModel, table=True):
    """
    Participants in a meeting (many-to-many: Meeting <-> User)
    Tracks attendance, confirmation, and reminders
    """
    __tablename__ = "meeting_participant"

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meeting.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    
    # RSVP tracking
    is_required: bool = Field(default=True)  # Required vs optional participant
    has_confirmed: bool = Field(default=False)
    confirmed_at: Optional[datetime] = None
    
    # Attendance tracking
    attended: Optional[bool] = None  # None=unknown, True=attended, False=no-show
    
    # Reminder tracking
    reminder_sent_24h: bool = Field(default=False)
    reminder_sent_1h: bool = Field(default=False)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    meeting: Meeting = Relationship(back_populates="participants")
    user: "User" = Relationship()  # Added relationship to User for easy access to name/email
    
    # Unique constraint: one record per meeting-user pair
    __table_args__ = (UniqueConstraint("meeting_id", "user_id", name="unique_meeting_participant"),)


class MeetingTimelineEvent(SQLModel, table=True):
    """
    Timeline/audit log of meeting actions for in-app history display
    Every meeting action creates an entry for full traceability
    """
    __tablename__ = "meeting_timeline_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meeting.id", index=True)
    
    # Who performed the action
    actor_user_id: int = Field(foreign_key="user.id", index=True)
    actor_role: Optional[str] = None  # "recruiter", "candidate" for display
    
    # Event details
    event_type: str = Field(index=True)  # interview_scheduled, recruiter_cancelled, candidate_cancelled, etc.
    message: str  # Human-readable description for timeline display
    
    # Optional metadata (JSON)
    metadata_json: Optional[str] = None  # Store reason, notes, old/new times, etc.
    
    # Previous meeting state (for rescheduling history)
    previous_scheduled_start: Optional[datetime] = None
    previous_scheduled_end: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class MeetingActionToken(SQLModel, table=True):
    """
    Secure tokens for email-based meeting actions (confirm, cancel, reschedule)
    Allows candidates/recruiters to take actions via tokenized email links
    """
    __tablename__ = "meeting_action_token"

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meeting.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)  # Who the token is for
    
    # Token details
    token: str = Field(unique=True, index=True)  # Secure random token
    action_type: str = Field(index=True)  # "confirm", "cancel", "reschedule"
    
    # Token lifecycle
    expires_at: datetime = Field(index=True)
    is_used: bool = Field(default=False, index=True)
    used_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingAvailabilitySlot(SQLModel, table=True):
    """
    Availability slots proposed by recruiter or candidate
    Used for scheduling workflow: propose slots -> candidate picks -> meeting created
    """
    __tablename__ = "meeting_availability_slot"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Who proposed this slot
    proposed_by_user_id: int = Field(foreign_key="user.id", index=True)
    proposed_to_user_id: int = Field(foreign_key="user.id", index=True)
    
    # Slot timing
    slot_start: datetime = Field(index=True)  # UTC timestamp
    slot_end: datetime = Field(index=True)    # UTC timestamp
    timezone: str = Field(default="UTC")
    
    # Context (what this availability is for)
    job_posting_id: Optional[int] = Field(default=None, foreign_key="jobposting.id", index=True)
    match_id: Optional[int] = Field(default=None, foreign_key="match.id", index=True)
    application_id: Optional[int] = Field(default=None, foreign_key="application.id", index=True)
    
    # Selection tracking
    is_selected: bool = Field(default=False)  # True when candidate picks this slot
    selected_at: Optional[datetime] = None
    meeting_id: Optional[int] = Field(default=None, foreign_key="meeting.id", index=True)  # Created meeting
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expired_at: Optional[datetime] = None  # Slots can have expiration


# ============ CALENDAR & VIDEO INTEGRATION MODELS (Phase 2) ============

class CalendarAccount(SQLModel, table=True):
    """
    External calendar account connections (Google Calendar, Microsoft Calendar)
    Stores OAuth tokens and sync settings per user
    """
    __tablename__ = "calendar_account"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    
    # Provider info
    provider: CalendarProvider = Field(index=True)  # "google" or "microsoft"
    provider_account_id: str = Field(index=True)  # External account ID
    provider_email: str  # Email associated with calendar
    
    # OAuth credentials (ENCRYPTED in production)
    access_token: str  # Encrypted access token
    refresh_token: Optional[str] = None  # Encrypted refresh token
    token_expires_at: Optional[datetime] = None
    
    # Sync settings
    is_primary: bool = Field(default=False)  # Primary calendar for this user
    sync_enabled: bool = Field(default=True)  # Auto-sync meetings to this calendar
    last_synced_at: Optional[datetime] = None
    
    # Calendar metadata
    calendar_name: Optional[str] = None
    calendar_timezone: str = Field(default="UTC")
    
    # Timestamps
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Unique constraint: one account per user-provider-email combo
    __table_args__ = (UniqueConstraint("user_id", "provider", "provider_email", name="unique_calendar_account"),)


class VideoProviderAccount(SQLModel, table=True):
    """
    Video conferencing provider connections (Zoom, Microsoft Teams, Google Meet)
    Stores API keys and default meeting settings
    """
    __tablename__ = "video_provider_account"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    
    # Provider info
    provider: VideoProvider = Field(index=True)  # "zoom", "microsoft_teams", "google_meet"
    provider_account_id: Optional[str] = None  # External account ID
    provider_email: Optional[str] = None
    
    # OAuth/API credentials (ENCRYPTED in production)
    access_token: Optional[str] = None  # Encrypted access token
    refresh_token: Optional[str] = None  # Encrypted refresh token
    api_key: Optional[str] = None  # For Zoom SDK/API
    api_secret: Optional[str] = None  # For Zoom SDK/API
    token_expires_at: Optional[datetime] = None
    
    # Meeting defaults
    is_primary: bool = Field(default=False)  # Primary video provider for this user
    auto_generate_links: bool = Field(default=True)  # Auto-create meeting links
    default_meeting_password: Optional[str] = None  # Default password for meetings
    waiting_room_enabled: bool = Field(default=True)
    
    # Timestamps
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Unique constraint: one account per user-provider combo
    __table_args__ = (UniqueConstraint("user_id", "provider", name="unique_video_provider_account"),)


class EmailThreadLink(SQLModel, table=True):
    """
    Links tokenized reply-to email addresses to conversations/meetings
    Enables email threading for interview scheduling and messages
    """
    __tablename__ = "email_thread_link"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Email provider tracking
    provider_name: str = Field(default="sendgrid")  # "sendgrid", "postmark", etc.
    action_token: str = Field(unique=True, index=True)  # Unique token in reply-to address
    
    # Link to entities
    conversation_id: Optional[int] = Field(default=None, foreign_key="conversation.id", index=True)
    meeting_id: Optional[int] = Field(default=None, foreign_key="meeting.id", index=True)
    
    # User tracking
    candidate_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    recruiter_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    
    # Token management
    token_expires_at: datetime
    
    # Usage tracking
    inbound_count: int = Field(default=0)  # Number of inbound emails received
    last_inbound_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InboundEmailEvent(SQLModel, table=True):
    """
    Audit log of inbound emails received via webhook
    """
    __tablename__ = "inbound_email_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Provider info
    provider_name: str  # "sendgrid", "postmark", etc.
    provider_event_id: str = Field(index=True)  # Message ID from provider (idempotency)
    
    # Email metadata
    from_email: str
    to_email: str
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    
    # Processing
    thread_link_id: Optional[int] = Field(default=None, foreign_key="email_thread_link.id")
    message_created_id: Optional[int] = Field(default=None, foreign_key="message.id")
    processed: bool = Field(default=False)
    processed_at: Optional[datetime] = None
    processing_error: Optional[str] = None
    
    # Timestamps
    received_at: datetime = Field(default_factory=datetime.utcnow)


class AnalyticsEvent(SQLModel, table=True):
    """
    Raw analytics events (high volume table)
    Tracks individual user actions and interactions
    """
    __tablename__ = "analytics_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Event info
    event_type: AnalyticsEventType = Field(index=True)
    event_time: datetime = Field(index=True)
    
    # Related entities
    job_posting_id: Optional[int] = Field(default=None, foreign_key="jobposting.id", index=True)
    candidate_id: Optional[int] = Field(default=None, foreign_key="candidate.id")
    application_id: Optional[int] = Field(default=None, foreign_key="application.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    # Additional metadata (source, device, location, etc.)
    metadata_json: Optional[str] = None  # JSON string
    
    # User journey tracking
    correlation_id: Optional[str] = Field(default=None, index=True)  # Group related events


class AnalyticsRollupDaily(SQLModel, table=True):
    """
    Daily aggregated analytics metrics
    Reduces query load on raw events table
    """
    __tablename__ = "analytics_rollup_daily"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    rollup_date: date = Field(sa_column=Column(Date, index=True))
    
    # Job posting specific (optional)
    job_posting_id: Optional[int] = Field(default=None, foreign_key="jobposting.id", index=True)
    
    # Event counts
    jobs_viewed: int = Field(default=0)
    jobs_liked: int = Field(default=0)
    applications_submitted: int = Field(default=0)
    applications_viewed: int = Field(default=0)
    interviews_scheduled: int = Field(default=0)
    interviews_completed: int = Field(default=0)
    offers_made: int = Field(default=0)
    hires: int = Field(default=0)
    
    # Engagement metrics
    messages_sent: int = Field(default=0)
    emails_sent: int = Field(default=0)
    emails_opened: int = Field(default=0)
    
    # Unique constraint: one record per company-date-job combo
    __table_args__ = (UniqueConstraint("company_id", "rollup_date", "job_posting_id", name="unique_daily_rollup"),)


