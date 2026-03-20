"""
Applications routes
Candidate job applications and recruiter application management
"""

import os
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_session
from app.models import Application, Candidate, Company, JobPosting, JobProfile, User, JobPostingStatus
from app.schemas import ApplicationRead
from app.security import get_current_user
from app.routers.notifications import push_notification
from app.services.audit import log_activity_event, snap_application
from app.emailer import send_interview_schedule_email, EmailConfigError

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


# Valid application statuses and transitions
VALID_STATUSES = ["applied", "scheduled", "under_review", "shortlisted", "selected", "rejected"]

# Status transition rules - maps current_status -> allowed_next_statuses
STATUS_TRANSITIONS = {
    "applied": ["scheduled", "under_review", "shortlisted", "rejected"],  # Can skip scheduling if needed
    "scheduled": ["under_review", "shortlisted", "selected", "rejected"],
    "under_review": ["shortlisted", "selected", "rejected"],
    "shortlisted": ["selected", "rejected"],
    "selected": [],  # Terminal state
    "rejected": []   # Terminal state
}


def validate_status_transition(current_status: str, new_status: str) -> tuple[bool, str]:
    """
    Validate if a status transition is allowed.
    
    Returns:
        (is_valid, error_message)
    """
    if new_status not in VALID_STATUSES:
        return False, f"Invalid status '{new_status}'. Must be one of: {', '.join(VALID_STATUSES)}"
    
    if current_status == new_status:
        return True, ""  # Allow staying in same status (for notes-only updates)
    
    allowed_transitions = STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_transitions:
        return False, f"Cannot transition from '{current_status}' to '{new_status}'. Allowed transitions: {', '.join(allowed_transitions) if allowed_transitions else 'none (terminal state)'}"
    
    return True, ""


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
    
    # Prevent applications to frozen jobs
    if job_posting.status == JobPostingStatus.FROZEN:
        raise HTTPException(
            status_code=400,
            detail="This job is not currently accepting applications."
        )
    
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
    
    # Validate status transition
    is_valid, error_msg = validate_status_transition(application.status, status)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    before_snap = snap_application(application)
    old_status = application.status
    application.status = status
    application.last_status_updated_at = datetime.utcnow()
    application.last_status_updated_by_user_id = user.id
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
                "scheduled": "Your interview has been scheduled",
                "under_review": "Your application is being reviewed",
                "shortlisted": "Great news! You've been shortlisted",
                "rejected": "Unfortunately your application was not selected",
                "selected": "🎉 Congratulations! You've been selected for the position!",
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


@router.put("/{application_id}/review", response_model=dict)
def update_application_review(
    application_id: int,
    data: ApplicationReviewUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update application status and/or recruiter notes (Recruiter only)
    
    Allows recruiters to:
    - Update status (with validation)
    - Add/update private recruiter notes
    - Update both together
    - Save notes only without changing status
    """
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
    
    # Must provide at least one field to update
    if data.status is None and data.recruiter_notes is None:
        raise HTTPException(status_code=400, detail="Must provide status or recruiter_notes to update")
    
    before_snap = snap_application(application)
    old_status = application.status
    status_changed = False
    notes_changed = False
    
    # Update status if provided
    if data.status is not None:
        # Validate status transition
        is_valid, error_msg = validate_status_transition(application.status, data.status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        if data.status != application.status:
            application.status = data.status
            application.last_status_updated_at = datetime.utcnow()
            application.last_status_updated_by_user_id = user.id
            status_changed = True
    
    # Update recruiter notes if provided (allow empty string to clear notes)
    if data.recruiter_notes is not None:
        trimmed_notes = data.recruiter_notes.strip() if data.recruiter_notes else None
        if trimmed_notes != application.recruiter_notes:
            application.recruiter_notes = trimmed_notes
            application.notes_updated_at = datetime.utcnow()
            notes_changed = True
    
    session.add(application)
    session.flush()

    # Audit log
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
        performed_by_user=user,
        before_value=before_snap,
        after_value=snap_application(application),
        request_id=getattr(request.state, "request_id", None),
    )

    session.commit()

    # Send notification to candidate only if status changed
    if status_changed:
        candidate_obj =session.get(Candidate, application.candidate_id)
        if candidate_obj:
            cand_user = session.exec(
                select(User).where(User.id == candidate_obj.user_id)
            ).first()
            if cand_user:
                status_labels = {
                    "scheduled": "Your interview has been scheduled",
                    "under_review": "Your application is being reviewed",
                    "shortlisted": "Great news! You've been shortlisted",
                    "rejected": "Unfortunately your application was not selected",
                    "selected": "🎉 Congratulations! You've been selected for the position!",
                }
                msg = status_labels.get(data.status, f"Your application status changed to {data.status}")
                push_notification(
                    session, cand_user.id,
                    title=f"Application Update — {job_posting.job_title}",
                    message=msg,
                    event_type="status_update",
                    route="/candidate-dashboard",
                    route_context={"tab": "applied", "applicationId": application.id, "jobPostingId": application.job_posting_id},
                )
    
    # Construct response message
    messages = []
    if status_changed:
        messages.append(f"Status updated to '{application.status}'")
    if notes_changed:
        messages.append("Notes updated")
    
    response_message = " and ".join(messages) if messages else "No changes"
    
    return {
        "success": True,
        "message": response_message,
        "application_id": application.id,
        "status": application.status,
        "recruiter_notes": application.recruiter_notes,
        "notes_updated_at": application.notes_updated_at.isoformat() if application.notes_updated_at else None,
        "last_updated": application.last_status_updated_at.isoformat() if application.last_status_updated_at else None
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


class InterviewScheduleRequest(BaseModel):
    """Request payload for scheduling an interview"""
    candidate_email: str
    interview_datetime: str  # e.g., "March 20, 2026 at 10:30 AM"
    timezone: str  # e.g., "EST", "America/New_York"
    meeting_link: str
    notes: Optional[str] = None
    subject: Optional[str] = None


@router.post("/{application_id}/schedule-interview", response_model=dict)
def schedule_interview(
    application_id: int,
    data: InterviewScheduleRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Schedule an interview and send confirmation email to candidate and recruiter
    
    This endpoint:
    1. Validates recruiter owns the application's job posting
    2. Sends professional interview confirmation email to candidate (To:) and recruiter (CC:)
    3. Email sent from TalentGraph dedicated Gmail account with Reply-To pointing to recruiter
    4. Creates in-app notification for candidate
    5. Logs the scheduling event for audit trail
    6. Returns detailed success/failure response
    """
    
    # Get current user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify user is a recruiter/company
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can schedule interviews"
        )
    
    # Get application
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify the job posting belongs to this company
    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting or job_posting.company_id != company.id:
        raise HTTPException(
            status_code=403,
            detail="You can only schedule interviews for your own job postings"
        )
    
    # Get candidate details
    candidate = session.get(Candidate, application.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Validate email
    candidate_email = data.candidate_email.strip()
    if not candidate_email or "@" not in candidate_email:
        raise HTTPException(status_code=400, detail="Invalid candidate email address")
    
    # Validate meeting link
    meeting_link = data.meeting_link.strip()
    if not meeting_link or not (meeting_link.startswith("http://") or meeting_link.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid meeting link - must be a valid URL")
    
    # Prepare display names
    recruiter_name = getattr(user, 'full_name', None) or getattr(user, 'name', None) or getattr(company, 'company_name', 'Recruiter')
    recruiter_email = user.email
    candidate_name = getattr(candidate, 'name', None) or candidate_email.split('@')[0]
    company_name = getattr(company, 'company_name', 'Our Company')
    job_title = getattr(job_posting, 'job_title', 'the position')
    
    # Send interview confirmation email
    email_sent = False
    email_error = None
    
    logger.info(f"[INTERVIEW] Starting interview scheduling for application {application_id}")
    logger.info(f"[INTERVIEW] Candidate: {candidate_name} ({candidate_email})")
    logger.info(f"[INTERVIEW] Recruiter: {recruiter_name} ({recruiter_email})")
    logger.info(f"[INTERVIEW] Job: {job_title} at {company_name}")
    
    try:
        email_sent = send_interview_schedule_email(
            candidate_email=candidate_email,
            candidate_name=candidate_name,
            recruiter_name=recruiter_name,
            recruiter_email=recruiter_email,
            company_name=company_name,
            job_title=job_title,
            interview_datetime=data.interview_datetime,
            timezone=data.timezone,
            meeting_link=meeting_link,
            notes=data.notes,
            custom_subject=data.subject
        )
        
        logger.info(f"[INTERVIEW] Email sent successfully for application {application_id}")
        
    except EmailConfigError as e:
        email_error = "SMTP credentials not configured"
        logger.warning(f"[INTERVIEW] Email not sent for application {application_id}: {email_error}")
        
    except Exception as e:
        email_error = str(e)
        logger.error(f"[INTERVIEW] Failed to send email for application {application_id}: {email_error}")
        logger.error(f"[INTERVIEW] Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"[INTERVIEW] Traceback: {traceback.format_exc()}")
    
    # Create in-app notification for candidate
    candidate_user = session.exec(
        select(User).where(User.id == candidate.user_id)
    ).first()
    
    if candidate_user:
        try:
            push_notification(
                session,
                user_id=candidate_user.id,
                title=f"📅 Interview Scheduled: {job_title}",
                message=f"Your interview with {company_name} has been scheduled for {data.interview_datetime} ({data.timezone})",
                event_type="interview_scheduled",
                route="/candidate-dashboard",
                route_context={
                    "tab": "applications",
                    "applicationId": application.id,
                    "meeting_link": meeting_link,
                    "interview_datetime": data.interview_datetime,
                    "timezone": data.timezone,
                    "entity_type": "application",
                    "entity_id": application.id
                }
            )
            logger.info(f"[INTERVIEW] In-app notification created for user {candidate_user.id}")
        except Exception as e:
            logger.error(f"[INTERVIEW] Failed to create notification: {e}")
    
    # Audit log the interview scheduling
    try:
        log_activity_event(
            session,
            entity_type="application",
            entity_id=application.id,
            action="interview_scheduled",
            performed_by_user=user,
            before_value=None,
            after_value={
                "interview_datetime": data.interview_datetime,
                "timezone": data.timezone,
                "meeting_link": meeting_link,
                "candidate_email": candidate_email,
                "recruiter_name": recruiter_name,
                "notes": data.notes
            },
            request_id=getattr(request.state, "request_id", None),
        )
    except Exception as e:
        logger.error(f"[INTERVIEW] Failed to log audit event: {e}")
    
    # Update application status to "scheduled" after successful interview scheduling
    if email_sent:
        try:
            old_status = application.status
            application.status = "scheduled"
            application.last_status_updated_at = datetime.utcnow()
            application.last_status_updated_by_user_id = user.id
            session.add(application)
            session.flush()
            
            logger.info(f"[INTERVIEW] Updated application {application_id} status from '{old_status}' to 'scheduled'")
            
            # Log status change
            log_activity_event(
                session,
                entity_type="application",
                entity_id=application.id,
                action="status_changed",
                performed_by_user=user,
                before_value={"status": old_status},
                after_value={"status": "scheduled"},
                request_id=getattr(request.state, "request_id", None),
            )
        except Exception as e:
            logger.error(f"[INTERVIEW] Failed to update application status: {e}")
    
    session.commit()
    
    # Construct response message
    if email_sent:
        message = f"Interview scheduled! Emails sent to candidate ({candidate_email}) and recruiter ({recruiter_email}) from TalentGraph Interviews"
        success = True
    elif email_error:
        message = f"Interview scheduled. In-app notification sent, but email failed: {email_error}"
        success = True  # Still consider it success since notification was sent
    else:
        message = "Interview scheduled but notifications may have failed"
        success = True
    
    return {
        "success": success,
        "message": message,
        "application_id": application.id,
        "candidate_email": candidate_email,
        "recruiter_email": recruiter_email,
        "from_email": os.getenv("SMTP_FROM_EMAIL", os.getenv("MAIL_FROM", "talentgraph.interviews@gmail.com")),
        "scheduled_by": recruiter_email,
        "interview_datetime": data.interview_datetime,
        "timezone": data.timezone,
        "meeting_link": meeting_link,
        "email_sent": email_sent,
        "email_error": email_error,
        "notification_sent": candidate_user is not None
    }
