"""
Email Worker — TalentGraph V2
==============================
Asynchronous email delivery worker using APScheduler.
Handles queued email notifications with retry logic and delivery tracking.

Usage:
    from app.workers.email_worker import queue_notification_email
    queue_notification_email(user_id, event_type, email_data)
"""

import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger

from app.database import engine
from app.models import EmailDelivery, EmailDeliveryStatus, User
from app.emailer import send_email
from app.services.notification_email_service import NotificationEmailTemplates

logger = logging.getLogger(__name__)

# Global scheduler instance
email_scheduler: Optional[BackgroundScheduler] = None


def get_email_scheduler() -> BackgroundScheduler:
    """Get or create the global email scheduler"""
    global email_scheduler
    if email_scheduler is None:
        email_scheduler = BackgroundScheduler()
        email_scheduler.start()
        logger.info("[EMAIL_WORKER] Email scheduler started")
    return email_scheduler


def generate_idempotency_key(
    user_id: int,
    event_type: str,
    timestamp: datetime,
    notification_id: Optional[int] = None
) -> str:
    """Generate unique idempotency key to prevent duplicate emails"""
    base_string = f"{user_id}:{event_type}:{timestamp.isoformat()}:{notification_id or 'none'}"
    return hashlib.sha256(base_string.encode()).hexdigest()[:32]


def send_notification_email_task(delivery_id: int):
    """
    Background task to send a single notification email.
    Tracks attempts, handles retries, and updates delivery status.
    """
    with Session(engine) as session:
        try:
            # Get delivery record
            delivery = session.exec(
                select(EmailDelivery).where(EmailDelivery.id == delivery_id)
            ).first()
            
            if not delivery:
                logger.error(f"[EMAIL_WORKER] Delivery {delivery_id} not found")
                return
            
            # Check if already sent
            if delivery.status == EmailDeliveryStatus.SENT.value:
                logger.info(f"[EMAIL_WORKER] Delivery {delivery_id} already sent")
                return
            
            # Check max attempts
            if delivery.attempts >= delivery.max_attempts:
                delivery.status = EmailDeliveryStatus.FAILED.value
                delivery.failed_at = datetime.utcnow()
                delivery.last_error = f"Max attempts ({delivery.max_attempts}) reached"
                session.add(delivery)
                session.commit()
                logger.error(f"[EMAIL_WORKER] Delivery {delivery_id} failed: max attempts reached")
                return
            
            # Update status to sending
            delivery.status = EmailDeliveryStatus.SENDING.value
            delivery.attempts += 1
            delivery.last_attempt_at = datetime.utcnow()
            session.add(delivery)
            session.commit()
            
            # Get user
            user = session.exec(select(User).where(User.id == delivery.user_id)).first()
            if not user:
                delivery.status = EmailDeliveryStatus.FAILED.value
                delivery.failed_at = datetime.utcnow()
                delivery.last_error = "User not found"
                session.add(delivery)
                session.commit()
                logger.error(f"[EMAIL_WORKER] User {delivery.user_id} not found")
                return
            
            # Generate email content
            templates = NotificationEmailTemplates()
            subject, html_body = _generate_email_content(
                delivery.event_type,
                delivery.recipient_email,
                user
            )
            
            # Send email
            try:
                send_email(
                    to_email=delivery.recipient_email,
                    subject=subject,
                    html_body=html_body
                )
                
                # Mark as sent
                delivery.status = EmailDeliveryStatus.SENT.value
                delivery.sent_at = datetime.utcnow()
                delivery.last_error = None
                session.add(delivery)
                session.commit()
                
                logger.info(
                    f"[EMAIL_WORKER] Successfully sent email to {delivery.recipient_email} "
                    f"(delivery_id={delivery_id}, event={delivery.event_type})"
                )
                
            except Exception as email_error:
                # Handle send failure
                error_msg = str(email_error)
                delivery.last_error = error_msg[:500]  # Truncate long errors
                
                # Retry logic with exponential backoff
                if delivery.attempts < delivery.max_attempts:
                    # Calculate retry delay: 5min, 15min, 30min
                    retry_minutes = 5 * (2 ** (delivery.attempts - 1))
                    retry_at = datetime.utcnow() + timedelta(minutes=retry_minutes)
                    
                    delivery.status = EmailDeliveryStatus.QUEUED.value
                    session.add(delivery)
                    session.commit()
                    
                    # Schedule retry
                    scheduler = get_email_scheduler()
                    scheduler.add_job(
                        send_notification_email_task,
                        trigger=DateTrigger(run_date=retry_at),
                        args=[delivery_id],
                        id=f"email_retry_{delivery_id}_{delivery.attempts}",
                        replace_existing=True
                    )
                    
                    logger.warning(
                        f"[EMAIL_WORKER] Email send failed (attempt {delivery.attempts}/{delivery.max_attempts}). "
                        f"Retry scheduled in {retry_minutes} minutes. Error: {error_msg}"
                    )
                else:
                    # Max attempts reached
                    delivery.status = EmailDeliveryStatus.FAILED.value
                    delivery.failed_at = datetime.utcnow()
                    session.add(delivery)
                    session.commit()
                    
                    logger.error(
                        f"[EMAIL_WORKER] Email delivery failed permanently after {delivery.attempts} attempts. "
                        f"Error: {error_msg}"
                    )
        
        except Exception as e:
            logger.error(f"[EMAIL_WORKER] Unexpected error in email task: {e}", exc_info=True)
            # Try to mark as failed if we can
            try:
                with Session(engine) as error_session:
                    delivery = error_session.exec(
                        select(EmailDelivery).where(EmailDelivery.id == delivery_id)
                    ).first()
                    if delivery:
                        delivery.status = EmailDeliveryStatus.FAILED.value
                        delivery.failed_at = datetime.utcnow()
                        delivery.last_error = f"Worker error: {str(e)[:500]}"
                        error_session.add(delivery)
                        error_session.commit()
            except:
                pass


def _generate_email_content(event_type: str, recipient_email: str, user: User) -> tuple[str, str]:
    """Generate email subject and HTML body based on event type
    
    This is a simplified version. In production, you'd pass full email_data from notification service.
    """
    templates = NotificationEmailTemplates()
    
    # Default minimal template
    subject = f"TalentGraph Notification: {event_type.replace('_', ' ').title()}"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>TalentGraph Notification</h2>
        <p>You have a new notification: <strong>{event_type}</strong></p>
        <p><a href="https://talentgraph.com" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
    </body>
    </html>
    """
    
    return subject, html_body


def queue_notification_email(
    session: Session,
    user_id: int,
    event_type: str,
    recipient_email: str,
    subject: str,
    notification_id: Optional[int] = None,
    delay_seconds: int = 0
) -> Optional[EmailDelivery]:
    """
    Queue an email notification for async delivery.
    
    Args:
        session: Database session
        user_id: User ID
        event_type: Notification event type
        recipient_email: Recipient email address
        subject: Email subject line
        notification_id: Associated notification ID (optional)
        delay_seconds: Delay before sending (default: 0 = immediate)
        
    Returns:
        EmailDelivery record or None if failed
    """
    try:
        # Generate idempotency key
        idempotency_key = generate_idempotency_key(
            user_id=user_id,
            event_type=event_type,
            timestamp=datetime.utcnow(),
            notification_id=notification_id
        )
        
        # Check if already queued (idempotency check)
        existing = session.exec(
            select(EmailDelivery).where(EmailDelivery.idempotency_key == idempotency_key)
        ).first()
        
        if existing:
            logger.info(f"[EMAIL_WORKER] Email already queued (idempotency_key={idempotency_key})")
            return existing
        
        # Create delivery record
        delivery = EmailDelivery(
            notification_id=notification_id,
            user_id=user_id,
            recipient_email=recipient_email,
            event_type=event_type,
            subject=subject,
            status=EmailDeliveryStatus.QUEUED.value,
            attempts=0,
            idempotency_key=idempotency_key,
            created_at=datetime.utcnow()
        )
        
        session.add(delivery)
        session.commit()
        session.refresh(delivery)
        
        # Schedule email send task
        scheduler = get_email_scheduler()
        run_at = datetime.utcnow() + timedelta(seconds=delay_seconds)
        
        scheduler.add_job(
            send_notification_email_task,
            trigger=DateTrigger(run_date=run_at),
            args=[delivery.id],
            id=f"email_send_{delivery.id}",
            replace_existing=True
        )
        
        logger.info(
            f"[EMAIL_WORKER] Queued email for {recipient_email} "
            f"(delivery_id={delivery.id}, event={event_type}, delay={delay_seconds}s)"
        )
        
        return delivery
        
    except Exception as e:
        logger.error(f"[EMAIL_WORKER] Failed to queue email: {e}", exc_info=True)
        session.rollback()
        return None


def shutdown_email_worker():
    """Gracefully shutdown the email worker"""
    global email_scheduler
    if email_scheduler:
        email_scheduler.shutdown(wait=True)
        email_scheduler = None
        logger.info("[EMAIL_WORKER] Email scheduler shut down")
