"""
Analytics Worker for TalentGraph
=================================
Runs daily analytics aggregation

Schedule: Daily at 3 AM UTC
"""

import logging
from datetime import datetime, timezone, timedelta, date

from sqlmodel import Session

from app.database import get_session
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


class AnalyticsWorker:
    """Worker for daily analytics aggregation"""
    
    def __init__(self):
        self.name = "analytics_worker"
        self.service = AnalyticsService()
    
    def run(self):
        """
        Execute daily analytics aggregation
        
        Aggregates yesterday's events into rollup table
        """
        
        logger.info(f"[{self.name}] Starting daily analytics aggregation at {datetime.now(timezone.utc)}")
        
        try:
            # Aggregate yesterday's events
            yesterday = date.today() - timedelta(days=1)
            
            with next(get_session()) as session:
                self.service.aggregate_daily(session, yesterday)
            
            logger.info(f"[{self.name}] Completed successfully for {yesterday}")
            
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
            raise
    
    def backfill(self, start_date: date, end_date: date):
        """
        Backfill aggregation for date range
        
        Useful for filling gaps or re-running aggregation
        """
        
        logger.info(f"[{self.name}] Starting backfill from {start_date} to {end_date}")
        
        try:
            with next(get_session()) as session:
                self.service.backfill_aggregation(session, start_date, end_date)
            
            logger.info(f"[{self.name}] Backfill completed")
            
        except Exception as e:
            logger.error(f"[{self.name}] Backfill failed: {e}", exc_info=True)
            raise
