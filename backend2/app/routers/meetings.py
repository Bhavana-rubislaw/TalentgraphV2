"""
Meeting Scheduler API - Phase 1 Implementation
First-class Meeting domain with database persistence, scheduling engine, and availability management
Enhanced with comprehensive cancellation, rescheduling, and tokenized email actions (Option 3)
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
import json

from app.database import get_session
from app.security import get_current_user
from app.models import (
    User, Meeting, MeetingParticipant, MeetingAvailabilitySlot, MeetingTimelineEvent,
    MeetingStatus, MeetingType, CalendarAccount, VideoProviderAccount, CalendarProvider,
    Application, MeetingActionToken
)
from app.schemas import (
    MeetingCreate, MeetingRead, MeetingUpdate, MeetingCancelRequest, MeetingRescheduleRequest,
    MeetingAvailabilitySlotCreate, MeetingAvailabilitySlotRead, SlotSelectionRequest,
    MeetingParticipantRead, CandidateRescheduleRequest, RecruiterRescheduleResponse,
    MeetingTimelineEventRead
)
from app.routers.notifications import push_notification
from app.services.video_providers import VideoProviderFactory, VideoProviderError
from app.services.calendar_providers import CalendarProviderFactory, CalendarProviderError
from app.services.meeting_service import MeetingService
from app.services.meeting_email_service import MeetingEmailService

router = APIRouter(prefix="/meetings", tags=["meetings"])


# ============ SCHEDULING ENGINE ============

def check_availability_conflict(
    session: Session,
    user_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_meeting_id: Optional[int] = None
) -> bool:
    """
    Check if user has any scheduling conflicts in the given time range
    Returns True if there IS a conflict, False if time is available
    """
    query = select(Meeting).join(MeetingParticipant).where(
        and_(
            MeetingParticipant.user_id == user_id,
            Meeting.status == MeetingStatus.SCHEDULED,
            # Check for overlap: (start < their_end) AND (end > their_start)
            Meeting.scheduled_start < end_time,
            Meeting.scheduled_end > start_time
        )
    )
    
    if exclude_meeting_id:
        query = query.where(Meeting.id != exclude_meeting_id)
    
    conflicting_meetings = session.exec(query).all()
    return len(conflicting_meetings) > 0


def find_available_slots(
    session: Session,
    user_ids: List[int],
    duration_minutes: int,
    start_range: datetime,
    end_range: datetime,
    max_slots: int = 10
) -> List[dict]:
    """
    Find available time slots for all participants
    Returns list of available slots within the date range
    """
    # Simple implementation: generate hourly slots and check each
    slots = []
    current_slot = start_range
    slot_duration = timedelta(minutes=duration_minutes)
    
    while current_slot + slot_duration <= end_range and len(slots) < max_slots:
        slot_end = current_slot + slot_duration
        
        # Check if ALL users are available
        all_available = True
        for user_id in user_ids:
            if check_availability_conflict(session, user_id, current_slot, slot_end):
                all_available = False
                break
        
        if all_available:
            slots.append({
                "start": current_slot,
                "end": slot_end,
                "available": True
            })
        
        # Move to next hour
        current_slot += timedelta(hours=1)
    
    return slots


# ============ MEETING CRUD ENDPOINTS ============

@router.post("/create", response_model=MeetingRead)
async def create_meeting(
    meeting_data: MeetingCreate,
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
        has_conflict = check_availability_conflict(
            session, user_id, meeting_data.scheduled_start, meeting_data.scheduled_end
        )
        if has_conflict:
            raise HTTPException(
                status_code=409,
                detail=f"User {user_id} has a scheduling conflict at this time"
            )
    
    # Auto-generate video meeting link if configured
    video_meeting_url = meeting_data.video_meeting_url
    video_provider = meeting_data.video_provider
    
    if not video_meeting_url and meeting_data.video_provider:
        # Check if user has video provider configured
        video_account = session.exec(
            select(VideoProviderAccount).where(
                VideoProviderAccount.user_id == current_user["user_id"],
                VideoProviderAccount.provider == meeting_data.video_provider,
                VideoProviderAccount.auto_generate_links == True
            )
        ).first()
        
        if video_account:
            try:
                provider = VideoProviderFactory.get_provider(
                    provider=video_account.provider,
                    api_key=video_account.api_key,
                    api_secret=video_account.api_secret,
                    access_token=video_account.access_token
                )
                
                if provider:
                    meeting_result = provider.create_meeting(
                        title=meeting_data.title,
                        start_time=meeting_data.scheduled_start,
                        duration_minutes=meeting_data.duration_minutes,
                        description=meeting_data.description,
                        waiting_room=video_account.waiting_room_enabled,
                        timezone=meeting_data.timezone
                    )
                    video_meeting_url = meeting_result["meeting_url"]
                    video_provider = video_account.provider
            except VideoProviderError as e:
                # Log error but don't fail meeting creation
                logger.warning(f"Failed to generate video link: {str(e)}")
    
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
    
    # Sync to calendar providers if configured
    calendar_accounts = session.exec(
        select(CalendarAccount).where(
            CalendarAccount.user_id == current_user["user_id"],
            CalendarAccount.sync_enabled == True
        )
    ).all()
    
    for cal_account in calendar_accounts:
        try:
            provider = CalendarProviderFactory.get_provider(
                provider=cal_account.provider,
                access_token=cal_account.access_token,
                refresh_token=cal_account.refresh_token
            )
            
            # Get participant emails
            participant_users = session.exec(
                select(User).where(User.id.in_(all_participant_ids))
            ).all()
            attendee_emails = [user.email for user in participant_users if user.id != current_user["user_id"]]
            
            event_result = provider.create_event(
                title=meeting_data.title,
                start_time=meeting_data.scheduled_start,
                end_time=meeting_data.scheduled_end,
                description=meeting_data.description,
                location=meeting_data.location or video_meeting_url,
                attendees=attendee_emails,
                timezone=meeting_data.timezone
            )
            
            # Store calendar event ID
            if cal_account.provider == CalendarProvider.GOOGLE:
                meeting.google_calendar_event_id = event_result["event_id"]
            else:  # Microsoft
                meeting.microsoft_calendar_event_id = event_result["event_id"]
            
            session.add(meeting)
        except CalendarProviderError as e:
            # Log error but don't fail meeting creation
            logger.warning(f"Failed to sync to {cal_account.provider.value} calendar: {str(e)}")
    
    session.commit()
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
    current_user_obj = session.get(User, current_user["user_id"])
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
    for user_id in participant_user_ids:
        push_notification(
            session=session,
            user_id=user_id,
            title="New Meeting Scheduled",
            message=f"{user_full_name} scheduled a meeting: {meeting_data.title}",
            event_type="interview_scheduled",
            route=f"/meetings/{meeting.id}"
        )
    
    # Send email notifications with action tokens
    email_service = MeetingEmailService()
    for user_id in participant_user_ids:
        recipient = session.get(User, user_id)
        if recipient:
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
    
    # Debug: log what we're about to serialize
    print(f"\n=== GET /meetings/{meeting_id} DEBUG ===")
    print(f"Meeting has {len(meeting.participants)} participants")
    for p in meeting.participants:
        print(f"  Participant {p.id}: user_id={p.user_id}, user={p.user}, user.full_name={p.user.full_name if p.user else 'NO USER'}")
    
    result = MeetingRead.from_orm_with_participants(meeting)
    
    # Debug: log the serialized result
    import json
    result_dict = result.model_dump()
    print(f"\n=== Serialized Result ===")
    print(f"Participants in result: {len(result_dict.get('participants', []))}")
    for p in result_dict.get('participants', []):
        print(f"  Participant {p.get('id')}: participant_name={p.get('participant_name')}, participant_email={p.get('participant_email')}")
    print("=" * 50 + "\n")
    
    return result


@router.patch("/{meeting_id}", response_model=MeetingRead)
async def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
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
    
    print(f"\n{'='*60}")
    print(f"PATCH /meetings/{meeting_id} - START")
    print(f"User: {current_user['email']} (ID: {current_user['user_id']})")
    print(f"Update data: {update_data.model_dump()}")
    print(f"{'='*60}\n")
    
    try:
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        if meeting.organizer_user_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Only organizer can update meeting")
        
        if meeting.status != MeetingStatus.SCHEDULED:
            raise HTTPException(status_code=400, detail="Can only update scheduled meetings")
        
        # Check for conflicts if time is changing
        new_start = update_data.scheduled_start or meeting.scheduled_start
        new_end = update_data.scheduled_end or meeting.scheduled_end
        
        if new_start != meeting.scheduled_start or new_end != meeting.scheduled_end:
            # Check conflicts for all participants
            for participant in meeting.participants:
                has_conflict = check_availability_conflict(
                    session, participant.user_id, new_start, new_end, exclude_meeting_id=meeting.id
                )
                if has_conflict:
                    raise HTTPException(
                        status_code=409,
                        detail=f"User {participant.user_id} has a scheduling conflict"
                    )
        
        # Handle participant updates if provided
        if update_data.participants is not None:
            # Resolve new participants to user IDs
            new_participant_ids = []
            for participant_spec in update_data.participants:
                user = session.exec(
                    select(User).where(User.email == participant_spec.email)
                ).first()
                
                if not user:
                    raise HTTPException(
                        status_code=404,
                        detail=f"User with email '{participant_spec.email}' not found"
                    )
                
                # Verify name matches
                if user.full_name.lower() != participant_spec.name.lower():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Name mismatch for email '{participant_spec.email}': expected '{participant_spec.name}' but found '{user.full_name}'"
                    )
                
                new_participant_ids.append(user.id)
            
            # Differential update: only add/remove what changed
            existing_participant_ids = {p.user_id for p in meeting.participants}
            new_participant_ids_set = set(new_participant_ids)
            
            # Calculate what changed
            participants_to_remove = existing_participant_ids - new_participant_ids_set
            participants_to_add = new_participant_ids_set - existing_participant_ids
            
            print(f"DEBUG: participants_to_add = {participants_to_add}")
            print(f"DEBUG: participants_to_remove = {participants_to_remove}")
            
            # Remove participants using bulk delete (safer than iterating and deleting)
            if participants_to_remove:
                from sqlalchemy import delete as sql_delete
                stmt = sql_delete(MeetingParticipant).where(
                    and_(
                        MeetingParticipant.meeting_id == meeting.id,
                        MeetingParticipant.user_id.in_(participants_to_remove)
                    )
                ).execution_options(synchronize_session=False)
                session.exec(stmt)
            
            # Add new participants
            if participants_to_add:
                for user_id in participants_to_add:
                    new_participant = MeetingParticipant(
                        meeting_id=meeting.id,
                        user_id=user_id,
                        is_required=True,
                        has_confirmed=(user_id == meeting.organizer_user_id)
                    )
                    session.add(new_participant)
            
            # Commit participant changes immediately
            session.commit()
            
            # Re-query meeting to get fresh data with updated participants
            meeting = session.exec(
                select(Meeting)
                .where(Meeting.id == meeting.id)
                .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
            ).first()
            
            # Debug: Verify meeting data loaded correctly
            print(f"\n{'='*60}")
            print(f"DEBUG: Re-queried meeting data:")
            print(f"  Meeting ID: {meeting.id}")
            print(f"  Title: {meeting.title}")
            print(f"  video_meeting_url: {meeting.video_meeting_url}")
            print(f"  video_provider: {meeting.video_provider}")
            print(f"  location: {meeting.location}")
            print(f"  Participants count: {len(meeting.participants)}")
            print(f"{'='*60}\n")
            
            # Send email notifications for participant changes
            email_service = MeetingEmailService()
            current_user_obj = session.get(User, current_user["user_id"])
            
            # Email newly added participants
            if participants_to_add:
                print(f"Sending emails to {len(participants_to_add)} newly added participants")
                
                for user_id in participants_to_add:
                    recipient = session.get(User, user_id)
                    if recipient and user_id != current_user["user_id"]:
                        print(f"  Sending invitation email to {recipient.email}")
                        # Generate action tokens for new participant
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
                        print(f"  ✓ Email sent to {recipient.email}")
            
            # Notify removed participants via email
            if participants_to_remove:
                print(f"Sending removal emails to {len(participants_to_remove)} removed participants")
                for user_id in participants_to_remove:
                    recipient = session.get(User, user_id)
                    if recipient and user_id != current_user["user_id"]:
                        print(f"  Sending removal email to {recipient.email}")
                        # Use cancellation email template for removed participants
                        email_service.send_interview_cancelled_email(
                            session=session,
                            meeting=meeting,
                            recipient_user=recipient,
                            cancelled_by_user=current_user_obj,
                            cancellation_reason=f"You have been removed from this meeting by {current_user_obj.full_name}."
                        )
                        print(f"  ✓ Removal email sent to {recipient.email}")
        
        # Always re-query meeting fresh before updating other fields
        # This ensures we never work with stale SQLAlchemy objects
        meeting = session.exec(
            select(Meeting)
            .where(Meeting.id == meeting_id)
            .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
        ).first()
        
        # Update other fields - Use model_dump instead of dict for Pydantic v2
        update_dict = update_data.model_dump(exclude_unset=True, exclude={'participants'})
        for key, value in update_dict.items():
            setattr(meeting, key, value)
        
        meeting.updated_at = datetime.utcnow()
        # Don't call session.add() - meeting is already tracked after query
        session.commit()
        
        # Re-query meeting one final time to ensure clean state
        meeting = session.exec(
            select(Meeting)
            .where(Meeting.id == meeting.id)
            .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
        ).first()
        
        # Notify all participants (including new ones)
        for participant in meeting.participants:
            if participant.user_id != current_user["user_id"]:
                push_notification(
                    session=session,
                    user_id=participant.user_id,
                    title="Meeting Updated",
                    message=f"Meeting '{meeting.title}' has been updated",
                    event_type="meeting_updated",
                    route=f"/meetings/{meeting.id}"
                )
        
        return MeetingRead.from_orm_with_participants(meeting)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"\n{'!'*60}")
        print(f"!!! ERROR in PATCH /meetings/{meeting_id} !!!")
        print(f"{'!'*60}")
        traceback.print_exc()
        print(f"\nError type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"{'!'*60}\n")
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update meeting: {str(e)}"
        )


@router.post("/{meeting_id}/cancel", response_model=MeetingRead)
async def cancel_meeting(
    meeting_id: int,
    cancel_data: MeetingCancelRequest,
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
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get current user details
    current_user_obj = session.get(User, current_user["user_id"])
    if not current_user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify canceller identity if name and email are provided
    if cancel_data.canceller_name or cancel_data.canceller_email:
        if cancel_data.canceller_email:
            if current_user_obj.email.lower() != cancel_data.canceller_email.lower():
                raise HTTPException(
                    status_code=403,
                    detail=f"Canceller email '{cancel_data.canceller_email}' does not match authenticated user '{current_user_obj.email}'"
                )
        
        if cancel_data.canceller_name:
            if current_user_obj.full_name.lower() != cancel_data.canceller_name.lower():
                raise HTTPException(
                    status_code=403,
                    detail=f"Canceller name '{cancel_data.canceller_name}' does not match authenticated user '{current_user_obj.full_name}'"
                )
    
    # Check if user is organizer or participant
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not (is_participant or is_organizer):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if meeting.status == MeetingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Meeting already cancelled")
    
    user_full_name = current_user_obj.full_name if current_user_obj else current_user.get("email", "Someone")
    user_role = current_user_obj.role if current_user_obj else "user"
    
    # Cancel meeting
    meeting.status = MeetingStatus.CANCELLED
    meeting.cancelled_at = datetime.utcnow()
    meeting.cancelled_by_user_id = current_user["user_id"]
    meeting.cancellation_reason = cancel_data.cancellation_reason
    meeting.updated_at = datetime.utcnow()
    
    session.add(meeting)
    session.commit()
    
    # Create timeline event
    event_type = "recruiter_cancelled" if is_organizer else "candidate_cancelled"
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type=event_type,
        message=f"{user_full_name} cancelled the meeting: {cancel_data.cancellation_reason}",
        metadata={"reason": cancel_data.cancellation_reason}
    )
    
    # Synchronize application status
    MeetingService.sync_application_status(
        session=session,
        meeting=meeting,
        new_meeting_status=MeetingStatus.CANCELLED,
        actor_user_id=current_user["user_id"]
    )
    
    # Delete from synced calendars (if organizer)
    if is_organizer:
        calendar_accounts = session.exec(
            select(CalendarAccount).where(
                CalendarAccount.user_id == current_user["user_id"],
                CalendarAccount.sync_enabled == True
            )
        ).all()
        
        for cal_account in calendar_accounts:
            try:
                provider = CalendarProviderFactory.get_provider(
                    provider=cal_account.provider,
                    access_token=cal_account.access_token,
                    refresh_token=cal_account.refresh_token
                )
                
                event_id = None
                if cal_account.provider == CalendarProvider.GOOGLE:
                    event_id = meeting.google_calendar_event_id
                else:
                    event_id = meeting.microsoft_calendar_event_id
                
                if event_id:
                    provider.delete_event(event_id)
            except CalendarProviderError as e:
                print(f"Failed to delete from {cal_account.provider.value} calendar: {str(e)}")
    
    # Send notifications to other participants
    notification_title = "Meeting Cancelled"
    notification_message = f"{user_full_name} cancelled meeting '{meeting.title}': {cancel_data.cancellation_reason}"
    
    MeetingService.notify_participants(
        session=session,
        meeting=meeting,
        notification_type="meeting_cancelled",
        title=notification_title,
        message=notification_message,
        exclude_user_id=current_user["user_id"]
    )
    
    # Send emails to other participants
    email_service = MeetingEmailService()
    for participant in meeting.participants:
        if participant.user_id != current_user["user_id"]:
            recipient = session.get(User, participant.user_id)
            if recipient:
                email_service.send_interview_cancelled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    cancelled_by_user=current_user_obj,
                    cancellation_reason=cancel_data.cancellation_reason
                )
    
    # Also notify organizer if participant cancelled
    if not is_organizer:
        organizer = session.get(User, meeting.organizer_user_id)
        if organizer:
            email_service.send_interview_cancelled_email(
                session=session,
                meeting=meeting,
                recipient_user=organizer,
                cancelled_by_user=current_user_obj,
                cancellation_reason=cancel_data.cancellation_reason
            )
    
    session.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/reschedule", response_model=MeetingRead)
async def reschedule_meeting(
    meeting_id: int,
    reschedule_data: MeetingRescheduleRequest,
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
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.organizer_user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only organizer can reschedule. Candidates should use /request-reschedule")
    
    if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULE_REQUESTED]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed or cancelled meeting")
    
    # Store old times for timeline
    old_start = meeting.scheduled_start
    old_end = meeting.scheduled_end
    
    # Check conflicts
    for participant in meeting.participants:
        has_conflict = check_availability_conflict(
            session, participant.user_id,
            reschedule_data.scheduled_start, reschedule_data.scheduled_end,
            exclude_meeting_id=meeting.id
        )
        if has_conflict:
            raise HTTPException(
                status_code=409,
                detail=f"User {participant.user_id} has a scheduling conflict"
            )
    
    # Update meeting
    meeting.scheduled_start = reschedule_data.scheduled_start
    meeting.scheduled_end = reschedule_data.scheduled_end
    meeting.timezone = reschedule_data.timezone or meeting.timezone
    meeting.status = MeetingStatus.SCHEDULED
    meeting.updated_at = datetime.utcnow()
    
    # Clear reschedule request fields if this was in response to a request
    if meeting.status == MeetingStatus.RESCHEDULE_REQUESTED:
        meeting.reschedule_requested_at = None
        meeting.reschedule_requested_by_user_id = None
        meeting.reschedule_request_reason = None
        meeting.reschedule_request_preferred_times = None
    
    session.add(meeting)
    session.commit()
    
    # Create timeline event
    current_user_obj = session.get(User, current_user["user_id"])
    user_full_name = current_user_obj.full_name if current_user_obj else "Recruiter"
    
    event_type = "recruiter_rescheduled"
    event_message = f"{user_full_name} rescheduled the meeting"
    if reschedule_data.reason:
        event_message += f": {reschedule_data.reason}"
    
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type=event_type,
        message=event_message,
        metadata={
            "reason": reschedule_data.reason,
            "new_start": reschedule_data.scheduled_start.isoformat(),
            "new_end": reschedule_data.scheduled_end.isoformat()
        },
        previous_start=old_start,
        previous_end=old_end
    )
    
    # Synchronize application status (remains scheduled)
    MeetingService.sync_application_status(
        session=session,
        meeting=meeting,
        new_meeting_status=MeetingStatus.SCHEDULED,
        actor_user_id=current_user["user_id"]
    )
    
    # Update in synced calendars
    calendar_accounts = session.exec(
        select(CalendarAccount).where(
            CalendarAccount.user_id == current_user["user_id"],
            CalendarAccount.sync_enabled == True
        )
    ).all()
    
    for cal_account in calendar_accounts:
        try:
            provider = CalendarProviderFactory.get_provider(
                provider=cal_account.provider,
                access_token=cal_account.access_token,
                refresh_token=cal_account.refresh_token
            )
            
            event_id = None
            if cal_account.provider == CalendarProvider.GOOGLE:
                event_id = meeting.google_calendar_event_id
            else:
                event_id = meeting.microsoft_calendar_event_id
            
            if event_id:
                provider.update_event(
                    event_id=event_id,
                    start_time=reschedule_data.scheduled_start,
                    end_time=reschedule_data.scheduled_end
                )
        except CalendarProviderError as e:
            print(f"Failed to update {cal_account.provider.value} calendar: {str(e)}")
    
    # Notify participants
    MeetingService.notify_participants(
        session=session,
        meeting=meeting,
        notification_type="meeting_rescheduled",
        title="Meeting Rescheduled",
        message=f"{user_full_name} rescheduled meeting '{meeting.title}'",
        exclude_user_id=current_user["user_id"]
    )
    
    # Send emails to participants
    email_service = MeetingEmailService()
    for participant in meeting.participants:
        if participant.user_id != current_user["user_id"]:
            recipient = session.get(User, participant.user_id)
            if recipient:
                # Generate new tokens for the rescheduled meeting
                confirm_token = MeetingService.generate_action_token(
                    session, meeting.id, recipient.id, "confirm"
                )
                cancel_token = MeetingService.generate_action_token(
                    session, meeting.id, recipient.id, "cancel"
                )
                
                email_service.send_reschedule_approved_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    approver_user=current_user_obj,
                    confirm_token=confirm_token,
                    cancel_token=cancel_token
                )
    
    session.refresh(meeting)
    return meeting


# ============ CANDIDATE RESCHEDULE REQUEST ENDPOINTS ============

@router.post("/{meeting_id}/request-reschedule", response_model=MeetingRead)
async def request_reschedule(
    meeting_id: int,
    request_data: CandidateRescheduleRequest,
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
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user is a participant (not organizer)
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if is_organizer:
        raise HTTPException(status_code=400, detail="Organizers should use /reschedule endpoint directly")
    
    if meeting.status != MeetingStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Can only request reschedule for scheduled meetings")
    
    # Update meeting with reschedule request
    meeting.status = MeetingStatus.RESCHEDULE_REQUESTED
    meeting.reschedule_requested_at = datetime.utcnow()
    meeting.reschedule_requested_by_user_id = current_user["user_id"]
    meeting.reschedule_request_reason = request_data.reason
    
    # Store preferred times as JSON if provided
    if request_data.preferred_times:
        meeting.reschedule_request_preferred_times = json.dumps(request_data.preferred_times)
    
    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    session.commit()
    
    # Create timeline event
    current_user_obj = session.get(User, current_user["user_id"])
    user_full_name = current_user_obj.full_name if current_user_obj else "Candidate"
    
    event_message = f"{user_full_name} requested to reschedule: {request_data.reason}"
    if request_data.note:
        event_message += f" ({request_data.note})"
    
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=current_user["user_id"],
        event_type="candidate_requested_reschedule",
        message=event_message,
        metadata={
            "reason": request_data.reason,
            "note": request_data.note,
            "preferred_times": request_data.preferred_times
        }
    )
    
    # Synchronize application status (remains scheduled)
    MeetingService.sync_application_status(
        session=session,
        meeting=meeting,
        new_meeting_status=MeetingStatus.RESCHEDULE_REQUESTED,
        actor_user_id=current_user["user_id"]
    )
    
    # Notify organizer
    organizer = session.get(User, meeting.organizer_user_id)
    if organizer:
        push_notification(
            session=session,
            user_id=organizer.id,
            title="Reschedule Request",
            message=f"{user_full_name} requested to reschedule meeting '{meeting.title}'",
            event_type="meeting_reschedule_requested",
            route=f"/meetings/{meeting.id}"
        )
        
        # Send email to organizer
        email_service = MeetingEmailService()
        preferred_times_str = ", ".join(request_data.preferred_times) if request_data.preferred_times else None
        
        email_service.send_reschedule_request_email(
            session=session,
            meeting=meeting,
            recipient_user=organizer,
            requester_user=current_user_obj,
            request_reason=request_data.reason,
            preferred_times=preferred_times_str
        )
    
    session.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/respond-reschedule", response_model=MeetingRead)
async def respond_to_reschedule_request(
    meeting_id: int,
    response_data: RecruiterRescheduleResponse,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Recruiter responds to candidate reschedule request
    - Approve: reschedule to new time
    - Reject: keep original time, return to SCHEDULED status
    """
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.organizer_user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only organizer can respond to reschedule requests")
    
    if meeting.status != MeetingStatus.RESCHEDULE_REQUESTED:
        raise HTTPException(status_code=400, detail="No pending reschedule request")
    
    current_user_obj = session.get(User, current_user["user_id"])
    user_full_name = current_user_obj.full_name if current_user_obj else "Recruiter"
    
    requester_id = meeting.reschedule_requested_by_user_id
    requester = session.get(User, requester_id) if requester_id else None
    
    if response_data.approved:
        # Approve and reschedule
        if not response_data.scheduled_start or not response_data.scheduled_end:
            raise HTTPException(status_code=400, detail="New times required when approving reschedule")
        
        # Store old times
        old_start = meeting.scheduled_start
        old_end = meeting.scheduled_end
        
        # Check conflicts
        for participant in meeting.participants:
            has_conflict = check_availability_conflict(
                session, participant.user_id,
                response_data.scheduled_start, response_data.scheduled_end,
                exclude_meeting_id=meeting.id
            )
            if has_conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"User {participant.user_id} has a scheduling conflict"
                )
        
        # Update meeting
        meeting.scheduled_start = response_data.scheduled_start
        meeting.scheduled_end = response_data.scheduled_end
        meeting.timezone = response_data.timezone or meeting.timezone
        meeting.status = MeetingStatus.SCHEDULED
        meeting.reschedule_requested_at = None
        meeting.reschedule_requested_by_user_id = None
        meeting.reschedule_request_reason = None
        meeting.reschedule_request_preferred_times = None
        meeting.updated_at = datetime.utcnow()
        
        session.add(meeting)
        session.commit()
        
        # Create timeline event
        event_message = f"{user_full_name} approved reschedule request and set new time"
        if response_data.response_note:
            event_message += f": {response_data.response_note}"
        
        MeetingService.create_timeline_event(
            session=session,
            meeting_id=meeting.id,
            actor_user_id=current_user["user_id"],
            event_type="recruiter_approved_reschedule",
            message=event_message,
            metadata={
                "response_note": response_data.response_note,
                "new_start": response_data.scheduled_start.isoformat(),
                "new_end": response_data.scheduled_end.isoformat()
            },
            previous_start=old_start,
            previous_end=old_end
        )
        
        # Notify requester
        if requester:
            push_notification(
                session=session,
                user_id=requester.id,
                title="Reschedule Approved",
                message=f"{user_full_name} approved your reschedule request for '{meeting.title}'",
                event_type="meeting_reschedule_approved",
                route=f"/meetings/{meeting.id}"
            )
            
            # Send email
            email_service = MeetingEmailService()
            confirm_token = MeetingService.generate_action_token(
                session, meeting.id, requester.id, "confirm"
            )
            cancel_token = MeetingService.generate_action_token(
                session, meeting.id, requester.id, "cancel"
            )
            
            email_service.send_reschedule_approved_email(
                session=session,
                meeting=meeting,
                recipient_user=requester,
                approver_user=current_user_obj,
                confirm_token=confirm_token,
                cancel_token=cancel_token
            )
    
    else:
        # Reject request, keep original time
        meeting.status = MeetingStatus.SCHEDULED
        meeting.reschedule_requested_at = None
        meeting.reschedule_requested_by_user_id = None
        meeting.reschedule_request_reason = None
        meeting.reschedule_request_preferred_times = None
        meeting.updated_at = datetime.utcnow()
        
        session.add(meeting)
        session.commit()
        
        # Create timeline event
        event_message = f"{user_full_name} declined reschedule request"
        if response_data.response_note:
            event_message += f": {response_data.response_note}"
        
        MeetingService.create_timeline_event(
            session=session,
            meeting_id=meeting.id,
            actor_user_id=current_user["user_id"],
            event_type="recruiter_rejected_reschedule",
            message=event_message,
            metadata={"response_note": response_data.response_note}
        )
        
        # Notify requester
        if requester:
            push_notification(
                session=session,
                user_id=requester.id,
                title="Reschedule Request Declined",
                message=f"{user_full_name} declined your reschedule request for '{meeting.title}'",
                event_type="meeting_reschedule_rejected",
                route=f"/meetings/{meeting.id}"
            )
    
    session.refresh(meeting)
    return meeting


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
    
    # Find token record
    token_record = session.exec(
        select(MeetingActionToken).where(
            and_(
                MeetingActionToken.token == token,
                MeetingActionToken.action_type == "confirm",
                MeetingActionToken.is_used == False,
                MeetingActionToken.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    meeting = session.get(Meeting, token_record.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.status != MeetingStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Meeting is not scheduled")
    
    # Mark participant as confirmed
    participant = session.exec(
        select(MeetingParticipant).where(
            and_(
                MeetingParticipant.meeting_id == meeting.id,
                MeetingParticipant.user_id == token_record.user_id
            )
        )
    ).first()
    
    if participant:
        participant.has_confirmed = True
        participant.confirmed_at = datetime.utcnow()
        session.add(participant)
    
    # Mark token as used
    MeetingService.mark_token_used(session, token_record)
    
    # Create timeline event
    user = session.get(User, token_record.user_id)
    user_name = user.full_name if user else "Participant"
    
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=token_record.user_id,
        event_type="attendance_confirmed",
        message=f"{user_name} confirmed attendance"
    )
    
    session.commit()
    
    # Return simple HTML confirmation page
    return {
        "message": "Attendance confirmed successfully",
        "meeting_id": meeting.id,
        "redirect_url": f"/meetings/{meeting.id}"
    }


@router.get("/token/{token}/cancel")
async def cancel_meeting_via_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Cancel meeting via email token link - shows confirmation form"""
    
    # Validate token
    token_record = session.exec(
        select(MeetingActionToken).where(
            and_(
                MeetingActionToken.token == token,
                MeetingActionToken.action_type == "cancel",
                MeetingActionToken.is_used == False,
                MeetingActionToken.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    meeting = session.get(Meeting, token_record.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Return meeting info for confirmation form (frontend will render this)
    return {
        "meeting_id": meeting.id,
        "token": token,
        "title": meeting.title,
        "scheduled_start": meeting.scheduled_start.isoformat(),
        "action": "cancel"
    }


@router.post("/token/{token}/cancel")
async def cancel_meeting_via_token_confirmed(
    token: str,
    cancel_data: MeetingCancelRequest,
    session: Session = Depends(get_session)
):
    """Actually cancel meeting after confirmation via token"""
    
    # Validate token
    token_record = session.exec(
        select(MeetingActionToken).where(
            and_(
                MeetingActionToken.token == token,
                MeetingActionToken.action_type == "cancel",
                MeetingActionToken.is_used == False,
                MeetingActionToken.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    meeting = session.get(Meeting, token_record.meeting_id)
    if not meeting or meeting.status == MeetingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Meeting already cancelled or not found")
    
    user = session.get(User, token_record.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cancel meeting using same logic as regular cancel
    meeting.status = MeetingStatus.CANCELLED
    meeting.cancelled_at = datetime.utcnow()
    meeting.cancelled_by_user_id = token_record.user_id
    meeting.cancellation_reason = cancel_data.cancellation_reason
    meeting.updated_at = datetime.utcnow()
    
    session.add(meeting)
    
    # Mark token as used
    MeetingService.mark_token_used(session, token_record)
    
    # Create timeline event
    is_organizer = meeting.organizer_user_id == token_record.user_id
    event_type = "recruiter_cancelled" if is_organizer else "candidate_cancelled"
    
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=token_record.user_id,
        event_type=event_type,
        message=f"{user.full_name} cancelled the meeting via email: {cancel_data.cancellation_reason}",
        metadata={"reason": cancel_data.cancellation_reason, "via_email": True}
    )
    
    # Sync application status
    MeetingService.sync_application_status(
        session=session,
        meeting=meeting,
        new_meeting_status=MeetingStatus.CANCELLED,
        actor_user_id=token_record.user_id
    )
    
    session.commit()
    
    # Notify other participants
    MeetingService.notify_participants(
        session=session,
        meeting=meeting,
        notification_type="meeting_cancelled",
        title="Meeting Cancelled",
        message=f"{user.full_name} cancelled meeting '{meeting.title}': {cancel_data.cancellation_reason}",
        exclude_user_id=token_record.user_id
    )
    
    # Send emails
    email_service = MeetingEmailService()
    for participant in meeting.participants:
        if participant.user_id != token_record.user_id:
            recipient = session.get(User, participant.user_id)
            if recipient:
                email_service.send_interview_cancelled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    cancelled_by_user=user,
                    cancellation_reason=cancel_data.cancellation_reason
                )
    
    return {
        "message": "Meeting cancelled successfully",
        "meeting_id": meeting.id
    }


@router.get("/token/{token}/reschedule")
async def request_reschedule_via_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Show reschedule request form via email token"""
    
    # Validate token
    token_record = session.exec(
        select(MeetingActionToken).where(
            and_(
                MeetingActionToken.token == token,
                MeetingActionToken.action_type == "reschedule",
                MeetingActionToken.is_used == False,
                MeetingActionToken.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    meeting = session.get(Meeting, token_record.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Return meeting info for reschedule form
    return {
        "meeting_id": meeting.id,
        "token": token,
        "title": meeting.title,
        "scheduled_start": meeting.scheduled_start.isoformat(),
        "action": "reschedule"
    }


@router.post("/token/{token}/reschedule")
async def request_reschedule_via_token_submit(
    token: str,
    request_data: CandidateRescheduleRequest,
    session: Session = Depends(get_session)
):
    """Submit reschedule request via email token"""
    
    # Validate token
    token_record = session.exec(
        select(MeetingActionToken).where(
            and_(
                MeetingActionToken.token == token,
                MeetingActionToken.action_type == "reschedule",
                MeetingActionToken.is_used == False,
                MeetingActionToken.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    meeting = session.get(Meeting, token_record.meeting_id)
    if not meeting or meeting.status != MeetingStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Meeting cannot be rescheduled")
    
    user = session.get(User, token_record.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update meeting with reschedule request
    meeting.status = MeetingStatus.RESCHEDULE_REQUESTED
    meeting.reschedule_requested_at = datetime.utcnow()
    meeting.reschedule_requested_by_user_id = token_record.user_id
    meeting.reschedule_request_reason = request_data.reason
    
    if request_data.preferred_times:
        meeting.reschedule_request_preferred_times = json.dumps(request_data.preferred_times)
    
    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    
    # Mark token as used
    MeetingService.mark_token_used(session, token_record)
    
    # Create timeline event
    event_message = f"{user.full_name} requested to reschedule via email: {request_data.reason}"
    if request_data.note:
        event_message += f" ({request_data.note})"
    
    MeetingService.create_timeline_event(
        session=session,
        meeting_id=meeting.id,
        actor_user_id=token_record.user_id,
        event_type="candidate_requested_reschedule",
        message=event_message,
        metadata={
            "reason": request_data.reason,
            "note": request_data.note,
            "preferred_times": request_data.preferred_times,
            "via_email": True
        }
    )
    
    session.commit()
    
    # Notify organizer
    organizer = session.get(User, meeting.organizer_user_id)
    if organizer:
        push_notification(
            session=session,
            user_id=organizer.id,
            title="Reschedule Request",
            message=f"{user.full_name} requested to reschedule meeting '{meeting.title}'",
            event_type="meeting_reschedule_requested",
            route=f"/meetings/{meeting.id}"
        )
        
        # Send email
        email_service = MeetingEmailService()
        preferred_times_str = ", ".join(request_data.preferred_times) if request_data.preferred_times else None
        
        email_service.send_reschedule_request_email(
            session=session,
            meeting=meeting,
            recipient_user=organizer,
            requester_user=user,
            request_reason=request_data.reason,
            preferred_times=preferred_times_str
        )
    
    return {
        "message": "Reschedule request submitted successfully",
        "meeting_id": meeting.id
    }




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
        push_notification(
            session=session,
            target_user_id=slots_data[0].proposed_to_user_id,
            notification_type="availability_proposed",
            title="Interview Times Available",
            message=f"{current_user.full_name} proposed {len(slots_data)} interview time slots",
            related_id=created_slots[0].id if created_slots else None,
            action_url="/meetings/availability"
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
    has_conflict = check_availability_conflict(
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
    push_notification(
        session=session,
        target_user_id=slot.proposed_by_user_id,
        notification_type="slot_selected",
        title="Interview Time Confirmed",
        message=f"{current_user.full_name} selected an interview time",
        related_id=meeting.id,
        action_url=f"/meetings/{meeting.id}"
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
    
    has_conflict = check_availability_conflict(session, user_id, start_time, end_time)
    
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
    
    slots = find_available_slots(
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
