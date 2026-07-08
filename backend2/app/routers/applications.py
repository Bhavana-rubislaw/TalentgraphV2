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
from app.models import Application, Candidate, Company, JobPosting, JobProfile, User, JobPostingStatus, VideoProviderAccount, VideoProvider, Meeting, MeetingParticipant, MeetingStatus
from app.schemas import ApplicationRead
from app.security import get_current_user
from app.routers.notifications import push_notification  # Legacy support for other endpoints
from app.services.notification_service import NotificationService
from app.services.audit import log_activity_event, snap_application
from app.emailer import send_interview_schedule_email, EmailConfigError
from app.services.video_providers import VideoProviderFactory, VideoProviderError
from app.services.meeting_email_service import MeetingEmailService
from app.services.notification_email_service import NotificationEmailTemplates
from app.services.application_service import (
    ApplicationService,
    validate_status_transition,
    VALID_STATUSES,
    STATUS_TRANSITIONS,
)

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


# Status constants and validate_status_transition are now canonical in
# app/services/application_service — imported above for backward compatibility.


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

    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    candidate = session.exec(
        select(Candidate).where(Candidate.user_id == user.id)
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

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
        request_id=getattr(request.state, "request_id", None),
    )


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
    """Update application status (Recruiter or HR)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ("recruiter", "hr"):
        raise HTTPException(status_code=403, detail="Recruiters and HR only")

    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company profile found")

    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    # Verify job belongs to this company namespace
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    if job_posting.company_id not in company_ids:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return ApplicationService.update_status(
        session=session,
        application=application,
        job_posting=job_posting,
        new_status=data.status,
        actor=user,
        request_id=getattr(request.state, "request_id", None),
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
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ("recruiter", "hr"):
        raise HTTPException(status_code=403, detail="Recruiters and HR only")

    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company profile found")

    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = session.get(JobPosting, application.job_posting_id)
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return ApplicationService.update_review(
        session=session,
        application=application,
        job_posting=job_posting,
        actor=user,
        new_status=data.status,
        recruiter_notes=data.recruiter_notes,
        request_id=getattr(request.state, "request_id", None),
    )


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
    
    # Nullify application_id on any meetings that reference this application.
    # Must flush BEFORE session.delete() so the FK constraint is satisfied
    # (SQLAlchemy's unit-of-work would otherwise try the DELETE first).
    linked_meetings = session.exec(
        select(Meeting).where(Meeting.application_id == application_id)
    ).all()
    for m in linked_meetings:
        m.application_id = None
        session.add(m)
    session.flush()  # push UPDATEs to DB before the DELETE

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
    
    logger.info(f"[INTERVIEW] === ENDPOINT CALLED === Application ID: {application_id}")
    # Support both old 'time' field and new 'start_time/end_time' fields
    time_display = data.time or f"{data.start_time} - {data.end_time}" if data.start_time and data.end_time else "N/A"
    logger.info(f"[INTERVIEW] Received payload: date={data.date}, time={time_display}, timezone={data.timezone}, meeting_provider={data.meeting_provider}, meeting_link={data.meeting_link}")
    logger.info(f"[INTERVIEW] Current user: {current_user.get('email')}")
    
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
    
    # Get candidate email and name
    candidate_email = candidate.user.email if candidate.user else None
    
    # Validate candidate has email
    if not candidate_email or "@" not in candidate_email:
        raise HTTPException(status_code=400, detail="Candidate email not found")
    
    # Prepare candidate name for emails and meeting topics
    candidate_name = getattr(candidate, 'name', None) or candidate_email.split('@')[0]
    
    # Support both old 'time' field and new 'start_time/end_time' fields
    interview_start_time = data.start_time or data.time
    interview_end_time = data.end_time
    
    if not interview_start_time:
        raise HTTPException(status_code=400, detail="Interview start time is required")
    
    # Parse date and time strings to datetime object for API
    # Frontend sends: date="March 27, 2026", start_time="10:00 AM", end_time="11:00 AM"
    # Video APIs expect: datetime object
    interview_dt_obj = None
    interview_end_dt_obj = None
    
    # Format display string for emails
    if interview_end_time:
        interview_datetime_str = f"{data.date} from {interview_start_time} to {interview_end_time}"
    else:
        interview_datetime_str = f"{data.date} at {interview_start_time}"
    
    try:
        from dateutil import parser as date_parser
        # Combine date and start time for parsing
        datetime_str = f"{data.date} {interview_start_time}"
        interview_dt_obj = date_parser.parse(datetime_str)
        logger.info(f"[INTERVIEW] Parsed start datetime: {interview_dt_obj}")
        
        # Parse end time if provided
        if interview_end_time:
            end_datetime_str = f"{data.date} {interview_end_time}"
            interview_end_dt_obj = date_parser.parse(end_datetime_str)
            logger.info(f"[INTERVIEW] Parsed end datetime: {interview_end_dt_obj}")
    except ImportError:
        # Fallback if python-dateutil not installed
        logger.warning("[INTERVIEW] python-dateutil not installed, using basic datetime parsing")
        try:
            # Use datetime.strptime with common format
            from datetime import datetime as dt
            datetime_str = f"{data.date} {interview_start_time}"
            # Try parsing common format: "March 27, 2026 10:00 AM"
            interview_dt_obj = dt.strptime(datetime_str, "%B %d, %Y %I:%M %p")
            logger.info(f"[INTERVIEW] Parsed start datetime with strptime: {interview_dt_obj}")
            
            # Parse end time if provided
            if interview_end_time:
                end_datetime_str = f"{data.date} {interview_end_time}"
                interview_end_dt_obj = dt.strptime(end_datetime_str, "%B %d, %Y %I:%M %p")
                logger.info(f"[INTERVIEW] Parsed end datetime with strptime: {interview_end_dt_obj}")
        except Exception as fallback_error:
            logger.error(f"[INTERVIEW] Failed to parse datetime with fallback: {data.date} {data.time} - {fallback_error}")
            # Continue without parsed datetime - string will be used for display
            pass
    except Exception as e:
        logger.error(f"[INTERVIEW] Error parsing datetime: {e}")
        pass
    
    # Handle meeting link - auto-generate if video provider specified, otherwise use manual link
    meeting_link = None
    video_provider_used = None
    
    if data.meeting_link:
        # Use provided manual meeting link
        meeting_link = data.meeting_link.strip()
        if not (meeting_link.startswith("http://") or meeting_link.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid meeting link - must be a valid URL")
        logger.info(f"[INTERVIEW] Using manual meeting link")
    elif data.meeting_provider:
        # Auto-generate meeting link from specified meeting provider
        logger.info(f"[INTERVIEW] Auto-generating meeting link using {data.meeting_provider}")
        
        # Map provider string to enum and get credentials from .env
        provider_map = {
            "zoom": VideoProvider.ZOOM,
            "google_meet": VideoProvider.GOOGLE_MEET,
            "microsoft_teams": VideoProvider.MICROSOFT_TEAMS
        }
        
        if data.meeting_provider not in provider_map:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid meeting provider: {data.meeting_provider}. Must be 'zoom', 'google_meet', or 'microsoft_teams'"
            )
        
        provider_enum = provider_map[data.meeting_provider]
        
        # Get credentials from .env based on provider
        api_key = None
        api_secret = None
        access_token = None
        account_id = None
        
        if provider_enum == VideoProvider.ZOOM:
            api_key = os.getenv("ZOOM_API_KEY") or os.getenv("ZOOM_CLIENT_ID")
            api_secret = os.getenv("ZOOM_API_SECRET") or os.getenv("ZOOM_CLIENT_SECRET")
            account_id = os.getenv("ZOOM_ACCOUNT_ID")  # Required for OAuth 2.0
        elif provider_enum == VideoProvider.GOOGLE_MEET:
            api_key = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_MEET_CLIENT_ID")
            api_secret = os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_MEET_CLIENT_SECRET")
            access_token = os.getenv("GOOGLE_MEET_ACCESS_TOKEN")
        elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
            api_key = os.getenv("MICROSOFT_CLIENT_ID")
            api_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
        
        # Validate credentials based on provider
        if provider_enum == VideoProvider.ZOOM:
            if not api_key or not api_secret:
                raise HTTPException(
                    status_code=400,
                    detail=f"Zoom requires ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env file. Please configure them or provide a manual meeting link."
                )
            if not account_id:
                raise HTTPException(
                    status_code=400,
                    detail="Zoom OAuth requires ZOOM_ACCOUNT_ID to be configured in .env file. Please add it or provide a manual meeting link."
                )
        elif provider_enum == VideoProvider.GOOGLE_MEET:
            if not access_token:
                raise HTTPException(
                    status_code=400,
                    detail="Google Meet integration requires GOOGLE_MEET_ACCESS_TOKEN in .env file. Note: Google access tokens expire hourly and need refresh tokens. For production use, consider using Zoom (which supports Server-to-Server OAuth) or provide a manual meeting link. See: https://developers.google.com/identity/protocols/oauth2"
                )
        elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
            if not api_key or not api_secret:
                raise HTTPException(
                    status_code=400,
                    detail=f"Microsoft Teams requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env file. Please configure them or provide a manual meeting link."
                )
        
        logger.info(f"[INTERVIEW] Using {data.meeting_provider} credentials from .env")
        
        try:
            # Get video provider instance
            provider = VideoProviderFactory.get_provider(
                provider=provider_enum,
                api_key=api_key,
                api_secret=api_secret,
                access_token=access_token,
                account_id=account_id
            )
            
            # Generate meeting
            # Use parsed datetime object if available, otherwise pass string and let provider handle it
            meeting_start_time = interview_dt_obj if interview_dt_obj else interview_datetime_str
            
            # Calculate duration in minutes from start and end times
            duration_minutes = 60  # Default 1 hour
            if interview_dt_obj and interview_end_dt_obj:
                from datetime import timedelta
                time_diff = interview_end_dt_obj - interview_dt_obj
                duration_minutes = int(time_diff.total_seconds() / 60)
                logger.info(f"[INTERVIEW] Calculated duration: {duration_minutes} minutes")
            
            meeting_details = provider.create_meeting(
                title=f"{job_posting.job_title} Interview - {candidate_name}",
                start_time=meeting_start_time,  # datetime object
                duration_minutes=duration_minutes,  # Calculated from time range
                description=f"Interview for {job_posting.job_title} position at {company.company_name}",
                waiting_room=True,  # Default enabled
                timezone=data.timezone  # Pass as kwarg
            )
            
            logger.info(f"[INTERVIEW] Meeting details returned: {meeting_details}")
            
            # Extract meeting URL - the provider returns "meeting_url" key
            meeting_link = meeting_details.get("meeting_url")
            video_provider_used = provider_enum.value
            
            if not meeting_link:
                logger.error(f"[INTERVIEW] No meeting_url in response! Keys: {list(meeting_details.keys())}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to generate {data.meeting_provider} meeting link. The provider did not return a valid meeting URL. Please use a manual link instead."
                )
            
            logger.info(f"[INTERVIEW] Auto-generated {video_provider_used} meeting link: {meeting_link}")
            
        except VideoProviderError as e:
            logger.error(f"[INTERVIEW] Video provider error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate {data.meeting_provider} meeting link: {str(e)}"
            )
        except Exception as e:
            logger.error(f"[INTERVIEW] Unexpected error generating meeting link: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate {data.meeting_provider} meeting link. Please check your {data.meeting_provider.upper()} API credentials in .env file or provide a manual link."
            )
    else:
        # Neither manual link nor meeting provider specified
        raise HTTPException(
            status_code=400,
            detail="Meeting link is required. Either provide a manual link or select a meeting provider for auto-generation."
        )
    
    # Final validation of meeting link
    if not meeting_link:
        logger.error(f"[INTERVIEW] Meeting link is None after all processing")
        raise HTTPException(
            status_code=502,
            detail="Meeting link generation failed. Please try providing a manual link instead."
        )
    
    # Prepare display names
    recruiter_name = getattr(user, 'full_name', None) or getattr(user, 'name', None) or getattr(company, 'company_name', 'Recruiter')
    recruiter_email = user.email
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
            interview_datetime=interview_datetime_str,
            timezone=data.timezone,
            meeting_link=meeting_link,
            notes=data.notes_for_candidate,
            custom_subject=data.email_subject
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
                message=f"Your interview with {company_name} has been scheduled for {interview_datetime_str} ({data.timezone})",
                event_type="interview_scheduled",
                route="/candidate-dashboard",
                route_context={
                    "tab": "applications",
                    "applicationId": application.id,
                    "meeting_link": meeting_link,
                    "interview_datetime": interview_datetime_str,
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
                "interview_datetime": interview_datetime_str,
                "timezone": data.timezone,
                "meeting_link": meeting_link,
                "candidate_email": candidate_email,
                "recruiter_name": recruiter_name,
                "notes": data.notes_for_candidate
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
            
            # ============ CREATE MEETING RECORD ============
            # Create Meeting record so it appears in the Meetings page
            try:
                # Parse interview datetime for meeting record
                scheduled_start = None
                scheduled_end = None
                if interview_dt_obj:
                    scheduled_start = interview_dt_obj
                    # Use parsed end time if available, otherwise default 60 minute duration
                    if interview_end_dt_obj:
                        scheduled_end = interview_end_dt_obj
                    else:
                        from datetime import timedelta
                        scheduled_end = interview_dt_obj + timedelta(minutes=60)
                
                # Get candidate user
                candidate_user = session.exec(
                    select(User).where(User.id == candidate.user_id)
                ).first()
                
                # Calculate actual duration from time range
                duration_minutes = 60  # Default
                if interview_dt_obj and interview_end_dt_obj:
                    from datetime import timedelta
                    time_diff = interview_end_dt_obj - interview_dt_obj
                    duration_minutes = int(time_diff.total_seconds() / 60)
                
                # Create meeting record
                meeting = Meeting(
                    title=f"Interview: {candidate_name} - {job_posting.job_title}",
                    description=data.notes_for_candidate or f"Interview with {candidate_name} for {job_posting.job_title}",
                    scheduled_start=scheduled_start or datetime.utcnow(),
                    scheduled_end=scheduled_end or datetime.utcnow(),
                    duration_minutes=duration_minutes,
                    timezone=data.timezone or "UTC",
                    location=meeting_link,
                    video_meeting_url=meeting_link,
                    status=MeetingStatus.SCHEDULED,
                    organizer_user_id=user.id,
                    application_id=application.id,
                    video_provider=video_provider_used
                )
                session.add(meeting)
                session.flush()
                
                logger.info(f"[INTERVIEW] Created Meeting record ID: {meeting.id}")
                
                # Create MeetingParticipant records
                # 1. Recruiter (organizer)
                recruiter_participant = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=user.id,
                    is_required=True,
                    has_confirmed=True  # Organizer is confirmed
                )
                session.add(recruiter_participant)
                
                # 2. Candidate (attendee)
                if candidate_user:
                    candidate_participant = MeetingParticipant(
                        meeting_id=meeting.id,
                        user_id=candidate_user.id,
                        is_required=True,
                        has_confirmed=False  # Candidate needs to confirm
                    )
                    session.add(candidate_participant)
                    logger.info(f"[INTERVIEW] Created MeetingParticipant records for recruiter and candidate")
                
                session.flush()
                
            except Exception as e:
                logger.error(f"[INTERVIEW] Failed to create Meeting record: {e}")
                # Don't fail the whole request if meeting creation fails
                pass
            
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
        "interview_datetime": interview_datetime_str,
        "timezone": data.timezone,
        "meeting_link": meeting_link,
        "video_provider": video_provider_used,  # "zoom", "microsoft_teams", "google_meet", or None if manual
        "auto_generated": video_provider_used is not None,
        "email_sent": email_sent,
        "email_error": email_error,
        "notification_sent": candidate_user is not None
    }
