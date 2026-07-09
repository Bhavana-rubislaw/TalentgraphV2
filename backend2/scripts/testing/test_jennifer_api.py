import requests
import json

# Test with Jennifer's credentials  
API_URL = "http://127.0.0.1:8001"

# Login as Jennifer
login_response = requests.post(
    f"{API_URL}/auth/company/login",
    json={
        "email": "admin.jennifer@techcorp.com",
        "password": "jennifer123"
    }
)

if login_response.status_code == 200:
    token = login_response.json()["token"]
    print(f"✓ Logged in as Jennifer")
    print(f"Token: {token[:50]}...")
    
    # Get job postings
    jobs_response = requests.get(
        f"{API_URL}/job-postings",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"\nAPI Response Status: {jobs_response.status_code}")
    
    if jobs_response.status_code == 200:
        jobs = jobs_response.json()
        print(f"\n✓ Found {len(jobs)} job postings for Jennifer:")
        print("=" * 80)
        for job in jobs:
            print(f"ID: {job['id']:3} | {job['job_title'][:45]:45} | Status: {job.get('status', 'N/A'):10}")
        print("=" * 80)
    else:
        print(f"✗ Error fetching jobs: {jobs_response.text}")
else:
    print(f"✗ Login failed: {login_response.text}")
