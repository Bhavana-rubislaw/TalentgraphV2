"""
Seed Data Script for TalentGraph Application
============================================
This script populates the database with sample data for:
- 3 Candidates with complete profiles
- 3 Job preferences per candidate (9 total preferences)
- 6 Company accounts with 3 users each (18 total company users)
- 4 Job postings per company (24 total job postings)
- Skills, certifications, and social links for candidates

Run this script after database initialization to populate sample data.
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
    User, Candidate, Skill, Certification,
    LocationPreference, Company, JobPosting, Resume, JobProfile
)
from app.security import hash_password


def clear_existing_data(session: Session):
    """Clear existing seed data to avoid duplicates"""
    print("🗑️  Clearing existing seed data...")
    
    # Delete in order to respect foreign key constraints
    session.query(Certification).delete()
    session.query(Skill).delete()
    session.query(LocationPreference).delete()
    session.query(JobProfile).delete()
    session.query(JobPosting).delete()
    session.query(Resume).delete()
    session.query(Company).delete()
    session.query(Candidate).delete()
    
    # Only delete seed users
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
    session.query(User).filter(
        User.email.in_(seed_emails)
    ).delete(synchronize_session=False)
    
    session.commit()
    print("✅ Existing seed data cleared")


def create_candidates(session: Session):
    """Create 3 candidate profiles with complete information and 3 job preferences each"""
    print("\n👥 Creating candidate profiles...")
    
    candidates_data = [
        {
            "email": "sarah.anderson@email.com",
            "password": "Kutty_1304",
            "name": "Sarah Anderson",
            "phone": "+1 (555) 123-4567",
            "residential_address": "123 Tech Street, San Francisco, CA 94102",
            "location": "San Francisco, CA",
            "visa_type": "Citizen",
            "ethnicity": "Asian",
            "summary": "Experienced Oracle Fusion Functional Consultant with 8+ years of expertise in implementing and optimizing enterprise solutions. Specialized in Finance and Supply Chain modules with proven track record of successful implementations.",
            "product": "SaaS",
            "primary_role": "Oracle Fusion Functional Consultant",
            "years_experience": 8,
            "rate_min": 125.0,
            "rate_max": 175.0,
            "work_type": "Remote",
            "availability": "2 weeks",
            "is_general_info_complete": True,
            "skills": [
                {"name": "Oracle Fusion Cloud", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Oracle EBS", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "Financial Management", "rating": 5, "level": "Expert", "category": "functional"},
                {"name": "Supply Chain Management", "rating": 4, "level": "Advanced", "category": "functional"},
                {"name": "SQL", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "OTBI Reporting", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Project Management", "rating": 4, "level": "Advanced", "category": "soft"},
                {"name": "Stakeholder Communication", "rating": 5, "level": "Expert", "category": "soft"},
            ],
            "certifications": [
                {"name": "Oracle Cloud Infrastructure Foundations", "issuer": "Oracle", "year": 2023},
                {"name": "Oracle Fusion Financials Cloud Service", "issuer": "Oracle", "year": 2022},
                {"name": "PMP - Project Management Professional", "issuer": "PMI", "year": 2021},
            ],
            "social_links": [
                {"platform": "linkedin", "url": "https://linkedin.com/in/sarah-anderson-oracle", "display_name": "LinkedIn Profile"},
                {"platform": "github", "url": "https://github.com/sarahanderson", "display_name": "GitHub Profile"},
                {"platform": "personal-website", "url": "https://sarahanderson.dev", "display_name": "Portfolio Website"},
            ],
            "job_preferences": [
                {
                    "preference_name": "Oracle Fusion - Senior Finance Role",
                    "product": "SaaS",
                    "primary_role": "Oracle Fusion Functional Consultant",
                    "years_experience": 8,
                    "rate_min": 140.0,
                    "rate_max": 180.0,
                    "work_type": "Remote",
                    "location": "San Francisco, CA (Remote)",
                    "visa_type": "Citizen",
                    "ethnicity": "Asian",
                    "availability": "2 weeks",
                    "summary": "Seeking senior-level Oracle Fusion Finance implementation role with focus on complex enterprise transformations.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Fusion Financials", "rating": 5},
                        {"name": "General Ledger", "rating": 5},
                        {"name": "Accounts Payable/Receivable", "rating": 5},
                        {"name": "OTBI Reporting", "rating": 5}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Oracle EBS - Supply Chain Specialist",
                    "product": "E-Business Suite",
                    "primary_role": "Oracle EBS Supply Chain Consultant",
                    "years_experience": 8,
                    "rate_min": 130.0,
                    "rate_max": 170.0,
                    "work_type": "Hybrid",
                    "location": "Bay Area, CA",
                    "visa_type": "Citizen",
                    "ethnicity": "Asian",
                    "availability": "1 month",
                    "summary": "Open to Oracle EBS Supply Chain projects with hybrid work arrangements.",
                    "required_skills": json.dumps([
                        {"name": "Oracle EBS", "rating": 4},
                        {"name": "Inventory Management", "rating": 4},
                        {"name": "Order Management", "rating": 4},
                        {"name": "Purchasing", "rating": 4}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Oracle Fusion - Integration Architect",
                    "product": "SaaS",
                    "primary_role": "Oracle Fusion Technical Consultant",
                    "years_experience": 8,
                    "rate_min": 150.0,
                    "rate_max": 190.0,
                    "work_type": "Remote",
                    "location": "Nationwide - Remote",
                    "visa_type": "Citizen",
                    "ethnicity": "Asian",
                    "availability": "3 weeks",
                    "summary": "Interested in technical architecture roles focusing on integrations and customizations.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Integration Cloud", "rating": 4},
                        {"name": "REST APIs", "rating": 5},
                        {"name": "FBDI", "rating": 5},
                        {"name": "PL/SQL", "rating": 4}
                    ]),
                    "is_active": True
                }
            ]
        },
        {
            "email": "michael.chen@email.com",
            "password": "Kutty_1304",
            "name": "Michael Chen",
            "phone": "+1 (555) 987-6543",
            "residential_address": "456 Innovation Drive, Austin, TX 78701",
            "location": "Austin, TX",
            "visa_type": "H1B",
            "ethnicity": "Asian",
            "summary": "Oracle Cloud Infrastructure specialist with strong background in HCM implementations. 6 years of experience in HR transformation projects across multiple industries including technology, healthcare, and finance.",
            "product": "SaaS",
            "primary_role": "Oracle HCM Cloud Consultant",
            "years_experience": 6,
            "rate_min": 110.0,
            "rate_max": 150.0,
            "work_type": "Hybrid",
            "availability": "Immediately",
            "is_general_info_complete": True,
            "skills": [
                {"name": "Oracle HCM Cloud", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Core HR", "rating": 5, "level": "Expert", "category": "functional"},
                {"name": "Talent Management", "rating": 4, "level": "Advanced", "category": "functional"},
                {"name": "Payroll", "rating": 4, "level": "Advanced", "category": "functional"},
                {"name": "HSDL", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "Fast Formulas", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "BIP Reporting", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "Change Management", "rating": 4, "level": "Advanced", "category": "soft"},
                {"name": "Training & Documentation", "rating": 5, "level": "Expert", "category": "soft"},
            ],
            "certifications": [
                {"name": "Oracle HCM Cloud Implementation Specialist", "issuer": "Oracle", "year": 2023},
                {"name": "Oracle Talent Management Cloud", "issuer": "Oracle", "year": 2022},
                {"name": "SHRM-CP - Society for Human Resource Management", "issuer": "SHRM", "year": 2021},
            ],
            "social_links": [
                {"platform": "linkedin", "url": "https://linkedin.com/in/michael-chen-hcm", "display_name": "LinkedIn Profile"},
                {"platform": "portfolio", "url": "https://michaelchen-consulting.com", "display_name": "Consulting Portfolio"},
            ],
            "job_preferences": [
                {
                    "preference_name": "Oracle HCM - Full Implementation",
                    "product": "SaaS",
                    "primary_role": "Oracle HCM Cloud Consultant",
                    "years_experience": 6,
                    "rate_min": 120.0,
                    "rate_max": 160.0,
                    "work_type": "Hybrid",
                    "location": "Austin, TX / Dallas, TX",
                    "visa_type": "H1B",
                    "ethnicity": "Asian",
                    "availability": "Immediately",
                    "summary": "Looking for comprehensive HCM Cloud implementation projects covering Core HR, Talent, and Payroll modules.",
                    "required_skills": json.dumps([
                        {"name": "Oracle HCM Cloud", "rating": 5},
                        {"name": "Core HR", "rating": 5},
                        {"name": "Talent Management", "rating": 4},
                        {"name": "Payroll", "rating": 4}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Oracle Fusion - Payroll Specialist",
                    "product": "SaaS",
                    "primary_role": "Oracle Payroll Cloud Consultant",
                    "years_experience": 6,
                    "rate_min": 115.0,
                    "rate_max": 155.0,
                    "work_type": "Remote",
                    "location": "Remote - US Only",
                    "visa_type": "H1B",
                    "ethnicity": "Asian",
                    "availability": "2 weeks",
                    "summary": "Specialized in Oracle Payroll Cloud implementations with focus on complex payroll configurations and compliance.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Payroll Cloud", "rating": 5},
                        {"name": "Fast Formulas", "rating": 5},
                        {"name": "Payroll Compliance", "rating": 4},
                        {"name": "HSDL", "rating": 4}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Oracle HCM - Talent & Recruitment",
                    "product": "SaaS",
                    "primary_role": "Oracle Talent Management Consultant",
                    "years_experience": 6,
                    "rate_min": 110.0,
                    "rate_max": 150.0,
                    "work_type": "Hybrid",
                    "location": "Texas",
                    "visa_type": "H1B",
                    "ethnicity": "Asian",
                    "availability": "1 month",
                    "summary": "Interested in Talent Management and Recruiting Cloud implementations.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Talent Management", "rating": 4},
                        {"name": "Recruiting Cloud", "rating": 4},
                        {"name": "Performance Management", "rating": 4},
                        {"name": "Learning Cloud", "rating": 3}
                    ]),
                    "is_active": True
                }
            ]
        },
        {
            "email": "david.kumar@email.com",
            "password": "Kutty_1304",
            "name": "David Kumar",
            "phone": "+1 (555) 456-7890",
            "residential_address": "789 Enterprise Blvd, Seattle, WA 98101",
            "location": "Seattle, WA",
            "visa_type": "Permanent Resident",
            "ethnicity": "South Asian",
            "summary": "Senior Oracle Database Administrator and Performance Tuning Expert with 10+ years of experience. Specialized in Oracle RAC, Data Guard, and large-scale database migrations. Strong background in both on-premise and cloud database management.",
            "product": "Database",
            "primary_role": "Oracle Database Administrator",
            "years_experience": 10,
            "rate_min": 135.0,
            "rate_max": 185.0,
            "work_type": "Hybrid",
            "availability": "1 month",
            "is_general_info_complete": True,
            "skills": [
                {"name": "Oracle Database", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Oracle RAC", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Data Guard", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Performance Tuning", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "PL/SQL", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Oracle Cloud Infrastructure", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "Backup & Recovery", "rating": 5, "level": "Expert", "category": "technical"},
                {"name": "Shell Scripting", "rating": 4, "level": "Advanced", "category": "technical"},
                {"name": "Linux Administration", "rating": 4, "level": "Advanced", "category": "technical"},
            ],
            "certifications": [
                {"name": "Oracle Database 19c Administrator Certified Professional", "issuer": "Oracle", "year": 2023},
                {"name": "Oracle Cloud Infrastructure Architect Associate", "issuer": "Oracle", "year": 2022},
                {"name": "Oracle Database Performance Tuning Certified Expert", "issuer": "Oracle", "year": 2021},
            ],
            "social_links": [
                {"platform": "linkedin", "url": "https://linkedin.com/in/david-kumar-dba", "display_name": "LinkedIn Profile"},
                {"platform": "github", "url": "https://github.com/davidkumar-dba", "display_name": "GitHub Profile"},
            ],
            "job_preferences": [
                {
                    "preference_name": "Oracle DBA - Senior Position",
                    "product": "Database",
                    "primary_role": "Oracle Database Administrator",
                    "years_experience": 10,
                    "rate_min": 145.0,
                    "rate_max": 195.0,
                    "work_type": "Hybrid",
                    "location": "Seattle, WA / Pacific Northwest",
                    "visa_type": "Permanent Resident",
                    "ethnicity": "South Asian",
                    "availability": "1 month",
                    "summary": "Seeking senior DBA role with focus on Oracle RAC and high availability solutions.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Database", "rating": 5},
                        {"name": "Oracle RAC", "rating": 5},
                        {"name": "Data Guard", "rating": 5},
                        {"name": "Performance Tuning", "rating": 5}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Oracle Cloud DBA",
                    "product": "Cloud",
                    "primary_role": "Oracle Cloud DBA",
                    "years_experience": 10,
                    "rate_min": 140.0,
                    "rate_max": 190.0,
                    "work_type": "Remote",
                    "location": "Remote - US",
                    "visa_type": "Permanent Resident",
                    "ethnicity": "South Asian",
                    "availability": "2 weeks",
                    "summary": "Interested in Oracle Cloud Database migrations and management.",
                    "required_skills": json.dumps([
                        {"name": "Oracle Cloud Infrastructure", "rating": 4},
                        {"name": "Autonomous Database", "rating": 4},
                        {"name": "Database Migration", "rating": 5},
                        {"name": "Cloud Architecture", "rating": 4}
                    ]),
                    "is_active": True
                },
                {
                    "preference_name": "Database Performance Architect",
                    "product": "Database",
                    "primary_role": "Database Performance Architect",
                    "years_experience": 10,
                    "rate_min": 150.0,
                    "rate_max": 200.0,
                    "work_type": "Hybrid",
                    "location": "West Coast",
                    "visa_type": "Permanent Resident",
                    "ethnicity": "South Asian",
                    "availability": "Immediately",
                    "summary": "Specialized role focusing on database performance optimization for large enterprise systems.",
                    "required_skills": json.dumps([
                        {"name": "Performance Tuning", "rating": 5},
                        {"name": "SQL Optimization", "rating": 5},
                        {"name": "Database Architecture", "rating": 5},
                        {"name": "Capacity Planning", "rating": 5}
                    ]),
                    "is_active": True
                }
            ]
        }
    ]
    
    created_candidates = []
    
    for candidate_data in candidates_data:
        # Create user account
        user = User(
            email=candidate_data["email"],
            full_name=candidate_data["name"],
            password_hash=hash_password(candidate_data["password"]),
            role="candidate",
            is_active=True
        )
        session.add(user)
        session.flush()
        
        # Create candidate profile
        candidate = Candidate(
            user_id=user.id,
            name=candidate_data["name"],
            email=candidate_data["email"],
            phone=candidate_data["phone"],
            residential_address=candidate_data["residential_address"],
            location=candidate_data["location"],
            visa_type=candidate_data["visa_type"],
            ethnicity=candidate_data["ethnicity"],
            summary=candidate_data["summary"],
            product=candidate_data["product"],
            primary_role=candidate_data["primary_role"],
            years_experience=candidate_data["years_experience"],
            rate_min=candidate_data["rate_min"],
            rate_max=candidate_data["rate_max"],
            work_type=candidate_data["work_type"],
            availability=candidate_data["availability"],
            is_general_info_complete=candidate_data["is_general_info_complete"]
        )
        session.add(candidate)
        session.flush()
        
        # Add skills
        for skill_data in candidate_data["skills"]:
            skill = Skill(
                candidate_id=candidate.id,
                name=skill_data["name"],
                rating=skill_data["rating"],
                level=skill_data["level"],
                category=skill_data["category"]
            )
            session.add(skill)
        
        # Add certifications
        for cert_data in candidate_data["certifications"]:
            cert = Certification(
                candidate_id=candidate.id,
                name=cert_data["name"],
                issuer=cert_data["issuer"],
                year=cert_data["year"]
            )
            session.add(cert)
        
        # Add social links
        for link_data in candidate_data["social_links"]:
            link = SocialLink(
                candidate_id=candidate.id,
                platform=link_data["platform"],
                url=link_data["url"],
                display_name=link_data["display_name"]
            )
            session.add(link)
        
        # Add job preferences
        for pref_data in candidate_data["job_preferences"]:
            preference = CandidateJobPreference(
                candidate_id=candidate.id,
                preference_name=pref_data["preference_name"],
                product=pref_data["product"],
                primary_role=pref_data["primary_role"],
                years_experience=pref_data["years_experience"],
                rate_min=pref_data["rate_min"],
                rate_max=pref_data["rate_max"],
                work_type=pref_data["work_type"],
                location=pref_data["location"],
                visa_type=pref_data["visa_type"],
                ethnicity=pref_data["ethnicity"],
                availability=pref_data["availability"],
                summary=pref_data["summary"],
                required_skills=pref_data["required_skills"],
                is_active=pref_data["is_active"]
            )
            session.add(preference)
        
        created_candidates.append({
            "user": user,
            "candidate": candidate,
            "email": candidate_data["email"]
        })
        
        print(f"  ✓ Created candidate: {candidate_data['name']} ({candidate_data['email']})")
        print(f"    - {len(candidate_data['skills'])} skills")
        print(f"    - {len(candidate_data['certifications'])} certifications")
        print(f"    - {len(candidate_data['social_links'])} social links")
        print(f"    - {len(candidate_data['job_preferences'])} job preferences")
    
    session.commit()
    print(f"✅ Created {len(created_candidates)} candidates with complete profiles")
    return created_candidates


def create_companies_and_users(session: Session):
    """Create 6 company accounts with 3 users each"""
    print("\n🏢 Creating company accounts and users...")
    
    companies_data = [
        {
            "company_name": "TechCorp Solutions",
            "domain": "techcorp.com",
            "hq_location": "San Francisco, CA",
            "description": "Leading enterprise technology consulting firm specializing in Oracle Cloud implementations and digital transformations.",
            "users": [
                {"email": "admin.jennifer@techcorp.com", "password": "Kutty_1304", "first_name": "Jennifer", "last_name": "Smith", "role": "ADMIN"},
                {"email": "hr.jane@techcorp.com", "password": "Kutty_1304", "first_name": "Jane", "last_name": "Williams", "role": "HR"},
                {"email": "recruiter.robert@techcorp.com", "password": "Kutty_1304", "first_name": "Robert", "last_name": "Johnson", "role": "HR"}
            ]
        },
        {
            "company_name": "Global Systems Inc",
            "domain": "globalsystems.com",
            "hq_location": "New York, NY",
            "description": "Fortune 500 technology consulting firm with global presence. Expert in Oracle EBS and Fusion implementations.",
            "users": [
                {"email": "admin.lisa@globalsystems.com", "password": "Kutty_1304", "first_name": "Lisa", "last_name": "Martinez", "role": "ADMIN"},
                {"email": "hr.mark@globalsystems.com", "password": "Kutty_1304", "first_name": "Mark", "last_name": "Thompson", "role": "HR"},
                {"email": "recruiter.anna@globalsystems.com", "password": "Kutty_1304", "first_name": "Anna", "last_name": "Lee", "role": "HR"}
            ]
        },
        {
            "company_name": "Enterprise Solutions LLC",
            "domain": "enterprisesol.com",
            "hq_location": "Chicago, IL",
            "description": "Mid-market consulting firm focused on Oracle HCM and Financial applications.",
            "users": [
                {"email": "admin.susan@enterprisesol.com", "password": "Kutty_1304", "first_name": "Susan", "last_name": "Davis", "role": "ADMIN"},
                {"email": "hr.tom@enterprisesol.com", "password": "Kutty_1304", "first_name": "Tom", "last_name": "Wilson", "role": "HR"},
                {"email": "recruiter.diana@enterprisesol.com", "password": "Kutty_1304", "first_name": "Diana", "last_name": "Moore", "role": "HR"}
            ]
        },
        {
            "company_name": "Oracle Consulting Partners",
            "domain": "oraclepartners.com",
            "hq_location": "Austin, TX",
            "description": "Oracle Platinum Partner specializing in cloud migrations and enterprise implementations.",
            "users": [
                {"email": "admin.rachel@oraclepartners.com", "password": "Kutty_1304", "first_name": "Rachel", "last_name": "Taylor", "role": "ADMIN"},
                {"email": "hr.james@oraclepartners.com", "password": "Kutty_1304", "first_name": "James", "last_name": "Anderson", "role": "HR"},
                {"email": "recruiter.linda@oraclepartners.com", "password": "Kutty_1304", "first_name": "Linda", "last_name": "Garcia", "role": "HR"}
            ]
        },
        {
            "company_name": "CloudTech Innovations",
            "domain": "cloudtech.com",
            "hq_location": "Seattle, WA",
            "description": "Cloud-first consulting firm helping enterprises modernize with Oracle Cloud technologies.",
            "users": [
                {"email": "admin.emily@cloudtech.com", "password": "Kutty_1304", "first_name": "Emily", "last_name": "Brown", "role": "ADMIN"},
                {"email": "hr.chris@cloudtech.com", "password": "Kutty_1304", "first_name": "Chris", "last_name": "Miller", "role": "HR"},
                {"email": "recruiter.brian@cloudtech.com", "password": "Kutty_1304", "first_name": "Brian", "last_name": "White", "role": "HR"}
            ]
        },
        {
            "company_name": "Digital Transform Group",
            "domain": "digitaltrans.com",
            "hq_location": "Boston, MA",
            "description": "Strategic consulting firm specializing in digital transformation and Oracle enterprise solutions.",
            "users": [
                {"email": "admin.kevin@digitaltrans.com", "password": "Kutty_1304", "first_name": "Kevin", "last_name": "Harris", "role": "ADMIN"},
                {"email": "hr.amanda@digitaltrans.com", "password": "Kutty_1304", "first_name": "Amanda", "last_name": "Clark", "role": "HR"},
                {"email": "recruiter.mike@digitaltrans.com", "password": "Kutty_1304", "first_name": "Mike", "last_name": "Lewis", "role": "HR"}
            ]
        }
    ]
    
    created_companies = []
    
    for company_data in companies_data:
        # Create company account
        company = CompanyAccount(
            company_name=company_data["company_name"],
            domain=company_data["domain"],
            hq_location=company_data["hq_location"],
            description=company_data["description"]
        )
        session.add(company)
        session.flush()
        
        print(f"  ✓ Created company: {company.company_name}")
        
        company_users = []
        for user_data in company_data["users"]:
            # Create user account
            full_name = f"{user_data['first_name']} {user_data['last_name']}"
            user = User(
                email=user_data["email"],
                full_name=full_name,
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"].lower(),
                is_active=True
            )
            session.add(user)
            session.flush()
            
            # Create company user
            company_user = CompanyUser(
                user_id=user.id,
                company_id=company.id,
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                role=user_data["role"],
                is_active=True
            )
            session.add(company_user)
            session.flush()
            
            company_users.append({
                "user": user,
                "company_user": company_user,
                "email": user_data["email"]
            })
            
            print(f"    - {user_data['first_name']} {user_data['last_name']} ({user_data['role']})")
        
        created_companies.append({
            "company": company,
            "users": company_users
        })
    
    session.commit()
    print(f"✅ Created {len(created_companies)} companies with 3 users each ({len(created_companies) * 3} total users)")
    return created_companies


def create_job_postings(session: Session, companies: list):
    """Create 4 job postings per company (24 total)"""
    print("\n💼 Creating job postings...")
    
    # Job templates for each company
    job_templates = [
        # TechCorp Solutions - 4 jobs
        [
            {
                "title": "Senior Oracle Fusion Financials Consultant",
                "description": "Lead Oracle Fusion Financials implementation for Fortune 500 client. Full-cycle project including design, configuration, testing, and go-live support.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Functional Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "12 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "San Francisco, CA",
                "work_type": "Hybrid",
                "min_rate": 140.0,
                "max_rate": 180.0,
                "required_skills": json.dumps(["Oracle Fusion Financials", "General Ledger", "AP/AR", "OTBI"]),
                "nice_to_have_skills": json.dumps(["Oracle EBS", "PMP", "Banking Industry"]),
            },
            {
                "title": "Oracle HCM Cloud Implementation Lead",
                "description": "Drive HCM Cloud implementation covering Core HR, Talent, and Payroll modules for healthcare organization.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle HCM Cloud Consultant",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "10 months",
                "start_date": datetime.now() + timedelta(days=21),
                "currency": "USD",
                "location": "San Francisco, CA",
                "work_type": "Hybrid",
                "min_rate": 125.0,
                "max_rate": 165.0,
                "required_skills": json.dumps(["Oracle HCM Cloud", "Core HR", "Talent Management", "Payroll"]),
                "nice_to_have_skills": json.dumps(["Fast Formulas", "BIP Reporting", "Healthcare Experience"]),
            },
            {
                "title": "Oracle Integration Cloud Architect",
                "description": "Design and implement integration solutions using OIC, REST APIs, and FBDI for enterprise client.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Technical Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "8 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 150.0,
                "max_rate": 190.0,
                "required_skills": json.dumps(["Oracle Integration Cloud", "REST APIs", "FBDI", "PL/SQL"]),
                "nice_to_have_skills": json.dumps(["VBCS", "Groovy", "Java"]),
            },
            {
                "title": "Oracle Database Administrator - Senior",
                "description": "Manage and optimize Oracle databases for multiple enterprise clients. RAC and Data Guard experience required.",
                "product_author": "Oracle",
                "product": "Database",
                "role": "Oracle Database Administrator",
                "seniority": "Senior",
                "job_type": "Permanent",
                "duration": None,
                "start_date": datetime.now() + timedelta(days=60),
                "currency": "USD",
                "location": "San Francisco, CA",
                "work_type": "Hybrid",
                "salary_min": 140000.0,
                "salary_max": 180000.0,
                "required_skills": json.dumps(["Oracle Database", "Oracle RAC", "Data Guard", "Performance Tuning"]),
                "nice_to_have_skills": json.dumps(["OCI", "Linux", "Shell Scripting"]),
            }
        ],
        # Global Systems Inc - 4 jobs
        [
            {
                "title": "Oracle EBS Finance Consultant",
                "description": "Support and enhance Oracle EBS R12 Financials modules for manufacturing client.",
                "product_author": "Oracle",
                "product": "E-Business Suite",
                "role": "Oracle EBS Functional Consultant",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "9 months",
                "start_date": datetime.now() + timedelta(days=14),
                "currency": "USD",
                "location": "New York, NY",
                "work_type": "Hybrid",
                "min_rate": 120.0,
                "max_rate": 160.0,
                "required_skills": json.dumps(["Oracle EBS R12", "General Ledger", "AP", "AR"]),
                "nice_to_have_skills": json.dumps(["Manufacturing", "Fixed Assets", "Cash Management"]),
            },
            {
                "title": "Oracle Payroll Cloud Specialist",
                "description": "Implement and configure Oracle Payroll Cloud with focus on multi-state payroll and compliance.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Payroll Cloud Consultant",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "6 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 115.0,
                "max_rate": 155.0,
                "required_skills": json.dumps(["Oracle Payroll Cloud", "Fast Formulas", "HSDL", "Tax Compliance"]),
                "nice_to_have_skills": json.dumps(["Multi-state Payroll", "Year-end Processing", "ADP Experience"]),
            },
            {
                "title": "Oracle Fusion SCM Consultant",
                "description": "Full-cycle Supply Chain implementation including Inventory, Order Management, and Procurement.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Supply Chain Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "12 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "New York, NY",
                "work_type": "Hybrid",
                "min_rate": 135.0,
                "max_rate": 175.0,
                "required_skills": json.dumps(["Oracle Fusion SCM", "Inventory", "Order Management", "Procurement"]),
                "nice_to_have_skills": json.dumps(["Manufacturing", "Logistics", "IoT"]),
            },
            {
                "title": "Junior Oracle Fusion Analyst",
                "description": "Entry-level position supporting Oracle Fusion applications. Training and mentorship provided.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Functional Consultant",
                "seniority": "Junior",
                "job_type": "Permanent",
                "duration": None,
                "start_date": datetime.now() + timedelta(days=90),
                "currency": "USD",
                "location": "New York, NY",
                "work_type": "Hybrid",
                "salary_min": 70000.0,
                "salary_max": 90000.0,
                "required_skills": json.dumps(["Oracle Fusion", "SQL", "Business Analysis"]),
                "nice_to_have_skills": json.dumps(["Any ERP", "Bachelor's Degree", "Technical Writing"]),
            }
        ],
        # Enterprise Solutions LLC - 4 jobs
        [
            {
                "title": "Oracle HCM Talent Management Lead",
                "description": "Lead Talent Management module implementation including Recruiting, Performance, and Learning.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle HCM Cloud Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "8 months",
                "start_date": datetime.now() + timedelta(days=21),
                "currency": "USD",
                "location": "Chicago, IL",
                "work_type": "Hybrid",
                "min_rate": 125.0,
                "max_rate": 165.0,
                "required_skills": json.dumps(["Talent Management", "Recruiting Cloud", "Performance Management", "Learning"]),
                "nice_to_have_skills": json.dumps(["Succession Planning", "Career Development", "Change Management"]),
            },
            {
                "title": "Oracle Fusion Financials Architect",
                "description": "Senior architect role designing financial solutions for complex multi-entity organizations.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Functional Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "12 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Chicago, IL",
                "work_type": "Hybrid",
                "min_rate": 150.0,
                "max_rate": 190.0,
                "required_skills": json.dumps(["Fusion Financials", "GL", "AP", "AR", "FA", "CM"]),
                "nice_to_have_skills": json.dumps(["Enterprise Architecture", "Multi-entity", "Consolidation"]),
            },
            {
                "title": "Oracle Database Performance Engineer",
                "description": "Optimize database performance for high-transaction Oracle environments. Tuning and monitoring focus.",
                "product_author": "Oracle",
                "product": "Database",
                "role": "Oracle Database Administrator",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "6 months",
                "start_date": datetime.now() + timedelta(days=14),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 130.0,
                "max_rate": 170.0,
                "required_skills": json.dumps(["Performance Tuning", "SQL Optimization", "AWR", "Oracle Database"]),
                "nice_to_have_skills": json.dumps(["RAC", "Exadata", "OEM"]),
            },
            {
                "title": "Oracle EBS Technical Developer",
                "description": "Develop customizations and extensions for Oracle EBS R12. Forms, Reports, and PL/SQL development.",
                "product_author": "Oracle",
                "product": "E-Business Suite",
                "role": "Oracle EBS Technical Consultant",
                "seniority": "Mid",
                "job_type": "Contract",
                "duration": "8 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "Chicago, IL",
                "work_type": "Hybrid",
                "min_rate": 110.0,
                "max_rate": 145.0,
                "required_skills": json.dumps(["Oracle EBS", "PL/SQL", "Oracle Forms", "Oracle Reports"]),
                "nice_to_have_skills": json.dumps(["OAF", "XML Publisher", "Workflow"]),
            }
        ],
        # Oracle Consulting Partners - 4 jobs
        [
            {
                "title": "Oracle Cloud Migration Architect",
                "description": "Lead EBS to Fusion migration project. Strategy, planning, and execution expertise required.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Cloud Migration Specialist",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "18 months",
                "start_date": datetime.now() + timedelta(days=60),
                "currency": "USD",
                "location": "Austin, TX",
                "work_type": "Hybrid",
                "min_rate": 160.0,
                "max_rate": 200.0,
                "required_skills": json.dumps(["Oracle EBS", "Oracle Fusion", "Cloud Migration", "Project Management"]),
                "nice_to_have_skills": json.dumps(["Data Migration", "Integration", "Change Management"]),
            },
            {
                "title": "Oracle Fusion HCM Implementation Consultant",
                "description": "Core HR and Benefits implementation for retail industry client. Multiple locations.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle HCM Cloud Consultant",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "10 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Austin, TX",
                "work_type": "Hybrid",
                "min_rate": 120.0,
                "max_rate": 160.0,
                "required_skills": json.dumps(["Core HR", "Benefits", "Absence Management", "Oracle HCM"]),
                "nice_to_have_skills": json.dumps(["Retail Industry", "Multi-location", "Reporting"]),
            },
            {
                "title": "Oracle Integration Developer",
                "description": "Build integrations between Oracle Cloud and third-party systems using OIC and APIs.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Technical Consultant",
                "seniority": "Mid",
                "job_type": "Contract",
                "duration": "7 months",
                "start_date": datetime.now() + timedelta(days=21),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 125.0,
                "max_rate": 165.0,
                "required_skills": json.dumps(["OIC", "REST APIs", "SOAP", "Integration"]),
                "nice_to_have_skills": json.dumps(["FBDI", "HCM Extracts", "JavaScript"]),
            },
            {
                "title": "Oracle Autonomous Database Specialist",
                "description": "Implement and manage Oracle Autonomous Database solutions in OCI environment.",
                "product_author": "Oracle",
                "product": "Cloud",
                "role": "Oracle Cloud DBA",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "6 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 135.0,
                "max_rate": 175.0,
                "required_skills": json.dumps(["Autonomous Database", "OCI", "Oracle Database", "Cloud Architecture"]),
                "nice_to_have_skills": json.dumps(["Data Guard", "GoldenGate", "Terraform"]),
            }
        ],
        # CloudTech Innovations - 4 jobs
        [
            {
                "title": "Oracle Fusion Financial Reporting Consultant",
                "description": "Design and build financial reports using OTBI, BIP, and Financial Reporting Studio.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Functional Consultant",
                "seniority": "Mid",
                "job_type": "Contract",
                "duration": "6 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Seattle, WA",
                "work_type": "Hybrid",
                "min_rate": 115.0,
                "max_rate": 150.0,
                "required_skills": json.dumps(["OTBI", "BIP Reporting", "Financial Reporting", "Oracle Fusion"]),
                "nice_to_have_skills": json.dumps(["SQL", "Smart View", "Data Visualization"]),
            },
            {
                "title": "Oracle HCM Payroll Implementation Lead",
                "description": "Lead multi-country payroll implementation using Oracle Global Payroll Cloud.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Payroll Cloud Consultant",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "12 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "Seattle, WA",
                "work_type": "Hybrid",
                "min_rate": 140.0,
                "max_rate": 180.0,
                "required_skills": json.dumps(["Global Payroll", "Fast Formulas", "HSDL", "Multi-country Payroll"]),
                "nice_to_have_skills": json.dumps(["Tax Compliance", "Payroll Integration", "Benefits"]),
            },
            {
                "title": "Oracle Cloud Infrastructure Engineer",
                "description": "Design and implement OCI infrastructure for enterprise Oracle Cloud applications.",
                "product_author": "Oracle",
                "product": "Cloud",
                "role": "Oracle Cloud Infrastructure Architect",
                "seniority": "Mid-Senior",
                "job_type": "Permanent",
                "duration": None,
                "start_date": datetime.now() + timedelta(days=60),
                "currency": "USD",
                "location": "Seattle, WA",
                "work_type": "Hybrid",
                "salary_min": 130000.0,
                "salary_max": 170000.0,
                "required_skills": json.dumps(["OCI", "Cloud Architecture", "Networking", "Security"]),
                "nice_to_have_skills": json.dumps(["Terraform", "Ansible", "DevOps"]),
            },
            {
                "title": "Oracle Fusion Supply Chain Analyst",
                "description": "Support Oracle Fusion SCM modules including Inventory and Procurement. Mid-level role.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion Supply Chain Consultant",
                "seniority": "Mid",
                "job_type": "Contract",
                "duration": "8 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 105.0,
                "max_rate": 140.0,
                "required_skills": json.dumps(["Fusion SCM", "Inventory", "Procurement", "Business Analysis"]),
                "nice_to_have_skills": json.dumps(["Order Management", "Manufacturing", "Reporting"]),
            }
        ],
        # Digital Transform Group - 4 jobs
        [
            {
                "title": "Oracle EBS to Cloud Migration Lead",
                "description": "Strategic lead for large-scale EBS to Fusion Cloud transformation program.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Cloud Migration Specialist",
                "seniority": "Senior",
                "job_type": "Contract",
                "duration": "24 months",
                "start_date": datetime.now() + timedelta(days=90),
                "currency": "USD",
                "location": "Boston, MA",
                "work_type": "Hybrid",
                "min_rate": 170.0,
                "max_rate": 210.0,
                "required_skills": json.dumps(["Oracle EBS", "Oracle Fusion", "Program Management", "Change Management"]),
                "nice_to_have_skills": json.dumps(["Enterprise Architecture", "Data Migration", "Training"]),
            },
            {
                "title": "Oracle Database Administrator - RAC Specialist",
                "description": "Manage and maintain Oracle RAC environments. High availability and disaster recovery focus.",
                "product_author": "Oracle",
                "product": "Database",
                "role": "Oracle Database Administrator",
                "seniority": "Senior",
                "job_type": "Permanent",
                "duration": None,
                "start_date": datetime.now() + timedelta(days=60),
                "currency": "USD",
                "location": "Boston, MA",
                "work_type": "Hybrid",
                "salary_min": 145000.0,
                "salary_max": 190000.0,
                "required_skills": json.dumps(["Oracle RAC", "Data Guard", "High Availability", "Oracle Database"]),
                "nice_to_have_skills": json.dumps(["ASM", "Exadata", "GoldenGate"]),
            },
            {
                "title": "Oracle Fusion PPM Consultant",
                "description": "Implement Oracle Fusion Project Portfolio Management for professional services firm.",
                "product_author": "Oracle",
                "product": "Oracle Fusion",
                "role": "Oracle Fusion PPM Consultant",
                "seniority": "Mid-Senior",
                "job_type": "Contract",
                "duration": "9 months",
                "start_date": datetime.now() + timedelta(days=45),
                "currency": "USD",
                "location": "Boston, MA",
                "work_type": "Hybrid",
                "min_rate": 125.0,
                "max_rate": 165.0,
                "required_skills": json.dumps(["Oracle PPM", "Project Management", "Resource Management", "Billing"]),
                "nice_to_have_skills": json.dumps(["Professional Services", "Time & Labor", "Grants Management"]),
            },
            {
                "title": "Oracle Analytics Cloud Developer",
                "description": "Build dashboards and analytics solutions using Oracle Analytics Cloud and Data Visualization.",
                "product_author": "Oracle",
                "product": "Cloud",
                "role": "Oracle Analytics Developer",
                "seniority": "Mid",
                "job_type": "Contract",
                "duration": "6 months",
                "start_date": datetime.now() + timedelta(days=30),
                "currency": "USD",
                "location": "Remote",
                "work_type": "Remote",
                "min_rate": 110.0,
                "max_rate": 145.0,
                "required_skills": json.dumps(["Oracle Analytics Cloud", "Data Visualization", "SQL", "BI Development"]),
                "nice_to_have_skills": json.dumps(["Data Modeling", "ETL", "Python"]),
            }
        ]
    ]
    
    all_jobs = []
    
    for idx, company_info in enumerate(companies):
        company = company_info["company"]
        admin_user = next(u for u in company_info["users"] if u["company_user"].role == "ADMIN")
        
        for job_data in job_templates[idx]:
            job = JobPost(
                company_id=company.id,
                created_by_user_id=admin_user["company_user"].id,
                title=job_data["title"],
                description=job_data["description"],
                product_author=job_data["product_author"],
                product=job_data["product"],
                role=job_data["role"],
                seniority=job_data["seniority"],
                job_type=job_data["job_type"],
                duration=job_data["duration"],
                start_date=job_data["start_date"],
                currency=job_data["currency"],
                location=job_data["location"],
                work_type=job_data["work_type"],
                min_rate=job_data.get("min_rate"),
                max_rate=job_data.get("max_rate"),
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
                required_skills=job_data["required_skills"],
                nice_to_have_skills=job_data["nice_to_have_skills"],
                status="active"
            )
            session.add(job)
            session.flush()
            all_jobs.append(job)
        
        print(f"  ✓ Created 4 job postings for {company.company_name}")
    
    session.commit()
    print(f"✅ Created {len(all_jobs)} job postings total (4 per company)")
    return all_jobs


def print_summary(candidates, companies, jobs):
    """Print summary of created seed data"""
    print("\n" + "="*80)
    print("🎉 SEED DATA CREATION COMPLETE!")
    print("="*80)
    
    print("\n📊 Summary:")
    print(f"  • Candidates: {len(candidates)}")
    print(f"  • Companies: {len(companies)}")
    print(f"  • Company Users: {len(companies) * 3}")
    print(f"  • Job Postings: {len(jobs)}")
    print(f"  • Job Preferences: {len(candidates) * 3}")
    
    print("\n👤 Candidate Login Credentials:")
    for candidate in candidates:
        print(f"  • Email: {candidate['email']}")
        print(f"    Password: password123")
        print(f"    Name: {candidate['candidate'].name}")
        print()
    
    print("🏢 Company Accounts:")
    for company_info in companies:
        company = company_info["company"]
        print(f"\n  {company.company_name} ({company.hq_location})")
        for user_info in company_info["users"]:
            cu = user_info["company_user"]
            password = "admin123" if cu.role == "ADMIN" else "hr123" if cu.role == "HR" else "recruiter123"
            print(f"    • {user_info['email']} / {password} ({cu.role})")
    
    print("\n" + "="*80)
    print("🚀 You can now:")
    print("  1. Login as any candidate to view profile and browse jobs")
    print("  2. Login as company user to manage job postings")
    print("  3. View all 24 job postings across 6 companies")
    print("  4. All data changes sync bidirectionally between UI and database")
    print("="*80)


def main():
    """Main function to run seed data creation"""
    print("="*80)
    print("🌱 TALENTGRAPH SEED DATA SCRIPT - EXPANDED")
    print("="*80)
    print("This script will populate your database with:")
    print("  • 3 Candidates with 3 job preferences each")
    print("  • 6 Companies with 3 users each (18 company users)")
    print("  • 24 Job postings (4 per company)")
    print("="*80)
    
    try:
        with Session(engine) as session:
            # Clear existing seed data
            clear_existing_data(session)
            
            # Create candidates
            candidates = create_candidates(session)
            
            # Create companies and users
            companies = create_companies_and_users(session)
            
            # Create job postings
            jobs = create_job_postings(session, companies)
            
            # Print summary
            print_summary(candidates, companies, jobs)
            
    except Exception as e:
        print(f"\n❌ Error during seed data creation: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
