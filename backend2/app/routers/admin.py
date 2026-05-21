"""
Admin Portal API Router
========================
All endpoints require ADMIN role. Provides platform-level management:
  - Platform overview stats
  - User management (list / status / role / delete)
  - Job posting management (list all / update status)
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel

from ..database import get_session
from ..models import (
    User, Candidate, Company, JobPosting, Application,
    Meeting, ProductVendor, ProductType, ProductRole,
    JobProfile, LocationPreference,
    UserRole, JobPostingStatus,
)
from ..security import get_current_user
from ..core.logging_config import get_logger, log_change

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─────────────────────────────────────────────────────────────
# Auth guard
# ─────────────────────────────────────────────────────────────

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency: allow only ADMIN role."""
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_users: int
    total_candidates: int
    total_recruiters: int
    total_hr: int
    total_admins: int
    active_users: int
    inactive_users: int
    total_job_postings: int
    active_job_postings: int
    total_applications: int
    total_meetings: int
    new_users_last_7d: int
    new_jobs_last_7d: int


class UserSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserSummary]
    total: int
    limit: int
    offset: int


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class UpdateUserRoleRequest(BaseModel):
    role: str  # candidate | recruiter | hr | admin


class JobPostingSummary(BaseModel):
    id: int
    title: str
    company_name: Optional[str]
    status: str
    created_at: Optional[datetime]
    application_count: int
    location: Optional[str] = None
    worktype: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: List[JobPostingSummary]
    total: int
    limit: int
    offset: int


class UpdateJobStatusRequest(BaseModel):
    status: str  # active | frozen | cancelled


# ─────────────────────────────────────────────────────────────
# PLATFORM OVERVIEW
# ─────────────────────────────────────────────────────────────

@router.get("/overview", response_model=OverviewStats)
def get_overview(
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Return high-level platform statistics."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # User counts by role
    def count_role(role: UserRole) -> int:
        return session.exec(
            select(func.count(User.id)).where(User.role == role)
        ).one()

    total_candidates = count_role(UserRole.CANDIDATE)
    total_recruiters = count_role(UserRole.RECRUITER)
    total_hr = count_role(UserRole.HR)
    total_admins = count_role(UserRole.ADMIN)
    total_users = session.exec(select(func.count(User.id))).one()
    active_users = session.exec(
        select(func.count(User.id)).where(User.is_active == True)
    ).one()

    # Job postings
    total_jobs = session.exec(select(func.count(JobPosting.id))).one()
    active_jobs = session.exec(
        select(func.count(JobPosting.id)).where(
            JobPosting.status == JobPostingStatus.ACTIVE
        )
    ).one()

    # Applications & meetings
    total_apps = session.exec(select(func.count(Application.id))).one()
    total_meetings = session.exec(select(func.count(Meeting.id))).one()

    # Growth in last 7 days
    new_users_7d = session.exec(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    ).one()
    new_jobs_7d = session.exec(
        select(func.count(JobPosting.id)).where(JobPosting.created_at >= week_ago)
    ).one()

    return OverviewStats(
        total_users=total_users,
        total_candidates=total_candidates,
        total_recruiters=total_recruiters,
        total_hr=total_hr,
        total_admins=total_admins,
        active_users=active_users,
        inactive_users=total_users - active_users,
        total_job_postings=total_jobs,
        active_job_postings=active_jobs,
        total_applications=total_apps,
        total_meetings=total_meetings,
        new_users_last_7d=new_users_7d,
        new_jobs_last_7d=new_jobs_7d,
    )


# ─────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ─────────────────────────────────────────────────────────────

@router.get("/users", response_model=UserListResponse)
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all platform users with optional filters."""
    query = select(User)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(User.email.ilike(pattern), User.full_name.ilike(pattern))
        )
    if role:
        query = query.where(User.role == role.lower())
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    total = session.exec(
        select(func.count()).select_from(query.subquery())
    ).one()

    users = session.exec(query.order_by(User.created_at.desc()).limit(limit).offset(offset)).all()

    return UserListResponse(
        users=[
            UserSummary(
                id=u.id,
                email=u.email,
                full_name=u.full_name or "",
                role=u.role.value if hasattr(u.role, "value") else str(u.role),
                is_active=u.is_active,
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/users/{user_id}", response_model=UserSummary)
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get a single user's details."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: UpdateUserStatusRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Activate or deactivate a user account."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deactivation
    if user.id == current_user.get("user_id") and not body.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    old_status = user.is_active
    user.is_active = body.is_active
    session.add(user)
    session.commit()

    action = "activated" if body.is_active else "deactivated"
    log_change(
        logger,
        action=f"user_{action}",
        entity_type="user",
        entity_id=str(user_id),
        changes={"is_active": {"old": old_status, "new": body.is_active}},
        user_id=current_user.get("user_id"),
    )

    return {"ok": True, "message": f"User {action} successfully"}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: UpdateUserRoleRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Change a user's role."""
    valid_roles = {r.value for r in UserRole}
    if body.role.lower() not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-demotion from admin
    if user.id == current_user.get("user_id") and body.role.lower() != "admin":
        raise HTTPException(
            status_code=400, detail="Cannot change your own admin role"
        )

    old_role = user.role
    user.role = UserRole(body.role.lower())
    session.add(user)
    session.commit()

    log_change(
        logger,
        action="user_role_changed",
        entity_type="user",
        entity_id=str(user_id),
        changes={"role": {"old": str(old_role), "new": body.role}},
        user_id=current_user.get("user_id"),
    )

    return {"ok": True, "message": f"User role updated to {body.role}"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Permanently delete a user account."""
    if user_id == current_user.get("user_id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    log_change(
        logger,
        action="user_deleted",
        entity_type="user",
        entity_id=str(user_id),
        changes={"email": user.email, "role": str(user.role)},
        user_id=current_user.get("user_id"),
    )

    session.delete(user)
    session.commit()

    return {"ok": True, "message": "User deleted permanently"}


# ─────────────────────────────────────────────────────────────
# JOB POSTINGS MANAGEMENT
# ─────────────────────────────────────────────────────────────

@router.get("/job-postings", response_model=JobListResponse)
def list_job_postings(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all job postings with optional filters."""
    query = select(JobPosting)

    if search:
        pattern = f"%{search}%"
        query = query.where(JobPosting.job_title.ilike(pattern))
    if status:
        query = query.where(JobPosting.status == status.lower())

    total = session.exec(
        select(func.count()).select_from(query.subquery())
    ).one()

    jobs = session.exec(
        query.order_by(JobPosting.created_at.desc()).limit(limit).offset(offset)
    ).all()

    result = []
    for job in jobs:
        # Get company name via company_id FK
        company = session.exec(
            select(Company).where(Company.id == job.company_id)
        ).first()
        company_name = company.company_name if company else None

        # Application count
        app_count = session.exec(
            select(func.count(Application.id)).where(
                Application.job_posting_id == job.id
            )
        ).one()

        result.append(
            JobPostingSummary(
                id=job.id,
                title=job.job_title,
                company_name=company_name,
                status=job.status.value if hasattr(job.status, "value") else str(job.status),
                created_at=job.created_at,
                application_count=app_count,
                location=getattr(job, 'location', None),
                worktype=job.worktype.value if hasattr(job.worktype, 'value') else str(job.worktype) if job.worktype else None,
                salary_min=getattr(job, 'salary_min', None),
                salary_max=getattr(job, 'salary_max', None),
                salary_currency=job.salary_currency.value if hasattr(job.salary_currency, 'value') else str(job.salary_currency) if job.salary_currency else None,
            )
        )

    return JobListResponse(jobs=result, total=total, limit=limit, offset=offset)


@router.patch("/job-postings/{job_id}/status")
def update_job_status(
    job_id: int,
    body: UpdateJobStatusRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Update a job posting's status."""
    valid_statuses = {s.value for s in JobPostingStatus}
    if body.status.lower() not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    job = session.get(JobPosting, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    old_status = job.status
    job.status = JobPostingStatus(body.status.lower())
    session.add(job)
    session.commit()

    log_change(
        logger,
        action="job_status_changed",
        entity_type="job_posting",
        entity_id=str(job_id),
        changes={"status": {"old": str(old_status), "new": body.status}},
        user_id=current_user.get("user_id"),
    )

    return {"ok": True, "message": f"Job status updated to {body.status}"}


# ─────────────────────────────────────────────────────────────
# JOB PREFERENCES  (candidate job profiles)
# ─────────────────────────────────────────────────────────────

class LocationPref(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    remote: Optional[bool] = None

class JobPreferenceSummary(BaseModel):
    id: int
    candidate_id: int
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    profile_name: str
    # Taxonomy
    product_vendor: Optional[str]
    product_type: Optional[str]
    job_role: Optional[str]
    # Experience & role
    years_of_experience: Optional[int]
    seniority_level: Optional[str]
    preferred_job_titles: Optional[str]   # raw JSON string
    job_category: Optional[str]
    # Work style
    worktype: Optional[str]
    employment_type: Optional[str]
    shift_preference: Optional[str]
    travel_willingness: Optional[str]
    # Location
    remote_acceptance: Optional[str]
    relocation_willingness: Optional[str]
    location_preferences: List[LocationPref]
    # Compensation
    salary_min: Optional[float]
    salary_max: Optional[float]
    salary_currency: Optional[str]
    pay_type: Optional[str]
    negotiability: Optional[str]
    # Availability
    visa_status: Optional[str]
    notice_period: Optional[str]
    start_date_preference: Optional[str]
    availability_date: Optional[str]
    # Education & auth
    highest_education: Optional[str]
    security_clearance: Optional[str]
    # Misc
    core_strengths: Optional[str]         # raw JSON string
    profile_summary: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    # Status
    status: str          # active | edited | deleted
    deleted_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobPreferenceListResponse(BaseModel):
    profiles: List[JobPreferenceSummary]
    total: int
    limit: int
    offset: int


@router.get("/job-preferences", response_model=JobPreferenceListResponse)
def list_job_preferences(
    search: Optional[str] = Query(None, description="Search candidate name/email or profile name"),
    worktype: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    visa_status: Optional[str] = Query(None),
    seniority_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: active, edited, deleted"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all candidate job profiles/preferences with candidate identity."""

    # Join JobProfile → Candidate for search
    query = select(JobProfile, Candidate).join(
        Candidate, JobProfile.candidate_id == Candidate.id
    )

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Candidate.name.ilike(pattern),
                Candidate.email.ilike(pattern),
                JobProfile.profile_name.ilike(pattern),
            )
        )
    if worktype:
        query = query.where(JobProfile.worktype == worktype)
    if employment_type:
        query = query.where(JobProfile.employment_type == employment_type)
    if visa_status:
        query = query.where(JobProfile.visa_status == visa_status)
    if seniority_level:
        query = query.where(JobProfile.seniority_level == seniority_level)

    # Status filter (computed after fetching, or pre-filter on is_deleted)
    if status == 'deleted':
        query = query.where(JobProfile.is_deleted == True)  # noqa: E712
    elif status in ('active', 'edited'):
        query = query.where(JobProfile.is_deleted == False)  # noqa: E712
    # else: no filter → show all

    total_q = select(func.count()).select_from(query.subquery())
    total = session.exec(total_q).one()

    rows = session.exec(
        query.order_by(JobProfile.updated_at.desc()).limit(limit).offset(offset)
    ).all()

    profiles = []
    for jp, cand in rows:
        # Resolve taxonomy names from IDs if legacy text fields are empty
        vendor_name = jp.product_vendor
        ptype_name = jp.product_type
        role_name = jp.job_role

        if not vendor_name and jp.vendor_id:
            v = session.get(ProductVendor, jp.vendor_id)
            vendor_name = v.name if v else None
        if not ptype_name and jp.product_type_id:
            pt = session.get(ProductType, jp.product_type_id)
            ptype_name = pt.name if pt else None
        if not role_name and jp.role_id:
            r = session.get(ProductRole, jp.role_id)
            role_name = r.name if r else None

        # Location preferences
        loc_prefs_raw = session.exec(
            select(LocationPreference).where(LocationPreference.job_profile_id == jp.id)
        ).all()
        loc_prefs = [
            LocationPref(
                city=lp.city,
                state=lp.state,
                country=lp.country,
                remote=None,
            )
            for lp in loc_prefs_raw
        ]

        # Compute status
        if jp.is_deleted:
            jp_status = "deleted"
        elif jp.updated_at and jp.created_at and (jp.updated_at - jp.created_at).total_seconds() > 60:
            jp_status = "edited"
        else:
            jp_status = "active"

        # Skip if status filter is 'active' or 'edited' and computed status doesn't match
        if status in ('active', 'edited') and jp_status != status:
            continue

        profiles.append(
            JobPreferenceSummary(
                id=jp.id,
                candidate_id=cand.id,
                candidate_name=cand.name,
                candidate_email=cand.email,
                profile_name=jp.profile_name,
                product_vendor=vendor_name,
                product_type=ptype_name,
                job_role=role_name,
                years_of_experience=jp.years_of_experience,
                seniority_level=jp.seniority_level,
                preferred_job_titles=jp.preferred_job_titles,
                job_category=jp.job_category,
                worktype=jp.worktype.value if hasattr(jp.worktype, "value") else str(jp.worktype) if jp.worktype else None,
                employment_type=jp.employment_type.value if hasattr(jp.employment_type, "value") else str(jp.employment_type) if jp.employment_type else None,
                shift_preference=jp.shift_preference,
                travel_willingness=jp.travel_willingness,
                remote_acceptance=jp.remote_acceptance,
                relocation_willingness=jp.relocation_willingness,
                location_preferences=loc_prefs,
                salary_min=jp.salary_min,
                salary_max=jp.salary_max,
                salary_currency=jp.salary_currency.value if hasattr(jp.salary_currency, "value") else str(jp.salary_currency) if jp.salary_currency else None,
                pay_type=jp.pay_type,
                negotiability=jp.negotiability,
                visa_status=jp.visa_status.value if hasattr(jp.visa_status, "value") else str(jp.visa_status) if jp.visa_status else None,
                notice_period=jp.notice_period,
                start_date_preference=jp.start_date_preference,
                availability_date=jp.availability_date,
                highest_education=jp.highest_education,
                security_clearance=jp.security_clearance,
                core_strengths=jp.core_strengths,
                profile_summary=jp.profile_summary,
                created_at=jp.created_at,
                updated_at=jp.updated_at,
                status=jp_status,
                deleted_at=jp.deleted_at,
            )
        )

    return JobPreferenceListResponse(
        profiles=profiles, total=total, limit=limit, offset=offset
    )
