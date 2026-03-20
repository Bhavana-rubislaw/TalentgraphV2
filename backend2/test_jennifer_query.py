from app.database import engine
from sqlmodel import Session, select
from app.models import User, Company, JobPosting, JobPostingStatus

session = Session(engine)

# Get Jennifer's user
user = session.exec(select(User).where(User.email == 'admin.jennifer@techcorp.com')).first()
print(f"User ID: {user.id}, Role: {user.role}")

# Get Jennifer's company
company = session.exec(select(Company).where(Company.user_id == user.id)).first()
print(f"Company ID: {company.id}, Name: {company.company_name}")

# Get all companies with same name
company_ids = session.exec(select(Company.id).where(Company.company_name == company.company_name)).all()
print(f"All companies with same name: {company_ids}")

# Build the query like the endpoint does
query = select(JobPosting).where(JobPosting.company_id.in_(company_ids))
query = query.where(
    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
)

postings = session.exec(query).all()
print(f"\nTotal job postings found: {len(postings)}")
for job in postings:
    print(f"  ID: {job.id}, Title: {job.title}, Status: {job.status}, is_active: {job.is_active}")

session.close()
