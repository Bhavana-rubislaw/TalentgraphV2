# TalentGraph V2 - Complete Application Workflow Charts

## Table of Contents
1. [High-Level System Overview](#high-level-system-overview)
2. [User Authentication Flow](#user-authentication-flow)
3. [Candidate Complete Journey](#candidate-complete-journey)
4. [Recruiter Complete Journey](#recruiter-complete-journey)
5. [Matching Algorithm Flow](#matching-algorithm-flow)
6. [Application Lifecycle](#application-lifecycle)
7. [Interview Scheduling Flow](#interview-scheduling-flow)
8. [Notification System Flow](#notification-system-flow)
9. [Real-Time Messaging Flow](#real-time-messaging-flow)
10. [Job Lifecycle Management](#job-lifecycle-management)

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TALENTGRAPH V2 PLATFORM                          │
│                     Dating-Style Talent Marketplace                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
        ┌───────────▼──────────┐          ┌────────────▼──────────┐
        │   CANDIDATE SIDE     │          │   RECRUITER SIDE      │
        │  (Job Seekers)       │          │  (Companies/HR)       │
        └───────────┬──────────┘          └────────────┬──────────┘
                    │                                   │
        ┌───────────▼──────────┐          ┌────────────▼──────────┐
        │  1. Create Profile   │          │  1. Create Profile    │
        │  2. Build Job Prefs  │          │  2. Post Jobs         │
        │  3. Swipe on Jobs    │          │  3. Swipe on Talent   │
        │  4. Apply to Jobs    │          │  4. Review Apps       │
        │  5. Track Status     │          │  5. Schedule Meetings │
        │  6. Join Interviews  │          │  6. Manage Pipeline   │
        └───────────┬──────────┘          └────────────┬──────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │        CORE PLATFORM ENGINE       │
                    ├───────────────────────────────────┤
                    │  • Matching Algorithm (AI-based)  │
                    │  • Application Tracking           │
                    │  • Interview Scheduler            │
                    │  • Real-Time Notifications        │
                    │  • Direct Messaging               │
                    │  • Analytics & Reporting          │
                    └───────────────────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │         DATA LAYER                │
                    ├───────────────────────────────────┤
                    │  • PostgreSQL Database            │
                    │  • File Storage (Resumes/Certs)   │
                    │  • Email Queue                    │
                    │  • System Logs                    │
                    └───────────────────────────────────┘
```

---

Update the User Authentication Flow for TalentGraph V2.

Currently, after recruiter/company signup, the flow redirects directly to the Recruiter Dashboard. Change this behavior.

New required flow:

After successful recruiter/company signup:
1. Backend validates the signup request.
2. Backend checks duplicate email/company user.
3. Backend hashes the password.
4. Backend creates the User record.
5. Backend creates or links the Company/User role record.
6. Backend generates the JWT token.
7. Frontend stores the following in localStorage:
   - token
   - role=recruiter/hr/admin
   - user_id
   - email
   - company_role
8. Instead of redirecting directly to Recruiter Dashboard, redirect to Company/Profile Setup.

Company/Profile Setup should collect required company-person details such as:
- Full name
- Work email
- Company name
- Company role: Recruiter, HR, Admin
- Company website
- Company location
- Department/team
- Phone number
- LinkedIn profile
- Hiring focus or job categories
- Company description

After the profile setup form is completed and saved:
1. Call the company profile save API.
2. Store/update company profile completion status.
3. Mark recruiter/company onboarding as completed.
4. Redirect the user to the Recruiter Dashboard main app.

Also add route protection:
- If recruiter profile is incomplete, redirect to Company/Profile Setup.
- If recruiter profile is complete, allow access to Recruiter Dashboard.

The candidate flow should remain unchanged:
Candidate signup → localStorage → Candidate Profile Setup → Candidate Dashboard.

Final flow should be:

Candidate:
Signup/Login → Store token → Candidate Profile Setup → Candidate Dashboard

Recruiter/HR/Admin:
Signup/Login → Store token → Company/Profile Setup → Recruiter Dashboard


═══════════════════════════════════════════════════════════════
                        LOGIN FLOW
═══════════════════════════════════════════════════════════════

┌─────────────┐
│  User Has   │
│  Account    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Click "Sign In"    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Enter Credentials  │
│  • Email            │
│  • Password         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  POST /auth/login   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────┐
│  Backend Validates:     │
│  1. SELECT User         │
│  2. verify_password()   │
│  3. Check is_active     │
│  4. Create JWT token    │
└──────┬──────────────────┘
       │
       ├─────────────┬─────────────┐
       │ Success     │ Failed      │
       ▼             ▼             ▼
┌────────────┐  ┌──────────┐  ┌──────────┐
│ Store      │  │  Show    │  │  Show    │
│ token +    │  │  Error:  │  │  Error:  │
│ user data  │  │  Invalid │  │  Account │
└─────┬──────┘  │  Creds   │  │ Inactive │
      │         └──────────┘  └──────────┘
      │
      ▼
┌────────────────────────┐
│  AuthContext updates   │
│  • setUser(userData)   │
│  • bootStatus='done'   │
└─────┬──────────────────┘
      │
      ▼
┌────────────────────────┐
│  Navigate based on     │
│  role:                 │
│  • candidate →         │
│    /candidate-dashboard│
│  • recruiter/hr/admin →│
│    /recruiter-dashboard│
└────────────────────────┘
```

---

## Candidate Complete Journey

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    CANDIDATE COMPLETE JOURNEY                          ║
║                    From Signup to Job Offer                            ║
└═══════════════════════════════════════════════════════════════════════┘

PHASE 1: ONBOARDING (Day 1)
═══════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Sign Up      │
│ as Candidate │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Create Candidate Profile             │
│ POST /candidates/profile             │
│ • Name, Email, Phone                 │
│ • Address, Location                  │
│ • LinkedIn, GitHub, Portfolio        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Upload Resume & Certifications       │
│ POST /candidates/resumes/upload      │
│ POST /candidates/certifications/...  │
│ • Store files in uploads/            │
│ • Link to candidate record           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Create Job Profile(s)                │
│ POST /candidates/job-profiles        │
│ • Profile Name (e.g., "Sr Oracle")   │
│ • Product Vendor, Job Role           │
│ • Years of Experience                │
│ • Work Type (Remote/Hybrid/Onsite)   │
│ • Salary Range ($100k - $150k)       │
│ • Skills (PL/SQL 5/5, Python 4/5)    │
│ • Location Preferences (SF, NY, LA)  │
│ • Visa Status, Availability          │
└──────┬───────────────────────────────┘
       │
       │ Can create multiple profiles
       │ for different job types!
       ▼
┌──────────────────────────────────────┐
│ Profile Complete!                    │
│ Navigate to Dashboard                │
└──────┬───────────────────────────────┘
       │
       ▼


PHASE 2: JOB DISCOVERY (Day 1-7)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Candidate Dashboard Loads            │
│ Tab: Recommendations                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ GET /recommendations/dashboard       │
│ Backend runs matching algorithm:     │
│ • Compare job profiles to postings   │
│ • Calculate match % based on:        │
│   - Skills overlap                   │
│   - Salary range fit                 │
│   - Location match                   │
│   - Work type preference             │
│   - Experience level                 │
│ • Return top 20 matches (90%+ score) │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Swipe Interface Displays             │
│ ┌────────────────────────────────┐   │
│ │  🎯 92% Match                  │   │
│ │                                │   │
│ │  Software Engineer             │   │
│ │  Google Inc.                   │   │
│ │  $120k - $150k | Remote        │   │
│ │                                │   │
│ │  ✓ Python (5/5 match)          │   │
│ │  ✓ React (4/5 match)           │   │
│ │  ✓ AWS (5/5 match)             │   │
│ │                                │   │
│ │  [❌ Pass]  [✓ Like]           │   │
│ └────────────────────────────────┘   │
└──────┬───────────────────────────────┘
       │
       │ Candidate decides...
       │
       ├──────────────┬──────────────┐
       │ Pass         │ Like         │
       ▼              ▼              │
┌─────────────┐  ┌─────────────┐    │
│ POST /swipes│  │ POST /swipes│    │
│ /pass       │  │ /like       │    │
│             │  │             │    │
│ • Record    │  │ • Record    │    │
│   swipe     │  │   swipe     │    │
│ • Move to   │  │ • Check for │    │
│   next card │  │   mutual    │    │
└─────────────┘  └──────┬──────┘    │
                        │            │
                        ▼            │
                 ┌─────────────────┐ │
                 │ Backend checks: │ │
                 │ Did recruiter   │ │
                 │ already like    │ │
                 │ this candidate? │ │
                 └──────┬──────────┘ │
                        │            │
            ┌───────────┴─────────┐  │
            │ No Match            │  │ Yes - Mutual Match!
            ▼                     ▼  │
     ┌─────────────┐      ┌──────────────────┐
     │ Save like   │      │ CREATE Match     │
     │ Wait for    │      │ • candidate_liked│
     │ recruiter   │      │   = true         │
     └─────────────┘      │ • company_liked  │
                          │   = true         │
                          └──────┬───────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │ Send Notifications│
                          │ to BOTH parties: │
                          │ "🎉 New Match!"  │
                          └──────┬───────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │ Toast on screen: │
                          │ "You matched     │
                          │  with Google!"   │
                          └──────┬───────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │ Navigate to      │
                          │ ?tab=matches     │
                          └──────────────────┘


PHASE 3: APPLICATION (Day 1-30)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Matches Tab / Available Jobs Tab     │
│ Candidate sees matched jobs          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Click "Apply" Button                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /applications/apply             │
│ {                                    │
│   job_posting_id: 123,               │
│   job_profile_id: 456                │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Backend Validations:                     │
│ ✓ Job is active (not frozen)             │
│ ✓ No duplicate application               │
│ ✓ Job profile belongs to candidate       │
│                                           │
│ If valid:                                 │
│ • INSERT Application (status='applied')  │
│ • Log ActivityEvent (audit trail)        │
│ • Send notification to candidate         │
│ • Send notification to recruiter         │
│ • Queue email to recruiter               │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Success Response                     │
│ • Toast: "Application submitted!"    │
│ • Navigate to ?tab=applied           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Application Status: "Applied" 📝     │
│ Timestamp: Apr 30, 2026 10:15 AM     │
└──────────────────────────────────────┘


PHASE 4: STATUS TRACKING (Day 1-60)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Candidate checks "Applied" tab       │
│ GET /applications/my-applications    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ View All Applications with Status:   │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Software Engineer @ Google     │  │
│ │ Applied: Apr 30, 2026          │  │
│ │ Status: 📝 Applied             │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Backend Dev @ Microsoft        │  │
│ │ Applied: Apr 25, 2026          │  │
│ │ Status: ⏳ Under Review        │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Full Stack @ Amazon            │  │
│ │ Applied: Apr 20, 2026          │  │
│ │ Status: 🟢 Shortlisted         │  │
│ └────────────────────────────────┘  │
└──────────────────────────────────────┘
       │
       │ Recruiter updates status...
       │ (on their dashboard)
       ▼
┌──────────────────────────────────────┐
│ Backend: PATCH /applications/123/    │
│ status { status: 'shortlisted' }     │
│                                      │
│ • UPDATE Application.status          │
│ • UPDATE last_status_updated_at      │
│ • INSERT ActivityEvent (audit)       │
│ • Send notification to candidate     │
│ • Queue email notification           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Candidate receives notification:     │
│ 🔔 "Application Status Updated"      │
│ "Your application for Software       │
│  Engineer has been shortlisted!"     │
│                                      │
│ Click notification → navigate to     │
│ ?tab=applied&applicationId=123       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Status updated in UI:                │
│ 🟢 Shortlisted                       │
└──────────────────────────────────────┘


PHASE 5: INTERVIEW SCHEDULING (Day 7-45)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Recruiter schedules interview        │
│ (from Recruiter Dashboard)           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /meetings/create                │
│ {                                    │
│   title: "Tech Interview - John Doe",│
│   scheduled_start: "2026-05-05T...", │
│   scheduled_end: "2026-05-05T...",   │
│   participants: [{                   │
│     name: "John Doe",                │
│     email: "john@email.com"          │
│   }],                                │
│   video_provider: "zoom",            │
│   application_id: 123                │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Backend processes:                       │
│ 1. Validate participants exist           │
│ 2. Check availability conflicts:         │
│    • Query existing scheduled meetings   │
│    • For each participant                │
│    • In overlapping time range           │
│ 3. Generate Zoom link (if configured)    │
│ 4. INSERT Meeting record                 │
│ 5. INSERT MeetingParticipant records     │
│ 6. Send email invites (with .ics)        │
│ 7. Send in-app notifications             │
│ 8. UPDATE Application.status='scheduled' │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Candidate receives:                  │
│                                      │
│ 📧 Email:                            │
│ "Interview Scheduled"                │
│ • Calendar attachment (.ics)         │
│ • Zoom link                          │
│ • Date/time in local timezone        │
│                                      │
│ 🔔 In-App Notification:              │
│ "Interview Scheduled for May 5"      │
│ Click → Navigate to /meetings        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Candidate views in Meetings page:   │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Technical Interview            │  │
│ │ May 5, 2026 at 10:00 AM        │  │
│ │ Duration: 1 hour               │  │
│ │ Status: ✅ Scheduled           │  │
│ │                                │  │
│ │ [Join Zoom] [Cancel]           │  │
│ │ [Request Reschedule]           │  │
│ └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       │ On meeting day...
       │
       ▼
┌──────────────────────────────────────┐
│ 24 hours before:                     │
│ Background worker sends reminder     │
│ 📧 Email: "Interview Tomorrow"       │
│ 🔔 Notification reminder             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 1 hour before:                       │
│ 🔔 "Interview starting in 1 hour"    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Candidate clicks "Join Zoom"         │
│ • Opens video_meeting_url            │
│ • Interview proceeds                 │
└──────┬───────────────────────────────┘
       │
       │ After interview...
       │
       ▼
┌──────────────────────────────────────┐
│ Recruiter marks meeting:             │
│ PATCH /meetings/123                  │
│ { status: 'completed' }              │
│                                      │
│ UPDATE Application.status =          │
│   'under_review' or 'selected'       │
└──────────────────────────────────────┘


PHASE 6: FINAL DECISION (Day 30-90)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Recruiter updates final status:      │
│                                      │
│ Option A: SELECTED ✅                │
│ PATCH /applications/123/status       │
│ { status: 'selected' }               │
│                                      │
│ Option B: REJECTED ❌                │
│ { status: 'rejected' }               │
└──────┬───────────────────────────────┘
       │
       ├──────────────────┬─────────────────┐
       │ SELECTED         │ REJECTED        │
       ▼                  ▼                 │
┌─────────────────┐  ┌──────────────────┐ │
│ 🎉 SUCCESS!     │  │ ❌ Not Selected  │ │
│                 │  │                  │ │
│ Notification:   │  │ Notification:    │ │
│ "Congratulations│  │ "Thank you for   │ │
│  You've been    │  │  your interest"  │ │
│  selected!"     │  │                  │ │
│                 │  │ Keep applying!   │ │
│ Status: ✅      │  │ Status: ❌       │ │
│ Selected        │  │ Rejected         │ │
└─────────────────┘  └──────────────────┘ │
       │                                    │
       │ (Terminal states - no more changes)│
       │                                    │
       ▼                                    ▼
┌─────────────────────────────────────────────┐
│ Journey Complete!                           │
│ Candidate can continue with other apps      │
└─────────────────────────────────────────────┘
```

---

## Recruiter Complete Journey

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    RECRUITER COMPLETE JOURNEY                          ║
║                    From Signup to Hiring Candidate                     ║
└═══════════════════════════════════════════════════════════════════════┘

PHASE 1: SETUP (Day 1)
═══════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Sign Up as   │
│ Recruiter    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Create Company Profile               │
│ POST /company/profile                │
│ • Company Name                       │
│ • Company Email                      │
│ • Employee Type (Recruiter/HR/Admin) │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Create Job Posting                   │
│ POST /job-postings                   │
│ • Job Title: "Software Engineer"     │
│ • Product Vendor: "Oracle"           │
│ • Location: "San Francisco, CA"      │
│ • Work Type: Remote/Hybrid/Onsite    │
│ • Salary: $120k - $150k              │
│ • Skills Required:                   │
│   - Python (Technical, 8/10)         │
│   - React (Technical, 7/10)          │
│   - Communication (Soft, 9/10)       │
│ • Job Description (rich text)        │
│ • End Date: June 30, 2026            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Job Posted! Status: ACTIVE           │
│ Navigate to Recruiter Dashboard      │
└──────┬───────────────────────────────┘
       │
       ▼


PHASE 2: TALENT DISCOVERY (Day 1-7)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Recruiter Dashboard Loads            │
│ Tab: Recommendations                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Select Job from Dropdown:            │
│ [Software Engineer ▼]                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ GET /recommendations/job/123         │
│ Backend matching algorithm:          │
│ • Find candidates with matching:     │
│   - Skills (weighted by rating)      │
│   - Experience level                 │
│   - Salary expectations              │
│   - Location preferences             │
│   - Work type preference             │
│ • Calculate match score (0-100%)     │
│ • Return top 50 candidates           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Swipe Interface Displays             │
│ ┌────────────────────────────────┐   │
│ │  🎯 94% Match                  │   │
│ │                                │   │
│ │  John Doe                      │   │
│ │  Senior Developer              │   │
│ │  5 years experience            │   │
│ │  San Francisco, CA             │   │
│ │                                │   │
│ │  ✓ Python (5/5) 🔥            │   │
│ │  ✓ React (4/5) ✓              │   │
│ │  ✓ AWS (5/5) 🔥               │   │
│ │                                │   │
│ │  [Shortlist] [Pass]            │   │
│ └────────────────────────────────┘   │
└──────┬───────────────────────────────┘
       │
       │ Recruiter decides...
       │
       ├──────────────┬──────────────────┐
       │ Pass         │ Shortlist (Like) │
       ▼              ▼                  │
┌─────────────┐  ┌─────────────────┐    │
│ POST /swipes│  │ POST /swipes    │    │
│ /recruiter/ │  │ /recruiter/like │    │
│ pass        │  │                 │    │
│             │  │ • Record swipe  │    │
│ • Record    │  │ • Check mutual  │    │
│   and skip  │  │ • Add to        │    │
└─────────────┘  │   shortlist tab │    │
                 └──────┬──────────┘    │
                        │                │
                        ▼                │
                 ┌──────────────────┐   │
                 │ Candidate added  │   │
                 │ to Shortlist     │   │
                 └──────────────────┘   │


PHASE 3: APPLICATION REVIEW (Day 1-30)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Tab: Applications                    │
│ GET /applications?job_id=123         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ View All Applications:               │
│                                      │
│ Filters: [All Jobs ▼] [All Status ▼]│
│         [Search...] [Sort: Newest ▼] │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ John Doe                       │  │
│ │ Software Engineer              │  │
│ │ Applied: Apr 30, 2026          │  │
│ │ Status: [Applied ▼]            │  │
│ │ Notes: [Add internal notes...] │  │
│ │ [View Profile] [Schedule]      │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Jane Smith                     │  │
│ │ Software Engineer              │  │
│ │ Applied: Apr 28, 2026          │  │
│ │ Status: [Under Review ▼]       │  │
│ │ Notes: Strong Python skills    │  │
│ │ [View Profile] [Schedule]      │  │
│ └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       │ Recruiter reviews application...
       │
       ▼
┌──────────────────────────────────────┐
│ Click on application to expand       │
│ View full details:                   │
│ • Resume (download)                  │
│ • Certifications                     │
│ • Skills breakdown                   │
│ • Experience details                 │
│ • Cover letter                       │
│ • Match score breakdown              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Update Status (Status Dropdown):     │
│                                      │
│ Applied → [Under Review ▼]           │
│           [Shortlisted]              │
│           [Rejected]                 │
│                                      │
│ Under Review → [Shortlisted ▼]       │
│                [Selected]            │
│                [Rejected]            │
│                                      │
│ Shortlisted → [Selected ▼]           │
│               [Rejected]             │
└──────┬───────────────────────────────┘
       │
       │ Select "Shortlisted"
       │
       ▼
┌──────────────────────────────────────┐
│ PATCH /applications/123/status       │
│ {                                    │
│   status: 'shortlisted',             │
│   recruiter_notes: 'Strong candidate'│
│ }                                    │
│                                      │
│ Backend:                             │
│ • Validate status transition         │
│ • UPDATE Application                 │
│ • INSERT ActivityEvent (audit)       │
│ • Send notification to candidate     │
│ • Update timestamp                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Status updated in UI                 │
│ Candidate receives notification      │
└──────────────────────────────────────┘


PHASE 4: INTERVIEW COORDINATION (Day 7-45)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Click "Schedule Interview" button    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Schedule Interview Modal Opens       │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Title: [Tech Interview - John] │  │
│ │ Date: [May 5, 2026]            │  │
│ │ Time: [10:00 AM] [PST ▼]       │  │
│ │ Duration: [1 hour ▼]           │  │
│ │ Participants:                   │  │
│ │   • John Doe (candidate) ✓     │  │
│ │   • [Search interviewers...]   │  │
│ │ Video: [Zoom ▼]                │  │
│ │ [Check Availability]            │  │
│ │ [Schedule]                      │  │
│ └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Click "Check Availability"           │
│ GET /meetings/availability           │
│ • Query overlapping meetings         │
│ • For all participants               │
│ • Show conflicts if any              │
└──────┬───────────────────────────────┘
       │
       ├─────────────────┬──────────────┐
       │ No Conflicts    │ Conflict!    │
       ▼                 ▼              │
┌────────────────┐  ┌─────────────────┐│
│ ✓ All available│  │ ⚠️ John has     ││
│ [Schedule]     │  │ meeting 10-11am ││
└────────┬───────┘  │ Choose different││
       │            │ time slot       ││
       │            └─────────────────┘│
       │                               │
       ▼                               │
┌──────────────────────────────────────┐
│ POST /meetings/create                │
│ Backend:                             │
│ 1. INSERT Meeting                    │
│ 2. INSERT MeetingParticipants        │
│ 3. Generate Zoom link (API call)     │
│ 4. Send email invites                │
│ 5. Send notifications                │
│ 6. Update Application.status         │
│    = 'scheduled'                     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Success!                             │
│ • Modal closes                       │
│ • Toast: "Interview scheduled"       │
│ • Application status → Scheduled     │
│ • Appears in Meetings tab            │
└──────┬───────────────────────────────┘
       │
       │ On meeting day...
       │
       ▼
┌──────────────────────────────────────┐
│ Recruiter views Meetings page        │
│ Click "Join Zoom" at meeting time    │
│ • Conduct interview                  │
│ • Take notes                         │
└──────┬───────────────────────────────┘
       │
       │ After interview...
       │
       ▼
┌──────────────────────────────────────┐
│ Update Meeting Status:               │
│ PATCH /meetings/123                  │
│ { status: 'completed' }              │
│                                      │
│ Add notes to application             │
└──────────────────────────────────────┘


PHASE 5: FINAL DECISION (Day 30-60)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│ Applications Tab → Select applicant  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Review all interview feedback        │
│ Make hiring decision:                │
│                                      │
│ Status: [Shortlisted ▼]              │
│         • Selected ✅                │
│         • Rejected ❌                │
└──────┬───────────────────────────────┘
       │
       ├──────────────────┬─────────────┐
       │ SELECTED         │ REJECTED    │
       ▼                  ▼             │
┌─────────────────┐  ┌────────────────┐│
│ PATCH /         │  │ PATCH /        ││
│ applications/   │  │ applications/  ││
│ 123/status      │  │ 123/status     ││
│ {               │  │ {              ││
│   status:       │  │   status:      ││
│   'selected'    │  │   'rejected'   ││
│ }               │  │ }              ││
└────────┬────────┘  └────────┬───────┘│
         │                    │        │
         ▼                    ▼        │
┌─────────────────┐  ┌────────────────┐│
│ Backend sends:  │  │ Backend sends: ││
│ • Notification  │  │ • Notification ││
│ • Congrats email│  │ • Rejection    ││
│                 │  │   email        ││
│ Status becomes  │  │ Status becomes ││
│ TERMINAL (no    │  │ TERMINAL       ││
│ further changes)│  │                ││
└─────────────────┘  └────────────────┘│
         │                             │
         ▼                             │
┌──────────────────────────────────────┐
│ Track Analytics:                     │
│ • Time to hire                       │
│ • Applications per job               │
│ • Interview conversion rate          │
│ • Source of hire                     │
└──────────────────────────────────────┘
```

---

## Matching Algorithm Flow

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    MATCHING ALGORITHM FLOW                             ║
║                    How Candidates & Jobs are Matched                   ║
└═══════════════════════════════════════════════════════════════════════┘

INPUT SOURCES
═══════════════════════════════════════════════════════════════════════
┌─────────────────────┐          ┌──────────────────────┐
│  CANDIDATE PROFILE  │          │   JOB POSTING        │
├─────────────────────┤          ├──────────────────────┤
│ • Skills (w/ rating)│          │ • Skills (w/ rating) │
│ • Experience (years)│          │ • Experience required│
│ • Salary range      │          │ • Salary offered     │
│ • Location prefs    │          │ • Location           │
│ • Work type         │          │ • Work type          │
│ • Job role          │          │ • Job role           │
│ • Product vendor    │          │ • Product vendor     │
│ • Visa status       │          │ • Visa requirements  │
│ • Availability      │          │ • Start date         │
└─────────┬───────────┘          └──────────┬───────────┘
          │                                 │
          └────────────┬────────────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │  MATCHING ENGINE      │
           │  (Backend Algorithm)  │
           └───────────┬───────────┘
                       │
                       ▼


MATCHING ALGORITHM STEPS
═══════════════════════════════════════════════════════════════════════

Step 1: SKILLS MATCHING (40% weight)
─────────────────────────────────────
┌──────────────────────────────────────────┐
│ Compare each skill:                      │
│                                          │
│ Candidate Skills:        Job Needs:     │
│ • Python (5/5)    vs    • Python (8/10) │
│ • React (4/5)     vs    • React (7/10)  │
│ • AWS (5/5)       vs    • AWS (9/10)    │
│ • Docker (3/5)    vs    • Docker (5/10) │
│                                          │
│ Algorithm:                               │
│ for each required skill:                 │
│   if candidate has skill:                │
│     score += (candidate_level /          │
│               max_level) *               │
│               (job_rating / 10)          │
│   else:                                  │
│     penalty -= 10 points                 │
│                                          │
│ Skill Match Score: 38/40                │
│ (95% skills match)                       │
└──────────────────────────────────────────┘
                   │
                   ▼

Step 2: EXPERIENCE MATCHING (20% weight)
──────────────────────────────────────────
┌──────────────────────────────────────────┐
│ Compare experience:                      │
│                                          │
│ Candidate: 5 years                       │
│ Job requires: 3-7 years                  │
│                                          │
│ if candidate_exp >= min_exp:             │
│   if candidate_exp <= max_exp:           │
│     score = 20 (perfect fit)             │
│   else:                                  │
│     score = 15 (overqualified)           │
│ else:                                    │
│   score = 0 (underqualified)             │
│                                          │
│ Experience Match Score: 20/20            │
└──────────────────────────────────────────┘
                   │
                   ▼

Step 3: SALARY MATCHING (15% weight)
─────────────────────────────────────
┌──────────────────────────────────────────┐
│ Compare salary expectations:             │
│                                          │
│ Candidate expects: $100k - $150k         │
│ Job offers: $120k - $150k                │
│                                          │
│ overlap = max(0,                         │
│   min(cand_max, job_max) -               │
│   max(cand_min, job_min))                │
│                                          │
│ if overlap > 0:                          │
│   score = 15 * (overlap /                │
│            max(cand_range, job_range))   │
│ else:                                    │
│   score = 0                              │
│                                          │
│ Salary Match Score: 15/15                │
│ (perfect overlap)                        │
└──────────────────────────────────────────┘
                   │
                   ▼

Step 4: LOCATION MATCHING (10% weight)
───────────────────────────────────────
┌──────────────────────────────────────────┐
│ Compare location preferences:            │
│                                          │
│ Candidate prefers:                       │
│ • San Francisco, CA                      │
│ • New York, NY                           │
│ • Remote                                 │
│                                          │
│ Job location: San Francisco, CA          │
│                                          │
│ if exact_match:                          │
│   score = 10                             │
│ elif same_state:                         │
│   score = 7                              │
│ elif remote_accepted:                    │
│   score = 10                             │
│ else:                                    │
│   score = 0                              │
│                                          │
│ Location Match Score: 10/10              │
└──────────────────────────────────────────┘
                   │
                   ▼

Step 5: WORK TYPE MATCHING (10% weight)
────────────────────────────────────────
┌──────────────────────────────────────────┐
│ Compare work type preference:            │
│                                          │
│ Candidate prefers: Remote                │
│ Job offers: Remote                       │
│                                          │
│ if exact_match:                          │
│   score = 10                             │
│ elif flexible_match:                     │
│   score = 5 (e.g., hybrid matches remote)│
│ else:                                    │
│   score = 0                              │
│                                          │
│ Work Type Match Score: 10/10             │
└──────────────────────────────────────────┘
                   │
                   ▼

Step 6: ADDITIONAL FACTORS (5% weight)
───────────────────────────────────────
┌──────────────────────────────────────────┐
│ • Visa status compatibility              │
│ • Availability date vs start date        │
│ • Product vendor match                   │
│ • Job role alignment                     │
│                                          │
│ Bonus factors score: 5/5                 │
└──────────────────────────────────────────┘
                   │
                   ▼

FINAL SCORE CALCULATION
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────┐
│ Total Match Score:                       │
│                                          │
│ Skills:      38/40 (95%)                 │
│ Experience:  20/20 (100%)                │
│ Salary:      15/15 (100%)                │
│ Location:    10/10 (100%)                │
│ Work Type:   10/10 (100%)                │
│ Bonus:        5/5  (100%)                │
│ ─────────────────────────                │
│ TOTAL:       98/100                      │
│                                          │
│ 🎯 98% MATCH - EXCELLENT FIT!            │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Sort candidates by match score           │
│ Return top N (default: 20 for candidate, │
│              50 for recruiter)            │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ RECOMMENDATIONS DELIVERED                │
│ • Candidate sees best jobs               │
│ • Recruiter sees best candidates         │
│ • Display in swipe interface             │
└──────────────────────────────────────────┘
```

---

## Application Lifecycle

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    APPLICATION LIFECYCLE                               ║
║                    All Possible Status Transitions                     ║
└═══════════════════════════════════════════════════════════════════════┘

┌──────────────┐
│   APPLIED    │  ← Initial status when candidate applies
│     📝       │
└──────┬───────┘
       │
       │ Allowed transitions:
       │ → scheduled
       │ → under_review
       │ → shortlisted
       │ → rejected
       │
       ├─────────────────┬────────────────┬──────────────┐
       │                 │                │              │
       ▼                 ▼                ▼              ▼
┌─────────────┐   ┌──────────────┐  ┌──────────┐  ┌──────────┐
│ SCHEDULED   │   │ UNDER_REVIEW │  │SHORTLISTED│  │ REJECTED │
│    📅       │   │     ⏳       │  │   🟢     │  │   ❌     │
└─────┬───────┘   └──────┬───────┘  └────┬─────┘  └────┬─────┘
      │                  │                │             │
      │ Transitions:     │ Transitions:   │ Trans:      │ TERMINAL
      │ → under_review   │ → shortlisted  │ → selected  │ No more
      │ → shortlisted    │ → selected     │ → rejected  │ changes
      │ → selected       │ → rejected     │             │
      │ → rejected       │                │             │
      │                  │                │             │
      ├──────────────────┴────────┬───────┘             │
      │                           │                     │
      ▼                           ▼                     │
┌──────────────┐          ┌──────────────┐             │
│ SHORTLISTED  │          │   SELECTED   │             │
│     🟢       │          │      ✅      │             │
└──────┬───────┘          └──────┬───────┘             │
       │                         │                     │
       │ Transitions:            │ TERMINAL            │
       │ → selected              │ (Hired!)            │
       │ → rejected              │ No more changes     │
       │                         │                     │
       ├─────────────────────────┘                     │
       │                                               │
       ▼                                               ▼
┌──────────────┐                                ┌──────────────┐
│   SELECTED   │                                │   REJECTED   │
│      ✅      │                                │      ❌      │
└──────────────┘                                └──────────────┘
  TERMINAL STATE                                  TERMINAL STATE
  (Success!)                                      (Not selected)


STATUS TRANSITION RULES (Validation Matrix)
═══════════════════════════════════════════════════════════════════════

FROM          │ CAN TRANSITION TO
──────────────┼────────────────────────────────────────────────────────
applied       │ scheduled, under_review, shortlisted, rejected
scheduled     │ under_review, shortlisted, selected, rejected
under_review  │ shortlisted, selected, rejected
shortlisted   │ selected, rejected
selected      │ (none - terminal)
rejected      │ (none - terminal)


AUTOMATED STATUS UPDATES
═══════════════════════════════════════════════════════════════════════

Trigger: Interview Scheduled
─────────────────────────────
POST /meetings/create
  ↓
Backend automatically:
UPDATE Application SET status='scheduled'
WHERE application_id = meeting.application_id


Trigger: Job Posting Frozen/Cancelled
──────────────────────────────────────
POST /job-postings/{id}/status { action: 'freeze' }
  ↓
Backend sends notifications:
  To all applicants with status='applied' or 'scheduled':
  "Job posting has been temporarily closed"


NOTIFICATION TRIGGERS BY STATUS
═══════════════════════════════════════════════════════════════════════

Status Change              │ Notification Sent To
───────────────────────────┼──────────────────────────────────────────
* → applied                │ Candidate: "Application submitted"
                           │ Recruiter: "New application received"
───────────────────────────┼──────────────────────────────────────────
applied → scheduled        │ Candidate: "Interview scheduled"
───────────────────────────┼──────────────────────────────────────────
* → under_review           │ Candidate: "Application under review"
───────────────────────────┼──────────────────────────────────────────
* → shortlisted            │ Candidate: "You've been shortlisted!"
───────────────────────────┼──────────────────────────────────────────
* → selected               │ Candidate: "🎉 Congratulations! Selected"
───────────────────────────┼──────────────────────────────────────────
* → rejected               │ Candidate: "Thank you for your interest"


TIMING & SLA
═══════════════════════════════════════════════════════════════════════

Typical Timeline:
─────────────────
applied         → Day 0    (Candidate action)
under_review    → Day 1-3  (Recruiter reviews)
scheduled       → Day 3-7  (Interview scheduled)
shortlisted     → Day 7-14 (After interview)
selected        → Day 14-30 (Final decision)

Average Time to Hire: 21 days
```

---

## Interview Scheduling Flow

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    INTERVIEW SCHEDULING FLOW                           ║
║                    Complete Meeting Lifecycle                          ║
└═══════════════════════════════════════════════════════════════════════┘

PHASE 1: SCHEDULING
═══════════════════════════════════════════════════════════════════════
┌──────────────────────┐
│ Recruiter initiates  │
│ "Schedule Interview" │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Fill Meeting Form:                          │
│ • Title: "Tech Interview - John Doe"        │
│ • Date: May 5, 2026                         │
│ • Time: 10:00 AM (PST)                      │
│ • Duration: 1 hour                          │
│ • Participants:                             │
│   - John Doe (candidate) [auto-filled]      │
│   - Search: "interviewer name"              │
│ • Video provider: [Zoom ▼]                  │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Click "Check Availability"                  │
│ GET /meetings/availability                  │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│ Backend Conflict Check:                             │
│                                                     │
│ FOR EACH participant IN participants:               │
│   query = SELECT Meeting                            │
│           JOIN MeetingParticipant                   │
│           WHERE participant.user_id = user_id       │
│           AND meeting.status = 'scheduled'          │
│           AND meeting.scheduled_start < end_time    │
│           AND meeting.scheduled_end > start_time    │
│                                                     │
│   IF query returns results:                         │
│     conflicts.append(participant)                   │
│                                                     │
│ RETURN conflicts                                    │
└──────────┬──────────────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┐
           │ NO CONFLICTS     │ CONFLICT FOUND  │
           ▼                  ▼                 │
    ┌─────────────┐    ┌─────────────────────┐ │
    │ ✓ Available │    │ ⚠️ Conflicts:       │ │
    │ [Schedule]  │    │ • John: Meeting     │ │
    └──────┬──────┘    │   10-11 AM          │ │
           │           │ [Choose different   │ │
           │           │  time]              │ │
           │           └─────────────────────┘ │
           │                                   │
           ▼                                   │
┌──────────────────────────────────────────────┐
│ Click "Schedule"                             │
│ POST /meetings/create                        │
│ {                                            │
│   title: "...",                              │
│   scheduled_start: "2026-05-05T10:00:00Z",   │
│   scheduled_end: "2026-05-05T11:00:00Z",     │
│   participants: [...],                       │
│   video_provider: "zoom",                    │
│   application_id: 123                        │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ Backend Processing:                                  │
│                                                      │
│ 1. Validate participants (check users exist)        │
│ 2. Re-check conflicts (race condition safety)       │
│ 3. Generate video link:                             │
│    IF video_provider == 'zoom':                      │
│      zoom_api.create_meeting(...)                   │
│      video_url = response['join_url']               │
│    ELIF video_provider == 'teams':                  │
│      teams_api.create_online_meeting(...)           │
│ 4. INSERT Meeting record                            │
│    - status = 'scheduled'                           │
│    - video_meeting_url = video_url                  │
│ 5. INSERT MeetingParticipant records (one per user) │
│ 6. INSERT MeetingTimelineEvent:                     │
│    "Interview scheduled by [Recruiter]"             │
│ 7. Send email invites:                              │
│    FOR EACH participant:                            │
│      email_service.send(                            │
│        to=participant.email,                        │
│        subject="Interview Scheduled",               │
│        body=email_template,                         │
│        attachments=[calendar_invite.ics]            │
│      )                                              │
│ 8. Send in-app notifications                        │
│ 9. UPDATE Application.status = 'scheduled'          │
│                                                      │
│ COMMIT transaction                                   │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Success!                                     │
│ Response: {                                  │
│   meeting_id: 888,                           │
│   video_meeting_url: "https://zoom.us/...", │
│   status: "scheduled"                        │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼


PHASE 2: REMINDERS (Automated)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Background Worker (reminder_worker.py)       │
│ Runs every 15 minutes                        │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│ Check for meetings 24 hours away:                 │
│ now = datetime.utcnow()                            │
│ tomorrow = now + timedelta(hours=24)               │
│                                                    │
│ meetings_24h = SELECT Meeting                      │
│   WHERE status = 'scheduled'                       │
│   AND scheduled_start BETWEEN now AND tomorrow     │
│                                                    │
│ FOR EACH meeting IN meetings_24h:                  │
│   FOR EACH participant IN meeting.participants:    │
│     IF NOT participant.reminder_sent_24h:          │
│       send_notification(                           │
│         user_id=participant.user_id,               │
│         event_type='meeting_reminder_24h',         │
│         title='Interview Tomorrow',                │
│         message='Your interview is in 24 hours'    │
│       )                                            │
│       participant.reminder_sent_24h = True         │
└────────────┬───────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│ Check for meetings 1 hour away:                    │
│ one_hour = now + timedelta(hours=1)                │
│                                                    │
│ meetings_1h = SELECT Meeting                       │
│   WHERE status = 'scheduled'                       │
│   AND scheduled_start BETWEEN now AND one_hour     │
│                                                    │
│ (Similar logic for 1-hour reminder)                │
└────────────────────────────────────────────────────┘


PHASE 3: JOINING MEETING
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Meeting day arrives                          │
│ Participants view Meetings page              │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Upcoming Meetings List:                      │
│ ┌──────────────────────────────────────────┐ │
│ │ Technical Interview - John Doe           │ │
│ │ Today at 10:00 AM (in 5 minutes)         │ │
│ │ Duration: 1 hour                         │ │
│ │ Status: ✅ Scheduled                     │ │
│ │                                          │ │
│ │ [Join Zoom] [Cancel] [Reschedule]       │ │
│ └──────────────────────────────────────────┘ │
└──────────┬───────────────────────────────────┘
           │
           │ User clicks "Join Zoom"
           ▼
┌──────────────────────────────────────────────┐
│ window.open(video_meeting_url, '_blank')     │
│ Opens Zoom in new tab                        │
│ Meeting proceeds...                          │
└──────────────────────────────────────────────┘


PHASE 4: POST-MEETING
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ After meeting ends                           │
│ Recruiter marks as completed                 │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ PATCH /meetings/888                          │
│ { status: 'completed' }                      │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│ Backend:                                           │
│ • UPDATE Meeting SET status='completed'            │
│ • INSERT MeetingTimelineEvent:                     │
│   "Interview completed"                            │
│ • Optionally update Application status             │
└────────────────────────────────────────────────────┘


CANCELLATION FLOW
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ User clicks "Cancel" button                  │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Cancel Modal:                                │
│ Reason: [Candidate withdrew application ▼]   │
│ [Confirm Cancel]                             │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /meetings/888/cancel                    │
│ { reason: "..." }                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│ Backend:                                           │
│ • UPDATE Meeting:                                  │
│   - status='cancelled'                             │
│   - cancelled_at=NOW()                             │
│   - cancelled_by_user_id=current_user              │
│   - cancellation_reason=reason                     │
│ • INSERT MeetingTimelineEvent                      │
│ • Send cancellation notifications to all           │
│ • Send cancellation emails                         │
│ • Delete calendar events (if integrated)           │
└────────────────────────────────────────────────────┘


RESCHEDULE FLOW (Candidate Request)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Candidate clicks "Request Reschedule"        │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /meetings/888/reschedule-request        │
│ {                                            │
│   reason: "...",                             │
│   preferred_times: ["...", "...", "..."]     │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│ Backend:                                           │
│ • UPDATE Meeting:                                  │
│   - status='reschedule_requested'                  │
│   - reschedule_requested_at=NOW()                  │
│   - reschedule_request_reason=reason               │
│ • Send notification to recruiter                   │
│ • Recruiter can approve/reject                     │
└────────────────────────────────────────────────────┘
```

---

## Notification System Flow

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    NOTIFICATION SYSTEM FLOW                            ║
║                    Multi-Channel Delivery System                       ║
└═══════════════════════════════════════════════════════════════════════┘

EVENT TRIGGERS
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ User Action / System Event Occurs:           │
│ • Application submitted                      │
│ • Status changed                             │
│ • Match found                                │
│ • Interview scheduled                        │
│ • Message received                           │
│ • Job expiring soon                          │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Call NotificationService.send_notification() │
│ Parameters:                                  │
│ • user_id: Who to notify                     │
│ • event_type: 'application_status'           │
│ • title: "Application Status Updated"        │
│ • message: "Your application has been..."    │
│ • payload: {"route": "/dashboard?tab=..."}   │
│ • email_data: {...} (for email template)     │
└──────────┬───────────────────────────────────┘
           │
           ▼


STEP 1: EVENT VALIDATION
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Validate event_type against registry:        │
│ • Must be in ALLOWED_EVENT_TYPES             │
│ • Get metadata (priority, channels, etc.)    │
└──────────┬───────────────────────────────────┘
           │
           ▼


STEP 2: DEDUPLICATION CHECK
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ IF should_deduplicate(event_type):           │
│   cutoff = NOW() - dedup_window (e.g., 5min)│
│   recent = SELECT Notification              │
│            WHERE user_id=X                   │
│            AND event_type=Y                  │
│            AND created_at >= cutoff          │
│                                              │
│   IF recent EXISTS:                          │
│     RETURN recent (skip duplicate)           │
└──────────┬───────────────────────────────────┘
           │
           ▼


STEP 3: USER PREFERENCES CHECK
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Query NotificationPreferences:               │
│ SELECT * FROM notification_preferences       │
│ WHERE user_id=X AND event_type=Y             │
└──────────┬───────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┐
           │ Preferences exist│ No preferences  │
           ▼                  ▼                 │
    ┌─────────────┐    ┌─────────────────────┐ │
    │ Use stored  │    │ Use defaults:       │ │
    │ preferences │    │ • in_app: TRUE      │ │
    └──────┬──────┘    │ • email: TRUE       │ │
           │           │ • frequency: REALTIME│ │
           │           └──────┬──────────────┘ │
           │                  │               │
           └──────────────────┴───────┐       │
                                      │       │
                                      ▼       │
                          ┌──────────────────────────┐
                          │ Check channel settings:  │
                          │ • in_app_enabled?        │
                          │ • email_enabled?         │
                          │ • frequency setting?     │
                          └──────────┬───────────────┘
                                     │
                                     ▼
                          ┌──────────────────────────┐
                          │ IF both disabled:        │
                          │   LOG "User opted out"   │
                          │   RETURN None            │
                          └──────────┬───────────────┘
                                     │
                                     ▼


STEP 4: IN-APP NOTIFICATION (If enabled)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ IF in_app_enabled:                           │
│   INSERT INTO Notification:                  │
│   • user_id                                  │
│   • type: 'general'                          │
│   • title: "..."                             │
│   • message: "..."                           │
│   • event_type: "application_status"         │
│   • is_read: FALSE                           │
│   • payload: JSON {...}                      │
│   • created_at: NOW()                        │
│                                              │
│   notification_id = last_insert_id()         │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Frontend Polling:                            │
│ • Every 30 seconds                           │
│ • GET /notifications/unread-count            │
│ • Update bell badge: 🔔 (3)                  │
└──────────────────────────────────────────────┘


STEP 5: EMAIL NOTIFICATION (If enabled)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ IF email_enabled:                            │
│   queue_notification_email(                  │
│     notification_id=notification_id,         │
│     recipient_email=user.email,              │
│     event_type=event_type,                   │
│     email_data=email_data                    │
│   )                                          │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ Generate idempotency key:                           │
│ key = f"{user_id}:{event_type}:{timestamp}"         │
│                                                      │
│ INSERT INTO EmailDelivery:                          │
│ • notification_id                                   │
│ • user_id                                           │
│ • recipient_email                                   │
│ • event_type                                        │
│ • subject: "Application Status Updated"             │
│ • html_body: (render email template)                │
│ • status: 'queued'                                  │
│ • attempts: 0                                       │
│ • max_attempts: 3                                   │
│ • idempotency_key: key                              │
│ • created_at: NOW()                                 │
└──────────┬───────────────────────────────────────────┘
           │
           ▼


STEP 6: EMAIL WORKER PROCESSING (Async)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Email Worker (email_worker.py)               │
│ Runs every 30 seconds                        │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ SELECT * FROM EmailDelivery                  │
│ WHERE status='queued'                        │
│ AND attempts < max_attempts                  │
│ LIMIT 100                                    │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ FOR EACH email IN queued_emails:             │
│   TRY:                                       │
│     send_email(                              │
│       to=email.recipient_email,              │
│       subject=email.subject,                 │
│       html_body=email.html_body              │
│     )                                        │
│     UPDATE EmailDelivery:                    │
│       status='sent'                          │
│       sent_at=NOW()                          │
│                                              │
│   EXCEPT Exception as e:                     │
│     UPDATE EmailDelivery:                    │
│       attempts += 1                          │
│       last_error=str(e)                      │
│       last_attempt_at=NOW()                  │
│     IF attempts >= max_attempts:             │
│       status='failed'                        │
│       failed_at=NOW()                        │
└──────────┬───────────────────────────────────┘
           │
           ▼


STEP 7: USER INTERACTION (Frontend)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Notification Bell Component:                │
│ • Polls every 30s: GET /notifications/       │
│   unread-count                               │
│ • Displays badge: 🔔 (3)                     │
└──────────┬───────────────────────────────────┘
           │
           │ User clicks bell
           ▼
┌──────────────────────────────────────────────┐
│ Drawer opens                                 │
│ GET /notifications                           │
│ Displays list of notifications              │
└──────────┬───────────────────────────────────┘
           │
           │ User clicks notification
           ▼
┌──────────────────────────────────────────────┐
│ 1. PATCH /notifications/{id}/read            │
│    Backend: UPDATE is_read=TRUE              │
│                                              │
│ 2. Parse payload JSON                        │
│    route = payload.route                     │
│    context = payload.route_context           │
│                                              │
│ 3. navigate(route)                           │
│    e.g., /candidate-dashboard?tab=applied&   │
│         applicationId=123                    │
│                                              │
│ 4. Close drawer                              │
│ 5. Decrement badge count                     │
└──────────────────────────────────────────────┘


NOTIFICATION DELIVERY MATRIX
═══════════════════════════════════════════════════════════════════════

Event Type          │ In-App │ Email │ Priority │ Dedup Window
────────────────────┼────────┼───────┼──────────┼─────────────
application_status  │   ✓    │   ✓   │  urgent  │  5 minutes
match_found         │   ✓    │   ✓   │  normal  │  15 minutes
interview_scheduled │   ✓    │   ✓   │  urgent  │  none
message_received    │   ✓    │   ✗   │  normal  │  1 minute
job_recommendation  │   ✓    │   ✗   │  low     │  1 hour
job_expiring_soon   │   ✓    │   ✓   │  urgent  │  24 hours


FREQUENCY HANDLING
═══════════════════════════════════════════════════════════════════════

IF frequency == 'realtime':
  Send immediately (as shown above)

ELSE IF frequency == 'daily':
  • Queue notification for daily digest
  • Background worker sends once per day
  • Batches all notifications into single email

ELSE IF frequency == 'weekly':
  • Queue for weekly digest
  • Send every Monday morning
```

---

## Real-Time Messaging Flow

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    REAL-TIME MESSAGING FLOW                            ║
║                    Direct Communication System                         ║
└═══════════════════════════════════════════════════════════════════════┘

CONVERSATION INITIALIZATION
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ User clicks "Message" on match/application   │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Frontend checks if conversation exists:      │
│ GET /messages/conversations                  │
│ ?company_id=X&candidate_id=Y&job_posting_id=Z│
└──────────┬───────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┐
           │ Exists           │ Doesn't exist   │
           ▼                  ▼                 │
    ┌─────────────┐    ┌─────────────────────┐ │
    │ Use existing│    │ Create new:         │ │
    │conversation │    │ POST /messages/     │ │
    │             │    │ conversations       │ │
    └──────┬──────┘    └──────┬──────────────┘ │
           │                  │               │
           │                  ▼               │
           │           ┌────────────────────────────┐
           │           │ Backend:                   │
           │           │ INSERT INTO Conversation:  │
           │           │ • company_id               │
           │           │ • candidate_id             │
           │           │ • job_posting_id           │
           │           │ • created_by_user_id       │
           │           │ • created_at: NOW()        │
           │           │                            │
           │           │ Return conversation_id     │
           │           └──────┬─────────────────────┘
           │                  │
           └──────────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │ conversation_id: 456 │
           └──────────┬───────────┘
                      │
                      ▼


CHAT WINDOW OPENING
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ ChatWindow component mounts                  │
│ Props: conversationId=456                    │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Fetch conversation history:                  │
│ GET /messages/conversation/456               │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ SELECT * FROM Message                        │
│ WHERE conversation_id=456                    │
│ ORDER BY created_at ASC                      │
│                                              │
│ Return: {                                    │
│   conversation: {...},                       │
│   messages: [                                │
│     {                                        │
│       id: 1,                                 │
│       sender_user_id: 123,                   │
│       sender_role: 'candidate',              │
│       text: 'Hello! Thanks for matching',    │
│       is_read: true,                         │
│       created_at: '2026-04-30T10:00:00Z'     │
│     },                                       │
│     {                                        │
│       id: 2,                                 │
│       sender_user_id: 456,                   │
│       sender_role: 'recruiter',              │
│       text: 'Hi! When can you start?',       │
│       is_read: false,                        │
│       created_at: '2026-04-30T10:05:00Z'     │
│     }                                        │
│   ]                                          │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Render Chat UI:                              │
│ ┌────────────────────────────────────────┐   │
│ │ Chat with John Doe (Google)            │   │
│ ├────────────────────────────────────────┤   │
│ │ John: Hello! Thanks for matching       │   │
│ │       10:00 AM                         │   │
│ │                                        │   │
│ │ You:  Hi! When can you start?          │   │
│ │       10:05 AM                         │   │
│ ├────────────────────────────────────────┤   │
│ │ [Type a message...]           [Send]   │   │
│ └────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────┘
           │
           ▼


POLLING FOR NEW MESSAGES (Current Implementation)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ useEffect sets up polling interval:          │
│ setInterval(() => {                          │
│   fetchMessages()                            │
│ }, 5000) // Poll every 5 seconds             │
└──────────┬───────────────────────────────────┘
           │
           │ Every 5 seconds...
           │
           ▼
┌──────────────────────────────────────────────┐
│ GET /messages/conversation/456               │
│ ?since=last_message_id                       │
└──────────┬───────────────────────────────────┘
           │
           ├──────────────────┬─────────────────┐
           │ New messages     │ No new messages │
           ▼                  ▼                 │
    ┌─────────────┐    ┌─────────────────────┐ │
    │ Update      │    │ No action needed    │ │
    │ messages    │    │                     │ │
    │ array       │    │                     │ │
    │ Re-render   │    │                     │ │
    │ Scroll down │    │                     │ │
    └─────────────┘    └─────────────────────┘ │


SENDING A MESSAGE
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ User types message and presses Enter         │
│ or clicks "Send" button                      │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ handleSend() function:                       │
│ IF inputText.trim() is empty:                │
│   RETURN (don't send empty messages)         │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /messages/send                          │
│ {                                            │
│   conversation_id: 456,                      │
│   text: "I can start in 2 weeks"            │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend processing:                          │
│                                              │
│ 1. Validate conversation membership:         │
│    user_id must be participant in convo      │
│                                              │
│ 2. INSERT Message:                           │
│    • conversation_id: 456                    │
│    • sender_user_id: 123                     │
│    • sender_role: 'candidate'                │
│    • text: "I can start in 2 weeks"         │
│    • is_read: FALSE                          │
│    • created_at: NOW()                       │
│                                              │
│ 3. UPDATE Conversation:                      │
│    • last_message_at = NOW()                 │
│                                              │
│ 4. Send notification to recipient:           │
│    NotificationService.send_notification(    │
│      user_id=recipient_id,                   │
│      event_type='message_received',          │
│      title='New Message',                    │
│      message='From John Doe: I can start...',│
│      payload={route: '/messages/456'}        │
│    )                                         │
│                                              │
│ 5. Return created message                    │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Frontend response handling:                  │
│ • Clear input field                          │
│ • Optimistic update: add message to list     │
│ • Scroll to bottom                           │
│ • Next poll will confirm delivery            │
└──────────────────────────────────────────────┘


RECIPIENT SIDE (Real-time notification)
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Recipient's notification bell polling        │
│ (every 30 seconds)                           │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ GET /notifications/unread-count              │
│ Response: { unread_count: 1 }                │
│ Bell updates: 🔔 (1)                         │
└──────────┬───────────────────────────────────┘
           │
           │ Recipient clicks bell
           ▼
┌──────────────────────────────────────────────┐
│ See notification: "New Message from John"    │
│ Click → navigate('/messages/456')            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ ChatWindow opens with conversation           │
│ New message appears in thread                │
│ Mark messages as read automatically          │
└──────────────────────────────────────────────┘


MARKING MESSAGES AS READ
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ When ChatWindow is visible:                  │
│ useEffect(() => {                            │
│   markMessagesAsRead()                       │
│ }, [messages])                               │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ PATCH /messages/conversation/456/read        │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ UPDATE Message                               │
│ SET is_read=TRUE, read_at=NOW()              │
│ WHERE conversation_id=456                    │
│ AND receiver_user_id=current_user            │
│ AND is_read=FALSE                            │
└──────────────────────────────────────────────┘


FUTURE ENHANCEMENT: WebSocket Implementation
═══════════════════════════════════════════════════════════════════════
(Not currently implemented, but architecture ready)

┌──────────────────────────────────────────────┐
│ User opens chat → Establish WebSocket conn   │
│ ws = new WebSocket('ws://api/messages/ws')   │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend maintains WebSocket connections:     │
│ • conversation_id → [ws1, ws2, ...]          │
│ • When message created, broadcast to all     │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Instant message delivery (no polling!)       │
│ • Send via WebSocket                         │
│ • Recipient receives immediately             │
│ • Read receipts in real-time                 │
│ • Typing indicators possible                 │
└──────────────────────────────────────────────┘
```

---

## Job Lifecycle Management

```
┌═══════════════════════════════════════════════════════════════════════┐
║                    JOB LIFECYCLE MANAGEMENT                            ║
║                    Automated Job Status Transitions                    ║
└═══════════════════════════════════════════════════════════════════════┘

JOB STATUS STATES
═══════════════════════════════════════════════════════════════════════

┌─────────────┐
│   ACTIVE    │  Initial state when job is posted
│     🟢      │  Accepting applications
└──────┬──────┘
       │
       │ Possible transitions:
       │ → frozen (manual or auto on expiry)
       │ → cancelled (manual)
       │
       ├──────────────────┬─────────────────┐
       │                  │                 │
       ▼                  ▼                 ▼
┌─────────────┐    ┌─────────────┐  ┌─────────────┐
│   FROZEN    │    │  CANCELLED  │  │  REPOSTED   │
│     ❄️      │    │     ❌      │  │     🔄      │
└──────┬──────┘    └─────────────┘  └──────┬──────┘
       │            (TERMINAL)              │
       │                                    │
       │ Transitions:                       │ Re-activated
       │ → reposted (manual reactivate)     │ from frozen
       │ → cancelled (permanent close)      │
       │                                    │
       └────────────────┬───────────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  CANCELLED  │
                 │     ❌      │
                 └─────────────┘
                  (TERMINAL)


MANUAL LIFECYCLE ACTIONS
═══════════════════════════════════════════════════════════════════════

Action: FREEZE (Temporary Close)
─────────────────────────────────
┌──────────────────────────────────────────────┐
│ Recruiter clicks "Freeze Job" button         │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /job-postings/123/status                │
│ { action: 'freeze' }                         │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ • Validate: current status='active'          │
│ • UPDATE JobPosting:                         │
│   - status='frozen'                          │
│   - frozen_at=NOW()                          │
│ • Prevent new applications                   │
│ • Keep existing applications intact          │
│ • Send notifications to pending applicants   │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Job disappears from candidate feeds          │
│ Existing applications remain visible         │
└──────────────────────────────────────────────┘


Action: REPOST/REACTIVATE
──────────────────────────
┌──────────────────────────────────────────────┐
│ Recruiter clicks "Reactivate Job" button     │
│ (on frozen job)                              │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /job-postings/123/status                │
│ { action: 'reactivate' }                     │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ • Validate: current status='frozen'          │
│ • UPDATE JobPosting:                         │
│   - status='reposted' or 'active'            │
│   - reposted_at=NOW()                        │
│   - last_reactivated_at=NOW()                │
│ • Job becomes visible again                  │
│ • Accepting new applications                 │
└──────────────────────────────────────────────┘


Action: CANCEL (Permanent Close)
─────────────────────────────────
┌──────────────────────────────────────────────┐
│ Recruiter clicks "Cancel Job Posting"        │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Confirmation Modal:                          │
│ Reason: [Position filled ▼]                  │
│ • Position filled                            │
│ • Budget constraints                         │
│ • Hiring freeze                              │
│ • Other                                      │
│ [Confirm Cancel]                             │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ POST /job-postings/123/status                │
│ {                                            │
│   action: 'cancel',                          │
│   cancellation_reason: 'Position filled'     │
│ }                                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ • UPDATE JobPosting:                         │
│   - status='cancelled' (TERMINAL)            │
│   - cancelled_at=NOW()                       │
│   - cancellation_reason='...'                │
│ • Job removed from all feeds                 │
│ • Cannot be reactivated                      │
│ • Send notifications to all applicants:      │
│   "Job posting has been closed"              │
│ • Existing applications preserved (audit)    │
└──────────────────────────────────────────────┘


AUTOMATED LIFECYCLE (Background Worker)
═══════════════════════════════════════════════════════════════════════

Worker: lifecycle_worker.py
Schedule: Every 1 hour
───────────────────────────

┌──────────────────────────────────────────────┐
│ Background Scheduler Triggers:               │
│ @scheduler.scheduled_job('interval', hours=1)│
│ def lifecycle_check_job():                   │
└──────────┬───────────────────────────────────┘
           │
           ▼


Task 1: 3-DAY EXPIRY WARNINGS
══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Check jobs expiring in 3 days:               │
│ cutoff = NOW() + 3 days                      │
│                                              │
│ expiring_jobs = SELECT JobPosting            │
│   WHERE status='active'                      │
│   AND end_date <= cutoff                     │
│   AND end_date > NOW()                       │
│   AND NOT notified_3day                      │
└──────────┬───────────────────────────────────┘
           │
           │ FOR EACH job IN expiring_jobs:
           ▼
┌──────────────────────────────────────────────┐
│ Get recruiter:                               │
│ company = SELECT Company                     │
│   WHERE id=job.company_id                    │
│ recruiter_user_id = company.user_id          │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Send notification:                           │
│ NotificationService.send_notification(       │
│   user_id=recruiter_user_id,                 │
│   event_type='job_expiring_soon',            │
│   title='⚠️ Job Expiring in 3 Days',        │
│   message='Your job "Software Engineer"      │
│            expires on May 3, 2026',          │
│   email_data={...}                           │
│ )                                            │
│                                              │
│ Mark as notified:                            │
│ UPDATE JobPosting                            │
│ SET notified_3day=TRUE                       │
│ WHERE id=job.id                              │
└──────────────────────────────────────────────┘


Task 2: 1-DAY URGENT WARNINGS
══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Check jobs expiring in 1 day:                │
│ cutoff = NOW() + 1 day                       │
│                                              │
│ urgent_jobs = SELECT JobPosting              │
│   WHERE status='active'                      │
│   AND end_date <= cutoff                     │
│   AND end_date > NOW()                       │
│   AND NOT notified_1day                      │
└──────────┬───────────────────────────────────┘
           │
           │ FOR EACH job:
           ▼
┌──────────────────────────────────────────────┐
│ Send URGENT notification:                    │
│ • Priority: HIGH                             │
│ • Send to recruiter                          │
│ • Also notify Admin/HR if configured         │
│ • Subject: "🚨 URGENT: Job expires tomorrow" │
│                                              │
│ Email includes action buttons:               │
│ • [Extend End Date]                          │
│ • [Freeze Now]                               │
└──────────────────────────────────────────────┘


Task 3: AUTO-FREEZE EXPIRED JOBS
══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Find expired jobs:                           │
│ expired_jobs = SELECT JobPosting             │
│   WHERE status='active'                      │
│   AND end_date < NOW()                       │
└──────────┬───────────────────────────────────┘
           │
           │ FOR EACH job IN expired_jobs:
           ▼
┌──────────────────────────────────────────────┐
│ Auto-freeze:                                 │
│ UPDATE JobPosting                            │
│ SET status='frozen',                         │
│     frozen_at=NOW(),                         │
│     auto_frozen=TRUE                         │
│ WHERE id=job.id                              │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Send notification to recruiter:              │
│ "Your job posting has been automatically     │
│  closed due to expiration. You can reactivate│
│  it from your dashboard."                    │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ Log activity:                                │
│ INSERT INTO SystemLog:                       │
│ • action='auto_freeze_expired_jobs'          │
│ • message='Auto-frozen {count} expired jobs' │
│ • level='INFO'                               │
└──────────────────────────────────────────────┘


ANALYTICS TRACKING
═══════════════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│ Track lifecycle metrics:                     │
│ • Average job lifespan                       │
│ • Freeze rate                                │
│ • Repost rate                                │
│ • Applications per job status                │
│ • Time to first application                  │
│ • Auto-freeze count vs manual freeze         │
└──────────────────────────────────────────────┘
```

---

## Summary

This document provides **complete workflow visualizations** for:

1. **High-Level Overview** - Dual-sided platform architecture
2. **Authentication** - Signup, login, token management
3. **Candidate Journey** - From signup to job offer (6 phases)
4. **Recruiter Journey** - From posting to hiring (5 phases)
5. **Matching Algorithm** - Step-by-step scoring system
6. **Application Lifecycle** - All status transitions with rules
7. **Interview Scheduling** - Meeting creation to completion
8. **Notification System** - Multi-channel delivery with preferences
9. **Real-Time Messaging** - Polling-based chat system
10. **Job Lifecycle** - Automated expiration and status management

**Key Patterns Visualized:**
- User authentication and role-based routing
- Swipe-based matching with mutual match detection
- Application status state machine with validation
- Multi-channel notification delivery (in-app + email)
- Background workers for automated tasks
- Conflict checking for interview scheduling
- Polling vs WebSocket architecture

**Use Cases:**
- Understand complete user journeys
- Onboard new developers
- Debug complex flows
- Plan feature enhancements
- Architecture documentation
- System design reviews
