"""
Admin — Applications management: list with filters, detail, timeline,
and CSV export.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func, or_

from ..database import get_session
from ..models import (
    Application,
    ActivityEvent,
    Candidate,
    Company,
    JobPosting,
    Meeting,
    MeetingParticipant,
    Organization,
    User,
)
from ..core.logging_config import get_logger
from .admin_shared import require_admin, MAX_EXPORT_ROWS, _stream_csv

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])


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

