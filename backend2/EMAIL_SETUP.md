# Email Configuration for Meeting Scheduler

The meeting scheduler sends confirmation emails to both recruiters and candidates when interviews are scheduled. It uses Python's **built-in `smtplib`** - no extra packages required!

## Quick Setup

### 1. No installation needed!

The new implementation uses Python's built-in `smtplib` module:
- ✅ No `pip install` required
- ✅ Works with any Python 3.x version
- ✅ No dependency conflicts
- ✅ Removed `fastapi-mail` from requirements.txt

### 2. Configure environment variables

Create or update your `.env` file in the `backend2` directory:

```env
# Email Configuration (for meeting scheduler)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
MAIL_FROM=noreply@talentgraph.io
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
```

### 3. Get Gmail App Password (if using Gmail)

If you're using Gmail, you **cannot** use your regular password. You need an **App Password**:

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (required for app passwords)
3. Go to https://myaccount.google.com/apppasswords
4. Create a new app password named "TalentGraph"
5. Copy the 16-character password and use it as `MAIL_PASSWORD`

### 4. Restart the backend

```powershell
# Stop the current backend process (Ctrl+C)
# Then restart:
cd backend2
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

## Testing

Test that email configuration works:

```powershell
# Login as recruiter
$login = Invoke-RestMethod -Uri "http://localhost:8001/auth/company/login" -Method POST -Body '{"email":"admin.jennifer@techcorp.com","password":"Kutty_1304"}' -ContentType "application/json"
$token = $login.access_token

# Check email config (without sending)
Invoke-RestMethod -Uri "http://localhost:8001/meetings/test-email-config" -Headers @{Authorization="Bearer $token"}
```

Expected response:
```json
{
  "mail_server": "smtp.gmail.com",
  "mail_port": 587,
  "mail_from": "noreply@talentgraph.io",
  "credentials_configured": true,
  "mail_username": "your-***"
}
```

## How It Works

When a recruiter schedules a meeting through the UI:

1. **MeetingScheduler component** collects: platform (Teams/Zoom), date, time, duration, topic, agenda
2. **Frontend** calls `POST /meetings/schedule` with candidate email + meeting details
3. **Backend** sends 2 beautiful HTML emails:
   - **To Candidate**: Interview details + preparation tips + meeting link placeholder
   - **To Recruiter**: Confirmation copy with candidate info + next steps

Both emails feature:
- 📅 Full meeting details (date, time, duration, platform)
- 🎨 Professional branding with TalentGraph purple gradient
- ⚡ Platform-specific colors (Teams blue, Zoom blue)
- 📋 Optional agenda section
- ✅ Mobile-responsive HTML design

## Without Email Configuration

If you **don't** configure email (no credentials in `.env`), the meeting scheduler will still work:

- ✅ Meetings are scheduled and saved locally in the UI
- ✅ "Upcoming Meetings" tab works
- ✅ No errors or crashes
- ⚠️ Confirmation emails are **skipped** (logged to console)
- ℹ️ Perfect for development/testing without SMTP access

The backend gracefully handles missing credentials:
```python
if not conf.MAIL_USERNAME or not conf.MAIL_PASSWORD:
    # Log the meeting but don't send emails
    return {"success": True, "message": "Meeting scheduled (email skipped)"}
```

## Using Other Email Providers

### Outlook/Office 365

```env
MAIL_SERVER=smtp.office365.com
MAIL_PORT=587
MAIL_USERNAME=your-email@outlook.com
MAIL_PASSWORD=your-outlook-password
```

### SendGrid

```env
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
```

### Custom SMTP Server

```env
MAIL_SERVER=mail.yourdomain.com
MAIL_PORT=587  # or 465 for SSL
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=your-smtp-password
```

## Troubleshooting

### "Email send failed: Authentication failed"
- Check that your `MAIL_USERNAME` and `MAIL_PASSWORD` are correct
- For Gmail, ensure you're using an **App Password**, not your regular password
- Verify 2-Step Verification is enabled for Gmail

### "Email send failed: Connection refused"
- Check that `MAIL_SERVER` and `MAIL_PORT` are correct
- Try `MAIL_PORT=465` with `MAIL_SSL_TLS=True` for SSL
- Verify your firewall allows outbound connections on the SMTP port

### Emails not arriving
- Check spam/junk folder
- Verify `MAIL_FROM` email address is valid
- Some providers require sender verification
- Check backend logs for specific error messages

### "fastapi_mail" import error
```powershell
cd backend2
.\venv\Scripts\Activate.ps1
pip install fastapi-mail==1.4.1
```

## Production Recommendations

1. **Use environment variables**, never commit credentials to git
2. **Set up proper sender domain** (e.g., `noreply@yourdomain.com`)
3. **Configure SPF/DKIM records** for better deliverability
4. **Use a transactional email service** (SendGrid, Mailgun, AWS SES)
5. **Monitor delivery rates** and bounce notifications
6. **Add unsubscribe links** for automated emails (if applicable)

## Email Templates

The confirmation emails include:

**Candidate Email:**
- 🎉 "Interview Scheduled!" header with green checkmark
- 📋 Full meeting details card (date, time, duration, platform, topic)
- 📝 Optional agenda section (yellow highlight)
- 💡 Preparation tips (test setup, have resume ready, prepare questions)
- ✉️ Professional footer with TalentGraph branding

**Recruiter Email:**
- ✅ "Meeting Confirmed" header
- 📊 Meeting summary with candidate name and email
- 📝 Optional agenda section
- 📌 Next steps checklist (candidate notified, review profile, prepare questions)
- ✉️ Professional footer

---

**API Endpoint:** `POST /meetings/schedule`  
**Backend File:** `backend2/app/routers/meetings.py`  
**Frontend Component:** `frontend2/src/components/MeetingScheduler.tsx`
