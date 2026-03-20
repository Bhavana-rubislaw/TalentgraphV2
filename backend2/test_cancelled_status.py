"""
Test script to verify CANCELLED job posting functionality
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import JobPosting, JobPostingStatus

def test_cancelled_functionality():
    """Verify that cancelled status works correctly"""
    
    with Session(engine) as session:
        print("\n🧪 Testing CANCELLED Job Posting Functionality\n")
        
        # Show current distribution
        all_jobs = session.exec(select(JobPosting)).all()
        print(f"📊 Total job postings: {len(all_jobs)}")
        
        status_counts = {}
        for job in all_jobs:
            status = job.status.value if hasattr(job.status, 'value') else str(job.status)
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print("\n📈 Status Distribution:")
        for status, count in sorted(status_counts.items()):
            print(f"   {status.upper()}: {count} jobs")
        
        # Check for cancelled jobs
        cancelled_jobs = session.exec(
            select(JobPosting).where(JobPosting.status == JobPostingStatus.CANCELLED)
        ).all()
        
        print(f"\n❌ Cancelled jobs: {len(cancelled_jobs)}")
        if cancelled_jobs:
            for job in cancelled_jobs:
                print(f"   • {job.job_title}")
                print(f"     Cancelled at: {job.cancelled_at}")
                print(f"     Reason: {job.cancellation_reason}")
        
        # Verify schema has new columns
        print("\n✅ Schema Verification:")
        sample_job = all_jobs[0] if all_jobs else None
        if sample_job:
            has_cancelled_at = hasattr(sample_job, 'cancelled_at')
            has_reason = hasattr(sample_job, 'cancellation_reason')
            print(f"   cancelled_at field: {'✓' if has_cancelled_at else '✗'}")
            print(f"   cancellation_reason field: {'✓' if has_reason else '✗'}")
        
        # Verify enum has CANCELLED
        print("\n✅ Enum Verification:")
        enum_values = [e.value for e in JobPostingStatus]
        print(f"   JobPostingStatus values: {', '.join(enum_values)}")
        if 'cancelled' in enum_values:
            print("   CANCELLED status: ✓ Present")
        else:
            print("   CANCELLED status: ✗ Missing")
        
        print("\n✅ All checks completed!")
        print("\n📝 Next Steps:")
        print("   1. Restart backend if not auto-reloaded")
        print("   2. Refresh frontend (port 3002)")
        print("   3. Try cancelling a job posting")
        print("   4. Check notification bell for cancellation notification")

if __name__ == "__main__":
    test_cancelled_functionality()
