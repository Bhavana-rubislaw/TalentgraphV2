# TalentGraph V2 - UI Architecture Visual Guide

## 🏗️ Application Structure

```
TalentGraph V2 Platform
│
├── 🌐 Landing Page
│   ├── Hero Section
│   ├── Features Overview
│   ├── How It Works
│   └── Sign In / Sign Up CTAs
│
├── 👤 CANDIDATE FLOW
│   │
│   ├── 📝 Signup/Login
│   │   └── Email + Password
│   │
│   ├── ⚙️ Profile Setup
│   │   ├── Personal Info
│   │   ├── Resume Upload
│   │   ├── Skills Selection
│   │   ├── Experience Details
│   │   └── Certifications
│   │
│   ├── 🎯 Job Preferences Setup
│   │   ├── Desired Role
│   │   ├── Salary Range
│   │   ├── Work Type (Remote/Hybrid/Onsite)
│   │   ├── Location Preferences
│   │   └── Availability
│   │
│   └── 📊 CANDIDATE DASHBOARD ─────────────────┐
│       │                                         │
│       ├── TAB 1: Recommendations (AI)          │
│       │   ├── Swipeable Job Cards              │
│       │   ├── Pass / Like / Apply Actions      │
│       │   ├── Profile Selector                 │
│       │   └── Role Filter                      │
│       │                                         │
│       ├── TAB 2: Invites                       │
│       │   ├── Recruiter Invitations            │
│       │   ├── Search & Filters                 │
│       │   └── One-Click Apply                  │
│       │                                         │
│       ├── TAB 3: Available Jobs                │
│       │   ├── Job Board                        │
│       │   ├── Advanced Filters                 │
│       │   └── Search Bar                       │
│       │                                         │
│       ├── TAB 4: Applied                       │
│       │   ├── Liked Jobs                       │
│       │   ├── Applied Jobs                     │
│       │   └── Status Tracking                  │
│       │                                         │
│       ├── TAB 5: Matches                       │
│       │   ├── Mutual Interest Jobs             │
│       │   └── Direct Recruiter Access          │
│       │                                         │
│       └── TAB 6: Messages                      │
│           ├── Chat Conversations               │
│           └── Recruiter Communication          │
│                                                 │
└── 🏢 RECRUITER FLOW                            │
    │                                             │
    ├── 📝 Signup/Login                          │
    │   └── Email + Password                     │
    │                                             │
    ├── 🏢 Company Profile Setup                 │
    │   ├── Company Name                         │
    │   ├── Industry                             │
    │   ├── Company Size                         │
    │   └── Location                             │
    │                                             │
    ├── 📋 Job Posting Creation                  │
    │   ├── Job Title                            │
    │   ├── Description                          │
    │   ├── Requirements                         │
    │   ├── Salary Range                         │
    │   └── Skills Needed                        │
    │                                             │
    └── 📊 RECRUITER DASHBOARD ──────────────────┤
        │                                         │
        ├── TAB 1: Recommendations (AI)          │
        │   ├── Candidate Cards                  │
        │   ├── Pass / Like / Invite Actions     │
        │   ├── Job Analytics Dashboard          │
        │   └── Role Filter                      │
        │                                         │
        ├── TAB 2: Shortlist                     │
        │   ├── Saved Candidates                 │
        │   ├── Quick Actions                    │
        │   └── Contact Info                     │
        │                                         │
        ├── TAB 3: Applications                  │
        │   ├── All Applications                 │
        │   ├── Advanced Filters                 │
        │   ├── Status Management                │
        │   ├── Notes System                     │
        │   └── Email Templates                  │
        │                                         │
        ├── TAB 4: Matches                       │
        │   ├── Mutual Interest Candidates       │
        │   └── Direct Messaging                 │
        │                                         │
        ├── TAB 5: Browse                        │
        │   ├── Candidate Search                 │
        │   ├── Filters & Sort                   │
        │   └── Proactive Sourcing               │
        │                                         │
        └── TAB 6: Messages                      │
            ├── Chat Conversations               │
            └── Candidate Communication          │
```

---

## 🎯 Tab Navigation Flow

### RECRUITER TAB TRANSITIONS

```
┌─────────────────┐
│ Recommendations │ ←──────────────┐
└────────┬────────┘                │
         │ Like Candidate          │
         ↓                         │
    ┌─────────┐                   │
    │Shortlist│                   │ View All
    └────┬────┘                   │ Candidates
         │ Ask to Apply           │
         ↓                         │
  ┌─────────────┐                 │
  │Applications │                 │
  └──────┬──────┘                 │
         │ Schedule Interview     │
         ↓                         │
    ┌─────────┐                   │
    │ Matches │                   │
    └────┬────┘                   │
         │ Message                │
         ↓                         │
    ┌──────────┐                  │
    │ Messages │                  │
    └──────────┘                  │
                                  │
         ↓ Browse More            │
    ┌──────────┐                  │
    │  Browse  │──────────────────┘
    └──────────┘
```

### CANDIDATE TAB TRANSITIONS

```
┌─────────────────┐
│ Recommendations │ ←──────────────┐
└────────┬────────┘                │
         │ Like Job                │
         ↓                         │
    ┌─────────┐                   │
    │ Applied │                   │ Browse More
    │ (Liked) │                   │ Jobs
    └────┬────┘                   │
         │ Apply                  │
         ↓                         │
    ┌─────────┐                   │
    │ Applied │                   │
    │(Applied)│                   │
    └────┬────┘                   │
         │ Mutual Like            │
         ↓                         │
    ┌─────────┐                   │
    │ Matches │                   │
    └────┬────┘                   │
         │ Message                │
         ↓                         │
    ┌──────────┐                  │
    │ Messages │                  │
    └──────────┘                  │
                                  │
         ↓ View More              │
    ┌───────────┐                 │
    │ Available │─────────────────┘
    └───────────┘
         ↑
         │ Recruiter Sent Invite
    ┌─────────┐
    │ Invites │
    └─────────┘
```

---

## 🔄 Interaction Patterns

### RECOMMENDATION ENGINE FLOW

```
[Candidate Profile]
       │
       ↓
[AI Matching Algorithm]
       │
       ├─→ Skills Match (40%)
       ├─→ Experience Match (30%)
       ├─→ Location Match (15%)
       ├─→ Salary Match (10%)
       └─→ Preferences Match (5%)
       │
       ↓
[Match Score: 0-100%]
       │
       ↓
[Ranked Recommendations]
       │
       ├─→ Recruiter Dashboard (Candidate Cards)
       └─→ Candidate Dashboard (Job Cards)
```

### APPLICATION STATUS PIPELINE

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
│ Applied │───→│ Scheduled│───→│Under Review───→│Shortlist│
└─────────┘    └──────────┘    └───────────┘    └────┬────┘
                                                       │
    ┌──────────────────────────────────────────────────┘
    │
    ├─→ ┌──────────┐
    │   │Interview │
    │   └────┬─────┘
    │        │
    │        ├─→ ┌──────────┐
    │        │   │  Offer   │───→ ┌──────┐
    │        │   └──────────┘     │ Hired│
    │        │                    └──────┘
    │        └─→ ┌──────────┐
    │            │ Rejected │
    │            └──────────┘
    │
    └─→ ┌──────────┐
        │ Rejected │
        └──────────┘
```

---

## 🎨 Component Hierarchy

### RECRUITER DASHBOARD STRUCTURE

```
RecruiterDashboardNew
├── Header
│   ├── Logo
│   ├── JobSelector (Dropdown)
│   ├── NotificationBellDrawer
│   └── ProfileMenu
│       ├── Post a Job
│       ├── Recruiter Profile
│       ├── Company Profile
│       ├── Calendar Settings
│       ├── Notification Preferences
│       └── Logout
│
├── TabNavigation
│   ├── Recommendations (active indicator)
│   ├── Shortlist
│   ├── Applications
│   ├── Matches
│   ├── Browse
│   └── Messages
│
└── TabContent (Dynamic based on activeTab)
    │
    ├── [Recommendations Tab]
    │   ├── ReopenedJobBanner (conditional)
    │   ├── RoleFilter (FilterPill)
    │   ├── JobAnalyticsDashboard
    │   │   ├── MetricCard (Views)
    │   │   ├── MetricCard (Likes)
    │   │   ├── MetricCard (Applications)
    │   │   ├── MetricCard (Interviews)
    │   │   ├── MetricCard (Offers)
    │   │   ├── MetricCard (Hires)
    │   │   ├── ConversionFunnel
    │   │   ├── TimeToApplication
    │   │   └── TimeToHire
    │   ├── CandidateCardSwiper
    │   │   ├── CandidateCard
    │   │   │   ├── Avatar
    │   │   │   ├── Name & Summary
    │   │   │   ├── Experience
    │   │   │   ├── Skills
    │   │   │   └── Actions
    │   │   │       ├── Pass Button
    │   │   │       ├── Like Button
    │   │   │       └── Invite Button
    │   │   └── NavigationArrows
    │   └── CandidateDetailModal (conditional)
    │       ├── Header (Avatar, Name, Role)
    │       ├── Summary Section
    │       ├── JobPreferences Section
    │       ├── Locations Section
    │       ├── Skills Section
    │       ├── SocialLinks Section
    │       ├── Resumes Section
    │       ├── Certifications Section
    │       └── Contact Section
    │
    ├── [Shortlist Tab]
    │   ├── PageHeader
    │   ├── FilterToolbar
    │   │   ├── RoleFilter (Dropdown)
    │   │   └── ClearFiltersButton
    │   ├── ResultsCount
    │   └── CandidatesGrid
    │       └── CandidateCard (multiple)
    │           ├── StatusBadges
    │           ├── Avatar & Info
    │           ├── ContactInfo
    │           └── ActionButtons
    │               ├── View Details
    │               ├── Ask to Apply
    │               └── Message
    │
    ├── [Applications Tab]
    │   ├── Toolbar
    │   │   ├── SearchBox
    │   │   ├── RoleCombobox (Advanced)
    │   │   │   ├── ComboboxTrigger
    │   │   │   └── ComboboxPanel
    │   │   │       ├── SearchInput
    │   │   │       └── OptionsList
    │   │   ├── StatusFilter (Dropdown)
    │   │   └── SortDropdown
    │   ├── ApplicationsGrid
    │   │   └── ApplicationCard (multiple)
    │   │       ├── Candidate Info
    │   │       ├── Job Info
    │   │       ├── Status Badge
    │   │       └── QuickActions
    │   └── ApplicationDetailPanel (Drawer)
    │       ├── CandidateInfo
    │       ├── StatusUpdater (Dropdown)
    │       ├── NotesSection (Textarea)
    │       ├── EmailComposer
    │       │   ├── TemplateSelector
    │       │   ├── SubjectInput
    │       │   └── BodyTextarea
    │       └── QuickActions
    │           ├── Schedule Interview
    │           ├── View Resume
    │           ├── Call
    │           └── Message
    │
    ├── [Matches Tab]
    │   └── MatchesGrid
    │       └── MatchCard (multiple)
    │
    ├── [Browse Tab]
    │   ├── SearchBar
    │   ├── Filters
    │   │   ├── RoleFilter
    │   │   ├── WorkTypeFilter
    │   │   └── LocationFilter
    │   ├── Pagination
    │   └── CandidatesGrid
    │
    └── [Messages Tab]
        └── ChatWindow
            ├── ConversationList
            └── MessagePane
```

### CANDIDATE DASHBOARD STRUCTURE

```
CandidateDashboardNew
├── Header
│   ├── Logo
│   ├── ProfileSelector (Dropdown)
│   ├── NotificationBellDrawer
│   └── ProfileMenu
│       ├── My Profile
│       ├── Job Preferences
│       ├── Calendar Settings
│       ├── Notification Settings
│       └── Logout
│
├── TabNavigation
│   ├── Recommendations
│   ├── Invites
│   ├── Available
│   ├── Applied
│   ├── Matches
│   └── Messages
│
└── TabContent
    │
    ├── [Recommendations Tab]
    │   ├── ProfileNotCreatedState (conditional)
    │   ├── RoleFilter (FilterPill)
    │   ├── JobCardSwiper
    │   │   ├── JobCard
    │   │   │   ├── Company Info
    │   │   │   ├── Job Title
    │   │   │   ├── Details Grid
    │   │   │   ├── Status Badges
    │   │   │   └── Actions
    │   │   │       ├── Pass Button
    │   │   │       ├── Like Button
    │   │   │       └── Apply Button
    │   │   └── NavigationArrows
    │   └── JobDetailDrawer (conditional)
    │       ├── Job Info
    │       ├── Company Info
    │       ├── Description
    │       ├── Requirements
    │       └── Apply Button
    │
    ├── [Invites Tab]
    │   ├── SectionHeader
    │   ├── FiltersToolbar (Search, Role, WorkType, Location)
    │   ├── ResultsCount
    │   └── InvitesGrid
    │       └── InviteCard (multiple)
    │           ├── InvitationBadge
    │           ├── JobInfo
    │           ├── DetailsGrid
    │           └── Actions (View, Apply)
    │
    ├── [Available Tab]
    │   ├── PageHeader
    │   ├── EnhancedFilterToolbar
    │   │   ├── SearchInput
    │   │   ├── RoleDropdown
    │   │   ├── WorkTypeDropdown
    │   │   ├── LocationInput
    │   │   ├── AppStatusFilter
    │   │   └── ClearAllButton
    │   ├── ResultsCount
    │   └── JobsGrid
    │       └── JobCard (multiple)
    │
    ├── [Applied Tab]
    │   ├── SubTabNav (Liked / Applied)
    │   └── ApplicationsList
    │       └── ApplicationCard (multiple)
    │           ├── JobInfo
    │           ├── StatusBadge
    │           ├── Timeline
    │           └── Actions (View, Withdraw)
    │
    ├── [Matches Tab]
    │   └── MatchesGrid
    │       └── MatchCard (multiple)
    │
    └── [Messages Tab]
        └── ChatWindow
```

---

## 📱 Modal & Drawer Components

### SHARED MODALS

```
┌─────────────────────────────────┐
│  Interview Scheduling Modal     │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ Meeting Name              │  │
│  ├───────────────────────────┤  │
│  │ Interview Type Dropdown   │  │
│  ├───────────────────────────┤  │
│  │ Date Picker               │  │
│  ├───────────────────────────┤  │
│  │ Time Input                │  │
│  ├───────────────────────────┤  │
│  │ Duration Dropdown         │  │
│  ├───────────────────────────┤  │
│  │ Interviewer Selector      │  │
│  ├───────────────────────────┤  │
│  │ Notes / Agenda            │  │
│  └───────────────────────────┘  │
│  [Cancel]  [Schedule Meeting]   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Candidate Profile Modal        │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ Header (Avatar, Name)     │  │
│  ├───────────────────────────┤  │
│  │ Summary                   │  │
│  ├───────────────────────────┤  │
│  │ Job Preferences           │  │
│  ├───────────────────────────┤  │
│  │ Locations                 │  │
│  ├───────────────────────────┤  │
│  │ Skills (by category)      │  │
│  ├───────────────────────────┤  │
│  │ Social Links              │  │
│  ├───────────────────────────┤  │
│  │ Resumes                   │  │
│  ├───────────────────────────┤  │
│  │ Certifications            │  │
│  ├───────────────────────────┤  │
│  │ Contact Info              │  │
│  └───────────────────────────┘  │
│  [Pass] [Like] [Ask to Apply]   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Job Detail Drawer (Side)       │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ Company Logo & Name       │  │
│  ├───────────────────────────┤  │
│  │ Job Title                 │  │
│  ├───────────────────────────┤  │
│  │ Location | Salary | Type  │  │
│  ├───────────────────────────┤  │
│  │ Description (scrollable)  │  │
│  ├───────────────────────────┤  │
│  │ Requirements              │  │
│  ├───────────────────────────┤  │
│  │ Benefits                  │  │
│  └───────────────────────────┘  │
│  [Pass] [Like] [Apply Now]      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Notification Bell Drawer       │
├─────────────────────────────────┤
│  Notifications        [Mark All]│
│  ┌───────────────────────────┐  │
│  │ 🔵 New Application        │  │
│  │    John Doe applied       │  │
│  │    2 minutes ago          │  │
│  ├───────────────────────────┤  │
│  │ ❤️ New Match              │  │
│  │    You matched with...    │  │
│  │    1 hour ago             │  │
│  ├───────────────────────────┤  │
│  │ 💬 New Message            │  │
│  │    Recruiter sent a msg   │  │
│  │    3 hours ago            │  │
│  └───────────────────────────┘  │
│  [Notification Preferences]     │
└─────────────────────────────────┘
```

---

## 🎨 Design Token System

```
Colors:
├── Primary
│   ├── purple-start: #667eea
│   └── purple-end: #764ba2
├── Success: #10b981
├── Warning: #f59e0b
├── Error: #ef4444
└── Grays
    ├── gray-900: #1e293b (dark text)
    ├── gray-700: #334155
    ├── gray-500: #64748b (secondary text)
    ├── gray-300: #cbd5e1
    ├── gray-200: #e2e8f0 (borders)
    └── gray-50: #f8fafc (backgrounds)

Typography:
├── Headings
│   ├── H1: 24px / 700
│   ├── H2: 20px / 600
│   └── H3: 17px / 600
├── Body
│   ├── Large: 15px / 500
│   ├── Normal: 14px / 400
│   └── Small: 13px / 400
└── Captions: 12px / 500

Spacing:
├── xs: 4px
├── sm: 8px
├── md: 12px
├── lg: 16px
├── xl: 24px
└── 2xl: 32px

Radius:
├── sm: 6px
├── md: 8px
├── lg: 12px
└── full: 9999px (pills)

Shadows:
├── sm: 0 1px 3px rgba(0,0,0,0.08)
├── md: 0 4px 12px rgba(0,0,0,0.1)
└── lg: 0 8px 24px rgba(0,0,0,0.15)
```

---

## 🔄 State Management Flow

```
User Action
    ↓
[Component Handler]
    ↓
[Update Local State]
    ↓
[API Call] ←──────────┐
    ↓                  │
[Backend Processing]   │
    ↓                  │ Error
[Database Update]      │
    ↓                  │
[Response] ────────────┘
    ↓
[Update State]
    ↓
[Re-render UI]
    ↓
[URL Params Update] (optional)
    ↓
[LocalStorage Sync] (optional)
```

---

## 🌊 Data Flow Diagram

```
┌─────────────────┐
│   User Input    │
└────────┬────────┘
         │
    ┌────▼────┐
    │Frontend │
    │ React   │
    └────┬────┘
         │
    ┌────▼────────┐
    │  API Client │
    │   (Axios)   │
    └────┬────────┘
         │
    ┌────▼─────────┐
    │  FastAPI     │
    │  Backend     │
    └────┬─────────┘
         │
    ┌────▼────────────┐
    │   PostgreSQL    │
    │    Database     │
    └────┬────────────┘
         │
    ┌────▼────────┐
    │   Response  │
    └────┬────────┘
         │
    ┌────▼─────┐
    │ Frontend │
    │ Re-render│
    └──────────┘
```

---

*This visual guide provides architectural diagrams and flow charts for TalentGraph V2's UI structure.*
