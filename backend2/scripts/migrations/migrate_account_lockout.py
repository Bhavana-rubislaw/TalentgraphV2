"""
Database migration: Account lockout tracking on the User table
Adds failed_login_attempts, locked_until, and last_failed_login_at columns
used by app/services/login_attempts.py for brute-force protection.
Run from backend2 folder: python -m scripts.migrations.migrate_account_lockout
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
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITHOUT TIME ZONE',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP WITHOUT TIME ZONE',
    ]

    try:
        with engine.connect() as conn:
            for ddl in ddl_statements:
                conn.execute(text(ddl))
                logger.info(f"[OK] {ddl}")
            conn.commit()

        logger.info("[DONE] Account lockout migration complete")
        return True

    except Exception as e:
        logger.error(f"[ERROR] Migration failed: {e}")
        raise


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
