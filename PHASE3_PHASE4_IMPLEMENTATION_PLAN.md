# TalentGraph Phase 3 & 4 Implementation Plan
## Production-Ready Platform Expansion

**Version**: 1.0  
**Date**: March 24, 2026  
**Status**: Implementation Plan

---

## Executive Summary

This document provides a complete implementation plan for TalentGraph Phase 3 & 4 expansion:

### Phase 3: Communications & Operational Robustness
- ✅ File attachments in messaging
- ✅ Inbound email threading for missed interviews
- ✅ Centralized recruiter communication trail

### Phase 4: Monetization, Intelligence & Automation
- ✅ Stripe-based subscriptions and billing
- ✅ Event-driven analytics pipeline
- ✅ Automated job lifecycle actions

### Production Guardrails
- ✅ Tenant isolation
- ✅ Timezone normalization (UTC storage + timezone ID tracking)
- ✅ Idempotency for webhooks
- ✅ Observability (correlation IDs, event tracing)
- ✅ Security & compliance (encryption, audit logs)
- ✅ Rollout safety (feature flags, gradual deployment)

---

## Architecture Overview

### Current TalentGraph Stack
- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Auth**: JWT-based with role-based access control
- **Current Models**: User, Company, JobPosting, Candidate, Message, Conversation, Meeting

### New Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                   TalentGraph Platform                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)                                            │
│    ├── Messaging with Attachments UI                        │
│    ├── Recruiter Inbox (unified trail)                      │
│    ├── Billing Dashboard                                    │
│    └── Analytics Dashboard                                  │
├─────────────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                           │
│    ├── Attachment API (presigned URLs)                      │
│    ├── Email Threading API                                  │
│    ├── Billing API (Stripe integration)                     │
│    ├── Analytics API (event pipeline)                       │
│    └── Lifecycle API (automation)                           │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (NEW)                                        │
│    ├── StorageService (S3/GCS abstraction)                  │
│    ├── EmailService (SendGrid/Postmark)                     │
│    ├── BillingService (Stripe wrapper)                      │
│    ├── AnalyticsService (event tracking)                    │
│    └── LifecycleService (automation logic)                  │
├─────────────────────────────────────────────────────────────┤
│  Background Workers (NEW)                                    │
│    ├── Reminder Worker                                      │
│    ├── Analytics Aggregation Worker                         │
│    ├── Lifecycle Automation Worker                          │
│    └── Email Threading Worker                               │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                       │
│    ├── Object Storage (AWS S3 / GCS)                        │
│    ├── Email Provider (SendGrid / Postmark)                 │
│    ├── Payment Provider (Stripe)                            │
│    └── Virus Scanning (ClamAV / VirusTotal)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 3.1: Messaging with File Attachments

### Implementation Priority: HIGH
**Timeline**: Phase 1 (Week 1-2)

### Database Models

#### New Table: `message_attachment`
```python
class AttachmentScanStatus(str, Enum):
    PENDING = "pending"
    SCANNING = "scanning"
    CLEAN = "clean"
    BLOCKED = "blocked"
    FAILED = "failed"

class MessageAttachment(SQLModel, table=True):
    """File attachments for messages"""
    __tablename__ = "message_attachment"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="message.id", index=True)
    
    # Storage metadata
    storage_provider: str = Field(default="s3")  # "s3", "gcs", "azure"
    storage_key: str = Field(index=True)  # unique object key
    storage_bucket: str
    
    # File metadata
    original_filename: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str = Field(index=True)  # for deduplication
    
    # Security
    scan_status: AttachmentScanStatus = Field(default=AttachmentScanStatus.PENDING)
    scan_message: Optional[str] = None
    scan_completed_at: Optional[datetime] = None
    
    # Audit
    uploaded_by_user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # optional expiration
    
    # Relationships
    message: Optional["Message"] = Relationship(back_populates="attachments")
    uploaded_by: Optional["User"] = Relationship()
```

### API Endpoints

#### 1. Get Presigned Upload URL
```
POST /messages/attachments/upload-url
Authorization: Bearer {token}

Request:
{
  "filename": "resume.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 524288,
  "checksum_sha256": "abc123..."
}

Response:
{
  "upload_url": "https://s3.amazonaws.com/...",
  "storage_key": "attachments/2026/03/uuid.pdf",
  "attachment_id": 123,
  "expires_in": 3600
}
```

**Security Checks**:
- Max file size: 25 MB (configurable)
- Allowed MIME types: PDF, DOCX, PNG, JPG, JPEG, GIF, TXT
- User has permission for conversation context
- Rate limiting: 50 uploads per hour per user

#### 2. Finalize Attachment Upload
```
POST /messages/{message_id}/attachments
Authorization: Bearer {token}

Request:
{
  "attachment_id": 123,
  "storage_key": "attachments/2026/03/uuid.pdf"
}

Response:
{
  "id": 123,
  "filename": "resume.pdf",
  "size_bytes": 524288,
  "scan_status": "pending",
  "download_url": null,  // available after scan passes
  "created_at": "2026-03-24T10:00:00Z"
}
```

#### 3. Get Attachment Download URL
```
GET /messages/attachments/{attachment_id}/download-url
Authorization: Bearer {token}

Response:
{
  "download_url": "https://s3.amazonaws.com/...",
  "filename": "resume.pdf",
  "expires_in": 300
}
```

**Security Checks**:
- User is participant in conversation
- Attachment scan_status == "clean"
- Generate short-lived presigned URL (5 minutes)

#### 4. List Message Attachments
```
GET /messages/{message_id}/attachments
Authorization: Bearer {token}

Response:
[
  {
    "id": 123,
    "filename": "resume.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 524288,
    "scan_status": "clean",
    "created_at": "2026-03-24T10:00:00Z"
  }
]
```

### Storage Service Implementation

**Path**: `backend2/app/services/storage_service.py`

```python
"""
Storage Service for TalentGraph
Abstracts object storage (S3, GCS, Azure)
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
import os
from typing import Optional, Tuple
import hashlib
import mimetypes

class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> str:
        pass
    
    @abstractmethod
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 300
    ) -> str:
        pass
    
    @abstractmethod
    def delete_object(self, key: str) -> bool:
        pass


class S3StorageProvider(StorageProvider):
    """AWS S3 storage implementation"""
    
    def __init__(self):
        import boto3
        self.s3_client = boto3.client('s3')
        self.bucket = os.getenv('S3_BUCKET_NAME')
    
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> str:
        return self.s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': self.bucket,
                'Key': key,
                'ContentType': content_type
            },
            ExpiresIn=expires_in
        )
    
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 300
    ) -> str:
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': self.bucket,
                'Key': key
            },
            ExpiresIn=expires_in
        )
    
    def delete_object(self, key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False


class StorageService:
    """Unified storage service interface"""
    
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'image/png',
        'image/jpeg',
        'image/gif',
        'text/plain'
    }
    
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
    
    def __init__(self):
        provider_type = os.getenv('STORAGE_PROVIDER', 's3')
        
        if provider_type == 's3':
            self.provider = S3StorageProvider()
        else:
            raise ValueError(f"Unsupported storage provider: {provider_type}")
    
    def validate_upload(
        self,
        filename: str,
        mime_type: str,
        size_bytes: int
    ) -> Tuple[bool, Optional[str]]:
        """Validate upload request"""
        
        if size_bytes > self.MAX_FILE_SIZE:
            return False, f"File size exceeds limit of {self.MAX_FILE_SIZE} bytes"
        
        if mime_type not in self.ALLOWED_MIME_TYPES:
            return False, f"MIME type '{mime_type}' not allowed"
        
        # Validate file extension matches MIME type
        ext = os.path.splitext(filename)[1].lower()
        expected_mime = mimetypes.types_map.get(ext)
        if expected_mime and expected_mime != mime_type:
            return False, "File extension does not match MIME type"
        
        return True, None
    
    def generate_storage_key(
        self,
        company_id: int,
        filename: str
    ) -> str:
        """Generate unique storage key with tenant isolation"""
        import uuid
        from datetime import datetime
        
        now = datetime.now(timezone.utc)
        unique_id = uuid.uuid4().hex
        ext = os.path.splitext(filename)[1]
        
        # Pattern: attachments/{company_id}/{year}/{month}/{uuid}{ext}
        return f"attachments/{company_id}/{now.year}/{now.month:02d}/{unique_id}{ext}"
    
    def get_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600
    ) -> str:
        return self.provider.generate_presigned_upload_url(
            storage_key,
            mime_type,
            expires_in
        )
    
    def get_presigned_download_url(
        self,
        storage_key: str,
        expires_in: int = 300
    ) -> str:
        return self.provider.generate_presigned_download_url(
            storage_key,
            expires_in
        )
    
    def delete_attachment(self, storage_key: str) -> bool:
        return self.provider.delete_object(storage_key)
```

### Frontend Components

#### 1. AttachmentUploader Component
**Path**: `frontend2/src/components/messaging/AttachmentUploader.tsx`

```typescript
interface AttachmentUploaderProps {
  conversationId: number;
  messageId: number;
  onUploadComplete: (attachment: MessageAttachment) => void;
  onError: (error: string) => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  conversationId,
  messageId,
  onUploadComplete,
  onError
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (file.size > 25 * 1024 * 1024) {
      onError('File size exceeds 25 MB limit');
      return;
    }
    
    try {
      setUploading(true);
      
      // Step 1: Get presigned upload URL
      const uploadUrlResponse = await api.post('/messages/attachments/upload-url', {
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        checksum_sha256: await calculateChecksum(file)
      });
      
      // Step 2: Upload directly to object storage
      await uploadToStorage(
        uploadUrlResponse.upload_url,
        file,
        (progressEvent) => {
          setProgress((progressEvent.loaded / progressEvent.total) * 100);
        }
      );
      
      // Step 3: Finalize attachment
      const attachment = await api.post(`/messages/${messageId}/attachments`, {
        attachment_id: uploadUrlResponse.attachment_id,
        storage_key: uploadUrlResponse.storage_key
      });
      
      onUploadComplete(attachment);
    } catch (error) {
      onError(error.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  
  return (
    <div className="attachment-uploader">
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.txt"
      />
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
};
```

#### 2. AttachmentList Component
**Path**: `frontend2/src/components/messaging/AttachmentList.tsx`

```typescript
interface AttachmentListProps {
  messageId: number;
  attachments: MessageAttachment[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ messageId, attachments }) => {
  const handleDownload = async (attachmentId: number, filename: string) => {
    try {
      const response = await api.get(`/messages/attachments/${attachmentId}/download-url`);
      
      // Open download in new tab
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = filename;
      link.target = '_blank';
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  return (
    <div className="attachment-list">
      {attachments.map(attachment => (
        <div key={attachment.id} className="attachment-item">
          <AttachmentIcon mimeType={attachment.mime_type} />
          <div className="attachment-info">
            <span className="filename">{attachment.filename}</span>
            <span className="filesize">{formatFileSize(attachment.size_bytes)}</span>
          </div>
          
          {attachment.scan_status === 'clean' && (
            <button onClick={() => handleDownload(attachment.id, attachment.filename)}>
              Download
            </button>
          )}
          
          {attachment.scan_status === 'pending' && (
            <span className="scan-status">Scanning...</span>
          )}
          
          {attachment.scan_status === 'blocked' && (
            <span className="scan-status error">Blocked by security scan</span>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Security Considerations

1. **File Validation**:
   - Server-side MIME type validation
   - File extension whitelist
   - Size limits enforced
   - Checksum verification

2. **Virus Scanning**:
   - Async scan worker processes new uploads
   - Downloads blocked until scan passes
   - Quarantine for blocked files

3. **Access Control**:
   - Verify user is conversation participant
   - Tenant isolation in storage keys
   - Short-lived presigned URLs

4. **Rate Limiting**:
   - 50 uploads per hour per user
   - Max 10 attachments per message

---

## Phase 3.2: Inbound Email Threading

### Implementation Priority: HIGH
**Timeline**: Phase 1 (Week 2-3)

### Database Models

#### New Table: `email_thread_link`
```python
class EmailThreadLink(SQLModel, table=True):
    """Maps external email threads back to app entities"""
    __tablename__ = "email_thread_link"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Provider information
    provider_name: str = Field(index=True)  # "sendgrid", "postmark", "mailgun"
    provider_thread_id: Optional[str] = Field(index=True)
    provider_message_id: str = Field(index=True, unique=True)
    
    # Mapping to TalentGraph entities
    conversation_id: Optional[int] = Field(foreign_key="conversation.id", index=True)
    meeting_id: Optional[int] = Field(foreign_key="meeting.id", index=True)
    
    # Participants
    candidate_user_id: int = Field(foreign_key="user.id", index=True)
    recruiter_user_id: int = Field(foreign_key="user.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    
    # Authentication token for tokenized actions
    action_token: str = Field(unique=True, index=True)
    token_expires_at: datetime
    
    # Email metadata
    subject: str
    from_email: str
    to_email: str
    
    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_inbound_at: Optional[datetime] = None
    inbound_count: int = Field(default=0)
```

#### New Table: `inbound_email_event`
```python
class InboundEmailEvent(SQLModel, table=True):
    """Audit log for inbound emails"""
    __tablename__ = "inbound_email_event"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Provider information
    provider_name: str
    provider_event_id: str = Field(unique=True, index=True)
    
    # Email metadata
    from_email: str = Field(index=True)
    to_email: str = Field(index=True)
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    
    # Processing
    thread_link_id: Optional[int] = Field(foreign_key="email_thread_link.id")
    message_created_id: Optional[int] = Field(foreign_key="message.id")
    processed: bool = Field(default=False, index=True)
    processing_error: Optional[str] = None
    
    # Audit
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
```

### API Endpoints

#### 1. Inbound Email Webhook (SendGrid)
```
POST /webhooks/email/inbound
X-Sendgrid-Signature: {signature}

Request (SendGrid format):
{
  "headers": "...",
  "from": "candidate@example.com",
  "to": "reply-abc123xyz@talentgraph.com",
  "subject": "Re: Interview Invitation",
  "text": "Thanks, I confirm the interview time.",
  "html": "<p>Thanks, I confirm the interview time.</p>",
  "envelope": {...},
  "attachments": []
}

Response:
{
  "status": "processed",
  "message_id": 456,
  "notification_sent": true
}
```

**Processing Logic**:
1. Verify provider signature
2. Extract action token from reply-to address
3. Look up `email_thread_link` by token
4. Create in-app `Message` linked to conversation
5. Send notification to recruiter
6. Update thread link last_inbound_at

#### 2. Tokenized Meeting Action Endpoints
```
GET /meetings/token/{token}/confirm
GET /meetings/token/{token}/reschedule
GET /meetings/token/{token}/cancel

Response: HTML page with confirmation UI
```

### Email Service Implementation

**Path**: `backend2/app/services/email_service.py`

```python
"""
Email Service for TalentGraph
Handles outbound email and inbound threading
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone

class EmailProvider(ABC):
    """Abstract base class for email providers"""
    
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        reply_to: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ) -> str:
        """Send email, return provider message ID"""
        pass
    
    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """Verify webhook authenticity"""
        pass


class SendGridEmailProvider(EmailProvider):
    """SendGrid implementation"""
    
    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.webhook_secret = os.getenv('SENDGRID_WEBHOOK_SECRET')
        self.from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@talentgraph.com')
        self.reply_to_domain = os.getenv('REPLY_TO_DOMAIN', 'talentgraph.com')
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        reply_to: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ) -> str:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        
        message = Mail(
            from_email=Email(self.from_email),
            to_emails=To(to_email),
            subject=subject,
            plain_text_content=Content("text/plain", text_body),
            html_content=Content("text/html", html_body)
        )
        
        if reply_to:
            message.reply_to = Email(reply_to)
        
        if custom_headers:
            message.custom_args = custom_headers
        
        response = sg.send(message)
        return response.headers.get('X-Message-Id', '')
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)


class EmailService:
    """Unified email service"""
    
    def __init__(self):
        provider_type = os.getenv('EMAIL_PROVIDER', 'sendgrid')
        
        if provider_type == 'sendgrid':
            self.provider = SendGridEmailProvider()
        else:
            raise ValueError(f"Unsupported email provider: {provider_type}")
    
    def generate_reply_token(
        self,
        conversation_id: Optional[int] = None,
        meeting_id: Optional[int] = None
    ) -> str:
        """Generate unique action token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def generate_reply_to_address(self, token: str) -> str:
        """Generate tokenized reply-to address"""
        domain = os.getenv('REPLY_TO_DOMAIN', 'talentgraph.com')
        return f"reply-{token}@{domain}"
    
    def send_interview_invitation(
        self,
        to_email: str,
        candidate_name: str,
        recruiter_name: str,
        meeting_id: int,
        meeting_time: datetime,
        meeting_link: str,
        action_token: str
    ) -> str:
        """Send interview invitation with tokenized actions"""
        
        confirm_url = f"{os.getenv('APP_BASE_URL')}/meetings/token/{action_token}/confirm"
        reschedule_url = f"{os.getenv('APP_BASE_URL')}/meetings/token/{action_token}/reschedule"
        cancel_url = f"{os.getenv('APP_BASE_URL')}/meetings/token/{action_token}/cancel"
        
        reply_to = self.generate_reply_to_address(action_token)
        
        html_body = f"""
        <html>
        <body>
            <h2>Interview Invitation</h2>
            <p>Hi {candidate_name},</p>
            <p>{recruiter_name} has invited you to an interview.</p>
            
            <p><strong>Time:</strong> {meeting_time.strftime('%B %d, %Y at %I:%M %p %Z')}</p>
            <p><strong>Meeting Link:</strong> <a href="{meeting_link}">{meeting_link}</a></p>
            
            <p>
                <a href="{confirm_url}" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm</a>
                <a href="{reschedule_url}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">Reschedule</a>
                <a href="{cancel_url}" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">Cancel</a>
            </p>
            
            <p>You can also reply directly to this email.</p>
        </body>
        </html>
        """
        
        text_body = f"""
        Interview Invitation
        
        Hi {candidate_name},
        
        {recruiter_name} has invited you to an interview.
        
        Time: {meeting_time.strftime('%B %d, %Y at %I:%M %p %Z')}
        Meeting Link: {meeting_link}
        
        Confirm: {confirm_url}
        Reschedule: {reschedule_url}
        Cancel: {cancel_url}
        
        You can also reply directly to this email.
        """
        
        return self.provider.send_email(
            to_email=to_email,
            subject="Interview Invitation",
            html_body=html_body,
            text_body=text_body,
            reply_to=reply_to,
            custom_headers={
                'meeting_id': str(meeting_id),
                'action_token': action_token
            }
        )
```

### Inbound Email Router

**Path**: `backend2/app/routers/email_webhooks.py`

```python
"""
Email webhook handlers for inbound threading
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    EmailThreadLink, InboundEmailEvent, Message,
    Conversation, Meeting, User
)
from app.services.email_service import EmailService
from app.routers.notifications import push_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/email", tags=["Email Webhooks"])

email_service = EmailService()


@router.post("/inbound")
async def handle_inbound_email(
    request: Request,
    session: Session = Depends(get_session),
    x_sendgrid_signature: str = Header(None)
):
    """
    Process inbound email from SendGrid
    Maps email back to conversation and creates in-app message
    """
    
    # Verify webhook signature
    body = await request.body()
    if not email_service.provider.verify_webhook_signature(body, x_sendgrid_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    payload = await request.json()
    
    try:
        # Extract action token from reply-to address
        to_email = payload.get('to', '')
        token = extract_token_from_email(to_email)
        
        if not token:
            logger.warning(f"No token found in email to: {to_email}")
            return {"status": "ignored", "reason": "no_token"}
        
        # Look up thread link
        thread_link = session.exec(
            select(EmailThreadLink).where(EmailThreadLink.action_token == token)
        ).first()
        
        if not thread_link:
            logger.warning(f"Thread link not found for token: {token}")
            return {"status": "ignored", "reason": "invalid_token"}
        
        # Check token expiration
        if thread_link.token_expires_at < datetime.now(timezone.utc):
            logger.warning(f"Expired token: {token}")
            return {"status": "ignored", "reason": "expired_token"}
        
        # Create inbound email event (audit)
        event = InboundEmailEvent(
            provider_name="sendgrid",
            provider_event_id=payload.get('headers', {}).get('message-id', ''),
            from_email=payload.get('from', ''),
            to_email=to_email,
            subject=payload.get('subject', ''),
            body_text=payload.get('text', ''),
            body_html=payload.get('html', ''),
            thread_link_id=thread_link.id
        )
        session.add(event)
        
        # Create in-app message
        message_text = payload.get('text', '') or extract_text_from_html(payload.get('html', ''))
        
        message = Message(
            conversation_id=thread_link.conversation_id,
            sender_user_id=thread_link.candidate_user_id,
            content=f"[From Email]\n\n{message_text}",
            sent_at=datetime.now(timezone.utc)
        )
        session.add(message)
        
        # Update thread link
        thread_link.last_inbound_at = datetime.now(timezone.utc)
        thread_link.inbound_count += 1
        
        # Mark event as processed
        event.processed = True
        event.processed_at = datetime.now(timezone.utc)
        event.message_created_id = message.id
        
        session.commit()
        session.refresh(message)
        
        # Notify recruiter
        await push_notification(
            session=session,
            user_id=thread_link.recruiter_user_id,
            title="New email reply",
            message=f"Candidate replied via email",
            notification_type="message",
            entity_id=message.id
        )
        
        logger.info(f"Processed inbound email for conversation {thread_link.conversation_id}")
        
        return {
            "status": "processed",
            "message_id": message.id,
            "conversation_id": thread_link.conversation_id
        }
        
    except Exception as e:
        logger.error(f"Error processing inbound email: {e}", exc_info=True)
        
        # Log failed event
        event = InboundEmailEvent(
            provider_name="sendgrid",
            provider_event_id=payload.get('headers', {}).get('message-id', ''),
            from_email=payload.get('from', ''),
            to_email=to_email,
            subject=payload.get('subject', ''),
            processed=False,
            processing_error=str(e)
        )
        session.add(event)
        session.commit()
        
        raise HTTPException(status_code=500, detail="Processing failed")


def extract_token_from_email(email: str) -> Optional[str]:
    """Extract action token from reply-to-{token}@domain.com"""
    import re
    match = re.search(r'reply-([a-zA-Z0-9_-]+)@', email)
    return match.group(1) if match else None


def extract_text_from_html(html: str) -> str:
    """Extract plain text from HTML email body"""
    from html.parser import HTMLParser
    
    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
        
        def handle_data(self, data):
            self.text.append(data.strip())
    
    parser = TextExtractor()
    parser.feed(html)
    return '\n'.join(filter(None, parser.text))
```

---

## Phase 4.1: Stripe Subscriptions & Billing

### Implementation Priority: HIGH
**Timeline**: Phase 2 (Week 3-4)

### Database Models

[CONTINUED IN NEXT FILE DUE TO LENGTH...]
