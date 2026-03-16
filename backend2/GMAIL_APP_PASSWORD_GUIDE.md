# 📧 Gmail App Password Setup for Meeting Scheduler

## ⚡ Quick Steps to Get Meeting Emails Working

### Step 1: Enable 2-Step Verification (Required)

1. Open: https://myaccount.google.com/security
2. Scroll to "How you sign in to Google"
3. Click **"2-Step Verification"**
4. Follow the prompts to enable it (use your phone number)

### Step 2: Generate App Password

1. Open: https://myaccount.google.com/apppasswords
   - (If link doesn't work, go to Google Account → Security → App Passwords)

2. You might need to sign in again

3. Under "Select app", choose **"Other (Custom name)"**
   - Type: `TalentGraph Meeting Scheduler`

4. Click **"Generate"**

5. Google will show a **16-character password** like: `abcd efgh ijkl mnop`

6. **COPY THIS PASSWORD** (you won't see it again!)

### Step 3: Update .env File

1. Open: `backend2\.env`

2. Replace this line:
   ```env
   MAIL_PASSWORD=YOUR_16_CHAR_APP_PASSWORD_HERE
   ```

3. With your actual app password (remove spaces):
   ```env
   MAIL_PASSWORD=abcdefghijklmnop
   ```

4. **Save the file**

### Step 4: Restart Backend

1. Go to the terminal running uvicorn
2. Press `Ctrl+C` to stop it
3. Restart:
   ```powershell
   cd backend2
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

### Step 5: Test It! 🎉

1. Login as recruiter (bayyakutty02@gmail.com or bhavana@rubislawinvest.com)
2. Go to "Browse Candidates" dashboard
3. Click on a candidate
4. Click "Schedule Interview" in the Meeting Scheduler
5. Fill in the details and click "Schedule Meeting"

**Check your Gmail inbox** - you should receive a beautiful confirmation email!

---

## 🔍 Troubleshooting

### "credentials_configured": false

Check `.env` file - make sure:
- No spaces around the `=` sign
- Password is 16 characters (no spaces between groups)
- File is saved

### Emails not sending

1. Check backend logs for errors
2. Verify 2-Step Verification is ON
3. Try regenerating the app password
4. Make sure `.env` changes were saved
5. Backend was restarted after changes

### Test email configuration

```powershell
# Test endpoint to verify setup
curl http://localhost:8001/meetings/test-email-config -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "mail_server": "smtp.gmail.com",
  "mail_port": 587,
  "credentials_configured": true,
  "mail_username": "bhava***"
}
```

---

## 📋 Complete .env Example

Your `backend2\.env` should look like:

```env
APP_JWT_SECRET=talentgraph-secret-key-v2-2024
DATABASE_URL=postgresql://postgres:kutty@localhost:5432/talentgraph_v2

# Email Configuration (for meeting scheduler)
MAIL_USERNAME=bhavanabayya13@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_FROM=noreply@talentgraph.io
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
```

---

## 🎨 What You'll Get

Once configured, meeting invitations will include:

✅ **Beautiful HTML emails** with TalentGraph branding  
✅ **Candidate email** with meeting details + prep tips  
✅ **Recruiter email** with confirmation + next steps  
✅ **Platform-specific styling** (Teams/Zoom colors)  
✅ **Mobile-responsive design**  
✅ **Agenda section** (if provided)  

---

## ⚠️ Security Notes

- **Never commit .env to git** (it's already in .gitignore)
- App passwords are safer than regular passwords
- You can revoke app passwords anytime at https://myaccount.google.com/apppasswords
- Each app password works for one app only

---

## ✅ Ready to Test!

Once you complete these steps, schedule a meeting from the recruiter dashboard and both you and the candidate will receive beautiful confirmation emails! 🚀
