"""
API Schemas for request/response validation
Pydantic models mirroring database structure
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models import WorkType, EmploymentType, VisaStatus, CurrencyType, UserRole


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
    created_at: datetime
    updated_at: datetime
    posting_skills: List[JobPostingSkillRead] = []


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
