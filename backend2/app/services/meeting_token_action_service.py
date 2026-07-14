# """Service workflows for tokenized meeting actions (confirm/cancel/reschedule)."""

# import json
# import logging
# from datetime import datetime

# from fastapi import HTTPException
# from sqlalchemy import and_
# from sqlmodel import Session, select

# from app.models import Meeting, MeetingActionToken, MeetingParticipant, MeetingStatus
# from app.services.meeting_dispatch_service import MeetingDispatchService
# from app.services.meeting_email_service import MeetingEmailService
# from app.services.meeting_service import MeetingService
# from app.services.user_context_service import UserContextService

# logger = logging.getLogger(__name__)


# class MeetingTokenActionService:
#     @staticmethod
#     def _get_valid_token_record(session: Session, token: str, action_type: str) -> MeetingActionToken:
#         logger.info(f"[MEETING_TOKEN_ACTION] validate action={action_type}")
#         token_record = session.exec(
#             select(MeetingActionToken).where(
#                 and_(
#                     MeetingActionToken.token == token,
#                     MeetingActionToken.action_type == action_type,
#                     MeetingActionToken.is_used == False,
#                     MeetingActionToken.expires_at > datetime.utcnow(),
#                 )
#             )
#         ).first()
#         if not token_record:
#             raise HTTPException(status_code=404, detail="Invalid or expired token")
#         return token_record

#     @staticmethod
#     def confirm_meeting_via_token(*, token: str, session: Session):
#         logger.info("[MEETING_TOKEN_ACTION] confirm_via_token")
#         token_record = MeetingTokenActionService._get_valid_token_record(session, token, "confirm")

#         meeting = session.get(Meeting, token_record.meeting_id)
#         if not meeting:
#             raise HTTPException(status_code=404, detail="Meeting not found")
#         if meeting.status != MeetingStatus.SCHEDULED:
#             raise HTTPException(status_code=400, detail="Meeting is not scheduled")

#         participant = session.exec(
#             select(MeetingParticipant).where(
#                 and_(
#                     MeetingParticipant.meeting_id == meeting.id,
#                     MeetingParticipant.user_id == token_record.user_id,
#                 )
#             )
#         ).first()
#         if participant:
#             participant.has_confirmed = True
#             participant.confirmed_at = datetime.utcnow()
#             session.add(participant)

#         MeetingService.mark_token_used(session, token_record)

#         user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
#         user_name = user.full_name if user else "Participant"

#         MeetingService.create_timeline_event(
#             session=session,
#             meeting_id=meeting.id,
#             actor_user_id=token_record.user_id,
#             event_type="attendance_confirmed",
#             message=f"{user_name} confirmed attendance",
#         )

#         session.commit()
#         return {
#             "message": "Attendance confirmed successfully",
#             "meeting_id": meeting.id,
#             "redirect_url": f"/meetings/{meeting.id}",
#         }

#     @staticmethod
#     def cancel_meeting_form_via_token(*, token: str, session: Session):
#         logger.info("[MEETING_TOKEN_ACTION] cancel_form_via_token")
#         token_record = MeetingTokenActionService._get_valid_token_record(session, token, "cancel")
#         meeting = session.get(Meeting, token_record.meeting_id)
#         if not meeting:
#             raise HTTPException(status_code=404, detail="Meeting not found")
#         return {
#             "meeting_id": meeting.id,
#             "token": token,
#             "title": meeting.title,
#             "scheduled_start": meeting.scheduled_start.isoformat(),
#             "action": "cancel",
#         }

#     @staticmethod
#     def cancel_meeting_via_token_confirmed(*, token: str, cancel_data, session: Session):
#         logger.info("[MEETING_TOKEN_ACTION] cancel_confirmed_via_token")
#         token_record = MeetingTokenActionService._get_valid_token_record(session, token, "cancel")

#         meeting = session.get(Meeting, token_record.meeting_id)
#         if not meeting or meeting.status == MeetingStatus.CANCELLED:
#             raise HTTPException(status_code=400, detail="Meeting already cancelled or not found")

#         user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
#         if not user:
#             raise HTTPException(status_code=404, detail="User not found")

#         meeting.status = MeetingStatus.CANCELLED
#         meeting.cancelled_at = datetime.utcnow()
#         meeting.cancelled_by_user_id = token_record.user_id
#         meeting.cancellation_reason = cancel_data.cancellation_reason
#         meeting.updated_at = datetime.utcnow()
#         session.add(meeting)

#         MeetingService.mark_token_used(session, token_record)

#         is_organizer = meeting.organizer_user_id == token_record.user_id
#         event_type = "recruiter_cancelled" if is_organizer else "candidate_cancelled"
#         MeetingService.create_timeline_event(
#             session=session,
#             meeting_id=meeting.id,
#             actor_user_id=token_record.user_id,
#             event_type=event_type,
#             message=f"{user.full_name} cancelled the meeting via email: {cancel_data.cancellation_reason}",
#             metadata={"reason": cancel_data.cancellation_reason, "via_email": True},
#         )

#         MeetingService.sync_application_status(
#             session=session,
#             meeting=meeting,
#             new_meeting_status=MeetingStatus.CANCELLED,
#             actor_user_id=token_record.user_id,
#         )

#         session.commit()

#         MeetingService.notify_participants(
#             session=session,
#             meeting=meeting,
#             notification_type="meeting_cancelled",
#             title="Meeting Cancelled",
#             message=f"{user.full_name} cancelled meeting '{meeting.title}': {cancel_data.cancellation_reason}",
#             exclude_user_id=token_record.user_id,
#         )

#         recipient_ids = [p.user_id for p in meeting.participants if p.user_id != token_record.user_id]
#         MeetingDispatchService.send_cancelled_email_to_user_ids(
#             session=session,
#             meeting=meeting,
#             recipient_user_ids=recipient_ids,
#             cancelled_by_user=user,
#             cancellation_reason=cancel_data.cancellation_reason,
#         )

#         return {
#             "message": "Meeting cancelled successfully",
#             "meeting_id": meeting.id,
#         }

#     @staticmethod
#     def reschedule_form_via_token(*, token: str, session: Session):
#         logger.info("[MEETING_TOKEN_ACTION] reschedule_form_via_token")
#         token_record = MeetingTokenActionService._get_valid_token_record(session, token, "reschedule")
#         meeting = session.get(Meeting, token_record.meeting_id)
#         if not meeting:
#             raise HTTPException(status_code=404, detail="Meeting not found")
#         return {
#             "meeting_id": meeting.id,
#             "token": token,
#             "title": meeting.title,
#             "scheduled_start": meeting.scheduled_start.isoformat(),
#             "action": "reschedule",
#         }

#     @staticmethod
#     def reschedule_submit_via_token(*, token: str, request_data, session: Session):
#         logger.info("[MEETING_TOKEN_ACTION] reschedule_submit_via_token")
#         token_record = MeetingTokenActionService._get_valid_token_record(session, token, "reschedule")

#         meeting = session.get(Meeting, token_record.meeting_id)
#         if not meeting or meeting.status != MeetingStatus.SCHEDULED:
#             raise HTTPException(status_code=400, detail="Meeting cannot be rescheduled")

#         user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
#         if not user:
#             raise HTTPException(status_code=404, detail="User not found")

#         meeting.status = MeetingStatus.RESCHEDULE_REQUESTED
#         meeting.reschedule_requested_at = datetime.utcnow()
#         meeting.reschedule_requested_by_user_id = token_record.user_id
#         meeting.reschedule_request_reason = request_data.reason
#         if request_data.preferred_times:
#             meeting.reschedule_request_preferred_times = json.dumps(request_data.preferred_times)
#         meeting.updated_at = datetime.utcnow()
#         session.add(meeting)

#         MeetingService.mark_token_used(session, token_record)

#         event_message = f"{user.full_name} requested to reschedule via email: {request_data.reason}"
#         if request_data.note:
#             event_message += f" ({request_data.note})"

#         MeetingService.create_timeline_event(
#             session=session,
#             meeting_id=meeting.id,
#             actor_user_id=token_record.user_id,
#             event_type="candidate_requested_reschedule",
#             message=event_message,
#             metadata={
#                 "reason": request_data.reason,
#                 "note": request_data.note,
#                 "preferred_times": request_data.preferred_times,
#                 "via_email": True,
#             },
#         )
#         session.commit()

#         organizer = UserContextService.get_user_by_id_optional(session, meeting.organizer_user_id)
#         MeetingDispatchService.send_reschedule_request_to_organizer(
#             session=session,
#             meeting=meeting,
#             organizer=organizer,
#             requester_user=user,
#             requester_name=user.full_name,
#             request_reason=request_data.reason,
#             preferred_times=request_data.preferred_times,
#         )

#         return {
#             "message": "Reschedule request submitted successfully",
#             "meeting_id": meeting.id,
#         }
"""Service workflows for tokenized meeting actions (confirm/cancel/reschedule)."""

import json
import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import and_
from sqlmodel import Session, select

from app.models import Meeting, MeetingActionToken, MeetingParticipant, MeetingStatus
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


def _token_suffix(token: str) -> str:
    return token[-8:] if token else "unknown"


class MeetingTokenActionService:
    @staticmethod
    def _get_valid_token_record(session: Session, token: str, action_type: str) -> MeetingActionToken:
        logger.info(
            "[MEETING_TOKEN_ACTION] validate action=%s token_suffix=%s",
            action_type, _token_suffix(token),
        )
        token_record = session.exec(
            select(MeetingActionToken).where(
                and_(
                    MeetingActionToken.token == token,
                    MeetingActionToken.action_type == action_type,
                    MeetingActionToken.is_used == False,
                    MeetingActionToken.expires_at > datetime.utcnow(),
                )
            )
        ).first()
        if not token_record:
            raise HTTPException(status_code=404, detail="Invalid or expired token")
        return token_record

    @staticmethod
    def confirm_meeting_via_token(*, token: str, session: Session):
        logger.info("[MEETING_TOKEN_ACTION] confirm_via_token token_suffix=%s", _token_suffix(token))
        token_record = MeetingTokenActionService._get_valid_token_record(session, token, "confirm")

        meeting = session.get(Meeting, token_record.meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if meeting.status != MeetingStatus.SCHEDULED:
            raise HTTPException(status_code=400, detail="Meeting is not scheduled")

        participant = session.exec(
            select(MeetingParticipant).where(
                and_(
                    MeetingParticipant.meeting_id == meeting.id,
                    MeetingParticipant.user_id == token_record.user_id,
                )
            )
        ).first()
        if participant:
            participant.has_confirmed = True
            participant.confirmed_at = datetime.utcnow()
            session.add(participant)

        MeetingService.mark_token_used(session, token_record)

        user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
        user_name = user.full_name if user else "Participant"

        MeetingService.create_timeline_event(
            session=session,
            meeting_id=meeting.id,
            actor_user_id=token_record.user_id,
            event_type="attendance_confirmed",
            message=f"{user_name} confirmed attendance",
        )

        session.commit()
        return {
            "message": "Attendance confirmed successfully",
            "meeting_id": meeting.id,
            "redirect_url": f"/meetings/{meeting.id}",
        }

    @staticmethod
    def cancel_meeting_form_via_token(*, token: str, session: Session):
        logger.info("[MEETING_TOKEN_ACTION] cancel_form_via_token token_suffix=%s", _token_suffix(token))
        token_record = MeetingTokenActionService._get_valid_token_record(session, token, "cancel")
        meeting = session.get(Meeting, token_record.meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {
            "meeting_id": meeting.id,
            "token": token,
            "title": meeting.title,
            "scheduled_start": meeting.scheduled_start.isoformat(),
            "action": "cancel",
        }

    @staticmethod
    def cancel_meeting_via_token_confirmed(*, token: str, cancel_data, session: Session):
        logger.info("[MEETING_TOKEN_ACTION] cancel_confirmed_via_token token_suffix=%s", _token_suffix(token))
        token_record = MeetingTokenActionService._get_valid_token_record(session, token, "cancel")

        meeting = session.get(Meeting, token_record.meeting_id)
        if not meeting or meeting.status == MeetingStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Meeting already cancelled or not found")

        user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        meeting.status = MeetingStatus.CANCELLED
        meeting.cancelled_at = datetime.utcnow()
        meeting.cancelled_by_user_id = token_record.user_id
        meeting.cancellation_reason = cancel_data.cancellation_reason
        meeting.updated_at = datetime.utcnow()
        session.add(meeting)

        MeetingService.mark_token_used(session, token_record)

        is_organizer = meeting.organizer_user_id == token_record.user_id
        event_type = "recruiter_cancelled" if is_organizer else "candidate_cancelled"
        MeetingService.create_timeline_event(
            session=session,
            meeting_id=meeting.id,
            actor_user_id=token_record.user_id,
            event_type=event_type,
            message=f"{user.full_name} cancelled the meeting via email: {cancel_data.cancellation_reason}",
            metadata={"reason": cancel_data.cancellation_reason, "via_email": True},
        )

        MeetingService.sync_application_status(
            session=session,
            meeting=meeting,
            new_meeting_status=MeetingStatus.CANCELLED,
            actor_user_id=token_record.user_id,
        )

        session.commit()

        MeetingService.notify_participants(
            session=session,
            meeting=meeting,
            notification_type="meeting_cancelled",
            title="Meeting Cancelled",
            message=f"{user.full_name} cancelled meeting '{meeting.title}': {cancel_data.cancellation_reason}",
            exclude_user_id=token_record.user_id,
        )

        recipient_ids = [p.user_id for p in meeting.participants if p.user_id != token_record.user_id]
        MeetingDispatchService.send_cancelled_email_to_user_ids(
            session=session,
            meeting=meeting,
            recipient_user_ids=recipient_ids,
            cancelled_by_user=user,
            cancellation_reason=cancel_data.cancellation_reason,
        )

        return {
            "message": "Meeting cancelled successfully",
            "meeting_id": meeting.id,
        }

    @staticmethod
    def reschedule_form_via_token(*, token: str, session: Session):
        logger.info("[MEETING_TOKEN_ACTION] reschedule_form_via_token token_suffix=%s", _token_suffix(token))
        token_record = MeetingTokenActionService._get_valid_token_record(session, token, "reschedule")
        meeting = session.get(Meeting, token_record.meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {
            "meeting_id": meeting.id,
            "token": token,
            "title": meeting.title,
            "scheduled_start": meeting.scheduled_start.isoformat(),
            "action": "reschedule",
        }

    @staticmethod
    def reschedule_submit_via_token(*, token: str, request_data, session: Session):
        logger.info("[MEETING_TOKEN_ACTION] reschedule_submit_via_token token_suffix=%s", _token_suffix(token))
        token_record = MeetingTokenActionService._get_valid_token_record(session, token, "reschedule")

        meeting = session.get(Meeting, token_record.meeting_id)
        if not meeting or meeting.status != MeetingStatus.SCHEDULED:
            raise HTTPException(status_code=400, detail="Meeting cannot be rescheduled")

        user = UserContextService.get_user_by_id_optional(session, token_record.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        meeting.status = MeetingStatus.RESCHEDULE_REQUESTED
        meeting.reschedule_requested_at = datetime.utcnow()
        meeting.reschedule_requested_by_user_id = token_record.user_id
        meeting.reschedule_request_reason = request_data.reason
        if request_data.preferred_times:
            meeting.reschedule_request_preferred_times = json.dumps(request_data.preferred_times)
        meeting.updated_at = datetime.utcnow()
        session.add(meeting)

        MeetingService.mark_token_used(session, token_record)

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
                "via_email": True,
            },
        )
        session.commit()

        organizer = UserContextService.get_user_by_id_optional(session, meeting.organizer_user_id)
        MeetingDispatchService.send_reschedule_request_to_organizer(
            session=session,
            meeting=meeting,
            organizer=organizer,
            requester_user=user,
            requester_name=user.full_name,
            request_reason=request_data.reason,
            preferred_times=request_data.preferred_times,
        )

        return {
            "message": "Reschedule request submitted successfully",
            "meeting_id": meeting.id,
        }
        