"""
Notification Preferences API Routes
Manages user preferences for notification delivery across channels

Endpoints:
- GET    /notification-preferences         - Get all preferences for current user
- GET    /notification-preferences/defaults - Get default preferences based on user role
- POST   /notification-preferences         - Create/update single preference
- POST   /notification-preferences/bulk    - Bulk update multiple preferences
- DELETE /notification-preferences/{id}    - Delete a preference (reset to default)
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import NotificationPreferences
from app.schemas import (
    NotificationPreferenceCreate,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationPreferencesBulkUpdate
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notification-preferences", tags=["Notification Preferences"])


# Default event types by role
CANDIDATE_EVENTS = [
    {"event_type": "application_status", "priority": "normal"},
    {"event_type": "match_found", "priority": "normal"},
    {"event_type": "shortlisted", "priority": "urgent"},
    {"event_type": "invitation", "priority": "urgent"},
    {"event_type": "interview_scheduled", "priority": "urgent"},
    {"event_type": "interview_reminder", "priority": "urgent"},
    {"event_type": "message_received", "priority": "normal"},
    {"event_type": "job_recommendation", "priority": "normal"}
]

RECRUITER_EVENTS = [
    {"event_type": "application_received", "priority": "normal"},
    {"event_type": "match_found", "priority": "normal"},
    {"event_type": "interview_scheduled", "priority": "urgent"},
    {"event_type": "interview_confirmed", "priority": "urgent"},
    {"event_type": "message_received", "priority": "normal"},
    {"event_type": "job_update", "priority": "normal"}
]


@router.get("", response_model=List[NotificationPreferenceRead])
def get_user_preferences(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all notification preferences for the current user.
    If no preferences exist, creates and returns defaults.
    """
    try:
        user_id = current_user.get("user_id")
        user_role = current_user.get("role", "")
        
        # Check for existing preferences
        preferences = session.exec(
            select(NotificationPreferences)
            .where(NotificationPreferences.user_id == user_id)
            .order_by(NotificationPreferences.event_type)
        ).all()
        
        # If no preferences exist, create defaults
        if not preferences:
            logger.info(f"Creating default preferences for user {user_id} ({user_role})")
            preferences = _create_default_preferences(session, user_id, user_role)
        
        return preferences
        
    except Exception as e:
        logger.error(f"Failed to get preferences for user {current_user.get('user_id')}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve preferences: {str(e)}")


@router.get("/defaults", response_model=List[dict])
def get_default_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    Get default preference templates based on user role.
    Useful for frontend to show what events are available.
    """
    user_role = current_user.get("role", "").lower()
    
    if user_role == "candidate":
        events = CANDIDATE_EVENTS
    elif user_role in ["recruiter", "hr", "admin"]:
        events = RECRUITER_EVENTS
    else:
        events = []
    
    # Add default settings to each event
    defaults = []
    for event in events:
        defaults.append({
            "event_type": event["event_type"],
            "in_app_enabled": True,
            "email_enabled": True,
            "in_app_frequency": "realtime",
            "email_frequency": "realtime",
            "priority": event["priority"]
        })
    
    return defaults


@router.post("", response_model=NotificationPreferenceRead)
def create_or_update_preference(
    preference_data: NotificationPreferenceCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create or update a single notification preference.
    If preference for this event_type exists, updates it; otherwise creates new.
    """
    try:
        user_id = current_user.get("user_id")
        
        # Check if preference already exists
        existing = session.exec(
            select(NotificationPreferences)
            .where(
                NotificationPreferences.user_id == user_id,
                NotificationPreferences.event_type == preference_data.event_type
            )
        ).first()
        
        if existing:
            # Update existing preference
            for key, value in preference_data.model_dump().items():
                setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            logger.info(f"Updated preference for user {user_id}, event {preference_data.event_type}")
            return existing
        else:
            # Create new preference
            new_pref = NotificationPreferences(
                user_id=user_id,
                **preference_data.model_dump()
            )
            session.add(new_pref)
            session.commit()
            session.refresh(new_pref)
            logger.info(f"Created preference for user {user_id}, event {preference_data.event_type}")
            return new_pref
            
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to create/update preference: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save preference: {str(e)}")


@router.patch("/{event_type}", response_model=NotificationPreferenceRead)
def update_preference_by_event(
    event_type: str,
    update_data: NotificationPreferenceUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update specific fields of a preference by event_type.
    Only updates fields that are provided (not None).
    """
    try:
        user_id = current_user.get("user_id")
        
        # Find existing preference
        preference = session.exec(
            select(NotificationPreferences)
            .where(
                NotificationPreferences.user_id == user_id,
                NotificationPreferences.event_type == event_type
            )
        ).first()
        
        if not preference:
            raise HTTPException(
                status_code=404,
                detail=f"No preference found for event type: {event_type}"
            )
        
        # Update only provided fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(preference, key, value)
        
        preference.updated_at = datetime.utcnow()
        session.add(preference)
        session.commit()
        session.refresh(preference)
        
        logger.info(f"Patched preference for user {user_id}, event {event_type}")
        return preference
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to update preference: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update preference: {str(e)}")


@router.post("/bulk", response_model=List[NotificationPreferenceRead])
def bulk_update_preferences(
    bulk_data: NotificationPreferencesBulkUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Bulk update multiple preferences at once.
    Creates new preferences if they don't exist, updates if they do.
    """
    try:
        user_id = current_user.get("user_id")
        updated_preferences = []
        
        for pref_dict in bulk_data.preferences:
            event_type = pref_dict.get("event_type")
            if not event_type:
                logger.warning(f"Skipping preference without event_type: {pref_dict}")
                continue
            
            # Find or create preference
            preference = session.exec(
                select(NotificationPreferences)
                .where(
                    NotificationPreferences.user_id == user_id,
                    NotificationPreferences.event_type == event_type
                )
            ).first()
            
            if preference:
                # Update existing
                for key, value in pref_dict.items():
                    if key != "event_type" and hasattr(preference, key):
                        setattr(preference, key, value)
                preference.updated_at = datetime.utcnow()
            else:
                # Create new
                preference = NotificationPreferences(
                    user_id=user_id,
                    event_type=event_type,
                    in_app_enabled=pref_dict.get("in_app_enabled", True),
                    email_enabled=pref_dict.get("email_enabled", True),
                    in_app_frequency=pref_dict.get("in_app_frequency", "realtime"),
                    email_frequency=pref_dict.get("email_frequency", "realtime"),
                    priority=pref_dict.get("priority", "normal")
                )
            
            session.add(preference)
            updated_preferences.append(preference)
        
        session.commit()
        
        # Refresh all
        for pref in updated_preferences:
            session.refresh(pref)
        
        logger.info(f"Bulk updated {len(updated_preferences)} preferences for user {user_id}")
        return updated_preferences
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to bulk update preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk update: {str(e)}")


@router.delete("/{preference_id}")
def delete_preference(
    preference_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete a notification preference (resets to default).
    User can recreate it later if needed.
    """
    try:
        user_id = current_user.get("user_id")
        
        preference = session.exec(
            select(NotificationPreferences)
            .where(
                NotificationPreferences.id == preference_id,
                NotificationPreferences.user_id == user_id
            )
        ).first()
        
        if not preference:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        event_type = preference.event_type
        session.delete(preference)
        session.commit()
        
        logger.info(f"Deleted preference {preference_id} for user {user_id}, event {event_type}")
        return {"message": "Preference deleted successfully", "event_type": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete preference: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete preference: {str(e)}")


# ── Helper functions ──

def _create_default_preferences(
    session: Session,
    user_id: int,
    user_role: str
) -> List[NotificationPreferences]:
    """Create default preferences for a user based on their role"""
    
    user_role = user_role.lower()
    
    if user_role == "candidate":
        events = CANDIDATE_EVENTS
    elif user_role in ["recruiter", "hr", "admin"]:
        events = RECRUITER_EVENTS
    else:
        events = []
    
    preferences = []
    for event in events:
        pref = NotificationPreferences(
            user_id=user_id,
            event_type=event["event_type"],
            in_app_enabled=True,
            email_enabled=True,
            in_app_frequency="realtime",
            email_frequency="realtime",
            priority=event["priority"]
        )
        session.add(pref)
        preferences.append(pref)
    
    session.commit()
    
    # Refresh all
    for pref in preferences:
        session.refresh(pref)
    
    return preferences
