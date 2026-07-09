"""Check notifications in the database"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import Notification, User

def check_notifications():
    with Session(engine) as session:
        # Get all notifications
        notifications = session.exec(select(Notification)).all()
        
        print(f"\n📬 Total notifications in database: {len(notifications)}\n")
        
        if not notifications:
            print("❌ No notifications found in database!")
            print("\nPossible reasons:")
            print("1. You only froze jobs (freeze doesn't create notifications)")
            print("2. You need to REACTIVATE frozen jobs to trigger notifications")
            print("3. Database issue or notifications not being created")
            return
        
        # Group by user
        user_notifications = {}
        for notif in notifications:
            user = session.get(User, notif.user_id)
            if user:
                if user.email not in user_notifications:
                    user_notifications[user.email] = []
                user_notifications[user.email].append(notif)
        
        # Display notifications
        for email, notifs in user_notifications.items():
            print(f"\n👤 User: {email}")
            print(f"   Total notifications: {len(notifs)}")
            print(f"   Unread: {sum(1 for n in notifs if not n.is_read)}")
            print()
            
            for notif in notifs[:5]:  # Show first 5
                read_status = "✅ Read" if notif.is_read else "🔔 Unread"
                print(f"   [{read_status}] {notif.event_type}")
                print(f"   Title: {notif.title}")
                print(f"   Message: {notif.message}")
                print(f"   Created: {notif.created_at}")
                print()
            
            if len(notifs) > 5:
                print(f"   ... and {len(notifs) - 5} more\n")

if __name__ == "__main__":
    check_notifications()
