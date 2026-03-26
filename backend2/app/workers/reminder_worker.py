"""
Reminder Worker for TalentGraph
================================
Sends interview reminders hourly

Schedule: Hourly
"""

import logging
from datetime import datetime, timezone

from sqlmodel import Session

from app.database import get_session
from app.services.lifecycle_service import run_hourly_reminders

logger = logging.getLogger(__name__)


class ReminderWorker:
    """Worker for sending interview reminders"""
    
    def __init__(self):
        self.name = "reminder_worker"
    
    def run(self):
        """
        Send interview reminders for meetings in 24 hours
        
        Runs hourly to catch all meetings
        """
        
        logger.info(f"[{self.name}] Starting reminder checks at {datetime.now(timezone.utc)}")
        
        try:
            with next(get_session()) as session:
                run_hourly_reminders(session)
            
            logger.info(f"[{self.name}] Completed successfully")
            
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
            raise
