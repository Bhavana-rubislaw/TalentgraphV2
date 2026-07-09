"""
Quick test to verify email system is working
This sends a test email to verify SMTP configuration
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.services.email_service import SMTPEmailProvider


def test_email_send():
    """Send a test email"""
    print("\n" + "="*60)
    print("EMAIL SYSTEM TEST")
    print("="*60)
    
    # Get email configuration
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_from = os.getenv('SMTP_FROM_EMAIL')
    
    print(f"\nSMTP Configuration:")
    print(f"  Host: {smtp_host}")
    print(f"  Port: {smtp_port}")
    print(f"  Username: {smtp_username}")
    print(f"  From: {smtp_from}")
    
    if not smtp_username:
        print("\n❌ SMTP_USERNAME not configured!")
        return False
    
    # Initialize SMTP provider
    try:
        provider = SMTPEmailProvider()
        print("\n✓ SMTP provider initialized")
    except Exception as e:
        print(f"\n❌ Failed to initialize SMTP provider: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Ask user for test recipient
    test_recipient = input("\n📧 Enter email address to send test to: ").strip()
    
    if not test_recipient:
        print("❌ No email address provided")
        return False
    
    # Send test email
    try:
        print(f"\n📤 Sending test email to {test_recipient}...")
        
        message_id = provider.send_email(
            to_email=test_recipient,
            subject="🧪 TalentGraph Meeting System Test",
            html_body="""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">TalentGraph Email Test</h2>
                    <p>This is a test email to verify the meeting notification system is working correctly.</p>
                    <p>If you received this email, the SMTP configuration is working! ✅</p>
                    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px;">
                        Sent from TalentGraph V2 Meeting Notification System<br>
                        Time: <strong>May 19, 2026</strong>
                    </p>
                </body>
                </html>
            """,
            text_body="""
TalentGraph Email Test

This is a test email to verify the meeting notification system is working correctly.

If you received this email, the SMTP configuration is working! ✅

---
Sent from TalentGraph V2 Meeting Notification System
Time: May 19, 2026
            """
        )
        
        print(f"\n✅ EMAIL SENT SUCCESSFULLY!")
        print(f"   Message ID: {message_id}")
        print(f"   Recipient: {test_recipient}")
        print(f"\n✓ Check your inbox at {test_recipient}")
        print("✓ Check spam folder if not in inbox")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED TO SEND EMAIL: {e}")
        print("\nFull error details:")
        import traceback
        traceback.print_exc()
        
        print("\n🔍 Troubleshooting:")
        print("1. Verify SMTP credentials in .env file")
        print("2. Check if Gmail App Password is correct")
        print("3. Ensure Gmail account allows app passwords")
        print("4. Check internet connection")
        print("5. Verify firewall allows port 587")
        
        return False


if __name__ == "__main__":
    success = test_email_send()
    
    print("\n" + "="*60)
    if success:
        print("✅ EMAIL SYSTEM IS WORKING")
        print("\nThe meeting notification emails should work correctly.")
        print("If meetings still don't send emails, check the logs for errors.")
    else:
        print("❌ EMAIL SYSTEM HAS ISSUES")
        print("\nFix the SMTP configuration before testing meeting notifications.")
    print("="*60 + "\n")
    
    sys.exit(0 if success else 1)
