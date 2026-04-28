import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/CandidatePages.css';
import NotificationPreferences from '../components/NotificationPreferences';

/* ── SVG Icons ── */
const Icons = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  layout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  building: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  userPlus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alertTriangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

/* ── Interfaces ── */
interface RecruiterProfile {
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  company_role?: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  jobs_posted: number;
  status: string;
  is_self: boolean;
}

const EMPTY_PROFILE: RecruiterProfile = {
  name: '', 
  email: '', 
  phone: '', 
  company_name: '', 
  company_role: ''
};

/* ================================================================
   COMPONENT
   ================================================================ */
const RecruiterProfilePage: React.FC = () => {
  const navigate = useNavigate();

  /* ── state ── */
  const [profile, setProfile] = useState<RecruiterProfile>({ ...EMPTY_PROFILE });
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string>('recruiter');
  const [companyName, setCompanyName] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const canManageTeam = userRole === 'admin' || userRole === 'hr';

  /* ── data fetch ── */
  useEffect(() => { 
    fetchProfile(); 
    fetchTeamMembers();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCurrentUser();
      const userData = response.data.user || response.data;
      
      setProfile({
        name: userData.full_name || userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        company_name: userData.company_name || '',
        company_role: userData.role || ''
      });
      setHasProfile(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasProfile(false);
        setIsEditing(true);
      } else {
        showToast('Failed to load profile', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await apiClient.getTeamMembers();
      setTeamMembers(res.data.team_members || []);
      if (res.data.my_role) {
        setUserRole(res.data.my_role);
      }
      if (res.data.company_name) {
        setCompanyName(res.data.company_name);
      }
    } catch (err) {
      console.log('[TEAM] Could not fetch team members:', err);
    }
  };

  /* ── handlers ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Note: You'll need to implement recruiter profile update endpoint
      showToast('Profile updated successfully');
      setHasProfile(true);
      setIsEditing(false);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to save profile', 'error');
    }
  };

  /* ================================================================
     RENDER — PROFILE VIEW (READ-ONLY)
     ================================================================ */
  const renderProfileView = () => (
    <div className="cp-form-container">
      {/* Personal Info */}
      <div className="cp-form-section">
        <h3 className="cp-form-section-title">{Icons.user} Personal Information</h3>
        <div className="cp-profile-grid">
          <div className="cp-profile-field">
            <span className="cp-profile-label">Full Name</span>
            <span className="cp-profile-value">{profile.name || <span className="empty">Not provided</span>}</span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">Email</span>
            <span className="cp-profile-value">
              {profile.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : <span className="empty">Not provided</span>}
            </span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">Phone</span>
            <span className="cp-profile-value">{profile.phone || <span className="empty">Not provided</span>}</span>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="cp-form-section">
        <h3 className="cp-form-section-title">{Icons.building} Company Information</h3>
        <div className="cp-profile-grid">
          <div className="cp-profile-field">
            <span className="cp-profile-label">Company Name</span>
            <span className="cp-profile-value">{profile.company_name || companyName || <span className="empty">Not provided</span>}</span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">Role</span>
            <span className="cp-profile-value">{profile.company_role || userRole || <span className="empty">Not provided</span>}</span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     RENDER — PROFILE EDIT FORM
     ================================================================ */
  const renderProfileForm = () => (
    <div className="cp-form-container">
      <form onSubmit={handleSubmit}>
        {/* Personal Info */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">{Icons.user} Personal Information</h3>

          <div className="cp-form-grid-2">
            <div className="cp-form-group">
              <label className="required">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={profile.name} 
                onChange={handleInputChange}
                placeholder="Enter your full name" 
                required 
              />
            </div>
            <div className="cp-form-group">
              <label className="required">Email</label>
              <input 
                type="email" 
                name="email" 
                value={profile.email} 
                onChange={handleInputChange}
                placeholder="your.email@company.com" 
                required 
              />
            </div>
            <div className="cp-form-group">
              <label>Phone</label>
              <input 
                type="tel" 
                name="phone" 
                value={profile.phone} 
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000" 
              />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">{Icons.building} Company Information</h3>

          <div className="cp-form-grid-2">
            <div className="cp-form-group">
              <label>Company Name</label>
              <input 
                type="text" 
                name="company_name" 
                value={profile.company_name} 
                onChange={handleInputChange}
                placeholder="Your company name" 
              />
            </div>
            <div className="cp-form-group">
              <label>Your Role</label>
              <input 
                type="text" 
                name="company_role" 
                value={profile.company_role} 
                onChange={handleInputChange}
                placeholder="e.g., Recruiter, HR Manager" 
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="cp-form-actions">
          {hasProfile && (
            <button 
              type="button" 
              className="cp-btn cp-btn-outline" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="cp-btn cp-btn-primary">
            {Icons.check} {hasProfile ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );

  /* ================================================================
     RENDER — TEAM MANAGEMENT SECTION
     ================================================================ */
  const renderTeamManagement = () => {
    if (!canManageTeam || teamMembers.length === 0) return null;

    return (
      <div className="cp-form-container" style={{ marginTop: 24 }}>
        {/* Team Header */}
        <div className="cp-form-section" style={{ borderBottom: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 className="cp-form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              {Icons.users} Team Management
            </h3>
            <button className="cp-btn cp-btn-primary cp-btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Icons.userPlus} Invite Member
            </button>
          </div>

          {/* Team Members Table */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            marginTop: 16
          }}>
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 1fr 1fr', 
              gap: 16, 
              padding: '12px 16px',
              background: '#F9FAFB',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--cp-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <span>Member</span>
              <span>Role</span>
              <span>Jobs Posted</span>
              <span>Status</span>
            </div>

            {/* Table Rows */}
            {teamMembers.map((member) => (
              <div 
                key={member.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                  gap: 16, 
                  padding: '16px',
                  background: member.is_self ? '#F8F9FF' : '#FFFFFF',
                  border: '1px solid var(--cp-border)',
                  borderRadius: 12,
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Member Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--cp-accent), #8B7AE6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: 'var(--cp-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      {member.name}
                      {member.is_self && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          background: '#E0E7FF',
                          color: '#4F46E5',
                          borderRadius: 999,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: 13, 
                      color: 'var(--cp-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {member.email}
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  background: member.role.toLowerCase() === 'admin' ? '#FEF3C7' :
                              member.role.toLowerCase() === 'hr' ? '#DBEAFE' : '#F3F4F6',
                  color: member.role.toLowerCase() === 'admin' ? '#92400E' :
                          member.role.toLowerCase() === 'hr' ? '#1E40AF' : '#374151',
                  borderRadius: 999,
                  textTransform: 'capitalize',
                  width: 'fit-content'
                }}>
                  {member.role}
                </span>

                {/* Jobs Count */}
                <span style={{ fontSize: 14, color: 'var(--cp-text-secondary)' }}>
                  <strong style={{ color: 'var(--cp-text-primary)' }}>{member.jobs_posted}</strong> {member.jobs_posted === 1 ? 'job' : 'jobs'}
                </span>

                {/* Status Badge */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  background: member.status.toLowerCase() === 'active' ? '#D1FAE5' : '#FEE2E2',
                  color: member.status.toLowerCase() === 'active' ? '#065F46' : '#991B1B',
                  borderRadius: 999,
                  textTransform: 'capitalize',
                  width: 'fit-content'
                }}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ================================================================
     RENDER — LOADING SKELETON
     ================================================================ */
  const renderSkeleton = () => (
    <div className="cp-content">
      <div className="cp-skeleton-card">
        <div className="cp-skeleton-line h20 w40" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w80" /></div>
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w60" /></div>
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w80" /></div>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className="cp-page">
      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-header-left">
            <h1 className="cp-header-title">My Profile</h1>
            <p className="cp-header-subtitle">
              {isEditing
                ? 'Update your profile information'
                : 'Manage your profile, team, and preferences'}
            </p>
          </div>
          <div className="cp-header-actions">
            {hasProfile && !isEditing && (
              <button className="cp-btn cp-btn-primary" onClick={() => setIsEditing(true)}>
                {Icons.edit} Edit Profile
              </button>
            )}
            <button className="cp-btn cp-btn-outline" onClick={() => navigate('/recruiter-dashboard')}>
              {Icons.layout} Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        renderSkeleton()
      ) : (
        <div className="cp-content">
          {/* Profile read or edit view */}
          {isEditing ? renderProfileForm() : renderProfileView()}

          {/* Team Management - show for admin/hr roles */}
          {hasProfile && !isEditing && renderTeamManagement()}

          {/* Notification Preferences - always show after profile is loaded */}
          {hasProfile && (
            <div style={{ marginTop: 32 }}>
              <NotificationPreferences />
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`cp-toast ${toast.type}`}>
          {toast.type === 'success' ? Icons.check : Icons.alertTriangle}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default RecruiterProfilePage;
