"""
Meeting Scheduler API - Phase 1 Implementation
First-class Meeting domain with database persistence, scheduling engine, and availability management
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_
from sqlmodel import Session

from app.database import get_session
from app.security import get_current_user
from app.models import (
    User, Meeting, MeetingParticipant, MeetingAvailabilitySlot,
    MeetingStatus, MeetingType, CalendarAccount, VideoProviderAccount, CalendarProvider
)
from app.schemas import (
    MeetingCreate, MeetingRead, MeetingUpdate, MeetingCancelRequest, MeetingRescheduleRequest,
    MeetingAvailabilitySlotCreate, MeetingAvailabilitySlotRead, SlotSelectionRequest,
    MeetingParticipantRead
)
from app.routers.notifications import push_notification
from app.services.video_providers import VideoProviderFactory, VideoProviderError
from app.services.calendar_providers import CalendarProviderFactory, CalendarProviderError

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
    - Checks for scheduling conflicts
    - Creates meeting and participant records
    - Sends notifications to all participants
    """
    
    # Validate time
    if meeting_data.scheduled_end <= meeting_data.scheduled_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    # Check for conflicts for all participants
    all_participant_ids = meeting_data.participant_user_ids + [current_user["user_id"]]
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
                VideoProviderAccount.user_id == current_user.id,
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
                print(f"Failed to generate video link: {str(e)}")
    
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
            print(f"Failed to sync to {cal_account.provider.value} calendar: {str(e)}")
    
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
    
    # Send notifications to all participants (except organizer)
    for user_id in meeting_data.participant_user_ids:
        push_notification(
            session=session,
            target_user_id=user_id,
            notification_type="meeting_scheduled",
            title="New Meeting Scheduled",
            message=f"{user_full_name} scheduled a meeting: {meeting_data.title}",
            related_id=meeting.id,
            action_url=f"/meetings/{meeting.id}"
        )
    
    # Refresh to get participants
    session.refresh(meeting)
    return meeting


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
    
    # Query meetings where user is participant or organizer
    query = select(Meeting).join(MeetingParticipant).where(
        or_(
            Meeting.organizer_user_id == current_user["user_id"],
            MeetingParticipant.user_id == current_user["user_id"]
        )
    )
    
    if status:
        query = query.where(Meeting.status == status)
    
    if upcoming_only:
        query = query.where(Meeting.scheduled_start >= datetime.utcnow())
    
    query = query.order_by(Meeting.scheduled_start.desc())
    
    meetings = session.exec(query).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingRead)
async def get_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get meeting details by ID"""
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user has access (is participant or organizer)
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not (is_participant or is_organizer):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingRead)
async def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update meeting details
    - Only organizer can update
    - Checks for conflicts if time changes
    """
    
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
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(meeting, key, value)
    
    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    
    # Notify participants
    for participant in meeting.participants:
        if participant.user_id != current_user.id:
            push_notification(
                session=session,
                target_user_id=participant.user_id,
                notification_type="meeting_updated",
                title="Meeting Updated",
                message=f"Meeting '{meeting.title}' has been updated",
                related_id=meeting.id,
                action_url=f"/meetings/{meeting.id}"
            )
    
    return meeting


@router.post("/{meeting_id}/cancel", response_model=MeetingRead)
async def cancel_meeting(
    meeting_id: int,
    cancel_data: MeetingCancelRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Cancel a meeting
    - Organizer or any participant can cancel
    - Sends notifications to all participants
    """
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if user is organizer or participant
    is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
    is_organizer = meeting.organizer_user_id == current_user["user_id"]
    
    if not (is_participant or is_organizer):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if meeting.status == MeetingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Meeting already cancelled")
    
    # Cancel meeting
    meeting.status = MeetingStatus.CANCELLED
    meeting.cancelled_at = datetime.utcnow()
    meeting.cancelled_by_user_id = current_user["user_id"]
    meeting.cancellation_reason = cancel_data.cancellation_reason
    meeting.updated_at = datetime.utcnow()
    
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    
    # Delete from synced calendars
    if is_organizer:  # Only organizer can delete from their calendar
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
                
                # Get the event ID for this calendar
                event_id = None
                if cal_account.provider == CalendarProvider.GOOGLE:
                    event_id = meeting.google_calendar_event_id
                else:  # Microsoft
                    event_id = meeting.microsoft_calendar_event_id
                
                if event_id:
                    provider.delete_event(event_id)
            except CalendarProviderError as e:
                print(f"Failed to delete from {cal_account.provider.value} calendar: {str(e)}")
    
    # Get current user for notification
    current_user_obj = session.get(User, current_user["user_id"])
    user_full_name = current_user_obj.full_name if current_user_obj else current_user.get("email", "Someone")
    
    # Notify all participants
    for participant in meeting.participants:
        if participant.user_id != current_user["user_id"]:
            push_notification(
                session=session,
                target_user_id=participant.user_id,
                notification_type="meeting_cancelled",
                title="Meeting Cancelled",
                message=f"{user_full_name} cancelled meeting '{meeting.title}'",
                related_id=meeting.id,
                action_url=f"/meetings/{meeting.id}"
            )
    
    return meeting


@router.post("/{meeting_id}/reschedule", response_model=MeetingRead)
async def reschedule_meeting(
    meeting_id: int,
    reschedule_data: MeetingRescheduleRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Reschedule a meeting to a new time
    - Only organizer can reschedule
    - Checks for conflicts at new time
    """
    
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.organizer_user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only organizer can reschedule")
    
    if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed meeting")
    
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
    meeting.timezone = reschedule_data.timezone
    meeting.status = MeetingStatus.SCHEDULED
    meeting.updated_at = datetime.utcnow()
    
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    
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
            
            # Get the event ID for this calendar
            event_id = None
            if cal_account.provider == CalendarProvider.GOOGLE:
                event_id = meeting.google_calendar_event_id
            else:  # Microsoft
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
    for participant in meeting.participants:
        if participant.user_id != current_user["user_id"]:
            push_notification(
                session=session,
                target_user_id=participant.user_id,
                notification_type="meeting_rescheduled",
                title="Meeting Rescheduled",
                message=f"Meeting '{meeting.title}' has been rescheduled",
                related_id=meeting.id,
                action_url=f"/meetings/{meeting.id}"
            )
    
    return meeting


# ============ AVAILABILITY SLOT ENDPOINTS ============

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
        session, current_user.id, slot.slot_start, slot.slot_end
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
    for user_id in [slot.proposed_by_user_id, current_user.id]:
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
