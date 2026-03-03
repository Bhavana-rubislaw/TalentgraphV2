"""
Migration: Add missing columns to the notification table.
Run once from the backend2 folder:
    python migrate_notifications.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

MIGRATIONS = [
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS title VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS message VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS event_type VARCHAR NOT NULL DEFAULT 'general'",
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()",
    "ALTER TABLE notification ADD COLUMN IF NOT EXISTS payload VARCHAR",
]

def run():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            print(f"Running: {sql[:80]}...")
            conn.execute(text(sql))
        conn.commit()
    print("\nAll migrations applied successfully.")

if __name__ == "__main__":
    run()
