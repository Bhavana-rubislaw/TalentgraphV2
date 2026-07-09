"""
Admin Portal — Extended APIs
==============================
Phases 2-7 of the Admin Portal enhancement:
  Phase 2  — Companies (Organization-level management)
  Phase 3  — Applications with timeline
  Phase 4  — Direct Create User + Invitation workflow
  Phase 5  — Bulk Actions (users / job-postings)
  Phase 6  — CSV Exports (users / jobs / applications)
  Phase 7  — Email Logs & resend

All /api/admin/* endpoints require ADMIN role.
The invitation acceptance endpoint is public: POST /auth/invitations/{token}/accept
"""

from __future__ import annotations

import csv
import hashlib
import io
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlmodel import Session, select, func, or_

from ..database import get_session
from ..models import (
    Application,
    ActivityEvent,
    Candidate,
    Company,
    EmailDelivery,
    EmailDeliveryStatus,
    InvitationStatus,
    JobPosting,
    JobPostingStatus,
    JobProfile,
    Meeting,
    MeetingParticipant,
    Organization,
    User,
    UserInvitation,
    UserRole,
    COMPANY_SIZE_VALUES,
)
from ..security import get_current_user, hash_password
from ..core.logging_config import get_logger, log_change
from ..workers.email_worker import queue_notification_email

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])

# ─────────────────────────────────────────────────────────────────────────────
# Auth guard (shared with main admin router)
# ─────────────────────────────────────────────────────────────────────────────

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

# Application status display mapping (operational → admin label)
STATUS_DISPLAY_MAP: dict[str, str] = {
    "applied": "Applied",
    "under_review": "Screened",
    "shortlisted": "Screened",
    "scheduled": "Interviewed",
    "selected": "Hired",
    "rejected": "Rejected",
}
# Terminal statuses — do not flag as "stuck"
TERMINAL_STATUSES = {"selected", "rejected"}

DEFAULT_STUCK_DAYS = 7
MAX_BULK_IDS = 100
MAX_EXPORT_ROWS = 50_000
INVITATION_EXPIRY_HOURS = 168  # 7 days
RESEND_COOLDOWN_MINUTES = 5


def _safe_csv_value(value: Any) -> str:
    """Prevent CSV formula injection by prefixing dangerous leading characters."""
    s = str(value) if value is not None else ""
    if s and s[0] in ("=", "+", "-", "@"):
        s = "'" + s
    return s


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _generate_secure_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _org_from_company(session: Session, company: Company) -> Optional[Organization]:
    if company.organization_id:
        return session.get(Organization, company.organization_id)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — COMPANIES
# ─────────────────────────────────────────────────────────────────────────────

class CompanySummary(BaseModel):
    id: int
    name: str
    industry: Optional[str]
    company_size: Optional[str]
    is_active: bool
    website: Optional[str]
    location: Optional[str]
    recruiter_count: int
    hr_count: int
    active_job_count: int
    total_job_count: int
    created_at: Optional[datetime]


class CompanyListResponse(BaseModel):
    companies: List[CompanySummary]
    total: int
    limit: int
    offset: int


class CompanyMemberSummary(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class CompanyJobSummary(BaseModel):
    id: int
    title: str
    status: str
    created_at: Optional[datetime]
    application_count: int


class CompanyDetailResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str]
    company_size: Optional[str]
    website: Optional[str]
    location: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    recruiters: List[CompanyMemberSummary]
    hr_members: List[CompanyMemberSummary]
    job_counts_by_status: Dict[str, int]
    recent_jobs: List[CompanyJobSummary]
    total_applications: int


class UpdateOrganizationStatusRequest(BaseModel):
    is_active: bool


def _build_org_summary(session: Session, org: Organization) -> CompanySummary:
    # Get all company member rows for this org
    members = session.exec(
        select(Company).where(Company.organization_id == org.id)
    ).all()
    member_user_ids = [m.user_id for m in members]
    company_ids = [m.id for m in members]

    recruiter_count = 0
    hr_count = 0
    if member_user_ids:
        recruiter_count = session.exec(
            select(func.count(User.id)).where(
                User.id.in_(member_user_ids),
                User.role == UserRole.RECRUITER,
                User.is_active == True,
            )
        ).one()
        hr_count = session.exec(
            select(func.count(User.id)).where(
                User.id.in_(member_user_ids),
                User.role == UserRole.HR,
                User.is_active == True,
            )
        ).one()

    active_job_count = 0
    total_job_count = 0
    if company_ids:
        active_job_count = session.exec(
            select(func.count(JobPosting.id)).where(
                JobPosting.company_id.in_(company_ids),
                JobPosting.status == JobPostingStatus.ACTIVE,
            )
        ).one()
        total_job_count = session.exec(
            select(func.count(JobPosting.id)).where(
                JobPosting.company_id.in_(company_ids)
            )
        ).one()

    return CompanySummary(
        id=org.id,
        name=org.name,
        industry=org.industry,
        company_size=org.company_size,
        is_active=org.is_active,
        website=org.website,
        location=org.location,
        recruiter_count=recruiter_count,
        hr_count=hr_count,
        active_job_count=active_job_count,
        total_job_count=total_job_count,
        created_at=org.created_at,
    )


@router.get("/companies", response_model=CompanyListResponse)
def list_companies(
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    company_size: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List organizations with filters and aggregate counts."""
    query = select(Organization)
    if search:
        pattern = f"%{search}%"
        query = query.where(Organization.name.ilike(pattern))
    if industry:
        query = query.where(Organization.industry.ilike(f"%{industry}%"))
    if company_size:
        query = query.where(Organization.company_size == company_size)
    if is_active is not None:
        query = query.where(Organization.is_active == is_active)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    orgs = session.exec(query.order_by(Organization.created_at.desc()).limit(limit).offset(offset)).all()

    return CompanyListResponse(
        companies=[_build_org_summary(session, org) for org in orgs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/companies/{organization_id}", response_model=CompanyDetailResponse)
def get_company(
    organization_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get full organization details including members, jobs, and application counts."""
    org = session.get(Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    members = session.exec(
        select(Company).where(Company.organization_id == org.id)
    ).all()
    member_user_ids = [m.user_id for m in members]
    company_ids = [m.id for m in members]

    # Build member lists
    recruiters: List[CompanyMemberSummary] = []
    hr_members: List[CompanyMemberSummary] = []
    if member_user_ids:
        users = session.exec(select(User).where(User.id.in_(member_user_ids))).all()
        for user in users:
            role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
            m = CompanyMemberSummary(
                user_id=user.id,
                full_name=user.full_name or "",
                email=user.email,
                role=role_val,
                is_active=user.is_active,
            )
            if role_val == "recruiter":
                recruiters.append(m)
            elif role_val == "hr":
                hr_members.append(m)

    # Job counts by status
    job_counts: Dict[str, int] = {}
    if company_ids:
        rows = session.exec(
            select(JobPosting.status, func.count(JobPosting.id))
            .where(JobPosting.company_id.in_(company_ids))
            .group_by(JobPosting.status)
        ).all()
        for status_val, cnt in rows:
            label = status_val.value if hasattr(status_val, "value") else str(status_val)
            job_counts[label] = cnt

    # Recent jobs (up to 10)
    recent_jobs: List[CompanyJobSummary] = []
    if company_ids:
        recent = session.exec(
            select(JobPosting)
            .where(JobPosting.company_id.in_(company_ids))
            .order_by(JobPosting.created_at.desc())
            .limit(10)
        ).all()
        for job in recent:
            app_cnt = session.exec(
                select(func.count(Application.id)).where(Application.job_posting_id == job.id)
            ).one()
            recent_jobs.append(
                CompanyJobSummary(
                    id=job.id,
                    title=job.job_title,
                    status=job.status.value if hasattr(job.status, "value") else str(job.status),
                    created_at=job.created_at,
                    application_count=app_cnt,
                )
            )

    # Total applications
    total_applications = 0
    if company_ids:
        job_ids = list(session.exec(
            select(JobPosting.id).where(JobPosting.company_id.in_(company_ids))
        ).all())
        if job_ids:
            total_applications = session.exec(
                select(func.count(Application.id)).where(Application.job_posting_id.in_(job_ids))
            ).one()

    return CompanyDetailResponse(
        id=org.id,
        name=org.name,
        industry=org.industry,
        company_size=org.company_size,
        website=org.website,
        location=org.location,
        description=org.description,
        is_active=org.is_active,
        created_at=org.created_at,
        updated_at=org.updated_at,
        recruiters=recruiters,
        hr_members=hr_members,
        job_counts_by_status=job_counts,
        recent_jobs=recent_jobs,
        total_applications=total_applications,
    )


@router.patch("/companies/{organization_id}/status")
def update_company_status(
    organization_id: int,
    body: UpdateOrganizationStatusRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """
    Deactivate or reactivate an organization.
    Deactivation cascades: deactivates member users and freezes active/reposted jobs.
    Reactivation only sets Organization.is_active = True (does NOT auto-restore members/jobs).
    """
    org = session.get(Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    old_active = org.is_active
    org.is_active = body.is_active
    org.updated_at = datetime.utcnow()

    affected_users = 0
    affected_jobs = 0

    if not body.is_active:
        # Deactivate all members
        members = session.exec(
            select(Company).where(Company.organization_id == org.id)
        ).all()
        company_ids = [m.id for m in members]
        member_user_ids = [m.user_id for m in members]

        if member_user_ids:
            users = session.exec(select(User).where(User.id.in_(member_user_ids))).all()
            for user in users:
                if user.is_active:
                    user.is_active = False
                    session.add(user)
                    affected_users += 1

        # Freeze active and reposted jobs
        if company_ids:
            jobs = session.exec(
                select(JobPosting)
                .where(
                    JobPosting.company_id.in_(company_ids),
                    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED]),
                )
            ).all()
            for job in jobs:
                job.status = JobPostingStatus.FROZEN
                job.frozen_at = datetime.utcnow()
                session.add(job)
                affected_jobs += 1

    session.add(org)
    session.commit()

    action = "deactivated" if not body.is_active else "reactivated"
    log_change(
        logger,
        action=f"organization_{action}",
        entity_type="organization",
        entity_id=str(organization_id),
        changes={
            "is_active": {"old": old_active, "new": body.is_active},
            "affected_users": affected_users,
            "affected_jobs": affected_jobs,
        },
        user_id=current_user.get("user_id"),
    )

    return {
        "ok": True,
        "message": f"Organization {action}",
        "affected_users": affected_users,
        "affected_jobs_frozen": affected_jobs,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — APPLICATIONS
# ─────────────────────────────────────────────────────────────────────────────

class ApplicationListItem(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    job_id: int
    job_title: str
    organization_id: Optional[int]
    company_name: str
    operational_status: str
    display_status: str
    applied_at: Optional[datetime]
    last_status_updated_at: Optional[datetime]
    days_in_current_status: int
    is_stuck: bool


class ApplicationListResponse(BaseModel):
    applications: List[ApplicationListItem]
    total: int
    limit: int
    offset: int


class TimelineEvent(BaseModel):
    event_type: str  # "status_change" | "meeting" | "application_created" | "audit"
    title: str
    description: Optional[str]
    occurred_at: datetime
    performed_by: Optional[str]


class ApplicationDetailResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    job_id: int
    job_title: str
    company_id: Optional[int]
    company_name: Optional[str]
    organization_id: Optional[int]
    operational_status: str
    display_status: str
    applied_at: Optional[datetime]
    last_status_updated_at: Optional[datetime]
    recruiter_notes: Optional[str]
    timeline: List[TimelineEvent]


def _days_since(dt: Optional[datetime]) -> int:
    if dt is None:
        return 0
    now = datetime.utcnow()
    if dt.tzinfo is not None:
        now = datetime.now(timezone.utc)
    delta = now - dt
    return max(0, delta.days)


def _build_app_list_item(
    session: Session,
    app: Application,
    stuck_days: int = DEFAULT_STUCK_DAYS,
) -> ApplicationListItem:
    candidate = session.get(Candidate, app.candidate_id)
    cand_name = candidate.name if candidate else "Unknown"
    cand_email = candidate.email if candidate else ""

    job = session.get(JobPosting, app.job_posting_id)
    job_title = job.job_title if job else "Unknown"

    company: Optional[Company] = None
    org: Optional[Organization] = None
    if job:
        company = session.get(Company, job.company_id)
        if company and company.organization_id:
            org = session.get(Organization, company.organization_id)
    company_name = (org.name if org else (company.company_name if company else "Unknown"))

    op_status = app.status or "applied"
    display_status = STATUS_DISPLAY_MAP.get(op_status, op_status.replace("_", " ").title())

    last_updated = app.last_status_updated_at or app.applied_at
    days_in_status = _days_since(last_updated)
    is_stuck = (op_status not in TERMINAL_STATUSES) and (days_in_status >= stuck_days)

    return ApplicationListItem(
        id=app.id,
        candidate_id=app.candidate_id,
        candidate_name=cand_name,
        candidate_email=cand_email,
        job_id=app.job_posting_id,
        job_title=job_title,
        organization_id=org.id if org else None,
        company_name=company_name,
        operational_status=op_status,
        display_status=display_status,
        applied_at=app.applied_at,
        last_status_updated_at=last_updated,
        days_in_current_status=days_in_status,
        is_stuck=is_stuck,
    )


def _build_application_query(
    search: Optional[str],
    job_id: Optional[int],
    candidate_id: Optional[int],
    organization_id: Optional[int],
    status: Optional[str],
    applied_from: Optional[str],
    applied_to: Optional[str],
    session: Session,
):
    query = select(Application)

    if search:
        # Search by candidate name/email — need subquery through Candidate
        pattern = f"%{search}%"
        matching_candidates = session.exec(
            select(Candidate.id).where(
                or_(Candidate.name.ilike(pattern), Candidate.email.ilike(pattern))
            )
        ).all()
        if matching_candidates:
            query = query.where(Application.candidate_id.in_(matching_candidates))
        else:
            # Also try matching job title
            matching_jobs = session.exec(
                select(JobPosting.id).where(JobPosting.job_title.ilike(pattern))
            ).all()
            if matching_jobs:
                query = query.where(Application.job_posting_id.in_(matching_jobs))

    if job_id:
        query = query.where(Application.job_posting_id == job_id)
    if candidate_id:
        query = query.where(Application.candidate_id == candidate_id)
    if organization_id:
        # Applications for jobs posted by companies in this org
        org_company_ids = session.exec(
            select(Company.id).where(Company.organization_id == organization_id)
        ).all()
        if org_company_ids:
            org_job_ids = session.exec(
                select(JobPosting.id).where(JobPosting.company_id.in_(org_company_ids))
            ).all()
            if org_job_ids:
                query = query.where(Application.job_posting_id.in_(org_job_ids))
    if status:
        query = query.where(Application.status == status)
    if applied_from:
        try:
            dt = datetime.fromisoformat(applied_from)
            query = query.where(Application.applied_at >= dt)
        except ValueError:
            pass
    if applied_to:
        try:
            dt = datetime.fromisoformat(applied_to)
            query = query.where(Application.applied_at <= dt)
        except ValueError:
            pass

    return query


@router.get("/applications", response_model=ApplicationListResponse)
def list_applications(
    search: Optional[str] = Query(None),
    job_id: Optional[int] = Query(None),
    candidate_id: Optional[int] = Query(None),
    organization_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    stuck_days: int = Query(DEFAULT_STUCK_DAYS, ge=1),
    applied_from: Optional[str] = Query(None),
    applied_to: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all applications with filters, pagination, and stuck-pipeline detection."""
    query = _build_application_query(
        search, job_id, candidate_id, organization_id, status,
        applied_from, applied_to, session
    )

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    apps = session.exec(query.order_by(Application.applied_at.desc()).limit(limit).offset(offset)).all()

    items = [_build_app_list_item(session, app, stuck_days) for app in apps]

    return ApplicationListResponse(applications=items, total=total, limit=limit, offset=offset)


@router.get("/applications/{application_id}", response_model=ApplicationDetailResponse)
def get_application(
    application_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get full application details including timeline."""
    app = session.get(Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate = session.get(Candidate, app.candidate_id)
    cand_name = candidate.name if candidate else "Unknown"
    cand_email = candidate.email if candidate else ""

    job = session.get(JobPosting, app.job_posting_id)
    job_title = job.job_title if job else "Unknown"

    company: Optional[Company] = None
    org: Optional[Organization] = None
    if job:
        company = session.get(Company, job.company_id)
        if company and company.organization_id:
            org = session.get(Organization, company.organization_id)

    company_name = org.name if org else (company.company_name if company else None)
    op_status = app.status or "applied"
    display_status = STATUS_DISPLAY_MAP.get(op_status, op_status.replace("_", " ").title())

    # Build timeline
    timeline = _get_application_timeline(session, application_id)

    return ApplicationDetailResponse(
        id=app.id,
        candidate_id=app.candidate_id,
        candidate_name=cand_name,
        candidate_email=cand_email,
        job_id=app.job_posting_id,
        job_title=job_title,
        company_id=company.id if company else None,
        company_name=company_name,
        organization_id=org.id if org else None,
        operational_status=op_status,
        display_status=display_status,
        applied_at=app.applied_at,
        last_status_updated_at=app.last_status_updated_at,
        recruiter_notes=app.recruiter_notes,
        timeline=timeline,
    )


@router.get("/applications/{application_id}/timeline", response_model=List[TimelineEvent])
def get_application_timeline_endpoint(
    application_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get chronological timeline for an application."""
    if not session.get(Application, application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return _get_application_timeline(session, application_id)


def _get_application_timeline(session: Session, application_id: int) -> List[TimelineEvent]:
    events: List[TimelineEvent] = []

    # Audit events
    audit_rows = session.exec(
        select(ActivityEvent)
        .where(
            ActivityEvent.entity_type == "application",
            ActivityEvent.entity_id == str(application_id),
        )
        .order_by(ActivityEvent.created_at.asc())
    ).all()

    for row in audit_rows:
        # Look up performer name
        performer_name: Optional[str] = None
        try:
            performer = session.get(User, row.performed_by_user_id)
            if performer:
                performer_name = performer.full_name or performer.email
        except Exception:
            pass

        title = row.action.replace("_", " ").title()
        description = None
        if row.before_value and row.after_value:
            description = f"{row.before_value} → {row.after_value}"

        events.append(
            TimelineEvent(
                event_type="audit",
                title=title,
                description=description,
                occurred_at=row.created_at,
                performed_by=performer_name,
            )
        )

    # Related meetings
    app = session.get(Application, application_id)
    if app:
        candidate = session.get(Candidate, app.candidate_id)
        job = session.get(JobPosting, app.job_posting_id)
        if candidate and job:
            participant_subq = select(MeetingParticipant.meeting_id).where(
                MeetingParticipant.user_id == candidate.user_id
            )
            meetings = session.exec(
                select(Meeting)
                .where(
                    Meeting.id.in_(participant_subq),
                    Meeting.job_posting_id == app.job_posting_id,
                )
                .order_by(Meeting.scheduled_start.asc())
            ).all()
            for m in meetings:
                events.append(
                    TimelineEvent(
                        event_type="meeting",
                        title=f"Meeting: {m.title}",
                        description=f"Status: {m.status.value if hasattr(m.status, 'value') else m.status}",
                        occurred_at=m.created_at,
                        performed_by=None,
                    )
                )

    # Sort all events chronologically
    events.sort(key=lambda e: e.occurred_at)
    return events


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 — CREATE USER + INVITATIONS
# ─────────────────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    full_name: str
    email: str
    role: str
    organization_id: Optional[int] = None
    temporary_password: Optional[str] = None


class CreateUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime]
    temporary_password_generated: bool  # True if server generated the password


@router.post("/users", response_model=CreateUserResponse)
def create_user(
    body: CreateUserRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """
    Directly create a new platform user.
    Generates a temporary password if none is provided.
    Creates the required candidate or company profile.
    """
    normalized_email = body.email.lower().strip()

    # Validate role
    valid_roles = {r.value for r in UserRole}
    if body.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    role = UserRole(body.role.lower())

    # Company-side roles require organization
    if role in (UserRole.RECRUITER, UserRole.HR) and not body.organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required for recruiter and HR users")

    if body.organization_id:
        org = session.get(Organization, body.organization_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

    # Check email uniqueness
    existing = session.exec(select(User).where(User.email == normalized_email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Password
    generated_password = False
    password = body.temporary_password or ""
    if not password:
        password = _generate_secure_password()
        generated_password = True

    try:
        pw_hash = hash_password(password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create user
    user = User(
        email=normalized_email,
        full_name=body.full_name.strip(),
        password_hash=pw_hash,
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(user)
    session.flush()  # get user.id

    # Create profile
    if role == UserRole.CANDIDATE:
        cand = Candidate(
            user_id=user.id,
            name=body.full_name.strip(),
            email=normalized_email,
            phone="",
            residential_address="",
            location_state="",
            location_county="",
            location_zipcode="",
        )
        session.add(cand)
    elif role in (UserRole.RECRUITER, UserRole.HR):
        org_name = ""
        if body.organization_id:
            org = session.get(Organization, body.organization_id)
            if org:
                org_name = org.name
        comp = Company(
            user_id=user.id,
            organization_id=body.organization_id,
            company_name=org_name,
            company_email=normalized_email,
            employee_type=role.value,
        )
        session.add(comp)

    session.commit()
    session.refresh(user)

    # Queue welcome email (best effort)
    try:
        subject = "Welcome to TalentGraph"
        pwd_note = f"<p>Your temporary password is: <strong>{password}</strong></p><p>Please change it after first login.</p>" if generated_password else "<p>Use the password provided by your administrator to log in.</p>"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to TalentGraph, {body.full_name}!</h2>
        <p>Your account has been created by an administrator.</p>
        {pwd_note}
        <p><a href="http://localhost:3003" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Log In</a></p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=user.id,
            event_type="welcome",
            recipient_email=normalized_email,
            subject=subject,
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[CREATE_USER] Failed to queue welcome email: {e}")

    log_change(
        logger,
        action="user_created_by_admin",
        entity_type="user",
        entity_id=str(user.id),
        changes={"email": normalized_email, "role": role.value},
        user_id=current_user.get("user_id"),
    )

    return CreateUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
        temporary_password_generated=generated_password,
    )


# ── Invitations ────────────────────────────────────────────────────────────────

class CreateInvitationRequest(BaseModel):
    full_name: str
    email: str
    role: str
    organization_id: Optional[int] = None


class InvitationSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_id: Optional[int]
    status: str
    expires_at: datetime
    created_at: datetime


class InvitationListResponse(BaseModel):
    invitations: List[InvitationSummary]
    total: int
    limit: int
    offset: int


@router.post("/invitations", response_model=InvitationSummary)
def create_invitation(
    body: CreateInvitationRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Issue a new user invitation by email."""
    normalized_email = body.email.lower().strip()

    valid_roles = {r.value for r in UserRole}
    if body.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    role = UserRole(body.role.lower())
    if role in (UserRole.RECRUITER, UserRole.HR) and not body.organization_id:
        raise HTTPException(status_code=400, detail="organization_id required for recruiter/HR invitations")

    if body.organization_id:
        if not session.get(Organization, body.organization_id):
            raise HTTPException(status_code=404, detail="Organization not found")

    # Reject if email already registered
    if session.exec(select(User).where(User.email == normalized_email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Reject if a pending invitation already exists
    existing_invite = session.exec(
        select(UserInvitation).where(
            UserInvitation.email == normalized_email,
            UserInvitation.status == InvitationStatus.PENDING.value,
        )
    ).first()
    if existing_invite:
        if existing_invite.expires_at > datetime.utcnow():
            raise HTTPException(
                status_code=409, detail="A pending invitation already exists for this email"
            )
        else:
            # Expire the old one
            existing_invite.status = InvitationStatus.EXPIRED.value
            session.add(existing_invite)

    # Generate secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=INVITATION_EXPIRY_HOURS)

    invite = UserInvitation(
        email=normalized_email,
        full_name=body.full_name.strip(),
        role=role,
        organization_id=body.organization_id,
        token_hash=token_hash,
        invited_by_user_id=current_user.get("user_id"),
        status=InvitationStatus.PENDING.value,
        expires_at=expires_at,
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)

    # Queue invitation email
    try:
        accept_url = f"http://localhost:3003/accept-invite?token={raw_token}"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>You've been invited to TalentGraph</h2>
        <p>Hi {body.full_name},</p>
        <p>You have been invited to join TalentGraph as a <strong>{role.value}</strong>.</p>
        <p>This invitation expires in 7 days.</p>
        <p><a href="{accept_url}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
        <p style="color:#888;font-size:12px;">Or copy this link: {accept_url}</p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=current_user.get("user_id"),
            event_type="user_invitation",
            recipient_email=normalized_email,
            subject="You're invited to TalentGraph",
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[INVITE] Failed to queue invitation email: {e}")

    log_change(
        logger,
        action="invitation_created",
        entity_type="invitation",
        entity_id=str(invite.id),
        changes={"email": normalized_email, "role": role.value},
        user_id=current_user.get("user_id"),
    )

    return _invitation_to_summary(invite)


@router.get("/invitations", response_model=InvitationListResponse)
def list_invitations(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all invitations."""
    query = select(UserInvitation)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(UserInvitation.email.ilike(pattern), UserInvitation.full_name.ilike(pattern))
        )
    if status:
        query = query.where(UserInvitation.status == status)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    invites = session.exec(query.order_by(UserInvitation.created_at.desc()).limit(limit).offset(offset)).all()

    return InvitationListResponse(
        invitations=[_invitation_to_summary(i) for i in invites],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/invitations/{invitation_id}/resend")
def resend_invitation(
    invitation_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Resend a pending invitation (with cooldown check)."""
    invite = session.get(UserInvitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Only pending invitations can be resent")

    # Simple cooldown: check if created_at + cooldown > now (or use updated_at)
    cooldown_cutoff = datetime.utcnow() - timedelta(minutes=RESEND_COOLDOWN_MINUTES)
    if invite.created_at > cooldown_cutoff:
        raise HTTPException(
            status_code=429, detail=f"Please wait {RESEND_COOLDOWN_MINUTES} minutes between resends"
        )

    # Generate new token
    raw_token = secrets.token_urlsafe(32)
    invite.token_hash = _hash_token(raw_token)
    invite.expires_at = datetime.utcnow() + timedelta(hours=INVITATION_EXPIRY_HOURS)
    session.add(invite)
    session.commit()

    try:
        accept_url = f"http://localhost:3003/accept-invite?token={raw_token}"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>TalentGraph Invitation (Resent)</h2>
        <p>Hi {invite.full_name},</p>
        <p>Your invitation link has been refreshed. It expires in 7 days.</p>
        <p><a href="{accept_url}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=current_user.get("user_id"),
            event_type="user_invitation",
            recipient_email=invite.email,
            subject="Your TalentGraph invitation (updated link)",
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[INVITE_RESEND] Failed to queue invitation email: {e}")

    log_change(
        logger,
        action="invitation_resent",
        entity_type="invitation",
        entity_id=str(invitation_id),
        changes={"email": invite.email},
        user_id=current_user.get("user_id"),
    )

    return {"ok": True, "message": "Invitation resent"}


def _invitation_to_summary(invite: UserInvitation) -> InvitationSummary:
    return InvitationSummary(
        id=invite.id,
        email=invite.email,
        full_name=invite.full_name,
        role=invite.role.value if hasattr(invite.role, "value") else str(invite.role),
        organization_id=invite.organization_id,
        status=invite.status,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
    )


# ── Public invitation acceptance (NOT under /api/admin) ───────────────────────

accept_router = APIRouter(prefix="/auth", tags=["Auth"])


class AcceptInvitationRequest(BaseModel):
    password: str


@accept_router.post("/invitations/{token}/accept")
def accept_invitation(
    token: str,
    body: AcceptInvitationRequest,
    session: Session = Depends(get_session),
):
    """
    Accept an invitation and create the user account.
    This is a public endpoint (no admin auth required).
    """
    token_hash = _hash_token(token)
    invite = session.exec(
        select(UserInvitation).where(UserInvitation.token_hash == token_hash)
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    if invite.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invitation already used or expired")
    if invite.expires_at < datetime.utcnow():
        invite.status = InvitationStatus.EXPIRED.value
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    normalized_email = invite.email.lower().strip()
    if session.exec(select(User).where(User.email == normalized_email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        pw_hash = hash_password(body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    role = invite.role if isinstance(invite.role, UserRole) else UserRole(invite.role)

    user = User(
        email=normalized_email,
        full_name=invite.full_name,
        password_hash=pw_hash,
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(user)
    session.flush()

    if role == UserRole.CANDIDATE:
        session.add(Candidate(
            user_id=user.id,
            name=invite.full_name,
            email=normalized_email,
            phone="",
            residential_address="",
            location_state="",
            location_county="",
            location_zipcode="",
        ))
    elif role in (UserRole.RECRUITER, UserRole.HR):
        org_name = ""
        if invite.organization_id:
            org = session.get(Organization, invite.organization_id)
            if org:
                org_name = org.name
        session.add(Company(
            user_id=user.id,
            organization_id=invite.organization_id,
            company_name=org_name,
            company_email=normalized_email,
            employee_type=role.value,
        ))

    # Mark invitation as accepted (single-use)
    invite.status = InvitationStatus.ACCEPTED.value
    invite.accepted_at = datetime.utcnow()
    session.add(invite)
    session.commit()

    return {"ok": True, "message": "Account created. You can now log in."}


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 — BULK ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

class BulkResult(BaseModel):
    id: int
    ok: bool
    error: Optional[str] = None


class BulkActionRequest(BaseModel):
    user_ids: List[int]
    action: str  # activate | deactivate | delete


class BulkActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]


class BulkJobActionRequest(BaseModel):
    job_ids: List[int]
    action: str  # freeze | cancel


class BulkJobActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]


@router.post("/users/bulk-action", response_model=BulkActionResponse)
def bulk_user_action(
    body: BulkActionRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Bulk activate, deactivate, or delete users."""
    allowed_actions = {"activate", "deactivate", "delete"}
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"action must be one of: {', '.join(allowed_actions)}")

    # Deduplicate and cap
    ids = list(dict.fromkeys(body.user_ids))[:MAX_BULK_IDS]
    if len(body.user_ids) > MAX_BULK_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_IDS} IDs per request")

    current_admin_id = current_user.get("user_id")
    results: List[BulkResult] = []

    for uid in ids:
        try:
            if uid == current_admin_id:
                results.append(BulkResult(id=uid, ok=False, error="Cannot modify your own account"))
                continue

            user = session.get(User, uid)
            if not user:
                results.append(BulkResult(id=uid, ok=False, error="User not found"))
                continue

            if body.action == "activate":
                user.is_active = True
                session.add(user)
            elif body.action == "deactivate":
                user.is_active = False
                session.add(user)
            elif body.action == "delete":
                session.delete(user)

            log_change(
                logger,
                action=f"bulk_user_{body.action}",
                entity_type="user",
                entity_id=str(uid),
                changes={"action": body.action},
                user_id=current_admin_id,
            )
            results.append(BulkResult(id=uid, ok=True))
        except Exception as e:
            results.append(BulkResult(id=uid, ok=False, error=str(e)[:200]))

    session.commit()
    succeeded = sum(1 for r in results if r.ok)
    return BulkActionResponse(
        requested=len(ids),
        succeeded=succeeded,
        failed=len(ids) - succeeded,
        results=results,
    )


@router.post("/job-postings/bulk-action", response_model=BulkJobActionResponse)
def bulk_job_action(
    body: BulkJobActionRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Bulk freeze or cancel job postings."""
    allowed_actions = {"freeze", "cancel"}
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"action must be one of: {', '.join(allowed_actions)}")

    ids = list(dict.fromkeys(body.job_ids))[:MAX_BULK_IDS]
    if len(body.job_ids) > MAX_BULK_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_IDS} IDs per request")

    results: List[BulkResult] = []
    target_status = (
        JobPostingStatus.FROZEN if body.action == "freeze" else JobPostingStatus.CANCELLED
    )

    for jid in ids:
        try:
            job = session.get(JobPosting, jid)
            if not job:
                results.append(BulkResult(id=jid, ok=False, error="Job not found"))
                continue

            old_status = job.status
            job.status = target_status
            if target_status == JobPostingStatus.FROZEN:
                job.frozen_at = datetime.utcnow()
            elif target_status == JobPostingStatus.CANCELLED:
                job.cancelled_at = datetime.utcnow()
            session.add(job)

            log_change(
                logger,
                action=f"bulk_job_{body.action}",
                entity_type="job_posting",
                entity_id=str(jid),
                changes={"status": {"old": str(old_status), "new": target_status.value}},
                user_id=current_user.get("user_id"),
            )
            results.append(BulkResult(id=jid, ok=True))
        except Exception as e:
            results.append(BulkResult(id=jid, ok=False, error=str(e)[:200]))

    session.commit()
    succeeded = sum(1 for r in results if r.ok)
    return BulkJobActionResponse(
        requested=len(ids),
        succeeded=succeeded,
        failed=len(ids) - succeeded,
        results=results,
    )


class BulkCompanyActionRequest(BaseModel):
    org_ids: List[int]
    action: str  # activate | deactivate


class BulkCompanyActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]


@router.post("/companies/bulk-action", response_model=BulkCompanyActionResponse)
def bulk_company_action(
    body: BulkCompanyActionRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Bulk activate or deactivate organizations."""
    allowed_actions = {"activate", "deactivate"}
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"action must be one of: {', '.join(allowed_actions)}")

    ids = list(dict.fromkeys(body.org_ids))[:MAX_BULK_IDS]
    if len(body.org_ids) > MAX_BULK_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_IDS} IDs per request")

    results: List[BulkResult] = []
    for oid in ids:
        try:
            org = session.get(Organization, oid)
            if not org:
                results.append(BulkResult(id=oid, ok=False, error="Organization not found"))
                continue
            org.is_active = (body.action == "activate")
            org.updated_at = datetime.utcnow()
            session.add(org)
            log_change(
                logger,
                action=f"bulk_company_{body.action}",
                entity_type="organization",
                entity_id=str(oid),
                changes={"action": body.action},
                user_id=current_user.get("user_id"),
            )
            results.append(BulkResult(id=oid, ok=True))
        except Exception as e:
            results.append(BulkResult(id=oid, ok=False, error=str(e)[:200]))

    session.commit()
    succeeded = sum(1 for r in results if r.ok)
    return BulkCompanyActionResponse(
        requested=len(ids),
        succeeded=succeeded,
        failed=len(ids) - succeeded,
        results=results,
    )


class BulkJobPrefActionRequest(BaseModel):
    profile_ids: List[int]
    action: str  # delete | restore


class BulkJobPrefActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]


@router.post("/job-preferences/bulk-action", response_model=BulkJobPrefActionResponse)
def bulk_job_pref_action(
    body: BulkJobPrefActionRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Bulk delete or restore candidate job profiles."""
    allowed_actions = {"delete", "restore"}
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"action must be one of: {', '.join(allowed_actions)}")

    ids = list(dict.fromkeys(body.profile_ids))[:MAX_BULK_IDS]
    if len(body.profile_ids) > MAX_BULK_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_IDS} IDs per request")

    results: List[BulkResult] = []
    for pid in ids:
        try:
            jp = session.get(JobProfile, pid)
            if not jp:
                results.append(BulkResult(id=pid, ok=False, error="Job profile not found"))
                continue
            if body.action == "delete":
                jp.is_deleted = True
                jp.deleted_at = datetime.utcnow()
            else:  # restore
                jp.is_deleted = False
                jp.deleted_at = None
            jp.updated_at = datetime.utcnow()
            session.add(jp)
            log_change(
                logger,
                action=f"bulk_job_pref_{body.action}",
                entity_type="job_profile",
                entity_id=str(pid),
                changes={"action": body.action},
                user_id=current_user.get("user_id"),
            )
            results.append(BulkResult(id=pid, ok=True))
        except Exception as e:
            results.append(BulkResult(id=pid, ok=False, error=str(e)[:200]))

    session.commit()
    succeeded = sum(1 for r in results if r.ok)
    return BulkJobPrefActionResponse(
        requested=len(ids),
        succeeded=succeeded,
        failed=len(ids) - succeeded,
        results=results,
    )


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 — CSV EXPORTS
# ─────────────────────────────────────────────────────────────────────────────

def _stream_csv(headers: List[str], rows: List[List[str]], filename: str) -> StreamingResponse:
    def generate():
        buf = io.StringIO()
        # UTF-8 BOM for spreadsheet compatibility
        buf.write("\ufeff")
        writer = csv.writer(buf)
        writer.writerow(headers)
        yield buf.getvalue()

        for row in rows:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([_safe_csv_value(v) for v in row])
            yield buf.getvalue()

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/users/export.csv")
def export_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Export filtered users as CSV."""
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.email.ilike(pattern), User.full_name.ilike(pattern)))
    if role:
        query = query.where(User.role == role.lower())
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    users = session.exec(query.order_by(User.created_at.desc()).limit(MAX_EXPORT_ROWS)).all()

    headers = ["ID", "Name", "Email", "Role", "Status", "Created At"]
    rows = []
    for u in users:
        rows.append([
            u.id,
            u.full_name or "",
            u.email,
            u.role.value if hasattr(u.role, "value") else str(u.role),
            "Active" if u.is_active else "Inactive",
            u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "",
        ])

    return _stream_csv(headers, rows, "users_export.csv")


@router.get("/job-postings/export.csv")
def export_jobs(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Export filtered job postings as CSV."""
    query = select(JobPosting)
    if search:
        pattern = f"%{search}%"
        query = query.where(JobPosting.job_title.ilike(pattern))
    if status:
        query = query.where(JobPosting.status == status.lower())

    jobs = session.exec(query.order_by(JobPosting.created_at.desc()).limit(MAX_EXPORT_ROWS)).all()

    headers = ["ID", "Title", "Company", "Status", "Location", "Applications", "Created At"]
    rows = []
    for job in jobs:
        company = session.get(Company, job.company_id) if job.company_id else None
        org = session.get(Organization, company.organization_id) if (company and company.organization_id) else None
        company_name = org.name if org else (company.company_name if company else "")
        app_count = session.exec(
            select(func.count(Application.id)).where(Application.job_posting_id == job.id)
        ).one()
        rows.append([
            job.id,
            job.job_title,
            company_name,
            job.status.value if hasattr(job.status, "value") else str(job.status),
            getattr(job, "location", "") or "",
            app_count,
            job.created_at.strftime("%Y-%m-%d %H:%M:%S") if job.created_at else "",
        ])

    return _stream_csv(headers, rows, "jobs_export.csv")


@router.get("/applications/export.csv")
def export_applications(
    search: Optional[str] = Query(None),
    job_id: Optional[int] = Query(None),
    candidate_id: Optional[int] = Query(None),
    organization_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    applied_from: Optional[str] = Query(None),
    applied_to: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Export filtered applications as CSV."""
    query = _build_application_query(
        search, job_id, candidate_id, organization_id, status,
        applied_from, applied_to, session
    )
    apps = session.exec(query.order_by(Application.applied_at.desc()).limit(MAX_EXPORT_ROWS)).all()

    headers = [
        "ID", "Candidate", "Candidate Email",
        "Job", "Company", "Status", "Display Status",
        "Applied At", "Last Updated", "Days In Status",
    ]
    rows = []
    for app in apps:
        item = _build_app_list_item(session, app)
        rows.append([
            item.id,
            item.candidate_name,
            item.candidate_email,
            item.job_title,
            item.company_name,
            item.operational_status,
            item.display_status,
            item.applied_at.strftime("%Y-%m-%d %H:%M:%S") if item.applied_at else "",
            item.last_status_updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.last_status_updated_at else "",
            item.days_in_current_status,
        ])

    return _stream_csv(headers, rows, "applications_export.csv")


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7 — EMAIL LOGS
# ─────────────────────────────────────────────────────────────────────────────

class EmailDeliverySummary(BaseModel):
    id: int
    recipient_email: str
    event_type: str
    subject: str
    status: str
    attempts: int
    max_attempts: int
    last_error: Optional[str]
    created_at: Optional[datetime]
    sent_at: Optional[datetime]
    failed_at: Optional[datetime]


class EmailDeliveryListResponse(BaseModel):
    deliveries: List[EmailDeliverySummary]
    total: int
    limit: int
    offset: int


class EmailDeliveryDetailResponse(BaseModel):
    id: int
    recipient_email: str
    event_type: str
    subject: str
    status: str
    attempts: int
    max_attempts: int
    last_error: Optional[str]
    created_at: Optional[datetime]
    sent_at: Optional[datetime]
    failed_at: Optional[datetime]
    # html_body intentionally excluded from response — must be sanitized before use


class ResendEmailResponse(BaseModel):
    ok: bool
    new_delivery_id: int
    message: str


@router.get("/email-deliveries", response_model=EmailDeliveryListResponse)
def list_email_deliveries(
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sent_from: Optional[str] = Query(None),
    sent_to: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List email deliveries with filters."""
    query = select(EmailDelivery)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                EmailDelivery.recipient_email.ilike(pattern),
                EmailDelivery.subject.ilike(pattern),
            )
        )
    if event_type:
        query = query.where(EmailDelivery.event_type == event_type)
    if status:
        query = query.where(EmailDelivery.status == status)
    if sent_from:
        try:
            query = query.where(EmailDelivery.created_at >= datetime.fromisoformat(sent_from))
        except ValueError:
            pass
    if sent_to:
        try:
            query = query.where(EmailDelivery.created_at <= datetime.fromisoformat(sent_to))
        except ValueError:
            pass

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    deliveries = session.exec(
        query.order_by(EmailDelivery.created_at.desc()).limit(limit).offset(offset)
    ).all()

    return EmailDeliveryListResponse(
        deliveries=[_delivery_to_summary(d) for d in deliveries],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/email-deliveries/{delivery_id}", response_model=EmailDeliveryDetailResponse)
def get_email_delivery(
    delivery_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get email delivery details. HTML body is intentionally excluded (sanitize before display)."""
    delivery = session.get(EmailDelivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Email delivery not found")
    return _delivery_to_detail(delivery)


@router.post("/email-deliveries/{delivery_id}/resend", response_model=ResendEmailResponse)
def resend_email_delivery(
    delivery_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """
    Resend a failed or bounced email by creating a new delivery record.
    The original record is preserved. A new delivery is queued.
    """
    original = session.get(EmailDelivery, delivery_id)
    if not original:
        raise HTTPException(status_code=404, detail="Email delivery not found")

    resendable_statuses = {EmailDeliveryStatus.FAILED.value, EmailDeliveryStatus.BOUNCED.value}
    if original.status not in resendable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Only failed or bounced deliveries can be resent. Current status: {original.status}",
        )

    # Create new delivery (preserves original history)
    new_delivery = queue_notification_email(
        session=session,
        user_id=original.user_id,
        event_type=original.event_type,
        recipient_email=original.recipient_email,
        subject=original.subject,
        html_body=original.html_body or "",
        notification_id=original.notification_id,
    )

    if not new_delivery:
        raise HTTPException(status_code=500, detail="Failed to create new delivery record")

    log_change(
        logger,
        action="email_resent_by_admin",
        entity_type="email_delivery",
        entity_id=str(delivery_id),
        changes={
            "original_id": delivery_id,
            "new_delivery_id": new_delivery.id,
            "recipient": original.recipient_email,
        },
        user_id=current_user.get("user_id"),
    )

    return ResendEmailResponse(
        ok=True,
        new_delivery_id=new_delivery.id,
        message=f"Email queued for resend (new delivery ID: {new_delivery.id})",
    )


def _delivery_to_summary(d: EmailDelivery) -> EmailDeliverySummary:
    return EmailDeliverySummary(
        id=d.id,
        recipient_email=d.recipient_email,
        event_type=d.event_type,
        subject=d.subject,
        status=d.status,
        attempts=d.attempts,
        max_attempts=d.max_attempts,
        last_error=d.last_error,
        created_at=d.created_at,
        sent_at=d.sent_at,
        failed_at=d.failed_at,
    )


def _delivery_to_detail(d: EmailDelivery) -> EmailDeliveryDetailResponse:
    return EmailDeliveryDetailResponse(
        id=d.id,
        recipient_email=d.recipient_email,
        event_type=d.event_type,
        subject=d.subject,
        status=d.status,
        attempts=d.attempts,
        max_attempts=d.max_attempts,
        last_error=d.last_error,
        created_at=d.created_at,
        sent_at=d.sent_at,
        failed_at=d.failed_at,
    )
