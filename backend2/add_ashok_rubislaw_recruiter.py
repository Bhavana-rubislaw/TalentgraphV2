"""
Add ashokkumarbayya@gmail.com as a Recruiter under Rubis Law Invest
====================================================================
- Creates User with role RECRUITER and password Kutty_1304
- Creates Company profile linked to Rubis Law Invest
  (sets parent_company_id to existing bhavana@rubislawinvest.com company if found)

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python add_ashok_rubislaw_recruiter.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole, Company
from app.security import hash_password

RECRUITER_EMAIL    = "ashokkumarbayya@gmail.com"
RECRUITER_NAME     = "Ashok Kumar Bayya"
RECRUITER_PASSWORD = "Kutty_1304"

COMPANY_NAME        = "Rubis Law Invest"
COMPANY_WEBSITE     = "https://www.rubislawinvest.com"
COMPANY_LOCATION    = "New York, NY"
COMPANY_DEPARTMENT  = "Technology Talent Acquisition"
COMPANY_PHONE       = "+1 212-555-0199"
COMPANY_DESCRIPTION = (
    "Rubis Law Invest is a technology-forward investment and legal services firm "
    "actively growing its engineering team. We hire top-tier software, cloud, and "
    "full-stack talent to build the next generation of our fintech and legal-tech platforms."
)
HIRING_FOCUS = '["Software Engineering","Cloud Engineering","Full Stack Development","Frontend Development","Backend Development"]'


def run():
    with Session(engine) as session:

        # ── 1. Check if user already exists ───────────────────────────────────
        existing_user = session.exec(
            select(User).where(User.email == RECRUITER_EMAIL)
        ).first()

        if existing_user:
            print(f"[i] User already exists: {existing_user.full_name} (ID: {existing_user.id}, Role: {existing_user.role})")
            user = existing_user
        else:
            user = User(
                email=RECRUITER_EMAIL,
                full_name=RECRUITER_NAME,
                password_hash=hash_password(RECRUITER_PASSWORD),
                role=UserRole.RECRUITER,
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"[+] Created User: {user.full_name} (ID: {user.id})")
            print(f"    Email   : {user.email}")
            print(f"    Role    : {user.role}")

        # ── 2. Resolve parent company (bhavana's Rubis Law Invest) ────────────
        bhavana_user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()

        parent_company_id = None
        if bhavana_user:
            parent_company = session.exec(
                select(Company).where(Company.user_id == bhavana_user.id)
            ).first()
            if parent_company:
                parent_company_id = parent_company.id
                print(f"[i] Found parent company: {parent_company.company_name} (ID: {parent_company_id})")

        # ── 3. Create Company profile if missing ──────────────────────────────
        existing_company = session.exec(
            select(Company).where(Company.user_id == user.id)
        ).first()

        if existing_company:
            print(f"[i] Company profile already exists for this user: {existing_company.company_name} (ID: {existing_company.id})")
        else:
            company = Company(
                user_id=user.id,
                company_name=COMPANY_NAME,
                company_email=RECRUITER_EMAIL,
                employee_type="Recruiter",
                company_website=COMPANY_WEBSITE,
                company_location=COMPANY_LOCATION,
                department=COMPANY_DEPARTMENT,
                phone_number=COMPANY_PHONE,
                hiring_focus=HIRING_FOCUS,
                company_description=COMPANY_DESCRIPTION,
                profile_complete=True,
                parent_company_id=parent_company_id,
            )
            session.add(company)
            session.commit()
            session.refresh(company)
            print(f"[+] Created Company profile: {company.company_name} (ID: {company.id})")
            if parent_company_id:
                print(f"    Linked as sub-account of company ID: {parent_company_id}")

        # ── 4. Summary ────────────────────────────────────────────────────────
        print()
        print("=" * 60)
        print("DONE — Login credentials")
        print("=" * 60)
        print(f"  URL      : http://localhost:3002  (or 3003)")
        print(f"  Email    : {RECRUITER_EMAIL}")
        print(f"  Password : {RECRUITER_PASSWORD}")
        print(f"  Role     : RECRUITER")
        print(f"  Company  : {COMPANY_NAME}")
        print("=" * 60)


if __name__ == "__main__":
    run()
