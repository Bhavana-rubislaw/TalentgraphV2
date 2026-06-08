"""
Migration: Credits, Subscriptions & Team Invitations
=====================================================
Changes applied:
  1. company table  — adds current_credits, is_primary_account, parent_company_id
  2. subscription_plan  — new table
  3. company_subscription — new table
  4. credit_transaction   — new table
  5. team_invite          — new table
  6. Data migration       — marks existing Company rows that are the
                            "oldest admin" per company_name as is_primary_account = TRUE
                            and sets parent_company_id for all other members.

Run from backend2/ with the venv activated:
    python migrate_credits_subscriptions_team.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import inspect as sa_inspect, text
from sqlmodel import Session, select

from app.database import engine
from app.models import Company, User, UserRole


# ─── helpers ─────────────────────────────────────────────────────────────────

def col_exists(conn, table: str, column: str) -> bool:
    insp = sa_inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def table_exists(conn, table: str) -> bool:
    insp = sa_inspect(conn)
    return table in insp.get_table_names()


# ─── migration steps ──────────────────────────────────────────────────────────

def step1_alter_company(conn) -> None:
    """Add new columns to the company table."""
    if not col_exists(conn, "company", "current_credits"):
        print("  [+] company.current_credits")
        conn.execute(text("ALTER TABLE company ADD COLUMN current_credits INTEGER NOT NULL DEFAULT 0"))

    if not col_exists(conn, "company", "is_primary_account"):
        print("  [+] company.is_primary_account")
        conn.execute(text("ALTER TABLE company ADD COLUMN is_primary_account BOOLEAN NOT NULL DEFAULT FALSE"))

    if not col_exists(conn, "company", "parent_company_id"):
        print("  [+] company.parent_company_id")
        conn.execute(text("ALTER TABLE company ADD COLUMN parent_company_id INTEGER REFERENCES company(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_company_parent_company_id ON company (parent_company_id)"))


def step2_subscription_plan(conn) -> None:
    """Create subscription_plan table."""
    if table_exists(conn, "subscription_plan"):
        print("  [skip] subscription_plan already exists")
        return
    print("  [+] subscription_plan table")
    conn.execute(text("""
        CREATE TABLE subscription_plan (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR NOT NULL UNIQUE,
            description TEXT,
            price       DOUBLE PRECISION NOT NULL DEFAULT 0,
            currency    VARCHAR NOT NULL DEFAULT 'USD',
            credits_included INTEGER NOT NULL DEFAULT 0,
            job_post_limit   INTEGER NOT NULL DEFAULT 5,
            team_member_limit INTEGER NOT NULL DEFAULT 1,
            is_active   BOOLEAN NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    # Seed default plans
    conn.execute(text("""
        INSERT INTO subscription_plan
            (name, description, price, currency, credits_included, job_post_limit, team_member_limit, is_active)
        VALUES
            ('Free',    'Up to 2 job posts, 1 team member',               0,    'USD', 0,   2,  1,  TRUE),
            ('Starter', 'Up to 10 job posts, 3 team members, 50 credits', 49,   'USD', 50,  10, 3,  TRUE),
            ('Pro',     'Unlimited job posts, 10 members, 200 credits',   149,  'USD', 200, 0,  10, TRUE),
            ('Enterprise', 'Unlimited everything, custom credits',        499,  'USD', 1000,0,  0,  TRUE)
        ON CONFLICT (name) DO NOTHING
    """))


def step3_company_subscription(conn) -> None:
    """Create company_subscription table."""
    if table_exists(conn, "company_subscription"):
        print("  [skip] company_subscription already exists")
        return
    print("  [+] company_subscription table")
    conn.execute(text("""
        CREATE TABLE company_subscription (
            id         SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES company(id),
            plan_id    INTEGER NOT NULL REFERENCES subscription_plan(id),
            start_date TIMESTAMP NOT NULL,
            end_date   TIMESTAMP NOT NULL,
            status     VARCHAR NOT NULL DEFAULT 'active',
            auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    conn.execute(text("CREATE INDEX ix_company_subscription_company_id ON company_subscription (company_id)"))
    conn.execute(text("CREATE INDEX ix_company_subscription_status ON company_subscription (status)"))


def step4_credit_transaction(conn) -> None:
    """Create credit_transaction table."""
    if table_exists(conn, "credit_transaction"):
        print("  [skip] credit_transaction already exists")
        return
    print("  [+] credit_transaction table")
    conn.execute(text("""
        CREATE TABLE credit_transaction (
            id               SERIAL PRIMARY KEY,
            company_id       INTEGER NOT NULL REFERENCES company(id),
            type             VARCHAR NOT NULL,
            amount           INTEGER NOT NULL,
            description      TEXT,
            transaction_date TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    conn.execute(text("CREATE INDEX ix_credit_transaction_company_id ON credit_transaction (company_id)"))
    conn.execute(text("CREATE INDEX ix_credit_transaction_type ON credit_transaction (type)"))


def step5_team_invite(conn) -> None:
    """Create team_invite table."""
    if table_exists(conn, "team_invite"):
        print("  [skip] team_invite already exists")
        return
    print("  [+] team_invite table")
    conn.execute(text("""
        CREATE TABLE team_invite (
            id                  SERIAL PRIMARY KEY,
            company_id          INTEGER NOT NULL REFERENCES company(id),
            invited_by_user_id  INTEGER NOT NULL REFERENCES "user"(id),
            invitee_email       VARCHAR NOT NULL,
            role                VARCHAR NOT NULL,
            token_hash          VARCHAR NOT NULL UNIQUE,
            status              VARCHAR NOT NULL DEFAULT 'pending',
            expires_at          TIMESTAMP NOT NULL,
            accepted_at         TIMESTAMP,
            created_at          TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    conn.execute(text("CREATE INDEX ix_team_invite_company_id       ON team_invite (company_id)"))
    conn.execute(text("CREATE INDEX ix_team_invite_invitee_email    ON team_invite (invitee_email)"))
    conn.execute(text("CREATE INDEX ix_team_invite_token_hash       ON team_invite (token_hash)"))
    conn.execute(text("CREATE INDEX ix_team_invite_status           ON team_invite (status)"))


def step6_data_migration(conn) -> None:
    """
    For each unique company_name, designate one Company record as the primary account:
    - Prefer the oldest ADMIN; fallback to the oldest HR; fallback to the oldest row.
    - Set is_primary_account = TRUE for that record.
    - Set parent_company_id = primary.id for all other rows with the same company_name.
    Skips company_name == '' (blank names from initial signup).
    """
    print("  [data] Migrating existing company rows to primary account structure…")

    rows = conn.execute(
        text("""
            SELECT c.id, c.company_name, c.employee_type, c.created_at, u.role
            FROM company c
            JOIN "user" u ON u.id = c.user_id
            WHERE c.company_name != ''
            ORDER BY c.company_name, c.created_at ASC
        """)
    ).fetchall()

    # Group by normalised company_name
    from collections import defaultdict
    groups: dict[str, list] = defaultdict(list)
    for row in rows:
        groups[row[1].strip().lower()].append(row)

    for _name, members in groups.items():
        # Already migrated check
        first_id = members[0][0]
        already = conn.execute(
            text("SELECT is_primary_account FROM company WHERE id = :id"), {"id": first_id}
        ).scalar()
        if already:
            continue  # already set

        # Pick primary: oldest ADMIN → oldest HR → oldest row
        primary = None
        for row in members:
            if row[4] == "admin":
                primary = row
                break
        if not primary:
            for row in members:
                if row[4] == "hr":
                    primary = row
                    break
        if not primary:
            primary = members[0]

        primary_id = primary[0]
        conn.execute(
            text("UPDATE company SET is_primary_account = TRUE WHERE id = :id"),
            {"id": primary_id},
        )
        for row in members:
            if row[0] != primary_id:
                conn.execute(
                    text("""
                        UPDATE company
                        SET parent_company_id = :pid
                        WHERE id = :cid AND parent_company_id IS NULL
                    """),
                    {"pid": primary_id, "cid": row[0]},
                )

    print("  [data] Migration complete")


# ─── main ─────────────────────────────────────────────────────────────────────

def run() -> None:
    print("[MIGRATE] Credits / Subscriptions / Team Invitations")
    print("=" * 60)

    with engine.begin() as conn:
        print("[1/6] Altering company table…")
        step1_alter_company(conn)

        print("[2/6] Creating subscription_plan table…")
        step2_subscription_plan(conn)

        print("[3/6] Creating company_subscription table…")
        step3_company_subscription(conn)

        print("[4/6] Creating credit_transaction table…")
        step4_credit_transaction(conn)

        print("[5/6] Creating team_invite table…")
        step5_team_invite(conn)

        print("[6/6] Running data migration…")
        step6_data_migration(conn)

    print("=" * 60)
    print("[MIGRATE] Done. All steps completed successfully.")


if __name__ == "__main__":
    run()
