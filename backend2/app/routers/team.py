"""
Team management routes
Company-scoped team invitations, member listing, role updates, and removal.

Invitation design:
  - Admin/HR sends invite → token stored (hashed) in TeamInvite table
  - On localhost: raw token returned in API response for manual testing
  - Production: plug email service into _send_invite_email() below
  - Invitee visits /accept-invite?token=XYZ, registers, and is linked to company
"""

import hashlib
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from app.database import get_session
from app.models import Company, TeamInvite, TeamInviteStatus, User, UserRole
from app.security import get_current_user, hash_password
from app.core.logging_config import get_logger
from app import emailer

logger = get_logger(__name__)
router = APIRouter(prefix="/company/team", tags=["Team Management"])

INVITE_EXPIRY_HOURS = 72  # 3 days


# ─── helpers ─────────────────────────────────────────────────────────────────

def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_primary_company(session: Session, user_id: int) -> Company:
    """Resolve a user's primary (parent) company."""
    company = session.exec(select(Company).where(Company.user_id == user_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    if company.parent_company_id:
        parent = session.get(Company, company.parent_company_id)
        if parent:
            return parent
    return company


def _send_invite_email(
    invitee_email: str,
    raw_token: str,
    role: str,
    company_name: str,
) -> None:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")
    invite_url = f"{frontend_url}/accept-invite?token={raw_token}"
    role_label = role.capitalize()

    html_body = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <div style="margin-bottom:24px;">
        <span style="font-size:22px;font-weight:700;color:#111827;">TalentGraph</span>
      </div>
      <h2 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 12px;">You've been invited to join {company_name}</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        You have been invited as a <strong style="color:#111827;">{role_label}</strong> on TalentGraph.
        Click the button below to set up your account and accept the invitation.
      </p>
      <a href="{invite_url}"
         style="display:inline-block;background:#6366f1;color:#ffffff;font-weight:600;font-size:15px;
                padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
        Accept Invitation
      </a>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">
        Or copy this link into your browser:
      </p>
      <p style="color:#6366f1;font-size:13px;word-break:break-all;margin:0 0 24px;">
        {invite_url}
      </p>
      <p style="color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;padding-top:16px;margin:0;">
        This invitation expires in 72 hours. If you did not expect this email, you can safely ignore it.
      </p>
    </div>
    """

    try:
        emailer.send_email(
            to_email=invitee_email,
            subject=f"You're invited to join {company_name} on TalentGraph",
            html_body=html_body,
        )
        logger.info(f"[TEAM_INVITE] Invitation email sent to {invitee_email} | role={role} | company={company_name}")
    except emailer.EmailConfigError:
        logger.warning(f"[TEAM_INVITE] Email not configured — invite link for {invitee_email}: {invite_url}")
    except Exception as exc:
        logger.error(f"[TEAM_INVITE] Failed to send invite email to {invitee_email}: {exc}")
        raise


# ─── schemas ──────────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: EmailStr
    role: str           # "hr" or "recruiter"


class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str


class MemberRead(BaseModel):
    id: int             # company record id
    user_id: int
    name: str
    email: str
    role: str
    jobs_posted: int
    status: str
    is_self: bool
    is_primary_account: bool


class RoleUpdateRequest(BaseModel):
    role: str           # "hr" or "recruiter"


class ValidateInviteResponse(BaseModel):
    valid: bool
    invitee_email: str
    role: str
    company_name: str


# ─── routes ───────────────────────────────────────────────────────────────────

@router.post("/invite", response_model=dict, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    body: InviteRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Send a team invitation (Admin or HR only).

    Returns the raw token in the response for localhost / dev testing.
    In production configure FRONTEND_URL and plug in an email service.

    Permission rules:
    - ADMIN can invite HR and RECRUITER.
    - HR can only invite RECRUITER.
    """
    inviter_role = (current_user.get("role") or "").lower()
    if inviter_role not in {"admin", "hr"}:
        raise HTTPException(status_code=403, detail="Only Admin or HR can invite team members")

    invited_role = body.role.lower()
    if invited_role not in {"hr", "recruiter"}:
        raise HTTPException(status_code=422, detail="Role must be 'hr' or 'recruiter'")
    if inviter_role == "hr" and invited_role == "hr":
        raise HTTPException(status_code=403, detail="HR can only invite Recruiter members")

    # Resolve inviter's primary company
    primary = _get_primary_company(session, current_user["user_id"])

    # Check if email is already a registered user
    existing_user = session.exec(
        select(User).where(User.email == body.email.lower())
    ).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    # Revoke any pending invite for the same email at this company
    old_invite = session.exec(
        select(TeamInvite)
        .where(TeamInvite.company_id == primary.id)
        .where(TeamInvite.invitee_email == body.email.lower())
        .where(TeamInvite.status == TeamInviteStatus.PENDING.value)
    ).first()
    if old_invite:
        old_invite.status = TeamInviteStatus.REVOKED.value
        session.add(old_invite)

    # Generate a secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    role_enum = UserRole.HR if invited_role == "hr" else UserRole.RECRUITER

    invite = TeamInvite(
        company_id=primary.id,
        invited_by_user_id=current_user["user_id"],
        invitee_email=body.email.lower(),
        role=role_enum,
        token_hash=token_hash,
        status=TeamInviteStatus.PENDING.value,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=INVITE_EXPIRY_HOURS),
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)

    # Attempt email send (stub on localhost)
    _send_invite_email(
        invitee_email=body.email.lower(),
        raw_token=raw_token,
        role=invited_role,
        company_name=primary.company_name,
    )

    logger.info(
        f"[TEAM] Invite sent to {body.email} as {invited_role} "
        f"for company {primary.id} by user {current_user['user_id']}"
    )
    return {
        "ok": True,
        "invite_id": invite.id,
        "invitee_email": invite.invitee_email,
        "role": invited_role,
        "expires_at": invite.expires_at.isoformat(),
    }


@router.get("/validate-invite", response_model=ValidateInviteResponse)
def validate_invite(
    token: str = Query(..., description="Raw invite token from URL"),
    session: Session = Depends(get_session),
):
    """
    Validate an invite token and return basic info for the registration form.
    Public endpoint — no authentication required.
    """
    token_hash = _hash_token(token)
    invite = session.exec(
        select(TeamInvite).where(TeamInvite.token_hash == token_hash)
    ).first()

    if not invite:
        return ValidateInviteResponse(valid=False, invitee_email="", role="", company_name="")

    if invite.status != TeamInviteStatus.PENDING.value:
        return ValidateInviteResponse(valid=False, invitee_email=invite.invitee_email, role="", company_name="")

    if datetime.now(timezone.utc) > invite.expires_at.replace(tzinfo=timezone.utc):
        invite.status = TeamInviteStatus.EXPIRED.value
        session.add(invite)
        session.commit()
        return ValidateInviteResponse(valid=False, invitee_email=invite.invitee_email, role="", company_name="")

    company = session.get(Company, invite.company_id)
    return ValidateInviteResponse(
        valid=True,
        invitee_email=invite.invitee_email,
        role=invite.role.value,
        company_name=company.company_name if company else "",
    )


@router.post("/accept-invite", response_model=dict)
def accept_invite(
    body: AcceptInviteRequest,
    session: Session = Depends(get_session),
):
    """
    Accept a team invitation and create a new user account.
    Public endpoint — no authentication required.
    """
    token_hash = _hash_token(body.token)
    invite = session.exec(
        select(TeamInvite).where(TeamInvite.token_hash == token_hash)
    ).first()

    if not invite or invite.status != TeamInviteStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invalid or already used invitation")

    if datetime.now(timezone.utc) > invite.expires_at.replace(tzinfo=timezone.utc):
        invite.status = TeamInviteStatus.EXPIRED.value
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Check email hasn't been registered since invite was sent
    existing = session.exec(
        select(User).where(User.email == invite.invitee_email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This email is already registered. Please log in instead.",
        )

    primary_company = session.get(Company, invite.company_id)
    if not primary_company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Validate password
    try:
        pw_hash = hash_password(body.password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Create User
    new_user = User(
        email=invite.invitee_email,
        full_name=body.full_name,
        password_hash=pw_hash,
        role=invite.role,
        is_active=True,
    )
    session.add(new_user)
    session.flush()  # get new_user.id without committing

    # Create Company record linked to the primary account
    new_company = Company(
        user_id=new_user.id,
        company_name=primary_company.company_name,
        company_email=invite.invitee_email,
        employee_type=invite.role.value.upper(),
        parent_company_id=primary_company.id,
        is_primary_account=False,
        current_credits=0,
    )
    session.add(new_company)

    # Mark invite as accepted
    invite.status = TeamInviteStatus.ACCEPTED.value
    invite.accepted_at = datetime.now(timezone.utc)
    session.add(invite)

    session.commit()
    session.refresh(new_user)
    logger.info(
        f"[TEAM] Invite accepted: user {new_user.id} ({new_user.email}) "
        f"joined company {primary_company.id} as {invite.role.value}"
    )
    return {
        "ok": True,
        "message": "Account created successfully. You can now log in.",
        "email": new_user.email,
        "role": new_user.role.value,
    }


@router.get("/members", response_model=List[MemberRead])
def list_members(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List team members for the caller's primary company.

    Visibility:
    - ADMIN: sees all (Admin + HR + Recruiter)
    - HR: sees HR + Recruiter
    - RECRUITER: sees only themselves
    """
    caller_role = (current_user.get("role") or "").lower()
    if caller_role not in {"admin", "hr", "recruiter"}:
        raise HTTPException(status_code=403, detail="Company account required")

    primary = _get_primary_company(session, current_user["user_id"])

    # Collect all company records that belong to this primary account
    # (members have parent_company_id == primary.id, plus the primary itself)
    member_companies = session.exec(
        select(Company).where(Company.parent_company_id == primary.id)
    ).all()
    all_companies = [primary] + list(member_companies)

    # Role visibility filter
    if caller_role == "admin":
        visible = {"ADMIN", "HR", "RECRUITER"}
    elif caller_role == "hr":
        visible = {"HR", "RECRUITER"}
    else:
        visible = {"RECRUITER"}

    from app.models import JobPosting
    result: List[MemberRead] = []
    for comp in all_companies:
        if comp.employee_type.upper() not in visible:
            continue
        user = session.get(User, comp.user_id)
        if not user:
            continue
        job_count = session.exec(
            select(JobPosting).where(JobPosting.company_id == comp.id)
        ).all()
        result.append(
            MemberRead(
                id=comp.id,
                user_id=user.id,
                name=user.full_name,
                email=user.email,
                role=comp.employee_type,
                jobs_posted=len(job_count),
                status="Active" if user.is_active else "Inactive",
                is_self=(user.id == current_user["user_id"]),
                is_primary_account=comp.is_primary_account,
            )
        )

    role_order = {"ADMIN": 0, "HR": 1, "RECRUITER": 2}
    result.sort(key=lambda m: (role_order.get(m.role.upper(), 9), m.name))
    return result


@router.put("/members/{user_id}/role", response_model=dict)
def update_member_role(
    user_id: int,
    body: RoleUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Change a team member's role (Admin only)."""
    if (current_user.get("role") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    new_role = body.role.lower()
    if new_role not in {"hr", "recruiter"}:
        raise HTTPException(status_code=422, detail="Role must be 'hr' or 'recruiter'")

    primary = _get_primary_company(session, current_user["user_id"])

    # Find the target member's company record
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_company = session.exec(
        select(Company).where(Company.user_id == user_id)
    ).first()
    if not target_company:
        raise HTTPException(status_code=404, detail="Target member has no company record")

    # Confirm they belong to the same primary account
    target_primary_id = target_company.parent_company_id or target_company.id
    if target_primary_id != primary.id:
        raise HTTPException(status_code=403, detail="Cannot modify members of a different company")

    role_enum = UserRole.HR if new_role == "hr" else UserRole.RECRUITER
    target_user.role = role_enum
    target_company.employee_type = new_role.upper()
    session.add(target_user)
    session.add(target_company)
    session.commit()

    logger.info(
        f"[TEAM] User {user_id} role changed to {new_role} by admin {current_user['user_id']}"
    )
    return {"ok": True, "user_id": user_id, "new_role": new_role}


@router.delete("/members/{user_id}", response_model=dict)
def remove_member(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Deactivate a team member (Admin only).

    Does not hard-delete the user — sets is_active=False so historical
    data (job postings, applications) is preserved.
    """
    if (current_user.get("role") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    primary = _get_primary_company(session, current_user["user_id"])

    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_company = session.exec(
        select(Company).where(Company.user_id == user_id)
    ).first()
    if not target_company:
        raise HTTPException(status_code=404, detail="Target member has no company record")

    target_primary_id = target_company.parent_company_id or target_company.id
    if target_primary_id != primary.id:
        raise HTTPException(status_code=403, detail="Cannot remove members of a different company")

    target_user.is_active = False
    session.add(target_user)
    session.commit()

    logger.info(
        f"[TEAM] User {user_id} deactivated by admin {current_user['user_id']}"
    )
    return {"ok": True, "user_id": user_id, "message": "Team member deactivated"}


@router.get("/pending-invites", response_model=list)
def list_pending_invites(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List pending team invitations (Admin/HR only)."""
    role = (current_user.get("role") or "").lower()
    if role not in {"admin", "hr"}:
        raise HTTPException(status_code=403, detail="Admin or HR access required")

    primary = _get_primary_company(session, current_user["user_id"])
    invites = session.exec(
        select(TeamInvite)
        .where(TeamInvite.company_id == primary.id)
        .where(TeamInvite.status == TeamInviteStatus.PENDING.value)
        .order_by(TeamInvite.created_at.desc())
    ).all()

    return [
        {
            "id": inv.id,
            "invitee_email": inv.invitee_email,
            "role": inv.role.value,
            "expires_at": inv.expires_at.isoformat(),
            "created_at": inv.created_at.isoformat(),
        }
        for inv in invites
    ]


@router.delete("/invites/{invite_id}", response_model=dict)
def revoke_invite(
    invite_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Revoke a pending invitation (Admin/HR only)."""
    role = (current_user.get("role") or "").lower()
    if role not in {"admin", "hr"}:
        raise HTTPException(status_code=403, detail="Admin or HR access required")

    primary = _get_primary_company(session, current_user["user_id"])
    invite = session.get(TeamInvite, invite_id)
    if not invite or invite.company_id != primary.id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != TeamInviteStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invitation is no longer pending")

    invite.status = TeamInviteStatus.REVOKED.value
    session.add(invite)
    session.commit()
    return {"ok": True, "invite_id": invite_id, "message": "Invitation revoked"}
