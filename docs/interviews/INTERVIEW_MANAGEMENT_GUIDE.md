# TalentGraph Interview Management System - Option 3 Implementation Guide

## Executive Summary

This document describes the comprehensive interview cancellation and rescheduling system implemented in TalentGraph using **Option 3: Centralized In-App Timeline + Notifications + Email**.

All interview coordination now uses three integrated communication channels:
1. **In-app meeting timeline/history** — source of truth for all meeting actions
2. **In-app notifications** — real-time alerts for both parties
3. **Email confirmations with tokenized action links** — external access and convenience

This provides a professional, auditable, and user-friendly interview coordination experience similar to enterprise hiring platforms.

---

## Core Design Principles

### 1. Meeting Status and Application Status Are Separate

**Meeting Status** tracks interview state:
- `scheduled` — Interview confirmed
- `reschedule_requested` — Candidate requested reschedule
- `rescheduled` — Interview was rescheduled (audit trail)
- `cancelled` — Interview cancelled
- `completed` — Interview took place
- `no_show` — Meeting time passed without attendance

**Application Status** tracks hiring pipeline:
- `applied` — Initial application
- `scheduled` — Interview scheduled
- `under_review` — Post-interview review
- `shortlisted` — Candidate advanced
- `selected` — Offer stage
- `rejected` — Not proceeding

### 2. Application Status Synchronization Rules

The system automatically synchronizes application status based on meeting transitions:

| Meeting Action | Application Status Change |
|---|---|
| Interview scheduled | → `scheduled` |
| Recruiter cancels | → `applied` (returns to pool) |
| Candidate cancels | → No automatic change (recruiter decides) |
| Candidate requests reschedule | → Remains `scheduled` |
| Recruiter reschedules | → Remains `scheduled` |
| Interview completed | → Recruiter updates manually |

---

## User Capabilities

### Recruiter Can:
- ✅ Schedule interview
- ✅ Cancel interview (with reason)
- ✅ Reschedule interview directly
- ✅ Approve candidate reschedule request (and set new time)
- ✅ Reject candidate reschedule request
- ✅ View full meeting timeline
- ✅ Update application status after interview

### Candidate Can:
- ✅ Cancel interview (with reason)
- ✅ Request reschedule (does NOT directly change time)
- ✅ Confirm attendance via app or email
- ✅ View meeting timeline
- ✅ Take actions via tokenized email links

---

## Database Schema

### New Tables

#### `meeting_timeline_event`
Timeline/audit log for all meeting actions
```sql
CREATE TABLE meeting_timeline_event (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meeting(id),
    actor_user_id INTEGER REFERENCES user(id),
    actor_role VARCHAR,
    event_type VARCHAR,              -- interview_scheduled, recruiter_cancelled, etc.
    message TEXT,                     -- Human-readable timeline message
    metadata_json TEXT,               -- Additional context (JSON)
    previous_scheduled_start TIMESTAMP,
    previous_scheduled_end TIMESTAMP,
    created_at TIMESTAMP
);
```

Event types:
- `interview_scheduled`
- `recruiter_cancelled`
- `candidate_cancelled`
- `candidate_requested_reschedule`
- `recruiter_rescheduled`
- `recruiter_approved_reschedule`
- `recruiter_rejected_reschedule`
- `reminder_sent`
- `attendance_confirmed`
- `interview_completed`
- `no_show_marked`

#### `meeting_action_token`
Secure tokens for email-based actions
```sql
CREATE TABLE meeting_action_token (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meeting(id),
    user_id INTEGER REFERENCES user(id),
    token VARCHAR UNIQUE,             -- Secure random token
    action_type VARCHAR,              -- confirm, cancel, reschedule
    expires_at TIMESTAMP,
    is_used BOOLEAN,
    used_at TIMESTAMP,
    created_at TIMESTAMP
);
```

### Updated `meeting` Table

New fields added:
```sql
ALTER TABLE meeting ADD COLUMN reschedule_requested_at TIMESTAMP;
ALTER TABLE meeting ADD COLUMN reschedule_requested_by_user_id INTEGER;
ALTER TABLE meeting ADD COLUMN reschedule_request_reason TEXT;
ALTER TABLE meeting ADD COLUMN reschedule_request_preferred_times TEXT; -- JSON
```

---

## API Endpoints

### Core Meeting Operations

#### `POST /meetings/create`
Create and schedule a new meeting
- Checks for scheduling conflicts
- Creates timeline event
- Sets application status to `scheduled`
- Sends notifications and emails with action tokens

#### `POST /meetings/{id}/cancel`
Cancel a meeting (recruiter or candidate)
- Updates meeting status to `cancelled`
- Creates timeline event
- Syncs application status per rules
- Sends notifications and emails to all participants
- Removes from synced calendars

#### `POST /meetings/{id}/reschedule`
**Recruiter** reschedules meeting directly
- Only organizer can use this endpoint
- Checks for conflicts
- Updates time and status to `scheduled`
- Creates timeline event with old/new times
- Sends notifications and emails with new tokens

### Candidate Reschedule Request Flow

#### `POST /meetings/{id}/request-reschedule`
**Candidate** requests reschedule (does not directly change time)
```json
{
  "reason": "Conflict with another interview",
  "preferred_times": ["2026-04-10T14:00:00Z", "2026-04-11T15:00:00Z"],
  "note": "Happy to accommodate other times as well"
}
```
- Updates meeting status to `reschedule_requested`
- Stores reason and preferred times
- Application remains `scheduled`
- Notifies recruiter in-app and via email

#### `POST /meetings/{id}/respond-reschedule`
**Recruiter** responds to reschedule request
```json
{
  "approved": true,
  "scheduled_start": "2026-04-10T14:00:00Z",
  "scheduled_end": "2026-04-10T15:00:00Z",
  "timezone": "America/New_York",
  "response_note": "Confirmed for Thursday 2pm"
}
```
**If approved:**
- Reschedules to new time
- Status returns to `scheduled`
- Notifies candidate with new details

**If rejected:**
```json
{
  "approved": false,
  "response_note": "Unable to accommodate, please keep original time"
}
```
- Status returns to `scheduled`
- Original time remains
- Notifies candidate

### Timeline

#### `GET /meetings/{id}/timeline`
Get full timeline/history for a meeting
- Returns all events in chronological order
- Shows who did what and when
- Primary in-app audit trail

### Tokenized Email Actions

These endpoints allow candidates to take actions via secure links from email:

#### `GET /meetings/token/{token}/confirm`
Confirm attendance via email link
- Validates token
- Marks participant as confirmed
- Creates timeline event

#### `GET /meetings/token/{token}/cancel`
Show cancel confirmation form

#### `POST /meetings/token/{token}/cancel`
Actually cancel meeting
```json
{
  "cancellation_reason": "Accepted another offer"
}
```

#### `GET /meetings/token/{token}/reschedule`
Show reschedule request form

#### `POST /meetings/token/{token}/reschedule`
Submit reschedule request
```json
{
  "reason": "Schedule conflict",
  "preferred_times": ["2026-04-10T14:00:00Z"],
  "note": "Available any afternoon next week"
}
```

---

## Communication Workflows

### When Interview Is Scheduled

**1. Timeline Event Created:**
- Event type: `interview_scheduled`
- Message: "John Recruiter scheduled the meeting"

**2. In-App Notification Sent:**
- To: Candidate
- Title: "New Meeting Scheduled"
- Message: "John Recruiter scheduled a meeting: Software Engineer Interview"

**3. Email Sent to Candidate:**
- Subject: "Interview Scheduled: Software Engineer Interview"
- Contains:
  - Meeting details (time, link, location)
  - Action buttons:
    - ✅ Confirm Attendance
    - 🔄 Request Reschedule
    - ❌ Cancel Interview
  - Link to view in app

### When Recruiter Cancels Interview

**1. Timeline Event Created:**
- Event type: `recruiter_cancelled`
- Message: "John Recruiter cancelled the meeting: Position filled"

**2. Application Status Updated:**
- New status: `applied` (returns to pool)

**3. In-App Notification Sent:**
- To: Candidate
- Title: "Meeting Cancelled"
- Message: "John Recruiter cancelled meeting: Position filled"

**4. Email Sent to Candidate:**
- Subject: "Interview Cancelled: Software Engineer Interview"
- Contains cancellation reason

### When Candidate Requests Reschedule

**1. Timeline Event Created:**
- Event type: `candidate_requested_reschedule`
- Message: "Jane Candidate requested to reschedule: Schedule conflict"

**2. Meeting Status Updated:**
- New status: `reschedule_requested`
- Application status: Remains `scheduled`

**3. In-App Notification Sent:**
- To: Recruiter
- Title: "Reschedule Request"
- Message: "Jane Candidate requested to reschedule meeting"

**4. Email Sent to Recruiter:**
- Subject: "Reschedule Request: Software Engineer Interview"
- Contains:
  - Original time
  - Candidate's reason
  - Preferred times (if provided)
  - Button: "Review and Respond"

### When Recruiter Approves Reschedule

**1. Timeline Event Created:**
- Event type: `recruiter_approved_reschedule`
- Message: "John Recruiter approved reschedule request and set new time"
- Stores old and new times

**2. Meeting Updated:**
- New time set
- Status: `scheduled`
- Application status: Remains `scheduled`

**3. In-App Notification Sent:**
- To: Candidate
- Title: "Reschedule Approved"
- Message: "John Recruiter approved your reschedule request"

**4. Email Sent to Candidate:**
- Subject: "Interview Rescheduled: Software Engineer Interview"
- Contains:
  - New date and time
  - Meeting link
  - Action buttons:
    - ✅ Confirm New Time
    - ❌ Cancel Interview

---

## Frontend Integration

### Recruiter Meeting Detail View

Should display:
- Meeting status badge
- Candidate name and application status
- Current scheduled time and timezone
- Meeting link/location
- **Meeting Timeline** (prominently displayed)
- Action buttons based on status:
  - ✏️ **Reschedule** (if scheduled)
  - ❌ **Cancel** (if scheduled)
  - ✅ **Approve Reschedule** (if reschedule_requested)
  - ❌ **Reject Reschedule** (if reschedule_requested)
- Reschedule request details (if pending):
  - Candidate reason
  - Preferred times
  - Request timestamp

### Candidate Meeting Detail View

Should display:
- Meeting status
- Recruiter/company name
- Scheduled time and timezone
- Meeting link/location
- **Meeting Timeline** (prominently displayed)
- Action buttons based on status:
  - ✅ **Confirm Attendance** (if scheduled)
  - 🔄 **Request Reschedule** (if scheduled)
  - ❌ **Cancel Interview** (if scheduled)
- If reschedule requested:
  - "Waiting for recruiter response"
  - Your request details

### Meeting Timeline Component

Display timeline events in reverse chronological order:
```
🗓️ John Recruiter scheduled the meeting
   April 7, 2026 at 10:30 AM

🔄 Jane Candidate requested to reschedule: Schedule conflict
   Preferred times: Apr 10 2pm, Apr 11 3pm
   April 8, 2026 at 2:15 PM

✅ John Recruiter approved reschedule request and set new time
   New time: April 10, 2026 at 2:00 PM
   April 8, 2026 at 3:45 PM
```

---

## Service Architecture

### `MeetingService`
Core business logic service (`backend2/app/services/meeting_service.py`)

Key methods:
- `create_timeline_event()` — Add entry to timeline
- `sync_application_status()` — Apply status sync rules
- `generate_action_token()` — Create tokenized email link
- `validate_action_token()` — Verify token validity
- `notify_participants()` — Send in-app notifications
- `get_meeting_timeline()` — Retrieve full timeline

### `MeetingEmailService`
Email communication service (`backend2/app/services/meeting_email_service.py`)

Key methods:
- `send_interview_scheduled_email()` — Initial confirmation with tokens
- `send_interview_cancelled_email()` — Cancellation notice
- `send_reschedule_request_email()` — Notify recruiter of request
- `send_reschedule_approved_email()` — Notify candidate of approval

---

## Migration and Deployment

### 1. Run Database Migration

```bash
cd backend2
python migrate_meeting_management.py
```

This creates:
- `meeting_timeline_event` table
- `meeting_action_token` table
- New `meeting` table columns
- Indexes for performance

### 2. Update Environment Variables

Ensure these are set in `.env`:
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@talentgraph.com
APP_URL=https://talentgraph.com
```

### 3. Deploy Backend

```bash
# Backend changes are in:
# - app/models.py (updated)
# - app/schemas.py (updated)
# - app/routers/meetings.py (updated)
# - app/services/meeting_service.py (new)
# - app/services/meeting_email_service.py (new)

# Restart backend service
```

### 4. Deploy Frontend

Update these components:
- Meeting detail modal/page (recruiter view)
- Meeting detail modal/page (candidate view)
- Meeting timeline component
- Notification handlers for new event types

---

## Testing Checklist

### Recruiter Cancel Flow
- [ ] Recruiter can cancel scheduled meeting
- [ ] Cancellation reason is required
- [ ] Timeline event created
- [ ] Application status changes to `applied`
- [ ] Candidate receives in-app notification
- [ ] Candidate receives email notification
- [ ] Meeting shows as cancelled in both views

### Recruiter Reschedule Flow
- [ ] Recruiter can reschedule to new time
- [ ] Conflict checking works
- [ ] Timeline shows old and new times
- [ ] Application status remains `scheduled`
- [ ] Candidate receives notification and email
- [ ] New email contains updated action tokens

### Candidate Cancel Flow
- [ ] Candidate can cancel interview
- [ ] Cancellation reason is required
- [ ] Timeline event created
- [ ] Application status remains reviewable (not auto-rejected)
- [ ] Recruiter receives notification and email

### Candidate Reschedule Request Flow
- [ ] Candidate can request reschedule
- [ ] Meeting status changes to `reschedule_requested`
- [ ] Application status remains `scheduled`
- [ ] Recruiter receives notification and email
- [ ] Preferred times are captured

### Recruiter Response to Reschedule Request
- [ ] Recruiter can approve and set new time
- [ ] Recruiter can reject and keep original time
- [ ] Timeline reflects approval/rejection
- [ ] Candidate receives notification and email
- [ ] Status returns to `scheduled` after response

### Email Token Actions
- [ ] Confirm token works from email
- [ ] Cancel token shows confirmation form
- [ ] Cancel submission works from token
- [ ] Reschedule request token works
- [ ] Tokens expire correctly
- [ ] Used tokens cannot be reused

### Timeline Display
- [ ] All actions appear in timeline
- [ ] Events show actor name and timestamp
- [ ] Events ordered newest first
- [ ] Timeline visible to both recruiter and candidate

### Application Status Sync
- [ ] Creating meeting sets application to `scheduled`
- [ ] Recruiter cancel returns application to `applied`
- [ ] Candidate cancel does not auto-reject
- [ ] Reschedule request keeps application `scheduled`
- [ ] Reschedule approval keeps application `scheduled`

---

## Monitoring and Observability

### Key Metrics to Track
- Meeting cancellation rate (by role)
- Reschedule request rate
- Reschedule approval rate
- Email token usage rate
- Time from request to response
- Application status consistency

### Logs to Monitor
All meeting actions create timeline events which serve as:
- Audit trail
- Support tool
- Analytics source
- Debugging aid

Query example:
```sql
SELECT 
    event_type,
    COUNT(*) as event_count,
    DATE_TRUNC('day', created_at) as day
FROM meeting_timeline_event
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, day
ORDER BY day DESC, event_count DESC;
```

---

## Known Limitations and Future Enhancements

### Current Limitations
1. No automatic calendar sync for rescheduling (manual update required)
2. No SMS notifications (only in-app + email)
3. No bulk reschedule (one meeting at a time)
4. Token expiration is fixed (30 days)

### Planned Enhancements
- Video provider auto-update on reschedule
- Recurring meeting support
- Interview round sequencing
- Calendar integration for candidate availability
- Automated reminder system with timeline tracking

---

## Support and Troubleshooting

### Common Issues

**Issue:** "Token invalid or expired"
- Tokens expire after 30 days
- Tokens can only be used once
- User must request new action from app

**Issue:** "Application status stuck in scheduled after cancellation"
- Check application_status_sync rule in MeetingService
- Verify cancelled_by_user_id is set correctly
- Check timeline events to see who cancelled

**Issue:** "Reschedule request not sending email"
- Verify EMAIL_PROVIDER and SENDGRID_API_KEY
- Check email service logs
- Verify recipient email is valid

**Issue:** "Timeline events not appearing"
- Verify meeting_timeline_event table exists
- Check for errors in MeetingService.create_timeline_event
- Verify frontend is calling /meetings/{id}/timeline endpoint

---

## Conclusion

This implementation provides a production-ready interview coordination system that:

✅ Tracks everything in timeline for full auditability
✅ Keeps recruiter and candidate aligned through multiple channels
✅ Handles cancellation and rescheduling professionally
✅ Maintains application status consistency
✅ Provides email convenience with tokenized actions
✅ Scales to enterprise hiring workflows

For questions or issues, refer to:
- Code: `backend2/app/routers/meetings.py`
- Services: `backend2/app/services/meeting_service.py`
- Models: `backend2/app/models.py`
- Migration: `backend2/migrate_meeting_management.py`
