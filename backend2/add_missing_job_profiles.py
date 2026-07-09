"""
Add missing job profiles for bayyakutty02@gmail.com (Bayya Kutty)
so they have 3 job profiles like all other candidates.
"""
from sqlmodel import Session, select
from app.database import engine
from app.models import (
    Candidate, JobProfile, Skill, LocationPreference, User,
    WorkType, EmploymentType, CurrencyType, VisaStatus
)


NEW_PROFILES = [
    {
        "profile_name": "Backend API Developer",
        "product_vendor": "General",
        "product_type": "Backend Development",
        "job_role": "Backend Developer",
        "years_of_experience": 6,
        "worktype": WorkType.HYBRID,
        "employment_type": EmploymentType.FT,
        "salary_min": 115000.0,
        "salary_max": 155000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "ethnicity": None,
        "availability_date": "2 weeks",
        "profile_summary": "Backend developer specializing in RESTful APIs, microservices and cloud-native architectures.",
        "skills": [
            {"skill_name": "Python", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "Node.js", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "FastAPI", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "PostgreSQL", "skill_category": "technical", "proficiency_level": 4},
            {"skill_name": "Docker", "skill_category": "technical", "proficiency_level": 4},
            {"skill_name": "REST APIs", "skill_category": "technical", "proficiency_level": 5},
        ],
        "locations": [
            {"city": "Austin", "state": "Texas", "country": "USA"},
            {"city": "Remote", "state": "Nationwide", "country": "USA"},
        ],
    },
    {
        "profile_name": "React Frontend Developer",
        "product_vendor": "General",
        "product_type": "Frontend Development",
        "job_role": "Frontend Developer",
        "years_of_experience": 5,
        "worktype": WorkType.REMOTE,
        "employment_type": EmploymentType.FT,
        "salary_min": 110000.0,
        "salary_max": 150000.0,
        "salary_currency": CurrencyType.USD,
        "visa_status": VisaStatus.WORK_VISA,
        "ethnicity": None,
        "availability_date": "1 month",
        "profile_summary": "Frontend developer with deep React/TypeScript expertise building performant single-page applications.",
        "skills": [
            {"skill_name": "React", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "TypeScript", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "JavaScript", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "HTML/CSS", "skill_category": "technical", "proficiency_level": 5},
            {"skill_name": "Redux", "skill_category": "technical", "proficiency_level": 4},
            {"skill_name": "Vite", "skill_category": "technical", "proficiency_level": 4},
        ],
        "locations": [
            {"city": "Remote", "state": "Nationwide", "country": "USA"},
            {"city": "New York", "state": "New York", "country": "USA"},
        ],
    },
]


def main():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "bayyakutty02@gmail.com")).first()
        if not user:
            print("ERROR: User bayyakutty02@gmail.com not found in database.")
            return

        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate:
            print("ERROR: Candidate record not found for this user.")
            return

        existing = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        print(f"Candidate: {user.full_name} (ID: {candidate.id})")
        print(f"Existing job profiles: {len(existing)}")
        for p in existing:
            print(f"  - [{p.id}] {p.profile_name}")

        profiles_needed = 3 - len(existing)
        if profiles_needed <= 0:
            print("Already has 3 or more job profiles. No action needed.")
            return

        profiles_to_add = NEW_PROFILES[:profiles_needed]
        print(f"\nAdding {profiles_needed} job profile(s)...")

        for pd in profiles_to_add:
            job_profile = JobProfile(
                candidate_id=candidate.id,
                profile_name=pd["profile_name"],
                product_vendor=pd["product_vendor"],
                product_type=pd["product_type"],
                job_role=pd["job_role"],
                years_of_experience=pd["years_of_experience"],
                worktype=pd["worktype"],
                employment_type=pd["employment_type"],
                salary_min=pd["salary_min"],
                salary_max=pd["salary_max"],
                salary_currency=pd["salary_currency"],
                visa_status=pd["visa_status"],
                ethnicity=pd.get("ethnicity"),
                availability_date=pd.get("availability_date"),
                profile_summary=pd.get("profile_summary"),
            )
            session.add(job_profile)
            session.commit()
            session.refresh(job_profile)

            # Add skills
            for sk in pd["skills"]:
                skill = Skill(
                    job_profile_id=job_profile.id,
                    skill_name=sk["skill_name"],
                    skill_category=sk["skill_category"],
                    proficiency_level=sk["proficiency_level"],
                )
                session.add(skill)

            # Add locations
            for loc in pd["locations"]:
                location = LocationPreference(
                    job_profile_id=job_profile.id,
                    city=loc["city"],
                    state=loc["state"],
                    country=loc.get("country"),
                )
                session.add(location)

            session.commit()
            print(f"  [+] Created: '{pd['profile_name']}' (ID: {job_profile.id})")

        # Final verification
        all_profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        print(f"\nFinal count for {user.email}: {len(all_profiles)} job profile(s)")
        for p in all_profiles:
            print(f"  - [{p.id}] {p.profile_name}")


if __name__ == "__main__":
    main()
