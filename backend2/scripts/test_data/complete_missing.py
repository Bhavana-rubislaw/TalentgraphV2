"""Complete the missing data for all 4 accounts"""
from datetime import datetime
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

print("=== COMPLETING MISSING DATA ===\n")

# 1. Add jobs for bayyakutty02@gmail.com (TechInnovate Solutions)
u1 = s.exec(select(User).where(User.email == 'bayyakutty02@gmail.com')).first()
if u1:
    comp1 = s.exec(select(Company).where(Company.user_id == u1.id)).first()
    if comp1:
        existing_jobs = s.exec(select(JobPosting).where(JobPosting.company_id == comp1.id)).all()
        if len(existing_jobs) < 2:
            print(f"Adding {2 - len(existing_jobs)} jobs for {comp1.company_name}...")
            
            jobs = [
                JobPosting(
                    company_id=comp1.id,
                    job_title='Senior Full Stack Developer',
                    product_vendor='General',
                    product_type='Web Application',
                    job_role='Full Stack Developer',
                    seniority_level='Senior',
                    worktype='hybrid',
                    location='San Francisco, CA',
                    employment_type='ft',
                    start_date='2026-04-01',
                    salary_min=110000,
                    salary_max=150000,
                    salary_currency='usd',
                    job_description='Senior developer needed for web applications. Work with modern tech stack.',
                    required_skills='JavaScript, React, Node.js, PostgreSQL',
                    is_active=True
                ),
                JobPosting(
                    company_id=comp1.id,
                    job_title='Python Backend Engineer',
                    product_vendor='General',
                    product_type='Backend Service',
                    job_role='Backend Developer',
                    seniority_level='Mid',
                    worktype='remote',
                    location='Remote',
                    employment_type='ft',
                    start_date='2026-04-01',
                    salary_min=100000,
                    salary_max=140000,
                    salary_currency='usd',
                    job_description='Backend engineer for API development using Python and FastAPI.',
                    required_skills='Python, FastAPI, PostgreSQL, Docker',
                    is_active=True
                )
            ]
            
            for job in jobs[len(existing_jobs):]:
                s.add(job)
            s.commit()
            print(f"  [+] Added {2 - len(existing_jobs)} jobs\n")
        else:
            print(f"  [=] {comp1.company_name} already has jobs\n")

# 2. Add job profiles for kuttybayya@gmail.com
u2 = s.exec(select(User).where(User.email == 'kuttybayya@gmail.com')).first()
if u2:
    cand2 = s.exec(select(Candidate).where(Candidate.user_id == u2.id)).first()
    if cand2:
        existing_profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == cand2.id)).all()
        if len(existing_profiles) < 3:
            print(f"Adding {3 - len(existing_profiles)} job profiles for kuttybayya...")
            
            profiles = [
                JobProfile(
                    candidate_id=cand2.id,
                    profile_name='Full Stack Developer',
                    product_vendor='General',
                    product_type='Web Application',
                    job_role='Full Stack Developer',
                    years_of_experience=5,
                    worktype='hybrid',
                    employment_type='ft',
                    salary_min=100000,
                    salary_max=150000,
                    salary_currency='usd',
                    visa_status='us_citizen',
                    seniority_level='Senior',
                    profile_summary='Experienced full stack developer with React and Node.js'
                ),
                JobProfile(
                    candidate_id=cand2.id,
                    profile_name='Frontend Developer',
                    product_vendor='General',
                    product_type='Web Application',
                    job_role='Frontend Developer',
                    years_of_experience=5,
                    worktype='remote',
                    employment_type='ft',
                    salary_min=95000,
                    salary_max=140000,
                    salary_currency='usd',
                    visa_status='us_citizen',
                    seniority_level='Mid',
                    profile_summary='Frontend specialist with React, TypeScript expertise'
                ),
                JobProfile(
                    candidate_id=cand2.id,
                    profile_name='Backend Developer',
                    product_vendor='General',
                    product_type='Backend Service',
                    job_role='Backend Developer',
                    years_of_experience=5,
                    worktype='hybrid',
                    employment_type='ft',
                    salary_min=105000,
                    salary_max=145000,
                    salary_currency='usd',
                    visa_status='us_citizen',
                    seniority_level='Senior',
                    profile_summary='Python backend developer with FastAPI and PostgreSQL'
                )
            ]
            
            for profile in profiles[len(existing_profiles):]:
                s.add(profile)
            s.commit()
            print(f"  [+] Added {3 - len(existing_profiles)} profiles\n")

# 3. Add job profiles for bhavanabayya13@gmail.com
u3 = s.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
if u3:
    cand3 = s.exec(select(Candidate).where(Candidate.user_id == u3.id)).first()
    if cand3:
        existing_profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == cand3.id)).all()
        if len(existing_profiles) < 3:
            print(f"Adding {3 - len(existing_profiles)} job profiles for bhavanabayya13...")
            
            profiles = [
                JobProfile(
                    candidate_id=cand3.id,
                    profile_name='Software Engineer',
                    product_vendor='General',
                    product_type='Web Application',
                    job_role='Software Engineer',
                    years_of_experience=3,
                    worktype='hybrid',
                    employment_type='ft',
                    salary_min=80000,
                    salary_max=120000,
                    salary_currency='usd',
                    visa_status='work_visa',
                    seniority_level='Mid',
                    profile_summary='Software engineer with full stack experience'
                ),
                JobProfile(
                    candidate_id=cand3.id,
                    profile_name='Backend Engineer',
                    product_vendor='General',
                    product_type='Backend Service',
                    job_role='Backend Developer',
                    years_of_experience=3,
                    worktype='remote',
                    employment_type='ft',
                    salary_min=85000,
                    salary_max=125000,
                    salary_currency='usd',
                    visa_status='work_visa',
                    seniority_level='Mid',
                    profile_summary='Backend developer with Python and databases'
                ),
                JobProfile(
                    candidate_id=cand3.id,
                    profile_name='Data Engineer',
                    product_vendor='General',
                    product_type='Data Platform',
                    job_role='Data Engineer',
                    years_of_experience=3,
                    worktype='remote',
                    employment_type='ft',
                    salary_min=90000,
                    salary_max=130000,
                    salary_currency='usd',
                    visa_status='work_visa',
                    seniority_level='Mid',
                    profile_summary='Data engineer with ETL and analytics experience'
                )
            ]
            
            for profile in profiles[len(existing_profiles):]:
                s.add(profile)
            s.commit()
            print(f"  [+] Added {3 - len(existing_profiles)} profiles\n")

print("=== COMPLETE! ===")
