import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/CandidatePages.css';

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
     RENDER — PROFILE READ VIEW
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
          <div className="cp-profile-field">
            <span className="cp-profile-label">Address</span>
            <span className="cp-profile-value">
              {profile.residential_address || <span className="empty">Not provided</span>}
            </span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">State</span>
            <span className="cp-profile-value">{profile.location_state || <span className="empty">—</span>}</span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">County</span>
            <span className="cp-profile-value">{profile.location_county || <span className="empty">—</span>}</span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">Zipcode</span>
            <span className="cp-profile-value">{profile.location_zipcode || <span className="empty">—</span>}</span>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="cp-form-section">
        <h3 className="cp-form-section-title">{Icons.link} Social Links & Portfolio</h3>
        <div className="cp-profile-grid">
          <div className="cp-profile-field">
            <span className="cp-profile-label">LinkedIn</span>
            <span className="cp-profile-value">
              {profile.linkedin_url
                ? <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">{profile.linkedin_url}</a>
                : <span className="empty">Not added</span>}
            </span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">GitHub</span>
            <span className="cp-profile-value">
              {profile.github_url
                ? <a href={profile.github_url} target="_blank" rel="noopener noreferrer">{profile.github_url}</a>
                : <span className="empty">Not added</span>}
            </span>
          </div>
          <div className="cp-profile-field">
            <span className="cp-profile-label">Portfolio</span>
            <span className="cp-profile-value">
              {profile.portfolio_url
                ? <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">{profile.portfolio_url}</a>
                : <span className="empty">Not added</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {profile.profile_summary && (
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">{Icons.fileText} Profile Summary</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--cp-text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
            {profile.profile_summary}
          </p>
        </div>
      )}
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
     RENDER — RESUMES SECTION
     ================================================================ */
  const renderResumes = () => (
    <div className="cp-form-container" style={{ marginTop: 20 }}>
      <div className="cp-form-section">
        <h3 className="cp-form-section-title" style={{ marginBottom: 16 }}>
          {Icons.fileText} Resumes <span className="cp-count-badge">{resumes.length}</span>
        </h3>

        {/* Upload */}
        <div className="cp-file-upload" style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeUpload}
            id="resume-upload"
            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
          {Icons.upload}
          <span>Upload Resume (PDF, DOC, DOCX)</span>
        </div>

        {/* List */}
        {resumes.length > 0 ? (
          <div className="cp-doc-list">
            {resumes.map(r => (
              <div key={r.id} className="cp-doc-item">
                <div className="cp-doc-icon resume">{Icons.fileText}</div>
                <div className="cp-doc-info">
                  <div className="cp-doc-name">{r.filename}</div>
                  <div className="cp-doc-date">
                    Uploaded {new Date(r.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="cp-doc-actions">
                  <button className="cp-btn cp-btn-danger-outline cp-btn-sm"
                    onClick={() => setDeleteTarget({ type: 'resume', id: r.id, name: r.filename })}>
                    {Icons.trash}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--cp-text-tertiary)', fontSize: 14 }}>
            No resumes uploaded yet. Upload your first resume above.
          </div>
        )}
      </div>
    </div>
  );

  /* ================================================================
     RENDER — CERTIFICATIONS SECTION
     ================================================================ */
  const renderCertifications = () => (
    <div className="cp-form-container" style={{ marginTop: 20 }}>
      <div className="cp-form-section">
        <h3 className="cp-form-section-title" style={{ marginBottom: 16 }}>
          {Icons.award} Certifications <span className="cp-count-badge">{certifications.length}</span>
        </h3>

        {/* Upload with mini-form */}
        {!showCertForm ? (
          <button className="cp-btn cp-btn-outline cp-btn-sm" style={{ marginBottom: 16 }}
            onClick={() => setShowCertForm(true)}>
            {Icons.upload} Upload Certification
          </button>
        ) : (
          <div style={{ background: 'var(--cp-bg)', borderRadius: 'var(--cp-radius-md)', padding: 20, marginBottom: 16, border: '1px solid var(--cp-border)' }}>
            <div className="cp-form-grid-2">
              <div className="cp-form-group">
                <label className="required">Certification Name</label>
                <input type="text" value={certName} onChange={(e) => setCertName(e.target.value)}
                  placeholder="e.g., Oracle Cloud Infrastructure 2024" />
              </div>
              <div className="cp-form-group">
                <label>Issuer (optional)</label>
                <input type="text" value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)}
                  placeholder="e.g., Oracle, AWS, Microsoft" />
              </div>
            </div>

            <div className="cp-file-upload" style={{ position: 'relative', marginBottom: 14 }}>
              <input
                type="file"
                ref={certFileRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
              {Icons.upload}
              <span>{certFile ? certFile.name : 'Select certification file (PDF, JPG, PNG)'}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="cp-btn cp-btn-outline cp-btn-sm" type="button"
                onClick={() => { setShowCertForm(false); setCertName(''); setCertIssuer(''); setCertFile(null); }}>
                Cancel
              </button>
              <button className="cp-btn cp-btn-primary cp-btn-sm" type="button"
                onClick={handleCertSubmit} disabled={!certFile || !certName.trim()}>
                Upload
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {certifications.length > 0 ? (
          <div className="cp-doc-list">
            {certifications.map(c => (
              <div key={c.id} className="cp-doc-item">
                <div className="cp-doc-icon cert">{Icons.award}</div>
                <div className="cp-doc-info">
                  <div className="cp-doc-name">{c.name}</div>
                  <div className="cp-doc-date">
                    {c.issuer && <span>{c.issuer}</span>}
                    {c.issued_date && <span> · Issued {new Date(c.issued_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                    {c.expiry_date && <span> · Expires {new Date(c.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                  </div>
                </div>
                <div className="cp-doc-actions">
                  <button className="cp-btn cp-btn-danger-outline cp-btn-sm"
                    onClick={() => setDeleteTarget({ type: 'cert', id: c.id, name: c.name })}>
                    {Icons.trash}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--cp-text-tertiary)', fontSize: 14 }}>
            No certifications added yet. Upload your certifications to stand out.
          </div>
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
      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-header-left">
            <h1 className="cp-header-title">My Profile</h1>
            <p className="cp-header-subtitle">
              {isEditing
                ? (hasProfile ? 'Update your personal information' : 'Set up your candidate profile to get started')
                : 'Your personal information and documents'}
            </p>
          </div>
          <div className="cp-header-actions">
            {hasProfile && !isEditing && (
              <button className="cp-btn cp-btn-primary" onClick={() => setIsEditing(true)}>
                {Icons.edit} Edit Profile
              </button>
            )}
            <button className="cp-btn cp-btn-outline" onClick={() => navigate('/candidate/job-preferences')}>
              {Icons.briefcase} Job Preferences
            </button>
            <button className="cp-btn cp-btn-outline" onClick={() => navigate('/candidate-dashboard')}>
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

          {/* Documents — only after profile created */}
          {hasProfile && (
            <>
              {renderResumes()}
              {renderCertifications()}
            </>
          )}
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
