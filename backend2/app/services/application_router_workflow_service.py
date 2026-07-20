"""Router-facing application workflows to keep transport handlers thin."""

import logging

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Application, JobPosting, JobProfile, Meeting
from app.services.application_service import ApplicationService
from app.services.audit import log_activity_event, snap_application
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class ApplicationRouterWorkflowService:
    @staticmethod
    def apply_to_job(*, data, request, current_user: dict, session: Session):
        request_id = getattr(request.state, "request_id", None)
        logger.info(
            "[APPLICATION_ROUTER_WORKFLOW] apply_to_job user_id=%s request_id=%s",
            current_user.get('user_id'), request_id,
        )
        user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
        candidate = UserContextService.get_candidate_for_user_or_404(
            session,
            user.id,
            detail="Candidate profile not found",
        )

        job_profile = session.get(JobProfile, data.job_profile_id)
        if not job_profile or job_profile.candidate_id != candidate.id:
            raise HTTPException(status_code=404, detail="Job profile not found")

        job_posting = session.get(JobPosting, data.job_posting_id)
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")

        return ApplicationService.apply(
            session=session,
            user=user,
            candidate=candidate,
            job_posting=job_posting,
            job_profile=job_profile,
            request_id=request_id,
        )

    @staticmethod
    def update_application_status(*, application_id: int, data, request, current_user: dict, session: Session):
        request_id = getattr(request.state, "request_id", None)
        logger.info(
            "[APPLICATION_ROUTER_WORKFLOW] update_application_status application_id=%s user_id=%s request_id=%s",
            application_id, current_user.get('user_id'), request_id,
        )
        user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
        if user.role not in ("recruiter", "hr"):
            raise HTTPException(status_code=403, detail="Recruiters and HR only")

        company = UserContextService.get_company_for_user_or_403(session, user.id)
        application = session.get(Application, application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        job_posting = session.get(JobPosting, application.job_posting_id)
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")

        company_ids = UserContextService.get_company_namespace_ids(session, company.company_name)
        if job_posting.company_id not in company_ids:
            raise HTTPException(status_code=403, detail="Unauthorized")

        return ApplicationService.update_status(
            session=session,
            application=application,
            job_posting=job_posting,
            new_status=data.status,
            actor=user,
            request_id=request_id,
        )

    @staticmethod
    def update_application_review(*, application_id: int, data, request, current_user: dict, session: Session):
        request_id = getattr(request.state, "request_id", None)
        logger.info(
            "[APPLICATION_ROUTER_WORKFLOW] update_application_review application_id=%s user_id=%s request_id=%s",
            application_id, current_user.get('user_id'), request_id,
        )
        user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
        if user.role not in ("recruiter", "hr"):
            raise HTTPException(status_code=403, detail="Recruiters and HR only")

        company = UserContextService.get_company_for_user_or_403(session, user.id)
        application = session.get(Application, application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        job_posting = session.get(JobPosting, application.job_posting_id)
        company_ids = UserContextService.get_company_namespace_ids(session, company.company_name)
        if not job_posting or job_posting.company_id not in company_ids:
            raise HTTPException(status_code=403, detail="Unauthorized")

        return ApplicationService.update_review(
            session=session,
            application=application,
            job_posting=job_posting,
            actor=user,
            new_status=data.status,
            recruiter_notes=data.recruiter_notes,
            request_id=request_id,
        )

    @staticmethod
    def withdraw_application(*, application_id: int, request, current_user: dict, session: Session):
        request_id = getattr(request.state, "request_id", None)
        logger.info(
            "[APPLICATION_ROUTER_WORKFLOW] withdraw_application application_id=%s user_id=%s request_id=%s",
            application_id, current_user.get('user_id'), request_id,
        )
        user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
        candidate = UserContextService.get_candidate_for_user_or_404(session, user.id)

        application = session.get(Application, application_id)
        if not application or application.candidate_id != candidate.id:
            raise HTTPException(status_code=404, detail="Application not found")

        linked_meetings = session.exec(
            select(Meeting).where(Meeting.application_id == application_id)
        ).all()
        for meeting in linked_meetings:
            meeting.application_id = None
            session.add(meeting)
        session.flush()

        before_snap = snap_application(application)
        log_activity_event(
            session,
            entity_type="application",
            entity_id=application.id,
            action="withdrawn",
            performed_by_user=user,
            before_value=before_snap,
            after_value=None,
            request_id=request_id,
        )

        session.delete(application)
        session.commit()
        return {"message": "Application withdrawn successfully"}
