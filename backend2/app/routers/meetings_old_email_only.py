"""
Meeting Scheduler API
Handles interview scheduling between recruiters and candidates
"""

import os
import smtplib
from datetime import datetime
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.security import get_current_user
from app.models import User

router = APIRouter(prefix="/meetings", tags=["meetings"])

# Email Configuration (from environment variables)
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@talentgraph.io")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send HTML email using smtplib (Python built-in, no external dependencies)"""
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print(f"[MEETINGS] ⚠️ Email credentials not configured - skipping email to {to_email}")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = MAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM, to_email, msg.as_string())
        
        print(f"[MEETINGS] ✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[MEETINGS] ❌ Failed to send email to {to_email}: {str(e)}")
        return False


# ─── Request/Response Models ──────────────────────────────────────────────────

class ScheduleMeetingRequest(BaseModel):
    candidate_email: str  # Email address
    candidate_name: str
    platform: str  # "teams" or "zoom"
    date: str      # "Mar 15, 2026"
    time: str      # "10:00 AM"
    duration: int  # minutes
    topic: str
    agenda: Optional[str] = ""

class ScheduleMeetingResponse(BaseModel):
    success: bool
    message: str
    candidate_email_sent: bool
    recruiter_email_sent: bool
    meeting_id: Optional[int] = None

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/schedule", response_model=ScheduleMeetingResponse)
async def schedule_meeting(
    request: ScheduleMeetingRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Schedule an interview and send confirmation emails to both parties.
    Only recruiters can schedule meetings.
    """
    
    # Verify user is a recruiter
    if not hasattr(current_user, 'role') or current_user.role.lower() != 'recruiter':
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can schedule interviews"
        )
    
    # Get recruiter name
    recruiter_name = getattr(current_user, 'full_name', None) or \
                     getattr(current_user, 'name', None) or \
                     getattr(current_user, 'email', 'Recruiter')
    
    recruiter_email = getattr(current_user, 'email', None)
    if not recruiter_email:
        raise HTTPException(
            status_code=400,
            detail="Recruiter email not found"
        )
    
    # Determine platform label and branding
    platform_info = {
        "teams": {
            "name": "Microsoft Teams",
            "color": "#5059C9",
            "icon": "💼"
        },
        "zoom": {
            "name": "Zoom",
            "color": "#2D8CFF",
            "icon": "🎥"
        }
    }
    
    platform_data = platform_info.get(request.platform.lower(), {
        "name": "Virtual Meeting",
        "color": "#6d28d9",
        "icon": "📹"
    })
    
    # Create HTML email for CANDIDATE
    candidate_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); padding: 40px 32px; text-align: center;">
                <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                    ✅
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Interview Scheduled!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Your next step in the journey</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi <strong style="color: #1e293b;">{request.candidate_name}</strong>,
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                    Great news! <strong style="color: #6d28d9;">{recruiter_name}</strong> has scheduled an interview with you through TalentGraph.
                </p>
                
                <!-- Meeting Details Card -->
                <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 32px; margin: 0 0 32px; border-left: 6px solid {platform_data['color']};">
                    <h2 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 24px; display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 12px;">{platform_data['icon']}</span>
                        Meeting Details
                    </h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 35%;">📅 Date</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">🕐 Time</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">⏱ Duration</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.duration} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">💻 Platform</td>
                            <td style="padding: 12px 0; font-weight: 700; color: {platform_data['color']}; font-size: 15px;">{platform_data['name']}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">📝 Topic</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.topic}</td>
                        </tr>
                    </table>
                </div>
                
                {f'''
                <!-- Agenda Section -->
                <div style="background: #fefce8; border-left: 4px solid #facc15; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
                    <h3 style="color: #854d0e; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📋 Agenda
                    </h3>
                    <p style="color: #713f12; font-size: 14px; line-height: 1.6; margin: 0;">
                        {request.agenda}
                    </p>
                </div>
                ''' if request.agenda else ''}
                
                <!-- Preparation Tips -->
                <div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
                    <h3 style="color: #065f46; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        💡 Preparation Tips
                    </h3>
                    <ul style="color: #047857; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Test your audio and video setup 10 minutes before</li>
                        <li>Have your resume and portfolio ready to reference</li>
                        <li>Prepare questions about the role and company</li>
                        <li>Join from a quiet, well-lit location</li>
                    </ul>
                </div>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    A calendar invite with the {platform_data['name']} join link will be sent separately. Please make sure to join on time.
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
                    Good luck! 🎉
                </p>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 32px 0 0;">
                    Best regards,<br/>
                    <strong style="color: #6d28d9;">TalentGraph Team</strong>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    This is an automated message from TalentGraph. Please do not reply directly to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create HTML email for RECRUITER (confirmation copy)
    recruiter_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); padding: 40px 32px; text-align: center;">
                <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                    ✅
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Meeting Confirmed</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Interview scheduled successfully</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi <strong style="color: #1e293b;">{recruiter_name}</strong>,
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                    Your interview with <strong style="color: #6d28d9;">{request.candidate_name}</strong> has been scheduled and confirmed.
                </p>
                
                <!-- Meeting Details Card -->
                <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 32px; margin: 0 0 32px; border-left: 6px solid {platform_data['color']};">
                    <h2 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 24px; display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 12px;">{platform_data['icon']}</span>
                        Meeting Summary
                    </h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 35%;">📅 Date</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">🕐 Time</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">⏱ Duration</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.duration} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">👤 Candidate</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.candidate_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">📧 Email</td>
                            <td style="padding: 12px 0; color: #6d28d9; font-size: 14px;">{request.candidate_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">💻 Platform</td>
                            <td style="padding: 12px 0; font-weight: 700; color: {platform_data['color']}; font-size: 15px;">{platform_data['name']}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">📝 Topic</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #1e293b; font-size: 15px;">{request.topic}</td>
                        </tr>
                    </table>
                </div>
                
                {f'''
                <!-- Agenda Section -->
                <div style="background: #fefce8; border-left: 4px solid #facc15; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
                    <h3 style="color: #854d0e; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📋 Agenda
                    </h3>
                    <p style="color: #713f12; font-size: 14px; line-height: 1.6; margin: 0;">
                        {request.agenda}
                    </p>
                </div>
                ''' if request.agenda else ''}
                
                <!-- Next Steps -->
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 32px;">
                    <h3 style="color: #1e40af; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📌 Next Steps
                    </h3>
                    <ul style="color: #1e3a8a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>The candidate has been notified via email</li>
                        <li>A calendar invite will be sent with the meeting link</li>
                        <li>Review the candidate's profile before the meeting</li>
                        <li>Prepare your interview questions</li>
                    </ul>
                </div>
                
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 32px 0 0;">
                    Best regards,<br/>
                    <strong style="color: #6d28d9;">TalentGraph Team</strong>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    This is an automated confirmation from TalentGraph.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send emails (gracefully handles missing credentials)
    candidate_email_sent = send_email(
        to_email=request.candidate_email,
        subject=f"🎉 Interview Scheduled: {request.topic}",
        html_body=candidate_html
    )
    
    recruiter_email_sent = send_email(
        to_email=recruiter_email,
        subject=f"✅ Confirmed: Interview with {request.candidate_name} - {request.date} at {request.time}",
        html_body=recruiter_html
    )
    
    # Determine message based on email send status
    if candidate_email_sent and recruiter_email_sent:
        message = "Meeting scheduled and confirmation emails sent to both parties"
    elif candidate_email_sent or recruiter_email_sent:
        message = "Meeting scheduled, some emails sent"
    else:
        message = "Meeting scheduled (email notifications skipped - SMTP not configured)"
    
    return ScheduleMeetingResponse(
        success=True,
        message=message,
        candidate_email_sent=candidate_email_sent,
        recruiter_email_sent=recruiter_email_sent,
        meeting_id=None  # Could save to DB and return actual ID
    )


@router.get("/test-email-config")
async def test_email_config(current_user: User = Depends(get_current_user)):
    """Test endpoint to verify email configuration"""
    
    return {
        "mail_server": MAIL_SERVER,
        "mail_port": MAIL_PORT,
        "mail_from": MAIL_FROM,
        "credentials_configured": bool(MAIL_USERNAME and MAIL_PASSWORD),
        "mail_username": MAIL_USERNAME[:5] + "***" if MAIL_USERNAME else "Not set"
    }
