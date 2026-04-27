"""
Database Migration: Email Delivery Tracking
============================================
Creates email_delivery table and email_delivery_status_enum type.

Run this migration:
    python -m scripts.migrations.migrate_email_delivery
"""

import logging
from sqlmodel import Session, select, text
from app.database import engine
from app.models import EmailDelivery, EmailDeliveryStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_email_delivery():
    """Create email_delivery table and supporting enum"""
    
    logger.info("=" * 60)
    logger.info("Starting Email Delivery Tracking Migration...")
    logger.info("=" * 60)
    
    with Session(engine) as session:
        try:
            # STEP 1: Create email_delivery_status_enum type
            logger.info("\n[Create email_delivery_status_enum]")
            try:
                session.exec(text("""
                    CREATE TYPE email_delivery_status_enum AS ENUM (
                        'queued',
                        'sending',
                        'sent',
                        'failed',
                        'bounced',
                        'suppressed'
                    );
                """))
                session.commit()
                logger.info("✓ Created email_delivery_status_enum type")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info("⊙ email_delivery_status_enum already exists (skipping)")
                    session.rollback()
                else:
                    raise
            
            # STEP 2: Create email_delivery table
            logger.info("\n[Create email_delivery table]")
            try:
                session.exec(text("""
                    CREATE TABLE IF NOT EXISTS email_delivery (
                        id SERIAL PRIMARY KEY,
                        notification_id INTEGER REFERENCES notification(id) ON DELETE SET NULL,
                        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                        recipient_email VARCHAR NOT NULL,
                        event_type VARCHAR NOT NULL,
                        subject VARCHAR NOT NULL,
                        status email_delivery_status_enum DEFAULT 'queued',
                        attempts INTEGER DEFAULT 0,
                        max_attempts INTEGER DEFAULT 3,
                        last_error TEXT,
                        last_attempt_at TIMESTAMP,
                        idempotency_key VARCHAR NOT NULL UNIQUE,
                        created_at TIMESTAMP DEFAULT NOW(),
                        sent_at TIMESTAMP,
                        failed_at TIMESTAMP
                    );
                """))
                session.commit()
                logger.info("✓ Created email_delivery table")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info("⊙ email_delivery table already exists (skipping)")
                    session.rollback()
                else:
                    raise
            
            # STEP 3: Create indexes for performance
            logger.info("\n[Create indexes]")
            
            indexes = [
                ("idx_email_delivery_notification", "email_delivery", "notification_id"),
                ("idx_email_delivery_user", "email_delivery", "user_id"),
                ("idx_email_delivery_email", "email_delivery", "recipient_email"),
                ("idx_email_delivery_event", "email_delivery", "event_type"),
                ("idx_email_delivery_status", "email_delivery", "status"),
            ]
            
            for idx_name, table, column in indexes:
                try:
                    session.exec(text(f"""
                        CREATE INDEX IF NOT EXISTS {idx_name} 
                        ON {table}({column});
                    """))
                    session.commit()
                    logger.info(f"✓ Created index: {idx_name}")
                except Exception as e:
                    logger.warning(f"⊙ Index {idx_name} may already exist: {e}")
                    session.rollback()
            
            # STEP 4: Verify table creation
            logger.info("\n[Verify table]")
            result = session.exec(text("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'email_delivery';
            """)).first()
            
            if result and result[0] > 0:
                logger.info("✓ email_delivery table verified")
            else:
                logger.error("✗ email_delivery table not found!")
                return False
            
            logger.info("\n" + "=" * 60)
            logger.info("✓ Email Delivery Migration Complete!")
            logger.info("=" * 60)
            logger.info("\nNext steps:")
            logger.info("1. Restart backend server to load new models")
            logger.info("2. Email worker will start automatically")
            logger.info("3. Monitor logs for async email delivery")
            
            return True
        
        except Exception as e:
            logger.error(f"\n✗ Migration failed: {e}", exc_info=True)
            session.rollback()
            return False


def rollback_migration():
    """Rollback the migration (drop table and enum)"""
    logger.info("Rolling back Email Delivery Migration...")
    
    with Session(engine) as session:
        try:
            # Drop table first
            session.exec(text("DROP TABLE IF EXISTS email_delivery CASCADE;"))
            logger.info("✓ Dropped email_delivery table")
            
            # Drop enum
            session.exec(text("DROP TYPE IF EXISTS email_delivery_status_enum CASCADE;"))
            logger.info("✓ Dropped email_delivery_status_enum type")
            
            session.commit()
            logger.info("✓ Rollback complete")
            
        except Exception as e:
            logger.error(f"✗ Rollback failed: {e}")
            session.rollback()


if __name__ == "__main__":
    import sys
    
    if "--rollback" in sys.argv:
        rollback_migration()
    else:
        migrate_email_delivery()
