"""
Setup Rubislaw Invest team members with correct roles
======================================================
  ashokkumarbayya@gmail.com    → HR
  bhavana@rubislawinvest.com   → RECRUITER

- Creates users if they don't exist (password: Kutty_1304)
- Corrects role if the user already exists with wrong role
- Both users share the same Rubislaw Invest company (bhavana is owner/RECRUITER)

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python setup_rubislaw_users.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole, Company
from app.security import hash_password

PASSWORD = "Kutty_1304"

COMPANY_NAME        = "Rubislaw Invest"
COMPANY_WEBSITE     = "https://www.rubislawinvest.com"
COMPANY_LOCATION    = "New York, NY"
COMPANY_DEPARTMENT  = "Technology Talent Acquisition"
COMPANY_PHONE       = "+1 212-555-0199"
COMPANY_DESCRIPTION = (
    "Rubislaw Invest is a technology-forward investment and legal services firm "
    "actively growing its engineering team."
)
HIRING_FOCUS = '["Software Engineering","Cloud Engineering","Full Stack Development","Frontend Development","Backend Development"]'


def upsert_user(session: Session, email: str, name: str, role: UserRole) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        if user.role != role:
            print(f"[~] Updating role for {email}: {user.role} → {role}")
            user.role = role
            session.add(user)
            session.commit()
            session.refresh(user)
        else:
            print(f"[i] User already exists with correct role: {email} ({role})")
    else:
        user = User(
            email=email,
            full_name=name,
            password_hash=hash_password(PASSWORD),
            role=role,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"[+] Created user: {name} <{email}> as {role}")
    return user


def upsert_company(session: Session, user: User, company_name: str, employee_type: str, parent_id=None) -> Company:
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if company:
        # Update to ensure it's linked correctly
        if company.company_name != company_name or company.parent_company_id != parent_id:
            company.company_name = company_name
            if parent_id is not None:
                company.parent_company_id = parent_id
            session.add(company)
            session.commit()
            session.refresh(company)
            print(f"[~] Updated company profile for {user.email}: {company.company_name} (ID: {company.id})")
        else:
            print(f"[i] Company profile already correct for {user.email}: {company.company_name} (ID: {company.id})")
    else:
        company = Company(
            user_id=user.id,
            company_name=company_name,
            company_email=user.email,
            employee_type=employee_type,
            company_website=COMPANY_WEBSITE,
            company_location=COMPANY_LOCATION,
            department=COMPANY_DEPARTMENT,
            phone_number=COMPANY_PHONE,
            hiring_focus=HIRING_FOCUS,
            company_description=COMPANY_DESCRIPTION,
            profile_complete=True,
            parent_company_id=parent_id,
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        print(f"[+] Created company profile for {user.email}: {company.company_name} (ID: {company.id})")
    return company


def run():
    with Session(engine) as session:
        print("=" * 60)
        print("Setting up Rubislaw Invest team")
        print("=" * 60)

        # ── 1. bhavana@rubislawinvest.com → RECRUITER (primary / owner) ──────
        bhavana = upsert_user(
            session,
            email="bhavana@rubislawinvest.com",
            name="Bhavana Rubislaw",
            role=UserRole.RECRUITER,
        )
        bhavana_company = upsert_company(
            session,
            user=bhavana,
            company_name=COMPANY_NAME,
            employee_type="Recruiter",
        )

        # ── 2. ashokkumarbayya@gmail.com → HR (linked to same company) ───────
        ashok = upsert_user(
            session,
            email="ashokkumarbayya@gmail.com",
            name="Ashok Kumar Bayya",
            role=UserRole.HR,
        )
        upsert_company(
            session,
            user=ashok,
            company_name=COMPANY_NAME,
            employee_type="HR",
            parent_id=bhavana_company.id,
        )

        # ── 3. Summary ────────────────────────────────────────────────────────
        print()
        print("=" * 60)
        print("DONE — Login credentials")
        print("=" * 60)
        print(f"  bhavana@rubislawinvest.com  | Password: {PASSWORD} | Role: RECRUITER")
        print(f"  ashokkumarbayya@gmail.com   | Password: {PASSWORD} | Role: HR")
        print(f"  Company : {COMPANY_NAME}")
        print("=" * 60)


if __name__ == "__main__":
    run()
