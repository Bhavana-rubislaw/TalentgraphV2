import requests
import json

# Test the API endpoint
base_url = "http://127.0.0.1:8001"

# Login first to get token
login_data = {
    "email": "sarah.anderson@email.com",
    "password": "password123"
}

try:
    # Login
    response = requests.post(f"{base_url}/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful!")
        
        # Get applied/liked jobs
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{base_url}/dashboard/candidate/applied-liked-jobs", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ API Response:")
            print(f"  Applied jobs: {len(data.get('applied_jobs', []))}")
            print(f"  Liked jobs: {len(data.get('liked_jobs', []))}")
            
            if data.get('applied_jobs'):
                print(f"\n  Sample applied job:")
                print(f"    {json.dumps(data['applied_jobs'][0], indent=4)}")
            
            if data.get('liked_jobs'):
                print(f"\n  Sample liked job:")
                print(f"    {json.dumps(data['liked_jobs'][0], indent=4)}")
        else:
            print(f"❌ Failed to get jobs: {response.status_code}")
            print(f"   {response.text}")
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to backend. Is the server running on http://127.0.0.1:8001?")
