"""
Debug job expiration warnings for bhavana@rubislaw.com
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def debug_expiry_warnings():
    """Debug why expiry warnings aren't being sent to bhavana@rubislawinvest.com"""
    
    with Session(engine) as session:
        logger.info("=" * 80)
        logger.info("DEBUGGING JOB EXPIRATION WARNINGS FOR bhavana@rubislawinvest.com")
        logger.info("=" * 80)
        
        # Step 1: Find Bhavana's user account
        bhavana_user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        if not bhavana_user:
            logger.error("❌ ERROR: No user found with email bhavana@rubislawinvest.com")
            return
        
        logger.info(f"✓ Found user: {bhavana_user.email} (ID: {bhavana_user.id})")
        
        # Step 2: Find Bhavana's company/companies
        bhavana_companies = session.exec(
            select(Company).where(Company.user_id == bhavana_user.id)
        ).all()
        
        logger.info(f"\n{'=' * 80}")
        logger.info(f"BHAVANA'S COMPANIES ({len(bhavana_companies)} found):")
        logger.info("=" * 80)
        
        for company in bhavana_companies:
            logger.info(f"  - Company ID: {company.id}")
            logger.info(f"    Name: {company.company_name}")
            logger.info(f"    Role: {company.employee_type}")
            logger.info(f"    User ID: {company.user_id}")
            logger.info("")
        
        if not bhavana_companies:
            logger.error("❌ ERROR: No companies found for Bhavana")
            return
        
        company_ids = [c.id for c in bhavana_companies]
        
        # Step 3: Find all jobs posted by Bhavana
        all_jobs = session.exec(
            select(JobPosting).where(JobPosting.company_id.in_(company_ids))
        ).all()
        
        logger.info(f"{'=' * 80}")
        logger.info(f"ALL JOBS FOR BHAVANA ({len(all_jobs)} total):")
        logger.info("=" * 80)
        
        for job in all_jobs:
            logger.info(f"  Job ID {job.id}: {job.job_title}")
            logger.info(f"    Status: {job.status}")
            logger.info(f"    Start Date: {job.start_date}")
            logger.info(f"    End Date: {job.end_date}")
            logger.info(f"    Company ID: {job.company_id}")
            logger.info("")
        
        # Step 4: Check for jobs expiring in 3 days
        today = date.today()
        date_3days = today + timedelta(days=3)
        date_1day = today + timedelta(days=1)
        
        date_3days_str = date_3days.isoformat()
        date_1day_str = date_1day.isoformat()
        
        logger.info(f"{'=' * 80}")
        logger.info("CHECKING EXPIRATION DATES:")
        logger.info("=" * 80)
        logger.info(f"Today: {today.isoformat()}")
        logger.info(f"3-day warning check: {date_3days_str}")
        logger.info(f"1-day warning check: {date_1day_str}")
        logger.info("")
        
        # Jobs expiring in 3 days
        jobs_3day = session.exec(
            select(JobPosting).where(
                JobPosting.company_id.in_(company_ids),
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.end_date == date_3days_str
            )
        ).all()
        
        logger.info(f"JOBS EXPIRING IN 3 DAYS (end_date = {date_3days_str}):")
        if jobs_3day:
            for job in jobs_3day:
                logger.info(f"  ✓ Job {job.id}: {job.job_title}")
                logger.info(f"    Status: {job.status}")
                logger.info(f"    End Date: {job.end_date}")
        else:
            logger.info("  ❌ No jobs found expiring in 3 days")
        logger.info("")
        
        # Jobs expiring in 1 day
        jobs_1day = session.exec(
            select(JobPosting).where(
                JobPosting.company_id.in_(company_ids),
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.end_date == date_1day_str
            )
        ).all()
        
        logger.info(f"JOBS EXPIRING IN 1 DAY (end_date = {date_1day_str}):")
        if jobs_1day:
            for job in jobs_1day:
                logger.info(f"  ✓ Job {job.id}: {job.job_title}")
                logger.info(f"    Status: {job.status}")
                logger.info(f"    End Date: {job.end_date}")
        else:
            logger.info("  ❌ No jobs found expiring in 1 day")
        logger.info("")
        
        # Check for expired jobs (past end_date)
        expired_jobs = session.exec(
            select(JobPosting).where(
                JobPosting.company_id.in_(company_ids),
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.end_date < today.isoformat()
            )
        ).all()
        
        logger.info(f"EXPIRED JOBS (end_date < {today.isoformat()}):")
        if expired_jobs:
            for job in expired_jobs:
                logger.info(f"  ⚠️  Job {job.id}: {job.job_title}")
                logger.info(f"    Status: {job.status}")
                logger.info(f"    End Date: {job.end_date}")
                logger.info(f"    Days overdue: {(today - date.fromisoformat(job.end_date)).days}")
        else:
            logger.info("  ✓ No expired jobs (good!)")
        logger.info("")
        
        # Check all open jobs with future end dates
        logger.info(f"{'=' * 80}")
        logger.info("ALL OPEN JOBS WITH FUTURE END DATES:")
        logger.info("=" * 80)
        
        open_jobs = session.exec(
            select(JobPosting).where(
                JobPosting.company_id.in_(company_ids),
                JobPosting.status == JobPostingStatus.ACTIVE
            )
        ).all()
        
        for job in open_jobs:
            if job.end_date:
                try:
                    end_date = date.fromisoformat(job.end_date)
                    days_until_expiry = (end_date - today).days
                    
                    logger.info(f"  Job {job.id}: {job.job_title}")
                    logger.info(f"    End Date: {job.end_date}")
                    logger.info(f"    Days until expiry: {days_until_expiry}")
                    
                    if days_until_expiry == 3:
                        logger.info(f"    🔔 SHOULD TRIGGER 3-DAY WARNING")
                    elif days_until_expiry == 1:
                        logger.info(f"    🚨 SHOULD TRIGGER 1-DAY URGENT WARNING")
                    elif days_until_expiry < 0:
                        logger.info(f"    ⚠️  EXPIRED - SHOULD BE AUTO-CLOSED")
                    
                    logger.info("")
                except ValueError:
                    logger.warning(f"  Job {job.id}: Invalid end_date format: {job.end_date}")
        
        # Step 5: Check if lifecycle checks are enabled
        import os
        lifecycle_enabled = os.getenv("LIFECYCLE_CHECK_ON_STARTUP", "true").lower() == "true"
        workers_enabled = os.getenv("WORKERS_ENABLED", "false").lower() == "true"
        
        logger.info(f"{'=' * 80}")
        logger.info("SYSTEM CONFIGURATION:")
        logger.info("=" * 80)
        logger.info(f"LIFECYCLE_CHECK_ON_STARTUP: {lifecycle_enabled}")
        logger.info(f"WORKERS_ENABLED: {workers_enabled}")
        logger.info("")
        
        # Summary
        logger.info(f"{'=' * 80}")
        logger.info("SUMMARY:")
        logger.info("=" * 80)
        logger.info(f"Total jobs for Bhavana: {len(all_jobs)}")
        logger.info(f"Active jobs: {len([j for j in all_jobs if j.status == JobPostingStatus.ACTIVE])}")
        logger.info(f"Jobs expiring in 3 days: {len(jobs_3day)}")
        logger.info(f"Jobs expiring in 1 day: {len(jobs_1day)}")
        logger.info(f"Expired jobs still open: {len(expired_jobs)}")
        logger.info("")
        
        if not jobs_3day and not jobs_1day:
            logger.info("❌ NO JOBS CURRENTLY DUE FOR EXPIRATION WARNINGS")
            logger.info("")
            logger.info("POSSIBLE REASONS:")
            logger.info("1. No jobs have end_date exactly 3 or 1 days from today")
            logger.info("2. Job end dates may be too far in the future")
            logger.info("3. Jobs may have already passed their warning dates")
            logger.info("")
            logger.info("RECOMMENDATION:")
            logger.info("- To test, create or update a job with end_date = {date_3days_str} or {date_1day_str}")
            logger.info("- Make sure the job status is 'open'")
            logger.info("- Then restart the backend to trigger lifecycle checks")

if __name__ == "__main__":
    debug_expiry_warnings()
