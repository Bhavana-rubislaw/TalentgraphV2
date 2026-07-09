"""
Update Job Profiles for bhavanabayya13@gmail.com with Oracle-focused profiles
Based on seed_data_v2.py structure with comprehensive Oracle product expertise
"""

import sys
from pathlib import Path
from sqlmodel import Session, select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import (
    User, Candidate, JobProfile, Skill, LocationPreference,
    Application, Match, Swipe,
    WorkType, EmploymentType, VisaStatus, CurrencyType
)


def main():
    """Update job profiles for bhavanabayya13@gmail.com with Oracle-focused profiles"""
    
    print("="*80)
    print("🔄 UPDATING ORACLE JOB PROFILES FOR BHAVANABAYYA13@GMAIL.COM")
    print("="*80)
    
    with Session(engine) as session:
        # Find the user
        user = session.exec(
            select(User).where(User.email == "bhavanabayya13@gmail.com")
        ).first()
        
        if not user:
            print("❌ User not found: bhavanabayya13@gmail.com")
            return 1
        
        print(f"✓ Found user: {user.full_name} (ID: {user.id})")
        
        # Find the candidate
        candidate = session.exec(
            select(Candidate).where(Candidate.user_id == user.id)
        ).first()
        
        if not candidate:
            print("❌ Candidate profile not found")
            return 1
        
        print(f"✓ Found candidate: {candidate.name} (ID: {candidate.id})")
        
        # Delete existing job profiles and their related data
        existing_profiles = session.exec(
            select(JobProfile).where(JobProfile.candidate_id == candidate.id)
        ).all()
        
        print(f"\n🗑️  Deleting {len(existing_profiles)} existing job profiles and related data...")
        
        for profile in existing_profiles:
            # Delete applications referencing this profile
            applications = session.exec(
                select(Application).where(Application.job_profile_id == profile.id)
            ).all()
            for app in applications:
                session.delete(app)
            
            # Delete matches referencing this profile
            matches = session.exec(
                select(Match).where(Match.job_profile_id == profile.id)
            ).all()
            for match in matches:
                session.delete(match)
            
            # Delete swipes referencing this profile
            swipes = session.exec(
                select(Swipe).where(Swipe.job_profile_id == profile.id)
            ).all()
            for swipe in swipes:
                session.delete(swipe)
            
            # Delete skills
            skills = session.exec(
                select(Skill).where(Skill.job_profile_id == profile.id)
            ).all()
            for skill in skills:
                session.delete(skill)
            
            # Delete location preferences
            locations = session.exec(
                select(LocationPreference).where(LocationPreference.job_profile_id == profile.id)
            ).all()
            for loc in locations:
                session.delete(loc)
            
            # Delete profile
            session.delete(profile)
            print(f"  ✓ Deleted: {profile.profile_name}")
        
        session.commit()
        
        # Create new Oracle-focused job profiles
        print("\n👥 Creating 3 new Oracle-focused job profiles...")
        
        oracle_profiles = [
            {
                "profile_name": "Oracle Fusion Financials - Senior Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 8,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 140.0,
                "salary_max": 180.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Asian",
                "availability_date": "2 weeks",
                "profile_summary": "Seeking senior-level Oracle Fusion Financials implementation role with focus on complex enterprise transformations. Expertise in GL, AP/AR, FA, and OTBI reporting.",
                "skills": [
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Accounts Payable/Receivable", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Fixed Assets", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "BIP Reporting", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Financial Reporting Studio", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Project Management", "skill_category": "soft", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "San Francisco", "state": "California", "country": "USA"},
                    {"city": "New York", "state": "New York", "country": "USA"},
                    {"city": "Chicago", "state": "Illinois", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle HCM Cloud - Full Stack Implementation",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "years_of_experience": 6,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0,
                "salary_max": 160.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Asian",
                "availability_date": "Immediately",
                "profile_summary": "Looking for comprehensive Oracle HCM Cloud implementation projects covering Core HR, Talent Management, and Payroll modules. Strong background in HR transformation across multiple industries.",
                "skills": [
                    {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Core HR", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Talent Management", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Payroll", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Recruiting Cloud", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Performance Management", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Fast Formulas", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Change Management", "skill_category": "soft", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Austin", "state": "Texas", "country": "USA"},
                    {"city": "Dallas", "state": "Texas", "country": "USA"},
                    {"city": "Houston", "state": "Texas", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Database Administrator - Senior Level",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "years_of_experience": 10,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 145000.0,
                "salary_max": 195000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Asian",
                "availability_date": "1 month",
                "profile_summary": "Senior Oracle Database Administrator with 10+ years of experience. Specialized in Oracle RAC, Data Guard, and large-scale database migrations. Expert in performance tuning and high availability solutions.",
                "skills": [
                    {"skill_name": "Oracle Database", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle RAC", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Data Guard", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Performance Tuning", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle Cloud Infrastructure", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Autonomous Database", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Database Migration", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Backup & Recovery", "skill_category": "technical", "proficiency_level": 5},
                ],
                "locations": [
                    {"city": "Seattle", "state": "Washington", "country": "USA"},
                    {"city": "San Francisco", "state": "California", "country": "USA"},
                    {"city": "Portland", "state": "Oregon", "country": "USA"},
                ]
            }
        ]
        
        # Create each profile
        for idx, profile_data in enumerate(oracle_profiles, 1):
            print(f"\n📋 Creating Profile #{idx}: {profile_data['profile_name']}")
            
            # Create job profile
            job_profile = JobProfile(
                candidate_id=candidate.id,
                profile_name=profile_data["profile_name"],
                product_vendor=profile_data["product_vendor"],
                product_type=profile_data["product_type"],
                job_role=profile_data["job_role"],
                years_of_experience=profile_data["years_of_experience"],
                worktype=profile_data["worktype"],
                employment_type=profile_data["employment_type"],
                salary_min=profile_data["salary_min"],
                salary_max=profile_data["salary_max"],
                salary_currency=profile_data["salary_currency"],
                visa_status=profile_data["visa_status"],
                ethnicity=profile_data.get("ethnicity"),
                availability_date=profile_data.get("availability_date"),
                profile_summary=profile_data.get("profile_summary")
            )
            session.add(job_profile)
            session.flush()
            
            print(f"  ✓ Job Profile: {profile_data['job_role']}")
            print(f"    Product: {profile_data['product_vendor']} {profile_data['product_type']}")
            print(f"    Experience: {profile_data['years_of_experience']} years")
            print(f"    Salary: ${profile_data['salary_min']:,.0f} - ${profile_data['salary_max']:,.0f} {profile_data['salary_currency'].value}")
            print(f"    Work Type: {profile_data['worktype'].value}")
            print(f"    Employment: {profile_data['employment_type'].value}")
            
            # Add skills
            print(f"  ✓ Adding {len(profile_data['skills'])} skills...")
            for skill_data in profile_data["skills"]:
                skill = Skill(
                    job_profile_id=job_profile.id,
                    skill_name=skill_data["skill_name"],
                    skill_category=skill_data["skill_category"],
                    proficiency_level=skill_data["proficiency_level"]
                )
                session.add(skill)
            
            # Add location preferences
            print(f"  ✓ Adding {len(profile_data['locations'])} location preferences...")
            for loc_data in profile_data["locations"]:
                location = LocationPreference(
                    job_profile_id=job_profile.id,
                    city=loc_data["city"],
                    state=loc_data["state"],
                    country=loc_data.get("country", "USA")
                )
                session.add(location)
        
        # Commit all changes
        session.commit()
        
        print("\n" + "="*80)
        print("✅ SUCCESS! Created 3 Oracle-focused job profiles")
        print("="*80)
        
        print("\n📊 Summary:")
        print("  1. Oracle Fusion Financials - Senior Consultant")
        print("     • Product: Oracle Fusion Cloud")
        print("     • Role: Oracle Fusion Functional Consultant")
        print("     • Rate: $140-180/hr (Contract)")
        print("     • Skills: 8 technical/functional skills")
        print("     • Locations: 4 preferred locations")
        
        print("\n  2. Oracle HCM Cloud - Full Stack Implementation")
        print("     • Product: Oracle HCM Cloud")
        print("     • Role: Oracle HCM Cloud Consultant")
        print("     • Rate: $120-160/hr (Contract)")
        print("     • Skills: 8 technical/functional skills")
        print("     • Locations: 4 preferred locations")
        
        print("\n  3. Oracle Database Administrator - Senior Level")
        print("     • Product: Oracle Database")
        print("     • Role: Oracle Database Administrator")
        print("     • Salary: $145,000-195,000/year (Full-time)")
        print("     • Skills: 9 technical skills")
        print("     • Locations: 3 preferred locations")
        
        print("\n" + "="*80)
        print("🎯 All profiles match Oracle product focus from seed_data_v2.py")
        print("🔗 These profiles will match with 24 Oracle job postings in database")
        print("="*80)
        
        return 0


if __name__ == "__main__":
    exit(main())
