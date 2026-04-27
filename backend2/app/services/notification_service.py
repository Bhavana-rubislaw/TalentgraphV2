"""
Centralized Notification Service — TalentGraph V2
==================================================
Consolidates notification creation logic that was previously duplicated
across multiple routers (swipes, applications, matches, etc.)
Enhanced with preference-based multi-channel delivery (in-app + email)
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlmodel import Session, select

from app.models import Notification, User, NotificationPreferences

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
        payload: Optional[Dict[str, Any]] = None,
        email_data: Optional[Dict[str, Any]] = None,
        notification_type: str = "general",
        commit: bool = True
    ) -> Optional[Notification]:
        """
        Send notification respecting user preferences for in-app and email delivery.
        
        Args:
            session: Database session
            user_id: ID of the user to notify
            event_type: Type of notification (must match NotificationPreferences.event_type)
            title: Notification title
            message: Notification message
            payload: Optional JSON payload for in-app notification
            email_data: Optional dict with email template data
            notification_type: Type classification (general, message, alert, etc.)
            commit: Whether to commit the transaction
            
        Returns:
            Created in-app Notification object or None if preferences block all channels
        """
        try:
            # Get user preferences for this event type
            preference = session.exec(
                select(NotificationPreferences).where(
                    NotificationPreferences.user_id == user_id,
                    NotificationPreferences.event_type == event_type
                )
            ).first()
            
            # Default to enabled if no preference found
            in_app_enabled = preference.in_app_enabled if preference else True
            email_enabled = preference.email_enabled if preference else True
            
            in_app_notification = None
            
            # Send in-app notification if enabled
            if in_app_enabled:
                import json
                payload_str = json.dumps(payload) if payload else None
                
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
                    logger.info(f"[NOTIFICATION] Created in-app notification: {event_type} for user {user_id}")
            
            # Send email if enabled and email_data provided
            if email_enabled and email_data:
                try:
                    from app.emailer import send_email
                    from app.services.notification_email_service import NotificationEmailTemplates
                    
                    # Get user for email address
                    user = session.exec(select(User).where(User.id == user_id)).first()
                    if not user:
                        logger.warning(f"[NOTIFICATION] User {user_id} not found for email")
                        return in_app_notification
                    
                    # Generate email based on event type
                    subject, html_body = NotificationService._generate_email_template(
                        event_type, email_data
                    )
                    
                    # Send email
                    send_email(
                        to_email=user.email,
                        subject=subject,
                        html_body=html_body
                    )
                    logger.info(f"[NOTIFICATION] Sent email: {event_type} to {user.email}")
                    
                except Exception as e:
                    logger.error(f"[NOTIFICATION] Failed to send email: {e}")
                    # Don't fail the entire notification if email fails
            
            return in_app_notification
            
        except Exception as e:
            logger.error(f"[NOTIFICATION] Failed to send notification: {e}")
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
