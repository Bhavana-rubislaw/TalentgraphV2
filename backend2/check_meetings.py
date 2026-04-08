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
            print(f"  - Meeting ID: {p.meeting_id}, Status: {p.status}, Role: {p.role}")
        print()
        
        # Check all meeting participants
        all_participants = session.exec(select(MeetingParticipant)).all()
        print(f"📊 Total MeetingParticipant records: {len(all_participants)}")
        print()
        
        # Check applications for bhavana with scheduled interviews
        applications = session.exec(
            select(Application)
            .where(Application.candidate_id == user.id)
            .where(Application.interview_scheduled == True)
        ).all()
        print(f"📅 Applications with interview_scheduled=True: {len(applications)}")
        for app in applications:
            print(f"  - App ID: {app.id}, Job: {app.job_id}, Status: {app.status}")
            print(f"    Interview Time: {app.interview_datetime}")
            print(f"    Meeting Link: {app.meeting_link}")
        print()
        
        # Check if there are meetings for these applications
        if applications:
            app_ids = [app.id for app in applications]
            meetings_for_apps = session.exec(
                select(Meeting).where(Meeting.application_id.in_(app_ids))
            ).all()
            print(f"🔗 Meetings linked to these applications: {len(meetings_for_apps)}")
            for m in meetings_for_apps:
                print(f"  - Meeting ID: {m.id}, App ID: {m.application_id}, Title: {m.title}")
                print(f"    Status: {m.status}, Start: {m.scheduled_start}")
                
                # Check participants for this meeting
                meeting_participants = session.exec(
                    select(MeetingParticipant).where(MeetingParticipant.meeting_id == m.id)
                ).all()
                print(f"    Participants: {len(meeting_participants)}")
                for mp in meeting_participants:
                    participant_user = session.get(User, mp.user_id)
                    print(f"      - User: {participant_user.email} (Role: {mp.role}, Status: {mp.status})")

if __name__ == "__main__":
    check_meetings()
