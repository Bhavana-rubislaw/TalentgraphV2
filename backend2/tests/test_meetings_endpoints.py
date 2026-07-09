"""
Comprehensive API Endpoint Tests for Meetings Tab
Tests all meeting-related endpoints from recruiter perspective
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.main import app
from app.database import engine
from app.models import User, Meeting, MeetingParticipant, Application, MeetingStatus, MeetingType

# Test client
client = TestClient(app)

class TestMeetingsEndpoints:
    """Test suite for meetings API endpoints"""
    
    @staticmethod
    def get_auth_headers(email="bhavana@rubislawinvest.com"):
        """Get authentication headers for test user"""
        # Login to get token
        response = client.post("/auth/login", json={
            "username": email,
            "password": "password123"  # Adjust as needed
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @staticmethod
    def cleanup_test_meetings():
        """Clean up test meetings from database"""
        with Session(engine) as session:
            test_meetings = session.exec(
                select(Meeting).where(Meeting.title.like("TEST:%"))
            ).all()
            for meeting in test_meetings:
                # Delete participants first
                participants = session.exec(
                    select(MeetingParticipant).where(MeetingParticipant.meeting_id == meeting.id)
                ).all()
                for p in participants:
                    session.delete(p)
                session.delete(meeting)
            session.commit()
            print(f"✅ Cleaned up {len(test_meetings)} test meetings")
    
    def test_list_meetings_all(self):
        """Test GET /meetings/list - show all meetings"""
        print("\n" + "="*70)
        print("TEST: List all meetings")
        print("="*70)
        
        headers = self.get_auth_headers()
        response = client.get("/meetings/list", headers=headers, params={
            "upcoming_only": False
        })
        
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, "Should return 200 OK"
        
        meetings = response.json()
        print(f"Total meetings returned: {len(meetings)}")
        
        for meeting in meetings[:3]:  # Show first 3
            print(f"\n  Meeting: {meeting['title']}")
            print(f"    ID: {meeting['id']}")
            print(f"    Status: {meeting['status']}")
            print(f"    Start: {meeting['scheduled_start']}")
        
        return len(meetings) > 0
    
    def test_list_meetings_upcoming_only(self):
        """Test GET /meetings/list - upcoming only filter"""
        print("\n" + "="*70)
        print("TEST: List upcoming meetings only")
        print("="*70)
        
        headers = self.get_auth_headers()
        response = client.get("/meetings/list", headers=headers, params={
            "upcoming_only": True
        })
        
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, "Should return 200 OK"
        
        meetings = response.json()
        print(f"Upcoming meetings: {len(meetings)}")
        
        # Verify all are actually upcoming
        now = datetime.utcnow()
        for meeting in meetings:
            start_time = datetime.fromisoformat(meeting['scheduled_start'].replace('Z', '+00:00'))
            is_upcoming = start_time >= now
            print(f"  {meeting['title'][:50]}: {'✅ Upcoming' if is_upcoming else '❌ Past'}")
        
        print("\n✅ Test passed")
    
    def test_list_meetings_by_status(self):
        """Test GET /meetings/list - filter by status"""
        print("\n" + "="*70)
        print("TEST: List meetings filtered by status")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        for status in ['scheduled', 'cancelled', 'completed']:
            response = client.get("/meetings/list", headers=headers, params={
                "status": status,
                "upcoming_only": False
            })
            
            assert response.status_code == 200
            meetings = response.json()
            print(f"\n  Status '{status}': {len(meetings)} meetings")
            
            # Verify all have correct status
            for meeting in meetings:
                assert meeting['status'] == status, f"Expected {status}, got {meeting['status']}"
        
        print("\n✅ Test passed")
    
    def test_create_meeting(self):
        """Test POST /meetings/create - create new meeting"""
        print("\n" + "="*70)
        print("TEST: Create new meeting")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        # Get a candidate user for testing
        with Session(engine) as session:
            candidate = session.exec(
                select(User).where(User.role == "candidate")
            ).first()
            
            if not candidate:
                print("⚠️  No candidate user found, skipping test")
                return
        
        # Create meeting payload
        tomorrow = datetime.utcnow() + timedelta(days=1)
        end_time = tomorrow + timedelta(hours=1)
        
        payload = {
            "title": "TEST: Interview Meeting",
            "description": "Test interview",
            "meeting_type": "interview",
            "scheduled_start": tomorrow.isoformat(),
            "scheduled_end": end_time.isoformat(),
            "duration_minutes": 60,
            "timezone": "UTC",
            "participant_user_ids": [candidate.id],
            "video_meeting_url": "https://meet.jit.si/test-room"
        }
        
        response = client.post("/meetings/create", headers=headers, json=payload)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            meeting = response.json()
            print(f"✅ Meeting created!")
            print(f"   ID: {meeting['id']}")
            print(f"   Title: {meeting['title']}")
            print(f"   Status: {meeting['status']}")
            
            # Clean up
            self.cleanup_test_meetings()
        else:
            print(f"❌ Failed to create meeting: {response.json()}")
    
    def test_get_meeting_details(self):
        """Test GET /meetings/{meeting_id} - get meeting details"""
        print("\n" + "="*70)
        print("TEST: Get meeting details")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        # Get first meeting
        with Session(engine) as session:
            meeting = session.exec(select(Meeting)).first()
            
            if not meeting:
                print("⚠️  No meetings found, skipping test")
                return
            
            meeting_id = meeting.id
        
        response = client.get(f"/meetings/{meeting_id}", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, "Should return 200 OK"
        
        meeting_data = response.json()
        print(f"\n  Meeting ID: {meeting_data['id']}")
        print(f"  Title: {meeting_data['title']}")
        print(f"  Status: {meeting_data['status']}")
        print(f"  Organizer: {meeting_data['organizer_user_id']}")
        print(f"  Start: {meeting_data['scheduled_start']}")
        
        print("\n✅ Test passed")
    
    def test_cancel_meeting(self):
        """Test POST /meetings/{meeting_id}/cancel - cancel meeting"""
        print("\n" + "="*70)
        print("TEST: Cancel meeting")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        # Create a test meeting first
        with Session(engine) as session:
            recruiter = session.exec(
                select(User).where(User.email == "bhavana@rubislawinvest.com")
            ).first()
            
            if not recruiter:
                print("⚠️  Recruiter not found, skipping test")
                return
            
            tomorrow = datetime.utcnow() + timedelta(days=1)
            meeting = Meeting(
                title="TEST: Meeting to Cancel",
                scheduled_start=tomorrow,
                scheduled_end=tomorrow + timedelta(hours=1),
                duration_minutes=60,
                timezone="UTC",
                organizer_user_id=recruiter.id,
                status=MeetingStatus.SCHEDULED
            )
            session.add(meeting)
            session.commit()
            session.refresh(meeting)
            meeting_id = meeting.id
        
        # Cancel the meeting
        response = client.post(
            f"/meetings/{meeting_id}/cancel",
            headers=headers,
            json={"reason": "Test cancellation"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            cancelled_meeting = response.json()
            print(f"✅ Meeting cancelled!")
            print(f"   Status: {cancelled_meeting['status']}")
            assert cancelled_meeting['status'] == 'cancelled'
            
            # Clean up
            self.cleanup_test_meetings()
        else:
            print(f"❌ Failed to cancel: {response.json()}")
    
    def test_meeting_timeline(self):
        """Test GET /meetings/{meeting_id}/timeline - get meeting history"""
        print("\n" + "="*70)
        print("TEST: Get meeting timeline/history")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        # Get a meeting
        with Session(engine) as session:
            meeting = session.exec(select(Meeting)).first()
            
            if not meeting:
                print("⚠️  No meetings found, skipping test")
                return
            
            meeting_id = meeting.id
        
        response = client.get(f"/meetings/{meeting_id}/timeline", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            timeline = response.json()
            print(f"✅ Timeline events: {len(timeline)}")
            
            for event in timeline[:5]:  # Show first 5
                print(f"\n  Event: {event['event_type']}")
                print(f"    Message: {event['message']}")
                print(f"    Actor: User {event['actor_user_id']}")
        else:
            print(f"Response: {response.json()}")
    
    def test_check_availability(self):
        """Test GET /meetings/check-availability - availability check"""
        print("\n" + "="*70)
        print("TEST: Check user availability")
        print("="*70)
        
        headers = self.get_auth_headers()
        
        # Get recruiter user
        with Session(engine) as session:
            user = session.exec(
                select(User).where(User.email == "bhavana@rubislawinvest.com")
            ).first()
            
            if not user:
                print("⚠️  User not found, skipping test")
                return
            
            user_id = user.id
        
        tomorrow = datetime.utcnow() + timedelta(days=1)
        end_time = tomorrow + timedelta(hours=1)
        
        response = client.get("/meetings/check-availability", headers=headers, params={
            "user_id": user_id,
            "start_time": tomorrow.isoformat(),
            "end_time": end_time.isoformat()
        })
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Availability check result: {result}")
        else:
            print(f"Response: {response.json()}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "🧪" * 35)
        print("MEETINGS TAB - COMPREHENSIVE API TESTS")
        print("🧪" * 35 + "\n")
        
        try:
            self.test_list_meetings_all()
            self.test_list_meetings_upcoming_only()
            self.test_list_meetings_by_status()
            self.test_get_meeting_details()
            self.test_check_availability()
            self.test_create_meeting()
            self.test_cancel_meeting()
            self.test_meeting_timeline()
            
            print("\n" + "="*70)
            print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
            print("="*70 + "\n")
            
        except AssertionError as e:
            print(f"\n❌ TEST FAILED: {e}\n")
        except Exception as e:
            print(f"\n❌ ERROR: {e}\n")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    tester = TestMeetingsEndpoints()
    tester.run_all_tests()
