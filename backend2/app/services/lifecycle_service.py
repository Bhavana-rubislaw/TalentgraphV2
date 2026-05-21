"""
Lifecycle Service for TalentGraph
==================================
Automated lifecycle actions for jobs and applications

Features:
- Job expiry warnings (3 days before end_date)
- Auto-freeze expired jobs
- Reopened job notifications to previous applicants
- Meeting reminders

Should be run daily by lifecycle worker
"""

import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from sqlmodel import Session, select

from app.models import (
    JobPosting, Application, Meeting, Candidate,
    User, Company, MeetingStatus, JobPostingStatus
)
from app.services.email_service import EmailService
from app.services.analytics_service import AnalyticsService, AnalyticsEventType

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# LIFECYCLE SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class LifecycleService:
    """Service for automated lifecycle actions"""
    
    def __init__(self):
        self.email_service = EmailService()
        self.analytics_service = AnalyticsService()
    
    def check_expiring_jobs(self, session: Session, warning_days: int = 3) -> int:
        """
        Check for jobs expiring soon and send warnings
        
        Args:
            session: Database session
            warning_days: Days before expiry to send warning
        
        Returns:
            Number of warnings sent
        """
        
        logger.info(f"Checking for jobs expiring in {warning_days} days")
        
        cutoff_date = date.today() + timedelta(days=warning_days)
        cutoff_date_str = cutoff_date.isoformat()  # Convert to 'YYYY-MM-DD' string
        
        # Find jobs expiring soon (end_date is stored as VARCHAR)
        expiring_jobs = session.exec(
            select(JobPosting).where(
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.end_date == cutoff_date_str
            )
        ).all()
        
        warnings_sent = 0
        
        for job in expiring_jobs:
            # Get company and recruiter
            company = session.get(Company, job.company_id)
            if not company:
                continue
            
            recruiter = session.get(User, company.user_id)
            if not recruiter:
                continue
            
            # Determine recipients based on urgency
            recipients = []
            
            if warning_days == 1:
                # Urgent - send to Admin and HR (fallback to recruiter if none)
                admin_hr_companies = session.exec(
                    select(Company).where(
                        Company.company_name == company.company_name,
                        Company.employee_type.in_(["Admin", "HR"])
                    )
                ).all()
                
                for company_user in admin_hr_companies:
                    user = session.get(User, company_user.user_id)
                    if user and user.email:
                        recipients.append(user.email)
                
                # If no Admin/HR users, send to recruiter as fallback
                if not recipients and recruiter.email:
                    recipients = [recruiter.email]
                    logger.info(f"Job {job.id} expires in 1 day - no Admin/HR found, notifying recruiter {recruiter.email}")
                else:
                    logger.info(f"Job {job.id} expires in 1 day - notifying {len(recipients)} admin/HR staff")
            else:
                # Normal warning - send to recruiter who posted it
                recipients = [recruiter.email]
            
            # Send warning emails
            for recipient_email in recipients:
                try:
                    self.email_service.send_email(
                        to_email=recipient_email,
                        subject=f"{'URGENT: ' if warning_days == 1 else ''}Job Posting Expiring Soon: {job.job_title}",
                        html_content=self._generate_expiry_warning_html(job, warning_days),
                        plain_content=f"Your job posting '{job.job_title}' will expire in {warning_days} day{'s' if warning_days > 1 else ''}. Please extend or renew it."
                    )
                    
                    warnings_sent += 1
                    logger.info(f"Sent {warning_days}-day expiry warning for job {job.id} to {recipient_email}")
                    
                except Exception as e:
                    logger.error(f"Failed to send expiry warning for job {job.id} to {recipient_email}: {e}")
        
        logger.info(f"Sent {warnings_sent} expiry warnings")
        return warnings_sent
    
    def auto_freeze_expired_jobs(self, session: Session) -> int:
        """
        Auto-freeze jobs past their end_date
        
        Args:
            session: Database session
        
        Returns:
            Number of jobs frozen
        """
        
        logger.info("Checking for expired jobs to freeze")
        
        today = date.today()
        today_str = today.isoformat()  # Convert to 'YYYY-MM-DD' string
        
        # Find expired active jobs (end_date is stored as VARCHAR)
        expired_jobs = session.exec(
            select(JobPosting).where(
                JobPosting.status == JobPostingStatus.ACTIVE,
                JobPosting.end_date < today_str
            )
        ).all()
        
        frozen_count = 0
        
        for job in expired_jobs:
            # Freeze job
            job.status = JobPostingStatus.FROZEN
            session.add(job)
            
            # Track analytics event
            self.analytics_service.track_event(
                session=session,
                company_id=job.company_id,
                event_type=AnalyticsEventType.JOB_EXPIRED,
                job_posting_id=job.id,
                metadata={"reason": "auto_freeze", "end_date": str(job.end_date)}
            )
            
            # Get recruiter for notification
            company = session.get(Company, job.company_id)
            if company:
                recruiter = session.get(User, company.user_id)
                if recruiter:
                    try:
                        self.email_service.send_email(
                            to_email=recruiter.email,
                            subject=f"Job Posting Expired: {job.job_title}",
                            html_content=self._generate_expired_notification_html(job),
                            plain_content=f"Your job posting '{job.job_title}' has expired and been closed. You can reopen it anytime."
                        )
                    except Exception as e:
                        logger.error(f"Failed to send expired notification for job {job.id}: {e}")
            
            frozen_count += 1
            logger.info(f"Froze expired job {job.id}")
        
        session.commit()
        
        logger.info(f"Froze {frozen_count} expired jobs")
        return frozen_count
    
    def notify_reopened_jobs(self, session: Session, job_id: int) -> int:
        """
        Notify previous applicants when job is reopened
        
        Args:
            session: Database session
            job_id: Job that was reopened
        
        Returns:
            Number of notifications sent
        """
        
        logger.info(f"Notifying previous applicants for reopened job {job_id}")
        
        job = session.get(JobPosting, job_id)
        if not job:
            logger.warning(f"Job {job_id} not found")
            return 0
        
        if job.status not in [JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED]:
            logger.warning(f"Job {job_id} is not active")
            return 0
        
        # Get previous applications (not hired, not rejected)
        applications = session.exec(
            select(Application).where(
                Application.job_posting_id == job_id,
                Application.status.in_(["applied", "screening", "interviewing"])
            )
        ).all()
        
        notifications_sent = 0
        
        for application in applications:
            candidate = session.get(Candidate, application.candidate_id)
            if not candidate or not candidate.email:
                continue
            
            try:
                self.email_service.send_email(
                    to_email=candidate.email,
                    subject=f"Job Reopened: {job.job_title}",
                    html_content=self._generate_reopened_job_html(job, candidate),
                    plain_content=f"Good news! The job '{job.job_title}' has been reopened. Your previous application is still active."
                )
                
                # Track analytics event
                self.analytics_service.track_event(
                    session=session,
                    company_id=job.company_id,
                    event_type=AnalyticsEventType.EMAIL_SENT,
                    job_posting_id=job.id,
                    candidate_id=candidate.id,
                    metadata={"email_type": "job_reopened"}
                )
                
                notifications_sent += 1
                logger.info(f"Notified candidate {candidate.id} about reopened job {job.id}")
                
            except Exception as e:
                logger.error(f"Failed to notify candidate {candidate.id}: {e}")
        
        logger.info(f"Sent {notifications_sent} reopened job notifications")
        return notifications_sent
    
    def send_interview_reminders(self, session: Session, hours_before: int = 24) -> int:
        """
        Send interview reminders
        
        Args:
            session: Database session
            hours_before: Hours before meeting to send reminder
        
        Returns:
            Number of reminders sent
        """
        
        logger.info(f"Sending interview reminders for meetings in {hours_before} hours")
        
        # Calculate time window
        now = datetime.now(timezone.utc)
        start_window = now + timedelta(hours=hours_before - 1)
        end_window = now + timedelta(hours=hours_before + 1)
        
        # Find upcoming meetings
        meetings = session.exec(
            select(Meeting).where(
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.scheduled_start >= start_window,
                Meeting.scheduled_start <= end_window
            )
        ).all()
        
        reminders_sent = 0
        
        for meeting in meetings:
            # Check if reminder already sent (could track in meeting model)
            # For now, just send
            
            # Get candidate
            candidate = session.get(Candidate, meeting.candidate_id)
            if not candidate or not candidate.email:
                continue
            
            # Get job
            job = session.get(JobPosting, meeting.job_posting_id)
            if not job:
                continue
            
            try:
                self.email_service.send_interview_reminder(
                    to_email=candidate.email,
                    candidate_name=f"{candidate.first_name} {candidate.last_name}",
                    job_title=job.job_title,
                    meeting_time=meeting.scheduled_start,
                    meeting_location=meeting.location or "Virtual",
                    meeting_link=meeting.meeting_link
                )
                
                reminders_sent += 1
                logger.info(f"Sent reminder for meeting {meeting.id} to {candidate.email}")
                
            except Exception as e:
                logger.error(f"Failed to send reminder for meeting {meeting.id}: {e}")
        
        logger.info(f"Sent {reminders_sent} interview reminders")
        return reminders_sent
    
    def cleanup_old_events(self, session: Session, days_to_keep: int = 365) -> int:
        """
        Clean up old analytics events (after aggregation)
        
        Args:
            session: Database session
            days_to_keep: Keep events for this many days
        
        Returns:
            Number of events deleted
        """
        
        logger.info(f"Cleaning up analytics events older than {days_to_keep} days")
        
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # This is destructive, so be careful
        # In production, consider archiving instead of deleting
        
        # For now, just log - actual deletion would be:
        # deleted = session.exec(
        #     delete(AnalyticsEvent).where(AnalyticsEvent.event_time < cutoff)
        # )
        
        logger.info("Event cleanup disabled for safety - implement archival strategy first")
        return 0
    
    # ═══════════════════════════════════════════════════════════════════════
    # EMAIL TEMPLATES
    # ═══════════════════════════════════════════════════════════════════════
    
    def _generate_expiry_warning_html(self, job: JobPosting, days: int) -> str:
        """Generate HTML for expiry warning email"""
        
        # Use urgent styling for 1-day warnings
        is_urgent = days == 1
        header_bg = "#f8d7da" if is_urgent else "#fff3cd"  # Red for urgent, yellow for normal
        header_title = "URGENT: Job Posting Expires Tomorrow!" if is_urgent else "Job Posting Expiring Soon"
        urgency_text = "<p style='color: #dc3545; font-weight: bold;'>⚠️ URGENT: This job expires TOMORROW. Immediate action required!</p>" if is_urgent else ""
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: {header_bg}; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
                .info-box {{ background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; 
                            margin: 20px 0; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>⏰ {header_title}</h2>
            </div>
            
            {urgency_text}
            
            <p>Hi,</p>
            
            <p>Your job posting <strong>{job.job_title}</strong> will expire in <strong>{days} day{'s' if days > 1 else ''}</strong>.</p>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>Job Title:</strong> {job.job_title}</p>
                <p style="margin: 10px 0 0 0;"><strong>Expiry Date:</strong> {job.end_date}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                If no action is taken, this job posting will be automatically closed on {job.end_date}.
            </p>
        </body>
        </html>
        """
    
    def _generate_expired_notification_html(self, job: JobPosting) -> str:
        """Generate HTML for expired job notification"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f8d7da; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
                .info-box {{ background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; 
                            margin: 20px 0; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📋 Job Posting Expired</h2>
            </div>
            
            <p>Hi,</p>
            
            <p>Your job posting <strong>{job.job_title}</strong> has expired and been automatically closed.</p>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>Job Title:</strong> {job.job_title}</p>
                <p style="margin: 10px 0 0 0;"><strong>Expiry Date:</strong> {job.end_date}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                This job posting is no longer accepting applications.
            </p>
        </body>
        </html>
        """
    
    def _generate_reopened_job_html(self, job: JobPosting, candidate: Candidate) -> str:
        """Generate HTML for reopened job notification to candidates"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
                .button {{ background: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block; 
                          margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🎉 Job Reopened!</h2>
            </div>
            
            <p>Hi {candidate.first_name},</p>
            
            <p>Good news! The job posting <strong>{job.job_title}</strong> has been reopened.</p>
            
            <p>Your previous application is still active and under consideration. 
               No action is needed from you at this time.</p>
            
            <a href="{os.getenv('FRONTEND_URL', 'https://talentgraph.com')}/jobs/{job.id}" class="button">
                View Job Details
            </a>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                We'll keep you updated on your application status.
            </p>
        </body>
        </html>
        """


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

import os

def run_daily_lifecycle_checks(session: Session):
    """
    Run all daily lifecycle checks
    
    Should be called by lifecycle worker
    """
    service = LifecycleService()
    
    logger.info("=== Starting Daily Lifecycle Checks ===")
    
    # Check expiring jobs (3 days warning)
    warnings_3day = service.check_expiring_jobs(session, warning_days=3)
    
    # Check expiring jobs (1 day warning - URGENT to Admin/HR)
    warnings_1day = service.check_expiring_jobs(session, warning_days=1)
    
    # Auto-freeze expired jobs
    frozen = service.auto_freeze_expired_jobs(session)
    
    logger.info(f"=== Daily Lifecycle Complete: {warnings_3day} 3-day warnings, {warnings_1day} urgent 1-day warnings, {frozen} frozen ===")


def run_hourly_reminders(session: Session):
    """
    Run hourly reminder checks
    
    Should be called by reminder worker
    """
    service = LifecycleService()
    
    logger.info("=== Starting Hourly Reminder Checks ===")
    
    # Send 24-hour interview reminders
    reminders = service.send_interview_reminders(session, hours_before=24)
    
    logger.info(f"=== Hourly Reminders Complete: {reminders} sent ===")
