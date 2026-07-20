"""
Simple Seed Data Script for TalentGraph V2
Creates basic test users and data
"""

import sys
from pathlib import Path
from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import User, Candidate, Company, JobPosting, UserRole
from app.security import hash_password
from app.core.seed_credentials import get_seed_test_password


def seed_database():
    """Populate database with test data"""

    with Session(engine) as session:
        print("🌱 Starting database seeding...")

        seed_password = get_seed_test_password()

        # Create Candidates
        print("\n👥 Creating candidate users...")
        candidates_data = [
            {
                "email": "sarah.anderson@email.com",
                "name": "Sarah Anderson",
                "password": seed_password
            },
            {
                "email": "michael.chen@email.com",
                "name": "Michael Chen",
                "password": seed_password
            },
            {
                "email": "david.kumar@email.com",
                "name": "David Kumar",
                "password": seed_password
            }
        ]
        
        for cand_data in candidates_data:
            # Check if user already exists
            existing = session.exec(
                select(User).where(User.email == cand_data["email"])
            ).first()
            
            if not existing:
                user = User(
                    email=cand_data["email"],
                    full_name=cand_data["name"],
                    password_hash=hash_password(cand_data["password"]),
                    role=UserRole.CANDIDATE,
                    is_active=True
                )
                session.add(user)
                session.commit()
                session.refresh(user)
                
                # Skip creating candidate profile - will be done later by user
                print(f"  ✅ Created candidate: {cand_data['email']}")
            else:
                print(f"  ℹ️  Candidate already exists: {cand_data['email']}")
        
        # Create Company Users
        print("\n🏢 Creating company users...")
        companies_data = [
            {
                "name": "TechCorp Solutions",
                "users": [
                    {"email": "admin.jennifer@techcorp.com", "name": "Jennifer Smith", "role": UserRole.ADMIN},
                    {"email": "hr.jane@techcorp.com", "name": "Jane Williams", "role": UserRole.HR},
                    {"email": "recruiter.robert@techcorp.com", "name": "Robert Johnson", "role": UserRole.RECRUITER}
                ]
            },
            {
                "name": "Global Systems Inc",
                "users": [
                    {"email": "admin.lisa@globalsystems.com", "name": "Lisa Martinez", "role": UserRole.ADMIN},
                    {"email": "hr.mark@globalsystems.com", "name": "Mark Thompson", "role": UserRole.HR},
                    {"email": "recruiter.anna@globalsystems.com", "name": "Anna Lee", "role": UserRole.RECRUITER}
                ]
            },
            {
                "name": "Enterprise Solutions LLC",
                "users": [
                    {"email": "admin.susan@enterprisesol.com", "name": "Susan Davis", "role": UserRole.ADMIN},
                    {"email": "hr.tom@enterprisesol.com", "name": "Tom Wilson", "role": UserRole.HR},
                    {"email": "recruiter.diana@enterprisesol.com", "name": "Diana Moore", "role": UserRole.RECRUITER}
                ]
            }
        ]
        
        for company_data in companies_data:
            company_user_id = None
            
            for user_data in company_data["users"]:
                existing = session.exec(
                    select(User).where(User.email == user_data["email"])
                ).first()
                
                if not existing:
                    user = User(
                        email=user_data["email"],
                        full_name=user_data["name"],
                        password_hash=hash_password(seed_password),
                        role=user_data["role"],
                        is_active=True
                    )
                    session.add(user)
                    session.commit()
                    session.refresh(user)
                    if company_user_id is None:
                        company_user_id = user.id
                    print(f"  ✅ Created company user: {user_data['email']} ({user_data['role']})")
                else:
                    print(f"  ℹ️  Company user already exists: {user_data['email']}")
            
            # Create company record if we created users
            # Skip company profile creation - will be done later by user
            # if company_user_id:
            #     existing_company = session.exec(
            #         select(Company).where(Company.user_id == company_user_id)
            #     ).first()
            #     
            #     if not existing_company:
            #         company = Company(
            #             user_id=company_user_id,
            #             company_name=company_data["name"],
            #             company_email=company_data["users"][0]["email"]
            #         )
            #         session.add(company)
            #         session.commit()
            #         print(f"  ✅ Created company: {company_data['name']}")
        
        print("\n✨ Database seeding completed successfully!")
        print("\n📋 Test Account Credentials:")
        print(f"   All passwords: {seed_password}")
        print("\n   Candidates:")
        for cand in candidates_data:
            print(f"     - {cand['email']}")
        print("\n   Company Admins:")
        print("     - admin.jennifer@techcorp.com")
        print("     - admin.lisa@globalsystems.com")
        print("     - admin.susan@enterprisesol.com")


if __name__ == "__main__":
    seed_database()
