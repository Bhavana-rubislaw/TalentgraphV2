import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ModernDashboard.css';
import '../styles/PremiumDashboard.css';
import '../styles/PremiumDashboardV2.css';
import '../styles/PremiumCards.css';
import '../styles/PremiumModals.css';
import '../styles/RecruiterApplications.css';
import '../styles/HorizontalDashboard.css';
import '../styles/HRDashboard.css';
import '../styles/CandidatePages.css';
import '../styles/JobPostingBuilder.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import { MeetingSchedulerTab } from '../components/meetings';
import TeamManager from '../components/TeamManager';
import SubscriptionPage from './SubscriptionPage';
import ScheduleInterviewModal from '../components/interviews/ScheduleInterviewModal';

const HR_TABS = ['job-postings', 'team', 'subscription', 'analytics', 'applications', 'messages', 'meetings'] as const;
type HRTab = typeof HR_TABS[number];

// ─── Helper: status badge colours ────────────────────────────────────────────
const STATUS_COLOURS: Record<string, string> = {
  draft:    '#f59e0b',
  active:   '#10b981',
  frozen:   '#6366f1',
  cancelled:'#ef4444',
  closed:   '#6b7280',
};

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Tab: driven from ?tab= URL param ────────────────────────
  const rawTab = searchParams.get('tab') || '';
  const activeTab: HRTab = (HR_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as HRTab)
    : 'job-postings';

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      });
    },
    [setSearchParams]
  );

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ── Job Approvals state ────────────────────────────────────────
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // ── Job Postings tab state ─────────────────────────────────────
  const [jpSearch, setJpSearch] = useState('');
  const [jpStatusFilter, setJpStatusFilter] = useState('all');
  const [jpCurrentPage, setJpCurrentPage] = useState(1);
  const [jpShowCancelModal, setJpShowCancelModal] = useState(false);
  const [jpCancelReason, setJpCancelReason] = useState('');
  const [jpSelectedId, setJpSelectedId] = useState<number | null>(null);
  const [jpCardMenuOpenId, setJpCardMenuOpenId] = useState<number | null>(null);
  const [jpToast, setJpToast] = useState('');
  const JP_PAGE_SIZE = 9;

  // ── Team Management state ──────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // ── Analytics state ────────────────────────────────────────────
  const [hrAnalytics, setHrAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState(30);

  // ── Applications state ─────────────────────────────────────────
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appSortOrder, setAppSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [appNotes, setAppNotes] = useState<Record<number, string>>({});
  const [hrToast, setHrToast] = useState<string | null>(null);
  const [isScheduleInterviewModalOpen, setIsScheduleInterviewModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<any | null>(null);
  // ── Chat state (messages tab) ──────────────────────────────────
  const conversationId = searchParams.get('c') ? parseInt(searchParams.get('c')!, 10) : undefined;

  // ── User display info ──────────────────────────────────────────
  const userName = user?.full_name || localStorage.getItem('full_name') || 'HR Manager';
  const companyName = user?.company_name || localStorage.getItem('company_name') || 'Your Company';
  const userInitial = userName.charAt(0).toUpperCase();

  // ── Data fetching ──────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await apiClient.getJobPostings(false); // false = include all statuses
      setAllJobs(res.data || []);
    } catch (err) {
      console.error('[HR] Failed to fetch job postings:', err);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await apiClient.getCompanyTeam();
      setTeamMembers(res.data || []);
    } catch (err) {
      console.error('[HR] Failed to fetch team:', err);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await apiClient.getHRAnalytics(analyticsRange);
      setHrAnalytics(res.data);
    } catch (err) {
      console.error('[HR] Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsRange]);

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await apiClient.getRecruiterApplications();
      setApplications(res.data || []);
    } catch (err) {
      console.error('[HR] Failed to fetch applications:', err);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  // ── Lifecycle actions ──────────────────────────────────────────

  const handleJobStatusAction = async (jobId: number, action: string) => {
    try {
      await apiClient.updateJobPostingStatus(jobId, action as 'freeze' | 'reactivate' | 'cancel');
      await fetchJobs();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to update job status';
      alert(msg);
    }
  };

  const handleRemoveTeamMember = async (memberId: number, email: string) => {
    if (!window.confirm(`Remove ${email} from the team? This will deactivate their account.`)) return;
    try {
      await apiClient.removeTeamMemberHR(memberId);
      await fetchTeam();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to remove team member';
      alert(msg);
    }
  };

  // ── Applications handlers ──────────────────────────────────────

  const showHrToast = (msg: string) => {
    setHrToast(msg);
    setTimeout(() => setHrToast(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showHrToast('Copied to clipboard');
  };

  const handleStartDirectMessage = async (candidateUserId: number) => {
    if (!candidateUserId) {
      alert('Cannot start conversation: Invalid candidate user ID');
      return;
    }
    try {
      const res = await apiClient.startConversation(candidateUserId);
      const convId = res.data.conversation.id;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'messages');
        next.set('c', String(convId));
        return next;
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start conversation';
      alert(`Unable to start conversation: ${errorMessage}`);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: number, status: string) => {
    try {
      await apiClient.updateApplicationStatus(applicationId, status);
      fetchApplications();
    } catch (error) {
      alert('Failed to update application status');
    }
  };

  const handleSaveApplicationNotes = async (applicationId: number) => {
    try {
      const notes = appNotes[applicationId] || '';
      await apiClient.updateApplicationReview(applicationId, {
        recruiter_notes: notes.trim() || undefined
      });
      alert('Notes saved successfully');
      setAppNotes(prev => {
        const next = { ...prev };
        delete next[applicationId];
        return next;
      });
      await fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save notes');
    }
  };

  const handleDownloadResume = async (applicationId: number, resumeId: number, filename: string) => {
    try {
      const response = await apiClient.downloadRecruiterApplicationResume(applicationId, resumeId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to download resume');
    }
  };

  const handleDownloadCertification = async (applicationId: number, certificationId: number, filename: string) => {
    try {
      const response = await apiClient.downloadRecruiterApplicationCertification(applicationId, certificationId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to download certification');
    }
  };

  // ── Click-outside: close jp card menu ────────────────────────
  useEffect(() => {
    if (jpCardMenuOpenId === null) return;
    const handler = () => setJpCardMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [jpCardMenuOpenId]);

  // ── Toast auto-dismiss ─────────────────────────────────────────
  useEffect(() => {
    if (!jpToast) return;
    const t = setTimeout(() => setJpToast(''), 3000);
    return () => clearTimeout(t);
  }, [jpToast]);

  // ── Initial data load by tab ───────────────────────────────────
  useEffect(() => {
    if (activeTab === 'job-postings') fetchJobs();
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'applications') fetchApplications();
  }, [activeTab, fetchJobs, fetchTeam, fetchAnalytics, fetchApplications]);

  // Re-fetch analytics when range changes
  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [analyticsRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first application when data loads
  useEffect(() => {
    if (!appsLoading && applications.length > 0 && selectedAppId === null) {
      setSelectedAppId(applications[0].application_id);
    }
  }, [appsLoading, applications, selectedAppId]);

  // ── Applications computed values ───────────────────────────────

  const filteredApplications = useMemo(() => {
    let result = [...applications];
    if (appStatusFilter !== 'all') {
      result = result.filter((a: any) => a.status === appStatusFilter);
    }
    if (appSearch.trim()) {
      const q = appSearch.toLowerCase();
      result = result.filter((a: any) =>
        a.candidate.name.toLowerCase().includes(q) ||
        a.candidate.email.toLowerCase().includes(q) ||
        (a.job_posting?.job_title || '').toLowerCase().includes(q) ||
        (a.job_profile?.profile_name || '').toLowerCase().includes(q)
      );
    }
    result.sort((a: any, b: any) => {
      const da = new Date(a.applied_at).getTime();
      const db = new Date(b.applied_at).getTime();
      return appSortOrder === 'newest' ? db - da : da - db;
    });
    return result;
  }, [applications, appStatusFilter, appSearch, appSortOrder]);

  const selectedApp = useMemo(() => {
    return applications.find((a: any) => a.application_id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // ── Render helpers ─────────────────────────────────────────────

  const renderJobPostingsTab = () => {
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
              <p className="cp-empty-text">Create your first job posting to start hiring.</p>
              <button className="jpb-btn jpb-btn-primary" onClick={() => navigate('/recruiter/job-postings')}>+ Create First Posting</button>
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
                          <button className="cp-card-menu-item" onClick={() => { setJpCardMenuOpenId(null); navigate('/recruiter/job-postings?duplicate=' + p.id); }}>Duplicate</button>
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
                        <button className="cp-posting-action-btn" onClick={() => navigate('/recruiter/job-postings')}>Edit</button>
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

  const renderApprovalsTab = () => {
    const draftJobs   = allJobs.filter(j => (j.status || '').toLowerCase() === 'draft');
    const activeJobs  = allJobs.filter(j => (j.status || '').toLowerCase() === 'active');
    const frozenJobs  = allJobs.filter(j => (j.status || '').toLowerCase() === 'frozen');

    return (
      <div className="content-panel-horizontal hr-tab-panel">
        <div className="hr-panel-header">
          <div>
            <h2 className="hr-panel-title">Job Approval Queue</h2>
            <p className="hr-panel-subtitle">
              Review and manage job posting lifecycle. Draft jobs are awaiting approval before they go live.
            </p>
          </div>
        </div>

        {jobsLoading ? (
          <div className="hr-loading">
            <span className="hr-loading-spinner" />
            Loading jobs…
          </div>
        ) : (
          <>
            {/* Draft / Pending Approval */}
            <div className="hr-section">
              <span className="hr-section-pill pending">⏳ Pending Approval ({draftJobs.length})</span>
              {draftJobs.length === 0 ? (
                <p className="hr-empty-text">No jobs pending approval.</p>
              ) : (
                draftJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    actions={[
                      { label: '✅ Activate',  variant: 'activate',  fn: () => handleJobStatusAction(job.id, 'reactivate') },
                      { label: '❌ Cancel',    variant: 'cancel',    fn: () => handleJobStatusAction(job.id, 'cancel') },
                    ]}
                  />
                ))
              )}
            </div>

            {/* Active Jobs */}
            <div className="hr-section">
              <span className="hr-section-pill active">✅ Active ({activeJobs.length})</span>
              {activeJobs.length === 0 ? (
                <p className="hr-empty-text">No active jobs.</p>
              ) : (
                activeJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    actions={[
                      { label: '🧊 Freeze', variant: 'freeze', fn: () => handleJobStatusAction(job.id, 'freeze') },
                    ]}
                  />
                ))
              )}
            </div>

            {/* Frozen Jobs */}
            {frozenJobs.length > 0 && (
              <div className="hr-section">
                <span className="hr-section-pill frozen">🧊 Frozen ({frozenJobs.length})</span>
                {frozenJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    actions={[
                      { label: '🔄 Reactivate', variant: 'reactivate', fn: () => handleJobStatusAction(job.id, 'reactivate') },
                    ]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTeamTab = () => (
    <div className="content-panel-horizontal hr-tab-panel">
      <div className="hr-panel-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="hr-panel-title">Team Management</h2>
          <p className="hr-panel-subtitle">Invite, manage, and assign roles to your company team members.</p>
        </div>
      </div>
      <TeamManager userRole={(user?.role || localStorage.getItem('role') || 'hr').toLowerCase()} />
    </div>
  );

  const renderSubscriptionTab = () => (
    <div className="content-panel-horizontal hr-tab-panel">
      <div className="hr-panel-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="hr-panel-title">Subscription &amp; Credits</h2>
          <p className="hr-panel-subtitle">Manage your company subscription plan and credit balance.</p>
        </div>
      </div>
      <SubscriptionPage userRole={(user?.role || localStorage.getItem('role') || 'hr').toLowerCase()} />
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="content-panel-horizontal hr-tab-panel">
      <div className="hr-panel-header">
        <div>
          <h2 className="hr-panel-title">Company-Wide Analytics</h2>
          <p className="hr-panel-subtitle">Hiring funnel, job performance, and team productivity metrics.</p>
        </div>
        <select
          className="hr-range-select"
          value={analyticsRange}
          onChange={e => setAnalyticsRange(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {analyticsLoading ? (
        <div className="hr-loading"><span className="hr-loading-spinner" />Loading analytics…</div>
      ) : !hrAnalytics ? (
        <div className="hr-empty"><p className="hr-empty-text">No analytics data available.</p></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="hr-kpi-grid">
            <KPICard label="Total Jobs"         value={hrAnalytics.total_jobs ?? 0}                          color="#6366f1" stripe="#6366f1" />
            <KPICard label="Pending Approval"   value={hrAnalytics.jobs_pending_approval ?? 0}               color="#f59e0b" stripe="#f59e0b" />
            <KPICard label="Applications"       value={hrAnalytics.hiring_funnel?.total_applications ?? 0}   color="#3b82f6" stripe="#3b82f6" />
            <KPICard label="Interviews"         value={hrAnalytics.hiring_funnel?.scheduled_interviews ?? 0} color="#8b5cf6" stripe="#8b5cf6" />
            <KPICard label="Shortlisted"        value={hrAnalytics.hiring_funnel?.shortlisted ?? 0}          color="#06b6d4" stripe="#06b6d4" />
            <KPICard label="Selected"           value={hrAnalytics.hiring_funnel?.selected ?? 0}             color="#10b981" stripe="#10b981" />
            <KPICard label="Meetings Scheduled" value={hrAnalytics.meetings_scheduled ?? 0}                  color="#f97316" stripe="#f97316" />
          </div>

          {/* Job Status Breakdown */}
          {hrAnalytics.job_status_breakdown && (
            <div className="hr-analytics-panel">
              <h3 className="hr-analytics-panel-title">Job Status Breakdown</h3>
              <div className="hr-status-chips">
                {Object.entries(hrAnalytics.job_status_breakdown as Record<string, number>).map(([status, count]) => (
                  <div key={status} className="hr-status-chip">
                    <span className="hr-status-chip-dot" style={{ background: STATUS_COLOURS[status] || '#94a3b8' }} />
                    <span className="hr-status-chip-name">{status}</span>
                    <span className="hr-status-chip-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hiring Funnel */}
          {hrAnalytics.hiring_funnel && (
            <div className="hr-analytics-panel">
              <h3 className="hr-analytics-panel-title">Hiring Funnel Rates</h3>
              <div className="hr-funnel-rates">
                <FunnelRate label="Interview Rate" value={hrAnalytics.hiring_funnel.interview_rate_pct} />
                <FunnelRate label="Selection Rate" value={hrAnalytics.hiring_funnel.selection_rate_pct} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderApplicationsTab = () => {
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
              padding: '8px 32px 8px 12px', fontSize: '13px', fontWeight: 500,
              border: '1px solid var(--ra-border-1)', borderRadius: '8px',
              background: 'white', color: 'var(--ra-text-1)', cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
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

  // ── Main render ────────────────────────────────────────────────
  return (
    <div className="horizontal-dashboard">
      {/* ── Top Navigation Bar (matches RecruiterDashboardNew) ── */}
      <div className="talentgraph-topnav">
        <div className="talentgraph-topnav-left">
          <div className="talentgraph-logo">
            <div className="talentgraph-logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <span className="talentgraph-logo-text">TalentGraph</span>
          </div>
          <span className="hr-nav-badge">HR</span>
        </div>

        <div className="talentgraph-topnav-center" />

        <div className="talentgraph-topnav-right">
          <NotificationBellDrawer role="hr" />

          <button className="talentgraph-user-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="talentgraph-user-avatar">{userInitial}</div>
            <div className="talentgraph-user-info">
              <div className="talentgraph-user-name">{userName}</div>
              <div className="talentgraph-user-role">HR · {companyName}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div
              className="profile-menu"
              style={{ position: 'absolute', top: '60px', right: '32px', zIndex: 1000 }}
              onClick={() => setShowProfileMenu(false)}
            >
              <button onClick={() => navigate('/recruiter/profile')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <button onClick={() => navigate('/settings/calendar')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Calendar Settings
              </button>
              <div className="menu-divider" />
              <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Horizontal Tab Navigation ── */}
      <div className="talentgraph-tabs-container">
        <div className="talentgraph-tabs">
          <button
            className={`talentgraph-tab ${activeTab === 'job-postings' ? 'active' : ''}`}
            onClick={() => setActiveTab('job-postings')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Job Postings
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Team
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Subscription
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Applications
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Messages
          </button>

          <button
            className={`talentgraph-tab ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Meetings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="talentgraph-main-content">
        {activeTab === 'job-postings' && renderJobPostingsTab()}
        {activeTab === 'team'         && renderTeamTab()}
        {activeTab === 'subscription' && renderSubscriptionTab()}
        {activeTab === 'analytics'    && renderAnalyticsTab()}
        {activeTab === 'applications' && renderApplicationsTab()}

        {activeTab === 'messages' && (
          <div className="content-panel-horizontal" style={{ minHeight: 500 }}>
            <ChatWindow initialConversationId={conversationId} />
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="content-panel-horizontal">
            <MeetingSchedulerTab />
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      {isScheduleInterviewModalOpen && selectedAppForSchedule && (
        <ScheduleInterviewModal
          application={selectedAppForSchedule}
          onClose={() => {
            setIsScheduleInterviewModalOpen(false);
            setSelectedAppForSchedule(null);
          }}
          onScheduled={() => {
            setIsScheduleInterviewModalOpen(false);
            setSelectedAppForSchedule(null);
            fetchApplications();
            showHrToast('Interview scheduled successfully!');
          }}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface JobCardProps {
  job: any;
  actions: { label: string; variant: string; fn: () => void }[];
}

const JobCard: React.FC<JobCardProps> = ({ job, actions }) => {
  const statusKey = (job.status || 'draft').toLowerCase();
  return (
    <div className="hr-job-card">
      <div className="hr-job-card-body">
        <div className="hr-job-card-title">{job.title}</div>
        <div className="hr-job-card-meta">
          {job.location && <><span>{job.location}</span><span className="hr-job-card-meta-sep">·</span></>}
          {(job.employment_type || job.type) && <><span>{job.employment_type || job.type}</span><span className="hr-job-card-meta-sep">·</span></>}
          {job.created_at && <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="hr-job-card-actions">
        <span className={`hr-status-badge ${statusKey}`}>{job.status || 'draft'}</span>
        {actions.map(({ label, variant, fn }) => (
          <button key={label} className={`hr-action-btn ${variant}`} onClick={fn}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface KPICardProps { label: string; value: number; color: string; stripe: string; }

const KPICard: React.FC<KPICardProps> = ({ label, value, color, stripe }) => (
  <div className="hr-kpi-card">
    <span className="hr-kpi-label">{label}</span>
    <span className="hr-kpi-value" style={{ color }}>{value}</span>
    <div className="hr-kpi-stripe" style={{ background: stripe }} />
  </div>
);

interface FunnelRateProps { label: string; value: number; }

const FunnelRate: React.FC<FunnelRateProps> = ({ label, value }) => (
  <div className="hr-funnel-rate">
    <span className="hr-funnel-rate-label">{label}</span>
    <div className="hr-funnel-bar-track">
      <div className="hr-funnel-bar-fill" style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
    </div>
    <span className="hr-funnel-rate-pct">{value ?? 0}%</span>
  </div>
);

export default HRDashboard;
