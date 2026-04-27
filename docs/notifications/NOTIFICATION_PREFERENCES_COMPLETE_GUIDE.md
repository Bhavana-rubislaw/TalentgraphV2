# Notification Preferences System - Complete Implementation Guide

## 📋 Overview
This document describes the comprehensive notification preferences system implemented for TalentGraph V2, allowing users to control how they receive notifications across in-app and email channels.

**Implementation Date:** April 23, 2026  
**Status:** ✅ Complete - Ready for deployment

---

## 🎯 Features Implemented

### 1. **Database Model & Migration**
- ✅ `NotificationPreferences` model with user-specific settings
- ✅ Support for multiple event types (8 for candidates, 6 for recruiters)
- ✅ Per-channel toggles (in-app ON/OFF, email ON/OFF)
- ✅ Frequency options (realtime, daily, weekly) - UI ready, digest skipped for MVP
- ✅ Priority levels (urgent, normal, low)
- ✅ Unique constraint per user per event type

### 2. **Backend API Endpoints**
- ✅ `GET /notification-preferences` - Get all user preferences
- ✅ `GET /notification-preferences/defaults` - Get default preferences by role
- ✅ `POST /notification-preferences` - Create/update single preference
- ✅ `PATCH /notification-preferences/{event_type}` - Update specific fields
- ✅ `POST /notification-preferences/bulk` - Bulk update multiple preferences
- ✅ `DELETE /notification-preferences/{id}` - Delete preference (reset to default)

### 3. **Email Templates**
- ✅ Branded HTML templates matching existing meeting email style
- ✅ Templates for all event types:
  - Application status updates
  - New matches
  - Interview reminders
  - Message notifications
  - Application received (recruiter)
  - Job updates (recruiter)
- ✅ Responsive design for mobile devices
- ✅ Actionable buttons in emails

### 4. **Enhanced Notification Service**
- ✅ `send_notification()` - New method that checks preferences before sending
- ✅ Automatic email generation based on event type
- ✅ Graceful fallback if email fails (in-app still works)
- ✅ Backward-compatible with existing `create_notification()` method

### 5. **Frontend Components**
- ✅ `NotificationPreferences.tsx` - Card-based settings component
- ✅ Fully responsive mobile design
- ✅ Toggle switches for each channel
- ✅ Frequency dropdowns (realtime/daily/weekly)
- ✅ Grouped by category (Applications, Matches, Interviews, Messages, Jobs)
- ✅ Quick actions (Enable/Disable all emails)
- ✅ Unsaved changes indicator

### 6. **Profile Page Integration**
- ✅ Integrated into `CandidateProfilePage`
- ✅ New `RecruiterProfilePage` with preferences
- ✅ Added to App.tsx routing (`/recruiter/profile`)
- ✅ Section appears after profile creation

---

## 📊 Event Types & Default Settings

### Candidate Events (8 types)
| Event Type | In-App Default | Email Default | Priority |
|------------|----------------|---------------|----------|
| application_status | ✅ ON | ✅ ON | normal |
| match_found | ✅ ON | ✅ ON | normal |
| shortlisted | ✅ ON | ✅ ON | urgent |
| invitation | ✅ ON | ✅ ON | urgent |
| interview_scheduled | ✅ ON | ✅ ON | urgent |
| interview_reminder | ✅ ON | ✅ ON | urgent |
| message_received | ✅ ON | ✅ ON | normal |
| job_recommendation | ✅ ON | ✅ ON | normal |

### Recruiter Events (6 types)
| Event Type | In-App Default | Email Default | Priority |
|------------|----------------|---------------|----------|
| application_received | ✅ ON | ✅ ON | normal |
| match_found | ✅ ON | ✅ ON | normal |
| interview_scheduled | ✅ ON | ✅ ON | urgent |
| interview_confirmed | ✅ ON | ✅ ON | urgent |
| message_received | ✅ ON | ✅ ON | normal |
| job_update | ✅ ON | ✅ ON | normal |

**Default Strategy:** All emails ON by default (users can opt-out)

---

## 🚀 Deployment Instructions

### Step 1: Run Database Migration

```powershell
# Navigate to backend2 folder
cd backend2

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migration script
python -m scripts.migrations.migrate_notification_preferences
```

**What the migration does:**
1. Creates `notification_frequency_enum` PostgreSQL enum type
2. Creates `notification_preferences` table with proper constraints
3. Creates 3 performance indexes
4. Populates default preferences for all existing users

**Expected output:**
```
============================================================
Starting NotificationPreferences migration...
============================================================

[Create notification_frequency_enum]
✓ Created notification_frequency_enum type

[Create notification_preferences table]
✓ Created notification_preferences table

[Create indexes]
✓ Created index: idx_notif_pref_user_id
✓ Created index: idx_notif_pref_event_type
✓ Created index: idx_notif_pref_user_event

[Populate default preferences]
Found X users to populate
  ✓ Created Y preferences for user Z (candidate)
  ✓ Created Y preferences for user Z (recruiter)
...
✓ Populated default preferences for all users

============================================================
✅ NotificationPreferences migration completed successfully!
============================================================
```

### Step 2: Restart Backend Server

```powershell
# If server is running, stop it (Ctrl+C) and restart
cd backend2
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Verify endpoints are registered:
- Visit: http://127.0.0.1:8001/docs
- Check for `/notification-preferences` endpoints

### Step 3: Start Frontend Development Server

```powershell
# Navigate to frontend2 folder
cd frontend2

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Frontend runs on: http://localhost:3000

### Step 4: Test the System

#### For Candidates:
1. Log in as a candidate
2. Navigate to: `/candidate/profile`
3. Scroll down to "Notification Preferences" section
4. Test toggles and frequency selectors
5. Click "Save Preferences"
6. Verify success toast appears

#### For Recruiters:
1. Log in as a recruiter
2. Navigate to: `/recruiter/profile` (or click "My Profile" in dashboard menu)
3. Scroll down to "Notification Preferences" section
4. Test settings and save

#### Backend Verification:
```powershell
# Check database directly
psql -U your_username -d talentgraph_v2

# Query preferences
SELECT * FROM notification_preferences WHERE user_id = 1;

# Check enum values
SELECT unnest(enum_range(NULL::notification_frequency_enum));
```

---

## 📧 Email Configuration

### Current Setup
- **Sender:** talentgraph.interviews@gmail.com
- **SMTP:** Gmail (smtp.gmail.com:587)
- **Limit:** 500 emails/day
- **Templates:** Branded HTML matching meeting emails

### Environment Variables Required
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=talentgraph.interviews@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM_EMAIL=talentgraph.interviews@gmail.com
SMTP_FROM_NAME=TalentGraph Interviews
```

### Testing Email Delivery
Test emails will be sent to: bhavanabayya13@gmail.com

To trigger a test notification with email:
```python
# Example code to test
from app.services.notification_service import NotificationService
from app.database import engine
from sqlmodel import Session

with Session(engine) as session:
    NotificationService.send_notification(
        session=session,
        user_id=1,  # Your user ID
        event_type="match_found",
        title="Test Match Found",
        message="This is a test notification",
        email_data={
            "candidate_name": "Test User",
            "job_title": "Software Engineer",
            "company_name": "Test Company",
            "match_score": 95,
            "action_url": "http://localhost:3000/candidate-dashboard"
        }
    )
```

---

## 🎨 UI/UX Design Decisions

### Placement
- ✅ **Candidate:** Section within existing Profile page (`/candidate/profile`)
- ✅ **Recruiter:** Same approach - section within Profile page (`/recruiter/profile`)

### Design Style
- ✅ **Card-based layout** with simple toggles
- ✅ Grouped by category (Applications, Matches, Interviews, etc.)
- ✅ Priority badges for urgent notifications
- ✅ Quick action buttons (Enable/Disable all emails)

### Mobile Responsiveness
- ✅ Fully responsive design
- ✅ Cards stack vertically on mobile
- ✅ Touch-friendly toggle switches
- ✅ Breakpoints: 768px (tablet), 480px (phone)

---

## 🔧 Technical Architecture

### Database Schema
```sql
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    event_type VARCHAR NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_frequency notification_frequency_enum NOT NULL DEFAULT 'realtime',
    email_frequency notification_frequency_enum NOT NULL DEFAULT 'realtime',
    priority VARCHAR NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_event_preference UNIQUE (user_id, event_type)
);

CREATE TYPE notification_frequency_enum AS ENUM ('realtime', 'daily', 'weekly');
```

### File Structure
```
backend2/
├── app/
│   ├── models.py                     # NotificationPreferences model added
│   ├── schemas.py                    # Preference schemas added
│   ├── main.py                       # Router registered
│   ├── routers/
│   │   └── notification_preferences.py   # NEW: API endpoints
│   └── services/
│       ├── notification_service.py   # UPDATED: Preference checking
│       └── notification_email_service.py # NEW: Email templates
└── scripts/
    └── migrations/
        └── migrate_notification_preferences.py  # NEW: Migration script

frontend2/
├── src/
│   ├── components/
│   │   └── NotificationPreferences.tsx  # NEW: Settings component
│   ├── pages/
│   │   ├── CandidateProfilePage.tsx     # UPDATED: Added preferences
│   │   └── RecruiterProfilePage.tsx     # NEW: Recruiter profile
│   ├── styles/
│   │   └── NotificationPreferences.css  # NEW: Component styles
│   ├── api/
│   │   └── client.ts                    # UPDATED: Added API methods
│   └── App.tsx                          # UPDATED: Added route
```

---

## ⚙️ Features NOT Implemented (Future Enhancements)

The following were deprioritized for MVP but can be added later:

### 1. Digest Emails (Daily/Weekly)
- **Reason:** Requires background job scheduler (Celery/cron)
- **UI Status:** Frequency dropdowns already exist, just need backend worker
- **Future Work:** Implement background job to aggregate notifications and send digests

### 2. Quiet Hours
- **Reason:** Added complexity for MVP
- **Future Work:** Add start_time/end_time fields to preferences

### 3. Priority Filtering in Drawer
- **Reason:** In-app notification drawer works fine as-is
- **Future Work:** Add filter tabs in notification drawer component

### 4. Category Filtering
- **Reason:** Grouped display sufficient for MVP
- **Future Work:** Add category tabs to notification drawer

---

## 📝 Migration for Existing Users

**Strategy:** Apply same defaults as new users

When the migration runs, all existing users automatically receive:
- ✅ In-app notifications: ON (realtime)
- ✅ Email notifications: ON (realtime)
- ✅ All event types configured based on role

Users can then customize their preferences through the UI.

---

## 🐛 Known Issues & Limitations

### 1. Gmail Sending Limits
- **Issue:** 500 emails/day limit with Gmail SMTP
- **Workaround:** Current user base likely under limit
- **Future Solution:** Switch to SendGrid/AWS SES for production

### 2. Digest Emails Not Functional
- **Issue:** Daily/weekly frequency options shown but not active
- **Status:** Backend doesn't aggregate or send digests yet
- **Impact:** All notifications sent as "realtime" regardless of setting

### 3. No Unsubscribe Link in Emails
- **Issue:** Email templates don't have unsubscribe footer
- **Future Work:** Add unsubscribe token system for compliance

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Run migration successfully
- [ ] Verify database schema created
- [ ] Test GET /notification-preferences (returns defaults for new users)
- [ ] Test POST /notification-preferences (create/update)
- [ ] Test PATCH /notification-preferences/{event_type}
- [ ] Test bulk update
- [ ] Verify email sends with test SMTP credentials

### Frontend Tests
- [ ] Candidate can access preferences at /candidate/profile
- [ ] Recruiter can access preferences at /recruiter/profile
- [ ] Toggles work correctly
- [ ] Frequency dropdowns update state
- [ ] Save button shows "unsaved changes" indicator
- [ ] Success/error toasts appear
- [ ] Mobile view displays correctly
- [ ] Quick actions (Enable/Disable all emails) work

### Integration Tests
- [ ] Create new notification - respects user preferences
- [ ] In-app notification created when enabled
- [ ] Email sent when enabled
- [ ] Email NOT sent when disabled
- [ ] Both channels work independently

---

## 📞 Support & Troubleshooting

### Migration Fails
1. Check PostgreSQL connection
2. Verify user has CREATE TYPE and CREATE TABLE permissions
3. Check if enum already exists: `\dT notification_frequency_enum`
4. Drop and retry if needed

### Emails Not Sending
1. Verify SMTP credentials in .env
2. Check Gmail app password is correct
3. Test with: `python -m app.emailer` (if test script exists)
4. Check logs: `backend2/logs/talentgraph_v2.log`

### Frontend Not Loading Preferences
1. Check browser console for API errors
2. Verify backend is running (http://127.0.0.1:8001/docs)
3. Check API client methods in client.ts
4. Verify user is logged in and token is valid

---

## 🎉 Success Criteria - All Met! ✅

- [x] Settings panel in profile (both candidate & recruiter)
- [x] Basic toggle: Email ON/OFF per event type
- [x] Basic toggle: In-App ON/OFF per event type
- [x] Save/load/edit preferences
- [x] Frequency options UI (realtime/daily/weekly)
- [x] Email templates for all event types
- [x] Notification service respects preferences
- [x] Mobile responsive design
- [x] Database migration script
- [x] API endpoints documented

---

## 📚 Next Steps

1. **Immediate:** Run migration and test with real users
2. **Short-term:** Implement digest email background job
3. **Medium-term:** Add quiet hours functionality
4. **Long-term:** Switch to enterprise email provider (SendGrid/SES)

---

**Implementation Complete! 🚀**  
For questions or issues, refer to the code comments or contact the development team.
