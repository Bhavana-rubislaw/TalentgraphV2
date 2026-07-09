"""Test if taxonomy data now appears in API responses with fallback"""
import requests

# Backend URL
BASE_URL = "http://localhost:8001"

print("\n=== TAXONOMY API TEST ===\n")

try:
    # 1. Login
    print("1. Authenticating...")
    login_data = {
        "email": "recruiter.anna@globalsystems.com",
        "password": "Kutty_1304"
    }
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data
    )
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        exit(1)
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login successful\n")
    
    # 2. Get job postings
    print("2. Fetching job postings...")
    response = requests.get(f"{BASE_URL}/job-postings", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get job postings: {response.status_code}")
        exit(1)
    
    jobs = response.json()
    if not jobs:
        print("❌ No job postings found")
        exit(1)
    
    job_id = jobs[0]["id"]
    print(f"✓ Found job posting ID: {job_id}\n")
    
    # 3. Get recommendations
    print("3. Fetching recommendations...")
    response = requests.get(
        f"{BASE_URL}/dashboard/recruiter/recommendations",
        params={"job_posting_id": job_id},
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get recommendations: {response.status_code}")
        print(response.text)
        exit(1)
    
    data = response.json()
    recommendations = data.get("recommendations", [])
    
    if not recommendations:
        print("❌ No recommendations found")
        exit(1)
    
    print(f"✓ Found {len(recommendations)} recommendations\n")
    
    # 4. Check taxonomy data in first recommendation
    print("4. Checking taxonomy data...\n")
    print("=" * 60)
    
    for i, rec in enumerate(recommendations[:3], 1):  # Check first 3
        jp = rec["job_profile"]
        print(f"\nRECOMMENDATION #{i}:")
        print(f"  Profile Name: {jp.get('profile_name', 'N/A')}")
        print(f"  Vendor:       {jp.get('product_vendor', '(empty)')}")
        print(f"  Product Type: {jp.get('product_type', '(empty)')}")
        print(f"  Job Role:     {jp.get('job_role', '(empty)')}")
        
        # Check if all three fields are populated
        has_vendor = bool(jp.get('product_vendor'))
        has_type = bool(jp.get('product_type'))
        has_role = bool(jp.get('job_role'))
        
        if has_vendor and has_type and has_role:
            print(f"  ✓ Status: ALL TAXONOMY FIELDS PRESENT")
        else:
            print(f"  ⚠ Status: MISSING FIELDS")
            if not has_vendor:
                print(f"     - Missing vendor")
            if not has_type:
                print(f"     - Missing product type")
            if not has_role:
                print(f"     - Missing role")
    
    print("\n" + "=" * 60)
    
    # Final verdict
    first_jp = recommendations[0]["job_profile"]
    if first_jp.get('product_vendor') and first_jp.get('product_type') and first_jp.get('job_role'):
        print("\n✓✓✓ [SUCCESS] Taxonomy data IS present in API responses!")
        print("The UI should now display vendor/product/role names correctly.")
        print("\nNext step: Refresh your frontend and check if the data appears.")
    else:
        print("\n❌ [FAILED] Taxonomy fields are still empty")
        print("Need to investigate further.")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
