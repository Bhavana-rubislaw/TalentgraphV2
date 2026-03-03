import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import JobPreferencesPage from './pages/JobPreferencesPage';
import CandidateDashboard from './pages/CandidateDashboardNew';
import RecruiterDashboard from './pages/RecruiterDashboardNew';
import JobPostingForm from './pages/JobPostingForm';
import JobPostingBuilder from './pages/JobPostingBuilder';
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

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Smart redirect: send to the correct dashboard instead of root
    if (CANDIDATE_ROLES.includes(userRole)) {
      return <Navigate to="/candidate-dashboard" replace />;
    }
    if (RECRUITER_ROLES.includes(userRole)) {
      return <Navigate to="/recruiter-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signin" element={<SignupPage />} />

            {/* Recruiting Platform Routes */}
            <Route
              path="/recruiter-dashboard"
              element={
                <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                  <ErrorBoundary>
                    <RecruiterDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/job-posting"
              element={
                <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                  <JobPostingForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/job-postings"
              element={
                <ProtectedRoute allowedRoles={RECRUITER_ROLES}>
                  <JobPostingBuilder />
                </ProtectedRoute>
              }
            />

            {/* Legacy Candidate Routes (kept for compatibility) */}
            <Route
              path="/welcome"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <WelcomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/profile"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <CandidateProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/job-preferences"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <ErrorBoundary>
                    <JobPreferencesPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate-dashboard"
              element={
                <ProtectedRoute allowedRoles={CANDIDATE_ROLES}>
                  <ErrorBoundary>
                    <CandidateDashboard />
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

