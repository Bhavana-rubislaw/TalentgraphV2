import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IconGrid, IconUsers, IconBriefcase, IconTarget,
  IconHierarchy, IconList, IconLogOut, IconBarChart,
  IconBuildings, IconInbox, IconActivity,
} from './Icons';

const NAV = [
  {
    section: 'Overview',
    items: [
      { path: '/dashboard',   label: 'Dashboard',          Icon: IconGrid },
      { path: '/analytics',   label: 'Analytics & Reports', Icon: IconBarChart },
    ],
  },
  {
    section: 'Management',
    items: [
      { path: '/users',           label: 'Users',           Icon: IconUsers },
      { path: '/companies',       label: 'Companies',       Icon: IconBuildings },
      { path: '/job-postings',    label: 'Job Postings',    Icon: IconBriefcase },
      { path: '/applications',    label: 'Applications',    Icon: IconActivity },
      { path: '/job-preferences', label: 'Job Preferences', Icon: IconTarget },
      { path: '/taxonomy',        label: 'Taxonomy',        Icon: IconHierarchy },
    ],
  },
  {
    section: 'System',
    items: [
      { path: '/email-logs', label: 'Email Logs',   Icon: IconInbox },
      { path: '/logs',       label: 'System Logs',  Icon: IconList },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/analytics':       'Analytics & Reports',
  '/users':           'User Management',
  '/companies':       'Companies',
  '/job-postings':    'Job Postings',
  '/applications':    'Applications',
  '/job-preferences': 'Job Preferences',
  '/taxonomy':        'Product Taxonomy',
  '/email-logs':      'Email Logs',
  '/logs':            'System Logs',
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentPath = window.location.pathname;
  const pageTitle = PAGE_TITLES[currentPath] ?? 'Admin Portal';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.email || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="admin-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="logo-mark">TG</div>
          <div className="logo-text">
            <div className="logo-name">TalentGraph</div>
            <div className="logo-badge">Admin Portal</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map((section) => (
            <div className="admin-nav-section" key={section.section}>
              <div className="admin-nav-section-label">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `admin-nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <span className="nav-icon"><item.Icon size={17} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout at bottom */}
        <div style={{ padding: '0 var(--space-2) 20px', marginTop: 'auto' }}>
          <div
            className="admin-nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <span className="nav-icon"><IconLogOut size={17} /></span>
            Sign Out
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title">{pageTitle}</h1>
          </div>
          <div className="admin-topbar-right">
            <div className="admin-user-pill" onClick={handleLogout} title="Sign out">
              <div className="admin-user-avatar">{initials}</div>
              <div className="admin-user-info">
                <div className="admin-user-name">
                  {user?.full_name || user?.email}
                </div>
                <div className="admin-user-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
