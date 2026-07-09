"""
Debug script to check why Apply Now button is failing with 400 errors
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from app.models import JobPosting, Application, JobProfile, User
from sqlmodel import Session, select

def debug_apply_button():
    """Check common issues causing 400 errors on /applications/apply"""
    with Session(engine) as session:
        print("=" * 80)
        print("DEBUGGING APPLY NOW BUTTON - 400 ERROR INVESTIGATION")
        print("=" * 80)
        
        # 1. Check Job Posting statuses
        print("\n1. JOB POSTING STATUSES:")
        print("-" * 80)
        jobs = session.exec(select(JobPosting)).all()
        print(f"Total jobs: {len(jobs)}")
        
        status_counts = {}
        frozen_jobs = []
        for job in jobs:
            status = job.status
            status_counts[status] = status_counts.get(status, 0) + 1
            if status == "frozen":
                frozen_jobs.append((job.id, job.job_title))
        
        print(f"\nStatus distribution:")
        for status, count in status_counts.items():
            print(f"  {status}: {count}")
        
        if frozen_jobs:
            print(f"\n⚠️  WARNING: Found {len(frozen_jobs)} FROZEN jobs (cannot accept applications):")
            for job_id, title in frozen_jobs[:10]:
                print(f"  - Job ID {job_id}: {title}")
        else:
            print("\n✅ No FROZEN jobs found")
        
        # 2. Check for candidate users and their job profiles
        print("\n2. CANDIDATE USERS & JOB PROFILES:")
        print("-" * 80)
        candidates = session.exec(
            select(User).where(User.role == "candidate")
        ).all()
        print(f"Total candidates: {len(candidates)}")
        
        for candidate in candidates[:5]:  # Show first 5
            profiles = session.exec(
                select(JobProfile).where(JobProfile.candidate_id == candidate.id)
            ).all()
            print(f"\n  Candidate: {candidate.email} (ID: {candidate.id})")
            print(f"  Job Profiles: {len(profiles)}")
            
            if profiles:
                for profile in profiles[:3]:  # Show first 3 profiles
                    print(f"    - Profile ID {profile.id}: {profile.first_name} {profile.last_name}")
            else:
                print(f"    ⚠️  WARNING: No job profiles found for this candidate!")
        
        # 3. Check existing applications
        print("\n3. EXISTING APPLICATIONS:")
        print("-" * 80)
        applications = session.exec(select(Application)).all()
        print(f"Total applications: {len(applications)}")
        
        # Group by status
        app_status_counts = {}
        for app in applications:
            status = app.status
            app_status_counts[status] = app_status_counts.get(status, 0) + 1
        
        print(f"\nApplication status distribution:")
        for status, count in app_status_counts.items():
            print(f"  {status}: {count}")
        
        # Check for duplicate applications (same candidate + job)
        print("\n4. CHECKING FOR POTENTIAL DUPLICATE APPLICATION ISSUES:")
        print("-" * 80)
        
        # Get recent applications
        recent_apps = session.exec(
            select(Application)
            .order_by(Application.id.desc())
            .limit(20)
        ).all()
        
        print(f"\nRecent applications (last 20):")
        for app in recent_apps:
            job = session.get(JobPosting, app.job_posting_id)
            job_title = job.job_title if job else "Unknown"
            print(f"  - App ID {app.id}: Candidate {app.candidate_id} → Job {app.job_posting_id} ({job_title})")
            print(f"    Status: {app.status}")
        
        # 5. Specific check for Job ID 1 (from the screenshot URL /applications/apply/1)
        print("\n5. SPECIFIC CHECK FOR JOB ID 1:")
        print("-" * 80)
        job_1 = session.get(JobPosting, 1)
        if job_1:
            print(f"✅ Job ID 1 exists: {job_1.job_title}")
            print(f"   Status: {job_1.status}")
            print(f"   Company ID: {job_1.company_id}")
            
            if job_1.status == "frozen":
                print(f"\n⚠️  ISSUE FOUND: Job ID 1 has status=FROZEN!")
                print(f"   This job cannot accept applications.")
                print(f"   Error returned: 'This job is not currently accepting applications.'")
            
            # Check applications for this job
            apps_for_job_1 = session.exec(
                select(Application).where(Application.job_posting_id == 1)
            ).all()
            print(f"\n   Applications for this job: {len(apps_for_job_1)}")
            for app in apps_for_job_1:
                print(f"     - Candidate ID {app.candidate_id}, Status: {app.status}")
        else:
            print(f"❌ Job ID 1 NOT FOUND in database")
        
        print("\n" + "=" * 80)
        print("RECOMMENDATIONS:")
        print("=" * 80)
        
        if frozen_jobs:
            print("\n1. ⚠️  FROZEN JOBS DETECTED:")
            print(f"   Found {len(frozen_jobs)} jobs with status='frozen'")
            print(f"   These jobs will return 400 error: 'This job is not currently accepting applications.'")
            print(f"\n   To fix: Update job status to 'active' or 'reposted':")
            print(f"   UPDATE job_postings SET status = 'active' WHERE status = 'frozen';")
        
        if not any(session.exec(select(JobProfile)).all()):
            print("\n2. ⚠️  NO JOB PROFILES FOUND:")
            print(f"   Candidates need at least one job profile to apply")
            print(f"   Check if candidates have created their profiles")
        
        print("\n3. 📝 CHECK BACKEND LOGS:")
        print(f"   The backend uvicorn terminal will show the exact 400 error message")
        print(f"   Look for HTTPException detail messages in the logs")

if __name__ == "__main__":
    debug_apply_button()
