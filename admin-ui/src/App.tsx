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
import AnalyticsPage from './pages/AnalyticsPage';
import CompaniesPage from './pages/CompaniesPage';
import ApplicationsPage from './pages/ApplicationsPage';
import EmailLogsPage from './pages/EmailLogsPage';
import AlgorithmPage from './pages/AlgorithmPage';

// â”€â”€ Guard: redirect to /login if not authenticated admin â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Layout wrapper for authenticated pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AdminPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAdmin>
    <AdminLayout>{children}</AdminLayout>
  </RequireAdmin>
);

// â”€â”€ Redirect already-logged-in admins away from /login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <Route path="/companies"    element={<AdminPage><CompaniesPage /></AdminPage>} />
      <Route path="/job-postings"    element={<AdminPage><JobPostingsPage /></AdminPage>} />
      <Route path="/applications"    element={<AdminPage><ApplicationsPage /></AdminPage>} />
      <Route path="/job-preferences" element={<AdminPage><JobPreferencesPage /></AdminPage>} />
      <Route path="/logs"         element={<AdminPage><LogsPage /></AdminPage>} />
      <Route path="/email-logs"   element={<AdminPage><EmailLogsPage /></AdminPage>} />
      <Route path="/taxonomy"     element={<AdminPage><TaxonomyPage /></AdminPage>} />
      <Route path="/analytics"    element={<AdminPage><AnalyticsPage /></AdminPage>} />
      <Route path="/algorithm"    element={<AdminPage><AlgorithmPage /></AdminPage>} />

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
