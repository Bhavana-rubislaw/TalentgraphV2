"""
Comprehensive Seed Script for 15 Candidates
============================================
Creates all required candidates with complete profiles, job profiles, skills, and certifications.

Run this script to populate the database with all candidate data:
    cd backend2
    venv\\Scripts\\Activate.ps1
    python seed_all_candidates.py

Password for all users: Kutty_1304
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from sqlmodel import Session, select

# Add backend2 directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import (
    User, UserRole, Candidate, JobProfile, Skill, LocationPreference,
    Resume, Certification, WorkType, EmploymentType, VisaStatus, CurrencyType,
    ProductVendor, ProductType, ProductRole
)
from app.security import hash_password

# Universal password for all seed accounts
SEED_PASSWORD = "Kutty_1304"


def get_taxonomy_ids(session: Session, vendor_name: str, product_type_name: str, role_name: str):
    """
    Look up taxonomy IDs for vendor, product type, and role.
    Returns tuple: (vendor_id, product_type_id, role_id)
    Returns None values if not found.
    """
    vendor_id = None
    product_type_id = None
    role_id = None
    
    # Look up vendor
    if vendor_name:
        vendor = session.exec(
            select(ProductVendor).where(ProductVendor.name.ilike(f"%{vendor_name}%"))
        ).first()
        if vendor:
            vendor_id = vendor.id
            
            # Look up product type within this vendor
            if product_type_name:
                product_type = session.exec(
                    select(ProductType).where(
                        ProductType.vendor_id == vendor_id,
                        ProductType.name.ilike(f"%{product_type_name}%")
                    )
                ).first()
                if product_type:
                    product_type_id = product_type.id
                    
                    # Look up role within this product type
                    if role_name:
                        role = session.exec(
                            select(ProductRole).where(
                                ProductRole.product_type_id == product_type_id,
                                ProductRole.name.ilike(f"%{role_name}%")
                            )
                        ).first()
                        if role:
                            role_id = role.id
    
    return vendor_id, product_type_id, role_id


def create_or_update_candidate(session: Session, candidate_data: dict):
    """Create or update a candidate with complete profile"""
    
    # Check if user exists
    user = session.exec(select(User).where(User.email == candidate_data['email'])).first()
    
    if not user:
        # Create user
        user = User(
            email=candidate_data['email'],
            password_hash=hash_password(SEED_PASSWORD),
            full_name=candidate_data['full_name'],
            role=UserRole.CANDIDATE,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"  [+] Created user: {candidate_data['full_name']} ({candidate_data['email']})")
    else:
        print(f"  [i] User exists: {candidate_data['full_name']} ({candidate_data['email']})")
    
    # Check if candidate profile exists
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    
    if not candidate:
        candidate = Candidate(
            user_id=user.id,
            name=candidate_data['full_name'],
            email=candidate_data['email'],
            phone=candidate_data['phone'],
            residential_address=candidate_data['address'],
            location_state=candidate_data['state'],
            location_county=candidate_data['county'],
            location_zipcode=candidate_data['zipcode'],
            linkedin_url=candidate_data.get('linkedin'),
            github_url=candidate_data.get('github'),
            portfolio_url=candidate_data.get('portfolio'),
            profile_summary=candidate_data['summary']
        )
        session.add(candidate)
        session.commit()
        session.refresh(candidate)
        print(f"    [+] Created candidate profile (ID: {candidate.id})")
    else:
        # Update candidate profile
        candidate.phone = candidate_data['phone']
        candidate.residential_address = candidate_data['address']
        candidate.location_state = candidate_data['state']
        candidate.location_county = candidate_data['county']
        candidate.location_zipcode = candidate_data['zipcode']
        candidate.linkedin_url = candidate_data.get('linkedin')
        candidate.github_url = candidate_data.get('github')
        candidate.portfolio_url = candidate_data.get('portfolio')
        candidate.profile_summary = candidate_data['summary']
        session.commit()
        print(f"    [i] Updated candidate profile (ID: {candidate.id})")
    
    # Create certifications
    for cert_data in candidate_data.get('certifications', []):
        # Check if certification already exists
        existing_cert = session.exec(
            select(Certification).where(
                Certification.candidate_id == candidate.id,
                Certification.name == cert_data['name']
            )
        ).first()
        
        if not existing_cert:
            cert = Certification(
                candidate_id=candidate.id,
                name=cert_data['name'],
                issuer=cert_data['issuer'],
                issued_date=cert_data['issued_date'],
                expiry_date=cert_data.get('expiry_date')
            )
            session.add(cert)
    session.commit()
    print(f"      [+] Added {len(candidate_data.get('certifications', []))} certifications")
    
    # Create job profiles
    for profile_data in candidate_data['job_profiles']:
        # Look up taxonomy IDs
        vendor_id, product_type_id, role_id = get_taxonomy_ids(
            session,
            profile_data['product_vendor'],
            profile_data['product_type'],
            profile_data['job_role']
        )
        
        job_profile = JobProfile(
            candidate_id=candidate.id,
            profile_name=profile_data['profile_name'],
            # NEW: Taxonomy IDs (standardized)
            vendor_id=vendor_id,
            product_type_id=product_type_id,
            role_id=role_id,
            # Legacy fields (kept for backward compatibility)
            product_vendor=profile_data['product_vendor'],
            product_type=profile_data['product_type'],
            job_role=profile_data['job_role'],
            years_of_experience=profile_data['years_of_experience'],
            worktype=profile_data['worktype'],
            employment_type=profile_data['employment_type'],
            salary_min=profile_data['salary_min'],
            salary_max=profile_data['salary_max'],
            salary_currency=profile_data['salary_currency'],
            visa_status=profile_data['visa_status'],
            ethnicity=profile_data.get('ethnicity'),
            availability_date=profile_data.get('availability_date'),
            profile_summary=profile_data['profile_summary']
        )
        session.add(job_profile)
        session.commit()
        session.refresh(job_profile)
        
        # Log taxonomy mapping
        taxonomy_info = ""
        if vendor_id:
            taxonomy_info = f" [Taxonomy: Vendor #{vendor_id}"
            if product_type_id:
                taxonomy_info += f", Type #{product_type_id}"
            if role_id:
                taxonomy_info += f", Role #{role_id}"
            taxonomy_info += "]"
        
        print(f"      [+] Created job profile: {profile_data['profile_name']} (ID: {job_profile.id}){taxonomy_info}")
        
        # Add skills to job profile
        for skill_data in profile_data['skills']:
            skill = Skill(
                job_profile_id=job_profile.id,
                skill_name=skill_data['skill_name'],
                skill_category=skill_data['skill_category'],
                proficiency_level=skill_data['proficiency_level']
            )
            session.add(skill)
        session.commit()
        print(f"        [+] Added {len(profile_data['skills'])} skills")
        
        # Add location preferences
        for loc_data in profile_data['locations']:
            location = LocationPreference(
                job_profile_id=job_profile.id,
                city=loc_data['city'],
                state=loc_data['state'],
                country=loc_data['country']
            )
            session.add(location)
        session.commit()
        print(f"        [+] Added {len(profile_data['locations'])} location preferences")
    
    return candidate


def main():
    print("=" * 80)
    print("COMPREHENSIVE CANDIDATE SEED SCRIPT - 15 CANDIDATES")
    print("=" * 80)
    
    # Define all 15 candidates with complete data
    candidates_data = [
        # Candidate 1: Emily Zhang
        {
            "email": "emily.zhang@email.com",
            "full_name": "Emily Zhang",
            "phone": "+1 (555) 201-0001",
            "address": "789 Innovation Way, Seattle, WA 98101",
            "state": "Washington",
            "county": "King",
            "zipcode": "98101",
            "linkedin": "https://linkedin.com/in/emily-zhang-ai",
            "github": "https://github.com/emilyzhang",
            "portfolio": "https://emilyzhang.dev",
            "summary": "AI/ML Engineer with 6 years of experience in developing machine learning models and deploying scalable AI solutions. Specialized in NLP and computer vision.",
            "certifications": [
                {"name": "AWS Machine Learning Specialty", "issuer": "Amazon", "issued_date": "2023-05-15", "expiry_date": "2026-05-15"},
                {"name": "TensorFlow Developer Certificate", "issuer": "Google", "issued_date": "2022-09-10", "expiry_date": "2025-09-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior ML Engineer - NLP",
                    "product_vendor": "AWS",
                    "product_type": "SageMaker",
                    "job_role": "ML Engineer",
                    "years_of_experience": 6,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 150000.0,
                    "salary_max": 200000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Asian",
                    "availability_date": "2 weeks",
                    "profile_summary": "Seeking senior ML role focused on NLP and large language models.",
                    "skills": [
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "TensorFlow", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "PyTorch", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "NLP", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "AWS SageMaker", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Seattle", "state": "Washington", "country": "USA"},
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 2: James Wilson
        {
            "email": "james.wilson@email.com",
            "full_name": "James Wilson",
            "phone": "+1 (555) 202-0002",
            "address": "456 Cloud Street, Austin, TX 78701",
            "state": "Texas",
            "county": "Travis",
            "zipcode": "78701",
            "linkedin": "https://linkedin.com/in/james-wilson-devops",
            "github": "https://github.com/jameswilson",
            "summary": "DevOps Engineer with 7 years of experience in cloud infrastructure, CI/CD pipelines, and container orchestration. Expert in AWS and Kubernetes.",
            "certifications": [
                {"name": "AWS Solutions Architect Professional", "issuer": "Amazon", "issued_date": "2023-02-20", "expiry_date": "2026-02-20"},
                {"name": "Certified Kubernetes Administrator", "issuer": "CNCF", "issued_date": "2022-11-15", "expiry_date": "2025-11-15"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior DevOps Engineer",
                    "product_vendor": "AWS",
                    "product_type": "EKS",
                    "job_role": "DevOps Engineer",
                    "years_of_experience": 7,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 140000.0,
                    "salary_max": 180000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Caucasian",
                    "availability_date": "1 month",
                    "profile_summary": "Experienced DevOps engineer seeking challenging infrastructure roles.",
                    "skills": [
                        {"skill_name": "AWS", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Kubernetes", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Docker", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Terraform", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Jenkins", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Austin", "state": "Texas", "country": "USA"},
                        {"city": "Dallas", "state": "Texas", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 3: Priya Sharma
        {
            "email": "priya.sharma@email.com",
            "full_name": "Priya Sharma",
            "phone": "+1 (555) 203-0003",
            "address": "321 Tech Boulevard, Boston, MA 02101",
            "state": "Massachusetts",
            "county": "Suffolk",
            "zipcode": "02101",
            "linkedin": "https://linkedin.com/in/priya-sharma-ux",
            "portfolio": "https://priyasharma.design",
            "summary": "Senior UX/UI Designer with 8 years of experience creating user-centered digital experiences. Specialized in design systems and accessibility.",
            "certifications": [
                {"name": "Google UX Design Professional Certificate", "issuer": "Google", "issued_date": "2022-06-10", "expiry_date": "2025-06-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior UX Designer",
                    "product_vendor": "General",
                    "product_type": "Design",
                    "job_role": "UX/UI Designer",
                    "years_of_experience": 8,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 120000.0,
                    "salary_max": 160000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "3 weeks",
                    "profile_summary": "Looking for senior design role with focus on design systems.",
                    "skills": [
                        {"skill_name": "Figma", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Adobe XD", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "User Research", "skill_category": "functional", "proficiency_level": 5},
                        {"skill_name": "Prototyping", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Accessibility", "skill_category": "functional", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 4: Carlos Rodriguez
        {
            "email": "carlos.rodriguez@email.com",
            "full_name": "Carlos Rodriguez",
            "phone": "+1 (555) 204-0004",
            "address": "567 Data Drive, Chicago, IL 60601",
            "state": "Illinois",
            "county": "Cook",
            "zipcode": "60601",
            "linkedin": "https://linkedin.com/in/carlos-rodriguez-data",
            "github": "https://github.com/carlosrodriguez",
            "summary": "Data Scientist with 5 years of experience in statistical modeling, predictive analytics, and business intelligence. Strong background in Python and SQL.",
            "certifications": [
                {"name": "Microsoft Certified: Azure Data Scientist Associate", "issuer": "Microsoft", "issued_date": "2023-03-15", "expiry_date": "2026-03-15"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Data Scientist - Analytics",
                    "product_vendor": "Snowflake",
                    "product_type": "Snowflake Data Cloud",
                    "job_role": "Data Analyst",
                    "years_of_experience": 5,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 125000.0,
                    "salary_max": 165000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_GREEN_CARD,
                    "ethnicity": "Hispanic",
                    "availability_date": "2 weeks",
                    "profile_summary": "Data scientist specializing in predictive modeling and analytics.",
                    "skills": [
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "R", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "SQL", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Machine Learning", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Statistical Analysis", "skill_category": "functional", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Chicago", "state": "Illinois", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 5: Aisha Patel
        {
            "email": "aisha.patel@email.com",
            "full_name": "Aisha Patel",
            "phone": "+1 (555) 205-0005",
            "address": "890 Security Street, Washington, DC 20001",
            "state": "District of Columbia",
            "county": "Washington",
            "zipcode": "20001",
            "linkedin": "https://linkedin.com/in/aisha-patel-security",
            "github": "https://github.com/aishapatel",
            "summary": "Cybersecurity Engineer with 6 years of experience in penetration testing, security auditing, and incident response. CISSP certified professional.",
            "certifications": [
                {"name": "CISSP - Certified Information Systems Security Professional", "issuer": "ISC2", "issued_date": "2022-08-20", "expiry_date": "2025-08-20"},
                {"name": "CEH - Certified Ethical Hacker", "issuer": "EC-Council", "issued_date": "2021-05-10", "expiry_date": "2024-05-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior Security Engineer",
                    "product_vendor": "AWS",
                    "product_type": "General",
                    "job_role": "Security Engineer",
                    "years_of_experience": 6,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 135000.0,
                    "salary_max": 175000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Cybersecurity expert seeking challenging security architecture roles.",
                    "skills": [
                        {"skill_name": "Penetration Testing", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Network Security", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "SIEM", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Incident Response", "skill_category": "functional", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Washington", "state": "District of Columbia", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 6: Ryan O'Brien
        {
            "email": "ryan.obrien@email.com",
            "full_name": "Ryan O'Brien",
            "phone": "+1 (555) 206-0006",
            "address": "234 Mobile Ave, Portland, OR 97201",
            "state": "Oregon",
            "county": "Multnomah",
            "zipcode": "97201",
            "linkedin": "https://linkedin.com/in/ryan-obrien-ios",
            "github": "https://github.com/ryanobrien",
            "summary": "iOS Developer with 5 years of experience building native mobile applications. Specialized in SwiftUI and mobile architecture patterns.",
            "certifications": [],
            "job_profiles": [
                {
                    "profile_name": "Senior iOS Developer",
                    "product_vendor": "General",
                    "product_type": "Mobile Development",
                    "job_role": "iOS Developer",
                    "years_of_experience": 5,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 130000.0,
                    "salary_max": 170000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Caucasian",
                    "availability_date": "2 weeks",
                    "profile_summary": "iOS developer passionate about creating delightful mobile experiences.",
                    "skills": [
                        {"skill_name": "Swift", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "SwiftUI", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "UIKit", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Core Data", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 7: Meilin Huang
        {
            "email": "meilin.huang@email.com",
            "full_name": "Meilin Huang",
            "phone": "+1 (555) 207-0007",
            "address": "678 Product Lane, San Diego, CA 92101",
            "state": "California",
            "county": "San Diego",
            "zipcode": "92101",
            "linkedin": "https://linkedin.com/in/meilin-huang-pm",
            "summary": "Product Manager with 7 years of experience leading cross-functional teams to deliver innovative software products. Strong technical background with MBA.",
            "certifications": [
                {"name": "Certified Scrum Product Owner", "issuer": "Scrum Alliance", "issued_date": "2022-04-15", "expiry_date": "2025-04-15"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior Product Manager",
                    "product_vendor": "General",
                    "product_type": "Product Management",
                    "job_role": "Product Manager",
                    "years_of_experience": 7,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 145000.0,
                    "salary_max": 185000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Experienced PM seeking B2B SaaS product leadership roles.",
                    "skills": [
                        {"skill_name": "Product Strategy", "skill_category": "functional", "proficiency_level": 5},
                        {"skill_name": "Agile/Scrum", "skill_category": "soft", "proficiency_level": 5},
                        {"skill_name": "User Research", "skill_category": "functional", "proficiency_level": 4},
                        {"skill_name": "Analytics", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Stakeholder Management", "skill_category": "soft", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "San Diego", "state": "California", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 8: Kwame Mensah
        {
            "email": "kwame.mensah@email.com",
            "full_name": "Kwame Mensah",
            "phone": "+1 (555) 208-0008",
            "address": "901 Blockchain Blvd, Miami, FL 33101",
            "state": "Florida",
            "county": "Miami-Dade",
            "zipcode": "33101",
            "linkedin": "https://linkedin.com/in/kwame-mensah-blockchain",
            "github": "https://github.com/kwamemensah",
            "summary": "Blockchain Developer with 4 years of experience in smart contract development and DeFi applications. Expert in Solidity and Web3 technologies.",
            "certifications": [
                {"name": "Certified Blockchain Developer", "issuer": "Blockchain Council", "issued_date": "2023-01-10", "expiry_date": "2026-01-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Blockchain Developer - DeFi",
                    "product_vendor": "General",
                    "product_type": "Web Development",
                    "job_role": "Backend Developer",
                    "years_of_experience": 4,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.CONTRACT,
                    "salary_min": 140000.0,
                    "salary_max": 180000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Black",
                    "availability_date": "2 weeks",
                    "profile_summary": "Blockchain developer specializing in DeFi protocols and smart contracts.",
                    "skills": [
                        {"skill_name": "Solidity", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Web3.js", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Ethereum", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Smart Contracts", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "JavaScript", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 9: Natasha Volkov
        {
            "email": "natasha.volkov@email.com",
            "full_name": "Natasha Volkov",
            "phone": "+1 (555) 209-0009",
            "address": "345 QA Street, Denver, CO 80201",
            "state": "Colorado",
            "county": "Denver",
            "zipcode": "80201",
            "linkedin": "https://linkedin.com/in/natasha-volkov-qa",
            "github": "https://github.com/natashavolkov",
            "summary": "QA Engineer with 6 years of experience in test automation, performance testing, and quality assurance. Expert in Selenium and Cypress.",
            "certifications": [
                {"name": "ISTQB Certified Tester", "issuer": "ISTQB", "issued_date": "2021-07-20", "expiry_date": "2024-07-20"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior QA Automation Engineer",
                    "product_vendor": "General",
                    "product_type": "Quality Assurance",
                    "job_role": "QA Automation Engineer",
                    "years_of_experience": 6,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 110000.0,
                    "salary_max": 145000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_GREEN_CARD,
                    "ethnicity": "Caucasian",
                    "availability_date": "3 weeks",
                    "profile_summary": "QA automation expert focused on building robust testing frameworks.",
                    "skills": [
                        {"skill_name": "Selenium", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Cypress", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Java", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Test Strategy", "skill_category": "functional", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Denver", "state": "Colorado", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 10: Raj Krishnamurthy
        {
            "email": "raj.krishnamurthy@email.com",
            "full_name": "Raj Krishnamurthy",
            "phone": "+1 (555) 210-0010",
            "address": "567 Java Lane, Atlanta, GA 30301",
            "state": "Georgia",
            "county": "Fulton",
            "zipcode": "30301",
            "linkedin": "https://linkedin.com/in/raj-krishnamurthy-java",
            "github": "https://github.com/rajkrishnamurthy",
            "summary": "Senior Java Developer with 9 years of experience in enterprise application development. Expert in Spring Boot, microservices, and cloud-native architectures.",
            "certifications": [
                {"name": "Oracle Certified Professional Java SE 11 Developer", "issuer": "Oracle", "issued_date": "2022-10-15", "expiry_date": "2025-10-15"},
                {"name": "Spring Professional Certification", "issuer": "Pivotal", "issued_date": "2023-02-20", "expiry_date": "2026-02-20"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior Java Developer",
                    "product_vendor": "General",
                    "product_type": "Web Development",
                    "job_role": "Backend Developer",
                    "years_of_experience": 9,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 135000.0,
                    "salary_max": 175000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "Experienced Java architect seeking senior backend engineering roles.",
                    "skills": [
                        {"skill_name": "Java", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Spring Boot", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Microservices", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "PostgreSQL", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "AWS", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Atlanta", "state": "Georgia", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 11: Bhavana Bayya (bhavanabayya13@gmail.com)
        {
            "email": "bhavanabayya13@gmail.com",
            "full_name": "Bhavana Bayya",
            "phone": "+1 (555) 301-1001",
            "address": "123 Tech Park, Hyderabad, Telangana",
            "state": "Telangana",
            "county": "Hyderabad",
            "zipcode": "500081",
            "linkedin": "https://linkedin.com/in/bhavanabayya",
            "github": "https://github.com/bhavanabayya",
            "summary": "Full Stack Developer with 4 years of experience in Python, React, and cloud technologies. Passionate about building scalable web applications.",
            "certifications": [
                {"name": "AWS Certified Developer Associate", "issuer": "Amazon", "issued_date": "2022-08-15", "expiry_date": "2025-08-15"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Python Backend Developer",
                    "product_vendor": "General",
                    "product_type": "Web Development",
                    "job_role": "Backend Developer",
                    "years_of_experience": 4,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 95000.0,
                    "salary_max": 130000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "2 weeks",
                    "profile_summary": "Backend specialist with strong Python and FastAPI experience.",
                    "skills": [
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "FastAPI", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "PostgreSQL", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "React", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Docker", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 12: Kutty Bayya (kuttybayya@gmail.com)
        {
            "email": "kuttybayya@gmail.com",
            "full_name": "Kutty Bayya",
            "phone": "+91-9876543210",
            "address": "456 Innovation Drive, Bangalore, Karnataka",
            "state": "Karnataka",
            "county": "Bangalore",
            "zipcode": "560001",
            "linkedin": "https://linkedin.com/in/kuttybayya",
            "github": "https://github.com/kuttybayya",
            "summary": "Frontend Developer with 5 years of experience in React, TypeScript, and modern web technologies. Specialized in building responsive user interfaces.",
            "certifications": [],
            "job_profiles": [
                {
                    "profile_name": "Senior React Developer",
                    "product_vendor": "General",
                    "product_type": "Web Development",
                    "job_role": "Frontend Developer",
                    "years_of_experience": 5,
                    "worktype": WorkType.REMOTE,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 100000.0,
                    "salary_max": 135000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "1 month",
                    "profile_summary": "React specialist focused on building performant web applications.",
                    "skills": [
                        {"skill_name": "React", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "TypeScript", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "JavaScript", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "CSS", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Next.js", "skill_category": "technical", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 13: Bhavs Bayya (bhavsbayya@gmail.com)
        {
            "email": "bhavsbayya@gmail.com",
            "full_name": "Bhavs Bayya",
            "phone": "+1 (555) 303-1003",
            "address": "789 Digital Avenue, Phoenix, AZ 85001",
            "state": "Arizona",
            "county": "Maricopa",
            "zipcode": "85001",
            "linkedin": "https://linkedin.com/in/bhavsbayya",
            "github": "https://github.com/bhavsbayya",
            "summary": "Cloud Architect with 7 years of experience designing and implementing scalable cloud solutions. Expert in AWS, Azure, and multi-cloud strategies.",
            "certifications": [
                {"name": "AWS Certified Solutions Architect Professional", "issuer": "Amazon", "issued_date": "2023-04-20", "expiry_date": "2026-04-20"},
                {"name": "Azure Solutions Architect Expert", "issuer": "Microsoft", "issued_date": "2022-11-10", "expiry_date": "2025-11-10"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior Cloud Architect",
                    "product_vendor": "AWS",
                    "product_type": "General",
                    "job_role": "Cloud Solutions Architect",
                    "years_of_experience": 7,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 155000.0,
                    "salary_max": 200000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.US_CITIZEN,
                    "ethnicity": "Asian",
                    "availability_date": "2 weeks",
                    "profile_summary": "Cloud architect with expertise in multi-cloud solutions and migration strategies.",
                    "skills": [
                        {"skill_name": "AWS", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Azure", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Terraform", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Kubernetes", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Cloud Security", "skill_category": "technical", "proficiency_level": 5},
                    ],
                    "locations": [
                        {"city": "Phoenix", "state": "Arizona", "country": "USA"},
                        {"city": "Remote", "state": "Nationwide", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 14: Vallisiri Sista (vallisisira.sista@gmail.com)
        {
            "email": "vallisisira.sista@gmail.com",
            "full_name": "Vallisiri Sista",
            "phone": "+1 (555) 304-1004",
            "address": "234 Analytics Boulevard, Minneapolis, MN 55401",
            "state": "Minnesota",
            "county": "Hennepin",
            "zipcode": "55401",
            "linkedin": "https://linkedin.com/in/vallisirisista",
            "github": "https://github.com/vallisirisista",
            "summary": "Business Intelligence Analyst with 5 years of experience in data visualization, reporting, and analytics. Expert in Tableau, Power BI, and SQL.",
            "certifications": [
                {"name": "Tableau Desktop Specialist", "issuer": "Tableau", "issued_date": "2022-09-15", "expiry_date": "2025-09-15"},
                {"name": "Microsoft Power BI Data Analyst", "issuer": "Microsoft", "issued_date": "2023-01-20", "expiry_date": "2026-01-20"},
            ],
            "job_profiles": [
                {
                    "profile_name": "Senior BI Analyst",
                    "product_vendor": "Power BI",
                    "product_type": "Power BI Service",
                    "job_role": "BI Analyst",
                    "years_of_experience": 5,
                    "worktype": WorkType.HYBRID,
                    "employment_type": EmploymentType.FT,
                    "salary_min": 105000.0,
                    "salary_max": 140000.0,
                    "salary_currency": CurrencyType.USD,
                    "visa_status": VisaStatus.WORK_VISA,
                    "ethnicity": "Asian",
                    "availability_date": "3 weeks",
                    "profile_summary": "BI analyst focused on creating actionable insights through data visualization.",
                    "skills": [
                        {"skill_name": "Tableau", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Power BI", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "SQL", "skill_category": "technical", "proficiency_level": 5},
                        {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 4},
                        {"skill_name": "Data Modeling", "skill_category": "functional", "proficiency_level": 4},
                    ],
                    "locations": [
                        {"city": "Minneapolis", "state": "Minnesota", "country": "USA"},
                    ]
                }
            ]
        },
        
        # Candidate 15: Existing candidates (Sarah, Michael, David) - already in database
        # We'll skip these as they should already exist from reset_db_clean.py
    ]
    
    with Session(engine) as session:
        candidate_count = 0
        
        for candidate_data in candidates_data:
            print(f"\n[{candidate_count + 1}/12] Processing: {candidate_data['full_name']}")
            create_or_update_candidate(session, candidate_data)
            candidate_count += 1
        
        print("\n" + "=" * 80)
        print("[SUCCESS] SEED COMPLETE!")
        print("=" * 80)
        print(f"\n[*] Total candidates processed: {candidate_count}")
        print(f"[*] Plus 3 existing candidates (Sarah, Michael, David)")
        print(f"[*] Grand Total: {candidate_count + 3} candidates")
        print("\n[KEY] All passwords: Kutty_1304")
        print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
