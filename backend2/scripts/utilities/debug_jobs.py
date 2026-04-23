from app.database import get_session
from app.models import User, Company, JobPosting
from sqlmodel import select

session = next(get_session())

# Find hr.mark's company info
user = session.exec(select(User).where(User.email == 'hr.mark@globalsystems.com')).first()
company = session.exec(select(Company).where(Company.user_id == user.id)).first()
print(f'User company: {company.company_name} (ID: {company.id})')

# List all jobs
all_jobs = session.exec(select(JobPosting)).all()
print(f'\nAll jobs in database: {len(all_jobs)}')

for job in all_jobs:
    comp = session.get(Company, job.company_id)
    print(f'  Job {job.id}: {job.job_title} - Company: {comp.company_name} (ID: {comp.id})')