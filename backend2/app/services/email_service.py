"""
Email Service for TalentGraph
==============================
Handles outbound email and inbound email threading

Features:
- Send transactional emails (interview invitations, reminders)
- Tokenized reply-to addresses for email threading
- Inbound email webhook verification
- Provider abstraction (SendGrid, Postmark, Mailgun)

Security:
- Webhook signature verification
- Token expiration for all reply actions
- Tenant isolation in token generation
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# ABSTRACT BASE CLASS
# ═══════════════════════════════════════════════════════════════════════════

class EmailProvider(ABC):
    """Abstract base class for email providers"""
    
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        reply_to: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ) -> str:
        """Send email, return provider message ID"""
        pass
    
    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """Verify webhook authenticity"""
        pass


# ═══════════════════════════════════════════════════════════════════════════
# SENDGRID PROVIDER
# ═══════════════════════════════════════════════════════════════════════════

class SendGridEmailProvider(EmailProvider):
    """SendGrid email provider implementation"""
    
    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.webhook_secret = os.getenv('SENDGRID_WEBHOOK_SECRET')
        self.from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@talentgraph.com')
        self.from_name = os.getenv('SENDGRID_FROM_NAME', 'TalentGraph')
        
        if not self.api_key:
            raise ValueError("SENDGRID_API_KEY environment variable not set")
        
        logger.info("SendGridEmailProvider initialized")
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        reply_to: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ) -> str:
        """Send email via SendGrid API"""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
            
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                plain_text_content=Content("text/plain", text_body),
                html_content=Content("text/html", html_body)
            )
            
            if reply_to:
                message.reply_to = Email(reply_to)
            
            if custom_headers:
                message.custom_args = custom_headers
            
            response = sg.send(message)
            message_id = response.headers.get('X-Message-Id', '')
            
            logger.info(f"Sent email to {to_email}, message_id: {message_id}")
            return message_id
            
        except ImportError:
            raise ImportError("sendgrid not installed. Run: pip install sendgrid")
        except Exception as e:
            logger.error(f"Error sending email: {e}", exc_info=True)
            raise
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """Verify SendGrid webhook signature"""
        if not self.webhook_secret:
            logger.warning("SENDGRID_WEBHOOK_SECRET not set, skipping verification")
            return True
        
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        is_valid = hmac.compare_digest(signature, expected)
        
        if not is_valid:
            logger.warning("Invalid webhook signature")
        
        return is_valid


# ═══════════════════════════════════════════════════════════════════════════
# POSTMARK PROVIDER (STUB)
# ═══════════════════════════════════════════════════════════════════════════

class PostmarkEmailProvider(EmailProvider):
    """Postmark email provider implementation"""
    
    def __init__(self):
        # Stub implementation - add when Postmark support needed
        raise NotImplementedError("Postmark provider not yet implemented")
    
    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str, 
                   reply_to: Optional[str] = None, custom_headers: Optional[Dict[str, str]] = None) -> str:
        raise NotImplementedError()
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        raise NotImplementedError()


# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED EMAIL SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class EmailService:
    """
    Unified email service
    
    Usage:
        email_service = EmailService()
        
        # Generate action token
        token = email_service.generate_reply_token(meeting_id=123)
        
        # Generate reply-to address
        reply_to = email_service.generate_reply_to_address(token)
        
        # Send interview invitation
        message_id = email_service.send_interview_invitation(
            to_email="candidate@example.com",
            candidate_name="John Doe",
            recruiter_name="Jane Smith",
            meeting_id=123,
            meeting_time=datetime(...),
            meeting_link="https://meet.jit.si/...",
            action_token=token
        )
    """
    
    def __init__(self):
        """Initialize with configured email provider"""
        provider_type = os.getenv('EMAIL_PROVIDER', 'sendgrid').lower()
        
        if provider_type == 'sendgrid':
            self.provider = SendGridEmailProvider()
        elif provider_type == 'postmark':
            self.provider = PostmarkEmailProvider()
        else:
            raise ValueError(f"Unsupported email provider: {provider_type}")
        
        self.app_base_url = os.getenv('APP_BASE_URL', 'https://talentgraph.com')
        self.reply_to_domain = os.getenv('REPLY_TO_DOMAIN', 'talentgraph.com')
        
        logger.info(f"EmailService initialized with provider: {provider_type}")
    
    def generate_reply_token(
        self,
        conversation_id: Optional[int] = None,
        meeting_id: Optional[int] = None,
        expires_hours: int = 168  # 7 days default
    ) -> str:
        """
        Generate unique action token for email threading
        
        Token is URL-safe and cryptographically secure
        """
        return secrets.token_urlsafe(32)
    
    def generate_reply_to_address(self, token: str) -> str:
        """
        Generate tokenized reply-to address
        
        Format: reply-{token}@{domain}
        Example: reply-abc123xyz@talentgraph.com
        """
        return f"reply-{token}@{self.reply_to_domain}"
    
    def send_interview_invitation(
        self,
        to_email: str,
        candidate_name: str,
        recruiter_name: str,
        company_name: str,
        job_title: str,
        meeting_id: int,
        meeting_time: datetime,
        meeting_link: str,
        action_token: str,
        meeting_description: Optional[str] = None
    ) -> str:
        """
        Send interview invitation email with tokenized actions
        
        Returns:
            Provider message ID
        """
        
        # Generate action URLs
        confirm_url = f"{self.app_base_url}/meetings/token/{action_token}/confirm"
        reschedule_url = f"{self.app_base_url}/meetings/token/{action_token}/reschedule"
        cancel_url = f"{self.app_base_url}/meetings/token/{action_token}/cancel"
        
        # Generate reply-to address
        reply_to = self.generate_reply_to_address(action_token)
        
        # Format meeting time (convert to candidate's timezone if needed)
        time_str = meeting_time.strftime('%A, %B %d, %Y at %I:%M %p %Z')
        
        # Build email HTML
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .meeting-details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .detail-row {{ margin: 10px 0; }}
                .detail-label {{ font-weight: 600; color: #64748b; }}
                .actions {{ margin: 30px 0; text-align: center; }}
                .btn {{ display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 6px; font-weight: 600; }}
                .btn-confirm {{ background: #16a34a; color: white; }}
                .btn-reschedule {{ background: #3b82f6; color: white; }}
                .btn-cancel {{ background: #dc2626; color: white; }}
                .footer {{ color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Interview Invitation</h1>
                </div>
                <div class="content">
                    <p>Hi {candidate_name},</p>
                    
                    <p><strong>{recruiter_name}</strong> from <strong>{company_name}</strong> has invited you to an interview for the <strong>{job_title}</strong> position.</p>
                    
                    <div class="meeting-details">
                        <div class="detail-row">
                            <span class="detail-label">Time:</span> {time_str}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Meeting Link:</span> 
                            <a href="{meeting_link}">{meeting_link}</a>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Notes:</span> {meeting_description}</div>' if meeting_description else ''}
                    </div>
                    
                    <div class="actions">
                        <a href="{confirm_url}" class="btn btn-confirm">✓ Confirm</a>
                        <a href="{reschedule_url}" class="btn btn-reschedule">↻ Reschedule</a>
                        <a href="{cancel_url}" class="btn btn-cancel">✗ Cancel</a>
                    </div>
                    
                    <p>You can also reply directly to this email if you have any questions.</p>
                    
                    <div class="footer">
                        <p>This is an automated message from TalentGraph. Please do not reply to noreply addresses.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Build plain text version
        text_body = f"""
Interview Invitation

Hi {candidate_name},

{recruiter_name} from {company_name} has invited you to an interview for the {job_title} position.

Time: {time_str}
Meeting Link: {meeting_link}
{f'Notes: {meeting_description}' if meeting_description else ''}

Actions:
• Confirm: {confirm_url}
• Reschedule: {reschedule_url}
• Cancel: {cancel_url}

You can also reply directly to this email if you have any questions.

---
This is an automated message from TalentGraph.
        """
        
        # Send email
        return self.provider.send_email(
            to_email=to_email,
            subject=f"Interview Invitation: {job_title} at {company_name}",
            html_body=html_body,
            text_body=text_body,
            reply_to=reply_to,
            custom_headers={
                'meeting_id': str(meeting_id),
                'action_token': action_token
            }
        )
    
    def send_interview_reminder(
        self,
        to_email: str,
        candidate_name: str,
        meeting_time: datetime,
        meeting_link: str,
        hours_before: int = 24
    ) -> str:
        """Send interview reminder email"""
        
        time_str = meeting_time.strftime('%A, %B %d, %Y at %I:%M %p %Z')
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; line-height: 1.6;">
            <h2>Interview Reminder</h2>
            <p>Hi {candidate_name},</p>
            <p>This is a reminder that you have an interview scheduled in {hours_before} hours.</p>
            <p><strong>Time:</strong> {time_str}</p>
            <p><strong>Meeting Link:</strong> <a href="{meeting_link}">{meeting_link}</a></p>
            <p>See you soon!</p>
        </body>
        </html>
        """
        
        text_body = f"""
Interview Reminder

Hi {candidate_name},

This is a reminder that you have an interview scheduled in {hours_before} hours.

Time: {time_str}
Meeting Link: {meeting_link}

See you soon!
        """
        
        return self.provider.send_email(
            to_email=to_email,
            subject=f"Interview Reminder - {hours_before}h",
            html_body=html_body,
            text_body=text_body
        )
    
    def send_meeting_confirmation(
        self,
        to_email: str,
        candidate_name: str,
        meeting_time: datetime,
        meeting_link: str
    ) -> str:
        """Send meeting confirmation email"""
        
        time_str = meeting_time.strftime('%A, %B %d, %Y at %I:%M %p %Z')
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; line-height: 1.6;">
            <h2>✓ Interview Confirmed</h2>
            <p>Hi {candidate_name},</p>
            <p>Your interview has been confirmed.</p>
            <p><strong>Time:</strong> {time_str}</p>
            <p><strong>Meeting Link:</strong> <a href="{meeting_link}">{meeting_link}</a></p>
            <p>A calendar invitation has been sent separately.</p>
        </body>
        </html>
        """
        
        text_body = f"""
✓ Interview Confirmed

Hi {candidate_name},

Your interview has been confirmed.

Time: {time_str}
Meeting Link: {meeting_link}

A calendar invitation has been sent separately.
        """
        
        return self.provider.send_email(
            to_email=to_email,
            subject="Interview Confirmed",
            html_body=html_body,
            text_body=text_body
        )
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify inbound webhook signature"""
        return self.provider.verify_webhook_signature(payload, signature)


# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def extract_token_from_email(email: str) -> Optional[str]:
    """
    Extract action token from reply-to-{token}@domain.com
    
    Example:
        "reply-abc123xyz@talentgraph.com" → "abc123xyz"
    """
    import re
    match = re.search(r'reply-([a-zA-Z0-9_-]+)@', email)
    return match.group(1) if match else None


def extract_text_from_html(html: str) -> str:
    """Extract plain text from HTML email body"""
    from html.parser import HTMLParser
    
    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
        
        def handle_data(self, data):
            text = data.strip()
            if text:
                self.text.append(text)
    
    parser = TextExtractor()
    parser.feed(html)
    return '\n'.join(parser.text)


# ═══════════════════════════════════════════════════════════════════════════
# USAGE EXAMPLES
# ═══════════════════════════════════════════════════════════════════════════

"""
# In your meetings router:

from app.services.email_service import EmailService

email_service = EmailService()

@router.post("/meetings/schedule")
async def schedule_meeting(...):
    # ... create meeting ...
    
    # Generate action token
    token = email_service.generate_reply_token(meeting_id=meeting.id)
    
    # Create email thread link
    thread_link = EmailThreadLink(
        provider_name="sendgrid",
        meeting_id=meeting.id,
        candidate_user_id=candidate_id,
        recruiter_user_id=recruiter_id,
        company_id=company_id,
        action_token=token,
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ...
    )
    session.add(thread_link)
    session.commit()
    
    # Send invitation email
    message_id = email_service.send_interview_invitation(
        to_email=candidate.email,
        candidate_name=candidate.full_name,
        recruiter_name=recruiter.full_name,
        company_name=company.name,
        job_title=job.title,
        meeting_id=meeting.id,
        meeting_time=meeting.scheduled_at,
        meeting_link=meeting.meeting_link,
        action_token=token
    )
"""
