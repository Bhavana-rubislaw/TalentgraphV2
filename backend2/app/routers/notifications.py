"""
Notifications routes — in-app notification bell & drawer
GET  /notifications              — list with filters
GET  /notifications/unread-count — badge count
POST /notifications/{id}/read    — mark single read
POST /notifications/read-all     — mark all read
DELETE /notifications/{id}       — delete single
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc

from app.database import get_session
from app.models import Notification, User
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Internal helper —————————————————————————————————————
def push_notification(
    session: Session,
    user_id: int,
    title: str,
    message: str,
    event_type: str,
    route: str = "",
    route_context: Optional[Dict[str, Any]] = None,
) -> Notification:
    """Create and persist a notification. Call from other routers."""
    payload = json.dumps({"route": route, "route_context": route_context or {}})
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        event_type=event_type,
        payload=payload,
    )
    session.add(notif)
    session.commit()
    session.refresh(notif)
    return notif


def _serialize(n: Notification) -> Dict[str, Any]:
    payload = {}
    if n.payload:
        try:
            payload = json.loads(n.payload)
        except Exception:
            pass
    return {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "event_type": n.event_type,
        "read": n.is_read,
        "timestamp": n.created_at.isoformat() + "Z",
        "payload": payload,
    }


# ── Endpoints ——————————————————————————————————————————

@router.get("", response_model=List[Dict[str, Any]])
def list_notifications(
    unread_only: bool = Query(False),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    if category:
        query = query.where(Notification.event_type == category)

    query = query.order_by(desc(Notification.created_at))
    query = query.offset((page - 1) * limit).limit(limit)

    notifications = session.exec(query).all()
    return [_serialize(n) for n in notifications]


@router.get("/unread-count", response_model=Dict[str, int])
def unread_count(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    count = len(
        session.exec(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.is_read == False,
            )
        ).all()
    )
    return {"count": count}


@router.post("/read-all", response_model=Dict[str, str])
def mark_all_read(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    unread = session.exec(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
    ).all()
    for n in unread:
        n.is_read = True
        session.add(n)
    session.commit()
    return {"message": f"Marked {len(unread)} notifications as read"}


@router.post("/{notification_id}/read", response_model=Dict[str, str])
def mark_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notif = session.get(Notification, notification_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    session.add(notif)
    session.commit()
    return {"message": "Marked as read"}


@router.delete("/{notification_id}", response_model=Dict[str, str])
def delete_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notif = session.get(Notification, notification_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    session.delete(notif)
    session.commit()
    return {"message": "Deleted"}
