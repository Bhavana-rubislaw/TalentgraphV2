"""
Migration: Create activityevent table with all required columns.
Also adds a unique index on dedupe_key (nullable, partial index).

Run once from the backend2/ folder:
    python migrate_activity_event.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine


MIGRATIONS = [
    # Core table
    """
    CREATE TABLE IF NOT EXISTS activityevent (
        id                   SERIAL PRIMARY KEY,
        entity_type          VARCHAR NOT NULL,
        entity_id            VARCHAR NOT NULL,
        action               VARCHAR NOT NULL,
        before_value         TEXT,
        after_value          TEXT,
        performed_by_user_id INTEGER NOT NULL,
        performed_by_role    VARCHAR NOT NULL,
        created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        request_id           VARCHAR,
        source               VARCHAR NOT NULL DEFAULT 'web',
        dedupe_key           VARCHAR
    )
    """,
    # Unique partial index on dedupe_key (only for non-null values)
    """
    CREATE UNIQUE INDEX IF NOT EXISTS ix_activityevent_dedupe_key
    ON activityevent (dedupe_key)
    WHERE dedupe_key IS NOT NULL
    """,
    # Performance indexes
    "CREATE INDEX IF NOT EXISTS ix_activityevent_user ON activityevent (performed_by_user_id)",
    "CREATE INDEX IF NOT EXISTS ix_activityevent_entity ON activityevent (entity_type, entity_id)",
    "CREATE INDEX IF NOT EXISTS ix_activityevent_created ON activityevent (created_at DESC)",
    "CREATE INDEX IF NOT EXISTS ix_activityevent_request ON activityevent (request_id)",
]


def run():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            short = sql.strip()[:80].replace('\n', ' ')
            print(f"Running: {short}...")
            conn.execute(text(sql))
        conn.commit()
    print("\n✅ activityevent table migration applied successfully.")


if __name__ == "__main__":
    run()
