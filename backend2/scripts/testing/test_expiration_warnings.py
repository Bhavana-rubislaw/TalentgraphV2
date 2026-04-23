"""
Test the expiration warning system by setting up test jobs and running lifecycle checks
"""

import logging
import sys
from datetime import date, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from sqlmodel import Session, select
from app.models import User, Company, JobPosting, JobPostingStatus
from app.services.lifecycle_service import LifecycleService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_expiration_warnings():
    """Test the expiration warning system"""
    
    with Session(engine) as session:
        logger.info("=" * 80)
        logger.info("TESTING JOB EXPIRATION WARNING SYSTEM")
        logger.info("=" * 80)
        
        # Find Bhavana's jobs
        bhavana_user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        if not bhavana_user:
            logger.error("❌ Bhavana user not found")
            return
        
        bhavana_company = session.exec(
            select(Company).where(Company.user_id == bhavana_user.id)
        ).first()
        
        if not bhavana_company:
            logger.error("❌ Bhavana company not found")
            return
        
        jobs = session.exec(
            select(JobPosting).where(JobPosting.company_id == bhavana_company.id)
        ).all()
        
        logger.info(f"Found {len(jobs)} jobs for Bhavana")
        
        if len(jobs) < 2:
            logger.error("❌ Need at least 2 jobs to test")
            return
        
        # Set up test dates
        today = date.today()
        date_3days = today + timedelta(days=3)
        date_1day = today + timedelta(days=1)
        
        logger.info(f"\nToday: {today.isoformat()}")
        logger.info(f"Setting job end dates for testing:")
        logger.info(f"  - Job {jobs[0].id}: {date_3days.isoformat()} (3 days from now - should trigger 3-day warning)")
        logger.info(f"  - Job {jobs[1].id}: {date_1day.isoformat()} (1 day from now - should trigger 1-day urgent warning)")
        
        # Update job 1 to expire in 3 days
        jobs[0].end_date = date_3days.isoformat()
        jobs[0].status = JobPostingStatus.ACTIVE
        session.add(jobs[0])
        
        # Update job 2 to expire in 1 day
        if len(jobs) > 1:
            jobs[1].end_date = date_1day.isoformat()
            jobs[1].status = JobPostingStatus.ACTIVE
            session.add(jobs[1])
        
        session.commit()
        logger.info("✓ Updated job end dates")
        
        # Test the lifecycle service
        logger.info("\n" + "=" * 80)
        logger.info("RUNNING LIFECYCLE CHECKS")
        logger.info("=" * 80)
        
        lifecycle = LifecycleService()
        
        # Check 3-day warnings
        logger.info("\n--- Testing 3-day warnings ---")
        warnings_3day = lifecycle.check_expiring_jobs(session, warning_days=3)
        logger.info(f"✓ Sent {warnings_3day} 3-day warnings")
        
        # Check 1-day warnings
        logger.info("\n--- Testing 1-day warnings ---")
        warnings_1day = lifecycle.check_expiring_jobs(session, warning_days=1)
        logger.info(f"✓ Sent {warnings_1day} 1-day urgent warnings")
        
        # Check auto-freeze (should not affect these jobs)
        logger.info("\n--- Testing auto-freeze ---")
        frozen_count = lifecycle.auto_freeze_expired_jobs(session)
        logger.info(f"✓ Auto-frozen {frozen_count} expired jobs")
        
        logger.info("\n" + "=" * 80)
        logger.info("TEST COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Check bhavana@rubislawinvest.com email for:")
        logger.info(f"  - {warnings_3day} 3-day warning email(s)")
        logger.info(f"  - {warnings_1day} 1-day urgent warning email(s)")
        
        # Verify email service is configured
        import os
        smtp_user = os.getenv("SMTP_USER")
        if smtp_user:
            logger.info(f"\nEmail will be sent from: {smtp_user}")
        else:
            logger.warning("\n⚠️  WARNING: SMTP_USER not configured - emails may not be sent!")

if __name__ == "__main__":
    test_expiration_warnings()
