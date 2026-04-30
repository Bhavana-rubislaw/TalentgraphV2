"""
Email Template Service for Notification System
Generates branded HTML email templates for various notification types
Matches TalentGraph's existing meeting email styling
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class NotificationEmailTemplates:
    """Centralized email template generation for all notification types"""
    
    # Base email styles matching TalentGraph brand
    BASE_STYLES = {
        "body": "margin: 0; padding: 20px; font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;",
        "container": "max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);",
        "footer": "background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;",
    }
    
    @staticmethod
    def _get_base_template(header_gradient: str, header_emoji: str, header_title: str, header_subtitle: str, body_content: str, footer_note: str = "") -> str:
        """Base template structure used by all email types"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="{NotificationEmailTemplates.BASE_STYLES['body']}">
            <div style="{NotificationEmailTemplates.BASE_STYLES['container']}">
                
                <!-- Header -->
                <div style="background: {header_gradient}; padding: 40px 32px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.15); width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">{header_emoji}</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{header_title}</h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 15px;">{header_subtitle}</p>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 32px;">
                    {body_content}
                </div>
                
                <!-- Footer -->
                <div style="{NotificationEmailTemplates.BASE_STYLES['footer']}">
                    <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                        This notification was sent via <strong style="color: #6d28d9;">TalentGraph</strong>.<br/>
                        {footer_note if footer_note else 'You can manage your notification preferences in your profile settings.'}
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    # ============ CANDIDATE EMAIL TEMPLATES ============
    
    @classmethod
    def application_status_email(cls, candidate_name: str, job_title: str, company_name: str, status: str, message: str = "", action_url: str = "") -> tuple[str, str]:
        """Email for application status updates"""
        subject = f"Application Update: {job_title} at {company_name}"
        
        status_colors = {
            "under_review": ("#3b82f6", "#eff6ff", "#1e40af"),
            "shortlisted": ("#10b981", "#f0fdf4", "#065f46"),
            "interview": ("#8b5cf6", "#f5f3ff", "#5b21b6"),
            "offered": ("#059669", "#ecfdf5", "#047857"),
            "rejected": ("#ef4444", "#fef2f2", "#991b1b"),
        }
        
        color_set = status_colors.get(status, ("#64748b", "#f1f5f9", "#334155"))
        
        action_button = f"""
        <div style="text-align: center; margin: 32px 0;">
            <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);">
                View Application
            </a>
        </div>
        """ if action_url else ""
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #6d28d9;">{candidate_name}</strong>,
        </p>
        
        <div style="background: {color_set[1]}; border-left: 4px solid {color_set[0]}; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
            <h3 style="color: {color_set[2]}; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                Application Status Update
            </h3>
            <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0;">
                Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been updated to:
            </p>
            <p style="color: {color_set[0]}; font-size: 18px; font-weight: 700; margin: 12px 0 0;">
                {status.replace('_', ' ').title()}
            </p>
        </div>
        
        {f'''
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">
                {message}
            </p>
        </div>
        ''' if message else ''}
        
        {action_button}
        
        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
            Best regards,<br/>
            <strong style="color: #6d28d9;">The {company_name} Team</strong>
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #3b82f6, #60a5fa)",
            header_emoji="📬",
            header_title="Application Update",
            header_subtitle=f"Status update for {job_title}",
            body_content=body_content,
            footer_note=f"Questions about your application? Reach out to {company_name} directly."
        )
        
        return subject, html_body
    
    @classmethod
    def application_submitted_email(cls, candidate_name: str, job_title: str, company_name: str, action_url: str = "") -> tuple[str, str]:
        """Email confirmation when candidate submits an application"""
        subject = f"Application Submitted: {job_title} at {company_name}"
        
        action_button = f"""
        <div style="text-align: center; margin: 32px 0;">
            <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);">
                View My Applications
            </a>
        </div>
        """ if action_url else ""
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #6d28d9;">{candidate_name}</strong>,
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 28px; margin: 0 0 28px; border-left: 4px solid #10b981;">
            <div style="text-align: center; margin-bottom: 16px;">
                <span style="font-size: 48px;">✅</span>
            </div>
            <h2 style="color: #1e293b; font-size: 19px; font-weight: 700; margin: 0 0 12px; text-align: center;">
                Application Successfully Submitted!
            </h2>
            <p style="color: #334155; font-size: 15px; margin: 0; text-align: center; line-height: 1.7;">
                Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been received.
            </p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
            <h3 style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                What happens next?
            </h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">
                • The hiring team at {company_name} will review your application<br/>
                • You'll receive an email notification when your application status changes<br/>
                • You can track your application status anytime in your dashboard
            </p>
        </div>
        
        {action_button}
        
        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
            Good luck with your application!<br/>
            <strong style="color: #6d28d9;">The TalentGraph Team</strong>
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #10b981, #34d399)",
            header_emoji="📝",
            header_title="Application Submitted",
            header_subtitle=f"Your application for {job_title}",
            body_content=body_content,
            footer_note=f"You applied for {job_title} at {company_name}."
        )
        
        return subject, html_body
    
    @classmethod
    def match_found_email(cls, candidate_name: str, job_title: str, company_name: str, match_score: int, action_url: str = "") -> tuple[str, str]:
        """Email for new match notifications"""
        subject = f"New Match: {job_title} at {company_name}"
        
        action_button = f"""
        <div style="text-align: center; margin: 32px 0;">
            <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);">
                View Match
            </a>
        </div>
        """ if action_url else ""
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #6d28d9;">{candidate_name}</strong>,
        </p>
        
        <p style="color: #334155; font-size: 15px; margin: 0 0 28px; line-height: 1.7;">
            We've found a great opportunity that matches your profile!
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 28px; margin: 0 0 28px; border-left: 4px solid #10b981;">
            <h2 style="color: #1e293b; font-size: 17px; font-weight: 700; margin: 0 0 20px;">
                ✨ New Match
            </h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 30%;">Position</td>
                    <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{job_title}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Company</td>
                    <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{company_name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Match Score</td>
                    <td style="padding: 10px 0; font-weight: 700; color: #10b981; font-size: 15px;">{match_score}%</td>
                </tr>
            </table>
        </div>
        
        {action_button}
        
        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
            Don't miss out on this opportunity!
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #10b981, #34d399)",
            header_emoji="🎯",
            header_title="Perfect Match Found!",
            header_subtitle="A job that matches your skills and preferences",
            body_content=body_content
        )
        
        return subject, html_body
    
    @classmethod
    def interview_reminder_email(cls, candidate_name: str, job_title: str, company_name: str, interview_time: str, meeting_link: str, hours_until: int) -> tuple[str, str]:
        """Email for interview reminders"""
        subject = f"Reminder: Interview in {hours_until} hours - {job_title}"
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #6d28d9;">{candidate_name}</strong>,
        </p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
            <h3 style="color: #92400e; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                ⏰ Interview Reminder
            </h3>
            <p style="color: #78350f; font-size: 15px; line-height: 1.7; margin: 0;">
                Your interview for <strong>{job_title}</strong> at <strong>{company_name}</strong> is in <strong>{hours_until} hours</strong>.
            </p>
            <p style="color: #92400e; font-size: 16px; font-weight: 700; margin: 12px 0 0;">
                {interview_time}
            </p>
        </div>
        
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
            <h3 style="color: #065f46; font-size: 13px; font-weight: 700; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                🔗 Meeting Link
            </h3>
            <a href="{meeting_link}" style="color: #059669; font-weight: 600; font-size: 14px; word-break: break-all; text-decoration: none; border-bottom: 2px solid #059669;">{meeting_link}</a>
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <h3 style="color: #1e40af; font-size: 13px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                ✅ Pre-Interview Checklist
            </h3>
            <ul style="color: #1e3a8a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Test your audio and video setup</li>
                <li>Find a quiet, well-lit location</li>
                <li>Have your resume ready</li>
                <li>Join 2-3 minutes early</li>
            </ul>
        </div>
        
        <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
            Good luck with your interview!
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #f59e0b, #fbbf24)",
            header_emoji="⏰",
            header_title="Interview Reminder",
            header_subtitle=f"Your interview is coming up soon",
            body_content=body_content
        )
        
        return subject, html_body
    
    @classmethod
    def message_received_email(cls, recipient_name: str, sender_name: str, message_preview: str, action_url: str = "") -> tuple[str, str]:
        """Email for new message notifications"""
        subject = f"New message from {sender_name}"
        
        action_button = f"""
        <div style="text-align: center; margin: 32px 0;">
            <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);">
                View Message
            </a>
        </div>
        """ if action_url else ""
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #6d28d9;">{recipient_name}</strong>,
        </p>
        
        <p style="color: #334155; font-size: 15px; margin: 0 0 24px; line-height: 1.7;">
            You have a new message from <strong>{sender_name}</strong>:
        </p>
        
        <div style="background: #f8fafc; border-left: 4px solid #6d28d9; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0; font-style: italic;">
                "{message_preview}"
            </p>
        </div>
        
        {action_button}
        
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
            Log in to TalentGraph to read the full message and reply.
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #6d28d9, #8b5cf6)",
            header_emoji="💬",
            header_title="New Message",
            header_subtitle=f"From {sender_name}",
            body_content=body_content
        )
        
        return subject, html_body
    
    # ============ RECRUITER EMAIL TEMPLATES ============
    
    @classmethod
    def application_received_email(cls, recruiter_name: str, candidate_name: str, job_title: str, action_url: str = "") -> tuple[str, str]:
        """Email for new application notifications (recruiter)"""
        subject = f"New Application: {candidate_name} for {job_title}"
        
        action_button = f"""
        <div style="text-align: center; margin: 32px 0;">
            <a href="{action_url}" style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                Review Application
            </a>
        </div>
        """ if action_url else ""
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #059669;">{recruiter_name}</strong>,
        </p>
        
        <p style="color: #334155; font-size: 15px; margin: 0 0 28px; line-height: 1.7;">
            You have received a new application for <strong>{job_title}</strong>.
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 28px; margin: 0 0 28px; border-left: 4px solid #10b981;">
            <h2 style="color: #1e293b; font-size: 17px; font-weight: 700; margin: 0 0 16px;">
                📄 Application Details
            </h2>
            <p style="color: #334155; font-size: 15px; margin: 0;">
                <strong>Candidate:</strong> {candidate_name}<br/>
                <strong>Position:</strong> {job_title}
            </p>
        </div>
        
        {action_button}
        
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
            Review the candidate's profile, resume, and application details in your recruiter dashboard.
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #059669, #10b981)",
            header_emoji="📬",
            header_title="New Application Received",
            header_subtitle=f"Candidate applied for {job_title}",
            body_content=body_content
        )
        
        return subject, html_body
    
    @classmethod
    def job_update_email(cls, recruiter_name: str, job_title: str, update_type: str, details: str) -> tuple[str, str]:
        """Email for job posting update notifications"""
        subject = f"Job Update: {job_title} - {update_type}"
        
        update_colors = {
            "frozen": ("#f59e0b", "#fef3c7", "#92400e"),
            "reposted": ("#10b981", "#f0fdf4", "#065f46"),
            "expiring": ("#ef4444", "#fef2f2", "#991b1b"),
        }
        
        color_set = update_colors.get(update_type.lower(), ("#64748b", "#f1f5f9", "#334155"))
        
        body_content = f"""
        <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
            Hi <strong style="color: #059669;">{recruiter_name}</strong>,
        </p>
        
        <div style="background: {color_set[1]}; border-left: 4px solid {color_set[0]}; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
            <h3 style="color: {color_set[2]}; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                Job Posting Update
            </h3>
            <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 0;">
                <strong>{job_title}</strong>
            </p>
            <p style="color: {color_set[0]}; font-size: 17px; font-weight: 700; margin: 12px 0 0;">
                {update_type}
            </p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0;">
                {details}
            </p>
        </div>
        
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
            Manage your job postings in your recruiter dashboard.
        </p>
        """
        
        html_body = cls._get_base_template(
            header_gradient="linear-gradient(135deg, #059669, #10b981)",
            header_emoji="📋",
            header_title="Job Posting Update",
            header_subtitle=f"Update for {job_title}",
            body_content=body_content
        )
        
        return subject, html_body
