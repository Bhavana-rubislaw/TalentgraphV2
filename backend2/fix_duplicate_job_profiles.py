"""
Fix duplicate job profiles for kuttybayya, bhavanabayya13, bhavsbayya.
Each candidate should have 3 DISTINCT job preferences.

bayyakutty02@gmail.com is already correct (Full Stack / Backend API / React Frontend).

Changes:
  kuttybayya@gmail.com       (Candidate 15)
    ID:21  → keep as-is: Senior React Developer
    ID:36  → rename to:  React Native Mobile Developer
    ID:50  → rename to:  Frontend Tech Lead

  bhavanabayya13@gmail.com   (Candidate 14)
    ID:20  → keep as-is: Python Backend Developer
    ID:35  → rename to:  Data Engineer
    ID:49  → rename to:  Platform / DevOps Engineer

  bhavsbayya@gmail.com       (Candidate 16)
    ID:37  → keep as-is: Senior Cloud Architect
    ID:51  → rename to:  Site Reliability Engineer (SRE)
    ID:22  → rename to:  DevSecOps Engineer
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import JobProfile, Skill, LocationPreference, WorkType, EmploymentType, CurrencyType, VisaStatus


def replace_skills(session: Session, profile_id: int, new_skills: list[dict]):
    """Delete existing skills for a profile and insert new ones."""
    old = session.exec(select(Skill).where(Skill.job_profile_id == profile_id)).all()
    for s in old:
        session.delete(s)
    session.flush()
    for s in new_skills:
        session.add(Skill(
            job_profile_id=profile_id,
            skill_name=s["name"],
            skill_category=s["category"],
            rating=s.get("rating", 8),
        ))


# ─── PROFILE UPDATE DEFINITIONS ──────────────────────────────────────────────

UPDATES = [
    # ══════════════════════════════════════════════════════════════════════════
    # kuttybayya@gmail.com  →  React Native Mobile Developer (ID 36)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 36,
        "profile_name": "React Native Mobile Developer",
        "product_vendor": "General",
        "product_type": "Mobile Development",
        "job_role": "Mobile Developer",
        "seniority_level": "3-6 years",
        "years_of_experience": 5,
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "salary_min": 100000.0,
        "salary_max": 135000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "profile_summary": (
            "Mobile-focused developer building cross-platform iOS and Android apps with "
            "React Native and Expo. Strong track record of shipping app-store products with "
            "offline-first design, push notifications, and smooth 60fps UX."
        ),
        "skills": [
            {"name": "React Native", "category": "technical", "rating": 9},
            {"name": "Expo", "category": "technical", "rating": 8},
            {"name": "TypeScript", "category": "technical", "rating": 8},
            {"name": "Redux Toolkit", "category": "technical", "rating": 7},
            {"name": "iOS/Android Development", "category": "technical", "rating": 7},
            {"name": "Push Notifications", "category": "technical", "rating": 7},
            {"name": "App Store Deployment", "category": "technical", "rating": 8},
            {"name": "Offline-First Design", "category": "technical", "rating": 7},
            {"name": "Mobile Testing", "category": "technical", "rating": 7},
            {"name": "UI/UX Attention to Detail", "category": "soft", "rating": 8},
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # kuttybayya@gmail.com  →  Frontend Tech Lead (ID 50)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 50,
        "profile_name": "Frontend Tech Lead",
        "product_vendor": "General",
        "product_type": "Frontend Development",
        "job_role": "Frontend Lead",
        "seniority_level": "6-9 years",
        "years_of_experience": 7,
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "salary_min": 130000.0,
        "salary_max": 170000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "profile_summary": (
            "Senior frontend leader with 7+ years driving architecture decisions, design-system "
            "adoption, and team mentorship. Expert in React ecosystem, performance budgeting, "
            "and cross-functional collaboration with product and design."
        ),
        "skills": [
            {"name": "React", "category": "technical", "rating": 10},
            {"name": "TypeScript", "category": "technical", "rating": 9},
            {"name": "Design Systems", "category": "technical", "rating": 9},
            {"name": "Architecture & Code Review", "category": "technical", "rating": 9},
            {"name": "Performance Optimization", "category": "technical", "rating": 8},
            {"name": "A/B Testing", "category": "technical", "rating": 7},
            {"name": "Technical Planning", "category": "functional", "rating": 8},
            {"name": "Mentoring", "category": "soft", "rating": 9},
            {"name": "Cross-team Collaboration", "category": "soft", "rating": 9},
            {"name": "Communication", "category": "soft", "rating": 9},
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # bhavanabayya13@gmail.com  →  Data Engineer (ID 35)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 35,
        "profile_name": "Data Engineer",
        "product_vendor": "General",
        "product_type": "Data Engineering",
        "job_role": "Data Engineer",
        "seniority_level": "3-6 years",
        "years_of_experience": 4,
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "salary_min": 100000.0,
        "salary_max": 138000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "profile_summary": (
            "Data engineer skilled in building robust ETL/ELT pipelines, data lake architectures, "
            "and analytics infrastructure. Experienced with Python, Spark, Airflow, and cloud "
            "data warehouses to deliver high-quality data products to downstream teams."
        ),
        "skills": [
            {"name": "Python", "category": "technical", "rating": 9},
            {"name": "Apache Spark", "category": "technical", "rating": 8},
            {"name": "Apache Airflow", "category": "technical", "rating": 8},
            {"name": "dbt", "category": "technical", "rating": 8},
            {"name": "Snowflake", "category": "technical", "rating": 7},
            {"name": "Apache Kafka", "category": "technical", "rating": 7},
            {"name": "SQL & Data Modeling", "category": "technical", "rating": 9},
            {"name": "AWS Glue / S3", "category": "technical", "rating": 7},
            {"name": "ETL Pipeline Design", "category": "functional", "rating": 8},
            {"name": "Analytical Thinking", "category": "soft", "rating": 9},
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # bhavanabayya13@gmail.com  →  Platform / DevOps Engineer (ID 49)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 49,
        "profile_name": "Platform / DevOps Engineer",
        "product_vendor": "AWS",
        "product_type": "Cloud Infrastructure",
        "job_role": "DevOps Engineer",
        "seniority_level": "3-6 years",
        "years_of_experience": 4,
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "salary_min": 105000.0,
        "salary_max": 140000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "profile_summary": (
            "Platform engineer bridging development and operations — designing CI/CD pipelines, "
            "containerised deployments, and IaC with Terraform. Experienced automating infrastructure "
            "on AWS to improve developer productivity and system reliability."
        ),
        "skills": [
            {"name": "Python", "category": "technical", "rating": 8},
            {"name": "Docker", "category": "technical", "rating": 9},
            {"name": "Kubernetes", "category": "technical", "rating": 8},
            {"name": "Terraform", "category": "technical", "rating": 8},
            {"name": "GitHub Actions / CI-CD", "category": "technical", "rating": 9},
            {"name": "AWS (ECS, EC2, RDS, S3)", "category": "technical", "rating": 8},
            {"name": "Helm Charts", "category": "technical", "rating": 7},
            {"name": "Infrastructure as Code", "category": "functional", "rating": 8},
            {"name": "Monitoring & Alerting", "category": "technical", "rating": 8},
            {"name": "Problem Solving", "category": "soft", "rating": 9},
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # bhavsbayya@gmail.com  →  Site Reliability Engineer (SRE) (ID 51)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 51,
        "profile_name": "Site Reliability Engineer (SRE)",
        "product_vendor": "AWS",
        "product_type": "Cloud Infrastructure",
        "job_role": "SRE",
        "seniority_level": "5-8 years",
        "years_of_experience": 7,
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "salary_min": 150000.0,
        "salary_max": 195000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.US_CITIZEN,
        "profile_summary": (
            "Experienced SRE responsible for maintaining 99.99% uptime across distributed "
            "cloud-native systems. Owns SLO/SLI definition, incident management, chaos engineering, "
            "and capacity planning for high-traffic production workloads."
        ),
        "skills": [
            {"name": "AWS", "category": "technical", "rating": 9},
            {"name": "Kubernetes", "category": "technical", "rating": 9},
            {"name": "Prometheus & Grafana", "category": "technical", "rating": 9},
            {"name": "PagerDuty / Incident Response", "category": "technical", "rating": 8},
            {"name": "Terraform", "category": "technical", "rating": 8},
            {"name": "Python Scripting", "category": "technical", "rating": 8},
            {"name": "Chaos Engineering", "category": "technical", "rating": 7},
            {"name": "SLOs / SLAs / Error Budgets", "category": "functional", "rating": 9},
            {"name": "Capacity Planning", "category": "functional", "rating": 8},
            {"name": "Leadership", "category": "soft", "rating": 8},
        ],
    },
    # ══════════════════════════════════════════════════════════════════════════
    # bhavsbayya@gmail.com  →  DevSecOps Engineer (ID 22)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id": 22,
        "profile_name": "DevSecOps Engineer",
        "product_vendor": "AWS",
        "product_type": "Cloud Security",
        "job_role": "Cloud Security Engineer",
        "seniority_level": "5-8 years",
        "years_of_experience": 7,
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "salary_min": 155000.0,
        "salary_max": 200000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.US_CITIZEN,
        "profile_summary": (
            "DevSecOps engineer embedding security into every stage of the SDLC. Specialises in "
            "cloud security posture management, automated vulnerability scanning, IAM governance, "
            "and compliance automation for SOC 2 and ISO 27001 frameworks."
        ),
        "skills": [
            {"name": "AWS Security (IAM, GuardDuty, Security Hub)", "category": "technical", "rating": 9},
            {"name": "Terraform", "category": "technical", "rating": 8},
            {"name": "Vulnerability Assessment (Snyk/Trivy)", "category": "technical", "rating": 9},
            {"name": "SIEM & Log Analysis", "category": "technical", "rating": 8},
            {"name": "Zero Trust Architecture", "category": "technical", "rating": 8},
            {"name": "Penetration Testing", "category": "technical", "rating": 7},
            {"name": "SOC 2 / ISO 27001 Compliance", "category": "functional", "rating": 9},
            {"name": "Security Automation", "category": "technical", "rating": 8},
            {"name": "OWASP Top 10", "category": "technical", "rating": 9},
            {"name": "Risk Assessment", "category": "functional", "rating": 8},
        ],
    },
]


def run():
    with Session(engine) as session:
        for upd in UPDATES:
            pid = upd["id"]
            profile = session.get(JobProfile, pid)
            if not profile:
                print(f"  [!] JobProfile ID {pid} not found — skipping")
                continue

            old_name = profile.profile_name

            # Update profile fields
            profile.profile_name     = upd["profile_name"]
            profile.product_vendor   = upd["product_vendor"]
            profile.product_type     = upd["product_type"]
            profile.job_role         = upd["job_role"]
            profile.seniority_level  = upd.get("seniority_level", profile.seniority_level)
            profile.years_of_experience = upd.get("years_of_experience", profile.years_of_experience)
            profile.worktype         = upd["worktype"]
            profile.employment_type  = upd["employment_type"]
            profile.salary_min       = upd["salary_min"]
            profile.salary_max       = upd["salary_max"]
            profile.salary_currency  = upd["salary_currency"]
            profile.visa_status      = upd["visa_status"]
            profile.profile_summary  = upd["profile_summary"]
            # Clear taxonomy FK ids so they don't conflict with new role
            profile.vendor_id        = None
            profile.product_type_id  = None
            profile.role_id          = None

            # Replace skills
            replace_skills(session, pid, upd["skills"])

            session.commit()
            print(f"  [✓] Profile ID {pid}: '{old_name}' → '{upd['profile_name']}'")

    print("\nAll duplicate profiles have been updated to distinct roles.")


if __name__ == "__main__":
    run()
