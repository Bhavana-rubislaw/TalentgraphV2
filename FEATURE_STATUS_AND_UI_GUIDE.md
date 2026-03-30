# TalentGraph V2 - Feature Status & UI Guide

**Date**: March 29, 2026  
**Status**: Comprehensive feature overview

This document explains what's implemented for job performance metrics, automated lifecycle actions, meeting scheduling, and interview email handling.

---

## 1. Job Posting Performance Metrics ✅ IMPLEMENTED

### What's Available

#### Backend Analytics System
- **Location**: `backend2/app/routers/analytics.py` & `backend2/app/services/analytics_service.py`
- **Event Tracking**: Automatically tracks 20+ event types
- **Metrics Tracked**:
  - ✅ Job views
  - ✅ Swipes (likes/passes)
  - ✅ Applications received
  - ✅ Conversations started
  - ✅ Interviews scheduled/completed
  - ✅ Offers made
  - ✅ Hires completed

#### API Endpoints Available
```
GET /analytics/overview        - High-level KPIs across all jobs
GET /analytics/funnel          - Conversion funnel metrics
GET /analytics/job/{job_id}    - Job-specific detailed analytics
POST /analytics/events         - Manual event tracking
```

### Where to View in UI

#### Recruiter Dashboard - Recommendations Tab
**Location**: Navigate to Recruiter Dashboard → Recommendations Tab

**Analytics Panel** displays:
- **Shortlisted Count**: Number of candidates shortlisted
- **Interview Count**: Number of interviews scheduled
- **Offers Count**: Number of offers made

**Screenshot Path**: Top of recommendations section

```
┌─────────────────────────────────────────┐
│    Recruitment Analytics                │
├─────────┬─────────┬─────────┬──────────┤
│ 📋      │ 🎤      │ ✓        │          │
│ Short-  │ Inter-  │ Offers   │          │
│ listed  │ views   │          │          │
│   15    │   8     │   3      │          │
└─────────┴─────────┴─────────┴──────────┘
```

### What's Currently Missing in UI

❌ **Per-Job Performance Dashboard** - Detailed metrics for individual jobs not yet shown in UI:
  - Job views count
  - Swipe-to-application conversion rate
  - Application-to-interview rate
  - Time-to-fill tracking
  - Days since posted / days to expire

**Status**: Backend ready, frontend dashboard page needed

**Recommendation**: Create a detailed "Job Performance" page accessible from job dropdown that displays:
```
Job Title: Senior Developer

┌─────────────────────────────────────┐
│ Overview (Last 30 Days)             │
├─────────────────────────────────────┤
│ 📊 Views: 247                       │
│ 👍 Swipes: 42 (17% conversion)     │
│ 📨 Applications: 18 (7.3% rate)    │
│ 🎤 Interviews: 5 (27.8% rate)      │
│ ✓ Offers: 1                        │
├─────────────────────────────────────┤
│ ⏱️ Time Tracking                    │
│ • Posted: 23 days ago              │
│ • Expires in: 7 days               │
│ • Avg time to interview: 12 days   │
└─────────────────────────────────────┘
```

---

## 2. Automated Lifecycle Actions ✅ IMPLEMENTED

### What Works

#### Auto-Freeze Expired Jobs
- **Location**: `backend2/app/services/lifecycle_service.py`
- **When**: Runs automatically at backend startup
- **What it does**:
  - Checks jobs with `end_date` in the past
  - Automatically changes status from "open" to "closed"
  - Sends email notification to recruiter
  - Tracks analytics event (JOB_EXPIRED)

#### Warning Notifications
- **3-Day Warning**: Email sent to recruiter 3 days before expiry
- **1-Day URGENT Warning**: Email sent to Admin/HR staff 1 day before expiry
- **Email Content**:
  - Prominent warning banner
  - Expiry date highlighted
  - Call-to-action button to extend job posting
  - Professional HTML template

#### Job Status in UI
**Location**: Recruiter Dashboard → Job Selector Dropdown

**Status Badges** visible:
- 🟢 **Open** - Active job accepting applications (green)
- ❄️ **Frozen** - Temporarily paused (gray)
- 🔄 **Reposted** - Reopened after freeze (blue)
- 🔴 **Closed** - Expired/permanently closed (red)

### Where to View

#### Job Status Display
```
Recruiter Dashboard
   └── Job Dropdown
        ├── Senior Developer [🟢 Open]
        ├── Backend Engineer [❄️ Frozen]
        ├── Frontend Lead [🔄 Reposted]
        └── QA Engineer [🔴 Closed]
```

#### Frozen Job Count
Bottom of job selector shows: "X frozen jobs"

### Lifecycle Management Actions

#### Manual Controls (UI Buttons)
**Location**: Recruiter Dashboard → Select a job → Action buttons appear

- **Freeze Button** (❄️): Pause job (stops accepting applications)
- **Reactivate Button** (🔄): Reopen frozen job
- **Repost Button**: Explicitly refresh job listing

**Prior Applicants Banner**: When reopening a frozen job with existing applications, orange banner appears:
```
⚠️ Prior Applicants Notice
This job has 5 prior applicant(s) from before it was frozen.
Review them before sourcing new candidates.
[View Applications]
```

---

## 3. Meeting Scheduler with Direct Integration ✅ PARTIALLY IMPLEMENTED

### What's Implemented

#### Auto-Generate Meeting Links
**Location**: Applications Tab → Click "Schedule Interview" button

**Supported Providers**:
- ✅ **Zoom** - Auto-generates via Zoom API (if credentials configured)
- ✅ **Google Meet** - Auto-generates via Google Calendar API
- ✅ **Microsoft Teams** - Auto-generates via Teams API (if credentials configured)
- ⚠️ **Manual Link** - Paste existing meeting URL

### How It Works

#### Step-by-Step User Flow

1. **Navigate to Applications**
   - Recruiter Dashboard → Applications Tab
   - Select an application
   - Click **"Schedule Interview"** button

2. **Fill Interview Details**
   ```
   ┌─────────────────────────────────────────┐
   │  Schedule Interview                     │
   ├─────────────────────────────────────────┤
   │  Candidate: John Doe                    │
   │  Email: john@example.com                │
   │                                         │
   │  Date: [Calendar Picker]                │
   │  Time: [10:00 AM]                       │
   │  Timezone: [Eastern Time (ET)]          │
   │                                         │
   │  Meeting Provider:                      │
   │  ○ 🎥 Zoom (Auto-generate)              │
   │  ○ 📹 Google Meet (Auto-generate)       │
   │  ○ 💼 Teams (Auto-generate)             │
   │  ○ 🔗 Manual Link                       │
   │                                         │
   │  Meeting Link: [Auto-filled or paste]  │
   │  Notes: [Optional preparation notes]   │
   │                                         │
   │  [ Send Interview Invite ]              │
   └─────────────────────────────────────────┘
   ```

3. **Auto-Generation Happens**
   - If provider selected (Zoom/Teams/Google Meet) and **meeting link field left empty**:
     - Backend queries configured credentials from `.env`
     - Generates meeting via provider API
     - Returns auto-generated link
   - If manual link provided: Uses that directly

4. **Success Confirmation**
   ```
   ✅ Interview Scheduled Successfully!
   
   Provider: Zoom
   Meeting Link: https://zoom.us/j/abc123xyz
   
   Emails sent to:
   • Candidate: john@example.com
   • Recruiter: recruiter@company.com
   ```

### Configuration Required

#### Backend Environment Variables
**File**: `backend2/.env`

For **Zoom** (OAuth 2.0):
```env
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
```

For **Google Meet**:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

For **Microsoft Teams**:
```env
MICROSOFT_CLIENT_ID=your_teams_client_id
MICROSOFT_CLIENT_SECRET=your_teams_client_secret
```

### What's Missing

❌ **Settings Tab Configuration UI** - Currently credentials must be added to `.env` manually

**Ideal Flow** (not yet implemented):
```
Recruiter Dashboard → Settings Tab
   └── Video Providers
        ├── Connect Zoom [Button]
        ├── Connect Google [Button]
        └── Connect Teams [Button]
```

**Workaround**: Admin manually adds credentials to `.env` file on server

---

## 4. Interview Email Handling ✅ IMPLEMENTED with Recommendations

### What's Implemented

#### Dual Email System
**Location**: `backend2/app/emailer.py` - `send_interview_schedule_email()`

**Email Flow**:
1. **Candidate Email**: Invitation with interview details
   - Subject: "Interview Invitation | {job_title} | {company_name}"
   - Purple gradient professional design
   - Includes meeting link, time, timezone, notes
   - **Reply-To header**: Set to recruiter's email
   
2. **Recruiter Email**: Confirmation with candidate info
   - Subject: "✓ Interview Scheduled: {candidate_name} for {job_title}"
   - Green success-focused design
   - Includes candidate contact info
   - Interview preparation reminders

**Both emails sent from**: `talentgraph.interviews@gmail.com`

#### Reply Handling
When candidate replies to interview email:
- ✅ Email goes directly to recruiter (Reply-To header works)
- ✅ Recruiter receives reply in their normal inbox
- ✅ Candidate and recruiter can continue email thread

### Current Limitations & Recommendations

#### ❌ No Automated Reschedule/Cancel Workflow

**Current State**: 
- Candidate must email recruiter directly
- No built-in reschedule UI
- No automated tracking of reschedule requests

**Recommended Approach**:

##### Option 1: Email-Based Action Links (Partially Implemented)
**Status**: Code exists in `backend2/app/routers/email_webhooks.py` but not fully integrated

Add action buttons to interview emails:
```html
<a href="https://talentgraph.com/interview/token/{token}/confirm">✓ Confirm</a>
<a href="https://talentgraph.com/interview/token/{token}/reschedule">🔄 Reschedule</a>
<a href="https://talentgraph.com/interview/token/{token}/cancel">✗ Cancel</a>
```

**When clicked**:
- Candidate redirected to TalentGraph page
- Action recorded in database
- Notification sent to recruiter
- Meeting status updated

**Files to activate**:
- `backend2/app/routers/email_webhooks.py` - Already has routes
- Need to add action token generation to interview scheduling
- Need to create frontend pages for `/interview/token/{token}/reschedule` etc.

##### Option 2: In-App Messaging (RECOMMENDED - Already Available!)
**Status**: ✅ Fully implemented messaging system exists

**Best Practice**:
1. Candidate receives interview email with recruiter's email
2. Candidate logs into TalentGraph dashboard
3. Navigate to **Messages Tab** → Finds conversation with recruiter
4. Sends message: "Need to reschedule interview from March 30 to April 2"
5. Recruiter receives:
   - In-app notification (red badge on messages icon)
   - Email notification (if configured)
6. Recruiter responds via Messages tab
7. Both can see conversation history

**Why This Works**:
- Messaging system fully operational
- Notifications already trigger
- Professional communication channel
- Audit trail maintained
- No additional code needed

#### Integration Steps for Reschedule Workflow

**Add to Interview Email** (small change):
```html
<div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin-top: 20px;">
  <p><strong>Need to reschedule?</strong></p>
  <p>You can:</p>
  <ul>
    <li>Reply directly to this email</li>
    <li>Or message us through your <a href="https://talentgraph.com/dashboard?tab=messages">TalentGraph Dashboard</a></li>
  </ul>
</div>
```

**Notification Enhancement**:
When interview scheduled, send **in-app notification** to candidate:
```
"Interview scheduled for March 30 at 10:00 AM. 
Need to reschedule? Reply via Messages."
[View in Messages]
```

---

## 5. Summary: Where to Find Everything

### Recruiter Dashboard UI Map

```
┌─────────────────────────────────────────────────────┐
│  TalentGraph  [🔔 Notifications] [@Avatar ▼]        │
├─────────────────────────────────────────────────────┤
│  Sidebar:                                           │
│  ├─ 🏠 Recommendations    ← Analytics here          │
│  ├─ ⭐ Shortlist                                    │
│  ├─ 📨 Applications      ← Schedule interview here │
│  ├─ 🤝 Matches                                      │
│  ├─ 👥 Browse                                       │
│  ├─ 💬 Messages          ← Reschedule via chat    │
│  ├─ 📅 Meetings          ← (Future: view scheduled)│
│  └─ ⚙️ Settings          ← (Future: video config) │
└─────────────────────────────────────────────────────┘

Top Navigation:
  [Job Selector Dropdown]  ← Status badges, freeze/reactivate
  [View: All / New / Shortlisted]
```

### Feature Access Matrix

| Feature | UI Location | Status |
|---------|-------------|--------|
| **Job Performance Metrics** | Recommendations tab → Analytics panel | ✅ Basic metrics shown |
| Per-job detailed analytics | NOT YET IN UI | ⚠️ Backend ready, UI needed |
| Days since posted | NOT IN UI | ❌ Backend ready, UI needed |
| Days to expire | NOT IN UI | ❌ Backend ready, UI needed |
| **Job Lifecycle** | Job dropdown → Status badges | ✅ Visible |
| Freeze/Reactivate buttons | Job dropdown actions | ✅ Working |
| Prior applicants banner | Shown when reopening job | ✅ Working |
| Auto-freeze expired | Automated (backend) | ✅ Running |
| Expiry warnings (email) | Sent to recruiter/admin | ✅ Working |
| **Interview Scheduling** | Applications → Schedule button | ✅ Working |
| Auto-generate Zoom link | Interview modal | ✅ Working (if configured) |
| Auto-generate Google Meet | Interview modal | ✅ Working (if configured) |
| Auto-generate Teams link | Interview modal | ✅ Working (if configured) |
| **Interview Emails** | Automatic on schedule | ✅ Working |
| Candidate receives email | Automatic | ✅ Working |
| Recruiter receives copy | Automatic | ✅ Working |
| Reply-To recruiter | Email header | ✅ Working |
| **Reschedule Workflow** | Messages tab (recommended) | ✅ Use existing messaging |
| Reschedule action links | Email buttons | ⚠️ Partially implemented |

---

## 6. Quick Action Guide

### To View Job Performance
1. Log in as Recruiter
2. Go to **Recommendations** tab
3. Select job from dropdown
4. View **Recruitment Analytics** panel (shortlisted, interviews, offers)

### To Schedule Interview with Auto-Generated Link
1. Go to **Applications** tab
2. Click on an application
3. Click **"Schedule Interview"** button
4. Fill details:
   - Date & time
   - Select provider: Zoom / Google Meet / Teams
   - Leave meeting link **EMPTY** (to auto-generate)
   - Add notes (optional)
5. Click **"Send Interview Invite"**
6. Success message shows auto-generated link & provider

### To Handle Reschedule Request
**Recommended Flow**:
1. Candidate emails recruiter or messages via TalentGraph
2. Recruiter checks **Messages** tab (💬 icon in sidebar)
3. Reads candidate's reschedule request
4. Recruiter replies with new time options
5. Both continue conversation until confirmed

**Alternative** (if candidate emails):
1. Recruiter receives email reply directly (Reply-To works)
2. Recruiter responds via email
3. Once new time confirmed, manually reschedule in TalentGraph

### To Freeze/Reactivate a Job
1. Go to any recruiter dashboard tab
2. Click job dropdown at top
3. Select the job
4. Click **❄️ Freeze** button (if active) 
   - OR -
5. Click **🔄 Reactivate** button (if frozen)
6. See status badge update immediately

---

## 7. What to Implement Next (Priority Order)

### High Priority

1. **Job Performance Dashboard Page**
   - Detailed per-job analytics UI
   - Show: views, swipes, applications, conversion rates
   - Show: days since posted, days to expire
   - Chart: application trend over time
   - **Estimated effort**: 2-3 days

2. **Settings Tab - Video Provider Configuration**
   - UI for connecting Zoom/Teams/Google Meet
   - OAuth flow integration
   - Save credentials securely
   - Test connection button
   - **Estimated effort**: 3-4 days

3. **Enhanced Reschedule Flow**
   - Add instruction in interview email pointing to Messages
   - Auto-create in-app notification on interview schedule
   - Add "Reschedule needed?" quick-reply template in Messages
   - **Estimated effort**: 1-2 days

### Medium Priority

4. **Time-to-Fill Tracking Display**
   - Add "Days open" field to job cards
   - Add countdown timer for expiring jobs
   - Visual calendar showing posting duration
   - **Estimated effort**: 1 day

5. **Conversion Rate Funnel Visualization**
   - Visual funnel chart (views → swipes → applications → interviews → hires)
   - Per-stage conversion percentages
   - Comparison across jobs
   - **Estimated effort**: 2-3 days

### Low Priority (Nice to Have)

6. **Email Action Links for Reschedule**
   - Activate existing webhook routes
   - Generate secure action tokens
   - Create landing pages for confirm/reschedule/cancel
   - **Estimated effort**: 3-4 days

---

## 8. Testing Your Current Implementation

### Test Job Performance Metrics
```bash
# Terminal 1: Start backend
cd backend2
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Test analytics endpoints:
curl.exe http://127.0.0.1:8001/analytics/overview -H "Authorization: Bearer YOUR_TOKEN"
curl.exe http://127.0.0.1:8001/analytics/funnel -H "Authorization: Bearer YOUR_TOKEN"
curl.exe http://127.0.0.1:8001/analytics/job/1 -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Automated Lifecycle
1. Create a job with `end_date` = yesterday
2. Restart backend (lifecycle checks run on startup)
3. Check job status → should be "closed"
4. Check recruiter email → should receive expiry notification

### Test Interview Scheduling
1. Go to Applications tab
2. Click "Schedule Interview"
3. Select **Zoom** provider
4. Leave meeting link **empty**
5. Submit
6. Check success message → should show auto-generated Zoom link
7. Check emails (candidate + recruiter) → both should receive

### Test Reschedule via Messages
1. Log in as candidate
2. Go to Messages tab
3. Find conversation with recruiter who scheduled interview
4. Send message: "Need to reschedule to April 2"
5. Log in as recruiter
6. Check Messages tab → should see notification badge
7. Open conversation → respond with new time

---

## 9. Documentation References

- **Analytics Implementation**: `backend2/PHASE3_PHASE4_IMPLEMENTATION_COMPLETE.md`
- **Job Lifecycle Guide**: `JOB_LIFECYCLE_SUMMARY.md`, `JOB_LIFECYCLE_QUICK_START.md`
- **Interview Scheduling**: `INTERVIEW_SCHEDULING_IMPLEMENTATION.md`, `INTERVIEW_AUTO_GENERATE_IMPLEMENTATION.md`
- **Email Setup**: `INTERVIEW_EMAIL_GUIDE.md`, `INTERVIEW_EMAIL_UPDATE_SUMMARY.md`
- **Messaging System**: `MESSAGING_IMPLEMENTATION_GUIDE.md`, `CHAT_SYSTEM_GUIDE.md`

---

**Last Updated**: March 29, 2026  
**Maintainer**: Development Team  
**Next Review**: When implementing job performance dashboard UI
