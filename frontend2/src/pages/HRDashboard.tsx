import React, { useState, useEffect, useCallback } from 'react';
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
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import { MeetingSchedulerTab } from '../components/meetings';

const HR_TABS = ['approvals', 'team', 'analytics', 'applications', 'messages', 'meetings'] as const;
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
    : 'approvals';

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

  // ── Team Management state ──────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // ── Analytics state ────────────────────────────────────────────
  const [hrAnalytics, setHrAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState(30);

  // ── Applications state ─────────────────────────────────────────
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

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
      await apiClient.removeTeamMember(memberId);
      await fetchTeam();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to remove team member';
      alert(msg);
    }
  };

  // ── Initial data load by tab ───────────────────────────────────
  useEffect(() => {
    if (activeTab === 'approvals') fetchJobs();
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'applications') fetchApplications();
  }, [activeTab, fetchJobs, fetchTeam, fetchAnalytics, fetchApplications]);

  // Re-fetch analytics when range changes
  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [analyticsRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render helpers ─────────────────────────────────────────────

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
      <div className="hr-panel-header">
        <div>
          <h2 className="hr-panel-title">Team Management</h2>
          <p className="hr-panel-subtitle">View and manage all company team members.</p>
        </div>
        <button className="hr-refresh-btn" onClick={fetchTeam}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {teamLoading ? (
        <div className="hr-loading"><span className="hr-loading-spinner" />Loading team…</div>
      ) : teamMembers.length === 0 ? (
        <div className="hr-empty"><p className="hr-empty-text">No team members found.</p></div>
      ) : (
        <div className="hr-team-list">
          {teamMembers.map((m: any) => (
            <div key={m.user_id} className="hr-team-member">
              <div className="hr-member-left">
                <div className="hr-member-avatar">
                  {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="hr-member-name">{m.full_name || '—'}</div>
                  <div className="hr-member-email">{m.email}</div>
                </div>
              </div>
              <div className="hr-member-right">
                <span className={`hr-role-badge ${m.role === 'hr' ? 'hr' : m.role === 'recruiter' ? 'recruiter' : m.role === 'admin' ? 'admin' : 'default'}`}>
                  {m.role}
                </span>
                {!m.is_active && <span className="hr-inactive-badge">Inactive</span>}
                {m.is_active && m.role !== 'admin' && (
                  <button
                    className="hr-action-btn remove"
                    onClick={() => handleRemoveTeamMember(m.user_id, m.email)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
    const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
      const s = (a.status || 'applied').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="content-panel-horizontal hr-tab-panel">
        <div className="hr-panel-header">
          <div>
            <h2 className="hr-panel-title">Applications Overview</h2>
            <p className="hr-panel-subtitle">
              Company-wide view of all candidate applications. Use the Recruiter dashboard for detailed screening.
            </p>
          </div>
        </div>

        {appsLoading ? (
          <div className="hr-loading"><span className="hr-loading-spinner" />Loading applications…</div>
        ) : (
          <>
            {/* Status summary grid */}
            <div className="hr-app-status-grid">
              {Object.entries(statusCounts).map(([s, c]) => (
                <div key={s} className="hr-app-status-chip">
                  <div className="hr-app-status-count">{c}</div>
                  <div className="hr-app-status-name">{s}</div>
                </div>
              ))}
            </div>

            {/* Applications list */}
            {applications.length === 0 ? (
              <div className="hr-empty"><p className="hr-empty-text">No applications found.</p></div>
            ) : (
              <div className="hr-app-list">
                {applications.slice(0, 50).map((app: any) => {
                  const st = (app.status || 'applied').toLowerCase();
                  const badgeClass = ['selected','rejected','shortlisted','scheduled'].includes(st) ? st : 'default';
                  return (
                    <div key={app.id} className="hr-app-row">
                      <div>
                        <div className="hr-app-candidate">
                          {app.candidate_name || app.candidate?.full_name || `Candidate #${app.candidate_id}`}
                        </div>
                        <div className="hr-app-job">
                          {app.job_title || app.job_posting?.title || `Job #${app.job_posting_id}`}
                          {app.applied_at && ` · ${new Date(app.applied_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <span className={`hr-app-badge ${badgeClass}`}>{app.status || 'applied'}</span>
                    </div>
                  );
                })}
                {applications.length > 50 && (
                  <p className="hr-more-note">
                    Showing first 50 of {applications.length} applications.
                  </p>
                )}
              </div>
            )}
          </>
        )}
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
            className={`talentgraph-tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Job Approvals
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
        {activeTab === 'approvals'    && renderApprovalsTab()}
        {activeTab === 'team'         && renderTeamTab()}
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
