"""
Email Gateway — TalentGraph V2
================================
Single, stable entry point for all outbound email dispatch.

WHY THIS EXISTS
---------------
Previously email was sent from four different places with four different retry
strategies and potential for duplicate delivery:
  1. app/emailer.py               – low-level SMTP wrapper (direct/blocking)
  2. app/services/meeting_email_service.py – meeting templates (blocking, per-participant)
  3. app/services/notification_service.py  – via queue_notification_email (async)
  4. app/services/lifecycle_service.py     – job expiry notifications (mixed)

The gateway standardises on async queued delivery for all caller-initiated
emails, eliminating request-time blocking and duplicate sends.

USAGE
-----
    from app.services.email_gateway import EmailGateway

    # Meeting flows (router handlers) — non-blocking, returns immediately
    EmailGateway.send_meeting_emails(session, meeting, participants, organizer)

    # Single targeted email
    EmailGateway.queue_single(session, user, event_type, subject, html_body)

BEHAVIOUR
---------
- Delegates to MeetingEmailService(queue_mode=True) for meeting emails.
- Calls queue_notification_email() directly for ad-hoc emails.
- All emails land in EmailDelivery table; the async email_worker delivers them.
- Idempotency keys prevent duplicate sends on retry.
"""

import logging
from typing import List, Optional

from sqlmodel import Session

from app.models import Meeting, User
from app.services.meeting_email_service import MeetingEmailService
from app.services.meeting_service import MeetingService
from app.workers.email_worker import queue_notification_email

logger = logging.getLogger(__name__)


class EmailGateway:
    """Stateless facade — all methods are classmethods; no instantiation needed."""

    @classmethod
    def send_meeting_scheduled_emails(
        cls,
        session: Session,
        meeting: Meeting,
        participant_user_ids: List[int],
        organizer: User,
    ) -> None:
        """
        Queue interview-scheduled emails to all participants and the organizer.

        Replaces the synchronous MeetingEmailService loop in meetings.py router.
        Emails are stored in EmailDelivery and dispatched by the async worker,
        so the HTTP response is returned immediately regardless of provider latency.
        """
        svc = MeetingEmailService(queue_mode=True)

        for user_id in participant_user_ids:
            recipient = session.get(User, user_id)
            if not recipient:
                continue
            try:
                confirm_token = MeetingService.generate_action_token(session, meeting.id, user_id, "confirm")
                cancel_token = MeetingService.generate_action_token(session, meeting.id, user_id, "cancel")
                reschedule_token = MeetingService.generate_action_token(session, meeting.id, user_id, "reschedule")
                svc.send_interview_scheduled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    organizer_user=organizer,
                    confirm_token=confirm_token,
                    cancel_token=cancel_token,
                    reschedule_token=reschedule_token,
                )
            except Exception as exc:
                logger.error(
                    f"[EMAIL_GATEWAY] Failed to queue scheduled email for user {user_id}: {exc}",
                    exc_info=True,
                )

        # Organizer confirmation (lists all participants)
        try:
            participant_objs = [session.get(User, uid) for uid in participant_user_ids]
            participant_objs = [u for u in participant_objs if u]
            svc.send_organizer_confirmation_email(
                session=session,
                meeting=meeting,
                organizer_user=organizer,
                participant_users=participant_objs,
            )
        except Exception as exc:
            logger.error(
                f"[EMAIL_GATEWAY] Failed to queue organizer confirmation for {organizer.email}: {exc}",
                exc_info=True,
            )

    @classmethod
    def send_meeting_cancelled_emails(
        cls,
        session: Session,
        meeting: Meeting,
        recipient_user_ids: List[int],
        cancelled_by: User,
        cancellation_reason: str,
    ) -> None:
        """Queue cancellation emails to all affected participants."""
        svc = MeetingEmailService(queue_mode=True)
        for user_id in recipient_user_ids:
            recipient = session.get(User, user_id)
            if not recipient:
                continue
            try:
                svc.send_interview_cancelled_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    cancelled_by_user=cancelled_by,
                    cancellation_reason=cancellation_reason,
                )
            except Exception as exc:
                logger.error(
                    f"[EMAIL_GATEWAY] Failed to queue cancellation email for user {user_id}: {exc}",
                    exc_info=True,
                )

    @classmethod
    def send_meeting_updated_emails(
        cls,
        session: Session,
        meeting: Meeting,
        recipient_user_ids: List[int],
        editor: User,
    ) -> None:
        """Queue 'meeting updated' emails when time/details change."""
        svc = MeetingEmailService(queue_mode=True)
        for user_id in recipient_user_ids:
            recipient = session.get(User, user_id)
            if not recipient:
                continue
            try:
                confirm_token = MeetingService.generate_action_token(session, meeting.id, user_id, "confirm")
                cancel_token = MeetingService.generate_action_token(session, meeting.id, user_id, "cancel")
                svc.send_meeting_updated_email(
                    session=session,
                    meeting=meeting,
                    recipient_user=recipient,
                    editor_user=editor,
                    confirm_token=confirm_token,
                    cancel_token=cancel_token,
                )
            except Exception as exc:
                logger.error(
                    f"[EMAIL_GATEWAY] Failed to queue meeting-updated email for user {user_id}: {exc}",
                    exc_info=True,
                )

    @classmethod
    def queue_single(
        cls,
        session: Session,
        recipient: User,
        event_type: str,
        subject: str,
        html_body: str,
        notification_id: Optional[int] = None,
    ) -> None:
        """Queue a single ad-hoc email (e.g. from lifecycle_service or applications router)."""
        try:
            queue_notification_email(
                session=session,
                user_id=recipient.id,
                event_type=event_type,
                recipient_email=recipient.email,
                subject=subject,
                html_body=html_body,
                notification_id=notification_id,
            )
        except Exception as exc:
            logger.error(
                f"[EMAIL_GATEWAY] Failed to queue ad-hoc email for {recipient.email}: {exc}",
                exc_info=True,
            )
