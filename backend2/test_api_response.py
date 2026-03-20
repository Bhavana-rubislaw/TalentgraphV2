import requests
import json

API_URL = "http://127.0.0.1:8001"

# Login as Jennifer
login_response = requests.post(
    f"{API_URL}/auth/company/login",
    json={"email": "admin.jennifer@techcorp.com", "password": "jennifer123"}
)

if login_response.status_code == 200:
    token = login_response.json()["token"]
    print("✓ Logged in as Jennifer\n")
    
    # Get job postings
    jobs_response = requests.get(
        f"{API_URL}/job-postings",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"API Response Status: {jobs_response.status_code}\n")
    
    if jobs_response.status_code == 200:
        jobs = jobs_response.json()
        print(f"Total jobs returned: {len(jobs)}\n")
        
        if len(jobs) > 0:
            print("First job details:")
            print(json.dumps(jobs[0], indent=2))
        else:
            print("No jobs returned from API!")
            
        # Check status field
        print("\nStatus field check:")
        for job in jobs:
            print(f"  Job {job['id']}: status={job.get('status', 'MISSING')}, is_active={job.get('is_active', 'MISSING')}")
    else:
        print(f"Error: {jobs_response.text}")
else:
    print(f"Login failed: {login_response.text}")
