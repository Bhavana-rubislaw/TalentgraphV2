from app.database import engine
from sqlmodel import Session, select
from app.models import User, Candidate, JobProfile, JobPosting

session = Session(engine)

# Check user
user = session.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
print(f'User: {user.email if user else "NOT FOUND"} (ID: {user.id if user else "N/A"})')

if user:
    # Check candidate
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    print(f'Candidate: {candidate.name if candidate else "NOT FOUND"} (ID: {candidate.id if candidate else "N/A"})')
    
    if candidate:
        # Check job profiles
        profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        print(f'\nJob Profiles: {len(profiles)}')
        for i, profile in enumerate(profiles, 1):
            print(f'  {i}. {profile.profile_name} (ID: {profile.id}) - {profile.product_vendor}/{profile.product_type}/{profile.job_role}')

# Check active jobs
jobs = session.exec(select(JobPosting).where(JobPosting.is_active == True)).all()
print(f'\nActive Job Postings: {len(jobs)}')
for i, job in enumerate(jobs[:3], 1):  # Show first 3
    print(f'  {i}. {job.job_title} - {job.product_vendor}/{job.product_type}/{job.job_role}')

session.close()
