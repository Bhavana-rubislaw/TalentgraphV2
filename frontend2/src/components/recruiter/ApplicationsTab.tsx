import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import type { Application } from '../../types/application';
import type { JobPosting } from '../../types/jobPosting';

export interface ApplicationsTabProps {
  applications: Application[];
  applicationsLoading: boolean;
  jobPostings: JobPosting[];
  companyName: string | null;
  userName: string;
  getParam: (name: string, defaultValue?: string) => string;
  setParam: (name: string, value: string | null | undefined, options?: { replace?: boolean }) => void;
  updateApplicationStatus: (applicationId: number, status: string) => Promise<void>;
  saveApplicationNotes: (applicationId: number, notes: string) => Promise<void>;
  downloadResume: (applicationId: number, resumeId: number, filename: string) => void;
  downloadCertification: (applicationId: number, certificationId: number, filename: string) => void;
  handleStartDirectMessage: (candidateUserId: number) => void;
  setSelectedAppForSchedule: (app: any) => void;
  setIsScheduleInterviewModalOpen: (open: boolean) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  '': { subject: '', body: '' },
  interview: {
    subject: 'Interview Invitation — {{job_title}} at {{company}}',
    body: 'Hi {{name}},\n\nThank you for your interest in the {{job_title}} position. We were impressed by your background and would love to invite you for an interview.\n\nPlease let us know your availability for the coming week.\n\nBest regards,\n{{recruiter}}'
  },
  followup: {
    subject: 'Following Up — {{job_title}} Application',
    body: 'Hi {{name}},\n\nI wanted to follow up regarding your application for the {{job_title}} role. We are currently reviewing candidates and will have an update for you shortly.\n\nThank you for your patience.\n\nBest,\n{{recruiter}}'
  },
  rejection: {
    subject: 'Update on Your Application — {{job_title}}',
    body: 'Hi {{name}},\n\nThank you for taking the time to apply for the {{job_title}} position. After careful consideration, we have decided to move forward with other candidates at this time.\n\nWe truly appreciate your interest and encourage you to apply for future openings.\n\nWarm regards,\n{{recruiter}}'
  },
  offer: {
    subject: 'Congratulations! Offer for {{job_title}}',
    body: 'Hi {{name}},\n\nWe are delighted to extend an offer for the {{job_title}} position! We believe your skills and experience will be an excellent addition to our team.\n\nPlease find the offer details attached. Let us know if you have any questions.\n\nBest regards,\n{{recruiter}}'
  }
};

const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  applicationsLoading,
  jobPostings,
  companyName,
  userName,
  getParam,
  setParam,
  updateApplicationStatus,
  saveApplicationNotes,
  downloadResume,
  downloadCertification,
  handleStartDirectMessage,
  setSelectedAppForSchedule,
  setIsScheduleInterviewModalOpen,
  toast,
  showToast,
}) => {
  // ── Applications filters: driven from URL params ───────────────
  // ?search=  ?job=all|<jobId>  ?appStatus=all|applied|scheduled|...  ?sort=newest|oldest
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const appSearch   = getParam('search');
  const appJobFilter = getParam('job', 'all');
  const appStatusFilter = getParam('appStatus', 'all');
  const appSortOrder: 'newest' | 'oldest' =
    getParam('sort') === 'oldest' ? 'oldest' : 'newest';

  const setAppSearch = useCallback(
    (value: string) => setParam('search', value, { replace: true }),
    [setParam]
  );
  const setAppJobFilter = useCallback(
    (value: string) => setParam('job', value === 'all' ? null : value, { replace: true }),
    [setParam]
  );

  const setAppStatusFilter = useCallback(
    (value: string) => setParam('appStatus', value === 'all' ? null : value, { replace: true }),
    [setParam]
  );

  const setAppSortOrder = useCallback(
    (value: 'newest' | 'oldest') => setParam('sort', value === 'oldest' ? 'oldest' : null, { replace: true }),
    [setParam]
  );
  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState('');
  const [comboFocusIdx, setComboFocusIdx] = useState(-1);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboSearchRef = useRef<HTMLInputElement>(null);
  const [appNotes, setAppNotes] = useState<Record<number, string>>({});
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');

  const fillTemplate = (text: string, app: any) => {
    return text
      .replace(/\{\{name\}\}/g, app.candidate?.name || '')
      .replace(/\{\{job_title\}\}/g, app.job_posting?.title || '')
      .replace(/\{\{company\}\}/g, companyName || 'Our Company')
      .replace(/\{\{recruiter\}\}/g, userName || '');
  };

  const applyEmailTemplate = (key: string, app: any) => {
    setEmailTemplate(key);
    const tpl = EMAIL_TEMPLATES[key];
    if (tpl) {
      setEmailSubject(fillTemplate(tpl.subject, app));
      setEmailBody(fillTemplate(tpl.body, app));
    }
  };

  const sendEmail = () => {
    if (!selectedApp?.candidate.email || !emailSubject) return;
    const mailto = `mailto:${selectedApp.candidate.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    setShowEmailComposer(false);
    showToast('Email draft opened in your mail client');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  const filteredApplications = useMemo(() => {
    let result = [...applications];
    // Job posting filter
    if (appJobFilter !== 'all') {
      result = result.filter((a: any) => String(a.job_posting.id) === appJobFilter);
    }
    // Status filter
    if (appStatusFilter !== 'all') {
      result = result.filter((a: any) => a.status === appStatusFilter);
    }
    // Search
    if (appSearch.trim()) {
      const q = appSearch.toLowerCase();
      result = result.filter((a: any) =>
        a.candidate.name.toLowerCase().includes(q) ||
        a.candidate.email.toLowerCase().includes(q) ||
        a.job_posting.title.toLowerCase().includes(q) ||
        (a.job_profile.profile_name || '').toLowerCase().includes(q)
      );
    }
    // Sort
    result.sort((a: any, b: any) => {
      const da = new Date(a.applied_at).getTime();
      const db = new Date(b.applied_at).getTime();
      return appSortOrder === 'newest' ? db - da : da - db;
    });
    return result;
  }, [applications, appJobFilter, appStatusFilter, appSearch, appSortOrder]);

  const selectedApp = useMemo(() => {
    return applications.find((a: any) => a.application_id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // All company job postings for the role dropdown
  const appJobOptions = useMemo(() => {
    return jobPostings.map((jp: any) => ({ id: String(jp.id), title: jp.job_title }));
  }, [jobPostings]);

  // Per-posting application counts
  const appCountByJob = useMemo(() => {
    const m: Record<string, number> = {};
    applications.forEach((a: any) => {
      const k = String(a.job_posting.id);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [applications]);

  // Filtered combo options by search
  const comboFiltered = useMemo(() => {
    if (!comboSearch.trim()) return appJobOptions;
    const q = comboSearch.toLowerCase();
    return appJobOptions.filter(o => o.title.toLowerCase().includes(q));
  }, [appJobOptions, comboSearch]);

  // Close combo on outside click
  useOutsideClick(comboOpen, () => {
    setComboOpen(false);
    setComboSearch('');
    setComboFocusIdx(-1);
  }, [comboRef]);

  // Focus search input when combo opens
  useEffect(() => {
    if (comboOpen && comboSearchRef.current) {
      comboSearchRef.current.focus();
    }
  }, [comboOpen]);

  const handleComboSelect = (value: string) => {
    setAppJobFilter(value);
    setSelectedAppId(null);
    setComboOpen(false);
    setComboSearch('');
    setComboFocusIdx(-1);
  };

  const handleComboKeyDown = (e: React.KeyboardEvent) => {
    const items = [{ id: 'all', title: 'All Roles' }, ...comboFiltered];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setComboFocusIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setComboFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && comboFocusIdx >= 0 && comboFocusIdx < items.length) {
      e.preventDefault();
      handleComboSelect(items[comboFocusIdx].id);
    } else if (e.key === 'Escape') {
      setComboOpen(false);
      setComboSearch('');
      setComboFocusIdx(-1);
    }
  };

  // Auto-select the first application when data finishes loading and nothing is selected yet
  useEffect(() => {
    if (!applicationsLoading && filteredApplications.length > 0 && selectedAppId === null) {
      setSelectedAppId(filteredApplications[0].application_id);
    }
  }, [applicationsLoading, filteredApplications, selectedAppId]);

  if (applicationsLoading) {
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
        <p>Applications from candidates will appear here. Review and manage their progress through your pipeline.</p>
      </div>
    );
  }

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

  return (
    <div className="ra-wrapper" style={{ background: 'transparent', padding: '0', gap: '16px' }}>
      {/* ─── Recruiter Applications Responsibilities Banner ─── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #10b981',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px' }}>Applications — Recruiter Permissions</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>RECRUITER</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Full ownership of the hiring pipeline</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Pipeline Access</span>
            </div>
            {['Review & move all application stages', 'Applied → Scheduled → Under Review', 'Shortlisted → Selected / Rejected', 'Schedule interviews', 'Message candidates', 'Add recruiter notes'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: 12, color: '#166534' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HR Can Also</span>
            </div>
            {['View all applications', 'Schedule interviews', 'Download resumes & certifications', 'Message candidates', 'Add HR notes', 'Set Selected / Rejected'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 12, color: '#475569' }}>{item}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>HR cannot move applications through all pipeline stages.</div>
          </div>
        </div>
      </div>

      {/* ─── Toolbar: Search + Filters + Sort ─── */}
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

        {/* Role Combobox */}
        <div className="ra-combo" ref={comboRef} onKeyDown={handleComboKeyDown}>
          <button
            className={`ra-combo-trigger ${comboOpen ? 'open' : ''}`}
            onClick={() => { setComboOpen(o => !o); setComboFocusIdx(-1); setComboSearch(''); }}
            type="button"
          >
            <svg className="ra-combo-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            <span className="ra-combo-trigger-text">
              {appJobFilter === 'all' ? 'All Roles' : (appJobOptions.find(o => o.id === appJobFilter)?.title || 'All Roles')}
            </span>
            <span className="ra-combo-trigger-count">
              {appJobFilter === 'all' ? applications.length : (appCountByJob[appJobFilter] || 0)}
            </span>
            {appJobFilter !== 'all' && (
              <button
                className="ra-combo-trigger-clear"
                onClick={(e) => { e.stopPropagation(); handleComboSelect('all'); }}
                title="Clear filter"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </button>

          {comboOpen && (
            <div className="ra-combo-panel">
              <div className="ra-combo-header">
                <div className="ra-combo-header-row">
                  <span className="ra-combo-header-title">Filter by Role</span>
                  {appJobFilter !== 'all' && (
                    <button className="ra-combo-clear-btn" onClick={() => handleComboSelect('all')} type="button">Clear filter</button>
                  )}
                </div>
                <div className="ra-combo-search-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    ref={comboSearchRef}
                    className="ra-combo-search"
                    placeholder="Search roles…"
                    value={comboSearch}
                    onChange={e => { setComboSearch(e.target.value); setComboFocusIdx(-1); }}
                  />
                </div>
              </div>

              <div className="ra-combo-list">
                {/* All Roles option */}
                {!comboSearch.trim() && (
                  <>
                    <div
                      className={`ra-combo-option ${appJobFilter === 'all' ? 'selected' : ''} ${comboFocusIdx === 0 ? 'focused' : ''}`}
                      onClick={() => handleComboSelect('all')}
                    >
                      <div className="ra-combo-option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div className="ra-combo-option-text">
                        <span className="ra-combo-option-name">All Roles</span>
                        <span className="ra-combo-option-sub">{jobPostings.length} job postings</span>
                      </div>
                      <span className={`ra-combo-option-badge ${applications.length > 0 ? 'has-apps' : 'no-apps'}`}>{applications.length}</span>
                      {appJobFilter === 'all' && (
                        <span className="ra-combo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                      )}
                    </div>
                    <div className="ra-combo-divider" />
                  </>
                )}

                {/* Filtered role options */}
                {comboFiltered.length === 0 ? (
                  <div className="ra-combo-empty">No roles match "{comboSearch}"</div>
                ) : (
                  comboFiltered.map((jp, idx) => {
                    const count = appCountByJob[jp.id] || 0;
                    const isSelected = appJobFilter === jp.id;
                    const focusOffset = comboSearch.trim() ? idx : idx + 1;
                    return (
                      <div
                        key={jp.id}
                        className={`ra-combo-option ${isSelected ? 'selected' : ''} ${count === 0 ? 'muted' : ''} ${comboFocusIdx === focusOffset ? 'focused' : ''}`}
                        onClick={() => handleComboSelect(jp.id)}
                      >
                        <div className="ra-combo-option-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </div>
                        <div className="ra-combo-option-text">
                          <span className="ra-combo-option-name">{jp.title}</span>
                        </div>
                        <span className={`ra-combo-option-badge ${count > 0 ? 'has-apps' : 'no-apps'}`}>{count}</span>
                        {isSelected && (
                          <span className="ra-combo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Filter */}
        <select
          className="ra-status-filter"
          value={appStatusFilter}
          onChange={(e) => setAppStatusFilter(e.target.value)}
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            transition: 'all 0.2s ease'
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

      {/* ─── Two-Column Split ─── */}
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
                {appJobFilter !== 'all'
                  ? `No applications yet for this role.`
                  : 'No applications match your filters.'}
              </div>
            ) : (
              filteredApplications.map((app: any) => {
                const skills = app.job_profile?.skills || [];
                const firstResume = app.job_profile?.resumes?.[0];
                const salaryText = app.job_profile?.salary_min && app.job_profile?.salary_max
                  ? `${(app.job_profile.salary_currency || 'USD').toUpperCase()} ${Math.round(app.job_profile.salary_min / 1000)}k–${Math.round(app.job_profile.salary_max / 1000)}k`
                  : null;
                return (
                <div
                  key={app.application_id}
                  className={`ra-card ${selectedAppId === app.application_id ? 'selected' : ''}`}
                  onClick={() => setSelectedAppId(app.application_id)}
                >
                  <div className="ra-card-top">
                    <div className="ra-card-avatar">{app.candidate.name.charAt(0)}</div>
                    <div className="ra-card-info">
                      <div className="ra-card-name">{app.candidate.name}</div>
                      <div className="ra-card-role">Applied for {app.job_posting.title}</div>
                    </div>
                    <span className={`ra-status-chip ${app.status}`}>{app.status}</span>
                  </div>
                  {(app.job_posting?.product_vendor || app.job_profile?.profile_name) && (
                    <div className="ra-card-vendor-row">
                      {[app.job_posting?.product_vendor, app.job_profile?.profile_name].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className="cgc-skills" style={{ marginBottom: 0 }}>
                      {skills.slice(0, 4).map((sk: any, idx: number) => (
                        <span key={idx} className="cgc-skill-tag">{sk.skill_name}</span>
                      ))}
                      {skills.length > 4 && <span className="cgc-skill-tag">+{skills.length - 4} more</span>}
                    </div>
                  )}
                  <div className="ra-card-meta">
                    {salaryText && <span className="ra-card-date">{salaryText}</span>}
                    <span className="ra-card-date">{timeAgo(app.applied_at)}</span>
                  </div>
                  <div className="ra-card-footer" onClick={(e) => e.stopPropagation()}>
                    {firstResume && (
                      <button
                        className="cgc-icon-btn"
                        onClick={() => downloadResume(app.application_id, firstResume.id, firstResume.filename)}
                        title="Download resume"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    )}
                    <button
                      className="cgc-icon-btn"
                      onClick={() => {
                        if (app.candidate.user_id) {
                          handleStartDirectMessage(app.candidate.user_id);
                        } else {
                          alert(`Cannot message this candidate - user_id is missing. Candidate ID: ${app.candidate.id}`);
                        }
                      }}
                      title="Send a message to this candidate"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                    <button
                      className="cgc-icon-btn"
                      onClick={() => {
                        setSelectedAppForSchedule({ ...app, id: app.application_id });
                        setIsScheduleInterviewModalOpen(true);
                      }}
                      title="Schedule an interview with this candidate"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </button>
                    <button
                      className="cgc-apply-btn"
                      onClick={() => setSelectedAppId(app.application_id)}
                    >
                      Details →
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Pipeline overview / This week / Recruiter tip — replaces the old
            always-visible detail column. Clicking a card now opens the full detail
            content (unchanged below) in an overlay drawer instead. */}
        <div className="ra-app-sidebar">
          {(() => {
            const stageOf = (status: string) => {
              if (status === 'applied') return 'applied';
              if (['scheduled', 'under_review'].includes(status)) return 'reviewing';
              if (status === 'shortlisted') return 'interview';
              if (status === 'selected') return 'offer';
              return null; // rejected/withdrawn don't count toward the funnel
            };
            const counts = { applied: 0, reviewing: 0, interview: 0, offer: 0 };
            applications.forEach((a: any) => {
              const s = stageOf(a.status);
              if (s) counts[s as keyof typeof counts] += (s === 'applied' ? 1 : 0) || 1;
            });
            // "Applied" is the total pipeline size (every application starts here);
            // the others are mutually-exclusive current stages.
            const totalApplied = applications.length;
            const maxCount = Math.max(totalApplied, 1);
            const stages = [
              { label: 'Applied', count: totalApplied, color: '#2563eb' },
              { label: 'Reviewing', count: counts.reviewing, color: '#f59e0b' },
              { label: 'Interview', count: counts.interview, color: '#8b5cf6' },
              { label: 'Offer', count: counts.offer, color: '#10b981' },
            ];
            const now = Date.now();
            const withinDays = (iso: string, days: number) => (now - new Date(iso).getTime()) < days * 24 * 60 * 60 * 1000;
            const newThisWeek = applications.filter((a: any) => withinDays(a.applied_at, 7)).length;
            const interviewsThisWeek = applications.filter((a: any) => a.status === 'shortlisted' && withinDays(a.applied_at, 7)).length;
            const offersThisWeek = applications.filter((a: any) => a.status === 'selected' && withinDays(a.applied_at, 7)).length;
            return (
              <>
                <div className="ra-sidebar-card">
                  <h3 className="ra-sidebar-title">Pipeline overview</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stages.map(s => (
                      <div key={s.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                          <span>{s.label}</span>
                          <span style={{ fontWeight: 700 }}>{s.count}</span>
                        </div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((s.count / maxCount) * 100, 100)}%`, height: '100%', background: s.color, borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ra-sidebar-card">
                  <h3 className="ra-sidebar-title">This week</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                      <span>New applications</span><span style={{ fontWeight: 700 }}>{newThisWeek}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                      <span>Interviews scheduled</span><span style={{ fontWeight: 700 }}>{interviewsThisWeek}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                      <span>Offers extended</span><span style={{ fontWeight: 700 }}>{offersThisWeek}</span>
                    </div>
                  </div>
                </div>

                <div className="ra-sidebar-tip">
                  <strong>Recruiter tip</strong>
                  <p style={{ margin: '6px 0 0' }}>Candidates in the Interview stage respond 3× faster when messaged within 24 hours.</p>
                </div>
              </>
            );
          })()}
        </div>

        {selectedApp && (
          <DetailDrawer
            onClose={() => setSelectedAppId(null)}
            overlayClassName="ra-detail-overlay"
            modalClassName="ra-detail-panel"
          >
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
                      <span className="ra-detail-tag">
                        {selectedApp.job_profile.employment_type.toUpperCase()}
                      </span>
                    )}
                    {selectedApp.candidate.location && (
                      <span className="ra-detail-tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {selectedApp.candidate.location}
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
                      alert(`Cannot message this candidate - user_id is missing. Candidate ID: ${selectedApp.candidate.id}`);
                    }
                  }}
                  title="Send a direct message to this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
                <button
                  className="ra-btn ra-btn-primary"
                  onClick={() => {
                    // Map application_id to id for the modal
                    setSelectedAppForSchedule({
                      ...selectedApp,
                      id: selectedApp.application_id
                    });
                    setIsScheduleInterviewModalOpen(true);
                  }}
                  title="Schedule an interview with this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Schedule Interview
                </button>
                <select
                  className="ra-detail-status-select"
                  value={selectedApp.status}
                  onChange={(e) => {
                    updateApplicationStatus(selectedApp.application_id, e.target.value);
                    showToast(`Status updated to ${e.target.value}`);
                  }}
                >
                  <option value="applied">Applied</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="under_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
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
                    <div className="ra-contact-item" onClick={() => copyToClipboard(selectedApp.candidate.phone || '')}>
                      <div className="ra-contact-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <div>
                        <div className="ra-contact-label">Phone</div>
                        <div className="ra-contact-value">{selectedApp.candidate.phone}</div>
                      </div>
                      <span className="ra-copy-badge">Copy</span>
                    </div>
                    {selectedApp.candidate.location && (
                      <div className="ra-contact-item">
                        <div className="ra-contact-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div>
                          <div className="ra-contact-label">Location</div>
                          <div className="ra-contact-value">{selectedApp.candidate.location}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Info */}
                <div className="ra-detail-section">
                  <div className="ra-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    Application Details
                  </div>
                  <div className="ra-info-grid">
                    <div className="ra-info-item">
                      <span className="ra-info-label">Position</span>
                      <span className="ra-info-value">{selectedApp.job_posting.title}</span>
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

                {/* Social Links */}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedApp.job_profile.resumes.map((resume: any) => (
                        <div
                          key={resume.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ width: '18px', height: '18px', color: '#2563eb', flexShrink: 0 }}
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14,2 14,8 20,8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#334155',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {resume.filename}
                              </div>
                              {resume.uploaded_at && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            className="ra-btn ra-btn-success"
                            onClick={() => downloadResume(selectedApp.application_id, resume.id, resume.filename)}
                            title="Download resume file"
                            style={{ flexShrink: 0 }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      {selectedApp.job_profile.resumes.length === 1 ? '1 resume' : `${selectedApp.job_profile.resumes.length} resumes`} submitted for this application
                    </div>
                  </div>
                )}

                {/* Submitted Certifications */}
                {selectedApp.job_profile.certifications && selectedApp.job_profile.certifications.length > 0 && (
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      Submitted Certifications
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedApp.job_profile.certifications.map((cert: any) => (
                        <div
                          key={cert.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }}
                            >
                              <circle cx="12" cy="8" r="7"/>
                              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                            </svg>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#334155',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {cert.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                {cert.issuer && <span>{cert.issuer}</span>}
                                {cert.issuer && cert.issued_date && <span> • </span>}
                                {cert.issued_date && (
                                  <span>Issued {new Date(cert.issued_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric'
                                  })}</span>
                                )}
                                {cert.expiry_date && (
                                  <span> • Expires {new Date(cert.expiry_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric'
                                  })}</span>
                                )}
                              </div>
                              {cert.filename && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#64748b',
                                  marginTop: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ width: '12px', height: '12px' }}
                                  >
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                    <polyline points="13 2 13 9 20 9"/>
                                  </svg>
                                  <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{cert.filename}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {cert.filename && (
                            <button
                              onClick={() => downloadCertification(selectedApp.application_id, cert.id, cert.filename)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#10b981',
                                backgroundColor: 'white',
                                border: '1px solid #10b981',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = '#10b981';
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ width: '14px', height: '14px' }}
                              >
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
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      {selectedApp.job_profile.certifications.length === 1
                        ? '1 certification'
                        : `${selectedApp.job_profile.certifications.length} certifications`} submitted for this application
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="ra-detail-section">
                  <div className="ra-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Recruiter Notes
                  </div>

                  {/* Display saved notes if they exist */}
                  {selectedApp.recruiter_notes && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                          Saved Notes
                        </span>
                        {selectedApp.notes_updated_at && (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Last updated: {new Date(selectedApp.notes_updated_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#334155',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {selectedApp.recruiter_notes}
                      </div>
                    </div>
                  )}

                  <textarea
                    className="ra-notes-textarea"
                    placeholder="Add interview feedback, evaluation notes, or next-step comments..."
                    value={appNotes[selectedApp.application_id] ?? selectedApp.recruiter_notes ?? ''}
                    onChange={(e) => setAppNotes(prev => ({ ...prev, [selectedApp.application_id]: e.target.value }))}
                  />
                  <div className="ra-notes-footer">
                    <button
                      className="ra-btn ra-btn-success"
                      onClick={async () => {
                        const applicationId = selectedApp.application_id;
                        try {
                          await saveApplicationNotes(applicationId, appNotes[applicationId] || '');
                          setAppNotes(prev => {
                            const next = { ...prev };
                            delete next[applicationId];
                            return next;
                          });
                        } catch {
                          // error already alerted inside saveApplicationNotes
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save Notes
                    </button>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                      Notes are private and only visible to recruiters
                    </span>
                  </div>
                </div>

                {/* Timeline */}
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
          </DetailDrawer>
        )}
      </div>

      {/* ─── Email Composer Modal ─── */}
      {/* NOTE: no button in this UI currently calls setShowEmailComposer(true) (pre-existing —
          not introduced by this extraction), so this modal is presently unreachable. */}
      {showEmailComposer && selectedApp && (
        <DetailDrawer onClose={() => setShowEmailComposer(false)} overlayClassName="ra-modal-overlay" modalClassName="ra-modal">
            <div className="ra-modal-header">
              <div className="ra-modal-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Compose Email
              </div>
              <button className="ra-modal-close" onClick={() => setShowEmailComposer(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="ra-modal-body">
              <div className="ra-field">
                <div className="ra-field-row">
                  <span className="ra-field-label">To</span>
                  <input className="ra-field-input" value={selectedApp?.candidate.email || ''} readOnly />
                </div>
              </div>
              <div className="ra-field">
                <div className="ra-field-row">
                  <span className="ra-field-label">Template</span>
                  <select
                    className="ra-template-select"
                    value={emailTemplate}
                    onChange={e => applyEmailTemplate(e.target.value, selectedApp)}
                    style={{ flex: 1 }}
                  >
                    <option value="">— Custom —</option>
                    <option value="interview">Interview Invitation</option>
                    <option value="followup">Follow-Up</option>
                    <option value="rejection">Rejection</option>
                    <option value="offer">Offer Letter</option>
                  </select>
                </div>
              </div>
              <div className="ra-field">
                <div className="ra-field-row">
                  <span className="ra-field-label">Subject</span>
                  <input
                    className="ra-field-input"
                    placeholder="Email subject…"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                  />
                </div>
              </div>
              <div className="ra-field">
                <textarea
                  className="ra-email-body"
                  placeholder="Write your message…"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />
              </div>
            </div>
            <div className="ra-modal-footer">
              <button className="ra-btn ra-btn-outline" onClick={() => setShowEmailComposer(false)}>Cancel</button>
              <button className="ra-btn ra-btn-primary ra-btn-lg" onClick={sendEmail}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send Email
              </button>
            </div>
        </DetailDrawer>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div className="ra-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
};

export default ApplicationsTab;
