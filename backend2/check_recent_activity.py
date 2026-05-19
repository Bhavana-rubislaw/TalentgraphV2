"""Check recent meetings and notifications"""
from sqlmodel import Session, select
from app.database import engine
from app.models import Meeting, Notification, User
from datetime import datetime, timedelta

session = Session(engine)
cutoff = datetime.now() - timedelta(hours=24)

# Get recent meetings
meetings = session.exec(
    select(Meeting)
    .where(Meeting.created_at > cutoff)
    .order_by(Meeting.created_at.desc())
).all()

print(f"\n{'='*60}")
print(f"Recent Meetings (last 24 hours): {len(meetings)}")
print(f"{'='*60}")

for m in meetings[:5]:
    organizer = session.get(User, m.organizer_user_id)
    print(f"\n Meeting ID {m.id}:")
    print(f"  Title: {m.title}")
    print(f"  Status: {m.status}")
    print(f"  Organizer: {organizer.full_name if organizer else 'Unknown'} (ID: {m.organizer_user_id})")
    print(f"  Scheduled: {m.scheduled_start}")
    print(f"  Created: {m.created_at}")

# Get recent notifications  
notifs = session.exec(
    select(Notification)
    .where(Notification.created_at > cutoff)
    .where(Notification.event_type == "interview_scheduled")
    .order_by(Notification.created_at.desc())
).all()

print(f"\n{'='*60}")
print(f"Recent Meeting Notifications: {len(notifs)}")
print(f"{'='*60}")

for n in notifs[:5]:
    user = session.get(User, n.user_id)
    print(f"  - User {n.user_id} ({user.full_name if user else 'Unknown'})")
    print(f"    Title: {n.title}")
    print(f"    Created: {n.created_at}")
    print(f"    Read: {n.is_read}")

session.close()
