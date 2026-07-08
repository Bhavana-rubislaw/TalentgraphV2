"""
Job Posting Service — TalentGraph V2
======================================
Business logic for job posting CRUD and the lifecycle state machine
(freeze / reactivate / repost / cancel).

Extracted from app/routers/job_postings.py so the router becomes a thin HTTP
adapter that only handles authentication, authorization, and request parsing.
All HTTPException raises are preserved with identical messages and status codes.
"""

import os
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import (
    JobPosting, JobPostingSkill, Company, User, JobPostingStatus, Application,
)
from app.schemas import JobPostingCreate, JobPostingStatusUpdateResponse
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class JobPostingService:
    """Encapsulates job posting business rules and lifecycle transitions."""

    # ── CRUD ──────────────────────────────────────────────────────────────────

    @staticmethod
    def create(session: Session, job_data: JobPostingCreate, user: User) -> dict:
        """
        Create a new job posting with its associated skills.

        Authorization (recruiter role) must be verified by the caller.
        Raises HTTPException(403) if no company profile exists for the user.
        """
        company = session.exec(
            select(Company).where(Company.user_id == user.id)
        ).first()
        if not company:
            raise HTTPException(
                status_code=403,
                detail="Company profile not found. Are you a recruiter?",
            )

        skills_data = job_data.skills
        posting_dict = job_data.dict(exclude={"skills"})

        job_posting = JobPosting(company_id=company.id, **posting_dict)
        session.add(job_posting)
        session.commit()
        session.refresh(job_posting)

        for skill in skills_data:
            session.add(
                JobPostingSkill(
                    job_posting_id=job_posting.id,
                    skill_name=skill.skill_name,
                    skill_category=skill.skill_category,
                    rating=skill.rating,
                )
            )
        if skills_data:
            session.commit()

        return {
            "message": "Job posting created successfully",
            "job_id": job_posting.id,
            "job_title": job_posting.job_title,
            "product_vendor": job_posting.product_vendor,
        }

    @staticmethod
    def update(
        session: Session, job_id: int, job_data: JobPostingCreate, user: User
    ) -> dict:
        """
        Update a job posting's fields and replace its full skills set.

        Authorization (recruiter role + same company_name) must be verified by
        the caller.
        """
        company = session.exec(
            select(Company).where(Company.user_id == user.id)
        ).first()
        if not company:
            raise HTTPException(status_code=403, detail="Unauthorized")

        job_posting = session.get(JobPosting, job_id)
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")

        posting_company = session.get(Company, job_posting.company_id)
        if posting_company.company_name != company.company_name:
            raise HTTPException(
                status_code=403, detail="Unauthorized - different company"
            )

        skills_data = job_data.skills
        posting_dict = job_data.dict(exclude={"skills"})
        for key, value in posting_dict.items():
            setattr(job_posting, key, value)
        job_posting.updated_at = datetime.utcnow()
        session.add(job_posting)
        session.commit()

        # Replace skills: delete existing, add new
        for skill in session.exec(
            select(JobPostingSkill).where(JobPostingSkill.job_posting_id == job_id)
        ).all():
            session.delete(skill)
        session.commit()

        for skill in skills_data:
            session.add(
                JobPostingSkill(
                    job_posting_id=job_id,
                    skill_name=skill.skill_name,
                    skill_category=skill.skill_category,
                    rating=skill.rating,
                )
            )
        if skills_data:
            session.commit()

        return {"message": "Job posting updated", "job_id": job_posting.id}

    # ── Lifecycle state machine ────────────────────────────────────────────────

    @staticmethod
    def update_lifecycle_status(
        session: Session,
        job_posting: JobPosting,
        action: str,
        user: User,
        cancellation_reason: Optional[str] = None,
    ) -> JobPostingStatusUpdateResponse:
        """
        Execute a lifecycle transition: freeze | reactivate | repost | cancel.

        Company ownership must be verified by the caller before invoking this
        method.  All business rule violations raise HTTPException with the same
        messages as the original router implementation.
        """
        current_status = job_posting.status
        now = datetime.utcnow()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")

        # ── freeze ──────────────────────────────────────────────────────────
        if action == "freeze":
            if current_status == JobPostingStatus.CANCELLED:
                raise HTTPException(
                    400,
                    "Cannot freeze a cancelled job. Cancelled jobs are permanently closed.",
                )
            if current_status not in [JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED]:
                raise HTTPException(
                    400,
                    f"Cannot freeze job from '{current_status}' status. "
                    "Only active or reposted jobs can be frozen.",
                )
            job_posting.status = JobPostingStatus.FROZEN
            job_posting.frozen_at = now
            job_posting.is_active = False
            message = "Job posting frozen successfully"
            try:
                NotificationService.send_notification(
                    session=session,
                    user_id=user.id,
                    event_type="job_posting_frozen",
                    title="Job Posting Frozen",
                    message=(
                        f"'{job_posting.job_title}' has been frozen and is no longer "
                        "accepting applications."
                    ),
                    payload={
                        "route": "/recruiter/job-postings",
                        "route_context": {
                            "job_id": job_posting.id,
                            "job_title": job_posting.job_title,
                        },
                    },
                    email_data={
                        "recruiter_name": user.full_name or user.email,
                        "job_title": job_posting.job_title,
                        "details": (
                            "The job posting is no longer visible to candidates. "
                            "You can reactivate it at any time from your Job Postings dashboard."
                        ),
                        "action_url": f"{frontend_url}/recruiter/job-postings",
                    },
                    notification_type="general",
                    validate_taxonomy=True,
                )
            except Exception as _e:
                logger.warning(
                    f"[JOB FREEZE] Notification failed for job {job_posting.id}: {_e}"
                )

        # ── reactivate ───────────────────────────────────────────────────────
        elif action == "reactivate":
            if current_status == JobPostingStatus.CANCELLED:
                raise HTTPException(
                    400,
                    "Cannot reactivate a cancelled job. Cancelled jobs are permanently closed.",
                )
            if current_status != JobPostingStatus.FROZEN:
                raise HTTPException(
                    400,
                    f"Cannot reactivate job from '{current_status}' status. "
                    "Only frozen jobs can be reactivated.",
                )
            job_posting.status = JobPostingStatus.REPOSTED
            job_posting.last_reactivated_at = now
            job_posting.reposted_at = now
            job_posting.is_active = True
            message = "Job posting reactivated successfully"

            previous_applicants = session.exec(
                select(Application).where(
                    Application.job_posting_id == job_posting.id
                )
            ).all()
            applicant_msg = (
                f" with {len(previous_applicants)} prior applicant(s)"
                if previous_applicants else ""
            )
            try:
                NotificationService.send_notification(
                    session=session,
                    user_id=user.id,
                    event_type="job_posting_reactivated",
                    title="Job Posting Reactivated",
                    message=(
                        f"'{job_posting.job_title}' has been reactivated and is now "
                        f"accepting applications{applicant_msg}."
                    ),
                    payload={
                        "route": "/recruiter/job-postings",
                        "route_context": {
                            "job_id": job_posting.id,
                            "job_title": job_posting.job_title,
                            "applicant_count": len(previous_applicants),
                        },
                    },
                    email_data={
                        "recruiter_name": user.full_name or user.email,
                        "job_title": job_posting.job_title,
                        "details": (
                            f"The job posting is now live and accepting applications"
                            f"{applicant_msg}."
                        ),
                        "action_url": f"{frontend_url}/recruiter/job-postings",
                    },
                    notification_type="general",
                    validate_taxonomy=True,
                )
            except Exception as _e:
                logger.warning(
                    f"[JOB REACTIVATE] Notification failed for job {job_posting.id}: {_e}"
                )
            try:
                from app.services.lifecycle_service import LifecycleService
                LifecycleService().notify_reopened_jobs(session, job_posting.id)
                logger.info(
                    f"[JOB REOPEN] Sent applicant notifications for job {job_posting.id}"
                )
            except Exception as _e:
                logger.error(
                    f"[JOB REOPEN] Failed to send applicant notifications "
                    f"for job {job_posting.id}: {_e}"
                )

        # ── repost ───────────────────────────────────────────────────────────
        elif action == "repost":
            if current_status == JobPostingStatus.CANCELLED:
                raise HTTPException(
                    400,
                    "Cannot repost a cancelled job. Cancelled jobs are permanently closed.",
                )
            if current_status not in [JobPostingStatus.FROZEN, JobPostingStatus.ACTIVE]:
                raise HTTPException(
                    400,
                    f"Cannot repost job from '{current_status}' status.",
                )
            job_posting.status = JobPostingStatus.REPOSTED
            job_posting.reposted_at = now
            job_posting.is_active = True
            message = "Job posting reposted successfully"
            try:
                NotificationService.send_notification(
                    session=session,
                    user_id=user.id,
                    event_type="job_posting_reposted",
                    title="Job Posting Reposted",
                    message=(
                        f"'{job_posting.job_title}' has been reposted and refreshed "
                        "for increased visibility."
                    ),
                    payload={
                        "route": "/recruiter/job-postings",
                        "route_context": {
                            "job_id": job_posting.id,
                            "job_title": job_posting.job_title,
                        },
                    },
                    email_data={
                        "recruiter_name": user.full_name or user.email,
                        "job_title": job_posting.job_title,
                        "details": (
                            "Your job posting has been refreshed and relisted. "
                            "Candidates will now see it prominently in their matches."
                        ),
                        "action_url": f"{frontend_url}/recruiter/job-postings",
                    },
                    notification_type="general",
                    validate_taxonomy=True,
                )
            except Exception as _e:
                logger.warning(
                    f"[JOB REPOST] Notification failed for job {job_posting.id}: {_e}"
                )

        # ── cancel ───────────────────────────────────────────────────────────
        elif action == "cancel":
            if not cancellation_reason or not cancellation_reason.strip():
                raise HTTPException(
                    400,
                    "Cancellation reason is required. Please provide a reason for "
                    "cancelling this job posting.",
                )
            if current_status == JobPostingStatus.CANCELLED:
                raise HTTPException(400, "Job posting is already cancelled.")
            job_posting.status = JobPostingStatus.CANCELLED
            job_posting.cancelled_at = now
            job_posting.cancellation_reason = cancellation_reason.strip()
            job_posting.is_active = False
            message = "Job posting cancelled successfully"
            reason_preview = (
                cancellation_reason[:100] + "..."
                if len(cancellation_reason) > 100
                else cancellation_reason
            )
            try:
                NotificationService.send_notification(
                    session=session,
                    user_id=user.id,
                    event_type="job_posting_cancelled",
                    title="Job Posting Cancelled",
                    message=(
                        f"'{job_posting.job_title}' has been permanently cancelled. "
                        f"Reason: {reason_preview}"
                    ),
                    payload={
                        "route": "/recruiter/job-postings",
                        "route_context": {
                            "job_id": job_posting.id,
                            "job_title": job_posting.job_title,
                            "reason": cancellation_reason,
                        },
                    },
                    email_data={
                        "recruiter_name": user.full_name or user.email,
                        "job_title": job_posting.job_title,
                        "details": (
                            "This job posting has been permanently cancelled and cannot "
                            f"be reactivated.<br/><strong>Reason:</strong> {cancellation_reason}"
                        ),
                        "action_url": f"{frontend_url}/recruiter/job-postings",
                    },
                    notification_type="alert",
                    validate_taxonomy=True,
                )
            except Exception as _e:
                logger.warning(
                    f"[JOB CANCEL] Notification failed for job {job_posting.id}: {_e}"
                )

        else:
            raise HTTPException(
                400,
                f"Invalid action '{action}'. Must be one of: freeze, reactivate, cancel",
            )

        job_posting.updated_at = now
        session.add(job_posting)
        session.commit()
        session.refresh(job_posting)

        return JobPostingStatusUpdateResponse(
            message=message,
            job_id=job_posting.id,
            status=job_posting.status,
            frozen_at=job_posting.frozen_at,
            reposted_at=job_posting.reposted_at,
            last_reactivated_at=job_posting.last_reactivated_at,
            cancelled_at=job_posting.cancelled_at,
            cancellation_reason=job_posting.cancellation_reason,
        )
