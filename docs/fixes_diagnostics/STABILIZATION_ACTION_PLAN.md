# TalentgraphV2 - Stabilization Action Plan

**Created**: April 1, 2026  
**Status**: Ready to Execute  
**Estimated Time**: 4-6 hours

---

## 📖 Overview

This action plan provides a step-by-step approach to stabilize TalentgraphV2 before adding new features. The plan is organized into phases with clear deliverables and success criteria.

---

## 📁 Key Documents

1. **[PROJECT_ROADMAP.md](PROJECT_ROADMAP.md)** - Overall project strategy and feature planning
2. **[PRIORITY_1_DIAGNOSTIC.md](PRIORITY_1_DIAGNOSTIC.md)** - Detailed analysis of Priority 1 issues
3. **This Document** - Executable action plan with specific steps

---

## 🎯 Goals

### Primary Goal
**Achieve a stable, working end-to-end recruiter workflow:**
- Recruiter creates job ✅ (Already working)
- Recruiter browses candidates ✅ (Already working)
- Recruiter likes / asks to apply ✅ (Already working)
- Candidate applies ✅ (Already working)
- **Recruiter updates application status** 🔧 (Needs verification)
- **Recruiter schedules interview** 🔧 (Needs verification)
- **Recruiter saves notes** 🔧 (Needs verification)
- Candidate gets notification/email ✅ (Already working)

### Secondary Goals
- Fix all Priority 1 blocking issues
- Establish clear testing methodology
- Document solutions for future reference

---

## 📋 Phase 1: Diagnostics (1-2 hours)

### Step 1.1: Test SMTP Email Configuration

**Location**: `backend2/test_smtp_email.py`

**Commands**:
```powershell
cd backend2
python test_smtp_email.py
```

**What This Tests**:
- SMTP connection to Gmail
- TLS encryption
- Authentication with app password
- Email sending capability

**Success Criteria**:
- ✅ Connects to smtp.gmail.com:587
- ✅ TLS starts successfully
- ✅ Authentication succeeds
- ✅ Test email sends (if you provide recipient)

**If It Fails**:
- Check app password is valid at https://myaccount.google.com/apppasswords
- Verify Gmail account allows app passwords (2FA must be enabled)
- Check SMTP_PASSWORD in .env matches exactly (16 characters, no spaces)
- Try generating a new app password

---

### Step 1.2: Test Schedule Interview Flow

**Method**: Browser DevTools Testing

**Steps**:
1. Start backend: `cd backend2 && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend2 && npm run dev`
3. Log in as recruiter
4. Navigate to candidate applications
5. Open Browser DevTools > Network tab
6. Click "Schedule Interview" on an application
7. Fill in the form and submit

**What to Check**:

**Network Request**:
- URL: `POST /applications/{id}/schedule-interview`
- Status Code: Should be `200 OK`
- CORS Headers: Check for `Access-Control-Allow-Origin`
- Payload structure:
  ```json
  {
    "date": "April 2, 2026",
    "time": "2:00 PM",
    "timezone": "America/Los_Angeles",
    "meeting_link": "https://zoom.us/j/...",
    "recruiter_notes": "..."
  }
  ```

**Console Logs**:
- Check for CORS errors
- Check for network errors
- Look for "[INTERVIEW]" debug logs

**Backend Logs**:
- Check terminal for "[INTERVIEW]" logs
- Verify email sending status
- Check for any exceptions

**Success Criteria**:
- ✅ Request completes with 200 status
- ✅ No CORS errors in console
- ✅ Backend logs show email sent successfully
- ✅ Application status updates to "scheduled"
- ✅ UI shows success message

**Common Issues & Fixes**:

| Issue | Fix |
|-------|-----|
| CORS error | Check frontend port is in `main.py` origins list |
| 401 Unauthorized | Check JWT token is being sent in Authorization header |
| Email not sending | Run SMTP test (Step 1.1) |
| Status not updating | Check database after request |
| UI shows error | Check browser console for details |

---

### Step 1.3: Test Message Ownership Display

**Method**: Browser Console Debugging

**Steps**:
1. Open Messages page in frontend
2. Open Browser Console (F12)
3. Send a message to another user
4. Check console logs for "Message ownership check:"

**What to Check**:
```javascript
Message ownership check: {
  senderUserId: 123,      // Should match your user ID for your messages
  currentUserIdNum: 123,  // Your user ID
  isMine: true            // Should be true for your messages
}
```

**Inspect CSS Classes**:
- Your messages should have: `msg-row--mine`, `msg-bubble--mine`
- Other messages should have: `msg-row--theirs`, `msg-bubble--theirs`

**Success Criteria**:
- ✅ Console logs show correct ownership calculation
- ✅ Your messages appear on the right (CSS class `msg-row--mine`)
- ✅ Other messages appear on the left (CSS class `msg-row--theirs`)
- ✅ Avatar only shows for other user's messages

**If It Fails**:
- Check `sender_user_id` is present in API response
- Verify current user ID is correctly set in React context
- Check CSS classes are being applied
- Inspect element to see actual classes vs expected

---

### Step 1.4: Test Status & Notes Persistence

**Method**: Browser DevTools + Database Check

**Steps**:
1. Navigate to recruiter applications view
2. Open Browser DevTools > Network tab
3. Select an application
4. Update status (e.g., from "under_review" to "shortlisted")
5. Add recruiter notes
6. Click "Save"
7. Check Network tab for API request
8. Refresh the page
9. Verify changes persisted

**API Endpoint to Check**:
- Should call: `PUT /applications/{id}/review`
- Payload should include:
  ```json
  {
    "status": "shortlisted",
    "recruiter_notes": "Strong candidate, good cultural fit"
  }
  ```

**Success Criteria**:
- ✅ API request completes with 200 status
- ✅ Response shows updated values
- ✅ UI updates immediately
- ✅ Changes persist after page refresh
- ✅ Timestamp updates (`notes_updated_at`)

**Database Verification** (Optional):
```sql
SELECT id, status, recruiter_notes, notes_updated_at, last_status_updated_at
FROM applications
WHERE id = {application_id};
```

---

## 📋 Phase 2: Fix Issues (2-3 hours)

Based on Phase 1 diagnostics, implement fixes as needed.

### Priority Order:
1. **SMTP Email** - If test fails, fix app password/configuration
2. **CORS** - If schedule interview has CORS errors, update origins
3. **Message Ownership** - If display is incorrect, fix logic
4. **Status/Notes Save** - If not persisting, debug endpoint

### Common Fixes:

#### Fix 1: Update CORS Origins
**File**: `backend2/app/main.py`

If frontend runs on a different port (e.g., 5174), add it:
```python
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    # ... existing origins ...
    "http://localhost:5174",  # Add your frontend port
    "http://127.0.0.1:5174",
]
```

#### Fix 2: Regenerate Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Delete old app password
3. Generate new one for "Mail" / "Other (TalentGraph)"
4. Copy the 16-character password
5. Update `.env`:
   ```env
   SMTP_PASSWORD=abcd efgh ijkl mnop  # Will be parsed correctly
   ```

#### Fix 3: Add More Logging
**File**: `backend2/app/routers/applications.py`

Add detailed logging in schedule interview endpoint:
```python
logger.info(f"[INTERVIEW] Email sent: {email_sent}, Error: {email_error}")
logger.info(f"[INTERVIEW] Status before: {old_status}, after: {application.status}")
```

#### Fix 4: Frontend Error Handling
**File**: `frontend2/src/components/interviews/ScheduleInterviewModal.tsx`

Improve error display:
```typescript
catch (error) {
  console.error('[INTERVIEW] Failed:', error);
  const errorMessage = error.response?.data?.detail || 
                       error.message || 
                       'Failed to schedule interview';
  alert(`Error: ${errorMessage}`);
  setError(errorMessage);
}
```

---

## 📋 Phase 3: Verification (1 hour)

### Run Complete End-to-End Test

**Scenario**: Recruiter schedules interview for candidate application

**Steps**:
1. ✅ Log in as recruiter
2. ✅ Navigate to "Applications" tab
3. ✅ Find an application in "Under Review" status
4. ✅ Click "Schedule Interview"
5. ✅ Fill in all fields:
   - Date: Tomorrow
   - Time: 2:00 PM
   - Timezone: Your timezone
   - Meeting Link: `https://zoom.us/j/test-123456`
   - Notes: "Initial screening interview"
6. ✅ Click "Schedule"
7. ✅ Verify success message appears
8. ✅ Verify modal closes
9. ✅ Verify application status shows "Scheduled"
10. ✅ Verify notes are visible
11. ✅ Check email was received (check spam folder too)
12. ✅ Log in as candidate
13. ✅ Verify notification appears
14. ✅ Refresh page - verify everything persists

**Success Criteria**: All 14 steps pass ✅

---

## 📋 Phase 4: Documentation (30 minutes)

### Update Status Documents

1. **Mark completed items** in PROJECT_ROADMAP.md
2. **Document solutions** in PRIORITY_1_DIAGNOSTIC.md
3. **Create runbook** for common issues

### Runbook Template:

Create: `RUNBOOK_COMMON_ISSUES.md`

```markdown
# Common Issues Runbook

## Issue: Schedule Interview CORS Error

**Symptoms**: Browser console shows CORS error, network request fails

**Diagnosis**: 
- Check frontend port in browser URL bar
- Check backend CORS origins list

**Fix**:
1. Open `backend2/app/main.py`
2. Add frontend port to `origins` list
3. Restart backend server

**Prevention**: Always update CORS when changing frontend port

---

## Issue: Interview Email Not Sending

**Symptoms**: Success message shown but email not received

**Diagnosis**:
- Run `python backend2/test_smtp_email.py`
- Check backend logs for email errors

**Fix**:
1. Check app password at https://myaccount.google.com/apppasswords
2. Generate new app password if needed
3. Update SMTP_PASSWORD in .env
4. Restart backend

**Prevention**: App passwords don't expire, but can be revoked
```

---

## 🎯 Next Steps After Stabilization

Once Phase 1-4 are complete:

### Week 1-2: Finish Priority Features
1. ✅ Interview scheduling (Done)
2. 🔧 UI polish for dashboards
3. 🔧 Job lifecycle workflow (freeze, repost, cancel)

### Week 3-4: Polish & Testing
1. Professional UI consistency
2. Error handling improvements
3. User feedback integration

### Week 5+: New Features
1. In-app meetings tab
2. Messaging with attachments  
3. Analytics dashboard
4. Payment integration

**Rule**: Add only ONE major feature at a time following the 8-step checklist.

---

## 📊 Progress Tracking

| Phase | Status | Time Spent | Issues Found | Fixed |
|-------|--------|------------|--------------|-------|
| 1. Diagnostics | ⏳ Pending | - | - | - |
| 2. Fixes | ⏳ Pending | - | - | - |
| 3. Verification | ⏳ Pending | - | - | - |
| 4. Documentation | ⏳ Pending | - | - | - |

**Update this table as you progress through each phase.**

---

## 🚀 Quick Start

To begin stabilization right now:

```powershell
# 1. Test SMTP
cd backend2
python test_smtp_email.py

# 2. Start servers
# Terminal 1:
cd backend2
uvicorn app.main:app --reload

# Terminal 2:
cd frontend2
npm run dev

# 3. Test in browser
# - Open http://localhost:5173 (or your frontend port)
# - Log in as recruiter
# - Test schedule interview flow
# - Check browser console for errors
# - Check backend terminal for logs

# 4. Document findings
# - Note any errors encountered
# - Update PRIORITY_1_DIAGNOSTIC.md with results
```

---

## 💡 Tips for Success

1. **Test one thing at a time** - Don't try to fix everything simultaneously
2. **Check logs** - Backend logs and browser console are your friends
3. **Use real data** - Create actual test recruiter/candidate accounts
4. **Reload often** - Clear browser cache if changes don't appear
5. **Document as you go** - Write down what worked and what didn't
6. **Ask for help** - If stuck for > 30 minutes, take a break or ask

---

## 🆘 If You Get Stuck

**Common Blockers**:

### "Backend won't start"
- Check virtual environment is activated
- Run `pip install -r requirements.txt`
- Check database is running (PostgreSQL)
- Check `.env` file exists and has DATABASE_URL

### "Frontend won't start"
- Run `npm install` first
- Check Node version >= 16
- Check port 5173 isn't already in use
- Clear node_modules and reinstall if needed

### "Can't log in"
- Check user exists in database
- Check password is hashed correctly
- Check JWT_SECRET_KEY in .env
- Use browser DevTools > Application > Local Storage to check token

### "Database error"
- Check PostgreSQL is running
- Check DATABASE_URL in .env
- Run migrations: `alembic upgrade head`
- Check table exists: `\dt` in psql

---

**Remember**: The goal is not perfection, it's stability. Get the core workflow working, then iterate. 

**Good luck! 🚀**

---

*Last Updated: April 1, 2026*
