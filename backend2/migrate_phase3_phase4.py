"""
Database Migration Script for TalentGraph Phase 3 & 4
======================================================
Applies all Phase 3 & 4 models to the database

Run this script after:
1. Installing new dependencies (pip install -r requirements.txt)
2. Configuring environment variables (.env)
3. Backing up your database

Usage:
    python migrate_phase3_phase4.py
"""

import sys
import os
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import SQLModel, create_engine, Session
from app.database import engine
from app.models import *  # Import all existing models

# Import Phase 3 & 4 models
from PHASE3_PHASE4_MODELS import (
    AttachmentScanStatus, EmailProvider, SubscriptionStatus, InvoiceStatus, AnalyticsEventType,
    MessageAttachment, EmailThreadLink, InboundEmailEvent,
    Subscription, Invoice, PaymentEvent, Entitlement,
    AnalyticsEvent, AnalyticsRollupDaily
)

print("=" * 70)
print("TalentGraph Phase 3 & 4 Database Migration")
print("=" * 70)
print()

# Get database engine
try:
    print(f"✓ Connected to database: {engine.url}")
except Exception as e:
    print(f"✗ Failed to connect to database: {e}")
    sys.exit(1)

print()
print("WARNING: This migration will create new tables in your database.")
print("Make sure you have backed up your database before proceeding.")
print()

# Confirm
response = input("Continue with migration? (yes/no): ")
if response.lower() != "yes":
    print("Migration cancelled.")
    sys.exit(0)

print()
print("Starting migration...")
print()

try:
    # Create all tables
    SQLModel.metadata.create_all(engine)
    
    print("✓ Created tables:")
    print("  - message_attachment")
    print("  - email_thread_link")
    print("  - inbound_email_event")
    print("  - subscription")
    print("  - invoice")
    print("  - payment_event")
    print("  - entitlement")
    print("  - analytics_event")
    print("  - analytics_rollup_daily")
    print()
    
    # Verify tables exist
    with Session(engine) as session:
        # Try to query each table
        session.exec("SELECT COUNT(*) FROM message_attachment")
        session.exec("SELECT COUNT(*) FROM email_thread_link")
        session.exec("SELECT COUNT(*) FROM inbound_email_event")
        session.exec("SELECT COUNT(*) FROM subscription")
        session.exec("SELECT COUNT(*) FROM invoice")
        session.exec("SELECT COUNT(*) FROM payment_event")
        session.exec("SELECT COUNT(*) FROM entitlement")
        session.exec("SELECT COUNT(*) FROM analytics_event")
        session.exec("SELECT COUNT(*) FROM analytics_rollup_daily")
    
    print("✓ Verified all tables exist and are accessible")
    print()
    
    print("=" * 70)
    print("Migration Completed Successfully!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Update app/models.py to include Phase 3 & 4 models")
    print("2. Register new routers in app/main.py")
    print("3. Start workers with scheduler")
    print("4. Configure external services (S3, SendGrid, Stripe)")
    print()
    
except Exception as e:
    print(f"✗ Migration failed: {e}")
    print()
    print("Please check the error and try again.")
    print("If tables were partially created, you may need to drop them manually.")
    sys.exit(1)
