"""Service layer orchestration for recruiter respond-reschedule endpoint."""

import logging
from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Meeting, MeetingStatus
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.services.meeting_email_service import MeetingEmailService
from app.services.meeting_conflict_service import MeetingConflictService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingRespondRescheduleService:
    @staticmethod
    def respond_to_reschedule_request(*, meeting_id: int, response_data, current_user: dict, session: Session):
        logger.info(
            "[MEETING_RESPOND_RESCHEDULE] respond meeting_id=%s responder_user_id=%s approved=%s",
            meeting_id, current_user.get('user_id'), response_data.approved,
        )
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        if meeting.organizer_user_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Only organizer can respond to reschedule requests")

        if meeting.status != MeetingStatus.RESCHEDULE_REQUESTED:
            raise HTTPException(status_code=400, detail="No pending reschedule request")

        current_user_obj = UserContextService.get_user_by_email_or_404(
            session,
            current_user["email"],
        )
        user_full_name = current_user_obj.full_name if current_user_obj else "Recruiter"

        requester_id = meeting.reschedule_requested_by_user_id
        requester = UserContextService.get_user_by_id_optional(session, requester_id) if requester_id else None

        if response_data.approved:
            # Approve and reschedule
            if not response_data.scheduled_start or not response_data.scheduled_end:
                raise HTTPException(status_code=400, detail="New times required when approving reschedule")

            # Store old times
            old_start = meeting.scheduled_start
            old_end = meeting.scheduled_end

            # Check conflicts
            for participant in meeting.participants:
                has_conflict = MeetingConflictService.check_availability_conflict(
                    session,
                    participant.user_id,
                    response_data.scheduled_start,
                    response_data.scheduled_end,
                    exclude_meeting_id=meeting.id,
                )
                if has_conflict:
                    raise HTTPException(
                        status_code=409,
                        detail=f"User {participant.user_id} has a scheduling conflict",
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
                    "new_end": response_data.scheduled_end.isoformat(),
                },
                previous_start=old_start,
                previous_end=old_end,
            )

            # Notify requester
            if requester:
                MeetingDispatchService.notify_user_ids(
                    session=session,
                    user_ids=[requester.id],
                    title="Reschedule Approved",
                    message=f"{user_full_name} approved your reschedule request for '{meeting.title}'",
                    event_type="meeting_reschedule_approved",
                    route=f"/meetings/{meeting.id}",
                )

                # Send email
                email_service = MeetingEmailService(queue_mode=True)
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
                    cancel_token=cancel_token,
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
                metadata={"response_note": response_data.response_note},
            )

            # Notify requester
            if requester:
                MeetingDispatchService.notify_user_ids(
                    session=session,
                    user_ids=[requester.id],
                    title="Reschedule Request Declined",
                    message=f"{user_full_name} declined your reschedule request for '{meeting.title}'",
                    event_type="meeting_reschedule_rejected",
                    route=f"/meetings/{meeting.id}",
                )

        session.refresh(meeting)
        return meeting
