"""
Live Email Integration Test for Notification Preferences
Tests real email delivery based on user notification preferences

Test Users:
- bhavanabayya13@gmail.com (Candidate)
- bhavana@rubislawinvest.com (Recruiter)

Run this test against live backend to verify:
1. Notification preferences routes work
2. Emails are sent/blocked according to preferences
3. Email delivery respects frequency settings
"""

import requests
import json
import time
from typing import Dict, List, Optional
from datetime import datetime


class Colors:
    """Terminal colors for better readability"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class NotificationEmailTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8001"):
        self.base_url = base_url
        self.candidate_email = "bhavanabayya13@gmail.com"
        self.recruiter_email = "bhavana@rubislawinvest.com"
        self.candidate_token = None
        self.recruiter_token = None
        self.candidate_id = None
        self.recruiter_id = None
        
    def print_header(self, text: str):
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")
    
    def print_step(self, step: str):
        print(f"{Colors.CYAN}{Colors.BOLD}▶ {step}{Colors.ENDC}")
    
    def print_success(self, msg: str):
        print(f"{Colors.GREEN}  ✓ {msg}{Colors.ENDC}")
    
    def print_error(self, msg: str):
        print(f"{Colors.RED}  ✗ {msg}{Colors.ENDC}")
    
    def print_info(self, msg: str):
        print(f"{Colors.YELLOW}  ℹ {msg}{Colors.ENDC}")
    
    def print_result(self, data: Dict):
        print(f"{Colors.BLUE}  {json.dumps(data, indent=4)}{Colors.ENDC}")
    
    # =============== STEP 1: SETUP TEST USERS ===============
    
    def setup_test_users(self):
        """Create or login test users"""
        self.print_header("STEP 1: SETUP TEST USERS")
        
        # Candidate
        self.print_step(f"Setting up candidate: {self.candidate_email}")
        self._setup_candidate()
        
        # Recruiter
        self.print_step(f"Setting up recruiter: {self.recruiter_email}")
        self._setup_recruiter()
    
    def _setup_candidate(self):
        """Setup candidate user"""
        try:
            # Try login first
            response = requests.post(
                f"{self.base_url}/auth/candidate/login",
                json={
                    "email": self.candidate_email,
                    "password": "TestPass123!"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.candidate_token = data["access_token"]
                self.candidate_id = data.get("user_id")
                self.print_success(f"Logged in as candidate (User ID: {self.candidate_id})")
            else:
                # Try signup
                response = requests.post(
                    f"{self.base_url}/auth/candidate/signup",
                    json={
                        "email": self.candidate_email,
                        "password": "TestPass123!",
                        "full_name": "Bhavana Bayya (Test)"
                    }
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    self.candidate_token = data["access_token"]
                    self.candidate_id = data.get("user_id")
                    self.print_success(f"Created candidate account (User ID: {self.candidate_id})")
                else:
                    self.print_error(f"Failed to setup candidate: {response.text}")
        except Exception as e:
            self.print_error(f"Error setting up candidate: {str(e)}")
    
    def _setup_recruiter(self):
        """Setup recruiter user"""
        try:
            # Try login first
            response = requests.post(
                f"{self.base_url}/auth/company/login",
                json={
                    "email": self.recruiter_email,
                    "password": "TestPass123!"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.recruiter_token = data["access_token"]
                self.recruiter_id = data.get("user_id")
                self.print_success(f"Logged in as recruiter (User ID: {self.recruiter_id})")
            else:
                self.print_info("Recruiter account needs to be created via admin/signup")
                self.print_info("Use the web interface to create recruiter account first")
        except Exception as e:
            self.print_error(f"Error setting up recruiter: {str(e)}")
    
    # =============== STEP 2: GET CURRENT PREFERENCES ===============
    
    def get_current_preferences(self):
        """Get current notification preferences"""
        self.print_header("STEP 2: GET CURRENT NOTIFICATION PREFERENCES")
        
        if self.candidate_token:
            self.print_step("Candidate Preferences")
            self._get_preferences("candidate", self.candidate_token)
        
        if self.recruiter_token:
            self.print_step("Recruiter Preferences")
            self._get_preferences("recruiter", self.recruiter_token)
    
    def _get_preferences(self, role: str, token: str):
        """Get preferences for a user"""
        try:
            response = requests.get(
                f"{self.base_url}/notification-preferences",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                prefs = response.json()
                self.print_success(f"Retrieved {len(prefs)} preferences")
                
                for pref in prefs[:3]:  # Show first 3
                    print(f"    • {pref['event_type']}: "
                          f"Email={pref['email_enabled']} ({pref['email_frequency']}), "
                          f"InApp={pref['in_app_enabled']} ({pref['in_app_frequency']})")
                
                if len(prefs) > 3:
                    print(f"    ... and {len(prefs) - 3} more")
            else:
                self.print_error(f"Failed to get preferences: {response.status_code}")
        except Exception as e:
            self.print_error(f"Error getting preferences: {str(e)}")
    
    # =============== STEP 3: UPDATE PREFERENCES FOR TESTING ===============
    
    def setup_test_preferences(self):
        """Setup specific preferences for testing"""
        self.print_header("STEP 3: CONFIGURE TEST PREFERENCES")
        
        if self.candidate_token:
            self.print_step("Configuring Candidate Preferences")
            self._setup_candidate_preferences()
        
        if self.recruiter_token:
            self.print_step("Configuring Recruiter Preferences")
            self._setup_recruiter_preferences()
    
    def _setup_candidate_preferences(self):
        """Setup candidate test preferences"""
        test_config = [
            {
                "event_type": "application_status",
                "email_enabled": True,
                "email_frequency": "realtime",
                "in_app_enabled": True,
                "in_app_frequency": "realtime"
            },
            {
                "event_type": "interview_scheduled",
                "email_enabled": True,
                "email_frequency": "realtime",
                "in_app_enabled": True,
                "in_app_frequency": "realtime"
            },
            {
                "event_type": "message_received",
                "email_enabled": False,  # Disabled for testing
                "email_frequency": "daily",
                "in_app_enabled": True,
                "in_app_frequency": "realtime"
            }
        ]
        
        self._bulk_update_preferences(self.candidate_token, test_config)
    
    def _setup_recruiter_preferences(self):
        """Setup recruiter test preferences"""
        test_config = [
            {
                "event_type": "application_received",
                "email_enabled": True,
                "email_frequency": "realtime",
                "in_app_enabled": True,
                "in_app_frequency": "realtime"
            },
            {
                "event_type": "interview_confirmed",
                "email_enabled": True,
                "email_frequency": "realtime",
                "in_app_enabled": True,
                "in_app_frequency": "realtime"
            }
        ]
        
        self._bulk_update_preferences(self.recruiter_token, test_config)
    
    def _bulk_update_preferences(self, token: str, preferences: List[Dict]):
        """Bulk update preferences"""
        try:
            response = requests.post(
                f"{self.base_url}/notification-preferences/bulk",
                headers={"Authorization": f"Bearer {token}"},
                json={"preferences": preferences}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.print_success(f"Updated {result.get('updated_count', len(preferences))} preferences")
                
                for pref in preferences:
                    status = "✓ Email ON" if pref["email_enabled"] else "✗ Email OFF"
                    print(f"    {status} - {pref['event_type']} ({pref['email_frequency']})")
            else:
                self.print_error(f"Failed to update preferences: {response.status_code}")
        except Exception as e:
            self.print_error(f"Error updating preferences: {str(e)}")
    
    # =============== STEP 4: TRIGGER TEST NOTIFICATIONS ===============
    
    def trigger_test_notifications(self):
        """Trigger notifications and verify email delivery"""
        self.print_header("STEP 4: TRIGGER TEST NOTIFICATIONS")
        
        self.print_info("The following tests will verify email delivery based on preferences")
        self.print_info("Check your inbox: bhavanabayya13@gmail.com and bhavana@rubislawinvest.com")
        print()
        
        tests = [
            {
                "name": "Application Status Update (Email: ON)",
                "endpoint": f"{self.base_url}/test/notification/application_status",
                "expected_email": True,
                "recipient": "candidate"
            },
            {
                "name": "Interview Scheduled (Email: ON)",
                "endpoint": f"{self.base_url}/test/notification/interview_scheduled",
                "expected_email": True,
                "recipient": "candidate"
            },
            {
                "name": "Message Received (Email: OFF)",
                "endpoint": f"{self.base_url}/test/notification/message_received",
                "expected_email": False,
                "recipient": "candidate"
            },
            {
                "name": "Application Received (Email: ON)",
                "endpoint": f"{self.base_url}/test/notification/application_received",
                "expected_email": True,
                "recipient": "recruiter"
            }
        ]
        
        for test in tests:
            self._run_notification_test(test)
            time.sleep(2)  # Wait between tests
    
    def _run_notification_test(self, test: Dict):
        """Run a single notification test"""
        self.print_step(f"Test: {test['name']}")
        
        token = self.candidate_token if test['recipient'] == 'candidate' else self.recruiter_token
        
        if not token:
            self.print_error(f"No token available for {test['recipient']}")
            return
        
        expected = "✓ Email should be sent" if test['expected_email'] else "✗ Email should be blocked"
        self.print_info(f"Expected: {expected}")
        
        # Note: You'll need to create these test endpoints in your backend
        # Or use the notification service directly via a test route
        self.print_info("Manual verification required - check email inbox")
    
    # =============== STEP 5: VERIFY PREFERENCES PERSISTENCE ===============
    
    def verify_preferences_persist(self):
        """Verify preferences were saved correctly"""
        self.print_header("STEP 5: VERIFY PREFERENCES PERSISTENCE")
        
        if self.candidate_token:
            self.print_step("Verifying Candidate Preferences")
            self._verify_specific_preference(
                self.candidate_token,
                "message_received",
                {"email_enabled": False}
            )
        
        if self.recruiter_token:
            self.print_step("Verifying Recruiter Preferences")
            self._verify_specific_preference(
                self.recruiter_token,
                "application_received",
                {"email_enabled": True, "email_frequency": "realtime"}
            )
    
    def _verify_specific_preference(self, token: str, event_type: str, expected: Dict):
        """Verify a specific preference"""
        try:
            response = requests.get(
                f"{self.base_url}/notification-preferences",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                prefs = response.json()
                pref = next((p for p in prefs if p["event_type"] == event_type), None)
                
                if pref:
                    matches = all(pref.get(k) == v for k, v in expected.items())
                    if matches:
                        self.print_success(f"{event_type}: Preferences saved correctly")
                    else:
                        self.print_error(f"{event_type}: Preferences don't match expected")
                        self.print_info(f"Expected: {expected}")
                        self.print_info(f"Got: {pref}")
                else:
                    self.print_error(f"{event_type}: Preference not found")
            else:
                self.print_error(f"Failed to verify: {response.status_code}")
        except Exception as e:
            self.print_error(f"Error verifying: {str(e)}")
    
    # =============== MAIN TEST RUNNER ===============
    
    def run_all_tests(self):
        """Run all integration tests"""
        try:
            self.setup_test_users()
            self.get_current_preferences()
            self.setup_test_preferences()
            self.verify_preferences_persist()
            
            self.print_header("MANUAL EMAIL TESTING INSTRUCTIONS")
            print(f"{Colors.YELLOW}To test email delivery:{Colors.ENDC}")
            print(f"  1. Use the API endpoints to trigger notifications")
            print(f"  2. Check emails:")
            print(f"     • {Colors.BOLD}{self.candidate_email}{Colors.ENDC}")
            print(f"     • {Colors.BOLD}{self.recruiter_email}{Colors.ENDC}")
            print(f"  3. Verify emails are received only for preferences with email_enabled=true")
            print(f"  4. Check spam/junk folders if emails don't arrive")
            print()
            
            self.print_header("TEST SUMMARY")
            if self.candidate_token and self.recruiter_token:
                self.print_success("✓ Both test users configured successfully")
            elif self.candidate_token:
                self.print_info("⚠ Only candidate user configured")
            elif self.recruiter_token:
                self.print_info("⚠ Only recruiter user configured")
            else:
                self.print_error("✗ No users configured")
            
            print()
            
        except Exception as e:
            self.print_error(f"Test execution failed: {str(e)}")
            import traceback
            traceback.print_exc()


def main():
    """Main entry point"""
    print(f"\n{Colors.BOLD}Notification Email Integration Test{Colors.ENDC}")
    print(f"Testing with:")
    print(f"  • Candidate: bhavanabayya13@gmail.com")
    print(f"  • Recruiter: bhavana@rubislawinvest.com")
    print()
    
    tester = NotificationEmailTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()
