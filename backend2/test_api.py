import requests

# Test endpoint with authentication
API_BASE = "http://localhost:8001"

# First, login to get a token
print("=== Testing Candidate Login ===")
login_response = requests.post(
    f"{API_BASE}/auth/candidate/login",
    json={"email": "bhavanabayya13@gmail.com", "password": "kutty"}
)
print(f"Login Status: {login_response.status_code}")

if login_response.status_code == 200:
    token = login_response.json().get("token")
    print(f"Token received: {token[:20]}...")
    
    # Test get me endpoint
    print("\n=== Testing GET /auth/me ===")
    me_response = requests.get(
        f"{API_BASE}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {me_response.status_code}")
    if me_response.status_code == 200:
        print(f"User: {me_response.json()}")
    
    # Test recommendations endpoint
    print("\n=== Testing GET /dashboard/candidate/recommendations ===")
    rec_response = requests.get(
        f"{API_BASE}/dashboard/candidate/recommendations?job_profile_id=38",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {rec_response.status_code}")
    if rec_response.status_code == 200:
        data = rec_response.json()
        print(f"Recommendations count: {len(data)}")
        if len(data) > 0:
            print(f"First recommendation: {data[0]['job_posting']['job_title']} ({data[0]['match_percentage']}%)")
    else:
        print(f"Error: {rec_response.text}")
else:
    print(f"Login failed: {login_response.text}")
