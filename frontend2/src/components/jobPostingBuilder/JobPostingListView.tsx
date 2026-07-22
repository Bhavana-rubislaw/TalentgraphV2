import React from 'react';
import type { JobPosting } from '../../types/jobPostingBuilderTypes';

interface JobPostingListViewProps {
  toast: { message: string; type: 'success' | 'error' } | null;
  listSearch: string;
  setListSearch: (value: string) => void;
  statusFilter: 'all' | 'active' | 'frozen' | 'cancelled';
  setStatusFilter: (value: 'all' | 'active' | 'frozen' | 'cancelled') => void;
  selectedPostingId: number | null;
  setSelectedPostingId: (id: number | null) => void;
  showCancelModal: number | null;
  setShowCancelModal: (id: number | null) => void;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  customReason: string;
  setCustomReason: (value: string) => void;
  currentPostPage: number;
  setCurrentPostPage: React.Dispatch<React.SetStateAction<number>>;
  cardMenuOpenId: number | null;
  setCardMenuOpenId: (id: number | null) => void;
  navigate: (path: string) => void;
  PAGE_SIZE_POSTINGS: number;
  loadPosting: (posting: JobPosting) => void;
  handleDuplicatePosting: (posting: JobPosting) => void;
  handleNewPosting: () => void;
  handleJobLifecycleAction: (jobId: number, action: 'freeze' | 'reactivate', e: React.MouseEvent) => void;
  handleCancelJob: () => void;
  filteredPostings: JobPosting[];
  totalPostPages: number;
  paginatedPostings: JobPosting[];
  getPostPageNumbers: () => (number | string)[];
  setShowForm: (value: boolean) => void;
  jobStats: Record<number, { applicants: number; aiMatches: number; matchRate: number; avgMatchScore: number }>;
  summaryStats: { activeJobs: number; totalApplicants: number; totalAiMatches: number };
}

const JobPostingListView: React.FC<JobPostingListViewProps> = ({
  toast, listSearch, setListSearch, statusFilter, setStatusFilter,
  selectedPostingId, setSelectedPostingId, showCancelModal, setShowCancelModal,
  cancelReason, setCancelReason, customReason, setCustomReason,
  currentPostPage, setCurrentPostPage, cardMenuOpenId, setCardMenuOpenId,
  navigate, PAGE_SIZE_POSTINGS, loadPosting, handleDuplicatePosting, handleNewPosting,
  handleJobLifecycleAction, handleCancelJob, filteredPostings, totalPostPages,
  paginatedPostings, getPostPageNumbers, setShowForm, jobStats, summaryStats,
}) => {
    const worktypeLabel = (wt: string) => ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[wt] || wt);
    const fmtSalary = (min: number, max: number, cur: string) => {
      const fmt = (v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
      return `${(cur||'USD').toUpperCase()} ${fmt(min)} – ${fmt(max)}`;
    };
    const fmtDate = (iso?: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
      <div className="cp-page jpb-list-page">
        {/* Toast */}
        {toast && (
          <div className={`jpb-toast jpb-toast-${toast.type}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {toast.type === 'success' ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            </svg>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="cp-list-header">
          <nav className="cp-breadcrumb">
            <a onClick={() => navigate('/recruiter-dashboard')} style={{ cursor: 'pointer' }}>Dashboard</a>
            <span className="cp-breadcrumb-sep">›</span>
            <span className="cp-breadcrumb-current">Job Postings</span>
          </nav>

          <div className="cp-page-title-block">
            <div>
              <h1 className="cp-page-h1">Job Postings</h1>
              <p className="jpb-page-subtitle">Manage your open roles and track applicant pipeline</p>
            </div>
            <button className="jpb-btn jpb-btn-primary" onClick={handleNewPosting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Posting
            </button>
          </div>
        </div>

        <div className="cp-page-body">
          <div className="cp-page-layout">
            <div className="cp-main-col">
              {/* Summary stat cards — live counts, not per-job */}
              <div className="jpb-summary-stats">
                <div className="kpi-card kpi-card-green">
                  <div className="kpi-card-top">
                    <span className="kpi-title">ACTIVE JOBS</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{summaryStats.activeJobs}</div>
                </div>
                <div className="kpi-card kpi-card-blue">
                  <div className="kpi-card-top">
                    <span className="kpi-title">TOTAL APPLICANTS</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{summaryStats.totalApplicants}</div>
                </div>
                <div className="kpi-card kpi-card-purple">
                  <div className="kpi-card-top">
                    <span className="kpi-title">AI MATCHES</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{summaryStats.totalAiMatches}</div>
                </div>
              </div>

              {/* Search + status filter + result count, all in one row */}
              <div className="cp-filter-bar jpb-filter-bar-inline">
                <div className="cp-search-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search postings..." value={listSearch} onChange={e => setListSearch(e.target.value)} />
                </div>
                <div className="cp-filter-chips">
                  {(['all','active','frozen','cancelled'] as const).map(s => (
                    <button key={s} className={`cp-filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="jpb-filter-count">{filteredPostings.length} job{filteredPostings.length === 1 ? '' : 's'}</span>
              </div>

              {filteredPostings.length === 0 ? (
                <div className="cp-empty-state">
                  <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                  <h3 className="cp-empty-title">No job postings yet</h3>
                  <p className="cp-empty-text">Create your first job posting to start hiring.</p>
                  <button className="jpb-btn jpb-btn-primary cp-btn-lg" onClick={handleNewPosting}>+ Create First Posting</button>
                </div>
              ) : (
                <div className="cp-main-grid">
                  {paginatedPostings.map(p => {
                    const nStatus = (p.status || '').toLowerCase();
                    const skills = p.posting_skills || [];
                    const postedDate = fmtDate(p.created_at);
                    const closesDate = fmtDate(p.end_date);
                    return (
                      <div key={p.id} className="cp-posting-card" onClick={() => setSelectedPostingId(selectedPostingId === p.id ? null : p.id)}>
                        <div className="cp-posting-card-top">
                          <div>
                            <div className="cp-posting-card-title">{p.job_title}</div>
                            <div className="cp-posting-card-dept">{p.product_vendor}{p.product_type ? ` · ${p.product_type}` : ''}</div>
                          </div>
                          <span className={`cp-posting-status ${nStatus}`}>{p.status || 'active'}</span>
                          <button
                            className="cp-card-menu-btn"
                            onClick={e => { e.stopPropagation(); setCardMenuOpenId(cardMenuOpenId === p.id ? null : p.id); }}
                            title="More actions"
                          >⋯</button>
                          {cardMenuOpenId === p.id && (
                            <div className="cp-card-menu-popover">
                              <button className="cp-card-menu-item" onClick={e => { e.stopPropagation(); setCardMenuOpenId(null); handleDuplicatePosting(p); setShowForm(true); }}>Duplicate</button>
                              {nStatus !== 'cancelled' && nStatus !== 'frozen' && (
                                <button className="cp-card-menu-item" onClick={e => { e.stopPropagation(); setCardMenuOpenId(null); handleJobLifecycleAction(p.id, 'freeze', e); }}>Freeze</button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="cp-posting-card-meta">
                          {p.location && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {p.location}
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01"/></svg>
                            {worktypeLabel(p.worktype)}
                          </span>
                          {p.salary_min > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                              {fmtSalary(p.salary_min, p.salary_max, p.salary_currency)}
                            </span>
                          )}
                          {postedDate && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              Posted {postedDate}
                            </span>
                          )}
                        </div>
                        {skills.length > 0 && (
                          <div className="cp-posting-card-skill-tags">
                            {skills.slice(0,4).map((s: any,i: number) => <span key={i} className="cp-posting-card-skill-tag">{s.skill_name}</span>)}
                            {skills.length > 4 && <span className="cp-posting-card-skill-tag">+{skills.length-4}</span>}
                          </div>
                        )}
                        {(() => {
                          const stats = jobStats[p.id] || { applicants: 0, aiMatches: 0, matchRate: 0, avgMatchScore: 0 };
                          return (
                            <div className="cp-posting-card-stats">
                              <div className="cp-posting-card-stat">
                                <span className="cp-posting-card-stat-value">{stats.applicants}</span>
                                <span className="cp-posting-card-stat-label">Applicants</span>
                              </div>
                              <div className="cp-posting-card-stat">
                                <span className="cp-posting-card-stat-value">{stats.aiMatches}</span>
                                <span className="cp-posting-card-stat-label">AI Matches</span>
                              </div>
                              <div className="cp-posting-card-stat">
                                <span className="cp-posting-card-stat-value">{stats.matchRate}%</span>
                                <span className="cp-posting-card-stat-label">Match Rate</span>
                              </div>
                              <div className="cp-posting-card-stat">
                                <span className="cp-posting-card-stat-value">{stats.avgMatchScore}%</span>
                                <span className="cp-posting-card-stat-label">Avg Match Score</span>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="cp-posting-card-footer">
                          <div className="cp-posting-card-action-btns">
                            <button
                              className="cp-posting-action-btn primary"
                              onClick={(e) => { e.stopPropagation(); navigate(`/recruiter-dashboard?tab=applications&job=${p.id}`); }}
                            >
                              View Applicants
                            </button>
                            <button className="cp-posting-action-btn" onClick={(e) => { e.stopPropagation(); loadPosting(p); }}>Edit</button>
                            {nStatus !== 'cancelled' && (
                              <button className="cp-posting-action-btn cancel" onClick={(e) => { e.stopPropagation(); setShowCancelModal(p.id); }}>Cancel</button>
                            )}
                          </div>
                          {closesDate && <span className="cp-posting-card-closes">Closes {closesDate}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination footer */}
              {totalPostPages > 1 && (
                <div className="cp-pagination-footer">
                  <span className="cp-pagination-info">
                    Showing {(currentPostPage - 1) * PAGE_SIZE_POSTINGS + 1}–{Math.min(currentPostPage * PAGE_SIZE_POSTINGS, filteredPostings.length)} of {filteredPostings.length}
                  </span>
                  <div className="cp-pagination-buttons">
                    <button className="cp-pag-btn" onClick={() => setCurrentPostPage(p => p - 1)} disabled={currentPostPage === 1}>← Prev</button>
                    {getPostPageNumbers().map((pn, i) =>
                      pn === '...' ? (
                        <span key={`e${i}`} className="cp-pag-btn ellipsis">…</span>
                      ) : (
                        <button key={pn} className={`cp-pag-btn${currentPostPage === pn ? ' active' : ''}`} onClick={() => setCurrentPostPage(pn as number)}>{pn}</button>
                      )
                    )}
                    <button className="cp-pag-btn" onClick={() => setCurrentPostPage(p => p + 1)} disabled={currentPostPage === totalPostPages}>Next →</button>
                  </div>
                </div>
              )}
            </div>

            {/* Recruiter Permissions — condensed into a narrow right-hand column */}
            <div className="cp-sidebar-col jpb-permissions-col">
              <div className="jpb-permissions-card">
                <div className="jpb-permissions-header">
                  <div className="jpb-permissions-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px' }}>Recruiter Permissions</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>RECRUITER</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Full ownership of the job posting lifecycle</div>
                  </div>
                </div>
                <div className="jpb-permissions-section jpb-permissions-full">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ width: 9, height: 9 }}><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Access</span>
                  </div>
                  {['Create new job postings', 'Edit job details', 'Duplicate postings', 'Freeze / Unfreeze postings', 'Cancel postings'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, color: '#166534' }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="jpb-permissions-section jpb-permissions-hr">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 9, height: 9 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HR Can Also</span>
                  </div>
                  {['Edit job details', 'Freeze / Unfreeze postings', 'Cancel postings'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span style={{ fontSize: 12, color: '#475569' }}>{item}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>HR cannot create or duplicate postings.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowCancelModal(null)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 12px' }}>Cancel Job Posting</h3>
              <select value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 14 }}>
                <option value="">Select reason...</option>
                <option value="position_filled">Position Filled</option>
                <option value="budget_cut">Budget Cut</option>
                <option value="requirements_changed">Requirements Changed</option>
                <option value="other">Other</option>
              </select>
              {cancelReason === 'other' && (
                <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter reason..." style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 14, height: 80, resize: 'vertical', fontFamily: 'inherit' }} />
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="jpb-btn jpb-btn-outline" onClick={() => setShowCancelModal(null)}>Cancel</button>
                <button className="jpb-btn jpb-btn-danger" onClick={handleCancelJob} disabled={!cancelReason}>Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default JobPostingListView;
