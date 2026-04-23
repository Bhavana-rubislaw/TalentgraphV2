from app.database import get_session
from app.models import JobPosting, Company, User
from sqlmodel import select

session = next(get_session())

# Find hr.mark's user and company
user = session.exec(select(User).where(User.email == 'hr.mark@globalsystems.com')).first()
print(f'User: {user.email}, User ID: {user.id}, Role: {user.role}')

company = session.exec(select(Company).where(Company.user_id == user.id)).first()
print(f'Company record: ID={company.id}, Name="{company.company_name}", User ID={company.user_id}')

# Find all companies with the name "Global Systems Inc"
all_global_companies = session.exec(select(Company).where(Company.company_name == 'Global Systems Inc')).all()
print(f'\nAll companies named "Global Systems Inc": {len(all_global_companies)}')
for c in all_global_companies:
    jobs = session.exec(select(JobPosting).where(JobPosting.company_id == c.id)).all()
    print(f'  Company ID {c.id}, User ID {c.user_id}: {len(jobs)} jobs')

# Find jobs for Global Systems Inc
global_jobs = session.exec(
    select(JobPosting).join(Company).where(Company.company_name == 'Global Systems Inc')
).all()
print(f'\nTotal jobs for Global Systems Inc: {len(global_jobs)}')
for job in global_jobs[:3]:
    print(f'  Job: {job.job_title}, Company ID: {job.company_id}')
