"""
Quick Validation Script for Notification Preferences
Fast smoke test to verify notification preferences are working

Usage: python quick_validate_notification_preferences.py

Quick checks:
1. Backend is running
2. Candidate can access preferences
3. Recruiter can access preferences
4. Default preferences are created
5. Updates work
"""

import requests
import sys


BASE_URL = "http://127.0.0.1:8001"
CANDIDATE_EMAIL = "sarah.anderson@email.com"
CANDIDATE_PASSWORD = "Kutty_1304"
RECRUITER_EMAIL = "admin.jennifer@techcorp.com"
RECRUITER_PASSWORD = "Kutty_1304"


def test_backend_health():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=3)
        return response.status_code == 200
    except:
        return False


def login_and_test(email, password, role_name):
    """Login and test basic preferences access"""
    try:
        # Login
        auth_endpoint = f"/auth/{role_name}/login"
        response = requests.post(
            f"{BASE_URL}{auth_endpoint}",
            json={"email": email, "password": password},
            timeout=5
        )
        
        if response.status_code != 200:
            return False, f"Login failed: {response.status_code}"
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get preferences
        response = requests.get(
            f"{BASE_URL}/notification-preferences",
            headers=headers,
            timeout=5
        )
        
        if response.status_code != 200:
            return False, f"Get preferences failed: {response.status_code}"
        
        preferences = response.json()
        
        if len(preferences) == 0:
            return False, "No preferences returned"
        
        # Quick update test
        update_data = {
            "event_type": preferences[0]["event_type"],
            "in_app_enabled": not preferences[0]["in_app_enabled"],
            "email_enabled": preferences[0]["email_enabled"],
            "in_app_frequency": preferences[0]["in_app_frequency"],
            "email_frequency": preferences[0]["email_frequency"],
            "priority": preferences[0]["priority"]
        }
        
        response = requests.post(
            f"{BASE_URL}/notification-preferences",
            json=update_data,
            headers=headers,
            timeout=5
        )
        
        if response.status_code != 200:
            return False, f"Update failed: {response.status_code}"
        
        return True, f"OK ({len(preferences)} preferences)"
        
    except Exception as e:
        return False, str(e)


def main():
    print("\n" + "="*60)
    print("NOTIFICATION PREFERENCES - QUICK VALIDATION")
    print("="*60 + "\n")
    
    tests = []
    
    # Test 1: Backend health
    print("1. Checking backend health...", end=" ")
    if test_backend_health():
        print("✓ OK")
        tests.append(True)
    else:
        print("✗ FAIL - Backend not running")
        tests.append(False)
        print("\n❌ Backend is not running on http://127.0.0.1:8001")
        print("   Start it with: uvicorn app.main:app --host 127.0.0.1 --port 8001")
        sys.exit(1)
    
    # Test 2: Candidate
    print("2. Testing candidate preferences...", end=" ")
    success, message = login_and_test(CANDIDATE_EMAIL, CANDIDATE_PASSWORD, "candidate")
    if success:
        print(f"✓ {message}")
        tests.append(True)
    else:
        print(f"✗ FAIL - {message}")
        tests.append(False)
    
    # Test 3: Recruiter
    print("3. Testing recruiter preferences...", end=" ")
    success, message = login_and_test(RECRUITER_EMAIL, RECRUITER_PASSWORD, "company")
    if success:
        print(f"✓ {message}")
        tests.append(True)
    else:
        print(f"✗ FAIL - {message}")
        tests.append(False)
    
    # Summary
    print("\n" + "="*60)
    passed = sum(tests)
    total = len(tests)
    
    if passed == total:
        print(f"✅ ALL CHECKS PASSED ({passed}/{total})")
        print("="*60 + "\n")
        print("✓ Notification preferences are working correctly!")
        print("\nRun comprehensive tests with:")
        print("  pytest test_notification_preferences.py -v")
        print("  python manual_test_notification_preferences.py")
        return 0
    else:
        print(f"❌ {total - passed} CHECK(S) FAILED ({passed}/{total})")
        print("="*60 + "\n")
        print("Run detailed tests to diagnose issues:")
        print("  python manual_test_notification_preferences.py")
        return 1


if __name__ == "__main__":
    sys.exit(main())
