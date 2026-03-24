"""
API Schemas for request/response validation
Pydantic models mirroring database structure
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models import WorkType, EmploymentType, VisaStatus, CurrencyType, UserRole, JobPostingStatus, MeetingStatus, MeetingType, CalendarProvider, VideoProvider


# ============ USER SCHEMAS ============

class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole = UserRole.CANDIDATE


# Candidate-specific schemas
class CandidateSignUp(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""


class CandidateLogin(BaseModel):
    email: str
    password: str


# Company-specific schemas
class CompanySignUp(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""
    company_role: str  # "admin", "hr", or "recruiter"


class CompanyLogin(BaseModel):
    email: str
    password: str


# Legacy unified schemas (backward compatibility)
class UserCreate(BaseModel):
    email: str
    password: str
    user_type: str  # "candidate" or "company"
    full_name: Optional[str] = ""  # Optional for backward compatibility
    company_role: Optional[str] = None  # "admin", "hr", or "recruiter" (only for company users)


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 hours in seconds


class LoginResponse(BaseModel):
    message: str
    access_token: str = ""  # For backward compatibility
    token: str  # New key for token
    token_type: str
    user_id: int
    email: str
    role: str
    user_type: str


# ============ CANDIDATE SCHEMAS ============

class ResumeRead(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime


class CertificationRead(BaseModel):
    id: int
    name: str
    issuer: Optional[str]
    issued_date: Optional[str]
    expiry_date: Optional[str]


class SkillRead(BaseModel):
    id: int
    skill_name: str
    skill_category: str
    proficiency_level: int


class SkillCreate(BaseModel):
    skill_name: str
    skill_category: str
    proficiency_level: int = 3


class LocationPreferenceRead(BaseModel):
    id: int
    city: str
    state: str
    country: Optional[str]


class LocationPreferenceCreate(BaseModel):
    city: str
    state: str
    country: Optional[str] = None


class JobProfileBase(BaseModel):
    profile_name: str
    product_vendor: str
    product_type: str
    job_role: str
    years_of_experience: int
    worktype: WorkType
    employment_type: EmploymentType
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    visa_status: VisaStatus
    resume_id: Optional[int] = None
    certification_ids: Optional[str] = None
    ethnicity: Optional[str] = None
    availability_date: Optional[str] = None
    profile_summary: Optional[str] = None
    # New fields
    preferred_job_titles: Optional[str] = None
    job_category: Optional[str] = None
    seniority_level: Optional[str] = None
    travel_willingness: Optional[str] = None
    shift_preference: Optional[str] = None
    remote_acceptance: Optional[str] = None
    relocation_willingness: Optional[str] = None
    pay_type: Optional[str] = None
    negotiability: Optional[str] = None
    core_strengths: Optional[str] = None
    relevant_experience: Optional[int] = None
    notice_period: Optional[str] = None
    start_date_preference: Optional[str] = None
    security_clearance: Optional[str] = None
    highest_education: Optional[str] = None
    primary_resume_id: Optional[int] = None
    attached_resume_ids: Optional[str] = None
    # Socials
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None


class JobProfileCreate(JobProfileBase):
    skills: List[SkillCreate] = []
    location_preferences: List[LocationPreferenceCreate] = []


class JobProfileRead(JobProfileBase):
    id: int
    candidate_id: int
    skills: List[SkillRead] = []
    location_preferences: List[LocationPreferenceRead] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class CandidateBase(BaseModel):
    name: str
    email: str
    phone: str
    residential_address: str
    location_state: str
    location_county: str
    location_zipcode: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateRead(CandidateBase):
    id: int
    profile_summary: Optional[str]
    resumes: List[ResumeRead] = []
    certifications: List[CertificationRead] = []
    job_profiles: List[JobProfileRead] = []
    created_at: datetime


# ============ COMPANY SCHEMAS ============

class CompanyBase(BaseModel):
    company_name: str
    company_email: str
    employee_type: str  # Admin, HR, Recruiter


class CompanyCreate(CompanyBase):
    pass


class CompanyRead(CompanyBase):
    id: int
    user_id: int
    created_at: datetime


# ============ JOB POSTING SCHEMAS ============

class JobPostingSkillCreate(BaseModel):
    skill_name: str
    skill_category: str  # "technical" or "soft"
    rating: int = 3  # 1-10


class JobPostingSkillRead(BaseModel):
    id: int
    skill_name: str
    skill_category: str
    rating: int


class JobPostingBase(BaseModel):
    job_title: str
    product_vendor: str
    product_type: str
    job_role: str
    seniority_level: str
    worktype: WorkType
    location: str
    employment_type: EmploymentType
    start_date: str
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    job_description: str
    end_date: Optional[str] = None
    job_category: Optional[str] = None
    travel_requirements: Optional[str] = None
    visa_info: Optional[str] = None
    education_qualifications: Optional[str] = None
    certifications_required: Optional[str] = None
    pay_type: Optional[str] = None


class JobPostingCreate(JobPostingBase):
    required_skills: Optional[str] = None  # JSON string (legacy)
    skills: List[JobPostingSkillCreate] = []  # New structured skills


class JobPostingRead(JobPostingBase):
    id: int
    company_id: int
    required_skills: Optional[str]
    is_active: bool
    status: JobPostingStatus
    frozen_at: Optional[datetime] = None
    reposted_at: Optional[datetime] = None
    last_reactivated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    posting_skills: List[JobPostingSkillRead] = []


class JobPostingStatusUpdateRequest(BaseModel):
    """Request schema for updating job posting lifecycle status"""
    action: str  # "freeze", "reactivate", "repost", "cancel"
    cancellation_reason: Optional[str] = None  # Required when action="cancel"


class JobPostingStatusUpdateResponse(BaseModel):
    """Response schema for lifecycle status updates"""
    message: str
    job_id: int
    status: JobPostingStatus
    frozen_at: Optional[datetime] = None
    reposted_at: Optional[datetime] = None
    last_reactivated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None


# ============ INTERACTION SCHEMAS ============

class SwipeBase(BaseModel):
    action: str  # like, pass, ask_to_apply
    action_by: str  # candidate or recruiter


class SwipeCreate(SwipeBase):
    pass


class MatchRead(BaseModel):
    id: int
    candidate_id: int
    company_id: int
    job_posting_id: int
    match_percentage: float
    candidate_liked: bool
    company_liked: bool
    created_at: datetime


class ApplicationRead(BaseModel):
    id: int
    candidate_id: int
    job_posting_id: int
    status: str
    applied_at: datetime
    recruiter_notes: Optional[str] = None
    notes_updated_at: Optional[datetime] = None
    last_status_updated_at: Optional[datetime] = None
    last_status_updated_by_user_id: Optional[int] = None


# ============ DIRECT MESSAGING SCHEMAS (WhatsApp-style) ============

# Request Schemas
class ConversationStartRequest(BaseModel):
    candidate_user_id: int


class MessageCreateRequest(BaseModel):
    content: str


# Response Schemas
class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_user_id: int
    receiver_user_id: int
    sender_name: str
    receiver_name: str
    content: str
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime


class ConversationResponse(BaseModel):
    id: int
    recruiter_user_id: int
    candidate_user_id: int
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime]


class ConversationListItemResponse(BaseModel):
    id: int
    candidate_name: str
    recruiter_name: str
    last_message_preview: str
    last_message_at: Optional[datetime]
    unread_count: int
    other_user_name: str
    other_user_id: Optional[int]


# ============ MEETING & SCHEDULING SCHEMAS (Phase 1) ============

# Meeting Participant Schemas
class MeetingParticipantBase(BaseModel):
    user_id: int
    is_required: bool = True


class MeetingParticipantCreate(MeetingParticipantBase):
    pass


class MeetingParticipantRead(MeetingParticipantBase):
    id: int
    meeting_id: int
    has_confirmed: bool
    confirmed_at: Optional[datetime] = None
    attended: Optional[bool] = None
    reminder_sent_24h: bool
    reminder_sent_1h: bool
    created_at: datetime
    updated_at: datetime


# Meeting Core Schemas
class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_type: MeetingType = MeetingType.INTERVIEW
    scheduled_start: datetime
    scheduled_end: datetime
    duration_minutes: int = 60
    timezone: str = "UTC"
    job_posting_id: Optional[int] = None
    match_id: Optional[int] = None
    application_id: Optional[int] = None
    location: Optional[str] = None
    video_meeting_url: Optional[str] = None
    video_provider: Optional[str] = None


class MeetingCreate(MeetingBase):
    participant_user_ids: List[int]  # List of user IDs to invite


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    video_meeting_url: Optional[str] = None


class MeetingRead(MeetingBase):
    id: int
    status: MeetingStatus
    organizer_user_id: int
    google_calendar_event_id: Optional[str] = None
    microsoft_calendar_event_id: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by_user_id: Optional[int] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    participants: List[MeetingParticipantRead] = []


class MeetingCancelRequest(BaseModel):
    cancellation_reason: str


class MeetingRescheduleRequest(BaseModel):
    scheduled_start: datetime
    scheduled_end: datetime
    timezone: Optional[str] = "UTC"
    reason: Optional[str] = None


# Meeting Availability Slot Schemas
class MeetingAvailabilitySlotBase(BaseModel):
    slot_start: datetime
    slot_end: datetime
    timezone: str = "UTC"
    job_posting_id: Optional[int] = None
    match_id: Optional[int] = None
    application_id: Optional[int] = None


class MeetingAvailabilitySlotCreate(MeetingAvailabilitySlotBase):
    proposed_to_user_id: int


class MeetingAvailabilitySlotRead(MeetingAvailabilitySlotBase):
    id: int
    proposed_by_user_id: int
    proposed_to_user_id: int
    is_selected: bool
    selected_at: Optional[datetime] = None
    meeting_id: Optional[int] = None
    created_at: datetime
    expired_at: Optional[datetime] = None


class SlotSelectionRequest(BaseModel):
    slot_id: int
    title: str = "Interview Meeting"
    description: Optional[str] = None


# ============ CALENDAR & VIDEO INTEGRATION SCHEMAS (Phase 2) ============

# Calendar Account Schemas
class CalendarAccountBase(BaseModel):
    provider: CalendarProvider
    provider_email: str
    is_primary: bool = False
    sync_enabled: bool = True


class CalendarAccountCreate(CalendarAccountBase):
    access_token: str
    refresh_token: Optional[str] = None
    provider_account_id: str
    token_expires_at: Optional[datetime] = None


class CalendarAccountRead(CalendarAccountBase):
    id: int
    user_id: int
    provider_account_id: str
    calendar_name: Optional[str] = None
    calendar_timezone: str
    last_synced_at: Optional[datetime] = None
    connected_at: datetime
    updated_at: datetime


# Video Provider Account Schemas
class VideoProviderAccountBase(BaseModel):
    provider: VideoProvider
    is_primary: bool = False
    auto_generate_links: bool = True
    waiting_room_enabled: bool = True


class VideoProviderAccountCreate(VideoProviderAccountBase):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    provider_account_id: Optional[str] = None
    provider_email: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class VideoProviderAccountRead(VideoProviderAccountBase):
    id: int
    user_id: int
    provider_account_id: Optional[str] = None
    provider_email: Optional[str] = None
    default_meeting_password: Optional[str] = None
    connected_at: datetime
    updated_at: datetime

