import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/PremiumDashboard.css';
import '../styles/PremiumDashboardV2.css';
import '../styles/PremiumCards.css';
import '../styles/PremiumModals.css';
import '../styles/RecruiterApplications.css';
import '../styles/HorizontalDashboard.css';
import '../styles/AIRecommendations.css';
import '../styles/CandidatePages.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import ScheduleInterviewModal from '../components/interviews/ScheduleInterviewModal';
import { MeetingSchedulerTab } from '../components/meetings';
import { useMeetingsData } from '../hooks/useMeetingsData';
import { useQueryState, parseEnumParam } from '../hooks/useQueryState';
import { useApplications } from '../hooks/useApplications';
import { useRecruiterMatches } from '../hooks/useRecruiterMatches';
import { useJobPostings } from '../hooks/useJobPostings';
import { useShortlist } from '../hooks/useShortlist';
import { useRecruiterRecommendations } from '../hooks/useRecruiterRecommendations';
import { useRecruiterProfile } from '../hooks/useRecruiterProfile';
import { useBrowseCandidates } from '../hooks/useBrowseCandidates';
import RecruiterMatchesTab from '../components/recruiter/RecruiterMatchesTab';
import RecruiterRecommendationsTab from '../components/recruiter/RecruiterRecommendationsTab';
import ShortlistTab from '../components/recruiter/ShortlistTab';
import ApplicationsTab from '../components/recruiter/ApplicationsTab';
import BrowseCandidatesTab from '../components/recruiter/BrowseCandidatesTab';

const RECRUITER_TABS = ['recommendations', 'shortlist', 'applications', 'matches', 'browse', 'messages', 'meetings'] as const;

const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getParam, setParam, setParams } = useQueryState();

  // ── Tab: driven from ?tab= URL param ────────────────────────
  const activeTab: string = parseEnumParam(getParam('tab'), RECRUITER_TABS, 'recommendations');

  const setActiveTab = useCallback(
    (tab: string) => {
      // Don't use replace:true here - we want tab changes in browser history for back button
      setParam('tab', tab, { replace: false });
    },
    [setParam]
  );
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isScheduleInterviewModalOpen, setIsScheduleInterviewModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<any | null>(null);

  // ── Selected job: driven from ?job= URL param ─────────────────
  // Start as null; fetchJobPostings() validates the URL param against actual jobs
  const [selectedJobId, setSelectedJobIdInternal] = useState<number | null>(null);

  const setSelectedJobId = useCallback(
    (id: number | null) => {
      setSelectedJobIdInternal(id);
      setParam('job', id != null ? String(id) : null, { replace: true });
    },
    [setParam]
  );
  const { allJobPostings, jobPostings, fetchJobPostings } = useJobPostings(getParam, setSelectedJobId);

  const { recommendations, setRecommendations, loading } = useRecruiterRecommendations(selectedJobId);
  const { shortlist, setShortlist, fetchShortlist } = useShortlist();
  const {
    applications,
    applicationsLoading,
    fetchApplications,
    updateApplicationStatus,
    saveApplicationNotes,
    downloadResume,
    downloadCertification,
  } = useApplications();
  const { matches, fetchMatches } = useRecruiterMatches();

  // ── Browse Candidates state ─────────────────────────────────────
  const { browseCandidates, setBrowseCandidates, browseTotal, browseLoading, fetchBrowseCandidates } = useBrowseCandidates();
  const [browsePage, setBrowsePage] = useState(1);
  const [browseLimit] = useState(6);
  const [browseSearch, setBrowseSearch] = useState('');
  const [debouncedBrowseSearch, setDebouncedBrowseSearch] = useState('');
  const [browseRole, setBrowseRole] = useState('');
  const [browseWorkType, setBrowseWorkType] = useState('');
  const [browseLocation, setBrowseLocation] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  // Used by RecruiterRecommendationsTab's "jump to Applications filtered by status" quick links
  const setAppStatusFilter = useCallback(
    (value: string) => setParam('appStatus', value === 'all' ? null : value, { replace: true }),
    [setParam]
  );

  const { meetings: allMeetings, loadMeetings } = useMeetingsData();

  const userEmail = localStorage.getItem('email') || 'recruiter@company.com';
  const { userFullName, companyName, userRole, fetchProfile } = useRecruiterProfile();

  const userName = userFullName || userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1);
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchJobPostings();
    fetchShortlist();
    fetchMatches();
    loadMeetings({});
  }, []);

  // Debounce search input to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBrowseSearch(browseSearch);
    }, 500); // Wait 500ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [browseSearch]);

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchBrowseCandidates({
        page: browsePage,
        limit: browseLimit,
        search: debouncedBrowseSearch || undefined,
        work_type: browseWorkType || undefined,
        location: browseLocation || undefined,
      });
    }
  }, [activeTab, browsePage, debouncedBrowseSearch, browseRole, browseWorkType, browseLocation]);

  // ── Fetch Data Functions ─────────────────────────────────────

  const handleRecruiterLike = async (candidateId: number, jobProfileId: number) => {
    if (!selectedJobId) return;
    try {
      await apiClient.recruiterLike(candidateId, jobProfileId, selectedJobId);
      // Optimistic update — card stays with Shortlisted badge
      setRecommendations((prev: any) => ({
        ...prev,
        recommendations: prev.recommendations.map((r: any) =>
          r.candidate.id === candidateId && r.job_profile.id === jobProfileId
            ? { ...r, already_actioned: true, action_taken: 'like' }
            : r
        )
      }));
      fetchShortlist();
      fetchMatches();
    } catch (error: any) {
      console.error('[API ERROR] Failed to like candidate:', error);
      alert(`Failed to like candidate: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleRecruiterPass = async (candidateId: number, jobProfileId: number) => {
    if (!selectedJobId) return;
    try {
      await apiClient.recruiterPass(candidateId, jobProfileId, selectedJobId);
      // Optimistic update — card stays with Passed badge
      setRecommendations((prev: any) => ({
        ...prev,
        recommendations: prev.recommendations.map((r: any) =>
          r.candidate.id === candidateId && r.job_profile.id === jobProfileId
            ? { ...r, already_actioned: true, action_taken: 'pass' }
            : r
        )
      }));
    } catch (error) {
      console.error('[API ERROR] Failed to pass candidate:', error);
      alert('Failed to pass candidate');
    }
  };

  const handleAskToApply = async (candidateId: number, jobProfileId: number) => {
    if (!selectedJobId) return;
    try {
      // Send invitation
      await apiClient.recruiterAskToApply(candidateId, jobProfileId, selectedJobId);
      // Optimistic update — recommendation cards
      setRecommendations((prev: any) => {
        if (!prev || !prev.recommendations) return prev;
        return {
          ...prev,
          recommendations: prev.recommendations.map((r: any) =>
            r.candidate.id === candidateId && r.job_profile.id === jobProfileId
              ? { ...r, already_actioned: true, action_taken: 'ask_to_apply' }
              : r
          )
        };
      });
      
      // Optimistic update — browse candidates
      setBrowseCandidates((prev) =>
        prev.map((c) =>
          c.candidate_id === candidateId
            ? { ...c, already_invited: true }
            : c
        )
      );
      
      // Optimistic update — shortlist cards
      setShortlist((prev) =>
        prev.map((item: any) =>
          item.candidate.id === candidateId && item.job_profile?.id === jobProfileId
            ? { ...item, already_invited: true }
            : item
        )
      );
      
      fetchShortlist();
    } catch (error) {
      console.error('[API ERROR] Failed to send invitation:', error);
      alert('Failed to send invitation');
    }
  };

  const handleStartMessage = async (candidateUserId: number) => {
    if (!candidateUserId) {
      alert('Cannot start conversation: Invalid candidate user ID');
      return;
    }
    try {
      const res = await apiClient.startConversation(candidateUserId);
      const convId = res.data.conversation.id;
      
      // Navigate to messages tab with conversation
      setParams({ tab: 'messages', c: String(convId) }, { replace: false });
    } catch (err: any) {
      console.error('[MESSAGE ERROR] Failed to start conversation:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start conversation';
      alert(`Unable to start conversation: ${errorMessage}`);
    }
  };

  const handleStartDirectMessage = async (candidateUserId: number) => {
    // Validate that we have a valid user ID
    if (!candidateUserId) {
      alert('Cannot start conversation: Invalid candidate user ID');
      return;
    }

    try {
      const res = await apiClient.startConversation(candidateUserId);
      const convId = res.data.conversation.id;
      
      // Navigate to messages tab with conversation
      setParams({ tab: 'messages', c: String(convId) }, { replace: false });
    } catch (err: any) {
      console.error('[MESSAGE ERROR] Failed to start conversation:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start conversation';
      alert(`Unable to start conversation: ${errorMessage}`);
    }
  };

  return (
    <div className="horizontal-dashboard">
      {/* Top Navigation Bar */}
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
        </div>

        <div className="talentgraph-topnav-center">
        </div>

        <div className="talentgraph-topnav-right">
          <NotificationBellDrawer role="recruiter" />

          <button className="talentgraph-user-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="talentgraph-user-avatar">{userInitial}</div>
            <div className="talentgraph-user-info">
              <div className="talentgraph-user-name">{userName}</div>
              <div className="talentgraph-user-role">Recruiter {userRole !== 'admin' && `• ${companyName}`}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="profile-menu" style={{ position: 'absolute', top: '60px', right: '32px', zIndex: 1000 }}>
              <button onClick={() => { setShowProfileMenu(false); navigate('/recruiter/profile'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <button onClick={() => { setShowProfileMenu(false); navigate('/recruiter/job-postings'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Job Postings
              </button>
              <button onClick={() => { setShowProfileMenu(false); navigate('/meetings'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Meetings
              </button>
              <div className="menu-divider"></div>
              <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="talentgraph-tabs-container">
        <div className="talentgraph-tabs">
          <button 
            className={`talentgraph-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            AI Recommendations
            <span className="talentgraph-tab-badge-ai">AI</span>
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            Browse
            {browseTotal > 0 && (
              <span className="talentgraph-tab-badge">{browseTotal}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'shortlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortlist')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            Shortlisted
            {shortlist.length > 0 && (
              <span className="talentgraph-tab-badge">{shortlist.length}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Applications
            {applications.length > 0 && (
              <span className="talentgraph-tab-badge">{applications.length}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Matches
            {matches.length > 0 && (
              <span className="talentgraph-tab-badge">{matches.length}</span>
            )}
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

          <button 
            className="talentgraph-tab talentgraph-tab-create"
            onClick={() => navigate('/recruiter/job-postings')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Post Job
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="talentgraph-main-content">
        {/* Welcome Banner with KPI Cards — only on Recommendations tab */}
        {activeTab === 'recommendations' && <div className="welcome-banner-modern">
          <div className="welcome-header-compact">
            <div className="welcome-avatar-compact">
              <div className="avatar-circle-compact">{userInitial}</div>
            </div>
            <div className="welcome-text-compact">
              <h1 className="welcome-title-compact">Welcome back, {userName}</h1>
              <p className="welcome-subtitle-compact">Manage your recruitment pipeline • {companyName}</p>
            </div>
          </div>

          {/* KPI Banner */}
          <div className="kpi-banner-container">
            <div className="kpi-card kpi-card-green">
              <div className="kpi-card-top">
                <span className="kpi-title">ACTIVE JOBS</span>
                <div className="kpi-icon-wrapper kpi-icon-green">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{jobPostings.length}</span>
                <span className="kpi-badge kpi-badge-green">open</span>
              </div>
              <p className="kpi-subtitle">{allJobPostings.filter(j => (j.status || '').toLowerCase() === 'frozen').length} frozen positions</p>
            </div>

            <div className="kpi-card kpi-card-blue">
              <div className="kpi-card-top">
                <span className="kpi-title">SHORTLISTED</span>
                <div className="kpi-icon-wrapper kpi-icon-blue">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{shortlist.length}</span>
                <span className="kpi-badge kpi-badge-blue">saved</span>
              </div>
              <p className="kpi-subtitle">Top talent candidates</p>
            </div>

            <div className="kpi-card kpi-card-purple">
              <div className="kpi-card-top">
                <span className="kpi-title">APPLICATIONS</span>
                <div className="kpi-icon-wrapper kpi-icon-purple">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1" fill="none"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{applications.length}</span>
                <span className="kpi-badge kpi-badge-purple">pending</span>
              </div>
              <p className="kpi-subtitle">Awaiting review</p>
            </div>

            <div className="kpi-card kpi-card-orange">
              <div className="kpi-card-top">
                <span className="kpi-title">MATCHES</span>
                <div className="kpi-icon-wrapper kpi-icon-orange">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{matches.length}</span>
                <span className="kpi-badge kpi-badge-orange">mutual</span>
              </div>
              <p className="kpi-subtitle">Both parties interested</p>
            </div>
          </div>

        </div>}

        {/* Content Panel */}
        <div
          className="content-panel-horizontal"
          style={activeTab === 'recommendations' ? {
            background: '#F8F9FA',
            boxShadow: 'none',
            borderRadius: 0,
            padding: 0
          } : {}}
        >
          <div style={{ display: activeTab === 'recommendations' ? 'block' : 'none' }}>
            <RecruiterRecommendationsTab
              jobPostings={jobPostings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedJobId={selectedJobId}
              setSelectedJobId={setSelectedJobId}
              loading={loading}
              recommendations={recommendations}
              applications={applications}
              setAppStatusFilter={setAppStatusFilter}
              allMeetings={allMeetings}
              handleRecruiterLike={handleRecruiterLike}
              handleRecruiterPass={handleRecruiterPass}
              handleAskToApply={handleAskToApply}
              handleStartMessage={handleStartMessage}
            />
          </div>
          <div style={{ display: activeTab === 'shortlist' ? 'block' : 'none' }}>
            <ShortlistTab
              shortlist={shortlist}
              applications={applications}
              handleAskToApply={handleAskToApply}
              handleStartMessage={handleStartMessage}
              setSelectedAppForSchedule={setSelectedAppForSchedule}
              setIsScheduleInterviewModalOpen={setIsScheduleInterviewModalOpen}
            />
          </div>
          <div style={{ display: activeTab === 'applications' ? 'block' : 'none' }}>
            <ApplicationsTab
              applications={applications}
              applicationsLoading={applicationsLoading}
              jobPostings={jobPostings}
              companyName={companyName}
              userName={userName}
              getParam={getParam}
              setParam={setParam}
              updateApplicationStatus={updateApplicationStatus}
              saveApplicationNotes={saveApplicationNotes}
              downloadResume={downloadResume}
              downloadCertification={downloadCertification}
              handleStartDirectMessage={handleStartDirectMessage}
              setSelectedAppForSchedule={setSelectedAppForSchedule}
              setIsScheduleInterviewModalOpen={setIsScheduleInterviewModalOpen}
              toast={toast}
              showToast={showToast}
            />
          </div>
          <div style={{ display: activeTab === 'matches' ? 'block' : 'none' }}>
            <RecruiterMatchesTab
              matches={matches}
              applications={applications}
              setActiveTab={setActiveTab}
              handleStartMessage={handleStartMessage}
              handleStartDirectMessage={handleStartDirectMessage}
              setSelectedAppForSchedule={setSelectedAppForSchedule}
              setIsScheduleInterviewModalOpen={setIsScheduleInterviewModalOpen}
            />
          </div>
          <div style={{ display: activeTab === 'browse' ? 'block' : 'none' }}>
            <BrowseCandidatesTab
              browseCandidates={browseCandidates}
              browseTotal={browseTotal}
              browseLoading={browseLoading}
              browsePage={browsePage}
              setBrowsePage={setBrowsePage}
              browseLimit={browseLimit}
              browseSearch={browseSearch}
              setBrowseSearch={setBrowseSearch}
              browseRole={browseRole}
              setBrowseRole={setBrowseRole}
              browseWorkType={browseWorkType}
              setBrowseWorkType={setBrowseWorkType}
              browseLocation={browseLocation}
              setBrowseLocation={setBrowseLocation}
              handleRecruiterLike={handleRecruiterLike}
              handleAskToApply={handleAskToApply}
              handleStartDirectMessage={handleStartDirectMessage}
              handleStartMessage={handleStartMessage}
            />
          </div>
          <div style={{ display: activeTab === 'messages' ? 'block' : 'none' }}>
            <ChatWindow />
          </div>
          <div style={{ display: activeTab === 'meetings' ? 'block' : 'none', paddingBottom: 0, marginBottom: 0 }}>
            {activeTab === 'meetings' && <MeetingSchedulerTab role="recruiter" />}
          </div>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      {isScheduleInterviewModalOpen && selectedAppForSchedule && (
        <ScheduleInterviewModal
          isOpen={isScheduleInterviewModalOpen}
          onClose={() => {
            setIsScheduleInterviewModalOpen(false);
            setSelectedAppForSchedule(null);
          }}
          application={selectedAppForSchedule}
          onSuccess={() => {
            // Refresh applications list
            fetchApplications();
            showToast('Interview scheduled successfully!');
          }}
        />
      )}
    </div>
  );
};

export default RecruiterDashboard;
