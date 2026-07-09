"""
Quick validation script for Meetings Tab functionality
Provides instant overview of current state
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, or_
from datetime import datetime
from app.database import engine
from app.models import User, Meeting, MeetingParticipant, Application, MeetingStatus

def quick_validate():
    """Quick validation of meetings functionality"""
    print("\n" + "🔍 " * 30)
    print("MEETINGS TAB - QUICK VALIDATION")
    print("🔍 " * 30 + "\n")
    
    with Session(engine) as session:
        # Get recruiter
        recruiter = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        if not recruiter:
            print("❌ Recruiter not found")
            return
        
        print(f"Testing as: {recruiter.email}")
        print("=" * 80)
        
        # 1. Check total meetings
        all_meetings = session.exec(select(Meeting)).all()
        print(f"\n📊 Database Stats:")
        print(f"   Total Meetings: {len(all_meetings)}")
        
        # 2. Check recruiter's meetings
        participant_ids = [
            row if isinstance(row, int) else row[0]
            for row in session.exec(
                select(MeetingParticipant.meeting_id)
                .where(MeetingParticipant.user_id == recruiter.id)
            ).all()
        ]
        
        if participant_ids:
            query = select(Meeting).where(
                or_(
                    Meeting.organizer_user_id == recruiter.id,
                    Meeting.id.in_(participant_ids)
                )
            )
        else:
            query = select(Meeting).where(Meeting.organizer_user_id == recruiter.id)
        
        recruiter_meetings = session.exec(query).all()
        print(f"   Recruiter's Meetings: {len(recruiter_meetings)}")
        
        # 3. Check upcoming vs past
        now = datetime.utcnow()
        upcoming = [m for m in recruiter_meetings if m.scheduled_start >= now]
        past = [m for m in recruiter_meetings if m.scheduled_start < now]
        
        print(f"   Upcoming: {len(upcoming)}")
        print(f"   Past: {len(past)}")
        
        # 4. Check status breakdown
        status_counts = {}
        for meeting in recruiter_meetings:
            status = meeting.status.value if hasattr(meeting.status, 'value') else str(meeting.status)
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"\n📈 Status Breakdown:")
        for status, count in status_counts.items():
            print(f"   {status.upper()}: {count}")
        
        # 5. Check participants
        total_participants = session.exec(select(MeetingParticipant)).all()
        print(f"\n👥 Participants:")
        print(f"   Total Participant Records: {len(total_participants)}")
        
        # 6. Check application linkage
        meetings_with_apps = session.exec(
            select(Meeting).where(Meeting.application_id.isnot(None))
        ).all()
        print(f"\n🔗 Integration:")
        print(f"   Meetings Linked to Applications: {len(meetings_with_apps)}")
        
        # 7. Detailed meeting info
        if recruiter_meetings:
            print(f"\n📋 Meetings Detail:")
            for i, meeting in enumerate(recruiter_meetings[:3], 1):
                time_label = "🔜" if meeting.scheduled_start >= now else "✅"
                print(f"\n{i}. {time_label} {meeting.title}")
                print(f"   ID: {meeting.id}")
                print(f"   Status: {meeting.status.value if hasattr(meeting.status, 'value') else meeting.status}")
                print(f"   Start: {meeting.scheduled_start.strftime('%Y-%m-%d %H:%M UTC')}")
                
                # Participants
                participants = session.exec(
                    select(MeetingParticipant)
                    .where(MeetingParticipant.meeting_id == meeting.id)
                ).all()
                print(f"   Participants ({len(participants)}):")
                for p in participants:
                    user = session.get(User, p.user_id)
                    role = "Organizer" if user.id == meeting.organizer_user_id else "Attendee"
                    status_icon = "✅" if p.has_confirmed else "⏳"
                    print(f"     {status_icon} {user.email} ({role})")
                
                if meeting.application_id:
                    app = session.get(Application, meeting.application_id)
                    if app:
                        print(f"   🔗 Application: ID {app.id} (Status: {app.status})")
        
        # 8. Test query performance
        print(f"\n⚡ Query Tests:")
        
        # Test 1: List all
        start = datetime.now()
        test_query = select(Meeting).where(Meeting.organizer_user_id == recruiter.id)
        results = session.exec(test_query).all()
        elapsed = (datetime.now() - start).total_seconds() * 1000
        print(f"   ✅ List all meetings: {len(results)} results in {elapsed:.2f}ms")
        
        # Test 2: Filter upcoming
        start = datetime.now()
        test_query = select(Meeting).where(
            Meeting.organizer_user_id == recruiter.id,
            Meeting.scheduled_start >= now
        )
        results = session.exec(test_query).all()
        elapsed = (datetime.now() - start).total_seconds() * 1000
        print(f"   ✅ Filter upcoming: {len(results)} results in {elapsed:.2f}ms")
        
        # Test 3: Filter by status
        start = datetime.now()
        test_query = select(Meeting).where(
            Meeting.organizer_user_id == recruiter.id,
            Meeting.status == MeetingStatus.SCHEDULED
        )
        results = session.exec(test_query).all()
        elapsed = (datetime.now() - start).total_seconds() * 1000
        print(f"   ✅ Filter by status: {len(results)} results in {elapsed:.2f}ms")
        
        # Summary
        print("\n" + "=" * 80)
        print("✅ VALIDATION COMPLETE")
        print("=" * 80)
        
        # Recommendations
        print("\n💡 Quick Checks:")
        if len(upcoming) == 0 and len(past) > 0:
            print("   ⚠️  All meetings are in the past - consider creating upcoming test data")
        if len(meetings_with_apps) < len(recruiter_meetings):
            print(f"   ℹ️  {len(recruiter_meetings) - len(meetings_with_apps)} meetings not linked to applications")
        if len(recruiter_meetings) == 0:
            print("   ⚠️  No meetings found - create test data first")
        else:
            print("   ✅ Meetings functionality is operational!")
        
        print()

if __name__ == "__main__":
    quick_validate()
