"""Check meetings for bhavana@rubislawinvest.com"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import Meeting, MeetingParticipant, User, Application

def check_meetings():
    with Session(engine) as session:
        # Find bhavana
        user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        if not user:
            print("❌ User bhavana@rubislawinvest.com not found")
            return
        
        print(f"✅ Found user: {user.email} (ID: {user.id}, Role: {user.role})")
        print()
        
        # Check all meetings
        all_meetings = session.exec(select(Meeting)).all()
        print(f"📊 Total meetings in database: {len(all_meetings)}")
        print()
        
        # Check meetings where bhavana is organizer
        organizer_meetings = session.exec(
            select(Meeting).where(Meeting.organizer_user_id == user.id)
        ).all()
        print(f"👤 Meetings organized by bhavana: {len(organizer_meetings)}")
        for m in organizer_meetings:
            print(f"  - ID: {m.id}, Title: {m.title}, Status: {m.status}, Start: {m.scheduled_start}")
        print()
        
        # Check meeting participants for bhavana
        participants = session.exec(
            select(MeetingParticipant).where(MeetingParticipant.user_id == user.id)
        ).all()
        print(f"🎯 MeetingParticipant records for bhavana: {len(participants)}")
        for p in participants:
            print(f"  - Meeting ID: {p.meeting_id}, Required: {p.is_required}, Confirmed: {p.has_confirmed}, Attended: {p.attended}")
        print()
        
        # Check all meeting participants
        all_participants = session.exec(select(MeetingParticipant)).all()
        print(f"📊 Total MeetingParticipant records: {len(all_participants)}")
        print()
        
        # Check meetings for applications
        all_meetings_with_apps = session.exec(
            select(Meeting).where(Meeting.application_id.isnot(None))
        ).all()
        print(f"🔗 Meetings linked to applications: {len(all_meetings_with_apps)}")
        for m in all_meetings_with_apps:
            print(f"  - Meeting ID: {m.id}, App ID: {m.application_id}, Title: {m.title}")
            print(f"    Status: {m.status}, Start: {m.scheduled_start}")
            
            # Check participants for this meeting
            meeting_participants = session.exec(
                select(MeetingParticipant).where(MeetingParticipant.meeting_id == m.id)
            ).all()
            print(f"    Participants: {len(meeting_participants)}")
            for mp in meeting_participants:
                participant_user = session.get(User, mp.user_id)
                print(f"      - User: {participant_user.email} (ID: {participant_user.id}, Required: {mp.is_required}, Confirmed: {mp.has_confirmed})")

if __name__ == "__main__":
    check_meetings()
