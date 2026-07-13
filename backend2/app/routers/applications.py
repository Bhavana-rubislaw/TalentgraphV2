"""
Applications routes
Candidate job applications and recruiter application management
"""

import logging
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_session
from app.models import Application
from app.schemas import ApplicationRead
from app.security import get_current_user
from app.services.interview_scheduling_service import InterviewSchedulingService
from app.services.application_router_workflow_service import ApplicationRouterWorkflowService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


class ApplicationApplyRequest(BaseModel):
    job_posting_id: int
    job_profile_id: int


class ApplicationStatusRequest(BaseModel):
    status: str


class ApplicationReviewUpdateRequest(BaseModel):
    """Request schema for updating application status and/or recruiter notes"""
    status: Optional[str] = None
    recruiter_notes: Optional[str] = None


@router.post("/apply", response_model=dict)
def apply_to_job(
    data: ApplicationApplyRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate applies to a job posting"""
    logger.info(
        f"[APPLICATION] job_posting_id={data.job_posting_id}, "
        f"job_profile_id={data.job_profile_id}"
    )

    return ApplicationRouterWorkflowService.apply_to_job(
        data=data,
        request=request,
        current_user=current_user,
        session=session,
    )


@router.get("/my-applications", response_model=List[ApplicationRead])
def get_my_applications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all applications for current candidate"""
    user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
    candidate = UserContextService.get_candidate_for_user_or_404(session, user.id)
    
    applications = session.exec(
        select(Application).where(Application.candidate_id == candidate.id)
    ).all()
    
    return applications


@router.put("/{application_id}/status", response_model=dict)
def update_application_status(
    application_id: int,
    data: ApplicationStatusRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update application status (Recruiter or HR)"""
    return ApplicationRouterWorkflowService.update_application_status(
        application_id=application_id,
        data=data,
        request=request,
        current_user=current_user,
        session=session,
    )


@router.put("/{application_id}/review", response_model=dict)
def update_application_review(
    application_id: int,
    data: ApplicationReviewUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update application status and/or recruiter notes (Recruiter or HR).

    Delegates all business logic and notification dispatch to
    ApplicationService.update_review().
    """
    return ApplicationRouterWorkflowService.update_application_review(
        application_id=application_id,
        data=data,
        request=request,
        current_user=current_user,
        session=session,
    )


@router.delete("/{application_id}", response_model=dict)
def withdraw_application(
    application_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate withdraws their application"""
    return ApplicationRouterWorkflowService.withdraw_application(
        application_id=application_id,
        request=request,
        current_user=current_user,
        session=session,
    )


class InterviewScheduleRequest(BaseModel):
    """Request payload for scheduling an interview"""
    date: str  # e.g., "March 27, 2026" or "2026-03-27"
    time: Optional[str] = None  # e.g., "10:00 AM" or "14:30" (deprecated, use start_time/end_time)
    start_time: Optional[str] = None  # e.g., "10:00 AM" or "14:30" - Time frame start
    end_time: Optional[str] = None  # e.g., "11:00 AM" or "15:30" - Time frame end
    timezone: str  # e.g., "EST", "America/New_York"
    meeting_provider: Optional[str] = None  # "zoom", "google_meet", or "microsoft_teams" - triggers auto-generation
    meeting_link: Optional[str] = None  # Optional - provide manual link OR leave empty to auto-generate
    notes_for_candidate: Optional[str] = None
    email_subject: Optional[str] = None


@router.post("/{application_id}/schedule-interview", response_model=dict)
def schedule_interview(
    application_id: int,
    data: InterviewScheduleRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    return InterviewSchedulingService.schedule_interview(
        application_id=application_id,
        payload=payload,
        current_user=current_user,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )
