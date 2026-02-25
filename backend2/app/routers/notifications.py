"""
Notifications routes
List, read, and mark notifications for candidates and recruiters
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Dict, Any
from app.database import get_session
from app.models import Notification, User
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _get_user(current_user: dict, session: Session) -> User:
    """Resolve User from JWT claims (handles both 'email' and 'sub')."""
    email = current_user.get("email") or current_user.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token: no email")
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("", response_model=List[Dict[str, Any]])
def list_notifications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all notifications for the current user, latest first."""
    user = _get_user(current_user, session)
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()
    return [
        {
            "id": n.id,
            "notification_type": n.notification_type,
            "title": n.title,
            "message": n.message,
            "job_posting_id": n.job_posting_id,
            "job_title": n.job_title,
            "candidate_id": n.candidate_id,
            "candidate_name": n.candidate_name,
            "job_profile_id": n.job_profile_id,
            "job_profile_name": n.job_profile_name,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.get("/unread-count", response_model=Dict[str, int])
def get_unread_count(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get unread notification count for the current user."""
    user = _get_user(current_user, session)
    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
    ).all()
    return {"unread_count": len(notifications)}


@router.put("/{notification_id}/read", response_model=Dict[str, Any])
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Mark a single notification as read."""
    user = _get_user(current_user, session)
    notification = session.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"message": "Notification marked as read", "id": notification_id}


@router.put("/mark-all-read", response_model=Dict[str, Any])
def mark_all_read(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Mark all notifications as read for the current user."""
    user = _get_user(current_user, session)
    unread = session.exec(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
    ).all()
    for n in unread:
        n.is_read = True
        session.add(n)
    session.commit()
    return {"message": f"Marked {len(unread)} notifications as read"}
