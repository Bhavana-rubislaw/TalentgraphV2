import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { apiClient } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/PremiumDashboard.css';
import '../styles/PremiumDashboardV2.css';
import '../styles/PremiumCards.css';
import '../styles/PremiumModals.css';
import '../styles/CandidateApplied.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';

const CANDIDATE_TABS = ['recommendations', 'invites', 'available', 'applied', 'matches', 'messages'] as const;

// ── FilterPill: fully custom accessible dropdown ──────────────────────────────
interface FilterPillOption {
  value: string | number;
  label: string;
}
interface FilterPillProps {
  id: string;
  icon: React.ReactNode;
  options: FilterPillOption[];
  value: string | number;
  onChange: (val: string | number) => void;
  ariaLabel?: string;
}
const FilterPill: React.FC<FilterPillProps> = ({ id, icon, options, value, onChange, ariaLabel }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(o => o.value === value) ?? options[0];
  const isActive = value !== options[0]?.value;

  // Calculate menu position when opening
  React.useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 7,
        left: rect.left,
        width: Math.max(rect.width, 190)
      });
    }
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync focused index to current value when opening
  React.useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value);
      setFocusedIdx(idx >= 0 ? idx : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll focused item into view
  React.useEffect(() => {
    if (open && menuRef.current && focusedIdx >= 0) {
      const item = menuRef.current.children[focusedIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if      (e.key === 'Escape')    { setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[focusedIdx].value);
      setOpen(false);
    }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  // Render dropdown menu
  const renderMenu = () => {
    if (!open) return null;
    
    return ReactDOM.createPortal(
      <ul
        ref={menuRef}
        className="rec-filter-menu"
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          minWidth: `${menuPosition.width}px`,
        }}
      >
        {options.map((opt, i) => (
          <li
            key={String(opt.value)}
            className={[
              'rec-filter-menu__option',
              opt.value === value ? 'rec-filter-menu__option--selected'  : '',
              i === focusedIdx    ? 'rec-filter-menu__option--focused'   : '',
            ].filter(Boolean).join(' ')}
            role="option"
            aria-selected={opt.value === value}
            onMouseEnter={() => setFocusedIdx(i)}
            onMouseDown={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
          >
            <span className="rec-filter-menu__option-text">{opt.label}</span>
            {opt.value === value && (
              <svg className="rec-filter-menu__checkmark" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            )}
          </li>
        ))}
      </ul>,
      document.body
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        id={id}
        className={[
          'rec-filter-pill',
          isActive ? 'rec-filter-pill--active' : '',
          open    ? 'rec-filter-pill--open'   : '',
        ].filter(Boolean).join(' ')}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className="rec-filter-pill__icon-wrap" aria-hidden="true">{icon}</span>
        <span className="rec-filter-pill__label">{selectedOption?.label}</span>
        <svg
          className={`rec-filter-pill__chevron${open ? ' rec-filter-pill__chevron--open' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </div>
      {renderMenu()}
    </>
  );
};

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Tab: driven from ?tab= URL param (survives refresh) ──────────
  const rawTab = searchParams.get('tab') || '';
  const activeTab: string = (CANDIDATE_TABS as readonly string[]).includes(rawTab)
    ? rawTab
    : 'recommendations';

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams(
        (prev) => { const next = new URLSearchParams(prev); next.set('tab', tab); return next; }
        // Don't use replace:true here - we want tab changes in browser history for back button
      );
    },
    [setSearchParams]
  );

  const [jobProfiles, setJobProfiles] = useState<any[]>([]);

  // ── Selected profile: initialised from ?profile= URL param ───────
  const [selectedProfileId, setSelectedProfileIdInternal] = useState<number | null>(() => {
    const p = new URLSearchParams(window.location.search).get('profile');
    return p ? parseInt(p, 10) : null;
  });

  const setSelectedProfileId = useCallback(
    (id: number | null) => {
      setSelectedProfileIdInternal(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id != null) next.set('profile', String(id));
          else next.delete('profile');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [appliedLiked, setAppliedLiked] = useState<any>({ applied_jobs: [], liked_jobs: [] });
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [recCardIndex, setRecCardIndex] = useState(0);
  const [jobListTab, setJobListTab] = useState<'liked' | 'applied'>('liked');
  const [drawerJob, setDrawerJob] = useState<any | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState<number | null>(null);
  const [viewInviteJob, setViewInviteJob] = useState<any | null>(null);
  const [viewAvailableJob, setViewAvailableJob] = useState<any | null>(null);
  const [viewMatchJob, setViewMatchJob] = useState<any | null>(null);
  const [viewRecommendationJob, setViewRecommendationJob] = useState<any | null>(null);

  // ── Profile Selection Modal for Applications ──────────────────────
  const [showProfileSelectionModal, setShowProfileSelectionModal] = useState(false);
  const [pendingApplicationJobId, setPendingApplicationJobId] = useState<number | null>(null);

  // ── Available Jobs filter states ──────────────────────────────────
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobRole, setSelectedJobRole] = useState('');
  const [selectedJobWorkType, setSelectedJobWorkType] = useState('');
  const [jobLocationFilter, setJobLocationFilter] = useState('');
  const [jobApplicationStatusFilter, setJobApplicationStatusFilter] = useState('');

  // ── Invites filter states ──────────────────────────────────
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');
  const [selectedInviteRole, setSelectedInviteRole] = useState('');
  const [selectedInviteWorkType, setSelectedInviteWorkType] = useState('');
  const [inviteLocationFilter, setInviteLocationFilter] = useState('');

  // ── Candidate filter states ──────────────────────────────────
  const [candidateRecRoleFilter, setCandidateRecRoleFilter] = useState<string>('all');
  const [candidateRecWorktypeFilter, setCandidateRecWorktypeFilter] = useState<string>('all');
  const [candidateRecMinMatch, setCandidateRecMinMatch] = useState<number>(0);
  const [appliedLikedRoleFilter, setAppliedLikedRoleFilter] = useState<string>('all');
  const [appliedLikedStatusFilter, setAppliedLikedStatusFilter] = useState<string>('all');
  const [appliedLikedSort, setAppliedLikedSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    fetchUserProfile();
    fetchJobProfiles();
    fetchInvites();
    fetchAvailableJobs();
    fetchAppliedLiked();
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedProfileId) {
      fetchRecommendations();
      setRecCardIndex(0);
    }
  }, [selectedProfileId]);

  // Keyboard navigation for recommendation cards
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'recommendations' || !recommendations?.length) return;
    const total = recommendations.length;
    if (e.key === 'ArrowRight') {
      setRecCardIndex(prev => Math.min(prev + 1, total - 1));
    } else if (e.key === 'ArrowLeft') {
      setRecCardIndex(prev => Math.max(prev - 1, 0));
    }
  }, [activeTab, recommendations]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.getCandidateProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchJobProfiles = async () => {
    console.log('[API CALL] Fetching job profiles');
    try {
      const response = await apiClient.getJobProfiles();
      console.log('[API SUCCESS] Job profiles fetched, count:', response.data.length);
      setJobProfiles(response.data);
      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((p: any) => p.id);
      // Honour ?profile= URL param; validate it exists, else fall back to first
      const urlProfileId = new URLSearchParams(window.location.search).get('profile');
      const parsedId = urlProfileId ? parseInt(urlProfileId, 10) : null;
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedProfileId(parsedId);
      } else {
        console.log('[STATE] Auto-selecting first profile:', response.data[0].id);
        setSelectedProfileId(response.data[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job profiles:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedProfileId) return;
    console.log('[API CALL] Fetching recommendations for profile:', selectedProfileId);
    setLoading(true);
    try {
      const response = await apiClient.getCandidateRecommendations(selectedProfileId);
      console.log('[API SUCCESS] Recommendations fetched, count:', response.data.length);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await apiClient.getRecruiterInvites();
      setInvites(response.data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  };

  const fetchAvailableJobs = async () => {
    try {
      const response = await apiClient.getAvailableJobs();
      setAvailableJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch available jobs:', error);
    }
  };

  const fetchAppliedLiked = async () => {
    try {
      const response = await apiClient.getAppliedLikedJobs();
      setAppliedLiked(response.data);
    } catch (error) {
      console.error('Failed to fetch applied/liked jobs:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await apiClient.getCandidateMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const handleSwipeLike = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    
    // Check if already liked - if so, undo instead
    const alreadyLiked = recommendations.find(r => r.job_posting.id === jobPostingId && r.already_swiped && r.swipe_action === 'like');
    
    if (alreadyLiked) {
      // Undo the like
      console.log('[SWIPE ACTION] Undo Like - Job:', jobPostingId);
      try {
        await apiClient.undoSwipe(jobPostingId);
        console.log('[API SUCCESS] Undo swipe recorded');
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
      console.log('[SWIPE ACTION] Like - Job:', jobPostingId, 'Profile:', selectedProfileId);
      try {
        await apiClient.swipeLike(selectedProfileId, jobPostingId);
        console.log('[API SUCCESS] Swipe like recorded');
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
      console.log('[SWIPE ACTION] Undo Pass - Job:', jobPostingId);
      try {
        await apiClient.undoSwipe(jobPostingId);
        console.log('[API SUCCESS] Undo swipe recorded');
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
      console.log('[SWIPE ACTION] Pass - Job:', jobPostingId, 'Profile:', selectedProfileId);
      try {
        await apiClient.swipePass(selectedProfileId, jobPostingId);
        console.log('[API SUCCESS] Swipe pass recorded');
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
    console.log('[APPLICATION] Withdrawing application:', applicationId, 'for job:', jobPostingId);
    setWithdrawingJobId(jobPostingId);
    
    try {
      await apiClient.withdrawApplication(applicationId);
      console.log('[API SUCCESS] Application withdrawn');
      
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
      const msg = error?.response?.data?.detail;
      console.error('[APPLICATION WITHDRAW ERROR]', error?.response?.status, msg);
      alert(typeof msg === 'string' ? msg : 'Failed to withdraw application. Please try again.');
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
      console.log('[APPLICATION] Already applied to job:', jobPostingId, '- skipping API call');
      return;
    }
    
    console.log('[APPLICATION] Applying to job:', jobPostingId, 'with profile:', selectedJobProfileId);
    setApplyingJobId(jobPostingId);
    
    try {
      await apiClient.applyToJob(jobPostingId, selectedJobProfileId);
      console.log('[API SUCCESS] Application submitted');
      
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
      console.log('[APPLICATION ERROR]', error?.response?.status, msg);
      
      // If already applied (400), show as Applied
      if (error?.response?.status === 400 && typeof msg === 'string' && msg.toLowerCase().includes('already applied')) {
        console.log('[APPLICATION] Already applied - updating UI to show Applied state');
        
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

  

  const renderRecommendations = () => {
    if (jobProfiles.length === 0) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Create your job preferences</h3>
          <p className="mt-2 text-sm text-gray-500">Define your role, location, and compensation preferences to receive personalized job recommendations.</p>
          <div className="mt-6 space-x-3">
            <button 
              onClick={() => navigate('/candidate/job-preferences')}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Job Preferences
            </button>
            <button 
              onClick={() => setActiveTab('available')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No recommendations yet</h3>
              <p className="mt-2 text-sm text-gray-500">We're analyzing your profile to find the best matching opportunities. Check back soon.</p>
            </div>
          ) : (
            <>
              {(() => {
              // Build unique filter options
              const recRoleOptions: string[] = Array.from(
                new Set(
                  recommendations
                    .map((r: any): string =>
                      (r.job_posting?.job_role as string | undefined) ||
                      (r.job_posting?.job_title as string | undefined) ||
                      ''
                    )
                    .filter((s: string) => s.length > 0)
                )
              ).sort();

              const recWorktypeOptions: string[] = Array.from(
                new Set(
                  recommendations
                    .map((r: any): string =>
                      (r.job_posting?.worktype as string | undefined) ||
                      (r.job_posting?.work_type as string | undefined) ||
                      ''
                    )
                    .filter((s: string) => s.length > 0)
                )
              ).sort();

              // Filter logic
              const filteredRecs = recommendations.filter((r: any) => {
                const role =
                  (r.job_posting?.job_role as string | undefined) ||
                  (r.job_posting?.job_title as string | undefined) ||
                  '';
                if (candidateRecRoleFilter !== 'all' && role !== candidateRecRoleFilter) return false;
                const worktype =
                  (r.job_posting?.worktype as string | undefined) ||
                  (r.job_posting?.work_type as string | undefined) ||
                  '';
                if (candidateRecWorktypeFilter !== 'all' && worktype !== candidateRecWorktypeFilter) return false;
                const matchScore = Number(r.match_percentage ?? 0);
                if (matchScore < candidateRecMinMatch) return false;
                return true;
              });

              const hasActiveFilters =
                candidateRecRoleFilter !== 'all' ||
                candidateRecWorktypeFilter !== 'all' ||
                candidateRecMinMatch > 0;

              // Show ALL cards with their status badges (liked, applied, passed)
              const visibleRecs = filteredRecs;
              const safeIndex = Math.min(recCardIndex, visibleRecs.length > 0 ? visibleRecs.length - 1 : 0);

              return (
                <div>
                  {/* ── Modern Filter Toolbar Card ── */}
                  <div className="purple-section-wrapper">
                  <div className="rec-filter-toolbar">
                    <div className="rec-filter-toolbar__inner">

                      {/* Role dropdown */}
                      {recRoleOptions.length > 0 && (
                        <FilterPill
                          id="cand-rec-role"
                          ariaLabel="Filter by role"
                          icon={
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                              <rect x="2" y="7" width="16" height="11" rx="2"/>
                              <path d="M7 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>
                              <line x1="2" y1="12" x2="18" y2="12"/>
                            </svg>
                          }
                          options={[
                            { value: 'all', label: 'All Roles' },
                            ...recRoleOptions.map(r => ({ value: r, label: r })),
                          ]}
                          value={candidateRecRoleFilter}
                          onChange={(v) => { setCandidateRecRoleFilter(v as string); setRecCardIndex(0); }}
                        />
                      )}

                      {/* Work Type dropdown */}
                      {recWorktypeOptions.length > 0 && (
                        <FilterPill
                          id="cand-rec-worktype"
                          ariaLabel="Filter by work type"
                          icon={
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                              <path d="M10 2a5 5 0 015 5c0 4-5 11-5 11S5 11 5 7a5 5 0 015-5z"/>
                              <circle cx="10" cy="7" r="1.5"/>
                            </svg>
                          }
                          options={[
                            { value: 'all', label: 'All Work Types' },
                            ...recWorktypeOptions.map(wt => ({ value: wt, label: wt })),
                          ]}
                          value={candidateRecWorktypeFilter}
                          onChange={(v) => { setCandidateRecWorktypeFilter(v as string); setRecCardIndex(0); }}
                        />
                      )}

                      {/* Min Match dropdown */}
                      <FilterPill
                        id="cand-rec-match"
                        ariaLabel="Minimum match percentage"
                        icon={
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                            <circle cx="10" cy="10" r="7"/>
                            <circle cx="10" cy="10" r="3"/>
                            <line x1="10" y1="3" x2="10" y2="1"/>
                            <line x1="10" y1="19" x2="10" y2="17"/>
                          </svg>
                        }
                        options={[
                          { value: 0,  label: 'Min Match: Any' },
                          { value: 50, label: '50%+' },
                          { value: 60, label: '60%+' },
                          { value: 70, label: '70%+' },
                          { value: 80, label: '80%+' },
                          { value: 90, label: '90%+' },
                        ]}
                        value={candidateRecMinMatch}
                        onChange={(v) => { setCandidateRecMinMatch(v as number); setRecCardIndex(0); }}
                      />

                      {/* Divider */}
                      {hasActiveFilters && <div className="rec-filter-divider" aria-hidden="true"/>}

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <button
                          className="rec-filter-clear"
                          onClick={() => {
                            setCandidateRecRoleFilter('all');
                            setCandidateRecWorktypeFilter('all');
                            setCandidateRecMinMatch(0);
                            setRecCardIndex(0);
                          }}
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <line x1="5" y1="5" x2="15" y2="15"/>
                            <line x1="15" y1="5" x2="5" y2="15"/>
                          </svg>
                          Clear filters
                        </button>
                      )}

                      {/* Result count — pushed to the right */}
                      <span className="rec-filter-count" aria-live="polite">
                        Showing <strong>{visibleRecs.length}</strong> of <strong>{recommendations.length}</strong> jobs
                      </span>

                    </div>
                  </div>
                  </div>

                  {visibleRecs.length === 0 ? (
                    <div className="empty-state-modern">
                      <h3 className="empty-title">No jobs match your filters</h3>
                      <p className="empty-subtitle">Try adjusting or clearing the filters above.</p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const rec = visibleRecs[safeIndex];
                        return (
                          <div className="purple-section-wrapper">
                          <div className="carousel-container">
                            {/* Navigation Header */}
                            <div className="carousel-nav-header">
                              <button
                                className="carousel-arrow-btn"
                                onClick={() => setRecCardIndex(Math.max(safeIndex - 1, 0))}
                                disabled={safeIndex === 0}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                              </button>
                              <div className="carousel-counter">
                                <span className="carousel-current">{safeIndex + 1}</span>
                                <span className="carousel-separator">of</span>
                                <span className="carousel-total">{visibleRecs.length}</span>
                                <span className="carousel-hint">jobs</span>
                              </div>
                              <button
                                className="carousel-arrow-btn"
                                onClick={() => setRecCardIndex(Math.min(safeIndex + 1, visibleRecs.length - 1))}
                                disabled={safeIndex === visibleRecs.length - 1}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                              </button>
                            </div>

                            {/* Single Card */}
                            <div className="carousel-card-wrapper" key={`rec-${rec.job_posting.id}`}>
                              <div className="job-card-modern carousel-card" onClick={() => setViewRecommendationJob(rec)} style={{ cursor: 'pointer' }}>
                                {/* Status Strip: shows if candidate has already liked or applied */}
                                {(rec.already_applied || rec.already_swiped) && (
                                  <div className="rec-status-strip">
                                    {rec.already_applied && (
                                      <span className="rec-status-chip applied">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                                        Applied
                                      </span>
                                    )}
                                    {rec.already_swiped && rec.swipe_action === 'like' && (
                                      <span className="rec-status-chip liked">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                        Liked
                                      </span>
                                    )}
                                    {rec.already_swiped && rec.swipe_action === 'pass' && (
                                      <span className="rec-status-chip passed">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        Passed
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Card Header */}
                                <div className="job-header-modern">
                                  <div className="job-title-section">
                                    <h3 className="job-title-modern">{rec.job_posting.job_title}</h3>
                                    <div className="job-company">{rec.job_posting.company_name || 'Company'}</div>
                                  </div>
                                  <div className="match-badge-modern">
                                    <div className="match-percentage">{rec.match_percentage}%</div>
                                    <div className="match-label">Match</div>
                                  </div>
                                </div>

                                {/* Card Content */}
                                <div className="job-content-modern">
                                  <div className="job-info-section">
                                    <div className="info-group">
                                      <h4 className="info-group-title">Job Details</h4>
                                      <div className="info-items">
                                        <div className="info-item">
                                          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                          </svg>
                                          <span className="info-value">{rec.job_posting.location}</span>
                                        </div>
                                        <div className="info-item">
                                          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                            <line x1="8" y1="21" x2="16" y2="21"/>
                                            <line x1="12" y1="17" x2="12" y2="21"/>
                                          </svg>
                                          <span className="info-value">{rec.job_posting.worktype} • {rec.job_posting.employment_type}</span>
                                        </div>
                                        <div className="info-item">
                                          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                                          </svg>
                                          <span className="info-value">{rec.job_posting.seniority_level} level</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="job-compensation-section">
                                    <div className="info-group">
                                      <h4 className="info-group-title">Compensation</h4>
                                      <div className="salary-range">
                                        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <line x1="12" y1="1" x2="12" y2="23"/>
                                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                        </svg>
                                        <div className="salary-info">
                                          <span className="salary-amount">{rec.job_posting.salary_currency?.toUpperCase()} {rec.job_posting.salary_min} - {rec.job_posting.salary_max}</span>
                                          <span className="salary-label">Annual salary</span>
                                        </div>
                                      </div>
                                    </div>

                                    {rec.is_match && (
                                      <div className="match-status">
                                        <div className="status-badge matched">
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                          </svg>
                                          <span>Mutual Match!</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Job Description */}
                                <div className="job-description-modern">
                                  <h4 className="description-title">About this role</h4>
                                  <p className="description-text">{rec.job_posting.job_description}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="job-actions-modern">
                                  <div className="action-buttons-grid">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSwipePass(rec.job_posting.id); }}
                                      className={`action-btn ${rec.already_swiped && rec.swipe_action === 'pass' ? 'action-btn-done passed-done' : 'secondary'}`}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                      {rec.already_swiped && rec.swipe_action === 'pass' ? 'Passed ✓' : 'Pass'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSwipeLike(rec.job_posting.id); }}
                                      className={`action-btn ${rec.already_swiped && rec.swipe_action === 'like' ? 'action-btn-done liked-done' : 'primary'}`}
                                    >
                                      <svg viewBox="0 0 24 24" fill={rec.already_swiped && rec.swipe_action === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                      </svg>
                                      {rec.already_swiped && rec.swipe_action === 'like' ? 'Liked ✓' : 'Like'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleApply(rec.job_posting.id); }}
                                      className={`action-btn ${rec.already_applied ? 'action-btn-done applied-done' : 'success'}`}
                                      disabled={applyingJobId === rec.job_posting.id || withdrawingJobId === rec.job_posting.id}
                                    >
                                      {rec.already_applied ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                          <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                      )}
                                      {withdrawingJobId === rec.job_posting.id 
                                        ? 'Withdrawing...' 
                                        : rec.already_applied 
                                          ? 'Applied ✓' 
                                          : (applyingJobId === rec.job_posting.id ? 'Applying...' : 'Apply Now')
                                      }
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Keyboard hint */}
                            <div className="carousel-keyboard-hint">
                              Use <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> arrow keys to browse
                            </div>
                          </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
        </div>

        {/* Recommendation Job Detail Drawer */}
        {viewRecommendationJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewRecommendationJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewRecommendationJob.job_posting.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewRecommendationJob.job_posting.company_name || 'Company'}
                  {viewRecommendationJob.job_posting.job_role ? ` · ${viewRecommendationJob.job_posting.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewRecommendationJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewRecommendationJob.job_posting.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.location}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.worktype}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.employment_type}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.seniority_level}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting.salary_min || viewRecommendationJob.job_posting.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewRecommendationJob.job_posting.salary_currency?.toUpperCase()} {viewRecommendationJob.job_posting.salary_min}{viewRecommendationJob.job_posting.salary_max ? ` - ${viewRecommendationJob.job_posting.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_vendor}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_type}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewRecommendationJob.job_posting.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.end_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Apply By</span>
                      <span className="cal-drawer-field-value">{new Date(viewRecommendationJob.job_posting.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Match Score</span>
                    <span className="cal-drawer-field-value" style={{ color: '#7B5EA7', fontWeight: 600 }}>{viewRecommendationJob.match_percentage}%</span>
                  </div>
                </div>
              </div>

              {viewRecommendationJob.job_posting.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewRecommendationJob.job_posting.job_description}</div>
                </div>
              )}

              {viewRecommendationJob.job_posting.posting_skills && viewRecommendationJob.job_posting.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewRecommendationJob.job_posting.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewRecommendationJob.job_posting.education_qualifications || viewRecommendationJob.job_posting.certifications_required || viewRecommendationJob.job_posting.travel_requirements || viewRecommendationJob.job_posting.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewRecommendationJob.job_posting.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.education_qualifications}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.certifications_required}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.travel_requirements}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                  className={`cal-btn ${viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'pass' ? 'cal-btn-done-pass' : 'cal-btn-secondary'}`}
                  onClick={() => {
                    handleSwipePass(viewRecommendationJob.job_posting.id);
                    setViewRecommendationJob(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'pass' ? 'Passed ✓' : 'Pass'}
                </button>
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => {
                    handleSwipeLike(viewRecommendationJob.job_posting.id);
                    setViewRecommendationJob(null);
                  }}
                  style={{ flex: 1, ...(viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? { opacity: 0.8 } : {}) }}
                >
                  <svg viewBox="0 0 24 24" fill={viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? 'Liked ✓' : 'Like'}
                </button>
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => {
                    handleApply(viewRecommendationJob.job_posting.id);
                    setViewRecommendationJob(null);
                  }}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}
                  disabled={applyingJobId === viewRecommendationJob.job_posting.id || withdrawingJobId === viewRecommendationJob.job_posting.id}
                >
                  {viewRecommendationJob.already_applied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  )}
                  {withdrawingJobId === viewRecommendationJob.job_posting.id 
                    ? 'Withdrawing...' 
                    : viewRecommendationJob.already_applied 
                      ? 'Applied ✓' 
                      : (applyingJobId === viewRecommendationJob.job_posting.id ? 'Applying...' : 'Apply Now')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </>
    );
  };

  const renderInvites = () => {
    if (invites.length === 0) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No invites yet</h3>
          <p className="mt-2 text-sm text-gray-500">Recruiters will send you invitations when they identify you as a strong match for their opportunities.</p>
        </div>
      );
    }

    const renderInviteDrawer = () => {
      if (!viewInviteJob) return null;
      const jp = viewInviteJob.job_posting;
      const company = viewInviteJob.company;
      const salary = jp.salary_min && jp.salary_max
        ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
        : null;
      const isApplied = viewInviteJob.already_applied;
      const isApplying = applyingJobId === jp.id;

      return (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewInviteJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{jp.job_title}</h2>
                <div className="cal-drawer-subtitle">{company.company_name}{jp.job_role ? ` · ${jp.job_role}` : ''}</div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewInviteJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="cal-drawer-body">
              {/* Overview */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {jp.location && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Location</span><span className="cal-drawer-field-value">{jp.location}</span></div>}
                  {jp.worktype && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Work Type</span><span className="cal-drawer-field-value">{jp.worktype}</span></div>}
                  {jp.employment_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Employment</span><span className="cal-drawer-field-value">{jp.employment_type}</span></div>}
                  {jp.seniority_level && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Seniority</span><span className="cal-drawer-field-value">{jp.seniority_level}</span></div>}
                  {salary && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Compensation</span><span className="cal-drawer-field-value">{salary}{jp.pay_type ? ` / ${jp.pay_type}` : ''}</span></div>}
                  {jp.product_vendor && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Vendor</span><span className="cal-drawer-field-value">{jp.product_vendor}</span></div>}
                  {jp.product_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Product</span><span className="cal-drawer-field-value">{jp.product_type}</span></div>}
                  {jp.job_category && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Category</span><span className="cal-drawer-field-value">{jp.job_category}</span></div>}
                  {jp.start_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Start Date</span><span className="cal-drawer-field-value">{new Date(jp.start_date).toLocaleDateString()}</span></div>}
                  {jp.end_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">End Date</span><span className="cal-drawer-field-value">{new Date(jp.end_date).toLocaleDateString()}</span></div>}
                </div>
              </div>

              {/* Description */}
              {jp.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{jp.job_description}</div>
                </div>
              )}

              {/* Skills */}
              {jp.posting_skills && jp.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {jp.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {(jp.education_qualifications || jp.certifications_required || jp.travel_requirements || jp.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {jp.education_qualifications && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Education</span><span className="cal-drawer-field-value">{jp.education_qualifications}</span></div>}
                    {jp.certifications_required && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Certifications</span><span className="cal-drawer-field-value">{jp.certifications_required}</span></div>}
                    {jp.travel_requirements && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Travel</span><span className="cal-drawer-field-value">{jp.travel_requirements}</span></div>}
                    {jp.visa_info && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Visa</span><span className="cal-drawer-field-value">{jp.visa_info}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cal-drawer-footer">
              <button
                className={`cal-btn cal-btn-primary${isApplying || withdrawingJobId === jp.id ? ' loading' : ''}`}
                onClick={() => handleApplyFromInvite(jp.id, viewInviteJob.job_profile_id)}
                disabled={isApplying || withdrawingJobId === jp.id}
              >
                {isApplying ? (
                  'Applying…'
                ) : withdrawingJobId === jp.id ? (
                  'Withdrawing…'
                ) : isApplied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5"/></svg>
                    Already Applied
                  </>
                ) : (
                  'Apply Now'
                )}
              </button>
              <button className="cal-btn cal-btn-secondary" onClick={() => setViewInviteJob(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    };

    // Apply filters to invites
    const filteredInvites = invites.filter((invite: any) => {
      const jp = invite.job_posting;
      const company = invite.company;

      // Search term
      if (inviteSearchTerm) {
        const term = inviteSearchTerm.toLowerCase();
        const titleMatch = jp.job_title?.toLowerCase().includes(term);
        const companyMatch = company.company_name?.toLowerCase().includes(term);
        const descMatch = jp.job_description?.toLowerCase().includes(term);
        const roleMatch = jp.job_role?.toLowerCase().includes(term);
        if (!titleMatch && !companyMatch && !descMatch && !roleMatch) return false;
      }

      // Role filter
      if (selectedInviteRole) {
        const roleMatch = jp.job_title === selectedInviteRole || jp.job_role === selectedInviteRole;
        if (!roleMatch) return false;
      }

      // Work type filter
      if (selectedInviteWorkType && jp.worktype !== selectedInviteWorkType) return false;

      // Location filter
      if (inviteLocationFilter) {
        const locMatch = jp.location?.toLowerCase().includes(inviteLocationFilter.toLowerCase());
        if (!locMatch) return false;
      }

      return true;
    });

    // Count active filters
    const activeFiltersCount = [inviteSearchTerm, selectedInviteRole, selectedInviteWorkType, inviteLocationFilter].filter(Boolean).length;

    // Clear all filters handler
    const clearAllInviteFilters = () => {
      setInviteSearchTerm('');
      setSelectedInviteRole('');
      setSelectedInviteWorkType('');
      setInviteLocationFilter('');
    };

    return (
      <>
        {/* Invites Section Header */}
        <div className="section-header mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recruiter Invites</h2>
          <p className="text-sm text-gray-600 mt-1">Review personalized job invitations from recruiters</p>
          {filteredInvites.length !== invites.length && (
            <p className="text-sm text-gray-500 mt-2">
              Showing {filteredInvites.length} of {invites.length} invites
              {activeFiltersCount > 0 && (
                <button 
                  onClick={clearAllInviteFilters}
                  className="ml-2 text-blue-600 hover:text-blue-700 underline"
                >
                  Clear filters
                </button>
              )}
            </p>
          )}
        </div>

        {/* Invites Grid */}
        <div className="jobs-grid-modern">
          {filteredInvites.map((invite: any) => {
            const jp = invite.job_posting;
            const company = invite.company;
            const salary = jp.salary_min && jp.salary_max
              ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
              : null;

            return (
              <div key={invite.invite_id} className="job-card-modern">
                {/* Professional Invitation Badge */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Recruiter Invitation
                  </div>
                  {invite.invite_count > 1 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: '#fef3c7',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#92400e',
                      letterSpacing: '0.3px'
                    }}>
                      🔔 Reminded {invite.invite_count} times
                    </div>
                  )}
                </div>

                {/* Job Header */}
                <div className="job-card-header" style={{ marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '6px',
                    lineHeight: '1.4'
                  }}>
                    {jp.job_title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    fontWeight: '500',
                    margin: 0
                  }}>
                    {company.company_name}
                  </p>
                </div>

                {/* Professional Job Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  padding: '16px 0',
                  borderTop: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}>
                  {jp.location && (
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{jp.location}</div>
                      </div>
                    </div>
                  )}
                  {jp.worktype && (
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                      </svg>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</div>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{jp.worktype}</div>
                      </div>
                    </div>
                  )}
                  {salary && (
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary</div>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{salary}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setViewInviteJob(invite)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: '1.5px solid #e2e8f0',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View Details
                  </button>
                  <button 
                    onClick={() => handleApplyFromInvite(jp.id, invite.job_profile_id)}
                    disabled={applyingJobId === jp.id || withdrawingJobId === jp.id}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: 'none',
                      background: invite.already_applied ? '#10b981' : ((applyingJobId === jp.id || withdrawingJobId === jp.id) ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      cursor: (applyingJobId === jp.id || withdrawingJobId === jp.id) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      opacity: ((applyingJobId === jp.id || withdrawingJobId === jp.id) && !invite.already_applied) ? 1 : (invite.already_applied ? 1 : 1)
                    }}
                    onMouseEnter={(e) => {
                      if (applyingJobId !== jp.id && withdrawingJobId !== jp.id) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {applyingJobId === jp.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                          <line x1="12" y1="2" x2="12" y2="6"/>
                          <line x1="12" y1="18" x2="12" y2="22"/>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                          <line x1="2" y1="12" x2="6" y2="12"/>
                          <line x1="18" y1="12" x2="22" y2="12"/>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                        </svg>
                        Applying...
                      </>
                    ) : withdrawingJobId === jp.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                          <line x1="12" y1="2" x2="12" y2="6"/>
                          <line x1="12" y1="18" x2="12" y2="22"/>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                          <line x1="2" y1="12" x2="6" y2="12"/>
                          <line x1="18" y1="12" x2="22" y2="12"/>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                        </svg>
                        Withdrawing...
                      </>
                    ) : invite.already_applied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Applied ✓
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Apply Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {renderInviteDrawer()}
      </>
    );
  };

  const renderAvailableJobs = () => {
    // Derive available job roles dynamically from job data
    const availableJobRoles = (() => {
      const rolesSet = new Set<string>();
      availableJobs.forEach((job: any) => {
        if (job.job_title) rolesSet.add(job.job_title);
        if (job.job_role) rolesSet.add(job.job_role);
      });
      return Array.from(rolesSet).sort();
    })();

    // Filter jobs based on all active filters
    const filteredJobs = (() => {
      return availableJobs.filter((job: any) => {
        // Search filter
        if (jobSearchTerm) {
          const searchLower = jobSearchTerm.toLowerCase();
          const matchesSearch = 
            job.job_title?.toLowerCase().includes(searchLower) ||
            job.company_name?.toLowerCase().includes(searchLower) ||
            job.job_description?.toLowerCase().includes(searchLower) ||
            job.job_role?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Role filter
        if (selectedJobRole) {
          const matchesRole = 
            job.job_title === selectedJobRole ||
            job.job_role === selectedJobRole;
          if (!matchesRole) return false;
        }

        // Work type filter
        if (selectedJobWorkType) {
          const jobWorkType = job.worktype?.toLowerCase();
          const filterWorkType = selectedJobWorkType.toLowerCase();
          if (jobWorkType !== filterWorkType) return false;
        }

        // Location filter
        if (jobLocationFilter) {
          const locationLower = jobLocationFilter.toLowerCase();
          const matchesLocation = job.location?.toLowerCase().includes(locationLower);
          if (!matchesLocation) return false;
        }

        // Application status filter
        if (jobApplicationStatusFilter) {
          if (jobApplicationStatusFilter === 'applied' && !job.already_applied) return false;
          if (jobApplicationStatusFilter === 'not-applied' && job.already_applied) return false;
        }

        return true;
      });
    })();

    const hasActiveFilters = jobSearchTerm || selectedJobRole || selectedJobWorkType || jobLocationFilter || jobApplicationStatusFilter;
    const resultCount = filteredJobs.length;
    const totalCount = availableJobs.length;

    if (availableJobs.length === 0) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No jobs available</h3>
          <p className="mt-2 text-sm text-gray-500">New opportunities are posted regularly. Check back soon or create job preferences for personalized recommendations.</p>
        </div>
      );
    }

    // Clear all job filters handler
    const clearAllJobFilters = () => {
      setJobSearchTerm('');
      setSelectedJobRole('');
      setSelectedJobWorkType('');
      setJobLocationFilter('');
      setJobApplicationStatusFilter('');
    };

    return (
      <>
        {/* Page Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Browse Jobs</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Browse and filter open roles that match your interests</p>
        </div>

        {/* Enhanced Filter Toolbar */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', 
          marginBottom: '24px',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 280px', minWidth: '280px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  className="job-select-modern"
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '40px', fontSize: '14px', borderRadius: '8px' }}
                  placeholder="Job title, keywords..."
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Job Role Dropdown */}
            <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
              <label htmlFor="job-role-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
              <select
                id="job-role-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={selectedJobRole}
                onChange={(e) => setSelectedJobRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {availableJobRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Work Type Dropdown */}
            <div style={{ flex: '0 1 160px', minWidth: '140px' }}>
              <label htmlFor="job-worktype-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</label>
              <select
                id="job-worktype-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={selectedJobWorkType}
                onChange={(e) => setSelectedJobWorkType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Location Input */}
            <div style={{ flex: '0 1 180px', minWidth: '160px' }}>
              <label htmlFor="job-location-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</label>
              <input
                type="text"
                id="job-location-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px' }}
                placeholder="City or State"
                value={jobLocationFilter}
                onChange={(e) => setJobLocationFilter(e.target.value)}
              />
            </div>

            {/* Application Status Dropdown */}
            <div style={{ flex: '0 1 160px', minWidth: '140px' }}>
              <label htmlFor="job-application-status-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
              <select
                id="job-application-status-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={jobApplicationStatusFilter}
                onChange={(e) => setJobApplicationStatusFilter(e.target.value)}
              >
                <option value="">All Jobs</option>
                <option value="applied">Applied</option>
                <option value="not-applied">Not Applied</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="action-btn secondary"
                  style={{ height: '40px', padding: '0 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={clearAllJobFilters}
                >
                  <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
              Showing {resultCount} of {totalCount} jobs
            </p>
          </div>
        </div>

        {/* Empty State for Filtered Results */}
        {filteredJobs.length === 0 && hasActiveFilters && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">No jobs match your filters</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your search criteria or clearing filters to see more results.</p>
            <div className="mt-6">
              <button 
                onClick={clearAllJobFilters}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Jobs Grid */}
        {filteredJobs.length > 0 && (
          <div className="jobs-grid-modern">
            {filteredJobs.map((job: any) => {
              const salary = job.salary_min && job.salary_max
                ? `${job.salary_currency?.toUpperCase() || 'USD'} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
                : null;

              return (
                <div key={job.id} className="job-card-modern">
                  <div className="job-card-header">
                    <div>
                      {job.end_date && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          Apply by {new Date(job.end_date).toLocaleDateString()}
                        </span>
                      )}
                      <h3 className="job-title">{job.job_title}</h3>
                      <p className="company-name">{job.company_name || 'Company'}</p>
                    </div>
                  </div>
                  {job.job_description && (
                    <p className="job-description mt-2 text-sm text-gray-600 line-clamp-2">
                      {job.job_description}
                    </p>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    {job.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                          <div>{job.location}</div>
                        </div>
                      </div>
                    )}
                    {job.worktype && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2"/>
                          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</div>
                          <div>{job.worktype}</div>
                        </div>
                      </div>
                    )}
                    {job.employment_type && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employment</div>
                          <div>{job.employment_type}</div>
                        </div>
                      </div>
                    )}
                    {job.seniority_level && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 20V10"/>
                          <path d="M12 20V4"/>
                          <path d="M6 20v-6"/>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seniority</div>
                          <div>{job.seniority_level}</div>
                        </div>
                      </div>
                    )}
                    {salary && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary</div>
                          <div>{salary}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="job-card-actions mt-4">
                    <button 
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        color: '#475569',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                      onClick={() => setViewAvailableJob(job)}
                    >
                      View Details
                    </button>
                    <button 
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: job.already_applied ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: applyingJobId === job.id || withdrawingJobId === job.id ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (applyingJobId !== job.id && withdrawingJobId !== job.id) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handleApply(job.id)}
                      disabled={applyingJobId === job.id || withdrawingJobId === job.id}
                    >
                      {applyingJobId === job.id ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Applying...
                        </>
                      ) : withdrawingJobId === job.id ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Withdrawing...
                        </>
                      ) : job.already_applied ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          Applied ✓
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Apply Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Available Job Detail Drawer */}
      {viewAvailableJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewAvailableJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewAvailableJob.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewAvailableJob.company_name || 'Company'}
                  {viewAvailableJob.job_role ? ` · ${viewAvailableJob.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewAvailableJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewAvailableJob.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.location}</span>
                    </div>
                  )}
                  {viewAvailableJob.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.worktype}</span>
                    </div>
                  )}
                  {viewAvailableJob.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.employment_type}</span>
                    </div>
                  )}
                  {viewAvailableJob.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.seniority_level}</span>
                    </div>
                  )}
                  {(viewAvailableJob.salary_min || viewAvailableJob.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewAvailableJob.salary_currency?.toUpperCase()} {viewAvailableJob.salary_min}{viewAvailableJob.salary_max ? ` - ${viewAvailableJob.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewAvailableJob.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.product_vendor}</span>
                    </div>
                  )}
                  {viewAvailableJob.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.product_type}</span>
                    </div>
                  )}
                  {viewAvailableJob.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewAvailableJob.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewAvailableJob.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewAvailableJob.job_description}</div>
                </div>
              )}

              {viewAvailableJob.posting_skills && viewAvailableJob.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewAvailableJob.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewAvailableJob.education_qualifications || viewAvailableJob.certifications_required || viewAvailableJob.travel_requirements || viewAvailableJob.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewAvailableJob.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.education_qualifications}</span>
                      </div>
                    )}
                    {viewAvailableJob.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.certifications_required}</span>
                      </div>
                    )}
                    {viewAvailableJob.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.travel_requirements}</span>
                      </div>
                    )}
                    {viewAvailableJob.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              <button
                className={`cal-btn ${viewAvailableJob.already_applied ? 'cal-btn-secondary' : 'cal-btn-primary'}`}
                onClick={() => { 
                  handleApply(viewAvailableJob.id); 
                  setViewAvailableJob(null); 
                }}
                disabled={applyingJobId === viewAvailableJob.id || withdrawingJobId === viewAvailableJob.id}
              >
                {applyingJobId === viewAvailableJob.id ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} className="spin-icon">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Applying...
                  </>
                ) : withdrawingJobId === viewAvailableJob.id ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} className="spin-icon">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Withdrawing...
                  </>
                ) : viewAvailableJob.already_applied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Applied ✓
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Apply Now
                  </>
                )}
              </button>
              <button className="cal-btn cal-btn-secondary" onClick={() => setViewAvailableJob(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

  const renderAppliedLiked = () => {
    const { applied_jobs, liked_jobs } = appliedLiked;
    const rawItems = jobListTab === 'applied' ? applied_jobs : liked_jobs;

    // Derive unique role options from both lists
    const alRoleOptions: string[] = Array.from<string>(new Set<string>(
        rawItems
          .map((job: any): string =>
            (job.job_role as string | undefined) ||
            (job.job_title as string | undefined) ||
            ''
          )
          .filter((s: string) => s.length > 0)
      )).sort();

    // Derive unique status options from applied list
    const alStatusOptions: string[] = Array.from<string>(new Set<string>(
        (applied_jobs as any[])
          .map((job: any): string => (job.status as string | undefined) || '')
          .filter((s: string) => s.length > 0)
      )).sort();

    // Filter logic
    let filteredItems = rawItems.filter((job: any) => {
      const role =
        (job.job_role as string | undefined) ||
        (job.job_title as string | undefined) ||
        '';
      if (appliedLikedRoleFilter !== 'all' && role !== appliedLikedRoleFilter) return false;
      if (jobListTab === 'applied' && appliedLikedStatusFilter !== 'all') {
        const status = (job.status as string | undefined) || '';
        if (status !== appliedLikedStatusFilter) return false;
      }
      return true;
    });

    // Sorting
    filteredItems = [...filteredItems].sort((a: any, b: any) => {
      const getTime = (item: any) => {
        const ts =
          item.applied_at ||
          item.liked_at ||
          item.created_at ||
          item.timestamp ||
          '';
        return ts ? new Date(ts).getTime() : 0;
      };
      return appliedLikedSort === 'newest'
        ? getTime(b) - getTime(a)
        : getTime(a) - getTime(b);
    });

    const hasActiveFilters =
      appliedLikedRoleFilter !== 'all' ||
      (jobListTab === 'applied' && appliedLikedStatusFilter !== 'all') ||
      appliedLikedSort !== 'newest';

    const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
      if (!min && !max) return null;
      const c = currency || 'USD';
      if (min && max) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
      if (min) return `${c} ${min.toLocaleString()}+`;
      return `${c} ${max!.toLocaleString()}`;
    };

    const getStatusClass = (status: string) => {
      const s = status?.toLowerCase() || '';
      if (s.includes('review')) return 'reviewed';
      if (s.includes('interview')) return 'interview';
      if (s.includes('offer')) return 'offered';
      if (s.includes('reject') || s.includes('denied')) return 'rejected';
      return 'applied';
    };

    const renderCard = (job: any, type: 'applied' | 'liked') => {
      const key = type === 'applied' ? `app-${job.application_id}` : `liked-${job.job_id}`;
      const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
      const dateStr = type === 'applied'
        ? `Applied ${new Date(job.applied_at).toLocaleDateString()}`
        : `Liked ${new Date(job.liked_at).toLocaleDateString()}`;
      const snippet = job.job_description
        ? job.job_description.slice(0, 160) + (job.job_description.length > 160 ? '…' : '')
        : null;
      const isApplied = type === 'applied' || job.already_applied;
      const isApplying = applyingJobId === job.job_id;

      return (
        <div key={key} className="cal-card">
          <div className="cal-card-body">
            <div className="cal-card-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 className="cal-card-title">{job.job_title}</h4>
                <div className="cal-card-company">
                  {job.company_name}
                  {job.job_role && <><span>·</span>{job.job_role}</>}
                </div>
              </div>
              {type === 'applied' && job.status && (
                <span className={`cal-status-chip ${getStatusClass(job.status)}`}>
                  {job.status}
                </span>
              )}
              {type === 'liked' && (
                <span className="cal-status-chip liked">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Liked
                </span>
              )}
            </div>

            <div className="cal-meta-row">
              {job.location && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {job.location}
                </span>
              )}
              {job.worktype && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  {job.worktype}
                </span>
              )}
              {job.employment_type && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {job.employment_type}
                </span>
              )}
              {job.seniority_level && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  {job.seniority_level}
                </span>
              )}
              {salary && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  {salary}
                </span>
              )}
            </div>

            {snippet && <p className="cal-snippet">{snippet}</p>}
            <div className="cal-date">{dateStr}</div>
          </div>

          <div className="cal-card-actions">
            <button className="cal-btn cal-btn-secondary" onClick={() => setDrawerJob({ ...job, _type: type })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Details
            </button>
            <button
              className={`cal-btn cal-btn-primary${isApplying || withdrawingJobId === job.job_id ? ' loading' : ''}`}
              onClick={() => handleApply(job.job_id)}
              disabled={isApplying || withdrawingJobId === job.job_id}
            >
              {isApplying ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Applying…
                </>
              ) : withdrawingJobId === job.job_id ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Withdrawing…
                </>
              ) : isApplied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  Applied ✓
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Apply Now
                </>
              )}
            </button>
          </div>
        </div>
      );
    };

    const renderDrawer = () => {
      if (!drawerJob) return null;
      const job = drawerJob;
      const type = job._type as 'applied' | 'liked';
      const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
      const isApplied = type === 'applied' || job.already_applied;
      const isApplying = applyingJobId === job.job_id;

      return (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDrawerJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{job.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {job.company_name}{job.job_role ? ` · ${job.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setDrawerJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="cal-drawer-body">
              {/* Overview grid */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {job.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{job.location}</span>
                    </div>
                  )}
                  {job.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{job.worktype}</span>
                    </div>
                  )}
                  {job.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{job.employment_type}</span>
                    </div>
                  )}
                  {job.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{job.seniority_level}</span>
                    </div>
                  )}
                  {salary && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">{salary}{job.pay_type ? ` / ${job.pay_type}` : ''}</span>
                    </div>
                  )}
                  {job.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{job.product_vendor}</span>
                    </div>
                  )}
                  {job.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{job.product_type}</span>
                    </div>
                  )}
                  {job.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(job.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {job.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{job.job_description}</div>
                </div>
              )}

              {/* Skills */}
              {job.posting_skills && job.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {job.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {(job.education_qualifications || job.certifications_required || job.travel_requirements || job.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {job.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{job.education_qualifications}</span>
                      </div>
                    )}
                    {job.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{job.certifications_required}</span>
                      </div>
                    )}
                    {job.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{job.travel_requirements}</span>
                      </div>
                    )}
                    {job.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{job.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cal-drawer-footer">
              <button
                className={`cal-btn cal-btn-primary${isApplying || withdrawingJobId === job.job_id ? ' loading' : ''}`}
                onClick={() => handleApply(job.job_id)}
                disabled={isApplying || withdrawingJobId === job.job_id}
              >
                {isApplying ? (
                  'Applying…'
                ) : withdrawingJobId === job.job_id ? (
                  'Withdrawing…'
                ) : isApplied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5"/></svg>
                    Already Applied
                  </>
                ) : (
                  'Apply Now'
                )}
              </button>
              <button className="cal-btn cal-btn-secondary" onClick={() => setDrawerJob(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="cal-page">
        {/* Tab filter */}
        <div className="cal-tabs">
          <button className={`cal-tab${jobListTab === 'liked' ? ' active' : ''}`} onClick={() => setJobListTab('liked')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={jobListTab === 'liked' ? '#db2777' : 'none'} stroke={jobListTab === 'liked' ? '#db2777' : 'currentColor'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Liked
            <span className="cal-tab-count">{liked_jobs.length}</span>
          </button>
          <button className={`cal-tab${jobListTab === 'applied' ? ' active' : ''}`} onClick={() => setJobListTab('applied')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Applied
            <span className="cal-tab-count">{applied_jobs.length}</span>
          </button>
        </div>

        {/* Applied/Liked Filters */}
        {rawItems.length > 0 && (
          <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0', flexWrap: 'wrap' }}>
            {alRoleOptions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label htmlFor="al-role-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Role</label>
                <select
                  id="al-role-filter"
                  className="job-select-modern"
                  style={{ minWidth: '150px', padding: '6px 10px', fontSize: '13px' }}
                  value={appliedLikedRoleFilter}
                  onChange={(e) => setAppliedLikedRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {alRoleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            )}
            {jobListTab === 'applied' && alStatusOptions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label htmlFor="al-status-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Status</label>
                <select
                  id="al-status-filter"
                  className="job-select-modern"
                  style={{ minWidth: '140px', padding: '6px 10px', fontSize: '13px' }}
                  value={appliedLikedStatusFilter}
                  onChange={(e) => setAppliedLikedStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {alStatusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="al-sort" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Sort</label>
              <select
                id="al-sort"
                className="job-select-modern"
                style={{ minWidth: '120px', padding: '6px 10px', fontSize: '13px' }}
                value={appliedLikedSort}
                onChange={(e) => setAppliedLikedSort(e.target.value as 'newest' | 'oldest')}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                className="action-btn secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => {
                  setAppliedLikedRoleFilter('all');
                  setAppliedLikedStatusFilter('all');
                  setAppliedLikedSort('newest');
                }}
              >
                Clear filters
              </button>
            )}
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>
              Showing {filteredItems.length} of {rawItems.length}
            </span>
          </div>
        )}

        {/* List or Empty */}
        {filteredItems.length === 0 ? (
          <div className="cal-empty">
            <div className="cal-empty-icon">
              {jobListTab === 'liked' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              )}
            </div>
            <h3 className="cal-empty-title">
              {rawItems.length === 0
                ? (jobListTab === 'liked' ? 'No liked jobs yet' : 'No applications yet')
                : 'No results match your filters'}
            </h3>
            <p className="cal-empty-subtitle">
              {rawItems.length === 0
                ? (jobListTab === 'liked'
                    ? 'Swipe right on recommended jobs to save them here for quick reference.'
                    : 'Start applying to positions from your liked jobs or browse new opportunities.')
                : 'Try adjusting or clearing the filters above.'}
            </p>
            <button className="cal-empty-link" onClick={() => setActiveTab('recommendations')}>
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="cal-list">
            {filteredItems.map((job: any) => renderCard(job, jobListTab))}
          </div>
        )}

        {/* Side Drawer */}
        {renderDrawer()}
      </div>
    );
  };

  const renderMatches = () => {
    if (matches.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 className="empty-title">No matches yet</h3>
          <p className="empty-subtitle">Continue reviewing opportunities. When both you and a recruiter express mutual interest, matches will appear here.</p>
          <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary">
            View Recommendations
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="jobs-grid-modern">
        {matches.map((match: any) => (
          <div key={match.match_id} className="job-card-modern match-card">
            {/* Professional Match Badge */}
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px 8px 0 0',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>Mutual Match</span>
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>{match.match_percentage}%</span>
              </div>
            </div>

            <div className="job-header-modern" style={{ padding: '0 16px' }}>
              <div className="job-title-section">
                <h3 className="job-title-modern">{match.job_posting.job_title}</h3>
                <div className="job-company">{match.company.company_name}</div>
              </div>
              <div className="match-date">
                <small style={{ color: '#64748b' }}>Matched {new Date(match.matched_at).toLocaleDateString()}</small>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              margin: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div>
                <h4 style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>Position Details</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{match.job_posting.location}</span>
                </div>
              </div>

              <div>
                <h4 style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>Contact Information</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>{match.company.email}</span>
                </div>
              </div>
            </div>

            <div className="job-actions-modern" style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setViewMatchJob(match)}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <path d="M14 2v6h6"/>
                    <path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
                  </svg>
                  View Job Posting
                </button>
                <button
                  onClick={() => handleApplyFromMatch(match.job_posting.id, match.job_profile_id)}
                  disabled={applyingJobId === match.job_posting.id || withdrawingJobId === match.job_posting.id}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: match.already_applied ? '#10b981' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (applyingJobId === match.job_posting.id || withdrawingJobId === match.job_posting.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (applyingJobId === match.job_posting.id || withdrawingJobId === match.job_posting.id) ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (applyingJobId !== match.job_posting.id && withdrawingJobId !== match.job_posting.id) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {applyingJobId === match.job_posting.id ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      Applying...
                    </>
                  ) : withdrawingJobId === match.job_posting.id ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      Withdrawing...
                    </>
                  ) : match.already_applied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Applied ✓
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Apply Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Match Job Detail Drawer */}
      {viewMatchJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewMatchJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewMatchJob.job_posting.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewMatchJob.company.company_name}
                  {viewMatchJob.job_posting.job_role ? ` · ${viewMatchJob.job_posting.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewMatchJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewMatchJob.job_posting.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.location}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.worktype}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.employment_type}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.seniority_level}</span>
                    </div>
                  )}
                  {(viewMatchJob.job_posting.salary_min || viewMatchJob.job_posting.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewMatchJob.job_posting.salary_currency?.toUpperCase()} {viewMatchJob.job_posting.salary_min}{viewMatchJob.job_posting.salary_max ? ` - ${viewMatchJob.job_posting.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_vendor}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_type}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.end_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Apply By</span>
                      <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewMatchJob.job_posting.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewMatchJob.job_posting.job_description}</div>
                </div>
              )}

              {viewMatchJob.job_posting.posting_skills && viewMatchJob.job_posting.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewMatchJob.job_posting.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewMatchJob.job_posting.education_qualifications || viewMatchJob.job_posting.certifications_required || viewMatchJob.job_posting.travel_requirements || viewMatchJob.job_posting.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewMatchJob.job_posting.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.education_qualifications}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.certifications_required}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.travel_requirements}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              <button
                className="cal-btn cal-btn-primary"
                onClick={() => { handleApplyFromMatch(viewMatchJob.job_posting.id, viewMatchJob.job_profile_id); setViewMatchJob(null); }}
                disabled={applyingJobId === viewMatchJob.job_posting.id || withdrawingJobId === viewMatchJob.job_posting.id}
              >
                {applyingJobId === viewMatchJob.job_posting.id ? (
                  'Applying…'
                ) : withdrawingJobId === viewMatchJob.job_posting.id ? (
                  'Withdrawing…'
                ) : viewMatchJob.already_applied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Already Applied
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Apply Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

  const renderWelcomeCard = () => {
    const userName = userProfile?.name || userProfile?.full_name || 'User';
    const userInitial = userName.charAt(0).toUpperCase();
    const newJobs = availableJobs.filter((job: any) => {
      const jobDate = new Date(job.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return jobDate >= weekAgo;
    }).length;

    return (
      <div className="welcome-card-modern candidate-welcome">
        <div className="welcome-content-enhanced">
          <div className="welcome-header">
            <div className="welcome-avatar">
              <div className="user-avatar">{userInitial}</div>
            </div>
            <div className="welcome-text">
              <h1 className="welcome-title-modern">Welcome back, {userName}</h1>
              <p className="welcome-subtitle-modern">Here's your job search activity overview</p>
            </div>
          </div>
        </div>
        
        {/* Enhanced KPI Cards with Icons */}
        <div className="kpi-grid-modern">
            <div className="kpi-card-enhanced invites">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{invites.length}</div>
                <div className="kpi-label">Recruiter Invites</div>
              </div>
              {invites.length > 0 && (
                <div className="kpi-trend positive">+{invites.length} new</div>
              )}
            </div>
            
            <div className="kpi-card-enhanced matches">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{matches.length}</div>
                <div className="kpi-label">Mutual Matches</div>
              </div>
              {matches.length > 0 && (
                <div className="kpi-change">Ready to connect</div>
              )}
            </div>
            
            <div className="kpi-card-enhanced new-jobs">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{newJobs}</div>
                <div className="kpi-label">New Jobs</div>
              </div>
              <div className="kpi-change">This week</div>
            </div>
            
            <div className="kpi-card-enhanced applications">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{appliedLiked.applied_jobs?.length || 0}</div>
                <div className="kpi-label">Applications</div>
              </div>
              <div className="kpi-change">Submitted</div>
            </div>
          </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'recommendations':
        return renderRecommendations();
      case 'invites':
        return renderInvites();
      case 'available':
        return renderAvailableJobs();
      case 'applied':
        return renderAppliedLiked();
      case 'matches':
        return renderMatches();
      case 'messages':
        return <ChatWindow />;
      default:
        return renderRecommendations();
    }
  };

  // Derive userName and userInitial for top navbar
  const userName = userProfile?.name || userProfile?.full_name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="modern-dashboard">
      {/* Top Navigation Bar */}
      <div className="top-navbar">
        <div className="navbar-left">
          <div className="app-logo">
            <span className="logo-text">TalentGraph</span>
          </div>
        </div>
        
        <div className="navbar-center">
          <h2 className="page-title">Candidate Dashboard</h2>
        </div>
        
        <div className="navbar-right">
          <NotificationBellDrawer role="candidate" />
          
          <div className="profile-dropdown">
            <button 
              className="profile-avatar-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="avatar">{userInitial}</div>
              <span className="profile-name">{userName}</span>
              <span className="chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </button>
            
            {showProfileMenu && (
              <div className="profile-menu">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Sidebar Navigation */}
        <div className="sidebar">
          <div style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--gray-200)',
            marginBottom: 'var(--space-6)'
          }}>
            <h3 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--gray-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 var(--space-2) 0'
            }}>
              Dashboard
            </h3>
            <p style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-500)',
              margin: '0',
              lineHeight: 'var(--leading-normal)'
            }}>
              Find your dream opportunity
            </p>
          </div>
          
          <nav className="sidebar-nav">
            {/* Job Discovery Section */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-3)',
                paddingLeft: 'var(--space-6)'
              }}>
                Job Discovery
              </div>
              
              <button 
                className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommendations')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </span>
                <span className="nav-label">AI Recommendations</span>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  background: 'linear-gradient(90deg, var(--accent-primary), #8b5cf6)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'var(--font-semibold)'
                }}>
                  AI
                </span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'available' ? 'active' : ''}`}
                onClick={() => setActiveTab('available')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                </span>
                <span className="nav-label">Browse Jobs</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'invites' ? 'active' : ''}`}
                onClick={() => setActiveTab('invites')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </span>
                <span className="nav-label">Recruiter Invites</span>
                {invites.length > 0 && <span className="nav-badge">{invites.length}</span>}
              </button>
            </div>

            {/* My Applications Section */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-3)',
                paddingLeft: 'var(--space-6)'
              }}>
                My Applications
              </div>
              
              <button 
                className={`nav-item ${activeTab === 'applied' ? 'active' : ''}`}
                onClick={() => setActiveTab('applied')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </span>
                <span className="nav-label">Applied/Liked</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'matches' ? 'active' : ''}`}
                onClick={() => setActiveTab('matches')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </span>
                <span className="nav-label">Matches</span>
                {matches.length > 0 && <span className="nav-badge">{matches.length}</span>}
              </button>
            </div>

            {/* Communication Section */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-3)',
                paddingLeft: 'var(--space-6)'
              }}>
                Communication
              </div>
              
              <button
                className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                <span className="nav-label">Messages</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Welcome Banner */}
          {renderWelcomeCard()}

          {/* Tab Content */}
          <div className="content-section">
            {renderActiveTab()}
          </div>
        </div>
      </div>

      {/* Profile Selection Modal for Applications */}
      {showProfileSelectionModal && pendingApplicationJobId && (
        <div className="cal-drawer-overlay" onClick={() => { setShowProfileSelectionModal(false); setPendingApplicationJobId(null); }}>
          <div 
            className="cal-drawer" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '90%' }}
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
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                        e.currentTarget.style.borderColor = '#7c3aed';
                        e.currentTarget.style.background = '#faf5ff';
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
                          style={{ width: '20px', height: '20px', color: '#7c3aed', flexShrink: 0, marginLeft: '12px' }}
                        >
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
