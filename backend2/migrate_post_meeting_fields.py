"""
Migration: Add post-meeting reminder and outcome tracking fields to meeting table
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

new_cols = [
    ("post_meeting_reminder_sent", "BOOLEAN", "FALSE"),
    ("post_meeting_reminder_sent_at", "TIMESTAMP", "NULL"),
    ("post_meeting_escalation_sent", "BOOLEAN", "FALSE"),
    ("post_meeting_escalation_sent_at", "TIMESTAMP", "NULL"),
    ("completed_at", "TIMESTAMP", "NULL"),
    ("completed_by_user_id", "INTEGER", "NULL"),
    ("completion_notes", "TEXT", "NULL"),
]

print("Running migration: post-meeting fields on meeting table")

with engine.begin() as conn:
    for col_name, col_type, default in new_cols:
        try:
            if default != "NULL":
                conn.execute(text(
                    f"ALTER TABLE meeting ADD COLUMN {col_name} {col_type} DEFAULT {default}"
                ))
            else:
                conn.execute(text(
                    f"ALTER TABLE meeting ADD COLUMN {col_name} {col_type}"
                ))
            print(f"  [+] Added: {col_name} {col_type}")
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg or "duplicate" in msg:
                print(f"  [=] Exists: {col_name}")
            else:
                print(f"  [!] Error on {col_name}: {e}")

    # Add enum values for COMPLETED and NO_SHOW if using PostgreSQL enum type
    try:
        conn.execute(text("ALTER TYPE meetingstatus ADD VALUE IF NOT EXISTS 'completed'"))
        print("  [+] Enum value 'completed' ensured")
    except Exception as e:
        print(f"  [~] meetingstatus enum: {e}")

    try:
        conn.execute(text("ALTER TYPE meetingstatus ADD VALUE IF NOT EXISTS 'no_show'"))
        print("  [+] Enum value 'no_show' ensured")
    except Exception as e:
        print(f"  [~] meetingstatus enum: {e}")

print("\nMigration complete!")
