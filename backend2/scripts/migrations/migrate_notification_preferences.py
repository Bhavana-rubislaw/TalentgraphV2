"""
Database migration script for NotificationPreferences table
Creates notification_preferences table with proper indexes and constraints
Run from backend2 folder: python -m scripts.migrations.migrate_notification_preferences
"""

import os
import sys
import logging
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import text
from app.database import engine, get_session
from app.models import NotificationPreferences, NotificationFrequency, User
from sqlmodel import Session, select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default event types for candidates and recruiters
CANDIDATE_EVENT_TYPES = [
    "application_status",
    "match_found",
    "shortlisted",
    "invitation",
    "interview_scheduled",
    "interview_reminder",
    "message_received",
    "job_recommendation"
]

RECRUITER_EVENT_TYPES = [
    "application_received",
    "match_found",
    "interview_scheduled",
    "interview_confirmed",
    "message_received",
    "job_update"
]


def create_notification_frequency_enum():
    """Create notification_frequency_enum type if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if enum exists
            result = conn.execute(text("""
                SELECT 1 FROM pg_type WHERE typname = 'notification_frequency_enum'
            """))
            
            if result.fetchone():
                logger.info("✓ notification_frequency_enum already exists")
                return True
            
            # Create enum
            conn.execute(text("""
                CREATE TYPE notification_frequency_enum AS ENUM ('realtime', 'daily', 'weekly')
            """))
            conn.commit()
            logger.info("✓ Created notification_frequency_enum type")
            return True
    except Exception as e:
        logger.error(f"Failed to create notification_frequency_enum: {e}")
        return False


def create_notification_preferences_table():
    """Create notification_preferences table"""
    try:
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'notification_preferences'
            """))
            
            if result.fetchone():
                logger.info("✓ notification_preferences table already exists")
                return True
            
            # Create table
            conn.execute(text("""
                CREATE TABLE notification_preferences (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    event_type VARCHAR NOT NULL,
                    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    in_app_frequency notification_frequency_enum NOT NULL DEFAULT 'realtime',
                    email_frequency notification_frequency_enum NOT NULL DEFAULT 'realtime',
                    priority VARCHAR NOT NULL DEFAULT 'normal',
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    CONSTRAINT unique_user_event_preference UNIQUE (user_id, event_type)
                )
            """))
            conn.commit()
            logger.info("✓ Created notification_preferences table")
            return True
    except Exception as e:
        logger.error(f"Failed to create notification_preferences table: {e}")
        return False


def create_indexes():
    """Create performance indexes"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_notif_pref_user_id ON notification_preferences(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_notif_pref_event_type ON notification_preferences(event_type)",
        "CREATE INDEX IF NOT EXISTS idx_notif_pref_user_event ON notification_preferences(user_id, event_type)",
    ]
    
    try:
        with engine.connect() as conn:
            for idx_sql in indexes:
                conn.execute(text(idx_sql))
                logger.info(f"✓ Created index: {idx_sql.split('ON')[0].split()[-1]}")
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        return False


def populate_default_preferences():
    """Create default preferences for all existing users using direct SQL"""
    try:
        with engine.connect() as conn:
            # Get all users
            result = conn.execute(text("SELECT id, role FROM \"user\""))
            users = result.fetchall()
            logger.info(f"Found {len(users)} users to populate")
            
            for user in users:
                user_id, user_role = user
                
                # Determine event types based on role
                if user_role == "candidate":
                    event_types = CANDIDATE_EVENT_TYPES
                elif user_role == "recruiter":
                    event_types = RECRUITER_EVENT_TYPES
                else:
                    # Skip admin/hr for now
                    continue
                
                # Check if user already has preferences
                existing = conn.execute(
                    text("SELECT COUNT(*) FROM notification_preferences WHERE user_id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if existing > 0:
                    logger.info(f"  Skipping user {user_id} - already has preferences")
                    continue
                
                # Insert default preferences for each event type using direct SQL
                for event_type in event_types:
                    # Determine priority based on event type
                    priority = "urgent" if event_type in [
                        "interview_scheduled", "interview_reminder", "interview_confirmed"
                    ] else "normal"
                    
                    conn.execute(text("""
                        INSERT INTO notification_preferences 
                        (user_id, event_type, in_app_enabled, email_enabled, in_app_frequency, email_frequency, priority, created_at, updated_at)
                        VALUES (:user_id, :event_type, :in_app_enabled, :email_enabled, :in_app_frequency::notification_frequency_enum, :email_frequency::notification_frequency_enum, :priority, NOW(), NOW())
                    """), {
                        "user_id": user_id,
                        "event_type": event_type,
                        "in_app_enabled": True,
                        "email_enabled": True,
                        "in_app_frequency": "realtime",
                        "email_frequency": "realtime",
                        "priority": priority
                    })
                
                conn.commit()
                logger.info(f"  ✓ Created {len(event_types)} preferences for user {user_id} ({user_role})")
            
            logger.info("✓ Populated default preferences for all users")
            return True
            
    except Exception as e:
        logger.error(f"Failed to populate default preferences: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_migration():
    """Run the complete migration"""
    logger.info("=" * 60)
    logger.info("Starting NotificationPreferences migration...")
    logger.info("=" * 60)
    
    steps = [
        ("Create notification_frequency_enum", create_notification_frequency_enum),
        ("Create notification_preferences table", create_notification_preferences_table),
        ("Create indexes", create_indexes),
        ("Populate default preferences", populate_default_preferences),
    ]
    
    for step_name, step_func in steps:
        logger.info(f"\n[{step_name}]")
        if not step_func():
            logger.error(f"❌ Migration failed at: {step_name}")
            return False
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ NotificationPreferences migration completed successfully!")
    logger.info("=" * 60)
    return True


if __name__ == "__main__":
    try:
        success = run_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Migration failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
