"""
One-time script: Remove kuttybayya@gmail.com from the database.
Handles pending invites, company records, and the user account.

Run from backend2/ with venv active:
    python remove_user_kuttybayya.py
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import User, Company, TeamInvite

TARGET_EMAIL = "kuttybayya@gmail.com"


def main():
    with Session(engine) as session:
        removed = []

        # 1. Cancel any pending team invites for this email
        invites = session.exec(
            select(TeamInvite).where(TeamInvite.invitee_email == TARGET_EMAIL)
        ).all()
        for invite in invites:
            session.delete(invite)
            removed.append(f"TeamInvite id={invite.id} (status={invite.status})")

        # 2. Find the user record
        user = session.exec(
            select(User).where(User.email == TARGET_EMAIL)
        ).first()

        if user:
            # 3. Delete linked Company sub-account if it exists
            company = session.exec(
                select(Company).where(Company.user_id == user.id)
            ).first()
            if company:
                session.delete(company)
                removed.append(f"Company id={company.id} ('{company.company_name}')")

            # 4. Delete the user
            session.delete(user)
            removed.append(f"User id={user.id} email={user.email} role={user.role}")
        else:
            print(f"No user found with email: {TARGET_EMAIL}")

        if removed:
            session.commit()
            print(f"\n\u2705 Successfully removed {len(removed)} record(s):")
            for r in removed:
                print(f"   \u2022 {r}")
        else:
            print(f"\n\u2139\ufe0f  Nothing to remove \u2014 {TARGET_EMAIL} not found in the database.")


if __name__ == "__main__":
    main()
