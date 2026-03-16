"""
Direct Messaging Router — WhatsApp-style recruiter ↔ candidate messaging
==========================================================================

Endpoints
---------
POST   /messages/conversations/start          — Recruiter starts conversation
GET    /messages/conversations                — List conversations for current user
GET    /messages/conversations/{id}/messages  — Get messages in conversation
POST   /messages/conversations/{id}/messages  — Send message
POST   /messages/conversations/{id}/read      — Mark conversation read

Business Rules
--------------
- Only recruiters can initiate conversations  
- Candidates cannot start conversations
- Once started, both can send messages
- One conversation per (recruiter, candidate) pair
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, and_, or_

from app.database import get_session
from app.models import User, UserRole, Candidate, Company, DirectConversation, DirectMessage
from app.schemas import (
    ConversationStartRequest,
    MessageCreateRequest,
    MessageResponse,
    ConversationResponse,
    ConversationListItemResponse,
)
from app.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["messages"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user(session: Session, email: str) -> User:
    """Get user by email or raise 404."""
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _is_recruiter(user: User) -> bool:
    """Check if user is recruiter/hr/admin."""
    return user.role in [UserRole.RECRUITER, UserRole.HR, UserRole.ADMIN]


def _get_candidate_for_user(session: Session, user_id: int) -> Optional[Candidate]:
    """Get candidate profile for a user."""
    return session.exec(select(Candidate).where(Candidate.user_id == user_id)).first()


def _get_company_for_user(session: Session, user_id: int) -> Optional[Company]:
    """Get company profile for a user."""
    return session.exec(select(Company).where(Company.user_id == user_id)).first()


def _serialize_message(message: DirectMessage, session: Session) -> MessageResponse:
    """Convert DirectMessage to MessageResponse."""
    sender = session.get(User, message.sender_user_id)
    receiver = session.get(User, message.receiver_user_id)
    
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_user_id=message.sender_user_id,
        receiver_user_id=message.receiver_user_id,
        sender_name=sender.full_name if sender else "Unknown",
        receiver_name=receiver.full_name if receiver else "Unknown",
        content=message.content,
        is_read=message.is_read,
        read_at=message.read_at,
        created_at=message.created_at
    )


def _serialize_conversation_list_item(
    conv: DirectConversation,
    session: Session,
    viewer_user_id: int
) -> ConversationListItemResponse:
    """Serialize conversation for list view with proper participant names."""
    # Get participant users
    recruiter_user = session.get(User, conv.recruiter_user_id)
    candidate_user = session.get(User, conv.candidate_user_id)
    
    recruiter_name = recruiter_user.full_name if recruiter_user else "Unknown"
    candidate_name = candidate_user.full_name if candidate_user else "Unknown"
    
    # Determine "other" participant based on viewer
    if viewer_user_id == conv.candidate_user_id:
        # Viewer is candidate → show recruiter
        other_user_name = recruiter_name
        other_user_id = conv.recruiter_user_id
    else:
        # Viewer is recruiter → show candidate
        other_user_name = candidate_name
        other_user_id = conv.candidate_user_id
    
    # Get last message
    last_msg = session.exec(
        select(DirectMessage)
        .where(DirectMessage.conversation_id == conv.id)
        .order_by(DirectMessage.created_at.desc())  # type: ignore
        .limit(1)
    ).first()
    
    last_message_preview = last_msg.content[:80] if last_msg else ""
    
    # Count unread messages for viewer
    unread_count = len(session.exec(
        select(DirectMessage).where(
            and_(
                DirectMessage.conversation_id == conv.id,
                DirectMessage.receiver_user_id == viewer_user_id,
                DirectMessage.is_read == False  # noqa: E712
            )
        )
    ).all())
    
    return ConversationListItemResponse(
        id=conv.id,
        candidate_name=candidate_name,
        recruiter_name=recruiter_name,
        last_message_preview=last_message_preview,
        last_message_at=conv.last_message_at,
        unread_count=unread_count,
        other_user_name=other_user_name,
        other_user_id=other_user_id
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/conversations/start")
def start_conversation(
    data: ConversationStartRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    START CONVERSATION (Recruiter-only)
    
    Recruiter initiates a conversation with a candidate.
    Returns existing conversation if already exists.
    """
    user = _get_user(session, current_user["email"])
    
    # Authorization: Only recruiters can start conversations
    if not _is_recruiter(user):
        raise HTTPException(
            status_code=403,
            detail="Candidates cannot initiate conversations"
        )
    
    # Verify candidate exists
    candidate_user = session.get(User, data.candidate_user_id)
    if not candidate_user:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if candidate_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=400, detail="Target user is not a candidate")
    
    # Check for existing conversation (idempotent)
    existing = session.exec(
        select(DirectConversation).where(
            and_(
                DirectConversation.recruiter_user_id == user.id,
                DirectConversation.candidate_user_id == data.candidate_user_id
            )
        )
    ).first()
    
    if existing:
        logger.info(f"Returning existing conversation {existing.id}")
        return {
            "message": "Conversation already exists",
            "conversation": ConversationResponse(
                id=existing.id,
                recruiter_user_id=existing.recruiter_user_id,
                candidate_user_id=existing.candidate_user_id,
                created_by_user_id=existing.created_by_user_id,
                created_at=existing.created_at,
                updated_at=existing.updated_at,
                last_message_at=existing.last_message_at
            )
        }
    
    # Create new conversation
    now = datetime.utcnow()
    conversation = DirectConversation(
        recruiter_user_id=user.id,
        candidate_user_id=data.candidate_user_id,
        created_by_user_id=user.id,  # Always the recruiter who started it
        created_at=now,
        updated_at=now,
        last_message_at=None
    )
    
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    
    logger.info(f"Created conversation {conversation.id} between recruiter {user.id} and candidate {data.candidate_user_id}")
    
    return {
        "message": "Conversation started",
        "conversation": ConversationResponse(
            id=conversation.id,
            recruiter_user_id=conversation.recruiter_user_id,
            candidate_user_id=conversation.candidate_user_id,
            created_by_user_id=conversation.created_by_user_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            last_message_at=conversation.last_message_at
        )
    }


@router.get("/conversations")
def list_conversations(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[ConversationListItemResponse]:
    """
    LIST CONVERSATIONS
    
    Returns conversations for current user:
    - Recruiter: conversations where they are the recruiter
    - Candidate: conversations where they are the candidate
    
    Sorted by last_message_at DESC.
    """
    user = _get_user(session, current_user["email"])
    
    # Query conversations based on role
    if _is_recruiter(user):
        conversations = session.exec(
            select(DirectConversation)
            .where(DirectConversation.recruiter_user_id == user.id)
            .order_by(DirectConversation.last_message_at.desc())  # type: ignore
        ).all()
    else:
        conversations = session.exec(
            select(DirectConversation)
            .where(DirectConversation.candidate_user_id == user.id)
            .order_by(DirectConversation.last_message_at.desc())  # type: ignore
        ).all()
    
    return [
        _serialize_conversation_list_item(conv, session, user.id)
        for conv in conversations
    ]


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[MessageResponse]:
    """
    GET MESSAGES IN CONVERSATION
    
    Returns messages in ascending order (oldest → newest).
    User must be a participant in the conversation.
    """
    user = _get_user(session, current_user["email"])
    
    # Get conversation and verify access
    conversation = session.get(DirectConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Authorization: Must be a participant
    if user.id not in [conversation.recruiter_user_id, conversation.candidate_user_id]:
        raise HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation"
        )
    
    # Fetch messages (ascending order for chat display)
    messages = session.exec(
        select(DirectMessage)
        .where(DirectMessage.conversation_id == conversation_id)
        .order_by(DirectMessage.created_at.asc())  # type: ignore
        .offset(offset)
        .limit(limit)
    ).all()
    
    return [_serialize_message(msg, session) for msg in messages]


@router.post("/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    data: MessageCreateRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessageResponse:
    """
    SEND MESSAGE
    
    Send a message in an existing conversation.
    - Recruiter can send if they are the recruiter in the conversation
    - Candidate can send if conversation exists and they are the candidate
    - Candidate cannot create conversation implicitly
    """
    user = _get_user(session, current_user["email"])
    
    # Validate content
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=422, detail="Message content cannot be empty")
    
    # Get conversation and verify access
    conversation = session.get(DirectConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Authorization: Must be a participant
    if user.id not in [conversation.recruiter_user_id, conversation.candidate_user_id]:
        raise HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation"
        )
    
    # Determine receiver (the other participant)
    if user.id == conversation.recruiter_user_id:
        receiver_id = conversation.candidate_user_id
    else:
        receiver_id = conversation.recruiter_user_id
    
    # Create message
    now = datetime.utcnow()
    message = DirectMessage(
        conversation_id=conversation_id,
        sender_user_id=user.id,
        receiver_user_id=receiver_id,
        content=data.content.strip(),
        is_read=False,
        read_at=None,
        created_at=now
    )
    
    session.add(message)
    
    # Update conversation timestamps
    conversation.updated_at = now
    conversation.last_message_at = now
    session.add(conversation)
    
    session.commit()
    session.refresh(message)
    
    logger.info(f"Message {message.id} sent in conversation {conversation_id} by user {user.id}")
    
    return _serialize_message(message, session)


@router.post("/conversations/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, bool]:
    """
    MARK CONVERSATION READ
    
    Marks all unread incoming messages in the conversation as read.
    Does not mark user's own sent messages.
    """
    user = _get_user(session, current_user["email"])
    
    # Get conversation and verify access
    conversation = session.get(DirectConversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Authorization: Must be a participant
    if user.id not in [conversation.recruiter_user_id, conversation.candidate_user_id]:
        raise HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation"
        )
    
    # Find unread messages sent TO this user
    unread_messages = session.exec(
        select(DirectMessage).where(
            and_(
                DirectMessage.conversation_id == conversation_id,
                DirectMessage.receiver_user_id == user.id,
                DirectMessage.is_read == False  # noqa: E712
            )
        )
    ).all()
    
    # Mark as read
    now = datetime.utcnow()
    for msg in unread_messages:
        msg.is_read = True
        msg.read_at = now
        session.add(msg)
    
    session.commit()
    
    logger.info(f"Marked {len(unread_messages)} messages as read in conversation {conversation_id} for user {user.id}")
    
    return {"success": True}
