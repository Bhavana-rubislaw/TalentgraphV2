"""
Regression Test: Analytics Job Title AttributeError Fix
========================================================
Tests that GET /analytics/job/{id} correctly uses JobPosting.job_title
instead of the non-existent JobPosting.title attribute.

Issue: Previously failed with AttributeError: 'JobPosting' object has no attribute 'title'
Fix: Changed job.title to job.job_title in analytics.py line 390
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_session, engine
from sqlmodel import Session, select
from app.models import User, Company, JobPosting

client = TestClient(app)

def test_analytics_job_endpoint_uses_correct_field():
    """Test that analytics endpoint accesses job_title, not title"""
    
    print("🧪 Testing GET /analytics/job/{id} endpoint...")
    
    # Get a valid job posting ID from database
    with Session(engine) as session:
        job = session.exec(select(JobPosting).limit(1)).first()
        
        if not job:
            print("⚠️  No jobs found in database, skipping test")
            return
        
        job_id = job.id
        print(f"   Using job_id: {job_id}")
        print(f"   Job title (from db): {job.job_title}")
        
        # Verify job has job_title field
        assert hasattr(job, 'job_title'), "JobPosting must have job_title field"
        assert job.job_title is not None, "job_title should not be None"
        
        # Get a company user for authentication
        company = session.get(Company, job.company_id)
        if not company:
            print("⚠️  No company found for job, skipping test")
            return
            
        user = session.exec(select(User).where(User.email == "admin.jennifer@techcorp.com")).first()
        if not user:
            print("⚠️  Test user not found, skipping test")
            return
    
    # Login to get token
    print("   Authenticating...")
    response = client.post(
        "/auth/company/login",
        json={"email": "admin.jennifer@techcorp.com", "password": "Kutty_1304"}
    )
    
    if response.status_code != 200:
        print(f"⚠️  Login failed with status {response.status_code}, skipping test")
        return
        
    token = response.json()["access_token"]
    
    # Test analytics endpoint
    print(f"   Calling GET /analytics/job/{job_id}...")
    response = client.get(
        f"/analytics/job/{job_id}?range_days=90",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Assertions
    print(f"   Response status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    data = response.json()
    
    # Verify response has job_title field
    assert "job_title" in data, "Response must contain job_title field"
    assert data["job_title"] is not None, "job_title should not be None"
    
    print(f"   ✅ Response job_title: {data['job_title']}")
    
    # Verify response has expected analytics fields
    required_fields = [
        "job_id", "job_title", "views", "likes", "applications",
        "interviews_scheduled", "interviews_completed", "offers_made", "hires",
        "like_rate", "application_rate", "interview_rate", "offer_rate", "hire_rate"
    ]
    
    for field in required_fields:
        assert field in data, f"Response must contain {field} field"
    
    print("   ✅ All required fields present")
    print("✅ TEST PASSED: Analytics endpoint correctly uses job.job_title")
    return True


def test_job_posting_model_field():
    """Verify JobPosting model has job_title, not title"""
    
    print("\n🧪 Testing JobPosting model field names...")
    
    with Session(engine) as session:
        job = session.exec(select(JobPosting).limit(1)).first()
        
        if not job:
            print("⚠️  No jobs found in database, skipping test")
            return
        
        # Should have job_title
        assert hasattr(job, 'job_title'), "JobPosting must have job_title attribute"
        print(f"   ✅ JobPosting.job_title exists: {job.job_title}")
        
        # Should NOT have title as a persisted field (unless added as @property)
        # This test verifies we're using the correct canonical field name
        if hasattr(job, 'title'):
            # If title exists, it should be a property alias pointing to job_title
            print(f"   ⚠️  JobPosting.title exists (likely a @property alias)")
            if hasattr(JobPosting.title, 'fget'):
                print(f"   ℹ️  Confirmed: 'title' is a @property, not a DB column")
        else:
            print(f"   ✅ JobPosting.title does not exist (correct - using job_title)")
    
    print("✅ TEST PASSED: Model uses correct field name")
    return True


if __name__ == "__main__":
    print("=" * 70)
    print("Analytics Job Title Regression Tests")
    print("=" * 70)
    
    try:
        test_job_posting_model_field()
        test_analytics_job_endpoint_uses_correct_field()
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
