# Quick Start: Interview Management System

## 🚀 Setup and Deployment

### 1. Database Migration

```bash
cd backend2
python migrate_meeting_management.py
```

This will:
- Create `meeting_timeline_event` table
- Create `meeting_action_token` table
- Add reschedule request fields to `meeting` table
- Update MeetingStatus enum

### 2. Verify Environment Variables

Ensure `.env` contains:
```env
# Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@talentgraph.com
SENDGRID_FROM_NAME=TalentGraph

# App URL for email links
APP_URL=https://talentgraph.com  # or http://localhost:3000 for dev

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### 3. Install Dependencies

Backend:
```bash
cd backend2
pip install sendgrid  # if not already installed
```

Frontend:
```bash
cd frontend2
npm install date-fns  # for date formatting
```

### 4. Restart Services

```bash
# Backend
cd backend2
uvicorn app.main:app --reload

# Frontend
cd frontend2
npm run dev
```

---

## 📋 Usage Examples

### For Recruiters

#### Schedule Interview
```typescript
// POST /api/meetings/create
const response = await fetch('/api/meetings/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "Software Engineer Interview",
    description: "Technical interview for senior position",
    meeting_type: "interview",
    scheduled_start: "2026-04-15T14:00:00Z",
    scheduled_end: "2026-04-15T15:00:00Z",
    duration_minutes: 60,
    timezone: "America/New_York",
    participant_user_ids: [candidateUserId],
    application_id: applicationId,
    video_meeting_url: "https://zoom.us/j/123456789",
  }),
});
```

What happens:
- ✅ Meeting created with status `scheduled`
- ✅ Timeline event: "interview_scheduled"
- ✅ Application status → `scheduled`
- ✅ Candidate receives in-app notification
- ✅ Candidate receives email with action buttons (Confirm, Cancel, Reschedule)

#### Cancel Interview
```typescript
// POST /api/meetings/{id}/cancel
const response = await fetch(`/api/meetings/${meetingId}/cancel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    cancellation_reason: "Position has been filled",
  }),
});
```

What happens:
- ✅ Meeting status → `cancelled`
- ✅ Timeline event: "recruiter_cancelled"
- ✅ Application status → `applied` (returns to pool)
- ✅ Candidate receives notification and email

#### Reschedule Interview
```typescript
// POST /api/meetings/{id}/reschedule
const response = await fetch(`/api/meetings/${meetingId}/reschedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    scheduled_start: "2026-04-16T14:00:00Z",
    scheduled_end: "2026-04-16T15:00:00Z",
    timezone: "America/New_York",
    reason: "Scheduling conflict resolved",
  }),
});
```

What happens:
- ✅ Meeting time updated
- ✅ Timeline event: "recruiter_rescheduled" (with old/new times)
- ✅ Application status remains `scheduled`
- ✅ Candidate receives notification with new time
- ✅ New email tokens generated

#### Respond to Reschedule Request
```typescript
// POST /api/meetings/{id}/respond-reschedule

// Approve and set new time:
await fetch(`/api/meetings/${meetingId}/respond-reschedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    approved: true,
    scheduled_start: "2026-04-17T15:00:00Z",
    scheduled_end: "2026-04-17T16:00:00Z",
    timezone: "America/New_York",
    response_note: "Confirmed for Monday 3pm",
  }),
});

// Or decline:
await fetch(`/api/meetings/${meetingId}/respond-reschedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    approved: false,
    response_note: "Unable to accommodate, please keep original time",
  }),
});
```

---

### For Candidates

#### Cancel Interview
```typescript
// POST /api/meetings/{id}/cancel
const response = await fetch(`/api/meetings/${meetingId}/cancel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    cancellation_reason: "Accepted another offer",
  }),
});
```

What happens:
- ✅ Meeting status → `cancelled`
- ✅ Timeline event: "candidate_cancelled"
- ✅ Application status remains reviewable (not auto-rejected)
- ✅ Recruiter receives notification and email

#### Request Reschedule
```typescript
// POST /api/meetings/{id}/request-reschedule
const response = await fetch(`/api/meetings/${meetingId}/request-reschedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    reason: "Schedule conflict with another interview",
    preferred_times: [
      "2026-04-17T14:00:00Z",
      "2026-04-18T15:00:00Z",
    ],
    note: "I'm available any afternoon next week as well",
  }),
});
```

What happens:
- ✅ Meeting status → `reschedule_requested`
- ✅ Timeline event: "candidate_requested_reschedule"
- ✅ Application status remains `scheduled`
- ✅ Recruiter receives notification with request details
- ✅ Recruiter receives email to review and respond

#### Using Email Token Links

Candidates can also take actions via email:

**Confirm Attendance:**
```
Click link in email → GET /api/meetings/token/{token}/confirm
→ Marks attendance confirmed
→ Creates timeline event
```

**Cancel via Email:**
```
Click link in email → GET /api/meetings/token/{token}/cancel
→ Shows confirmation form
→ Submit form → POST /api/meetings/token/{token}/cancel
→ Cancels meeting
```

**Request Reschedule via Email:**
```
Click link in email → GET /api/meetings/token/{token}/reschedule
→ Shows reschedule request form
→ Submit form → POST /api/meetings/token/{token}/reschedule
→ Creates reschedule request
```

---

## 🎨 Frontend Integration

### Import Components

```typescript
import MeetingTimeline from '@/components/meetings/MeetingTimeline';
import RecruiterMeetingDetail from '@/components/meetings/RecruiterMeetingDetail';
import CandidateMeetingDetail from '@/components/meetings/CandidateMeetingDetail';
```

### Use in Your App

#### Recruiter View
```typescript
<RecruiterMeetingDetail
  meeting={meeting}
  candidateName="Jane Doe"
  applicationStatus="scheduled"
  onClose={() => setShowModal(false)}
  onUpdate={() => fetchMeetings()}
/>
```

#### Candidate View
```typescript
<CandidateMeetingDetail
  meeting={meeting}
  recruiterName="John Smith"
  companyName="TechCorp Inc"
  onClose={() => setShowModal(false)}
  onUpdate={() => fetchMeetings()}
/>
```

#### Standalone Timeline
```typescript
<MeetingTimeline meetingId={123} />
```

---

## 🔍 Testing Checklist

### ✅ Recruiter Workflows
- [ ] Can schedule interview
- [ ] Can cancel interview with reason
- [ ] Can reschedule interview directly
- [ ] Can see reschedule request notification
- [ ] Can approve reschedule request
- [ ] Can reject reschedule request
- [ ] Timeline shows all actions

### ✅ Candidate Workflows
- [ ] Receives email after being scheduled
- [ ] Can cancel interview from app
- [ ] Can request reschedule from app
- [ ] Can cancel via email token
- [ ] Can request reschedule via email token
- [ ] Can confirm attendance via email
- [ ] Timeline shows all actions

### ✅ Status Synchronization
- [ ] Creating meeting sets application to `scheduled`
- [ ] Recruiter cancel returns application to `applied`
- [ ] Candidate cancel doesn't auto-reject
- [ ] Reschedule request keeps application `scheduled`
- [ ] Reschedule approval keeps application `scheduled`

### ✅ Communication
- [ ] Notifications sent to correct parties
- [ ] Emails delivered with correct content
- [ ] Email tokens work and expire correctly
- [ ] Timeline updated for every action

---

## 🐛 Troubleshooting

### Email tokens not working

**Check:**
1. `APP_URL` in `.env` is correct
2. Token hasn't expired (30 day default)
3. Token hasn't been used already
4. Frontend is calling correct token endpoint

**Debug:**
```sql
SELECT * FROM meeting_action_token 
WHERE meeting_id = {meeting_id}
ORDER BY created_at DESC;
```

### Application status not syncing

**Check:**
1. `application_id` is set on meeting
2. Application exists in database
3. `MeetingService.sync_application_status()` is being called

**Debug:**
```sql
SELECT 
    m.id,
    m.status as meeting_status,
    m.application_id,
    a.status as application_status,
    a.last_status_updated_at
FROM meeting m
LEFT JOIN application a ON m.application_id = a.id
WHERE m.id = {meeting_id};
```

### Timeline events not appearing

**Check:**
1. `meeting_timeline_event` table exists
2. Events are being created in code
3. Frontend is calling `/meetings/{id}/timeline`

**Debug:**
```sql
SELECT * FROM meeting_timeline_event 
WHERE meeting_id = {meeting_id}
ORDER BY created_at DESC;
```

### Emails not sending

**Check:**
1. `SENDGRID_API_KEY` is valid
2. `EMAIL_PROVIDER` is set to "sendgrid"
3. Check backend logs for email errors

**Test email service:**
```python
from app.services.meeting_email_service import MeetingEmailService
service = MeetingEmailService()
# Check if provider initialized
print(service.provider)
```

---

## 📊 Monitoring

### Key Metrics Query

```sql
-- Meeting actions in last 30 days
SELECT 
    event_type,
    COUNT(*) as count,
    DATE_TRUNC('day', created_at) as day
FROM meeting_timeline_event
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, day
ORDER BY day DESC, count DESC;

-- Reschedule request resolution time
SELECT 
    AVG(EXTRACT(EPOCH FROM (approved_at - requested_at))/3600) as avg_hours
FROM (
    SELECT 
        m.reschedule_requested_at as requested_at,
        (SELECT created_at 
         FROM meeting_timeline_event 
         WHERE meeting_id = m.id 
         AND event_type IN ('recruiter_approved_reschedule', 'recruiter_rejected_reschedule')
         ORDER BY created_at ASC 
         LIMIT 1) as approved_at
    FROM meeting m
    WHERE m.reschedule_requested_at IS NOT NULL
) subquery;

-- Token usage rate
SELECT 
    COUNT(*) FILTER (WHERE is_used = true) * 100.0 / COUNT(*) as usage_rate_percent
FROM meeting_action_token
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## 📖 Additional Resources

- **Full Documentation:** [INTERVIEW_MANAGEMENT_GUIDE.md](./INTERVIEW_MANAGEMENT_GUIDE.md)
- **API Endpoints:** `backend2/app/routers/meetings.py`
- **Services:** `backend2/app/services/meeting_service.py`, `meeting_email_service.py`
- **Models:** `backend2/app/models.py`
- **Components:** `frontend2/src/components/meetings/`

---

## 🎯 Next Steps

1. Run migration: `python migrate_meeting_management.py`
2. Test recruiter cancel flow
3. Test candidate reschedule request flow
4. Test email token actions
5. Verify timeline displays correctly
6. Monitor application status sync
7. Set up email template customization (optional)
8. Configure calendar sync (optional)

---

**Questions or Issues?**

Check the full implementation guide or review the code in:
- Backend: `backend2/app/routers/meetings.py`
- Services: `backend2/app/services/`
- Frontend: `frontend2/src/components/meetings/`
