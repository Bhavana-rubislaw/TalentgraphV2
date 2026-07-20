"""
Admin — User management: direct create, bulk activate/deactivate/delete,
and CSV export.
"""

from __future__ import annotations

import secrets
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, or_

from ..database import get_session
from ..models import Candidate, Company, Organization, User, UserRole
from ..security import hash_password
from ..core.logging_config import get_logger, log_change
from ..workers.email_worker import queue_notification_email
from .admin_shared import require_admin, BulkResult, MAX_BULK_IDS, MAX_EXPORT_ROWS, _stream_csv

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Extended"])


def _generate_secure_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


# PHASE 4 — CREATE USER + INVITATIONS
# ─────────────────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    full_name: str
    email: str
    role: str
    organization_id: Optional[int] = None
    temporary_password: Optional[str] = None


class CreateUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime]
    temporary_password_generated: bool  # True if server generated the password


@router.post("/users", response_model=CreateUserResponse)
def create_user(
    body: CreateUserRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """
    Directly create a new platform user.
    Generates a temporary password if none is provided.
    Creates the required candidate or company profile.
    """
    normalized_email = body.email.lower().strip()

    # Validate role
    valid_roles = {r.value for r in UserRole}
    if body.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    role = UserRole(body.role.lower())

    # Company-side roles require organization
    if role in (UserRole.RECRUITER, UserRole.HR) and not body.organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required for recruiter and HR users")

    if body.organization_id:
        org = session.get(Organization, body.organization_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

    # Check email uniqueness
    existing = session.exec(select(User).where(User.email == normalized_email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Password
    generated_password = False
    password = body.temporary_password or ""
    if not password:
        password = _generate_secure_password()
        generated_password = True

    try:
        pw_hash = hash_password(password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create user
    user = User(
        email=normalized_email,
        full_name=body.full_name.strip(),
        password_hash=pw_hash,
        role=role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(user)
    session.flush()  # get user.id

    # Create profile
    if role == UserRole.CANDIDATE:
        cand = Candidate(
            user_id=user.id,
            name=body.full_name.strip(),
            email=normalized_email,
            phone="",
            residential_address="",
            location_state="",
            location_county="",
            location_zipcode="",
        )
        session.add(cand)
    elif role in (UserRole.RECRUITER, UserRole.HR):
        org_name = ""
        if body.organization_id:
            org = session.get(Organization, body.organization_id)
            if org:
                org_name = org.name
        comp = Company(
            user_id=user.id,
            organization_id=body.organization_id,
            company_name=org_name,
            company_email=normalized_email,
            employee_type=role.value,
        )
        session.add(comp)

    session.commit()
    session.refresh(user)

    # Queue welcome email (best effort)
    try:
        subject = "Welcome to TalentGraph"
        pwd_note = f"<p>Your temporary password is: <strong>{password}</strong></p><p>Please change it after first login.</p>" if generated_password else "<p>Use the password provided by your administrator to log in.</p>"
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to TalentGraph, {body.full_name}!</h2>
        <p>Your account has been created by an administrator.</p>
        {pwd_note}
        <p><a href="http://localhost:3003" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Log In</a></p>
        </body></html>
        """
        queue_notification_email(
            session=session,
            user_id=user.id,
            event_type="welcome",
            recipient_email=normalized_email,
            subject=subject,
            html_body=html_body,
        )
    except Exception as e:
        logger.warning(f"[CREATE_USER] Failed to queue welcome email: {e}")

    log_change(
        logger,
        action="user_created_by_admin",
        entity_type="user",
        entity_id=str(user.id),
        changes={"email": normalized_email, "role": role.value},
        user_id=current_user.get("user_id"),
    )

    return CreateUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at,
        temporary_password_generated=generated_password,
    )

class BulkActionRequest(BaseModel):
    user_ids: List[int]
    action: str  # activate | deactivate | delete


class BulkActionResponse(BaseModel):
    requested: int
    succeeded: int
    failed: int
    results: List[BulkResult]

@router.post("/users/bulk-action", response_model=BulkActionResponse)
def bulk_user_action(
    body: BulkActionRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Bulk activate, deactivate, or delete users."""
    allowed_actions = {"activate", "deactivate", "delete"}
    if body.action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"action must be one of: {', '.join(allowed_actions)}")

    # Deduplicate and cap
    ids = list(dict.fromkeys(body.user_ids))[:MAX_BULK_IDS]
    if len(body.user_ids) > MAX_BULK_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_IDS} IDs per request")

    current_admin_id = current_user.get("user_id")
    results: List[BulkResult] = []

    for uid in ids:
        try:
            if uid == current_admin_id:
                results.append(BulkResult(id=uid, ok=False, error="Cannot modify your own account"))
                continue

            user = session.get(User, uid)
            if not user:
                results.append(BulkResult(id=uid, ok=False, error="User not found"))
                continue

            if body.action == "activate":
                user.is_active = True
                session.add(user)
            elif body.action == "deactivate":
                user.is_active = False
                session.add(user)
            elif body.action == "delete":
                session.delete(user)

            log_change(
                logger,
                action=f"bulk_user_{body.action}",
                entity_type="user",
                entity_id=str(uid),
                changes={"action": body.action},
                user_id=current_admin_id,
            )
            results.append(BulkResult(id=uid, ok=True))
        except Exception as e:
            results.append(BulkResult(id=uid, ok=False, error=str(e)[:200]))

    session.commit()
    succeeded = sum(1 for r in results if r.ok)
    return BulkActionResponse(
        requested=len(ids),
        succeeded=succeeded,
        failed=len(ids) - succeeded,
        results=results,
    )

@router.get("/users/export.csv")
def export_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    """Export filtered users as CSV."""
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.email.ilike(pattern), User.full_name.ilike(pattern)))
    if role:
        query = query.where(User.role == role.lower())
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    users = session.exec(query.order_by(User.created_at.desc()).limit(MAX_EXPORT_ROWS)).all()

    headers = ["ID", "Name", "Email", "Role", "Status", "Created At"]
    rows = []
    for u in users:
        rows.append([
            u.id,
            u.full_name or "",
            u.email,
            u.role.value if hasattr(u.role, "value") else str(u.role),
            "Active" if u.is_active else "Inactive",
            u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "",
        ])

    return _stream_csv(headers, rows, "users_export.csv")

