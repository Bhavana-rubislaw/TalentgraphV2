"""
Lifecycle Worker for TalentGraph
=================================
Runs daily lifecycle checks for jobs and applications

Schedule: Daily at 2 AM UTC
"""

import logging
from datetime import datetime, timezone

from sqlmodel import Session

from app.database import get_session
from app.services.lifecycle_service import run_daily_lifecycle_checks

logger = logging.getLogger(__name__)


class LifecycleWorker:
    """Worker for daily lifecycle automation"""
    
    def __init__(self):
        self.name = "lifecycle_worker"
    
    def run(self):
        """
        Execute daily lifecycle checks
        
        Actions:
        - Check for expiring jobs (3-day warning)
        - Auto-freeze expired jobs
        """
        
        logger.info(f"[{self.name}] Starting daily lifecycle checks at {datetime.now(timezone.utc)}")
        
        try:
            # Get database session
            with next(get_session()) as session:
                run_daily_lifecycle_checks(session)
            
            logger.info(f"[{self.name}] Completed successfully")
            
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
            raise
