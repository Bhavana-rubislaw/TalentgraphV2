# Meetings Tab Test Suite

Comprehensive test scripts for the Recruiter Portal Meetings Tab functionality.

## 📋 Test Files

### 1. **test_meetings_integration.py**
Integration tests for end-to-end workflows and data consistency.

**Tests:**
- ✅ Application → Meeting flow
- ✅ Meeting ↔ Participant consistency
- ✅ Application ↔ Meeting status synchronization
- ✅ Meeting time validity
- ✅ Video meeting link validation

**Run:**
```bash
python backend2/tests/test_meetings_integration.py
```

---

### 2. **test_meetings_endpoints.py**
API endpoint tests for all meeting-related routes.

**Tests:**
- ✅ `GET /meetings/list` - List all meetings
- ✅ `GET /meetings/list?upcoming_only=true` - Filter upcoming
- ✅ `GET /meetings/list?status=scheduled` - Filter by status
- ✅ `GET /meetings/{id}` - Get meeting details
- ✅ `POST /meetings/create` - Create new meeting
- ✅ `POST /meetings/{id}/cancel` - Cancel meeting
- ✅ `GET /meetings/{id}/timeline` - Get meeting history
- ✅ `GET /meetings/check-availability` - Check user availability

**Run:**
```bash
python backend2/tests/test_meetings_endpoints.py
```

**Note:** Requires authentication. Update credentials in `get_auth_headers()` method if needed.

---

### 3. **test_meetings_recruiter_ui.py**
UI functional tests simulating recruiter interactions.

**Tests:**
- ✅ View all meetings (default view)
- ✅ Filter: Upcoming only
- ✅ Filter: By status (Scheduled, Cancelled, Completed)
- ✅ View meeting details
- ✅ Available actions per meeting
- ✅ Empty state handling

**Run:**
```bash
python backend2/tests/test_meetings_recruiter_ui.py
```

---

### 4. **run_meetings_tests.py**
Master test runner - executes all test suites sequentially.

**Run:**
```bash
python backend2/tests/run_meetings_tests.py
```

---

## 🚀 Quick Start

### Run All Tests
```bash
cd backend2/tests
python run_meetings_tests.py
```

### Run Individual Test Suite
```bash
# Integration tests
python test_meetings_integration.py

# API endpoint tests
python test_meetings_endpoints.py

# UI functional tests
python test_meetings_recruiter_ui.py
```

---

## 📊 Test Coverage

### ✅ Functionality Tested

**Backend:**
- Meeting CRUD operations
- Participant management
- Meeting queries (organizer/participant)
- Status filtering
- Time-based filtering
- Application synchronization
- Timeline event tracking

**Database:**
- Foreign key relationships
- Participant consistency
- Time validity
- URL validation
- Status synchronization

**UI/Frontend (Simulated):**
- Meeting list display
- Filtering: upcoming/all/status
- Meeting details view
- Action buttons availability
- Empty states

---

## 🔧 Configuration

### Default Test User
The tests use **bhavana@rubislawinvest.com** as the default recruiter.

To change:
```python
# In test_meetings_recruiter_ui.py
tester = TestRecruiterMeetingsUI(recruiter_email="your@email.com")

# In test_meetings_endpoints.py
headers = self.get_auth_headers("your@email.com")
```

---

## 📝 Expected Output

### Integration Tests
```
🔗🔗🔗... (35 times)
MEETINGS TAB - INTEGRATION TESTS
🔗🔗🔗... (35 times)

INTEGRATION TEST: Application → Meeting Flow
======================================================================
✅ Found recruiter: bhavana@rubislawinvest.com
✅ Found candidate: bhavanabayya13@gmail.com
✅ Meeting already exists for application
   Meeting ID: 2
   Status: scheduled
   ...

======================================================================
✅ ALL INTEGRATION TESTS COMPLETED!
```

### UI Tests
```
🖥️ ... (35 times)
MEETINGS TAB - RECRUITER UI FUNCTIONAL TESTS
🖥️ ... (35 times)

UI TEST: View All Meetings (Default)
======================================================================
📋 Total Meetings: 1

Meetings List:
----------------------------------------------------------------------
1. 📅 [SCHEDULED] [PAST]
   Interview: Bhavana Bayya - Software Engineer - Full Stack
   Start: 2026-04-07 22:35 UTC
   Participants: 2
   ...
```

---

## 🐛 Troubleshooting

### "User not found" Error
Update the test user email to match your database:
```python
recruiter_email="your-recruiter@email.com"
```

### "No meetings found"
Check if meetings exist:
```bash
python backend2/check_meetings.py
```

### Authentication Errors (API Tests)
Verify credentials in `test_meetings_endpoints.py`:
```python
def get_auth_headers(email="your@email.com"):
    response = client.post("/auth/login", json={
        "username": email,
        "password": "your-password"  # Update this
    })
```

---

## ✅ Success Criteria

All tests pass when:
- ✅ Meetings are retrieved correctly
- ✅ Filters work (upcoming, status)
- ✅ Participants are consistent
- ✅ Application status syncs with meetings
- ✅ Time ranges are valid
- ✅ Video links are properly formatted
- ✅ API endpoints return expected data
- ✅ UI simulations show correct behavior

---

## 📚 Related Files

- **Backend API**: `backend2/app/routers/meetings.py`
- **Models**: `backend2/app/models.py`
- **Frontend UI**: `frontend2/src/pages/MeetingsPage.tsx`
- **API Client**: `frontend2/src/api/client.ts`
- **Investigation Report**: `MEETINGS_TAB_INVESTIGATION_REPORT.md`

---

## 🎯 Next Steps

After running tests:

1. **Review Results**: Check which tests passed/failed
2. **Fix Issues**: Address any errors found
3. **Add More Tests**: Cover edge cases as needed
4. **Automate**: Integrate into CI/CD pipeline
5. **Document**: Update this README with new tests

---

## 📞 Support

For issues or questions about these tests:
- Check the investigation report: `MEETINGS_TAB_INVESTIGATION_REPORT.md`
- Review the database state: `python backend2/check_meetings.py`
- Validate queries: `python backend2/test_meetings_query.py`
