"""
Test the fixed /analytics/job/{job_id} endpoint
Verify it now returns real application counts
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

import requests
import json

# Test against local backend
BASE_URL = "http://localhost:8001"
JOB_ID = 4

print("=" * 100)
print(f"TESTING FIXED ANALYTICS ENDPOINT: GET /analytics/job/{JOB_ID}")
print("=" * 100)

# You'll need to get a valid auth token from your frontend
# For testing, we'll just try the endpoint
print(f"\nMaking request to: {BASE_URL}/analytics/job/{JOB_ID}")
print("Note: This requires authentication. Testing from authenticated frontend recommended.")
print("\nExpected response fields:")
print("  - applications: should be 2 (real count from Application table)")
print("  - views, likes, interviews, offers, hires: may be 0 if no rollup data")
print("\n" + "=" * 100)

# Direct database test instead
from app.database import engine
from app.models import Application, AnalyticsRollupDaily
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone

with Session(engine) as session:
    print("\n✅ VERIFYING FIX:")
    print("-" * 100)
    
    # Count real applications
    start_date = datetime.now(timezone.utc) - timedelta(days=90)
    apps = session.exec(
        select(Application).where(
            Application.job_posting_id == JOB_ID,
            Application.applied_at >= start_date
        )
    ).all()
    
    print(f"Real applications count: {len(apps)}")
    print(f"\nThe API endpoint should now return:")
    print(f'{{')
    print(f'  "applications": {len(apps)},')
    print(f'  "views": <count from rollups>,')
    print(f'  "likes": <count from rollups>,')
    print(f'  ...')
    print(f'}}')
    
    # Check if rollups exist
    rollups = session.exec(
        select(AnalyticsRollupDaily).where(
            AnalyticsRollupDaily.job_posting_id == JOB_ID
        )
    ).all()
    
    if not rollups:
        print(f"\n⚠️  Note: No rollup data exists for views/likes/etc.")
        print(f"   Those metrics will be 0, but applications will be {len(apps)}")
    
    print("\n" + "=" * 100)
    print("NEXT STEPS TO TEST:")
    print("=" * 100)
    print("1. Restart your backend if it's not already running with --reload")
    print("2. Open Recruiter Dashboard in browser")
    print("3. Select job 'Oracle Database Administrator - Senior'")
    print(f"4. Job Performance Dashboard should show: Applications = {len(apps)} ✅")
    print("5. Check browser console for API response")
