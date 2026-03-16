"""Create comprehensive job preferences/profiles for bhavanabayya13@gmail.com"""
from datetime import datetime
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

# Get user and candidate
user = s.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
if not user:
    print("❌ User not found")
    s.close()
    exit(1)

candidate = s.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
if not candidate:
    print("❌ Candidate profile not found")
    s.close()
    exit(1)

print(f"✓ Found candidate: {candidate.name} (ID: {candidate.id})")

# Check existing job profiles
existing_profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
print(f"  Current job profiles: {len(existing_profiles)}")

# Clear existing profiles for fresh start (optional - comment out if you want to keep existing)
# for profile in existing_profiles:
#     s.delete(profile)
#     s.commit()

# Create 3 comprehensive job profiles
profiles_to_create = [
    {
        'profile_name': 'Full Stack Software Engineer',
        'job_role': 'Full Stack Developer',
        'job_category': 'Software Engineering',
        'seniority_level': 'Senior',
        'preferred_job_titles': 'Full Stack Engineer, Senior Software Engineer, Full Stack Developer',
        'salary_min': 120000,
        'salary_max': 160000,
        'salary_currency': 'usd',
        'pay_type': 'Annual',
        'negotiability': 'Flexible',
        'worktype_preference': 'remote',
        'remote_acceptance': 'Full Remote',
        'employment_type': 'ft',
        'visa_status': 'us_citizen',
        'travel_willingness': 'Occasional',
        'shift_preference': 'Standard Business Hours',
        'relocation_willingness': 'Not Open',
        'relevant_experience': 6,
        'notice_period': '2 weeks',
        'start_date_preference': '2 weeks',
        'highest_education': "Bachelor's in Computer Science",
        'core_strengths': 'React, Node.js, Python, PostgreSQL, AWS, CI/CD, Agile Development',
        'security_clearance': None,
        'preferred_location1': 'Remote - Any US location',
        'preferred_location2': 'San Francisco, CA',
        'preferred_location3': 'Seattle, WA',
        'is_active': True
    },
    {
        'profile_name': 'Backend Software Engineer',
        'job_role': 'Backend Developer',
        'job_category': 'Software Engineering',
        'seniority_level': 'Senior',
        'preferred_job_titles': 'Backend Engineer, Senior Backend Developer, API Developer',
        'salary_min': 115000,
        'salary_max': 155000,
        'salary_currency': 'usd',
        'pay_type': 'Annual',
        'negotiability': 'Flexible',
        'worktype_preference': 'remote',
        'remote_acceptance': 'Full Remote',
        'employment_type': 'ft',
        'visa_status': 'us_citizen',
        'travel_willingness': 'Minimal',
        'shift_preference': 'Flexible',
        'relocation_willingness': 'Not Open',
        'relevant_experience': 5,
        'notice_period': '2 weeks',
        'start_date_preference': 'Flexible',
        'highest_education': "Bachelor's in Computer Science",
        'core_strengths': 'Python, FastAPI, Node.js, PostgreSQL, MongoDB, Microservices, REST APIs',
        'security_clearance': None,
        'preferred_location1': 'Remote - Nationwide',
        'preferred_location2': 'Austin, TX',
        'preferred_location3': 'Denver, CO',
        'is_active': True
    },
    {
        'profile_name': 'Cloud Platform Engineer',
        'job_role': 'DevOps Engineer',
        'job_category': 'Cloud & Infrastructure',
        'seniority_level': 'Mid-Senior',
        'preferred_job_titles': 'DevOps Engineer, Cloud Engineer, Platform Engineer, SRE',
        'salary_min': 110000,
        'salary_max': 150000,
        'salary_currency': 'usd',
        'pay_type': 'Annual',
        'negotiability': 'Somewhat Flexible',
        'worktype_preference': 'hybrid',
        'remote_acceptance': 'Hybrid Preferred',
        'employment_type': 'ft',
        'visa_status': 'us_citizen',
        'travel_willingness': 'Occasional',
        'shift_preference': 'Flexible',
        'relocation_willingness': 'Open for Right Opportunity',
        'relevant_experience': 4,
        'notice_period': '3 weeks',
        'start_date_preference': '1 month',
        'highest_education': "Bachelor's in Computer Science",
        'core_strengths': 'AWS, Docker, Kubernetes, Terraform, CI/CD, Jenkins, Python, Linux',
        'security_clearance': None,
        'preferred_location1': 'Hybrid - Bay Area',
        'preferred_location2': 'Remote - US',
        'preferred_location3': 'New York, NY',
        'is_active': True
    }
]

created_count = 0
for profile_data in profiles_to_create:
    # Check if similar profile already exists
    existing = s.exec(
        select(JobProfile).where(
            JobProfile.candidate_id == candidate.id,
            JobProfile.profile_name == profile_data['profile_name']
        )
    ).first()
    
    if existing:
        print(f"  ⚠️  Profile '{profile_data['profile_name']}' already exists, skipping")
        continue
    
    # Create new job profile
    job_profile = JobProfile(
        candidate_id=candidate.id,
        user_id=user.id,
        **profile_data
    )
    s.add(job_profile)
    s.commit()
    s.refresh(job_profile)
    
    # Add skills for each profile
    if profile_data['profile_name'] == 'Full Stack Software Engineer':
        skills = [
            ('JavaScript', 5, True),
            ('React', 5, True),
            ('Node.js', 4, True),
            ('Python', 4, True),
            ('PostgreSQL', 4, False),
            ('AWS', 3, False),
            ('Docker', 3, False),
            ('TypeScript', 4, True),
            ('REST APIs', 5, False),
            ('Git', 5, False)
        ]
    elif profile_data['profile_name'] == 'Backend Software Engineer':
        skills = [
            ('Python', 5, True),
            ('FastAPI', 5, True),
            ('Node.js', 4, True),
            ('PostgreSQL', 5, True),
            ('MongoDB', 3, False),
            ('Redis', 3, False),
            ('Microservices', 4, False),
            ('REST APIs', 5, True),
            ('Docker', 4, False),
            ('SQL', 5, True)
        ]
    else:  # Cloud Platform Engineer
        skills = [
            ('AWS', 5, True),
            ('Docker', 5, True),
            ('Kubernetes', 4, True),
            ('Terraform', 4, True),
            ('Python', 4, False),
            ('Linux', 5, True),
            ('CI/CD', 5, True),
            ('Jenkins', 4, False),
            ('Ansible', 3, False),
            ('Monitoring', 4, False)
        ]
    
    for skill_name, proficiency, is_primary in skills:
        skill = Skill(
            job_profile_id=job_profile.id,
            skill_name=skill_name,
            proficiency_level=proficiency,
            years_of_experience=proficiency - 1,
            is_primary_skill=is_primary
        )
        s.add(skill)
    
    s.commit()
    created_count += 1
    print(f"  ✅ Created '{profile_data['profile_name']}' with {len(skills)} skills")

print(f"\n🎉 Successfully created {created_count} job profiles for {candidate.name}")

# Show final count
total_profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
print(f"📊 Total job profiles: {len(total_profiles)}")

s.close()
