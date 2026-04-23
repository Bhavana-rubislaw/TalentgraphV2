"""
Quick script to check if a meeting has a video link
"""
import sys
sys.path.insert(0, 'c:\\Users\\BhavanaBayya\\Documents\\WORK\\TalentgraphV2\\backend2')

from sqlmodel import Session, select
from app.database import engine
from app.models import Meeting

# Query the meeting
with Session(engine) as session:
    # Get the most recent meeting (likely the one in the screenshot)
    meetings = session.exec(
        select(Meeting)
        .where(Meeting.title.like("%Bhavana Bayya%"))
        .order_by(Meeting.id.desc())
    ).all()
    
    print("\n" + "="*80)
    print("MEETINGS WITH 'Bhavana Bayya' IN TITLE:")
    print("="*80)
    
    for meeting in meetings:
        print(f"\nMeeting ID: {meeting.id}")
        print(f"Title: {meeting.title}")
        print(f"Status: {meeting.status}")
        print(f"Scheduled Start: {meeting.scheduled_start}")
        print(f"video_meeting_url: {meeting.video_meeting_url}")
        print(f"video_provider: {meeting.video_provider}")
        print(f"location: {meeting.location}")
        print(f"Participants: {len(meeting.participants)}")
        print("-" * 80)
    
    if not meetings:
        print("\nNo meetings found with 'Bhavana Bayya' in title")
    
    print("\n")
