import React, { useState, useEffect, useRef } from 'react';
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
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  fileText: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  award: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alertTriangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

/* ── Interfaces ── */
interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  residential_address: string;
  location_state: string;
  location_county: string;
  location_zipcode: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  profile_summary?: string;
}

interface Resume {
  id: number;
  filename: string;
  uploaded_at: string;
}

interface Certification {
  id: number;
  name: string;
  issuer?: string;
  issued_date?: string;
  expiry_date?: string;
}

const EMPTY_PROFILE: CandidateProfile = {
  name: '', email: '', phone: '', residential_address: '',
  location_state: '', location_county: '', location_zipcode: '',
  linkedin_url: '', github_url: '', portfolio_url: '', profile_summary: ''
};

/* ================================================================
   COMPONENT
   ================================================================ */
const CandidateProfilePage: React.FC = () => {
  const navigate = useNavigate();

  /* ── state ── */
  const [profile, setProfile] = useState<CandidateProfile>({ ...EMPTY_PROFILE });
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['personal', 'social', 'summary']));
  const toggleSection = (id: string) => setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Cert upload form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [showCertForm, setShowCertForm] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'resume' | 'cert'; id: number; name: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  /* ── data fetch ── */
  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCandidateProfile();
      setProfile(response.data);
      setHasProfile(true);

      const [resumesRes, certsRes] = await Promise.all([
        apiClient.getResumes(),
        apiClient.getCertifications()
      ]);
      setResumes(resumesRes.data);
      setCertifications(certsRes.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasProfile(false);
        setIsEditing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── handlers ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (hasProfile) {
        await apiClient.updateCandidateProfile(profile);
        showToast('Profile updated successfully');
      } else {
        await apiClient.createCandidateProfile(profile);
        showToast('Profile created successfully');
        setHasProfile(true);
      }
      setIsEditing(false);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to save profile', 'error');
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await apiClient.uploadResume(file);
      showToast('Resume uploaded successfully');
      const resumesRes = await apiClient.getResumes();
      setResumes(resumesRes.data);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to upload resume', 'error');
    }
    e.target.value = '';
  };

  const handleCertSubmit = async () => {
    if (!certFile || !certName.trim()) return;
    try {
      await apiClient.uploadCertification(certFile, certName, certIssuer || undefined);
      showToast('Certification uploaded successfully');
      const certsRes = await apiClient.getCertifications();
      setCertifications(certsRes.data);
      setCertName('');
      setCertIssuer('');
      setCertFile(null);
      setShowCertForm(false);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to upload certification', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'resume') {
        await apiClient.deleteResume(deleteTarget.id);
        setResumes(resumes.filter(r => r.id !== deleteTarget.id));
      } else {
        await apiClient.deleteCertification(deleteTarget.id);
        setCertifications(certifications.filter(c => c.id !== deleteTarget.id));
      }
      showToast(`${deleteTarget.type === 'resume' ? 'Resume' : 'Certification'} deleted`);
    } catch {
      showToast('Failed to delete', 'error');
    }
    setDeleteTarget(null);
  };

  /* ================================================================
     RENDER — PROFILE READ VIEW (Accordion sections)
     ================================================================ */
  const renderProfileView = () => (
    <>
      {/* Personal Info */}
      <div className={`cp-profile-card ${openSections.has('personal') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('personal')}>
          <span className="cp-profile-card-header-icon">{Icons.user}</span>
          <span className="cp-profile-card-header-text">Personal Information</span>
          <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
        </button>
        {openSections.has('personal') && (
          <div className="cp-profile-card-body">
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
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">Residential Address</span>
                <span className="cp-profile-view-value">{profile.residential_address || <span className="empty">Not provided</span>}</span>
              </div>
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">State</span>
                <span className="cp-profile-view-value">{profile.location_state || <span className="empty">—</span>}</span>
              </div>
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">County</span>
                <span className="cp-profile-view-value">{profile.location_county || <span className="empty">—</span>}</span>
              </div>
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">Zipcode</span>
                <span className="cp-profile-view-value">{profile.location_zipcode || <span className="empty">—</span>}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className={`cp-profile-card ${openSections.has('social') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('social')}>
          <span className="cp-profile-card-header-icon">{Icons.link}</span>
          <span className="cp-profile-card-header-text">Social Links & Portfolio</span>
          <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
        </button>
        {openSections.has('social') && (
          <div className="cp-profile-card-body">
            <div className="cp-profile-view-grid">
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">LinkedIn</span>
                <span className="cp-profile-view-value">
                  {profile.linkedin_url
                    ? <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">{profile.linkedin_url}</a>
                    : <span className="empty">Not added</span>}
                </span>
              </div>
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">GitHub</span>
                <span className="cp-profile-view-value">
                  {profile.github_url
                    ? <a href={profile.github_url} target="_blank" rel="noopener noreferrer">{profile.github_url}</a>
                    : <span className="empty">Not added</span>}
                </span>
              </div>
              <div className="cp-profile-view-field">
                <span className="cp-profile-view-label">Portfolio</span>
                <span className="cp-profile-view-value">
                  {profile.portfolio_url
                    ? <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">{profile.portfolio_url}</a>
                    : <span className="empty">Not added</span>}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Summary */}
      <div className={`cp-profile-card ${openSections.has('summary') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('summary')}>
          <span className="cp-profile-card-header-icon">{Icons.fileText}</span>
          <span className="cp-profile-card-header-text">Profile Summary</span>
          <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
        </button>
        {openSections.has('summary') && (
          <div className="cp-profile-card-body">
            {profile.profile_summary ? (
              <p className="cp-profile-summary-text">{profile.profile_summary}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--cp-text-tertiary)', fontStyle: 'italic', paddingTop: 16 }}>No profile summary added yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Documents (collapsed by default) */}
      <div className={`cp-profile-card ${openSections.has('documents') ? 'open' : ''}`}>
        <button type="button" className="cp-profile-card-header" onClick={() => toggleSection('documents')}>
          <span className="cp-profile-card-header-icon">{Icons.fileText}</span>
          <span className="cp-profile-card-header-text">Preferences</span>
          <span className="cp-profile-card-chevron">{Icons.chevDown}</span>
        </button>
        {openSections.has('documents') && (
          <div className="cp-profile-card-body">
            <NotificationPreferences />
          </div>
        )}
      </div>
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
          <h3 className="cp-form-section-title">{Icons.user} {hasProfile ? 'Edit Profile' : 'Create Your Profile'}</h3>

          <div className="cp-form-grid-2">
            <div className="cp-form-group">
              <label className="required">Full Name</label>
              <input type="text" name="name" value={profile.name} onChange={handleInputChange}
                placeholder="Enter your full name" required />
            </div>
            <div className="cp-form-group">
              <label className="required">Email</label>
              <input type="email" name="email" value={profile.email} onChange={handleInputChange}
                placeholder="your.email@example.com" required />
            </div>
          </div>

          <div className="cp-form-grid-2">
            <div className="cp-form-group">
              <label className="required">Phone</label>
              <input type="tel" name="phone" value={profile.phone} onChange={handleInputChange}
                placeholder="+1 (555) 123-4567" required />
            </div>
            <div className="cp-form-group">
              <label className="required">Residential Address</label>
              <input type="text" name="residential_address" value={profile.residential_address}
                onChange={handleInputChange} placeholder="123 Main Street, Apt 4B" required />
            </div>
          </div>

          <div className="cp-form-grid-3">
            <div className="cp-form-group">
              <label className="required">State</label>
              <input type="text" name="location_state" value={profile.location_state}
                onChange={handleInputChange} placeholder="California" required />
            </div>
            <div className="cp-form-group">
              <label className="required">County</label>
              <input type="text" name="location_county" value={profile.location_county}
                onChange={handleInputChange} placeholder="Los Angeles" required />
            </div>
            <div className="cp-form-group">
              <label className="required">Zipcode</label>
              <input type="text" name="location_zipcode" value={profile.location_zipcode}
                onChange={handleInputChange} placeholder="90001" required />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">{Icons.link} Social Links & Portfolio</h3>

          <div className="cp-form-grid-3">
            <div className="cp-form-group">
              <label>LinkedIn URL</label>
              <input type="url" name="linkedin_url" value={profile.linkedin_url || ''}
                onChange={handleInputChange} placeholder="https://linkedin.com/in/username" />
              <span className="cp-helper-text">Your professional profile</span>
            </div>
            <div className="cp-form-group">
              <label>GitHub URL</label>
              <input type="url" name="github_url" value={profile.github_url || ''}
                onChange={handleInputChange} placeholder="https://github.com/username" />
              <span className="cp-helper-text">Showcase your projects</span>
            </div>
            <div className="cp-form-group">
              <label>Portfolio URL</label>
              <input type="url" name="portfolio_url" value={profile.portfolio_url || ''}
                onChange={handleInputChange} placeholder="https://yourportfolio.com" />
              <span className="cp-helper-text">Personal website or works</span>
            </div>
          </div>

          <div className="cp-form-group">
            <label>Profile Summary</label>
            <textarea name="profile_summary" value={profile.profile_summary || ''}
              onChange={handleInputChange} rows={5}
              placeholder="Tell us about yourself, your experience, and what you're looking for..." />
            <span className="cp-helper-text">A brief introduction that highlights your strengths and career goals</span>
          </div>
        </div>

        {/* Form Footer */}
        <div className="cp-form-footer">
          {hasProfile && (
            <button type="button" className="cp-btn cp-btn-outline" onClick={() => { setIsEditing(false); fetchProfile(); }}>
              Cancel
            </button>
          )}
          <button type="submit" className="cp-btn cp-btn-primary cp-btn-lg">
            {hasProfile ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );

  /* ================================================================
     RENDER — RESUME SIDEBAR WIDGET
     ================================================================ */
  const renderResumeSidebar = () => (
    <div className="cp-sidebar-widget">
      <div className="cp-sidebar-widget-title">
        <span className="cp-sidebar-widget-icon">{Icons.fileText}</span>
        Resume Management
      </div>
      <div className="cp-sidebar-widget-body">
        <div className="cp-sidebar-upload-btn" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeUpload}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
          {Icons.upload} Upload Resume
        </div>
        {resumes.length > 0 ? (
          resumes.map(r => (
            <div key={r.id} className="cp-file-item">
              <span className="cp-file-icon">{Icons.fileText}</span>
              <div className="cp-file-info">
                <div className="cp-file-name">{r.filename}</div>
                <div className="cp-file-date">
                  {new Date(r.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="cp-file-actions">
                <button className="cp-icon-btn" title="Delete" onClick={() => setDeleteTarget({ type: 'resume', id: r.id, name: r.filename })}>
                  {Icons.trash}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No resumes uploaded yet.</p>
        )}
      </div>
    </div>
  );

  /* ================================================================
     RENDER — CERTIFICATIONS SIDEBAR WIDGET
     ================================================================ */
  const renderCertSidebar = () => (
    <div className="cp-sidebar-widget">
      <div className="cp-sidebar-widget-title">
        <span className="cp-sidebar-widget-icon">{Icons.award}</span>
        Certifications
      </div>
      <div className="cp-sidebar-widget-body">
        {!showCertForm ? (
          <button className="cp-sidebar-upload-btn" onClick={() => setShowCertForm(true)}>
            {Icons.upload} Upload Certification
          </button>
        ) : (
          <div style={{ marginBottom: 14, padding: 14, background: 'var(--cp-bg)', borderRadius: 10, border: '1px solid var(--cp-border)' }}>
            <div className="cp-form-group">
              <label className="required">Certification Name</label>
              <input type="text" value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="e.g., Oracle Cloud 2024" style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--cp-border)', borderRadius: 6, fontFamily: 'inherit' }} />
            </div>
            <div className="cp-form-group">
              <label>Issuer (optional)</label>
              <input type="text" value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="e.g., Oracle, AWS" style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--cp-border)', borderRadius: 6, fontFamily: 'inherit' }} />
            </div>
            <div style={{ position: 'relative', marginBottom: 10, padding: '8px 10px', border: '1px dashed var(--cp-border)', borderRadius: 6, fontSize: 13, color: 'var(--cp-text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="file" ref={certFileRef} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCertFile(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              <span style={{ display: 'inline-flex', width: 13, height: 13, flexShrink: 0 }}>{Icons.upload}</span> {certFile ? certFile.name : 'Select file (PDF, JPG, PNG)'}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="cp-btn cp-btn-outline cp-btn-sm" type="button" onClick={() => { setShowCertForm(false); setCertName(''); setCertIssuer(''); setCertFile(null); }}>Cancel</button>
              <button className="cp-btn cp-btn-primary cp-btn-sm" type="button" onClick={handleCertSubmit} disabled={!certFile || !certName.trim()}>Upload</button>
            </div>
          </div>
        )}
        {certifications.length > 0 ? (
          certifications.map(c => (
            <div key={c.id} className="cp-cert-item">
              <span className="cp-cert-check-icon">{Icons.check}</span>
              <div className="cp-cert-info">
                <div className="cp-cert-name">{c.name}</div>
                <div className="cp-cert-meta">
                  {c.issuer && <span>{c.issuer}</span>}
                  {c.issued_date && <span>{c.issuer ? ' · ' : ''}Issued {new Date(c.issued_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                </div>
              </div>
              <button className="cp-icon-btn danger" title="Delete" style={{ flexShrink: 0 }} onClick={() => setDeleteTarget({ type: 'cert', id: c.id, name: c.name })}>
                {Icons.trash}
              </button>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No certifications added yet.</p>
        )}
      </div>
    </div>
  );

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
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w60" /></div>
        </div>
      </div>
      <div className="cp-skeleton-card" style={{ marginTop: 16 }}>
        <div className="cp-skeleton-line h20 w30" />
        <div className="cp-skeleton-line w40" />
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
            <a onClick={() => navigate('/candidate-dashboard')} style={{ cursor: 'pointer' }}>Dashboard</a>
            <span className="cp-breadcrumb-sep">›</span>
            <span className="cp-breadcrumb-current">Profile</span>
          </nav>

          {/* Page Title */}
          <div className="cp-page-title-block">
            <h1 className="cp-page-h1">My Profile</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hasProfile && !isEditing && (
                <button className="cp-btn cp-btn-primary" onClick={() => setIsEditing(true)}>
                  {Icons.edit} Edit Profile
                </button>
              )}
              <button className="cp-btn cp-btn-outline" onClick={() => navigate('/candidate/job-preferences')}>
                {Icons.briefcase} Job Preferences
              </button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="cp-page-layout">
            {/* Left: accordion profile sections */}
            <div className="cp-main-col">
              {isEditing ? renderProfileForm() : renderProfileView()}
            </div>

            {/* Right: sidebar widgets */}
            {hasProfile && (
              <div className="cp-sidebar-col">
                {renderResumeSidebar()}
                {renderCertSidebar()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="cp-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-icon">{Icons.alertTriangle}</div>
            <h3>Delete this {deleteTarget.type === 'resume' ? 'resume' : 'certification'}?</h3>
            <p>This action cannot be undone.</p>
            <div className="cp-modal-preview">{deleteTarget.name}</div>
            <div className="cp-modal-actions">
              <button className="cp-btn cp-btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="cp-btn cp-btn-danger" onClick={confirmDelete}>{Icons.trash} Delete</button>
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

export default CandidateProfilePage;
