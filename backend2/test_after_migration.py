import requests

API_BASE = "http://localhost:8001"

print("=== Testing API After Migration ===\n")

# Login
print("1. Testing login...")
login_resp = requests.post(
    f"{API_BASE}/auth/candidate/login",
    json={"email": "bhavanabayya13@gmail.com", "password": "kutty"}
)
print(f"   Status: {login_resp.status_code}")

if login_resp.status_code == 200:
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get recommendations
    print("\n2. Testing recommendations endpoint...")
    rec_resp = requests.get(
        f"{API_BASE}/dashboard/candidate/recommendations?job_profile_id=38",
        headers=headers
    )
    print(f"   Status: {rec_resp.status_code}")
    
    if rec_resp.status_code == 200:
        recs = rec_resp.json()
        print(f"   ✓ Success! Found {len(recs)} recommendations")
        if recs:
            print(f"\n   First 3 recommendations:")
            for i, rec in enumerate(recs[:3], 1):
                job = rec['job_posting']
                print(f"     {i}. {job['job_title']} ({rec['match_percentage']}% match)")
    else:
        print(f"   ❌ Error: {rec_resp.text}")
else:
    print(f"   ❌ Login failed: {login_resp.text}")
