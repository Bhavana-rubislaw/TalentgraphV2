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
}

const JobPostingListView: React.FC<JobPostingListViewProps> = ({
  toast, listSearch, setListSearch, statusFilter, setStatusFilter,
  selectedPostingId, setSelectedPostingId, showCancelModal, setShowCancelModal,
  cancelReason, setCancelReason, customReason, setCustomReason,
  currentPostPage, setCurrentPostPage, cardMenuOpenId, setCardMenuOpenId,
  navigate, PAGE_SIZE_POSTINGS, loadPosting, handleDuplicatePosting, handleNewPosting,
  handleJobLifecycleAction, handleCancelJob, filteredPostings, totalPostPages,
  paginatedPostings, getPostPageNumbers, setShowForm,
}) => {
    const worktypeLabel = (wt: string) => ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[wt] || wt);
    const fmtSalary = (min: number, max: number, cur: string) => {
      const fmt = (v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
      return `${(cur||'USD').toUpperCase()} ${fmt(min)} – ${fmt(max)}`;
    };

    return (
      <div className="cp-page">
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
            <h1 className="cp-page-h1">Job Postings</h1>
            <button className="jpb-btn jpb-btn-primary" onClick={handleNewPosting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Posting
            </button>
          </div>

          {/* Recruiter Permissions Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #10b981',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px' }}>Job Postings — Recruiter Permissions</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>RECRUITER</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Full ownership of the job posting lifecycle</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Access</span>
                </div>
                {['Create new job postings', 'Edit job details', 'Duplicate postings', 'Freeze / Unfreeze postings', 'Cancel postings'].map(item => (
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
                {['Edit job details', 'Freeze / Unfreeze postings', 'Cancel postings'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span style={{ fontSize: 12, color: '#475569' }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>HR cannot create or duplicate postings.</div>
              </div>
            </div>
          </div>

          <div className="cp-filter-bar">
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
          </div>
        </div>

        {/* Scrollable card grid */}
        <div className="cp-page-body">
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
                    {skills.length > 0 && (
                      <div className="cp-posting-card-skill-tags">
                        {skills.slice(0,4).map((s: any,i: number) => <span key={i} className="cp-posting-card-skill-tag">{s.skill_name}</span>)}
                        {skills.length > 4 && <span className="cp-posting-card-skill-tag">+{skills.length-4}</span>}
                      </div>
                    )}
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
                    </div>
                    <div className="cp-posting-card-footer">
                      <div className="cp-posting-card-action-btns">
                        <button className="cp-posting-action-btn" onClick={(e) => { e.stopPropagation(); loadPosting(p); }}>Edit</button>
                        {nStatus !== 'cancelled' && (
                          <button className="cp-posting-action-btn cancel" onClick={(e) => { e.stopPropagation(); setShowCancelModal(p.id); }}>Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
