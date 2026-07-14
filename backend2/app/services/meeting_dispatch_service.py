# """Reusable dispatch helpers for meeting notifications and emails."""

# import logging
# from typing import Iterable

# from sqlmodel import Session

# from app.routers.notifications import push_notification
# from app.services.meeting_email_service import MeetingEmailService
# from app.services.user_context_service import UserContextService

# logger = logging.getLogger(__name__)


# class MeetingDispatchService:
#     @staticmethod
#     def notify_user_ids(
#         *,
#         session: Session,
#         user_ids: Iterable[int],
#         title: str,
#         message: str,
#         event_type: str,
#         route: str,
#     ) -> None:
#         user_ids = list(user_ids)
#         logger.info(
#             f"[MEETING_DISPATCH] notify count={len(user_ids)} event_type={event_type} route={route}"
#         )
#         for uid in user_ids:
#             push_notification(
#                 session=session,
#                 user_id=uid,
#                 title=title,
#                 message=message,
#                 event_type=event_type,
#                 route=route,
#             )

#     @staticmethod
#     def send_cancelled_email_to_user_ids(
#         *,
#         session: Session,
#         meeting,
#         recipient_user_ids: Iterable[int],
#         cancelled_by_user,
#         cancellation_reason: str,
#     ) -> None:
#         recipient_user_ids = list(recipient_user_ids)
#         logger.info(f"[MEETING_DISPATCH] send_cancelled_emails count={len(recipient_user_ids)}")
#         email_service = MeetingEmailService(queue_mode=True)
#         for uid in recipient_user_ids:
#             recipient = UserContextService.get_user_by_id_optional(session, uid)
#             if not recipient:
#                 continue
#             try:
#                 email_service.send_interview_cancelled_email(
#                     session=session,
#                     meeting=meeting,
#                     recipient_user=recipient,
#                     cancelled_by_user=cancelled_by_user,
#                     cancellation_reason=cancellation_reason,
#                 )
#             except Exception as exc:
#                 logger.warning(f"Could not send cancellation email to {uid}: {exc}")

#     @staticmethod
#     def send_reschedule_request_to_organizer(
#         *,
#         session: Session,
#         meeting,
#         organizer,
#         requester_user,
#         requester_name: str,
#         request_reason: str,
#         preferred_times,
#     ) -> None:
#         if not organizer:
#             return

#         logger.info(
#             f"[MEETING_DISPATCH] send_reschedule_request organizer_id={organizer.id} meeting_id={meeting.id}"
#         )

#         push_notification(
#             session=session,
#             user_id=organizer.id,
#             title="Reschedule Request",
#             message=f"{requester_name} requested to reschedule meeting '{meeting.title}'",
#             event_type="meeting_reschedule_requested",
#             route=f"/meetings/{meeting.id}",
#         )

#         email_service = MeetingEmailService(queue_mode=True)
#         preferred_times_str = ", ".join(preferred_times) if preferred_times else None
#         email_service.send_reschedule_request_email(
#             session=session,
#             meeting=meeting,
#             recipient_user=organizer,
#             requester_user=requester_user,
#             request_reason=request_reason,
#             preferred_times=preferred_times_str,
#         )
"""Reusable dispatch helpers for meeting notifications and emails."""

import logging
from typing import Iterable

from sqlmodel import Session

from app.routers.notifications import push_notification
from app.services.meeting_email_service import MeetingEmailService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingDispatchService:
    @staticmethod
    def notify_user_ids(
        *,
        session: Session,
        user_ids: Iterable[int],
        title: str,
        message: str,
        event_type: str,
        route: str,
    ) -> None:
        user_ids = list(user_ids)
        logger.info(
            "[MEETING_DISPATCH] notify count=%s event_type=%s route=%s",
            len(user_ids), event_type, route,
        )
        for uid in user_ids:
            push_notification(
                session=session,
                user_id=uid,
                title=title,
                message=message,
                event_type=event_type,
                route=route,
            )

    @staticmethod
    def send_cancelled_email_to_user_ids(
        *,
        session: Session,
        meeting,
        recipient_user_ids: Iterable[int],
        cancelled_by_user,
        cancellation_reason: str,
    ) -> None:
        recipient_user_ids = list(recipient_user_ids)
        logger.info(
            "[MEETING_DISPATCH] send_cancelled_emails meeting_id=%s count=%s",
            meeting.id, len(recipient_user_ids),
        )
        email_service = MeetingEmailService(queue_mode=True)
        for uid in recipient_user_ids:
            recipient = UserContextService.get_user_by_id_optional(session, uid)
            if not recipient:
                continue
            try:
                email_service.send_interview_cancelled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    cancelled_by_user=cancelled_by_user,
                    cancellation_reason=cancellation_reason,
                )
            except Exception as exc:
                logger.warning(
                    "[MEETING_DISPATCH] cancellation_email_failed meeting_id=%s recipient_id=%s error=%s",
                    meeting.id, uid, exc,
                )

    @staticmethod
    def send_reschedule_request_to_organizer(
        *,
        session: Session,
        meeting,
        organizer,
        requester_user,
        requester_name: str,
        request_reason: str,
        preferred_times,
    ) -> None:
        if not organizer:
            return

        logger.info(
            "[MEETING_DISPATCH] send_reschedule_request meeting_id=%s organizer_id=%s",
            meeting.id, organizer.id,
        )

        push_notification(
            session=session,
            user_id=organizer.id,
            title="Reschedule Request",
            message=f"{requester_name} requested to reschedule meeting '{meeting.title}'",
            event_type="meeting_reschedule_requested",
            route=f"/meetings/{meeting.id}",
        )

        email_service = MeetingEmailService(queue_mode=True)
        preferred_times_str = ", ".join(preferred_times) if preferred_times else None
        email_service.send_reschedule_request_email(
            session=session,
            meeting=meeting,
            recipient_user=organizer,
            requester_user=requester_user,
            request_reason=request_reason,
            preferred_times=preferred_times_str,
        )