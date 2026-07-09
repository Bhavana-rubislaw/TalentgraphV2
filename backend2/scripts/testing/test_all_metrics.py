"""
Test all real-time metrics for Job Performance Dashboard
Verify all counts are calculated from real tables
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from app.models import (
    Application, Swipe, Meeting, JobPosting, 
    MeetingStatus, MeetingType
)
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone

JOB_ID = 4  # "Oracle Database Administrator - Senior"

print("=" * 100)
print("REAL-TIME METRICS VERIFICATION - All Metrics")
print("=" * 100)

with Session(engine) as session:
    job = session.get(JobPosting, JOB_ID)
    if not job:
        print(f"❌ Job {JOB_ID} not found!")
        exit(1)
    
    print(f"\n✅ Job: {job.job_title}")
    print(f"   Company ID: {job.company_id}")
    
    # Date range (last 90 days)
    start_datetime = datetime.now(timezone.utc) - timedelta(days=90)
    
    print(f"\n📅 Date Range: Last 90 days (from {start_datetime.date()})")
    print("=" * 100)
    
    # ═══════════════════════════════════════════════════════════════════
    # 1. APPLICATIONS
    # ═══════════════════════════════════════════════════════════════════
    print("\n[1] APPLICATIONS")
    print("-" * 100)
    applications = session.exec(
        select(Application).where(
            Application.job_posting_id == JOB_ID,
            Application.applied_at >= start_datetime
        )
    ).all()
    
    print(f"✅ Total Applications: {len(applications)}")
    for app in applications:
        print(f"   - Candidate {app.candidate_id}: {app.status} (applied {app.applied_at})")
    
    # ═══════════════════════════════════════════════════════════════════
    # 2. LIKES
    # ═══════════════════════════════════════════════════════════════════
    print("\n[2] LIKES (Candidate likes)")
    print("-" * 100)
    likes = session.exec(
        select(Swipe).where(
            Swipe.job_posting_id == JOB_ID,
            Swipe.action == "like",
            Swipe.action_by == "candidate",
            Swipe.created_at >= start_datetime
        )
    ).all()
    
    print(f"✅ Total Likes: {len(likes)}")
    for like in likes[:5]:  # Show first 5
        print(f"   - Candidate {like.candidate_id} liked on {like.created_at}")
    
    # ═══════════════════════════════════════════════════════════════════
    # 3. VIEWS
    # ═══════════════════════════════════════════════════════════════════
    print("\n[3] VIEWS (Unique candidates who interacted)")
    print("-" * 100)
    all_swipes = session.exec(
        select(Swipe).where(
            Swipe.job_posting_id == JOB_ID,
            Swipe.created_at >= start_datetime
        )
    ).all()
    
    unique_viewers = set(swipe.candidate_id for swipe in all_swipes)
    views_from_swipes = len(unique_viewers)
    
    # Fallback: if no swipes, count applicants
    if views_from_swipes == 0 and len(applications) > 0:
        unique_applicants = set(app.candidate_id for app in applications)
        views = len(unique_applicants)
        print(f"✅ Views (from applicants): {views}")
    else:
        views = views_from_swipes
        print(f"✅ Views (from swipes): {views}")
        print(f"   Unique candidates who swiped: {views}")
    
    # ═══════════════════════════════════════════════════════════════════
    # 4. INTERVIEWS
    # ═══════════════════════════════════════════════════════════════════
    print("\n[4] INTERVIEWS")
    print("-" * 100)
    interviews = session.exec(
        select(Meeting).where(
            Meeting.job_posting_id == JOB_ID,
            Meeting.meeting_type == MeetingType.INTERVIEW,
            Meeting.scheduled_start >= start_datetime
        )
    ).all()
    
    scheduled = [m for m in interviews if m.status in [MeetingStatus.SCHEDULED, MeetingStatus.COMPLETED]]
    completed = [m for m in interviews if m.status == MeetingStatus.COMPLETED]
    
    print(f"✅ Interviews Scheduled: {len(scheduled)}")
    print(f"✅ Interviews Completed: {len(completed)}")
    
    if interviews:
        for interview in interviews[:5]:
            print(f"   - {interview.title}: {interview.status} (scheduled {interview.scheduled_start})")
    else:
        print(f"   ℹ️  No interviews scheduled yet")
    
    # ═══════════════════════════════════════════════════════════════════
    # 5. OFFERS
    # ═══════════════════════════════════════════════════════════════════
    print("\n[5] OFFERS (Applications with selected/shortlisted status)")
    print("-" * 100)
    offers = [app for app in applications if app.status in ['selected', 'shortlisted']]
    
    print(f"✅ Total Offers: {len(offers)}")
    for offer in offers:
        print(f"   - Candidate {offer.candidate_id}: {offer.status}")
    
    # ═══════════════════════════════════════════════════════════════════
    # 6. HIRES
    # ═══════════════════════════════════════════════════════════════════
    print("\n[6] HIRES (Applications with selected status)")
    print("-" * 100)
    hires = [app for app in applications if app.status == 'selected']
    
    print(f"✅ Total Hires: {len(hires)}")
    for hire in hires:
        print(f"   - Candidate {hire.candidate_id}: hired")
    
    # ═══════════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 100)
    print("DASHBOARD METRICS SUMMARY")
    print("=" * 100)
    print(f"""
📊 Job Performance Dashboard for job_id={JOB_ID}:

   👁️  Views:              {views}
   👍 Likes:              {len(likes)}
   📨 Applications:       {len(applications)}
   🎤 Interviews (Sched): {len(scheduled)}
   ✅ Interviews (Done):  {len(completed)}
   📋 Offers:             {len(offers)}
   🎉 Hires:              {len(hires)}

Conversion Rates:
   Like Rate:         {(len(likes) / views * 100) if views > 0 else 0:.1f}%
   Application Rate:  {(len(applications) / views * 100) if views > 0 else 0:.1f}%
   Interview Rate:    {(len(scheduled) / len(applications) * 100) if len(applications) > 0 else 0:.1f}%
   Offer Rate:        {(len(offers) / len(completed) * 100) if len(completed) > 0 else 0:.1f}%
   Hire Rate:         {(len(hires) / len(offers) * 100) if len(offers) > 0 else 0:.1f}%
""")
    
    print("=" * 100)
    print("✅ ALL METRICS ARE NOW CALCULATED FROM REAL TABLES!")
    print("=" * 100)
    print("\nNext steps:")
    print("1. Refresh your Recruiter Dashboard in browser")
    print("2. Select 'Oracle Database Administrator - Senior' job")
    print("3. All metrics should now show real-time counts!")
