"""Test what the meetings API returns for Bhavana"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from datetime import datetime
from app.database import engine
from app.models import Meeting, MeetingParticipant, User

def test_api():
    with Session(engine) as session:
        # Get bhavana
        user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        print(f"User ID: {user.id}")
        print(f"Current UTC time: {datetime.utcnow()}")
        print()
        
        # Test organizer query (same as API)
        organizer_meetings = session.exec(
            select(Meeting)
            .where(Meeting.organizer_user_id == user.id)
        ).all()
        
        print(f"Meetings where user is organizer: {len(organizer_meetings)}")
        for m in organizer_meetings:
            print(f"  ID: {m.id}")
            print(f"  Title: {m.title}")
            print(f"  Scheduled Start: {m.scheduled_start}")
            print(f"  Status: {m.status}")
            is_upcoming = m.scheduled_start >= datetime.utcnow()
            print(f"  Is Upcoming: {is_upcoming}")
            print()
        
        # Test participant query
        participant_meetings = session.exec(
            select(Meeting)
            .join(MeetingParticipant)
            .where(MeetingParticipant.user_id == user.id)
        ).all()
        
        print(f"Meetings where user is participant: {len(participant_meetings)}")
        for m in participant_meetings:
            print(f"  ID: {m.id}")
            print(f"  Title: {m.title}")
            print()
        
        # Test with upcoming_only filter
        upcoming_organizer = session.exec(
            select(Meeting)
            .where(Meeting.organizer_user_id == user.id)
            .where(Meeting.scheduled_start >= datetime.utcnow())
        ).all()
        
        print(f"Upcoming meetings (organizer, upcoming_only=true): {len(upcoming_organizer)}")
        for m in upcoming_organizer:
            print(f"  ID: {m.id}, Start: {m.scheduled_start}")

if __name__ == "__main__":
    test_api()
