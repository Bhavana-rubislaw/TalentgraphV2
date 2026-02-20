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
import './index.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const token = localStorage.getItem('token');
  const userRole = (localStorage.getItem('role') || '').toLowerCase().trim();

  console.log('[ProtectedRoute] token exists:', !!token, '| role:', userRole, '| allowed:', allowedRoles);

  if (!token) {
    console.warn('[ProtectedRoute] No token found — redirecting to /signin');
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.warn('[ProtectedRoute] Role mismatch — role:', userRole, 'not in', allowedRoles);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SignupPage />} />

        {/* Recruiting Platform Routes - All users are company users */}
        <Route 
          path="/recruiter-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'recruiter', 'hr']}>
              <ErrorBoundary>
                <RecruiterDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recruiter/job-posting" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'recruiter', 'hr']}>
              <JobPostingForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recruiter/job-postings" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'recruiter', 'hr']}>
              <JobPostingBuilder />
            </ProtectedRoute>
          } 
        />

        {/* Legacy Candidate Routes (kept for compatibility but not used) */}
        <Route 
          path="/welcome" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <WelcomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/candidate/profile" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <CandidateProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/candidate/job-preferences" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <ErrorBoundary>
                <JobPreferencesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/candidate-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <ErrorBoundary>
                <CandidateDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
