# TalentGraph V2 - Complete UI Dashboard Features

## Overview
TalentGraph V2 has two primary dashboards:
1. **Recruiter Dashboard** - For HR/Recruiting teams to manage jobs, find candidates, and track applications
2. **Candidate Dashboard** - For job seekers to discover opportunities, manage applications, and connect with recruiters

---

## 🎯 RECRUITER DASHBOARD

### **Tech Stack**
- **Frontend**: React 18 + TypeScript, React Router v6
- **State Management**: React Hooks (useState, useEffect, useCallback, useMemo)
- **Styling**: Custom CSS with modern design system (PremiumDashboard.css, PremiumCards.css)
- **API**: Axios with centralized API client
- **Real-time**: Chat/Messages integration, Notification bell

### **Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Job Selector | Profile Menu | Bell      │
├─────────────────────────────────────────────────────────┤
│  Tabs: Recommendations | Shortlist | Applications |     │
│        Matches | Browse | Messages                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                   Tab Content Area                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📑 RECRUITER TABS & FEATURES

### **1️⃣ TAB: Recommendations** (AI-Powered Candidate Matching)

**Purpose**: AI-recommended candidates for the selected job posting

**Features**:
- ✅ **Job Selector Dropdown**: Select from active/reposted jobs
- ✅ **AI-Powered Recommendations**: Machine learning matches candidates to job requirements
- ✅ **Swipeable Card Interface**: Tinder-style candidate browsing
- ✅ **Keyboard Navigation**: Arrow keys to navigate between candidates
- ✅ **Role Filter**: Filter recommendations by job role

**Job Analytics Dashboard** (Shows when job is selected):
- 📊 Views Count
- ❤️ Likes/Interest Count
- 📝 Total Applications
- 📅 Interviews Scheduled
- 💼 Offers Extended
- ✅ Hires Made
- 📈 Conversion Funnel Visualization
- ⏱️ Time to Application (average days)
- ⏱️ Time to Hire (average days)

**Candidate Card Display**:
- Candidate avatar/initial
- Full name
- Professional summary
- Years of experience
- Preferred location
- Skills with proficiency levels (grouped by category)
- Education background
- Visa status
- Work type preference
- Salary expectations
- Match score/percentage

**Actions Available**:
- ❌ **Pass**: Reject candidate (dismisses from recommendations)
- ❤️ **Like/Shortlist**: Add to shortlist for later review
- ✉️ **Ask to Apply**: Send invitation email to candidate
- 👁️ **View Full Profile**: Open detailed modal with complete candidate information

**Candidate Detail Modal**:
- Complete job preferences (product vendor, seniority, work type, etc.)
- Skills categorized (Technical, Soft Skills, Domain Knowledge, etc.)
- Preferred locations with city/state
- Social links (LinkedIn, GitHub, Portfolio, Twitter, Website)
- Resume downloads
- Certifications with expiry dates
- Contact information

**Notifications/Alerts**:
- Reposted job notice: Shows when viewing reopened jobs with existing applications
- Link to Applications tab to review previous candidates

---

### **2️⃣ TAB: Shortlist** (Saved Candidates)

**Purpose**: Candidates you've marked as favorites for future consideration

**Features**:
- ✅ **Grid View**: Card-based layout showing all shortlisted candidates
- ✅ **Role Filter**: Filter by job role/position
- ✅ **Status Badges**: Visual indicators (Shortlisted, Invited)
- ✅ **Results Count**: "Showing X of Y shortlisted candidates"

**Candidate Card Display**:
- Avatar with initial
- Candidate name
- Job posting title
- Location (city, state)
- Years of experience
- Date shortlisted
- Contact information (email, phone)

**Actions Available**:
- 👁️ **View Details**: Full profile modal
- ✉️ **Ask to Apply**: Send job invitation (disabled if already invited)
- 💬 **Message**: Start direct conversation
- ❌ **Remove from Shortlist** (via detail modal)

**Detail Modal Includes**:
- Professional summary
- Complete job preferences (15+ fields)
- Preferred locations
- Skills by category with proficiency levels
- Social media profiles
- Resume downloads
- Certifications
- Contact details

---

### **3️⃣ TAB: Applications** (Application Management System)

**Purpose**: Centralized application tracking and candidate pipeline management

**Features**:
- 🔍 **Search Bar**: Search by name, email, role, or profile name
- 📋 **Role Combobox**: Advanced dropdown with search, counts per role
- 📊 **Status Filter**: Filter by application status (all/applied/scheduled/under_review/rejected/offer/hired)
- 🔄 **Sort Options**: Newest first or Oldest first
- 📈 **Application Count Badge**: Shows count per job posting

**Advanced Role Combobox**:
- Search functionality within roles
- Application count per role
- Visual indicators (has apps vs no apps)
- "All Roles" option with total count
- Clear filter button

**Application Cards Display**:
- Candidate avatar/initial
- Candidate name & email
- Job posting title
- Application date & time ago indicator
- Current status badge with color coding
- Phone number if available

**Status Management**:
- Applied (default)
- Scheduled (interview booked)
- Under Review
- Rejected
- Offer Extended
- Hired

**Actions Per Application**:
- 👁️ **View Details**: Open application detail panel
- 📅 **Schedule Interview**: Open interview scheduling modal
- 💬 **Message**: Start conversation
- ✉️ **Email**: Quick email templates

**Application Detail Panel** (Right Sidebar):
- Candidate profile summary
- Application details (date, status, job posting)
- **Status Change Dropdown**: Update application status
- **Notes Section**: Add/view recruiter notes (saved per application)
- **Email Composer**: 
  - Template selector (Interview, Follow-up, Rejection, Offer)
  - Auto-fill with candidate name, job title, company name
  - Opens in default mail client
- **Quick Actions**:
  - Schedule Interview
  - View Resume
  - Call Candidate (phone link)
  - Message
- Resume download link
- Contact information (email, phone)

**Email Templates**:
1. **Interview Invitation**: "Interview Invitation — {job_title} at {company}"
2. **Follow-up**: "Following Up — {job_title} Application"
3. **Rejection**: "Update on Your Application — {job_title}"
4. **Offer**: "Congratulations! Offer for {job_title}"

**Interview Scheduling Modal**:
- Meeting name input
- Interview type (Phone, Video, In-Person, Panel)
- Date picker
- Time input
- Duration dropdown
- Interviewer selection (multi-select)
- Notes/Agenda
- Auto-send calendar invite

---

### **4️⃣ TAB: Matches** (Mutual Interest)

**Purpose**: Candidates who've liked your job posting AND you've liked them back

**Features**:
- 🤝 **Two-way Match Indicator**: Shows mutual interest
- ✅ **Pre-qualified Pool**: Both parties expressed interest
- 💬 **Direct Messaging**: Easy communication initiation

**Match Card Display**:
- Candidate information
- Job posting details
- Match date
- Match score/compatibility

**Actions Available**:
- 👁️ **View Profile**: Complete candidate details
- 💬 **Start Conversation**: Initiate chat
- 📧 **Send Email**: Quick outreach
- 📅 **Schedule Interview**: Book meeting

---

### **5️⃣ TAB: Browse** (Candidate Search & Discovery)

**Purpose**: Proactively search and discover candidates in the platform

**Features**:
- 🔍 **Search Bar**: Full-text search (name, skills, location, experience)
- 🏷️ **Role Filter**: Filter by job role
- 🏢 **Work Type Filter**: Remote, Hybrid, Onsite
- 📍 **Location Filter**: City/state search
- 📄 **Pagination**: 20 candidates per page
- 📊 **Results Count**: Total candidates found

**Debounced Search**: Automatic 500ms delay to reduce API calls

**Candidate Cards Display**:
- Avatar/initial
- Name
- Professional title/role
- Location
- Years of experience
- Key skills preview
- Availability status

**Actions Available**:
- 👁️ **View Profile**: Full candidate modal
- ❤️ **Shortlist**: Add to favorites
- ✉️ **Ask to Apply**: Send invitation
- 💬 **Message**: Direct chat

**Empty States**:
- No candidates found for filters
- Suggestions to adjust search criteria

---

### **6️⃣ TAB: Messages** (Chat & Communication)

**Purpose**: Centralized messaging system for candidate communication

**Features**:
- 💬 **Chat Window Component**: Real-time messaging interface
- 📋 **Conversation List**: All active chats
- 🔔 **Unread Indicators**: Badge counts for new messages
- 🔍 **Search Conversations**: Find specific chats
- 📎 **File Attachments**: Share documents
- ⏱️ **Timestamps**: Message time tracking

**Chat Interface**:
- Candidate/recruiter identification
- Message history
- Typing indicators
- Read receipts
- Online status
- Message composer

**Actions**:
- Send text messages
- Upload files
- View shared files
- Archive conversations
- Search within conversation

---

## 🎯 Additional Recruiter Dashboard Features

### **Header Components**:

**1. Job Selector Dropdown**:
- Lists all active/reposted jobs
- Shows job title
- Highlights reopened jobs with [REOPENED] label
- Persists selection in URL params
- Empty state: "Create your first job posting"

**2. Notification Bell Drawer**:
- Real-time notifications
- Badge count for unread
- Categories: Applications, Matches, Messages, System
- Mark as read functionality
- Notification preferences link

**3. Profile Menu**:
- User name/email display
- Company name
- User avatar/initial
- **Menu Options**:
  - 📝 Post a Job
  - 👤 Recruiter Profile
  - 🏢 Company Profile
  - 📊 Analytics (if available)
  - 📅 Calendar Settings
  - 🔔 Notification Preferences
  - 🚪 Logout

### **URL State Management**:
- Tab state persisted: `?tab=recommendations`
- Job selection: `?job=123`
- Application filters: `?search=john&job=123&appStatus=scheduled&sort=newest`
- Enables bookmarking and sharing filtered views
- Browser back/forward navigation support

### **Performance Features**:
- Debounced search (500ms)
- Memoized filtered lists
- Lazy loading for large datasets
- Optimistic UI updates

---

## 👤 CANDIDATE DASHBOARD

### **Tech Stack**
- Same as Recruiter Dashboard (React 18 + TypeScript)
- Custom FilterPill component with accessibility features
- Portal-based dropdown menus
- URL-driven state management

### **Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Profile Selector | Menu | Bell          │
├─────────────────────────────────────────────────────────┤
│  Tabs: Recommendations | Invites | Available |          │
│        Applied | Matches | Messages                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                   Tab Content Area                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📑 CANDIDATE TABS & FEATURES

### **1️⃣ TAB: Recommendations** (AI Job Matching)

**Purpose**: Personalized job recommendations based on candidate profile and preferences

**Features**:
- 🤖 **AI-Powered Matching**: Jobs matched to skills, experience, preferences
- 🎴 **Swipeable Card Interface**: Intuitive job browsing
- ⌨️ **Keyboard Navigation**: Arrow keys for quick navigation
- 🏷️ **Role Filter**: Focus on specific job types
- 📊 **Profile Selector**: Switch between multiple job profiles

**Job Card Display**:
- Company name
- Job title
- Location
- Work type (Remote/Hybrid/Onsite)
- Employment type (Full-time/Contract/etc.)
- Salary range
- Key requirements preview
- Match percentage/score
- Status badges (Already Liked, Already Passed, Applied)

**Actions Available**:
- ❌ **Pass**: Skip this job (remembers your choice)
- ❤️ **Like**: Save to favorites
- ✅ **Apply Now**: Quick apply with saved resume
- 👁️ **View Details**: Full job description modal

**Smart Status Indicators**:
- Shows if already liked/passed
- Shows if already applied
- Prevents duplicate actions
- Visual confirmation (✓ checkmarks)

**Job Detail Drawer**:
- Complete job description
- Company information
- Detailed requirements
- Benefits and perks
- Team size
- Reporting structure
- Application deadline
- Social proof (applicant count)

---

### **2️⃣ TAB: Invites** (Recruiter Invitations)

**Purpose**: Personalized job invitations from recruiters who've reviewed your profile

**Features**:
- ✉️ **Special Invitation Badge**: Distinct visual indicator
- 🔍 **Search**: Find invites by title, company, or description
- 🏷️ **Role Filter**: Filter by job title/role
- 🏢 **Work Type Filter**: Remote/Hybrid/Onsite
- 📍 **Location Filter**: Geographic search
- 📊 **Results Count**: "Showing X of Y invites"
- 🔄 **Clear Filters**: Reset all filters at once

**Invitation Card Display**:
- Prominent "RECRUITER INVITATION" badge
- Company name
- Job title
- Professional details grid:
  - Location with icon
  - Work type with icon
  - Salary range with icon
- Applied status indicator

**Actions Available**:
- 👁️ **View Details**: Full job description
- ✅ **Apply Now**: One-click application
- ✅ **Applied ✓**: Shows completed applications

**Invitation Modal**:
- Complete job details
- Company profile
- Why you were invited (match reasons)
- Recruiter note (if any)
- Apply directly from modal

---

### **3️⃣ TAB: Available** (Browse All Jobs)

**Purpose**: Comprehensive job board with advanced filtering

**Features**:
- 🔍 **Search Bar**: Full-text search across titles, companies, descriptions
- 🏷️ **Role Filter Dropdown**: Filter by job title/role
- 🏢 **Work Type Dropdown**: Remote/Hybrid/Onsite filter
- 📍 **Location Search**: City/state filtering
- 📊 **Application Status Filter**: Show applied/not applied jobs
- 📈 **Results Counter**: "Showing X of Y jobs"
- 🔄 **Clear All Filters**: One-click reset
- 🎨 **Active Filter Indicators**: Visual feedback

**Enhanced Filter Toolbar**:
- Professional card design
- Input labels with icons
- Real-time filtering
- Filter count badges
- Responsive layout

**Job Card Display**:
- Company logo/name
- Job title
- Detailed information grid:
  - Location
  - Work type
  - Salary range
  - Posted date
  - Applicant count
- Applied status badge

**Actions Available**:
- 👁️ **View Details**: Full job modal
- ✅ **Apply**: Submit application
- ❌ **Withdraw**: Cancel application (if already applied)
- ❤️ **Save**: Add to favorites

**Empty States**:
- No jobs match filters
- Suggestions to broaden search
- Create job preferences CTA

---

### **4️⃣ TAB: Applied** (Application Tracking)

**Purpose**: Track all job applications and their status

**Features**:
- 📋 **Dual View Tabs**: 
  - ❤️ **Liked Jobs**: Jobs you've saved
  - ✅ **Applied Jobs**: Submitted applications
- 📊 **Application Status Tracking**
- 📅 **Application Timeline**: When you applied
- 🔔 **Status Update Notifications**

**Application Card Display**:
- Company name
- Job title
- Application date
- Current status badge:
  - Submitted
  - Under Review
  - Interview Scheduled
  - Offer Received
  - Rejected
- Last updated timestamp

**Application Details**:
- Which resume was submitted
- Cover letter (if included)
- Application notes
- Status history/timeline
- Recruiter actions taken

**Actions Available**:
- 👁️ **View Details**: Full application info
- 💬 **Message Recruiter**: Chat functionality
- ❌ **Withdraw Application**: Cancel before review
- 📄 **View Job Posting**: Return to original posting
- 📥 **Download Resume**: Get submitted resume

**Status Tracking**:
1. **Submitted** (Just applied)
2. **Under Review** (Recruiter viewing)
3. **Shortlisted** (Added to favorites)
4. **Interview Scheduled** (Meeting booked)
5. **Interview Completed** (Post-interview)
6. **Offer Extended** (Job offer received)
7. **Hired** (Accepted offer)
8. **Rejected** (Not selected)

---

### **5️⃣ TAB: Matches** (Mutual Interest)

**Purpose**: Jobs where both you and the recruiter showed interest

**Features**:
- 🤝 **Mutual Interest Indicator**: Both parties liked each other
- ✅ **High Conversion Potential**: Pre-qualified opportunities
- 💬 **Direct Communication**: Easy recruiter contact
- 📊 **Match Score**: Compatibility percentage

**Match Card Display**:
- Company information
- Job details
- Match date
- Compatibility score
- Mutual like indicator
- Status badges

**Actions Available**:
- 👁️ **View Job Details**: Complete posting
- ✅ **Apply Now**: Quick application
- 💬 **Message Recruiter**: Start chat
- ❤️ **Unlike**: Remove from matches

**Match Benefits**:
- Higher response rate from recruiters
- Faster application processing
- Direct recruiter access
- Priority consideration

---

### **6️⃣ TAB: Messages** (Communication Hub)

**Purpose**: Chat with recruiters and hiring managers

**Features**:
- 💬 **Chat Window**: Real-time messaging
- 📋 **Conversation List**: All active chats
- 🔔 **Unread Badges**: New message indicators
- 🔍 **Search**: Find conversations
- 📎 **Attachments**: Share resumes, portfolios
- ⏱️ **Timestamps**: Message tracking

**Chat Interface**:
- Recruiter identification
- Company context
- Job posting reference
- Message history
- Read receipts
- Typing indicators
- Online status

**Actions**:
- Send messages
- Share files
- View shared documents
- Archive conversations
- Report inappropriate messages

---

## 🎯 Additional Candidate Dashboard Features

### **Header Components**:

**1. Profile Selector Dropdown**:
- Switch between job profiles
- "All Profiles" view option
- Create new profile CTA
- Profile name display
- Current selection indicator

**2. Notification Bell Drawer**:
- Application status updates
- New job recommendations
- Recruiter messages
- Interview reminders
- Offer notifications
- Badge count

**3. Profile Menu**:
- Candidate name/email
- Avatar/initial
- **Menu Options**:
  - 👤 My Profile
  - 📄 Job Preferences
  - 📅 Calendar Settings
  - 🔔 Notification Settings
  - ❓ Help & Support
  - 🚪 Logout

### **Global Features**:
- **Dark Mode Support**: Toggle light/dark themes (planned)
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Responsive Design**: Mobile, tablet, desktop optimized
- **PWA Capabilities**: Offline support, push notifications (planned)
- **URL State**: Shareable filtered views, bookmark support

### **Smart Features**:
- **Duplicate Prevention**: Warns before re-applying
- **Auto-save Drafts**: Application forms auto-save
- **Quick Apply**: Use saved resume/profile for fast applications
- **Application Limits**: Prevents spam, tracks daily limits
- **Match Notifications**: Real-time alerts for new matches

---

## 🔧 Shared Components & Features

### **Notification System**:
- Real-time notifications via WebSocket
- Push notification support
- Email notification preferences
- In-app notification center
- Notification categories:
  - Applications (for recruiters)
  - Status updates (for candidates)
  - Messages
  - Matches
  - System announcements

### **Meeting/Interview Scheduler**:
- Calendar integration
- Availability management
- Meeting type selection
- Time zone handling
- Video call links (Zoom, Meet, Teams)
- Calendar invites (.ics files)
- Reminder emails
- Rescheduling support
- Cancellation with notifications

### **Chat/Messaging System**:
- Real-time communication
- File sharing
- Message history
- Search within conversations
- Read receipts
- Typing indicators
- Online status
- Conversation archiving

### **Document Management**:
- Resume upload/storage
- Multiple resume versions
- Cover letter templates
- Certification uploads
- Portfolio links
- Document preview
- Version control

### **Search & Discovery**:
- Elasticsearch-powered (backend)
- Fuzzy matching
- Faceted filters
- Sort options
- Saved searches
- Search history
- Smart suggestions

---

## 🎨 Design System

### **Color Palette**:
- Primary: `#667eea` (Purple gradient start)
- Secondary: `#764ba2` (Purple gradient end)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Gray Scale: `#1e293b` to `#f8fafc`

### **Typography**:
- Font Family: Inter, system-ui, sans-serif
- Headings: 24px - 17px (font-weight: 600-700)
- Body: 14px - 13px (font-weight: 400-500)
- Small: 12px - 11px (font-weight: 500-600)

### **Components**:
- **Cards**: Rounded (12px), shadow-lifted on hover
- **Buttons**: Gradient primary, solid secondary/success
- **Badges**: Pill-shaped, color-coded by status
- **Modals**: Centered overlay with blur backdrop
- **Drawers**: Slide-in side panels
- **Dropdowns**: Portal-rendered, keyboard accessible

### **Animations**:
- Fade in/out
- Slide in/out
- Scale on hover
- Skeleton loading states
- Smooth transitions (0.2s ease)

---

## 🚀 Performance Optimizations

### **Frontend**:
- React.memo for expensive components
- useMemo/useCallback for derived state
- Debounced search inputs (500ms)
- Lazy loading for modals/drawers
- Virtual scrolling for long lists (planned)
- Code splitting by route
- Image optimization/lazy loading

### **State Management**:
- URL-driven state for shareability
- LocalStorage for preferences
- Optimistic UI updates
- Background data refetching
- Stale-while-revalidate pattern

### **API Optimization**:
- Request batching
- Response caching
- Pagination (20-50 items)
- Incremental loading
- GraphQL for complex queries (planned)

---

## 📊 Analytics & Tracking

### **User Analytics**:
- Page views
- Time on page
- Click tracking
- Search queries
- Filter usage
- Conversion funnels

### **Business Metrics**:
- Application completion rate
- Time to apply
- Match quality
- Response rates
- Hire conversion
- User engagement

---

## 🔒 Security Features

### **Authentication**:
- JWT token-based auth
- Secure token storage
- Auto-refresh tokens
- Role-based access control (RBAC)
- Protected routes

### **Data Protection**:
- HTTPS only
- XSS prevention
- CSRF tokens
- Input sanitization
- Secure file uploads
- Privacy controls

---

## 🌐 Accessibility (WCAG 2.1 AA)

### **Features**:
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- High contrast mode
- Accessible forms with validation
- Error announcements

---

## 📱 Responsive Breakpoints

### **Desktop**: 1280px+
- Full feature set
- Three-column layouts
- Side-by-side views

### **Tablet**: 768px - 1279px
- Adapted layouts
- Collapsible sidebars
- Touch-optimized

### **Mobile**: < 768px
- Single column
- Bottom navigation
- Drawer menus
- Touch gestures

---

## 🎯 Key User Flows

### **Recruiter Flow**:
1. Post a job → 2. Review AI recommendations → 3. Shortlist candidates → 4. Review applications → 5. Schedule interviews → 6. Make offers → 7. Track hires

### **Candidate Flow**:
1. Create profile → 2. Set job preferences → 3. Browse/receive recommendations → 4. Apply to jobs → 5. Track applications → 6. Message recruiters → 7. Accept offers

---

## 🔮 Planned Enhancements

### **Coming Soon**:
- Video interview integration
- AI resume builder
- Salary negotiation tools
- Employee referral program
- Advanced analytics dashboard
- Mobile apps (iOS/Android)
- Chrome extension
- API for integrations
- Zapier/Make.com connectors

---

## 📝 Summary

**Recruiter Dashboard** provides:
- 6 main tabs: Recommendations, Shortlist, Applications, Matches, Browse, Messages
- AI-powered candidate matching
- Comprehensive application tracking
- Interview scheduling
- Direct messaging
- Email templates
- Status management
- Analytics and reporting

**Candidate Dashboard** provides:
- 6 main tabs: Recommendations, Invites, Available, Applied, Matches, Messages
- AI job recommendations
- Advanced job search and filtering
- Application tracking
- Recruiter invitations
- Mutual matching system
- Direct recruiter communication
- Profile management

**Total Features**: 100+ distinct features across both dashboards
**Total Components**: 50+ reusable React components
**Total Routes**: 20+ protected and public routes
**Total API Endpoints**: 40+ REST endpoints

---

*This document provides a complete overview of all UI features, tabs, and functionalities for TalentGraph V2 as of May 2026. Use this to communicate the system's capabilities to stakeholders, developers, or AI assistants for enhancements.*
