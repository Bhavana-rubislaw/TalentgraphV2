"""
Migration: Create chat tables (conversation, message) and add last_seen_at to user.

Run once from the backend2/ folder:
    python migrate_chat.py

Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

MIGRATIONS = [
    # ── last_seen_at on user ────────────────────────────────────────────────
    """
    ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITHOUT TIME ZONE
    """,

    # ── conversation table ──────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS conversation (
        id               SERIAL PRIMARY KEY,
        company_id       INTEGER NOT NULL REFERENCES company(id),
        candidate_id     INTEGER NOT NULL REFERENCES candidate(id),
        job_posting_id   INTEGER NOT NULL REFERENCES jobposting(id),
        created_by_user_id INTEGER NOT NULL REFERENCES "user"(id),
        last_message_at  TIMESTAMP WITHOUT TIME ZONE,
        created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
    """,

    # ── unique constraint on conversation ──────────────────────────────────
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_conversation_company_candidate_job'
        ) THEN
            ALTER TABLE conversation
                ADD CONSTRAINT uq_conversation_company_candidate_job
                UNIQUE (company_id, candidate_id, job_posting_id);
        END IF;
    END
    $$
    """,

    # ── indexes on conversation ─────────────────────────────────────────────
    "CREATE INDEX IF NOT EXISTS ix_conversation_company_id   ON conversation(company_id)",
    "CREATE INDEX IF NOT EXISTS ix_conversation_candidate_id ON conversation(candidate_id)",
    "CREATE INDEX IF NOT EXISTS ix_conversation_job_posting_id ON conversation(job_posting_id)",

    # ── message table ───────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS message (
        id               SERIAL PRIMARY KEY,
        conversation_id  INTEGER NOT NULL REFERENCES conversation(id),
        sender_user_id   INTEGER NOT NULL REFERENCES "user"(id),
        text             TEXT    NOT NULL,
        is_read          BOOLEAN NOT NULL DEFAULT FALSE,
        created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
    """,

    # ── indexes on message ──────────────────────────────────────────────────
    "CREATE INDEX IF NOT EXISTS ix_message_conversation_id ON message(conversation_id)",
    "CREATE INDEX IF NOT EXISTS ix_message_sender_user_id  ON message(sender_user_id)",
]


def run():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            clean = " ".join(sql.split())
            print(f"Running: {clean[:100]}...")
            conn.execute(text(sql))
        conn.commit()
    print("\n✅ Chat migration applied successfully.")


if __name__ == "__main__":
    run()
