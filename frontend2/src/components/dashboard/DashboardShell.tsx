import React from 'react';
import NotificationBellDrawer from '../notifications/NotificationBellDrawer';

interface DashboardShellProps {
  title: string;
  role: 'candidate' | 'recruiter';
  userProfile?: any;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  role,
  userProfile,
  showProfileMenu,
  setShowProfileMenu,
  onNavigate,
  onLogout,
  sidebar,
  children
}) => {
  const userName = userProfile?.name || userProfile?.full_name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const profileMenuItems = role === 'recruiter' 
    ? [
        { icon: 'user', label: 'My Profile', onClick: () => onNavigate('/recruiter/profile') },
        { icon: 'settings', label: 'Settings', onClick: () => onNavigate('/recruiter/job-postings') }
      ]
    : [
        { icon: 'user', label: 'My Profile', onClick: () => onNavigate('/candidate/profile') },
        { icon: 'settings', label: 'Job Preferences', onClick: () => onNavigate('/candidate/job-preferences') }
      ];

  return (
    <div className="modern-dashboard">
      {/* Top Navigation Bar */}
      <div className="top-navbar">
        <div className="navbar-left">
          <div className="app-logo">
            <span className="logo-text">TalentGraph</span>
          </div>
        </div>
        
        <div className="navbar-center">
          <h2 className="page-title">{title}</h2>
        </div>
        
        <div className="navbar-right">
          <NotificationBellDrawer role={role} />
          
          <div className="profile-dropdown">
            <button 
              className="profile-avatar-btn" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="avatar">{userInitial}</div>
              <span className="profile-name">{userName}</span>
              <span className="chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </button>
            
            {showProfileMenu && (
              <div className="profile-menu">
                {profileMenuItems.map((item, index) => (
                  <button key={index} onClick={() => { setShowProfileMenu(false); item.onClick(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {item.icon === 'user' && (
                        <>
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </>
                      )}
                      {item.icon === 'settings' && (
                        <>
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                        </>
                      )}
                    </svg>
                    {item.label}
                  </button>
                ))}
                <div className="menu-divider"></div>
                <button className="logout-btn" onClick={onLogout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar */}
        {sidebar}
        
        {/* Main Content */}
        <div className="main-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;