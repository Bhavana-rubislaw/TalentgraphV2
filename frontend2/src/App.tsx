import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import CandidateProfileSetupPage from './pages/CandidateProfileSetupPage';
import RecruiterProfilePage from './pages/RecruiterProfilePage';
import CompanyProfileSetupPage from './pages/CompanyProfileSetupPage';
import JobPreferencesPage from './pages/JobPreferencesPage';
import CandidateDashboard from './pages/CandidateDashboardNew';
import RecruiterDashboard from './pages/RecruiterDashboardNew';
import JobPostingForm from './pages/JobPostingForm';
import JobPostingBuilder from './pages/JobPostingBuilder';
import { MeetingsPage } from './pages/MeetingsPage';
import { CalendarSettingsPage } from './pages/CalendarSettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// ── Role constants ────────────────────────────────────────────────
const RECRUITER_ROLES = ['admin', 'recruiter', 'hr'];
const CANDIDATE_ROLES = ['candidate'];

// ── Protected Route ───────────────────────────────────────────────
// Reads from AuthContext (boot-validated) with localStorage fallback
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, bootStatus } = useAuth();

  // Still validating token? wait — boot spinner handled by AppRoutes.
  if (bootStatus === 'loading') return null;

  const token = localStorage.getItem('token');
  const userRole = (user?.role || localStorage.getItem('role') || '').toLowerCase().trim();

  console.log('[ProtectedRoute] Check:', {
    allowedRoles,
    userRole,
    fromUser: user?.role,
    fromLS: localStorage.getItem('role'),
    isMatch: allowedRoles.includes(userRole)
  });

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.log('[ProtectedRoute] Role mismatch - redirecting. UserRole:', userRole, 'Allowed:', allowedRoles);
    // Smart redirect: send to the correct dashboard instead of root
    if (CANDIDATE_ROLES.includes(userRole)) {
      console.log('[ProtectedRoute] Redirecting candidate to /candidate-dashboard');
      return <Navigate to="/candidate-dashboard" replace />;
    }
    if (RECRUITER_ROLES.includes(userRole)) {
      console.log('[ProtectedRoute] Redirecting recruiter to /recruiter-dashboard');
      return <Navigate to="/recruiter-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ── Recruiter Protected Route ──────────────────
// Only checks authentication, allows dashboard access even without complete profile
const RecruiterProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();

  // Still validating token? wait
  if (bootStatus === 'loading') return null;

  const token = localStorage.getItem('token');
  const userRole = (user?.role || localStorage.getItem('role') || '').toLowerCase().trim();

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (!RECRUITER_ROLES.includes(userRole)) {
    console.log('[RecruiterProtectedRoute] Not a recruiter, redirecting');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ── Candidate Protected Route ──────────────────
// Only checks authentication, allows dashboard access even without complete profile
const CandidateProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();

  // Still validating token? wait
  if (bootStatus === 'loading') return null;

  const token = localStorage.getItem('token');
  const userRole = (user?.role || localStorage.getItem('role') || '').toLowerCase().trim();

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (!CANDIDATE_ROLES.includes(userRole)) {
    console.log('[CandidateProtectedRoute] Not a candidate, redirecting');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ── Profile Setup Guard ──────────────────
// Prevents completed users from accessing setup pages
const ProfileSetupGuard: React.FC<{ children: React.ReactNode; userType: 'candidate' | 'company' }> = ({ children, userType }) => {
  const { user, bootStatus } = useAuth();

  if (bootStatus === 'loading') return null;

  const isProfileComplete = user?.is_profile_complete ?? 
    (localStorage.getItem('is_profile_complete') === 'true');

  console.log('[ProfileSetupGuard]', {
    userType,
    isProfileComplete,
    fromUser: user?.is_profile_complete,
    fromLS: localStorage.getItem('is_profile_complete')
  });

  // If profile is already complete, redirect to dashboard
  if (isProfileComplete) {
    console.log('[ProfileSetupGuard] Profile complete - redirecting to dashboard');
    if (userType === 'candidate') {
      return <Navigate to="/candidate-dashboard" replace />;
    } else {
      return <Navigate to="/recruiter-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// ── Dashboard Guard (Candidate only - allows skip) ──────────────────
// Redirects incomplete profiles to setup page
// Note: Candidates can skip and access dashboard, but only if they haven't started the onboarding process
const CandidateDashboardGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();

  if (bootStatus === 'loading') return null;

  const isProfileComplete = user?.is_profile_complete ?? 
    (localStorage.getItem('is_profile_complete') === 'true');
  
  const hasStartedOnboarding = localStorage.getItem('onboarding_started') === 'true';

  console.log('[CandidateDashboardGuard]', {
    isProfileComplete,
    hasStartedOnboarding,
    fromUser: user?.is_profile_complete,
    fromLS: localStorage.getItem('is_profile_complete')
  });

  // If user started onboarding but didn't complete it, redirect to setup
  // This ensures users who start resume upload must complete the process
  if (hasStartedOnboarding && !isProfileComplete) {
    console.log('[CandidateDashboardGuard] Onboarding started but incomplete - redirecting to setup');
    return <Navigate to="/candidate-profile-setup" replace />;
  }

  // Otherwise, allow access (candidates can skip initial onboarding)
  return <>{children}</>;
};

// ── Dashboard Guard (Recruiter - must complete) ──────────────────
// Enforces profile completion before dashboard access
const RecruiterDashboardGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();

  if (bootStatus === 'loading') return null;

  const isProfileComplete = user?.is_profile_complete ?? 
    (localStorage.getItem('is_profile_complete') === 'true');

  console.log('[RecruiterDashboardGuard]', {
    isProfileComplete,
    fromUser: user?.is_profile_complete,
    fromLS: localStorage.getItem('is_profile_complete')
  });

  // Recruiters must complete profile before accessing dashboard
  if (!isProfileComplete) {
    console.log('[RecruiterDashboardGuard] Profile incomplete - redirecting to setup');
    return <Navigate to="/company-profile-setup" replace />;
  }

  return <>{children}</>;
};

// ── Boot spinner while /auth/me is in flight ──────────────────────
const BootGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bootStatus } = useAuth();
  if (bootStatus === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8fafc',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid #e2e8f0',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <BootGate>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<SignupPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signin" element={<SignupPage />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Profile Setup Pages */}
            <Route
              path="/company-profile-setup"
              element={
                <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                  <ProfileSetupGuard userType="company">
                    <CompanyProfileSetupPage />
                  </ProfileSetupGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate-profile-setup"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <ProfileSetupGuard userType="candidate">
                    <CandidateProfileSetupPage />
                  </ProfileSetupGuard>
                </ProtectedRoute>
              }
            />

            {/* Recruiting Platform Routes */}
            <Route
              path="/recruiter-dashboard"
              element={
                <RecruiterProtectedRoute>
                  <RecruiterDashboardGuard>
                    <ErrorBoundary>
                      <RecruiterDashboard />
                    </ErrorBoundary>
                  </RecruiterDashboardGuard>
                </RecruiterProtectedRoute>
              }
            />
            <Route
              path="/recruiter/profile"
              element={
                <RecruiterProtectedRoute>
                  <RecruiterProfilePage />
                </RecruiterProtectedRoute>
              }
            />
            <Route
              path="/recruiter/job-posting"
              element={
                <RecruiterProtectedRoute>
                  <JobPostingForm />
                </RecruiterProtectedRoute>
              }
            />
            <Route
              path="/recruiter/job-postings"
              element={
                <RecruiterProtectedRoute>
                  <JobPostingBuilder />
                </RecruiterProtectedRoute>
              }
            />

            {/* Meeting Scheduler (accessible to both recruiters and candidates) */}
            <Route
              path="/meetings"
              element={
                <ProtectedRoute allowedRoles={[...RECRUITER_ROLES, ...CANDIDATE_ROLES]}>
                  <ErrorBoundary>
                    <MeetingsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Calendar & Video Provider Settings */}
            <Route
              path="/settings/calendar"
              element={
                <ProtectedRoute allowedRoles={[...RECRUITER_ROLES, ...CANDIDATE_ROLES]}>
                  <ErrorBoundary>
                    <CalendarSettingsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Candidate Routes */}
            <Route
              path="/welcome"
              element={
                <CandidateProtectedRoute>
                  <WelcomePage />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/profile"
              element={
                <CandidateProtectedRoute>
                  <CandidateProfilePage />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/job-preferences"
              element={
                <CandidateProtectedRoute>
                  <ErrorBoundary>
                    <JobPreferencesPage />
                  </ErrorBoundary>
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate-dashboard"
              element={
                <CandidateProtectedRoute>
                  <CandidateDashboardGuard>
                    <ErrorBoundary>
                      <CandidateDashboard />
                    </ErrorBoundary>
                  </CandidateDashboardGuard>
                </CandidateProtectedRoute>
              }
            />

            {/* Standalone Messages routes — deep-link from notifications */}
            <Route
              path="/candidate/messages"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <ErrorBoundary>
                    {/* Redirect to dashboard messages tab, preserving ?c= param */}
                    <Navigate
                      to={`/candidate-dashboard?tab=messages${window.location.search.includes('c=') ? '&' + window.location.search.slice(1) : ''}`}
                      replace
                    />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/messages"
              element={
                <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                  <ErrorBoundary>
                    <Navigate
                      to={`/recruiter-dashboard?tab=messages${window.location.search.includes('c=') ? '&' + window.location.search.slice(1) : ''}`}
                      replace
                    />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BootGate>
      </Router>
    </AuthProvider>
  );
};

export default App;

