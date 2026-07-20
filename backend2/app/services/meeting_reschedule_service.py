"""Service layer orchestration for meeting reschedule endpoint."""

import logging
from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import CalendarAccount, CalendarProvider, Meeting, MeetingStatus
from app.services.calendar_providers import CalendarProviderError, CalendarProviderFactory
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.services.meeting_email_service import MeetingEmailService
from app.services.meeting_conflict_service import MeetingConflictService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingRescheduleService:
    @staticmethod
    def reschedule_meeting(*, meeting_id: int, reschedule_data, current_user: dict, session: Session):
        meeting = session.get(Meeting, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        if meeting.organizer_user_id != current_user["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="Only organizer can reschedule. Candidates should use /request-reschedule",
            )

        if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULE_REQUESTED]:
            raise HTTPException(status_code=400, detail="Cannot reschedule completed or cancelled meeting")

        # Store old times for timeline
        old_start = meeting.scheduled_start
        old_end = meeting.scheduled_end

        # Check conflicts
        for participant in meeting.participants:
            has_conflict = MeetingConflictService.check_availability_conflict(
                session,
                participant.user_id,
                reschedule_data.scheduled_start,
                reschedule_data.scheduled_end,
                exclude_meeting_id=meeting.id,
            )
            if has_conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"User {participant.user_id} has a scheduling conflict",
                )

        # Clear reschedule request fields if this was in response to a request
        was_reschedule_requested = meeting.status == MeetingStatus.RESCHEDULE_REQUESTED
        if was_reschedule_requested:
            meeting.reschedule_requested_at = None
            meeting.reschedule_requested_by_user_id = None
            meeting.reschedule_request_reason = None
            meeting.reschedule_request_preferred_times = None

        # Update meeting
        meeting.scheduled_start = reschedule_data.scheduled_start
        meeting.scheduled_end = reschedule_data.scheduled_end
        meeting.timezone = reschedule_data.timezone or meeting.timezone
        meeting.status = MeetingStatus.SCHEDULED
        meeting.updated_at = datetime.utcnow()

        session.add(meeting)
        session.commit()

        # Create timeline event
        current_user_obj = UserContextService.get_user_by_id_optional(
            session,
            current_user["user_id"],
        )
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
                "new_end": reschedule_data.scheduled_end.isoformat(),
            },
            previous_start=old_start,
            previous_end=old_end,
        )

        # Synchronize application status (remains scheduled)
        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.SCHEDULED,
            actor_user_id=current_user["user_id"],
        )

        # Update in synced calendars
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
                    provider.update_event(
                        event_id=event_id,
                        start_time=reschedule_data.scheduled_start,
                        end_time=reschedule_data.scheduled_end,
                    )
            except CalendarProviderError as e:
                logger.warning(
                    "[MEETING_RESCHEDULE] calendar_update_failed meeting_id=%s provider=%s error=%s",
                    meeting.id, cal_account.provider.value, e,
                )

        # Notify ALL participants including organizer
        all_reschedule_notify_ids = {p.user_id for p in meeting.participants}
        all_reschedule_notify_ids.add(meeting.organizer_user_id)
        MeetingDispatchService.notify_user_ids(
            session=session,
            user_ids=all_reschedule_notify_ids,
            title="Interview Rescheduled",
            message=f"{user_full_name} rescheduled meeting '{meeting.title}'",
            event_type="meeting_rescheduled",
            route=f"/meetings/{meeting.id}",
        )

        # Send emails to ALL participants including organizer
        email_service = MeetingEmailService(queue_mode=True)
        for uid in all_reschedule_notify_ids:
            recipient = UserContextService.get_user_by_id_optional(session, uid)
            if recipient:
                try:
                    # Organizer gets a summary confirmation; others get rescheduled notification
                    if uid == current_user["user_id"]:
                        participant_user_objs = [
                            UserContextService.get_user_by_id_optional(session, p.user_id)
                            for p in meeting.participants
                            if p.user_id != uid
                        ]
                        participant_user_objs = [u for u in participant_user_objs if u]
                        email_service.send_organizer_confirmation_email(
                            session=session,
                            meeting=meeting,
                            organizer_user=recipient,
                            participant_users=participant_user_objs,
                        )
                    else:
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
                            cancel_token=cancel_token,
                        )
                except Exception as email_err:
                    logger.warning(
                        "[MEETING_RESCHEDULE] reschedule_email_failed meeting_id=%s recipient_id=%s error=%s",
                        meeting.id, uid, email_err,
                    )

        session.refresh(meeting)
        return meeting
