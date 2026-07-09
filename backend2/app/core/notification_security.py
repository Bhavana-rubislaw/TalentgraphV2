"""
Notification Security Module — TalentGraph V2
==============================================
Security hardening for notification system:
- Email content redaction (no PII in emails)
- Authorization checks for deep-linked entities
- Audit logging for preference changes

CRITICAL: Always sanitize notification content before sending emails.
"""

import logging
from typing import Optional, Dict, Any
from sqlmodel import Session, select

from app.models import User, Application, JobPosting, Meeting

logger = logging.getLogger(__name__)


class NotificationSecurity:
    """Security utilities for notification system"""
    
    @staticmethod
    def sanitize_email_message(message: str, event_type: str) -> str:
        """
        Sanitize notification message for email to avoid PII leakage.
        
        Emails should NOT contain:
        - Salary information
        - Personal contact details
        - Detailed candidate information
        - Internal notes
        
        Instead: Send minimal text with secure link to view details.
        """
        # For most event types, use generic message
        generic_messages = {
            "application_status": "Your application status has been updated. Log in to view details.",
            "match_found": "We found a job that matches your profile. Check your matches.",
            "shortlisted": "Great news! A recruiter has shortlisted your application.",
            "invitation": "You've been invited to apply for a position. View invitation.",
            "interview_scheduled": "Your interview has been scheduled. View details.",
            "interview_reminder": "Reminder: You have an upcoming interview.",
            "message_received": "You have a new message. Log in to view.",
            "application_received": "You received a new application. Review now.",
            "interview_confirmed": "A candidate confirmed the interview. View details.",
            "job_update": "Your job posting has an update. View dashboard.",
            "job_recommendation": "We have a new job recommendation for you."
        }
        
        return generic_messages.get(event_type, "You have a new notification. Log in to view.")
    
    @staticmethod
    def verify_notification_access(
        session: Session,
        user_id: int,
        entity_type: str,
        entity_id: int
    ) -> bool:
        """
        Verify that a user has permission to access the entity linked in a notification.
        
        MUST be called before navigating to deep-linked entities to prevent unauthorized access.
        
        Args:
            session: Database session
            user_id: User attempting to access
            entity_type: Type of entity (application, job, meeting, etc.)
            entity_id: ID of the entity
            
        Returns:
            True if access is authorized, False otherwise
        """
        try:
            if entity_type == "application":
                # Check if user is candidate of this application or recruiter of the job
                application = session.get(Application, entity_id)
                if not application:
                    return False
                
                # Get user
                user = session.get(User, user_id)
                if not user:
                    return False
                
                # Allow if candidate owns application
                if user.role == "candidate" and application.candidate_id == user_id:
                    return True
                
                # Allow if recruiter owns the job posting
                if user.role == "recruiter":
                    job = session.get(JobPosting, application.job_posting_id)
                    if job and job.recruiter_id == user_id:
                        return True
                
                return False
            
            elif entity_type == "job_posting":
                # Check if user is recruiter of this job or if job is active
                job = session.get(JobPosting, entity_id)
                if not job:
                    return False
                
                user = session.get(User, user_id)
                if not user:
                    return False
                
                # Recruiters can access their own jobs
                if user.role == "recruiter" and job.recruiter_id == user_id:
                    return True
                
                # Candidates can access active jobs
                if user.role == "candidate" and job.status == "active":
                    return True
                
                return False
            
            elif entity_type == "meeting":
                # Check if user is participant in this meeting
                meeting = session.get(Meeting, entity_id)
                if not meeting:
                    return False
                
                # Allow if user is either candidate or recruiter in the meeting
                if user_id == meeting.candidate_id or user_id == meeting.recruiter_id:
                    return True
                
                return False
            
            else:
                # Unknown entity type - deny by default
                logger.warning(f"[SECURITY] Unknown entity type for access check: {entity_type}")
                return False
        
        except Exception as e:
            logger.error(f"[SECURITY] Error verifying notification access: {e}", exc_info=True)
            return False
    
    @staticmethod
    def audit_preference_change(
        session: Session,
        user_id: int,
        event_type: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any]
    ):
        """
        Audit log for notification preference changes.
        
        Important for compliance and debugging user notification issues.
        """
        try:
            from app.services.audit import log_activity_event
            
            log_activity_event(
                session=session,
                user_id=user_id,
                action="notification_preference_changed",
                entity_type="notification_preference",
                entity_id=None,
                details={
                    "event_type": event_type,
                    "old_values": old_values,
                    "new_values": new_values,
                    "timestamp": str(datetime.utcnow())
                }
            )
            
            logger.info(
                f"[SECURITY] Preference changed by user {user_id}: "
                f"{event_type} {old_values} -> {new_values}"
            )
        
        except Exception as e:
            logger.error(f"[SECURITY] Failed to audit preference change: {e}")
            # Don't fail the request if audit logging fails
    
    @staticmethod
    def check_entity_exists(
        session: Session,
        entity_type: str,
        entity_id: int
    ) -> bool:
        """
        Check if a notification target entity still exists.
        
        Used for deep-link validation before navigation.
        Returns False if entity deleted/archived.
        """
        try:
            if entity_type == "application":
                return session.get(Application, entity_id) is not None
            elif entity_type == "job_posting":
                return session.get(JobPosting, entity_id) is not None
            elif entity_type == "meeting":
                return session.get(Meeting, entity_id) is not None
            else:
                return False
        except Exception as e:
            logger.error(f"[SECURITY] Error checking entity existence: {e}")
            return False
    
    @staticmethod
    def generate_secure_preview(
        message: str,
        max_length: int = 100,
        redact_emails: bool = True,
        redact_phones: bool = True
    ) -> str:
        """
        Generate safe preview of notification message by redacting sensitive info.
        
        Used for notification lists and email summaries.
        """
        import re
        
        preview = message[:max_length]
        
        # Redact email addresses
        if redact_emails:
            preview = re.sub(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                '[EMAIL REDACTED]',
                preview
            )
        
        # Redact phone numbers (simple pattern - US format)
        if redact_phones:
            preview = re.sub(
                r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
                '[PHONE REDACTED]',
                preview
            )
        
        # Add ellipsis if truncated
        if len(message) > max_length:
            preview += "..."
        
        return preview


# Middleware function for notification routes
def require_notification_owner(session: Session, notification_id: int, user_id: int) -> bool:
    """
    Verify that user owns the notification before allowing access/modification.
    
    Use this in notification endpoints (mark as read, delete, etc.)
    """
    from app.models import Notification
    
    notification = session.get(Notification, notification_id)
    if not notification:
        return False
    
    return notification.user_id == user_id


from datetime import datetime
