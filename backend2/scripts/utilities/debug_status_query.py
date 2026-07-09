from app.database import engine
from sqlmodel import Session, select
from app.models import JobPosting, JobPostingStatus

session = Session(engine)

# Test with different query approaches
print("Test 1: All jobs with company_id IN (1,2,3)")
query1 = select(JobPosting).where(JobPosting.company_id.in_([1, 2, 3]))
jobs1 = session.exec(query1).all()
print(f"Found {len(jobs1)} jobs")
for job in jobs1[:3]:
    print(f"  ID: {job.id}, Company: {job.company_id}, Status: {job.status}, Type: {type(job.status)}")

print("\nTest 2: Jobs with status filter")
query2 = select(JobPosting).where(
    JobPosting.company_id.in_([1, 2, 3]),
    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
)
jobs2 = session.exec(query2).all()
print(f"Found {len(jobs2)} jobs")

print("\nTest 3: Check raw status values")
query3 = select(JobPosting).where(JobPosting.company_id.in_([1, 2, 3]))
jobs3 = session.exec(query3).all()
for job in jobs3[:5]:
    print(f"  ID: {job.id}, Status DB value: '{job.status}', Equals ACTIVE: {job.status == JobPostingStatus.ACTIVE}, Equals 'active': {job.status == 'active'}")

print("\nTest 4: Check enum comparison")
print(f"JobPostingStatus.ACTIVE value: '{JobPostingStatus.ACTIVE}'")
print(f"JobPostingStatus.ACTIVE type: {type(JobPostingStatus.ACTIVE)}")

session.close()
