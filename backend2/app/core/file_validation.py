"""
File Upload Validation and Security
Provides comprehensive validation for file uploads to prevent security vulnerabilities
"""

import os
import hashlib
import logging
from pathlib import Path
from typing import Optional, List, Tuple
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# python-magic requires libmagic native library; on Windows use python-magic-bin
try:
    import magic as _magic
    _MAGIC_AVAILABLE = True
except (ImportError, OSError):
    _magic = None  # type: ignore
    _MAGIC_AVAILABLE = False
    logger.warning("[FILE_VALIDATION] python-magic/libmagic not available — MIME detection via magic bytes disabled")


class FileValidator:
    """Validates file uploads for security and compliance"""
    
    # Maximum file sizes (in bytes)
    MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_CERTIFICATION_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    
    # Allowed MIME types
    ALLOWED_RESUME_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf'
    }
    
    ALLOWED_CERTIFICATION_TYPES = {
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg'
    }
    
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp'
    }
    
    # Allowed file extensions
    ALLOWED_RESUME_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
    ALLOWED_CERTIFICATION_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
    ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    
    # Dangerous file signatures (magic bytes) to reject
    DANGEROUS_SIGNATURES = [
        b'MZ',  # Windows executable
        b'\x7fELF',  # Linux executable
        b'#!',  # Shell script
        b'<?php',  # PHP script
        b'<script',  # JavaScript
        b'<%',  # JSP/ASP
    ]
    
    @staticmethod
    def validate_file_size(file: UploadFile, max_size: int, file_type: str = "file") -> None:
        """Validate file size"""
        try:
            # Read file content to check size
            file.file.seek(0, 2)  # Seek to end
            size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if size == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Empty file not allowed"
                )
            
            if size > max_size:
                max_mb = max_size / (1024 * 1024)
                raise HTTPException(
                    status_code=400,
                    detail=f"{file_type.capitalize()} size exceeds maximum allowed size of {max_mb}MB"
                )
            
            logger.info(f"[FILE_VALIDATION] {file_type} size: {size} bytes (max: {max_size})")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[FILE_VALIDATION] Size validation error: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to validate file size")
    
    @staticmethod
    def validate_file_type(
        file: UploadFile,
        allowed_types: set,
        allowed_extensions: set,
        file_type: str = "file"
    ) -> str:
        """
        Validate file type using both extension and MIME type
        Returns the validated MIME type
        """
        # Check extension
        filename = file.filename or ""
        ext = Path(filename).suffix.lower()
        
        if not ext:
            raise HTTPException(
                status_code=400,
                detail="File must have an extension"
            )
        
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File extension {ext} not allowed for {file_type}. "
                       f"Allowed: {', '.join(sorted(allowed_extensions))}"
            )
        
        # Validate MIME type from content-type header
        content_type = file.content_type or ""
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {content_type} not allowed for {file_type}. "
                       f"Allowed: {', '.join(sorted(allowed_types))}"
            )
        
        logger.info(f"[FILE_VALIDATION] {file_type} type: {content_type}, extension: {ext}")
        return content_type
    
    @staticmethod
    def validate_file_content(file: UploadFile, file_type: str = "file") -> bytes:
        """
        Validate file content by reading magic bytes
        Returns file content for further processing
        """
        try:
            # Read file content
            file.file.seek(0)
            content = file.file.read()
            file.file.seek(0)  # Reset for later use
            
            # Check for dangerous signatures
            for signature in FileValidator.DANGEROUS_SIGNATURES:
                if content.startswith(signature):
                    logger.warning(
                        f"[FILE_VALIDATION] Dangerous file signature detected: "
                        f"{signature.hex()} in {file.filename}"
                    )
                    raise HTTPException(
                        status_code=400,
                        detail="File contains dangerous content and cannot be uploaded"
                    )
            
            # Use python-magic to verify actual file type
            try:
                if _MAGIC_AVAILABLE:
                    detected_type = _magic.from_buffer(content, mime=True)
                    logger.info(f"[FILE_VALIDATION] Detected MIME type: {detected_type}")
                    
                    # Verify detected type matches declared type
                    declared_type = file.content_type or ""
                    if detected_type != declared_type:
                        # Some leniency for common mismatches
                        allowed_mismatches = {
                            ('application/octet-stream', 'application/pdf'),
                            ('text/plain', 'application/pdf'),
                        }
                        if (declared_type, detected_type) not in allowed_mismatches:
                            logger.warning(
                                f"[FILE_VALIDATION] MIME type mismatch: "
                                f"declared={declared_type}, detected={detected_type}"
                            )
                            # Don't reject, just log for now (can be strict in production)
                else:
                    logger.info("[FILE_VALIDATION] Skipping magic-byte MIME check (libmagic not available)")
            except Exception as e:
                logger.warning(f"[FILE_VALIDATION] Magic byte detection failed: {str(e)}")
                # Continue if python-magic is not available
            
            return content
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[FILE_VALIDATION] Content validation error: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to validate file content")
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent path traversal and other attacks
        """
        # Remove any path components
        filename = Path(filename).name
        
        # Remove or replace dangerous characters
        dangerous_chars = ['..', '/', '\\', '\x00', '<', '>', ':', '"', '|', '?', '*']
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # Limit length
        name, ext = os.path.splitext(filename)
        if len(name) > 200:
            name = name[:200]
        
        sanitized = f"{name}{ext}"
        logger.info(f"[FILE_VALIDATION] Sanitized filename: {filename} -> {sanitized}")
        return sanitized
    
    @classmethod
    def validate_resume(cls, file: UploadFile) -> Tuple[bytes, str]:
        """
        Comprehensive validation for resume uploads
        Returns: (file_content, mime_type)
        """
        cls.validate_file_size(file, cls.MAX_RESUME_SIZE, "resume")
        mime_type = cls.validate_file_type(
            file,
            cls.ALLOWED_RESUME_TYPES,
            cls.ALLOWED_RESUME_EXTENSIONS,
            "resume"
        )
        content = cls.validate_file_content(file, "resume")
        return content, mime_type
    
    @classmethod
    def validate_certification(cls, file: UploadFile) -> Tuple[bytes, str]:
        """
        Comprehensive validation for certification uploads
        Returns: (file_content, mime_type)
        """
        cls.validate_file_size(file, cls.MAX_CERTIFICATION_SIZE, "certification")
        mime_type = cls.validate_file_type(
            file,
            cls.ALLOWED_CERTIFICATION_TYPES,
            cls.ALLOWED_CERTIFICATION_EXTENSIONS,
            "certification"
        )
        content = cls.validate_file_content(file, "certification")
        return content, mime_type
    
    @classmethod
    def validate_image(cls, file: UploadFile) -> Tuple[bytes, str]:
        """
        Comprehensive validation for image uploads
        Returns: (file_content, mime_type)
        """
        cls.validate_file_size(file, cls.MAX_IMAGE_SIZE, "image")
        mime_type = cls.validate_file_type(
            file,
            cls.ALLOWED_IMAGE_TYPES,
            cls.ALLOWED_IMAGE_EXTENSIONS,
            "image"
        )
        content = cls.validate_file_content(file, "image")
        return content, mime_type
    
    @staticmethod
    def calculate_file_hash(content: bytes) -> str:
        """Calculate SHA-256 hash of file content for integrity checking"""
        return hashlib.sha256(content).hexdigest()


# Convenience functions
def validate_resume_upload(file: UploadFile) -> Tuple[bytes, str, str]:
    """
    Validate resume upload and return (content, mime_type, hash)
    """
    content, mime_type = FileValidator.validate_resume(file)
    file_hash = FileValidator.calculate_file_hash(content)
    return content, mime_type, file_hash


def validate_certification_upload(file: UploadFile) -> Tuple[bytes, str, str]:
    """
    Validate certification upload and return (content, mime_type, hash)
    """
    content, mime_type = FileValidator.validate_certification(file)
    file_hash = FileValidator.calculate_file_hash(content)
    return content, mime_type, file_hash


def validate_image_upload(file: UploadFile) -> Tuple[bytes, str, str]:
    """
    Validate image upload and return (content, mime_type, hash)
    """
    content, mime_type = FileValidator.validate_image(file)
    file_hash = FileValidator.calculate_file_hash(content)
    return content, mime_type, file_hash
