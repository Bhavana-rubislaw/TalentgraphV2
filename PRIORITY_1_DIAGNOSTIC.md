# Priority 1 Issues - Diagnostic Report

**Created**: April 1, 2026  
**Status**: Investigation Complete  
**Next**: Implement fixes

---

## 🔍 Issue Analysis

### 1. Schedule Interview CORS ✅ **CONFIGURED**

**Current State**: CORS middleware is properly configured in `main.py`

**Configuration Found**:
```python
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=3600,
)
```

**Endpoint**: `/applications/{application_id}/schedule-interview` (POST)

**Potential Issues**:
- ❓ Frontend might be running on a different port not in the origins list
- ❓ Browser might need preflight OPTIONS request handling
- ❓ Check if frontend is using correct API base URL

**Fix Actions**:
1. Verify frontend port matches CORS origins list
2. Add production URLs if deploying
3. Test OPTIONS preflight request
4. Check browser console for specific CORS error

---

### 2. SMTP Config / Gmail App Password ✅ **CONFIGURED**

**Current State**: Gmail SMTP is fully configured in `.env`

**Configuration Found**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=talentgraph.interviews@gmail.com
SMTP_PASSWORD=uoghblblqynijiym
SMTP_FROM_EMAIL=talentgraph.interviews@gmail.com
SMTP_FROM_NAME=TalentGraph Interviews
SMTP_USE_TLS=true
```

**Email Function**: `send_interview_schedule_email()` in `app/emailer.py`

**Status**: ✅ Credentials are set up correctly

**Potential Issues**:
- ❓ App password might be expired or revoked
- ❓ Gmail account might need "Less secure app access" enabled (though app passwords should bypass this)
- ❓ SMTP connection might be blocked by firewall
- ❓ Email sending might be failing silently

**Fix Actions**:
1. Test SMTP connection independently
2. Verify app password is still valid in Google account
3. Add error logging to email sending function
4. Create test script to send email directly
5. Check if emails are going to spam folder

---

### 3. Message Bubble Ownership 🔍 **NEEDS TESTING**

**Current State**: Message ownership logic is implemented in `MessagesPage.tsx`

**Logic Found**:
```typescript
const isOwnMessage = (message: Message, currentUserId: string | null): boolean => {
  if (!currentUserId) return false;
  const currentUserIdNum = Number(currentUserId);
  const senderUserId = Number(message.sender_user_id);
  const result = senderUserId === currentUserIdNum;
  
  console.log('Message ownership check:', {
    senderUserId,
    currentUserIdNum,
    isMine: result,
  });
  
  return result;
};
```

**Rendering**:
```typescript
{groupedMessages.map(({ msg, isMine, isFirstInGroup, isLastInGroup }) => (
  <div className={`msg-row ${isMine ? 'msg-row--mine' : 'msg-row--theirs'}`}>
    {!isMine && (
      <div className="msg-avatar">{/* avatar */}</div>
    )}
    <div className={`msg-bubble ${isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs'}`}>
      {msg.message_text}
    </div>
  </div>
))}
```

**Potential Issues**:
- ❓ `sender_user_id` might not be set correctly in backend
- ❓ Type coercion issues (string vs number)
- ❓ Current user ID might not be available in context
- ❓ Message API might not be returning `sender_user_id`

**Fix Actions**:
1. Verify backend returns `sender_user_id` in message API response
2. Check browser console for debug logs showing ownership calculation
3. Verify user context is correctly set
4. Test with different users sending messages
5. Check CSS classes are applied correctly

---

### 4. Status Save / Recruiter Notes Persistence ✅ **ENDPOINTS EXIST**

**Current State**: Two update endpoints are available

**Endpoints**:
1. `/applications/{application_id}/status` (PUT) - Status only
2. `/applications/{application_id}/review` (PUT) - Status and/or notes

**Review Endpoint Logic** (Recommended):
```python
@router.put("/{application_id}/review", response_model=dict)
def update_application_review(
    application_id: int,
    data: ApplicationReviewUpdateRequest,
    # ...
):
    # Updates status (optional)
    if data.status is not None:
        is_valid, error_msg = validate_status_transition(application.status, data.status)
        # ...
        application.status = data.status
        application.last_status_updated_at = datetime.utcnow()
    
    # Updates notes (optional)
    if data.recruiter_notes is not None:
        trimmed_notes = data.recruiter_notes.strip() if data.recruiter_notes else None
        application.recruiter_notes = trimmed_notes
        application.notes_updated_at = datetime.utcnow()
    
    session.add(application)
    session.commit()
```

**Potential Issues**:
- ❓ Frontend might be calling wrong endpoint
- ❓ Payload structure might not match schema
- ❓ Frontend might not be refreshing after save
- ❓ Session commit might be failing silently
- ❓ Validation errors might be blocking saves

**Fix Actions**:
1. Verify frontend is using `/review` endpoint for combined updates
2. Check frontend payload structure matches `ApplicationReviewUpdateRequest`
3. Add success/error toast notifications in UI
4. Test status transitions are valid
5. Check database to confirm saves are persisting
6. Add more detailed error logging in backend

---

## 🎯 Recommended Fix Order

### Phase 1: Testing & Verification (Do First)
1. **Test SMTP Email Sending** - Create standalone test script
2. **Verify CORS Configuration** - Check frontend port and test API calls
3. **Test Message Ownership** - Check browser console logs
4. **Test Status/Notes Save** - Use browser DevTools to inspect API calls

### Phase 2: Diagnostic Scripts (If needed)
1. Create `test_smtp_email.py` to test Gmail sending
2. Create `test_schedule_interview.py` to test full flow
3. Add detailed logging to all Priority 1 endpoints
4. Create frontend test page for message ownership

### Phase 3: Fixes (Based on findings)
1. Fix any configuration issues found
2. Update frontend API calls if needed
3. Add error handling and user feedback
4. Add validation and retry logic

---

## 🧪 Test Scripts to Create

### 1. Test SMTP Email (`backend2/test_smtp_email.py`)
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

def test_smtp():
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    try:
        # Test connection
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        # Send test email
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = "test@example.com"  # Replace with your email
        msg['Subject'] = "TalentGraph SMTP Test"
        msg.attach(MIMEText("This is a test email from TalentGraph.", 'plain'))
        
        server.send_message(msg)
        server.quit()
        
        print("✅ SMTP test successful! Email sent.")
        return True
    except Exception as e:
        print(f"❌ SMTP test failed: {e}")
        return False

if __name__ == "__main__":
    test_smtp()
```

### 2. Test Schedule Interview Flow
Create comprehensive test that checks:
- CORS headers in response
- Email sending success
- Status update to "scheduled"
- Notes persistence
- Notification creation

---

## 📊 Current Feature Completeness

| Feature | Backend | Frontend | Integration | Status |
|---------|---------|----------|-------------|--------|
| Schedule Interview Endpoint | ✅ | ✅ | 🔧 | Needs testing |
| SMTP Email Sending | ✅ | N/A | 🔧 | Needs testing |
| Message Ownership Display | ✅ | ✅ | 🔧 | Needs verification |
| Status Update | ✅ | ✅ | 🔧 | Needs verification |
| Recruiter Notes Save | ✅ | ❓ | ❓ | Unknown if used |

Legend:
- ✅ Complete
- 🔧 Needs Testing/Debugging
- ❓ Unknown/Unclear
- ❌ Not Working

---

## 🚀 Next Steps

1. **Create test scripts** (30 min)
   - SMTP email test
   - Schedule interview test
   
2. **Run diagnostics** (30 min)
   - Test each issue independently
   - Document actual errors found
   
3. **Implement fixes** (2-4 hours)
   - Based on diagnostic results
   - One issue at a time
   
4. **Verify end-to-end** (1 hour)
   - Test complete recruiter workflow
   - Verify all notifications work
   
5. **Document solutions** (30 min)
   - Update this diagnostic
   - Create runbook for future issues

**Total Estimated Time**: 4-6 hours

---

*Last Updated: April 1, 2026*
