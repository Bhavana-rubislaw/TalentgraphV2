# TalentGraph V2 - Complete Frontend Code Explanation

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Project Structure](#project-structure)
4. [Routing & Navigation](#routing--navigation)
5. [Authentication Flow](#authentication-flow)
6. [State Management](#state-management)
7. [API Client](#api-client)
8. [Pages & Components](#pages--components)
9. [UI Patterns & Interactions](#ui-patterns--interactions)
10. [Control Flow Examples](#control-flow-examples)

---

## Overview

**TalentGraph V2 Frontend** is a modern React application built with **TypeScript**, **Vite**, and **React Router**. It provides a Tinder-style matching interface for candidates and recruiters, with features including profile management, job swiping, application tracking, messaging, and interview scheduling.

**Key Features:**
- Dual-sided platform (Candidate & Recruiter dashboards)
- Swipe-based matching system
- Real-time notifications
- Chat messaging
- Interview scheduler with calendar integration
- Profile & preference management
- Application tracking
- Analytics & reporting

---

## Architecture & Tech Stack

### Core Technologies
```
React 18.2          → UI framework with hooks
TypeScript 5.2      → Type safety
Vite 5.0            → Build tool (fast HMR)
React Router 6.20   → Client-side routing
Axios 1.6           → HTTP client
Zustand 4.4         → State management (lightweight)
Framer Motion 10    → Animations
date-fns 2.30       → Date utilities
```

### Build & Development
```
Vite Dev Server     → localhost:3000 (default)
Hot Module Replacement (HMR) → Instant updates
TypeScript Compiler → Type checking
```

### Environment Configuration
```
VITE_API_URL        → Backend API URL (default: http://localhost:8001)
```

---

## Project Structure

```
frontend2/
├── public/                     # Static assets
├── src/
│   ├── main.tsx                # Application entry point
│   ├── App.tsx                 # Root component with routing
│   ├── index.css               # Global styles
│   ├── api/
│   │   └── client.ts           # Axios API client with all endpoints
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── hooks/
│   │   ├── useLogging.ts       # Logging hooks
│   │   └── useQueryState.ts    # URL query parameter state
│   ├── pages/                  # Full-page components
│   │   ├── LandingPage.tsx     # Homepage
│   │   ├── SignupPage.tsx      # Login/signup
│   │   ├── CandidateDashboardNew.tsx   # Candidate dashboard
│   │   ├── RecruiterDashboardNew.tsx   # Recruiter dashboard
│   │   ├── JobPreferencesPage.tsx      # Profile creation
│   │   ├── MeetingsPage.tsx    # Interview scheduler
│   │   └── ...
│   ├── components/             # Reusable components
│   │   ├── swipe/
│   │   │   └── SwipeCard.tsx   # Tinder-style card
│   │   ├── notifications/
│   │   │   └── NotificationBellDrawer.tsx
│   │   ├── chat/
│   │   │   └── ChatWindow.tsx  # Messaging interface
│   │   ├── meetings/
│   │   │   ├── CreateMeetingModal.tsx
│   │   │   └── MeetingTimeline.tsx
│   │   ├── dashboard/          # Dashboard widgets
│   │   └── ...
│   ├── types/
│   │   └── meeting.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── logger.ts           # Frontend logging service
│   │   └── serverAction.ts     # Server interaction utilities
│   └── styles/                 # CSS modules
│       ├── ModernDashboard.css
│       ├── PremiumCards.css
│       └── ...
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── vite.config.ts              # Vite config
```

---

## Routing & Navigation

### Main Router (`App.tsx`)

All routes are defined in the `App.tsx` file using **React Router v6**.

```typescript
<Router>
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/signin" element={<SignupPage />} />

    {/* Recruiter Routes (Protected) */}
    <Route path="/recruiter-dashboard" element={
      <ProtectedRoute allowedRoles={['admin', 'recruiter', 'hr']}>
        <RecruiterDashboard />
      </ProtectedRoute>
    } />

    {/* Candidate Routes (Protected) */}
    <Route path="/candidate-dashboard" element={
      <ProtectedRoute allowedRoles={['candidate']}>
        <CandidateDashboard />
      </ProtectedRoute>
    } />

    {/* Shared Routes */}
    <Route path="/meetings" element={
      <ProtectedRoute allowedRoles={['admin', 'recruiter', 'hr', 'candidate']}>
        <MeetingsPage />
      </ProtectedRoute>
    } />
  </Routes>
</Router>
```

### Protected Route Component

**File:** `App.tsx`  
**Purpose:** Prevents unauthorized access to routes based on user role

```typescript
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[] 
}> = ({ children, allowedRoles }) => {
  const { user, bootStatus } = useAuth();

  // 1. Wait for boot validation to complete
  if (bootStatus === 'loading') return null;

  // 2. Check if token exists
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  // 3. Validate user role
  const userRole = user?.role || localStorage.getItem('role') || '';
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Smart redirect to correct dashboard
    if (userRole === 'candidate') {
      return <Navigate to="/candidate-dashboard" replace />;
    }
    if (['recruiter', 'hr', 'admin'].includes(userRole)) {
      return <Navigate to="/recruiter-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // 4. Render protected content
  return <>{children}</>;
};
```

**Control Flow:**
```
User navigates to /recruiter-dashboard
  ↓
ProtectedRoute checks bootStatus
  ↓ (if loading)
  → Show loading spinner, wait for /auth/me
  ↓ (if done)
Check for token in localStorage
  ↓ (if no token)
  → Redirect to /signin
  ↓ (if token exists)
Check user role matches allowedRoles
  ↓ (if mismatch)
  → Redirect to appropriate dashboard
  ↓ (if match)
Render <RecruiterDashboard />
```

### Boot Gate

**Purpose:** Shows loading spinner while validating JWT token on app startup

```typescript
const BootGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bootStatus } = useAuth();
  
  if (bootStatus === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }
  
  return <>{children}</>;
};
```

**When It's Used:**
```typescript
<AuthProvider>
  <Router>
    <BootGate>
      <Routes>...</Routes>
    </BootGate>
  </Router>
</AuthProvider>
```

---

## Authentication Flow

### AuthContext (`contexts/AuthContext.tsx`)

**Purpose:** Manages global authentication state using React Context API

```typescript
interface AuthUser {
  user_id: number;
  email: string;
  role: string;  // 'candidate' | 'recruiter' | 'admin' | 'hr'
  full_name: string;
  company_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  bootStatus: 'loading' | 'done';
  logout: () => void;
  setUser: (u: AuthUser | null) => void;
}
```

### Boot Process (Token Validation)

**When:** App starts (useEffect in AuthProvider)

```typescript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    setBootStatus('done');
    return;
  }

  // Call /auth/me to validate token
  apiClient.getCurrentUser()
    .then((res) => {
      const authUser: AuthUser = {
        user_id: res.data.user_id,
        email: res.data.email,
        role: res.data.role.toLowerCase().trim(),
        full_name: res.data.full_name,
        company_name: res.data.company_name,
      };
      
      setUser(authUser);
      
      // Sync to localStorage
      localStorage.setItem('user_id', String(authUser.user_id));
      localStorage.setItem('role', authUser.role);
      localStorage.setItem('full_name', authUser.full_name);
      localStorage.setItem('email', authUser.email);
    })
    .catch((err) => {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        // Token invalid/expired - clear auth state
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        setUser(null);
      }
    })
    .finally(() => {
      setBootStatus('done');
    });
}, []);
```

**Control Flow:**
```
1. App loads → AuthProvider mounts
   ↓
2. Check localStorage for token
   ↓ (if no token)
   → Set bootStatus='done', skip validation
   ↓ (if token exists)
3. Call GET /auth/me with token in Authorization header
   ↓
4. Backend validates JWT
   ↓ (if valid)
   → Return user data
   → Update AuthContext.user
   → Sync to localStorage
   ↓ (if invalid 401/403)
   → Clear token from localStorage
   → Set user=null
   ↓
5. Set bootStatus='done'
   ↓
6. BootGate removes loading spinner
   ↓
7. Routes render
```

### Login Flow

**Page:** `SignupPage.tsx`  
**API Call:** `POST /auth/candidate/login` or `POST /auth/company/login`

```typescript
const handleLogin = async () => {
  try {
    const response = await apiClient.candidateLogin(email, password);
    const { token, role, user_id, email: userEmail, full_name } = response.data;
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user_id', String(user_id));
    localStorage.setItem('email', userEmail);
    localStorage.setItem('full_name', full_name);
    
    // Update context (skip re-fetching /auth/me)
    setUser({
      user_id,
      email: userEmail,
      role: role.toLowerCase(),
      full_name
    });
    
    // Navigate to appropriate dashboard
    if (role === 'candidate') {
      navigate('/candidate-dashboard');
    } else {
      navigate('/recruiter-dashboard');
    }
  } catch (error) {
    setErrorMessage('Invalid credentials');
  }
};
```

### Logout Flow

```typescript
const logout = () => {
  // Clear all auth data from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('email');
  localStorage.removeItem('full_name');
  localStorage.removeItem('company_name');
  
  // Clear context
  setUser(null);
  
  // Redirect to login
  navigate('/signin');
};
```

---

## State Management

### 1. **React Context** (Global State)

**Used For:** Authentication  
**File:** `contexts/AuthContext.tsx`

```typescript
const { user, bootStatus, logout, setUser } = useAuth();
```

**Why Context?**
- Auth state needs to be accessible everywhere
- Avoids prop drilling through multiple components
- Provides single source of truth for user data

---

### 2. **Local State** (Component-Level)

**Used For:** UI state, form inputs, local data  
**API:** `useState` hook

```typescript
const [activeTab, setActiveTab] = useState('recommendations');
const [applications, setApplications] = useState([]);
const [loading, setLoading] = useState(false);
```

**Example: Dashboard Tab State**
```typescript
const CandidateDashboard = () => {
  const [activeTab, setActiveTab] = useState('recommendations');
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'recommendations':
        return <RecommendationsTab />;
      case 'applied':
        return <ApplicationsTab />;
      case 'matches':
        return <MatchesTab />;
      default:
        return null;
    }
  };
  
  return (
    <div>
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
      {renderTabContent()}
    </div>
  );
};
```

---

### 3. **URL State** (Query Parameters)

**Used For:** Shareable/bookmarkable state  
**API:** `useSearchParams` from React Router

**Example: Dashboard Filters**
```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Read from URL: ?tab=applications&job=123&status=shortlisted
const activeTab = searchParams.get('tab') || 'recommendations';
const selectedJob = searchParams.get('job');
const statusFilter = searchParams.get('status') || 'all';

// Update URL
const setActiveTab = (tab: string) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.set('tab', tab);
    return next;
  });
};
```

**Why URL State?**
- Users can bookmark specific dashboard views
- Back/forward buttons work correctly
- Easy to share links (e.g., "See this application")

**Example Flow:**
```
User clicks "Applications" tab
  ↓
setActiveTab('applications') called
  ↓
URL updates: /recruiter-dashboard?tab=applications
  ↓
Component re-renders with new tab
  ↓
User clicks browser back button
  ↓
URL reverts: /recruiter-dashboard?tab=recommendations
  ↓
Component automatically switches tab
```

---

### 4. **LocalStorage** (Persistent State)

**Used For:** Auth tokens, user preferences  
**API:** Browser `localStorage`

```typescript
// Store
localStorage.setItem('token', jwt_token);
localStorage.setItem('role', 'candidate');

// Read
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

// Remove
localStorage.removeItem('token');
```

**What's Stored:**
```
token          → JWT for API authentication
role           → 'candidate' | 'recruiter' | 'admin' | 'hr'
user_id        → User ID number
email          → User email
full_name      → Display name
company_name   → Company name (recruiters only)
```

---

## API Client

### Axios Instance (`api/client.ts`)

**Purpose:** Centralized HTTP client with automatic token injection

```typescript
import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**How It Works:**
```
Component calls apiClient.getJobPostings()
  ↓
Axios interceptor runs before request
  ↓
Reads token from localStorage
  ↓
Adds "Authorization: Bearer <token>" header
  ↓
Sends request to backend
  ↓
Backend validates token
  ↓
Returns data
  ↓
Component receives response
```

### API Methods

All API endpoints are defined as methods on `apiClient`:

```typescript
export const apiClient = {
  // ─── Authentication ───────────────────────────────────────
  candidateSignup: (email, fullName, password) =>
    api.post('/auth/candidate/signup', { email, full_name: fullName, password }),
  
  candidateLogin: (email, password) =>
    api.post('/auth/candidate/login', { email, password }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),

  // ─── Candidates ───────────────────────────────────────────
  createCandidateProfile: (data) =>
    api.post('/candidates/profile', data),
  
  getCandidateProfile: () =>
    api.get('/candidates/profile'),
  
  createJobProfile: (data) =>
    api.post('/candidates/job-profiles', data),
  
  getJobProfiles: () =>
    api.get('/candidates/job-profiles'),

  // ─── Job Postings ─────────────────────────────────────────
  createJobPosting: (data) =>
    api.post('/job-postings', data),
  
  getJobPostings: (activeOnly = true) =>
    api.get('/job-postings', { params: { active_only: activeOnly } }),
  
  updateJobPostingStatus: (id, action, cancellation_reason) =>
    api.post(`/job-postings/${id}/status`, { action, cancellation_reason }),

  // ─── Applications ─────────────────────────────────────────
  applyToJob: (jobPostingId, jobProfileId) =>
    api.post('/applications/apply', { job_posting_id: jobPostingId, job_profile_id: jobProfileId }),
  
  getMyApplications: () =>
    api.get('/applications/my-applications'),
  
  updateApplicationStatus: (id, status, recruiterNotes) =>
    api.patch(`/applications/${id}/status`, { status, recruiter_notes: recruiterNotes }),

  // ─── Swipes ───────────────────────────────────────────────
  swipeLike: (jobProfileId, jobPostingId) =>
    api.post('/swipes/like', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  swipePass: (jobProfileId, jobPostingId) =>
    api.post('/swipes/pass', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),

  // ─── Meetings ─────────────────────────────────────────────
  createMeeting: (data) =>
    api.post('/meetings/create', data),
  
  getMeetings: (params) =>
    api.get('/meetings', { params }),
  
  cancelMeeting: (id, reason) =>
    api.post(`/meetings/${id}/cancel`, { reason }),

  // ─── Notifications ────────────────────────────────────────
  getNotifications: (unreadOnly = false) =>
    api.get('/notifications', { params: { unread_only: unreadOnly } }),
  
  markNotificationRead: (id) =>
    api.patch(`/notifications/${id}/read`),
  
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  // ─── Messages ─────────────────────────────────────────────
  sendMessage: (conversationId, text) =>
    api.post('/messages/send', { conversation_id: conversationId, text }),
  
  getConversation: (conversationId) =>
    api.get(`/messages/conversation/${conversationId}`),
};
```

### Usage in Components

```typescript
const CandidateDashboard = () => {
  const [applications, setApplications] = useState([]);
  
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await apiClient.getMyApplications();
        setApplications(response.data.applications);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      }
    };
    
    fetchApplications();
  }, []);
  
  return (
    <div>
      {applications.map(app => <ApplicationCard key={app.id} {...app} />)}
    </div>
  );
};
```

---

## Pages & Components

### 1. **Landing Page** (`LandingPage.tsx`)

**Route:** `/`  
**Purpose:** Public homepage with hero section and CTAs

**Key Features:**
- Hero section with value proposition
- "Sign Up as Candidate" button → `/signup?role=candidate`
- "Sign Up as Recruiter" button → `/signup?role=recruiter`
- Feature highlights
- Testimonials

**Control Flow:**
```
User visits www.talentgraph.com
  ↓
LandingPage renders
  ↓
User clicks "Sign Up as Candidate"
  ↓
Navigate to /signup?role=candidate
  ↓
SignupPage reads ?role=candidate
  ↓
Shows candidate signup form
```

---

### 2. **Signup/Login Page** (`SignupPage.tsx`)

**Routes:** `/signup`, `/signin`  
**Purpose:** Unified authentication page with tabs

**UI Structure:**
```
┌─────────────────────────────┐
│  TalentGraph Logo           │
├─────────────────────────────┤
│  [ Sign Up ] [ Sign In ]    │  ← Tabs
├─────────────────────────────┤
│  Email:    [____________]   │
│  Password: [____________]   │
│  Full Name:[____________]   │  (signup only)
│  Role:     [Candidate ▼]    │  (signup only)
│  [Continue]                 │
└─────────────────────────────┘
```

**Signup Flow:**
```typescript
const handleSignup = async () => {
  try {
    if (role === 'candidate') {
      const response = await apiClient.candidateSignup(email, fullName, password);
    } else {
      const response = await apiClient.companySignup(email, fullName, password, companyRole);
    }
    
    const { token, role, user_id } = response.data;
    
    // Store auth data
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user_id', user_id);
    
    // Redirect based on role
    if (role === 'candidate') {
      navigate('/candidate/profile');  // Complete profile
    } else {
      navigate('/recruiter-dashboard');
    }
  } catch (error) {
    setError('Signup failed');
  }
};
```

---

### 3. **Candidate Dashboard** (`CandidateDashboardNew.tsx`)

**Route:** `/candidate-dashboard`  
**Role:** `candidate`

**Tab Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  TalentGraph    [Recommendations][Invites][Available]...    │
│                                                 🔔 [Profile] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Active Tab Content]                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Recommendations** - Personalized job recommendations
2. **Invites** - Recruiter "Ask to Apply" invitations
3. **Available** - All active jobs
4. **Applied** - Application status tracking
5. **Matches** - Mutual matches
6. **Messages** - Direct conversations

**State Management:**
```typescript
const CandidateDashboard = () => {
  // Tab driven by URL: ?tab=recommendations
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'recommendations';
  
  // Data state
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeTab === 'applied') {
      fetchApplications();
    }
  }, [activeTab]);
  
  return (
    <div className="dashboard">
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
      {renderTabContent()}
    </div>
  );
};
```

#### Recommendations Tab

**Purpose:** Swipe through recommended jobs

**UI:**
```
┌──────────────────────────┐
│   🎯 85% Match           │
│                          │
│   Software Engineer      │
│   Google Inc.            │
│   $120k - $150k          │
│   Remote                 │
│                          │
│   ✓ Python               │
│   ✓ React                │
│   ✓ AWS                  │
│                          │
│   [❌ Pass]  [✓ Like]    │
└──────────────────────────┘
```

**Swipe Logic:**
```typescript
const handleLike = async (jobPostingId: number) => {
  try {
    const response = await apiClient.swipeLike(jobProfileId, jobPostingId);
    
    if (response.data.match) {
      // Mutual match detected!
      showToast('🎉 You matched with this company!');
      navigate('/candidate-dashboard?tab=matches');
    } else {
      // Like recorded, no match yet
      showToast('✓ Job saved to likes');
    }
    
    // Move to next card
    setCurrentCardIndex(prev => prev + 1);
  } catch (error) {
    showToast('Failed to save like');
  }
};

const handlePass = async (jobPostingId: number) => {
  await apiClient.swipePass(jobProfileId, jobPostingId);
  setCurrentCardIndex(prev => prev + 1);
};
```

**Swipe Card Animation:**
```typescript
const SwipeCard = ({ card, onLike, onPass }) => {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const rotation = deltaX * 0.1;  // Rotate based on drag
    
    cardRef.current.style.transform = 
      `translateX(${deltaX}px) rotate(${rotation}deg)`;
  };
  
  const handleMouseUp = () => {
    const deltaX = cardRef.current.getBoundingClientRect().left;
    
    if (deltaX > 100) {
      // Swiped right - Like
      cardRef.current.classList.add('exit-right');
      setTimeout(onLike, 600);
    } else if (deltaX < -100) {
      // Swiped left - Pass
      cardRef.current.classList.add('exit-left');
      setTimeout(onPass, 600);
    } else {
      // Snap back
      cardRef.current.style.transform = '';
    }
  };
  
  return (
    <div 
      ref={cardRef}
      className="swipe-card"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Card content */}
    </div>
  );
};
```

#### Applied Tab

**Purpose:** Track application status

**UI:**
```
┌──────────────────────────────────────────────┐
│  My Applications (12)                        │
│  [Search...] [All Jobs ▼] [All Status ▼]    │
├──────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │ Software Engineer @ Google              ││
│  │ Applied: Apr 25, 2026                   ││
│  │ Status: 🟢 Shortlisted                  ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ Backend Developer @ Microsoft           ││
│  │ Applied: Apr 20, 2026                   ││
│  │ Status: ⏳ Under Review                 ││
│  └─────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Status Colors:**
```typescript
const statusStyles = {
  applied: { color: '#3b82f6', icon: '📝' },
  scheduled: { color: '#8b5cf6', icon: '📅' },
  under_review: { color: '#f59e0b', icon: '⏳' },
  shortlisted: { color: '#10b981', icon: '🟢' },
  selected: { color: '#059669', icon: '✅' },
  rejected: { color: '#ef4444', icon: '❌' }
};
```

**Filter Logic:**
```typescript
const filteredApplications = useMemo(() => {
  return applications.filter(app => {
    // Search filter
    if (searchQuery && !app.job_title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Job filter
    if (jobFilter !== 'all' && app.job_posting_id !== parseInt(jobFilter)) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
}, [applications, searchQuery, jobFilter, statusFilter]);
```

---

### 4. **Recruiter Dashboard** (`RecruiterDashboardNew.tsx`)

**Route:** `/recruiter-dashboard`  
**Roles:** `recruiter`, `hr`, `admin`

**Tab Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Recommendations][Shortlist][Applications][Matches]...     │
├─────────────────────────────────────────────────────────────┤
│  Select Job: [Software Engineer ▼]                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Active Tab Content]                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Recommendations** - AI-matched candidates for selected job
2. **Shortlist** - Manually shortlisted candidates
3. **Applications** - All applications with status management
4. **Matches** - Mutual matches
5. **Browse** - Search all candidates
6. **Messages** - Direct conversations

#### Recommendations Tab

**Purpose:** Swipe through recommended candidates for a job

**UI:**
```
┌──────────────────────────┐
│   🎯 92% Match           │
│                          │
│   John Doe               │
│   Senior Developer       │
│   5 years experience     │
│   San Francisco, CA      │
│                          │
│   ✓ Python (5/5)         │
│   ✓ React (4/5)          │
│   ✓ AWS (5/5)            │
│                          │
│   [Shortlist] [Pass]     │
└──────────────────────────┘
```

**Candidate Swipe:**
```typescript
const handleRecruiterLike = async (candidate: any) => {
  await apiClient.recruiterLike(
    candidate.candidate_id,
    candidate.job_profile_id,
    selectedJobId
  );
  
  // Add to shortlist
  setShortlist(prev => [...prev, candidate]);
  moveToNextCard();
};
```

#### Applications Tab (Most Complex)

**Purpose:** Manage all applications with status updates

**UI:**
```
┌───────────────────────────────────────────────────────────────┐
│  Applications (48)                                            │
│  [Search...] [All Jobs ▼] [All Status ▼] [Sort: Newest ▼]   │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐│
│  │ John Doe                                                 ││
│  │ Software Engineer @ Your Company                         ││
│  │ Applied: Apr 25, 2026                                    ││
│  │ Status: [Under Review ▼]                                 ││
│  │ Notes: Strong Python background                          ││
│  │ [View Profile] [Schedule Interview]                      ││
│  └──────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

**Status Update Flow:**
```typescript
const handleStatusUpdate = async (applicationId: number, newStatus: string) => {
  try {
    // Validate transition
    const currentStatus = applications.find(a => a.id === applicationId)?.status;
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowed.includes(newStatus)) {
      showToast(`Cannot transition from ${currentStatus} to ${newStatus}`);
      return;
    }
    
    // Update in backend
    await apiClient.updateApplicationStatus(applicationId, newStatus, recruiterNotes);
    
    // Update local state
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: newStatus } 
          : app
      )
    );
    
    showToast('Status updated successfully');
  } catch (error) {
    showToast('Failed to update status');
  }
};
```

**Schedule Interview Button:**
```typescript
const handleScheduleInterview = (application: any) => {
  setSelectedAppForSchedule(application);
  setIsScheduleInterviewModalOpen(true);
};
```

---

### 5. **Meetings Page** (`MeetingsPage.tsx`)

**Route:** `/meetings`  
**Roles:** All authenticated users

**Purpose:** Calendar view + meeting scheduler

**UI:**
```
┌─────────────────────────────────────────────┐
│  [Create Meeting] [Calendar Settings]      │
├─────────────────────────────────────────────┤
│  April 2026                                 │
│  Sun Mon Tue Wed Thu Fri Sat                │
│   -   1   2   3   4   5   6                 │
│   7   8   9  10  11  12  13                 │
│                                             │
│  Upcoming Meetings:                         │
│  ┌───────────────────────────────────────┐ │
│  │ Technical Interview - John Doe        │ │
│  │ May 1, 2026 at 10:00 AM              │ │
│  │ Status: Scheduled                     │ │
│  │ [Join Zoom] [Cancel] [Reschedule]    │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Create Meeting Modal:**
```typescript
const CreateMeetingModal = ({ isOpen, onClose, applicationId }) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [participants, setParticipants] = useState([]);
  const [videoProvider, setVideoProvider] = useState('zoom');
  
  const handleCreate = async () => {
    try {
      const response = await apiClient.createMeeting({
        title,
        scheduled_start: startTime,
        scheduled_end: addMinutes(startTime, duration),
        participants,
        video_provider: videoProvider,
        application_id: applicationId
      });
      
      if (response.data.conflict) {
        showToast('Scheduling conflict detected');
        return;
      }
      
      showToast('Meeting scheduled successfully');
      onClose();
      refreshMeetings();
    } catch (error) {
      showToast('Failed to schedule meeting');
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Schedule Interview</h2>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <DateTimePicker value={startTime} onChange={setStartTime} />
      <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
        <option value={30}>30 minutes</option>
        <option value={60}>1 hour</option>
        <option value={90}>1.5 hours</option>
      </select>
      <ParticipantSelector value={participants} onChange={setParticipants} />
      <button onClick={handleCreate}>Schedule</button>
    </Modal>
  );
};
```

**Meeting Timeline:**
```typescript
const MeetingTimeline = ({ meetingId }) => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    fetchTimelineEvents(meetingId);
  }, [meetingId]);
  
  return (
    <div className="timeline">
      {events.map(event => (
        <div key={event.id} className="timeline-event">
          <div className="timeline-marker" />
          <div className="timeline-content">
            <p>{event.message}</p>
            <span>{formatDate(event.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### 6. **Job Preferences Page** (`JobPreferencesPage.tsx`)

**Route:** `/candidate/job-preferences`  
**Role:** `candidate`

**Purpose:** Create/edit job profiles (candidate's "dating profiles" for different job types)

**UI:**
```
┌──────────────────────────────────────────────┐
│  Create Your Job Profile                    │
├──────────────────────────────────────────────┤
│  Profile Name: [Senior Oracle Developer]    │
│  Product Vendor: [Oracle ▼]                 │
│  Job Role: [Developer ▼]                    │
│  Years of Experience: [5]                   │
│  Work Type: [○ Remote ○ Hybrid ○ Onsite]   │
│  Employment: [○ FT ○ PT ○ Contract]         │
│  Salary Range: [$100k] to [$150k]           │
│                                              │
│  Skills:                                     │
│  [+ Add Skill]                               │
│  ┌──────────────────────────────────┐       │
│  │ PL/SQL       Technical    5/5    │       │
│  │ Oracle Cloud Technical    4/5    │       │
│  │ Leadership   Soft         4/5    │       │
│  └──────────────────────────────────┘       │
│                                              │
│  Locations (up to 3):                       │
│  [+ Add Location]                            │
│  ┌──────────────────────────────────┐       │
│  │ San Francisco, CA                │       │
│  │ New York, NY                     │       │
│  └──────────────────────────────────┘       │
│                                              │
│  [Save Profile]                              │
└──────────────────────────────────────────────┘
```

**Form Submission:**
```typescript
const handleSubmit = async () => {
  const profileData = {
    profile_name: profileName,
    product_vendor: productVendor,
    job_role: jobRole,
    years_of_experience: yearsExperience,
    worktype: workType,
    employment_type: employmentType,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: 'usd',
    visa_status: visaStatus,
    skills: skills.map(s => ({
      skill_name: s.name,
      skill_category: s.category,
      proficiency_level: s.level
    })),
    location_preferences: locations.map(l => ({
      city: l.city,
      state: l.state,
      country: l.country
    }))
  };
  
  try {
    if (isEditing) {
      await apiClient.updateJobProfile(profileId, profileData);
    } else {
      await apiClient.createJobProfile(profileData);
    }
    
    showToast('Profile saved successfully');
    navigate('/candidate-dashboard');
  } catch (error) {
    showToast('Failed to save profile');
  }
};
```

---

### 7. **Notification System** (`NotificationBellDrawer.tsx`)

**Purpose:** Real-time in-app notifications

**UI:**
```
┌────────────────────────┐
│  🔔 (3)                │  ← Bell icon with badge
└────────────────────────┘
         ↓ (click)
┌────────────────────────────────────────┐
│  Notifications                         │
│  [Mark All Read]                       │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │ 🎉 New Match!                    │ │
│  │ You matched with Tech Corp       │ │
│  │ 2 hours ago                      │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ 📅 Interview Scheduled           │ │
│  │ Interview with Google on May 1   │ │
│  │ 1 day ago                        │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Implementation:**
```typescript
const NotificationBellDrawer = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchUnreadCount = async () => {
    const response = await apiClient.getUnreadCount();
    setUnreadCount(response.data.unread_count);
  };
  
  const fetchNotifications = async () => {
    const response = await apiClient.getNotifications();
    setNotifications(response.data);
  };
  
  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await apiClient.markNotificationRead(notification.id);
    
    // Navigate to relevant page
    const payload = JSON.parse(notification.payload);
    navigate(payload.route);
    
    setIsOpen(false);
    fetchUnreadCount();
  };
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2>Notifications</h2>
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`notification ${notif.is_read ? 'read' : 'unread'}`}
            onClick={() => handleNotificationClick(notif)}
          >
            <h3>{notif.title}</h3>
            <p>{notif.message}</p>
            <span>{formatTimeAgo(notif.created_at)}</span>
          </div>
        ))}
      </Drawer>
    </>
  );
};
```

---

### 8. **Chat Window** (`ChatWindow.tsx`)

**Purpose:** Direct messaging between candidates and recruiters

**UI:**
```
┌────────────────────────────────────────┐
│  Chat with John Doe (Google)          │
├────────────────────────────────────────┤
│  John: Hello! Thanks for applying     │
│        10:30 AM                        │
│                                        │
│  You:  Thank you for the opportunity! │
│        10:32 AM                        │
│                                        │
│  John: When are you available for an  │
│        interview?                      │
│        10:35 AM                        │
├────────────────────────────────────────┤
│  [Type a message...]         [Send]   │
└────────────────────────────────────────┘
```

**Implementation:**
```typescript
const ChatWindow = ({ conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);
  
  const fetchMessages = async () => {
    const response = await apiClient.getConversation(conversationId);
    setMessages(response.data.messages);
    scrollToBottom();
  };
  
  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    await apiClient.sendMessage(conversationId, inputText);
    setInputText('');
    fetchMessages();
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.is_mine ? 'mine' : 'theirs'}`}>
            <p>{msg.text}</p>
            <span>{format(msg.created_at, 'h:mm a')}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-area">
        <input 
          value={inputText} 
          onChange={e => setInputText(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
```

---

## UI Patterns & Interactions

### 1. **Filter Pills** (Dropdown Filters)

**Used In:** Applications tab, Browse candidates

**UI:**
```
[All Jobs ▼] [All Status ▼] [Sort: Newest ▼]
```

**Implementation:**
```typescript
const FilterPill = ({ icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="filter-pill">
      <button onClick={() => setOpen(!open)}>
        {icon}
        {options.find(o => o.value === value)?.label}
        ▼
      </button>
      
      {open && (
        <div className="dropdown-menu">
          {options.map(option => (
            <div 
              key={option.value}
              className={`option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {option.value === value && '✓'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### 2. **Modal Dialogs**

**Pattern:** Portal-based modals with backdrop

```typescript
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        {children}
      </div>
    </div>,
    document.body
  );
};
```

**Usage:**
```typescript
<Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
  <ScheduleInterviewForm />
</Modal>
```

---

### 3. **Toast Notifications**

**Pattern:** Temporary success/error messages

```typescript
const Toast = ({ message, type }) => {
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? '✓' : '✗'}
      {message}
    </div>
  );
};

// Usage
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};
```

---

### 4. **Loading States**

**Pattern:** Skeleton screens and spinners

```typescript
const ApplicationsList = ({ loading, applications }) => {
  if (loading) {
    return (
      <div className="skeleton-list">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="applications-list">
      {applications.map(app => <ApplicationCard key={app.id} {...app} />)}
    </div>
  );
};
```

---

### 5. **Infinite Scroll** (Browse Candidates)

```typescript
const BrowseCandidates = () => {
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore]);
  
  useEffect(() => {
    fetchCandidates(page);
  }, [page]);
  
  return (
    <div>
      {candidates.map((c, i) => (
        <div key={c.id} ref={i === candidates.length - 1 ? lastElementRef : null}>
          <CandidateCard {...c} />
        </div>
      ))}
    </div>
  );
};
```

---

## Control Flow Examples

### Example 1: Complete Application Flow (Candidate Side)

```
Step 1: User logs in as candidate
POST /auth/candidate/login
  ↓
Token stored in localStorage
  ↓
Navigate to /candidate-dashboard
  ↓
ProtectedRoute validates role='candidate'
  ↓
CandidateDashboard mounts

Step 2: View recommendations
useEffect runs on mount
  ↓
fetchRecommendations() called
  ↓
GET /recommendations/dashboard
  ↓
Backend returns matched jobs based on job profiles
  ↓
setRecommendations(jobs)
  ↓
SwipeCard renders with first job

Step 3: Swipe right (like)
User drags card right or clicks "Like" button
  ↓
handleLike(jobPostingId) called
  ↓
POST /swipes/like { job_profile_id, job_posting_id }
  ↓
Backend checks for mutual match
  ↓ (if mutual match)
Backend creates Match record
Backend sends notifications to both parties
  ↓
Response: { match: true, match_id: 123 }
  ↓
Frontend shows toast: "🎉 You matched!"
  ↓
Navigate to ?tab=matches

Step 4: Apply to job
User clicks "Apply" button on match
  ↓
POST /applications/apply { job_posting_id, job_profile_id }
  ↓
Backend validates:
  - Job is active (not frozen)
  - No duplicate application
  ↓
Backend creates Application record
Backend sends notifications:
  - To candidate: "Application submitted"
  - To recruiter: "New application received"
  ↓
Frontend shows success toast
  ↓
Navigate to ?tab=applied

Step 5: Track application
Applications tab loads
  ↓
GET /applications/my-applications
  ↓
Backend returns all applications with status
  ↓
Frontend displays list
  ↓
User sees: "Status: 🟢 Shortlisted"
  ↓
Real-time: Notification arrives when recruiter changes status
  ↓
Notification bell count updates
  ↓
User clicks notification
  ↓
Navigate to ?tab=applied&applicationId=789
  ↓
Application auto-highlighted
```

---

### Example 2: Recruiter Application Review Flow

```
Step 1: Recruiter views applications
Navigate to /recruiter-dashboard?tab=applications
  ↓
ApplicationsTab mounts
  ↓
GET /applications?job_id=123
  ↓
Backend returns applications for recruiter's jobs
  ↓
setApplications(apps)
  ↓
Applications list renders

Step 2: Filter applications
User selects "Job: Software Engineer"
  ↓
setAppJobFilter(123) called
  ↓
URL updates: ?tab=applications&job=123
  ↓
Component re-renders with filtered list
  ↓
filteredApplications = applications.filter(a => a.job_posting_id === 123)
  ↓
List shows only Software Engineer applications

Step 3: Update application status
User clicks status dropdown for application #789
  ↓
Status dropdown opens with allowed transitions
  ↓
User selects "Shortlisted"
  ↓
handleStatusUpdate(789, 'shortlisted') called
  ↓
Validate transition: 'applied' → 'shortlisted' ✓
  ↓
PATCH /applications/789/status { status: 'shortlisted' }
  ↓
Backend updates Application.status
Backend sends notification to candidate: "Application status updated"
  ↓
Frontend updates local state:
  applications[789].status = 'shortlisted'
  ↓
UI re-renders with new status badge
  ↓
Toast: "Status updated successfully"

Step 4: Schedule interview
User clicks "Schedule Interview" button
  ↓
setSelectedAppForSchedule(application)
setIsScheduleInterviewModalOpen(true)
  ↓
CreateMeetingModal renders
  ↓
User fills form:
  - Title: "Technical Interview - John Doe"
  - Date: May 1, 2026
  - Time: 10:00 AM
  - Duration: 1 hour
  - Video: Zoom
  ↓
User clicks "Schedule"
  ↓
handleCreate() called
  ↓
POST /meetings/create {
  title,
  scheduled_start: '2026-05-01T10:00:00Z',
  scheduled_end: '2026-05-01T11:00:00Z',
  participants: [{ name: 'John Doe', email: 'john@example.com' }],
  video_provider: 'zoom',
  application_id: 789
}
  ↓
Backend checks availability conflicts
  ↓ (if no conflicts)
Backend creates Meeting record
Backend creates MeetingParticipant records
Backend generates Zoom link (if configured)
Backend sends email invites to all participants
Backend sends in-app notifications
  ↓
Response: { meeting_id: 888, video_meeting_url: 'https://zoom.us/j/...' }
  ↓
Frontend closes modal
Frontend shows toast: "Interview scheduled"
Frontend updates application status to 'scheduled'
  ↓
Candidate receives notification: "Interview scheduled for May 1"
```

---

### Example 3: Real-Time Notification Flow

```
Step 1: Backend event occurs
Recruiter changes application status to "Shortlisted"
  ↓
Backend creates Notification record:
  user_id: 123 (candidate)
  event_type: 'application_status'
  title: '✅ Application Status Updated'
  message: 'Your application for Software Engineer has been shortlisted'
  payload: '{"route": "/candidate-dashboard?tab=applied&applicationId=789"}'
  ↓
Backend inserts into database
  ↓
Backend queues email (if preference enabled)

Step 2: Frontend polls for notifications
NotificationBellDrawer has interval timer (30 seconds)
  ↓
Timer fires
  ↓
GET /notifications/unread-count
  ↓
Backend: SELECT COUNT(*) WHERE user_id=123 AND is_read=false
  ↓
Response: { unread_count: 1 }
  ↓
Frontend updates bell badge: 🔔 (1)

Step 3: User clicks bell
User clicks notification bell icon
  ↓
setIsOpen(true)
  ↓
GET /notifications
  ↓
Backend: SELECT * WHERE user_id=123 ORDER BY created_at DESC
  ↓
Response: [{ id: 1, title: '✅ Application Status Updated', ... }]
  ↓
Frontend renders notification list
  ↓
User sees new notification at top (highlighted)

Step 4: User clicks notification
User clicks on notification item
  ↓
handleNotificationClick(notification) called
  ↓
PATCH /notifications/1/read
  ↓
Backend: UPDATE notification SET is_read=true, read_at=NOW() WHERE id=1
  ↓
Parse payload: { route: '/candidate-dashboard?tab=applied&applicationId=789' }
  ↓
navigate(payload.route)
  ↓
Dashboard loads with Applications tab
Application #789 is highlighted
  ↓
Drawer closes
Bell badge decrements: 🔔 (0)
```

---

### Example 4: Swipe Card Animation

```
Step 1: User starts dragging
User clicks and holds on SwipeCard
  ↓
onMouseDown fires
  ↓
setIsDragging(true)
startX = e.clientX
startY = e.clientY

Step 2: User moves mouse
onMouseMove fires continuously
  ↓
Calculate deltaX = currentX - startX
Calculate rotation = deltaX * 0.1
  ↓
Update card transform:
  card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`
  ↓
Visual feedback:
  - Card follows mouse
  - Rotates based on horizontal movement
  - Opacity decreases with distance

Step 3: User releases mouse
onMouseUp fires
  ↓
Check final position:
  if (deltaX > 100) {
    // Swiped right → Like
    card.classList.add('exit-right')
    setTimeout(onLike, 600)  // Wait for animation
  }
  else if (deltaX < -100) {
    // Swiped left → Pass
    card.classList.add('exit-left')
    setTimeout(onPass, 600)
  }
  else {
    // Snap back to center
    card.style.transform = ''
  }
  ↓
setIsDragging(false)

Step 4: Animation completes
CSS transition runs (600ms)
  ↓
Card slides off screen
  ↓
onLike callback fires
  ↓
POST /swipes/like
  ↓
setCurrentCardIndex(prev => prev + 1)
  ↓
Next card appears with fade-in animation
```

---

## Summary

This frontend provides a complete **talent marketplace UI** with:

✅ **Authentication:** JWT-based with role-specific routing  
✅ **Dashboards:** Dual-sided platform for candidates and recruiters  
✅ **Swipe Interface:** Tinder-style matching with smooth animations  
✅ **Real-Time Updates:** Polling-based notifications (can upgrade to WebSockets)  
✅ **Application Tracking:** Status management with visual indicators  
✅ **Interview Scheduler:** Calendar integration with conflict checking  
✅ **Messaging:** Direct communication between users  
✅ **Responsive Design:** Mobile-friendly layouts  
✅ **Type Safety:** Full TypeScript coverage  
✅ **Performance:** Vite's fast HMR, optimized renders  

**Key Patterns:**
- **Protected Routes:** Role-based access control
- **URL State:** Shareable/bookmarkable dashboard states
- **Optimistic Updates:** Immediate UI updates with rollback on error
- **Progressive Enhancement:** Graceful degradation without JS
- **Accessibility:** ARIA labels, keyboard navigation
- **Error Boundaries:** Catch React errors and show fallback UI

**Frontend-Backend Connection:**
- All API calls go through `apiClient` (Axios instance)
- JWT token automatically added to request headers
- Response data updates local state
- State changes trigger UI re-renders
- Polling for real-time features (notifications every 30s, messages every 5s)

**Tech Highlights:**
- **React 18** with Hooks (no class components)
- **TypeScript** for type safety
- **Vite** for lightning-fast builds
- **React Router v6** for navigation
- **Framer Motion** for animations
- **CSS Modules** for scoped styling

This is a production-ready, scalable frontend architecture following React best practices for performance, maintainability, and user experience.
