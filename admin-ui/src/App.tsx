import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import JobPostingsPage from './pages/JobPostingsPage';
import JobPreferencesPage from './pages/JobPreferencesPage';
import LogsPage from './pages/LogsPage';
import TaxonomyPage from './pages/TaxonomyPage';

// ── Guard: redirect to /login if not authenticated admin ────────
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();

  if (bootStatus === 'loading') {
    return (
      <div className="loading-page" style={{ minHeight: '100vh' }}>
        <span className="spinner" /> Authenticating…
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ── Layout wrapper for authenticated pages ───────────────────────
const AdminPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAdmin>
    <AdminLayout>{children}</AdminLayout>
  </RequireAdmin>
);

// ── Redirect already-logged-in admins away from /login ────────────
const RedirectIfAuthed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootStatus } = useAuth();
  if (bootStatus === 'loading') return null;
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />

      <Route path="/dashboard"    element={<AdminPage><DashboardPage /></AdminPage>} />
      <Route path="/users"        element={<AdminPage><UsersPage /></AdminPage>} />
      <Route path="/job-postings"    element={<AdminPage><JobPostingsPage /></AdminPage>} />
      <Route path="/job-preferences" element={<AdminPage><JobPreferencesPage /></AdminPage>} />
      <Route path="/logs"         element={<AdminPage><LogsPage /></AdminPage>} />
      <Route path="/taxonomy"     element={<AdminPage><TaxonomyPage /></AdminPage>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
