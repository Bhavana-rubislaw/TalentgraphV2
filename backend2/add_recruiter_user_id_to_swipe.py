"""
Add recruiter_user_id Column to Swipe
=======================================

Adds recruiter_user_id to the existing swipe table so recruiter-performed
swipes (like/pass/ask_to_apply) record which individual user acted, not just
which company. Needed to surface "Invited By <name>" on the candidate's
Invites tab, which previously had no way to identify the specific recruiter.
"""

from sqlalchemy import text
from app.database import engine

def main():
    print("Adding recruiter_user_id column to swipe table...")

    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE swipe ADD COLUMN IF NOT EXISTS recruiter_user_id INTEGER REFERENCES \"user\"(id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_swipe_recruiter_user_id ON swipe(recruiter_user_id)"
        ))

    print("✅ recruiter_user_id column added successfully!")

if __name__ == "__main__":
    main()
