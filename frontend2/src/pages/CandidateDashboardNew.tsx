import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiClient } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/PremiumDashboard.css';
import '../styles/PremiumDashboardV2.css';
import '../styles/PremiumCards.css';
import '../styles/PremiumModals.css';
import '../styles/CandidateApplied.css';
import '../styles/AIRecommendations.css';
import '../styles/HorizontalDashboard.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import { MeetingSchedulerTab } from '../components/meetings';

const CANDIDATE_TABS = ['recommendations', 'invites', 'available', 'applied', 'matches', 'messages', 'meetings'] as const;

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
  const [currentJobPage, setCurrentJobPage] = useState(1);
  const jobsPerPage = 6;
  const [currentLikedPage, setCurrentLikedPage] = useState(1);
  const likedJobsPerPage = 6;
  const [currentAppliedPage, setCurrentAppliedPage] = useState(1);
  const appliedJobsPerPage = 6;
  const [currentInvitePage, setCurrentInvitePage] = useState(1);
  const invitesPerPage = 6;
  const [currentMatchPage, setCurrentMatchPage] = useState(1);
  const matchesPerPage = 6;

  // ── Invites filter states ──────────────────────────────────
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');
  const [selectedInviteRole, setSelectedInviteRole] = useState('');
  const [selectedInviteWorkType, setSelectedInviteWorkType] = useState('');
  const [inviteLocationFilter, setInviteLocationFilter] = useState('');

  // ── Recommendations filter states ──────────────────────────────────
  const [recommendationsMatchFilter, setRecommendationsMatchFilter] = useState<string>('all');
  const [recSearchTerm, setRecSearchTerm] = useState('');
  const [recRoleFilter, setRecRoleFilter] = useState('all');
  const [recWorkTypeFilter, setRecWorkTypeFilter] = useState('all');
  const [recLocationFilter, setRecLocationFilter] = useState('');
  const [recStatusFilter, setRecStatusFilter] = useState('all');

  // ── Upcoming Interviews ──────────────────────────────────
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);

  // ── Candidate filter states ──────────────────────────────────
  const [candidateRecRoleFilter, setCandidateRecRoleFilter] = useState<string>('all');
  const [candidateRecWorktypeFilter, setCandidateRecWorktypeFilter] = useState<string>('all');
  const [candidateRecMinMatch, setCandidateRecMinMatch] = useState<number>(0);
  const [appliedLikedRoleFilter, setAppliedLikedRoleFilter] = useState<string>('all');
  const [appliedLikedStatusFilter, setAppliedLikedStatusFilter] = useState<string>('all');
  const [appliedLikedSort, setAppliedLikedSort] = useState<'newest' | 'oldest'>('newest');

  // Filter recommendations based on all criteria
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const jobPosting = rec.job_posting || {};
      const matchPercentage = rec.match_percentage || 0;
      
      // Match score filter
      if (recommendationsMatchFilter !== 'all') {
        switch (recommendationsMatchFilter) {
          case '90+':
            if (matchPercentage < 90) return false;
            break;
          case '80-89':
            if (matchPercentage < 80 || matchPercentage >= 90) return false;
            break;
          case '70-79':
            if (matchPercentage < 70 || matchPercentage >= 80) return false;
            break;
          case '60-69':
            if (matchPercentage < 60 || matchPercentage >= 70) return false;
            break;
          case 'below-60':
            if (matchPercentage >= 60) return false;
            break;
        }
      }
      
      // Search filter (job title, keywords, company)
      if (recSearchTerm) {
        const searchLower = recSearchTerm.toLowerCase();
        const titleMatch = (jobPosting.title || '').toLowerCase().includes(searchLower);
        const companyMatch = (jobPosting.company_name || '').toLowerCase().includes(searchLower);
        const descMatch = (jobPosting.description || '').toLowerCase().includes(searchLower);
        if (!titleMatch && !companyMatch && !descMatch) return false;
      }
      
      // Role filter
      if (recRoleFilter !== 'all') {
        const roleMatch = (jobPosting.title || '').toLowerCase().includes(recRoleFilter.toLowerCase());
        if (!roleMatch) return false;
      }
      
      // Work type filter
      if (recWorkTypeFilter !== 'all') {
        if (jobPosting.work_type !== recWorkTypeFilter) return false;
      }
      
      // Location filter
      if (recLocationFilter) {
        const locationLower = recLocationFilter.toLowerCase();
        const jobLocation = (jobPosting.location || '').toLowerCase();
        if (!jobLocation.includes(locationLower)) return false;
      }
      
      // Status filter
      if (recStatusFilter !== 'all') {
        if (recStatusFilter === 'active' && jobPosting.status !== 'published') return false;
        if (recStatusFilter === 'applied') {
          const isApplied = appliedLiked.applied_jobs?.some((aj: any) => aj.id === jobPosting.id);
          if (!isApplied) return false;
        }
        if (recStatusFilter === 'saved') {
          const isLiked = appliedLiked.liked_jobs?.some((lj: any) => lj.id === jobPosting.id);
          if (!isLiked) return false;
        }
      }
      
      return true;
    });
  }, [recommendations, recommendationsMatchFilter, recSearchTerm, recRoleFilter, recWorkTypeFilter, recLocationFilter, recStatusFilter, appliedLiked]);

  // Reset card index when filter changes
  useEffect(() => {
    setRecCardIndex(0);
  }, [recommendationsMatchFilter]);

  // Reset job pagination when filters change
  useEffect(() => {
    setCurrentJobPage(1);
  }, [jobSearchTerm, selectedJobRole, selectedJobWorkType, jobLocationFilter, jobApplicationStatusFilter]);

  useEffect(() => {
    fetchUserProfile();
    fetchJobProfiles();
    fetchInvites();
    fetchAvailableJobs();
    fetchAppliedLiked();
    fetchMatches();
    fetchUpcomingInterviews();
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

  useEffect(() => {
    if (selectedProfileId) {
      fetchRecommendations();
      setRecCardIndex(0);
    }
  }, [selectedProfileId]);

  // Keyboard navigation for recommendation cards
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'recommendations' || !filteredRecommendations?.length) return;
    const total = filteredRecommendations.length;
    if (e.key === 'ArrowRight') {
      setRecCardIndex(prev => Math.min(prev + 1, total - 1));
    } else if (e.key === 'ArrowLeft') {
      setRecCardIndex(prev => Math.max(prev - 1, 0));
    }
  }, [activeTab, filteredRecommendations]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset pagination when filters change in Applied/Liked tabs
  useEffect(() => {
    if (jobListTab === 'liked') {
      setCurrentLikedPage(1);
    } else {
      setCurrentAppliedPage(1);
    }
  }, [appliedLikedRoleFilter, appliedLikedStatusFilter, appliedLikedSort, jobListTab]);

  // Navigation handlers for recommendation cards
  const handlePreviousRec = () => {
    setRecCardIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNextRec = () => {
    setRecCardIndex(prev => Math.min(prev + 1, filteredRecommendations.length - 1));
  };

  // Touch/swipe gesture support for recommendations
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNextRec();
    } else if (isRightSwipe) {
      handlePreviousRec();
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.getCandidateProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchJobProfiles = async () => {
    try {
      const response = await apiClient.getJobProfiles();
      setJobProfiles(response.data);
      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((p: any) => p.id);
      // Honour ?profile= URL param; validate it exists, else fall back to first
      const urlProfileId = new URLSearchParams(window.location.search).get('profile');
      const parsedId = urlProfileId ? parseInt(urlProfileId, 10) : null;
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedProfileId(parsedId);
      } else {
        setSelectedProfileId(response.data[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job profiles:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const response = await apiClient.getCandidateRecommendations(selectedProfileId);
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

  const fetchUpcomingInterviews = async () => {
    try {
      const response = await apiClient.getMeetings({
        upcoming_only: true,
        status: 'scheduled'
      });
      const meetings = response.data || [];
      // Transform backend meeting data to our format
      const interviews = meetings.map((meeting: any) => {
        const startDate = new Date(meeting.scheduled_start);
        const endDate = new Date(meeting.scheduled_end);
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // minutes
        
        return {
          id: meeting.id,
          company: meeting.company_name || 'Company',
          position: meeting.job_title || meeting.title || 'Position',
          date: meeting.scheduled_start,
          time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          duration: `${duration} min`,
          type: meeting.meeting_type === 'video_call' ? 'Video' : meeting.meeting_type === 'phone' ? 'Phone' : 'In-Person',
          meetingLink: meeting.meeting_link || meeting.video_link || '#'
        };
      });
      setUpcomingInterviews(interviews);
    } catch (error: any) {
      console.error('[INTERVIEWS] Error fetching:', error);
      console.error('[INTERVIEWS] Error details:', error?.response?.data);
      // If endpoint returns error, use empty array
      setUpcomingInterviews([]);
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
      console.error('❌ Failed to fetch applied/liked jobs:', error);
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

  

  const renderRecommendations = () => {
    // Helper to get company initial
    const getCompanyInitial = (companyName: string) => {
      return companyName ? companyName.charAt(0).toUpperCase() : 'C';
    };

    // Helper to get top matched skills from actual recommendation data
    const getMatchedSkills = (rec: any) => {
      const posting_skills = rec.job_posting?.posting_skills || [];
      return posting_skills.slice(0, 4).map((sk: any) => ({
        name: sk.skill_name,
        percentage: sk.rating ? (sk.rating * 20) : 75  // Convert rating 1-5 to percentage
      }));
    };

    // Helper to get skill tags
    const getSkillTags = (rec: any) => {
      const skills = rec.job_posting?.posting_skills || [];
      return skills.slice(0, 4).map((sk: any) => sk.skill_name);
    };

    // Generate dynamic AI match reasons based on actual match details
    const generateMatchReason = (rec: any) => {
      const details = rec.match_details || {};
      const reasons: string[] = [];
      
      // Product/Role match
      if (details.product_match >= 30) {
        reasons.push(`Perfect ${rec.job_posting?.product_vendor || 'product'} match`);
      } else if (details.product_match >= 20) {
        reasons.push(`Good ${rec.job_posting?.product_vendor || 'product'} alignment`);
      }
      
      // Skills match
      if (details.skills_match >= 20) {
        reasons.push('strong technical skills alignment');
      } else if (details.skills_match >= 15) {
        reasons.push('good skills match');
      } else if (details.skills_match > 0) {
        reasons.push('some relevant skills');
      }
      
      // Experience match
      if (details.experience_match >= 20) {
        reasons.push('experience level matches perfectly');
      } else if (details.experience_match >= 10) {
        reasons.push('relevant experience level');
      }
      
      // Location match
      if (details.location_match >= 10) {
        reasons.push('location preference aligned');
      }
      
      // Salary match
      if (details.salary_match >= 10) {
        reasons.push('salary expectations in range');
      }
      
      // Worktype preference
      const worktype = rec.job_posting?.worktype;
      if (worktype && details.location_match > 0) {
        reasons.push(`${worktype} work arrangement`);
      }
      
      // Default fallback
      if (reasons.length === 0) {
        return 'This role aligns with your profile and preferences.';
      }
      
      // Capitalize first reason
      if (reasons.length > 0) {
        reasons[0] = reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1);
      }
      
      return reasons.join(', ') + '.';
    };


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
        ) : filteredRecommendations.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">No matches for this filter</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your match score filter to see more recommendations.</p>
            <button 
              onClick={() => setRecommendationsMatchFilter('all')}
              className="mt-4 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <>
            {/* KPI Banner */}
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
                      ? Math.round(recommendations.reduce((sum, r) => sum + (r.match_percentage || 0), 0) / recommendations.length) 
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
                  {appliedLiked.applied_jobs?.filter((job: any) => job.application_status === 'in_review').length || 0} in active review
                </p>
              </div>
            </div>

            {/* Recommendations Filter Bar */}
            <div className="rec-filter-bar">
              {/* Search Input */}
              <div className="rec-filter-item rec-filter-search">
                <label className="rec-filter-label">SEARCH</label>
                <div className="rec-search-input-wrapper">
                  <svg className="rec-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    className="rec-search-input"
                    placeholder="Job title, keywords..."
                    value={recSearchTerm}
                    onChange={(e) => setRecSearchTerm(e.target.value)}
                  />
                  {recSearchTerm && (
                    <button
                      className="rec-search-clear"
                      onClick={() => setRecSearchTerm('')}
                      aria-label="Clear search"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="rec-filter-item">
                <label className="rec-filter-label">ROLE</label>
                <select
                  className="rec-filter-select"
                  value={recRoleFilter}
                  onChange={(e) => setRecRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="designer">Designer</option>
                  <option value="engineer">Engineer</option>
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                  <option value="analyst">Analyst</option>
                </select>
              </div>

              {/* Work Type Dropdown */}
              <div className="rec-filter-item">
                <label className="rec-filter-label">WORK TYPE</label>
                <select
                  className="rec-filter-select"
                  value={recWorkTypeFilter}
                  onChange={(e) => setRecWorkTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="remote">Remote</option>
                </select>
              </div>

              {/* Location Input */}
              <div className="rec-filter-item">
                <label className="rec-filter-label">LOCATION</label>
                <input
                  type="text"
                  className="rec-filter-input"
                  placeholder="City or State"
                  value={recLocationFilter}
                  onChange={(e) => setRecLocationFilter(e.target.value)}
                />
              </div>

              {/* Status Dropdown */}
              <div className="rec-filter-item">
                <label className="rec-filter-label">STATUS</label>
                <select
                  className="rec-filter-select"
                  value={recStatusFilter}
                  onChange={(e) => setRecStatusFilter(e.target.value)}
                >
                  <option value="all">All Jobs</option>
                  <option value="active">Active</option>
                  <option value="applied">Applied</option>
                  <option value="saved">Saved</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="rec-results-count">
              Showing {filteredRecommendations.length} of {recommendations.length} jobs
            </div>

            <div className="ai-recommendations-container">
            {/* Left Column - Main Content */}
            <div className="ai-recs-main">
              {/* Job Card */}
              {(() => {
                const rec = filteredRecommendations[recCardIndex];
                if (!rec) return null;

                const jobPosting = rec.job_posting;
                const companyName = jobPosting.company_name || 'Company';
                const matchPercentage = rec.match_percentage || 0;
                const matchedSkills = getMatchedSkills(rec);
                const skillTags = getSkillTags(rec);

                // Log match details for debugging
                return (
                  <div 
                    className="ai-job-card"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {/* Match Badge */}
                    <div className="ai-match-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {matchPercentage}% Match
                    </div>

                    {/* Company Header */}
                    <div className="ai-job-card-header">
                      <div className="ai-company-logo">
                        {getCompanyInitial(companyName)}
                      </div>
                      <div className="ai-company-info">
                        <div className="ai-company-name">{companyName}</div>
                        <div className="ai-company-verified">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Verified company
                        </div>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h3 className="ai-job-title">{jobPosting.job_title}</h3>
                    <p className="ai-job-team">{jobPosting.job_role || 'Design Systems Team'}</p>

                    {/* Job Details Grid */}
                    <div className="ai-job-details">
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          Salary
                        </div>
                        <div className="ai-job-detail-value">
                          {jobPosting.salary_min && jobPosting.salary_max 
                            ? `$${Math.floor(jobPosting.salary_min / 1000)}k-${Math.floor(jobPosting.salary_max / 1000)}k`
                            : 'Not disclosed'}
                        </div>
                      </div>
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                          Type
                        </div>
                        <div className="ai-job-detail-value">{jobPosting.employment_type || 'Full-time'}</div>
                      </div>
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Location
                        </div>
                        <div className="ai-job-detail-value">{jobPosting.worktype || jobPosting.location || 'Remote'}</div>
                      </div>
                    </div>

                    {/* AI Match Reason */}
                    <div className="ai-match-reason">
                      <div className="ai-match-reason-header">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        <span className="ai-match-reason-title">AI Match Reason</span>
                      </div>
                      <p className="ai-match-reason-text">
                        {generateMatchReason(rec)}
                      </p>
                      
                      {/* Match Score Breakdown */}
                      {rec.match_details && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {rec.match_details.product_match > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '80px' }}>Role Match</span>
                              <div style={{ flex: 1, height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${(rec.match_details.product_match / 35) * 100}%`, 
                                  height: '100%', 
                                  background: '#7B5EA7',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#7B5EA7', minWidth: '30px', textAlign: 'right' }}>
                                {rec.match_details.product_match}%
                              </span>
                            </div>
                          )}
                          {rec.match_details.skills_match > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '80px' }}>Skills</span>
                              <div style={{ flex: 1, height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${(rec.match_details.skills_match / 25) * 100}%`, 
                                  height: '100%', 
                                  background: '#10B981',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', minWidth: '30px', textAlign: 'right' }}>
                                {rec.match_details.skills_match}%
                              </span>
                            </div>
                          )}
                          {rec.match_details.experience_match > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '80px' }}>Experience</span>
                              <div style={{ flex: 1, height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${(rec.match_details.experience_match / 20) * 100}%`, 
                                  height: '100%', 
                                  background: '#3B82F6',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', minWidth: '30px', textAlign: 'right' }}>
                                {rec.match_details.experience_match}%
                              </span>
                            </div>
                          )}
                          {(rec.match_details.salary_match > 0 || rec.match_details.location_match > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '80px' }}>Preferences</span>
                              <div style={{ flex: 1, height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${((rec.match_details.salary_match + rec.match_details.location_match) / 20) * 100}%`, 
                                  height: '100%', 
                                  background: '#F59E0B',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', minWidth: '30px', textAlign: 'right' }}>
                                {rec.match_details.salary_match + rec.match_details.location_match}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Skill Tags */}
                    <div className="ai-skill-tags">
                      {skillTags.map((skill, idx) => (
                        <span key={idx} className="ai-skill-tag">{skill}</span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="ai-action-buttons">
                      <button 
                        className="ai-action-btn pass"
                        onClick={() => handleSwipePass(jobPosting.id)}
                        disabled={rec.already_swiped && rec.swipe_action === 'pass'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        {rec.already_swiped && rec.swipe_action === 'pass' ? 'Passed' : 'Pass'}
                      </button>
                      <button 
                        className="ai-action-btn save"
                        onClick={() => handleSwipeLike(jobPosting.id)}
                        disabled={rec.already_swiped && rec.swipe_action === 'like'}
                      >
                        <svg viewBox="0 0 24 24" fill={rec.already_swiped && rec.swipe_action === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
                        </svg>
                        {rec.already_swiped && rec.swipe_action === 'like' ? 'Saved' : 'Save'}
                      </button>
                      <button 
                        className="ai-action-btn apply"
                        onClick={() => handleApply(jobPosting.id)}
                        disabled={rec.already_applied || applyingJobId === jobPosting.id}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {rec.already_applied ? 'Applied' : (applyingJobId === jobPosting.id ? 'Applying...' : 'Apply')}
                      </button>
                      <button 
                        className="ai-action-btn view-details"
                        onClick={() => setViewRecommendationJob(rec)}
                      >
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Pagination with Navigation Arrows */}
              <div className="ai-pagination">
                <button 
                  className="ai-pagination-arrow ai-pagination-arrow-left"
                  onClick={handlePreviousRec}
                  disabled={recCardIndex === 0}
                  aria-label="Previous recommendation"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                
                <div className="ai-pagination-content">
                  <div className="ai-pagination-dots">
                    {filteredRecommendations.map((_, idx) => (
                      <div
                        key={idx}
                        className={`ai-pagination-dot ${idx === recCardIndex ? 'active' : ''}`}
                        onClick={() => setRecCardIndex(idx)}
                        role="button"
                        aria-label={`Go to recommendation ${idx + 1}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setRecCardIndex(idx);
                          }
                        }}
                      />
                    ))}
                  </div>
                  <span className="ai-pagination-text">{recCardIndex + 1} of {filteredRecommendations.length}</span>
                </div>

                <button 
                  className="ai-pagination-arrow ai-pagination-arrow-right"
                  onClick={handleNextRec}
                  disabled={recCardIndex === filteredRecommendations.length - 1}
                  aria-label="Next recommendation"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="ai-recs-sidebar">
              {/* Profile Completion Card */}
              <div className="ai-profile-completion-card">
                <div className="ai-profile-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span className="ai-profile-title">Profile Completion</span>
                  </div>
                </div>
                <p className="ai-profile-subtitle">
                  Add your portfolio link and 2 case studies to boost match accuracy by up to 12%.
                </p>
                <button className="ai-profile-cta" onClick={() => navigate('/candidate/profile')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Complete Profile
                </button>
              </div>

              {/* Upcoming Interviews Card */}
              <div className="ai-interviews-card">
                <div className="ai-interviews-header">
                  <h3 className="ai-interviews-title">Upcoming Interviews</h3>
                  {upcomingInterviews.length > 0 && (
                    <span className="ai-interviews-badge">
                      {upcomingInterviews.length} scheduled
                    </span>
                  )}
                </div>
                
                {upcomingInterviews.length > 0 ? (
                  <div className="ai-interviews-list">
                    {upcomingInterviews.map((interview) => {
                      const date = new Date(interview.date);
                      const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                      const day = date.getDate();
                      
                      return (
                        <div key={interview.id} className="ai-interview-item">
                          <div className="ai-interview-date-badge">
                            <span className="ai-interview-month">{month}</span>
                            <span className="ai-interview-day">{day}</span>
                          </div>
                          
                          <div className="ai-interview-details">
                            <h4 className="ai-interview-company-role">
                              {interview.company} — {interview.position}
                            </h4>
                            <div className="ai-interview-meta">
                              <span className="ai-interview-time">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {interview.time}
                              </span>
                              <span className="ai-interview-duration">· {interview.duration}</span>
                            </div>
                            <div className="ai-interview-type">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                              </svg>
                              {interview.type}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ai-interviews-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p>No upcoming interviews scheduled</p>
                  </div>
                )}
              </div>

              {/* Pro Tip Card */}
              <div className="ai-pro-tip-card">
                <div className="ai-pro-tip-header">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span className="ai-pro-tip-title">Pro Tip</span>
                </div>
                <p className="ai-pro-tip-text">
                  Swipe right on roles you love. Our AI learns from every interaction to improve your matches.
                </p>
              </div>
            </div>
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
              {/* Product/Vendor Section */}
              {(viewRecommendationJob.job_posting.product_vendor || viewRecommendationJob.job_posting.product_type) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Product & Technology
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewRecommendationJob.job_posting.product_vendor && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Product/Vendor</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_vendor}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.product_type && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Product Type</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_type}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.job_category && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Category</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.job_category}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Match Score Section */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  AI Match Analysis
                </div>
                <div className="cal-drawer-field">
                  <span className="cal-drawer-field-label">Overall Match</span>
                  <span className="cal-drawer-field-value" style={{ color: '#7B5EA7', fontWeight: 600, fontSize: '18px' }}>{viewRecommendationJob.match_percentage}%</span>
                </div>
                {viewRecommendationJob.match_details && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewRecommendationJob.match_details.product_match > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', minWidth: '90px' }}>Role Match</span>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(viewRecommendationJob.match_details.product_match / 35) * 100}%`, height: '100%', background: '#7B5EA7' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#7B5EA7', minWidth: '35px', textAlign: 'right' }}>{viewRecommendationJob.match_details.product_match}%</span>
                      </div>
                    )}
                    {viewRecommendationJob.match_details.skills_match > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', minWidth: '90px' }}>Skills</span>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(viewRecommendationJob.match_details.skills_match / 25) * 100}%`, height: '100%', background: '#10B981' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', minWidth: '35px', textAlign: 'right' }}>{viewRecommendationJob.match_details.skills_match}%</span>
                      </div>
                    )}
                    {viewRecommendationJob.match_details.experience_match > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', minWidth: '90px' }}>Experience</span>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(viewRecommendationJob.match_details.experience_match / 20) * 100}%`, height: '100%', background: '#3B82F6' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', minWidth: '35px', textAlign: 'right' }}>{viewRecommendationJob.match_details.experience_match}%</span>
                      </div>
                    )}
                    {(viewRecommendationJob.match_details.salary_match > 0 || viewRecommendationJob.match_details.location_match > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', minWidth: '90px' }}>Preferences</span>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${((viewRecommendationJob.match_details.salary_match + viewRecommendationJob.match_details.location_match) / 20) * 100}%`, height: '100%', background: '#F59E0B' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', minWidth: '35px', textAlign: 'right' }}>{viewRecommendationJob.match_details.salary_match + viewRecommendationJob.match_details.location_match}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Compensation Section */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Compensation
                </div>
                <div className="cal-drawer-meta-grid">
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Salary Range</span>
                    <span className="cal-drawer-field-value">
                      ${viewRecommendationJob.job_posting.salary_min ? Math.floor(viewRecommendationJob.job_posting.salary_min / 1000) : '?'}k - 
                      ${viewRecommendationJob.job_posting.salary_max ? Math.floor(viewRecommendationJob.job_posting.salary_max / 1000) : '?'}k
                      {viewRecommendationJob.job_posting.salary_currency && ` ${viewRecommendationJob.job_posting.salary_currency.toUpperCase()}`}
                    </span>
                  </div>
                  {viewRecommendationJob.job_posting.pay_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Pay Type</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.pay_type === 'hourly' ? 'Hourly' : 'Annually'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Overview Section */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Position Details
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
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.employment_type.toUpperCase()}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.seniority_level}</span>
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
      setCurrentInvitePage(1);
    };

    // Pagination calculations
    const totalInvitePages = Math.ceil(filteredInvites.length / invitesPerPage);
    const startInviteIndex = (currentInvitePage - 1) * invitesPerPage;
    const endInviteIndex = startInviteIndex + invitesPerPage;
    const paginatedInvites = filteredInvites.slice(startInviteIndex, endInviteIndex);

    // Generate page numbers for pagination
    const getInvitePageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalInvitePages <= 7) {
        for (let i = 1; i <= totalInvitePages; i++) pages.push(i);
      } else {
        if (currentInvitePage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalInvitePages);
        } else if (currentInvitePage >= totalInvitePages - 2) {
          pages.push(1, '...', totalInvitePages - 3, totalInvitePages - 2, totalInvitePages - 1, totalInvitePages);
        } else {
          pages.push(1, '...', currentInvitePage - 1, currentInvitePage, currentInvitePage + 1, '...', totalInvitePages);
        }
      }
      return pages;
    };

    return (
      <>
        {/* Invites Section Header */}
        <div className="section-header mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recruiter Invites</h2>
          <p className="text-sm text-gray-600 mt-1">Review personalized job invitations from recruiters</p>
          {filteredInvites.length !== invites.length && (
            <p className="text-sm text-gray-500 mt-2">
              Showing {paginatedInvites.length} of {filteredInvites.length} invites
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
          {paginatedInvites.map((invite: any) => {
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

        {/* Pagination Footer for Invites */}
        {filteredInvites.length > 0 && totalInvitePages > 1 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <button
              disabled={currentInvitePage === 1}
              onClick={() => setCurrentInvitePage(prev => Math.max(1, prev - 1))}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: currentInvitePage === 1 ? '#f8fafc' : 'white',
                color: currentInvitePage === 1 ? '#94a3b8' : '#475569',
                fontSize: '14px',
                fontWeight: '600',
                cursor: currentInvitePage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Previous
            </button>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {getInvitePageNumbers().map((pageNum, idx) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentInvitePage(pageNum as number)}
                    style={{
                      minWidth: '40px',
                      height: '40px',
                      border: currentInvitePage === pageNum ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: currentInvitePage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'white',
                      color: currentInvitePage === pageNum ? 'white' : '#475569',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            <button
              disabled={currentInvitePage === totalInvitePages}
              onClick={() => setCurrentInvitePage(prev => Math.min(totalInvitePages, prev + 1))}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: currentInvitePage === totalInvitePages ? '#f8fafc' : 'white',
                color: currentInvitePage === totalInvitePages ? '#94a3b8' : '#475569',
                fontSize: '14px',
                fontWeight: '600',
                cursor: currentInvitePage === totalInvitePages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}

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
      setCurrentJobPage(1);
    };

    // Remove individual filter
    const removeFilter = (filterType: string) => {
      switch(filterType) {
        case 'search':
          setJobSearchTerm('');
          break;
        case 'role':
          setSelectedJobRole('');
          break;
        case 'worktype':
          setSelectedJobWorkType('');
          break;
        case 'location':
          setJobLocationFilter('');
          break;
        case 'status':
          setJobApplicationStatusFilter('');
          break;
      }
      setCurrentJobPage(1);
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const startIndex = (currentJobPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentJobPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentJobPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', currentJobPage - 1, currentJobPage, currentJobPage + 1, '...', totalPages);
        }
      }
      return pages;
    };

    return (
      <>
        {/* Page Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Browse Jobs</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Browse and filter open roles that match your interests</p>
        </div>

        {/* Modern Filter Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
          marginBottom: '24px',
          border: '1px solid #E5E7EB'
        }}>
          {/* Top Row: Search + Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 350px', minWidth: '280px' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  style={{ 
                    width: '100%', 
                    paddingLeft: '46px', 
                    paddingRight: '16px', 
                    height: '48px', 
                    fontSize: '15px', 
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  placeholder="Search by title, company, or keywords..."
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                />
              </div>
            </div>

            {/* Role Dropdown */}
            <div style={{ flex: '0 1 200px' }}>
              <select
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  fontSize: '14px', 
                  borderRadius: '12px', 
                  padding: '0 16px',
                  paddingRight: '40px',
                  border: '1px solid #E5E7EB',
                  background: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                value={selectedJobRole}
                onChange={(e) => setSelectedJobRole(e.target.value)}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
              >
                <option value="">All Roles</option>
                {availableJobRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Location Dropdown */}
            <div style={{ flex: '0 1 200px' }}>
              <select
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  fontSize: '14px', 
                  borderRadius: '12px', 
                  padding: '0 16px',
                  paddingRight: '40px',
                  border: '1px solid #E5E7EB',
                  background: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                value={jobLocationFilter}
                onChange={(e) => setJobLocationFilter(e.target.value)}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
              >
                <option value="">Any Location</option>
                <option value="Remote">Remote</option>
                <option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option>
                <option value="Austin">Austin</option>
                <option value="Seattle">Seattle</option>
                <option value="Boston">Boston</option>
                <option value="Chicago">Chicago</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Work Mode Buttons + Clear */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedJobWorkType('')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: selectedJobWorkType === '' ? 'none' : '1px solid #E5E7EB',
                  background: selectedJobWorkType === '' ? '#6366f1' : 'white',
                  color: selectedJobWorkType === '' ? 'white' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedJobWorkType !== '') {
                    e.currentTarget.style.background = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedJobWorkType !== '') {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                All
              </button>
              <button
                onClick={() => setSelectedJobWorkType('Remote')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: selectedJobWorkType === 'Remote' ? 'none' : '1px solid #E5E7EB',
                  background: selectedJobWorkType === 'Remote' ? '#6366f1' : 'white',
                  color: selectedJobWorkType === 'Remote' ? 'white' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedJobWorkType !== 'Remote') {
                    e.currentTarget.style.background = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedJobWorkType !== 'Remote') {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                Remote
              </button>
              <button
                onClick={() => setSelectedJobWorkType('Hybrid')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: selectedJobWorkType === 'Hybrid' ? 'none' : '1px solid #E5E7EB',
                  background: selectedJobWorkType === 'Hybrid' ? '#6366f1' : 'white',
                  color: selectedJobWorkType === 'Hybrid' ? 'white' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedJobWorkType !== 'Hybrid') {
                    e.currentTarget.style.background = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedJobWorkType !== 'Hybrid') {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                Hybrid
              </button>
              <button
                onClick={() => setSelectedJobWorkType('Onsite')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: selectedJobWorkType === 'Onsite' ? 'none' : '1px solid #E5E7EB',
                  background: selectedJobWorkType === 'Onsite' ? '#6366f1' : 'white',
                  color: selectedJobWorkType === 'Onsite' ? 'white' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedJobWorkType !== 'Onsite') {
                    e.currentTarget.style.background = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedJobWorkType !== 'Onsite') {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                Onsite
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllJobFilters}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#6366f1',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>Active filters:</span>
                {jobSearchTerm && (
                  <button
                    onClick={() => removeFilter('search')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    Search: {jobSearchTerm}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
                {selectedJobRole && (
                  <button
                    onClick={() => removeFilter('role')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    Role: {selectedJobRole}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
                {selectedJobWorkType && (
                  <button
                    onClick={() => removeFilter('worktype')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    {selectedJobWorkType}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
                {jobLocationFilter && (
                  <button
                    onClick={() => removeFilter('location')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    Location: {jobLocationFilter}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
                {jobApplicationStatusFilter && (
                  <button
                    onClick={() => removeFilter('status')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    {jobApplicationStatusFilter === 'applied' ? 'Applied' : 'Not Applied'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={clearAllJobFilters}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#6366f1',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eef2ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

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

        {/* Jobs Grid - Match Style */}
        {filteredJobs.length > 0 && (
          <>
            <style>{`
              @media (max-width: 1400px) {
                .available-jobs-grid { grid-template-columns: repeat(3, 1fr) !important; }
              }
              @media (max-width: 1200px) {
                .available-jobs-grid { grid-template-columns: repeat(2, 1fr) !important; }
              }
              @media (max-width: 768px) {
                .available-jobs-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div className="available-jobs-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              padding: '0'
            }}>
            {paginatedJobs.map((job: any) => {
              const companyInitial = job.company_name?.charAt(0).toUpperCase() || 'C';
              const salary = job.salary_min && job.salary_max
                ? `${job.salary_currency?.toUpperCase() || 'USD'} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
                : null;

              return (
                <div key={job.id} style={{
                  background: 'white',
                  border: '1px solid #E2E4EC',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(123, 94, 167, 0.06)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#A78BDB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 94, 167, 0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#E2E4EC';
                }}>
                  {/* Header: Company Logo */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#7c3aed',
                      marginBottom: '8px'
                    }}>
                      {companyInitial}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                      {job.company_name || 'Company'}
                    </div>
                    {job.end_date && (
                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Apply by {new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  {/* Job Title */}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '6px',
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {job.job_title}
                  </h3>

                  {/* Department/Category */}
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '20px',
                    fontWeight: '500'
                  }}>
                    {job.job_role || job.department || 'Platform & Tools'}
                  </p>
                  {/* Job Details Grid (2x2) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {job.location || 'Remote'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {job.employment_type || 'Full-time'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {salary || 'Competitive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                      </svg>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {job.worktype || 'Onsite'}
                      </span>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                    <button
                      onClick={() => setViewAvailableJob(job)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '2px solid #E2E4EC',
                        background: 'white',
                        color: '#111827',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#7c3aed';
                        e.currentTarget.style.color = '#7c3aed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#E2E4EC';
                        e.currentTarget.style.color = '#111827';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View Details
                    </button>
                    <button
                      onClick={() => handleApply(job.id)}
                      disabled={job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: job.already_applied 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : '#111827',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: (job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id) ? 0.9 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!job.already_applied && applyingJobId !== job.id && withdrawingJobId !== job.id) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.4)';
                          e.currentTarget.style.background = '#1f2937';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!job.already_applied) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.background = '#111827';
                        }
                      }}
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
                          Applied
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
          </>
        )}

        {/* Pagination Footer */}
        {filteredJobs.length > 0 && totalPages > 1 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)' }}>
              Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredJobs.length)}</strong> of <strong>{filteredJobs.length}</strong> jobs
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Previous Button */}
              <button
                onClick={() => setCurrentJobPage(prev => Math.max(1, prev - 1))}
                disabled={currentJobPage === 1}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: currentJobPage === 1 ? '#f8fafc' : 'white',
                  cursor: currentJobPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentJobPage === 1 ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentJobPage !== 1) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentJobPage !== 1) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentJobPage(page as number)}
                    style={{
                      minWidth: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: currentJobPage === page ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: currentJobPage === page ? '#6366f1' : 'white',
                      color: currentJobPage === page ? 'white' : '#475569',
                      fontSize: '14px',
                      fontWeight: currentJobPage === page ? 600 : 500,
                      cursor: 'pointer',
                      padding: '0 12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentJobPage !== page) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentJobPage !== page) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    {page}
                  </button>
                )
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentJobPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentJobPage === totalPages}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: currentJobPage === totalPages ? '#f8fafc' : 'white',
                  cursor: currentJobPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentJobPage === totalPages ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentJobPage !== totalPages) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentJobPage !== totalPages) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
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

    // Calculate application statistics
    const totalApplied = applied_jobs.length;
    const inReview = applied_jobs.filter((job: any) => 
      job.application_status?.toLowerCase().includes('review') || 
      job.status?.toLowerCase().includes('review')
    ).length;
    const interviews = applied_jobs.filter((job: any) => 
      job.application_status?.toLowerCase().includes('interview') || 
      job.status?.toLowerCase().includes('interview') ||
      job.interview_scheduled
    ).length;
    const offers = applied_jobs.filter((job: any) => 
      job.application_status?.toLowerCase().includes('offer') || 
      job.status?.toLowerCase().includes('offer')
    ).length;

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

    // Pagination logic for liked jobs
    const currentPage = jobListTab === 'liked' ? currentLikedPage : currentAppliedPage;
    const itemsPerPage = jobListTab === 'liked' ? likedJobsPerPage : appliedJobsPerPage;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    // Page numbers logic for pagination
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
      }
      return pages;
    };

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

      // Determine application progress stage
      const getApplicationStage = () => {
        const status = (job.application_status || job.status || '').toLowerCase();
        if (status.includes('offer')) return 4;
        if (status.includes('interview') || job.interview_scheduled) return 3;
        if (status.includes('review')) return 2;
        return 1; // submitted
      };

      const stage = type === 'applied' ? getApplicationStage() : 0;

      // LIKED JOBS - Professional Card Design (3 per row)
      if (type === 'liked') {
        const companyInitial = job.company_name?.charAt(0).toUpperCase() || 'C';
        
        return (
          <div key={key} style={{
            background: 'white',
            border: '1px solid #E2E4EC',
            borderRadius: '16px',
            padding: '24px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(123, 94, 167, 0.06)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#A78BDB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 94, 167, 0.06)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E2E4EC';
          }}>
            {/* Header: Company Logo */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                color: '#7c3aed',
                marginBottom: '8px'
              }}>
                {companyInitial}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                {job.company_name}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                Posted {new Date(job.liked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Job Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '6px',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {job.job_title}
            </h3>

            {/* Department/Category */}
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
              fontWeight: '500'
            }}>
              {job.job_role || job.department || 'Platform & Tools'}
            </p>

            {/* Job Details Grid (2x2) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {job.location || 'Remote'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {job.employment_type || 'Full-time'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {salary || '$180-240k'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {job.applicants_count || '87'} applied
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
              <button 
                onClick={() => setDrawerJob({ ...job, _type: type })}
                style={{
                  width: '40px',
                  height: '40px',
                  border: '1.5px solid #e5e7eb',
                  background: 'white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.background = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={job.already_applied ? '#10b981' : 'none'} stroke={job.already_applied ? '#10b981' : '#9ca3af'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button 
                onClick={() => setDrawerJob({ ...job, _type: type })}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  border: '1.5px solid #e5e7eb',
                  background: 'white',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = 'white';
                }}
              >
                Details
              </button>
              <button 
                onClick={() => handleApply(job.job_id)}
                disabled={isApplying || withdrawingJobId === job.job_id}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  border: 'none',
                  background: isApplied ? '#10b981' : ((isApplying || withdrawingJobId === job.job_id) ? '#9ca3af' : '#111827'),
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: (isApplying || withdrawingJobId === job.job_id) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isApplying && withdrawingJobId !== job.job_id && !isApplied) {
                    e.currentTarget.style.background = '#1f2937';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isApplied && !isApplying && withdrawingJobId !== job.job_id) {
                    e.currentTarget.style.background = '#111827';
                  }
                }}
              >
                {isApplying ? 'Applying…' : withdrawingJobId === job.job_id ? 'Withdrawing…' : isApplied ? 'Applied ✓' : 'Apply'}
              </button>
            </div>
          </div>
        );
      }

      // APPLIED JOBS - Rectangular Full-Width Card
      return (
        <div 
          key={key} 
          className="cal-card" 
          style={{ 
            position: 'relative',
            transition: 'all 0.2s',
            cursor: 'pointer',
            display: 'grid',
            gridTemplateColumns: '1fr 2fr auto',
            gap: '32px',
            alignItems: 'start',
            padding: '32px',
            marginBottom: '24px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#A78BDB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E2E4EC';
          }}>
          {/* Progress Bar for Applied Jobs */}
          {type === 'applied' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: '#f1f5f9',
              borderRadius: '8px 8px 0 0',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(stage / 4) * 100}%`,
                background: stage === 4 ? '#10b981' : stage === 3 ? '#6366f1' : stage === 2 ? '#f59e0b' : '#94a3b8',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          {/* Left Column: Company & Job Info */}
          <div style={{ paddingTop: '8px' }}>
            <h4 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#111827', 
              marginBottom: '6px', 
              lineHeight: '1.3' 
            }}>
              {job.job_title}
            </h4>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginBottom: '12px', 
              fontWeight: '500' 
            }}>
              {job.company_name}
              {job.job_role && <><span style={{ margin: '0 6px' }}>·</span>{job.job_role}</>}
            </div>
            {job.status && (
              <span className={`cal-status-chip ${getStatusClass(job.status)}`} style={{ display: 'inline-flex' }}>
                {job.status}
              </span>
            )}
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
              {dateStr}
            </div>
          </div>

          {/* Center Column: Timeline & Job Details */}
          <div style={{ paddingTop: '8px' }}>

            {/* Application Progress Tracker */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 0',
                marginBottom: '16px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: stage >= 1 ? '#6366f1' : '#e2e8f0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {stage >= 1 ? '✓' : '1'}
                  </div>
                  <span style={{ fontSize: '11px', color: stage >= 1 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                    Submitted
                  </span>
                </div>
                <div style={{ width: '24px', height: '2px', background: stage >= 2 ? '#6366f1' : '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: stage >= 2 ? '#f59e0b' : '#e2e8f0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {stage >= 2 ? '✓' : '2'}
                  </div>
                  <span style={{ fontSize: '11px', color: stage >= 2 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                    In Review
                  </span>
                </div>
                <div style={{ width: '24px', height: '2px', background: stage >= 3 ? '#6366f1' : '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: stage >= 3 ? '#6366f1' : '#e2e8f0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {stage >= 3 ? '✓' : '3'}
                  </div>
                  <span style={{ fontSize: '11px', color: stage >= 3 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                    Interview
                  </span>
                </div>
                <div style={{ width: '24px', height: '2px', background: stage >= 4 ? '#10b981' : '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: stage >= 4 ? '#10b981' : '#e2e8f0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {stage >= 4 ? '✓' : '4'}
                  </div>
                  <span style={{ fontSize: '11px', color: stage >= 4 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                    Offer
                  </span>
                </div>
              </div>

            {/* Job Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px 16px'
            }}>
              {job.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.location}</span>
                </div>
              )}
              {job.worktype && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.worktype}</span>
                </div>
              )}
              {job.employment_type && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.employment_type}</span>
                </div>
              )}
              {job.seniority_level && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.seniority_level}</span>
                </div>
              )}
              {salary && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{salary}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Actions */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingTop: '8px',
            minWidth: '180px'
          }}>
            <button 
              onClick={() => setDrawerJob({ ...job, _type: type })}
              style={{ 
                padding: '12px 20px',
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
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = 'white';
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Details
            </button>
            <button
              onClick={() => handleApply(job.job_id)}
              disabled={isApplying || withdrawingJobId === job.job_id}
              style={{ 
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isApplied ? '#10b981' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (isApplying || withdrawingJobId === job.job_id) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: (isApplying || withdrawingJobId === job.job_id) ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isApplying && withdrawingJobId !== job.job_id) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  Applied ✓
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
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

        {/* Application Statistics Summary (for Applied tab only) */}
        {jobListTab === 'applied' && applied_jobs.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            margin: '24px 0',
          }}>
            {/* Total Applied */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{totalApplied}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Total Applied</div>
              </div>
            </div>

            {/* In Review */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{inReview}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>In Review</div>
              </div>
            </div>

            {/* Interviews */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{interviews}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Interviews</div>
              </div>
            </div>

            {/* Offers */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{offers}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Offers</div>
              </div>
            </div>
          </div>
        )}

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
              {jobListTab === 'liked' && totalPages > 1
                ? `Showing ${startIndex + 1}–${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length}`
                : `Showing ${filteredItems.length} of ${rawItems.length}`}
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
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: jobListTab === 'applied' ? '1fr' : 'repeat(3, 1fr)',
              gap: jobListTab === 'applied' ? '0' : '20px',
              padding: '0'
            }}>
              {paginatedItems.map((job: any) => renderCard(job, jobListTab))}
            </div>

            {/* Pagination Footer for Applied Jobs */}
            {jobListTab === 'applied' && filteredItems.length > 0 && totalPages > 1 && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px 20px',
                marginTop: '24px',
                border: '1px solid var(--border-color, #e2e8f0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentAppliedPage(prev => Math.max(1, prev - 1));
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentPage === 1 ? '#f8fafc' : 'white',
                    color: currentPage === 1 ? '#94a3b8' : '#475569',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Previous
                </button>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentAppliedPage(pageNum as number);
                        }}
                        style={{
                          minWidth: '40px',
                          height: '40px',
                          border: currentPage === pageNum ? 'none' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: currentPage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'white',
                          color: currentPage === pageNum ? 'white' : '#475569',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentAppliedPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentPage === totalPages ? '#f8fafc' : 'white',
                    color: currentPage === totalPages ? '#94a3b8' : '#475569',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Pagination Footer for Liked Jobs */}
            {jobListTab === 'liked' && filteredItems.length > 0 && totalPages > 1 && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px 20px',
                marginTop: '24px',
                border: '1px solid var(--border-color, #e2e8f0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)' }}>
                  Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredItems.length)}</strong> of <strong>{filteredItems.length}</strong> jobs
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentLikedPage(prev => Math.max(1, prev - 1))}
                    disabled={currentLikedPage === 1}
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: currentLikedPage === 1 ? '#f8fafc' : 'white',
                      cursor: currentLikedPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentLikedPage === 1 ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentLikedPage !== 1) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentLikedPage !== 1) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentLikedPage(page as number)}
                        style={{
                          minWidth: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: currentLikedPage === page ? 'none' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: currentLikedPage === page ? '#6366f1' : 'white',
                          color: currentLikedPage === page ? 'white' : '#475569',
                          fontSize: '14px',
                          fontWeight: currentLikedPage === page ? 600 : 500,
                          cursor: 'pointer',
                          padding: '0 12px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (currentLikedPage !== page) {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentLikedPage !== page) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }
                        }}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentLikedPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentLikedPage === totalPages}
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: currentLikedPage === totalPages ? '#f8fafc' : 'white',
                      cursor: currentLikedPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentLikedPage === totalPages ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentLikedPage !== totalPages) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentLikedPage !== totalPages) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
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

    // Pagination calculations
    const totalMatchPages = Math.ceil(matches.length / matchesPerPage);
    const startMatchIndex = (currentMatchPage - 1) * matchesPerPage;
    const endMatchIndex = startMatchIndex + matchesPerPage;
    const paginatedMatches = matches.slice(startMatchIndex, endMatchIndex);

    // Generate page numbers for pagination
    const getMatchPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalMatchPages <= 7) {
        for (let i = 1; i <= totalMatchPages; i++) pages.push(i);
      } else {
        if (currentMatchPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalMatchPages);
        } else if (currentMatchPage >= totalMatchPages - 2) {
          pages.push(1, '...', totalMatchPages - 3, totalMatchPages - 2, totalMatchPages - 1, totalMatchPages);
        } else {
          pages.push(1, '...', currentMatchPage - 1, currentMatchPage, currentMatchPage + 1, '...', totalMatchPages);
        }
      }
      return pages;
    };

    const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
      if (!min && !max) return null;
      const c = currency || 'USD';
      if (min && max) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
      if (min) return `${c} ${min.toLocaleString()}+`;
      return `${c} ${max!.toLocaleString()}`;
    };

    return (
      <>
        <style>{`
          @media (max-width: 1400px) {
            .matches-grid { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 1200px) {
            .matches-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 768px) {
            .matches-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <div className="matches-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          padding: '0'
        }}>
        {paginatedMatches.map((match: any) => {
          const companyInitial = match.company?.company_name?.charAt(0).toUpperCase() || 'C';
          const salary = formatSalary(match.job_posting.salary_min, match.job_posting.salary_max, match.job_posting.salary_currency);
          
          return (
            <div key={match.match_id} style={{
              background: 'white',
              border: '1px solid #E2E4EC',
              borderRadius: '16px',
              padding: '24px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(123, 94, 167, 0.06)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#A78BDB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 94, 167, 0.06)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#E2E4EC';
            }}>
              {/* Mutual Match Badge - Top Right */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{match.match_percentage}%</span>
              </div>

              {/* Header: Company Logo */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#7c3aed',
                  marginBottom: '8px'
                }}>
                  {companyInitial}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                  {match.company?.company_name || 'Company'}
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Matched {new Date(match.matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Job Title */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '6px',
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {match.job_posting.job_title}
              </h3>

              {/* Department/Category */}
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px',
                fontWeight: '500'
              }}>
                {match.job_posting.job_role || match.job_posting.department || 'Platform & Tools'}
              </p>

              {/* Job Details Grid (2x2) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {match.job_posting.location || 'Remote'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {match.job_posting.employment_type || 'Full-time'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {salary || 'Competitive'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {match.job_posting.applicants_count || '0'} applied
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                <button
                  onClick={() => setViewMatchJob(match)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #E2E4EC',
                    background: 'white',
                    color: '#111827',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#7c3aed';
                    e.currentTarget.style.color = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#E2E4EC';
                    e.currentTarget.style.color = '#111827';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View Details
                </button>
                <button
                  onClick={() => handleApplyFromMatch(match.job_posting.id, match.job_profile_id)}
                  disabled={match.already_applied || applyingJobId === match.job_posting.id}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: match.already_applied 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#111827',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (match.already_applied || applyingJobId === match.job_posting.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: (match.already_applied || applyingJobId === match.job_posting.id) ? 0.9 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!match.already_applied && applyingJobId !== match.job_posting.id) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.4)';
                      e.currentTarget.style.background = '#1f2937';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!match.already_applied) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#111827';
                    }
                  }}
                >
                  {applyingJobId === match.job_posting.id ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      Applying...
                    </>
                  ) : match.already_applied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Applied
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

      {/* Pagination Footer for Matches */}
      {matches.length > 0 && totalMatchPages > 1 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginTop: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <button
            disabled={currentMatchPage === 1}
            onClick={() => setCurrentMatchPage(prev => Math.max(1, prev - 1))}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: currentMatchPage === 1 ? '#f8fafc' : 'white',
              color: currentMatchPage === 1 ? '#94a3b8' : '#475569',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentMatchPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Previous
          </button>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {getMatchPageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => setCurrentMatchPage(pageNum as number)}
                  style={{
                    minWidth: '40px',
                    height: '40px',
                    border: currentMatchPage === pageNum ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentMatchPage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'white',
                    color: currentMatchPage === pageNum ? 'white' : '#475569',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  {pageNum}
                </button>
              )
            ))}
          </div>

          <button
            disabled={currentMatchPage === totalMatchPages}
            onClick={() => setCurrentMatchPage(prev => Math.min(totalMatchPages, prev + 1))}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: currentMatchPage === totalMatchPages ? '#f8fafc' : 'white',
              color: currentMatchPage === totalMatchPages ? '#94a3b8' : '#475569',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentMatchPage === totalMatchPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

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
      case 'meetings':
        return <MeetingSchedulerTab role="candidate" />;
      default:
        return renderRecommendations();
    }
  };

  // Derive userName and userInitial for top navbar
  const userName = userProfile?.name || userProfile?.full_name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  // Get tab display name
  const getTabDisplayName = (tab: string) => {
    const names: Record<string, string> = {
      recommendations: 'Recommendations',
      invites: 'Invites',
      available: 'Available',
      applied: 'Applied',
      matches: 'Matches',
      messages: 'Messages',
      meetings: 'Meetings'
    };
    return names[tab] || tab;
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
          <button className="talentgraph-help-btn" title="Help">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>

          <NotificationBellDrawer role="candidate" />

          <button className="talentgraph-user-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="talentgraph-user-avatar">{userInitial}</div>
            <div className="talentgraph-user-info">
              <div className="talentgraph-user-name">{userName}</div>
              <div className="talentgraph-user-role">Candidate</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="profile-menu" style={{ position: 'absolute', top: '60px', right: '32px', zIndex: 1000 }}>
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="talentgraph-main-content">
        {/* Breadcrumb */}
        <div className="talentgraph-breadcrumb">
          <a href="#" className="talentgraph-breadcrumb-link">Dashboard</a>
          <span className="talentgraph-breadcrumb-separator">›</span>
          <span className="talentgraph-breadcrumb-current">{getTabDisplayName(activeTab)}</span>
        </div>

        {/* Page Header */}
        {activeTab === 'recommendations' && (
          <div className="talentgraph-page-header">
            <div className="talentgraph-page-header-left">
              <h1 className="talentgraph-page-title">AI Recommendations</h1>
              <p className="talentgraph-page-subtitle">Curated roles matched to your profile by our AI engine</p>
            </div>
            <div className="talentgraph-page-header-right">
              <button className="talentgraph-btn-secondary" onClick={() => fetchRecommendations()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Refresh
              </button>
              <FilterPill
                id="rec-match-filter-header"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z"/>
                  </svg>
                }
                options={[
                  { value: 'all', label: 'All Matches' },
                  { value: '90+', label: '90%+ Match' },
                  { value: '80-89', label: '80-89% Match' },
                  { value: '70-79', label: '70-79% Match' },
                  { value: '60-69', label: '60-69% Match' },
                  { value: 'below-60', label: 'Below 60%' }
                ]}
                value={recommendationsMatchFilter}
                onChange={(val) => setRecommendationsMatchFilter(val as string)}
                ariaLabel="Filter by match score"
              />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="content-section">
          {renderActiveTab()}
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
