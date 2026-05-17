"""Check notifications in database"""
from app.database import engine
from app.models import Notification
from sqlmodel import Session, select

with Session(engine) as session:
    # Count total notifications
    count = session.exec(select(Notification)).all()
    print(f"\n📬 Total notifications in database: {len(count)}")
    
    if len(count) > 0:
        print("\n📋 Recent 10 notifications:")
        print("-" * 80)
        recent = session.exec(
            select(Notification).order_by(Notification.timestamp.desc()).limit(10)
        ).all()
        
        for n in recent:
            read_status = "✓ Read" if n.read else "● Unread"
            print(f"ID: {n.id:3d} | User: {n.user_id:3d} | {read_status:8s} | {n.event_type:25s} | {n.title[:40]}")
    else:
        print("\n⚠️  No notifications found in database!")
        print("\nTo create test notifications, try:")
        print("  - Apply to a job as a candidate")
        print("  - Create a match (swipe right)")
        print("  - Send a message")
        print("  - Schedule an interview")
