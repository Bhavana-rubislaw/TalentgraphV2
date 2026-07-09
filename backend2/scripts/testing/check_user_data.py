"""
Check job postings for recruiter and job preferences for candidate
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, Company, JobPosting, Candidate, JobProfile

def check_data():
    with Session(engine) as session:
        # Check recruiter account
        recruiter_email = "bhavana@rubislawinvest.com"
        recruiter_user = session.exec(
            select(User).where(User.email == recruiter_email)
        ).first()
        
        if recruiter_user:
            print(f"\n{'='*60}")
            print(f"RECRUITER: {recruiter_email}")
            print(f"{'='*60}")
            print(f"User ID: {recruiter_user.id}")
            print(f"Full Name: {recruiter_user.full_name}")
            print(f"Role: {recruiter_user.role}")
            
            # Get company
            company = session.exec(
                select(Company).where(Company.user_id == recruiter_user.id)
            ).first()
            
            if company:
                print(f"\nCompany ID: {company.id}")
                print(f"Company Name: {company.company_name}")
                
                # Get job postings
                job_postings = session.exec(
                    select(JobPosting).where(JobPosting.company_id == company.id)
                ).all()
                
                print(f"\n📋 JOB POSTINGS: {len(job_postings)}")
                print("-" * 60)
                for idx, job in enumerate(job_postings, 1):
                    print(f"{idx}. {job.job_title}")
                    print(f"   ID: {job.id}")
                    print(f"   Status: {job.status}")
                    print(f"   Location: {job.location}")
                    print(f"   Work Type: {job.worktype}")
                    print()
            else:
                print("❌ No company profile found")
        else:
            print(f"❌ Recruiter not found: {recruiter_email}")
        
        print("\n" + "="*60)
        
        # Check candidate account
        candidate_email = "bhavanabayya13@gmail.com"
        candidate_user = session.exec(
            select(User).where(User.email == candidate_email)
        ).first()
        
        if candidate_user:
            print(f"CANDIDATE: {candidate_email}")
            print(f"{'='*60}")
            print(f"User ID: {candidate_user.id}")
            print(f"Full Name: {candidate_user.full_name}")
            print(f"Role: {candidate_user.role}")
            
            # Get candidate profile
            candidate = session.exec(
                select(Candidate).where(Candidate.user_id == candidate_user.id)
            ).first()
            
            if candidate:
                print(f"\nCandidate ID: {candidate.id}")
                
                # Get job preferences (job profiles)
                job_profiles = session.exec(
                    select(JobProfile).where(JobProfile.candidate_id == candidate.id)
                ).all()
                
                print(f"\n🎯 JOB PREFERENCES (Job Profiles): {len(job_profiles)}")
                print("-" * 60)
                for idx, profile in enumerate(job_profiles, 1):
                    print(f"{idx}. {profile.profile_name}")
                    print(f"   ID: {profile.id}")
                    print(f"   Job Role: {profile.job_role}")
                    print(f"   Work Type: {profile.worktype}")
                    print(f"   Product: {profile.product_vendor} - {profile.product_type}")
                    print(f"   Experience: {profile.years_of_experience} years")
                    print(f"   Salary Range: {profile.salary_currency} {profile.salary_min:,.0f} - {profile.salary_max:,.0f}")
                    print()
            else:
                print("❌ No candidate profile found")
        else:
            print(f"❌ Candidate not found: {candidate_email}")
        
        print("="*60)

if __name__ == "__main__":
    print("Checking user data...")
    check_data()
    print("\nDone!")
