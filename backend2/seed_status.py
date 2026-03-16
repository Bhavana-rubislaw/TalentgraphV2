from app.database import engine
from app.models import User, Candidate, Company, JobPosting, JobProfile, Match, Application
from sqlmodel import Session, select

emails = [
    ('kuttybayya@gmail.com', 'Candidate'),
    ('bhavanabayya13@gmail.com', 'Candidate'),
    ('bayyakutty02@gmail.com', 'Recruiter'),
    ('bhavana@rubislawinvest.com', 'Recruiter')
]

print("=" * 70)
print("SEED STATUS SUMMARY")
print("=" * 70)

with Session(engine) as s:
    print("\nUser Accounts:")
    for email, expected_role in emails:
        u = s.exec(select(User).where(User.email == email)).first()
        if u:
            print(f"  [OK] {email}")
        else:
            print(f"  [MISSING] {email} - {expected_role}")
    
    print(f"\nDatabase Counts:")
    print(f"  Total Users: {len(s.exec(select(User)).all())}")
    print(f"  Total Candidates: {len(s.exec(select(Candidate)).all())}")
    print(f"  Total Companies: {len(s.exec(select(Company)).all())}")
    print(f"  Total Job Postings: {len(s.exec(select(JobPosting)).all())}")
    print(f"  Total Job Profiles: {len(s.exec(select(JobProfile)).all())}")
    print(f"  Total Matches: {len(s.exec(select(Match)).all())}")
    print(f"  Total Applications: {len(s.exec(select(Application)).all())}")

print("\n" + "=" * 70)
print("Login at: http://localhost:3003")
print("Password for all users: Kutty_1304")
print("=" * 70)
