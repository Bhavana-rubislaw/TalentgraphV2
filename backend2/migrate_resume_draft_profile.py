"""
Database Migration: Add ResumeDraftProfile table for resume-assisted onboarding
This table stores parsed resume data before final candidate profile creation
"""

import logging
from sqlmodel import Session, create_engine, SQLModel, text
from app.database import engine
from app.models import ResumeDraftProfile, ParseStatus, ReviewStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Create ResumeDraftProfile table"""
    logger.info("=" * 60)
    logger.info("MIGRATION: Adding ResumeDraftProfile table")
    logger.info("=" * 60)
    
    try:
        # Create the table
        SQLModel.metadata.create_all(engine, tables=[ResumeDraftProfile.__table__])
        logger.info("✓ ResumeDraftProfile table created successfully")
        
        # Verify table creation
        with Session(engine) as session:
            result = session.exec(
                text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='resume_draft_profile'")
            ).first()
            
            if result and result[0] > 0:
                logger.info("✓ Table verification passed")
            else:
                logger.error("✗ Table verification failed - table not found")
                return False
        
        logger.info("=" * 60)
        logger.info("MIGRATION COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        return True
        
    except Exception as e:
        logger.error(f"✗ Migration failed: {e}")
        logger.error("=" * 60)
        raise


if __name__ == "__main__":
    run_migration()
