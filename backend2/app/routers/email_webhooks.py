"""
Email Webhooks Router for TalentGraph
======================================
Handles inbound email from SendGrid/Postmark and tokenized meeting actions

Endpoints:
- POST /webhooks/email/inbound - Process inbound email from provider
- GET /meetings/token/{token}/confirm - Confirm meeting via email
- GET /meetings/token/{token}/reschedule - Request reschedule via email
- GET /meetings/token/{token}/cancel - Cancel meeting via email

Security:
- Webhook signature verification
- Token expiration checking
- Idempotency via provider_event_id
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models import (
    EmailThreadLink, InboundEmailEvent, Message,
    Conversation, Meeting, User, MeetingStatus
)
from app.services.email_service import EmailService, extract_token_from_email, extract_text_from_html
from app.routers.notifications import push_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/email", tags=["Email Webhooks"])

email_service = EmailService()


# ═══════════════════════════════════════════════════════════════════════════
# INBOUND EMAIL WEBHOOK
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/inbound")
async def handle_inbound_email(
    request: Request,
    session: Session = Depends(get_session),
    x_sendgrid_signature: Optional[str] = Header(None, alias="X-Sendgrid-Signature")
):
    """
    Process inbound email from SendGrid
    
    Flow:
    1. Verify webhook signature
    2. Extract action token from to_email (reply-{token}@domain)
    3. Look up EmailThreadLink
    4. Create in-app Message
    5. Notify recruiter
    6. Log InboundEmailEvent for audit
    """
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook signature
    if x_sendgrid_signature:
        if not email_service.verify_webhook(body, x_sendgrid_signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    # Parse payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    try:
        # Extract fields
        to_email = payload.get('to', '')
        from_email = payload.get('from', payload.get('envelope', {}).get('from', ''))
        subject = payload.get('subject', '')
        text_body = payload.get('text', '')
        html_body = payload.get('html', '')
        message_id = payload.get('headers', {}).get('message-id', payload.get('envelope', {}).get('messageId', ''))
        
        # Extract token from to_email
        token = extract_token_from_email(to_email)
        
        if not token:
            logger.warning(f"No token found in to_email: {to_email}")
            return {"status": "ignored", "reason": "no_token"}
        
        # Look up thread link
        thread_link = session.exec(
            select(EmailThreadLink).where(EmailThreadLink.action_token == token)
        ).first()
        
        if not thread_link:
            logger.warning(f"Thread link not found for token: {token}")
            return {"status": "ignored", "reason": "invalid_token"}
        
        # Check token expiration
        if thread_link.token_expires_at < datetime.now(timezone.utc):
            logger.warning(f"Expired token: {token}")
            return {"status": "ignored", "reason": "expired_token"}
        
        # Check for duplicate (idempotency)
        existing_event = session.exec(
            select(InboundEmailEvent).where(
                InboundEmailEvent.provider_event_id == message_id
            )
        ).first()
        
        if existing_event:
            logger.info(f"Duplicate event, already processed: {message_id}")
            return {"status": "duplicate", "message_id": existing_event.message_created_id}
        
        # Create audit event
        event = InboundEmailEvent(
            provider_name="sendgrid",
            provider_event_id=message_id,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            body_text=text_body,
            body_html=html_body,
            thread_link_id=thread_link.id
        )
        session.add(event)
        
        # Extract message text
        if text_body:
            message_text = text_body
        elif html_body:
            message_text = extract_text_from_html(html_body)
        else:
            message_text = "(No content)"
        
        # Create in-app message
        if thread_link.conversation_id:
            message = Message(
                conversation_id=thread_link.conversation_id,
                sender_user_id=thread_link.candidate_user_id,
                content=f"[From Email]\n\n{message_text}",
                sent_at=datetime.now(timezone.utc)
            )
            session.add(message)
            session.flush()  # Get message ID
            
            # Update event with created message
            event.message_created_id = message.id
            
            # Notify recruiter
            await push_notification(
                session=session,
                user_id=thread_link.recruiter_user_id,
                title="New email reply",
                message=f"Candidate replied via email: {subject}",
                notification_type="message",
                entity_id=message.id
            )
            
            logger.info(f"Created message {message.id} from inbound email")
        
        # Update thread link stats
        thread_link.last_inbound_at = datetime.now(timezone.utc)
        thread_link.inbound_count += 1
        
        # Mark event as processed
        event.processed = True
        event.processed_at = datetime.now(timezone.utc)
        
        session.commit()
        
        return {
            "status": "processed",
            "message_id": event.message_created_id,
            "conversation_id": thread_link.conversation_id
        }
        
    except Exception as e:
        logger.error(f"Error processing inbound email: {e}", exc_info=True)
        
        # Log failed event for debugging
        try:
            event = InboundEmailEvent(
                provider_name="sendgrid",
                provider_event_id=message_id or "unknown",
                from_email=payload.get('from', ''),
                to_email=payload.get('to', ''),
                subject=payload.get('subject', ''),
                processed=False,
                processing_error=str(e)
            )
            session.add(event)
            session.commit()
        except:
            pass
        
        raise HTTPException(status_code=500, detail="Processing failed")


# ═══════════════════════════════════════════════════════════════════════════
# TOKENIZED MEETING ACTIONS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/meetings/token/{token}/confirm", response_class=HTMLResponse)
async def confirm_meeting_via_token(
    token: str,
    session: Session = Depends(get_session)
):
    """
    Confirm meeting via tokenized email link
    
    Returns HTML page with confirmation UI
    """
    
    # Look up thread link
    thread_link = session.exec(
        select(EmailThreadLink).where(EmailThreadLink.action_token == token)
    ).first()
    
    if not thread_link:
        return generate_error_page("Invalid or expired link")
    
    # Check expiration
    if thread_link.token_expires_at < datetime.now(timezone.utc):
        return generate_error_page("This link has expired")
    
    # Get meeting
    if not thread_link.meeting_id:
        return generate_error_page("No meeting associated with this link")
    
    meeting = session.get(Meeting, thread_link.meeting_id)
    if not meeting:
        return generate_error_page("Meeting not found")
    
    # Check if already confirmed or past
    if meeting.status == MeetingStatus.CANCELLED:
        return generate_error_page("This meeting has been cancelled")
    
    if meeting.status == MeetingStatus.COMPLETED:
        return generate_info_page("This meeting has already been completed")
    
    # Update meeting status (if not already confirmed)
    if meeting.status != MeetingStatus.SCHEDULED:
        meeting.status = MeetingStatus.SCHEDULED
        session.add(meeting)
        
        # Notify recruiter
        await push_notification(
            session=session,
            user_id=thread_link.recruiter_user_id,
            title="Meeting confirmed",
            message=f"Candidate confirmed the interview",
            notification_type="meeting",
            entity_id=meeting.id
        )
        
        session.commit()
    
    # Return success page
    return generate_confirmation_page(meeting, "confirmed")


@router.get("/meetings/token/{token}/reschedule", response_class=HTMLResponse)
async def reschedule_meeting_via_token(
    token: str,
    session: Session = Depends(get_session)
):
    """
    Request reschedule via tokenized email link
    
    Returns HTML page with reschedule request UI
    """
    
    thread_link = session.exec(
        select(EmailThreadLink).where(EmailThreadLink.action_token == token)
    ).first()
    
    if not thread_link:
        return generate_error_page("Invalid or expired link")
    
    if thread_link.token_expires_at < datetime.now(timezone.utc):
        return generate_error_page("This link has expired")
    
    if not thread_link.meeting_id:
        return generate_error_page("No meeting associated with this link")
    
    meeting = session.get(Meeting, thread_link.meeting_id)
    if not meeting:
        return generate_error_page("Meeting not found")
    
    # Notify recruiter of reschedule request
    await push_notification(
        session=session,
        user_id=thread_link.recruiter_user_id,
        title="Reschedule requested",
        message=f"Candidate requested to reschedule the interview",
        notification_type="meeting",
        entity_id=meeting.id
    )
    
    session.commit()
    
    return generate_reschedule_page(meeting)


@router.get("/meetings/token/{token}/cancel", response_class=HTMLResponse)
async def cancel_meeting_via_token(
    token: str,
    session: Session = Depends(get_session)
):
    """
    Cancel meeting via tokenized email link
    
    Returns HTML page with cancellation confirmation
    """
    
    thread_link = session.exec(
        select(EmailThreadLink).where(EmailThreadLink.action_token == token)
    ).first()
    
    if not thread_link:
        return generate_error_page("Invalid or expired link")
    
    if thread_link.token_expires_at < datetime.now(timezone.utc):
        return generate_error_page("This link has expired")
    
    if not thread_link.meeting_id:
        return generate_error_page("No meeting associated with this link")
    
    meeting = session.get(Meeting, thread_link.meeting_id)
    if not meeting:
        return generate_error_page("Meeting not found")
    
    if meeting.status == MeetingStatus.CANCELLED:
        return generate_info_page("This meeting has already been cancelled")
    
    # Cancel meeting
    meeting.status = MeetingStatus.CANCELLED
    session.add(meeting)
    
    # Notify recruiter
    await push_notification(
        session=session,
        user_id=thread_link.recruiter_user_id,
        title="Meeting cancelled",
        message=f"Candidate cancelled the interview",
        notification_type="meeting",
        entity_id=meeting.id
    )
    
    session.commit()
    
    return generate_confirmation_page(meeting, "cancelled")


# ═══════════════════════════════════════════════════════════════════════════
# HTML PAGE GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_error_page(message: str) -> str:
    """Generate error page HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error - TalentGraph</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }}
            .error {{ background: #fee; border: 2px solid #fcc; padding: 30px; border-radius: 10px; }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #c00; }}
        </style>
    </head>
    <body>
        <div class="error">
            <div class="icon">⚠️</div>
            <h1>Error</h1>
            <p>{message}</p>
            <p><a href="https://talentgraph.com">Return to TalentGraph</a></p>
        </div>
    </body>
    </html>
    """


def generate_info_page(message: str) -> str:
    """Generate info page HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Information - TalentGraph</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }}
            .info {{ background: #e3f2fd; border: 2px solid #90caf9; padding: 30px; border-radius: 10px; }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #1976d2; }}
        </style>
    </head>
    <body>
        <div class="info">
            <div class="icon">ℹ️</div>
            <h1>Information</h1>
            <p>{message}</p>
            <p><a href="https://talentgraph.com">Return to TalentGraph</a></p>
        </div>
    </body>
    </html>
    """


def generate_confirmation_page(meeting: Meeting, action: str) -> str:
    """Generate confirmation page HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Meeting {action.capitalize()} - TalentGraph</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }}
            .success {{ background: #e8f5e9; border: 2px solid #81c784; padding: 30px; border-radius: 10px; }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #2e7d32; }}
            .details {{ background: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; }}
        </style>
    </head>
    <body>
        <div class="success">
            <div class="icon">✓</div>
            <h1>Meeting {action.capitalize()}</h1>
            <p>Your interview has been {action}.</p>
            <div class="details">
                <p><strong>Meeting ID:</strong> {meeting.id}</p>
                <p><strong>Status:</strong> {meeting.status.value}</p>
            </div>
            <p>We've notified the recruiter. You'll receive confirmation via email.</p>
            <p><a href="https://talentgraph.com">Return to TalentGraph</a></p>
        </div>
    </body>
    </html>
    """


def generate_reschedule_page(meeting: Meeting) -> str:
    """Generate reschedule request page HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Reschedule Request - TalentGraph</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }}
            .info {{ background: #fff3e0; border: 2px solid #ffb74d; padding: 30px; border-radius: 10px; }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #f57c00; }}
        </style>
    </head>
    <body>
        <div class="info">
            <div class="icon">🔄</div>
            <h1>Reschedule Request Sent</h1>
            <p>We've notified the recruiter that you'd like to reschedule this interview.</p>
            <p>They will contact you shortly with alternative times.</p>
            <p><a href="https://talentgraph.com">Return to TalentGraph</a></p>
        </div>
    </body>
    </html>
    """
