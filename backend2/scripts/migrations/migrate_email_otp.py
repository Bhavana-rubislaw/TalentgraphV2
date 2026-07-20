"""
Database migration: Email OTP verification
- Adds is_email_verified to "user". Existing accounts are grandfathered in
  as verified (they will still prove inbox ownership at their next login
  via the login OTP); only NEW signups start unverified.
- The emailotp table itself is created automatically by
  SQLModel.metadata.create_all on app startup.
Run from backend2 folder: python -m scripts.migrations.migrate_email_otp
"""

import os
import sys
import logging

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import text
from app.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Apply migration"""

    ddl_statements = [
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE',
        'UPDATE "user" SET is_email_verified = TRUE',
    ]

    try:
        with engine.connect() as conn:
            for ddl in ddl_statements:
                conn.execute(text(ddl))
                logger.info(f"[OK] {ddl}")
            conn.commit()

        logger.info("[DONE] Email OTP migration complete")
        return True

    except Exception as e:
        logger.error(f"[ERROR] Migration failed: {e}")
        raise


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
