"""
Seed Data Script for TalentGraph V2 Application
================================================
This script populates the database with sample data for:
- 3 Candidates with complete profiles
- 3 Job profiles per candidate (9 total job profiles)
- Skills and location preferences for each job profile
- 6 Company accounts with 3 users each (18 total company users)
- 4 Job postings per company (24 total job postings)
- Initial matches for demonstration

Password for all users: Kutty_1304

Run this script after database initialization:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python seed_data_v2.py
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from sqlmodel import Session, select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import (
    User, UserRole, Candidate, JobProfile, Skill, LocationPreference,
    Resume, Certification, Company, JobPosting, Match, Swipe, Application,
    WorkType, EmploymentType, VisaStatus, CurrencyType
)
from app.security import hash_password


# Universal password for all seed accounts
SEED_PASSWORD = "Kutty_1304"


def clear_existing_data(session: Session):
    """Clear existing seed data to avoid duplicates"""
    print("🗑️  Clearing existing seed data...")
    
    # Delete in order to respect foreign key constraints
    session.exec(select(Application)).all()
    for app in session.exec(select(Application)).all():
        session.delete(app)
    
    for swipe in session.exec(select(Swipe)).all():
        session.delete(swipe)
    
    for match in session.exec(select(Match)).all():
        session.delete(match)
    
    for skill in session.exec(select(Skill)).all():
        session.delete(skill)
    
    for loc in session.exec(select(LocationPreference)).all():
        session.delete(loc)
    
    for jp in session.exec(select(JobProfile)).all():
        session.delete(jp)
    
    for cert in session.exec(select(Certification)).all():
        session.delete(cert)
    
    for resume in session.exec(select(Resume)).all():
        session.delete(resume)
    
    for posting in session.exec(select(JobPosting)).all():
        session.delete(posting)
    
    for company in session.exec(select(Company)).all():
        session.delete(company)
    
    for candidate in session.exec(select(Candidate)).all():
        session.delete(candidate)
    
    # Delete seed users by email pattern
    seed_emails = [
        # Candidates
        'sarah.anderson@email.com',
        'michael.chen@email.com',
        'david.kumar@email.com',
        # TechCorp Solutions
        'admin.jennifer@techcorp.com',
        'hr.jane@techcorp.com',
        'recruiter.robert@techcorp.com',
        # Global Systems Inc
        'admin.lisa@globalsystems.com',
        'hr.mark@globalsystems.com',
        'recruiter.anna@globalsystems.com',
        # Enterprise Solutions LLC
        'admin.susan@enterprisesol.com',
        'hr.tom@enterprisesol.com',
        'recruiter.diana@enterprisesol.com',
        # Oracle Consulting Partners
        'admin.rachel@oraclepartners.com',
        'hr.james@oraclepartners.com',
        'recruiter.linda@oraclepartners.com',
        # CloudTech Innovations
        'admin.emily@cloudtech.com',
        'hr.chris@cloudtech.com',
        'recruiter.brian@cloudtech.com',
        # Digital Transform Group
        'admin.kevin@digitaltrans.com',
        'hr.amanda@digitaltrans.com',
        'recruiter.mike@digitaltrans.com'
    ]
    
    for email in seed_emails:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            session.delete(user)
    
    session.commit()
    print("✅ Existing seed data cleared")


def create_candidates(session: Session):
    """Create 3 candidate profiles with complete information, certifications, and 3 job profiles each"""
    print("\n👥 Creating candidate profiles...")
    
    candidates_data = [
        {
            "email": "sarah.anderson@email.com",
            "full_name": "Sarah Anderson",
            "phone": "+1 (555) 123-4567",
            "residential_address": "123 Tech Street, San Francisco, CA 94102",
            "location_state": "California",
            "location_county": "San Francisco",
            "location_zipcode": "94102",
            "linkedin_url": "https://linkedin.com/in/sarah-anderson-oracle",
            "github_url": "https://github.com/sarahanderson",
            "portfolio_url": "https://sarahanderson.dev",
            "profile_summary": "Experienced Oracle Fusion Functional Consultant with 8+ years of expertise in implementing and optimizing enterprise solutions. Specialized in Finance and Supply Chain modules with proven track record of successful implementations across Fortune 500 companies.",
            "certifications": [
                {"name": "Oracle Cloud Infrastructure Foundations 2023", "issuer": "Oracle University", "issued_date": "2023-06-15", "expiry_date": "2026-06-15"},
                {"name": "Oracle Fusion Financials Cloud Service Certified", "issuer": "Oracle", "issued_date": "2022-03-20", "expiry_date": "2025-03-20"},
                {"name": "PMP - Project Management Professional", "issuer": "PMI", "issued_date": "2021-09-10", "expiry_date": "2024-09-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Oracle Fusion - Senior Finance Role",
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
                    "profile_summary": "Seeking senior-level Oracle Fusion Finance implementation role with focus on complex enterprise transformations.",
                    "skills": [
                        {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 5},
                        {"skill_name": "Accounts Payable/Receivable", "skill_category": "functional", "proficiency_level": 5},
                        {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Project Management", "skill_category": "soft", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "San Francisco", "state": "California", "country": "USA"},
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Oracle EBS - Supply Chain Specialist",
                    "product_vendor": "Oracle",
                    "product_type": "E-Business Suite",
                    "job_role": "Oracle EBS Supply Chain Consultant",
                    "years_of_experience": 8,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 130.0,
                    "salary_max": 170.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Open to Oracle EBS Supply Chain projects with hybrid work arrangements.",
                    "skills": [
                        {"skill_name": "Oracle EBS", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Inventory Management", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Order Management", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Purchasing", "skill_category": "functional", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "San Francisco", "state": "California", "country": "USA"},
                        {"city": "San Jose", "state": "California", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Oracle Fusion - Integration Architect",
                    "product_vendor": "Oracle",
                    "product_type": "Fusion Cloud",
                    "job_role": "Oracle Fusion Technical Consultant",
                    "years_of_experience": 8,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 150.0,
                    "salary_max": 190.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Asian",
                    "availability_date": "3 weeks",
                    "profile_summary": "Interested in technical architecture roles focusing on integrations and customizations.",
                    "skills": [
                        {"skill_name": "Oracle Integration Cloud", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "FBDI", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        {
            "email": "michael.chen@email.com",
            "full_name": "Michael Chen",
            "phone": "+1 (555) 987-6543",
            "residential_address": "456 Innovation Drive, Austin, TX 78701",
            "location_state": "Texas",
            "location_county": "Travis",
            "location_zipcode": "78701",
            "linkedin_url": "https://linkedin.com/in/michael-chen-hcm",
            "github_url": "https://github.com/michaelchen-hcm",
            "portfolio_url": "https://michaelchen-consulting.com",
            "profile_summary": "Oracle Cloud Infrastructure specialist with strong background in HCM implementations. 6 years of experience in HR transformation projects across multiple industries including technology, healthcare, and finance. SHRM certified professional.",
            "certifications": [
                {"name": "Oracle HCM Cloud Implementation Specialist", "issuer": "Oracle", "issued_date": "2023-04-10", "expiry_date": "2026-04-10"},
                {"name": "Oracle Talent Management Cloud Certified", "issuer": "Oracle", "issued_date": "2022-08-15", "expiry_date": "2025-08-15"},
                {"name": "SHRM-CP - Society for Human Resource Management", "issuer": "SHRM", "issued_date": "2021-11-20", "expiry_date": "2024-11-20"},
                {"name": "Oracle Payroll Cloud Certified", "issuer": "Oracle", "issued_date": "2023-01-05", "expiry_date": "2026-01-05"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Oracle HCM - Full Implementation",
                    "product_vendor": "Oracle",
                    "product_type": "HCM Cloud",
                    "job_role": "Oracle HCM Cloud Consultant",
                    "years_of_experience": 6,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 120.0,
                    "salary_max": 160.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "Immediately",
                    "profile_summary": "Looking for comprehensive HCM Cloud implementation projects covering Core HR, Talent, and Payroll modules.",
                    "skills": [
                        {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Core HR", "skill_category": "functional", "proficiency_level": 5},
                        {"skill_name": "Talent Management", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Payroll", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Change Management", "skill_category": "soft", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Austin", "state": "Texas", "country": "USA"},
                        {"city": "Dallas", "state": "Texas", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Oracle Fusion - Payroll Specialist",
                    "product_vendor": "Oracle",
                    "product_type": "HCM Cloud",
                    "job_role": "Oracle Payroll Cloud Consultant",
                    "years_of_experience": 6,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 115.0,
                    "salary_max": 155.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "2 weeks",
                    "profile_summary": "Specialized in Oracle Payroll Cloud implementations with focus on complex payroll configurations and compliance.",
                    "skills": [
                        {"skill_name": "Oracle Payroll Cloud", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Fast Formulas", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Payroll Compliance", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "HSDL", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Oracle HCM - Talent & Recruitment",
                    "product_vendor": "Oracle",
                    "product_type": "HCM Cloud",
                    "job_role": "Oracle Talent Management Consultant",
                    "years_of_experience": 6,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 110.0,
                    "salary_max": 150.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Interested in Talent Management and Recruiting Cloud implementations.",
                    "skills": [
                        {"skill_name": "Oracle Talent Management", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Recruiting Cloud", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Performance Management", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Learning Cloud", "skill_category": "functional", "proficiency_level": 3},
                    ],
                    "locations": [
                        {"city": "Austin", "state": "Texas", "country": "USA"},
                        {"city": "Houston", "state": "Texas", "country": "USA"},
                    ]
                }
            ]
        },
        {
            "email": "david.kumar@email.com",
            "full_name": "David Kumar",
            "phone": "+1 (555) 456-7890",
            "residential_address": "789 Enterprise Blvd, Seattle, WA 98101",
            "location_state": "Washington",
            "location_county": "King",
            "location_zipcode": "98101",
            "linkedin_url": "https://linkedin.com/in/david-kumar-dba",
            "github_url": "https://github.com/davidkumar-dba",
            "portfolio_url": "https://davidkumar-dba.tech",
            "profile_summary": "Senior Oracle Database Administrator and Performance Tuning Expert with 10+ years of experience. Specialized in Oracle RAC, Data Guard, and large-scale database migrations. Strong background in both on-premise and cloud database management. Oracle ACE Associate member.",
            "certifications": [
                {"name": "Oracle Database Administration 2019 Certified Professional", "issuer": "Oracle", "issued_date": "2019-05-20", "expiry_date": "2025-05-20"},
                {"name": "Oracle Cloud Infrastructure 2023 Architect Professional", "issuer": "Oracle", "issued_date": "2023-02-15", "expiry_date": "2026-02-15"},
                {"name": "Oracle Database 19c Performance Tuning Certified", "issuer": "Oracle", "issued_date": "2022-07-10", "expiry_date": "2025-07-10"},
                {"name": "Oracle RAC & Grid Infrastructure Certified Expert", "issuer": "Oracle", "issued_date": "2021-03-25", "expiry_date": "2024-03-25"},
                {"name": "AWS Solutions Architect Associate", "issuer": "Amazon Web Services", "issued_date": "2023-08-05", "expiry_date": "2026-08-05"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Oracle DBA - Senior Position",
                    "product_vendor": "Oracle",
                    "product_type": "Database",
                    "job_role": "Oracle Database Administrator",
                    "years_of_experience": 10,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 145000.0,
                    "salary_max": 195000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_GREEN_CARD,
                    "ethnicity": "South Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Seeking senior DBA role with focus on Oracle RAC and high availability solutions.",
                    "skills": [
                        {"skill_name": "Oracle Database", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Oracle RAC", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Data Guard", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Performance Tuning", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Seattle", "state": "Washington", "country": "USA"},
                        {"city": "Portland", "state": "Oregon", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Oracle Cloud DBA",
                    "product_vendor": "Oracle",
                    "product_type": "Cloud Infrastructure",
                    "job_role": "Oracle Cloud DBA",
                    "years_of_experience": 10,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 140.0,
                    "salary_max": 190.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_GREEN_CARD,
                    "ethnicity": "South Asian",
                    "availability_date": "2 weeks",
                    "profile_summary": "Interested in Oracle Cloud Database migrations and management.",
                    "skills": [
                        {"skill_name": "Oracle Cloud Infrastructure", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Autonomous Database", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Database Migration", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Cloud Architecture", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                },
                {
                    "profile_name": "Database Performance Architect",
                    "product_vendor": "Oracle",
                    "product_type": "Database",
                    "job_role": "Database Performance Architect",
                    "years_of_experience": 10,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 150.0,
                    "salary_max": 200.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_GREEN_CARD,
                    "ethnicity": "South Asian",
                    "availability_date": "Immediately",
                    "profile_summary": "Specialized role focusing on database performance optimization for large enterprise systems.",
                    "skills": [
                        {"skill_name": "Performance Tuning", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "SQL Optimization", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Database Architecture", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Capacity Planning", "skill_category": "technical", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Seattle", "state": "Washington", "country": "USA"},
                        {"city": "San Francisco", "state": "California", "country": "USA"},
                    ]
                }
            ]
        }
    ]
    
    created_candidates = []
    
    for candidate_data in candidates_data:
        # Create user account
        user = User(
            email=candidate_data["email"],
            full_name=candidate_data["full_name"],
            password_hash=hash_password(SEED_PASSWORD),
            role=UserRole.CANDIDATE,
            is_active=True
        )
        session.add(user)
        session.flush()
        
        # Create candidate profile
        candidate = Candidate(
            user_id=user.id,
            name=candidate_data["full_name"],
            email=candidate_data["email"],
            phone=candidate_data["phone"],
            residential_address=candidate_data["residential_address"],
            location_state=candidate_data["location_state"],
            location_county=candidate_data["location_county"],
            location_zipcode=candidate_data["location_zipcode"],
            linkedin_url=candidate_data.get("linkedin_url"),
            github_url=candidate_data.get("github_url"),
            portfolio_url=candidate_data.get("portfolio_url"),
            profile_summary=candidate_data["profile_summary"]
        )
        session.add(candidate)
        session.flush()
        
        # Create job profiles with skills and location preferences
        job_profile_ids = []
        for jp_data in candidate_data["job_profiles"]:
            job_profile = JobProfile(
                candidate_id=candidate.id,
                profile_name=jp_data["profile_name"],
                product_vendor=jp_data["product_vendor"],
                product_type=jp_data["product_type"],
                job_role=jp_data["job_role"],
                years_of_experience=jp_data["years_of_experience"],
                worktype=jp_data["worktype"],
                employment_type=jp_data["employment_type"],
                salary_min=jp_data["salary_min"],
                salary_max=jp_data["salary_max"],
                salary_currency=jp_data["salary_currency"],
                visa_status=jp_data["visa_status"],
                ethnicity=jp_data.get("ethnicity"),
                availability_date=jp_data.get("availability_date"),
                profile_summary=jp_data.get("profile_summary")
            )
            session.add(job_profile)
            session.flush()
            job_profile_ids.append(job_profile.id)
            
            # Add skills
            for skill_data in jp_data["skills"]:
                skill = Skill(
                    job_profile_id=job_profile.id,
                    skill_name=skill_data["skill_name"],
                    skill_category=skill_data["skill_category"],
                    proficiency_level=skill_data["proficiency_level"]
                )
                session.add(skill)
            
            # Add location preferences
            for loc_data in jp_data["locations"]:
                location = LocationPreference(
                    job_profile_id=job_profile.id,
                    city=loc_data["city"],
                    state=loc_data["state"],
                    country=loc_data.get("country")
                )
                session.add(location)
        
        # Create certifications for the candidate
        cert_count = 0
        if "certifications" in candidate_data:
            for cert_data in candidate_data["certifications"]:
                certification = Certification(
                    candidate_id=candidate.id,
                    name=cert_data["name"],
                    issuer=cert_data.get("issuer"),
                    issued_date=cert_data.get("issued_date"),
                    expiry_date=cert_data.get("expiry_date")
                )
                session.add(certification)
                cert_count += 1
        
        created_candidates.append({
            "user": user,
            "candidate": candidate,
            "email": candidate_data["email"],
            "job_profile_ids": job_profile_ids
        })
        
        print(f"  ✓ Created candidate: {candidate_data['full_name']} ({candidate_data['email']})")
        print(f"    - {len(candidate_data['job_profiles'])} job profiles, {cert_count} certifications")
    
    session.commit()
    print(f"✅ Created {len(created_candidates)} candidates with complete profiles")
    return created_candidates


def create_companies_and_users(session: Session):
    """Create 6 company accounts with 3 users each"""
    print("\n🏢 Creating company accounts and users...")
    
    companies_data = [
        {
            "company_name": "TechCorp Solutions",
            "users": [
                {"email": "admin.jennifer@techcorp.com", "full_name": "Jennifer Smith", "role": UserRole.ADMIN},
                {"email": "hr.jane@techcorp.com", "full_name": "Jane Williams", "role": UserRole.HR},
                {"email": "recruiter.robert@techcorp.com", "full_name": "Robert Johnson", "role": UserRole.RECRUITER}
            ]
        },
        {
            "company_name": "Global Systems Inc",
            "users": [
                {"email": "admin.lisa@globalsystems.com", "full_name": "Lisa Martinez", "role": UserRole.ADMIN},
                {"email": "hr.mark@globalsystems.com", "full_name": "Mark Thompson", "role": UserRole.HR},
                {"email": "recruiter.anna@globalsystems.com", "full_name": "Anna Lee", "role": UserRole.RECRUITER}
            ]
        },
        {
            "company_name": "Enterprise Solutions LLC",
            "users": [
                {"email": "admin.susan@enterprisesol.com", "full_name": "Susan Davis", "role": UserRole.ADMIN},
                {"email": "hr.tom@enterprisesol.com", "full_name": "Tom Wilson", "role": UserRole.HR},
                {"email": "recruiter.diana@enterprisesol.com", "full_name": "Diana Moore", "role": UserRole.RECRUITER}
            ]
        },
        {
            "company_name": "Oracle Consulting Partners",
            "users": [
                {"email": "admin.rachel@oraclepartners.com", "full_name": "Rachel Taylor", "role": UserRole.ADMIN},
                {"email": "hr.james@oraclepartners.com", "full_name": "James Anderson", "role": UserRole.HR},
                {"email": "recruiter.linda@oraclepartners.com", "full_name": "Linda Garcia", "role": UserRole.RECRUITER}
            ]
        },
        {
            "company_name": "CloudTech Innovations",
            "users": [
                {"email": "admin.emily@cloudtech.com", "full_name": "Emily Brown", "role": UserRole.ADMIN},
                {"email": "hr.chris@cloudtech.com", "full_name": "Chris Miller", "role": UserRole.HR},
                {"email": "recruiter.brian@cloudtech.com", "full_name": "Brian White", "role": UserRole.RECRUITER}
            ]
        },
        {
            "company_name": "Digital Transform Group",
            "users": [
                {"email": "admin.kevin@digitaltrans.com", "full_name": "Kevin Harris", "role": UserRole.ADMIN},
                {"email": "hr.amanda@digitaltrans.com", "full_name": "Amanda Clark", "role": UserRole.HR},
                {"email": "recruiter.mike@digitaltrans.com", "full_name": "Mike Lewis", "role": UserRole.RECRUITER}
            ]
        }
    ]
    
    created_companies = []
    
    for company_data in companies_data:
        company_users = []
        first_company = None
        
        for idx, user_data in enumerate(company_data["users"]):
            # Create user account
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                password_hash=hash_password(SEED_PASSWORD),
                role=user_data["role"],
                is_active=True
            )
            session.add(user)
            session.flush()
            
            # Create company profile for this user
            company = Company(
                user_id=user.id,
                company_name=company_data["company_name"],
                company_email=user_data["email"],
                employee_type=user_data["role"].value.upper()
            )
            session.add(company)
            session.flush()
            
            if idx == 0:
                first_company = company
            
            company_users.append({
                "user": user,
                "company": company,
                "email": user_data["email"],
                "role": user_data["role"]
            })
        
        created_companies.append({
            "company_name": company_data["company_name"],
            "users": company_users,
            "primary_company": first_company
        })
        
        print(f"  ✓ Created company: {company_data['company_name']}")
        for u in company_users:
            print(f"    - {u['user'].full_name} ({u['role'].value})")
    
    session.commit()
    print(f"✅ Created {len(created_companies)} companies with {len(created_companies) * 3} users")
    return created_companies


def create_job_postings(session: Session, companies: list):
    """Create 4 job postings per company (24 total)"""
    print("\n💼 Creating job postings...")
    
    job_templates = [
        # TechCorp Solutions
        [
            {
                "job_title": "Senior Oracle Fusion Financials Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "location": "San Francisco, CA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 140.0,
                "salary_max": 180.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Fusion Financials implementation for Fortune 500 client. Full-cycle project including design, configuration, testing, and go-live support.",
                "required_skills": json.dumps(["Oracle Fusion Financials", "General Ledger", "AP/AR", "OTBI"])
            },
            {
                "job_title": "Oracle HCM Cloud Implementation Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.HYBRID,
                "location": "San Francisco, CA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
                "salary_min": 125.0,
                "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Drive HCM Cloud implementation covering Core HR, Talent, and Payroll modules for healthcare organization.",
                "required_skills": json.dumps(["Oracle HCM Cloud", "Core HR", "Talent Management", "Payroll"])
            },
            {
                "job_title": "Oracle Integration Cloud Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "6-10 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 150.0,
                "salary_max": 190.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and implement integration solutions using OIC, REST APIs, and FBDI for enterprise client.",
                "required_skills": json.dumps(["Oracle Integration Cloud", "REST APIs", "FBDI", "PL/SQL"])
            },
            {
                "job_title": "Oracle Database Administrator - Senior",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "location": "San Francisco, CA",
                "employment_type": EmploymentType.FT,
                "start_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
                "salary_min": 140000.0,
                "salary_max": 180000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage and optimize Oracle databases for multiple enterprise clients. RAC and Data Guard experience required.",
                "required_skills": json.dumps(["Oracle Database", "Oracle RAC", "Data Guard", "Performance Tuning"])
            }
        ],
        # Global Systems Inc
        [
            {
                "job_title": "Oracle EBS Finance Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Functional Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "location": "New York, NY",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                "salary_min": 120.0,
                "salary_max": 160.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Support and enhance Oracle EBS R12 Financials modules for manufacturing client.",
                "required_skills": json.dumps(["Oracle EBS R12", "General Ledger", "AP", "AR"])
            },
            {
                "job_title": "Oracle Payroll Cloud Specialist",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Payroll Cloud Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 115.0,
                "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement and configure Oracle Payroll Cloud with focus on multi-state payroll and compliance.",
                "required_skills": json.dumps(["Oracle Payroll Cloud", "Fast Formulas", "HSDL", "Tax Compliance"])
            },
            {
                "job_title": "Oracle Fusion SCM Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Supply Chain Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "location": "New York, NY",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 135.0,
                "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Full-cycle Supply Chain implementation including Inventory, Order Management, and Procurement.",
                "required_skills": json.dumps(["Oracle Fusion SCM", "Inventory", "Order Management", "Procurement"])
            },
            {
                "job_title": "Junior Oracle Fusion Analyst",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "0-2 years",
                "worktype": WorkType.HYBRID,
                "location": "New York, NY",
                "employment_type": EmploymentType.FT,
                "start_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
                "salary_min": 70000.0,
                "salary_max": 90000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Entry-level position supporting Oracle Fusion applications. Training and mentorship provided.",
                "required_skills": json.dumps(["Oracle Fusion", "SQL", "Business Analysis"])
            }
        ],
        # Enterprise Solutions LLC
        [
            {
                "job_title": "Oracle HCM Talent Management Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "location": "Chicago, IL",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
                "salary_min": 125.0,
                "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Talent Management module implementation including Recruiting, Performance, and Learning.",
                "required_skills": json.dumps(["Talent Management", "Recruiting Cloud", "Performance Management", "Learning"])
            },
            {
                "job_title": "Oracle Fusion Financials Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "7-10 years",
                "worktype": WorkType.HYBRID,
                "location": "Chicago, IL",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 150.0,
                "salary_max": 190.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Senior architect role designing financial solutions for complex multi-entity organizations.",
                "required_skills": json.dumps(["Fusion Financials", "GL", "AP", "AR", "FA", "CM"])
            },
            {
                "job_title": "Oracle Database Performance Engineer",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                "salary_min": 130.0,
                "salary_max": 170.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Optimize database performance for high-transaction Oracle environments. Tuning and monitoring focus.",
                "required_skills": json.dumps(["Performance Tuning", "SQL Optimization", "AWR", "Oracle Database"])
            },
            {
                "job_title": "Oracle EBS Technical Developer",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Technical Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "location": "Chicago, IL",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 110.0,
                "salary_max": 145.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Develop customizations and extensions for Oracle EBS R12. Forms, Reports, and PL/SQL development.",
                "required_skills": json.dumps(["Oracle EBS", "PL/SQL", "Oracle Forms", "Oracle Reports"])
            }
        ],
        # Oracle Consulting Partners
        [
            {
                "job_title": "Oracle Cloud Migration Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "location": "Austin, TX",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
                "salary_min": 160.0,
                "salary_max": 200.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead EBS to Fusion migration project. Strategy, planning, and execution expertise required.",
                "required_skills": json.dumps(["Oracle EBS", "Oracle Fusion", "Cloud Migration", "Project Management"])
            },
            {
                "job_title": "Oracle Fusion HCM Implementation Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.HYBRID,
                "location": "Austin, TX",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 120.0,
                "salary_max": 160.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Core HR and Benefits implementation for retail industry client. Multiple locations.",
                "required_skills": json.dumps(["Core HR", "Benefits", "Absence Management", "Oracle HCM"])
            },
            {
                "job_title": "Oracle Integration Developer",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
                "salary_min": 125.0,
                "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build integrations between Oracle Cloud and third-party systems using OIC and APIs.",
                "required_skills": json.dumps(["OIC", "REST APIs", "SOAP", "Integration"])
            },
            {
                "job_title": "Oracle Autonomous Database Specialist",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud DBA",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 135.0,
                "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement and manage Oracle Autonomous Database solutions in OCI environment.",
                "required_skills": json.dumps(["Autonomous Database", "OCI", "Oracle Database", "Cloud Architecture"])
            }
        ],
        # CloudTech Innovations
        [
            {
                "job_title": "Oracle Fusion Financial Reporting Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "location": "Seattle, WA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 115.0,
                "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and build financial reports using OTBI, BIP, and Financial Reporting Studio.",
                "required_skills": json.dumps(["OTBI", "BIP Reporting", "Financial Reporting", "Oracle Fusion"])
            },
            {
                "job_title": "Oracle HCM Payroll Implementation Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Payroll Cloud Consultant",
                "seniority_level": "6-10 years",
                "worktype": WorkType.HYBRID,
                "location": "Seattle, WA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 140.0,
                "salary_max": 180.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead multi-country payroll implementation using Oracle Global Payroll Cloud.",
                "required_skills": json.dumps(["Global Payroll", "Fast Formulas", "HSDL", "Multi-country Payroll"])
            },
            {
                "job_title": "Oracle Cloud Infrastructure Engineer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "location": "Seattle, WA",
                "employment_type": EmploymentType.FT,
                "start_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
                "salary_min": 130000.0,
                "salary_max": 170000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and implement OCI infrastructure for enterprise Oracle Cloud applications.",
                "required_skills": json.dumps(["OCI", "Cloud Architecture", "Networking", "Security"])
            },
            {
                "job_title": "Oracle Fusion Supply Chain Analyst",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Supply Chain Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 105.0,
                "salary_max": 140.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Support Oracle Fusion SCM modules including Inventory and Procurement. Mid-level role.",
                "required_skills": json.dumps(["Fusion SCM", "Inventory", "Procurement", "Business Analysis"])
            }
        ],
        # Digital Transform Group
        [
            {
                "job_title": "Oracle EBS to Cloud Migration Lead",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "10-15 years",
                "worktype": WorkType.HYBRID,
                "location": "Boston, MA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
                "salary_min": 170.0,
                "salary_max": 210.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Strategic lead for large-scale EBS to Fusion Cloud transformation program.",
                "required_skills": json.dumps(["Oracle EBS", "Oracle Fusion", "Program Management", "Change Management"])
            },
            {
                "job_title": "Oracle Database Administrator - RAC Specialist",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "location": "Boston, MA",
                "employment_type": EmploymentType.FT,
                "start_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
                "salary_min": 145000.0,
                "salary_max": 190000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage and maintain Oracle RAC environments. High availability and disaster recovery focus.",
                "required_skills": json.dumps(["Oracle RAC", "Data Guard", "High Availability", "Oracle Database"])
            },
            {
                "job_title": "Oracle Fusion PPM Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion PPM Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "location": "Boston, MA",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                "salary_min": 125.0,
                "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Fusion Project Portfolio Management for professional services firm.",
                "required_skills": json.dumps(["Oracle PPM", "Project Management", "Resource Management", "Billing"])
            },
            {
                "job_title": "Oracle Analytics Cloud Developer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Analytics Developer",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "location": "Remote",
                "employment_type": EmploymentType.CONTRACT,
                "start_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "salary_min": 110.0,
                "salary_max": 145.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build dashboards and analytics solutions using Oracle Analytics Cloud and Data Visualization.",
                "required_skills": json.dumps(["Oracle Analytics Cloud", "Data Visualization", "SQL", "BI Development"])
            }
        ]
    ]
    
    all_jobs = []
    
    for idx, company_info in enumerate(companies):
        # Use the first user's company profile for job postings
        company = company_info["users"][0]["company"]
        
        for job_data in job_templates[idx]:
            job = JobPosting(
                company_id=company.id,
                job_title=job_data["job_title"],
                product_vendor=job_data["product_vendor"],
                product_type=job_data["product_type"],
                job_role=job_data["job_role"],
                seniority_level=job_data["seniority_level"],
                worktype=job_data["worktype"],
                location=job_data["location"],
                employment_type=job_data["employment_type"],
                start_date=job_data["start_date"],
                salary_min=job_data["salary_min"],
                salary_max=job_data["salary_max"],
                salary_currency=job_data["salary_currency"],
                job_description=job_data["job_description"],
                required_skills=job_data["required_skills"],
                is_active=True
            )
            session.add(job)
            session.flush()
            all_jobs.append({
                "job": job,
                "company": company
            })
        
        print(f"  ✓ Created 4 job postings for {company_info['company_name']}")
    
    session.commit()
    print(f"✅ Created {len(all_jobs)} job postings total (4 per company)")
    return all_jobs


def create_initial_matches(session: Session, candidates: list, jobs: list):
    """Create some initial matches for demonstration"""
    print("\n🔗 Creating initial matches and interactions...")
    
    matches_created = 0
    
    # For each candidate, create some matches with relevant jobs
    for candidate_info in candidates:
        candidate = candidate_info["candidate"]
        job_profile_ids = candidate_info["job_profile_ids"]
        
        if not job_profile_ids:
            continue
        
        # Get the first job profile for this candidate
        job_profile = session.get(JobProfile, job_profile_ids[0])
        if not job_profile:
            continue
        
        # Find matching jobs (same product vendor)
        matching_jobs = [
            j for j in jobs 
            if j["job"].product_vendor == job_profile.product_vendor
        ]
        
        # Create matches for up to 3 jobs per candidate
        for job_info in matching_jobs[:3]:
            job = job_info["job"]
            company = job_info["company"]
            
            # Create a match
            match = Match(
                candidate_id=candidate.id,
                company_id=company.id,
                job_profile_id=job_profile.id,
                job_posting_id=job.id,
                match_percentage=75.0 + (matches_created % 20),  # Vary between 75-95%
                match_reason="Product and experience match",
                candidate_liked=True if matches_created % 2 == 0 else False,
                company_liked=True if matches_created % 3 == 0 else False,
                candidate_asked_to_apply=False,
                company_asked_to_apply=True if matches_created % 4 == 0 else False
            )
            session.add(match)
            matches_created += 1
            
            # Create corresponding swipes
            if match.candidate_liked:
                swipe = Swipe(
                    candidate_id=candidate.id,
                    company_id=company.id,
                    job_profile_id=job_profile.id,
                    job_posting_id=job.id,
                    action="like",
                    action_by="candidate"
                )
                session.add(swipe)
            
            if match.company_liked:
                swipe = Swipe(
                    candidate_id=candidate.id,
                    company_id=company.id,
                    job_profile_id=job_profile.id,
                    job_posting_id=job.id,
                    action="like",
                    action_by="recruiter"
                )
                session.add(swipe)
            
            if match.company_asked_to_apply:
                swipe = Swipe(
                    candidate_id=candidate.id,
                    company_id=company.id,
                    job_profile_id=job_profile.id,
                    job_posting_id=job.id,
                    action="ask_to_apply",
                    action_by="recruiter"
                )
                session.add(swipe)
    
    session.commit()
    print(f"✅ Created {matches_created} initial matches with interactions")
    return matches_created


def print_summary(candidates, companies, jobs, matches_count):
    """Print summary of created seed data"""
    print("\n" + "="*80)
    print("🎉 SEED DATA CREATION COMPLETE!")
    print("="*80)
    
    print("\n📊 Summary:")
    print(f"  • Candidates: {len(candidates)}")
    print(f"  • Job Profiles: {len(candidates) * 3}")
    print(f"  • Companies: {len(companies)}")
    print(f"  • Company Users: {len(companies) * 3}")
    print(f"  • Job Postings: {len(jobs)}")
    print(f"  • Matches: {matches_count}")
    
    print(f"\n🔑 Password for ALL accounts: {SEED_PASSWORD}")
    
    print("\n👤 Candidate Login Credentials:")
    for candidate in candidates:
        print(f"  • Email: {candidate['email']}")
        print(f"    Name: {candidate['candidate'].name}")
        print()
    
    print("🏢 Company Accounts:")
    for company_info in companies:
        print(f"\n  {company_info['company_name']}")
        for user_info in company_info["users"]:
            print(f"    • {user_info['email']} ({user_info['role'].value})")
    
    print("\n" + "="*80)
    print("🚀 You can now:")
    print("  1. Login as any candidate to view profile and browse jobs")
    print("  2. Login as company user to manage job postings")
    print("  3. View all 24 job postings across 6 companies")
    print("  4. See recommendations based on skill matching")
    print("  5. View existing matches in the dashboard")
    print("="*80)


def main():
    """Main function to run seed data creation"""
    print("="*80)
    print("🌱 TALENTGRAPH V2 SEED DATA SCRIPT")
    print("="*80)
    print("This script will populate your database with:")
    print("  • 3 Candidates with 3 job profiles each (9 total)")
    print("  • 6 Companies with 3 users each (18 company users)")
    print("  • 24 Job postings (4 per company)")
    print("  • Initial matches and interactions")
    print(f"\n🔑 Password for all users: {SEED_PASSWORD}")
    print("="*80)
    
    try:
        with Session(engine) as session:
            # Clear existing seed data
            clear_existing_data(session)
            
            # Create candidates with profiles
            candidates = create_candidates(session)
            
            # Create companies and users
            companies = create_companies_and_users(session)
            
            # Create job postings
            jobs = create_job_postings(session, companies)
            
            # Create initial matches
            matches_count = create_initial_matches(session, candidates, jobs)
            
            # Print summary
            print_summary(candidates, companies, jobs, matches_count)
            
    except Exception as e:
        print(f"\n❌ Error during seed data creation: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
