"""
Manual Integration Test for Notification Preferences
Runs against a live backend server to verify notification preferences functionality

Usage:
    python manual_test_notification_preferences.py

Requirements:
    - Backend server running on http://127.0.0.1:8001
    - Test users seeded in database:
      * Candidate: sarah.anderson@email.com / Kutty_1304
      * Recruiter: admin.jennifer@techcorp.com / Kutty_1304
"""

import requests
import json
from typing import Dict, List
from datetime import datetime


# Configuration
BASE_URL = "http://127.0.0.1:8001"
CANDIDATE_EMAIL = "sarah.anderson@email.com"
CANDIDATE_PASSWORD = "Kutty_1304"
RECRUITER_EMAIL = "admin.jennifer@techcorp.com"
RECRUITER_PASSWORD = "Kutty_1304"


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


def login_candidate() -> str:
    """Login as candidate and return access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/candidate/login",
            json={"email": CANDIDATE_EMAIL, "password": CANDIDATE_PASSWORD}
        )
        response.raise_for_status()
        token = response.json()["access_token"]
        print_success(f"Candidate login successful")
        return token
    except Exception as e:
        print_error(f"Candidate login failed: {e}")
        raise


def login_recruiter() -> str:
    """Login as recruiter and return access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/company/login",
            json={"email": RECRUITER_EMAIL, "password": RECRUITER_PASSWORD}
        )
        response.raise_for_status()
        token = response.json()["access_token"]
        print_success(f"Recruiter login successful")
        return token
    except Exception as e:
        print_error(f"Recruiter login failed: {e}")
        raise


def get_preferences(token: str) -> List[Dict]:
    """Get notification preferences for authenticated user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/notification-preferences", headers=headers)
    response.raise_for_status()
    return response.json()


def get_default_preferences(token: str) -> List[Dict]:
    """Get default preferences based on user role"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/notification-preferences/defaults", headers=headers)
    response.raise_for_status()
    return response.json()


def update_single_preference(token: str, preference_data: Dict) -> Dict:
    """Update a single preference"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/notification-preferences",
        json=preference_data,
        headers=headers
    )
    response.raise_for_status()
    return response.json()


def bulk_update_preferences(token: str, preferences: List[Dict]) -> List[Dict]:
    """Bulk update multiple preferences"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/notification-preferences/bulk",
        json={"preferences": preferences},
        headers=headers
    )
    response.raise_for_status()
    return response.json()


def partial_update_preference(token: str, event_type: str, update_data: Dict) -> Dict:
    """Partially update a preference by event type"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.patch(
        f"{BASE_URL}/notification-preferences/{event_type}",
        json=update_data,
        headers=headers
    )
    response.raise_for_status()
    return response.json()


# ========== TEST CASES ==========

def test_candidate_default_preferences():
    """Test 1: Verify candidate default preferences are created"""
    print_header("TEST 1: Candidate Default Preferences")
    
    token = login_candidate()
    preferences = get_preferences(token)
    
    print_info(f"Retrieved {len(preferences)} preference(s)")
    
    # Verify expected event types
    expected_events = [
        "application_status",
        "match_found",
        "shortlisted",
        "invitation",
        "interview_scheduled",
        "interview_reminder",
        "message_received",
        "job_recommendation"
    ]
    
    event_types = [p["event_type"] for p in preferences]
    
    missing_events = [e for e in expected_events if e not in event_types]
    if missing_events:
        print_error(f"Missing event types: {missing_events}")
        return False
    
    print_success("All expected candidate event types present")
    
    # Verify defaults
    for pref in preferences:
        if not pref["in_app_enabled"]:
            print_warning(f"Default in_app_enabled is False for {pref['event_type']}")
        if not pref["email_enabled"]:
            print_warning(f"Default email_enabled is False for {pref['event_type']}")
    
    print_success("Candidate default preferences validated")
    
    # Print sample preferences
    print(f"\n{Colors.BOLD}Sample Preferences:{Colors.ENDC}")
    for pref in preferences[:3]:
        print(f"  • {pref['event_type']}: In-App={pref['in_app_enabled']}, "
              f"Email={pref['email_enabled']}, Priority={pref['priority']}")
    
    return True


def test_recruiter_default_preferences():
    """Test 2: Verify recruiter default preferences are created"""
    print_header("TEST 2: Recruiter Default Preferences")
    
    token = login_recruiter()
    preferences = get_preferences(token)
    
    print_info(f"Retrieved {len(preferences)} preference(s)")
    
    # Verify expected event types
    expected_events = [
        "application_received",
        "match_found",
        "interview_scheduled",
        "interview_confirmed",
        "message_received",
        "job_update"
    ]
    
    event_types = [p["event_type"] for p in preferences]
    
    missing_events = [e for e in expected_events if e not in event_types]
    if missing_events:
        print_error(f"Missing event types: {missing_events}")
        return False
    
    print_success("All expected recruiter event types present")
    
    # Verify candidate-only events are NOT present
    candidate_only = ["application_status", "shortlisted", "invitation", "interview_reminder"]
    found_candidate_events = [e for e in candidate_only if e in event_types]
    if found_candidate_events:
        print_error(f"Found candidate-only events in recruiter preferences: {found_candidate_events}")
        return False
    
    print_success("No candidate-only events in recruiter preferences")
    print_success("Recruiter default preferences validated")
    
    # Print sample preferences
    print(f"\n{Colors.BOLD}Sample Preferences:{Colors.ENDC}")
    for pref in preferences[:3]:
        print(f"  • {pref['event_type']}: In-App={pref['in_app_enabled']}, "
              f"Email={pref['email_enabled']}, Priority={pref['priority']}")
    
    return True


def test_candidate_update_single_preference():
    """Test 3: Update single candidate preference"""
    print_header("TEST 3: Update Single Candidate Preference")
    
    token = login_candidate()
    
    # Update application_status preference
    update_data = {
        "event_type": "application_status",
        "in_app_enabled": True,
        "email_enabled": False,  # Disable email
        "in_app_frequency": "daily",
        "email_frequency": "daily",
        "priority": "normal"
    }
    
    print_info(f"Updating 'application_status' preference...")
    updated = update_single_preference(token, update_data)
    
    assert updated["event_type"] == "application_status"
    assert updated["email_enabled"] is False
    assert updated["in_app_frequency"] == "daily"
    
    print_success("Single preference updated successfully")
    print(f"  • Email enabled: {updated['email_enabled']}")
    print(f"  • In-app frequency: {updated['in_app_frequency']}")
    
    # Verify persistence
    preferences = get_preferences(token)
    app_status = next(p for p in preferences if p["event_type"] == "application_status")
    
    if app_status["email_enabled"] is False:
        print_success("Update persisted correctly")
    else:
        print_error("Update did not persist")
        return False
    
    return True


def test_recruiter_bulk_update():
    """Test 4: Bulk update recruiter preferences"""
    print_header("TEST 4: Bulk Update Recruiter Preferences")
    
    token = login_recruiter()
    
    # Bulk update multiple preferences
    bulk_data = [
        {
            "event_type": "application_received",
            "email_frequency": "daily"  # Daily digest
        },
        {
            "event_type": "interview_scheduled",
            "priority": "urgent",
            "in_app_frequency": "realtime",
            "email_frequency": "realtime"
        },
        {
            "event_type": "message_received",
            "email_enabled": False  # Disable email for messages
        }
    ]
    
    print_info(f"Bulk updating {len(bulk_data)} preferences...")
    updated = bulk_update_preferences(token, bulk_data)
    
    assert len(updated) == 3
    print_success(f"Bulk updated {len(updated)} preferences")
    
    # Verify specific updates
    app_received = next(p for p in updated if p["event_type"] == "application_received")
    assert app_received["email_frequency"] == "daily"
    print_success(f"  • application_received: email_frequency = {app_received['email_frequency']}")
    
    interview = next(p for p in updated if p["event_type"] == "interview_scheduled")
    assert interview["priority"] == "urgent"
    print_success(f"  • interview_scheduled: priority = {interview['priority']}")
    
    message = next(p for p in updated if p["event_type"] == "message_received")
    assert message["email_enabled"] is False
    print_success(f"  • message_received: email_enabled = {message['email_enabled']}")
    
    return True


def test_candidate_partial_update():
    """Test 5: Partial update candidate preference"""
    print_header("TEST 5: Partial Update Candidate Preference")
    
    token = login_candidate()
    
    # Get current state
    preferences = get_preferences(token)
    interview_reminder = next(p for p in preferences if p["event_type"] == "interview_reminder")
    
    print_info(f"Current interview_reminder email_enabled: {interview_reminder['email_enabled']}")
    
    # Partial update - only change email_enabled
    partial_data = {"email_enabled": False}
    
    print_info(f"Applying partial update...")
    updated = partial_update_preference(token, "interview_reminder", partial_data)
    
    assert updated["event_type"] == "interview_reminder"
    assert updated["email_enabled"] is False
    # Other fields should remain unchanged
    assert updated["in_app_enabled"] == interview_reminder["in_app_enabled"]
    
    print_success("Partial update successful")
    print(f"  • email_enabled changed to: {updated['email_enabled']}")
    print(f"  • in_app_enabled unchanged: {updated['in_app_enabled']}")
    
    return True


def test_get_defaults_endpoint():
    """Test 6: Get default preferences endpoint"""
    print_header("TEST 6: Get Default Preferences Endpoint")
    
    # Test candidate defaults
    candidate_token = login_candidate()
    candidate_defaults = get_default_preferences(candidate_token)
    
    print_info(f"Candidate defaults: {len(candidate_defaults)} event type(s)")
    candidate_event_types = [d["event_type"] for d in candidate_defaults]
    print(f"  Events: {', '.join(candidate_event_types[:4])}...")
    
    # Test recruiter defaults
    recruiter_token = login_recruiter()
    recruiter_defaults = get_default_preferences(recruiter_token)
    
    print_info(f"Recruiter defaults: {len(recruiter_defaults)} event type(s)")
    recruiter_event_types = [d["event_type"] for d in recruiter_defaults]
    print(f"  Events: {', '.join(recruiter_event_types[:4])}...")
    
    # Verify different event types for different roles
    if "application_status" in candidate_event_types and "application_status" not in recruiter_event_types:
        print_success("Role-based event filtering working correctly")
    else:
        print_error("Role-based event filtering not working")
        return False
    
    return True


def test_role_isolation():
    """Test 7: Verify preferences are isolated between roles"""
    print_header("TEST 7: Role Isolation")
    
    candidate_token = login_candidate()
    recruiter_token = login_recruiter()
    
    # Update candidate preference
    candidate_update = {
        "event_type": "interview_scheduled",
        "email_enabled": False,
        "in_app_enabled": True,
        "in_app_frequency": "realtime",
        "email_frequency": "realtime",
        "priority": "urgent"
    }
    update_single_preference(candidate_token, candidate_update)
    print_info("Updated candidate 'interview_scheduled' preference")
    
    # Update recruiter preference
    recruiter_update = {
        "event_type": "interview_scheduled",
        "email_enabled": True,
        "in_app_enabled": True,
        "in_app_frequency": "daily",
        "email_frequency": "realtime",
        "priority": "normal"
    }
    update_single_preference(recruiter_token, recruiter_update)
    print_info("Updated recruiter 'interview_scheduled' preference")
    
    # Verify candidate preferences unchanged
    candidate_prefs = get_preferences(candidate_token)
    candidate_interview = next(p for p in candidate_prefs if p["event_type"] == "interview_scheduled")
    
    if candidate_interview["email_enabled"] is False and candidate_interview["priority"] == "urgent":
        print_success("Candidate preferences unchanged after recruiter update")
    else:
        print_error("Candidate preferences were affected by recruiter update")
        return False
    
    # Verify recruiter preferences unchanged
    recruiter_prefs = get_preferences(recruiter_token)
    recruiter_interview = next(p for p in recruiter_prefs if p["event_type"] == "interview_scheduled")
    
    if recruiter_interview["email_enabled"] is True and recruiter_interview["in_app_frequency"] == "daily":
        print_success("Recruiter preferences unchanged after candidate update")
    else:
        print_error("Recruiter preferences were affected by candidate update")
        return False
    
    print_success("Role isolation verified - preferences are properly isolated")
    
    return True


def test_auth_required():
    """Test 8: Verify authentication is required"""
    print_header("TEST 8: Authentication Required")
    
    # Try to access without token
    try:
        response = requests.get(f"{BASE_URL}/notification-preferences")
        if response.status_code == 401:
            print_success("Unauthenticated request properly rejected (401)")
            return True
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False


def test_complete_candidate_workflow():
    """Test 9: Complete candidate workflow"""
    print_header("TEST 9: Complete Candidate Workflow")
    
    token = login_candidate()
    
    # Step 1: Get initial preferences
    preferences = get_preferences(token)
    print_info(f"Step 1: Retrieved {len(preferences)} initial preferences")
    
    # Step 2: Customize preferences (reduce email noise)
    print_info("Step 2: Customizing preferences to reduce email noise...")
    bulk_updates = [
        {"event_type": "job_recommendation", "email_enabled": False},
        {"event_type": "application_status", "email_frequency": "daily"},
        {"event_type": "match_found", "email_enabled": False}
    ]
    bulk_update_preferences(token, bulk_updates)
    print_success("Bulk updates applied")
    
    # Step 3: Verify changes
    print_info("Step 3: Verifying changes persisted...")
    final_prefs = get_preferences(token)
    
    job_rec = next(p for p in final_prefs if p["event_type"] == "job_recommendation")
    if job_rec["email_enabled"] is False:
        print_success("  ✓ job_recommendation: email disabled")
    else:
        print_error("  ✗ job_recommendation: email not disabled")
        return False
    
    app_status = next(p for p in final_prefs if p["event_type"] == "application_status")
    if app_status["email_frequency"] == "daily":
        print_success("  ✓ application_status: email frequency = daily")
    else:
        print_error("  ✗ application_status: email frequency not updated")
        return False
    
    match_found = next(p for p in final_prefs if p["event_type"] == "match_found")
    if match_found["email_enabled"] is False:
        print_success("  ✓ match_found: email disabled")
    else:
        print_error("  ✗ match_found: email not disabled")
        return False
    
    print_success("Complete candidate workflow validated")
    return True


def test_complete_recruiter_workflow():
    """Test 10: Complete recruiter workflow"""
    print_header("TEST 10: Complete Recruiter Workflow")
    
    token = login_recruiter()
    
    # Step 1: Get initial preferences
    preferences = get_preferences(token)
    print_info(f"Step 1: Retrieved {len(preferences)} initial preferences")
    
    # Step 2: Configure for daily digest on applications, immediate for interviews
    print_info("Step 2: Configuring preferences...")
    bulk_updates = [
        {
            "event_type": "application_received",
            "email_frequency": "daily"
        },
        {
            "event_type": "interview_scheduled",
            "priority": "urgent",
            "in_app_frequency": "realtime",
            "email_frequency": "realtime"
        },
        {
            "event_type": "interview_confirmed",
            "priority": "urgent"
        }
    ]
    bulk_update_preferences(token, bulk_updates)
    print_success("Bulk updates applied")
    
    # Step 3: Verify
    print_info("Step 3: Verifying changes...")
    final_prefs = get_preferences(token)
    
    app_received = next(p for p in final_prefs if p["event_type"] == "application_received")
    if app_received["email_frequency"] == "daily":
        print_success("  ✓ application_received: email frequency = daily")
    else:
        print_error("  ✗ application_received: email frequency not updated")
        return False
    
    interview_sched = next(p for p in final_prefs if p["event_type"] == "interview_scheduled")
    if interview_sched["priority"] == "urgent":
        print_success("  ✓ interview_scheduled: priority = urgent")
    else:
        print_error("  ✗ interview_scheduled: priority not updated")
        return False
    
    interview_conf = next(p for p in final_prefs if p["event_type"] == "interview_confirmed")
    if interview_conf["priority"] == "urgent":
        print_success("  ✓ interview_confirmed: priority = urgent")
    else:
        print_error("  ✗ interview_confirmed: priority not updated")
        return False
    
    print_success("Complete recruiter workflow validated")
    return True


# ========== MAIN TEST RUNNER ==========

def run_all_tests():
    """Run all test cases"""
    print_header("NOTIFICATION PREFERENCES MANUAL INTEGRATION TESTS")
    print(f"Testing against: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    tests = [
        ("Candidate Default Preferences", test_candidate_default_preferences),
        ("Recruiter Default Preferences", test_recruiter_default_preferences),
        ("Update Single Candidate Preference", test_candidate_update_single_preference),
        ("Bulk Update Recruiter Preferences", test_recruiter_bulk_update),
        ("Partial Update Candidate Preference", test_candidate_partial_update),
        ("Get Default Preferences Endpoint", test_get_defaults_endpoint),
        ("Role Isolation", test_role_isolation),
        ("Authentication Required", test_auth_required),
        ("Complete Candidate Workflow", test_complete_candidate_workflow),
        ("Complete Recruiter Workflow", test_complete_recruiter_workflow),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Print summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.OKGREEN}PASS{Colors.ENDC}" if result else f"{Colors.FAIL}FAIL{Colors.ENDC}"
        print(f"  {status}  {name}")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}")
        print("╔════════════════════════════════════════════╗")
        print("║  ALL TESTS PASSED ✓                        ║")
        print("║  Notification Preferences Working!         ║")
        print("╚════════════════════════════════════════════╝")
        print(Colors.ENDC)
    else:
        print(f"{Colors.FAIL}{Colors.BOLD}")
        print("╔════════════════════════════════════════════╗")
        print(f"║  {total - passed} TEST(S) FAILED                            ║")
        print("║  Check output above for details            ║")
        print("╚════════════════════════════════════════════╝")
        print(Colors.ENDC)
    
    return passed == total


if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except Exception as e:
        print_error(f"Test runner crashed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
