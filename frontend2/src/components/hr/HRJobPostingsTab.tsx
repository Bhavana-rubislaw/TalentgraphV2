import React from 'react';
import { apiClient } from '../../api/client';
import { KPICard } from './HRDashboardCards';

interface HRJobPostingsTabProps {
  allJobs: any[];
  setAllJobs: React.Dispatch<React.SetStateAction<any[]>>;
  jobsLoading: boolean;
  jpSearch: string;
  setJpSearch: (value: string) => void;
  jpStatusFilter: string;
  setJpStatusFilter: (value: string) => void;
  jpCurrentPage: number;
  setJpCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  jpShowCancelModal: boolean;
  setJpShowCancelModal: (value: boolean) => void;
  jpCancelReason: string;
  setJpCancelReason: (value: string) => void;
  jpSelectedId: number | null;
  setJpSelectedId: (id: number | null) => void;
  jpCardMenuOpenId: number | null;
  setJpCardMenuOpenId: (id: number | null) => void;
  jpToast: string;
  setJpToast: (msg: string) => void;
  JP_PAGE_SIZE: number;
  fetchJobs: () => Promise<void>;
  navigate: (path: string) => void;
  setActiveTab: (tab: string) => void;
}

const HRJobPostingsTab: React.FC<HRJobPostingsTabProps> = ({
  allJobs, setAllJobs, jobsLoading, jpSearch, setJpSearch, jpStatusFilter, setJpStatusFilter,
  jpCurrentPage, setJpCurrentPage, jpShowCancelModal, setJpShowCancelModal,
  jpCancelReason, setJpCancelReason, jpSelectedId, setJpSelectedId,
  jpCardMenuOpenId, setJpCardMenuOpenId, jpToast, setJpToast,
  JP_PAGE_SIZE, fetchJobs, navigate, setActiveTab,
}) => {
    const worktypeLabel = (wt: string) => ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[wt] || (wt ? wt.charAt(0).toUpperCase() + wt.slice(1) : ''));
    const fmtSalary = (min: number, max: number, cur: string) => {
      const fmt = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : v.toLocaleString();
      return `${(cur || 'USD').toUpperCase()} ${fmt(min)} – ${fmt(max)}`;
    };
    const filtered = allJobs.filter(p => {
      const matchSearch = !jpSearch || (p.job_title || p.title || '').toLowerCase().includes(jpSearch.toLowerCase());
      const matchStatus = jpStatusFilter === 'all' || (p.status || '').toLowerCase() === jpStatusFilter;
      return matchSearch && matchStatus;
    });
    const totalPages = Math.ceil(filtered.length / JP_PAGE_SIZE);
    const paginated = filtered.slice((jpCurrentPage - 1) * JP_PAGE_SIZE, jpCurrentPage * JP_PAGE_SIZE);
    const getJpPageNumbers = (): (number | string)[] => {
      if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
      const pages: (number | string)[] = [];
      if (jpCurrentPage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalPages); }
      else if (jpCurrentPage >= totalPages - 3) { pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
      else { pages.push(1, '...', jpCurrentPage - 1, jpCurrentPage, jpCurrentPage + 1, '...', totalPages); }
      return pages;
    };

    const handleJpStatusAction = async (id: number, action: 'freeze' | 'reactivate' | 'cancel', reason?: string) => {
      const statusMap: Record<string, string> = { freeze: 'frozen', reactivate: 'active', cancel: 'cancelled' };
      const labels: Record<string, string> = { freeze: 'frozen', reactivate: 'reactivated', cancel: 'cancelled' };
      // Optimistic update: change status in-place so card stays at same position
      setAllJobs(prev => prev.map(j => j.id === id ? { ...j, status: statusMap[action] ?? j.status } : j));
      try {
        await apiClient.updateJobPostingStatus(id, action, reason);
        setJpToast(`Job ${labels[action] || action} successfully.`);
      } catch {
        // Revert optimistic update on failure
        await fetchJobs();
        setJpToast('Action failed. Please try again.');
      }
    };

    const IconPin = () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    );
    const IconBuilding = () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01"/>
      </svg>
    );
    const IconSalary = () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, color: '#9ca3af' }}>
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '-32px', padding: 0, fontFamily: 'var(--cp-font, Inter, sans-serif)' }}>
        {/* Header: breadcrumb + title + filter bar */}
        <div style={{ padding: '28px 32px 0' }}>
          <nav className="cp-breadcrumb" style={{ marginBottom: 8 }}>
            <span style={{ cursor: 'pointer', color: '#6b7280', fontSize: 13 }} onClick={() => setActiveTab('approvals')}>Dashboard</span>
            <span style={{ color: '#d1d5db', fontSize: 12, margin: '0 6px' }}>›</span>
            <span style={{ color: '#111827', fontWeight: 500, fontSize: 13 }}>Job Postings</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Job Postings</h1>
          </div>

          {/* KPI Banner */}
          <div className="hr-kpi-grid" style={{ marginBottom: 20 }}>
            <KPICard label="Total"     value={allJobs.length}                                                               color="#6366f1" stripe="#6366f1" />
            <KPICard label="Active"    value={allJobs.filter(j => (j.status || '').toLowerCase() === 'active').length}     color="#10b981" stripe="#10b981" />
            <KPICard label="Frozen"    value={allJobs.filter(j => (j.status || '').toLowerCase() === 'frozen').length}     color="#6366f1" stripe="#6366f1" />
            <KPICard label="Reposted"  value={allJobs.filter(j => (j.status || '').toLowerCase() === 'reposted').length}   color="#3b82f6" stripe="#3b82f6" />
            <KPICard label="Cancelled" value={allJobs.filter(j => (j.status || '').toLowerCase() === 'cancelled').length}  color="#ef4444" stripe="#ef4444" />
          </div>

          {/* HR Role Responsibilities Banner — Job Postings */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #6366f1',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 18,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px' }}>Job Postings — HR Permissions</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>HR MANAGER</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>What you can and cannot do with job postings</div>
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
                {['Edit job details', 'Freeze active postings', 'Unfreeze frozen postings', 'Cancel postings'].map(item => (
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Not Permitted</span>
                </div>
                {['Create new postings', 'Duplicate postings'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    <span style={{ fontSize: 12, color: '#991b1b' }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', borderTop: '1px dashed #fecaca', paddingTop: 6 }}>Recruiters are responsible for creating new postings.</div>
              </div>
            </div>
          </div>

          <div className="cp-filter-bar" style={{ marginBottom: 0, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
            <div className="cp-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search postings..." value={jpSearch} onChange={e => { setJpSearch(e.target.value); setJpCurrentPage(1); }} />
            </div>
            <div className="cp-filter-chips">
              {(['all', 'active', 'reposted', 'frozen', 'cancelled'] as const).map(s => (
                <button key={s} className={`cp-filter-chip${jpStatusFilter === s ? ' active' : ''}`} onClick={() => { setJpStatusFilter(s); setJpCurrentPage(1); }}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card grid */}
        <div style={{ padding: '20px 32px', flex: 1 }}>
          {jobsLoading ? (
            <div className="hr-loading"><span className="hr-loading-spinner" />Loading postings…</div>
          ) : paginated.length === 0 ? (
            <div className="cp-empty-state">
              <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              <h3 className="cp-empty-title">No job postings found</h3>
              <p className="cp-empty-text">No postings match your search. Recruiters create new job postings — HR manages existing ones.</p>
            </div>
          ) : (
            <div className="cp-main-grid">
              {paginated.map(p => {
                const nStatus = (p.status || 'active').toLowerCase();
                const skills: any[] = Array.isArray(p.posting_skills) ? p.posting_skills : [];
                const dept = [p.product_vendor, p.product_type].filter(Boolean).join(' · ');
                return (
                  <div className="cp-posting-card" key={p.id} style={{ cursor: 'default' }}>
                    <div className="cp-posting-card-top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cp-posting-card-title">{p.job_title || p.title}</div>
                        {dept && <div className="cp-posting-card-dept" style={{ marginTop: 2 }}>{dept}</div>}
                      </div>
                      <span className={`cp-posting-status ${nStatus}`} style={{ flexShrink: 0 }}>{(p.status || 'active').toUpperCase()}</span>
                      <button
                        className="cp-card-menu-btn"
                        onClick={e => { e.stopPropagation(); setJpCardMenuOpenId(jpCardMenuOpenId === p.id ? null : p.id); }}
                        title="More actions"
                      >⋯</button>
                      {jpCardMenuOpenId === p.id && (
                        <div className="cp-card-menu-popover">
                          {nStatus !== 'cancelled' && nStatus !== 'frozen' && (
                            <button className="cp-card-menu-item" onClick={() => { setJpCardMenuOpenId(null); handleJpStatusAction(p.id, 'freeze'); }}>Freeze</button>
                          )}
                          {nStatus === 'frozen' && (
                            <button className="cp-card-menu-item" onClick={() => { setJpCardMenuOpenId(null); handleJpStatusAction(p.id, 'reactivate'); }}>Unfreeze</button>
                          )}
                        </div>
                      )}
                    </div>
                    {skills.length > 0 && (
                      <div className="cp-posting-card-skill-tags">
                        {skills.slice(0, 4).map((s: any, i: number) => <span key={i} className="cp-posting-card-skill-tag">{s.skill_name || s}</span>)}
                        {skills.length > 4 && <span className="cp-posting-card-skill-tag">+{skills.length - 4}</span>}
                      </div>
                    )}
                    <div className="cp-posting-card-meta">
                      {p.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconPin />{p.location}
                        </span>
                      )}
                      {p.worktype && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconBuilding />{worktypeLabel(p.worktype)}
                        </span>
                      )}
                      {p.salary_min > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconSalary />{fmtSalary(p.salary_min, p.salary_max, p.salary_currency)}
                        </span>
                      )}
                    </div>
                    <div className="cp-posting-card-footer">
                      <div className="cp-posting-card-action-btns">
                        <button className="cp-posting-action-btn" onClick={() => navigate('/recruiter/job-postings?edit=' + p.id)}>Edit</button>
                        {nStatus !== 'cancelled' && (
                          <button className="cp-posting-action-btn cancel" onClick={() => { setJpSelectedId(p.id); setJpShowCancelModal(true); }}>Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="cp-pagination-footer" style={{ margin: '0 32px 28px', borderRadius: 12 }}>
            <span className="cp-pagination-info">
              Showing {filtered.length === 0 ? 0 : (jpCurrentPage - 1) * JP_PAGE_SIZE + 1}–{Math.min(jpCurrentPage * JP_PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="cp-pagination-buttons">
              <button className="cp-pag-btn" disabled={jpCurrentPage === 1} onClick={() => setJpCurrentPage(p => p - 1)}>← Prev</button>
              {totalPages > 1 && getJpPageNumbers().map((pn, i) =>
                pn === '...' ? (
                  <span key={`e${i}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
                ) : (
                  <button key={pn} className={`cp-pag-btn${jpCurrentPage === pn ? ' active' : ''}`} onClick={() => setJpCurrentPage(pn as number)}>{pn}</button>
                )
              )}
              <button className="cp-pag-btn" disabled={jpCurrentPage === totalPages || totalPages === 0} onClick={() => setJpCurrentPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}

        {/* Toast */}
        {jpToast && (
          <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 3000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            {jpToast}
          </div>
        )}

        {/* Cancel modal */}
        {jpShowCancelModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setJpShowCancelModal(false)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Cancel Job Posting</h3>
              <select value={jpCancelReason} onChange={e => setJpCancelReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 14 }}>
                <option value="">Select reason...</option>
                <option value="position_filled">Position Filled</option>
                <option value="budget_cut">Budget Cut</option>
                <option value="requirements_changed">Requirements Changed</option>
                <option value="other">Other</option>
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="jpb-btn jpb-btn-outline" onClick={() => { setJpShowCancelModal(false); setJpCancelReason(''); setJpSelectedId(null); }}>Back</button>
                <button className="jpb-btn jpb-btn-danger" disabled={!jpCancelReason}
                  onClick={async () => {
                    if (jpSelectedId) await handleJpStatusAction(jpSelectedId, 'cancel', jpCancelReason);
                    setJpShowCancelModal(false);
                    setJpCancelReason('');
                    setJpSelectedId(null);
                  }}
                >Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default HRJobPostingsTab;
