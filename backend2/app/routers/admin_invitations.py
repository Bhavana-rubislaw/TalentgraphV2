"""
Admin — Invitation workflow: create, list, resend, and the public
token-based acceptance endpoint (mounted under /auth, not /api/admin).
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func, or_

from ..database import get_session
from ..models import Candidate, Company, InvitationStatus, Organization, User, UserInvitation, UserRole
from ..security import hash_password
from ..core.logging_config import get_logger, log_change
from ..workers.email_worker import queue_notification_email
from .admin_shared import require_admin

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])

INVITATION_EXPIRY_HOURS = 168  # 7 days
RESEND_COOLDOWN_MINUTES = 5


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


# ── Invitations ────────────────────────────────────────────────────────────────

class CreateInvitationRequest(BaseModel):
    full_name: str
    email: str
    role: str
    organization_id: Optional[int] = None


class InvitationSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_id: Optional[int]
    status: str
    expires_at: datetime
    created_at: datetime


class InvitationListResponse(BaseModel):
    invitations: List[InvitationSummary]
    total: int
    limit: int
    offset: int


@router.post("/invitations", response_model=InvitationSummary)
def create_invitation(
    body: CreateInvitationRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Issue a new user invitation by email."""
    normalized_email = body.email.lower().strip()

    valid_roles = {r.value for r in UserRole}
    if body.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    role = UserRole(body.role.lower())
    if role in (UserRole.RECRUITER, UserRole.HR) and not body.organization_id:
        raise HTTPException(status_code=400, detail="organization_id required for recruiter/HR invitations")

    if body.organization_id:
        if not session.get(Organization, body.organization_id):
            raise HTTPException(status_code=404, detail="Organization not found")

    # Reject if email already registered
    if session.exec(select(User).where(User.email == normalized_email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Reject if a pending invitation already exists
    existing_invite = session.exec(
        select(UserInvitation).where(
            UserInvitation.email == normalized_email,
            UserInvitation.status == InvitationStatus.PENDING.value,
        )
    ).first()
    if existing_invite:
        if existing_invite.expires_at > datetime.utcnow():
            raise HTTPException(
                status_code=409, detail="A pending invitation already exists for this email"
            )
        else:
            # Expire the old one
            existing_invite.status = InvitationStatus.EXPIRED.value
            session.add(existing_invite)

    # Generate secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=INVITATION_EXPIRY_HOURS)

    invite = UserInvitation(
        email=normalized_email,
        full_name=body.full_name.strip(),
        role=role,
        organization_id=body.organization_id,
        token_hash=token_hash,
        invited_by_user_id=current_user.get("user_id"),
        status=InvitationStatus.PENDING.value,
        expires_at=expires_at,
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)

    # Queue invitation email
    try:
        accept_url = f"http://localhost:3003/accept-invite?token={raw_token}"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>You've been invited to TalentGraph</h2>
        <p>Hi {body.full_name},</p>
        <p>You have been invited to join TalentGraph as a <strong>{role.value}</strong>.</p>
        <p>This invitation expires in 7 days.</p>
        <p><a href="{accept_url}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
        <p style="color:#888;font-size:12px;">Or copy this link: {accept_url}</p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=current_user.get("user_id"),
            event_type="user_invitation",
            recipient_email=normalized_email,
            subject="You're invited to TalentGraph",
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[INVITE] Failed to queue invitation email: {e}")

    log_change(
        logger,
        action="invitation_created",
        entity_type="invitation",
        entity_id=str(invite.id),
        changes={"email": normalized_email, "role": role.value},
        user_id=current_user.get("user_id"),
    )

    return _invitation_to_summary(invite)


@router.get("/invitations", response_model=InvitationListResponse)
def list_invitations(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """List all invitations."""
    query = select(UserInvitation)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(UserInvitation.email.ilike(pattern), UserInvitation.full_name.ilike(pattern))
        )
    if status:
        query = query.where(UserInvitation.status == status)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    invites = session.exec(query.order_by(UserInvitation.created_at.desc()).limit(limit).offset(offset)).all()

    return InvitationListResponse(
        invitations=[_invitation_to_summary(i) for i in invites],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/invitations/{invitation_id}/resend")
def resend_invitation(
    invitation_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Resend a pending invitation (with cooldown check)."""
    invite = session.get(UserInvitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Only pending invitations can be resent")

    # Simple cooldown: check if created_at + cooldown > now (or use updated_at)
    cooldown_cutoff = datetime.utcnow() - timedelta(minutes=RESEND_COOLDOWN_MINUTES)
    if invite.created_at > cooldown_cutoff:
        raise HTTPException(
            status_code=429, detail=f"Please wait {RESEND_COOLDOWN_MINUTES} minutes between resends"
        )

    # Generate new token
    raw_token = secrets.token_urlsafe(32)
    invite.token_hash = _hash_token(raw_token)
    invite.expires_at = datetime.utcnow() + timedelta(hours=INVITATION_EXPIRY_HOURS)
    session.add(invite)
    session.commit()

    try:
        accept_url = f"http://localhost:3003/accept-invite?token={raw_token}"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>TalentGraph Invitation (Resent)</h2>
        <p>Hi {invite.full_name},</p>
        <p>Your invitation link has been refreshed. It expires in 7 days.</p>
        <p><a href="{accept_url}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=current_user.get("user_id"),
            event_type="user_invitation",
            recipient_email=invite.email,
            subject="Your TalentGraph invitation (updated link)",
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[INVITE_RESEND] Failed to queue invitation email: {e}")

    log_change(
        logger,
        action="invitation_resent",
        entity_type="invitation",
        entity_id=str(invitation_id),
        changes={"email": invite.email},
        user_id=current_user.get("user_id"),
    )

    return {"ok": True, "message": "Invitation resent"}


def _invitation_to_summary(invite: UserInvitation) -> InvitationSummary:
    return InvitationSummary(
        id=invite.id,
        email=invite.email,
        full_name=invite.full_name,
        role=invite.role.value if hasattr(invite.role, "value") else str(invite.role),
        organization_id=invite.organization_id,
        status=invite.status,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
    )



accept_router = APIRouter(prefix="/auth", tags=["Auth"])


class AcceptInvitationRequest(BaseModel):
    password: str


@accept_router.post("/invitations/{token}/accept")
def accept_invitation(
    token: str,
    body: AcceptInvitationRequest,
    session: Session = Depends(get_session),
):
    """
    Accept an invitation and create the user account.
    This is a public endpoint (no admin auth required).
    """
    token_hash = _hash_token(token)
    invite = session.exec(
        select(UserInvitation).where(UserInvitation.token_hash == token_hash)
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    if invite.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invitation already used or expired")
    if invite.expires_at < datetime.utcnow():
        invite.status = InvitationStatus.EXPIRED.value
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    normalized_email = invite.email.lower().strip()
    if session.exec(select(User).where(User.email == normalized_email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        pw_hash = hash_password(body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    role = invite.role if isinstance(invite.role, UserRole) else UserRole(invite.role)

    user = User(
        email=normalized_email,
        full_name=invite.full_name,
        password_hash=pw_hash,
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(user)
    session.flush()

    if role == UserRole.CANDIDATE:
        session.add(Candidate(
            user_id=user.id,
            name=invite.full_name,
            email=normalized_email,
            phone="",
            residential_address="",
            location_state="",
            location_county="",
            location_zipcode="",
        ))
    elif role in (UserRole.RECRUITER, UserRole.HR):
        org_name = ""
        if invite.organization_id:
            org = session.get(Organization, invite.organization_id)
            if org:
                org_name = org.name
        session.add(Company(
            user_id=user.id,
            organization_id=invite.organization_id,
            company_name=org_name,
            company_email=normalized_email,
            employee_type=role.value,
        ))

    # Mark invitation as accepted (single-use)
    invite.status = InvitationStatus.ACCEPTED.value
    invite.accepted_at = datetime.utcnow()
    session.add(invite)
    session.commit()

    return {"ok": True, "message": "Account created. You can now log in."}

