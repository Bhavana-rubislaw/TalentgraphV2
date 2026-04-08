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
from datetime import datetime
from typing import Optional
from sqlmodel import Session

from app.models import Meeting, User
from app.services.email_service import SendGridEmailProvider, SMTPEmailProvider


class MeetingEmailService:
    """Service for sending meeting-related emails"""
    
    def __init__(self):
        # Initialize email provider
        provider_type = os.getenv('EMAIL_PROVIDER', 'sendgrid')
        
        if provider_type == 'sendgrid':
            self.provider = SendGridEmailProvider()
        else:
            self.provider = SMTPEmailProvider()
        
        self.app_url = os.getenv('APP_URL', 'http://localhost:3000')
    
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
        """Send interview scheduled confirmation email"""
        
        # Format time display
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p %Z")
        
        subject = f"Interview Scheduled: {meeting.title}"
        
        # Build action links
        confirm_link = f"{self.app_url}/meetings/token/{confirm_token}/confirm" if confirm_token else ""
        cancel_link = f"{self.app_url}/meetings/token/{cancel_token}/cancel" if cancel_token else ""
        reschedule_link = f"{self.app_url}/meetings/token/{reschedule_token}/reschedule" if reschedule_token else ""
        meeting_link = f"{self.app_url}/meetings/{meeting.id}"
        
        # HTML email body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Interview Scheduled</h2>
                
                <p>Hi {recipient_user.full_name},</p>
                
                <p>{organizer_user.full_name} has scheduled an interview with you.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">{meeting.title}</h3>
                    <p style="margin: 10px 0;"><strong>Date & Time:</strong> {start_time_str}</p>
                    <p style="margin: 10px 0;"><strong>Duration:</strong> {meeting.duration_minutes} minutes</p>
                    <p style="margin: 10px 0;"><strong>Timezone:</strong> {meeting.timezone}</p>
                    {f'<p style="margin: 10px 0;"><strong>Meeting Link:</strong> <a href="{meeting.video_meeting_url}">{meeting.video_meeting_url}</a></p>' if meeting.video_meeting_url else ''}
                    {f'<p style="margin: 10px 0;"><strong>Location:</strong> {meeting.location}</p>' if meeting.location else ''}
                </div>
                
                {f'<p style="margin: 15px 0;"><em>{meeting.description}</em></p>' if meeting.description else ''}
                
                <div style="margin: 30px 0;">
                    <p><strong>Quick Actions:</strong></p>
                    {f'<a href="{confirm_link}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px 5px 5px 0;">Confirm Attendance</a>' if confirm_link else ''}
                    {f'<a href="{reschedule_link}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">Request Reschedule</a>' if reschedule_link else ''}
                    {f'<a href="{cancel_link}" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">Cancel Interview</a>' if cancel_link else ''}
                </div>
                
                <p><a href="{meeting_link}" style="color: #2563eb;">View full details in TalentGraph →</a></p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    This is an automated email from TalentGraph. Please do not reply directly to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
        Interview Scheduled
        
        Hi {recipient_user.full_name},
        
        {organizer_user.full_name} has scheduled an interview with you.
        
        {meeting.title}
        Date & Time: {start_time_str}
        Duration: {meeting.duration_minutes} minutes
        Timezone: {meeting.timezone}
        {f'Meeting Link: {meeting.video_meeting_url}' if meeting.video_meeting_url else ''}
        {f'Location: {meeting.location}' if meeting.location else ''}
        
        {f'Description: {meeting.description}' if meeting.description else ''}
        
        Quick Actions:
        {f'Confirm: {confirm_link}' if confirm_link else ''}
        {f'Request Reschedule: {reschedule_link}' if reschedule_link else ''}
        {f'Cancel: {cancel_link}' if cancel_link else ''}
        
        View full details: {meeting_link}
        """
        
        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
        except Exception as e:
            print(f"Failed to send interview scheduled email: {e}")
    
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
        except Exception as e:
            print(f"Failed to send cancellation email: {e}")
    
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
        except Exception as e:
            print(f"Failed to send reschedule request email: {e}")
    
    def send_reschedule_approved_email(
        self,
        session: Session,
        meeting: Meeting,
        recipient_user: User,
        approver_user: User,
        confirm_token: Optional[str] = None,
        cancel_token: Optional[str] = None
    ) -> None:
        """Send email when reschedule is approved and new time is set"""
        
        subject = f"Interview Rescheduled: {meeting.title}"
        
        start_time_str = meeting.scheduled_start.strftime("%B %d, %Y at %I:%M %p %Z")
        confirm_link = f"{self.app_url}/meetings/token/{confirm_token}/confirm" if confirm_token else ""
        cancel_link = f"{self.app_url}/meetings/token/{cancel_token}/cancel" if cancel_token else ""
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10b981;">Interview Rescheduled</h2>
                
                <p>Hi {recipient_user.full_name},</p>
                
                <p>{approver_user.full_name} has rescheduled your interview to a new time:</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">{meeting.title}</h3>
                    <p style="margin: 10px 0;"><strong>New Date & Time:</strong> {start_time_str}</p>
                    <p style="margin: 10px 0;"><strong>Duration:</strong> {meeting.duration_minutes} minutes</p>
                    {f'<p style="margin: 10px 0;"><strong>Meeting Link:</strong> <a href="{meeting.video_meeting_url}">{meeting.video_meeting_url}</a></p>' if meeting.video_meeting_url else ''}
                </div>
                
                <div style="margin: 30px 0;">
                    {f'<a href="{confirm_link}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px 5px 5px 0;">Confirm New Time</a>' if confirm_link else ''}
                    {f'<a href="{cancel_link}" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">Cancel Interview</a>' if cancel_link else ''}
                </div>
                
                <p><a href="{self.app_url}/meetings/{meeting.id}" style="color: #2563eb;">View full details →</a></p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    This is an automated email from TalentGraph.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Interview Rescheduled
        
        Hi {recipient_user.full_name},
        
        {approver_user.full_name} has rescheduled your interview to a new time:
        
        {meeting.title}
        New Date & Time: {start_time_str}
        Duration: {meeting.duration_minutes} minutes
        {f'Meeting Link: {meeting.video_meeting_url}' if meeting.video_meeting_url else ''}
        
        {f'Confirm: {confirm_link}' if confirm_link else ''}
        {f'Cancel: {cancel_link}' if cancel_link else ''}
        
        View full details: {self.app_url}/meetings/{meeting.id}
        """
        
        try:
            self.provider.send_email(
                to_email=recipient_user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
        except Exception as e:
            print(f"Failed to send reschedule approved email: {e}")
