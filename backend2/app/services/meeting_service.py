"""
Meeting Management Service
==========================
Centralized service for meeting lifecycle management, including:
- Timeline event creation
- Application status synchronization
- Notification and email integration
- Token generation for email actions
"""

import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlmodel import Session, select
from sqlalchemy import and_

from app.models import (
    Meeting, MeetingTimelineEvent, MeetingActionToken, Application,
    MeetingStatus, MeetingParticipant, User, Notification
)
from app.routers.notifications import push_notification


class MeetingService:
    """Service for managing meeting lifecycle and coordination"""
    
    @staticmethod
    def create_timeline_event(
        session: Session,
        meeting_id: int,
        actor_user_id: int,
        event_type: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        previous_start: Optional[datetime] = None,
        previous_end: Optional[datetime] = None
    ) -> MeetingTimelineEvent:
        """
        Create a timeline event for audit and display
        
        Event types:
        - interview_scheduled
        - recruiter_cancelled
        - candidate_cancelled
        - candidate_requested_reschedule
        - recruiter_rescheduled
        - recruiter_approved_reschedule
        - recruiter_rejected_reschedule
        - reminder_sent
        - attendance_confirmed
        - interview_completed
        - no_show_marked
        """
        # Determine actor role
        user = session.get(User, actor_user_id)
        actor_role = user.role if user else None
        
        event = MeetingTimelineEvent(
            meeting_id=meeting_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            event_type=event_type,
            message=message,
            metadata_json=json.dumps(metadata) if metadata else None,
            previous_scheduled_start=previous_start,
            previous_scheduled_end=previous_end
        )
        
        session.add(event)
        session.commit()
        session.refresh(event)
        
        return event
    
    @staticmethod
    def sync_application_status(
        session: Session,
        meeting: Meeting,
        new_meeting_status: MeetingStatus,
        actor_user_id: int
    ) -> None:
        """
        Synchronize application status based on meeting status changes
        
        Rules:
        - interview scheduled -> application = 'scheduled'
        - interview cancelled by recruiter -> application = 'applied'
        - interview cancelled by candidate -> application stays for recruiter review
        - interview completed -> recruiter updates manually
        """
        if not meeting.application_id:
            return  # No application linked
        
        application = session.get(Application, meeting.application_id)
        if not application:
            return
        
        old_status = application.status
        new_app_status = None
        
        # Determine new application status based on meeting status
        if new_meeting_status == MeetingStatus.SCHEDULED:
            new_app_status = "scheduled"
        
        elif new_meeting_status == MeetingStatus.CANCELLED:
            # If recruiter cancelled, move back to applied
            # If candidate cancelled, keep for recruiter review (don't auto-reject)
            if meeting.cancelled_by_user_id == meeting.organizer_user_id:
                new_app_status = "applied"
            else:
                # Candidate cancelled - don't auto-change status
                # Recruiter will decide next step
                pass
        
        elif new_meeting_status == MeetingStatus.RESCHEDULE_REQUESTED:
            # Keep as scheduled while reschedule is pending
            new_app_status = "scheduled"
        
        elif new_meeting_status == MeetingStatus.RESCHEDULED:
            # Keep as scheduled
            new_app_status = "scheduled"
        
        # Apply status change if determined
        if new_app_status and new_app_status != old_status:
            application.status = new_app_status
            application.last_status_updated_at = datetime.utcnow()
            application.last_status_updated_by_user_id = actor_user_id
            session.add(application)
            session.commit()
    
    @staticmethod
    def generate_action_token(
        session: Session,
        meeting_id: int,
        user_id: int,
        action_type: str,
        expiry_days: int = 30
    ) -> str:
        """
        Generate a secure token for email-based meeting actions
        Action types: 'confirm', 'cancel', 'reschedule'
        """
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=expiry_days)
        
        action_token = MeetingActionToken(
            meeting_id=meeting_id,
            user_id=user_id,
            token=token,
            action_type=action_type,
            expires_at=expires_at
        )
        
        session.add(action_token)
        session.commit()
        
        return token
    
    @staticmethod
    def validate_action_token(
        session: Session,
        token: str,
        meeting_id: int,
        action_type: str
    ) -> Optional[MeetingActionToken]:
        """
        Validate a meeting action token
        Returns token record if valid, None if invalid/expired/used
        """
        token_record = session.exec(
            select(MeetingActionToken).where(
                and_(
                    MeetingActionToken.token == token,
                    MeetingActionToken.meeting_id == meeting_id,
                    MeetingActionToken.action_type == action_type,
                    MeetingActionToken.is_used == False,
                    MeetingActionToken.expires_at > datetime.utcnow()
                )
            )
        ).first()
        
        return token_record
    
    @staticmethod
    def mark_token_used(
        session: Session,
        token_record: MeetingActionToken
    ) -> None:
        """Mark a token as used"""
        token_record.is_used = True
        token_record.used_at = datetime.utcnow()
        session.add(token_record)
        session.commit()
    
    @staticmethod
    def notify_participants(
        session: Session,
        meeting: Meeting,
        notification_type: str,
        title: str,
        message: str,
        exclude_user_id: Optional[int] = None,
        action_url: Optional[str] = None
    ) -> None:
        """
        Send notifications to all meeting participants except excluded user
        """
        for participant in meeting.participants:
            if exclude_user_id and participant.user_id == exclude_user_id:
                continue
            
            push_notification(
                session=session,
                user_id=participant.user_id,
                title=title,
                message=message,
                event_type=notification_type,
                route=action_url or f"/meetings/{meeting.id}"
            )
    
    @staticmethod
    def get_meeting_timeline(
        session: Session,
        meeting_id: int
    ) -> List[MeetingTimelineEvent]:
        """Get all timeline events for a meeting, ordered by creation time"""
        events = session.exec(
            select(MeetingTimelineEvent)
            .where(MeetingTimelineEvent.meeting_id == meeting_id)
            .order_by(MeetingTimelineEvent.created_at.desc())
        ).all()
        
        return list(events)
    
    @staticmethod
    def get_participant_role(
        session: Session,
        meeting: Meeting,
        user_id: int
    ) -> Optional[str]:
        """
        Determine user's role in a meeting
        Returns: 'organizer', 'participant', or None
        """
        if meeting.organizer_user_id == user_id:
            return 'organizer'
        
        for participant in meeting.participants:
            if participant.user_id == user_id:
                return 'participant'
        
        return None
    
    @staticmethod
    def is_candidate_participant(
        session: Session,
        meeting: Meeting,
        user_id: int
    ) -> bool:
        """Check if user is a candidate participant (not organizer)"""
        user = session.get(User, user_id)
        if not user:
            return False
        
        # Check if user is participant and has candidate role
        is_participant = any(p.user_id == user_id for p in meeting.participants)
        is_candidate = user.role == "candidate"
        is_not_organizer = meeting.organizer_user_id != user_id
        
        return is_participant and is_candidate and is_not_organizer
    
    @staticmethod
    def get_other_participant(
        session: Session,
        meeting: Meeting,
        exclude_user_id: int
    ) -> Optional[User]:
        """
        Get the other participant in a meeting (useful for 1-on-1 interviews)
        Returns the first participant that is not the excluded user
        """
        for participant in meeting.participants:
            if participant.user_id != exclude_user_id:
                return session.get(User, participant.user_id)
        
        # Check organizer
        if meeting.organizer_user_id != exclude_user_id:
            return session.get(User, meeting.organizer_user_id)
        
        return None
