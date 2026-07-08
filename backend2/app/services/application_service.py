"""
Application Service — TalentGraph V2
======================================
Business logic for the full application lifecycle:
  - Candidate submission
  - Status transitions (with rule enforcement)
  - Combined status + notes review updates
  - Candidate notification dispatch

Extracted from app/routers/applications.py so the router becomes a thin HTTP
adapter.  All HTTPException raises are preserved so error semantics are
identical to the original router code.
"""

import os
import logging
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import (
    Application, Candidate, Company, JobPosting, JobProfile,
    User, JobPostingStatus,
)
from app.services.audit import log_activity_event, snap_application
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

# ─── Status constants ─────────────────────────────────────────────────────────

VALID_STATUSES = [
    "applied", "scheduled", "under_review", "shortlisted", "selected", "rejected"
]

# Maps current_status → allowed next statuses
STATUS_TRANSITIONS: dict[str, list[str]] = {
    "applied":      ["scheduled", "under_review", "shortlisted", "rejected"],
    "scheduled":    ["under_review", "shortlisted", "selected", "rejected"],
    "under_review": ["scheduled", "shortlisted", "selected", "rejected"],
    "shortlisted":  ["scheduled", "selected", "rejected"],
    "selected":     [],   # Terminal
    "rejected":     [],   # Terminal
}

_STATUS_LABELS: dict[str, str] = {
    "scheduled":    "Your interview has been scheduled",
    "under_review": "Your application is being reviewed",
    "shortlisted":  "Great news! You've been shortlisted",
    "rejected":     "Unfortunately your application was not selected",
    "selected":     "Congratulations! You've been selected for the position!",
}


def validate_status_transition(current_status: str, new_status: str) -> Tuple[bool, str]:
    """Return (is_valid, error_message) for a proposed status transition."""
    if new_status not in VALID_STATUSES:
        return False, (
            f"Invalid status '{new_status}'. "
            f"Must be one of: {', '.join(VALID_STATUSES)}"
        )
    if current_status == new_status:
        return True, ""   # No-op is always allowed (notes-only updates)
    allowed = STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        return False, (
            f"Cannot transition from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: "
            f"{', '.join(allowed) if allowed else 'none (terminal state)'}"
        )
    return True, ""


# ─── Service ──────────────────────────────────────────────────────────────────

class ApplicationService:
    """Encapsulates all Application business rules and side-effects."""

    # ── Candidate submission ──────────────────────────────────────────────────

    @staticmethod
    def apply(
        session: Session,
        user: User,
        candidate: Candidate,
        job_posting: JobPosting,
        job_profile: JobProfile,
        request_id: Optional[str] = None,
    ) -> dict:
        """
        Submit a new application.

        Validates uniqueness and job acceptability, creates the Application
        record, emits an audit event, and dispatches notifications to both the
        candidate and the recruiting company.

        Raises HTTPException on all validation failures — identical semantics
        to the original router implementation.
        """
        # Prevent applications to frozen jobs
        if job_posting.status == JobPostingStatus.FROZEN:
            raise HTTPException(
                status_code=400,
                detail="This job is not currently accepting applications.",
            )

        # One application per candidate per posting
        existing = session.exec(
            select(Application)
            .where(Application.candidate_id == candidate.id)
            .where(Application.job_posting_id == job_posting.id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already applied to this job")

        application = Application(
            candidate_id=candidate.id,
            job_posting_id=job_posting.id,
            job_profile_id=job_profile.id,
            status="applied",
            applied_at=datetime.utcnow(),
        )
        session.add(application)
        session.flush()   # Obtain application.id for audit log (same transaction)

        log_activity_event(
            session,
            entity_type="application",
            entity_id=application.id,
            action="created",
            performed_by_user=user,
            before_value=None,
            after_value=snap_application(application),
            request_id=request_id,
            dedupe_key=f"application:created:{candidate.id}:{job_posting.id}",
        )
        session.commit()
        session.refresh(application)

        # Notify candidate
        try:
            company_obj = session.get(Company, job_posting.company_id)
            NotificationService.send_notification(
                session=session,
                user_id=user.id,
                event_type="application_submitted",
                title="✅ Application Submitted Successfully",
                message=f"Your application for {job_posting.job_title} has been submitted",
                email_data={
                    "candidate_name": candidate.name,
                    "job_title": job_posting.job_title,
                    "company_name": company_obj.company_name if company_obj else "the company",
                    "action_url": (
                        f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                        "/candidate/applications"
                    ),
                },
                notification_type="general",
                commit=False,
                validate_taxonomy=True,
            )
        except Exception as e:
            logger.error(f"[APPLICATION] Failed to send candidate notification: {e}")

        # Notify recruiter
        company_obj = session.get(Company, job_posting.company_id)
        if company_obj:
            recruiter_user = session.exec(
                select(User).where(User.id == company_obj.user_id)
            ).first()
            if recruiter_user:
                try:
                    NotificationService.send_notification(
                        session=session,
                        user_id=recruiter_user.id,
                        event_type="application_received",
                        title="📎 New Application Received!",
                        message=f"{candidate.name} applied for {job_posting.job_title}",
                        email_data={
                            "recruiter_name": company_obj.company_name,
                            "candidate_name": candidate.name,
                            "job_title": job_posting.job_title,
                            "action_url": (
                                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                                f"/recruiter-dashboard?tab=applications"
                                f"&applicationId={application.id}"
                            ),
                        },
                        notification_type="general",
                        commit=False,
                        validate_taxonomy=True,
                    )
                except Exception as e:
                    logger.error(
                        f"[APPLICATION] Failed to send recruiter notification: {e}"
                    )

        session.commit()
        return {
            "message": "Application submitted successfully",
            "application_id": application.id,
            "job_title": job_posting.job_title,
        }

    # ── Status transition ─────────────────────────────────────────────────────

    @staticmethod
    def update_status(
        session: Session,
        application: Application,
        job_posting: JobPosting,
        new_status: str,
        actor: User,
        request_id: Optional[str] = None,
    ) -> dict:
        """
        Validate and apply a status transition, audit-log it, and notify the
        candidate.  Authorization (company ownership) must be verified by the
        caller before invoking this method.
        """
        is_valid, error_msg = validate_status_transition(application.status, new_status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        before_snap = snap_application(application)
        application.status = new_status
        application.last_status_updated_at = datetime.utcnow()
        application.last_status_updated_by_user_id = actor.id
        session.add(application)
        session.flush()

        log_activity_event(
            session,
            entity_type="application",
            entity_id=application.id,
            action="status_changed",
            performed_by_user=actor,
            before_value=before_snap,
            after_value=snap_application(application),
            request_id=request_id,
        )
        session.commit()

        # Notify candidate
        candidate_obj = session.get(Candidate, application.candidate_id)
        if candidate_obj:
            cand_user = session.exec(
                select(User).where(User.id == candidate_obj.user_id)
            ).first()
            if cand_user:
                ApplicationService._notify_status_change(
                    session, application, job_posting, new_status, cand_user
                )

        return {
            "message": f"Application status updated to {new_status}",
            "application_id": application.id,
            "new_status": new_status,
        }

    # ── Review update (status + notes, compound) ──────────────────────────────

    @staticmethod
    def update_review(
        session: Session,
        application: Application,
        job_posting: JobPosting,
        actor: User,
        new_status: Optional[str] = None,
        recruiter_notes: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> dict:
        """
        Compound update: change status and/or recruiter notes in one call.

        Either `new_status` or `recruiter_notes` (or both) must be provided.
        Status changes follow the same transition rules as update_status().
        Notes changes do NOT trigger candidate notifications.
        """
        if new_status is None and recruiter_notes is None:
            raise HTTPException(
                status_code=400,
                detail="Must provide status or recruiter_notes to update",
            )

        before_snap = snap_application(application)
        status_changed = False
        notes_changed = False

        if new_status is not None:
            is_valid, error_msg = validate_status_transition(
                application.status, new_status
            )
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            if new_status != application.status:
                application.status = new_status
                application.last_status_updated_at = datetime.utcnow()
                application.last_status_updated_by_user_id = actor.id
                status_changed = True

        if recruiter_notes is not None:
            trimmed = recruiter_notes.strip() if recruiter_notes else None
            if trimmed != application.recruiter_notes:
                application.recruiter_notes = trimmed
                application.notes_updated_at = datetime.utcnow()
                notes_changed = True

        session.add(application)
        session.flush()

        action = "review_updated"
        if status_changed and notes_changed:
            action = "status_and_notes_updated"
        elif status_changed:
            action = "status_changed"
        elif notes_changed:
            action = "notes_updated"

        log_activity_event(
            session,
            entity_type="application",
            entity_id=application.id,
            action=action,
            performed_by_user=actor,
            before_value=before_snap,
            after_value=snap_application(application),
            request_id=request_id,
        )
        session.commit()

        # Notify candidate only if status changed
        if status_changed:
            candidate_obj = session.get(Candidate, application.candidate_id)
            if candidate_obj:
                cand_user = session.exec(
                    select(User).where(User.id == candidate_obj.user_id)
                ).first()
                if cand_user:
                    ApplicationService._notify_status_change(
                        session, application, job_posting, new_status, cand_user
                    )

        messages = []
        if status_changed:
            messages.append(f"Status updated to '{application.status}'")
        if notes_changed:
            messages.append("Notes updated")

        return {
            "success": True,
            "message": " and ".join(messages) if messages else "No changes",
            "application_id": application.id,
            "status": application.status,
            "recruiter_notes": application.recruiter_notes,
            "notes_updated_at": (
                application.notes_updated_at.isoformat()
                if application.notes_updated_at else None
            ),
            "last_updated": (
                application.last_status_updated_at.isoformat()
                if application.last_status_updated_at else None
            ),
        }

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _notify_status_change(
        session: Session,
        application: Application,
        job_posting: JobPosting,
        new_status: str,
        cand_user: User,
    ) -> None:
        """Queue in-app + email notification to the candidate on status change."""
        msg = _STATUS_LABELS.get(
            new_status, f"Your application status changed to {new_status}"
        )
        try:
            company_obj = session.get(Company, job_posting.company_id)
            company_name = company_obj.company_name if company_obj else "The Company"
            if new_status == "selected":
                event_type_key = "application_selected"
            elif new_status == "rejected":
                event_type_key = "application_rejected"
            else:
                event_type_key = "application_status"
            NotificationService.send_notification(
                session=session,
                user_id=cand_user.id,
                event_type=event_type_key,
                title=f"Application Update — {job_posting.job_title}",
                message=msg,
                email_data={
                    "candidate_name": cand_user.full_name,
                    "job_title": job_posting.job_title,
                    "company_name": company_name,
                    "status": new_status,
                    "message": msg,
                    "action_url": (
                        f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                        "/candidate/applications"
                    ),
                },
                notification_type="general",
                commit=True,
                validate_taxonomy=True,
            )
            logger.info(
                f"[APP STATUS] Notification+email queued for {cand_user.email}"
                f" — status: {new_status}"
            )
        except Exception as notify_err:
            logger.warning(
                f"[APP STATUS] Notification failed for {cand_user.email}: {notify_err}"
            )
