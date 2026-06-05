import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import TeamManager from '../components/TeamManager';
import CreditManager from '../components/CreditManager';
import '../styles/HRDashboard.css';

interface HRDashboardProps {
  userRole?: string;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ userRole = 'hr' }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'credits' | 'overview'>('overview');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      setLoading(true);
      const userInfo = await apiClient.getCurrentUser();
      setCompanyInfo(userInfo);
    } catch (err) {
      setError('Failed to load company information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="hr-dashboard loading">Loading HR Dashboard...</div>;
  }

  const isHR = userRole.toLowerCase() === 'hr';
  const isAdmin = userRole.toLowerCase() === 'admin';
  const canManageTeam = isAdmin || isHR;

  return (
    <div className="hr-dashboard">
      <div className="dashboard-header">
        <h1>HR Dashboard</h1>
        <p className="subtitle">Manage your team and company resources</p>
      </div>

      {error && <div className="error-message">{error}</div>}

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
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'credits' ? 'active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            Credits & Billing
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="info-cards">
              <div className="info-card">
                <h3>Company Name</h3>
                <p className="value">{companyInfo?.company_name || 'Not Set'}</p>
              </div>
              <div className="info-card">
                <h3>Your Role</h3>
                <p className="value">{companyInfo?.role?.toUpperCase() || 'N/A'}</p>
              </div>
              <div className="info-card">
                <h3>Email</h3>
                <p className="value">{companyInfo?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button
                  className="action-button"
                  onClick={() => setActiveTab('team')}
                >
                  <span className="icon">👥</span>
                  <span>Manage Team</span>
                </button>
                {isAdmin && (
                  <button
                    className="action-button"
                    onClick={() => setActiveTab('credits')}
                  >
                    <span className="icon">💳</span>
                    <span>Manage Credits</span>
                  </button>
                )}
                <button className="action-button">
                  <span className="icon">📊</span>
                  <span>View Reports</span>
                </button>
                <button className="action-button">
                  <span className="icon">⚙️</span>
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="team-section">
            <TeamManager userRole={userRole} canManageTeam={canManageTeam} />
          </div>
        )}

        {activeTab === 'credits' && isAdmin && (
          <div className="credits-section">
            <CreditManager />
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
