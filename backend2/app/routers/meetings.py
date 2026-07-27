"""
Meeting Scheduler API - Phase 1 Implementation
First-class Meeting domain with database persistence, scheduling engine, and availability management
Enhanced with comprehensive cancellation, rescheduling, and tokenized email actions (Option 3)
"""

import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
import logging

from app.database import get_session
from app.security import get_current_user
from app.models import (
    User, Meeting, MeetingParticipant, MeetingAvailabilitySlot,
    MeetingStatus, MeetingType, VideoProvider,
)
from app.schemas import (
    MeetingCreate, MeetingRead, MeetingUpdate, MeetingCancelRequest, MeetingRescheduleRequest,
    MeetingAvailabilitySlotCreate, MeetingAvailabilitySlotRead, SlotSelectionRequest,
    CandidateRescheduleRequest, RecruiterRescheduleResponse,
    MeetingTimelineEventRead
)
from app.routers.notifications import push_notification
from app.services.video_providers import VideoProviderFactory, VideoProviderError
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)
from app.services.meeting_service import MeetingService
from app.services.meeting_email_service import MeetingEmailService
from app.services.meeting_update_service import MeetingUpdateService
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_reschedule_service import MeetingRescheduleService
from app.services.meeting_request_reschedule_service import MeetingRequestRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService
from app.services.meeting_conflict_service import MeetingConflictService
from app.services.meeting_token_action_service import MeetingTokenActionService

router = APIRouter(prefix="/meetings", tags=["meetings"])

# App-level Zoom Server-to-Server OAuth credentials — one company-wide Zoom
# app, not a per-user connection. Never exposed to the frontend; recruiters
# just toggle "auto-generate" and this is what actually creates the meeting.
ZOOM_ACCOUNT_ID = os.getenv("ZOOM_ACCOUNT_ID")
ZOOM_CLIENT_ID = os.getenv("ZOOM_CLIENT_ID")
ZOOM_CLIENT_SECRET = os.getenv("ZOOM_CLIENT_SECRET")


# ============ SCHEDULING ENGINE ============


# ============ MEETING CRUD ENDPOINTS ============

@router.post("/create", response_model=MeetingRead)
async def create_meeting(
    meeting_data: MeetingCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new meeting with participants
    - Accepts participants by user_id (legacy) OR by name and email (new)
    - Checks for scheduling conflicts
    - Creates meeting and participant records
    - Sends notifications to all participants
    """
    request_id = getattr(request.state, "request_id", None)

    # Validate time
    if meeting_data.scheduled_end <= meeting_data.scheduled_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    # Resolve participants to user IDs
    participant_user_ids = []
    
    if meeting_data.participants:
        # New method: Look up users by email, handle missing users
        for participant_spec in meeting_data.participants:
            user = session.exec(
                select(User).where(User.email == participant_spec.email)
            ).first()
            
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail=f"User with email '{participant_spec.email}' not found. Please ensure the user exists in the system."
                )
            
            # Verify name matches (case-insensitive)
            if user.full_name.lower() != participant_spec.name.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Name mismatch for email '{participant_spec.email}': expected '{participant_spec.name}' but found '{user.full_name}'"
                )
            
            participant_user_ids.append(user.id)
    
    elif meeting_data.participant_user_ids:
        # Legacy method: Use provided user IDs
        participant_user_ids = meeting_data.participant_user_ids
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Either participant_user_ids or participants must be provided"
        )
    
    # Check for conflicts for all participants
    all_participant_ids = participant_user_ids + [current_user["user_id"]]
    for user_id in all_participant_ids:
        has_conflict = MeetingConflictService.check_availability_conflict(
            session, user_id, meeting_data.scheduled_start, meeting_data.scheduled_end
        )
        if has_conflict:
            raise HTTPException(
                status_code=409,
                detail=f"User {user_id} has a scheduling conflict at this time"
            )
    
    # Video meeting link: either the recruiter's own manually-pasted link,
    # or a real Zoom meeting auto-generated via the app-level Zoom account
    # (never a per-user API key — see ZOOM_* constants above).
    video_meeting_url = meeting_data.video_meeting_url
    video_provider = meeting_data.video_provider

    if meeting_data.auto_generate_video_link and not video_meeting_url:
        if not (ZOOM_ACCOUNT_ID and ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET):
            raise HTTPException(
                status_code=503,
                detail="Auto-generate is unavailable: Zoom is not configured on this server."
            )
        try:
            provider = VideoProviderFactory.get_provider(
                provider=VideoProvider.ZOOM,
                api_key=ZOOM_CLIENT_ID,
                api_secret=ZOOM_CLIENT_SECRET,
                account_id=ZOOM_ACCOUNT_ID
            )
            meeting_result = provider.create_meeting(
                title=meeting_data.title,
                start_time=meeting_data.scheduled_start,
                duration_minutes=meeting_data.duration_minutes,
                description=meeting_data.description,
                waiting_room=False,
                timezone=meeting_data.timezone
            )
            video_meeting_url = meeting_result["meeting_url"]
            video_provider = VideoProvider.ZOOM.value
        except VideoProviderError as e:
            # Auto-generate was explicitly requested — surface the failure
            # rather than silently creating a meeting with no link.
            raise HTTPException(status_code=502, detail=f"Failed to auto-generate Zoom link: {str(e)}")
    
    # Create meeting
    meeting = Meeting(
        title=meeting_data.title,
        description=meeting_data.description,
        meeting_type=meeting_data.meeting_type,
        scheduled_start=meeting_data.scheduled_start,
        scheduled_end=meeting_data.scheduled_end,
        duration_minutes=meeting_data.duration_minutes,
        timezone=meeting_data.timezone,
        organizer_user_id=current_user["user_id"],
        job_posting_id=meeting_data.job_posting_id,
        match_id=meeting_data.match_id,
        application_id=meeting_data.application_id,
        location=meeting_data.location,
        video_meeting_url=video_meeting_url,
        video_provider=video_provider,
        status=MeetingStatus.SCHEDULED
    )
    
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    session.refresh(meeting)
    
    # Create participant records
    participants = []
    for user_id in all_participant_ids:
        participant = MeetingParticipant(
            meeting_id=meeting.id,
            user_id=user_id,
            is_required=True
        )
        session.add(participant)
        participants.append(participant)
    
    session.commit()
    
    # Get current user for notification
    current_user_obj = UserContextService.get_user_by_id_optional(
        session,
        current_user["user_id"],
    )
    user_full_name = current_user_obj.full_name if current_user_obj else current_user.get("email", "Someone")
    
    # Create timeline event for meeting creation
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type="interview_scheduled",
        message=f"{user_full_name} scheduled the meeting",
        metadata={"initial_creation": True}
    )
    
    # Synchronize application status to 'scheduled'
    if meeting.application_id:
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.SCHEDULED,
            actor_user_id=current_user["user_id"]
        )
    
    # Send notifications to all participants (except organizer)
    logger.info(
        f"[MEETING CREATE] Sending notifications for meeting {meeting.id} to "
        f"{len(participant_user_ids)} participants, request_id={request_id}"
    )
    notifications_sent = 0
    for user_id in participant_user_ids:
        try:
            notif = push_notification(
                session=session,
                user_id=user_id,
                title="New Meeting Scheduled",
                message=f"{user_full_name} scheduled a meeting: {meeting_data.title}",
                event_type="interview_scheduled",
                route=f"/meetings/{meeting.id}"
            )
            notifications_sent += 1
            logger.info(f"✓ Notification sent to user {user_id}, notification ID: {notif.id}")
        except Exception as e:
            logger.error(
                f"✗ Failed to send notification to user {user_id}: {e}, request_id={request_id}",
                exc_info=True,
            )

    # Also send confirmation notification to the organizer
    try:
        notif = push_notification(
            session=session,
            user_id=current_user["user_id"],
            title="Interview Scheduled Successfully",
            message=f"You have successfully scheduled: {meeting_data.title}",
            event_type="interview_scheduled",
            route=f"/meetings/{meeting.id}"
        )
        notifications_sent += 1
        logger.info(f"✓ Organizer notification sent to user {current_user['user_id']}, notification ID: {notif.id}")
    except Exception as e:
        logger.error(
            f"✗ Failed to send organizer notification to user {current_user['user_id']}: {e}, "
            f"request_id={request_id}",
            exc_info=True,
        )

    logger.info(
        f"[MEETING CREATE] Sent {notifications_sent}/{len(all_participant_ids)} notifications "
        f"successfully, request_id={request_id}"
    )
    
    # Send email notifications with action tokens
    email_service = MeetingEmailService(queue_mode=True)
    emails_sent = 0
    email_failures = []
    
    for user_id in participant_user_ids:
        recipient = session.get(User, user_id)
        if recipient:
            try:
                # Generate action tokens for the participant
                confirm_token = MeetingService.generate_action_token(
                    session, meeting.id, user_id, "confirm"
                )
                cancel_token = MeetingService.generate_action_token(
                    session, meeting.id, user_id, "cancel"
                )
                reschedule_token = MeetingService.generate_action_token(
                    session, meeting.id, user_id, "reschedule"
                )
                
                email_service.send_interview_scheduled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    organizer_user=current_user_obj,
                    confirm_token=confirm_token,
                    cancel_token=cancel_token,
                    reschedule_token=reschedule_token
                )
                emails_sent += 1
            except Exception as e:
                logger.error(
                    f"✗ Failed to send email to {recipient.email}: {e}, request_id={request_id}",
                    exc_info=True,
                )
                email_failures.append(recipient.email)

    # Send organizer confirmation email (lists all participants)
    if current_user_obj:
        try:
            participant_user_objs = [session.get(User, uid) for uid in participant_user_ids]
            participant_user_objs = [u for u in participant_user_objs if u]
            email_service.send_organizer_confirmation_email(
                session=session,
                meeting=meeting,
                organizer_user=current_user_obj,
                participant_users=participant_user_objs
            )
            emails_sent += 1
        except Exception as e:
            logger.error(
                f"✗ Failed to send organizer confirmation email to {current_user_obj.email}: {e}, "
                f"request_id={request_id}",
                exc_info=True,
            )
            email_failures.append(current_user_obj.email)

    logger.info(
        f"[MEETING CREATE] Sent {emails_sent}/{len(all_participant_ids)} emails successfully, "
        f"request_id={request_id}"
    )
    if email_failures:
        logger.warning(f"[MEETING CREATE] Email failures for: {', '.join(email_failures)}")
    
    # Refresh meeting with participants and user data
    meeting = session.exec(
        select(Meeting)
        .where(Meeting.id == meeting.id)
        .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
    ).first()
    
    return MeetingRead.from_orm_with_participants(meeting)


@router.get("/list", response_model=List[MeetingRead])
async def list_meetings(
    status: Optional[MeetingStatus] = Query(None, description="Filter by status"),
    upcoming_only: bool = Query(False, description="Show only upcoming meetings"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all meetings for the current user
    - Includes meetings where user is organizer or participant
    """
    
    # Get user ID
    user_id = current_user["user_id"]
    
    # Get meeting IDs where user is a participant
    participant_meeting_ids = session.exec(
        select(MeetingParticipant.meeting_id).where(MeetingParticipant.user_id == user_id)
    ).all()
    
    # Build query for meetings where user is organizer OR participant
    if participant_meeting_ids:
        query = select(Meeting).where(
            or_(
                Meeting.organizer_user_id == user_id,
                Meeting.id.in_(participant_meeting_ids)
            )
        )
    else:
        query = select(Meeting).where(Meeting.organizer_user_id == user_id)
    
    # Apply filters
    if status:
        query = query.where(Meeting.status == status)
    
    if upcoming_only:
        query = query.where(Meeting.scheduled_start >= datetime.utcnow())
    
    # Eagerly load participants and their user data
    query = query.options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
    
    # Order by scheduled_start descending
    query = query.order_by(Meeting.scheduled_start.desc())
    
    # Execute query and get Meeting objects
    meetings = session.exec(query).all()
    
    # Debug: Check serialization (using logger for security)
    logger.debug(f"Found {len(meetings)} meetings for user {user_id}")
    if meetings and logger.level <= logging.DEBUG:
        first_meeting = meetings[0]
        logger.debug(f"First meeting: {first_meeting.id} has {len(first_meeting.participants)} participants")
    
    result = [MeetingRead.from_orm_with_participants(m) for m in meetings]
    
    return result


@router.get("/{meeting_id}", response_model=MeetingRead)
async def get_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get meeting details by ID"""
    
    # Eagerly load participants and their user data
    meeting = session.exec(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
    ).first()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user has access (is participant or organizer)
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not (is_participant or is_organizer):
        raise HTTPException(status_code=403, detail="Access denied")
    
    logger.debug(f"GET /meetings/{meeting_id}: {len(meeting.participants)} participants")
    result = MeetingRead.from_orm_with_participants(meeting)
    return result


@router.patch("/{meeting_id}", response_model=MeetingRead)
async def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update meeting details including participants
    - Only organizer can update
    - Checks for conflicts if time changes
    - Can add/remove participants
    - Notifies all participants of changes
    """
    request_id = getattr(request.state, "request_id", None)
    logger.info(f"PATCH /meetings/{meeting_id} - User: {current_user['email']} (ID: {current_user['user_id']})")

    return MeetingUpdateService.update_meeting(
        meeting_id=meeting_id,
        update_data=update_data,
        current_user=current_user,
        session=session,
        request_id=request_id,
    )


@router.post("/{meeting_id}/cancel", response_model=MeetingRead)
async def cancel_meeting(
    meeting_id: int,
    cancel_data: MeetingCancelRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Cancel a meeting with comprehensive workflow:
    - Organizer or participant can cancel
    - Verifies canceller identity by name and email if provided
    - Creates timeline event
    - Syncs application status
    - Sends notifications and emails
    - Updates calendar events
    """

    return MeetingCancelService.cancel_meeting(
        meeting_id=meeting_id,
        cancel_data=cancel_data,
        current_user=current_user,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/{meeting_id}/reschedule", response_model=MeetingRead)
async def reschedule_meeting(
    meeting_id: int,
    reschedule_data: MeetingRescheduleRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Reschedule a meeting to a new time (recruiter only)
    - Only organizer can directly reschedule
    - Checks for conflicts at new time
    - Creates timeline event
    - Keeps application status as scheduled
    - Sends notifications and emails
    """
    return MeetingRescheduleService.reschedule_meeting(
        meeting_id=meeting_id,
        reschedule_data=reschedule_data,
        current_user=current_user,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


# ============ CANDIDATE RESCHEDULE REQUEST ENDPOINTS ============

@router.post("/{meeting_id}/request-reschedule", response_model=MeetingRead)
async def request_reschedule(
    meeting_id: int,
    request_data: CandidateRescheduleRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Candidate requests reschedule (does not directly change time)
    - Creates reschedule request for recruiter review
    - Updates meeting status to RESCHEDULE_REQUESTED
    - Sends notification and email to recruiter
    - Application remains scheduled
    """

    return MeetingRequestRescheduleService.request_reschedule(
        meeting_id=meeting_id,
        request_data=request_data,
        current_user=current_user,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/{meeting_id}/respond-reschedule", response_model=MeetingRead)
async def respond_to_reschedule_request(
    meeting_id: int,
    response_data: RecruiterRescheduleResponse,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Recruiter responds to candidate reschedule request
    - Approve: reschedule to new time
    - Reject: keep original time, return to SCHEDULED status
    """

    return MeetingRespondRescheduleService.respond_to_reschedule_request(
        meeting_id=meeting_id,
        response_data=response_data,
        current_user=current_user,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


# ============ MEETING TIMELINE ENDPOINTS ============

@router.get("/{meeting_id}/timeline", response_model=List[MeetingTimelineEventRead])
async def get_meeting_timeline(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get full timeline/history for a meeting"""
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check access
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not (is_participant or is_organizer):
        raise HTTPException(status_code=403, detail="Access denied")
    
    timeline = MeetingService.get_meeting_timeline(session, meeting_id)
    return timeline


# ============ TOKENIZED EMAIL ACTION ENDPOINTS ============

@router.get("/token/{token}/confirm")
async def confirm_meeting_via_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Confirm meeting attendance via email token link"""

    return MeetingTokenActionService.confirm_meeting_via_token(
        token=token,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.get("/token/{token}/cancel")
async def cancel_meeting_via_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Cancel meeting via email token link - shows confirmation form"""

    return MeetingTokenActionService.cancel_meeting_form_via_token(
        token=token,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/token/{token}/cancel")
async def cancel_meeting_via_token_confirmed(
    token: str,
    cancel_data: MeetingCancelRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """Actually cancel meeting after confirmation via token"""

    return MeetingTokenActionService.cancel_meeting_via_token_confirmed(
        token=token,
        cancel_data=cancel_data,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.get("/token/{token}/reschedule")
async def request_reschedule_via_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Show reschedule request form via email token"""

    return MeetingTokenActionService.reschedule_form_via_token(
        token=token,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/token/{token}/reschedule")
async def request_reschedule_via_token_submit(
    token: str,
    request_data: CandidateRescheduleRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """Submit reschedule request via email token"""

    return MeetingTokenActionService.reschedule_submit_via_token(
        token=token,
        request_data=request_data,
        session=session,
        request_id=getattr(request.state, "request_id", None),
    )




@router.post("/availability/propose", response_model=List[MeetingAvailabilitySlotRead])
async def propose_availability_slots(
    slots_data: List[MeetingAvailabilitySlotCreate],
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Propose multiple availability slots to another user
    - Typically used by recruiters to offer interview times
    """
    
    created_slots = []
    for slot_data in slots_data:
        slot = MeetingAvailabilitySlot(
            proposed_by_user_id=current_user["user_id"],
            proposed_to_user_id=slot_data.proposed_to_user_id,
            slot_start=slot_data.slot_start,
            slot_end=slot_data.slot_end,
            timezone=slot_data.timezone,
            job_posting_id=slot_data.job_posting_id,
            match_id=slot_data.match_id,
            application_id=slot_data.application_id
        )
        session.add(slot)
        created_slots.append(slot)
    
    session.commit()
    
    # Notify recipient
    if slots_data:
        proposer = UserContextService.get_user_by_id_optional(
            session,
            current_user["user_id"],
        )
        proposer_name = proposer.full_name if proposer else "A recruiter"
        push_notification(
            session=session,
            user_id=slots_data[0].proposed_to_user_id,
            title="Interview Times Available",
            message=f"{proposer_name} proposed {len(slots_data)} interview time slots",
            event_type="availability_proposed",
            route="/meetings/availability",
            notification_type="meeting"
        )
    
    return created_slots


@router.get("/availability/my-slots", response_model=List[MeetingAvailabilitySlotRead])
async def get_my_availability_slots(
    include_selected: bool = Query(False, description="Include already selected slots"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get availability slots proposed to current user"""
    
    query = select(MeetingAvailabilitySlot).where(
        MeetingAvailabilitySlot.proposed_to_user_id == current_user["user_id"]
    )
    
    if not include_selected:
        query = query.where(MeetingAvailabilitySlot.is_selected == False)
    
    query = query.order_by(MeetingAvailabilitySlot.slot_start)
    
    slots = session.exec(query).all()
    return slots


@router.post("/availability/select", response_model=MeetingRead)
async def select_availability_slot(
    selection: SlotSelectionRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Select an availability slot and create a meeting
    - Marks slot as selected
    - Creates meeting automatically
    - Notifies organizer
    """
    
    slot = session.get(MeetingAvailabilitySlot, selection.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot.proposed_to_user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="This slot was not proposed to you")
    
    if slot.is_selected:
        raise HTTPException(status_code=400, detail="Slot already selected")
    
    # Check for conflicts
    has_conflict = MeetingConflictService.check_availability_conflict(
        session, current_user["user_id"], slot.slot_start, slot.slot_end
    )
    if has_conflict:
        raise HTTPException(status_code=409, detail="You have a scheduling conflict at this time")
    
    # Create meeting
    meeting = Meeting(
        title=selection.title,
        description=selection.description,
        meeting_type=MeetingType.INTERVIEW,
        scheduled_start=slot.slot_start,
        scheduled_end=slot.slot_end,
        duration_minutes=int((slot.slot_end - slot.slot_start).total_seconds() / 60),
        timezone=slot.timezone,
        organizer_user_id=slot.proposed_by_user_id,
        job_posting_id=slot.job_posting_id,
        match_id=slot.match_id,
        application_id=slot.application_id,
        status=MeetingStatus.SCHEDULED
    )
    
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    
    # Create participants
    for user_id in [slot.proposed_by_user_id, current_user["user_id"]]:
        participant = MeetingParticipant(
            meeting_id=meeting.id,
            user_id=user_id,
            is_required=True
        )
        session.add(participant)
    
    # Mark slot as selected
    slot.is_selected = True
    slot.selected_at = datetime.utcnow()
    slot.meeting_id = meeting.id
    session.add(slot)
    
    session.commit()
    
    # Notify organizer
    selector = UserContextService.get_user_by_id_optional(
        session,
        current_user["user_id"],
    )
    selector_name = selector.full_name if selector else "A candidate"
    push_notification(
        session=session,
        user_id=slot.proposed_by_user_id,
        title="Interview Time Confirmed",
        message=f"{selector_name} selected an interview time",
        event_type="slot_selected",
        route=f"/meetings/{meeting.id}",
        notification_type="meeting"
    )
    
    session.refresh(meeting)
    return meeting


# ============ UTILITY ENDPOINTS ============

@router.get("/check-availability")
async def check_user_availability(
    user_id: int,
    start_time: datetime,
    end_time: datetime,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Check if a user is available during a time slot"""
    
    has_conflict = MeetingConflictService.check_availability_conflict(
        session,
        user_id,
        start_time,
        end_time,
    )
    
    return {
        "user_id": user_id,
        "start_time": start_time,
        "end_time": end_time,
        "is_available": not has_conflict,
        "has_conflict": has_conflict
    }


@router.get("/find-slots")
async def find_common_availability(
    user_ids: List[int] = Query(..., description="List of user IDs"),
    duration_minutes: int = Query(60, description="Meeting duration"),
    start_range: datetime = Query(..., description="Start of search range"),
    end_range: datetime = Query(..., description="End of search range"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Find available time slots for multiple users"""
    
    slots = MeetingConflictService.find_available_slots(
        session=session,
        user_ids=user_ids,
        duration_minutes=duration_minutes,
        start_range=start_range,
        end_range=end_range
    )
    
    return {
        "user_ids": user_ids,
        "duration_minutes": duration_minutes,
        "search_range": {
            "start": start_range,
            "end": end_range
        },
        "available_slots": slots,
        "total_found": len(slots)
    }


# ============ MEETING OUTCOME ENDPOINTS ============

class MeetingCompleteRequest(BaseModel):
    notes: Optional[str] = None  # Optional recruiter notes about the meeting


class MeetingNoShowRequest(BaseModel):
    notes: Optional[str] = None  # Optional notes about no-show


@router.post("/{meeting_id}/complete", response_model=MeetingRead)
async def mark_meeting_complete(
    meeting_id: int,
    data: MeetingCompleteRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Mark a meeting as COMPLETED (recruiter/HR only).
    Automatically moves the linked application to 'under_review'.
    """
    role = current_user.get("role", "")
    if role not in ["RECRUITER", "HR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only recruiters and HR can mark meetings complete")

    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status == MeetingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Meeting is already marked as completed")

    if meeting.status in [MeetingStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled meeting")

    # Update meeting status
    meeting.status = MeetingStatus.COMPLETED
    meeting.completed_at = datetime.utcnow()
    meeting.completed_by_user_id = current_user["user_id"]
    meeting.completion_notes = data.notes
    meeting.updated_at = datetime.utcnow()
    # Mark that no further post-meeting reminder is needed
    meeting.post_meeting_reminder_sent = True
    meeting.post_meeting_reminder_sent_at = datetime.utcnow()
    meeting.post_meeting_escalation_sent = True
    session.add(meeting)
    session.commit()

    # Sync application status → under_review
    if meeting.application_id:
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.COMPLETED,
            actor_user_id=current_user["user_id"]
        )

    current_user_obj = UserContextService.get_user_by_id_optional(
        session,
        current_user["user_id"],
    )
    user_name = current_user_obj.full_name if current_user_obj else "Someone"

    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type="meeting_completed",
        message=f"{user_name} marked the meeting as completed",
        metadata={"notes": data.notes}
    )

    # Notify all participants
    MeetingService.notify_participants(
        session=session,
        meeting=meeting,
        notification_type="meeting_completed",
        title="Meeting Marked Complete",
        message=f"Interview '{meeting.title}' has been marked as completed by {user_name}.",
        exclude_user_id=current_user["user_id"]
    )

    meeting = session.exec(
        select(Meeting)
        .where(Meeting.id == meeting.id)
        .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
    ).first()

    return MeetingRead.from_orm_with_participants(meeting)


@router.post("/{meeting_id}/no-show", response_model=MeetingRead)
async def mark_meeting_no_show(
    meeting_id: int,
    data: MeetingNoShowRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Mark a meeting as NO_SHOW (recruiter/HR only).
    Application stays in 'scheduled' — recruiter must decide next action (reject / reschedule).
    """
    role = current_user.get("role", "")
    if role not in ["RECRUITER", "HR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only recruiters and HR can mark meetings as no-show")

    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status in [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot mark a {meeting.status.value} meeting as no-show")

    # Update meeting status
    meeting.status = MeetingStatus.NO_SHOW
    meeting.completed_at = datetime.utcnow()
    meeting.completed_by_user_id = current_user["user_id"]
    meeting.completion_notes = data.notes
    meeting.updated_at = datetime.utcnow()
    # Suppress further post-meeting reminders for this meeting
    meeting.post_meeting_reminder_sent = True
    meeting.post_meeting_reminder_sent_at = datetime.utcnow()
    meeting.post_meeting_escalation_sent = True
    session.add(meeting)
    session.commit()

    # sync_application_status for NO_SHOW keeps application as 'scheduled'
    if meeting.application_id:
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.NO_SHOW,
            actor_user_id=current_user["user_id"]
        )

    current_user_obj = UserContextService.get_user_by_id_optional(
        session,
        current_user["user_id"],
    )
    user_name = current_user_obj.full_name if current_user_obj else "Someone"

    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type="meeting_no_show",
        message=f"{user_name} marked the candidate as no-show",
        metadata={"notes": data.notes}
    )

    # In-app notification to organiser (recruiter/HR) to update application status
    try:
        push_notification(
            session=session,
            user_id=meeting.organizer_user_id,
            title="Candidate No-Show — Action Required",
            message=f"Candidate did not attend '{meeting.title}'. Please update the application status (reject or reschedule).",
            event_type="meeting_no_show",
            route=f"/meetings/{meeting.id}"
        )
    except Exception as e:
        logger.error(f"Failed to push no-show notification: {e}")

    meeting = session.exec(
        select(Meeting)
        .where(Meeting.id == meeting.id)
        .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
    ).first()

    return MeetingRead.from_orm_with_participants(meeting)

