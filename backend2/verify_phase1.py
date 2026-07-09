"""
Verification Script for Phase 1 Notification Enhancements
==========================================================
Tests all new components to ensure they work correctly.
"""

import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_registry():
    """Test notification registry"""
    logger.info("\n=== Testing Notification Registry ===")
    try:
        from app.core.notification_registry import (
            validate_event_type,
            get_notification_spec,
            list_all_event_types,
            get_priority,
            get_category
        )
        
        # Test validation
        assert validate_event_type("application_status") == True
        assert validate_event_type("invalid_type") == False
        logger.info("✓ Event validation works")
        
        # Test spec retrieval
        spec = get_notification_spec("application_status")
        assert spec is not None
        assert spec.priority.value == "normal"
        logger.info(f"✓ Spec retrieval works (priority: {spec.priority})")
        
        # Test list all
        event_types = list_all_event_types()
        logger.info(f"Found {len(event_types)} event types: {event_types}")
        # We have 14 unique event types (8 candidate + 6 recruiter, no duplicates)
        assert len(event_types) == 14, f"Expected 14 event types, got {len(event_types)}"
        logger.info(f"✓ Registry has {len(event_types)} event types")
        
        return True
    except Exception as e:
        logger.error(f"✗ Registry test failed: {e}")
        return False


def test_payload_schema():
    """Test notification payload schema"""
    logger.info("\n=== Testing Payload Schema ===")
    try:
        from app.schemas.notification_payloads import (
            NotificationPayload,
            NotificationAction,
            NotificationContextData,
            build_application_payload
        )
        
        # Test builder
        payload = build_application_payload(
            application_id=123,
            job_title="Senior Developer",
            status="shortlisted"
        )
        
        assert payload.action.route == "/applications/123"
        assert payload.context.application_id == 123
        logger.info("✓ Payload builder works")
        
        # Test serialization
        json_str = payload.to_json_string()
        assert "application_id" in json_str
        logger.info("✓ Payload serialization works")
        
        # Test parsing
        parsed = NotificationPayload.from_json_string(json_str)
        assert parsed.action.route == "/applications/123"
        logger.info("✓ Payload parsing works")
        
        return True
    except Exception as e:
        logger.error(f"✗ Payload schema test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_security():
    """Test security module"""
    logger.info("\n=== Testing Security Module ===")
    try:
        from app.core.notification_security import NotificationSecurity
        
        # Test sanitization
        sanitized = NotificationSecurity.sanitize_email_message(
            "Sensitive info $150K",
            "application_status"
        )
        assert "$150K" not in sanitized
        logger.info(f"✓ Sanitization works: '{sanitized}'")
        
        # Test preview redaction
        preview = NotificationSecurity.generate_secure_preview(
            "Contact me at user@example.com or 555-123-4567",  # Use full 10-digit phone
            max_length=100
        )
        logger.info(f"Preview result: '{preview}'")
        assert "[EMAIL REDACTED]" in preview, "Email should be redacted"
        assert "[PHONE REDACTED]" in preview or "555-123-4567" not in preview, "Phone should be redacted"
        logger.info(f"✓ Preview redaction works")
        
        return True
    except Exception as e:
        logger.error(f"✗ Security test failed: {e}")
        return False


def test_models():
    """Test new database models"""
    logger.info("\n=== Testing Database Models ===")
    try:
        from app.models import EmailDelivery, EmailDeliveryStatus
        
        # Test enum
        assert EmailDeliveryStatus.QUEUED.value == "queued"
        assert EmailDeliveryStatus.SENT.value == "sent"
        logger.info("✓ EmailDeliveryStatus enum works")
        
        # Test model instantiation
        delivery = EmailDelivery(
            user_id=1,
            recipient_email="test@example.com",
            event_type="application_status",
            subject="Test",
            idempotency_key="test123"
        )
        assert delivery.status == EmailDeliveryStatus.QUEUED.value
        assert delivery.attempts == 0
        logger.info("✓ EmailDelivery model instantiation works")
        
        return True
    except Exception as e:
        logger.error(f"✗ Model test failed: {e}")
        return False


def test_email_worker():
    """Test email worker functions"""
    logger.info("\n=== Testing Email Worker ===")
    try:
        from app.workers.email_worker import generate_idempotency_key, get_email_scheduler
        from datetime import datetime
        
        # Test idempotency key generation
        key1 = generate_idempotency_key(1, "test", datetime.utcnow())
        key2 = generate_idempotency_key(1, "test", datetime.utcnow())
        assert len(key1) == 32
        logger.info(f"✓ Idempotency key generation works (length: {len(key1)})")
        
        # Test scheduler initialization
        scheduler = get_email_scheduler()
        assert scheduler is not None
        logger.info("✓ Email scheduler initialization works")
        
        return True
    except Exception as e:
        logger.error(f"✗ Email worker test failed: {e}")
        return False


def test_retention():
    """Test retention policy"""
    logger.info("\n=== Testing Retention Policy ===")
    try:
        from app.workers.notification_retention import NotificationRetentionPolicy
        
        # Test configuration
        assert NotificationRetentionPolicy.READ_NOTIFICATION_RETENTION_DAYS == 30
        assert NotificationRetentionPolicy.UNREAD_NOTIFICATION_RETENTION_DAYS == 90
        logger.info("✓ Retention policy configuration works")
        
        return True
    except Exception as e:
        logger.error(f"✗ Retention test failed: {e}")
        return False


def main():
    """Run all tests"""
    logger.info("="*60)
    logger.info("Phase 1 Notification System Verification")
    logger.info("="*60)
    
    tests = [
        ("Registry", test_registry),
        ("Payload Schema", test_payload_schema),
        ("Security", test_security),
        ("Models", test_models),
        ("Email Worker", test_email_worker),
        ("Retention", test_retention),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            logger.error(f"Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("Test Summary")
    logger.info("="*60)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{status} - {name}")
    
    logger.info(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        logger.info("\n🎉 All tests passed! System is ready.")
        return 0
    else:
        logger.error(f"\n⚠️  {total_count - passed_count} test(s) failed. Review errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
