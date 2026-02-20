from app.database import get_session
from app.models import JobPosting, Company
from sqlmodel import select

session = next(get_session())
jobs = session.exec(select(JobPosting)).all()

company_job_counts = {}
for job in jobs:
    company = session.get(Company, job.company_id)
    company_name = company.company_name if company else 'Unknown'
    company_job_counts[company_name] = company_job_counts.get(company_name, 0) + 1

print('Job postings per company:')
for name, count in sorted(company_job_counts.items()):
    print(f'  {name}: {count} jobs')

print(f'\nTotal: {len(jobs)} job postings across {len(company_job_counts)} companies')
