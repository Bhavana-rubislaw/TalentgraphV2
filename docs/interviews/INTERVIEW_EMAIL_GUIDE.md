# Interview Email Guide - TalentGraph

## Overview

TalentGraph's interview scheduling system uses a **dedicated Gmail account** to send professional interview confirmation emails. When a recruiter schedules an interview, the system automatically sends email invitations to **both the candidate and the recruiter** from the TalentGraph account.

---

## Email Flow Architecture

### How It Works

1. **Recruiter schedules interview** via TalentGraph dashboard
2. **Email sent from** dedicated TalentGraph Gmail account: `talentgraph.interviews@gmail.com`
3. **Primary recipient (To:)** - Candidate receives the interview invitation
4. **CC recipient (Cc:)** - Recruiter receives a copy for their records
5. **Reply-To header** - Set to recruiter's email address so candidate replies go directly to recruiter
6. **In-app notification** - Candidate also receives TalentGraph notification with deep link

### Email Headers

```
From: TalentGraph Interviews <talentgraph.interviews@gmail.com>
To: candidate@example.com
Cc: recruiter@company.com
Reply-To: recruiter@company.com
Subject: Interview Invitation | Senior Developer | TechCorp Inc
```

### Benefits

✅ **Professional brand presence** - All interviews sent from consistent TalentGraph address  
✅ **Centralized tracking** - Company maintains single mailbox for all interview correspondence  
✅ **Recruiter transparency** - Recruiter receives copy and knows exactly what candidate received  
✅ **Easy replies** - Candidate can reply directly to recruiter (Reply-To header)  
✅ **No recruiter credentials needed** - Recruiters don't enter personal Gmail passwords  
✅ **Audit trail** - All interviews logged in TalentGraph database + Gmail sent folder  

---

## Setup Guide

### Prerequisites

- Gmail account dedicated to TalentGraph (recommended: `talentgraph.interviews@gmail.com`)
- Google Workspace or personal Gmail account with 2-Step Verification enabled
- Access to `.env` file on backend server

### Step 1: Create/Configure Gmail Account

**Option A: Create new Gmail account** (Recommended)
1. Go to https://accounts.google.com/signup
2. Create account: `talentgraph.interviews@gmail.com`
3. Complete setup and verify email

**Option B: Use existing Gmail account**
- Ensure it's dedicated to TalentGraph (not personal account)
- Professional address recommended

### Step 2: Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Click **2-Step Verification**
3. Follow setup wizard (phone verification, backup codes, etc.)
4. Verify 2-Step Verification is **ON**

**Important**: Google requires 2-Step Verification to generate App Passwords

### Step 3: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. Click **Select app** dropdown → Choose **Mail**
4. Click **Select device** dropdown → Choose **Other (Custom name)**
5. Enter device name: **TalentGraph Backend Server**
6. Click **Generate**
7. Google displays 16-character password: `xxxx xxxx xxxx xxxx`
8. **Copy this password** (spaces optional - will be removed automatically)

**Security Note**: This App Password allows TalentGraph to send emails without knowing your actual Gmail password. You can revoke it anytime from Google Account settings.

### Step 4: Update Backend Environment Variables

Edit `backend2/.env` file:

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=talentgraph.interviews@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # Your 16-character App Password
SMTP_FROM_EMAIL=talentgraph.interviews@gmail.com
SMTP_FROM_NAME=TalentGraph Interviews
SMTP_USE_TLS=true
```

**Replace values**:
- `SMTP_USERNAME` - Your dedicated Gmail address
- `SMTP_PASSWORD` - The 16-character App Password from Step 3
- `SMTP_FROM_EMAIL` - Should match `SMTP_USERNAME` for Gmail

**Important**: 
- Never commit `.env` file to version control
- Keep App Password secure (treat like a password)
- Use `.env.example` as template

### Step 5: Restart Backend Server

After updating `.env`, restart the backend:

```bash
cd backend2

# If using uvicorn directly
uvicorn app.main:app --reload

# If using start script
./start.sh
```

The backend will automatically load new SMTP credentials on startup.

---

## Testing the Setup

### Test Email Send

**Method 1: Schedule Real Interview** (Recommended)
1. Log in as recruiter to TalentGraph dashboard
2. Go to **Applications** tab
3. Click on any application
4. Click **Schedule Interview** button
5. Fill in interview details:
   - Date/time
   - Timezone
   - Meeting link (Zoom/Teams/Google Meet)
   - Optional notes
6. Click **Send Interview Invite**
7. Check:
   - ✅ Success message appears
   - ✅ Candidate email inbox (if test candidate)
   - ✅ Recruiter email inbox (you should receive CC)
   - ✅ Gmail sent folder (`talentgraph.interviews@gmail.com`)

**Method 2: Backend Test Endpoint** (If available)
```bash
# Test SMTP credentials
curl -X POST http://localhost:8000/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "test@example.com",
    "subject": "Test Email",
    "recruiter_email": "recruiter@example.com"
  }'
```

### Expected Results

**Successful Setup**:
- ✅ Backend logs show: `[EMAIL] ✅ Sent to candidate@example.com (CC: recruiter@example.com)`
- ✅ Candidate receives professional HTML email
- ✅ Recruiter receives CC copy
- ✅ Email sender shows: `TalentGraph Interviews <talentgraph.interviews@gmail.com>`
- ✅ Reply button in email client shows recruiter email (Reply-To)
- ✅ Candidate receives in-app notification in TalentGraph

**Failed Setup** (Check each):
- ❌ Backend logs show: `SMTP credentials not configured` → Check Step 4
- ❌ Backend logs show: `Authentication failed` → Verify App Password (not regular password)
- ❌ Backend logs show: `Username and Password not accepted` → Check SMTP_USERNAME matches Gmail
- ❌ No email received → Check spam folder, verify email addresses

---

## Troubleshooting

### Error: "SMTP credentials not configured"

**Cause**: Environment variables not loaded

**Solution**:
1. Verify `.env` file exists in `backend2/` directory
2. Check variables are set (not commented out with `#`)
3. Restart backend server
4. Check server logs on startup for loaded config

### Error: "Username and Password not accepted"

**Cause**: Invalid App Password or wrong Gmail account

**Solution**:
1. Verify `SMTP_USERNAME` matches Gmail account
2. Verify `SMTP_PASSWORD` is App Password (not regular password)
3. Remove spaces from App Password if present
4. Regenerate App Password if unsure:
   - Go to https://myaccount.google.com/apppasswords
   - Find "TalentGraph Backend Server"
   - Click **Remove** then generate new one
5. Update `.env` with new password
6. Restart backend

### Error: "2-Step Verification Required"

**Cause**: Gmail account doesn't have 2-Step Verification enabled

**Solution**:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Complete phone verification
4. Return to App Passwords and generate password

### Email Sent But Not Received

**Check 1: Spam Folder**
- Interview emails may be filtered as spam initially
- Mark as "Not Spam" to train filter
- Whitelist `talentgraph.interviews@gmail.com`

**Check 2: Email Address Typo**
- Verify candidate email in TalentGraph database
- Check backend logs for actual email address used

**Check 3: Gmail Sent Folder**
- Log into `talentgraph.interviews@gmail.com`
- Check **Sent** folder - email should be there if sent successfully
- If not in Sent folder, check backend error logs

**Check 4: Rate Limits**
- Gmail has sending limits (500 emails/day for regular accounts, 2000/day for Workspace)
- Check if limit exceeded (rare for interview scheduling)

### Recruiter Not Receiving CC

**Cause**: Recruiter email incorrect or CC not configured

**Solution**:
1. Verify recruiter's email in TalentGraph (check user profile)
2. Check backend logs: should show `(CC: recruiter@example.com)`
3. Verify `emailer.py` includes `cc_emails=[recruiter_email]`
4. Check recruiter's spam folder

### Reply-To Not Working

**Cause**: Email client doesn't support Reply-To or recruiter email incorrect

**Solution**:
1. Verify recruiter email in backend logs
2. Test with different email client (Gmail web, Outlook, etc.)
3. Check email headers (View Original in Gmail) - should show `Reply-To: recruiter@example.com`

---

## Email Content Customization

### Customizing Subject Line

**In Frontend Modal** (Recommended):
- Recruiter can enter custom subject when scheduling
- Falls back to default: `Interview Invitation | {job_title} | {company_name}`

**In Backend** (`emailer.py`):
```python
# Line ~119
subject = custom_subject or f"Interview Invitation | {job_title} | {company_name}"
```

### Customizing Email Body

Edit `backend2/app/emailer.py` in `send_interview_schedule_email()` function:

**Header Color**:
```html
<!-- Line ~135 -->
<div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); ...">
  <!-- Purple gradient - change hex codes for different color -->
```

**Company Logo**:
```html
<!-- Add after line ~137 -->
<img src="https://yourdomain.com/logo.png" alt="Logo" style="max-width: 120px; margin-bottom: 16px;">
```

**Preparation Tips**:
```html
<!-- Lines ~220-230 -->
<ul style="...">
  <li>Test your audio and video...</li>
  <li>Your custom tip here</li>
</ul>
```

**Footer Text**:
```html
<!-- Line ~245 -->
<p style="color: #64748b; font-size: 12px; ...">
  This interview was scheduled via <strong>TalentGraph</strong>.<br/>
  Questions? Reply to this email to reach {recruiter_name} directly.
</p>
```

### Adding Custom Fields

**1. Update Function Signature** (`emailer.py`):
```python
def send_interview_schedule_email(
    # ... existing params ...
    custom_field: Optional[str] = None  # Add new parameter
) -> bool:
```

**2. Use in HTML Template**:
```html
{f'<p>{custom_field}</p>' if custom_field else ''}
```

**3. Update Endpoint** (`applications.py`):
```python
email_sent = send_interview_schedule_email(
    # ... existing args ...
    custom_field=data.custom_field  # Pass from request
)
```

**4. Update Request Model**:
```python
class InterviewScheduleRequest(BaseModel):
    # ... existing fields ...
    custom_field: Optional[str] = None  # Add to Pydantic model
```

---

## Security Best Practices

### Protecting Credentials

✅ **DO**:
- Use `.env` file for credentials (never hard-code) - Use App Passwords (not regular Gmail password)
- Restrict `.env` file permissions: `chmod 600 .env`
- Add `.env` to `.gitignore`
- Use different App Passwords for dev/staging/production
- Rotate App Passwords periodically (every 6-12 months)
- Revoke App Passwords when team members leave

❌ **DON'T**:
- Commit `.env` to version control
- Share App Password via email/chat
- Use personal Gmail account
- Use same App Password across multiple apps
- Log SMTP credentials in application logs

### Gmail Account Security

1. **Enable Advanced Protection** (Optional but recommended):
   - Go to https://landing.google.com/advancedprotection/
   - Enrolls account in Google's strongest security

2. **Monitor Account Activity**:
   - Check https://myaccount.google.com/device-activity
   - Review sent emails periodically
   - Set up alerts for suspicious activity

3. **Backup Access**:
   - Store recovery codes in secure location (password manager)
   - Add recovery email and phone
   - Document Account in team password manager (1Password, LastPass, etc.)

4. **Access Control**:
   - Limit who has access to `talentgraph.interviews@gmail.com`
   - Use Google Workspace for team shared mailbox (if applicable)
   - Regularly audit who has `.env` file access on servers

---

## Maintenance & Monitoring

### Regular Health Checks

**Weekly**:
- [ ] Verify interviews are sending successfully
- [ ] Check Gmail sent folder for delivered emails
- [ ] Review backend logs for email errors

**Monthly**:
- [ ] Review Gmail storage usage (clean old emails if needed)
- [ ] Check for any failed deliveries
- [ ] Verify App Password still active

**Quarterly**:
- [ ] Audit who has access to SMTP credentials
- [ ] Review email bounce rates
- [ ] Consider rotating App Password

### Logging & Debugging

**Backend Logs** (Check these for issues):
```bash
# Search for email-related logs
grep "EMAIL" backend2/logs/app.log

# Successful send
[EMAIL] ✅ Sent to candidate@example.com (CC: recruiter@example.com): Interview Invitation | ...

# Failed send
[EMAIL] ❌ Failed to send to candidate@example.com: Authentication failed

# Configuration error
[EMAIL] SMTP credentials not configured - cannot send to candidate@example.com
```

**API Response** (Frontend will show):
```json
{
  "success": true,
  "message": "Interview invite sent to candidate@example.com and recruiter@example.com from TalentGraph Interviews",
  "email_sent": true,
  "email_error": null,
  "from_email": "talentgraph.interviews@gmail.com",
  "scheduled_by": "recruiter@example.com"
}
```

### Gmail Sending Limits

**Personal Gmail**: 500 emails/day  
**Google Workspace**: 2,000 emails/day

**If hitting limits**:
1. Upgrade to Google Workspace ($6/user/month)
2. Implement email queueing (send in batches)
3. Use dedicated email service (SendGrid, AWS SES) for higher volume

---

## Migration from Old Setup

### If You Were Using Recruiter Personal Gmail

**Before** (Old Flow):
- Email sent from recruiter's personal Gmail
- Recruiter entered their Gmail credentials in TalentGraph
- Each recruiter managed their own SMTP config
- Security risk: personal passwords in application

**After** (New Flow):
- Email sent from `talentgraph.interviews@gmail.com`
- Only one set of credentials (App Password) in `.env`
- Recruiter still receives CC copy
- Replies still go to recruiter (Reply-To header)

**Migration Steps**:
1. Set up dedicated TalentGraph Gmail account (see Setup Guide above)
2. Update `.env` with TalentGraph SMTP credentials
3. Remove personal SMTP credentials from recruiter profiles (if stored)
4. Test email send with new setup
5. Notify recruiters they'll receive CC copies
6. Document new flow for team

**Advantages**:
- ✅ Better security (no personal passwords)
- ✅ Centralized email tracking
- ✅ Consistent professional branding
- ✅ Easier onboarding (no per-recruiter setup)
- ✅ Audit trail in single mailbox

---

## API Reference

### Endpoint: Schedule Interview

**POST** `/applications/{application_id}/schedule-interview`

**Authentication**: Required (Bearer token)

**Authorization**: Recruiter/Company user who owns the job posting

**Request Body**:
```json
{
  "candidate_email": "jane@example.com",
  "interview_datetime": "March 25, 2026 at 2:00 PM",
  "timezone": "Eastern Time (ET)",
  "meeting_link": "https://zoom.us/j/123456789",
  "notes": "Please review Oracle Fusion documentation before interview",
  "subject": "Interview: Senior Oracle Developer"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Interview invite sent to jane@example.com and recruiter@company.com from TalentGraph Interviews",
  "application_id": 42,
  "candidate_email": "jane@example.com",
  "recruiter_email": "recruiter@company.com",
  "from_email": "talentgraph.interviews@gmail.com",
  "scheduled_by": "recruiter@company.com",
  "interview_datetime": "March 25, 2026 at 2:00 PM",
  "timezone": "Eastern Time (ET)",
  "meeting_link": "https://zoom.us/j/123456789",
  "email_sent": true,
  "email_error": null,
  "notification_sent": true
}
```

**Error Response - Email Failed** (200 with warning):
```json
{
  "success": true,
  "message": "Interview scheduled. In-app notification sent, but email failed: SMTP credentials not configured",
  "email_sent": false,
  "email_error": "SMTP credentials not configured",
  ...
}
```

**Error Responses**:
- `403` - Not a recruiter or doesn't own job posting
- `404` - Application or candidate not found
- `400` - Invalid email or meeting link

---

## Support & Resources

### Documentation

- **Main Implementation Doc**: `INTERVIEW_SCHEDULING_IMPLEMENTATION.md`
- **Gmail App Password Guide**: `backend2/GMAIL_APP_PASSWORD_GUIDE.md`
- **Environment Variables**: `backend2/.env.example`

### Google Resources

- **2-Step Verification**: https://myaccount.google.com/security
- **App Passwords**: https://myaccount.google.com/apppasswords
- **Gmail Sending Limits**: https://support.google.com/mail/answer/22839
- **SMTP Settings**: https://support.google.com/mail/answer/7126229

### Common Use Cases

**Use Case 1: Onboarding New Recruiter**
1. Recruiter creates TalentGraph account (no Gmail credentials needed)
2. Recruiter schedules interview via UI
3. System sends from `talentgraph.interviews@gmail.com`
4. Recruiter receives CC copy automatically
5. Candidate replies go to recruiter's email

**Use Case 2: Multiple Interviewers**
- Current: Only recruiting submitter receives CC
- Future Enhancement: Add `additional_interviewers` field to CC multiple people

**Use Case 3: Candidate Replies**
- Candidate receives email from TalentGraph
- Clicks "Reply" in email client
- Reply goes to recruiter's email (Reply-To header)
- Correspondence continues between candidate and recruiter
- TalentGraph Gmail not involved in replies (clean separation)

---

## FAQ

### Q: Why use dedicated Gmail instead of recruiter's personal email?

**A:** Security, consistency, and compliance. Personal Gmail passwords should never be stored in applications. A dedicated account provides:
- Professional branding (consistent sender)
- Centralized audit trail
- No security risk if recruiter leaves
- Easier compliance with data policies

### Q: Will candidates know emails are from TalentGraph?

**A:** Yes, sender shows `TalentGraph Interviews <talentgraph.interviews@gmail.com>`. Footer also mentions "scheduled via TalentGraph". This is professional and transparent.

### Q: Can candidates reply to recruiter?

**A:** Yes! Reply-To header is set to recruiter's email. When candidate clicks Reply, it goes directly to recruiter, not TalentGraph account.

### Q: Do recruiters need to do anything special?

**A:** No additional setup. Recruiters just schedule interviews via the UI. They automatically receive a CC copy in their inbox.

### Q: What if we already have interviews scheduled?

**A:** Old interviews are unaffected (email already sent). New interviews will use new flow. No migration needed.

### Q: Can we customize the email template?

**A:** Yes, edit `backend2/app/emailer.py` in the `send_interview_schedule_email()` function. See "Email Content Customization" section.

### Q: What happens if SMTP credentials are wrong?

**A:** Email fails gracefully. In-app notification still sends. Recruiter sees error message in UI: "Email failed: [error]". Candidate still gets notification in TalentGraph app.

### Q: Can we use Google Workspace instead of Gmail?

**A:** Yes! Google Workspace accounts work identically. Just use your Workspace email and generate App Password. Workspace provides higher sending limits (2000/day vs 500/day).

### Q: Is there a rate limit?

**A:** Gmail standard: 500 emails/day. Workspace: 2000/day. Typical usage (5-20 interviews/day) is well within limits.

### Q: Can we track email opens/clicks?

**A:** Not with current Gmail SMTP. For tracking, migrate to SendGrid, AWS SES, or Mailgun. They provide delivery, open, and click analytics.

---

## Next Steps

1. **Complete Setup**:
   - [ ] Create/configure dedicated Gmail account
   - [ ] Enable 2-Step Verification
   - [ ] Generate App Password
   - [ ] Update `.env` file
   - [ ] Restart backend server
   - [ ] Test email send

2. **Team Training**:
   - [ ] Share this guide with recruiting team
   - [ ] Demo interview scheduling flow
   - [ ] Show recruiters they'll receive CC copies
   - [ ] Document any custom processes

3. **Optional Enhancements**:
   - [ ] Add company logo to email template
   - [ ] Customize preparation tips for your company
   - [ ] Set up email monitoring/alerts
   - [ ] Implement calendar file (ICS) attachments
   - [ ] Add multiple CC recipients feature

---

**Version**: 1.0  
**Last Updated**: March 17, 2026  
**Maintained By**: TalentGraph Engineering Team

For questions or issues, contact:
- **Technical Support**: [Your support email]
- **Documentation**: See `INTERVIEW_SCHEDULING_IMPLEMENTATION.md`
- **Security**: [Your security team email]
