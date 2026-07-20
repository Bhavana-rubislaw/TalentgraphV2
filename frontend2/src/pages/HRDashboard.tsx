import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import HRJobPostingsTab from '../components/hr/HRJobPostingsTab';
import HRAnalyticsTab from '../components/hr/HRAnalyticsTab';
import HRApplicationsTab from '../components/hr/HRApplicationsTab';

const HR_TABS = ['job-postings', 'team', 'subscription', 'analytics', 'applications', 'messages', 'meetings'] as const;
type HRTab = typeof HR_TABS[number];

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
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'applications') fetchApplications();
  }, [activeTab, fetchJobs, fetchAnalytics, fetchApplications]);

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
        {activeTab === 'job-postings' && (
          <HRJobPostingsTab
            allJobs={allJobs}
            setAllJobs={setAllJobs}
            jobsLoading={jobsLoading}
            jpSearch={jpSearch}
            setJpSearch={setJpSearch}
            jpStatusFilter={jpStatusFilter}
            setJpStatusFilter={setJpStatusFilter}
            jpCurrentPage={jpCurrentPage}
            setJpCurrentPage={setJpCurrentPage}
            jpShowCancelModal={jpShowCancelModal}
            setJpShowCancelModal={setJpShowCancelModal}
            jpCancelReason={jpCancelReason}
            setJpCancelReason={setJpCancelReason}
            jpSelectedId={jpSelectedId}
            setJpSelectedId={setJpSelectedId}
            jpCardMenuOpenId={jpCardMenuOpenId}
            setJpCardMenuOpenId={setJpCardMenuOpenId}
            jpToast={jpToast}
            setJpToast={setJpToast}
            JP_PAGE_SIZE={JP_PAGE_SIZE}
            fetchJobs={fetchJobs}
            navigate={navigate}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'team' && (
          <div className="content-panel-horizontal hr-tab-panel">
            <div className="hr-panel-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="hr-panel-title">Team Management</h2>
                <p className="hr-panel-subtitle">Invite, manage, and assign roles to your company team members.</p>
              </div>
            </div>
            <TeamManager userRole={(user?.role || localStorage.getItem('role') || 'hr').toLowerCase()} />
          </div>
        )}
        {activeTab === 'subscription' && (
          <div className="content-panel-horizontal hr-tab-panel">
            <div className="hr-panel-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="hr-panel-title">Subscription &amp; Credits</h2>
                <p className="hr-panel-subtitle">Manage your company subscription plan and credit balance.</p>
              </div>
            </div>
            <SubscriptionPage userRole={(user?.role || localStorage.getItem('role') || 'hr').toLowerCase()} />
          </div>
        )}
        {activeTab === 'analytics' && (
          <HRAnalyticsTab
            analyticsLoading={analyticsLoading}
            analyticsRange={analyticsRange}
            setAnalyticsRange={setAnalyticsRange}
            hrAnalytics={hrAnalytics}
          />
        )}
        {activeTab === 'applications' && (
          <HRApplicationsTab
            appNotes={appNotes}
            setAppNotes={setAppNotes}
            appSearch={appSearch}
            setAppSearch={setAppSearch}
            appSortOrder={appSortOrder}
            setAppSortOrder={setAppSortOrder}
            appStatusFilter={appStatusFilter}
            setAppStatusFilter={setAppStatusFilter}
            applications={applications}
            appsLoading={appsLoading}
            copyToClipboard={copyToClipboard}
            filteredApplications={filteredApplications}
            handleDownloadCertification={handleDownloadCertification}
            handleDownloadResume={handleDownloadResume}
            handleSaveApplicationNotes={handleSaveApplicationNotes}
            handleStartDirectMessage={handleStartDirectMessage}
            handleUpdateApplicationStatus={handleUpdateApplicationStatus}
            hrToast={hrToast}
            selectedApp={selectedApp}
            selectedAppId={selectedAppId}
            setSelectedAppId={setSelectedAppId}
            setIsScheduleInterviewModalOpen={setIsScheduleInterviewModalOpen}
            setSelectedAppForSchedule={setSelectedAppForSchedule}
            showHrToast={showHrToast}
          />
        )}

        {activeTab === 'messages' && (
          <div className="content-panel-horizontal" style={{ minHeight: 500 }}>
            <ChatWindow />
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
          isOpen={isScheduleInterviewModalOpen}
          application={selectedAppForSchedule}
          onClose={() => {
            setIsScheduleInterviewModalOpen(false);
            setSelectedAppForSchedule(null);
          }}
          onSuccess={() => {
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

export default HRDashboard;
