# TalentGraph V2 - Complete Backend Code Explanation

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Models](#database-models)
4. [API Endpoints & Routers](#api-endpoints--routers)
5. [Core Services](#core-services)
6. [Security & Authentication](#security--authentication)
7. [Background Workers](#background-workers)
8. [Middleware & Request Flow](#middleware--request-flow)
9. [Control Flow Examples](#control-flow-examples)

---

## Overview

**TalentGraph V2** is a candidate-centric talent marketplace backend built with **FastAPI**, **PostgreSQL**, and **SQLModel**. It connects candidates with recruiters through a Tinder-style matching system, manages job applications, schedules interviews, and provides real-time notifications.

**Key Features:**
- Authentication (JWT-based)
- Candidate & Recruiter profiles
- Job posting & matching engine
- Application tracking
- Meeting scheduler with video conferencing integration
- Real-time messaging system
- Comprehensive logging & analytics
- Email notifications with preference management
- Background workers for lifecycle management

---

## Architecture & Tech Stack

### Core Technologies
```
FastAPI          → Web framework (async-ready, OpenAPI docs)
PostgreSQL       → Relational database
SQLModel         → ORM (combines SQLAlchemy + Pydantic)
JWT              → Authentication tokens
Passlib/Argon2   → Password hashing
APScheduler      → Background task scheduling
SMTP             → Email delivery
```

### Project Structure
```
backend2/
├── app/
│   ├── main.py                    # Application entry point
│   ├── database.py                # Database engine & session management
│   ├── models.py                  # SQLModel database models
│   ├── schemas.py                 # Pydantic request/response schemas
│   ├── security.py                # JWT & password utilities
│   ├── emailer.py                 # Email sending functions
│   ├── notification_payloads.py   # Notification payload schemas
│   ├── core/
│   │   ├── logging_config.py      # Logging system configuration
│   │   └── notification_registry.py # Event taxonomy
│   ├── middleware/
│   │   ├── request_id.py          # Request ID tracing
│   │   └── change_tracking.py     # Auto-logging middleware
│   ├── routers/                   # API endpoint modules
│   │   ├── auth.py                # Signup/login
│   │   ├── candidates.py          # Candidate profiles
│   │   ├── job_postings.py        # Job CRUD
│   │   ├── applications.py        # Application management
│   │   ├── meetings.py            # Meeting scheduler
│   │   ├── messages.py            # Direct messaging
│   │   ├── notifications.py       # Notification endpoints
│   │   ├── swipes.py              # Like/pass actions
│   │   ├── matches.py             # Match management
│   │   └── ...
│   ├── services/                  # Business logic layer
│   │   ├── notification_service.py     # Centralized notifications
│   │   ├── meeting_service.py          # Meeting scheduling logic
│   │   ├── lifecycle_service.py        # Job expiration automation
│   │   ├── email_service.py            # Email template rendering
│   │   ├── calendar_providers.py       # Google/Microsoft calendar
│   │   └── video_providers.py          # Zoom/Teams/Meet integration
│   └── workers/                   # Background tasks
│       ├── scheduler.py           # APScheduler initialization
│       ├── lifecycle_worker.py    # Job expiration checks
│       ├── email_worker.py        # Email queue processing
│       └── ...
├── logs/                          # Rotating log files
├── uploads/                       # Resume/certification storage
└── tests/                         # Test suite
```

---

## Database Models

All models are defined in `app/models.py` using **SQLModel** (which combines SQLAlchemy and Pydantic).

### Core Models

#### 1. **User** (Base Authentication)
```python
class User(SQLModel, table=True):
    id: int (primary key)
    email: str (unique, indexed)
    full_name: str
    password_hash: str
    role: UserRole  # Enum: CANDIDATE, ADMIN, HR, RECRUITER
    is_active: bool (default: True)
    last_seen_at: datetime (optional)
    created_at: datetime
    updated_at: datetime
```

**Database Operations:**
- `INSERT` on signup (auth.py → `signup()`)
- `SELECT` on login (auth.py → `login()`)
- `UPDATE` for last_seen_at (presence tracking)

**UI Connection:**
- Login page sends credentials → backend validates → returns JWT token
- Token is used in `Authorization: Bearer <token>` header for all subsequent requests

---

#### 2. **Candidate** (Candidate Profile)
```python
class Candidate(SQLModel, table=True):
    id: int (primary key)
    user_id: int (foreign key → User.id, unique)
    name: str
    email: str (indexed)
    phone: str
    residential_address: str
    location_state: str
    location_county: str
    location_zipcode: str
    linkedin_url: str (optional)
    github_url: str (optional)
    portfolio_url: str (optional)
    profile_summary: str (optional)
    created_at: datetime
    updated_at: datetime
    
    # Relationships:
    user: User
    resumes: List[Resume]
    certifications: List[Certification]
    job_profiles: List[JobProfile]
    applications: List[Application]
    matches: List[Match]
```

**Database Operations:**
- `INSERT` when candidate completes profile (candidates.py → `create_candidate()`)
- `SELECT` to fetch profile (candidates.py → `get_candidate()`)
- `UPDATE` for profile edits (candidates.py → `update_candidate()`)

**UI Connection:**
- Profile form on frontend → POST `/candidates` → creates DB record
- Dashboard fetches candidate data → GET `/candidates/{id}`

---

#### 3. **JobProfile** (Candidate's Job Preferences)
A candidate can have **multiple job profiles** (like dating app profiles for different job types).

```python
class JobProfile(SQLModel, table=True):
    id: int
    candidate_id: int (foreign key)
    profile_name: str
    product_vendor: str  # Oracle, SAP, etc.
    product_type: str
    job_role: str
    years_of_experience: int
    worktype: WorkType  # remote/hybrid/onsite
    employment_type: EmploymentType  # ft/pt/contract/c2c/w2
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType  # USD/GBP/EUR
    visa_status: VisaStatus
    # 30+ additional fields for preferences
    skills: List[Skill]
    location_preferences: List[LocationPreference]
```

**Database Operations:**
- `INSERT` when creating profile (candidates.py → `create_job_profile()`)
- `SELECT` for matching algorithm (recommendations.py)
- `UPDATE` for profile changes

**UI Connection:**
- "Create Profile" wizard → POST `/candidates/{id}/job-profiles`
- Profile cards → GET `/candidates/{id}/job-profiles`

---

#### 4. **Company** (Recruiter Profile)
```python
class Company(SQLModel, table=True):
    id: int
    user_id: int (foreign key)
    company_name: str
    company_email: str (indexed)
    employee_type: str  # Admin/HR/Recruiter
    job_postings: List[JobPosting]
```

**Database Operations:**
- `INSERT` on recruiter signup (auth.py)
- `SELECT` for ownership verification (security.py → `verify_company_owns_job()`)

---

#### 5. **JobPosting** (Recruiter's Job Listing)
```python
class JobPosting(SQLModel, table=True):
    id: int
    company_id: int (foreign key)
    job_title: str
    product_vendor: str
    worktype: WorkType
    location: str
    salary_min/max: float
    job_description: str
    status: JobPostingStatus  # active/frozen/reposted/cancelled
    end_date: str (optional)
    posting_skills: List[JobPostingSkill]
    
    # Lifecycle tracking
    frozen_at: datetime
    reposted_at: datetime
    cancelled_at: datetime
```

**Database Operations:**
- `INSERT` when creating job (job_postings.py → `create_job_posting()`)
- `SELECT` for job feed (job_postings.py → `get_job_postings()`)
- `UPDATE status` for lifecycle management (lifecycle_service.py)

**Control Statement Example:**
```python
# Prevent applications to frozen jobs
if job_posting.status == JobPostingStatus.FROZEN:
    raise HTTPException(status_code=400, detail="Job not accepting applications")
```

---

#### 6. **Application** (Candidate → Job Application)
```python
class Application(SQLModel, table=True):
    id: int
    candidate_id: int (foreign key)
    job_posting_id: int (foreign key)
    job_profile_id: int (foreign key)
    status: str  # applied → scheduled → under_review → shortlisted → selected/rejected
    applied_at: datetime
    recruiter_notes: str (optional, internal only)
    last_status_updated_at: datetime
```

**Database Operations:**
- `INSERT` when applying (applications.py → `apply_to_job()`)
- `UPDATE status` by recruiter (applications.py → `update_application_status()`)
- `SELECT` for candidate's applications (applications.py → `get_my_applications()`)

**Status Transition Rules:**
```python
STATUS_TRANSITIONS = {
    "applied": ["scheduled", "under_review", "shortlisted", "rejected"],
    "scheduled": ["under_review", "shortlisted", "selected", "rejected"],
    "under_review": ["shortlisted", "selected", "rejected"],
    "shortlisted": ["selected", "rejected"],
    "selected": [],  # Terminal
    "rejected": []   # Terminal
}
```

**UI Connection:**
- "Apply" button → POST `/applications/apply` → creates Application record
- Status updates visible in recruiter dashboard → PATCH `/applications/{id}/status`

---

#### 7. **Swipe** (Like/Pass Actions)
```python
class Swipe(SQLModel, table=True):
    id: int
    candidate_id: int
    company_id: int
    job_profile_id: int
    job_posting_id: int
    action: str  # "like", "pass", "ask_to_apply"
    action_by: str  # "candidate" or "recruiter"
    created_at: datetime
```

**Database Operations:**
- `INSERT` when swiping (swipes.py → `create_swipe()`)
- `SELECT` to check for mutual swipes (matches.py)

**Matching Logic:**
```python
# Check if mutual like exists
candidate_swipe = SELECT Swipe WHERE candidate_id=X, job_posting_id=Y, action="like"
recruiter_swipe = SELECT Swipe WHERE company_id=Z, candidate_id=X, action="like"

if candidate_swipe AND recruiter_swipe:
    # Create Match record
    INSERT INTO Match (candidate_id, company_id, ...)
```

---

#### 8. **Match** (Mutual Match)
```python
class Match(SQLModel, table=True):
    id: int
    candidate_id: int
    company_id: int
    job_profile_id: int
    job_posting_id: int
    match_percentage: float
    candidate_liked: bool
    company_liked: bool
    created_at: datetime
```

**Database Operations:**
- `INSERT` when both parties like each other (swipes.py)
- `SELECT` for match feed (matches.py → `get_mutual_matches()`)

**UI Connection:**
- "Matches" page → GET `/matches/mutual`
- Shows only matches where `candidate_liked=true AND company_liked=true`

---

#### 9. **Meeting** (Interview Scheduler)
```python
class Meeting(SQLModel, table=True):
    id: int
    title: str
    meeting_type: MeetingType  # interview/screening/follow_up
    status: MeetingStatus  # scheduled/cancelled/rescheduled/completed
    scheduled_start: datetime
    scheduled_end: datetime
    organizer_user_id: int
    job_posting_id: int (optional)
    application_id: int (optional)
    video_meeting_url: str (optional)
    video_provider: str  # zoom/teams/meet
    participants: List[MeetingParticipant]
```

**Database Operations:**
- `INSERT` when scheduling (meetings.py → `create_meeting()`)
- `UPDATE status` when cancelling/rescheduling
- `SELECT` for calendar view (calendar.py → `get_meetings()`)

**Scheduling Conflict Check:**
```python
def check_availability_conflict(user_id, start, end):
    query = SELECT Meeting
            JOIN MeetingParticipant ON meeting.id = participant.meeting_id
            WHERE participant.user_id = user_id
            AND meeting.status = 'scheduled'
            AND (start < meeting.scheduled_end AND end > meeting.scheduled_start)
    return len(query.all()) > 0
```

---

#### 10. **Notification** (In-App Notifications)
```python
class Notification(SQLModel, table=True):
    id: int
    user_id: int
    type: str  # general/message/alert
    title: str
    message: str
    event_type: str  # match_found/application_status/interview_scheduled/etc.
    is_read: bool (default: False)
    read_at: datetime (optional)
    payload: str (JSON)  # Navigation data for UI
    created_at: datetime
```

**Database Operations:**
- `INSERT` when event occurs (notification_service.py → `send_notification()`)
- `UPDATE is_read=true` when user clicks (notifications.py → `mark_as_read()`)
- `SELECT unread` for badge count (notifications.py → `get_unread_count()`)

**Event Types:**
```
Candidate Events:
- application_status      → "Your application status changed"
- match_found             → "You matched with Company X!"
- interview_scheduled     → "Interview scheduled for Jan 15"
- message_received        → "New message from recruiter"

Recruiter Events:
- application_received    → "New application from John Doe"
- match_found             → "New match with candidate"
- interview_confirmed     → "Candidate confirmed interview"
```

**UI Connection:**
- Bell icon badge → GET `/notifications/unread-count`
- Notification list → GET `/notifications`
- Click notification → PATCH `/notifications/{id}/read` + navigate to `payload.route`

---

#### 11. **NotificationPreferences** (User Preferences)
```python
class NotificationPreferences(SQLModel, table=True):
    id: int
    user_id: int
    event_type: str  # Same as Notification.event_type
    in_app_enabled: bool (default: True)
    email_enabled: bool (default: True)
    in_app_frequency: NotificationFrequency  # realtime/daily/weekly
    email_frequency: NotificationFrequency
    priority: str  # urgent/normal/low
```

**Database Operations:**
- `SELECT` before sending notification (notification_service.py)
- `UPDATE` when user changes preferences (notification_preferences.py)

**Preference Logic:**
```python
# Before sending notification
preference = SELECT NotificationPreferences WHERE user_id=X, event_type='match_found'
if preference.in_app_enabled:
    create_in_app_notification()
if preference.email_enabled:
    queue_email()
else:
    skip_notification()
```

---

#### 12. **Message** (Direct Messaging)
```python
class Message(SQLModel, table=True):
    id: int
    conversation_id: int (foreign key)
    sender_user_id: int
    sender_role: str  # candidate/recruiter
    text: str
    is_read: bool
    read_at: datetime
    created_at: datetime
```

**Database Operations:**
- `INSERT` when sending message (messages.py → `send_message()`)
- `SELECT` for conversation thread (messages.py → `get_conversation()`)
- `UPDATE is_read` when viewing (messages.py → `mark_as_read()`)

**UI Connection:**
- Chat interface → POST `/messages/send`
- Fetch thread → GET `/messages/conversation/{conversation_id}`

---

#### 13. **SystemLog** (Comprehensive Logging)
```python
class SystemLog(SQLModel, table=True):
    id: int
    timestamp: datetime (indexed)
    level: str  # DEBUG/INFO/WARNING/ERROR/CRITICAL
    logger: str
    message: str
    module: str
    function: str
    line_number: int
    request_id: str (optional, indexed)
    user_id: int (optional, indexed)
    action: str (optional)
    entity_type: str (optional)
    entity_id: str (optional)
    log_metadata: str (JSON)
    exception: str (traceback)
```

**Database Operations:**
- `INSERT` automatically via `DatabaseLogHandler` (logging_config.py)
- `SELECT` for admin dashboard (logs.py → `get_logs()`)

**Logging Flow:**
```python
logger.info("User logged in", extra={
    "user_id": user.id,
    "action": "login",
    "request_id": request_id
})
# → Writes to logs/talentgraph_v2.log
# → Batches 100 logs → INSERT INTO systemlog
```

---

#### 14. **ActivityEvent** (Audit Trail)
```python
class ActivityEvent(SQLModel, table=True):
    id: int
    entity_type: str  # application/swipe/notification/match/job_posting
    entity_id: str
    action: str  # created/updated/deleted/liked/passed
    before_value: str (JSON snapshot)
    after_value: str (JSON snapshot)
    performed_by_user_id: int
    performed_by_role: str
    created_at: datetime
    request_id: str
    dedupe_key: str (optional)
```

**Database Operations:**
- `INSERT` in same transaction as mutation (audit.py → `log_activity_event()`)
- `SELECT` for audit trail (activity_feed.py)

**Audit Example:**
```python
# In applications.py
application = Application(...)
session.add(application)
session.flush()  # Get application.id

log_activity_event(
    session,
    entity_type="application",
    entity_id=application.id,
    action="created",
    performed_by_user=current_user,
    after_value=snap_application(application),
    dedupe_key=f"application:created:{candidate.id}:{job_posting_id}"
)
session.commit()
```

---

## API Endpoints & Routers

All routers are registered in `app/main.py`. Each router handles a specific domain.

### Authentication (`/auth`)

#### POST `/auth/signup`
**Function:** Register new user (candidate or company)  
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "user_type": "candidate",  // or "company"
  "full_name": "John Doe",
  "company_role": "recruiter"  // Only for company users
}
```

**Control Flow:**
1. **Validate `user_type`** (`if user_type not in ["candidate", "company"]` → 400 error)
2. **Check duplicate email** (`SELECT User WHERE email=X` → if exists, 400 error)
3. **Hash password** (`hash_password(password)` using Argon2)
4. **Map role** (`company_role → UserRole.RECRUITER`)
5. **Insert user** (`INSERT INTO User`)
6. **Create profile** (if company → `INSERT INTO Company`)
7. **Generate JWT** (`create_access_token()`)
8. **Return token** (used for all future requests)

**Database Impact:**
- 1 INSERT into `User`
- 1 INSERT into `Company` (if recruiter)

**UI Connection:**
- Signup form → calls this endpoint → stores token in localStorage → redirects to dashboard

---

#### POST `/auth/login`
**Function:** Authenticate user and return JWT token  
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Control Flow:**
1. **Query user** (`SELECT User WHERE email=X`)
2. **Verify password** (`verify_password(plain, hash)`)
3. **Check `is_active`** (`if not user.is_active` → 403 Forbidden)
4. **Create JWT** (includes `user_id`, `email`, `role`)
5. **Return token**

**Security Note:**
- JWT secret is loaded from `APP_JWT_SECRET` environment variable
- Token expires after `JWT_EXP_HOURS` (default: 24 hours)

---

### Candidates (`/candidates`)

#### POST `/candidates`
**Function:** Create candidate profile  
**Control Flow:**
1. **Extract user** from JWT token (`get_current_user()`)
2. **Validate user_id** (must be CANDIDATE role)
3. **Check duplicate** (`SELECT Candidate WHERE user_id=X`)
4. **Insert candidate** (`INSERT INTO Candidate`)
5. **Log activity** (`log_activity_event()`)

**Database Impact:**
- 1 INSERT into `Candidate`
- 1 INSERT into `ActivityEvent`

---

#### POST `/candidates/{candidate_id}/job-profiles`
**Function:** Create job profile with skills and locations  
**Request:**
```json
{
  "profile_name": "Senior Oracle Developer",
  "product_vendor": "Oracle",
  "job_role": "Developer",
  "years_of_experience": 5,
  "worktype": "remote",
  "employment_type": "ft",
  "salary_min": 100000,
  "salary_max": 150000,
  "skills": [
    {"skill_name": "PL/SQL", "skill_category": "technical", "proficiency_level": 5}
  ],
  "location_preferences": [
    {"city": "San Francisco", "state": "CA"}
  ]
}
```

**Control Flow:**
1. **Validate ownership** (candidate_id must match JWT user)
2. **Extract skills** (remove from main object)
3. **Insert job profile** (`INSERT INTO JobProfile`)
4. **Loop through skills** (`for skill in skills: INSERT INTO Skill`)
5. **Loop through locations** (`for loc in locations: INSERT INTO LocationPreference`)

**Database Impact:**
- 1 INSERT into `JobProfile`
- N INSERTs into `Skill`
- M INSERTs into `LocationPreference`

---

### Job Postings (`/job-postings`)

#### POST `/job-postings`
**Function:** Recruiter creates job posting  
**Control Flow:**
1. **Verify company role** (`require_company_role()`)
2. **Get company_id** (`SELECT Company WHERE user_id=X`)
3. **Extract skills** from request
4. **Insert job posting** (`INSERT INTO JobPosting`)
5. **Insert skills** (`for skill: INSERT INTO JobPostingSkill`)

**Database Impact:**
- 1 INSERT into `JobPosting`
- N INSERTs into `JobPostingSkill`

---

#### GET `/job-postings`
**Function:** Get all job postings (filtered by role)  
**Control Flow:**
```python
if user.role == CANDIDATE:
    # Show only active jobs
    query = SELECT JobPosting WHERE status IN ['active', 'reposted']
else:
    # Recruiter sees all their company's jobs
    query = SELECT JobPosting WHERE company_id IN (company_ids)
    if active_only:
        query = query.WHERE status IN ['active', 'reposted']
```

**Database Impact:**
- 1 SELECT with JOIN to `JobPostingSkill`

---

#### PATCH `/job-postings/{job_id}/status`
**Function:** Update job lifecycle (freeze/repost/cancel)  
**Request:**
```json
{
  "status": "frozen",
  "reason": "Position filled"
}
```

**Control Flow:**
1. **Verify ownership** (`verify_company_owns_job()`)
2. **Validate status transition** (e.g., cannot cancel if already cancelled)
3. **Update timestamps** (`frozen_at`, `reposted_at`, etc.)
4. **Update status** (`UPDATE JobPosting SET status=X`)
5. **Notify applicants** (if cancelled → send notifications)

**Status Transitions:**
```
active → frozen     ✅ (temporarily close)
frozen → reposted   ✅ (reactivate)
frozen → cancelled  ✅ (permanently close)
active → cancelled  ✅ (direct close)
cancelled → *       ❌ (terminal state)
```

---

### Applications (`/applications`)

#### POST `/applications/apply`
**Function:** Candidate applies to job  
**Request:**
```json
{
  "job_posting_id": 123,
  "job_profile_id": 456
}
```

**Control Flow:**
1. **Get candidate** from JWT
2. **Validate job profile ownership** (`job_profile.candidate_id == candidate.id`)
3. **Check job is active** (`if job_posting.status == FROZEN → 400 error`)
4. **Check duplicate application** (`SELECT Application WHERE candidate_id=X, job_posting_id=Y`)
5. **Create application** (`INSERT INTO Application`)
6. **Log activity** (`log_activity_event()`)
7. **Send notifications**:
   - Candidate: "Application submitted"
   - Recruiter: "New application received"

**Database Impact:**
- 1 INSERT into `Application`
- 1 INSERT into `ActivityEvent`
- 2 INSERTs into `Notification`
- 2 INSERTs into `EmailDelivery` (if email enabled)

---

#### PATCH `/applications/{application_id}/status`
**Function:** Recruiter updates application status  
**Request:**
```json
{
  "status": "shortlisted",
  "recruiter_notes": "Strong candidate"
}
```

**Control Flow:**
1. **Verify ownership** (company_id must match)
2. **Validate transition** (`validate_status_transition(current, new)`)
3. **Update application** (`UPDATE Application`)
4. **Send candidate notification** (status change)
5. **Log activity** (before/after snapshots)

**Status Transition Validation:**
```python
def validate_status_transition(current, new):
    allowed = STATUS_TRANSITIONS.get(current, [])
    if new not in allowed:
        raise HTTPException(400, f"Cannot transition from {current} to {new}")
```

---

### Meetings (`/meetings`)

#### POST `/meetings/create`
**Function:** Schedule interview with conflict checking  
**Request:**
```json
{
  "title": "Technical Interview - John Doe",
  "scheduled_start": "2026-05-01T10:00:00Z",
  "scheduled_end": "2026-05-01T11:00:00Z",
  "participants": [
    {"name": "John Doe", "email": "john@example.com"}
  ],
  "video_provider": "zoom",
  "application_id": 789
}
```

**Control Flow:**
1. **Resolve participants** (look up User by email)
2. **Check conflicts** (for each participant):
```python
for user_id in all_participants:
    has_conflict = check_availability_conflict(user_id, start, end)
    if has_conflict:
        raise HTTPException(409, "Scheduling conflict")
```
3. **Generate video link** (if Zoom/Teams configured):
```python
provider = VideoProviderFactory.get_provider("zoom", api_key, secret)
meeting_url = provider.create_meeting(title, start_time, duration)
```
4. **Insert meeting** (`INSERT INTO Meeting`)
5. **Insert participants** (`for p: INSERT INTO MeetingParticipant`)
6. **Send emails** (with calendar invites)
7. **Create timeline event** (`INSERT INTO MeetingTimelineEvent`)

**Database Impact:**
- 1 INSERT into `Meeting`
- N INSERTs into `MeetingParticipant`
- 1 INSERT into `MeetingTimelineEvent`
- N email sends

---

#### POST `/meetings/{meeting_id}/cancel`
**Function:** Cancel meeting  
**Request:**
```json
{
  "reason": "Candidate withdrew application"
}
```

**Control Flow:**
1. **Update status** (`UPDATE Meeting SET status='cancelled'`)
2. **Record cancellation** (`cancelled_at`, `cancelled_by_user_id`, `reason`)
3. **Notify participants** (cancellation email)
4. **Delete calendar events** (Google/Microsoft API calls)
5. **Log timeline** (`INSERT INTO MeetingTimelineEvent`)

---

#### POST `/meetings/{meeting_id}/reschedule-request`
**Function:** Candidate requests reschedule  
**Control Flow:**
1. **Update status** (`status='reschedule_requested'`)
2. **Store request details** (`reschedule_requested_at`, `reason`, `preferred_times`)
3. **Notify recruiter** ("Candidate requested reschedule")
4. **Wait for recruiter response** (recruiter can approve/reject)

---

### Swipes (`/swipes`)

#### POST `/swipes`
**Function:** Like/pass on a match  
**Request:**
```json
{
  "candidate_id": 123,
  "job_posting_id": 456,
  "job_profile_id": 789,
  "action": "like"  // or "pass"
}
```

**Control Flow:**
1. **Insert swipe** (`INSERT INTO Swipe`)
2. **Check for mutual match**:
```python
if action == "like":
    # Check opposite party's swipe
    opposite_swipe = SELECT Swipe WHERE 
        (candidate swiped on recruiter OR recruiter swiped on candidate)
        AND action='like'
    
    if opposite_swipe:
        # Mutual match!
        INSERT INTO Match (candidate_liked=True, company_liked=True)
        send_notification(user_id, "match_found", "You matched!")
```

**Database Impact:**
- 1 INSERT into `Swipe`
- 1 INSERT into `Match` (if mutual)
- 2 INSERTs into `Notification` (if mutual)

---

### Notifications (`/notifications`)

#### GET `/notifications`
**Function:** Get user's notifications  
**Response:**
```json
[
  {
    "id": 1,
    "title": "New Match!",
    "message": "You matched with Tech Corp",
    "event_type": "match_found",
    "is_read": false,
    "created_at": "2026-04-29T10:00:00Z",
    "payload": {
      "route": "/matches",
      "match_id": 123
    }
  }
]
```

**Control Flow:**
```python
# Get user from JWT
user_id = current_user["user_id"]

# Query notifications
query = SELECT Notification WHERE user_id=X ORDER BY created_at DESC

if unread_only:
    query = query.WHERE is_read=False

return query.all()
```

---

#### PATCH `/notifications/{notification_id}/read`
**Function:** Mark notification as read  
**Control Flow:**
1. **Update notification** (`UPDATE Notification SET is_read=True, read_at=NOW()`)
2. **Return success**

---

#### GET `/notifications/unread-count`
**Function:** Get badge count for UI  
**Response:**
```json
{
  "unread_count": 5
}
```

**Control Flow:**
```python
count = SELECT COUNT(*) FROM Notification 
        WHERE user_id=X AND is_read=False
return {"unread_count": count}
```

---

### Messages (`/messages`)

#### POST `/messages/send`
**Function:** Send message in conversation  
**Request:**
```json
{
  "conversation_id": 123,
  "text": "When can we schedule the interview?"
}
```

**Control Flow:**
1. **Validate conversation membership** (user must be participant)
2. **Insert message** (`INSERT INTO Message`)
3. **Update conversation** (`UPDATE Conversation SET last_message_at=NOW()`)
4. **Send push notification** (to recipient)

---

#### GET `/messages/conversation/{conversation_id}`
**Function:** Get conversation thread  
**Response:**
```json
{
  "conversation": {...},
  "messages": [
    {
      "id": 1,
      "sender_user_id": 123,
      "text": "Hello!",
      "created_at": "2026-04-29T10:00:00Z",
      "is_read": true
    }
  ]
}
```

---

## Core Services

Services contain business logic separated from routers.

### NotificationService (`services/notification_service.py`)

**Purpose:** Centralized notification creation with preference support

**Key Function:**
```python
@staticmethod
def send_notification(
    session: Session,
    user_id: int,
    event_type: str,
    title: str,
    message: str,
    payload: dict = None,
    email_data: dict = None,
    commit: bool = True
) -> Optional[Notification]:
```

**Control Flow:**
1. **Validate event_type** (must be in registry)
2. **Check deduplication** (prevent duplicate notifications within time window)
3. **Get user preferences** (`SELECT NotificationPreferences WHERE user_id=X, event_type=Y`)
4. **Send in-app notification** (if enabled):
```python
if preference.in_app_enabled:
    notification = Notification(...)
    session.add(notification)
```
5. **Queue email** (if enabled):
```python
if preference.email_enabled:
    queue_notification_email(
        notification_id=notification.id,
        recipient_email=user.email,
        event_type=event_type,
        email_data=email_data
    )
```

**Deduplication Logic:**
```python
if should_deduplicate(event_type):
    cutoff_time = now - timedelta(minutes=get_dedup_window(event_type))
    recent = SELECT Notification WHERE 
        user_id=X AND event_type=Y AND created_at >= cutoff_time
    if recent:
        return recent  # Skip duplicate
```

---

### MeetingService (`services/meeting_service.py`)

**Purpose:** Meeting scheduling logic and conflict resolution

**Key Functions:**

#### `check_availability_conflict(user_id, start, end)`
```python
query = SELECT Meeting 
        JOIN MeetingParticipant ON meeting.id = participant.meeting_id
        WHERE participant.user_id = user_id
        AND meeting.status = 'scheduled'
        AND start < meeting.scheduled_end
        AND end > meeting.scheduled_start
return len(query.all()) > 0
```

#### `find_available_slots(user_ids, duration, start_range, end_range)`
```python
slots = []
current = start_range
while current + duration <= end_range:
    all_available = True
    for user_id in user_ids:
        if check_availability_conflict(user_id, current, current + duration):
            all_available = False
            break
    if all_available:
        slots.append({"start": current, "end": current + duration})
    current += timedelta(hours=1)
return slots
```

---

### LifecycleService (`services/lifecycle_service.py`)

**Purpose:** Automated job expiration and warnings

**Key Functions:**

#### `check_expiring_jobs(session, warning_days=3)`
```python
cutoff_date = now + timedelta(days=warning_days)
expiring_jobs = SELECT JobPosting WHERE 
    status='active' AND end_date <= cutoff_date

for job in expiring_jobs:
    # Send warning to recruiter
    send_notification(
        recruiter_user_id,
        "job_expiring_soon",
        f"Job expires in {warning_days} days"
    )
```

#### `auto_freeze_expired_jobs(session)`
```python
expired_jobs = SELECT JobPosting WHERE 
    status='active' AND end_date < now()

for job in expired_jobs:
    job.status = JobPostingStatus.FROZEN
    job.frozen_at = now()
    session.add(job)
    
    # Notify recruiter
    send_notification(recruiter_id, "job_expired", "Job auto-frozen")
session.commit()
```

**Triggered By:** Background worker runs every hour (lifecycle_worker.py)

---

### EmailService (`services/email_service.py`)

**Purpose:** Email template rendering and SMTP delivery

**Key Function:**
```python
def render_email_template(template_name: str, data: dict) -> str:
    """Render Jinja2 template with data"""
    template = env.get_template(template_name)
    return template.render(**data)

def send_email(to: str, subject: str, html_body: str):
    """Send email via SMTP"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM
    msg['To'] = to
    
    html_part = MIMEText(html_body, 'html')
    msg.attach(html_part)
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
```

**Email Templates:**
- `application_status_changed.html`
- `interview_scheduled.html`
- `match_found.html`
- `job_expiration_warning.html`

---

### VideoProviderFactory (`services/video_providers.py`)

**Purpose:** Integration with Zoom/Teams/Meet

**Key Function:**
```python
@staticmethod
def get_provider(provider: str, api_key: str, **kwargs):
    if provider == VideoProvider.ZOOM:
        return ZoomProvider(api_key, api_secret)
    elif provider == VideoProvider.MICROSOFT_TEAMS:
        return TeamsProvider(access_token)
    elif provider == VideoProvider.GOOGLE_MEET:
        return GoogleMeetProvider(credentials)

class ZoomProvider:
    def create_meeting(self, title, start_time, duration):
        # Call Zoom API
        response = requests.post(
            "https://api.zoom.us/v2/users/me/meetings",
            headers={"Authorization": f"Bearer {self.access_token}"},
            json={
                "topic": title,
                "start_time": start_time.isoformat(),
                "duration": duration
            }
        )
        return response.json()["join_url"]
```

---

## Security & Authentication

All security logic is in `app/security.py`.

### Password Hashing

**Function:** `hash_password(password: str) -> str`
```python
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password[:128])  # Truncate to 128 chars
```

**Why Argon2?**
- Memory-hard (resistant to GPU cracking)
- Winner of Password Hashing Competition (2015)
- Fallback to bcrypt for backward compatibility

---

### JWT Token Creation

**Function:** `create_access_token(data: dict) -> str`
```python
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    to_encode.update({
        "exp": expire,  # Expiration timestamp
        "iat": datetime.now(timezone.utc)  # Issued at
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
```

**Token Payload:**
```json
{
  "sub": "user@example.com",
  "user_id": 123,
  "email": "user@example.com",
  "role": "candidate",
  "exp": 1714401234,
  "iat": 1714314834
}
```

---

### Token Validation

**Function:** `get_current_user(authorization: str) -> dict`
```python
async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(401, "Missing authorization header")
    
    scheme, token = authorization.split(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(401, "Invalid auth scheme")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

**Usage in Endpoints:**
```python
@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    # ... fetch profile
```

---

### Role-Based Access Control

**Decorators:**
```python
def require_candidate_role(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "candidate":
        raise HTTPException(403, "Candidate role required")
    return current_user

def require_company_role(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["recruiter", "hr", "admin"]:
        raise HTTPException(403, "Company role required")
    return current_user
```

**Usage:**
```python
@router.post("/job-postings")
def create_job(
    data: JobPostingCreate,
    current_user: dict = Depends(require_company_role)  # Only recruiters
):
    # ...
```

---

### Ownership Verification

**Function:** `verify_company_owns_job(session, company_id, job_id)`
```python
def verify_company_owns_job(session, company_id, job_id):
    job = session.get(JobPosting, job_id)
    if not job or job.company_id != company_id:
        raise HTTPException(403, "Unauthorized to access this job")
```

**Usage:**
```python
@router.patch("/job-postings/{job_id}")
def update_job(job_id: int, current_user: dict = Depends(require_company_role)):
    company_id = get_user_company_id(session, current_user["user_id"])
    verify_company_owns_job(session, company_id, job_id)
    # ... proceed with update
```

---

## Background Workers

Background tasks run via **APScheduler** (configured in `workers/scheduler.py`).

### Lifecycle Worker (`workers/lifecycle_worker.py`)

**Schedule:** Runs every hour  
**Purpose:** Auto-freeze expired jobs and send warnings

```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

@scheduler.scheduled_job('interval', hours=1)
def lifecycle_check_job():
    with Session(engine) as session:
        service = LifecycleService()
        
        # 3-day warnings
        service.check_expiring_jobs(session, warning_days=3)
        
        # 1-day urgent warnings
        service.check_expiring_jobs(session, warning_days=1)
        
        # Auto-freeze expired jobs
        service.auto_freeze_expired_jobs(session)

scheduler.start()
```

**Control Flow:**
1. **Query expiring jobs** (`end_date BETWEEN now AND now+3days`)
2. **Send warnings** (to recruiter)
3. **Query expired jobs** (`end_date < now AND status='active'`)
4. **Update status** (`UPDATE JobPosting SET status='frozen'`)

---

### Email Worker (`workers/email_worker.py`)

**Schedule:** Processes queue every 30 seconds  
**Purpose:** Async email delivery with retry logic

```python
@scheduler.scheduled_job('interval', seconds=30)
def process_email_queue():
    with Session(engine) as session:
        # Get pending emails
        pending = session.exec(
            select(EmailDelivery)
            .where(EmailDelivery.status == 'queued')
            .where(EmailDelivery.attempts < EmailDelivery.max_attempts)
        ).all()
        
        for email in pending:
            try:
                send_email(email.recipient_email, email.subject, email.html_body)
                email.status = 'sent'
                email.sent_at = datetime.utcnow()
            except Exception as e:
                email.attempts += 1
                email.last_error = str(e)
                if email.attempts >= email.max_attempts:
                    email.status = 'failed'
            session.add(email)
        session.commit()
```

---

### Reminder Worker (`workers/reminder_worker.py`)

**Schedule:** Runs every 15 minutes  
**Purpose:** Send meeting reminders (24h before, 1h before)

```python
@scheduler.scheduled_job('interval', minutes=15)
def send_meeting_reminders():
    now = datetime.utcnow()
    
    # 24-hour reminders
    tomorrow = now + timedelta(hours=24)
    meetings_24h = SELECT Meeting WHERE 
        status='scheduled' AND 
        scheduled_start BETWEEN now AND tomorrow
    
    for meeting in meetings_24h:
        for participant in meeting.participants:
            if not participant.reminder_sent_24h:
                send_notification(participant.user_id, "meeting_reminder_24h", ...)
                participant.reminder_sent_24h = True
    
    # 1-hour reminders (similar logic)
```

---

## Middleware & Request Flow

### Request Flow Overview

```
1. Client sends request with JWT token
   ↓
2. CORSMiddleware (handles preflight OPTIONS)
   ↓
3. RequestIdMiddleware (assigns unique request_id)
   ↓
4. ChangeTrackingMiddleware (logs request/response)
   ↓
5. Router endpoint (validates JWT, executes logic)
   ↓
6. Database transaction (INSERT/UPDATE/SELECT)
   ↓
7. Response returned to client
   ↓
8. Middleware logs response (if configured)
```

---

### RequestIdMiddleware (`middleware/request_id.py`)

**Purpose:** Assign unique ID to each request for tracing

```python
class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```

**Usage:** Access in endpoints via `request.state.request_id`

---

### ChangeTrackingMiddleware (`middleware/change_tracking.py`)

**Purpose:** Auto-log all mutations

```python
class ChangeTrackingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request
        logger.info(f"[REQUEST] {request.method} {request.url}", extra={
            "request_id": request.state.request_id,
            "user_id": getattr(request.state, "user_id", None)
        })
        
        response = await call_next(request)
        
        # Log response
        logger.info(f"[RESPONSE] {response.status_code}", extra={
            "request_id": request.state.request_id
        })
        
        return response
```

---

### CORS Configuration (`main.py`)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept"]
)
```

**Why CORS?**
- Frontend (React) runs on `localhost:3000`
- Backend (FastAPI) runs on `localhost:8001`
- Browser blocks cross-origin requests without CORS headers

---

## Control Flow Examples

### Example 1: Application Flow (Candidate Applies to Job)

**Endpoint:** POST `/applications/apply`

```
Step 1: UI sends request
POST /applications/apply
Authorization: Bearer <JWT_TOKEN>
{
  "job_posting_id": 123,
  "job_profile_id": 456
}

Step 2: Middleware processing
→ RequestIdMiddleware: Assigns request_id="abc-123"
→ ChangeTrackingMiddleware: Logs "[REQUEST] POST /applications/apply"

Step 3: JWT validation
→ get_current_user() extracts user_id=789 from token

Step 4: Business logic (applications.py)
→ SELECT User WHERE id=789
→ SELECT Candidate WHERE user_id=789  → candidate_id=100
→ SELECT JobProfile WHERE id=456
   ✓ Validate: job_profile.candidate_id == 100
→ SELECT JobPosting WHERE id=123
   ✓ Validate: job_posting.status != 'frozen'
→ SELECT Application WHERE candidate_id=100, job_posting_id=123
   ✓ Validate: No duplicate application

Step 5: Database mutation
→ BEGIN TRANSACTION
→ INSERT INTO Application (
    candidate_id=100,
    job_posting_id=123,
    job_profile_id=456,
    status='applied',
    applied_at=NOW()
  )  → application_id=999
→ FLUSH (get application_id)

Step 6: Audit logging
→ INSERT INTO ActivityEvent (
    entity_type='application',
    entity_id='999',
    action='created',
    performed_by_user_id=789,
    after_value='{"status": "applied", ...}'
  )

Step 7: Notifications
→ NotificationService.send_notification(
    user_id=789,  # Candidate
    event_type='application_submitted',
    title='✅ Application Submitted',
    message='Your application for Software Engineer has been submitted'
  )
  → INSERT INTO Notification (user_id=789, ...)
  → INSERT INTO EmailDelivery (user_id=789, status='queued', ...)

→ NotificationService.send_notification(
    user_id=555,  # Recruiter
    event_type='application_received',
    title='📎 New Application',
    message='John Doe applied for Software Engineer'
  )
  → INSERT INTO Notification (user_id=555, ...)
  → INSERT INTO EmailDelivery (user_id=555, status='queued', ...)

→ COMMIT TRANSACTION

Step 8: Response
{
  "message": "Application submitted successfully",
  "application_id": 999
}

Step 9: Background processing
→ Email worker picks up queued emails (30s later)
→ Sends 2 emails via SMTP
→ UPDATE EmailDelivery SET status='sent', sent_at=NOW()

Step 10: UI updates
→ Frontend shows success toast
→ Redirects to /candidate/applications
→ Application appears in list
```

---

### Example 2: Matching Flow (Mutual Like)

**Endpoint:** POST `/swipes`

```
Scenario: Candidate likes job, recruiter already liked candidate

Step 1: Candidate swipes "like"
POST /swipes
{
  "candidate_id": 100,
  "job_posting_id": 123,
  "action": "like"
}

Step 2: Insert swipe
→ INSERT INTO Swipe (
    candidate_id=100,
    company_id=50,
    job_posting_id=123,
    job_profile_id=456,
    action='like',
    action_by='candidate'
  )

Step 3: Check for mutual match
→ SELECT Swipe WHERE 
    company_id=50 AND 
    job_posting_id=123 AND 
    candidate_id=100 AND 
    action='like' AND 
    action_by='recruiter'
  → Found match!

Step 4: Create Match record
→ INSERT INTO Match (
    candidate_id=100,
    company_id=50,
    job_profile_id=456,
    job_posting_id=123,
    candidate_liked=True,
    company_liked=True,
    match_percentage=85.5,
    created_at=NOW()
  ) → match_id=777

Step 5: Send mutual match notifications
→ INSERT INTO Notification (
    user_id=789,  # Candidate
    event_type='match_found',
    title='🎉 New Match!',
    message='You matched with Tech Corp',
    payload='{"route": "/matches", "match_id": 777}'
  )

→ INSERT INTO Notification (
    user_id=555,  # Recruiter
    event_type='match_found',
    title='🎉 New Match!',
    message='You matched with John Doe',
    payload='{"route": "/matches", "match_id": 777}'
  )

Step 6: UI updates
→ Both users see notification badge increase
→ Match appears in /matches page
→ Chat becomes available
```

---

### Example 3: Meeting Scheduling with Conflict Check

**Endpoint:** POST `/meetings/create`

```
Step 1: Recruiter schedules interview
POST /meetings/create
{
  "title": "Technical Interview - John Doe",
  "scheduled_start": "2026-05-01T10:00:00Z",
  "scheduled_end": "2026-05-01T11:00:00Z",
  "participants": [{"name": "John Doe", "email": "john@example.com"}],
  "video_provider": "zoom"
}

Step 2: Resolve participants
→ SELECT User WHERE email='john@example.com' → user_id=789

Step 3: Conflict checking (for all participants)
For user_id=555 (recruiter):
→ SELECT Meeting 
    JOIN MeetingParticipant ON meeting.id = participant.meeting_id
    WHERE participant.user_id=555
    AND meeting.status='scheduled'
    AND '2026-05-01T10:00:00' < meeting.scheduled_end
    AND '2026-05-01T11:00:00' > meeting.scheduled_start
  → No conflicts ✓

For user_id=789 (candidate):
→ Same query with user_id=789
  → Conflict found! ✗

Step 4: Return error
{
  "detail": "User 789 has a scheduling conflict at this time"
}

Alternative: If no conflicts
→ Generate Zoom link (if configured)
  → Call Zoom API: POST https://api.zoom.us/v2/users/me/meetings
  → Get join_url="https://zoom.us/j/123456789"

→ INSERT INTO Meeting (
    title='Technical Interview - John Doe',
    scheduled_start='2026-05-01T10:00:00',
    scheduled_end='2026-05-01T11:00:00',
    organizer_user_id=555,
    video_meeting_url='https://zoom.us/j/123456789',
    status='scheduled'
  ) → meeting_id=888

→ INSERT INTO MeetingParticipant (meeting_id=888, user_id=555)
→ INSERT INTO MeetingParticipant (meeting_id=888, user_id=789)

→ Send email invitations (with calendar .ics file)
→ INSERT INTO Notification (both users)
```

---

### Example 4: Job Lifecycle Automation

**Background Worker:** lifecycle_worker.py (runs every hour)

```
Step 1: Check for expiring jobs (3-day warning)
→ cutoff = NOW() + 3 days
→ SELECT JobPosting WHERE 
    status='active' AND 
    end_date <= cutoff AND 
    end_date > NOW()
  → Found 5 jobs

Step 2: Send warnings to recruiters
For each job:
→ SELECT Company WHERE id=job.company_id → get user_id
→ NotificationService.send_notification(
    user_id=recruiter_user_id,
    event_type='job_expiring_soon',
    title='⚠️ Job Expiring in 3 Days',
    message='Your job "Software Engineer" expires on May 1'
  )

Step 3: Check for expired jobs
→ SELECT JobPosting WHERE 
    status='active' AND 
    end_date < NOW()
  → Found 2 jobs

Step 4: Auto-freeze expired jobs
For each expired job:
→ UPDATE JobPosting SET 
    status='frozen',
    frozen_at=NOW()
  WHERE id=job_id

→ NotificationService.send_notification(
    user_id=recruiter_user_id,
    event_type='job_expired',
    title='❌ Job Auto-Frozen',
    message='Your job "Backend Developer" has expired and been frozen'
  )

Step 5: Log activity
→ INSERT INTO SystemLog (
    level='INFO',
    message='Auto-frozen 2 expired jobs',
    action='auto_freeze_jobs'
  )
```

---

## Summary

This backend provides a complete **talent marketplace** with:

✅ **Authentication:** JWT-based with role-based access control  
✅ **Data Models:** 20+ SQLModel tables for users, jobs, applications, meetings, notifications  
✅ **API Endpoints:** 100+ REST endpoints organized by domain  
✅ **Business Logic:** Services for notifications, meetings, lifecycle management  
✅ **Security:** Password hashing (Argon2), token validation, ownership checks  
✅ **Background Jobs:** Email delivery, job expiration, meeting reminders  
✅ **Logging:** Comprehensive system with file + database persistence  
✅ **Integrations:** Zoom/Teams/Meet, Google/Microsoft Calendar  

**Key Control Patterns:**
- **Validation:** Input validation → ownership checks → business rules → database mutation
- **Transactions:** All mutations wrapped in transactions with audit logging
- **Notifications:** Preference-aware multi-channel delivery (in-app + email)
- **Async Processing:** Email queue + background workers for non-blocking operations

**Database Interaction:**
- **Reads:** Efficient queries with indexes on foreign keys, email, timestamps
- **Writes:** Transactional with audit trail (ActivityEvent + SystemLog)
- **Relationships:** SQLModel handles JOIN operations automatically

**UI Connection:**
- **Frontend:** React app on `localhost:3000`
- **Communication:** REST API with JSON payloads
- **Authentication:** JWT token in Authorization header
- **Real-time:** Polling for notifications (can upgrade to WebSockets)

This is a production-ready, scalable backend architecture following best practices for security, observability, and maintainability.
