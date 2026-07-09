"""Update meeting time to be in the future"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.database import engine
from app.models import Meeting

with Session(engine) as session:
    meeting = session.exec(select(Meeting).where(Meeting.id == 2)).first()
    
    if meeting:
        # Set meeting to 2 hours from now
        new_start = datetime.utcnow() + timedelta(hours=2)
        new_end = new_start + timedelta(minutes=60)
        
        print(f"Current meeting start: {meeting.scheduled_start}")
        print(f"New meeting start: {new_start}")
        
        meeting.scheduled_start = new_start
        meeting.scheduled_end = new_end
        
        session.add(meeting)
        session.commit()
        
        print("✅ Meeting time updated to 2 hours from now!")
    else:
        print("❌ Meeting not found")
