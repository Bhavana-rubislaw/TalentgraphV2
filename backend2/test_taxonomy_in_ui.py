"""
Test if candidate job profiles are returning taxonomy data via API
"""

import requests
import json

def test_taxonomy_in_api():
    base_url = "http://localhost:8001"
    
    print("=" * 80)
    print("TESTING TAXONOMY DATA IN API RESPONSES")
    print("=" * 80)
    
    # Test 1: Check taxonomy API endpoints
    print("\n[Test 1] Checking Product Taxonomy API...")
    try:
        response = requests.get(f"{base_url}/product-taxonomy/vendors?limit=3")
        if response.status_code == 200:
            vendors = response.json()
            print(f"✓ Taxonomy API Working: {len(vendors)} vendors found")
            if vendors:
                print(f"  Sample vendor: {vendors[0]['name']}")
        else:
            print(f"✗ Taxonomy API Failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Login as a recruiter and check job profile data
    print("\n[Test 2] Testing job profile data in recruiter dashboard...")
    try:
        # Login as recruiter
        login_response = requests.post(
            f"{base_url}/auth/login",
            data={
                "username": "recruiter.anna@globalsystems.com",
                "password": "Kutty_1304"
            }
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get job postings
            jobs_response = requests.get(f"{base_url}/job-postings", headers=headers)
            if jobs_response.status_code == 200:
                jobs = jobs_response.json()
                if jobs:
                    job_id = jobs[0]["id"]
                    print(f"✓ Found job posting ID: {job_id}")
                    
                    # Get recommendations for this job
                    rec_response = requests.get(
                        f"{base_url}/dashboard/recruiter/recommendations?job_posting_id={job_id}",
                        headers=headers
                    )
                    
                    if rec_response.status_code == 200:
                        data = rec_response.json()
                        if data.get("recommendations"):
                            rec = data["recommendations"][0]
                            jp = rec.get("job_profile", {})
                            
                            print("\n✓ Candidate Job Profile Data:")
                            print(f"  Profile Name: {jp.get('profile_name')}")
                            print(f"  Vendor: {jp.get('product_vendor')}")
                            print(f"  Product Type: {jp.get('product_type')}")
                            print(f"  Role: {jp.get('job_role')}")
                            
                            if jp.get('product_vendor') and jp.get('product_type'):
                                print("\n✓✓✓ TAXONOMY DATA IS PRESENT IN API! ✓✓✓")
                            else:
                                print("\n✗✗✗ TAXONOMY DATA IS MISSING! ✗✗✗")
                        else:
                            print("✗ No recommendations found")
                    else:
                        print(f"✗ Recommendations API Failed: {rec_response.status_code}")
                else:
                    print("✗ No job postings found")
            else:
                print(f"✗ Job postings API Failed: {jobs_response.status_code}")
        else:
            print(f"✗ Login Failed: {login_response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_taxonomy_in_api()
