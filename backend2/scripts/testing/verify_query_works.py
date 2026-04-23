from app.database import engine
from sqlmodel import Session, select
from app.models import User, Company, JobPosting, JobPostingStatus

session = Session(engine)

# Test the exact query from the endpoint
user = session.exec(select(User).where(User.email == 'admin.jennifer@techcorp.com')).first()
company = session.exec(select(Company).where(Company.user_id == user.id)).first()
company_ids = session.exec(select(Company.id).where(Company.company_name == company.company_name)).all()

query = select(JobPosting).where(JobPosting.company_id.in_(company_ids))
query = query.where(
    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
)

postings = session.exec(query).all()
print(f"✓ Found {len(postings)} job postings for Jennifer")
for job in postings:
    print(f"  ID: {job.id}, Title: {job.job_title}, Status: {job.status}")

session.close()
