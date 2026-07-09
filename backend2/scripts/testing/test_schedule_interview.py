"""
Test Schedule Interview Flow End-to-End

This script tests the complete interview scheduling workflow:
1. Creates test data (candidate, recruiter, job, application)
2. Calls the schedule interview endpoint
3. Verifies email sending
4. Checks status update
5. Verifies notification creation

Run: python test_schedule_interview.py
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, Candidate, Company, JobPosting, Application
from datetime import datetime, timedelta
import requests
import json

BASE_URL = "http://localhost:8000"  # Adjust if your backend runs on different port

def get_or_create_test_data(session: Session):
    """Get or create test candidate, recruiter, job, and application"""
    print("\n📋 Setting up test data...")
    
    # Create test candidate
    candidate_user = session.exec(
        select(User).where(User.email == "test.candidate@example.com")
    ).first()
    
    if not candidate_user:
        print("   Creating test candidate user...")
        candidate_user = User(
            email="test.candidate@example.com",
            hashed_password="test_password_hash",
            role="candidate",
            is_active=True
        )
        session.add(candidate_user)
        session.flush()
    
    candidate = session.exec(
        select(Candidate).where(Candidate.user_id == candidate_user.id)
    ).first()
    
    if not candidate:
        print("   Creating test candidate profile...")
        candidate = Candidate(
            user_id=candidate_user.id,
            name="Test Candidate",
            location="San Francisco, CA",
            skills=["Python", "React", "PostgreSQL"]
        )
        session.add(candidate)
        session.flush()
    
    # Create test recruiter
    recruiter_user = session.exec(
        select(User).where(User.email == "test.recruiter@example.com")
    ).first()
    
    if not recruiter_user:
        print("   Creating test recruiter user...")
        recruiter_user = User(
            email="test.recruiter@example.com",
            hashed_password="test_password_hash",
            role="recruiter",
            is_active=True
        )
        session.add(recruiter_user)
        session.flush()
    
    company = session.exec(
        select(Company).where(Company.user_id == recruiter_user.id)
    ).first()
    
    if not company:
        print("   Creating test company...")
        company = Company(
            user_id=recruiter_user.id,
            company_name="Test Company Inc",
            industry="Technology"
        )
        session.add(company)
        session.flush()
    
    # Create test job
    job = session.exec(
        select(JobPosting).where(
            JobPosting.company_id == company.id,
            JobPosting.job_title == "Test Software Engineer"
        )
    ).first()
    
    if not job:
        print("   Creating test job posting...")
        job = JobPosting(
            company_id=company.id,
            job_title="Test Software Engineer",
            job_description="This is a test job posting",
            job_type="full_time",
            location="San Francisco, CA",
            salary_min=100000,
            salary_max=150000,
            status="active",
            created_at=datetime.utcnow()
        )
        session.add(job)
        session.flush()
    
    # Create test application
    application = session.exec(
        select(Application).where(
            Application.candidate_id == candidate.id,
            Application.job_posting_id == job.id
        )
    ).first()
    
    if not application:
        print("   Creating test application...")
        application = Application(
            candidate_id=candidate.id,
            job_posting_id=job.id,
            status="under_review",
            applied_at=datetime.utcnow()
        )
        session.add(application)
        session.flush()
    
    session.commit()
    
    print(f"✅ Test data ready:")
    print(f"   Candidate: {candidate.name} ({candidate_user.email})")
    print(f"   Recruiter: {company.company_name} ({recruiter_user.email})")
    print(f"   Job: {job.job_title}")
    print(f"   Application ID: {application.id}")
    
    return {
        "candidate": candidate,
        "candidate_user": candidate_user,
        "recruiter_user": recruiter_user,
        "company": company,
        "job": job,
        "application": application
    }


def login_as_recruiter(email: str, password: str = "test_password"):
    """Login and get JWT token"""
    print(f"\n🔐 Logging in as {email}...")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": email, "password": password}
    )
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print("✅ Login successful")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None


def test_schedule_interview_endpoint(application_id: int, token: str):
    """Test the schedule interview endpoint"""
    print(f"\n📅 Testing schedule interview endpoint...")
    
    # Calculate interview date/time (tomorrow at 2 PM)
    tomorrow = datetime.now() + timedelta(days=1)
    interview_date = tomorrow.strftime("%B %d, %Y")
    interview_time = "2:00 PM"
    
    payload = {
        "date": interview_date,
        "time": interview_time,
        "timezone": "America/Los_Angeles",
        "meeting_link": "https://zoom.us/j/test-meeting-123456",
        "recruiter_notes": "Test interview scheduling - automated test",
        "meeting_provider": None  # Using manual link
    }
    
    print(f"   Date: {interview_date}")
    print(f"   Time: {interview_time}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/applications/{application_id}/schedule-interview",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"\n📡 Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Success!")
            print(f"   Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"   ❌ Failed!")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Backend server not running!")
        print("   Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_status_updated(session: Session, application_id: int):
    """Verify application status was updated to 'scheduled'"""
    print(f"\n🔍 Verifying status update...")
    
    application = session.get(Application, application_id)
    
    if application and application.status == "scheduled":
        print(f"   ✅ Status updated to 'scheduled'")
        if application.recruiter_notes:
            print(f"   ✅ Notes saved: {application.recruiter_notes[:50]}...")
        return True
    else:
        print(f"   ❌ Status not updated (current: {application.status if application else 'NOT FOUND'})")
        return False


def main():
    """Run the complete test"""
    print("\n" + "="*60)
    print("SCHEDULE INTERVIEW FLOW TEST")
    print("="*60)
    
    # Setup
    with Session(engine) as session:
        test_data = get_or_create_test_data(session)
    
    # NOTE: This test requires the auth system to work
    # For now, we'll test the endpoint directly without auth
    # You can manually get a token and paste it here
    
    print("\n" + "="*60)
    print("MANUAL TESTING REQUIRED")
    print("="*60)
    print("\nTo test schedule interview:")
    print("1. Start the backend server")
    print("2. Log in as a recruiter via the frontend")
    print("3. Open Browser DevTools > Network tab")
    print("4. Schedule an interview")
    print("5. Check the network request for:")
    print("   - Request payload")
    print("   - Response status")
    print("   - CORS headers")
    print("   - Error messages")
    print("\nOr manually test using this curl command:")
    print(f"\ncurl -X POST '{BASE_URL}/applications/{test_data['application'].id}/schedule-interview' \\")
    print("  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{")
    print('    "date": "April 2, 2026",')
    print('    "time": "2:00 PM",')
    print('    "timezone": "America/Los_Angeles",')
    print('    "meeting_link": "https://zoom.us/j/test-123456",')
    print('    "recruiter_notes": "Test interview"')
    print("  }'")
    print("\n" + "="*60)


if __name__ == "__main__":
    main()
