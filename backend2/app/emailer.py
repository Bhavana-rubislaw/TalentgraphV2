"""
Email service for TalentGraph
Handles SMTP email sending for interview scheduling and notifications
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class EmailConfigError(Exception):
    """Raised when email configuration is missing or invalid"""
    pass


# Load SMTP configuration from environment
# Using dedicated TalentGraph Gmail account for interview scheduling
MAIL_SERVER = os.getenv("SMTP_HOST", os.getenv("MAIL_SERVER", "smtp.gmail.com"))
MAIL_PORT = int(os.getenv("SMTP_PORT", os.getenv("MAIL_PORT", "587")))
MAIL_USERNAME = os.getenv("SMTP_USERNAME", os.getenv("MAIL_USERNAME", ""))
MAIL_PASSWORD = os.getenv("SMTP_PASSWORD", os.getenv("MAIL_PASSWORD", ""))
MAIL_FROM = os.getenv("SMTP_FROM_EMAIL", os.getenv("MAIL_FROM", "talentgraph.interviews@gmail.com"))
MAIL_FROM_NAME = os.getenv("SMTP_FROM_NAME", os.getenv("MAIL_FROM_NAME", "TalentGraph Interviews"))

# Debug logging for email configuration
logger.info(f"[EMAIL CONFIG] MAIL_SERVER: {MAIL_SERVER}")
logger.info(f"[EMAIL CONFIG] MAIL_PORT: {MAIL_PORT}")
logger.info(f"[EMAIL CONFIG] MAIL_USERNAME: {MAIL_USERNAME}")
logger.info(f"[EMAIL CONFIG] MAIL_PASSWORD: {'*' * len(MAIL_PASSWORD) if MAIL_PASSWORD else 'NOT SET'}")
logger.info(f"[EMAIL CONFIG] MAIL_FROM: {MAIL_FROM}")
logger.info(f"[EMAIL CONFIG] MAIL_FROM_NAME: {MAIL_FROM_NAME}")


def validate_email_config() -> bool:
    """Check if email credentials are configured"""
    return bool(MAIL_USERNAME and MAIL_PASSWORD)


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    cc_emails: Optional[List[str]] = None,
    reply_to: Optional[str] = None
) -> bool:
    """
    Send an HTML email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        html_body: HTML content of the email
        from_email: Optional custom from address
        from_name: Optional custom from name
        cc_emails: Optional list of CC recipient addresses
        reply_to: Optional Reply-To email address
        
    Returns:
        True if sent successfully, False otherwise
        
    Raises:
        EmailConfigError: If SMTP credentials are not configured
    """
    if not validate_email_config():
        logger.warning(f"[EMAIL] Email credentials not configured - cannot send to {to_email}")
        logger.warning(f"[EMAIL] MAIL_USERNAME: {MAIL_USERNAME}, MAIL_PASSWORD: {'SET' if MAIL_PASSWORD else 'NOT SET'}")
        raise EmailConfigError("SMTP credentials not configured")
    
    logger.info(f"[EMAIL] Starting email send to {to_email}")
    logger.info(f"[EMAIL] CC: {cc_emails if cc_emails else 'None'}")
    logger.info(f"[EMAIL] Reply-To: {reply_to if reply_to else 'None'}")
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{from_name or MAIL_FROM_NAME} <{from_email or MAIL_FROM}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add CC recipients if provided
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # Add Reply-To header if provided
        if reply_to:
            msg['Reply-To'] = reply_to
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Prepare recipient list (To + CC)
        recipients = [to_email]
        if cc_emails:
            recipients.extend(cc_emails)
        
        logger.info(f"[EMAIL] Connecting to SMTP server {MAIL_SERVER}:{MAIL_PORT}")
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            logger.info(f"[EMAIL] Starting TLS")
            server.starttls()
            logger.info(f"[EMAIL] Logging in with username: {MAIL_USERNAME}")
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            logger.info(f"[EMAIL] Sending email to {recipients}")
            server.sendmail(from_email or MAIL_FROM, recipients, msg.as_string())
        
        logger.info(f"[EMAIL] ✅ Sent to {to_email}" + (f" (CC: {', '.join(cc_emails)})" if cc_emails else "") + f": {subject}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"[EMAIL] ❌ SMTP Authentication failed for {MAIL_USERNAME}: {str(e)}")
        logger.error(f"[EMAIL] Check that SMTP_PASSWORD is a valid Gmail App Password")
        raise
    except smtplib.SMTPException as e:
        logger.error(f"[EMAIL] ❌ SMTP error sending to {to_email}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"[EMAIL] ❌ Failed to send to {to_email}: {str(e)}")
        logger.error(f"[EMAIL] Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"[EMAIL] Traceback: {traceback.format_exc()}")
        raise


def send_interview_schedule_email(
    candidate_email: str,
    candidate_name: str,
    recruiter_name: str,
    recruiter_email: str,
    company_name: str,
    job_title: str,
    interview_datetime: str,
    timezone: str,
    meeting_link: str,
    notes: Optional[str] = None,
    custom_subject: Optional[str] = None
) -> bool:
    """
    Send interview schedule emails to candidate and recruiter (separate emails with different content)
    
    Sends TWO separate emails:
    1. To Candidate: Interview invitation with preparation tips (Reply-To: recruiter)
    2. To Recruiter: Confirmation with candidate details and reminders
    
    Both emails are sent from TalentGraph dedicated Gmail account.
    
    Args:
        candidate_email: Candidate's email address
        candidate_name: Candidate's full name
        recruiter_name: Recruiter's name
        recruiter_email: Recruiter's email address
        company_name: Company name
        job_title: Job position title
        interview_datetime: Interview date and time (e.g., "March 20, 2026 at 10:30 AM")
        timezone: Timezone (e.g., "EST", "America/New_York")
        meeting_link: Video meeting link (Teams, Zoom, Google Meet, etc.)
        notes: Optional additional notes from recruiter
        custom_subject: Optional custom email subject (for candidate email only)
        
    Returns:
        True if BOTH emails sent successfully, False otherwise
    """
    
    subject = custom_subject or f"Interview Invitation | {job_title} | {company_name}"
    
    # Professional email template matching TalentGraph brand
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); padding: 40px 32px; text-align: center;">
                <div style="background: rgba(255,255,255,0.15); width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px;">📅</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Interview Scheduled</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 15px;">Your interview has been confirmed</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 32px;">
                <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
                    Hi <strong style="color: #6d28d9;">{candidate_name}</strong>,
                </p>
                
                <p style="color: #334155; font-size: 15px; margin: 0 0 32px; line-height: 1.7;">
                    An interview has been scheduled for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.<br/>
                    Your interviewer will be <strong>{recruiter_name}</strong>.
                </p>
                
                <!-- Interview Details Card -->
                <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px; padding: 28px; margin: 0 0 28px; border-left: 4px solid #6d28d9;">
                    <h2 style="color: #1e293b; font-size: 17px; font-weight: 700; margin: 0 0 20px;">
                        📋 Interview Details
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
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Date & Time</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #6d28d9; font-size: 15px;">{interview_datetime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Timezone</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{timezone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Interviewer</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{recruiter_name}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Meeting Link -->
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #065f46; font-size: 13px; font-weight: 700; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔗 Meeting Link
                    </h3>
                    <a href="{meeting_link}" style="color: #059669; font-weight: 600; font-size: 14px; word-break: break-all; text-decoration: none; border-bottom: 2px solid #059669;">{meeting_link}</a>
                </div>
                
                {f'''
                <!-- Notes Section -->
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #92400e; font-size: 13px; font-weight: 700; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📝 Additional Notes
                    </h3>
                    <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                        {notes}
                    </p>
                </div>
                ''' if notes else ''}
                
                <!-- Preparation Tips -->
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #1e40af; font-size: 13px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        💡 Preparation Tips
                    </h3>
                    <ul style="color: #1e3a8a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Test your audio and video 10 minutes before the interview</li>
                        <li>Join from a quiet location with good lighting</li>
                        <li>Have your resume and portfolio ready to reference</li>
                        <li>Prepare questions about the role and company</li>
                        <li>Join the meeting 2-3 minutes early</li>
                    </ul>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
                    We look forward to speaking with you!
                </p>
                
                <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 28px 0 0;">
                    Best regards,<br/>
                    <strong style="color: #6d28d9;">The {company_name} Team</strong>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                    This interview was scheduled via <strong style="color: #6d28d9;">TalentGraph</strong>.<br/>
                    Questions? Reply to this email to reach {recruiter_name} directly.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Recruiter email template - confirmation/summary focused
    recruiter_subject = f"✓ Interview Scheduled: {candidate_name} for {job_title}"
    recruiter_html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 32px; text-align: center;">
                <div style="background: rgba(255,255,255,0.15); width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px;">✓</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Interview Confirmed</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 15px;">Your interview has been scheduled successfully</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 32px;">
                <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">
                    Hi <strong style="color: #059669;">{recruiter_name}</strong>,
                </p>
                
                <p style="color: #334155; font-size: 15px; margin: 0 0 32px; line-height: 1.7;">
                    Your interview with <strong>{candidate_name}</strong> for the <strong>{job_title}</strong> position has been scheduled and confirmed. The candidate has been notified via email.
                </p>
                
                <!-- Interview Details Card -->
                <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 28px; margin: 0 0 28px; border-left: 4px solid #059669;">
                    <h2 style="color: #1e293b; font-size: 17px; font-weight: 700; margin: 0 0 20px;">
                        📋 Interview Details
                    </h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 35%;">Candidate</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #059669; font-size: 15px;">{candidate_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Candidate Email</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 14px;">{candidate_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Position</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{job_title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Company</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{company_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Date & Time</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #059669; font-size: 15px;">{interview_datetime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 600;">Timezone</td>
                            <td style="padding: 10px 0; font-weight: 600; color: #1e293b; font-size: 15px;">{timezone}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Meeting Link -->
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #1e40af; font-size: 13px; font-weight: 700; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔗 Meeting Link
                    </h3>
                    <a href="{meeting_link}" style="color: #2563eb; font-weight: 600; font-size: 14px; word-break: break-all; text-decoration: none; border-bottom: 2px solid #2563eb;">{meeting_link}</a>
                    <p style="color: #475569; font-size: 13px; margin: 10px 0 0;">Share this link with the candidate if needed</p>
                </div>
                
                {f'''
                <!-- Notes Section -->
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #92400e; font-size: 13px; font-weight: 700; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📝 Notes Sent to Candidate
                    </h3>
                    <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
                        {notes}
                    </p>
                </div>
                ''' if notes else ''}
                
                <!-- Reminder -->
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
                    <h3 style="color: #991b1b; font-size: 13px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ⏰ Reminders
                    </h3>
                    <ul style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Add this interview to your calendar</li>
                        <li>Review the candidate's application before the interview</li>
                        <li>Test your meeting link 10 minutes prior</li>
                        <li>Prepare interview questions and materials</li>
                    </ul>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.7; margin: 24px 0 0;">
                    The candidate will receive this information at <strong>{candidate_email}</strong> and can reply directly to you.
                </p>
                
                <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 28px 0 0;">
                    Good luck with your interview!<br/>
                    <strong style="color: #059669;">The TalentGraph Team</strong>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                    Interview scheduled via <strong style="color: #059669;">TalentGraph</strong>.<br/>
                    Manage your interviews at <a href="https://talentgraph.com/dashboard" style="color: #059669; text-decoration: none;">talentgraph.com/dashboard</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email to candidate
    candidate_sent = send_email(
        to_email=candidate_email,
        subject=subject,
        html_body=html_body,
        reply_to=recruiter_email
    )
    
    # Send separate confirmation email to recruiter
    recruiter_sent = send_email(
        to_email=recruiter_email,
        subject=recruiter_subject,
        html_body=recruiter_html_body
    )
    
    # Return True only if both emails sent successfully
    return candidate_sent and recruiter_sent
