"""
Post-Meeting Worker for TalentGraph
=====================================
Sends post-meeting status reminders and escalations to recruiters/HR
when interviews have ended but the application status hasn't been updated.

Schedule: Hourly (piggybacks on the reminder_worker schedule OR runs standalone)
"""

import logging
from datetime import datetime, timezone

from app.database import get_session
from app.services.lifecycle_service import (
    LifecycleService,
)

logger = logging.getLogger(__name__)


class PostMeetingWorker:
    """
    Worker that monitors completed/past-due interviews and nudges
    recruiters/HR to update the application status.

    Two-stage approach:
      1. First reminder  — sent when meeting.scheduled_end + 30 min has passed
      2. Escalation      — sent when first reminder has been ignored for 48h
    """

    def __init__(self):
        self.name = "post_meeting_worker"

    def run(self):
        """Execute post-meeting reminder and escalation checks"""

        logger.info(
            f"[{self.name}] Starting post-meeting checks at {datetime.now(timezone.utc)}"
        )

        try:
            service = LifecycleService()

            with next(get_session()) as session:
                # Stage 1: first reminder (grace period = 30 min after meeting end)
                reminders = service.send_post_meeting_reminders(session, grace_minutes=30)

                # Stage 2: escalation (48h after first reminder with no action)
                escalations = service.send_post_meeting_escalations(session, escalation_hours=48)

            logger.info(
                f"[{self.name}] Done — {reminders} reminders, {escalations} escalations sent"
            )

        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
            raise
