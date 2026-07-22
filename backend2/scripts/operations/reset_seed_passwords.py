#!/usr/bin/env python3
"""Reset every existing user's password to the local seed/test password.

Dev-only convenience: earlier seed scripts disagreed on which password to
assign (some hardcoded a literal string, others used the random value from
app/core/seed_credentials.py), so accounts created at different times ended
up with different passwords. This script re-hashes every user's password to
the single value SEED_ADMIN_PASSWORD resolves to (see seed_credentials.py),
so every seeded account is predictable while testing locally.

Does NOT touch the signup/login code path — real users who sign up still set
and keep their own password. Only run this against a local/dev database.

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python scripts\\operations\\reset_seed_passwords.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlmodel import Session, select
from app.database import engine
from app.models import User
from app.security import hash_password
from app.core.seed_credentials import get_seed_test_password

PASSWORD = get_seed_test_password()


def run():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        new_hash = hash_password(PASSWORD)
        for user in users:
            user.password_hash = new_hash
            session.add(user)
        session.commit()
        print(f"[OK] Reset password for {len(users)} user(s) to the seed test password.")
        for user in users:
            print(f"  - {user.email} ({user.role})")


if __name__ == "__main__":
    run()
