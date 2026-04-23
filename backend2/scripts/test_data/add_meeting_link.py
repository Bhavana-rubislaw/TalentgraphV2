"""
Script to add a video meeting link to an existing meeting
"""
import sys
sys.path.insert(0, 'c:\\Users\\BhavanaBayya\\Documents\\WORK\\TalentgraphV2\\backend2')

from sqlmodel import Session, select
from app.database import engine
from app.models import Meeting

# The video link you want to add (you can change this)
MEETING_LINK = "https://meet.google.com/abc-defg-hij"  # Change this to your actual link
MEETING_ID = 2  # The meeting ID from the screenshot

with Session(engine) as session:
    meeting = session.get(Meeting, MEETING_ID)
    
    if not meeting:
        print(f"\n❌ Meeting {MEETING_ID} not found!")
    else:
        print(f"\n📝 Updating Meeting {MEETING_ID}:")
        print(f"Title: {meeting.title}")
        print(f"Current video_meeting_url: {meeting.video_meeting_url}")
        print(f"\nNew video_meeting_url: {MEETING_LINK}")
        
        # Update the meeting
        meeting.video_meeting_url = MEETING_LINK
        meeting.video_provider = "google_meet"  # or "zoom", "teams", etc.
        
        session.add(meeting)
        session.commit()
        session.refresh(meeting)
        
        print(f"\n✅ Meeting updated successfully!")
        print(f"Video link: {meeting.video_meeting_url}")
        print(f"Video provider: {meeting.video_provider}")
        print(f"\nNow when you add participants, they will receive this link in their email! 📧")
