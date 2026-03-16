"""Show complete status of all 4 accounts"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

emails = [
    'kuttybayya@gmail.com',
    'bhavanabayya13@gmail.com',
    'bayyakutty02@gmail.com',
    'bhavana@rubislawinvest.com'
]

for email in emails:
    u = s.exec(select(User).where(User.email == email)).first()
    if not u:
        print(f"[-] {email}: MISSING")
        continue
    
    print(f"[+] {email} ({u.role})")
    
    if u.role == 'candidate':
        c = s.exec(select(Candidate).where(Candidate.user_id == u.id)).first()
        if c:
            profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()
            print(f"    Candidate ID: {c.id}, Job Profiles: {len(profiles)}")
        else:
            print(f"    [-] NO CANDIDATE RECORD")
    else:  # recruiter
        comp = s.exec(select(Company).where(Company.user_id == u.id)).first()
        if comp:
            jobs = s.exec(select(JobPosting).where(JobPosting.company_id == comp.id)).all()
            print(f"    Company: {comp.company_name}, Jobs: {len(jobs)}")
        else:
            print(f"    [-] NO COMPANY RECORD")

print(f"\n=== DATABASE TOTALS ===")
print(f"Total Users: {len(s.exec(select(User)).all())}")
print(f"Total Candidates: {len(s.exec(select(Candidate)).all())}")
print(f"Total Companies: {len(s.exec(select(Company)).all())}")
print(f"Total Job Profiles: {len(s.exec(select(JobProfile)).all())}")
print(f"Total Job Postings: {len(s.exec(select(JobPosting)).all())}")
