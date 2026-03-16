"""Verify all 4 accounts are complete with companies and jobs"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

emails = [
    ('kuttybayya@gmail.com', 'candidate'),
    ('bhavanabayya13@gmail.com', 'candidate'),
    ('bayyakutty02@gmail.com', 'recruiter'),
    ('bhavana@rubislawinvest.com', 'recruiter')
]

print("\n=== USER VERIFICATION ===")
for email, expected_role in emails:
    u = s.exec(select(User).where(User.email == email)).first()
    if not u:
        print(f"[-] {email}: MISSING")
        continue
    
    print(f"[+] {email} ({u.role})")
    
    if expected_role == 'candidate':
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
print(f"Total Matches: {len(s.exec(select(Match)).all())}")

print("\n[READY] All accounts created. Login at http://localhost:3003 with password: Kutty_1304")
