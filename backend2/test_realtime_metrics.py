"""
Test Real-Time Analytics Metrics
Verify all metrics show real data from actual tables
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from app.models import (
    Application, JobPosting, Swipe, Meeting, 
    AnalyticsEvent, AnalyticsEventType, MeetingType
)
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone

JOB_ID = 4  # "Oracle Database Administrator - Senior"

print("=" * 100)
print("REAL-TIME ANALYTICS METRICS TEST")
print("=" * 100)

with Session(engine) as session:
    start_datetime = datetime.now(timezone.utc) - timedelta(days=90)
    
    job = session.get(JobPosting, JOB_ID)
    if not job:
        print(f"❌ Job {JOB_ID} not found!")
        exit(1)
    
    print(f"\n✅ Testing metrics for: {job.job_title}")
    print("-" * 100)
    
    # 1. VIEWS - from AnalyticsEvent
    view_events = session.exec(
        select(AnalyticsEvent).where(
            AnalyticsEvent.job_posting_id == JOB_ID,
            AnalyticsEvent.event_type == AnalyticsEventType.JOB_VIEWED,
            AnalyticsEvent.event_time >= start_datetime
        )
    ).all()
    print(f"👁️  VIEWS: {len(view_events)}")
    if not view_events:
        print("   ⚠️  No job view events tracked. Consider adding event tracking when candidates view jobs.")
    
    # 2. LIKES - from Swipe table
    like_swipes = session.exec(
        select(Swipe).where(
            Swipe.job_posting_id == JOB_ID,
            Swipe.action == "like",
            Swipe.action_by == "candidate",
            Swipe.created_at >= start_datetime
        )
    ).all()
    print(f"👍 LIKES: {len(like_swipes)}")
    if like_swipes:
        print(f"   Sample likes:")
        for swipe in like_swipes[:3]:
            print(f"   - Candidate {swipe.candidate_id} liked on {swipe.created_at}")
    
    # 3. APPLICATIONS - from Application table
    applications = session.exec(
        select(Application).where(
            Application.job_posting_id == JOB_ID,
            Application.applied_at >= start_datetime
        )
    ).all()
    print(f"📨 APPLICATIONS: {len(applications)}")
    if applications:
        print(f"   Application statuses:")
        for app in applications:
            print(f"   - App {app.id}: {app.status} (applied {app.applied_at})")
    
    # 4. INTERVIEWS - from Meeting table
    try:
        all_meetings = session.exec(
            select(Meeting).where(
                Meeting.job_posting_id == JOB_ID,
                Meeting.scheduled_start >= start_datetime
            )
        ).all()
        interviews = [m for m in all_meetings if m.meeting_type == "interview"]
        print(f"🎤 INTERVIEWS: {len(interviews)}")
        if interviews:
            print(f"   Interview meetings:")
            for meeting in interviews:
                print(f"   - {meeting.title}: {meeting.status} on {meeting.scheduled_start}")
        else:
            print("   ℹ️  No interviews scheduled yet.")
    except Exception as e:
        print(f"🎤 INTERVIEWS: 0")
        print(f"   ⚠️  Could not fetch interviews: {e}")
        interviews = []
    
    # 5. OFFERS - applications with "selected" status
    offers = [app for app in applications if app.status and 'selected' in app.status.lower()]
    print(f"✅ OFFERS: {len(offers)}")
    if offers:
        for app in offers:
            print(f"   - App {app.id}: {app.status}")
    else:
        print("   ℹ️  No offers made yet (no 'selected' status in applications).")
    
    # 6. HIRES - applications with "hired" status
    hires = [app for app in applications if app.status and 'hired' in app.status.lower()]
    print(f"🎉 HIRES: {len(hires)}")
    if hires:
        for app in hires:
            print(f"   - App {app.id}: {app.status}")
    else:
        print("   ℹ️  No hires yet (no 'hired' status in applications).")
    
    print("\n" + "=" * 100)
    print("SUMMARY - API RESPONSE WILL SHOW:")
    print("=" * 100)
    print("{")
    print(f'  "job_id": {JOB_ID},')
    print(f'  "job_title": "{job.job_title}",')
    print(f'  "views": {len(view_events)},')
    print(f'  "likes": {len(like_swipes)},')
    print(f'  "applications": {len(applications)},')
    print(f'  "interviews_scheduled": {len(interviews)},')
    print(f'  "interviews_completed": {len([m for m in interviews if m.status != "cancelled"])},')
    print(f'  "offers_made": {len(offers)},')
    print(f'  "hires": {len(hires)},')
    print('  ...')
    print('}')
    
    print("\n" + "=" * 100)
    print("RECOMMENDATIONS:")
    print("=" * 100)
    
    if len(view_events) == 0:
        print("📌 TO TRACK VIEWS:")
        print("   Add event tracking when candidates view jobs:")
        print("   - In candidate dashboard, create AnalyticsEvent(JOB_VIEWED) when job is displayed")
        print("   - Or track page views in job detail pages")
    
    if len(like_swipes) > 0:
        print(f"✅ LIKES are working! {len(like_swipes)} likes tracked from Swipe table")
    
    if len(applications) > 0:
        print(f"✅ APPLICATIONS are working! {len(applications)} applications tracked")
    
    if len(interviews) == 0:
        print("📌 TO TRACK INTERVIEWS:")
        print("   Create Meeting records when interviews are scheduled")
        print("   - Use meeting_type = MeetingType.INTERVIEW")
        print("   - Link to job_posting_id and application_id")
    
    print("\n🎯 NOW TEST IN UI:")
    print("1. Restart backend if not using --reload")
    print("2. Open Recruiter Dashboard")
    print("3. Select 'Oracle Database Administrator - Senior'")
    print("4. Job Performance Dashboard should show these real-time counts!")
