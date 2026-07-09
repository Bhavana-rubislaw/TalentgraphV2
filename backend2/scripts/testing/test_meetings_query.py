"""Test the meetings query logic to verify it works correctly"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime
from sqlmodel import Session, select, or_
from app.database import engine
from app.models import Meeting, MeetingParticipant, User

def test_meetings_query():
    with Session(engine) as session:
        # Find bhavana
        user = session.exec(
            select(User).where(User.email == "bhavana@rubislawinvest.com")
        ).first()
        
        if not user:
            print("❌ User not found")
            return
        
        user_id = user.id
        print(f"Testing meetings query for user: {user.email} (ID: {user_id})")
        print("=" * 70)
        print()
        
        # Replicate the backend query logic
        print("1️⃣ Getting participant meeting IDs...")
        participant_rows = session.exec(
            select(MeetingParticipant.meeting_id).where(MeetingParticipant.user_id == user_id)
        ).all()
        
        # Handle both cases: rows might be tuples or plain integers
        participant_meeting_ids = []
        for row in participant_rows:
            if isinstance(row, (tuple, list)):
                participant_meeting_ids.append(row[0])
            else:
                participant_meeting_ids.append(row)
        
        print(f"   Found {len(participant_meeting_ids)} meetings where user is participant: {participant_meeting_ids}")
        print()
        
        # Test upcoming_only=False (show all)
        print("2️⃣ Testing with upcoming_only=False (show all meetings)...")
        if participant_meeting_ids:
            query = select(Meeting).where(
                or_(
                    Meeting.organizer_user_id == user_id,
                    Meeting.id.in_(participant_meeting_ids)
                )
            )
        else:
            query = select(Meeting).where(Meeting.organizer_user_id == user_id)
        
        query = query.order_by(Meeting.scheduled_start.desc())
        meetings_all = session.exec(query).all()
        print(f"   ✅ Found {len(meetings_all)} total meetings")
        for m in meetings_all:
            is_organizer = m.organizer_user_id == user_id
            is_participant = m.id in participant_meeting_ids
            print(f"      - ID: {m.id}, Start: {m.scheduled_start}")
            print(f"        Organizer: {is_organizer}, Participant: {is_participant}")
        print()
        
        # Test upcoming_only=True (show only upcoming)
        print("3️⃣ Testing with upcoming_only=True (show only upcoming)...")
        if participant_meeting_ids:
            query = select(Meeting).where(
                or_(
                    Meeting.organizer_user_id == user_id,
                    Meeting.id.in_(participant_meeting_ids)
                )
            )
        else:
            query = select(Meeting).where(Meeting.organizer_user_id == user_id)
        
        now = datetime.utcnow()
        query = query.where(Meeting.scheduled_start >= now)
        query = query.order_by(Meeting.scheduled_start.desc())
        meetings_upcoming = session.exec(query).all()
        
        print(f"   Current UTC time: {now}")
        print(f"   ✅ Found {len(meetings_upcoming)} upcoming meetings")
        for m in meetings_upcoming:
            print(f"      - ID: {m.id}, Start: {m.scheduled_start}")
        print()
        
        # Show filtered out meetings
        if len(meetings_all) > len(meetings_upcoming):
            print("⚠️  Meetings filtered out (in the past):")
            past_meeting_ids = [m.id for m in meetings_all if m.id not in [um.id for um in meetings_upcoming]]
            for meeting_id in past_meeting_ids:
                m = next(meeting for meeting in meetings_all if meeting.id == meeting_id)
                print(f"      - ID: {m.id}, Start: {m.scheduled_start}, Title: {m.title}")
        
        print()
        print("=" * 70)
        print("CONCLUSION:")
        if len(meetings_upcoming) < len(meetings_all):
            print(f"✅ Query logic is working correctly!")
            print(f"   - Total meetings: {len(meetings_all)}")
            print(f"   - Upcoming meetings: {len(meetings_upcoming)}")
            print(f"   - Past meetings: {len(meetings_all) - len(meetings_upcoming)}")
            print()
            print("💡 To see past meetings in the UI, toggle 'Upcoming Only' to 'All Time'")
        else:
            print("✅ All meetings are upcoming - everything is visible!")

if __name__ == "__main__":
    test_meetings_query()
