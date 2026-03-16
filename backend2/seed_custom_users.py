"""
Custom Seed Script for Specific Users
Creates candidates, recruiters, job postings, skills, swipes, and matches
for the specified email addresses with comprehensive data.
"""

from datetime import datetime, timedelta
from app.database import engine
from app.models import (
    User, Candidate, JobProfile, Skill, Company, JobPosting, 
    Swipe, Match, Application, Resume, Certification,
    WorkType, EmploymentType, VisaStatus, CurrencyType, UserRole
)
from sqlmodel import Session, select
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
PASSWORD = 'Kutty_1304'  # Common password for all users

def create_or_get_user(session, email, full_name, role):
    """Create user or return existing one"""
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(
            email=email,
            password_hash=pwd_context.hash(PASSWORD),
            full_name=full_name,
            role=role,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"[+] Created {role}: {full_name} ({email})")
    else:
        print(f"[=] Found existing {role}: {full_name} ({email})")
    return user

def create_candidate_profile(session, user, candidate_data):
    """Create or update candidate with full profile"""
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    
    if not candidate:
        candidate = Candidate(
            user_id=user.id,
            name=user.full_name,
            email=user.email,
            phone=candidate_data['phone'],
            residential_address=candidate_data['address'],
            location_state=candidate_data['state'],
            location_county=candidate_data['county'],
            location_zipcode=candidate_data['zipcode'],
            linkedin_url=candidate_data.get('linkedin'),
            github_url=candidate_data.get('github'),
            profile_summary=candidate_data['summary']
        )
        session.add(candidate)
        session.commit()
        session.refresh(candidate)
        print(f"  ✅ Created Candidate profile (ID: {candidate.id})")
    else:
        # Update existing candidate
        candidate.phone = candidate_data['phone']
        candidate.residential_address = candidate_data['address']
        candidate.location_state = candidate_data['state']
        candidate.location_county = candidate_data['county']
        candidate.location_zipcode = candidate_data['zipcode']
        candidate.linkedin_url = candidate_data.get('linkedin')
        candidate.github_url = candidate_data.get('github')
        candidate.profile_summary = candidate_data['summary']
        session.commit()
        print(f"  ✅ Updated Candidate profile (ID: {candidate.id})")
    
    # Create job profiles
    for profile_data in candidate_data['profiles']:
        job_profile = JobProfile(
            candidate_id=candidate.id,
            profile_name=profile_data['name'],
            product_vendor=profile_data['vendor'],
            product_type=profile_data['type'],
            job_role=profile_data['role'],
            years_of_experience=profile_data['years'],
            worktype=profile_data['worktype'],
            employment_type=profile_data['employment'],
            salary_min=profile_data['salary_min'],
            salary_max=profile_data['salary_max'],
            salary_currency='usd',
            visa_status=profile_data['visa'],
            profile_summary=profile_data['summary'],
            seniority_level=profile_data.get('seniority', 'mid')
        )
        session.add(job_profile)
        session.commit()
        session.refresh(job_profile)
        print(f"    ✅ Created JobProfile: {profile_data['name']} (ID: {job_profile.id})")
        
        # Add skills to job profile
        for skill_data in profile_data['skills']:
            skill = Skill(
                job_profile_id=job_profile.id,
                skill_name=skill_data['name'],
                proficiency_level=skill_data['level'],
                category=skill_data['category']
            )
            session.add(skill)
        session.commit()
        print(f"      ✅ Added {len(profile_data['skills'])} skills")
    
    return candidate

def create_company_and_jobs(session, user, company_data):
    """Create company profile and job postings"""
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    
    if not company:
        company = Company(
            user_id=user.id,
            company_name=company_data['name'],
            company_email=user.email,
            industry=company_data['industry'],
            company_size=company_data['size'],
            website=company_data['website'],
            description=company_data['description'],
            location=company_data['location']
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        print(f"  ✅ Created Company: {company.company_name} (ID: {company.id})")
    else:
        print(f"  ✓ Found existing Company: {company.company_name} (ID: {company.id})")
    
    # Create job postings
    job_postings = []
    for job_data in company_data['jobs']:
        job = JobPosting(
            company_id=company.id,
            title=job_data['title'],
            department=job_data['department'],
            location=job_data['location'],
            work_type=job_data['worktype'],
            employment_type=job_data['employment'],
            salary_min=job_data['salary_min'],
            salary_max=job_data['salary_max'],
            salary_currency='usd',
            description=job_data['description'],
            required_skills=job_data['required_skills'],
            preferred_skills=job_data.get('preferred_skills'),
            experience_min=job_data['exp_min'],
            experience_max=job_data['exp_max'],
            education_level=job_data.get('education', 'bachelors'),
            status='active',
            posted_date=datetime.utcnow()
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        job_postings.append(job)
        print(f"    ✅ Created Job: {job.title} (ID: {job.id})")
    
    return company, job_postings

def create_interactions(session, candidates, companies_with_jobs):
    """Create swipes, matches, and applications"""
    print("\n[Creating interactions (swipes, matches, applications)]...")
    
    swipe_count = 0
    match_count = 0
    app_count = 0
    
    for candidate in candidates:
        job_profiles = session.exec(
            select(JobProfile).where(JobProfile.candidate_id == candidate.id)
        ).all()
        
        for company, job_postings in companies_with_jobs:
            for job in job_postings[:2]:  # Interact with first 2 jobs per company
                if not job_profiles:
                    continue
                    
                profile = random.choice(job_profiles)
                
                # Candidate swipes right (like) 70% of the time
                if random.random() < 0.7:
                    candidate_swipe = Swipe(
                        candidate_id=candidate.id,
                        job_profile_id=profile.id,
                        job_posting_id=job.id,
                        company_id=company.id,
                        action='like',
                        action_by='candidate',
                        created_at=datetime.utcnow() - timedelta(days=random.randint(1, 10))
                    )
                    session.add(candidate_swipe)
                    swipe_count += 1
                    
                    # Recruiter responds 60% of the time
                    if random.random() < 0.6:
                        recruiter_action = random.choice(['like', 'ask_to_apply'])
                        recruiter_swipe = Swipe(
                            candidate_id=candidate.id,
                            job_profile_id=profile.id,
                            job_posting_id=job.id,
                            company_id=company.id,
                            action=recruiter_action,
                            action_by='recruiter',
                            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                        )
                        session.add(recruiter_swipe)
                        swipe_count += 1
                        
                        # Create match if both liked
                        if recruiter_action == 'like':
                            match = Match(
                                candidate_id=candidate.id,
                                job_profile_id=profile.id,
                                job_posting_id=job.id,
                                company_id=company.id,
                                matched_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                            )
                            session.add(match)
                            match_count += 1
                            
                            # 50% chance of application after match
                            if random.random() < 0.5:
                                app = Application(
                                    candidate_id=candidate.id,
                                    job_profile_id=profile.id,
                                    job_posting_id=job.id,
                                    company_id=company.id,
                                    status=random.choice(['pending', 'reviewed', 'shortlisted']),
                                    applied_at=datetime.utcnow() - timedelta(days=random.randint(0, 3)),
                                    cover_letter=f"I am excited to apply for the {job.title} position at {company.company_name}. With my background in {profile.job_role}, I believe I would be a great fit for your team."
                                )
                                session.add(app)
                                app_count += 1
                else:
                    # Some passes too
                    if random.random() < 0.3:
                        pass_swipe = Swipe(
                            candidate_id=candidate.id,
                            job_profile_id=profile.id,
                            job_posting_id=job.id,
                            company_id=company.id,
                            action='pass',
                            action_by='candidate',
                            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 10))
                        )
                        session.add(pass_swipe)
                        swipe_count += 1
    
    session.commit()
    print(f"  ✅ Created {swipe_count} swipes")
    print(f"  ✅ Created {match_count} matches")
    print(f"  ✅ Created {app_count} applications")

def main():
    print("=" * 80)
    print("CUSTOM USER SEED SCRIPT")
    print("=" * 80)
    
    with Session(engine) as session:
        # ==================== CANDIDATES ====================
        print("\n[CREATING CANDIDATES]...")
        
        # Candidate 1: kuttybayya@gmail.com (NEW)
        user1 = create_or_get_user(session, 
            email='kuttybayya@gmail.com',
            full_name='Kutty Bayya',
            role='candidate'
        )
        
        candidate1_data = {
            'phone': '+91-9876543210',
            'address': '123 Tech Park, Hyderabad, Telangana',
            'state': 'Telangana',
            'county': 'Hyderabad',
            'zipcode': '500081',
            'linkedin': 'https://linkedin.com/in/kuttybayya',
            'github': 'https://github.com/kuttybayya',
            'summary': 'Experienced Full Stack Developer with 5+ years in web technologies. Passionate about building scalable applications and mentoring junior developers.',
            'profiles': [
                {
                    'name': 'Full Stack Developer',
                    'vendor': 'General',
                    'type': 'Software',
                    'role': 'Full Stack Developer',
                    'years': 5,
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 100000,
                    'salary_max': 140000,
                    'visa': 'work_visa',
                    'seniority': 'mid',
                    'summary': 'Specialized in MERN stack with experience in cloud infrastructure',
                    'skills': [
                        {'name': 'JavaScript', 'level': 5, 'category': 'technical'},
                        {'name': 'React', 'level': 5, 'category': 'technical'},
                        {'name': 'Node.js', 'level': 5, 'category': 'technical'},
                        {'name': 'Python', 'level': 4, 'category': 'technical'},
                        {'name': 'MongoDB', 'level': 4, 'category': 'technical'},
                        {'name': 'AWS', 'level': 4, 'category': 'technical'},
                        {'name': 'Docker', 'level': 4, 'category': 'technical'},
                        {'name': 'Agile', 'level': 4, 'category': 'soft'},
                    ]
                },
                {
                    'name': 'React Frontend Engineer',
                    'vendor': 'General',
                    'type': 'Software',
                    'role': 'Frontend Developer',
                    'years': 5,
                    'worktype': 'remote',
                    'employment': 'ft',
                    'salary_min': 95000,
                    'salary_max': 135000,
                    'visa': 'work_visa',
                    'seniority': 'mid',
                    'summary': 'Frontend specialist with focus on React ecosystem and performance optimization',
                    'skills': [
                        {'name': 'React', 'level': 5, 'category': 'technical'},
                        {'name': 'TypeScript', 'level': 5, 'category': 'technical'},
                        {'name': 'Next.js', 'level': 4, 'category': 'technical'},
                        {'name': 'CSS', 'level': 5, 'category': 'technical'},
                        {'name': 'Redux', 'level': 4, 'category': 'technical'},
                        {'name': 'Jest', 'level': 4, 'category': 'technical'},
                    ]
                }
            ]
        }
        candidate1 = create_candidate_profile(session, user1, candidate1_data)
        
        # Candidate 2: bhavanabayya13@gmail.com (EXISTING - ENHANCE)
        user2 = create_or_get_user(session,
            email='bhavanabayya13@gmail.com',
            full_name='Bhavana Bayya',
            role='candidate'
        )
        
        # Clear existing job profiles for Bhavana to recreate with complete data
        existing_profiles = session.exec(
            select(JobProfile).where(JobProfile.candidate_id == 
                session.exec(select(Candidate).where(Candidate.user_id == user2.id)).first().id)
        ).all()
        for profile in existing_profiles:
            # Delete associated skills first
            skills = session.exec(select(Skill).where(Skill.job_profile_id == profile.id)).all()
            for skill in skills:
                session.delete(skill)
            session.delete(profile)
        session.commit()
        
        candidate2_data = {
            'phone': '+1-555-0123',
            'address': '456 Innovation Drive, San Francisco, CA',
            'state': 'California',
            'county': 'San Francisco',
            'zipcode': '94102',
            'linkedin': 'https://linkedin.com/in/bhavanabayya',
            'github': 'https://github.com/bhavanabayya',
            'summary': 'Senior Software Engineer with expertise in Python, cloud technologies, and data engineering. 3+ years of experience building enterprise-scale applications.',
            'profiles': [
                {
                    'name': 'Python Backend Engineer',
                    'vendor': 'General',
                    'type': 'Software',
                    'role': 'Backend Developer',
                    'years': 3,
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 85000,
                    'salary_max': 125000,
                    'visa': 'work_visa',
                    'seniority': 'mid',
                    'summary': 'Backend specialist with strong Python and FastAPI experience',
                    'skills': [
                        {'name': 'Python', 'level': 5, 'category': 'technical'},
                        {'name': 'FastAPI', 'level': 5, 'category': 'technical'},
                        {'name': 'PostgreSQL', 'level': 4, 'category': 'technical'},
                        {'name': 'Docker', 'level': 4, 'category': 'technical'},
                        {'name': 'Redis', 'level': 4, 'category': 'technical'},
                        {'name': 'REST APIs', 'level': 5, 'category': 'technical'},
                    ]
                },
                {
                    'name': 'Data Engineer',
                    'vendor': 'General',
                    'type': 'Data',
                    'role': 'Data Engineer',
                    'years': 3,
                    'worktype': 'remote',
                    'employment': 'ft',
                    'salary_min': 90000,
                    'salary_max': 130000,
                    'visa': 'work_visa',
                    'seniority': 'mid',
                    'summary': 'Building data pipelines and ETL workflows',
                    'skills': [
                        {'name': 'Python', 'level': 5, 'category': 'technical'},
                        {'name': 'SQL', 'level': 5, 'category': 'technical'},
                        {'name': 'Apache Spark', 'level': 4, 'category': 'technical'},
                        {'name': 'Airflow', 'level': 4, 'category': 'technical'},
                        {'name': 'AWS', 'level': 4, 'category': 'technical'},
                    ]
                }
            ]
        }
        candidate2 = create_candidate_profile(session, user2, candidate2_data)
        
        # ==================== RECRUITERS & COMPANIES ====================
        print("\n[CREATING RECRUITERS & COMPANIES]...")
        
        # Recruiter 1: bayyakutty02@gmail.com (NEW)
        hr1 = create_or_get_user(session,
            email='bayyakutty02@gmail.com',
            full_name='Bayya Kutty',
            role='company'
        )
        
        company1_data = {
            'name': 'TechInnovate Solutions',
            'industry': 'Software Development',
            'size': '100-500',
            'website': 'https://techinnovate.io',
            'description': 'Leading software development company specializing in web and mobile applications. We work with Fortune 500 clients to build innovative digital solutions.',
            'location': 'San Francisco, CA',
            'jobs': [
                {
                    'title': 'Senior Full Stack Developer',
                    'department': 'Engineering',
                    'location': 'San Francisco, CA (Hybrid)',
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 110000,
                    'salary_max': 150000,
                    'description': 'We are seeking a Senior Full Stack Developer to join our growing team. You will work on cutting-edge web applications using modern technologies.',
                    'required_skills': 'JavaScript, React, Node.js, PostgreSQL, AWS',
                    'preferred_skills': 'TypeScript, Docker, Kubernetes, GraphQL',
                    'exp_min': 4,
                    'exp_max': 8,
                    'education': 'bachelors'
                },
                {
                    'title': 'Frontend Engineer - React',
                    'department': 'Engineering',
                    'location': 'Remote',
                    'worktype': 'remote',
                    'employment': 'ft',
                    'salary_min': 95000,
                    'salary_max': 135000,
                    'description': 'Join our frontend team to build beautiful, responsive user interfaces. We value clean code, performance, and user experience.',
                    'required_skills': 'React, JavaScript, CSS, HTML, REST APIs',
                    'preferred_skills': 'TypeScript, Next.js, Redux, Tailwind CSS',
                    'exp_min': 3,
                    'exp_max': 6,
                    'education': 'bachelors'
                },
                {
                    'title': 'Backend Engineer - Python',
                    'department': 'Engineering',
                    'location': 'San Francisco, CA (Hybrid)',
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 100000,
                    'salary_max': 140000,
                    'description': 'Looking for a talented Backend Engineer to design and implement scalable APIs and microservices.',
                    'required_skills': 'Python, FastAPI, PostgreSQL, Docker, REST APIs',
                    'preferred_skills': 'Redis, Celery, AWS, Kubernetes',
                    'exp_min': 3,
                    'exp_max': 7,
                    'education': 'bachelors'
                }
            ]
        }
        company1, jobs1 = create_company_and_jobs(session, hr1, company1_data)
        
        # Recruiter 2: bhavana@rubislawinvest.com (NEW)
        hr2 = create_or_get_user(session,
            email='bhavana@rubislawinvest.com',
            full_name='Bhavana Recruiter',
            role='company'
        )
        
        company2_data = {
            'name': 'Rubis Law & Investment Group',
            'industry': 'Financial Services',
            'size': '50-100',
            'website': 'https://rubislawinvest.com',
            'description': 'Premier law and investment firm seeking top tech talent to modernize our digital infrastructure and build innovative fintech solutions.',
            'location': 'New York, NY',
            'jobs': [
                {
                    'title': 'Software Engineer - Full Stack',
                    'department': 'Technology',
                    'location': 'New York, NY (Hybrid)',
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 105000,
                    'salary_max': 145000,
                    'description': 'Build secure, scalable applications for our financial services platform. Work with cutting-edge technologies in a stable, growth-oriented environment.',
                    'required_skills': 'JavaScript, React, Node.js, SQL, Security Best Practices',
                    'preferred_skills': 'TypeScript, Python, AWS, Financial Domain Knowledge',
                    'exp_min': 4,
                    'exp_max': 7,
                    'education': 'bachelors'
                },
                {
                    'title': 'Data Engineer',
                    'department': 'Data Analytics',
                    'location': 'Remote',
                    'worktype': 'remote',
                    'employment': 'ft',
                    'salary_min': 95000,
                    'salary_max': 135000,
                    'description': 'Design and implement data pipelines to support our analytics and reporting needs. Work with large datasets in a financial context.',
                    'required_skills': 'Python, SQL, ETL, Data Warehousing, AWS',
                    'preferred_skills': 'Spark, Airflow, Snowflake, Tableau',
                    'exp_min': 3,
                    'exp_max': 6,
                    'education': 'bachelors'
                },
                {
                    'title': 'Python Developer',
                    'department': 'Technology',
                    'location': 'New York, NY (Hybrid)',
                    'worktype': 'hybrid',
                    'employment': 'ft',
                    'salary_min': 90000,
                    'salary_max': 130000,
                    'description': 'Develop backend services and automation tools using Python. Support our internal systems and client-facing applications.',
                    'required_skills': 'Python, FastAPI/Django, PostgreSQL, REST APIs',
                    'preferred_skills': 'Docker, Redis, Celery, Financial APIs',
                    'exp_min': 2,
                    'exp_max': 5,
                    'education': 'bachelors'
                }
            ]
        }
        company2, jobs2 = create_company_and_jobs(session, hr2, company2_data)
        
        # ==================== CREATE INTERACTIONS ====================
        candidates = [candidate1, candidate2]
        companies_with_jobs = [(company1, jobs1), (company2, jobs2)]
        
        create_interactions(session, candidates, companies_with_jobs)
        
        print("\n" + "=" * 80)
        print("[SEED COMPLETE!]")
        print("=" * 80)
        print("\n[Summary:]")
        print(f"  • Candidates: 2 (with full profiles and skills)")
        print(f"  • Companies: 2")
        print(f"  • Job Postings: {len(jobs1) + len(jobs2)}")
        print(f"  • Swipes, Matches, and Applications created for all interactions")
        print("\n[Login Credentials (password for all: Kutty_1304)]:")
        print("  Candidates:")
        print("    • kuttybayya@gmail.com")
        print("    • bhavanabayya13@gmail.com")
        print("  Recruiters:")
        print("    • bayyakutty02@gmail.com")
        print("    • bhavana@rubislawinvest.com")
        print("\n[Access at: http://localhost:3003]")
        print("=" * 80)

if __name__ == "__main__":
    main()

