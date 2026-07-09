"""
Seed 10 tech job postings for bhavana@rubislawinvest.com
=========================================================
Based on job preferences of:
  - kutty bayya (kuttybayya@gmail.com)      → Senior React Developer, Frontend, Remote, FT, $100k-$135k
  - bhavanabayya13@gmail.com                 → Python Backend Developer, Remote, FT, $95k-$130k
  - bhavsbayya@gmail.com                     → Senior Cloud Architect, AWS, Hybrid, FT, $155k-$200k
  - bayyakutty02@gmail.com                   → Full Stack, Backend API, React Frontend

Creates a Company profile for bhavana if missing, then inserts 10 job postings.

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python seed_bhavana_rubislaw_postings.py
"""

import sys
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import (
    User, Company, JobPosting, JobPostingStatus,
    WorkType, EmploymentType, CurrencyType,
)

TODAY = date.today()

def d(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


# ── 10 tech postings aligned to candidate job-profile preferences ─────────────

POSTINGS = [
    # ── REACT / FRONTEND (matches kuttybayya@gmail.com preferences) ──────────
    {
        "job_title": "Senior React Developer",
        "product_vendor": "General",
        "product_type": "Web Development",
        "job_role": "Frontend Developer",
        "seniority_level": "5-8 years",
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 105000.0,
        "salary_max": 140000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(14),
        "end_date": d(75),
        "job_description": (
            "We are looking for a Senior React Developer to join our growing product team. "
            "You will design and build scalable, high-performance React applications, collaborate "
            "with UX designers and backend engineers, and mentor junior developers. "
            "Strong expertise in React 18+, TypeScript, Redux Toolkit, React Query, and REST/GraphQL "
            "APIs is required. Experience with Vite, Jest, and CI/CD pipelines is a plus."
        ),
        "required_skills": '[{"skill":"React","category":"technical"},{"skill":"TypeScript","category":"technical"},{"skill":"Redux","category":"technical"},{"skill":"HTML/CSS","category":"technical"},{"skill":"REST APIs","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B",
        "travel_requirements": "None",
    },
    {
        "job_title": "React/TypeScript Frontend Engineer",
        "product_vendor": "General",
        "product_type": "Frontend Development",
        "job_role": "Frontend Developer",
        "seniority_level": "3-6 years",
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 100000.0,
        "salary_max": 130000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(21),
        "end_date": d(90),
        "job_description": (
            "Join our fintech platform team as a React/TypeScript Frontend Engineer. "
            "You will own end-to-end feature development in a fast-paced agile environment, "
            "building responsive and accessible web interfaces. Key skills: React, TypeScript, "
            "Tailwind CSS, Zustand, and strong unit/integration testing practices."
        ),
        "required_skills": '[{"skill":"React","category":"technical"},{"skill":"TypeScript","category":"technical"},{"skill":"Tailwind CSS","category":"technical"},{"skill":"Agile","category":"functional"}]',
        "visa_info": "US Citizen, Green Card",
        "travel_requirements": "None",
    },
    {
        "job_title": "Senior Frontend Developer (React + Next.js)",
        "product_vendor": "General",
        "product_type": "Web Development",
        "job_role": "Frontend Developer",
        "seniority_level": "4-7 years",
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "location": "Austin, TX",
        "salary_min": 110000.0,
        "salary_max": 145000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(28),
        "end_date": d(90),
        "job_description": (
            "We need a Senior Frontend Developer experienced with React and Next.js to lead "
            "our customer-facing portal redesign. Responsibilities include SSR/SSG architecture, "
            "performance optimization, and A/B testing frameworks. Experience with Next.js 14+, "
            "React Server Components, and Vercel deployments preferred."
        ),
        "required_skills": '[{"skill":"React","category":"technical"},{"skill":"Next.js","category":"technical"},{"skill":"TypeScript","category":"technical"},{"skill":"Performance Optimization","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B, OPT",
        "travel_requirements": "0-10%",
    },
    # ── PYTHON / BACKEND (matches bhavanabayya13@gmail.com preferences) ───────
    {
        "job_title": "Python Backend Developer",
        "product_vendor": "General",
        "product_type": "Backend Development",
        "job_role": "Backend Developer",
        "seniority_level": "3-6 years",
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 95000.0,
        "salary_max": 130000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(14),
        "end_date": d(80),
        "job_description": (
            "Seeking a Python Backend Developer to build and maintain RESTful APIs "
            "powering our SaaS platform. You will work with FastAPI/Django, PostgreSQL, "
            "Redis, and Celery task queues. Strong knowledge of async programming, SQLAlchemy, "
            "Docker, and cloud deployments (AWS or GCP) is required."
        ),
        "required_skills": '[{"skill":"Python","category":"technical"},{"skill":"FastAPI","category":"technical"},{"skill":"PostgreSQL","category":"technical"},{"skill":"Docker","category":"technical"},{"skill":"REST APIs","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B",
        "travel_requirements": "None",
    },
    {
        "job_title": "Python/FastAPI Engineer – Data Platform",
        "product_vendor": "General",
        "product_type": "Backend Development",
        "job_role": "Backend Developer",
        "seniority_level": "4-7 years",
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 105000.0,
        "salary_max": 138000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(21),
        "end_date": d(85),
        "job_description": (
            "We are building a real-time data platform and need a Python/FastAPI engineer. "
            "You will design high-throughput ingestion pipelines, write microservices, "
            "and work closely with the data science team. Must-have: Python 3.11+, FastAPI, "
            "Pydantic v2, Kafka or RabbitMQ, Alembic migrations, and containerised deployments."
        ),
        "required_skills": '[{"skill":"Python","category":"technical"},{"skill":"FastAPI","category":"technical"},{"skill":"Kafka","category":"technical"},{"skill":"Docker","category":"technical"},{"skill":"Data Pipelines","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B, OPT",
        "travel_requirements": "None",
    },
    {
        "job_title": "Backend API Developer (Django REST)",
        "product_vendor": "General",
        "product_type": "Web Development",
        "job_role": "Backend Developer",
        "seniority_level": "2-5 years",
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "location": "New York, NY",
        "salary_min": 95000.0,
        "salary_max": 125000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(30),
        "end_date": d(90),
        "job_description": (
            "Join our engineering team as a Backend API Developer building Django REST APIs "
            "for our legal-tech platform. You will implement authentication, role-based "
            "access control, payment integrations, and background task processing. "
            "Required: Django 4+, DRF, PostgreSQL, Celery, Redis, and solid SQL query skills."
        ),
        "required_skills": '[{"skill":"Python","category":"technical"},{"skill":"Django","category":"technical"},{"skill":"PostgreSQL","category":"technical"},{"skill":"REST APIs","category":"technical"},{"skill":"Redis","category":"technical"}]',
        "visa_info": "US Citizen, Green Card",
        "travel_requirements": "0-10%",
    },
    # ── FULL STACK (matches bayyakutty02@gmail.com preferences) ─────────────
    {
        "job_title": "Senior Full Stack Engineer (React + Python)",
        "product_vendor": "General",
        "product_type": "Web Development",
        "job_role": "Full Stack Developer",
        "seniority_level": "5-8 years",
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 120000.0,
        "salary_max": 160000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(14),
        "end_date": d(75),
        "job_description": (
            "Looking for a Senior Full Stack Engineer to lead feature development across "
            "our React frontend and Python/FastAPI backend. You will drive technical decisions, "
            "mentor junior engineers, and own entire product features from design to deployment. "
            "Strong experience in React 18, TypeScript, Python 3.11+, FastAPI, PostgreSQL, "
            "Docker, and AWS required."
        ),
        "required_skills": '[{"skill":"React","category":"technical"},{"skill":"Python","category":"technical"},{"skill":"FastAPI","category":"technical"},{"skill":"TypeScript","category":"technical"},{"skill":"PostgreSQL","category":"technical"},{"skill":"AWS","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B",
        "travel_requirements": "None",
    },
    {
        "job_title": "Full Stack Developer (Node.js + React)",
        "product_vendor": "General",
        "product_type": "Web Development",
        "job_role": "Full Stack Developer",
        "seniority_level": "3-6 years",
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "location": "Chicago, IL",
        "salary_min": 115000.0,
        "salary_max": 150000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(21),
        "end_date": d(80),
        "job_description": (
            "We need a Full Stack Developer to build and iterate on our investment analytics dashboard. "
            "Frontend work in React/TypeScript and backend APIs in Node.js/Express with PostgreSQL. "
            "Experience with WebSockets for real-time data, Jest testing, and AWS deployments preferred."
        ),
        "required_skills": '[{"skill":"React","category":"technical"},{"skill":"Node.js","category":"technical"},{"skill":"TypeScript","category":"technical"},{"skill":"PostgreSQL","category":"technical"},{"skill":"AWS","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B, OPT",
        "travel_requirements": "0-10%",
    },
    # ── CLOUD / AWS (matches bhavsbayya@gmail.com preferences) ───────────────
    {
        "job_title": "Senior AWS Cloud Solutions Architect",
        "product_vendor": "AWS",
        "product_type": "Cloud Infrastructure",
        "job_role": "Cloud Solutions Architect",
        "seniority_level": "6-10 years",
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "location": "Dallas, TX",
        "salary_min": 155000.0,
        "salary_max": 200000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(30),
        "end_date": d(90),
        "job_description": (
            "Seeking a Senior AWS Cloud Solutions Architect to design and oversee our "
            "enterprise cloud transformation. Responsibilities include architecting multi-region "
            "HA solutions, cost optimisation, security compliance (SOC 2, ISO 27001), and "
            "guiding development teams on cloud-native best practices. AWS Solutions Architect "
            "Professional certification strongly preferred."
        ),
        "required_skills": '[{"skill":"AWS","category":"technical"},{"skill":"Terraform","category":"technical"},{"skill":"Cloud Architecture","category":"technical"},{"skill":"Security","category":"technical"},{"skill":"Cost Optimization","category":"functional"}]',
        "visa_info": "US Citizen, Green Card, H1B",
        "travel_requirements": "10-25%",
    },
    {
        "job_title": "Cloud Infrastructure Engineer (AWS/DevOps)",
        "product_vendor": "AWS",
        "product_type": "Cloud Infrastructure",
        "job_role": "Cloud Architect",
        "seniority_level": "4-8 years",
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "location": "Remote, USA",
        "salary_min": 140000.0,
        "salary_max": 185000.0,
        "salary_currency": CurrencyType.USD,
        "pay_type": "annually",
        "start_date": d(21),
        "end_date": d(85),
        "job_description": (
            "Join as a Cloud Infrastructure Engineer building and automating our AWS infrastructure. "
            "You will manage ECS/EKS clusters, design CI/CD pipelines with GitHub Actions, "
            "implement IaC with Terraform and CDK, and ensure 99.9%+ uptime SLAs. "
            "Required: AWS (ECS, RDS, VPC, IAM, CloudWatch), Terraform, Kubernetes, Python scripting, "
            "and strong incident-response experience."
        ),
        "required_skills": '[{"skill":"AWS","category":"technical"},{"skill":"Terraform","category":"technical"},{"skill":"Kubernetes","category":"technical"},{"skill":"Docker","category":"technical"},{"skill":"CI/CD","category":"technical"},{"skill":"Python","category":"technical"}]',
        "visa_info": "US Citizen, Green Card, H1B, OPT",
        "travel_requirements": "0-10%",
    },
]


def run():
    with Session(engine) as session:
        # ── 1. Get the recruiter user ─────────────────────────────────────────
        user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()

        if not user:
            print("ERROR: bhavana@rubislawinvest.com not found in the database.")
            return

        print(f"Found user: {user.full_name} (ID: {user.id}, Role: {user.role})")

        # ── 2. Create Company profile if missing ──────────────────────────────
        company = session.exec(
            select(Company).where(Company.user_id == user.id)
        ).first()

        if not company:
            company = Company(
                user_id=user.id,
                company_name="Rubis Law Invest",
                company_email="bhavana@rubislawinvest.com",
                employee_type="Recruiter",
                company_website="https://www.rubislawinvest.com",
                company_location="New York, NY",
                department="Technology Talent Acquisition",
                phone_number="+1 212-555-0198",
                hiring_focus='["Software Engineering","Cloud Engineering","Full Stack Development","Frontend Development","Backend Development"]',
                company_description=(
                    "Rubis Law Invest is a technology-forward investment and legal services firm "
                    "actively growing its engineering team. We hire top-tier software, cloud, and "
                    "full-stack talent to build the next generation of our fintech and legal-tech platforms."
                ),
                profile_complete=True,
            )
            session.add(company)
            session.commit()
            session.refresh(company)
            print(f"[+] Created Company profile: {company.company_name} (ID: {company.id})")
        else:
            print(f"[i] Company profile already exists: {company.company_name} (ID: {company.id})")

        # ── 3. Insert 10 job postings ─────────────────────────────────────────
        created = 0
        for p in POSTINGS:
            # Avoid exact duplicates on title + company
            existing = session.exec(
                select(JobPosting).where(
                    JobPosting.company_id == company.id,
                    JobPosting.job_title == p["job_title"],
                )
            ).first()

            if existing:
                print(f"  [i] Already exists: {p['job_title']}")
                continue

            posting = JobPosting(
                company_id=company.id,
                job_title=p["job_title"],
                product_vendor=p["product_vendor"],
                product_type=p["product_type"],
                job_role=p["job_role"],
                seniority_level=p["seniority_level"],
                worktype=p["worktype"],
                location=p["location"],
                employment_type=p["employment_type"],
                start_date=p["start_date"],
                end_date=p.get("end_date"),
                salary_min=p["salary_min"],
                salary_max=p["salary_max"],
                salary_currency=p["salary_currency"],
                pay_type=p.get("pay_type", "annually"),
                job_description=p["job_description"],
                required_skills=p.get("required_skills"),
                visa_info=p.get("visa_info"),
                travel_requirements=p.get("travel_requirements"),
                status=JobPostingStatus.ACTIVE,
                is_active=True,
            )
            session.add(posting)
            created += 1
            print(f"  [+] Created: {p['job_title']}")

        session.commit()
        print(f"\nDone — {created} new job posting(s) created for {company.company_name}.")


if __name__ == "__main__":
    run()
