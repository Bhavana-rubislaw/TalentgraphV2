"""
Test SMTP Email Configuration
Tests if Gmail SMTP is properly configured and can send emails

Run: python test_smtp_email.py
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_smtp_connection():
    """Test basic SMTP connection without sending email"""
    print("\n" + "="*60)
    print("SMTP CONNECTION TEST")
    print("="*60 + "\n")
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    print(f"📧 Configuration:")
    print(f"   Host: {smtp_host}")
    print(f"   Port: {smtp_port}")
    print(f"   Username: {smtp_username}")
    print(f"   Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print()
    
    if not all([smtp_host, smtp_port, smtp_username, smtp_password]):
        print("❌ ERROR: Missing SMTP configuration in .env file")
        print("\nRequired variables:")
        print("  - SMTP_HOST")
        print("  - SMTP_PORT")
        print("  - SMTP_USERNAME")
        print("  - SMTP_PASSWORD")
        return False
    
    try:
        print("🔌 Connecting to SMTP server...")
        server = smtplib.SMTP(smtp_host, int(smtp_port), timeout=10)
        print("✅ Connected successfully")
        
        print("🔐 Starting TLS encryption...")
        server.starttls()
        print("✅ TLS enabled")
        
        print("👤 Authenticating...")
        server.login(smtp_username, smtp_password)
        print("✅ Authentication successful")
        
        server.quit()
        print("\n✅ SMTP CONNECTION TEST PASSED\n")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ Authentication failed: {e}")
        print("\nPossible causes:")
        print("  1. Incorrect app password")
        print("  2. App password expired or revoked")
        print("  3. Gmail account security settings blocking access")
        print("\nTo fix:")
        print("  1. Go to https://myaccount.google.com/apppasswords")
        print("  2. Generate a new 16-character app password")
        print("  3. Update SMTP_PASSWORD in .env file")
        return False
        
    except smtplib.SMTPConnectError as e:
        print(f"\n❌ Connection failed: {e}")
        print("\nPossible causes:")
        print("  1. Firewall blocking SMTP port 587")
        print("  2. Internet connection issue")
        print("  3. SMTP server down")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        return False


def test_smtp_send_email(recipient_email=None):
    """Test sending an actual email"""
    print("\n" + "="*60)
    print("SMTP SEND EMAIL TEST")
    print("="*60 + "\n")
    
    if not recipient_email:
        recipient_email = input("Enter recipient email address (or press Enter to skip): ").strip()
        if not recipient_email:
            print("⏭️  Skipping send test")
            return True
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username)
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "TalentGraph")
    
    try:
        print(f"📨 Sending test email to: {recipient_email}")
        
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        # Create email
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{smtp_from_name} <{smtp_from_email}>"
        msg['To'] = recipient_email
        msg['Subject'] = "✅ TalentGraph SMTP Test - Success!"
        
        # HTML body
        html_body = """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ SMTP Test Successful!</h1>
            </div>
            
            <div style="background: #f7f7f7; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Configuration Verified</h2>
                <p style="color: #666; line-height: 1.6;">
                    Your TalentGraph email configuration is working correctly. 
                    Interview scheduling emails will be sent successfully.
                </p>
                
                <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin-top: 15px;">
                    <strong style="color: #667eea;">SMTP Details:</strong><br/>
                    <span style="color: #666; font-size: 14px;">
                        Host: {smtp_host}<br/>
                        Port: {smtp_port}<br/>
                        From: {smtp_from_email}
                    </span>
                </div>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated test email from TalentGraph<br/>
                Sent on: {timestamp}
            </p>
        </body>
        </html>
        """
        
        from datetime import datetime
        html_body = html_body.format(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_from_email=smtp_from_email,
            timestamp=datetime.now().strftime("%B %d, %Y at %I:%M %p")
        )
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send
        server.send_message(msg)
        server.quit()
        
        print("✅ Email sent successfully!")
        print(f"\n📬 Check {recipient_email} inbox (and spam folder)")
        print("\n✅ SMTP SEND EMAIL TEST PASSED\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Failed to send email: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        return False


def main():
    """Run all SMTP tests"""
    print("\n" + "="*60)
    print("TALENTGRAPH SMTP DIAGNOSTICS")
    print("="*60)
    
    # Test 1: Connection
    connection_ok = test_smtp_connection()
    
    if not connection_ok:
        print("\n⚠️  SMTP connection failed. Fix configuration before proceeding.")
        sys.exit(1)
    
    # Test 2: Send email (optional)
    print("\n" + "-"*60)
    test_email = input("\nWould you like to send a test email? (y/n): ").strip().lower()
    
    if test_email == 'y':
        test_smtp_send_email()
    
    print("\n" + "="*60)
    print("DIAGNOSTIC COMPLETE")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
