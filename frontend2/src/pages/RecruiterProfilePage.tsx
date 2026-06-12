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
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.87 19.79 19.79 0 011.12 1.19 2 2 0 013.11 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
};

/* ── Interfaces ── */
interface RecruiterProfile {
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  company_role?: string;
  company_website?: string;
  company_location?: string;
  department?: string;
  phone_number?: string;
  linkedin_profile?: string;
  hiring_focus?: string;
  company_description?: string;
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
  name: '', email: '', phone: '',
  company_name: '', company_role: '',
  company_website: '', company_location: '', department: '',
  phone_number: '', linkedin_profile: '', hiring_focus: '',
  company_description: ''
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['personal', 'company']));
  const toggleSection = (id: string) => setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [editingSection, setEditingSection] = useState<string | null>(null);

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
      const [userResp, companyResp] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getCompanyProfile().catch(() => null)
      ]);
      const userData = userResp.data.user || userResp.data;
      const companyData = companyResp?.data || {};

      setProfile({
        name: userData.full_name || userData.name || '',
        email: userData.email || '',
        phone: companyData.phone_number || userData.phone || '',
        company_name: companyData.company_name || userData.company_name || '',
        company_role: companyData.employee_type || userData.role || '',
        company_website: companyData.company_website || '',
        company_location: companyData.company_location || '',
        department: companyData.department || '',
        phone_number: companyData.phone_number || '',
        linkedin_profile: companyData.linkedin_profile || '',
        hiring_focus: companyData.hiring_focus || '',
        company_description: companyData.company_description || '',
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
      await apiClient.updateExtendedCompanyProfile({
        full_name: profile.name,
        company_name: profile.company_name,
        company_website: profile.company_website,
        company_location: profile.company_location,
        department: profile.department,
        phone_number: profile.phone_number || profile.phone,
        linkedin_profile: profile.linkedin_profile,
        hiring_focus: profile.hiring_focus,
        company_description: profile.company_description,
      });
      showToast('Profile updated successfully');
      setHasProfile(true);
      setIsEditing(false);
      setEditingSection(null);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to save profile', 'error');
    }
  };

  /* ================================================================
     RENDER — PROFILE VIEW (accordion cards with inline edit)
     ================================================================ */
  const renderProfileView = () => (
    <>
      {/* Personal Info */}
      <div className={`cp-profile-card ${openSections.has('personal') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('personal')}>
          <span className="cp-profile-card-header-icon">{Icons.user}</span>
          <span className="cp-profile-card-header-text">Personal Information</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingSection !== 'personal' && (
              <button type="button" className="cp-profile-card-header-btn" onClick={(e) => { e.stopPropagation(); setEditingSection('personal'); openSections.has('personal') || toggleSection('personal'); }}>
                {Icons.edit} Edit
              </button>
            )}
            <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
          </span>
        </button>
        {openSections.has('personal') && (
          <div className="cp-profile-card-body">
            {editingSection === 'personal' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); setEditingSection(null); }}>
                <div className="cp-form-grid-2">
                  <div className="cp-form-group">
                    <label className="required">Full Name</label>
                    <input type="text" name="name" value={profile.name} onChange={handleInputChange} placeholder="Enter your full name" required />
                  </div>
                  <div className="cp-form-group">
                    <label className="required">Email</label>
                    <input type="email" name="email" value={profile.email} onChange={handleInputChange} placeholder="your.email@company.com" required />
                  </div>
                  <div className="cp-form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value={profile.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" className="cp-btn cp-btn-outline cp-btn-sm" onClick={() => setEditingSection(null)}>Cancel</button>
                  <button type="submit" className="cp-btn cp-btn-primary cp-btn-sm">{Icons.check} Save</button>
                </div>
              </form>
            ) : (
              <div className="cp-profile-view-grid">
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Full Name</span>
                  <span className="cp-profile-view-value">{profile.name || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Email</span>
                  <span className="cp-profile-view-value">
                    {profile.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : <span className="empty">Not provided</span>}
                  </span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Phone</span>
                  <span className="cp-profile-view-value">{profile.phone || <span className="empty">Not provided</span>}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company Info */}
      <div className={`cp-profile-card ${openSections.has('company') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('company')}>
          <span className="cp-profile-card-header-icon">{Icons.building}</span>
          <span className="cp-profile-card-header-text">Company Information</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingSection !== 'company' && (
              <button type="button" className="cp-profile-card-header-btn" onClick={(e) => { e.stopPropagation(); setEditingSection('company'); openSections.has('company') || toggleSection('company'); }}>
                {Icons.edit} Edit
              </button>
            )}
            <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
          </span>
        </button>
        {openSections.has('company') && (
          <div className="cp-profile-card-body">
            {editingSection === 'company' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
                <div className="cp-form-grid-2">
                  <div className="cp-form-group">
                    <label>Company Name</label>
                    <input type="text" name="company_name" value={profile.company_name} onChange={handleInputChange} placeholder="Your company name" />
                  </div>
                  <div className="cp-form-group">
                    <label>Your Role</label>
                    <input type="text" name="company_role" value={profile.company_role} onChange={handleInputChange} placeholder="e.g., Recruiter, HR Manager" />
                  </div>
                  <div className="cp-form-group">
                    <label>Company Website</label>
                    <input type="url" name="company_website" value={profile.company_website} onChange={handleInputChange} placeholder="https://yourcompany.com" />
                  </div>
                  <div className="cp-form-group">
                    <label>Company Location</label>
                    <input type="text" name="company_location" value={profile.company_location} onChange={handleInputChange} placeholder="City, State or Country" />
                  </div>
                  <div className="cp-form-group">
                    <label>Department</label>
                    <input type="text" name="department" value={profile.department} onChange={handleInputChange} placeholder="e.g., Human Resources" />
                  </div>
                  <div className="cp-form-group">
                    <label>LinkedIn Profile</label>
                    <input type="url" name="linkedin_profile" value={profile.linkedin_profile} onChange={handleInputChange} placeholder="https://linkedin.com/company/..." />
                  </div>
                  <div className="cp-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Hiring Focus</label>
                    <input type="text" name="hiring_focus" value={profile.hiring_focus} onChange={handleInputChange} placeholder="e.g., Software Engineers, Product Managers" />
                  </div>
                  <div className="cp-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Company Description</label>
                    <textarea name="company_description" value={profile.company_description} onChange={(e) => setProfile(prev => ({ ...prev, company_description: e.target.value }))} placeholder="Brief description of your company..." rows={3} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" className="cp-btn cp-btn-outline cp-btn-sm" onClick={() => setEditingSection(null)}>Cancel</button>
                  <button type="submit" className="cp-btn cp-btn-primary cp-btn-sm">{Icons.check} Save</button>
                </div>
              </form>
            ) : (
              <div className="cp-profile-view-grid">
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Company Name</span>
                  <span className="cp-profile-view-value">{profile.company_name || companyName || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Role</span>
                  <span className="cp-profile-view-value">{profile.company_role || userRole || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Company Website</span>
                  <span className="cp-profile-view-value">
                    {profile.company_website ? <a href={profile.company_website} target="_blank" rel="noopener noreferrer">{profile.company_website}</a> : <span className="empty">Not provided</span>}
                  </span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Location</span>
                  <span className="cp-profile-view-value">{profile.company_location || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">Department</span>
                  <span className="cp-profile-view-value">{profile.department || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field">
                  <span className="cp-profile-view-label">LinkedIn</span>
                  <span className="cp-profile-view-value">
                    {profile.linkedin_profile ? <a href={profile.linkedin_profile} target="_blank" rel="noopener noreferrer">{profile.linkedin_profile}</a> : <span className="empty">Not provided</span>}
                  </span>
                </div>
                <div className="cp-profile-view-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="cp-profile-view-label">Hiring Focus</span>
                  <span className="cp-profile-view-value">{profile.hiring_focus || <span className="empty">Not provided</span>}</span>
                </div>
                <div className="cp-profile-view-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="cp-profile-view-label">Company Description</span>
                  <span className="cp-profile-view-value" style={{ whiteSpace: 'pre-wrap' }}>{profile.company_description || <span className="empty">Not provided</span>}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences — below Company Information */}
      {hasProfile && (
        <div className="cp-profile-card" style={{ marginTop: 0 }}>
          <div className="cp-profile-card-header" style={{ cursor: 'default' }}>
            <span className="cp-profile-card-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </span>
            <span className="cp-profile-card-header-text">Notification Preferences</span>
          </div>
          <div className="cp-profile-card-body" style={{ padding: '16px 20px' }}>
            <NotificationPreferences />
          </div>
        </div>
      )}
    </>
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
     RENDER — TEAM SIDEBAR WIDGET
     ================================================================ */
  const renderTeamSidebar = () => (
    <div className="cp-sidebar-widget">
      <div className="cp-sidebar-widget-title">
        <span className="cp-sidebar-widget-icon">{Icons.users}</span>
        Team Members
      </div>
      <div className="cp-sidebar-widget-body">
        {teamMembers.map(member => (
          <div key={member.id} className={`cp-team-member-card${member.is_self ? ' is-self' : ''}`}>
            <div className="cp-team-member-top">
              <div className="cp-team-avatar">{member.name.charAt(0).toUpperCase()}</div>
              <div className="cp-team-name-block">
                <div className="cp-team-name">
                  {member.name}
                  {member.is_self && <span className="cp-team-you-badge">You</span>}
                </div>
                <div className="cp-team-email">{member.email}</div>
              </div>
            </div>
            <div className="cp-team-member-meta">
              <span className="cp-team-jobs-count">{member.jobs_posted} {member.jobs_posted === 1 ? 'job' : 'jobs'}</span>
              <span className={`cp-status-dot-badge ${member.status.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                {member.status}
              </span>
            </div>
          </div>
        ))}
        {teamMembers.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No team members yet.</p>
        )}
        {canManageTeam && (
          <button className="cp-sidebar-upload-btn" style={{ marginTop: 8 }}>
            {Icons.userPlus} Invite Member
          </button>
        )}
      </div>
    </div>
  );

  /* ================================================================
     RENDER — TEAM MANAGEMENT SECTION (legacy, unused)
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
      {loading ? (
        renderSkeleton()
      ) : (
        <div className="cp-content">
          {/* Breadcrumb */}
          <nav className="cp-breadcrumb">
            <a onClick={() => navigate('/recruiter-dashboard')} style={{ cursor: 'pointer' }}>Dashboard</a>
            <span className="cp-breadcrumb-sep">›</span>
            <span className="cp-breadcrumb-current">Profile</span>
          </nav>

          {/* Page Title */}
          <div className="cp-page-title-block">
            <h1 className="cp-page-h1">Recruiter Profile</h1>
          </div>

          {/* Two-column layout */}
          <div className="cp-page-layout">
            {/* Left: accordion profile sections or form */}
            <div className="cp-main-col">
              {isEditing ? renderProfileForm() : renderProfileView()}
            </div>

            {/* Right: team sidebar */}
            <div className="cp-sidebar-col">
              {renderTeamSidebar()}
              {/* Notification Preferences moved to main column below Company Information */}
            </div>
          </div>
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
