"""
Admin — Company/Organization management: list, detail, status toggle,
and bulk activate/deactivate.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func

from ..database import get_session
from ..models import (
    ACTIVE_JOB_STATUSES,
    Application,
    Company,
    JobPosting,
    JobPostingStatus,
    Organization,
    User,
    UserRole,
)
from ..core.logging_config import get_logger, log_change
from .admin_shared import require_admin, BulkResult, MAX_BULK_IDS

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])


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
                JobPosting.status.in_(ACTIVE_JOB_STATUSES),
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

