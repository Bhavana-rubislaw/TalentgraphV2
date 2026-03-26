"""
Attachments Router for TalentGraph
===================================
Handles file upload/download for message attachments

Endpoints:
- POST /attachments/upload-url - Get presigned upload URL
- POST /messages/{message_id}/attachments - Finalize attachment
- GET /attachments/{id}/download-url - Get presigned download URL
- GET /messages/{message_id}/attachments - List message attachments
- DELETE /attachments/{id} - Delete attachment

Security:
- All endpoints require authentication
- User must be conversation participant
- Downloads blocked if scan_status != "clean"
- Tenant isolation via company_id in storage keys
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select, and_

from app.database import get_session
from app.models import (
    User, Message, Conversation, MessageAttachment,
    AttachmentScanStatus
)
from app.security import get_current_user
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/attachments", tags=["Attachments"])


# ═══════════════════════════════════════════════════════════════════════════
# STORAGE SERVICE HELPER
# ═══════════════════════════════════════════════════════════════════════════

def get_storage_service() -> StorageService:
    """Get storage service instance (lazy initialization)"""
    return StorageService()


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class UploadUrlRequest(BaseModel):
    """Request for presigned upload URL"""
    filename: str = Field(..., max_length=255)
    mime_type: str
    size_bytes: int = Field(..., gt=0, le=25*1024*1024)
    checksum_sha256: str = Field(..., min_length=64, max_length=64)


class UploadUrlResponse(BaseModel):
    """Presigned upload URL response"""
    upload_url: str
    storage_key: str
    attachment_id: int
    expires_in: int


class FinalizeAttachmentRequest(BaseModel):
    """Finalize attachment after upload"""
    attachment_id: int
    storage_key: str


class AttachmentResponse(BaseModel):
    """Attachment metadata response"""
    id: int
    filename: str
    mime_type: str
    size_bytes: int
    scan_status: str
    created_at: datetime
    download_url: Optional[str] = None


class DownloadUrlResponse(BaseModel):
    """Presigned download URL response"""
    download_url: str
    filename: str
    expires_in: int


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def user_can_access_message(
    session: Session,
    user_id: int,
    message_id: int
) -> bool:
    """Check if user is participant in conversation containing message"""
    
    message = session.get(Message, message_id)
    if not message:
        return False
    
    conversation = session.get(Conversation, message.conversation_id)
    if not conversation:
        return False
    
    # Check if user is participant
    participants = [conversation.candidate_user_id, conversation.recruiter_user_id]
    return user_id in participants


def get_company_id_from_user(session: Session, user_id: int) -> Optional[int]:
    """Get company_id for tenant isolation"""
    user = session.get(User, user_id)
    if not user:
        return None
    
    # Candidate users don't have company_id, use conversation context later
    # Company users have company_id
    return getattr(user, 'company_id', None)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    request: UploadUrlRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get presigned URL for uploading an attachment
    
    Flow:
    1. Validate file (type, size)
    2. Generate unique storage key with tenant isolation
    3. Create pending attachment record in DB
    4. Return presigned upload URL for client to upload directly to S3
    """
    
    user_id = current_user["user_id"]
    storage_service = get_storage_service()
    
    # Validate file upload
    valid, error = storage_service.validate_upload(
        request.filename,
        request.mime_type,
        request.size_bytes
    )
    
    if not valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Get company_id for tenant isolation
    # For candidates, we'll use a placeholder and update when finalizing with message context
    company_id = get_company_id_from_user(session, user_id)
    if not company_id:
        # Use negative user_id as placeholder for candidates
        company_id = -user_id
    
    # Generate storage key with tenant isolation
    storage_key = storage_service.generate_storage_key(
        company_id=abs(company_id),
        filename=request.filename,
        subfolder="attachments"
    )
    
    # Create pending attachment record
    attachment = MessageAttachment(
        message_id=0,  # Will be set when finalized
        storage_provider="s3",
        storage_key=storage_key,
        storage_bucket=storage_service.provider.bucket,
        original_filename=request.filename,
        mime_type=request.mime_type,
        size_bytes=request.size_bytes,
        checksum_sha256=request.checksum_sha256,
        scan_status=AttachmentScanStatus.PENDING,
        uploaded_by_user_id=user_id,
        created_at=datetime.now(timezone.utc)
    )
    
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    
    # Generate presigned upload URL
    upload_url = storage_service.get_presigned_upload_url(
        storage_key=storage_key,
        mime_type=request.mime_type,
        expires_in=3600  # 1 hour to complete upload
    )
    
    logger.info(f"Generated upload URL for user {user_id}, attachment {attachment.id}")
    
    return UploadUrlResponse(
        upload_url=upload_url,
        storage_key=storage_key,
        attachment_id=attachment.id,
        expires_in=3600
    )


@router.post("/messages/{message_id}/attachments", response_model=AttachmentResponse)
async def finalize_attachment(
    message_id: int,
    request: FinalizeAttachmentRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Finalize attachment after upload to object storage
    
    Links the attachment to a message after successful upload
    """
    
    user_id = current_user["user_id"]
    storage_service = get_storage_service()
    
    # Check permission
    if not user_can_access_message(session, user_id, message_id):
        raise HTTPException(status_code=403, detail="Access denied to this message")
    
    # Get attachment
    attachment = session.get(MessageAttachment, request.attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Verify uploader
    if attachment.uploaded_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not the uploader")
    
    # Verify storage key matches
    if attachment.storage_key != request.storage_key:
        raise HTTPException(status_code=400, detail="Storage key mismatch")
    
    # Verify object exists in storage
    if not storage_service.object_exists(request.storage_key):
        raise HTTPException(status_code=400, detail="File not found in storage")
    
    # Link to message
    attachment.message_id = message_id
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    
    logger.info(f"Finalized attachment {attachment.id} for message {message_id}")
    
    # Schedule virus scan (async worker - not implemented yet)
    # For now, mark as pending for manual review
    
    return AttachmentResponse(
        id=attachment.id,
        filename=attachment.original_filename,
        mime_type=attachment.mime_type,
        size_bytes=attachment.size_bytes,
        scan_status=attachment.scan_status.value,
        created_at=attachment.created_at,
        download_url=None  # Only available after scan passes
    )


@router.get("/messages/{message_id}/attachments", response_model=List[AttachmentResponse])
async def list_message_attachments(
    message_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List all attachments for a message"""
    
    user_id = current_user["user_id"]
    
    # Check permission
    if not user_can_access_message(session, user_id, message_id):
        raise HTTPException(status_code=403, detail="Access denied to this message")
    
    # Get attachments
    attachments = session.exec(
        select(MessageAttachment).where(
            MessageAttachment.message_id == message_id
        ).order_by(MessageAttachment.created_at)
    ).all()
    
    return [
        AttachmentResponse(
            id=att.id,
            filename=att.original_filename,
            mime_type=att.mime_type,
            size_bytes=att.size_bytes,
            scan_status=att.scan_status.value,
            created_at=att.created_at,
            download_url=None
        )
        for att in attachments
    ]


@router.get("/{attachment_id}/download-url", response_model=DownloadUrlResponse)
async def get_download_url(
    attachment_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get presigned URL for downloading an attachment
    
    Security checks:
    - User must be conversation participant
    - Attachment must have passed virus scan (status = "clean")
    - URL expires after 5 minutes
    """
    
    user_id = current_user["user_id"]
    storage_service = get_storage_service()
    
    # Get attachment
    attachment = session.get(MessageAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Check message access
    if not user_can_access_message(session, user_id, attachment.message_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check scan status
    if attachment.scan_status == AttachmentScanStatus.BLOCKED:
        raise HTTPException(
            status_code=403,
            detail="Attachment blocked by security scan"
        )
    
    if attachment.scan_status == AttachmentScanStatus.PENDING:
        raise HTTPException(
            status_code=425,  # Too Early
            detail="Attachment scan in progress, try again shortly"
        )
    
    if attachment.scan_status != AttachmentScanStatus.CLEAN:
        raise HTTPException(
            status_code=403,
            detail=f"Attachment not available (status: {attachment.scan_status.value})"
        )
    
    # Generate short-lived download URL
    download_url = storage_service.get_presigned_download_url(
        storage_key=attachment.storage_key,
        expires_in=300  # 5 minutes
    )
    
    logger.info(f"Generated download URL for attachment {attachment_id}, user {user_id}")
    
    return DownloadUrlResponse(
        download_url=download_url,
        filename=attachment.original_filename,
        expires_in=300
    )


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete an attachment
    
    Only the uploader or conversation participants can delete
    """
    
    user_id = current_user["user_id"]
    storage_service = get_storage_service()
    
    # Get attachment
    attachment = session.get(MessageAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Check permission (uploader or conversation participant)
    is_uploader = attachment.uploaded_by_user_id == user_id
    has_message_access = user_can_access_message(session, user_id, attachment.message_id)
    
    if not (is_uploader or has_message_access):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete from storage
    storage_service.delete_attachment(attachment.storage_key)
    
    # Delete from database
    session.delete(attachment)
    session.commit()
    
    logger.info(f"Deleted attachment {attachment_id} by user {user_id}")
    
    return {"message": "Attachment deleted successfully"}


@router.post("/admin/scan/{attachment_id}")
async def admin_update_scan_status(
    attachment_id: int,
    scan_status: AttachmentScanStatus,
    scan_message: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Admin endpoint to manually update scan status
    
    Used for manual review or integration with virus scanning services
    """
    
    # Check admin permission
    if current_user.get("role") not in ["admin", "recruiter"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    attachment = session.get(MessageAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    attachment.scan_status = scan_status
    attachment.scan_message = scan_message
    attachment.scan_completed_at = datetime.now(timezone.utc)
    
    session.add(attachment)
    session.commit()
    
    logger.info(f"Updated scan status for attachment {attachment_id}: {scan_status.value}")
    
    return {"message": "Scan status updated"}
