"""
Helper Script: Trigger Test Notifications
Creates test notifications that will trigger email delivery based on user preferences

Usage:
    python trigger_test_notifications.py --user-id 1 --event application_status
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_session
from app.services.notification_service import NotificationService
from app.models import User, NotificationPreferences
from sqlmodel import select
import argparse


def trigger_notification(user_id: int, event_type: str):
    """Trigger a test notification for a user"""
    
    with next(get_session()) as session:
        # Get user
        user = session.get(User, user_id)
        if not user:
            print(f"❌ User {user_id} not found")
            return
        
        print(f"📧 Triggering notification for: {user.email}")
        print(f"   Event type: {event_type}")
        print()
        
        # Get user's preferences for this event
        pref = session.exec(
            select(NotificationPreferences).where(
                NotificationPreferences.user_id == user_id,
                NotificationPreferences.event_type == event_type
            )
        ).first()
        
        if pref:
            print(f"   Email enabled: {pref.email_enabled}")
            print(f"   Email frequency: {pref.email_frequency}")
            print(f"   In-app enabled: {pref.in_app_enabled}")
            print()
        else:
            print(f"   ⚠ No preference found - will use defaults")
            print()
        
        # Prepare test notification data
        test_data = {
            "application_status": {
                "title": "Application Status Updated",
                "message": "Your application for Software Engineer has been reviewed",
                "email_data": {
                    "job_title": "Software Engineer",
                    "company_name": "TechCorp",
                    "status": "Under Review"
                }
            },
            "interview_scheduled": {
                "title": "Interview Scheduled",
                "message": "Your interview has been scheduled for tomorrow at 10:00 AM",
                "email_data": {
                    "job_title": "Senior Developer",
                    "company_name": "StartupXYZ",
                    "interview_time": "Tomorrow at 10:00 AM"
                }
            },
            "message_received": {
                "title": "New Message",
                "message": "You have received a new message from the recruiter",
                "email_data": {
                    "sender": "Jane Smith (Recruiter)"
                }
            },
            "application_received": {
                "title": "New Application Received",
                "message": "A candidate has applied for your job posting",
                "email_data": {
                    "candidate_name": "John Doe",
                    "job_title": "Software Engineer"
                }
            },
            "interview_confirmed": {
                "title": "Interview Confirmed",
                "message": "Candidate has confirmed the interview",
                "email_data": {
                    "candidate_name": "Jane Smith",
                    "interview_time": "Tomorrow at 10:00 AM"
                }
            }
        }
        
        data = test_data.get(event_type, {
            "title": f"Test {event_type}",
            "message": f"This is a test notification for {event_type}",
            "email_data": {}
        })
        
        # Send notification
        try:
            notification = NotificationService.send_notification(
                session=session,
                user_id=user_id,
                event_type=event_type,
                title=data["title"],
                message=data["message"],
                email_data=data["email_data"],
                commit=True,
                validate_taxonomy=False  # Allow test events
            )
            
            if notification:
                print(f"✅ Notification created (ID: {notification.id})")
                print(f"   Check the database and email inbox!")
                
                if pref and pref.email_enabled:
                    print(f"\n   📬 Email should be sent to: {user.email}")
                elif pref and not pref.email_enabled:
                    print(f"\n   🚫 Email blocked by user preference")
                else:
                    print(f"\n   📬 Email sent using default settings")
            else:
                print(f"⚠ Notification blocked by preferences (all channels disabled)")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()


def list_users():
    """List available users"""
    with next(get_session()) as session:
        users = session.exec(select(User).limit(10)).all()
        
        print("\n📋 Available Users:")
        print("-" * 60)
        for user in users:
            print(f"   ID: {user.id:3d} | {user.email:40s} | {user.role}")
        print("-" * 60)
        print()


def main():
    parser = argparse.ArgumentParser(description="Trigger test notifications")
    parser.add_argument("--user-id", type=int, help="User ID to send notification to")
    parser.add_argument("--email", type=str, help="User email to send notification to")
    parser.add_argument("--event", type=str, default="application_status",
                       help="Event type (application_status, interview_scheduled, etc.)")
    parser.add_argument("--list-users", action="store_true", help="List available users")
    
    args = parser.parse_args()
    
    if args.list_users:
        list_users()
        return
    
    if args.email:
        # Find user by email
        with next(get_session()) as session:
            user = session.exec(
                select(User).where(User.email == args.email)
            ).first()
            
            if user:
                args.user_id = user.id
            else:
                print(f"❌ User with email {args.email} not found")
                print("\nUse --list-users to see available users")
                return
    
    if not args.user_id:
        print("❌ Please provide --user-id or --email")
        print("\nUsage examples:")
        print("  python trigger_test_notifications.py --user-id 1 --event application_status")
        print("  python trigger_test_notifications.py --email user@example.com --event interview_scheduled")
        print("  python trigger_test_notifications.py --list-users")
        return
    
    trigger_notification(args.user_id, args.event)


if __name__ == "__main__":
    main()
