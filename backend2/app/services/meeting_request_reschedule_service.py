"""Service layer orchestration for candidate request-reschedule endpoint."""

import json
import logging
from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Meeting, MeetingStatus
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingRequestRescheduleService:
    @staticmethod
    def request_reschedule(*, meeting_id: int, request_data, current_user: dict, session: Session):
        logger.info(
            f"[MEETING_REQUEST_RESCHEDULE] meeting_id={meeting_id} requester_user_id={current_user.get('user_id')}"
        )
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
        current_user_obj = UserContextService.get_user_by_email_or_404(
            session,
            current_user["email"],
        )
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
                "preferred_times": request_data.preferred_times,
            },
        )

        # Synchronize application status (remains scheduled)
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.RESCHEDULE_REQUESTED,
            actor_user_id=current_user["user_id"],
        )

        # Notify organizer
        organizer = UserContextService.get_user_by_id_optional(session, meeting.organizer_user_id)
        MeetingDispatchService.send_reschedule_request_to_organizer(
            session=session,
            meeting=meeting,
            organizer=organizer,
            requester_user=current_user_obj,
            requester_name=user_full_name,
            request_reason=request_data.reason,
            preferred_times=request_data.preferred_times,
        )

        session.refresh(meeting)
        return meeting
