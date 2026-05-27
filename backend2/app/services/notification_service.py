"""
Centralized Notification Service — TalentGraph V2
==================================================
Consolidates notification creation logic that was previously duplicated
across multiple routers (swipes, applications, matches, etc.)
Enhanced with preference-based multi-channel delivery (in-app + email)

PRODUCTION-READY FEATURES:
- Event taxonomy validation via registry
- Standardized payload schema
- Async email delivery with retry
- Delivery status tracking
- Idempotency guarantees
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from sqlmodel import Session, select

from app.models import Notification, User, NotificationPreferences
from app.core.notification_registry import (
    get_notification_spec,
    validate_event_type,
    get_default_channels,
    get_priority,
    get_category,
    should_deduplicate,
    get_dedup_window,
    NotificationChannel
)
from app.notification_payloads import NotificationPayload
from app.workers.email_worker import queue_notification_email

logger = logging.getLogger(__name__)


class NotificationService:
    """Centralized service for creating and managing notifications with preference support."""
    
    @staticmethod
    def send_notification(
        session: Session,
        user_id: int,
        event_type: str,
        title: str,
        message: str,
        payload: Optional[Union[Dict[str, Any], NotificationPayload]] = None,
        email_data: Optional[Dict[str, Any]] = None,
        notification_type: str = "general",
        commit: bool = True,
        validate_taxonomy: bool = True
    ) -> Optional[Notification]:
        """
        Send notification respecting user preferences for in-app and email delivery.
        
        ENHANCED WITH:
        - Event taxonomy validation
        - Deduplication logic
        - Standardized payload schema
        - Async email delivery (non-blocking)
        
        Args:
            session: Database session
            user_id: ID of the user to notify
            event_type: Type of notification (must match registry)
            title: Notification title
            message: Notification message (sanitized for PII in emails)
            payload: NotificationPayload object or dict (will be standardized)
            email_data: Optional dict with email template data
            notification_type: Type classification (general, message, alert, etc.)
            commit: Whether to commit the transaction
            validate_taxonomy: Whether to validate event_type against registry
            
        Returns:
            Created in-app Notification object or None if preferences block all channels
        """
        try:
            # STEP 1: Validate event type
            if validate_taxonomy and not validate_event_type(event_type):
                logger.error(f"[NOTIFICATION] Invalid event_type: {event_type}")
                raise ValueError(f"Invalid event_type '{event_type}'. Must be in registry.")
            
            # STEP 2: Check deduplication
            if should_deduplicate(event_type):
                dedup_window = get_dedup_window(event_type)
                cutoff_time = datetime.utcnow() - timedelta(minutes=dedup_window)
                
                recent = session.exec(
                    select(Notification).where(
                        Notification.user_id == user_id,
                        Notification.event_type == event_type,
                        Notification.created_at >= cutoff_time
                    )
                ).first()
                
                if recent:
                    logger.info(
                        f"[NOTIFICATION] Deduplicated {event_type} for user {user_id} "
                        f"(last notification within {dedup_window} minutes)"
                    )
                    return recent
            
            # STEP 3: Get user preferences for this event type
            preference = session.exec(
                select(NotificationPreferences).where(
                    NotificationPreferences.user_id == user_id,
                    NotificationPreferences.event_type == event_type
                )
            ).first()
            
            # Default to enabled if no preference found
            in_app_enabled = preference.in_app_enabled if preference else True
            email_enabled = preference.email_enabled if preference else True
            
            # If both channels disabled, log and skip
            if not in_app_enabled and not email_enabled:
                logger.info(
                    f"[NOTIFICATION] Skipped {event_type} for user {user_id} "
                    f"(all channels disabled by preference)"
                )
                return None
            
            in_app_notification = None
            
            # STEP 4: Send in-app notification if enabled
            if in_app_enabled:
                # Standardize payload
                if isinstance(payload, NotificationPayload):
                    payload_str = payload.to_json_string()
                elif isinstance(payload, dict):
                    # Try to convert dict to NotificationPayload
                    try:
                        payload_obj = NotificationPayload(**payload)
                        payload_str = payload_obj.to_json_string()
                    except Exception as e:
                        # Fallback: store as-is
                        logger.debug(f"Failed to convert payload dict to NotificationPayload: {e}")
                        import json
                        payload_str = json.dumps(payload)
                else:
                    payload_str = None
                
                in_app_notification = Notification(
                    user_id=user_id,
                    type=notification_type,
                    title=title,
                    message=message,
                    event_type=event_type,
                    payload=payload_str,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                session.add(in_app_notification)
                
                if commit:
                    session.commit()
                    session.refresh(in_app_notification)
                    logger.info(
                        f"[NOTIFICATION] Created in-app notification: {event_type} "
                        f"for user {user_id} (notification_id={in_app_notification.id})"
                    )
            
            # STEP 5: Queue email if enabled (ASYNC - non-blocking)
            if email_enabled and email_data:
                try:
                    # Get user for email address
                    user = session.exec(select(User).where(User.id == user_id)).first()
                    if not user:
                        logger.warning(f"[NOTIFICATION] User {user_id} not found for email")
                        return in_app_notification
                    
                    # Generate full email content (subject + HTML body)
                    subject, html_body = NotificationService._generate_email_template(
                        event_type, email_data
                    )
                    
                    # Queue email asynchronously (does NOT block API response)
                    queue_notification_email(
                        session=session,
                        user_id=user_id,
                        event_type=event_type,
                        recipient_email=user.email,
                        subject=subject,
                        html_body=html_body,
                        notification_id=in_app_notification.id if in_app_notification else None,
                        delay_seconds=0  # Send immediately
                    )
                    
                    logger.info(
                        f"[NOTIFICATION] Queued email: {event_type} for {user.email} "
                        f"(async delivery)"
                    )
                    
                except Exception as e:
                    logger.error(f"[NOTIFICATION] Failed to queue email: {e}")
                    # Don't fail the entire notification if email queueing fails
            
            return in_app_notification
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to send notification: {e}", exc_info=True)
            if commit:
                session.rollback()
            return None
    
    @staticmethod
    def _generate_email_template(event_type: str, data: Dict[str, Any]) -> tuple[str, str]:
        """Generate email subject and HTML body based on event type"""
        from app.services.notification_email_service import NotificationEmailTemplates
        
        templates = NotificationEmailTemplates()
        
        # Map event types to template methods
        if event_type == "application_status":
            return templates.application_status_email(
                candidate_name=data.get("candidate_name", ""),
                job_title=data.get("job_title", ""),
                company_name=data.get("company_name", ""),
                status=data.get("status", ""),
                message=data.get("message", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "application_submitted":
            return templates.application_submitted_email(
                candidate_name=data.get("candidate_name", ""),
                job_title=data.get("job_title", ""),
                company_name=data.get("company_name", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "match_found":
            return templates.match_found_email(
                candidate_name=data.get("candidate_name", ""),
                job_title=data.get("job_title", ""),
                company_name=data.get("company_name", ""),
                match_score=data.get("match_score", 0),
                action_url=data.get("action_url", "")
            )
        elif event_type == "interview_reminder":
            return templates.interview_reminder_email(
                candidate_name=data.get("candidate_name", ""),
                job_title=data.get("job_title", ""),
                company_name=data.get("company_name", ""),
                interview_time=data.get("interview_time", ""),
                meeting_link=data.get("meeting_link", ""),
                hours_until=data.get("hours_until", 0)
            )
        elif event_type == "message_received":
            return templates.message_received_email(
                recipient_name=data.get("recipient_name", ""),
                sender_name=data.get("sender_name", ""),
                message_preview=data.get("message_preview", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "conversation_started":
            return templates.message_received_email(
                recipient_name=data.get("recipient_name", ""),
                sender_name=data.get("sender_name", ""),
                message_preview=data.get("message_preview", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "recruiter_message_received":
            return templates.message_received_email(
                recipient_name=data.get("recipient_name", ""),
                sender_name=data.get("sender_name", ""),
                message_preview=data.get("message_preview", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "application_received":
            return templates.application_received_email(
                recruiter_name=data.get("recruiter_name", ""),
                candidate_name=data.get("candidate_name", ""),
                job_title=data.get("job_title", ""),
                action_url=data.get("action_url", "")
            )
        elif event_type == "job_update":
            return templates.job_update_email(
                recruiter_name=data.get("recruiter_name", ""),
                job_title=data.get("job_title", ""),
                update_type=data.get("update_type", ""),
                details=data.get("details", "")
            )
        else:
            # Generic fallback
            return (
                f"TalentGraph Notification: {event_type}",
                f"<html><body><p>{data.get('message', 'You have a new notification.')}</p></body></html>"
            )
    
    @staticmethod
    def create_notification(
        session: Session,
        user_email: str,
        event_type: str,
        data: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> Optional[Notification]:
        """
        Legacy method - Create a notification for a user by email.
        Maintained for backward compatibility but does NOT check preferences.
        Use send_notification() for new code.
        """
        try:
            # Find user by email
            user = session.exec(
                select(User).where(User.email == user_email)
            ).first()
            
            if not user:
                logger.warning(f"[NOTIFICATION] User not found: {user_email}")
                return None
            
            # Create notification (legacy format with data field)
            import json
            notification = Notification(
                user_id=user.id,
                type="general",
                title=event_type.replace('_', ' ').title(),
                message=str(data.get("message", "")) if data else "",
                event_type=event_type,
                payload=json.dumps(data) if data else None,
                is_read=False,
                created_at=datetime.utcnow()
            )
            
            session.add(notification)
            
            if commit:
                session.commit()
                session.refresh(notification)
                logger.info(
                    f"[NOTIFICATION] Created {event_type} for user {user_email} "
                    f"(notification_id={notification.id})"
                )
            
            return notification
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to create notification: {e}")
            if commit:
                session.rollback()
            return None
    
    @staticmethod
    def create_bulk_notifications(
        session: Session,
        user_emails: List[str],
        event_type: str,
        data: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> int:
        """
        Create notifications for multiple users (batch operation).
        Legacy method - does NOT check preferences.
        
        Args:
            session: Database session
            user_emails: List of user emails to notify
            event_type: Type of notification event
            data: Optional JSON payload
            commit: Whether to commit the transaction
            
        Returns:
            Number of notifications created
        """
        count = 0
        
        try:
            # Fetch all users in one query
            users = session.exec(
                select(User).where(User.email.in_(user_emails))
            ).all()
            
            user_map = {user.email: user for user in users}
            
            # Create notifications for found users
            import json
            for email in user_emails:
                user = user_map.get(email)
                if not user:
                    logger.warning(f"[NOTIFICATION] User not found in bulk: {email}")
                    continue
                
                notification = Notification(
                    user_id=user.id,
                    type="general",
                    title=event_type.replace('_', ' ').title(),
                    message=str(data.get("message", "")) if data else "",
                    event_type=event_type,
                    payload=json.dumps(data) if data else None,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                session.add(notification)
                count += 1
            
            if commit:
                session.commit()
                logger.info(
                    f"[NOTIFICATION] Created {count} {event_type} notifications in bulk"
                )
            
            return count
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Bulk notification creation failed: {e}")
            if commit:
                session.rollback()
            return 0
    
    @staticmethod
    def mark_as_read(
        session: Session,
        notification_id: int,
        commit: bool = True
    ) -> bool:
        """
        Mark a notification as read.
        
        Args:
            session: Database session
            notification_id: ID of notification to mark as read
            commit: Whether to commit the transaction
            
        Returns:
            True if successful, False otherwise
        """
        try:
            notification = session.get(Notification, notification_id)
            
            if not notification:
                logger.warning(f"[NOTIFICATION] Not found: {notification_id}")
                return False
            
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            
            if commit:
                session.commit()
                logger.info(f"[NOTIFICATION] Marked as read: {notification_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to mark as read: {e}")
            if commit:
                session.rollback()
            return False
    
    @staticmethod
    def get_unread_count(session: Session, user_email: str) -> int:
        """
        Get count of unread notifications for a user (optimized SQL count).
        
        Args:
            session: Database session
            user_email: Email of the user
            
        Returns:
            Count of unread notifications
        """
        try:
            # Find user
            user = session.exec(
                select(User).where(User.email == user_email)
            ).first()
            
            if not user:
                return 0
            
            # Use SQL COUNT instead of loading all records
            from sqlmodel import func
            count = session.exec(
                select(func.count(Notification.id))
                .where(Notification.user_id == user.id)
                .where(Notification.is_read == False)
            ).one()
            
            return count
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to get unread count: {e}")
            return 0
    
    @staticmethod
    def delete_old_notifications(
        session: Session,
        days_old: int = 90,
        commit: bool = True
    ) -> int:
        """
        Delete notifications older than specified days (cleanup utility).
        
        Args:
            session: Database session
            days_old: Delete notifications older than this many days
            commit: Whether to commit the transaction
            
        Returns:
            Number of notifications deleted
        """
        try:
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Find old read notifications
            old_notifications = session.exec(
                select(Notification)
                .where(Notification.created_at < cutoff_date)
                .where(Notification.is_read == True)
            ).all()
            
            count = len(old_notifications)
            
            for notification in old_notifications:
                session.delete(notification)
            
            if commit:
                session.commit()
                logger.info(f"[NOTIFICATION] Deleted {count} old notifications")
            
            return count
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to delete old notifications: {e}")
            if commit:
                session.rollback()
            return 0


# Convenience function for backward compatibility
def create_notification(
    session: Session,
    user_email: str,
    event_type: str,
    data: Optional[Dict[str, Any]] = None
) -> Optional[Notification]:
    """Backward-compatible wrapper for notification creation."""
    return NotificationService.create_notification(
        session, user_email, event_type, data, commit=True
    )
