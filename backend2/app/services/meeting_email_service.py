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
from typing import Optional
from sqlmodel import Session

from app.models import Meeting, User
from app.services.email_service import SendGridEmailProvider, SMTPEmailProvider

logger = logging.getLogger(__name__)


class MeetingEmailService:
    """Service for sending meeting-related emails"""
    
    def __init__(self, queue_mode: bool = False):
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
        # When True, emails are queued in EmailDelivery for async worker delivery
        # instead of being sent synchronously via the provider (blocks ~2-5s per email).
        self.queue_mode = queue_mode
    
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

    def _dispatch(
        self,
        session: Session,
        recipient_user: User,
        event_type: str,
        subject: str,
        html_body: str,
        text_body: str,
        notification_id: Optional[int] = None,
    ) -> None:
        """Send or queue email depending on queue_mode.

        queue_mode=True  → stores EmailDelivery record; async worker sends it (non-blocking).
        queue_mode=False → sends immediately via the configured provider (original behaviour).
        """
        if self.queue_mode:
            from app.workers.email_worker import queue_notification_email
            queue_notification_email(
                session=session,
                user_id=recipient_user.id,
                event_type=event_type,
                recipient_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                notification_id=notification_id,
            )
        else:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )

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

        confirm_btn = (
            f'<a href="{confirm_link}" style="display:inline-block;background:#10b981;color:white;'
            f'padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;'
            f'margin:4px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">&#10003; Confirm Attendance</a>'
        ) if confirm_link else ""

        reschedule_btn = (
            f'<a href="{reschedule_link}" style="display:inline-block;background:#3b82f6;color:white;'
            f'padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;'
            f'margin:4px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">&#8635; Request Reschedule</a>'
        ) if reschedule_link else ""

        cancel_btn = (
            f'<a href="{cancel_link}" style="display:inline-block;background:#ef4444;color:white;'
            f'padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;'
            f'margin:4px;box-shadow:0 2px 8px rgba(239,68,68,0.3);">&#10007; Cancel</a>'
        ) if cancel_link else ""

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
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{job_title}</td>
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

        <!-- Action Buttons -->
        <div style="text-align:center;margin:0 0 28px;">
            <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 14px;">Quick Actions:</p>
            {confirm_btn}
            {reschedule_btn}
            {cancel_btn}
        </div>

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
            self._dispatch(session, recipient_user, "interview_scheduled", subject, html_body, text_body)
            logger.info(f"✓ Interview scheduled email {'queued' if self.queue_mode else 'sent'} for {recipient_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch interview scheduled email to {recipient_user.email}: {e}", exc_info=True)
    
    def send_organizer_confirmation_email(
        self,
        session: Session,
        meeting: Meeting,
        organizer_user: User,
        participant_users: list
    ) -> None:
        """Send confirmation email to the organizer (recruiter) who scheduled the meeting."""

        job_title, company_name = self._get_job_and_company(session, meeting, organizer_user)
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        timezone_label = meeting.timezone or "UTC"
        subject = f"Interview Scheduled: {job_title} | {company_name}"

        participant_names = ", ".join(u.full_name for u in participant_users) if participant_users else "—"

        meeting_link_row = ""
        if meeting.video_meeting_url:
            meeting_link_row = (
                f'<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;width:32%;vertical-align:top;">Meeting Link</td>'
                f'<td style="padding:8px 0;font-size:14px;"><a href="{meeting.video_meeting_url}" style="color:#059669;font-weight:600;word-break:break-all;">{meeting.video_meeting_url}</a></td></tr>'
            )

        notes_row = ""
        if meeting.description:
            notes_row = (
                f'<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Notes</td>'
                f'<td style="padding:8px 0;color:#475569;font-size:14px;">{meeting.description}</td></tr>'
            )

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:44px 32px 36px;text-align:center;">
        <div style="display:inline-block;background:white;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin:0 auto 16px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">&#10003;</div>
        <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.3px;display:block;">Interview Scheduled!</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;display:block;">Your interview has been successfully created</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px 28px;">
        <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">
            Hi <strong style="color:#059669;">{organizer_user.full_name}</strong>,
        </p>
        <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.75;">
            You have successfully scheduled an interview for the <strong style="color:#1e293b;">{job_title}</strong> position
            at <strong style="color:#1e293b;">{company_name}</strong>.
            A confirmation email has been sent to all participants.
        </p>

        <!-- Interview Details card -->
        <div style="background:#f8fafc;border-radius:10px;padding:22px 24px;margin:0 0 22px;border-left:4px solid #10b981;">
            <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 16px;">&#128203; Interview Details</p>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;width:32%;vertical-align:top;">Position</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{job_title}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Company</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{company_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Participants</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{participant_names}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Date &amp; Time</td>
                    <td style="padding:8px 0;font-weight:700;color:#059669;font-size:14px;">{start_time_str}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Duration</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{meeting.duration_minutes} minutes</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Timezone</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{timezone_label}</td>
                </tr>
                {meeting_link_row}
                {notes_row}
            </table>
        </div>

        <div style="text-align:center;margin:0 0 24px;">
            <a href="{self.app_url}/meetings/{meeting.id}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">
                &#128197; View Meeting Details
            </a>
        </div>

        <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0;">
            Best regards,<br>
            <strong style="color:#059669;">The TalentGraph Team</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            This confirmation was sent via <strong style="color:#6d28d9;">TalentGraph</strong>.<br>
            Confirmation emails have been sent to all meeting participants.
        </p>
    </div>
</div>
</body>
</html>"""

        text_body = (
            f"Interview Scheduled Successfully\n\n"
            f"Hi {organizer_user.full_name},\n\n"
            f"You have successfully scheduled an interview for the {job_title} position at {company_name}.\n\n"
            f"Participants: {participant_names}\n"
            f"Date & Time: {start_time_str}\n"
            f"Duration: {meeting.duration_minutes} minutes\n"
            f"Timezone: {timezone_label}\n"
            + (f"Meeting Link: {meeting.video_meeting_url}\n" if meeting.video_meeting_url else "")
            + f"\nView meeting details: {self.app_url}/meetings/{meeting.id}\n"
        )

        try:
            self._dispatch(session, organizer_user, "recruiter_interview_scheduled", subject, html_body, text_body)
            logger.info(f"✓ Organizer confirmation email {'queued' if self.queue_mode else 'sent'} for {organizer_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch organizer confirmation email to {organizer_user.email}: {e}", exc_info=True)

    def send_interview_cancelled_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        cancelled_by_user: User,
        cancellation_reason: str
    ) -> None:
        """Send interview cancellation email"""

        job_title, company_name = self._get_job_and_company(session, meeting, cancelled_by_user)
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        timezone_label = meeting.timezone or "UTC"
        subject = f"Interview Cancelled: {job_title} | {company_name}"

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:44px 32px 36px;text-align:center;">
        <div style="display:inline-block;background:white;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin:0 auto 16px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">&#10007;</div>
        <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.3px;display:block;">Interview Cancelled</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;display:block;">Your scheduled interview has been cancelled</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px 28px;">
        <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">
            Hi <strong style="color:#ef4444;">{recipient_user.full_name}</strong>,
        </p>
        <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.75;">
            <strong style="color:#1e293b;">{cancelled_by_user.full_name}</strong> has cancelled the following interview.
            We apologize for any inconvenience.
        </p>

        <!-- Cancelled Interview Details card -->
        <div style="background:#fef2f2;border-radius:10px;padding:22px 24px;margin:0 0 22px;border-left:4px solid #ef4444;">
            <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 16px;">&#128203; Cancelled Interview</p>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;width:32%;vertical-align:top;">Position</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{job_title}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Company</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{company_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Was Scheduled</td>
                    <td style="padding:8px 0;font-weight:600;color:#dc2626;font-size:14px;">{start_time_str} ({timezone_label})</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Cancelled By</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{cancelled_by_user.full_name}</td>
                </tr>
            </table>
        </div>

        <!-- Cancellation Reason -->
        <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
            <p style="color:#9a3412;font-size:12px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.6px;">Reason for Cancellation</p>
            <p style="color:#7c2d12;font-size:14px;line-height:1.6;margin:0;">{cancellation_reason}</p>
        </div>

        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
            If you have any questions, please reach out directly to <strong>{cancelled_by_user.full_name}</strong>.
        </p>
        <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0;">
            Best regards,<br>
            <strong style="color:#6d28d9;">The TalentGraph Team</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            This notification was sent via <strong style="color:#6d28d9;">TalentGraph</strong>.
        </p>
    </div>
</div>
</body>
</html>"""

        text_body = (
            f"Interview Cancelled\n\n"
            f"Hi {recipient_user.full_name},\n\n"
            f"{cancelled_by_user.full_name} has cancelled the following interview:\n\n"
            f"Position: {job_title}\n"
            f"Company: {company_name}\n"
            f"Was Scheduled: {start_time_str} ({timezone_label})\n"
            f"Reason: {cancellation_reason}\n\n"
            f"View details: {self.app_url}/meetings/{meeting.id}\n"
        )

        try:
            self._dispatch(session, recipient_user, "interview_cancelled", subject, html_body, text_body)
            logger.info(f"✓ Cancellation email {'queued' if self.queue_mode else 'sent'} for {recipient_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch cancellation email to {recipient_user.email}: {e}", exc_info=True)
    
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

        job_title, company_name = self._get_job_and_company(session, meeting, recipient_user)
        original_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p")
        timezone_label = meeting.timezone or "UTC"
        subject = f"Reschedule Request: {job_title} | {company_name}"

        preferred_block = ""
        if preferred_times:
            preferred_block = f"""
        <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:18px 20px;margin:0 0 22px;">
            <p style="color:#1e40af;font-size:12px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.6px;">&#128337; Preferred Times Suggested</p>
            <p style="color:#1e3a8a;font-size:14px;line-height:1.6;margin:0;">{preferred_times}</p>
        </div>"""

        html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background-color:#f1f5f9;line-height:1.6;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:44px 32px 36px;text-align:center;">
        <div style="display:inline-block;background:white;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin:0 auto 16px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">&#8635;</div>
        <h1 style="color:white;margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.3px;display:block;">Reschedule Request</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;display:block;">A participant has requested to reschedule</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px 28px;">
        <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">
            Hi <strong style="color:#d97706;">{recipient_user.full_name}</strong>,
        </p>
        <p style="color:#475569;font-size:14px;margin:0 0 28px;line-height:1.75;">
            <strong style="color:#1e293b;">{requester_user.full_name}</strong> has requested to reschedule
            the interview for <strong style="color:#1e293b;">{job_title}</strong> at <strong style="color:#1e293b;">{company_name}</strong>.
        </p>

        <!-- Interview Details card -->
        <div style="background:#fffbeb;border-radius:10px;padding:22px 24px;margin:0 0 22px;border-left:4px solid #f59e0b;">
            <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 16px;">&#128203; Interview Details</p>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;width:32%;vertical-align:top;">Position</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{job_title}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Company</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{company_name}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Current Time</td>
                    <td style="padding:8px 0;font-weight:700;color:#d97706;font-size:14px;">{original_time_str} ({timezone_label})</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#94a3b8;font-size:13px;font-weight:500;vertical-align:top;">Requested By</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:14px;">{requester_user.full_name}</td>
                </tr>
            </table>
        </div>

        <!-- Reason -->
        <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:18px 20px;margin:0 0 22px;">
            <p style="color:#9a3412;font-size:12px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.6px;">Reason for Request</p>
            <p style="color:#7c2d12;font-size:14px;line-height:1.6;margin:0;">{request_reason}</p>
        </div>

        {preferred_block}

        <!-- Action Button -->
        <div style="text-align:center;margin:0 0 24px;">
            <a href="{self.app_url}/meetings/{meeting.id}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">
                Review &amp; Respond &#8594;
            </a>
        </div>

        <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0;">
            Best regards,<br>
            <strong style="color:#6d28d9;">The TalentGraph Team</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            This notification was sent via <strong style="color:#6d28d9;">TalentGraph</strong>.
        </p>
    </div>
</div>
</body>
</html>"""

        text_body = (
            f"Reschedule Request\n\n"
            f"Hi {recipient_user.full_name},\n\n"
            f"{requester_user.full_name} has requested to reschedule the interview.\n\n"
            f"Position: {job_title}\n"
            f"Company: {company_name}\n"
            f"Current Time: {original_time_str} ({timezone_label})\n"
            f"Reason: {request_reason}\n"
            + (f"Preferred Times: {preferred_times}\n" if preferred_times else "")
            + f"\nReview and respond: {self.app_url}/meetings/{meeting.id}\n"
        )

        try:
            self._dispatch(session, recipient_user, "reschedule_requested", subject, html_body, text_body)
            logger.info(f"✓ Reschedule request email {'queued' if self.queue_mode else 'sent'} for {recipient_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch reschedule request email to {recipient_user.email}: {e}", exc_info=True)
    
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
            self._dispatch(session, recipient_user, "interview_rescheduled", subject, html_body, text_body)
            logger.info(f"✓ Reschedule approved email {'queued' if self.queue_mode else 'sent'} for {recipient_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch reschedule approved email to {recipient_user.email}: {e}", exc_info=True)

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
            self._dispatch(session, recipient_user, "meeting_updated", subject, html_body, text_body)
            logger.info(f"✓ Meeting updated email {'queued' if self.queue_mode else 'sent'} for {recipient_user.email} (meeting: {meeting.title})")
        except Exception as e:
            logger.error(f"✗ Failed to dispatch meeting updated email to {recipient_user.email}: {e}", exc_info=True)
