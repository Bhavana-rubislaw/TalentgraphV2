# Notification Email Integration Testing Guide

Test notification preferences with **real email addresses** to verify routes and email delivery.

## Test Email Addresses
- **Candidate**: `bhavanabayya13@gmail.com`
- **Recruiter**: `bhavana@rubislawinvest.com`

---

## Prerequisites

1. **Backend running**: `uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`
2. **Email configured**: Check `.env` has SMTP settings
3. **Database ready**: Users table accessible

---

## Quick Start

### Option 1: Automated Integration Test (Recommended)

```powershell
cd C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2
.\venv\Scripts\Activate.ps1
python tests/test_notification_email_integration.py
```

**What it does:**
- ✅ Creates/logs in test users
- ✅ Retrieves current notification preferences
- ✅ Configures test preferences (some email ON, some OFF)
- ✅ Verifies preferences persist correctly
- ✅ Provides instructions for manual email verification

---

### Option 2: Manual Testing with Helper Script

#### Step 1: List Available Users
```powershell
python scripts/testing/trigger_test_notifications.py --list-users
```

#### Step 2: Trigger Test Notifications

**By Email:**
```powershell
# Test with candidate email
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event application_status

# Test with recruiter email
python scripts/testing/trigger_test_notifications.py --email bhavana@rubislawinvest.com --event application_received
```

**By User ID:**
```powershell
python scripts/testing/trigger_test_notifications.py --user-id 1 --event interview_scheduled
```

---

## Event Types to Test

### Candidate Events
- `application_status` - Application status update
- `match_found` - New job match found
- `shortlisted` - Shortlisted for position
- `invitation` - Invitation to apply
- `interview_scheduled` - Interview scheduled
- `interview_reminder` - Interview reminder
- `message_received` - New message from recruiter
- `job_recommendation` - Job recommendation

### Recruiter Events
- `application_received` - New application received
- `match_found` - Candidate match found
- `interview_scheduled` - Interview scheduled
- `interview_confirmed` - Candidate confirmed interview
- `message_received` - New message from candidate
- `job_update` - Job posting update

---

## Testing Workflow

### 1. Setup Test Preferences

Use API or automated script to configure:

```json
{
  "event_type": "application_status",
  "email_enabled": true,
  "email_frequency": "realtime",
  "in_app_enabled": true,
  "in_app_frequency": "realtime"
}
```

### 2. Test Email Enabled (Should Receive Email)

```powershell
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event application_status
```

**Expected:**
- ✅ Email arrives at `bhavanabayya13@gmail.com`
- ✅ In-app notification created in database

### 3. Test Email Disabled (Should NOT Receive Email)

First, disable email for an event:
```powershell
# Use API to set email_enabled=false for message_received
```

Then trigger:
```powershell
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event message_received
```

**Expected:**
- ✅ In-app notification created
- ❌ NO email sent
- ✅ Script shows "Email blocked by user preference"

### 4. Verify Preferences API Routes

**Get Preferences:**
```powershell
curl -H "Authorization: Bearer YOUR_TOKEN" http://127.0.0.1:8001/notification-preferences
```

**Update Single Preference:**
```powershell
curl -X POST http://127.0.0.1:8001/notification-preferences `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"event_type\":\"application_status\",\"email_enabled\":true,\"email_frequency\":\"realtime\"}'
```

**Bulk Update:**
```powershell
curl -X POST http://127.0.0.1:8001/notification-preferences/bulk `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"preferences\":[{\"event_type\":\"application_status\",\"email_enabled\":false}]}'
```

---

## Verification Checklist

### ✅ Routes Work
- [ ] GET `/notification-preferences` returns preferences
- [ ] POST `/notification-preferences` creates/updates preference
- [ ] POST `/notification-preferences/bulk` bulk updates
- [ ] PATCH `/notification-preferences/{event_type}` partial update
- [ ] Requires authentication (401 without token)

### ✅ Email Delivery Respects Preferences
- [ ] Email sent when `email_enabled=true`
- [ ] Email blocked when `email_enabled=false`
- [ ] Correct email address used
- [ ] Email content includes event details
- [ ] From address: `talentgraph.interviews@gmail.com`

### ✅ Frequency Settings
- [ ] `realtime` - immediate delivery
- [ ] `daily` - batched (if implemented)
- [ ] `weekly` - batched (if implemented)

### ✅ Role Isolation
- [ ] Candidate sees only candidate event types
- [ ] Recruiter sees only recruiter event types
- [ ] Cannot access other users' preferences

---

## Troubleshooting

### Emails Not Arriving

1. **Check SMTP Configuration**
   ```powershell
   cd backend2
   python -c "from app.emailer import validate_email_config; print(validate_email_config())"
   ```

2. **Check Spam/Junk Folder**
   - Gmail often flags test emails as spam

3. **Check Backend Logs**
   ```powershell
   Get-Content talentgraph_v2.log -Tail 50 | Select-String "email"
   ```

4. **Verify Email Worker Running**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*python*"}
   ```

### Preferences Not Saving

1. **Check Database Connection**
   ```powershell
   python -c "from app.database import engine; print(engine.url)"
   ```

2. **Check Authentication Token**
   - Token expired? Re-login
   - Token for correct user?

3. **Check Request Format**
   - Content-Type: application/json
   - Valid JSON body
   - Required fields present

---

## Expected Behavior

### Email Enabled = True
```
Trigger notification → Check preferences → Email enabled → Send email + Create in-app notification
```

### Email Disabled = False
```
Trigger notification → Check preferences → Email disabled → Skip email → Create in-app notification only
```

### No Preference Set
```
Trigger notification → No preference → Use defaults → Send email + Create in-app notification
```

---

## Quick Test Commands Reference

```powershell
# 1. Run automated test
python tests/test_notification_email_integration.py

# 2. List users
python scripts/testing/trigger_test_notifications.py --list-users

# 3. Test candidate email (ON)
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event application_status

# 4. Test recruiter email (ON)
python scripts/testing/trigger_test_notifications.py --email bhavana@rubislawinvest.com --event application_received

# 5. Test multiple events
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event interview_scheduled
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event message_received
python scripts/testing/trigger_test_notifications.py --email bhavanabayya13@gmail.com --event match_found
```

---

## Success Criteria

✅ **Routes Working**
- All notification preference endpoints return expected responses
- Authentication properly enforced
- Preferences persist correctly

✅ **Email Delivery**
- Emails arrive at correct addresses
- Email content is appropriate
- Preferences control email delivery
- No emails sent when disabled

✅ **User Experience**
- Fast response times
- Clear error messages
- Intuitive preference controls

---

## Next Steps After Testing

1. **Document Results** - Note any issues found
2. **Update Frontend** - Ensure UI matches API behavior
3. **Performance Test** - Test with high volume
4. **Edge Cases** - Test invalid inputs, missing data
5. **Security Review** - Verify authorization works correctly
