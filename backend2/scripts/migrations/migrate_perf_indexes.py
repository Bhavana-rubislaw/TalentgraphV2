"""
Database migration: Performance indexes for read-heavy queries
Day 1 DB optimization - adds 3 composite indexes + 1 partial index

Targets:
- application(candidate_id, job_posting_id) - duplicate check, candidate apps list
- swipe(candidate_id, job_posting_id) - dashboard dedup, candidate swipes list
- notification(user_id, created_at DESC) - paginated notification list
- notification(user_id) WHERE is_read = false - unread count queries

Safe, non-blocking: uses IF NOT EXISTS
"""

import logging
from sqlalchemy import text
from app.database import engine
from sqlmodel import Session

logger = logging.getLogger(__name__)

def migrate():
    """Add performance indexes"""
    
    indexes = [
        (
            "ix_application_candidate_job",
            "CREATE INDEX IF NOT EXISTS ix_application_candidate_job ON application (candidate_id, job_posting_id)",
            "Composite: application dedup check + candidate apps list"
        ),
        (
            "ix_swipe_candidate_job",
            "CREATE INDEX IF NOT EXISTS ix_swipe_candidate_job ON swipe (candidate_id, job_posting_id)",
            "Composite: swipe dedup check + candidate swipes list"
        ),
        (
            "ix_notification_user_created",
            "CREATE INDEX IF NOT EXISTS ix_notification_user_created ON notification (user_id, created_at DESC)",
            "Composite ordered: paginated notification list (eliminates Sort node)"
        ),
        (
            "ix_notification_user_unread",
            "CREATE INDEX IF NOT EXISTS ix_notification_user_unread ON notification (user_id) WHERE is_read = false",
            "Partial: unread notification count (skips false entries)"
        ),
    ]
    
    try:
        with Session(engine) as session:
            for index_name, ddl, description in indexes:
                try:
                    session.exec(text(ddl))
                    logger.info(f"[OK] {index_name}: {description}")
                except Exception as e:
                    if "already exists" in str(e):
                        logger.info(f"[SKIP] {index_name}: already exists")
                    else:
                        logger.error(f"[ERROR] {index_name}: {e}")
                        raise
            
            session.commit()
        
        # Analyze tables for planner to use new indexes
        with Session(engine) as session:
            for table in ["application", "swipe", "notification"]:
                try:
                    session.exec(text(f"ANALYZE {table}"))
                    logger.info(f"[OK] ANALYZE {table}")
                except Exception as e:
                    logger.warning(f"[WARN] ANALYZE {table}: {e}")
            session.commit()
        
        logger.info("[DONE] Performance indexes migration complete")
        return True
    
    except Exception as e:
        logger.error(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate()
