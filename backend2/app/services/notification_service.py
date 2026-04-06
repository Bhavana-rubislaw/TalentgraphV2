"""
Centralized Notification Service — TalentGraph V2
==================================================
Consolidates notification creation logic that was previously duplicated
across multiple routers (swipes, applications, matches, etc.)
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlmodel import Session, select

from app.models import Notification, User

logger = logging.getLogger(__name__)


class NotificationService:
    """Centralized service for creating and managing notifications."""
    
    @staticmethod
    def create_notification(
        session: Session,
        user_email: str,
        event_type: str,
        data: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> Optional[Notification]:
        """
        Create a notification for a user.
        
        Args:
            session: Database session
            user_email: Email of the user to notify
            event_type: Type of notification event
            data: Optional JSON payload with additional data
            commit: Whether to commit the transaction (default True)
            
        Returns:
            Created Notification object or None if user not found
        """
        try:
            # Find user by email
            user = session.exec(
                select(User).where(User.email == user_email)
            ).first()
            
            if not user:
                logger.warning(f"[NOTIFICATION] User not found: {user_email}")
                return None
            
            # Create notification
            notification = Notification(
                user_id=user.id,
                event_type=event_type,
                data=data or {},
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
            for email in user_emails:
                user = user_map.get(email)
                if not user:
                    logger.warning(f"[NOTIFICATION] User not found in bulk: {email}")
                    continue
                
                notification = Notification(
                    user_id=user.id,
                    event_type=event_type,
                    data=data or {},
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
