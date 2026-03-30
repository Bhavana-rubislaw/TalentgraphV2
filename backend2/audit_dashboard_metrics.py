"""
AUDIT: Job Performance Dashboard Data Flow
Diagnose why metrics show 0 when applications exist
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from app.models import Application, JobPosting, AnalyticsRollupDaily, AnalyticsEvent, Company
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone

JOB_ID = 4  # "Oracle Database Administrator - Senior"

print("=" * 100)
print("JOB PERFORMANCE DASHBOARD DATA FLOW AUDIT")
print("=" * 100)

with Session(engine) as session:
    
    # ═══════════════════════════════════════════════════════════════════
    # 1. VERIFY JOB EXISTS
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[1] JOB POSTING CHECK (job_id={JOB_ID})")
    print("-" * 100)
    
    job = session.get(JobPosting, JOB_ID)
    if not job:
        print(f"❌ ERROR: Job ID {JOB_ID} not found!")
        exit(1)
    
    print(f"✅ Job found: {job.job_title}")
    print(f"   Company ID: {job.company_id}")
    print(f"   Status: {job.status}")
    
    company = session.get(Company, job.company_id)
    if company:
        print(f"   Company: {company.company_name}")
    
    # ═══════════════════════════════════════════════════════════════════
    # 2. CHECK APPLICATIONS TABLE (Real Data)
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[2] APPLICATIONS TABLE (Source of Truth)")
    print("-" * 100)
    
    applications = session.exec(
        select(Application).where(Application.job_posting_id == JOB_ID)
    ).all()
    
    print(f"📊 Total applications for job_id={JOB_ID}: {len(applications)}")
    
    if applications:
        print("\nApplications:")
        for app in applications:
            print(f"  - App ID {app.id}:")
            print(f"    Candidate ID: {app.candidate_id}")
            print(f"    Job Profile ID: {app.job_profile_id}")
            print(f"    Status: {app.status}")
            print(f"    Applied At: {app.applied_at}")
    else:
        print("⚠️  NO APPLICATIONS FOUND IN DATABASE!")
    
    # ═══════════════════════════════════════════════════════════════════
    # 3. CHECK ANALYTICS ROLLUP TABLE (What API Reads)
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[3] ANALYTICS_ROLLUP_DAILY TABLE (What API endpoint reads)")
    print("-" * 100)
    
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=90)
    
    rollups = session.exec(
        select(AnalyticsRollupDaily).where(
            AnalyticsRollupDaily.job_posting_id == JOB_ID,
            AnalyticsRollupDaily.rollup_date >= start_date
        )
    ).all()
    
    print(f"📊 Rollup records for job_id={JOB_ID} (last 90 days): {len(rollups)}")
    
    if rollups:
        total_apps_in_rollup = sum(r.applications_submitted for r in rollups)
        total_views = sum(r.jobs_viewed for r in rollups)
        total_likes = sum(r.jobs_liked for r in rollups)
        
        print(f"\n   Total from rollups:")
        print(f"   - Views: {total_views}")
        print(f"   - Likes: {total_likes}")
        print(f"   - Applications: {total_apps_in_rollup}")
        
        print(f"\n   Detailed rollup data:")
        for r in rollups[-5:]:  # Last 5 records
            print(f"   - Date: {r.rollup_date}")
            print(f"     Views: {r.jobs_viewed}, Likes: {r.jobs_liked}, Apps: {r.applications_submitted}")
    else:
        print("⚠️  NO ROLLUP DATA FOUND!")
        print("   This is why the dashboard shows 0 for all metrics!")
    
    # ═══════════════════════════════════════════════════════════════════
    # 4. CHECK ANALYTICS EVENTS TABLE
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[4] ANALYTICS_EVENT TABLE (Raw Events)")
    print("-" * 100)
    
    events = session.exec(
        select(AnalyticsEvent).where(
            AnalyticsEvent.job_posting_id == JOB_ID
        ).limit(10)
    ).all()
    
    print(f"📊 Analytics events for job_id={JOB_ID}: {len(events)} (showing up to 10)")
    
    if events:
        for event in events:
            print(f"  - {event.event_type}: {event.event_time}")
    else:
        print("⚠️  NO ANALYTICS EVENTS FOUND!")
    
    # ═══════════════════════════════════════════════════════════════════
    # DIAGNOSIS
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 100)
    print("DIAGNOSIS")
    print("=" * 100)
    
    real_apps = len(applications)
    rollup_apps = sum(r.applications_submitted for r in rollups) if rollups else 0
    
    if real_apps > 0 and rollup_apps == 0:
        print(f"\n🔴 PROBLEM IDENTIFIED:")
        print(f"   ✅ {real_apps} real applications exist in Application table")
        print(f"   ❌ BUT rollup table has {rollup_apps} applications recorded")
        print(f"\n   ROOT CAUSE: Analytics rollup data is NOT being populated!")
        print(f"\n   The API endpoint /analytics/job/{JOB_ID} reads from:")
        print(f"   AnalyticsRollupDaily table, NOT the Application table directly")
        print(f"\n   SOLUTION OPTIONS:")
        print(f"   A. Run analytics aggregation/rollup job to populate rollup table")
        print(f"   B. OR: Change API to query Application table directly for real-time counts")
        print(f"   C. OR: Create analytics events when applications are submitted")
    
    elif real_apps == 0:
        print(f"\n⚠️  No applications found in database for job_id={JOB_ID}")
        print(f"   Verify job_id is correct and applications exist")
    
    elif real_apps > 0 and rollup_apps > 0:
        print(f"\n✅ Data is consistent:")
        print(f"   - Application table: {real_apps} applications")
        print(f"   - Rollup table: {rollup_apps} applications")
        
        if real_apps != rollup_apps:
            print(f"\n⚠️  WARNING: Counts don't match! Rollup may be out of date.")
    
    print("\n" + "=" * 100)
    print("RECOMMENDED FIX")
    print("=" * 100)
    print("""
The quickest fix is to change the API endpoint to query the Application table 
directly instead of relying on rollup data:

# In analytics.py, replace rollup query with:
applications = session.exec(
    select(Application).where(
        Application.job_posting_id == job_id,
        Application.applied_at >= start_date
    )
).all()

applications_count = len(applications)

This gives real-time counts instead of relying on pre-aggregated data.
""")
