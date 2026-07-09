# Notification Preferences Testing Guide

## Overview

This directory contains comprehensive test suites for the Notification Preferences feature, which allows both Candidates and Recruiters to customize their notification settings across different channels (in-app and email).

## Test Files

### 1. `test_notification_preferences.py`
**Automated unit/integration tests using pytest**

- ✅ Uses in-memory SQLite database
- ✅ Full test isolation (no side effects)
- ✅ Tests all CRUD operations
- ✅ Tests role-based filtering
- ✅ Tests input validation
- ✅ Tests authentication/authorization

**Total Tests:** 25+ test cases covering:
- Candidate default preferences
- Recruiter default preferences
- Single preference updates
- Bulk preference updates
- Partial updates (PATCH)
- Role isolation
- Persistence verification
- Error handling

### 2. `manual_test_notification_preferences.py`
**Manual integration tests against live backend**

- ✅ Tests against real backend server
- ✅ Uses real database
- ✅ Tests with actual seeded users
- ✅ Complete end-to-end workflows
- ✅ Color-coded terminal output
- ✅ Detailed test reporting

**Total Tests:** 10 comprehensive scenarios

---

## Prerequisites

### Backend Requirements

1. **Backend server running:**
   ```powershell
   cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

2. **Database seeded with test users:**
   - Candidate: `sarah.anderson@email.com` / `Kutty_1304`
   - Recruiter: `admin.jennifer@techcorp.com` / `Kutty_1304`

3. **Python dependencies installed:**
   ```powershell
   pip install pytest requests
   ```

---

## Running Tests

### Option 1: Automated Tests (pytest)

**Run all tests:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"
pytest test_notification_preferences.py -v
```

**Run specific test class:**
```powershell
# Test only candidate functionality
pytest test_notification_preferences.py::TestCandidateNotificationPreferences -v

# Test only recruiter functionality
pytest test_notification_preferences.py::TestRecruiterNotificationPreferences -v

# Test role isolation
pytest test_notification_preferences.py::TestRoleIsolation -v
```

**Run with coverage:**
```powershell
pytest test_notification_preferences.py --cov=app.routers.notification_preferences --cov-report=html
```

**Run in verbose mode with output:**
```powershell
pytest test_notification_preferences.py -v -s
```

### Option 2: Manual Integration Tests

**Run all manual tests:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"
python manual_test_notification_preferences.py
```

**Expected output:**
```
==================================================================
  TEST 1: Candidate Default Preferences
==================================================================

✓ Candidate login successful
✓ All expected candidate event types present
✓ Candidate default preferences validated

Sample Preferences:
  • application_status: In-App=True, Email=True, Priority=normal
  • match_found: In-App=True, Email=True, Priority=normal
  • shortlisted: In-App=True, Email=True, Priority=urgent

[... more tests ...]

==================================================================
  TEST SUMMARY
==================================================================

  PASS  Candidate Default Preferences
  PASS  Recruiter Default Preferences
  PASS  Update Single Candidate Preference
  ...

Results: 10/10 tests passed

╔════════════════════════════════════════════╗
║  ALL TESTS PASSED ✓                        ║
║  Notification Preferences Working!         ║
╚════════════════════════════════════════════╝
```

---

## Test Coverage

### Candidate Tests

| Test | Description | Status |
|------|-------------|--------|
| **Default Creation** | Verifies 8 candidate event types created with defaults | ✅ |
| **Event Types** | Validates all candidate-specific events present | ✅ |
| **Single Update** | Tests updating one preference field | ✅ |
| **Bulk Update** | Tests updating multiple preferences at once | ✅ |
| **Partial Update** | Tests PATCH endpoint for partial updates | ✅ |
| **Persistence** | Verifies changes persist across requests | ✅ |
| **Complete Workflow** | End-to-end user workflow simulation | ✅ |

### Recruiter Tests

| Test | Description | Status |
|------|-------------|--------|
| **Default Creation** | Verifies 6 recruiter event types created with defaults | ✅ |
| **Event Types** | Validates recruiter-specific events (no candidate events) | ✅ |
| **Single Update** | Tests updating one preference | ✅ |
| **Bulk Update** | Tests bulk preference updates | ✅ |
| **Daily Digest** | Tests email frequency customization | ✅ |
| **Priority Levels** | Tests urgent/normal priority settings | ✅ |
| **Complete Workflow** | End-to-end recruiter workflow | ✅ |

### Cross-Role Tests

| Test | Description | Status |
|------|-------------|--------|
| **Role Isolation** | Verifies candidate/recruiter preferences don't interfere | ✅ |
| **Event Filtering** | Validates role-based event type filtering | ✅ |
| **User Isolation** | Ensures users can't see other users' preferences | ✅ |

### Security Tests

| Test | Description | Status |
|------|-------------|--------|
| **Auth Required** | Verifies endpoints require authentication | ✅ |
| **Token Validation** | Tests JWT token validation | ✅ |
| **User Context** | Ensures preferences tied to correct user | ✅ |

---

## API Endpoints Tested

### GET Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /notification-preferences` | Get all user preferences (creates defaults if missing) | ✅ |
| `GET /notification-preferences/defaults` | Get default templates by role | ✅ |

### POST Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `POST /notification-preferences` | Create/update single preference | ✅ |
| `POST /notification-preferences/bulk` | Bulk update multiple preferences | ✅ |

### PATCH Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `PATCH /notification-preferences/{event_type}` | Partial update by event type | ✅ |

---

## Expected Event Types

### Candidate Events (8 types)

1. **application_status** - Application status changes
2. **match_found** - New job matches
3. **shortlisted** - Shortlisted by recruiter
4. **invitation** - Direct invitations from recruiters
5. **interview_scheduled** - Interview scheduled
6. **interview_reminder** - Interview reminders
7. **message_received** - New messages
8. **job_recommendation** - Job recommendations

### Recruiter Events (6 types)

1. **application_received** - New candidate applications
2. **match_found** - New candidate matches
3. **interview_scheduled** - Interview scheduled
4. **interview_confirmed** - Candidate confirms interview
5. **message_received** - New messages
6. **job_update** - Job posting updates

---

## Troubleshooting

### Tests Fail with "Connection Refused"

**Problem:** Backend server not running

**Solution:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Tests Fail with "Login Failed"

**Problem:** Test users not seeded in database

**Solution:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
python seed_data_v2.py
```

### Tests Fail with "Module Not Found"

**Problem:** Dependencies not installed

**Solution:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
pip install pytest requests
```

### Manual Tests Show All Failures

**Problem:** Database may not have NotificationPreferences table

**Solution:**
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
python -c "from app.database import engine; from app.models import *; from sqlmodel import SQLModel; SQLModel.metadata.create_all(engine); print('Tables created')"
```

---

## Expected Behavior

### First-Time User Experience

1. User logs in (candidate or recruiter)
2. User navigates to notification preferences
3. Frontend calls `GET /notification-preferences`
4. Backend auto-creates default preferences based on role
5. User sees all relevant event types with defaults enabled

### Updating Preferences

1. User toggles notification channels (in-app/email)
2. User changes frequency (realtime/daily/weekly)
3. Frontend calls `POST /notification-preferences/bulk`
4. Backend updates database
5. Changes persist across sessions

### Role-Based Filtering

1. Candidates only see candidate event types
2. Recruiters only see recruiter event types
3. Shared events (like `message_received`) appear for both
4. Each user's preferences are completely isolated

---

## Test Data

### Sample Preference Object

```json
{
  "id": 123,
  "user_id": 1,
  "event_type": "application_status",
  "in_app_enabled": true,
  "email_enabled": false,
  "in_app_frequency": "realtime",
  "email_frequency": "daily",
  "priority": "normal",
  "created_at": "2026-04-28T10:00:00",
  "updated_at": "2026-04-28T10:30:00"
}
```

### Valid Frequency Values
- `realtime` - Immediate notification
- `daily` - Daily digest (once per day)
- `weekly` - Weekly digest (once per week)

### Valid Priority Values
- `urgent` - High priority (e.g., interviews, shortlisted)
- `normal` - Standard priority (e.g., application updates)
- `low` - Low priority (e.g., job recommendations)

---

## Success Criteria

All tests should pass and verify:

✅ **Candidate Portal:**
- Default preferences created automatically
- All 8 candidate event types present
- Can update individual preferences
- Can bulk update multiple preferences
- Changes persist across sessions
- No recruiter-only events visible

✅ **Recruiter Portal:**
- Default preferences created automatically
- All 6 recruiter event types present
- Can customize notification settings
- Can set daily digest for applications
- Can prioritize urgent events
- No candidate-only events visible

✅ **Security:**
- All endpoints require authentication
- Users can only access their own preferences
- Token validation works correctly

✅ **Role Isolation:**
- Candidate and recruiter preferences don't interfere
- Role-based event filtering works
- User preferences are isolated

---

## Next Steps

After all tests pass:

1. **Frontend Integration:** Test UI components in browser
2. **Manual Testing:** Verify UI displays preferences correctly
3. **End-to-End Testing:** Test complete user workflows
4. **Performance Testing:** Verify bulk updates are efficient
5. **Browser Testing:** Test on different browsers

---

## Additional Resources

- **Backend Router:** `backend2/app/routers/notification_preferences.py`
- **Models:** `backend2/app/models.py` (NotificationPreferences class)
- **Schemas:** `backend2/app/schemas.py` (NotificationPreference* schemas)
- **Frontend Component:** `frontend2/src/components/NotificationPreferences.tsx`
- **Documentation:** 
  - `docs/notifications/RECRUITER_NOTIFICATIONS_INTEGRATION.md`
  - `docs/UI_NOTIFICATIONS_ENHANCEMENT_COMPLETE.md`

---

## Contact

For issues or questions about these tests, refer to the implementation documentation or check the test output for specific error messages.

**Last Updated:** April 28, 2026
