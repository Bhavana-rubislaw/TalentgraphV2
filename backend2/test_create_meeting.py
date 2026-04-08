"""Test creating a meeting directly"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session
from datetime import datetime, timedelta
from app.database import engine  
from app.models import Meeting

def test_create_meeting():
    with Session(engine) as session:
        try:
            # Try creating a simple meeting
            meeting = Meeting(
                title="Test Meeting",
                description="Test Description",
                scheduled_start=datetime.utcnow(),
                scheduled_end=datetime.utcnow() + timedelta(hours=1),
                duration_minutes=60,
                timezone="UTC",
                organizer_user_id=37  # Bhavana's user ID
            )
            
            print(f"Meeting object created:")
            print(f"  meeting_type = {repr(meeting.meeting_type)}")
            print(f"  status = {repr(meeting.status)}")
            print()
            
            session.add(meeting)
            session.flush()
            
            print(f"✅ Meeting created successfully! ID: {meeting.id}")
            session.rollback()  # Don't actually commit
            
        except Exception as e:
            print(f"❌ Error: {e}")
            session.rollback()

if __name__ == "__main__":
    test_create_meeting()
