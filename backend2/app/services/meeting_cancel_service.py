"""Service layer orchestration for meeting cancellation endpoint."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import CalendarAccount, CalendarProvider, Meeting, MeetingStatus
from app.services.calendar_providers import CalendarProviderError, CalendarProviderFactory
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingCancelService:
    @staticmethod
    def cancel_meeting(
        *, meeting_id: int, cancel_data, current_user: dict, session: Session,
        request_id: Optional[str] = None,
    ):
        logger.info(
            "[MEETING_CANCEL] cancel meeting_id=%s user_id=%s request_id=%s",
            meeting_id, current_user["user_id"], request_id,
        )
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        # Get current user details
        current_user_obj = UserContextService.get_user_by_email_or_404(
            session,
            current_user["email"],
        )

        # Candidates cannot cancel meetings
        if current_user_obj.role == "candidate":
            raise HTTPException(status_code=403, detail="Candidates cannot cancel meetings")

        # Verify canceller identity if name and email are provided
        if cancel_data.canceller_name or cancel_data.canceller_email:
            if cancel_data.canceller_email:
                if current_user_obj.email.lower() != cancel_data.canceller_email.lower():
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            f"Canceller email '{cancel_data.canceller_email}' does not match "
                            f"authenticated user '{current_user_obj.email}'"
                        ),
                    )

            if cancel_data.canceller_name:
                if current_user_obj.full_name.lower() != cancel_data.canceller_name.lower():
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            f"Canceller name '{cancel_data.canceller_name}' does not match "
                            f"authenticated user '{current_user_obj.full_name}'"
                        ),
                    )

        # Check if user is organizer or participant
        is_participant = any(p.user_id == current_user["user_id"] for p in meeting.participants)
        is_organizer = meeting.organizer_user_id == current_user["user_id"]

        if not (is_participant or is_organizer):
            raise HTTPException(status_code=403, detail="Access denied")

        if meeting.status == MeetingStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Meeting already cancelled")

        user_full_name = current_user_obj.full_name if current_user_obj else current_user.get("email", "Someone")

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
            metadata={"reason": cancel_data.cancellation_reason},
        )

        # Synchronize application status
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.CANCELLED,
            actor_user_id=current_user["user_id"],
        )

        # Delete from synced calendars (if organizer)
        if is_organizer:
            calendar_accounts = session.exec(
                select(CalendarAccount).where(
                    CalendarAccount.user_id == current_user["user_id"],
                    CalendarAccount.sync_enabled == True,
                )
            ).all()

            for cal_account in calendar_accounts:
                try:
                    provider = CalendarProviderFactory.get_provider(
                        provider=cal_account.provider,
                        access_token=cal_account.access_token,
                        refresh_token=cal_account.refresh_token,
                    )

                    event_id = None
                    if cal_account.provider == CalendarProvider.GOOGLE:
                        event_id = meeting.google_calendar_event_id
                    else:
                        event_id = meeting.microsoft_calendar_event_id

                    if event_id:
                        provider.delete_event(event_id)
                except CalendarProviderError as e:
                    logger.warning(
                        "[MEETING_CANCEL] calendar_delete_failed meeting_id=%s provider=%s error=%s request_id=%s",
                        meeting.id, cal_account.provider.value, e, request_id,
                    )

        # Send notifications to ALL participants (including organizer)
        notification_title = "Meeting Cancelled"
        notification_message = (
            f"{user_full_name} cancelled meeting '{meeting.title}': {cancel_data.cancellation_reason}"
        )

        all_cancel_notify_ids = {p.user_id for p in meeting.participants}
        all_cancel_notify_ids.add(meeting.organizer_user_id)
        MeetingDispatchService.notify_user_ids(
            session=session,
            user_ids=all_cancel_notify_ids,
            title=notification_title,
            message=notification_message,
            event_type="meeting_cancelled",
            route=f"/meetings/{meeting.id}",
        )

        # Send cancellation emails to ALL participants and organizer
        recipient_ids = [uid for uid in all_cancel_notify_ids if uid != current_user["user_id"]]
        MeetingDispatchService.send_cancelled_email_to_user_ids(
            session=session,
            meeting=meeting,
            recipient_user_ids=recipient_ids,
            cancelled_by_user=current_user_obj,
            cancellation_reason=cancel_data.cancellation_reason,
        )

        session.refresh(meeting)
        return meeting
