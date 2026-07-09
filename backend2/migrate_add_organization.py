"""
Migration: Add Organization model and UserInvitation model
============================================================
- Creates the 'organization' table
- Adds 'organization_id' FK column to 'company' table
- Groups existing Company rows by normalized company_name
- Creates one Organization per normalized name
- Assigns each Company row to its Organization
- Creates the 'user_invitation' table
- Preserves all existing data

Run from backend2/ directory with venv activated:
    python migrate_add_organization.py
"""

import re
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect as sa_inspect
from sqlmodel import Session, SQLModel, select

from app.database import engine
from app.models import Organization, UserInvitation, Company, User


def column_exists(conn, table: str, column: str) -> bool:
    insp = sa_inspect(conn)
    return any(c["name"] == column for c in insp.get_columns(table))


def table_exists(conn, table: str) -> bool:
    insp = sa_inspect(conn)
    return table in insp.get_table_names()


def normalize_company_name(name: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace for grouping."""
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9 ]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def run():
    print("[MIGRATE] Starting organization migration...")

    with engine.begin() as conn:
        # ── Step 1: Create 'organization' table ───────────────────────────────
        if not table_exists(conn, "organization"):
            print("[MIGRATE] Creating 'organization' table...")
            conn.execute(text("""
                CREATE TABLE organization (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    industry VARCHAR,
                    company_size VARCHAR,
                    website VARCHAR,
                    location VARCHAR,
                    description TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX ix_organization_name ON organization(name)"))
            print("[MIGRATE] ✓ 'organization' table created")
        else:
            print("[MIGRATE] 'organization' table already exists, skipping")

        # ── Step 2: Add organization_id to company ─────────────────────────────
        if not column_exists(conn, "company", "organization_id"):
            print("[MIGRATE] Adding 'organization_id' to 'company' table...")
            conn.execute(text("""
                ALTER TABLE company
                ADD COLUMN organization_id INTEGER REFERENCES organization(id)
            """))
            conn.execute(text("""
                CREATE INDEX ix_company_organization_id ON company(organization_id)
            """))
            print("[MIGRATE] ✓ 'organization_id' column added")
        else:
            print("[MIGRATE] 'organization_id' already exists in company, skipping")

        # ── Step 3: Create 'user_invitation' table ─────────────────────────────
        if not table_exists(conn, "user_invitation"):
            print("[MIGRATE] Creating 'user_invitation' table...")
            conn.execute(text("""
                CREATE TABLE user_invitation (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR NOT NULL,
                    full_name VARCHAR NOT NULL,
                    role VARCHAR NOT NULL,
                    organization_id INTEGER REFERENCES organization(id),
                    token_hash VARCHAR NOT NULL UNIQUE,
                    invited_by_user_id INTEGER NOT NULL REFERENCES "user"(id),
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    expires_at TIMESTAMP NOT NULL,
                    accepted_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX ix_user_invitation_email ON user_invitation(email)"))
            conn.execute(text("CREATE INDEX ix_user_invitation_token_hash ON user_invitation(token_hash)"))
            conn.execute(text("CREATE INDEX ix_user_invitation_status ON user_invitation(status)"))
            conn.execute(text("CREATE INDEX ix_user_invitation_organization_id ON user_invitation(organization_id)"))
            conn.execute(text("CREATE INDEX ix_user_invitation_invited_by_user_id ON user_invitation(invited_by_user_id)"))
            print("[MIGRATE] ✓ 'user_invitation' table created")
        else:
            print("[MIGRATE] 'user_invitation' table already exists, skipping")

    # ── Step 4: Group existing Company rows into Organizations ─────────────────
    print("[MIGRATE] Grouping existing companies into organizations...")
    with Session(engine) as session:
        # Only process companies without an organization_id
        unlinked_companies = session.exec(
            select(Company).where(Company.organization_id == None)
        ).all()

        if not unlinked_companies:
            print("[MIGRATE] No unlinked companies to process")
        else:
            # Build normalized-name → Organization mapping
            name_to_org: dict[str, Organization] = {}

            for company in unlinked_companies:
                normalized = normalize_company_name(company.company_name or "")
                if not normalized:
                    normalized = f"company_{company.id}"

                if normalized not in name_to_org:
                    # Check if an organization already exists with this normalized name
                    # by searching for any org whose normalized name matches
                    existing_orgs = session.exec(select(Organization)).all()
                    found_org = None
                    for org in existing_orgs:
                        if normalize_company_name(org.name) == normalized:
                            found_org = org
                            break

                    if found_org:
                        name_to_org[normalized] = found_org
                    else:
                        # Get best representative company_name (use first occurrence)
                        display_name = company.company_name or f"Company {company.id}"
                        new_org = Organization(
                            name=display_name,
                            website=company.company_website,
                            location=company.company_location,
                            description=company.company_description,
                            is_active=True,
                        )
                        session.add(new_org)
                        session.flush()
                        name_to_org[normalized] = new_org
                        print(f"[MIGRATE]   Created org: '{display_name}' (id={new_org.id})")

                org = name_to_org[normalized]
                company.organization_id = org.id
                session.add(company)

            session.commit()
            print(f"[MIGRATE] ✓ Linked {len(unlinked_companies)} company rows to {len(name_to_org)} organizations")

    print("[MIGRATE] ✓ Migration complete!")
    print()
    print("Summary of what was done:")
    print("  1. Created 'organization' table")
    print("  2. Added 'organization_id' FK to 'company' table")
    print("  3. Created 'user_invitation' table")
    print("  4. Grouped existing company rows into organizations by normalized name")
    print()
    print("Next steps:")
    print("  - Restart the backend server")
    print("  - The admin-ui Companies page is now available at /companies")


if __name__ == "__main__":
    run()
