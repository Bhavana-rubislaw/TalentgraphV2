"""
Admin — Job posting bulk actions (freeze/cancel), job-preference bulk
actions (delete/restore), and job posting CSV export.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func

from ..database import get_session
from ..models import Application, Company, JobPosting, JobPostingStatus, JobProfile, Organization
from ..core.logging_config import get_logger, log_change
from .admin_shared import require_admin, BulkResult, MAX_BULK_IDS, MAX_EXPORT_ROWS, _stream_csv

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])


class BulkJobActionRequest(BaseModel):
    job_ids: List[int]
    action: str  # freeze | cancel


class BulkJobActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]

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

