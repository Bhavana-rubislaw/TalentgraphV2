import React from 'react';

interface HRApplicationsTabProps {
  appNotes: Record<number, string>;
  setAppNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  appSearch: string;
  setAppSearch: (value: string) => void;
  appSortOrder: 'newest' | 'oldest';
  setAppSortOrder: (value: 'newest' | 'oldest') => void;
  appStatusFilter: string;
  setAppStatusFilter: (value: string) => void;
  applications: any[];
  appsLoading: boolean;
  copyToClipboard: (text: string) => void;
  filteredApplications: any[];
  handleDownloadCertification: (applicationId: number, certificationId: number, filename: string) => Promise<void>;
  handleDownloadResume: (applicationId: number, resumeId: number, filename: string) => Promise<void>;
  handleSaveApplicationNotes: (applicationId: number) => Promise<void>;
  handleStartDirectMessage: (candidateUserId: number) => Promise<void>;
  handleUpdateApplicationStatus: (applicationId: number, status: string) => Promise<void>;
  hrToast: string | null;
  selectedApp: any;
  selectedAppId: number | null;
  setSelectedAppId: (id: number | null) => void;
  setIsScheduleInterviewModalOpen: (open: boolean) => void;
  setSelectedAppForSchedule: (app: any) => void;
  showHrToast: (msg: string) => void;
}

const HRApplicationsTab: React.FC<HRApplicationsTabProps> = ({
  appNotes, setAppNotes, appSearch, setAppSearch, appSortOrder, setAppSortOrder,
  appStatusFilter, setAppStatusFilter, applications, appsLoading, copyToClipboard,
  filteredApplications, handleDownloadCertification, handleDownloadResume,
  handleSaveApplicationNotes, handleStartDirectMessage, handleUpdateApplicationStatus,
  hrToast, selectedApp, selectedAppId, setSelectedAppId, setIsScheduleInterviewModalOpen,
  setSelectedAppForSchedule, showHrToast,
}) => {
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeAgo = (iso: string) => {
      const diff = Date.now() - new Date(iso).getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      if (days < 30) return `${Math.floor(days / 7)}w ago`;
      return `${Math.floor(days / 30)}mo ago`;
    };

    if (appsLoading) {
      return (
        <div className="ra-empty">
          <div className="ra-empty-icon" style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
          <h3 style={{ color: '#9ca3af' }}>Loading applications…</h3>
        </div>
      );
    }

    if (applications.length === 0) {
      return (
        <div className="ra-empty">
          <div className="ra-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h3>No Applications Yet</h3>
          <p>Applications from candidates will appear here.</p>
        </div>
      );
    }

    return (
      <div className="ra-wrapper" style={{ background: 'transparent', padding: '0', gap: '16px' }}>
        {/* Toast notification */}
        {hrToast && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: '#1e293b', color: 'white', padding: '10px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
          }}>
            {hrToast}
          </div>
        )}

        {/* HR Applications Responsibilities Banner */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderLeft: '4px solid #3b82f6',
          borderRadius: 10,
          padding: '16px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px' }}>Applications — HR Permissions</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>HR MANAGER</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Your scope within the hiring pipeline</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allowed</span>
              </div>
              {['View all applications', 'Schedule interviews', 'Download resumes & certifications', 'Add HR notes', 'Message candidates', 'Set Selected / Rejected'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 12, color: '#166534' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ width: 10, height: 10 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Restricted</span>
              </div>
              {['Move through full pipeline stages', 'Shortlist candidates', 'Mark as Under Review'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <span style={{ fontSize: 12, color: '#991b1b' }}>{item}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #fecaca', paddingTop: 6 }}>Full pipeline management is handled by Recruiters.</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="ra-toolbar">
          <div className="ra-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="ra-search-input"
              placeholder="Search by name, email, role…"
              value={appSearch}
              onChange={e => setAppSearch(e.target.value)}
            />
          </div>

          <select
            className="ra-status-filter"
            value={appStatusFilter}
            onChange={e => setAppStatusFilter(e.target.value)}
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied</option>
            <option value="scheduled">Scheduled</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>

          <button className="ra-sort-btn" onClick={() => setAppSortOrder(appSortOrder === 'newest' ? 'oldest' : 'newest')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5h10M11 9h7M11 13h4"/><path d="M3 17l3 3 3-3"/><line x1="6" y1="18" x2="6" y2="7"/></svg>
            {appSortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {/* Two-Column Split */}
        <div className="ra-split">
          {/* LEFT: Application List */}
          <div className="ra-list-panel">
            <div className="ra-list-header">
              <span>Applications</span>
              <span className="ra-list-count">{filteredApplications.length} of {applications.length}</span>
            </div>
            <div className="ra-list-scroll">
              {filteredApplications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ra-text-3)', fontSize: 13 }}>
                  No applications match your filters.
                </div>
              ) : (
                filteredApplications.map((app: any) => (
                  <div
                    key={app.application_id}
                    className={`ra-card ${selectedAppId === app.application_id ? 'selected' : ''}`}
                    onClick={() => setSelectedAppId(app.application_id)}
                  >
                    <div className="ra-card-top">
                      <div className="ra-card-avatar">{app.candidate.name.charAt(0)}</div>
                      <div className="ra-card-info">
                        <div className="ra-card-name">{app.candidate.name}</div>
                        <div className="ra-card-role">Applied for {app.job_posting.title || app.job_posting.job_title}</div>
                      </div>
                    </div>
                    {(app.job_posting?.product_vendor || app.job_profile?.profile_name) && (
                      <div className="ra-card-vendor-row">
                        {[app.job_posting?.product_vendor, app.job_profile?.profile_name].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className="ra-card-meta">
                      <span className={`ra-status-chip ${app.status}`}>{app.status}</span>
                      <span className="ra-card-date">{timeAgo(app.applied_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Detail Panel */}
          <div className="ra-detail-panel">
            {!selectedApp ? (
              <div className="ra-detail-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
                </svg>
                <h3>Select an Application</h3>
                <p>Click on an application from the list to view detailed candidate information.</p>
              </div>
            ) : (
              <>
                {/* Detail Header */}
                <div className="ra-detail-header">
                  <div className="ra-detail-avatar">{selectedApp.candidate.name.charAt(0)}</div>
                  <div className="ra-detail-title">
                    <div className="ra-detail-name">{selectedApp.candidate.name}</div>
                    <div className="ra-detail-subtitle">
                      {selectedApp.job_profile.profile_name} · {selectedApp.job_profile.years_of_experience} yrs exp
                    </div>
                    <div className="ra-detail-tags">
                      <span className={`ra-status-chip ${selectedApp.status}`}>{selectedApp.status}</span>
                      {selectedApp.job_profile.worktype && (
                        <span className="ra-detail-tag">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          {selectedApp.job_profile.worktype}
                        </span>
                      )}
                      {selectedApp.job_profile.employment_type && (
                        <span className="ra-detail-tag">{selectedApp.job_profile.employment_type.toUpperCase()}</span>
                      )}
                      {selectedApp.candidate.location_state && (
                        <span className="ra-detail-tag">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {selectedApp.candidate.location_state}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="ra-detail-actions">
                  <button
                    className="ra-btn ra-btn-message"
                    onClick={() => {
                      if (selectedApp.candidate.user_id) {
                        handleStartDirectMessage(selectedApp.candidate.user_id);
                      } else {
                        alert(`Cannot message this candidate – user_id is missing.`);
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Message
                  </button>
                  <button
                    className="ra-btn ra-btn-primary"
                    onClick={() => {
                      setSelectedAppForSchedule({ ...selectedApp, id: selectedApp.application_id });
                      setIsScheduleInterviewModalOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Schedule Interview
                  </button>
                  <select
                    className="ra-detail-status-select"
                    value={['selected', 'rejected'].includes(selectedApp.status) ? selectedApp.status : ''}
                    onChange={e => {
                      if (!e.target.value) return;
                      handleUpdateApplicationStatus(selectedApp.application_id, e.target.value);
                      showHrToast(`Status updated to ${e.target.value}`);
                    }}
                    title="HR can set final decisions only"
                  >
                    <option value="" disabled>
                      {['selected', 'rejected'].includes(selectedApp.status)
                        ? '— Change decision —'
                        : `Current: ${selectedApp.status.replace(/_/g, ' ')}`}
                    </option>
                    <option value="selected">✓ Selected</option>
                    <option value="rejected">✗ Rejected</option>
                  </select>
                </div>

                {/* Detail Body */}
                <div className="ra-detail-body">
                  {/* Contact Information */}
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Contact Information
                    </div>
                    <div className="ra-contact-grid">
                      <div className="ra-contact-item" onClick={() => copyToClipboard(selectedApp.candidate.email)}>
                        <div className="ra-contact-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </div>
                        <div>
                          <div className="ra-contact-label">Email</div>
                          <div className="ra-contact-value">{selectedApp.candidate.email}</div>
                        </div>
                        <span className="ra-copy-badge">Copy</span>
                      </div>
                      <div className="ra-contact-item" onClick={() => copyToClipboard(selectedApp.candidate.phone)}>
                        <div className="ra-contact-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <div>
                          <div className="ra-contact-label">Phone</div>
                          <div className="ra-contact-value">{selectedApp.candidate.phone}</div>
                        </div>
                        <span className="ra-copy-badge">Copy</span>
                      </div>
                      {selectedApp.candidate.location_state && (
                        <div className="ra-contact-item">
                          <div className="ra-contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          </div>
                          <div>
                            <div className="ra-contact-label">Location</div>
                            <div className="ra-contact-value">
                              {selectedApp.candidate.location_county ? `${selectedApp.candidate.location_county}, ` : ''}{selectedApp.candidate.location_state}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                      Application Details
                    </div>
                    <div className="ra-info-grid">
                      <div className="ra-info-item">
                        <span className="ra-info-label">Position</span>
                        <span className="ra-info-value">{selectedApp.job_posting.job_title}</span>
                      </div>
                      <div className="ra-info-item">
                        <span className="ra-info-label">Applied</span>
                        <span className="ra-info-value">{formatDate(selectedApp.applied_at)}</span>
                      </div>
                      <div className="ra-info-item">
                        <span className="ra-info-label">Experience</span>
                        <span className="ra-info-value">{selectedApp.job_profile.years_of_experience} years</span>
                      </div>
                      {selectedApp.job_profile.seniority_level && (
                        <div className="ra-info-item">
                          <span className="ra-info-label">Seniority</span>
                          <span className="ra-info-value">{selectedApp.job_profile.seniority_level}</span>
                        </div>
                      )}
                      {selectedApp.job_profile.salary_min != null && (
                        <div className="ra-info-item">
                          <span className="ra-info-label">Salary Range</span>
                          <span className="ra-info-value">
                            {selectedApp.job_profile.salary_currency?.toUpperCase() || '$'}{' '}
                            {Number(selectedApp.job_profile.salary_min).toLocaleString()} – {Number(selectedApp.job_profile.salary_max).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedApp.job_profile.visa_status && (
                        <div className="ra-info-item">
                          <span className="ra-info-label">Visa Status</span>
                          <span className="ra-info-value">{selectedApp.job_profile.visa_status.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {selectedApp.job_profile.notice_period && (
                        <div className="ra-info-item">
                          <span className="ra-info-label">Notice Period</span>
                          <span className="ra-info-value">{selectedApp.job_profile.notice_period.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {selectedApp.job_profile.highest_education && (
                        <div className="ra-info-item">
                          <span className="ra-info-label">Education</span>
                          <span className="ra-info-value">{selectedApp.job_profile.highest_education.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Summary */}
                  {selectedApp.job_profile.profile_summary && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                        Profile Summary
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ra-text-2)', lineHeight: 1.6, margin: 0 }}>
                        {selectedApp.job_profile.profile_summary}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedApp.job_profile.skills && selectedApp.job_profile.skills.length > 0 && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Skills
                      </div>
                      <div className="ra-skills-list">
                        {selectedApp.job_profile.skills.map((s: any, i: number) => (
                          <span key={i} className={`ra-skill-tag ${s.skill_category === 'soft' ? 'soft' : ''}`}>
                            {s.skill_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social & Web Links */}
                  {(selectedApp.job_profile.linkedin_url || selectedApp.job_profile.github_url || selectedApp.job_profile.portfolio_url || selectedApp.job_profile.other_social_url) && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Social &amp; Web Links
                      </div>
                      <div className="ra-socials-row">
                        {selectedApp.job_profile.linkedin_url && (
                          <a href={selectedApp.job_profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            LinkedIn
                          </a>
                        )}
                        {selectedApp.job_profile.github_url && (
                          <a href={selectedApp.job_profile.github_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            GitHub
                          </a>
                        )}
                        {selectedApp.job_profile.portfolio_url && (
                          <a href={selectedApp.job_profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            Portfolio
                          </a>
                        )}
                        {selectedApp.job_profile.other_social_url && (
                          <a href={selectedApp.job_profile.other_social_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            Website / Social
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submitted Resumes */}
                  {selectedApp.job_profile.resumes && selectedApp.job_profile.resumes.length > 0 && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                        Submitted Resumes
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedApp.job_profile.resumes.map((resume: any) => (
                          <div key={resume.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 6
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                style={{ width: 18, height: 18, color: '#7c3aed', flexShrink: 0 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                              </svg>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {resume.filename}
                                </div>
                                {resume.uploaded_at && (
                                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                    Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              className="ra-btn ra-btn-success"
                              onClick={() => handleDownloadResume(selectedApp.application_id, resume.id, resume.filename)}
                              style={{ flexShrink: 0 }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submitted Certifications */}
                  {selectedApp.job_profile.certifications && selectedApp.job_profile.certifications.length > 0 && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                        Submitted Certifications
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedApp.job_profile.certifications.map((cert: any) => (
                          <div key={cert.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 6
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0 }}>
                                <circle cx="12" cy="8" r="7"/>
                                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                              </svg>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cert.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                  {cert.issuer && <span>{cert.issuer}</span>}
                                  {cert.issuer && cert.issued_date && <span> • </span>}
                                  {cert.issued_date && <span>Issued {new Date(cert.issued_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                                  {cert.expiry_date && <span> • Expires {new Date(cert.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                                </div>
                              </div>
                            </div>
                            {cert.filename && (
                              <button
                                onClick={() => handleDownloadCertification(selectedApp.application_id, cert.id, cert.filename)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '6px 12px', fontSize: 12, fontWeight: 500,
                                  color: '#10b981', backgroundColor: 'white', border: '1px solid #10b981',
                                  borderRadius: 5, cursor: 'pointer', flexShrink: 0
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Download
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HR Notes */}
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      HR Notes
                    </div>
                    {selectedApp.recruiter_notes && (
                      <div style={{
                        padding: 12, backgroundColor: '#f8fafc', borderRadius: 6,
                        marginBottom: 12, border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Saved Notes</span>
                          {selectedApp.notes_updated_at && (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              Last updated: {new Date(selectedApp.notes_updated_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: 'numeric', minute: '2-digit', hour12: true
                              })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {selectedApp.recruiter_notes}
                        </div>
                      </div>
                    )}
                    <textarea
                      className="ra-notes-textarea"
                      placeholder="Add interview feedback, evaluation notes, or next-step comments..."
                      value={appNotes[selectedApp.application_id] ?? selectedApp.recruiter_notes ?? ''}
                      onChange={e => setAppNotes(prev => ({ ...prev, [selectedApp.application_id]: e.target.value }))}
                    />
                    <div className="ra-notes-footer">
                      <button className="ra-btn ra-btn-success" onClick={() => handleSaveApplicationNotes(selectedApp.application_id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Save Notes
                      </button>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Activity Timeline
                    </div>
                    <div className="ra-timeline">
                      {(() => {
                        const statusOrder = ['applied', 'scheduled', 'under_review', 'shortlisted', 'selected'];
                        const currentIdx = statusOrder.indexOf(selectedApp.status);
                        const steps = [
                          { label: 'Applied', date: formatDate(selectedApp.applied_at) },
                          ...(currentIdx >= 1 ? [{ label: 'Scheduled', date: 'Interview scheduled' }] : []),
                          ...(currentIdx >= 2 ? [{ label: 'Under Review', date: 'Application reviewed' }] : []),
                          ...(currentIdx >= 3 ? [{ label: 'Shortlisted', date: 'Candidate shortlisted' }] : []),
                          ...(currentIdx >= 4 ? [{ label: 'Selected', date: 'Candidate selected' }] : []),
                          ...(selectedApp.status === 'rejected' ? [{ label: 'Rejected', date: 'Application closed' }] : [])
                        ];
                        return steps.map((step, i) => (
                          <div key={i} className="ra-timeline-item">
                            <div className={`ra-timeline-dot ${i === steps.length - 1 ? 'current' : ''}`} />
                            <div className="ra-timeline-content">
                              <div className="ra-timeline-label">{step.label}</div>
                              <div className="ra-timeline-date">{step.date}</div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

export default HRApplicationsTab;
