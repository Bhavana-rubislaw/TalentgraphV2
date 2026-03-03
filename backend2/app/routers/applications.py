"""
Applications routes
Candidate job applications and recruiter application management
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import Application, Candidate, Company, JobPosting, JobProfile, User
from app.schemas import ApplicationRead
from app.security import get_current_user
from app.routers.notifications import push_notification
from app.services.audit import log_activity_event, snap_application

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


class ApplicationApplyRequest(BaseModel):
    job_posting_id: int
    job_profile_id: int


class ApplicationStatusRequest(BaseModel):
    status: str


@router.post("/apply", response_model=dict)
def apply_to_job(
    data: ApplicationApplyRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate applies to a job posting"""
    job_posting_id = data.job_posting_id
    job_profile_id = data.job_profile_id
    logger.info(f"[APPLICATION] job_posting_id={job_posting_id}, job_profile_id={job_profile_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Enforce: only one application per candidate per job posting
    existing = session.exec(
        select(Application)
        .where(Application.candidate_id == candidate.id)
        .where(Application.job_posting_id == job_posting_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Create application — backend stamps applied_at
    application = Application(
        candidate_id=candidate.id,
        job_posting_id=job_posting_id,
        job_profile_id=job_profile_id,
        status="applied",
        applied_at=datetime.utcnow(),
    )
    
    session.add(application)
    # Flush to get application.id before audit log
    session.flush()

    # Audit log — same transaction
    log_activity_event(
        session,
        entity_type="application",
        entity_id=application.id,
        action="created",
        performed_by_user=user,
        before_value=None,
        after_value=snap_application(application),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"application:created:{candidate.id}:{job_posting_id}",
    )

    session.commit()
    session.refresh(application)
    
    # Notify recruiter of the new application
    company_obj = session.get(Company, job_posting.company_id)
    if company_obj:
        recruiter_user = session.exec(
            select(User).where(User.id == company_obj.user_id)
        ).first()
        if recruiter_user:
            push_notification(
                session, recruiter_user.id,
                title="📎 New Application Received!",
                message=f"A candidate applied for {job_posting.job_title}",
                event_type="application",
                route="/recruiter-dashboard",
                route_context={"tab": "applications", "applicationId": application.id, "jobPostingId": job_posting_id},
            )
    
    return {
        "message": "Application submitted successfully",
        "application_id": application.id,
        "job_title": job_posting.job_title
    }


@router.get("/my-applications", response_model=List[ApplicationRead])
def get_my_applications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all applications for current candidate"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
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
    """Update application status (Recruiter only)"""
    status = data.status
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify the job posting belongs to this company
    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting or job_posting.company_id != company.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Valid statuses with enforced transitions
    valid_statuses = ["applied", "reviewed", "shortlisted", "rejected", "offered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    before_snap = snap_application(application)
    old_status = application.status
    application.status = status
    session.add(application)
    session.flush()

    # Audit log
    log_activity_event(
        session,
        entity_type="application",
        entity_id=application.id,
        action="status_changed",
        performed_by_user=user,
        before_value=before_snap,
        after_value=snap_application(application),
        request_id=getattr(request.state, "request_id", None),
    )

    session.commit()
    
    # Notify candidate of the status change
    candidate_obj = session.get(Candidate, application.candidate_id)
    if candidate_obj:
        cand_user = session.exec(
            select(User).where(User.id == candidate_obj.user_id)
        ).first()
        if cand_user:
            status_labels = {
                "reviewed": "Your application is being reviewed",
                "shortlisted": "Great news! You've been shortlisted",
                "rejected": "Unfortunately your application was not selected",
                "offered": "🎉 Congratulations! You've received a job offer!",
            }
            msg = status_labels.get(status, f"Your application status changed to {status}")
            push_notification(
                session, cand_user.id,
                title=f"Application Update — {job_posting.job_title}",
                message=msg,
                event_type="status_update",
                route="/candidate-dashboard",
                route_context={"tab": "applied", "applicationId": application.id, "jobPostingId": application.job_posting_id},
            )
    
    return {
        "message": f"Application status updated to {status}",
        "application_id": application.id,
        "new_status": status
    }


@router.delete("/{application_id}", response_model=dict)
def withdraw_application(
    application_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate withdraws their application"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    application = session.get(Application, application_id)
    if not application or application.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    before_snap = snap_application(application)
    log_activity_event(
        session,
        entity_type="application",
        entity_id=application.id,
        action="withdrawn",
        performed_by_user=user,
        before_value=before_snap,
        after_value=None,
        request_id=getattr(request.state, "request_id", None),
    )

    session.delete(application)
    session.commit()
    
    return {"message": "Application withdrawn successfully"}
