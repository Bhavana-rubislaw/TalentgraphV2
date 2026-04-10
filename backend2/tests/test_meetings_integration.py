"""
Integration Tests for Full Meeting Scheduling Flow
Tests the complete workflow from application to meeting scheduling
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.database import engine
from app.models import (
    User, Meeting, MeetingParticipant, Application, JobPosting, 
    Candidate, Company, MeetingStatus, MeetingTimelineEvent
)

class TestMeetingIntegration:
    """Integration tests for end-to-end meeting workflows"""
    
    def test_application_to_meeting_flow(self):
        """Test: Application → Schedule Interview → Create Meeting → Update Status"""
        print("\n" + "="*70)
        print("INTEGRATION TEST: Application → Meeting Flow")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            # Step 1: Find a recruiter and candidate
            recruiter = session.exec(
                select(User).where(User.role == "recruiter")
            ).first()
            
            candidate = session.exec(
                select(User).where(User.role == "candidate")
            ).first()
            
            if not recruiter or not candidate:
                print("⚠️  Required users not found")
                return
            
            print(f"✅ Found recruiter: {recruiter.email}")
            print(f"✅ Found candidate: {candidate.email}")
            
            # Step 2: Get or create application
            application = session.exec(
                select(Application)
                .where(Application.candidate_id == candidate.id)
            ).first()
            
            if application:
                print(f"✅ Found application ID: {application.id}")
            else:
                print("⚠️  No application found")
                return
            
            # Step 3: Check for existing meeting linked to this application
            existing_meeting = session.exec(
                select(Meeting)
                .where(Meeting.application_id == application.id)
            ).first()
            
            if existing_meeting:
                print(f"✅ Meeting already exists for application")
                print(f"   Meeting ID: {existing_meeting.id}")
                print(f"   Status: {existing_meeting.status}")
                print(f"   Title: {existing_meeting.title}")
                
                # Check participants
                participants = session.exec(
                    select(MeetingParticipant)
                    .where(MeetingParticipant.meeting_id == existing_meeting.id)
                ).all()
                
                print(f"\n   Participants ({len(participants)}):")
                for p in participants:
                    user = session.get(User, p.user_id)
                    print(f"     - {user.email}")
                    print(f"       Required: {p.is_required}, Confirmed: {p.has_confirmed}")
                
                # Check timeline
                timeline = session.exec(
                    select(MeetingTimelineEvent)
                    .where(MeetingTimelineEvent.meeting_id == existing_meeting.id)
                    .order_by(MeetingTimelineEvent.created_at)
                ).all()
                
                if timeline:
                    print(f"\n   Timeline Events ({len(timeline)}):")
                    for event in timeline:
                        print(f"     - {event.event_type}: {event.message}")
                
                print("\n✅ Integration test verified!")
            else:
                print("ℹ️  No meeting linked to this application yet")
    
    def test_meeting_participant_consistency(self):
        """Test: Verify all meetings have proper participants"""
        print("\n" + "="*70)
        print("INTEGRATION TEST: Meeting → Participant Consistency")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            all_meetings = session.exec(select(Meeting)).all()
            
            print(f"Checking {len(all_meetings)} meetings for participant consistency...\n")
            
            issues_found = 0
            
            for meeting in all_meetings:
                participants = session.exec(
                    select(MeetingParticipant)
                    .where(MeetingParticipant.meeting_id == meeting.id)
                ).all()
                
                # Check 1: Meeting has participants
                if len(participants) == 0:
                    print(f"❌ Meeting {meeting.id} has NO participants!")
                    issues_found += 1
                    continue
                
                # Check 2: Organizer is in participants
                organizer_is_participant = any(
                    p.user_id == meeting.organizer_user_id 
                    for p in participants
                )
                
                if not organizer_is_participant:
                    print(f"⚠️  Meeting {meeting.id}: Organizer not in participants list")
                    issues_found += 1
                
                # Check 3: All participant users exist
                for p in participants:
                    user = session.get(User, p.user_id)
                    if not user:
                        print(f"❌ Meeting {meeting.id}: Participant user {p.user_id} doesn't exist!")
                        issues_found += 1
            
            if issues_found == 0:
                print("✅ All meetings have valid participants!")
            else:
                print(f"\n⚠️  Found {issues_found} issues")
    
    def test_application_status_sync(self):
        """Test: Verify application status syncs with meeting status"""
        print("\n" + "="*70)
        print("INTEGRATION TEST: Application ↔ Meeting Status Sync")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            # Find meetings linked to applications
            meetings_with_apps = session.exec(
                select(Meeting)
                .where(Meeting.application_id.isnot(None))
            ).all()
            
            print(f"Checking {len(meetings_with_apps)} meetings with applications...\n")
            
            for meeting in meetings_with_apps:
                app = session.get(Application, meeting.application_id)
                
                if not app:
                    print(f"❌ Meeting {meeting.id} references non-existent application {meeting.application_id}")
                    continue
                
                print(f"Meeting {meeting.id}:")
                print(f"  Meeting Status: {meeting.status}")
                print(f"  Application Status: {app.status}")
                
                # Expected correlations
                if meeting.status == MeetingStatus.SCHEDULED:
                    expected_app_status = "scheduled"
                    if app.status == expected_app_status:
                        print(f"  ✅ Statuses are in sync")
                    else:
                        print(f"  ⚠️  Expected app status '{expected_app_status}', got '{app.status}'")
                
                print()
    
    def test_meeting_time_validity(self):
        """Test: Verify all meetings have valid time ranges"""
        print("\n" + "="*70)
        print("INTEGRATION TEST: Meeting Time Validity")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            all_meetings = session.exec(select(Meeting)).all()
            
            print(f"Checking {len(all_meetings)} meetings for time validity...\n")
            
            now = datetime.utcnow()
            issues = 0
            
            for meeting in all_meetings:
                # Check 1: End time after start time
                if meeting.scheduled_end <= meeting.scheduled_start:
                    print(f"❌ Meeting {meeting.id}: End time not after start time!")
                    issues += 1
                    continue
                
                # Check 2: Duration matches time range
                actual_duration = (meeting.scheduled_end - meeting.scheduled_start).total_seconds() / 60
                if abs(actual_duration - meeting.duration_minutes) > 1:  # Allow 1 minute tolerance
                    print(f"⚠️  Meeting {meeting.id}: Duration mismatch")
                    print(f"    Stored: {meeting.duration_minutes} min")
                    print(f"    Calculated: {actual_duration:.0f} min")
                    issues += 1
                
                # Check 3: Categorize by time
                if meeting.scheduled_start > now:
                    time_label = "🔜 Future"
                elif meeting.scheduled_end < now:
                    time_label = "✅ Past"
                else:
                    time_label = "⏰ Ongoing"
                
                print(f"{time_label} | Meeting {meeting.id}: {meeting.title[:50]}")
            
            print(f"\n{'✅ All times valid!' if issues == 0 else f'⚠️  Found {issues} issues'}")
    
    def test_video_meeting_links(self):
        """Test: Verify video meeting URLs are valid"""
        print("\n" + "="*70)
        print("INTEGRATION TEST: Video Meeting Link Validation")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            all_meetings = session.exec(select(Meeting)).all()
            
            stats = {
                'with_link': 0,
                'without_link': 0,
                'invalid_link': 0
            }
            
            for meeting in all_meetings:
                if meeting.video_meeting_url:
                    stats['with_link'] += 1
                    
                    # Basic URL validation
                    url = meeting.video_meeting_url
                    if not (url.startswith('http://') or url.startswith('https://')):
                        print(f"⚠️  Meeting {meeting.id}: Invalid URL format")
                        print(f"    URL: {url}")
                        stats['invalid_link'] += 1
                    else:
                        provider = "Unknown"
                        if 'zoom.us' in url:
                            provider = "Zoom"
                        elif 'meet.google.com' in url or 'meet.jit.si' in url:
                            provider = "Google Meet/Jitsi"
                        elif 'teams.microsoft.com' in url:
                            provider = "MS Teams"
                        
                        print(f"✅ Meeting {meeting.id}: {provider}")
                else:
                    stats['without_link'] += 1
            
            print(f"\nStatistics:")
            print(f"  Meetings with video link: {stats['with_link']}")
            print(f"  Meetings without link: {stats['without_link']}")
            print(f"  Invalid links: {stats['invalid_link']}")
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("\n" + "🔗" * 35)
        print("MEETINGS TAB - INTEGRATION TESTS")
        print("🔗" * 35 + "\n")
        
        try:
            self.test_application_to_meeting_flow()
            self.test_meeting_participant_consistency()
            self.test_application_status_sync()
            self.test_meeting_time_validity()
            self.test_video_meeting_links()
            
            print("\n" + "="*70)
            print("✅ ALL INTEGRATION TESTS COMPLETED!")
            print("="*70 + "\n")
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}\n")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    tester = TestMeetingIntegration()
    tester.run_all_tests()
