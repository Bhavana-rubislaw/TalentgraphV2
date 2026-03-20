from app.database import engine
from sqlmodel import Session, select
from app.models import User, Company, JobPosting, JobPostingStatus
from app.schemas import JobPostingRead

session = Session(engine)

# Get Jennifer's jobs
user = session.exec(select(User).where(User.email == 'admin.jennifer@techcorp.com')).first()
company = session.exec(select(Company).where(Company.user_id == user.id)).first()
company_ids = session.exec(select(Company.id).where(Company.company_name == company.company_name)).all()

query = select(JobPosting).where(
    JobPosting.company_id.in_(company_ids),
    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
)

postings = session.exec(query).all()
print(f"Found {len(postings)} job postings\n")

# Test how they serialize to API response
for job in postings[:2]:  # Just test first 2
    print(f"Job ID {job.id}: {job.job_title}")
    print(f"  - status field: {job.status}")
    print(f"  - status type: {type(job.status)}")
    print(f"  - status value: '{job.status.value if hasattr(job.status, 'value') else job.status}'")
    print(f"  - status == 'active': {job.status == 'active'}")
    print(f"  - status == JobPostingStatus.ACTIVE: {job.status == JobPostingStatus.ACTIVE}")
    
    # Test schema serialization
    response = JobPostingRead.model_validate(job)
    print(f"  - Schema status: {response.status}")
    print(f"  - Schema status type: {type(response.status)}")
    print()

session.close()
