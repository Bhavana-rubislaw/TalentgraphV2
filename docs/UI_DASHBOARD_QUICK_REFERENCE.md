# TalentGraph V2 - Quick Dashboard Reference

## 🎯 RECRUITER DASHBOARD - 6 TABS

### 1. **RECOMMENDATIONS** (AI Matching)
- AI-recommended candidates for selected job
- Swipeable card interface (Pass/Like/Invite)
- Job analytics dashboard (views, likes, applications, offers, hires)
- Role filter
- Full candidate profile modals
- Match scoring

### 2. **SHORTLIST** (Saved Candidates)
- All liked/favorited candidates
- Grid view with cards
- Role filtering
- Quick actions: View, Invite, Message
- Contact information display
- Status badges (Shortlisted, Invited)

### 3. **APPLICATIONS** (Pipeline Management)
- All job applications in one place
- Search by name/email/role
- Advanced role combobox filter
- Status filter (Applied/Scheduled/Review/Rejected/Offer/Hired)
- Sort by date (newest/oldest)
- Application detail panel with:
  - Status updater
  - Notes section
  - Email composer with templates
  - Schedule interview button
  - Resume download

### 4. **MATCHES** (Mutual Interest)
- Candidates who liked your job AND you liked them
- Pre-qualified prospects
- Direct messaging
- High conversion potential

### 5. **BROWSE** (Candidate Discovery)
- Search all candidates in platform
- Filters: Role, Work Type, Location
- Pagination (20 per page)
- View profiles, shortlist, invite, message
- Proactive sourcing

### 6. **MESSAGES** (Communication)
- Real-time chat with candidates
- Conversation list
- File sharing
- Unread badges
- Message history

---

## 👤 CANDIDATE DASHBOARD - 6 TABS

### 1. **RECOMMENDATIONS** (AI Jobs)
- Personalized job recommendations
- Swipeable card interface (Pass/Like/Apply)
- Profile selector dropdown
- Role filter
- Match percentage
- Job detail drawers
- Smart status tracking (liked/passed/applied)

### 2. **INVITES** (Recruiter Invitations)
- Jobs where recruiters invited you personally
- Special invitation badges
- Search & filters (Role, Work Type, Location)
- Priority application processing
- One-click apply

### 3. **AVAILABLE** (Job Board)
- Browse all open jobs
- Advanced filtering:
  - Search (title, company, description)
  - Role filter
  - Work type (Remote/Hybrid/Onsite)
  - Location search
  - Application status (applied/not applied)
- Results counter
- Clear all filters button
- Professional grid layout

### 4. **APPLIED** (My Applications)
- Two sub-tabs:
  - **Liked Jobs**: Saved favorites
  - **Applied Jobs**: Submitted applications
- Status tracking (Submitted → Review → Interview → Offer → Hired)
- Application timeline
- Withdraw option
- Resume tracking (which version submitted)

### 5. **MATCHES** (Mutual Interest)
- Jobs where both you and recruiter showed interest
- High conversion rate
- Direct recruiter contact
- Match score
- Fast-track applications

### 6. **MESSAGES** (Chat)
- Communicate with recruiters
- Job posting context
- File sharing
- Read receipts
- Typing indicators

---

## 🎨 SHARED COMPONENTS

### Header Features (Both Dashboards)
- **Logo/Branding**
- **Profile/Job Selector Dropdown**
- **Notification Bell** (with unread count)
- **Profile Menu**:
  - Profile settings
  - Calendar settings
  - Notification preferences
  - Logout

### Interview/Meeting Scheduler
- Date/time picker
- Meeting type (Phone/Video/In-Person/Panel)
- Duration selector
- Interviewer selection
- Calendar integration
- Auto-send invites

### Chat/Messaging System
- Real-time WebSocket connection
- File uploads/downloads
- Message search
- Conversation archiving
- Online status

### Document Management
- Resume uploads (multiple versions)
- Certifications
- Portfolio links
- Preview & download

---

## 📊 KEY METRICS DISPLAYED

### Recruiter Analytics (per job):
- 👀 Views
- ❤️ Likes/Interest
- 📝 Applications
- 📅 Interviews
- 💼 Offers
- ✅ Hires
- 📈 Conversion funnel
- ⏱️ Time to application
- ⏱️ Time to hire

### Candidate Tracking:
- Application status
- Days since applied
- Response rate
- Interview count
- Offer count

---

## 🎯 ACTION BUTTONS QUICK REFERENCE

### Recruiter Actions:
- ❌ Pass (reject candidate)
- ❤️ Like/Shortlist
- ✉️ Ask to Apply (invite)
- 👁️ View Profile
- 💬 Message
- 📅 Schedule Interview
- 📧 Email (with templates)
- 🗑️ Remove from shortlist

### Candidate Actions:
- ❌ Pass (skip job)
- ❤️ Like/Save
- ✅ Apply Now
- 👁️ View Details
- 💬 Message Recruiter
- ❌ Withdraw Application

---

## 🔍 FILTER & SEARCH OPTIONS

### Recruiter Filters:
- **Recommendations**: Role filter
- **Shortlist**: Role filter
- **Applications**: Search, Role combobox, Status, Sort
- **Browse**: Search, Role, Work Type, Location

### Candidate Filters:
- **Recommendations**: Role filter, Profile selector
- **Invites**: Search, Role, Work Type, Location
- **Available**: Search, Role, Work Type, Location, Application Status
- **Applied**: View toggle (Liked/Applied)

---

## 🎨 STATUS BADGES COLOR CODING

### Application Statuses:
- 🟦 **Applied**: Blue (just submitted)
- 🟡 **Scheduled**: Yellow (interview booked)
- 🟠 **Under Review**: Orange (being evaluated)
- 🔴 **Rejected**: Red (not selected)
- 🟢 **Offer**: Green (offer extended)
- ✅ **Hired**: Dark Green (accepted)

### Candidate Statuses:
- 🟣 **Shortlisted**: Purple
- ✉️ **Invited**: Teal
- ❤️ **Liked**: Pink
- ❌ **Passed**: Gray
- ✅ **Applied**: Green

---

## 📱 RESPONSIVE BREAKPOINTS

- **Desktop** (1280px+): Full features, multi-column
- **Tablet** (768-1279px): Adapted layouts, touch-optimized
- **Mobile** (<768px): Single column, bottom nav

---

## 🔐 ROLE-BASED ACCESS

### Recruiter Roles:
- `admin` (full access)
- `recruiter` (hiring manager)
- `hr` (HR team member)

### Candidate Roles:
- `candidate` (job seeker)

**Protected Routes**: Automatic redirect based on role

---

## 🚀 PERFORMANCE FEATURES

- ✅ Debounced search (500ms)
- ✅ Memoized filters
- ✅ Optimistic UI updates
- ✅ Lazy loading modals
- ✅ URL state persistence
- ✅ Request caching
- ✅ Pagination

---

## 🎯 KEY USER JOURNEYS

### Recruiter Journey:
```
Post Job → Review Recommendations → Shortlist → 
Review Applications → Schedule Interview → Make Offer → Hire
```

### Candidate Journey:
```
Create Profile → Set Preferences → Browse/Receive Recommendations → 
Apply → Track Status → Interview → Accept Offer
```

---

## 📊 FEATURE COUNT SUMMARY

| Dashboard | Tabs | Filters | Actions | Modals | Components |
|-----------|------|---------|---------|--------|------------|
| Recruiter | 6    | 15+     | 20+     | 10+    | 30+        |
| Candidate | 6    | 20+     | 15+     | 8+     | 25+        |
| **TOTAL** | **12** | **35+** | **35+** | **18+** | **55+**   |

---

## 💡 UNIQUE FEATURES

### Recruiter:
- 🤖 AI-powered candidate recommendations
- 📊 Real-time job analytics dashboard
- 📧 Email templates (4 types)
- 📝 Application notes system
- 🎯 Advanced role combobox with search

### Candidate:
- 🎴 Swipeable job cards (Tinder-style)
- ✉️ Personalized recruiter invitations
- 🤝 Mutual matching system
- 📱 Multi-profile support
- 🔍 Advanced job board filters

---

*Use this quick reference for demos, onboarding, or feature discussions!*
