"""
Meeting Email Service
=====================
Handles all email communications for meeting lifecycle:
- Scheduling confirmations
- Cancellation notifications
- Reschedule requests and approvals
- Reminder emails
- Tokenized action links
"""

import os
import logging
from datetime import datetime
from typing import Optional
from sqlmodel import Session

from app.models import Meeting, User
from app.services.email_service import SendGridEmailProvider, SMTPEmailProvider

logger = logging.getLogger(__name__)


class MeetingEmailService:
    """Service for sending meeting-related emails"""
    
    def __init__(self):
        # Initialize email provider
        provider_type = os.getenv('EMAIL_PROVIDER', 'sendgrid')
        logger.info(f"[MEETING EMAIL] Initializing with provider: {provider_type}")
        
        if provider_type == 'sendgrid':
            self.provider = SendGridEmailProvider()
            logger.info("[MEETING EMAIL] Using SendGrid provider")
        else:
            self.provider = SMTPEmailProvider()
            logger.info("[MEETING EMAIL] Using SMTP provider")
        
        self.app_url = os.getenv('APP_URL', 'http://localhost:3000')
        logger.info(f"[MEETING EMAIL] App URL: {self.app_url}")
    
    def _get_job_and_company(self, session: Session, meeting: Meeting, organizer_user: User):
        """
        Helper – resolve job_title and company_name from meeting metadata.
        Falls back gracefully if FK data is unavailable.
        """
        from app.models import JobPosting, Company

        job_title = meeting.title  # default fallback
        company_name = organizer_user.full_name  # default fallback

        if meeting.job_posting_id:
            posting = session.get(JobPosting, meeting.job_posting_id)
            if posting:
                job_title = posting.job_title
                company = session.exec(
                    __import__("sqlmodel").select(Company).where(Company.id == posting.company_id)
                ).first()
                if company:
                    company_name = company.company_name

        return job_title, company_name

    def send_interview_scheduled_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        organizer_user: User,
        confirm_token: Optional[str] = None,
        cancel_token: Optional[str] = None,
        reschedule_token: Optional[str] = None
    ) -> None:
        """Send interview scheduled confirmation email — rich branded template."""

        job_title, company_name = self._get_job_and_company(session, meeting, organizer_user)
        recruiter_name = organizer_user.full_name

        # Format date/time
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        timezone_label = meeting.timezone or "UTC"

        subject = f"Interview Scheduled for {job_title} | {company_name}"

        # Action links
        confirm_link = f"{self.app_url}/meetings/token/{confirm_token}/confirm" if confirm_token else ""
        cancel_link = f"{self.app_url}/meetings/token/{cancel_token}/cancel" if cancel_token else ""
        reschedule_link = f"{self.app_url}/meetings/token/{reschedule_token}/reschedule" if reschedule_token else ""

        notes_block = ""
        if meeting.description:
            notes_block = f"""
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin:0 0 28px;">
                    <h3 style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;">
                        📝 Additional Notes
                    </h3>
                    <p style="color:#78350f;font-size:14px;line-height:1.6;margin:0;">{meeting.description}</p>
                </div>"""

        meeting_link_block = ""
        if meeting.video_meeting_url:
            meeting_link_block = (
                f'<div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:8px;padding:18px 20px;margin:0 0 22px;">'
                f'<p style="color:#065f46;font-size:12px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.6px;">&#128279; MEETING LINK</p>'
                f'<a href="{meeting.video_meeting_url}" style="color:#059669;font-weight:600;font-size:13px;word-break:break-all;text-decoration:none;">'
                f'{meeting.video_meeting_url}</a>'
                f'</div>'
            )

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%);padding:44px 32px 36px;text-align:center;">
        <!-- Calendar icon -->
        <div style="display:inline-block;background:white;border-radius:12px;width:54px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.22);margin:0 auto 20px;vertical-align:top;">
            <div style="background:#6d28d9;height:10px;border-radius:12px 12px 0 0;"></div>
            <div style="text-align:center;font-size:22px;font-weight:800;color:#1e293b;padding:6px 0 5px;line-height:1;">17</div>
        </div>
        <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.3px;display:block;">Interview Scheduled</h1>
        <p style="color:rgba(255,255,255,0.88);margin:0;font-size:14px;display:block;">Your interview has been confirmed</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px 28px;">
        <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">
            Hi <strong style="color:#6d28d9;">{recipient_user.full_name}</strong>,
        </p>
        <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.75;">
            An interview has been scheduled for the <strong style="color:#1e293b;">{job_title}</strong> position
            at <strong style="color:#1e293b;">{company_name}</strong>.<br>
            Your interviewer will be <strong style="color:#1e293b;">{recruiter_name}</strong>.
        </p>

        <!-- Interview Details card -->
        <div style="background:#f8fafc;border-radius:10px;padding:22px 24px;margin:0 0 22px;border-left:4px solid #6d28d9;">
            <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 16px;">&#128203; Interview Details</p>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;width:32%;vertical-align:top;">Position</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">Software Engineer - Full Stack</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Company</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{company_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Date &amp; Time</td>
                    <td style="padding:8px 0;font-weight:700;color:#7c3aed;font-size:14px;">{start_time_str}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Timezone</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{timezone_label}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Interviewer</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{recruiter_name}</td>
                </tr>
            </table>
        </div>

        {meeting_link_block}
        {notes_block}

        <!-- Preparation Tips -->
        <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
            <p style="color:#1e40af;font-size:12px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.6px;">&#128161; PREPARATION TIPS</p>
            <ul style="color:#1e40af;font-size:13px;line-height:1.85;margin:0;padding-left:18px;">
                <li>Test your audio and video 10 minutes before the interview</li>
                <li>Join from a quiet location with good lighting</li>
                <li>Have your resume and portfolio ready to reference</li>
                <li>Prepare questions about the role and company</li>
                <li>Join the meeting 2-3 minutes early</li>
            </ul>
        </div>

        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">We look forward to speaking with you!</p>
        <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0;">
            Best regards,<br>
            <strong style="color:#6d28d9;">The {company_name} Team</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            This interview was scheduled via <strong style="color:#6d28d9;">TalentGraph</strong>.<br>
            Questions? Reply to this email to reach {recruiter_name} directly.
        </p>
    </div>
</div>
</body>
</html>"""

        text_body = (
            f"Interview Scheduled\n\n"
            f"Hi {recipient_user.full_name},\n\n"
            f"An interview has been scheduled for the {job_title} position at {company_name}.\n"
            f"Your interviewer will be {recruiter_name}.\n\n"
            f"Date & Time: {start_time_str}\n"
            f"Duration: {meeting.duration_minutes} minutes\n"
            f"Timezone: {timezone_label}\n"
            + (f"Meeting Link: {meeting.video_meeting_url}\n" if meeting.video_meeting_url else "")
            + (f"\nNotes: {meeting.description}\n" if meeting.description else "")
            + f"\nView full details: {self.app_url}/meetings/{meeting.id}\n"
        )

        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            logger.info(f"✓ Interview scheduled email sent to {recipient_user.email} for meeting: {meeting.title}")
        except Exception as e:
            logger.error(f"✗ Failed to send interview scheduled email to {recipient_user.email}: {e}", exc_info=True)
    
    def send_interview_cancelled_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        cancelled_by_user: User,
        cancellation_reason: str
    ) -> None:
        """Send interview cancellation email"""
        
        subject = f"Interview Cancelled: {meeting.title}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ef4444;">Interview Cancelled</h2>
                
                <p>Hi {recipient_user.full_name},</p>
                
                <p>{cancelled_by_user.full_name} has cancelled the following interview:</p>
                
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">{meeting.title}</h3>
                    <p style="margin: 10px 0;"><strong>Reason:</strong> {cancellation_reason}</p>
                </div>
                
                <p><a href="{self.app_url}/meetings/{meeting.id}" style="color: #2563eb;">View details in TalentGraph →</a></p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    This is an automated email from TalentGraph.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Interview Cancelled
        
        Hi {recipient_user.full_name},
        
        {cancelled_by_user.full_name} has cancelled the following interview:
        
        {meeting.title}
        Reason: {cancellation_reason}
        
        View details: {self.app_url}/meetings/{meeting.id}
        """
        
        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            logger.info(f"✓ Cancellation email sent to {recipient_user.email} for meeting: {meeting.title}")
        except Exception as e:
            logger.error(f"✗ Failed to send cancellation email to {recipient_user.email}: {e}", exc_info=True)
    
    def send_reschedule_request_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        requester_user: User,
        request_reason: str,
        preferred_times: Optional[str] = None
    ) -> None:
        """Send reschedule request notification to recruiter"""
        
        subject = f"Reschedule Request: {meeting.title}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #f59e0b;">Reschedule Request</h2>
                
                <p>Hi {recipient_user.full_name},</p>
                
                <p>{requester_user.full_name} has requested to reschedule the following interview:</p>
                
                <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">{meeting.title}</h3>
                    <p style="margin: 10px 0;"><strong>Original Time:</strong> {meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")}</p>
                    <p style="margin: 10px 0;"><strong>Reason:</strong> {request_reason}</p>
                    {f'<p style="margin: 10px 0;"><strong>Preferred Times:</strong> {preferred_times}</p>' if preferred_times else ''}
                </div>
                
                <p><a href="{self.app_url}/meetings/{meeting.id}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Review and Respond →</a></p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    This is an automated email from TalentGraph.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Reschedule Request
        
        Hi {recipient_user.full_name},
        
        {requester_user.full_name} has requested to reschedule the following interview:
        
        {meeting.title}
        Original Time: {meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")}
        Reason: {request_reason}
        {f'Preferred Times: {preferred_times}' if preferred_times else ''}
        
        Review and respond: {self.app_url}/meetings/{meeting.id}
        """
        
        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            logger.info(f"✓ Reschedule request email sent to {recipient_user.email} for meeting: {meeting.title}")
        except Exception as e:
            logger.error(f"✗ Failed to send reschedule request email to {recipient_user.email}: {e}", exc_info=True)
    
    def _build_rescheduled_html(
        self,
        recipient_user: User,
        changer_user: User,
        meeting: Meeting,
        action_verb: str,
        confirm_link: str,
        cancel_link: str,
    ) -> str:
        """Shared HTML builder for reschedule / edit notification emails (simple pic-2 style)."""
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        timezone_label = meeting.timezone or "UTC"
        meetings_url = f"{self.app_url}/meetings"

        meeting_link_row = ""
        if meeting.video_meeting_url:
            meeting_link_row = (
                f'<p style="margin:10px 0;"><strong>Meeting Link:</strong> '
                f'<a href="{meeting.video_meeting_url}" style="color:#2563eb;">'
                f'{meeting.video_meeting_url}</a></p>'
            )

        notes_para = ""
        if meeting.description:
            notes_para = f'<p style="margin:20px 0;font-style:italic;color:#475569;">{meeting.description}</p>'

        confirm_btn = (
            f'<a href="{confirm_link}" style="display:inline-block;background:#10b981;color:white;'
            f'padding:10px 22px;text-decoration:none;border-radius:6px;font-weight:600;margin:5px 6px 5px 0;">'
            f'Confirm Attendance</a>'
        ) if confirm_link else ""

        cancel_btn = (
            f'<a href="{cancel_link}" style="display:inline-block;background:#ef4444;color:white;'
            f'padding:10px 22px;text-decoration:none;border-radius:6px;font-weight:600;margin:5px;">'
            f'Cancel Interview</a>'
        ) if cancel_link else ""

        return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background-color:#f8fafc;line-height:1.6;color:#333;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px;">

    <h2 style="color:#f59e0b;margin:0 0 20px;">🔄 Interview Rescheduled</h2>

    <p style="margin:0 0 12px;">Hi {recipient_user.full_name},</p>

    <p style="margin:0 0 20px;">{changer_user.full_name} has {action_verb} your interview. Please review the updated details below.</p>

    <div style="background:#f3f4f6;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin:0 0 20px;">
        <h3 style="margin:0 0 14px;color:#1f2937;font-size:16px;">{meeting.title}</h3>
        <p style="margin:10px 0;"><strong>New Date &amp; Time:</strong>
            <span style="color:#f59e0b;font-weight:700;">{start_time_str}</span></p>
        <p style="margin:10px 0;"><strong>Duration:</strong> {meeting.duration_minutes} minutes</p>
        <p style="margin:10px 0;"><strong>Timezone:</strong> {timezone_label}</p>
        {meeting_link_row}
    </div>

    {notes_para}

    <div style="margin:24px 0;">
        <p style="font-weight:600;margin:0 0 12px;">Quick Actions:</p>
        {confirm_btn}
        {cancel_btn}
    </div>

    <p style="margin:28px 0 0;">
        <a href="{meetings_url}" style="color:#2563eb;font-weight:600;">
            View updated details in TalentGraph Meetings →
        </a>
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;">
    <p style="font-size:12px;color:#6b7280;margin:0;">
        This is an automated notification from <strong>TalentGraph</strong>.
    </p>
</div>
</body>
</html>"""

    def send_reschedule_approved_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        approver_user: User,
        confirm_token: Optional[str] = None,
        cancel_token: Optional[str] = None
    ) -> None:
        """Send email when recruiter reschedules a meeting to a new time."""

        subject = f"Interview Rescheduled: {meeting.title}"
        confirm_link = f"{self.app_url}/meetings/token/{confirm_token}/confirm" if confirm_token else ""
        cancel_link = f"{self.app_url}/meetings/token/{cancel_token}/cancel" if cancel_token else ""

        html_body = self._build_rescheduled_html(
            recipient_user=recipient_user,
            changer_user=approver_user,
            meeting=meeting,
            action_verb="rescheduled",
            confirm_link=confirm_link,
            cancel_link=cancel_link,
        )

        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        text_body = (
            f"Interview Rescheduled\n\n"
            f"Hi {recipient_user.full_name},\n\n"
            f"{approver_user.full_name} has rescheduled your interview.\n\n"
            f"{meeting.title}\n"
            f"New Date & Time: {start_time_str}\n"
            f"Duration: {meeting.duration_minutes} minutes\n"
            f"Timezone: {meeting.timezone or 'UTC'}\n"
            + (f"Meeting Link: {meeting.video_meeting_url}\n" if meeting.video_meeting_url else "")
            + (f"\n{confirm_link}\n" if confirm_link else "")
            + (f"{cancel_link}\n" if cancel_link else "")
            + f"\nView updated details: {self.app_url}/meetings\n"
        )

        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            logger.info(f"✓ Reschedule approved email sent to {recipient_user.email} for meeting: {meeting.title}")
        except Exception as e:
            logger.error(f"✗ Failed to send reschedule approved email to {recipient_user.email}: {e}", exc_info=True)

    def send_meeting_updated_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        editor_user: User,
        confirm_token: Optional[str] = None,
        cancel_token: Optional[str] = None
    ) -> None:
        """Send email when a recruiter edits an existing meeting (time or details changed)."""

        subject = f"Interview Updated: {meeting.title}"
        confirm_link = f"{self.app_url}/meetings/token/{confirm_token}/confirm" if confirm_token else ""
        cancel_link = f"{self.app_url}/meetings/token/{cancel_token}/cancel" if cancel_token else ""

        html_body = self._build_rescheduled_html(
            recipient_user=recipient_user,
            changer_user=editor_user,
            meeting=meeting,
            action_verb="updated the details of",
            confirm_link=confirm_link,
            cancel_link=cancel_link,
        )

        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        text_body = (
            f"Interview Updated\n\n"
            f"Hi {recipient_user.full_name},\n\n"
            f"{editor_user.full_name} has updated the details of your scheduled interview.\n\n"
            f"{meeting.title}\n"
            f"Date & Time: {start_time_str}\n"
            f"Duration: {meeting.duration_minutes} minutes\n"
            f"Timezone: {meeting.timezone or 'UTC'}\n"
            + (f"Meeting Link: {meeting.video_meeting_url}\n" if meeting.video_meeting_url else "")
            + f"\nView updated details: {self.app_url}/meetings\n"
        )

        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            logger.info(f"✓ Meeting updated email sent to {recipient_user.email} for meeting: {meeting.title}")
        except Exception as e:
            logger.error(f"✗ Failed to send meeting updated email to {recipient_user.email}: {e}", exc_info=True)
