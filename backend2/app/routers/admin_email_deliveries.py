"""
Admin — Email delivery log: list, detail, and resend.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func, or_

from ..database import get_session
from ..models import EmailDelivery, EmailDeliveryStatus
from ..core.logging_config import get_logger, log_change
from ..workers.email_worker import queue_notification_email
from .admin_shared import require_admin

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7 — EMAIL LOGS
# ─────────────────────────────────────────────────────────────────────────────

class EmailDeliverySummary(BaseModel):
    id: int
    recipient_email: str
    event_type: str
    subject: str
    status: str
    attempts: int
    max_attempts: int
    last_error: Optional[str]
    created_at: Optional[datetime]
    sent_at: Optional[datetime]
    failed_at: Optional[datetime]


class EmailDeliveryListResponse(BaseModel):
    deliveries: List[EmailDeliverySummary]
    total: int
    limit: int
    offset: int


class EmailDeliveryDetailResponse(BaseModel):
    id: int
    recipient_email: str
    event_type: str
    subject: str
    status: str
    attempts: int
    max_attempts: int
    last_error: Optional[str]
    created_at: Optional[datetime]
    sent_at: Optional[datetime]
    failed_at: Optional[datetime]
    # html_body intentionally excluded from response — must be sanitized before use


class ResendEmailResponse(BaseModel):
    ok: bool
    new_delivery_id: int
    message: str


@router.get("/email-deliveries", response_model=EmailDeliveryListResponse)
def list_email_deliveries(
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sent_from: Optional[str] = Query(None),
    sent_to: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List email deliveries with filters."""
    query = select(EmailDelivery)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                EmailDelivery.recipient_email.ilike(pattern),
                EmailDelivery.subject.ilike(pattern),
            )
        )
    if event_type:
        query = query.where(EmailDelivery.event_type == event_type)
    if status:
        query = query.where(EmailDelivery.status == status)
    if sent_from:
        try:
            query = query.where(EmailDelivery.created_at >= datetime.fromisoformat(sent_from))
        except ValueError:
            pass
    if sent_to:
        try:
            query = query.where(EmailDelivery.created_at <= datetime.fromisoformat(sent_to))
        except ValueError:
            pass

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    deliveries = session.exec(
        query.order_by(EmailDelivery.created_at.desc()).limit(limit).offset(offset)
    ).all()

    return EmailDeliveryListResponse(
        deliveries=[_delivery_to_summary(d) for d in deliveries],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/email-deliveries/{delivery_id}", response_model=EmailDeliveryDetailResponse)
def get_email_delivery(
    delivery_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Get email delivery details. HTML body is intentionally excluded (sanitize before display)."""
    delivery = session.get(EmailDelivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Email delivery not found")
    return _delivery_to_detail(delivery)


@router.post("/email-deliveries/{delivery_id}/resend", response_model=ResendEmailResponse)
def resend_email_delivery(
    delivery_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """
    Resend a failed or bounced email by creating a new delivery record.
    The original record is preserved. A new delivery is queued.
    """
    original = session.get(EmailDelivery, delivery_id)
    if not original:
        raise HTTPException(status_code=404, detail="Email delivery not found")

    resendable_statuses = {EmailDeliveryStatus.FAILED.value, EmailDeliveryStatus.BOUNCED.value}
    if original.status not in resendable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Only failed or bounced deliveries can be resent. Current status: {original.status}",
        )

    # Create new delivery (preserves original history)
    new_delivery = queue_notification_email(
        session=session,
        user_id=original.user_id,
        event_type=original.event_type,
        recipient_email=original.recipient_email,
        subject=original.subject,
        html_body=original.html_body or "",
        notification_id=original.notification_id,
    )

    if not new_delivery:
        raise HTTPException(status_code=500, detail="Failed to create new delivery record")

    log_change(
        logger,
        action="email_resent_by_admin",
        entity_type="email_delivery",
        entity_id=str(delivery_id),
        changes={
            "original_id": delivery_id,
            "new_delivery_id": new_delivery.id,
            "recipient": original.recipient_email,
        },
        user_id=current_user.get("user_id"),
    )

    return ResendEmailResponse(
        ok=True,
        new_delivery_id=new_delivery.id,
        message=f"Email queued for resend (new delivery ID: {new_delivery.id})",
    )


def _delivery_to_summary(d: EmailDelivery) -> EmailDeliverySummary:
    return EmailDeliverySummary(
        id=d.id,
        recipient_email=d.recipient_email,
        event_type=d.event_type,
        subject=d.subject,
        status=d.status,
        attempts=d.attempts,
        max_attempts=d.max_attempts,
        last_error=d.last_error,
        created_at=d.created_at,
        sent_at=d.sent_at,
        failed_at=d.failed_at,
    )


def _delivery_to_detail(d: EmailDelivery) -> EmailDeliveryDetailResponse:
    return EmailDeliveryDetailResponse(
        id=d.id,
        recipient_email=d.recipient_email,
        event_type=d.event_type,
        subject=d.subject,
        status=d.status,
        attempts=d.attempts,
        max_attempts=d.max_attempts,
        last_error=d.last_error,
        created_at=d.created_at,
        sent_at=d.sent_at,
        failed_at=d.failed_at,
    )
