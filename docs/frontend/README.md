# TalentGraph V2 - Frontend (React + TypeScript)

**Framework:** React 18 + TypeScript + Vite  
**UI Library:** Material-UI (MUI)  
**State Management:** React Context + Custom Hooks  
**Status:** Production-ready (Active development)

---

## Quick Start

### 1. Prerequisites
```bash
# Install Node.js 18+ and npm
node --version  # Should be 18+
npm --version   # Should be 9+
```

### 2. Installation
```bash
# Navigate to frontend directory
cd frontend2

# Install dependencies
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your backend URL
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 4. Run Development Server
```bash
# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 5. Verify Frontend
```bash
# Open browser
http://localhost:3000

# Check API connectivity in browser console
# Should see successful API calls to backend
```

---

## Project Structure

```
frontend2/
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── common/               # Shared components (Button, Input, Modal, etc.)
│   │   ├── layout/               # Layout components (Header, Sidebar, Footer)
│   │   ├── candidate/            # Candidate-specific components
│   │   ├── recruiter/            # Recruiter-specific components
│   │   └── admin/                # Admin panel components
│   │
│   ├── pages/                    # Page-level components (routes)
│   │   ├── auth/                 # Login, Register, ResetPassword
│   │   ├── candidate/            # Candidate dashboard, profile, applications
│   │   ├── recruiter/            # Recruiter dashboard, job postings
│   │   ├── jobs/                 # Job listings, details, search
│   │   ├── applications/         # Application tracking
│   │   ├── messages/             # Chat/messaging UI
│   │   ├── meetings/             # Interview scheduling
│   │   ├── notifications/        # Notification center
│   │   └── admin/                # Admin dashboard
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication state
│   │   ├── useLogging.ts         # Client-side logging
│   │   ├── useNotifications.ts   # Real-time notifications
│   │   └── useWebSocket.ts       # WebSocket connection
│   │
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.tsx       # User authentication state
│   │   ├── ThemeContext.tsx      # Theme/dark mode
│   │   └── NotificationContext.tsx  # Notification state
│   │
│   ├── utils/                    # Utility functions
│   │   ├── api.ts                # Axios API client
│   │   ├── auth.ts               # Auth helpers (token storage)
│   │   ├── logger.ts             # Client-side logging service
│   │   ├── validators.ts         # Form validation
│   │   └── formatters.ts         # Date/currency formatting
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── api.ts                # API response types
│   │   ├── user.ts               # User/candidate/company types
│   │   ├── job.ts                # Job posting types
│   │   └── models.ts             # Domain model types
│   │
│   ├── styles/                   # Global styles & themes
│   │   ├── theme.ts              # MUI theme configuration
│   │   └── global.css            # Global CSS
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Application entry point
│   └── routes.tsx                # React Router configuration
│
├── public/                       # Static assets
│   ├── logo.svg
│   └── favicon.ico
│
├── index.html                    # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
└── .env.example                  # Environment variable template
```

---

## Key Configuration Files

### `.env` (Environment Variables)
```bash
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=<your-oauth-client-id>

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_LOGGING=true
```

### `vite.config.ts` (Build Configuration)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## User Flows

### Candidate Flow
1. **Register/Login** → Email + password
2. **Complete Profile** → Resume, skills, preferences
3. **Browse Jobs** → Swipe left/right on job cards
4. **Apply** → Submit application for matched jobs
5. **Track Applications** → View status (applied, scheduled, shortlisted, etc.)
6. **Interview Scheduling** → Confirm meeting times
7. **Messaging** → Chat with recruiters

### Recruiter Flow
1. **Register/Login** → Company account
2. **Create Job Posting** → Job title, description, requirements
3. **Browse Candidates** → Swipe left/right on candidate profiles
4. **Invite to Apply** → Send personalized invites
5. **Review Applications** → View candidate details, resume
6. **Schedule Interviews** → Send meeting invites
7. **Messaging** → Chat with candidates
8. **Analytics** → Track job performance metrics

---

## Routing

### Authentication Routes
| Path | Component | Access |
|------|-----------|--------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/reset-password` | ResetPasswordPage | Public |

### Candidate Routes (Protected)
| Path | Component | Description |
|------|-----------|-------------|
| `/candidate/dashboard` | CandidateDashboard | Job recommendations |
| `/candidate/profile` | CandidateProfile | Edit profile |
| `/candidate/applications` | ApplicationsPage | Application tracking |
| `/candidate/swipes` | SwipeHistory | Swipe history |

### Recruiter Routes (Protected)
| Path | Component | Description |
|------|-----------|-------------|
| `/recruiter/dashboard` | RecruiterDashboard | Candidate recommendations |
| `/recruiter/jobs` | JobPostings | Manage job postings |
| `/recruiter/jobs/new` | CreateJobPosting | Create new job |
| `/recruiter/applications` | ApplicationsPage | Review applications |
| `/recruiter/analytics` | AnalyticsDashboard | Job performance metrics |

### Shared Routes (Protected)
| Path | Component | Description |
|------|-----------|-------------|
| `/jobs` | JobListings | Browse all jobs |
| `/jobs/:id` | JobDetails | Job details page |
| `/messages` | MessagesPage | Chat interface |
| `/meetings` | MeetingsPage | Interview scheduling |
| `/notifications` | NotificationsPage | Notification center |
| `/profile` | ProfilePage | User profile settings |

### Admin Routes (Admin Only)
| Path | Component | Description |
|------|-----------|-------------|
| `/admin/dashboard` | AdminDashboard | Platform metrics |
| `/admin/users` | UserManagement | User management |
| `/admin/logs` | LoggingDashboard | System logs viewer |

---

## State Management

### Authentication State
```typescript
// AuthContext provides:
const { user, login, logout, isAuthenticated, role } = useAuth();

// Example usage:
if (role === 'candidate') {
  // Show candidate dashboard
}
```

### API State Management
```typescript
// Custom hooks for API calls
const { data, loading, error, refetch } = useJobPostings();
const { applications, updateStatus } = useApplications();
const { notifications, markAsRead } = useNotifications();
```

### Form State
```typescript
// React Hook Form for complex forms
import { useForm } from 'react-hook-form';

const { register, handleSubmit, errors } = useForm({
  resolver: yupResolver(jobPostingSchema),
});
```

---

## UI Components

### Material-UI Theme
Custom theme configuration in `src/styles/theme.ts`:
- **Primary Color:** Blue (`#1976d2`)
- **Secondary Color:** Orange (`#ff9800`)
- **Dark Mode:** Toggle-able (persisted in localStorage)

### Reusable Components

#### Common Components
- `<Button>` - Custom styled MUI button
- `<Input>` - Form input with validation
- `<Modal>` - Reusable modal dialog
- `<Card>` - Content card wrapper
- `<LoadingSpinner>` - Loading indicator
- `<ErrorBoundary>` - Error handling wrapper

#### Domain Components
- `<JobCard>` - Job posting card (swipeable)
- `<CandidateCard>` - Candidate profile card
- `<ApplicationCard>` - Application status card
- `<ChatMessage>` - Message bubble
- `<NotificationItem>` - Notification list item
- `<StatusBadge>` - Application status indicator

---

## API Integration

### API Client (`src/utils/api.ts`)
```typescript
// Axios instance with auth interceptors
import api from '@/utils/api';

// Example API calls
const jobs = await api.get('/jobs/active');
const profile = await api.get('/candidates/profile');
await api.post('/applications', applicationData);
```

### Authentication Flow
1. Login → Backend returns JWT token
2. Store token in `localStorage`
3. Attach token to all API requests via interceptor
4. Refresh token on 401 (if refresh token implemented)
5. Logout → Clear token from localStorage

### Error Handling
```typescript
// Global error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      logout();
    }
    return Promise.reject(error);
  }
);
```

---

## Features

### ✅ Implemented Features

#### Core Features
- [x] User authentication (JWT)
- [x] Candidate profile management
- [x] Recruiter/company management
- [x] Job posting CRUD
- [x] Swipe/match system
- [x] Job application flow
- [x] Dashboard recommendations
- [x] Application tracking
- [x] Interview scheduling
- [x] Real-time messaging
- [x] In-app notifications
- [x] Analytics dashboard

#### Advanced Features
- [x] Resume upload & download
- [x] Certification management
- [x] Skill tagging & matching
- [x] Location preferences
- [x] Salary filtering
- [x] Job expiration warnings
- [x] Status change audit trail
- [x] Google Meet integration
- [x] Email notifications (SMTP)
- [x] Recruiter notes (internal)
- [x] Read receipts (chat)
- [x] Unread notification count

#### UI/UX Enhancements
- [x] Dark mode toggle
- [x] Responsive design (mobile-first)
- [x] Loading states
- [x] Error boundaries
- [x] Form validation
- [x] Toast notifications
- [x] Infinite scroll (job listings)
- [x] Search & filters
- [x] Pagination

### 🚧 In Progress
- [ ] WebSocket real-time updates
- [ ] Push notifications (browser)
- [ ] Advanced search (Elasticsearch)
- [ ] Video interviews (WebRTC)

---

## Logging System

### Client-Side Logging
Client logs are batched and sent to backend for persistence:

```typescript
import { logger } from '@/utils/logger';

// Log levels
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error });

// Automatic batching (50 logs or 30s interval)
// Survives deployments via backend database persistence
```

### Logging Hooks
```typescript
// Automatic UI event logging
import { useLogging } from '@/hooks/useLogging';

const { logPageView, logButtonClick, logError } = useLogging();

useEffect(() => {
  logPageView('/candidate/dashboard');
}, []);
```

**Full Guide:** [COMPREHENSIVE_LOGGING_GUIDE.md](../backend2/COMPREHENSIVE_LOGGING_GUIDE.md)

---

## Development Workflow

### Running the App Locally
```bash
# Terminal 1: Start backend
cd backend2
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend2
npm run dev
```

### Making Changes

#### Adding a New Page
1. Create page component: `src/pages/<domain>/<PageName>.tsx`
2. Add route in `src/routes.tsx`
3. Add navigation link in `src/components/layout/Sidebar.tsx`
4. Test navigation flow

#### Adding a New API Endpoint
1. Add API call in `src/utils/api.ts`
2. Create custom hook in `src/hooks/use<Feature>.ts`
3. Use hook in component
4. Add TypeScript types in `src/types/`

#### Styling Components
```typescript
// Use MUI's sx prop for inline styles
<Box sx={{ padding: 2, backgroundColor: 'primary.main' }}>
  Content
</Box>

// Or use styled components
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
}));
```

---

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
```
tests/
├── unit/                # Unit tests (components, utils)
├── integration/         # Integration tests (API calls)
└── e2e/                 # End-to-end tests (Playwright/Cypress)
```

### Writing Tests
```typescript
import { render, screen } from '@testing-library/react';
import JobCard from '@/components/JobCard';

test('renders job card with title', () => {
  render(<JobCard job={mockJob} />);
  expect(screen.getByText('Software Engineer')).toBeInTheDocument();
});
```

---

## Build & Deployment

### Production Build
```bash
# Build optimized bundle
npm run build

# Output: dist/ directory
# Contains minified HTML, CSS, JS
```

### Environment-Specific Builds
```bash
# Development
npm run dev

# Staging
VITE_API_BASE_URL=https://staging-api.example.com npm run build

# Production
VITE_API_BASE_URL=https://api.example.com npm run build
```

### Deployment Checklist
- [ ] Update `VITE_API_BASE_URL` to production backend
- [ ] Run `npm run build`
- [ ] Test production build locally: `npm run preview`
- [ ] Configure CORS on backend for production domain
- [ ] Set up CDN for static assets (optional)
- [ ] Configure SSL/HTTPS
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Enable analytics (Google Analytics, etc.)

### Deployment Platforms
- **Vercel:** `vercel deploy` (recommended for Vite/React)
- **Netlify:** Drag-and-drop `dist/` folder
- **AWS S3 + CloudFront:** Static hosting
- **Render:** Connected to Git repo

---

## Performance Optimization

### Code Splitting
```typescript
// Lazy load pages
import { lazy } from 'react';

const CandidateDashboard = lazy(() => import('@/pages/candidate/Dashboard'));
```

### Memoization
```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive computations
const filteredJobs = useMemo(() => {
  return jobs.filter(job => job.salary > minSalary);
}, [jobs, minSalary]);

// Memoize callbacks
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

### Bundle Size Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Check large dependencies
npm install -g bundle-wizard
bundle-wizard
```

---

## Troubleshooting

### Common Issues

**API Connection Error**
```bash
# Check VITE_API_BASE_URL in .env
echo $VITE_API_BASE_URL

# Verify backend is running
curl http://localhost:8000/health
```

**CORS Error**
```python
# Backend: Update CORS origins in app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**TypeScript Errors**
```bash
# Regenerate types from OpenAPI spec (if available)
npm run generate-types

# Or manually update types in src/types/
```

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | React | 18+ |
| **Build Tool** | Vite | 4+ |
| **Language** | TypeScript | 5+ |
| **UI Library** | Material-UI (MUI) | 5+ |
| **Routing** | React Router | 6+ |
| **HTTP Client** | Axios | 1.6+ |
| **Form Handling** | React Hook Form | 7+ |
| **Validation** | Yup | 1.3+ |
| **State Management** | React Context + Hooks | - |
| **Date Handling** | date-fns | 2+ |

---

## Resources

### Documentation
- [START_HERE.md](../START_HERE.md) - Project overview
- [QUICK_START.md](../QUICK_START.md) - Full setup guide
- [FEATURE_STATUS_AND_UI_GUIDE.md](../FEATURE_STATUS_AND_UI_GUIDE.md) - Feature status

### Feature Guides
- [PREMIUM_UI_REDESIGN_GUIDE.md](../PREMIUM_UI_REDESIGN_GUIDE.md) - UI/UX improvements
- [APPLICATIONS_UI_IMPLEMENTATION_COMPLETE.md](../APPLICATIONS_UI_IMPLEMENTATION_COMPLETE.md) - Application UI
- [MEETINGS_TESTS_VISUAL_GUIDE.md](../MEETINGS_TESTS_VISUAL_GUIDE.md) - Meeting scheduling

### Backend Integration
- [Backend README](../backend2/README.md) - Backend setup
- [API Documentation](http://localhost:8000/docs) - Swagger UI
- [COMPREHENSIVE_LOGGING_GUIDE.md](../backend2/COMPREHENSIVE_LOGGING_GUIDE.md) - Logging

---

## Support & Contributing

### Getting Help
- Check existing documentation in project root
- Review component examples in `src/components/`
- Check browser console for error messages

### Code Standards
- **Style:** ESLint + Prettier (auto-format on save)
- **TypeScript:** Strict mode enabled
- **Naming:** PascalCase for components, camelCase for functions
- **File Structure:** One component per file
- **Imports:** Absolute imports using `@/` alias

### Pull Request Checklist
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] No console.log statements (use logger)
- [ ] Updated relevant documentation
- [ ] Tested on mobile & desktop

---

## License

Proprietary - TalentGraph V2  
All rights reserved.
