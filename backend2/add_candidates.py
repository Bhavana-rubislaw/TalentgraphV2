"""
Add 10 New Candidates to TalentGraph V2
========================================
Adds 10 diverse candidates with 2 job profiles each (20 total profiles)
Each profile has skills, location preferences, and certifications.
All passwords: Kutty_1304

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python add_candidates.py
"""

import sys
from pathlib import Path
from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import (
    User, UserRole, Candidate, JobProfile, Skill, LocationPreference,
    Certification, WorkType, EmploymentType, VisaStatus, CurrencyType
)
from app.security import hash_password

SEED_PASSWORD = "Kutty_1304"

NEW_CANDIDATES = [
    # ── 1. Emily Zhang ─────────────────────────────────
    {
        "email": "emily.zhang@email.com",
        "full_name": "Emily Zhang",
        "phone": "+1 (555) 201-1001",
        "residential_address": "101 Market St, San Jose, CA 95113",
        "location_state": "California",
        "location_county": "Santa Clara",
        "location_zipcode": "95113",
        "linkedin_url": "https://linkedin.com/in/emily-zhang-oracle",
        "profile_summary": "Oracle Fusion SCM expert with 7 years of supply chain and procurement implementations across manufacturing and retail.",
        "certifications": [
            {"name": "Oracle SCM Cloud Implementation Specialist", "issuer": "Oracle", "issued_date": "2023-03-10", "expiry_date": "2026-03-10"},
            {"name": "Oracle Procurement Cloud Certified", "issuer": "Oracle", "issued_date": "2022-09-05", "expiry_date": "2025-09-05"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle SCM - Supply Chain Lead",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 7,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 170.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Asian",
                "availability_date": "2 weeks",
                "profile_summary": "Supply Chain Cloud lead consultant for end-to-end implementations.",
                "skills": [
                    {"skill_name": "Oracle SCM Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Procurement Cloud", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Inventory Management", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Order Management", "skill_category": "functional", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "San Jose", "state": "California", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Fusion - Procurement Specialist",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 7,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Asian",
                "availability_date": "Immediately",
                "profile_summary": "Procurement Cloud specialist with expertise in sourcing, purchasing, and supplier management.",
                "skills": [
                    {"skill_name": "Oracle Procurement Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Supplier Portal", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Self-Service Procurement", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "San Francisco", "state": "California", "country": "USA"},
                    {"city": "San Jose", "state": "California", "country": "USA"},
                ]
            }
        ]
    },
    # ── 2. James Wilson ────────────────────────────────
    {
        "email": "james.wilson@email.com",
        "full_name": "James Wilson",
        "phone": "+1 (555) 202-2002",
        "residential_address": "200 Peachtree St, Atlanta, GA 30303",
        "location_state": "Georgia",
        "location_county": "Fulton",
        "location_zipcode": "30303",
        "linkedin_url": "https://linkedin.com/in/james-wilson-oracle",
        "profile_summary": "Oracle HCM functional consultant with 5 years of Core HR, Benefits, and Absence Management experience in healthcare and banking sectors.",
        "certifications": [
            {"name": "Oracle HCM Cloud Certified Implementation Specialist", "issuer": "Oracle", "issued_date": "2023-05-20", "expiry_date": "2026-05-20"},
            {"name": "Oracle Benefits Cloud Certified", "issuer": "Oracle", "issued_date": "2022-11-10", "expiry_date": "2025-11-10"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle HCM - Core HR Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "years_of_experience": 5,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 110.0, "salary_max": 145.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "African American",
                "availability_date": "Immediately",
                "profile_summary": "Core HR implementation consultant for mid-to-large enterprises.",
                "skills": [
                    {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Core HR", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Benefits Administration", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Absence Management", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "HSDL", "skill_category": "technical", "proficiency_level": 3},
                ],
                "locations": [
                    {"city": "Atlanta", "state": "Georgia", "country": "USA"},
                    {"city": "Charlotte", "state": "North Carolina", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle HCM - Benefits & Payroll",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Payroll Cloud Consultant",
                "years_of_experience": 5,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "African American",
                "availability_date": "2 weeks",
                "profile_summary": "Payroll and Benefits specialist available for remote engagements.",
                "skills": [
                    {"skill_name": "Oracle Payroll Cloud", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Benefits Cloud", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Fast Formulas", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Payroll Compliance", "skill_category": "functional", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
    # ── 3. Priya Sharma ────────────────────────────────
    {
        "email": "priya.sharma@email.com",
        "full_name": "Priya Sharma",
        "phone": "+1 (555) 203-3003",
        "residential_address": "500 Boylston St, Boston, MA 02116",
        "location_state": "Massachusetts",
        "location_county": "Suffolk",
        "location_zipcode": "02116",
        "linkedin_url": "https://linkedin.com/in/priya-sharma-erp",
        "profile_summary": "Oracle Fusion Financials architect with 9 years of GL, AP, AR, and Fixed Assets implementations. Led 12+ go-lives for Fortune 500 clients.",
        "certifications": [
            {"name": "Oracle Financials Cloud Certified Implementation Specialist", "issuer": "Oracle", "issued_date": "2023-01-15", "expiry_date": "2026-01-15"},
            {"name": "CPA - Certified Public Accountant", "issuer": "AICPA", "issued_date": "2020-06-01", "expiry_date": "2025-06-01"},
            {"name": "Oracle Cloud Infrastructure Foundations", "issuer": "Oracle", "issued_date": "2023-07-20", "expiry_date": "2026-07-20"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle Fusion Financials - Lead Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 9,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 150.0, "salary_max": 195.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_GREEN_CARD,
                "ethnicity": "South Asian",
                "availability_date": "1 month",
                "profile_summary": "Lead architect for Oracle Fusion Financials with GL/AP/AR specialization.",
                "skills": [
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Accounts Payable/Receivable", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Fixed Assets", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 5},
                ],
                "locations": [
                    {"city": "Boston", "state": "Massachusetts", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle ERP - Financial Integration",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "years_of_experience": 9,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 160000.0, "salary_max": 210000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_GREEN_CARD,
                "ethnicity": "South Asian",
                "availability_date": "2 weeks",
                "profile_summary": "Financial integration architect - Oracle Integration Cloud, FBDI, REST APIs.",
                "skills": [
                    {"skill_name": "Oracle Integration Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "FBDI", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Boston", "state": "Massachusetts", "country": "USA"},
                    {"city": "New York", "state": "New York", "country": "USA"},
                ]
            }
        ]
    },
    # ── 4. Carlos Rodriguez ────────────────────────────
    {
        "email": "carlos.rodriguez@email.com",
        "full_name": "Carlos Rodriguez",
        "phone": "+1 (555) 204-4004",
        "residential_address": "300 Biscayne Blvd, Miami, FL 33131",
        "location_state": "Florida",
        "location_county": "Miami-Dade",
        "location_zipcode": "33131",
        "linkedin_url": "https://linkedin.com/in/carlos-rodriguez-oracle",
        "profile_summary": "Bilingual Oracle EBS & Fusion migration consultant with 8 years of experience helping companies move from EBS to Cloud. Expert in data migration and change management.",
        "certifications": [
            {"name": "Oracle EBS R12 Certified Implementation Specialist", "issuer": "Oracle", "issued_date": "2019-04-15", "expiry_date": "2025-04-15"},
            {"name": "Oracle Fusion Cloud Migration Certified", "issuer": "Oracle", "issued_date": "2023-08-01", "expiry_date": "2026-08-01"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle EBS to Cloud Migration Lead",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 8,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 135.0, "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Hispanic",
                "availability_date": "Immediately",
                "profile_summary": "Oracle EBS to Fusion Cloud migration specialist. End-to-end data migration and cutover planning.",
                "skills": [
                    {"skill_name": "Oracle EBS", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Data Migration", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "FBDI", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Change Management", "skill_category": "soft", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Miami", "state": "Florida", "country": "USA"},
                    {"city": "Orlando", "state": "Florida", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle EBS - Supply Chain Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Supply Chain Consultant",
                "years_of_experience": 8,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Hispanic",
                "availability_date": "2 weeks",
                "profile_summary": "Oracle EBS Supply Chain consultant covering Inventory, PO, and WMS modules.",
                "skills": [
                    {"skill_name": "Oracle EBS", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Inventory Management", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Purchasing", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Warehouse Management", "skill_category": "functional", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
    # ── 5. Aisha Patel ─────────────────────────────────
    {
        "email": "aisha.patel@email.com",
        "full_name": "Aisha Patel",
        "phone": "+1 (555) 205-5005",
        "residential_address": "700 Congress Ave, Austin, TX 78701",
        "location_state": "Texas",
        "location_county": "Travis",
        "location_zipcode": "78701",
        "linkedin_url": "https://linkedin.com/in/aisha-patel-hcm",
        "profile_summary": "Oracle HCM Cloud and Talent Management specialist with 6 years of experience. Deep expertise in recruiting, onboarding, and performance management modules.",
        "certifications": [
            {"name": "Oracle Talent Management Cloud Certified", "issuer": "Oracle", "issued_date": "2023-02-20", "expiry_date": "2026-02-20"},
            {"name": "Oracle HCM Cloud Implementation Specialist", "issuer": "Oracle", "issued_date": "2022-06-10", "expiry_date": "2025-06-10"},
            {"name": "PHR - Professional in Human Resources", "issuer": "HRCI", "issued_date": "2021-09-01", "expiry_date": "2024-09-01"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle HCM - Talent Management Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Talent Management Consultant",
                "years_of_experience": 6,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_VISA,
                "ethnicity": "South Asian",
                "availability_date": "Immediately",
                "profile_summary": "Talent Management lead with recruiting, onboarding, performance expertise.",
                "skills": [
                    {"skill_name": "Oracle Talent Management", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Recruiting Cloud", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Performance Management", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Onboarding", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Learning Cloud", "skill_category": "functional", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Austin", "state": "Texas", "country": "USA"},
                    {"city": "Dallas", "state": "Texas", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle HCM - Workforce Analytics",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "years_of_experience": 6,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.FT,
                "salary_min": 120000.0, "salary_max": 160000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_VISA,
                "ethnicity": "South Asian",
                "availability_date": "1 month",
                "profile_summary": "Workforce analytics and planning using Oracle HCM Cloud.",
                "skills": [
                    {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Workforce Analytics", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "BIP Reporting", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
    # ── 6. Ryan O'Brien ────────────────────────────────
    {
        "email": "ryan.obrien@email.com",
        "full_name": "Ryan O'Brien",
        "phone": "+1 (555) 206-6006",
        "residential_address": "900 N Michigan Ave, Chicago, IL 60611",
        "location_state": "Illinois",
        "location_county": "Cook",
        "location_zipcode": "60611",
        "linkedin_url": "https://linkedin.com/in/ryan-obrien-dba",
        "profile_summary": "Oracle DBA and cloud migration architect with 12 years of experience. Specialized in Exadata, OCI database services, and zero-downtime migrations.",
        "certifications": [
            {"name": "Oracle Database Administration 2019 Certified Professional", "issuer": "Oracle", "issued_date": "2019-07-15", "expiry_date": "2025-07-15"},
            {"name": "Oracle Cloud Infrastructure 2023 Architect Professional", "issuer": "Oracle", "issued_date": "2023-03-01", "expiry_date": "2026-03-01"},
            {"name": "Oracle Exadata Database Machine Certified Expert", "issuer": "Oracle", "issued_date": "2021-10-10", "expiry_date": "2024-10-10"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle DBA - Cloud Migration Architect",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud DBA",
                "years_of_experience": 12,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 155.0, "salary_max": 200.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Caucasian",
                "availability_date": "2 weeks",
                "profile_summary": "Cloud migration architect specializing in OCI database services and zero-downtime migrations.",
                "skills": [
                    {"skill_name": "Oracle Cloud Infrastructure", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Autonomous Database", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Database Migration", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle Exadata", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle RAC", "skill_category": "technical", "proficiency_level": 5},
                ],
                "locations": [
                    {"city": "Chicago", "state": "Illinois", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle DBA - Performance Tuning Expert",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "years_of_experience": 12,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.FT,
                "salary_min": 170000.0, "salary_max": 220000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "Caucasian",
                "availability_date": "1 month",
                "profile_summary": "Senior DBA focused on performance tuning for large-scale Oracle databases.",
                "skills": [
                    {"skill_name": "Performance Tuning", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle Database", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Data Guard", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 5},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
    # ── 7. Mei-Lin Huang ───────────────────────────────
    {
        "email": "meilin.huang@email.com",
        "full_name": "Mei-Lin Huang",
        "phone": "+1 (555) 207-7007",
        "residential_address": "1200 4th Ave, Seattle, WA 98101",
        "location_state": "Washington",
        "location_county": "King",
        "location_zipcode": "98101",
        "linkedin_url": "https://linkedin.com/in/meilin-huang-oracle",
        "profile_summary": "Oracle Fusion ERP technical consultant with 7 years in reports, integrations, and extensions (RICE). Expert in VBCS, Oracle Integration Cloud, and BI Publisher.",
        "certifications": [
            {"name": "Oracle Integration Cloud Service Certified", "issuer": "Oracle", "issued_date": "2023-05-01", "expiry_date": "2026-05-01"},
            {"name": "Oracle Visual Builder Cloud Service Certified", "issuer": "Oracle", "issued_date": "2022-12-15", "expiry_date": "2025-12-15"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle Fusion - RICE Developer",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "years_of_experience": 7,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_GREEN_CARD,
                "ethnicity": "Asian",
                "availability_date": "Immediately",
                "profile_summary": "RICE developer for Oracle Fusion Cloud - reports, integrations, conversions, extensions.",
                "skills": [
                    {"skill_name": "Oracle Integration Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "VBCS", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "FBDI", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "BI Publisher", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Seattle", "state": "Washington", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Fusion - Integration Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "years_of_experience": 7,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 140000.0, "salary_max": 185000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_GREEN_CARD,
                "ethnicity": "Asian",
                "availability_date": "3 weeks",
                "profile_summary": "Integration architect for complex multi-system Oracle Fusion environments.",
                "skills": [
                    {"skill_name": "Oracle Integration Cloud", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Cloud Architecture", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Seattle", "state": "Washington", "country": "USA"},
                    {"city": "Portland", "state": "Oregon", "country": "USA"},
                ]
            }
        ]
    },
    # ── 8. Kwame Mensah ────────────────────────────────
    {
        "email": "kwame.mensah@email.com",
        "full_name": "Kwame Mensah",
        "phone": "+1 (555) 208-8008",
        "residential_address": "1500 K St NW, Washington, DC 20005",
        "location_state": "District of Columbia",
        "location_county": "Washington",
        "location_zipcode": "20005",
        "linkedin_url": "https://linkedin.com/in/kwame-mensah-oracle",
        "profile_summary": "Oracle Fusion PPM and Projects consultant with 5 years of experience in project accounting, grants management, and capital project tracking for government and public sector.",
        "certifications": [
            {"name": "Oracle Project Portfolio Management Cloud Certified", "issuer": "Oracle", "issued_date": "2023-06-01", "expiry_date": "2026-06-01"},
            {"name": "PMP - Project Management Professional", "issuer": "PMI", "issued_date": "2021-08-15", "expiry_date": "2024-08-15"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle PPM - Projects Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 5,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "African American",
                "availability_date": "2 weeks",
                "profile_summary": "PPM and project accounting consultant for government and public sector.",
                "skills": [
                    {"skill_name": "Oracle PPM Cloud", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Project Accounting", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Grants Management", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Washington", "state": "District of Columbia", "country": "USA"},
                    {"city": "Baltimore", "state": "Maryland", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Fusion - Finance & Projects",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 5,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "African American",
                "availability_date": "Immediately",
                "profile_summary": "Cross-functional consultant for Financials and PPM Cloud.",
                "skills": [
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Project Accounting", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
    # ── 9. Natasha Volkov ──────────────────────────────
    {
        "email": "natasha.volkov@email.com",
        "full_name": "Natasha Volkov",
        "phone": "+1 (555) 209-9009",
        "residential_address": "800 Nicollet Mall, Minneapolis, MN 55402",
        "location_state": "Minnesota",
        "location_county": "Hennepin",
        "location_zipcode": "55402",
        "linkedin_url": "https://linkedin.com/in/natasha-volkov-oracle",
        "profile_summary": "Oracle EPM and planning consultant with 6 years specializing in PBCS, EPBCS, and Financial Consolidation. Strong analytics and reporting background.",
        "certifications": [
            {"name": "Oracle Enterprise Performance Management Cloud Certified", "issuer": "Oracle", "issued_date": "2023-04-10", "expiry_date": "2026-04-10"},
            {"name": "Oracle Financial Consolidation & Close Cloud Certified", "issuer": "Oracle", "issued_date": "2022-10-25", "expiry_date": "2025-10-25"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle EPM - Planning & Budgeting",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 6,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.WORK_VISA,
                "ethnicity": "Caucasian",
                "availability_date": "Immediately",
                "profile_summary": "Oracle EPBCS planning, budgeting, and forecasting consultant.",
                "skills": [
                    {"skill_name": "Oracle EPBCS", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Financial Planning", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "Budgeting & Forecasting", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "OTBI Reporting", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Minneapolis", "state": "Minnesota", "country": "USA"},
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Fusion - Financial Close & Consolidation",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 6,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 170.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.WORK_VISA,
                "ethnicity": "Caucasian",
                "availability_date": "3 weeks",
                "profile_summary": "Financial close and consolidation specialist for month-end/year-end processes.",
                "skills": [
                    {"skill_name": "Oracle FCCS", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Financial Consolidation", "skill_category": "functional", "proficiency_level": 5},
                    {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Minneapolis", "state": "Minnesota", "country": "USA"},
                    {"city": "Chicago", "state": "Illinois", "country": "USA"},
                ]
            }
        ]
    },
    # ── 10. Raj Krishnamurthy ──────────────────────────
    {
        "email": "raj.krishnamurthy@email.com",
        "full_name": "Raj Krishnamurthy",
        "phone": "+1 (555) 210-1010",
        "residential_address": "2001 Ross Ave, Dallas, TX 75201",
        "location_state": "Texas",
        "location_county": "Dallas",
        "location_zipcode": "75201",
        "linkedin_url": "https://linkedin.com/in/raj-krishnamurthy-oracle",
        "github_url": "https://github.com/rajk-oracle",
        "profile_summary": "Full-stack Oracle consultant with 10 years covering Fusion Financials, HCM, and integrations. Experienced project manager who has led $5M+ implementations end-to-end.",
        "certifications": [
            {"name": "Oracle Financials Cloud Certified Implementation Specialist", "issuer": "Oracle", "issued_date": "2022-01-10", "expiry_date": "2025-01-10"},
            {"name": "Oracle HCM Cloud Implementation Specialist", "issuer": "Oracle", "issued_date": "2022-06-20", "expiry_date": "2025-06-20"},
            {"name": "PMP - Project Management Professional", "issuer": "PMI", "issued_date": "2020-03-15", "expiry_date": "2023-03-15"},
            {"name": "Oracle Integration Cloud Service Certified", "issuer": "Oracle", "issued_date": "2023-09-01", "expiry_date": "2026-09-01"},
        ],
        "job_profiles": [
            {
                "profile_name": "Oracle Fusion - Program Manager",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "years_of_experience": 10,
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 175000.0, "salary_max": 225000.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "South Asian",
                "availability_date": "1 month",
                "profile_summary": "Program manager for large-scale Oracle Fusion implementations covering finance and HCM.",
                "skills": [
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Project Management", "skill_category": "soft", "proficiency_level": 5},
                    {"skill_name": "Stakeholder Communication", "skill_category": "soft", "proficiency_level": 5},
                    {"skill_name": "Oracle Integration Cloud", "skill_category": "technical", "proficiency_level": 4},
                ],
                "locations": [
                    {"city": "Dallas", "state": "Texas", "country": "USA"},
                    {"city": "Houston", "state": "Texas", "country": "USA"},
                ]
            },
            {
                "profile_name": "Oracle Fusion - Finance & HCM Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "years_of_experience": 10,
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 155.0, "salary_max": 200.0,
                "salary_currency": CurrencyType.USD,
                "visa_status": VisaStatus.US_CITIZEN,
                "ethnicity": "South Asian",
                "availability_date": "2 weeks",
                "profile_summary": "Cross-module lead for combined Oracle Financials and HCM implementations.",
                "skills": [
                    {"skill_name": "Oracle HCM Cloud", "skill_category": "technical", "proficiency_level": 4},
                    {"skill_name": "Core HR", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Payroll", "skill_category": "functional", "proficiency_level": 4},
                    {"skill_name": "Oracle Fusion Financials", "skill_category": "technical", "proficiency_level": 5},
                    {"skill_name": "General Ledger", "skill_category": "functional", "proficiency_level": 5},
                ],
                "locations": [
                    {"city": "Remote", "state": "Nationwide", "country": "USA"},
                ]
            }
        ]
    },
]


def add_new_candidates():
    print("=" * 80)
    print("🌱 ADDING 10 NEW CANDIDATES TO TALENTGRAPH V2")
    print("=" * 80)

    with Session(engine) as session:
        created = 0
        for cdata in NEW_CANDIDATES:
            # Skip if email already exists
            existing = session.exec(select(User).where(User.email == cdata["email"])).first()
            if existing:
                print(f"  ⏭  Skipping {cdata['full_name']} – already exists")
                continue

            # User
            user = User(
                email=cdata["email"],
                full_name=cdata["full_name"],
                password_hash=hash_password(SEED_PASSWORD),
                role=UserRole.CANDIDATE,
                is_active=True,
            )
            session.add(user)
            session.flush()

            # Candidate
            candidate = Candidate(
                user_id=user.id,
                name=cdata["full_name"],
                email=cdata["email"],
                phone=cdata["phone"],
                residential_address=cdata["residential_address"],
                location_state=cdata["location_state"],
                location_county=cdata["location_county"],
                location_zipcode=cdata["location_zipcode"],
                linkedin_url=cdata.get("linkedin_url"),
                github_url=cdata.get("github_url"),
                portfolio_url=cdata.get("portfolio_url"),
                profile_summary=cdata["profile_summary"],
            )
            session.add(candidate)
            session.flush()

            # Certifications
            for cert_data in cdata.get("certifications", []):
                cert = Certification(
                    candidate_id=candidate.id,
                    name=cert_data["name"],
                    issuer=cert_data.get("issuer"),
                    issued_date=cert_data.get("issued_date"),
                    expiry_date=cert_data.get("expiry_date"),
                )
                session.add(cert)

            # Job profiles + skills + locations
            for jp in cdata["job_profiles"]:
                profile = JobProfile(
                    candidate_id=candidate.id,
                    profile_name=jp["profile_name"],
                    product_vendor=jp["product_vendor"],
                    product_type=jp["product_type"],
                    job_role=jp["job_role"],
                    years_of_experience=jp["years_of_experience"],
                    worktype=jp["worktype"],
                    employment_type=jp["employment_type"],
                    salary_min=jp["salary_min"],
                    salary_max=jp["salary_max"],
                    salary_currency=jp["salary_currency"],
                    visa_status=jp["visa_status"],
                    ethnicity=jp.get("ethnicity"),
                    availability_date=jp.get("availability_date"),
                    profile_summary=jp.get("profile_summary"),
                )
                session.add(profile)
                session.flush()

                for sk in jp["skills"]:
                    session.add(Skill(
                        job_profile_id=profile.id,
                        skill_name=sk["skill_name"],
                        skill_category=sk["skill_category"],
                        proficiency_level=sk["proficiency_level"],
                    ))

                for loc in jp["locations"]:
                    session.add(LocationPreference(
                        job_profile_id=profile.id,
                        city=loc["city"],
                        state=loc["state"],
                        country=loc.get("country"),
                    ))

            created += 1
            print(f"  ✓ {cdata['full_name']} ({cdata['email']}) – {len(cdata['job_profiles'])} profiles, {len(cdata.get('certifications', []))} certs")

        session.commit()
        print(f"\n✅ Added {created} new candidates ({created * 2} job profiles)")
        print(f"🔑 Password: {SEED_PASSWORD}")


if __name__ == "__main__":
    add_new_candidates()
