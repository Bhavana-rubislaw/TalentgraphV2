import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/PremiumDashboard.css';
import '../styles/PremiumDashboardV2.css';
import '../styles/PremiumCards.css';
import '../styles/PremiumModals.css';
import '../styles/CandidateApplied.css';
import '../styles/AIRecommendations.css';
import '../styles/HorizontalDashboard.css';
import '../styles/CandidatePages.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import { MeetingSchedulerTab } from '../components/meetings';
import { useMeetingsData } from '../hooks/useMeetingsData';
import { useQueryState, parseEnumParam, parseIntParam } from '../hooks/useQueryState';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { useCandidateRecommendations } from '../hooks/useCandidateRecommendations';
import { useCandidateMatches } from '../hooks/useCandidateMatches';
import { useInvites } from '../hooks/useInvites';
import { useAvailableJobs } from '../hooks/useAvailableJobs';
import { useAppliedLiked } from '../hooks/useAppliedLiked';
import { useJobProfiles } from '../hooks/useJobProfiles';
import { useCandidateProfile } from '../hooks/useCandidateProfile';
import DetailDrawer from '../components/common/DetailDrawer';
import CandidateMatchesTab from '../components/candidate/CandidateMatchesTab';
import InvitesTab from '../components/candidate/InvitesTab';
import AvailableJobsTab from '../components/candidate/AvailableJobsTab';
import AppliedLikedTab from '../components/candidate/AppliedLikedTab';
import CandidateRecommendationsTab from '../components/candidate/CandidateRecommendationsTab';

const CANDIDATE_TABS = ['recommendations', 'invites', 'available', 'applied', 'matches', 'messages', 'meetings'] as const;

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getParam, setParam } = useQueryState();

  // ── Tab: driven from ?tab= URL param (survives refresh) ──────────
  const activeTab: string = parseEnumParam(getParam('tab'), CANDIDATE_TABS, 'recommendations');

  const setActiveTab = useCallback(
    (tab: string) => {
      // Don't use replace:true here - we want tab changes in browser history for back button
      setParam('tab', tab, { replace: false });
    },
    [setParam]
  );

  // ── Selected profile: driven from ?profile= URL param ───────
  const selectedProfileId = parseIntParam(getParam('profile'));

  const setSelectedProfileId = useCallback(
    (id: number | null) => {
      setParam('profile', id != null ? String(id) : null, { replace: true });
    },
    [setParam]
  );

  const { recommendations, setRecommendations, loading, fetchRecommendations } = useCandidateRecommendations(selectedProfileId);
  const { matches, setMatches, fetchMatches } = useCandidateMatches();
  const { invites, setInvites, fetchInvites } = useInvites();
  const { availableJobs, setAvailableJobs, fetchAvailableJobs } = useAvailableJobs();
  const { appliedLiked, fetchAppliedLiked } = useAppliedLiked();
  const { jobProfiles, fetchJobProfiles } = useJobProfiles(getParam, setSelectedProfileId);
  const { userProfile, fetchUserProfile } = useCandidateProfile();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!showProfileMenu) return;
    // Compute position from the trigger button wrapper
    if (profileMenuRef.current) {
      const rect = profileMenuRef.current.getBoundingClientRect();
      setProfileMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showProfileMenu]);

  useOutsideClick(showProfileMenu, () => setShowProfileMenu(false), [profileMenuRef, profileDropdownRef]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState<number | null>(null);

  // ── Profile Selection Modal for Applications ──────────────────────
  const [showProfileSelectionModal, setShowProfileSelectionModal] = useState(false);
  const [pendingApplicationJobId, setPendingApplicationJobId] = useState<number | null>(null);

  // ── Upcoming Interviews ──────────────────────────────────
  const { meetings: allMeetings, loadMeetings } = useMeetingsData();

  useEffect(() => {
    fetchUserProfile();
    fetchJobProfiles();
    fetchInvites();
    fetchAvailableJobs();
    fetchAppliedLiked();
    fetchMatches();
    loadMeetings({});
  }, []);

  // Poll for application status updates every 30 seconds when on Applied tab
  useEffect(() => {
    if (activeTab === 'applied') {
      // Refresh immediately when switching to Applied tab
      fetchAppliedLiked();
      
      // Set up polling interval
      const pollInterval = setInterval(() => {
        fetchAppliedLiked();
      }, 30000); // 30 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeTab]);

  const handleSwipeLike = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    
    // Check if already liked - if so, undo instead
    const alreadyLiked = recommendations.find(r => r.job_posting.id === jobPostingId && r.already_swiped && r.swipe_action === 'like');
    
    if (alreadyLiked) {
      // Undo the like
      try {
        await apiClient.undoSwipe(jobPostingId);
        // Update state to remove swipe
        setRecommendations(prev => prev.map(r =>
          r.job_posting.id === jobPostingId
            ? { ...r, already_swiped: false, swipe_action: null }
            : r
        ));
        fetchMatches();
        fetchAppliedLiked();
      } catch (error) {
        console.error('[API ERROR] Failed to undo like:', error);
        alert('Failed to undo like');
      }
    } else {
      // Like the job
      try {
        await apiClient.swipeLike(selectedProfileId, jobPostingId);
        // Optimistically update so card stays visible with "Liked" status
        setRecommendations(prev => prev.map(r =>
          r.job_posting.id === jobPostingId
            ? { ...r, already_swiped: true, swipe_action: 'like' }
            : r
        ));
        fetchMatches();
        fetchAppliedLiked();
      } catch (error) {
        console.error('[API ERROR] Failed to like job:', error);
        alert('Failed to like job');
      }
    }
  };

  const handleSwipePass = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    
    // Check if already passed - if so, undo instead
    const alreadyPassed = recommendations.find(r => r.job_posting.id === jobPostingId && r.already_swiped && r.swipe_action === 'pass');
    
    if (alreadyPassed) {
      // Undo the pass
      try {
        await apiClient.undoSwipe(jobPostingId);
        // Update state to remove swipe
        setRecommendations(prev => prev.map(r =>
          r.job_posting.id === jobPostingId
            ? { ...r, already_swiped: false, swipe_action: null }
            : r
        ));
      } catch (error) {
        console.error('[API ERROR] Failed to undo pass:', error);
        alert('Failed to undo pass');
      }
    } else {
      // Pass on the job
      try {
        await apiClient.swipePass(selectedProfileId, jobPostingId);
        // Optimistically mark as passed — card stays visible with Passed badge
        setRecommendations(prev => prev.map(r =>
          r.job_posting.id === jobPostingId
            ? { ...r, already_swiped: true, swipe_action: 'pass' }
            : r
        ));
      } catch (error) {
        console.error('[API ERROR] Failed to pass on job:', error);
        alert('Failed to pass on job');
      }
    }
  };

  const handleApply = async (jobPostingId: number) => {
    // Check if already applied - if so, withdraw instead
    const appliedJob = appliedLiked.applied_jobs?.find((job: any) => job.job_id === jobPostingId);
    
    if (appliedJob?.application_id) {
      // Withdraw the application
      await handleWithdrawApplication(appliedJob.application_id, jobPostingId);
    } else {
      // Show profile selection modal to apply
      setPendingApplicationJobId(jobPostingId);
      setShowProfileSelectionModal(true);
    }
  };

  const handleApplyFromMatch = async (jobPostingId: number, _jobProfileId: number) => {
    // Check if already applied - if so, withdraw instead
    const appliedJob = appliedLiked.applied_jobs?.find((job: any) => job.job_id === jobPostingId);
    
    if (appliedJob?.application_id) {
      // Withdraw the application
      await handleWithdrawApplication(appliedJob.application_id, jobPostingId);
    } else {
      // For matches, show profile selection modal
      setPendingApplicationJobId(jobPostingId);
      setShowProfileSelectionModal(true);
    }
  };

  // Records a real like/swipe for a mutual match's job posting (some seeded
  // matches don't have a backing Swipe row), so it reliably shows up in the
  // Applied tab's Liked section. apiClient.swipeLike is idempotent — a
  // match is already candidate_liked=True, so this just backfills or no-ops.
  const handleLikeFromMatch = async (jobPostingId: number, jobProfileId: number) => {
    try {
      await apiClient.swipeLike(jobProfileId, jobPostingId);
      fetchAppliedLiked();
    } catch (error) {
      console.error('[API ERROR] Failed to like job:', error);
      alert('Failed to like job');
    }
  };

  const handleApplyFromInvite = async (jobPostingId: number, _jobProfileId: number) => {
    // Check if already applied - if so, withdraw instead
    const appliedJob = appliedLiked.applied_jobs?.find((job: any) => job.job_id === jobPostingId);
    
    if (appliedJob?.application_id) {
      // Withdraw the application
      await handleWithdrawApplication(appliedJob.application_id, jobPostingId);
    } else {
      // For invites, show profile selection modal
      setPendingApplicationJobId(jobPostingId);
      setShowProfileSelectionModal(true);
    }
  };

  // Withdraw application
  const handleWithdrawApplication = async (applicationId: number, jobPostingId: number) => {
    setWithdrawingJobId(jobPostingId);
    
    try {
      await apiClient.withdrawApplication(applicationId);
      // Update recommendations state to show as not applied
      setRecommendations(prev => prev.map(r =>
        r.job_posting.id === jobPostingId
          ? { ...r, already_applied: false }
          : r
      ));
      
      // Update available jobs state
      setAvailableJobs(prev => prev.map(job =>
        job.id === jobPostingId
          ? { ...job, already_applied: false }
          : job
      ));
      
      // Update matches state
      setMatches(prev => prev.map(m =>
        m.job_posting.id === jobPostingId
          ? { ...m, already_applied: false }
          : m
      ));

      // Update invites state
      setInvites(prev => prev.map(inv =>
        inv.job_posting.id === jobPostingId
          ? { ...inv, already_applied: false }
          : inv
      ));
      
      // Refresh applied/liked list to remove from applied tab
      fetchAppliedLiked();
      
    } catch (error: any) {
      const httpStatus = error?.response?.status;
      const msg = error?.response?.data?.detail;
      console.error('[APPLICATION WITHDRAW ERROR]', httpStatus ?? 'network error', msg ?? error?.message);
      if (!httpStatus) {
        // Network/CORS error — backend may have still processed it; refresh to show actual state
        fetchAppliedLiked();
      } else {
        alert(typeof msg === 'string' ? msg : 'Failed to withdraw application. Please try again.');
      }
    } finally {
      setWithdrawingJobId(null);
    }
  };

  // Actual application submission after profile is selected from modal
  const submitApplicationWithProfile = async (jobPostingId: number, selectedJobProfileId: number) => {
    // Check if already applied (should not happen as UI should prevent it, but be safe)
    const alreadyAppliedInRecs = recommendations.find(r => r.job_posting.id === jobPostingId)?.already_applied;
    const alreadyAppliedInAvailable = availableJobs.find(j => j.id === jobPostingId)?.already_applied;
    const alreadyAppliedInMatches = matches.find(m => m.job_posting.id === jobPostingId)?.already_applied;
    const alreadyAppliedInInvites = invites.find(inv => inv.job_posting.id === jobPostingId)?.already_applied;
    
    if (alreadyAppliedInRecs || alreadyAppliedInAvailable || alreadyAppliedInMatches || alreadyAppliedInInvites) {
      return;
    }
    setApplyingJobId(jobPostingId);
    
    try {
      await apiClient.applyToJob(jobPostingId, selectedJobProfileId);
      // Update recommendations state to show Applied
      setRecommendations(prev => prev.map(r =>
        r.job_posting.id === jobPostingId
          ? { ...r, already_applied: true }
          : r
      ));
      
      // Update available jobs state to add already_applied flag
      setAvailableJobs(prev => prev.map(job =>
        job.id === jobPostingId
          ? { ...job, already_applied: true }
          : job
      ));
      
      // Update matches state
      setMatches(prev => prev.map(m =>
        m.job_posting.id === jobPostingId
          ? { ...m, already_applied: true }
          : m
      ));

      // Update invites state
      setInvites(prev => prev.map(inv =>
        inv.job_posting.id === jobPostingId
          ? { ...inv, already_applied: true }
          : inv
      ));
      
      // Refresh applied/liked list to show in that tab
      fetchAppliedLiked();
      
    } catch (error: any) {
      const msg = error?.response?.data?.detail;
      // If already applied (400), show as Applied
      if (error?.response?.status === 400 && typeof msg === 'string' && msg.toLowerCase().includes('already applied')) {
        // Update local state to show Applied
        setRecommendations(prev => prev.map(r =>
          r.job_posting.id === jobPostingId
            ? { ...r, already_applied: true }
            : r
        ));
        setAvailableJobs(prev => prev.map(job =>
          job.id === jobPostingId
            ? { ...job, already_applied: true }
            : job
        ));
        setMatches(prev => prev.map(m =>
          m.job_posting.id === jobPostingId
            ? { ...m, already_applied: true }
            : m
        ));
        setInvites(prev => prev.map(inv =>
          inv.job_posting.id === jobPostingId
            ? { ...inv, already_applied: true }
            : inv
        ));
        
        // Refresh applied/liked list
        fetchAppliedLiked();
      } else {
        // Real error - show alert
        alert(typeof msg === 'string' ? msg : 'Failed to apply. Please try again.');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  


  const renderRecommendationsTab = () => (
    <CandidateRecommendationsTab
      jobProfiles={jobProfiles}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedProfileId={selectedProfileId}
      setSelectedProfileId={setSelectedProfileId}
      recommendations={recommendations}
      loading={loading}
      fetchRecommendations={fetchRecommendations}
      handleSwipePass={handleSwipePass}
      handleSwipeLike={handleSwipeLike}
      handleApply={handleApply}
      applyingJobId={applyingJobId}
      withdrawingJobId={withdrawingJobId}
      allMeetings={allMeetings}
    />
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'recommendations':
        return renderRecommendationsTab();
      case 'invites':
        return (
          <InvitesTab
            invites={invites}
            applyingJobId={applyingJobId}
            withdrawingJobId={withdrawingJobId}
            handleApplyFromInvite={handleApplyFromInvite}
          />
        );
      case 'available':
        return (
          <AvailableJobsTab
            availableJobs={availableJobs}
            applyingJobId={applyingJobId}
            withdrawingJobId={withdrawingJobId}
            handleApply={handleApply}
            handleSwipeLike={handleSwipeLike}
          />
        );
      case 'applied':
        return (
          <AppliedLikedTab
            appliedLiked={appliedLiked}
            setActiveTab={setActiveTab}
            applyingJobId={applyingJobId}
            withdrawingJobId={withdrawingJobId}
            handleApply={handleApply}
            handleWithdrawApplication={handleWithdrawApplication}
          />
        );
      case 'matches':
        return (
          <CandidateMatchesTab
            matches={matches}
            setActiveTab={setActiveTab}
            applyingJobId={applyingJobId}
            withdrawingJobId={withdrawingJobId}
            handleApplyFromMatch={handleApplyFromMatch}
            handleLikeFromMatch={handleLikeFromMatch}
          />
        );
      case 'messages':
        return <ChatWindow candidateMatches={matches} />;
      case 'meetings':
        return <MeetingSchedulerTab role="candidate" />;
      default:
        return renderRecommendationsTab();
    }
  };

  // Derive userName and userInitial for top navbar
  const userName = userProfile?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="horizontal-dashboard candidate-dashboard">
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
          <NotificationBellDrawer role="candidate" />

          <div ref={profileMenuRef}>
          <button className="talentgraph-user-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="talentgraph-user-avatar">{userInitial}</div>
            <div className="talentgraph-user-info">
              <div className="talentgraph-user-name">{userName}</div>
              <div className="talentgraph-user-role">Candidate</div>
            </div>
          </button>
          </div>

          {showProfileMenu && ReactDOM.createPortal(
            <div
              ref={profileDropdownRef}
              className="profile-menu"
              style={{ position: 'fixed', top: `${profileMenuPos.top}px`, right: `${profileMenuPos.right}px`, zIndex: 10001 }}
            >
              <button onClick={() => { setShowProfileMenu(false); navigate('/candidate/profile'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>
              <button onClick={() => { setShowProfileMenu(false); navigate('/candidate/job-preferences'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                </svg>
                Job Preferences
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
            </div>,
            document.body
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
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Recommendations
            {recommendations.length > 0 && (
              <span className="talentgraph-tab-badge">{recommendations.length}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Invites
            {invites.length > 0 && (
              <span className="talentgraph-tab-badge">{invites.length}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
            Available
            {availableJobs.length > 0 && (
              <span className="talentgraph-tab-badge">{availableJobs.length}</span>
            )}
          </button>

          <button 
            className={`talentgraph-tab ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            Applied
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
            <span className="talentgraph-tab-badge">5</span>
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
            onClick={() => navigate('/candidate/job-preferences')}
          >
            <svg className="talentgraph-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            + Post Job Preference
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="talentgraph-main-content">
        <div className={activeTab === 'recommendations' ? 'candidate-dashboard-grid' : 'candidate-dashboard-stack'}>
        {/* Welcome Banner with KPI Cards — only on Recommendations tab */}
        {activeTab === 'recommendations' && (
          <aside className="welcome-banner-modern candidate-kpi-rail" aria-label="Candidate KPI summary">
            <div className="welcome-header-compact">
              <div className="welcome-avatar-compact">
                <div className="avatar-circle-compact">{userInitial}</div>
              </div>
              <div className="welcome-text-compact">
                <h1 className="welcome-title-compact">Welcome back, {userName}</h1>
                <p className="welcome-subtitle-compact">Explore AI-matched opportunities • {jobProfiles.length} job {jobProfiles.length === 1 ? 'profile' : 'profiles'} active</p>
              </div>
            </div>
            <div className="kpi-banner-container">
              <div className="kpi-card kpi-card-green">
              <div className="kpi-card-top">
                <span className="kpi-title">MATCH SCORE</span>
                <div className="kpi-icon-wrapper kpi-icon-green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {recommendations.length > 0
                    ? Math.round(recommendations.reduce((sum: number, r: any) => sum + (r.match_percentage || 0), 0) / recommendations.length)
                    : 0}%
                </span>
                <span className="kpi-badge kpi-badge-green">avg</span>
              </div>
              <p className="kpi-subtitle">Across all recommendations</p>
            </div>
            <div className="kpi-card kpi-card-blue">
              <div className="kpi-card-top">
                <span className="kpi-title">NEW RECOMMENDATIONS</span>
                <div className="kpi-icon-wrapper kpi-icon-blue">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{recommendations.length || 0}</span>
                <span className="kpi-badge kpi-badge-blue">jobs</span>
              </div>
              <p className="kpi-subtitle">Ready to explore</p>
            </div>
            <div className="kpi-card kpi-card-purple">
              <div className="kpi-card-top">
                <span className="kpi-title">PENDING INVITES</span>
                <div className="kpi-icon-wrapper kpi-icon-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{invites.length || 0}</span>
                <span className="kpi-badge kpi-badge-purple">recruiters</span>
              </div>
              <p className="kpi-subtitle">Awaiting your response</p>
            </div>
            <div className="kpi-card kpi-card-orange">
              <div className="kpi-card-top">
                <span className="kpi-title">APPLICATIONS</span>
                <div className="kpi-icon-wrapper kpi-icon-orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{appliedLiked.applied_jobs?.length || 0}</span>
                <span className="kpi-badge kpi-badge-orange">submitted</span>
              </div>
              <p className="kpi-subtitle">
                {/* NOTE: was reading job.application_status === 'in_review', neither of which is
                    a real field/value (applied_jobs uses status: 'under_review') — always showed 0. */}
                {appliedLiked.applied_jobs?.filter((job) => job.status === 'under_review').length || 0} in active review
              </p>
            </div>
            </div>
          </aside>
        )}

        {/* Tab Content */}
        <div className={`content-panel-horizontal${activeTab === 'messages' ? ' messages-tab-active' : ''}${activeTab === 'recommendations' ? ' recommendations-tab-active' : ''}${activeTab === 'invites' ? ' invites-tab-active' : ''}${activeTab === 'available' ? ' available-tab-active' : ''}${activeTab === 'matches' ? ' matches-tab-active' : ''}`}>
          {renderActiveTab()}
        </div>
        </div>
      </div>

      {/* Profile Selection Modal for Applications */}
      {showProfileSelectionModal && pendingApplicationJobId && (
        <DetailDrawer
          onClose={() => { setShowProfileSelectionModal(false); setPendingApplicationJobId(null); }}
          modalStyle={{ maxWidth: '600px', width: '90%' }}
        >
            <div className="cal-drawer-header">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
                Select Job Profile
              </h2>
              <button 
                onClick={() => { setShowProfileSelectionModal(false); setPendingApplicationJobId(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                ×
              </button>
            </div>
            
            <div className="cal-drawer-content" style={{ padding: '24px' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#64748b', 
                marginBottom: '24px',
                lineHeight: '1.6'
              }}>
                Choose which job profile you want to use for this application. The recruiter will see only the selected profile's details.
              </p>

              {jobProfiles.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#94a3b8' }}
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    No Job Profiles Found
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                    You need to create at least one job profile before applying to jobs.
                  </p>
                  <button
                    onClick={() => {
                      setShowProfileSelectionModal(false);
                      setPendingApplicationJobId(null);
                      navigate('/candidate/job-preferences');
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Create Job Profile
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {jobProfiles.map((profile: any) => (
                    <div
                      key={profile.id}
                      onClick={() => {
                        submitApplicationWithProfile(pendingApplicationJobId, profile.id);
                        setShowProfileSelectionModal(false);
                        setPendingApplicationJobId(null);
                      }}
                      style={{
                        padding: '16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            color: '#1a1a1a',
                            marginBottom: '8px'
                          }}>
                            {profile.profile_name}
                          </h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {profile.job_role && (
                              <span style={{
                                fontSize: '12px',
                                padding: '4px 10px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                fontWeight: 500
                              }}>
                                {profile.job_role}
                              </span>
                            )}
                            {profile.years_of_experience && (
                              <span style={{
                                fontSize: '12px',
                                padding: '4px 10px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                fontWeight: 500
                              }}>
                                {profile.years_of_experience} yrs exp
                              </span>
                            )}
                            {profile.worktype && (
                              <span style={{
                                fontSize: '12px',
                                padding: '4px 10px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                fontWeight: 500
                              }}>
                                {profile.worktype}
                              </span>
                            )}
                          </div>
                          {profile.profile_summary && (
                            <p style={{
                              fontSize: '13px',
                              color: '#64748b',
                              lineHeight: '1.5',
                              margin: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {profile.profile_summary}
                            </p>
                          )}
                        </div>
                        <svg 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                          style={{ width: '20px', height: '20px', color: '#2563eb', flexShrink: 0, marginLeft: '12px' }}
                        >
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DetailDrawer>
      )}
    </div>
  );
};

export default CandidateDashboard;
