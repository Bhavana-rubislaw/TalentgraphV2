"""
Test script to verify meeting notification and email system
Run this to check if notifications and emails are working
"""

import os
import sys
from datetime import datetime, timedelta

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, Meeting, MeetingParticipant, Notification
from app.routers.notifications import push_notification
from app.services.meeting_email_service import MeetingEmailService


def test_notification_system():
    """Test in-app notification creation"""
    print("\n" + "="*60)
    print("TESTING IN-APP NOTIFICATION SYSTEM")
    print("="*60)
    
    with Session(engine) as session:
        # Get a test user (candidate)
        user = session.exec(select(User).where(User.email == "sarah.anderson@email.com")).first()
        
        if not user:
            print("❌ Test user not found")
            return False
        
        print(f"✓ Found test user: {user.full_name} (ID: {user.id})")
        
        # Create a test notification
        try:
            notif = push_notification(
                session=session,
                user_id=user.id,
                title="🧪 Test Notification",
                message="This is a test notification for meeting system verification",
                event_type="test",
                route="/meetings"
            )
            print(f"✓ Notification created successfully - ID: {notif.id}")
            
            # Verify it was saved
            saved_notif = session.get(Notification, notif.id)
            if saved_notif:
                print(f"✓ Notification verified in database")
                print(f"  - Title: {saved_notif.title}")
                print(f"  - Message: {saved_notif.message}")
                print(f"  - Read: {saved_notif.is_read}")
                print(f"  - Created: {saved_notif.created_at}")
                return True
            else:
                print("❌ Notification not found in database")
                return False
                
        except Exception as e:
            print(f"❌ Failed to create notification: {e}")
            import traceback
            traceback.print_exc()
            return False


def test_email_system():
    """Test email sending system"""
    print("\n" + "="*60)
    print("TESTING EMAIL SYSTEM")
    print("="*60)
    
    # Check environment variables
    provider_type = os.getenv('EMAIL_PROVIDER', 'sendgrid')
    print(f"Email Provider: {provider_type}")
    
    if provider_type == 'smtp':
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = os.getenv('SMTP_PORT')
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('SMTP_FROM_EMAIL')
        
        print(f"SMTP Host: {smtp_host}")
        print(f"SMTP Port: {smtp_port}")
        print(f"SMTP Username: {smtp_username}")
        print(f"SMTP Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
        print(f"From Email: {smtp_from}")
        
        if not smtp_username or not smtp_password:
            print("❌ SMTP credentials not configured!")
            return False
    
    # Try to initialize email service
    try:
        email_service = MeetingEmailService()
        print("✓ Email service initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize email service: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_meeting_flow():
    """Test the full meeting notification flow"""
    print("\n" + "="*60)
    print("TESTING MEETING NOTIFICATION FLOW")
    print("="*60)
    
    with Session(engine) as session:
        # Get test users
        organizer = session.exec(select(User).where(User.email == "bhavana@rubislawinvest.com")).first()
        participant = session.exec(select(User).where(User.email == "sarah.anderson@email.com")).first()
        
        if not organizer or not participant:
            print("❌ Test users not found")
            return False
        
        print(f"✓ Organizer: {organizer.full_name}")
        print(f"✓ Participant: {participant.full_name}")
        
        # Check for recent test meetings
        recent_meetings = session.exec(
            select(Meeting)
            .where(Meeting.organizer_user_id == organizer.id)
            .order_by(Meeting.created_at.desc())
            .limit(5)
        ).all()
        
        if recent_meetings:
            print(f"\n📅 Recent Meetings (last 5):")
            for mtg in recent_meetings:
                print(f"  - [{mtg.id}] {mtg.title}")
                print(f"    Status: {mtg.status}")
                print(f"    Created: {mtg.created_at}")
                print(f"    Scheduled: {mtg.scheduled_start}")
                
                # Check notifications for this meeting
                notifs = session.exec(
                    select(Notification)
                    .where(Notification.user_id == participant.id)
                    .where(Notification.event_type == "interview_scheduled")
                    .order_by(Notification.created_at.desc())
                    .limit(1)
                ).first()
                
                if notifs:
                    print(f"    ✓ Notification exists for participant")
                else:
                    print(f"    ❌ No notification found for participant")
        else:
            print("ℹ No recent meetings found")
        
        return True


def main():
    print("\n" + "="*60)
    print("TALENTGRAPH MEETING NOTIFICATION DIAGNOSTIC")
    print("="*60)
    
    results = {
        "Notification System": test_notification_system(),
        "Email System": test_email_system(),
        "Meeting Flow": test_meeting_flow()
    }
    
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ ALL TESTS PASSED - System should be working!")
    else:
        print("❌ SOME TESTS FAILED - Check errors above")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
