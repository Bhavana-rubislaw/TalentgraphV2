"""
Chat / Messaging router — TalentGraph V2
=========================================
Endpoints
---------
POST   /chat/conversations                    — recruiter creates a conversation
GET    /chat/conversations                    — list conversations for current user
GET    /chat/conversations/{id}/messages      — paginated messages
POST   /chat/conversations/{id}/messages      — send a message
POST   /chat/conversations/{id}/read          — mark messages as read
GET    /presence/{user_id}                    — online presence check

Rules
-----
- Only recruiters / hr / admin can *create* a conversation.
- Eligibility: the recruiter must have liked, invited, or matched the candidate
  for the specified job posting.
- One conversation per (company_id, candidate_id, job_posting_id) — idempotent.
- Candidates can only reply to existing conversations they are a participant of.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, and_

from app.database import get_session
from app.models import (
    Candidate, Company, Conversation, JobPosting, Match, Message, Swipe, User,
)
from app.security import get_current_user
from app.routers.notifications import push_notification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])

# ── Constants ─────────────────────────────────────────────────────────────────
ONLINE_THRESHOLD_SECONDS = 60
COMPANY_ROLES = {"recruiter", "hr", "admin"}

# ── Pydantic request / response schemas ──────────────────────────────────────
class ConversationCreate(BaseModel):
    candidate_id: int
    job_posting_id: int


class MessageCreate(BaseModel):
    text: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _is_online(last_seen_at: Optional[datetime]) -> bool:
    if last_seen_at is None:
        return False
    diff = (_utcnow() - last_seen_at).total_seconds()
    return diff <= ONLINE_THRESHOLD_SECONDS


def _resolve_user(session: Session, email: str) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _resolve_company(session: Session, user_id: int) -> Company:
    company = session.exec(select(Company).where(Company.user_id == user_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company


def _resolve_candidate(session: Session, user_id: int) -> Candidate:
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user_id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return candidate


def _serialize_conversation(
    conv: Conversation,
    session: Session,
    viewer_user_id: int,
) -> Dict[str, Any]:
    """Serialize a Conversation with enriched metadata for the list view."""
    # Candidate info
    candidate = session.get(Candidate, conv.candidate_id)
    candidate_user = session.get(User, candidate.user_id) if candidate else None
    candidate_name = candidate.name if candidate else "Unknown"
    candidate_user_id = candidate_user.id if candidate_user else None

    # Company/Recruiter info
    company = session.get(Company, conv.company_id)
    company_user = session.get(User, company.user_id) if company else None
    recruiter_name = company_user.full_name if company_user else "Unknown"
    recruiter_user_id = company_user.id if company_user else None

    # Job info
    job = session.get(JobPosting, conv.job_posting_id)
    job_title = job.job_title if job else "Unknown"

    # Last message
    last_msg = session.exec(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())  # type: ignore[union-attr]
        .limit(1)
    ).first()
    last_message_preview = last_msg.text[:80] if last_msg else ""
    last_message_at = conv.last_message_at.isoformat() + "Z" if conv.last_message_at else None

    # Unread count for viewer
    unread = session.exec(
        select(Message).where(
            and_(
                Message.conversation_id == conv.id,
                Message.is_read == False,  # noqa: E712
                Message.sender_user_id != viewer_user_id,
            )
        )
    ).all()
    unread_count = len(unread)

    # Debug logging to help diagnose identity issues
    logger.debug(
        f"Conversation {conv.id}: viewer={viewer_user_id} (type={type(viewer_user_id).__name__}), "
        f"candidate_user_id={candidate_user_id} (type={type(candidate_user_id).__name__ if candidate_user_id else 'None'}), "
        f"recruiter_user_id={recruiter_user_id} (type={type(recruiter_user_id).__name__ if recruiter_user_id else 'None'}), "
        f"candidate_name={candidate_name}, recruiter_name={recruiter_name}"
    )

    # Determine "other" participant based on viewer's identity
    # Strategy: Check which participant the viewer is, then show the OTHER person
    # IMPORTANT: Convert all IDs to int for comparison to avoid type mismatches
    other_user = None
    other_user_name = "Unknown"
    
    viewer_id = int(viewer_user_id) if viewer_user_id else None
    candidate_uid = int(candidate_user_id) if candidate_user_id else None
    recruiter_uid = int(recruiter_user_id) if recruiter_user_id else None
    
    # Case 1: Viewer is the candidate (check by user_id match)
    if candidate_uid and viewer_id == candidate_uid:
        logger.debug(f"✓ Viewer {viewer_id} is the CANDIDATE → showing recruiter: {recruiter_name}")
        other_user = company_user
        other_user_name = recruiter_name
    # Case 2: Viewer is the recruiter (check by user_id match)
    elif recruiter_uid and viewer_id == recruiter_uid:
        logger.debug(f"✓ Viewer {viewer_id} is the RECRUITER → showing candidate: {candidate_name}")
        other_user = candidate_user
        other_user_name = candidate_name
    # Case 3: Fallback - check if viewer matches company_user directly
    elif company_user and viewer_id == company_user.id:
        logger.debug(f"✓ Viewer {viewer_id} matches company_user → showing candidate: {candidate_name}")
        other_user = candidate_user
        other_user_name = candidate_name
    # Case 4: Final fallback - viewer is likely the candidate, show recruiter
    else:
        logger.warning(
            f"⚠ Viewer {viewer_id} identity unclear (candidate_uid={candidate_uid}, "
            f"recruiter_uid={recruiter_uid}) → defaulting to show recruiter: {recruiter_name}"
        )
        other_user = company_user
        other_user_name = recruiter_name

    is_online = _is_online(other_user.last_seen_at if other_user else None)
    last_seen_at = (
        other_user.last_seen_at.isoformat() + "Z"
        if other_user and other_user.last_seen_at
        else None
    )

    logger.debug(f"→ Conversation {conv.id}: Final other_user_name = '{other_user_name}'")

    return {
        "id": conv.id,
        "company_id": conv.company_id,
        "candidate_id": conv.candidate_id,
        "job_posting_id": conv.job_posting_id,
        "created_at": conv.created_at.isoformat() + "Z",
        "last_message_at": last_message_at,
        # Explicit participant info (always present for both sides)
        "candidate_name": candidate_name,
        "candidate_user_id": candidate_user_id,
        "recruiter_name": recruiter_name,
        "recruiter_user_id": recruiter_user_id,
        "job_title": job_title,
        "last_message_preview": last_message_preview,
        "unread_count": unread_count,
        # Dynamic "other" user based on viewer - use determined name
        "other_user": {
            "id": other_user.id if other_user else None,
            "full_name": other_user_name,  # Use the determined name (not other_user.full_name)
            "is_online": is_online,
            "last_seen_at": last_seen_at,
        },
    }


def _serialize_message(msg: Message, session: Session) -> Dict[str, Any]:
    sender = session.get(User, msg.sender_user_id)
    # Compute status: "sent" vs "read"
    if msg.read_at:
        status = "read"
    else:
        status = "sent"
    
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_user_id": msg.sender_user_id,
        "sender_name": sender.full_name if sender else "Unknown",
        "sender_role": msg.sender_role or (sender.role.value if sender else "unknown"),
        "text": msg.text,
        "is_read": msg.is_read,
        "read_at": msg.read_at.isoformat() + "Z" if msg.read_at else None,
        "status": status,
        "created_at": msg.created_at.isoformat() + "Z",
    }


# ── Update last_seen helper (called inline for chat endpoints) ────────────────

def _touch_last_seen(session: Session, user_id: int) -> None:
    user = session.get(User, user_id)
    if user:
        user.last_seen_at = _utcnow()
        session.add(user)
        session.commit()


# ── Conversation endpoints ────────────────────────────────────────────────────

@router.post("/chat/conversations", response_model=Dict[str, Any], status_code=200)
def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Recruiter-only: create or retrieve a conversation.

    Eligibility requires at least ONE of:
      - recruiter liked / asked-to-apply (Swipe with action in {like, ask_to_apply})
      - mutual Match exists (company_liked=True)
    """
    user = _resolve_user(session, current_user["email"])

    # Role check
    if user.role.value not in COMPANY_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters can start conversations",
        )

    company = _resolve_company(session, user.id)

    # Verify job posting belongs to this company
    job = session.get(JobPosting, data.job_posting_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if job.company_id != company.id:
        raise HTTPException(
            status_code=403,
            detail="Job posting does not belong to your company",
        )

    # Verify candidate exists
    candidate = session.get(Candidate, data.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Eligibility check
    eligible = _check_eligibility(session, company.id, data.candidate_id, data.job_posting_id)
    if not eligible:
        raise HTTPException(
            status_code=403,
            detail=(
                "Conversation cannot be started: you must first like, invite, "
                "or mutually match this candidate for the specified job."
            ),
        )

    # Idempotent — return existing if already present
    existing = session.exec(
        select(Conversation).where(
            and_(
                Conversation.company_id == company.id,
                Conversation.candidate_id == data.candidate_id,
                Conversation.job_posting_id == data.job_posting_id,
            )
        )
    ).first()

    if existing:
        _touch_last_seen(session, user.id)
        return _serialize_conversation(existing, session, user.id)

    # Create
    conv = Conversation(
        company_id=company.id,
        candidate_id=data.candidate_id,
        job_posting_id=data.job_posting_id,
        created_by_user_id=user.id,
        created_at=_utcnow(),
    )
    session.add(conv)
    session.commit()
    session.refresh(conv)

    # Notify candidate
    job_title = job.job_title
    try:
        push_notification(
            session=session,
            user_id=candidate.user_id,
            title="New conversation started",
            message=f"A recruiter started a conversation with you about {job_title}",
            event_type="chat_started_by_recruiter",
            route=f"/candidate-dashboard?tab=messages&c={conv.id}",
            route_context={"conversation_id": conv.id},
            notification_type="message",
        )
    except Exception:
        logger.warning("Failed to push chat_started notification", exc_info=True)

    _touch_last_seen(session, user.id)
    return _serialize_conversation(conv, session, user.id)


def _check_eligibility(
    session: Session,
    company_id: int,
    candidate_id: int,
    job_posting_id: int,
) -> bool:
    """Return True if at least one eligibility condition is met."""
    # 1. Recruiter liked or asked-to-apply via Swipe
    liked_swipe = session.exec(
        select(Swipe).where(
            and_(
                Swipe.company_id == company_id,
                Swipe.candidate_id == candidate_id,
                Swipe.job_posting_id == job_posting_id,
                Swipe.action_by == "company",
            )
        )
    ).first()
    if liked_swipe and liked_swipe.action in ("like", "ask_to_apply"):
        return True

    # 2. Match record where company liked or invited
    match = session.exec(
        select(Match).where(
            and_(
                Match.company_id == company_id,
                Match.candidate_id == candidate_id,
                Match.job_posting_id == job_posting_id,
            )
        )
    ).first()
    if match and (match.company_liked or match.company_asked_to_apply):
        return True

    return False


@router.get("/chat/conversations", response_model=List[Dict[str, Any]])
def list_conversations(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List conversations for the current user.
    - Recruiter/HR/Admin: sees all conversations for their company.
    - Candidate: sees only conversations where they are the candidate.
    """
    user = _resolve_user(session, current_user["email"])
    _touch_last_seen(session, user.id)

    if user.role.value in COMPANY_ROLES:
        company = _resolve_company(session, user.id)
        convs = session.exec(
            select(Conversation)
            .where(Conversation.company_id == company.id)
            .order_by(Conversation.last_message_at.desc())  # type: ignore[union-attr]
        ).all()
    else:
        candidate = _resolve_candidate(session, user.id)
        convs = session.exec(
            select(Conversation)
            .where(Conversation.candidate_id == candidate.id)
            .order_by(Conversation.last_message_at.desc())  # type: ignore[union-attr]
        ).all()

    return [_serialize_conversation(c, session, user.id) for c in convs]


# ── Message endpoints ─────────────────────────────────────────────────────────

@router.get("/chat/conversations/{conversation_id}/messages", response_model=List[Dict[str, Any]])
def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[int] = Query(None, description="Message id cursor for pagination"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = _resolve_user(session, current_user["email"])
    conv = _get_conversation_or_404(session, conversation_id, user)
    _touch_last_seen(session, user.id)

    q = select(Message).where(Message.conversation_id == conv.id)
    if before is not None:
        q = q.where(Message.id < before)
    q = q.order_by(Message.created_at.desc()).limit(limit)  # type: ignore[union-attr]

    msgs = list(reversed(session.exec(q).all()))
    return [_serialize_message(m, session) for m in msgs]


@router.post("/chat/conversations/{conversation_id}/messages", response_model=Dict[str, Any], status_code=201)
def send_message(
    conversation_id: int,
    data: MessageCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=422, detail="Message text cannot be empty")
    # Trim to safe length
    text = data.text.strip()[:4000]

    user = _resolve_user(session, current_user["email"])
    conv = _get_conversation_or_404(session, conversation_id, user)
    _touch_last_seen(session, user.id)

    msg = Message(
        conversation_id=conv.id,
        sender_user_id=user.id,
        sender_role=user.role.value,  # Store sender role
        text=text,
        is_read=False,
        read_at=None,
        created_at=_utcnow(),
    )
    session.add(msg)

    conv.last_message_at = msg.created_at
    session.add(conv)
    session.commit()
    session.refresh(msg)

    # Notify the other participant
    _notify_other_participant(session, conv, user, text)

    return _serialize_message(msg, session)


@router.post("/chat/conversations/{conversation_id}/read", response_model=Dict[str, Any])
def mark_read(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = _resolve_user(session, current_user["email"])
    conv = _get_conversation_or_404(session, conversation_id, user)
    _touch_last_seen(session, user.id)

    unread_msgs = session.exec(
        select(Message).where(
            and_(
                Message.conversation_id == conv.id,
                Message.is_read == False,  # noqa: E712
                Message.sender_user_id != user.id,
            )
        )
    ).all()

    now = _utcnow()
    for m in unread_msgs:
        m.is_read = True
        m.read_at = now  # Set read timestamp
        session.add(m)
    session.commit()

    return {"marked_read": len(unread_msgs)}


# ── Presence endpoint ─────────────────────────────────────────────────────────

@router.get("/presence/{user_id}", response_model=Dict[str, Any])
def get_presence(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Update caller's last_seen too
    caller = _resolve_user(session, current_user["email"])
    _touch_last_seen(session, caller.id)

    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "is_online": _is_online(target.last_seen_at),
        "last_seen_at": target.last_seen_at.isoformat() + "Z" if target.last_seen_at else None,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _get_conversation_or_404(
    session: Session,
    conversation_id: int,
    user: User,
) -> Conversation:
    """Fetch conversation and verify the user is a participant."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Determine participation
    if user.role.value in COMPANY_ROLES:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company or company.id != conv.company_id:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this conversation",
            )
    else:
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate or candidate.id != conv.candidate_id:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this conversation",
            )

    return conv


def _notify_other_participant(
    session: Session,
    conv: Conversation,
    sender: User,
    text_preview: str,
) -> None:
    """Push a notification to the other side of the conversation."""
    try:
        if sender.role.value in COMPANY_ROLES:
            # Message from recruiter → notify candidate
            candidate = session.get(Candidate, conv.candidate_id)
            if candidate:
                push_notification(
                    session=session,
                    user_id=candidate.user_id,
                    title=f"New message from {sender.full_name}",
                    message=text_preview[:100],
                    event_type="new_message_received",
                    route=f"/candidate-dashboard?tab=messages&c={conv.id}",
                    route_context={"conversation_id": conv.id},
                    notification_type="message",
                )
        else:
            # Message from candidate → notify company user (creator or any company user)
            company = session.get(Company, conv.company_id)
            if company:
                push_notification(
                    session=session,
                    user_id=company.user_id,
                    title=f"New message from {sender.full_name}",
                    message=text_preview[:100],
                    event_type="new_message_received",
                    route=f"/recruiter-dashboard?tab=messages&c={conv.id}",
                    route_context={"conversation_id": conv.id},
                    notification_type="message",
                )
    except Exception:
        logger.warning("Failed to push new_message notification", exc_info=True)
