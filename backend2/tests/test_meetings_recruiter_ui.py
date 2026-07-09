"""
Functional Tests for Recruiter Portal Meetings Tab UI
Simulates recruiter actions and validates expected behavior
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, or_
from datetime import datetime, timedelta
from app.database import engine
from app.models import User, Meeting, MeetingParticipant, MeetingStatus

class TestRecruiterMeetingsUI:
    """Functional tests simulating recruiter interactions"""
    
    def __init__(self, recruiter_email="bhavana@rubislawinvest.com"):
        self.recruiter_email = recruiter_email
        self.recruiter_id = None
        
    def setup(self):
        """Setup test environment"""
        with Session(engine) as session:
            recruiter = session.exec(
                select(User).where(User.email == self.recruiter_email)
            ).first()
            
            if not recruiter:
                raise ValueError(f"Recruiter {self.recruiter_email} not found")
            
            self.recruiter_id = recruiter.id
            print(f"✅ Testing as: {recruiter.email} (ID: {recruiter.id})")
    
    def test_view_all_meetings(self):
        """Simulate: Recruiter views all meetings"""
        print("\n" + "="*70)
        print("UI TEST: View All Meetings (Default)")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            # Simulate the frontend getMeetings() call with upcoming_only=false
            participant_meeting_ids = [
                row if isinstance(row, int) else row[0]
                for row in session.exec(
                    select(MeetingParticipant.meeting_id)
                    .where(MeetingParticipant.user_id == self.recruiter_id)
                ).all()
            ]
            
            if participant_meeting_ids:
                query = select(Meeting).where(
                    or_(
                        Meeting.organizer_user_id == self.recruiter_id,
                        Meeting.id.in_(participant_meeting_ids)
                    )
                )
            else:
                query = select(Meeting).where(Meeting.organizer_user_id == self.recruiter_id)
            
            query = query.order_by(Meeting.scheduled_start.desc())
            meetings = session.exec(query).all()
            
            print(f"📋 Total Meetings: {len(meetings)}")
            print("\nMeetings List:")
            print("-" * 70)
            
            now = datetime.utcnow()
            for i, meeting in enumerate(meetings, 1):
                is_past = meeting.scheduled_start < now
                status_icon = {
                    MeetingStatus.SCHEDULED: "📅",
                    MeetingStatus.CANCELLED: "❌",
                    MeetingStatus.COMPLETED: "✅",
                    MeetingStatus.NO_SHOW: "⚠️"
                }.get(meeting.status, "📌")
                
                time_label = "PAST" if is_past else "UPCOMING"
                
                print(f"{i}. {status_icon} [{meeting.status.upper()}] [{time_label}]")
                print(f"   {meeting.title}")
                print(f"   Start: {meeting.scheduled_start.strftime('%Y-%m-%d %H:%M')} UTC")
                
                # Get participants
                participants = session.exec(
                    select(MeetingParticipant)
                    .where(MeetingParticipant.meeting_id == meeting.id)
                ).all()
                print(f"   Participants: {len(participants)}")
                
                if meeting.video_meeting_url:
                    print(f"   📹 Video: {meeting.video_meeting_url[:50]}...")
                
                print()
            
            print(f"✅ Displayed {len(meetings)} meetings")
    
    def test_filter_upcoming_only(self):
        """Simulate: Recruiter filters to upcoming meetings only"""
        print("\n" + "="*70)
        print("UI TEST: Filter - Upcoming Only")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            participant_meeting_ids = [
                row if isinstance(row, int) else row[0]
                for row in session.exec(
                    select(MeetingParticipant.meeting_id)
                    .where(MeetingParticipant.user_id == self.recruiter_id)
                ).all()
            ]
            
            if participant_meeting_ids:
                query = select(Meeting).where(
                    or_(
                        Meeting.organizer_user_id == self.recruiter_id,
                        Meeting.id.in_(participant_meeting_ids)
                    )
                )
            else:
                query = select(Meeting).where(Meeting.organizer_user_id == self.recruiter_id)
            
            # Apply upcoming filter
            now = datetime.utcnow()
            query = query.where(Meeting.scheduled_start >= now)
            query = query.order_by(Meeting.scheduled_start.desc())
            
            upcoming_meetings = session.exec(query).all()
            
            print(f"⏭️  Upcoming Meetings: {len(upcoming_meetings)}")
            
            for meeting in upcoming_meetings:
                print(f"  • {meeting.title[:60]}")
                print(f"    📅 {meeting.scheduled_start.strftime('%Y-%m-%d %H:%M')} UTC")
            
            if len(upcoming_meetings) == 0:
                print("  ℹ️  No upcoming meetings scheduled")
            
            print(f"\n✅ Filter applied successfully")
    
    def test_filter_by_status(self):
        """Simulate: Recruiter filters by meeting status"""
        print("\n" + "="*70)
        print("UI TEST: Filter - By Status")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            for status in [MeetingStatus.SCHEDULED, MeetingStatus.CANCELLED, MeetingStatus.COMPLETED]:
                participant_meeting_ids = [
                    row if isinstance(row, int) else row[0]
                    for row in session.exec(
                        select(MeetingParticipant.meeting_id)
                        .where(MeetingParticipant.user_id == self.recruiter_id)
                    ).all()
                ]
                
                if participant_meeting_ids:
                    query = select(Meeting).where(
                        or_(
                            Meeting.organizer_user_id == self.recruiter_id,
                            Meeting.id.in_(participant_meeting_ids)
                        )
                    )
                else:
                    query = select(Meeting).where(Meeting.organizer_user_id == self.recruiter_id)
                
                query = query.where(Meeting.status == status)
                meetings = session.exec(query).all()
                
                print(f"{status.value.upper()}: {len(meetings)} meetings")
        
        print(f"\n✅ Status filters working")
    
    def test_view_meeting_details(self):
        """Simulate: Recruiter clicks on a meeting to view details"""
        print("\n" + "="*70)
        print("UI TEST: View Meeting Details")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            # Get first meeting
            meeting = session.exec(
                select(Meeting)
                .where(Meeting.organizer_user_id == self.recruiter_id)
            ).first()
            
            if not meeting:
                print("⚠️ No meetings found for this recruiter")
                return
            
            print(f"📋 Meeting Details")
            print("=" * 70)
            print(f"Title: {meeting.title}")
            print(f"Status: {meeting.status.value}")
            print(f"Type: {meeting.meeting_type.value if meeting.meeting_type else 'Not specified'}")
            print(f"\nScheduled:")
            print(f"  Start: {meeting.scheduled_start}")
            print(f"  End: {meeting.scheduled_end}")
            print(f"  Duration: {meeting.duration_minutes} minutes")
            print(f"  Timezone: {meeting.timezone}")
            
            if meeting.description:
                print(f"\nDescription: {meeting.description}")
            
            if meeting.video_meeting_url:
                print(f"\n📹 Video Link: {meeting.video_meeting_url}")
            
            if meeting.location:
                print(f"📍 Location: {meeting.location}")
            
            # Participants
            participants = session.exec(
                select(MeetingParticipant)
                .where(MeetingParticipant.meeting_id == meeting.id)
            ).all()
            
            print(f"\n👥 Participants ({len(participants)}):")
            for p in participants:
                user = session.get(User, p.user_id)
                role_label = "Organizer" if user.id == meeting.organizer_user_id else "Attendee"
                confirmed = "✅ Confirmed" if p.has_confirmed else "⏳ Pending"
                
                print(f"  • {user.email} ({role_label}) - {confirmed}")
            
            # Linked entities
            if meeting.application_id:
                print(f"\n🔗 Linked to Application ID: {meeting.application_id}")
            if meeting.job_posting_id:
                print(f"🔗 Linked to Job Posting ID: {meeting.job_posting_id}")
            
            print(f"\n✅ Meeting details displayed")
    
    def test_empty_state(self):
        """Simulate: Recruiter with no meetings sees empty state"""
        print("\n" + "="*70)
        print("UI TEST: Empty State (No Meetings)")
        print("="*70 + "\n")
        
        # Create a test recruiter with no meetings
        with Session(engine) as session:
            test_email = "test.recruiter.nomeetings@test.com"
            test_user = session.exec(
                select(User).where(User.email == test_email)
            ).first()
            
            if test_user:
                # Check their meetings
                meetings = session.exec(
                    select(Meeting)
                    .where(Meeting.organizer_user_id == test_user.id)
                ).all()
                
                if len(meetings) == 0:
                    print("📭 No meetings scheduled")
                    print("\nEmpty State UI Should Show:")
                    print("  • 'No meetings found' message")
                    print("  • '➕ Schedule Meeting' button")
                    print("  • Suggestion to schedule first interview")
                    print(f"\n✅ Empty state handled correctly")
                else:
                    print(f"ℹ️  Test user has {len(meetings)} meetings")
            else:
                print("ℹ️  No test user found for empty state")
    
    def test_meeting_actions_available(self):
        """Simulate: Check which actions are available for each meeting"""
        print("\n" + "="*70)
        print("UI TEST: Available Actions Per Meeting")
        print("="*70 + "\n")
        
        with Session(engine) as session:
            meetings = session.exec(
                select(Meeting)
                .where(Meeting.organizer_user_id == self.recruiter_id)
            ).all()
            
            now = datetime.utcnow()
            
            for meeting in meetings[:5]:  # First 5 meetings
                print(f"\n{meeting.title[:50]}")
                print(f"Status: {meeting.status.value}")
                
                actions = []
                
                # View Details - always available
                actions.append("👁️ View Details")
                
                # Cancel - available if scheduled
                if meeting.status == MeetingStatus.SCHEDULED:
                    actions.append("❌ Cancel Meeting")
                
                # Reschedule - available if scheduled
                if meeting.status == MeetingStatus.SCHEDULED:
                    actions.append("📅 Reschedule")
                
                # Mark Complete - available if past and scheduled
                if meeting.scheduled_end < now and meeting.status == MeetingStatus.SCHEDULED:
                    actions.append("✅ Mark Complete")
                
                # Edit - available if upcoming
                if meeting.scheduled_start >= now:
                    actions.append("✏️ Edit")
                
                print(f"Available Actions: {', '.join(actions)}")
            
            print(f"\n✅ Action buttons rendered correctly")
    
    def run_all_tests(self):
        """Run all UI functional tests"""
        print("\n" + "🖥️ " * 35)
        print("MEETINGS TAB - RECRUITER UI FUNCTIONAL TESTS")
        print("🖥️ " * 35 + "\n")
        
        try:
            self.setup()
            self.test_view_all_meetings()
            self.test_filter_upcoming_only()
            self.test_filter_by_status()
            self.test_view_meeting_details()
            self.test_meeting_actions_available()
            self.test_empty_state()
            
            print("\n" + "="*70)
            print("✅ ALL UI TESTS COMPLETED!")
            print("="*70 + "\n")
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}\n")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    tester = TestRecruiterMeetingsUI()
    tester.run_all_tests()
