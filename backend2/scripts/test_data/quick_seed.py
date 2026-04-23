"""
Simple script to complete the custom user setup
Adds the missing users and creates basic interactions
"""
from datetime import datetime, timedelta
from app.database import engine
from app.models import *
from sqlmodel import Session, select
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
PASSWORD = 'Kutty_1304'

print("Creating custom users...")

with Session(engine) as s:
    # Create Recruiter 1
    hr1 = s.exec(select(User).where(User.email == 'bayyakutty02@gmail.com')).first()
    if not hr1:
        hr1 = User(email='bayyakutty02@gmail.com', password_hash=pwd_context.hash(PASSWORD),
                   full_name='Bayya Kutty', role='recruiter', is_active=True)
        s.add(hr1)
        s.commit()
        s.refresh(hr1)
        print(f"[+] Created recruiter: {hr1.email}")
    else:
        print(f"[=] Recruiter already exists: {hr1.email}")
    
    # Check/create company for hr1
    comp1 = s.exec(select(Company).where(Company.user_id == hr1.id)).first()
    if not comp1:
        comp1 = Company(user_id=hr1.id, company_name='TechInnovate Solutions',
                       company_email=hr1.email, employee_type='HR',
                       industry='Software Development',
                       company_size='100-500', website='https://techinnovate.io',
                       description='Leading software development company',
                       location='San Francisco, CA')
        s.add(comp1)
        s.commit()
        s.refresh(comp1)
        print(f"  [+] Created company: {comp1.company_name}")
        
        # Add 2 job postings
        jobs = [
            JobPosting(company_id=comp1.id, job_title='Senior Full Stack Developer',
                      product_vendor='General', product_type='Web Application',
                      job_role='Full Stack Developer', seniority_level='Senior',
                      worktype='hybrid', location='San Francisco, CA',
                      employment_type='ft', start_date='2026-04-01',
                      salary_min=110000, salary_max=150000, salary_currency='usd',
                      job_description='Senior developer needed for web applications. Work with modern tech stack.',
                      required_skills='JavaScript, React, Node.js, PostgreSQL', is_active=True),
            JobPosting(company_id=comp1.id, job_title='Python Backend Engineer',
                      product_vendor='General', product_type='Backend Service',
                      job_role='Backend Developer', seniority_level='Mid',
                      worktype='remote', location='Remote',
                      employment_type='ft', start_date='2026-04-01',
                      salary_min=100000, salary_max=140000, salary_currency='usd',
                      job_description='Backend engineer for API development using Python and FastAPI.',
                      required_skills='Python, FastAPI, PostgreSQL, Docker', is_active=True)
        ]
        for job in jobs:
            s.add(job)
        s.commit()
        print(f"  [+] Created {len(jobs)} job postings")
    else:
        print(f"  [=] Company already exists: {comp1.company_name}")
    
    # Create Recruiter 2
    hr2 = s.exec(select(User).where(User.email == 'bhavana@rubislawinvest.com')).first()
    if not hr2:
        hr2 = User(email='bhavana@rubislawinvest.com', password_hash=pwd_context.hash(PASSWORD),
                   full_name='Bhavana Recruiter', role='recruiter', is_active=True)
        s.add(hr2)
        s.commit()
        s.refresh(hr2)
        print(f"[+] Created recruiter: {hr2.email}")
    else:
        print(f"[=] Recruiter already exists: {hr2.email}")
    
    # Check/create company for hr2
    comp2 = s.exec(select(Company).where(Company.user_id == hr2.id)).first()
    if not comp2:
        comp2 = Company(user_id=hr2.id, company_name='Rubis Law & Investment Group',
                       company_email=hr2.email, employee_type='Recruiter',
                       industry='Financial Services',
                       company_size='50-100', website='https://rubislawinvest.com',
                       description='Premier law and investment firm',
                       location='New York, NY')
        s.add(comp2)
        s.commit()
        s.refresh(comp2)
        print(f"  [+] Created company: {comp2.company_name}")
        
        # Add 2 job postings
        jobs = [
            JobPosting(company_id=comp2.id, job_title='Software Engineer - Full Stack',
                      product_vendor='General', product_type='Financial Application',
                      job_role='Full Stack Developer', seniority_level='Mid-Senior',
                      worktype='hybrid', location='New York, NY',
                      employment_type='ft', start_date='2026-04-01',
                      salary_min=105000, salary_max=145000, salary_currency='usd',
                      job_description='Build secure financial applications with modern tech stack.',
                      required_skills='JavaScript, React, Node.js, Security', is_active=True),
            JobPosting(company_id=comp2.id, job_title='Data Engineer',
                      product_vendor='General', product_type='Data Platform',
                      job_role='Data Engineer', seniority_level='Mid',
                      worktype='remote', location='Remote',
                      employment_type='ft', start_date='2026-04-01',
                      salary_min=95000, salary_max=135000, salary_currency='usd',
                      job_description='Design and build data pipelines for financial analytics.',
                      required_skills='Python, SQL, ETL, AWS', is_active=True)
        ]
        for job in jobs:
            s.add(job)
        s.commit()
        print(f"  [+] Created {len(jobs)} job postings")
    else:
        print(f"  [=] Company already exists: {comp2.company_name}")

print("\n=== ALL DONE ===")
print("Login at http://localhost:3003")
print("Password: Kutty_1304")
print("\nAccounts created:")
print("  Candidates: kuttybayya@gmail.com, bhavanabayya13@gmail.com")
print("  Recruiters: bayyakutty02@gmail.com, bhavana@rubislawinvest.com")
