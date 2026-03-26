"""
Storage Service for TalentGraph
================================
Abstracts object storage providers (AWS S3, GCS, Azure Blob)

Features:
- Presigned upload URLs (client uploads directly to storage)
- Presigned download URLs (short-lived, secure)
- File validation (MIME type, size)
- Tenant isolation in storage keys
- Provider abstraction (easy to swap S3 → GCS)

Security:
- All uploads require authentication
- Storage keys include company_id for tenant isolation
- Download URLs expire after 5 minutes
- File type whitelist enforced
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import os
from typing import Optional, Tuple
import hashlib
import mimetypes
import uuid
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# ABSTRACT BASE CLASS
# ═══════════════════════════════════════════════════════════════════════════

class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> str:
        """Generate presigned URL for uploading a file"""
        pass
    
    @abstractmethod
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 300
    ) -> str:
        """Generate presigned URL for downloading a file"""
        pass
    
    @abstractmethod
    def delete_object(self, key: str) -> bool:
        """Delete an object from storage"""
        pass
    
    @abstractmethod
    def object_exists(self, key: str) -> bool:
        """Check if object exists"""
        pass


# ═══════════════════════════════════════════════════════════════════════════
# AWS S3 PROVIDER
# ═══════════════════════════════════════════════════════════════════════════

class S3StorageProvider(StorageProvider):
    """AWS S3 storage implementation"""
    
    def __init__(self):
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            self.bucket = os.getenv('S3_BUCKET_NAME')
            self.ClientError = ClientError
            
            if not self.bucket:
                raise ValueError("S3_BUCKET_NAME environment variable not set")
            
            logger.info(f"S3StorageProvider initialized for bucket: {self.bucket}")
            
        except ImportError:
            raise ImportError("boto3 not installed. Run: pip install boto3")
    
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> str:
        """Generate presigned PUT URL for uploading"""
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            logger.info(f"Generated presigned upload URL for key: {key}")
            return url
        except self.ClientError as e:
            logger.error(f"Error generating presigned upload URL: {e}")
            raise
    
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 300
    ) -> str:
        """Generate presigned GET URL for downloading"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            logger.info(f"Generated presigned download URL for key: {key}")
            return url
        except self.ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            raise
    
    def delete_object(self, key: str) -> bool:
        """Delete object from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted object: {key}")
            return True
        except self.ClientError as e:
            logger.error(f"Error deleting object {key}: {e}")
            return False
    
    def object_exists(self, key: str) -> bool:
        """Check if object exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError:
            return False


# ═══════════════════════════════════════════════════════════════════════════
# GOOGLE CLOUD STORAGE PROVIDER (STUB)
# ═══════════════════════════════════════════════════════════════════════════

class GCSStorageProvider(StorageProvider):
    """Google Cloud Storage implementation"""
    
    def __init__(self):
        # Stub implementation - add when GCS support needed
        raise NotImplementedError("GCS provider not yet implemented")
    
    def generate_presigned_upload_url(self, key: str, content_type: str, expires_in: int = 3600) -> str:
        raise NotImplementedError()
    
    def generate_presigned_download_url(self, key: str, expires_in: int = 300) -> str:
        raise NotImplementedError()
    
    def delete_object(self, key: str) -> bool:
        raise NotImplementedError()
    
    def object_exists(self, key: str) -> bool:
        raise NotImplementedError()


# ═══════════════════════════════════════════════════════════════════════════
# UNIFIED STORAGE SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class StorageService:
    """
    Unified storage service interface
    
    Usage:
        storage = StorageService()
        
        # Validate file
        valid, error = storage.validate_upload("resume.pdf", "application/pdf", 524288)
        
        # Generate upload URL
        key = storage.generate_storage_key(company_id=1, filename="resume.pdf")
        upload_url = storage.get_presigned_upload_url(key, "application/pdf")
        
        # Client uploads to upload_url
        
        # Later, generate download URL
        download_url = storage.get_presigned_download_url(key)
    """
    
    # File type whitelist
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
        'application/msword',  # .doc
        'image/png',
        'image/jpeg',
        'image/gif',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',  # .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    }
    
    # File extension to MIME type mapping
    EXTENSION_TO_MIME = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
    
    def __init__(self):
        """Initialize with configured storage provider"""
        provider_type = os.getenv('STORAGE_PROVIDER', 's3').lower()
        
        if provider_type == 's3':
            self.provider = S3StorageProvider()
        elif provider_type == 'gcs':
            self.provider = GCSStorageProvider()
        else:
            raise ValueError(f"Unsupported storage provider: {provider_type}")
        
        logger.info(f"StorageService initialized with provider: {provider_type}")
    
    def validate_upload(
        self,
        filename: str,
        mime_type: str,
        size_bytes: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate upload request
        
        Returns:
            (is_valid, error_message)
        """
        
        # Check file size
        if size_bytes > self.MAX_FILE_SIZE:
            return False, f"File size exceeds limit of {self.MAX_FILE_SIZE / 1024 / 1024:.1f} MB"
        
        if size_bytes <= 0:
            return False, "File size must be greater than 0"
        
        # Check MIME type
        if mime_type not in self.ALLOWED_MIME_TYPES:
            return False, f"File type '{mime_type}' not allowed"
        
        # Validate file extension matches MIME type
        ext = os.path.splitext(filename)[1].lower()
        if not ext:
            return False, "File must have an extension"
        
        expected_mime = self.EXTENSION_TO_MIME.get(ext)
        if expected_mime and expected_mime != mime_type:
            return False, f"File extension '{ext}' does not match MIME type '{mime_type}'"
        
        # Check for suspicious filenames
        if '..' in filename or '/' in filename or '\\' in filename:
            return False, "Invalid filename"
        
        return True, None
    
    def generate_storage_key(
        self,
        company_id: int,
        filename: str,
        subfolder: str = "attachments"
    ) -> str:
        """
        Generate unique storage key with tenant isolation
        
        Pattern: {subfolder}/{company_id}/{year}/{month}/{uuid}{extension}
        Example: attachments/42/2026/03/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
        
        Benefits:
        - Company isolation for security
        - Date-based organization for lifecycle management
        - UUID prevents collisions and guessing
        """
        now = datetime.now(timezone.utc)
        unique_id = uuid.uuid4()
        ext = os.path.splitext(filename)[1].lower()
        
        # Ensure extension is present
        if not ext:
            ext = '.bin'
        
        key = f"{subfolder}/{company_id}/{now.year}/{now.month:02d}/{unique_id}{ext}"
        
        logger.debug(f"Generated storage key: {key}")
        return key
    
    def get_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600
    ) -> str:
        """Get presigned URL for uploading a file"""
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
        """Get presigned URL for downloading a file (short-lived)"""
        return self.provider.generate_presigned_download_url(
            storage_key,
            expires_in
        )
    
    def delete_attachment(self, storage_key: str) -> bool:
        """Delete attachment from storage"""
        return self.provider.delete_object(storage_key)
    
    def object_exists(self, storage_key: str) -> bool:
        """Check if object exists in storage"""
        return self.provider.object_exists(storage_key)
    
    @staticmethod
    def calculate_checksum(file_path: str) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()


# ═══════════════════════════════════════════════════════════════════════════
# USAGE EXAMPLES
# ═══════════════════════════════════════════════════════════════════════════

"""
# In your router:

from app.services.storage_service import StorageService

storage_service = StorageService()

@router.post("/messages/attachments/upload-url")
async def get_upload_url(
    request: UploadRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Validate file
    valid, error = storage_service.validate_upload(
        request.filename,
        request.mime_type,
        request.size_bytes
    )
    
    if not valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Generate storage key with tenant isolation
    company_id = current_user["company_id"]
    storage_key = storage_service.generate_storage_key(company_id, request.filename)
    
    # Get presigned upload URL
    upload_url = storage_service.get_presigned_upload_url(
        storage_key,
        request.mime_type,
        expires_in=3600  # 1 hour
    )
    
    return {
        "upload_url": upload_url,
        "storage_key": storage_key
    }
"""
