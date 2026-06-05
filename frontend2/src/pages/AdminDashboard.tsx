import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import TeamManager from '../components/TeamManager';
import CreditManager from '../components/CreditManager';
import SubscriptionManager from '../components/SubscriptionManager';
import '../styles/AdminDashboard.css';

interface AdminDashboardProps {
  userRole?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userRole = 'admin' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'subscriptions' | 'credits' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    teamMembers: 0,
    activeJobs: 0,
    credits: 0,
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const userInfo = await apiClient.getCurrentUser();
      setCompanyInfo(userInfo);

      // Fetch stats
      try {
        const creditBalance = await apiClient.getCreditBalance();
        setStats((prev: any) => ({
          ...prev,
          credits: creditBalance.current_credits,
        }));
      } catch (err) {
        console.error('Failed to fetch credits', err);
      }

      try {
        const teamMembers = await apiClient.getTeamMembers();
        setStats((prev: any) => ({
          ...prev,
          teamMembers: teamMembers.length,
        }));
      } catch (err) {
        console.error('Failed to fetch team members', err);
      }
    } catch (err) {
      setError('Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-dashboard loading">Loading Admin Dashboard...</div>;
  }

  const isAdmin = userRole.toLowerCase() === 'admin';

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Complete control over company operations, billing, and team</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <p className="stat-label">Team Members</p>
            <p className="stat-value">{stats.teamMembers}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <p className="stat-label">Available Credits</p>
            <p className="stat-value">{stats.credits}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <p className="stat-label">Active Jobs</p>
            <p className="stat-value">{stats.activeJobs}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team Management
        </button>
        <button
          className={`tab-button ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Subscriptions
        </button>
        <button
          className={`tab-button ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          Credits & Billing
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="info-grid">
              <div className="info-card">
                <h3>Company Information</h3>
                <div className="info-item">
                  <label>Company Name</label>
                  <p>{companyInfo?.company_name || 'Not Set'}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p>{companyInfo?.email || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Role</label>
                  <p>{companyInfo?.role?.toUpperCase() || 'N/A'}</p>
                </div>
              </div>

              <div className="info-card">
                <h3>Quick Stats</h3>
                <div className="stats-list">
                  <div className="stat-item">
                    <span className="label">Team Members:</span>
                    <span className="value">{stats.teamMembers}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Available Credits:</span>
                    <span className="value">{stats.credits}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Active Job Postings:</span>
                    <span className="value">{stats.activeJobs}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-actions">
              <h3>Admin Actions</h3>
              <div className="actions-grid">
                <button
                  className="action-button"
                  onClick={() => setActiveTab('team')}
                >
                  <span className="icon">👥</span>
                  <span>Manage Team</span>
                </button>
                <button
                  className="action-button"
                  onClick={() => setActiveTab('subscriptions')}
                >
                  <span className="icon">📋</span>
                  <span>Manage Subscriptions</span>
                </button>
                <button
                  className="action-button"
                  onClick={() => setActiveTab('credits')}
                >
                  <span className="icon">💰</span>
                  <span>Manage Credits</span>
                </button>
                <button
                  className="action-button"
                  onClick={() => setActiveTab('settings')}
                >
                  <span className="icon">⚙️</span>
                  <span>Company Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="team-section">
            <h2>Team Management</h2>
            <p className="section-description">
              Manage all team members, assign roles, and control access to company resources.
            </p>
            <TeamManager userRole={userRole} canManageTeam={true} />
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="subscriptions-section">
            <h2>Subscription Management</h2>
            <p className="section-description">
              View and manage your company's subscription plan and billing information.
            </p>
            <SubscriptionManager />
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="credits-section">
            <h2>Credits & Billing</h2>
            <p className="section-description">
              Monitor your credit balance, purchase additional credits, and view transaction history.
            </p>
            <CreditManager />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Company Settings</h2>
            <div className="settings-card">
              <h3>General Settings</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={companyInfo?.company_name || ''}
                    disabled
                    placeholder="Company name"
                  />
                  <small>Contact support to change company name</small>
                </div>
                <div className="form-group">
                  <label>Company Email</label>
                  <input
                    type="email"
                    value={companyInfo?.email || ''}
                    disabled
                    placeholder="Company email"
                  />
                </div>
              </div>
            </div>

            <div className="settings-card danger-zone">
              <h3>Danger Zone</h3>
              <p>These actions cannot be undone. Please proceed with caution.</p>
              <button className="btn-danger">Delete Company Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
