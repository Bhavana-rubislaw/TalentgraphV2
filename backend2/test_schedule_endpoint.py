"""
Test script for schedule-interview endpoint
Run this to test the endpoint with proper authentication
"""
import requests
import json

# 1. First login as recruiter to get a valid token
login_response = requests.post(
    "http://localhost:8001/auth/company/login",
    json={
        "email": "b havanabayya13@gmail.com",  # Your recruiter email from the modal
        "password": "your_password_here"  # Replace with actual password
    }
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"✅ Login successful! Token: {token[:20]}...")
    
    # 2. Now test the schedule-interview endpoint
    schedule_payload = {
        "date": "March 29, 2026",
        "time": "10:00 AM",
        "timezone": "Central Time (CT)",
        "meeting_provider": "manual",
        "meeting_link": "https://zoom.us/j/123456789",
        "email_subject": "Interview for Software Engineer",
        "notes_for_candidate": "Please join 5 minutes early"
    }
    
    schedule_response = requests.post(
        "http://localhost:8001/applications/11/schedule-interview",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=schedule_payload
    )
    
    print(f"\n📤 Schedule Interview Response Status: {schedule_response.status_code}")
    print(f"📄 Response Body:")
    print(json.dumps(schedule_response.json(), indent=2))
    
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Error: {login_response.json()}")
