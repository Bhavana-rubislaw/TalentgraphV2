import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient, API_BASE } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const RECRUITER_TABS = ['recommendations', 'shortlist', 'applications', 'matches', 'browse', 'messages', 'meetings'] as const;

const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Tab: driven from ?tab= URL param ────────────────────────
  const rawTab = searchParams.get('tab') || '';
  const activeTab: string = (RECRUITER_TABS as readonly string[]).includes(rawTab)
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isScheduleInterviewModalOpen, setIsScheduleInterviewModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<any | null>(null);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [allJobPostings, setAllJobPostings] = useState<any[]>([]); // All jobs including frozen

  // ── Selected job: driven from ?job= URL param ─────────────────
  const [selectedJobId, setSelectedJobIdInternal] = useState<number | null>(() => {
    const j = new URLSearchParams(window.location.search).get('job');
    return j ? parseInt(j, 10) : null;
  });

  const setSelectedJobId = useCallback(
    (id: number | null) => {
      setSelectedJobIdInternal(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id != null) next.set('job', String(id));
          else next.delete('job');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  
  const [recommendations, setRecommendations] = useState<any>(null);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [viewProfileMatch, setViewProfileMatch] = useState<any | null>(null);
  const [viewShortlistItem, setViewShortlistItem] = useState<any | null>(null);
  const [viewRecommendationProfile, setViewRecommendationProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [recCardIndex, setRecCardIndex] = useState(0);
  const [jobAnalytics, setJobAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Browse Candidates state ─────────────────────────────────────
  const [browseCandidates, setBrowseCandidates] = useState<any[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseLimit] = useState(20);
  const [browseSearch, setBrowseSearch] = useState('');
  const [debouncedBrowseSearch, setDebouncedBrowseSearch] = useState('');
  const [browseRole, setBrowseRole] = useState('');
  const [browseWorkType, setBrowseWorkType] = useState('');
  const [browseLocation, setBrowseLocation] = useState('');
  const [viewCandidateProfile, setViewCandidateProfile] = useState<any | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  // ── Applications filters: driven from URL params ───────────────
  // ?search=  ?job=all|<jobId>  ?appStatus=all|applied|scheduled|...  ?sort=newest|oldest
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const appSearch   = searchParams.get('search') ?? '';
  const appJobFilter = searchParams.get('job') ?? 'all';
  const appStatusFilter = searchParams.get('appStatus') ?? 'all';
  const appSortOrder: 'newest' | 'oldest' =
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';

  const setAppSearch = useCallback(
    (value: string) =>
      setSearchParams(
        (prev) => { const next = new URLSearchParams(prev); if (value) next.set('search', value); else next.delete('search'); return next; },
        { replace: true }
      ),
    [setSearchParams]
  );
  const setAppJobFilter = useCallback(
    (value: string) =>
      setSearchParams(
        (prev) => { const next = new URLSearchParams(prev); if (value && value !== 'all') next.set('job', value); else next.delete('job'); return next; },
        { replace: true }
      ),
    [setSearchParams]
  );

  const setAppStatusFilter = useCallback(
    (value: string) =>
      setSearchParams(
        (prev) => { const next = new URLSearchParams(prev); if (value && value !== 'all') next.set('appStatus', value); else next.delete('appStatus'); return next; },
        { replace: true }
      ),
    [setSearchParams]
  );

  const setAppSortOrder = useCallback(
    (value: 'newest' | 'oldest') =>
      setSearchParams(
        (prev) => { const next = new URLSearchParams(prev); if (value === 'oldest') next.set('sort', 'oldest'); else next.delete('sort'); return next; },
        { replace: true }
      ),
    [setSearchParams]
  );
  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState('');
  const [comboFocusIdx, setComboFocusIdx] = useState(-1);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboSearchRef = useRef<HTMLInputElement>(null);
  const [appNotes, setAppNotes] = useState<Record<number, string>>({});
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // ── Job Postings tab state ─────────────────────────────────────
  const [jpSearch, setJpSearch] = useState('');
  const [jpStatusFilter, setJpStatusFilter] = useState('all');
  const [jpCurrentPage, setJpCurrentPage] = useState(1);
  const [jpShowCancelModal, setJpShowCancelModal] = useState(false);
  const [jpCancelReason, setJpCancelReason] = useState('');
  const [jpSelectedId, setJpSelectedId] = useState<number | null>(null);
  const [jpCardMenuOpenId, setJpCardMenuOpenId] = useState<number | null>(null);
  const JP_PAGE_SIZE = 9;

  // ── Filter states ─────────────────────────────────────────────
  const [shortlistRoleFilter, setShortlistRoleFilter] = useState<string>('all');
  const [recommendationRoleFilter, setRecommendationRoleFilter] = useState<string>('all');
  const [recommendationQuickFilter, setRecommendationQuickFilter] = useState<'all' | 'top_picks' | 'recently_active' | 'open_to_offers'>('all');
  const [recommendationWorkTypeFilter, setRecommendationWorkTypeFilter] = useState<string>('all');
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [allMeetings, setAllMeetings] = useState<any[]>([]);

  const userEmail = localStorage.getItem('email') || 'recruiter@company.com';
  const [userFullName, setUserFullName] = useState(localStorage.getItem('full_name') || '');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'admin');

  const userName = userFullName || userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1);
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    // Fetch full profile from /auth/me
    const fetchProfile = async () => {
      try {
        const res = await apiClient.getCurrentUser();
        if (res.data.full_name) {
          setUserFullName(res.data.full_name);
          localStorage.setItem('full_name', res.data.full_name);
        }
        if (res.data.company_name) {
          setCompanyName(res.data.company_name);
          localStorage.setItem('company_name', res.data.company_name);
        }
        if (res.data.role) {
          setUserRole(res.data.role);
          localStorage.setItem('role', res.data.role);
        }
      } catch (err) {
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchJobPostings();
    fetchShortlist();
    fetchApplications();
    fetchMatches();
    fetchUpcomingInterviews();
  }, []);

  // Close card menu when clicking outside
  useEffect(() => {
    if (jpCardMenuOpenId === null) return;
    const handler = () => setJpCardMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [jpCardMenuOpenId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchRecommendations();
      fetchJobAnalytics();
      setRecCardIndex(0);
    }
  }, [selectedJobId]);

  // Debounce search input to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBrowseSearch(browseSearch);
    }, 500); // Wait 500ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [browseSearch]);

  // ── Auto-refresh applications every 60 seconds ────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchApplications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchBrowseCandidates();
    }
  }, [activeTab, browsePage, debouncedBrowseSearch, browseRole, browseWorkType, browseLocation]);

  // Keyboard navigation for recommendation cards
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'recommendations' || !recommendations?.recommendations?.length) return;
    const total = recommendations.recommendations.length;
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

  const fetchUpcomingInterviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const [upcomingRes, allRes] = await Promise.all([
        fetch(`${API_BASE}/meetings/list?upcoming_only=true`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/meetings/list`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcomingInterviews(data.slice(0, 5));
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllMeetings(data);
      }
    } catch (err) {
      // silently ignore
    }
  };

  const fetchJobPostings = async () => {
    try {
      const response = await apiClient.getJobPostings();
      setAllJobPostings(response.data); // Store all jobs including frozen
      
      // Filter to show only active/reposted jobs in main selector (case-insensitive)
      const activeJobs = response.data.filter((job: any) => {
        const status = (job.status || '').toLowerCase();
        return status === 'active' || status === 'reposted';
      });
      setJobPostings(activeJobs);
      
      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((j: any) => j.id);
      // Honour ?job= URL param; validate it exists, else fall back to first
      const urlJobId = new URLSearchParams(window.location.search).get('job');
      const parsedId = urlJobId ? parseInt(urlJobId, 10) : null;
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedJobId(parsedId);
      } else if (activeJobs.length > 0) {
        setSelectedJobId(activeJobs[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job postings:', error);
    }
  };

  // ── Fetch Data Functions ─────────────────────────────────────

  const fetchRecommendations = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const response = await apiClient.getRecruiterRecommendations(selectedJobId);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobAnalytics = async () => {
    if (!selectedJobId) return;
    setAnalyticsLoading(true);
    try {
      const response = await apiClient.getJobAnalytics(selectedJobId, 90);
      setJobAnalytics(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job analytics:', error);
      setJobAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchShortlist = async () => {
    try {
      const response = await apiClient.getRecruiterShortlist();
      setShortlist(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch shortlist:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await apiClient.getRecruiterApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await apiClient.getRecruiterMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const fetchBrowseCandidates = async () => {
    setBrowseLoading(true);
    try {
      const response = await apiClient.browseCandidates({
        page: browsePage,
        limit: browseLimit,
        search: debouncedBrowseSearch || undefined,
        work_type: browseWorkType || undefined,
        location: browseLocation || undefined
      });
      setBrowseCandidates(response.data.items || []);
      setBrowseTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch browse candidates:', error);
      alert('Failed to load candidates. Please try again.');
    } finally {
      setBrowseLoading(false);
    }
  };

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
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'messages');
        next.set('c', String(convId));
        return next;
      });
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
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'messages');
        next.set('c', String(convId));
        return next;
      });
    } catch (err: any) {
      console.error('[MESSAGE ERROR] Failed to start conversation:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start conversation';
      alert(`Unable to start conversation: ${errorMessage}`);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: number, status: string) => {
    try {
      await apiClient.updateApplicationStatus(applicationId, status);
      alert(`Application status updated to ${status}`);
      fetchApplications();
    } catch (error) {
      console.error('[API ERROR] Failed to update application status:', error);
      alert('Failed to update application status');
    }
  };

  // Save recruiter notes for an application
  const handleSaveApplicationNotes = async (applicationId: number) => {
    try {
      const notes = appNotes[applicationId] || '';
      await apiClient.updateApplicationReview(applicationId, {
        recruiter_notes: notes.trim() || undefined
      });
      alert('Notes saved successfully');
      // Clear local edit state for this application
      setAppNotes(prev => {
        const next = { ...prev };
        delete next[applicationId];
        return next;
      });
      // Refresh applications to get updated notes and timestamp
      await fetchApplications();
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to save notes';
      alert(errorMsg);
    }
  };

  // Download resume for an application
  const handleDownloadResume = async (applicationId: number, resumeId: number, filename: string) => {
    try {
      const response = await apiClient.downloadRecruiterApplicationResume(applicationId, resumeId);
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert('Resume download started');
    } catch (error: any) {
      console.error('[RESUME DOWNLOAD] Failed:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to download resume';
      alert(errorMsg);
    }
  };

  // Download certification for an application
  const handleDownloadCertification = async (applicationId: number, certificationId: number, filename: string) => {
    try {
      const response = await apiClient.downloadRecruiterApplicationCertification(applicationId, certificationId);
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert('Certification download started');
    } catch (error: any) {
      console.error('[CERTIFICATION DOWNLOAD] Failed:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to download certification';
      alert(errorMsg);
    }
  };

  // ── Touch/swipe gesture support for recommendations ────────────
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

  // Navigation handlers for recommendations
  const handleNextRec = () => {
    if (!recommendations || !recommendations.recommendations) return;
    const visibleRecs = recommendationRoleFilter === 'all'
      ? recommendations.recommendations
      : recommendations.recommendations.filter((r: any) => {
          const role =
            (r.job_profile?.job_role as string | undefined) ||
            (r.job_posting?.job_title as string | undefined) ||
            (r.role as string | undefined) ||
            '';
          return role === recommendationRoleFilter;
        });
    if (recCardIndex < visibleRecs.length - 1) {
      setRecCardIndex(recCardIndex + 1);
    }
  };

  const handlePreviousRec = () => {
    if (recCardIndex > 0) {
      setRecCardIndex(recCardIndex - 1);
    }
  };

  // Helper functions for recommendations
  const getCandidateInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'C';
  };

  const getMatchedSkills = (rec: any) => {
    // Return top matched skills from candidate's profile
    const skills = rec.job_profile?.skills || [];
    return skills.slice(0, 4).map((sk: any) => ({
      name: sk.skill_name,
      level: sk.proficiency_level || 3
    }));
  };

  const getSkillTags = (rec: any) => {
    const skills = rec.job_profile?.skills || [];
    return skills.slice(0, 6).map((sk: any) => sk.skill_name);
  };

  const renderRecommendations = () => {
    if (jobPostings.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <h3 className="empty-title">No Job Postings Yet</h3>
          <p className="empty-subtitle">
            Create your first job posting to start receiving candidate recommendations and applications.
          </p>
          <div className="empty-actions">
            <button onClick={() => { navigate('/recruiter/job-postings'); }} className="btn-primary">
              Create Job Posting
            </button>
          </div>
        </div>
      );
    }

    if (loading) {
      return <div className="loading">Loading recommendations...</div>;
    }

    if (!recommendations) {
      return <div className="loading">Select a job posting...</div>;
    }

    // Calculate metrics for KPI cards
    const totalMatches = recommendations.recommendations.length;
    const avgMatchScore = totalMatches > 0 
      ? Math.round(recommendations.recommendations.reduce((sum: number, r: any) => sum + r.match_percentage, 0) / totalMatches)
      : 0;
    const newToday = recommendations.recommendations.filter((r: any) => {
      if (!r.candidate.created_at) return false;
      const createdDate = new Date(r.candidate.created_at);
      const today = new Date();
      return createdDate.toDateString() === today.toDateString();
    }).length;
    const openToOffers = recommendations.recommendations.filter((r: any) => 
      r.job_profile?.worktype === 'Remote' || r.job_profile?.employment_type === 'Full-time'
    ).length;
    const topPicksCount = recommendations.recommendations.filter((r: any) => (r.match_percentage || 0) >= 80).length;

    // Filter and sort recommendations — role filter + quick filter
    let visibleRecs = recommendationRoleFilter === 'all'
      ? recommendations.recommendations
      : recommendations.recommendations.filter((r: any) => {
          const role =
            (r.job_profile?.job_role as string | undefined) ||
            (r.job_posting?.job_title as string | undefined) ||
            (r.role as string | undefined) ||
            '';
          return role === recommendationRoleFilter;
        });
    if (recommendationQuickFilter === 'top_picks') {
      visibleRecs = visibleRecs.filter((r: any) => (r.match_percentage || 0) >= 80);
    } else if (recommendationQuickFilter === 'recently_active') {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      visibleRecs = visibleRecs.filter((r: any) => r.candidate.created_at && new Date(r.candidate.created_at) >= cutoff);
    } else if (recommendationQuickFilter === 'open_to_offers') {
      visibleRecs = visibleRecs.filter((r: any) =>
        r.job_profile?.worktype === 'Remote' || r.job_profile?.employment_type === 'Full-time'
      );
    }
    if (recommendationWorkTypeFilter !== 'all') {
      visibleRecs = visibleRecs.filter((r: any) =>
        (r.job_profile?.worktype || '').toLowerCase() === recommendationWorkTypeFilter.toLowerCase()
      );
    }
    const hasActiveRecFilters = recommendationRoleFilter !== 'all' || recommendationQuickFilter !== 'all';

    return (
      <>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0, marginBottom: '4px' }}>
                AI Candidate Recommendations
                {newToday > 0 && (
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '14px', 
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px'
                  }}>
                    {newToday} new
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Top candidates matched to: Sr. Product Designer - Stripe • Updated 12 min ago
              </p>
            </div>

          </div>

          {/* Job Selector */}
          <div style={{ marginBottom: '16px' }}>
            <select
              className="job-select-modern"
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(parseInt(e.target.value))}
            >
              <option value="" disabled>Choose a position...</option>
              {jobPostings.map(job => (
                <option key={job.id} value={job.id}>
                  {job.job_title} • {job.location || 'Remote'} 
                  {(job.status || '').toLowerCase() === 'reposted' ? ' [REOPENED]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Work Type Filter */}
          <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>Work Type</span>
            <select
              value={recommendationWorkTypeFilter}
              onChange={(e) => setRecommendationWorkTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white',
                cursor: 'pointer',
                color: '#374151',
                minWidth: '130px'
              }}
            >
              <option value="all">All Work Types</option>
              <option value="Remote">Remote</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>


        </div>

        {/* Main Content: Swipe Card + Sidebar */}
        <div className="ai-recommendations-container">
          {/* Left Column - Swipe Card */}
          <div className="ai-recs-main">
            {visibleRecs.length === 0 ? (
              <div className="empty-state-modern">
                <div className="empty-icon-professional">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="empty-title">No Candidates Found</h3>
                <p className="empty-subtitle">
                  No matching candidates found for this job posting yet. Check back later as new candidates join the platform.
                </p>
              </div>
            ) : (
              <>
                {/* Single Card View */}
                {(() => {
                  const rec = visibleRecs[recCardIndex];
                  if (!rec) return null;

                  const candidate = rec.candidate;
                  const jobProfile = rec.job_profile;
                  const matchPercentage = rec.match_percentage || 0;
                  const matchedSkills = getMatchedSkills(rec);
                  const skillTags = getSkillTags(rec);

                  // Calculate compensation overlap
                  const jobSalaryMin = rec.job_posting?.salary_min || 0;
                  const jobSalaryMax = rec.job_posting?.salary_max || 0;
                  const candidateSalaryMin = jobProfile.salary_min || 0;
                  const candidateSalaryMax = jobProfile.salary_max || 0;
                  
                  const overlapMin = Math.max(jobSalaryMin, candidateSalaryMin);
                  const overlapMax = Math.min(jobSalaryMax, candidateSalaryMax);
                  const hasOverlap = overlapMax >= overlapMin;
                  const overlapPct = hasOverlap 
                    ? ((overlapMax - overlapMin) / Math.max(candidateSalaryMax - candidateSalaryMin, 1)) * 100
                    : 0;
                  
                  const compStatus = overlapPct > 70 ? 'high' : overlapPct > 30 ? 'medium' : 'low';
                  const compColor = compStatus === 'high' ? '#10B981' : compStatus === 'medium' ? '#F59E0B' : '#EF4444';

                  // Calculate availability risk
                  const availabilityDate = jobProfile.availability_date ? new Date(jobProfile.availability_date) : null;
                  const daysUntilAvailable = availabilityDate 
                    ? Math.ceil((availabilityDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const availabilityRisk = daysUntilAvailable <= 0 ? 'immediate' : daysUntilAvailable <= 30 ? 'soon' : 'delayed';
                  const availabilityColor = availabilityRisk === 'immediate' ? '#10B981' : availabilityRisk === 'soon' ? '#F59E0B' : '#6B7280';
                  const availabilityLabel = availabilityRisk === 'immediate' ? 'Available Now' : 
                    availabilityRisk === 'soon' ? `${daysUntilAvailable}d notice` : 
                    `${daysUntilAvailable}d notice`;

                  // Work authorization status
                  const visaStatus = jobProfile.visa_status || 'unknown';
                  const authStatus = visaStatus.toLowerCase().includes('citizen') || visaStatus.toLowerCase().includes('authorized') 
                    ? 'authorized' 
                    : visaStatus.toLowerCase().includes('sponsorship') || visaStatus.toLowerCase().includes('h1b') || visaStatus.toLowerCase().includes('visa')
                    ? 'needs_sponsorship'
                    : 'unknown';
                  const authColor = authStatus === 'authorized' ? '#10B981' : authStatus === 'needs_sponsorship' ? '#F59E0B' : '#6B7280';
                  const authLabel = authStatus === 'authorized' ? '✓ Authorized' : authStatus === 'needs_sponsorship' ? '⚠ Needs Visa' : 'Status Unknown';

                  return (
                    <div 
                      className="ai-job-card"
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      {/* Match Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div className="ai-match-badge">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {matchPercentage}% Match
                        </div>
                      </div>

                      {/* Candidate Header */}
                      <div className="ai-job-card-header">
                        <div className="ai-company-logo" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          {getCandidateInitial(candidate.name)}
                        </div>
                        <div className="ai-company-info">
                          <div className="ai-company-name">{candidate.name}</div>
                          <div className="ai-company-verified">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            {jobProfile.job_role || 'Professional'}
                          </div>
                        </div>
                      </div>

                      {/* Profile Title */}
                      <h3 className="ai-job-title">{jobProfile.profile_name || candidate.name}</h3>
                      <p className="ai-job-team">
                        {jobProfile.job_role || 'Professional'} • {candidate.location_state || 'Location not specified'}
                      </p>

                      {/* Current Role Alignment - Quick Visual */}
                      {rec.job_posting && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: '#F9FAFB',
                          borderRadius: '6px',
                          marginTop: '8px',
                          fontSize: '12px'
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" width="16" height="16">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                          </svg>
                          <span style={{ color: '#6B7280' }}>
                            Applied for: <span style={{ fontWeight: 600, color: '#374151' }}>{rec.job_posting.job_title}</span>
                          </span>
                        </div>
                      )}

                      {/* Match Breakdown Visualization */}
                      <div style={{
                        background: '#F9FAFB',
                        padding: '12px',
                        borderRadius: '8px',
                        marginTop: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                            Match Breakdown
                          </span>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>
                            Overall: {matchPercentage}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Skills Match */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '60px' }}>Skills</span>
                              <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${Math.min(matchPercentage + 5, 95)}%`, 
                                  height: '100%', 
                                  background: 'linear-gradient(90deg, #10B981, #059669)',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', minWidth: '30px', textAlign: 'right' }}>
                                {Math.min(matchPercentage + 5, 95)}%
                              </span>
                            </div>
                          </div>
                          {/* Experience Match */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '60px' }}>Experience</span>
                              <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${Math.min(matchPercentage, 100)}%`, 
                                  height: '100%', 
                                  background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', minWidth: '30px', textAlign: 'right' }}>
                                {Math.min(matchPercentage, 100)}%
                              </span>
                            </div>
                          </div>
                          {/* Compensation Match */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '60px' }}>Salary</span>
                              <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${overlapPct}%`, 
                                  height: '100%', 
                                  background: `linear-gradient(90deg, ${compColor}, ${compColor}dd)`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: compColor, minWidth: '30px', textAlign: 'right' }}>
                                {Math.round(overlapPct)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skill Match Chips */}
                      {matchedSkills.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px' 
                          }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                              Top Skill Matches
                            </span>
                            <span style={{ fontSize: '11px', color: '#6B7280' }}>
                              {matchedSkills.length} verified
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {matchedSkills.slice(0, 4).map((skill: any, idx: number) => (
                              <span key={idx} style={{
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10B98120, #05966920)',
                                border: '1px solid #10B981',
                                color: '#047857',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                {skill.name || skill.skill_name || skill}
                                {skill.level && skill.level >= 4 && (
                                  <span style={{ marginLeft: '2px', fontSize: '9px' }}>★</span>
                                )}
                              </span>
                            ))}
                            {skillTags.length > 4 && (
                              <span style={{
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                background: '#F3F4F6',
                                color: '#6B7280',
                                fontWeight: 600
                              }}>
                                +{skillTags.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Match Drivers — Why this match? */}
                      {(() => {
                        const drivers: string[] = [];
                        const skills = (rec.job_profile?.skills || []) as any[];
                        if (skills.length > 0) drivers.push(`Skill match: ${skills[0].skill_name || skills[0].name || skills[0]}`);
                        const yoe = rec.job_profile?.years_of_experience;
                        if (yoe && yoe >= 2) drivers.push(`${yoe}+ years of experience`);
                        const loc = rec.candidate?.location_state;
                        if (loc) drivers.push(`Located in ${loc}`);
                        const wt = rec.job_profile?.worktype;
                        if (wt && drivers.length < 3) drivers.push(`Preferred: ${wt}`);
                        const emp = rec.job_profile?.employment_type;
                        if (emp && drivers.length < 3) drivers.push(`${emp} role`);
                        const top3 = drivers.slice(0, 3);
                        if (top3.length === 0) return null;
                        return (
                          <div style={{ marginBottom: '16px', padding: '12px', background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', borderRadius: '10px', border: '1px solid #DDD6FE' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              Why this match?
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {top3.map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4C1D95' }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>
                                  {d}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Candidate Details Grid */}
                      <div className="ai-job-details">
                        <div className="ai-job-detail">
                          <div className="ai-job-detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                            Experience
                          </div>
                          <div className="ai-job-detail-value">
                            {jobProfile.years_of_experience || 0}+ years
                          </div>
                        </div>
                        <div className="ai-job-detail">
                          <div className="ai-job-detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="1" x2="12" y2="23"/>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            Salary
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="ai-job-detail-value">
                              ${jobProfile.salary_min || 0}k-${jobProfile.salary_max || 0}k
                            </div>
                            {hasOverlap && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: `${compColor}20`,
                                color: compColor,
                                fontWeight: 700
                              }}>
                                {compStatus === 'high' ? '✓' : compStatus === 'medium' ? '~' : '!'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ai-job-detail">
                          <div className="ai-job-detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            Work Type
                          </div>
                          <div className="ai-job-detail-value">{jobProfile.worktype || 'Remote'}</div>
                        </div>
                      </div>

                      {/* Job Posting Preview */}
                      {rec.job_posting && (
                        <div style={{
                          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                          padding: '16px',
                          borderRadius: '12px',
                          marginTop: '16px',
                          border: '1px solid #C7D2FE'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" width="20" height="20">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#4338CA' }}>
                              Job Posting Preview
                            </h4>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                              {rec.job_posting.job_title || 'Untitled Position'}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                              <div style={{ color: '#6B7280' }}>
                                <span style={{ fontWeight: 500 }}>📍 Location:</span> {rec.job_posting.location_city || 'Remote'}
                              </div>
                              <div style={{ color: '#6B7280' }}>
                                <span style={{ fontWeight: 500 }}>💰 Salary:</span> ${rec.job_posting.salary_min || 0}k-${rec.job_posting.salary_max || 0}k
                              </div>
                              <div style={{ color: '#6B7280' }}>
                                <span style={{ fontWeight: 500 }}>🏢 Type:</span> {rec.job_posting.worktype || 'Full-time'}
                              </div>
                              <div style={{ color: '#6B7280' }}>
                                <span style={{ fontWeight: 500 }}>📊 Experience:</span> {rec.job_posting.years_of_experience || 0}+ yrs
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Candidate's Job Preferences */}
                      <div style={{
                        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginTop: '16px',
                        border: '1px solid #FCD34D'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="20" height="20">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#92400E' }}>
                            Candidate's Job Preferences
                          </h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                            {jobProfile.preferred_job_titles && (
                              <div style={{ color: '#78350F', gridColumn: '1 / -1' }}>
                                <span style={{ fontWeight: 500 }}>🎯 Preferred Roles:</span> {jobProfile.preferred_job_titles}
                              </div>
                            )}
                            <div style={{ color: '#78350F' }}>
                              <span style={{ fontWeight: 500 }}>💼 Work Type:</span> {jobProfile.worktype || 'Any'}
                            </div>
                            <div style={{ color: '#78350F' }}>
                              <span style={{ fontWeight: 500 }}>📍 Location:</span> {jobProfile.desired_job_locations || 'Flexible'}
                            </div>
                            {jobProfile.relocation_willingness && (
                              <div style={{ color: '#78350F' }}>
                                <span style={{ fontWeight: 500 }}>🚚 Relocation:</span> {jobProfile.relocation_willingness}
                              </div>
                            )}
                            {jobProfile.notice_period && (
                              <div style={{ color: '#78350F' }}>
                                <span style={{ fontWeight: 500 }}>📅 Notice Period:</span> {jobProfile.notice_period}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>



                      {/* Action Buttons */}
                      <div className="ai-action-buttons">
                        <button 
                          className="ai-action-btn pass"
                          onClick={() => handleRecruiterPass(candidate.id, jobProfile.id)}
                          disabled={rec.action_taken === 'pass'}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                          {rec.action_taken === 'pass' ? 'Passed' : 'Pass'}
                        </button>
                        <button 
                          className="ai-action-btn save"
                          onClick={() => handleRecruiterLike(candidate.id, jobProfile.id)}
                          disabled={rec.action_taken === 'like'}
                        >
                          <svg viewBox="0 0 24 24" fill={rec.action_taken === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
                          </svg>
                          {rec.action_taken === 'like' ? 'Liked' : 'Like'}
                        </button>
                        <button 
                          className="ai-action-btn apply"
                          onClick={() => handleStartMessage(candidate.user_id)}
                          disabled={!candidate.user_id}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          Message
                        </button>
                        <button 
                          className="ai-action-btn view-details"
                          onClick={() => setViewRecommendationProfile(rec)}
                        >
                          View Details
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </button>
                      </div>

                      {/* Invite Button (prominent secondary action) */}
                      <button 
                        className="ai-action-btn-primary"
                        onClick={() => handleAskToApply(candidate.id, jobProfile.id)}
                        disabled={rec.action_taken === 'ask_to_apply'}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '12px',
                          background: rec.action_taken === 'ask_to_apply' ? '#10B981' : 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: rec.action_taken === 'ask_to_apply' ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        {rec.action_taken === 'ask_to_apply' ? '✓ Invitation Sent' : 'Invite to Apply'}
                      </button>
                    </div>
                  );
                })()}

                {/* Pagination with Navigation Arrows */}
                <div className="ai-pagination">
                  <button 
                    className="ai-pagination-arrow ai-pagination-arrow-left"
                    onClick={handlePreviousRec}
                    disabled={recCardIndex === 0}
                    aria-label="Previous candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                  
                  <div className="ai-pagination-content">
                    <div className="ai-pagination-dots">
                      {visibleRecs.map((_: any, idx: number) => (
                        <div
                          key={idx}
                          className={`ai-pagination-dot ${idx === recCardIndex ? 'active' : ''}`}
                          onClick={() => setRecCardIndex(idx)}
                          role="button"
                          aria-label={`Go to candidate ${idx + 1}`}
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
                    <span className="ai-pagination-text">{recCardIndex + 1} of {visibleRecs.length}</span>
                  </div>

                  <button 
                    className="ai-pagination-arrow ai-pagination-arrow-right"
                    onClick={handleNextRec}
                    disabled={recCardIndex === visibleRecs.length - 1}
                    aria-label="Next candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ width: '320px', flexShrink: 0 }}>
            {/* Hiring Funnel */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0, marginBottom: '16px' }}>
                Hiring Funnel
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(() => {
                  const funnelStages = [
                    { label: 'Applied',      count: applications.filter((a: any) => a.status === 'applied').length,      color: '#6366F1', status: 'applied' },
                    { label: 'Interview',    count: applications.filter((a: any) => a.status === 'scheduled').length,    color: '#10B981', status: 'scheduled' },
                    { label: 'Shortlisted',  count: applications.filter((a: any) => a.status === 'shortlisted').length,  color: '#8B5CF6', status: 'shortlisted' },
                    { label: 'Selected',     count: applications.filter((a: any) => a.status === 'selected').length,     color: '#F59E0B', status: 'selected' },
                    { label: 'Rejected',     count: applications.filter((a: any) => a.status === 'rejected').length,     color: '#EF4444', status: 'rejected' },
                  ];
                  const maxCount = Math.max(...funnelStages.map(s => s.count), 1);
                  return funnelStages.map((stage, idx) => (
                    <div key={idx} style={{ cursor: 'pointer' }} onClick={() => { setAppStatusFilter(stage.status); setActiveTab('applications'); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ color: '#4B5563', fontWeight: 500 }}>{stage.label}</span>
                        <span style={{ fontWeight: 600, color: '#1F2937' }}>{stage.count}</span>
                      </div>
                      <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((stage.count / maxCount) * 100)}%`, height: '100%', background: stage.color, borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#9CA3AF', textAlign: 'right' }}>Click a stage to view applications</div>
            </div>

            {/* Upcoming Interviews */}
            {(() => {
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const weekStart = new Date(todayStart);
              weekStart.setDate(todayStart.getDate() - todayStart.getDay());
              const upcomingList = allMeetings
                .filter((m: any) => m.scheduled_start && new Date(m.scheduled_start) >= todayStart && m.status !== 'cancelled')
                .sort((a: any, b: any) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
                .slice(0, 5);
              const pastList = allMeetings
                .filter((m: any) => m.scheduled_start && new Date(m.scheduled_start) < todayStart)
                .sort((a: any, b: any) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
                .slice(0, 3);
              const pastThisWeek = allMeetings.filter((m: any) => {
                const d = m.scheduled_start ? new Date(m.scheduled_start) : null;
                return d && d >= weekStart && d < todayStart;
              }).length;
              const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const statusColor: Record<string, string> = { scheduled: '#10B981', completed: '#6B7280', cancelled: '#EF4444', rescheduled: '#F59E0B' };
              const avatarBg = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];
              const getMeetingTypeLabel = (m: any): string => {
                if (m.video_provider) {
                  const p = m.video_provider.toLowerCase();
                  if (p === 'zoom') return 'Zoom';
                  if (p === 'teams' || p === 'microsoft_teams') return 'Teams';
                  if (p === 'meet' || p === 'google_meet') return 'Meet';
                  return m.video_provider.charAt(0).toUpperCase() + m.video_provider.slice(1);
                }
                if (m.video_meeting_url) {
                  if (m.video_meeting_url.includes('zoom.us')) return 'Zoom';
                  if (m.video_meeting_url.includes('meet.google')) return 'Meet';
                  if (m.video_meeting_url.includes('teams.microsoft')) return 'Teams';
                  return 'Video';
                }
                if (m.location && m.location !== 'Virtual') return m.location;
                return 'Video';
              };
              const getInitials = (name: string) =>
                name ? name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
              const renderCard = (m: any, dimmed: boolean) => (
                <div key={m.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', opacity: dimmed ? 0.75 : 1, boxShadow: dimmed ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: '1.35', flex: 1 }}>{m.title || 'Interview'}</span>
                    <span style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋮</span>
                  </div>
                  {m.description && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', lineHeight: '1.3' }}>{m.description}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '9px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {fmtDate(m.scheduled_start)}
                    </span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {fmtTime(m.scheduled_start)}
                    </span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      {getMeetingTypeLabel(m)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor[m.status] || '#6B7280', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor[m.status] || '#6B7280', textTransform: 'capitalize' as const }}>{m.status}</span>
                    </div>
                    {m.participants && m.participants.length > 0 && (
                      <div style={{ display: 'flex' }}>
                        {m.participants.slice(0, 3).map((p: any, pi: number) => (
                          <div key={pi} title={p.participant_name || p.name || ''} style={{ width: '24px', height: '24px', borderRadius: '50%', background: avatarBg[pi % avatarBg.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', border: '2px solid white', marginLeft: pi > 0 ? '-6px' : '0' }}>
                            {getInitials(p.participant_name || p.name || p.full_name || '?')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
              return (
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Upcoming Interviews</span>
                    </div>
                    <button onClick={() => setActiveTab('meetings')} style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View All →</button>
                  </div>
                  {upcomingList.length === 0 && pastList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: '13px' }}>No upcoming interviews scheduled</div>
                  )}
                  {upcomingList.map((m: any) => renderCard(m, false))}
                  {pastList.length > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 10px 0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Recent Past</span>
                        {pastThisWeek > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '10px' }}>{pastThisWeek} this week</span>
                        )}
                      </div>
                      {pastList.map((m: any) => renderCard(m, true))}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Recruiter Tip */}
            <div style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: '12px', padding: '16px', border: '1px solid #FCD34D' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ fontSize: '20px' }}>💡</div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', margin: 0, marginBottom: '6px' }}>
                    Recruiter Tip
                  </h4>
                  <p style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.5', margin: 0 }}>
                    Candidates with 95%+ match scores have a 3x higher response rate. Prioritize reaching out to them first!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation Candidate Profile Drawer */}
        {viewRecommendationProfile && (() => {
          const rec = viewRecommendationProfile;
        return (
          <div className="vp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewRecommendationProfile(null); }}>
            <div className="vp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vp-header">
                <div className="vp-header-content">
                  <div className="vp-avatar">
                    <div className="vp-avatar-circle">{rec.candidate.name.charAt(0).toUpperCase()}</div>
                  </div>
                  <div className="vp-header-info">
                    <h2 className="vp-name">{rec.candidate.name}</h2>
                    <div className="vp-location">{rec.candidate.location_state}</div>
                    <div className="vp-match-badge">
                      <span className="vp-match-percentage">{rec.match_percentage}%</span>
                      <span className="vp-match-label">Match</span>
                    </div>
                  </div>
                </div>
                <button className="vp-close" onClick={() => setViewRecommendationProfile(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="vp-body">
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Contact Information
                  </h3>
                  <div className="vp-info-grid">
                    <div className="vp-info-item">
                      <span className="vp-info-label">Email</span>
                      <span className="vp-info-value">{rec.candidate.email}</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Phone</span>
                      <span className="vp-info-value">{rec.candidate.phone}</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Location</span>
                      <span className="vp-info-value">{rec.candidate.location_state}</span>
                    </div>
                  </div>
                </div>

                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Experience & Preferences
                  </h3>
                  <div className="vp-info-grid">
                    <div className="vp-info-item">
                      <span className="vp-info-label">Experience</span>
                      <span className="vp-info-value">{rec.job_profile.years_of_experience} years</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Work Type</span>
                      <span className="vp-info-value">{rec.job_profile.worktype}</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Employment</span>
                      <span className="vp-info-value">{rec.job_profile.employment_type}</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Salary Range</span>
                      <span className="vp-info-value">${rec.job_profile.salary_min}k - ${rec.job_profile.salary_max}k</span>
                    </div>
                    <div className="vp-info-item">
                      <span className="vp-info-label">Visa Status</span>
                      <span className="vp-info-value">{rec.job_profile.visa_status.replace('_', ' ')}</span>
                    </div>
                    {rec.job_profile.availability_date && (
                      <div className="vp-info-item">
                        <span className="vp-info-label">Available From</span>
                        <span className="vp-info-value">{rec.job_profile.availability_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {rec.job_profile.skills && rec.job_profile.skills.length > 0 && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      Skills
                    </h3>
                    <div className="vp-skills-grid">
                      {rec.job_profile.skills.map((skill: any, index: number) => (
                        <div key={index} className="vp-skill-tag">
                          <span className="vp-skill-name">{skill.skill_name}</span>
                          {skill.rating && <span className="vp-skill-level">L{skill.rating}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education & Authorization Section */}
                {(rec.job_profile.highest_education || rec.job_profile.security_clearance) && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                      Education & Clearance
                    </h3>
                    <div className="vp-info-grid">
                      {rec.job_profile.highest_education && (
                        <div className="vp-info-item">
                          <span className="vp-info-label">Education</span>
                          <span className="vp-info-value">{rec.job_profile.highest_education.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                        </div>
                      )}
                      {rec.job_profile.security_clearance && (
                        <div className="vp-info-item">
                          <span className="vp-info-label">Security Clearance</span>
                          <span className="vp-info-value">{rec.job_profile.security_clearance.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hyperlinks Section */}
                {(rec.job_profile.linkedin_url || rec.job_profile.github_url || rec.job_profile.portfolio_url || rec.job_profile.twitter_url || rec.job_profile.website_url || rec.candidate.linkedin_url || rec.candidate.github_url || rec.candidate.portfolio_url) && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      Professional Links
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(rec.job_profile.linkedin_url || rec.candidate.linkedin_url) && (
                        <a 
                          href={rec.job_profile.linkedin_url || rec.candidate.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            background: '#0A66C2', 
                            color: 'white', 
                            borderRadius: '6px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn Profile
                        </a>
                      )}
                      {(rec.job_profile.github_url || rec.candidate.github_url) && (
                        <a 
                          href={rec.job_profile.github_url || rec.candidate.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            background: '#24292e', 
                            color: 'white', 
                            borderRadius: '6px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          GitHub Profile
                        </a>
                      )}
                      {(rec.job_profile.portfolio_url || rec.candidate.portfolio_url) && (
                        <a 
                          href={rec.job_profile.portfolio_url || rec.candidate.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            background: '#7B5EA7', 
                            color: 'white', 
                            borderRadius: '6px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                          Portfolio
                        </a>
                      )}
                      {rec.job_profile.twitter_url && (
                        <a 
                          href={rec.job_profile.twitter_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            background: '#1DA1F2', 
                            color: 'white', 
                            borderRadius: '6px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          Twitter/X
                        </a>
                      )}
                      {rec.job_profile.website_url && (
                        <a 
                          href={rec.job_profile.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            background: '#6B7280', 
                            color: 'white', 
                            borderRadius: '6px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Resume Section */}
                {rec.candidate.resumes && rec.candidate.resumes.length > 0 && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Resumes
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {rec.candidate.resumes.map((resume: any, index: number) => (
                        <a
                          key={resume.id}
                          href={`http://127.0.0.1:8001/uploads/resumes/${resume.storage_path}`}
                          download
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: '#F3F4F6',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: '#111827',
                            border: '1px solid #E5E7EB',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#E5E7EB';
                            e.currentTarget.style.borderColor = '#7B5EA7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F3F4F6';
                            e.currentTarget.style.borderColor = '#E5E7EB';
                          }}
                        >
                          <svg style={{ width: '20px', height: '20px', color: '#7B5EA7', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                          </svg>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{resume.filename}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                              Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                          <svg style={{ width: '18px', height: '18px', color: '#7B5EA7', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications Section */}
                {rec.candidate.certifications && rec.candidate.certifications.length > 0 && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                      </svg>
                      Certifications
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {rec.candidate.certifications.map((cert: any, index: number) => (
                        <div key={cert.id}>
                          {cert.storage_path ? (
                            <a
                              href={`http://127.0.0.1:8001/uploads/certifications/${cert.storage_path}`}
                              download
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: '#F0FDF4',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: '#111827',
                                border: '1px solid #86EFAC',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#DCFCE7';
                                e.currentTarget.style.borderColor = '#10B981';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#F0FDF4';
                                e.currentTarget.style.borderColor = '#86EFAC';
                              }}
                            >
                              <svg style={{ width: '20px', height: '20px', color: '#10B981', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                              </svg>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 500 }}>{cert.name}</div>
                                {cert.issuer && <div style={{ fontSize: '12px', color: '#059669' }}>Issued by: {cert.issuer}</div>}
                                {(cert.issued_date || cert.expiry_date) && (
                                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                    {cert.issued_date && `Issued: ${cert.issued_date}`}
                                    {cert.issued_date && cert.expiry_date && ' • '}
                                    {cert.expiry_date && `Expires: ${cert.expiry_date}`}
                                  </div>
                                )}
                              </div>
                              <svg style={{ width: '18px', height: '18px', color: '#10B981', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                            </a>
                          ) : (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: '#F9FAFB',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB'
                            }}>
                              <svg style={{ width: '20px', height: '20px', color: '#9CA3AF', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                              </svg>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 500 }}>{cert.name}</div>
                                {cert.issuer && <div style={{ fontSize: '12px', color: '#6B7280' }}>Issued by: {cert.issuer}</div>}
                                {(cert.issued_date || cert.expiry_date) && (
                                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                    {cert.issued_date && `Issued: ${cert.issued_date}`}
                                    {cert.issued_date && cert.expiry_date && ' • '}
                                    {cert.expiry_date && `Expires: ${cert.expiry_date}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rec.has_applied && (
                  <div className="vp-section">
                    <h3 className="vp-section-title">
                      <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Application Status
                    </h3>
                    <div className="vp-status-badge applied">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Applied • {rec.application_status}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="vp-footer">
                <div className="vp-actions">
                  <button
                    className={`vp-btn ${rec.action_taken === 'pass' ? 'vp-btn-done-pass' : 'vp-btn-secondary'}`}
                    onClick={() => { if (rec.action_taken !== 'pass') handleRecruiterPass(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                    disabled={rec.action_taken === 'pass'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    {rec.action_taken === 'pass' ? 'Passed ✓' : 'Pass'}
                  </button>
                  <button
                    className={`vp-btn ${rec.action_taken === 'like' ? 'vp-btn-done-like' : 'vp-btn-primary'}`}
                    onClick={() => { if (rec.action_taken !== 'like') handleRecruiterLike(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                    disabled={rec.action_taken === 'like'}
                  >
                    <svg viewBox="0 0 24 24" fill={rec.action_taken === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {rec.action_taken === 'like' ? 'Shortlisted ✓' : 'Like'}
                  </button>
                  <button
                    className={`vp-btn ${rec.action_taken === 'ask_to_apply' ? 'vp-btn-done-invite' : 'vp-btn-success'}`}
                    onClick={() => { if (rec.action_taken !== 'ask_to_apply') handleAskToApply(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                    disabled={rec.action_taken === 'ask_to_apply'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {rec.action_taken === 'ask_to_apply' ? '✓ Asked to Apply' : 'Ask to Apply'}
                  </button>
                  <button
                    className="vp-btn vp-btn-message"
                    onClick={() => { handleStartMessage(rec.candidate.id); setViewRecommendationProfile(null); }}
                    aria-label={`Message ${rec.candidate.name}`}
                    title="Start conversation with candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </>
    );
  };

  const renderShortlist = () => {
    if (shortlist.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 className="empty-title">No Shortlisted Candidates</h3>
          <p className="empty-subtitle">
            Shortlist candidates from your recommendations to keep track of your top prospects.
          </p>
        </div>
      );
    }

    // Derive unique role options from shortlist data
    const shortlistRoleOptions: string[] = Array.from(
      new Set(
        shortlist
          .map((item: any): string =>
            (item.job_profile?.job_role as string | undefined) ||
            (item.job_profile?.profile_name as string | undefined) ||
            (item.job_posting?.job_title as string | undefined) ||
            ''
          )
          .filter((s: string) => s.length > 0)
      )
    ).sort();

    const filteredShortlist = shortlistRoleFilter === 'all'
      ? shortlist
      : shortlist.filter((item: any) => {
          const role =
            (item.job_profile?.job_role as string | undefined) ||
            (item.job_profile?.profile_name as string | undefined) ||
            (item.job_posting?.job_title as string | undefined) ||
            '';
          return role === shortlistRoleFilter;
        });

    return (
      <>
        <div className="purple-section-wrapper">
        {/* Page Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Shortlist</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Review and manage your shortlisted candidates</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
              <label htmlFor="shortlist-role-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
              <select
                id="shortlist-role-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={shortlistRoleFilter}
                onChange={(e) => setShortlistRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {shortlistRoleOptions.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Pills */}
          {shortlistRoleFilter !== 'all' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#EDE9FE',
                color: '#7C3AED',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #C4B5FD'
              }}>
                Role: {shortlistRoleFilter}
                <button
                  onClick={() => setShortlistRoleFilter('all')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: '#7C3AED', lineHeight: 1 }}
                  title="Remove filter"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
              <button
                onClick={() => setShortlistRoleFilter('all')}
                style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Results Count */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
              {shortlistRoleFilter !== 'all'
                ? `Filtered: ${filteredShortlist.length} of ${shortlist.length} candidates`
                : `Showing all ${shortlist.length} shortlisted candidates`}
            </span>
          </div>
        </div>

        <style>{`
          @media (max-width: 1400px) {
            .shortlist-grid { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 1200px) {
            .shortlist-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 768px) {
            .shortlist-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <div className="shortlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0' }}>
        {filteredShortlist.map((item: any, index) => {
          const candidateInitial = item.candidate.name?.charAt(0).toUpperCase() || 'C';
          return (
            <div
              key={`shortlist-${index}-${item.candidate.id}-${item.job_posting?.id ?? 'x'}`}
              style={{
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
              }}
            >
              {/* Shortlisted Badge - Top Right */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '6px 12px',
                background: item.already_invited
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <span>{item.already_invited ? 'Invited' : 'Shortlisted'}</span>
              </div>

              {/* Header: Candidate Avatar */}
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
                  {candidateInitial}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                  {item.candidate.name}
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Shortlisted {new Date(item.shortlisted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Target Role / Job Title */}
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
                {item.job_posting?.job_title || item.job_profile?.profile_name || 'Open Role'}
              </h3>

              {/* Job Role / Category */}
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px',
                fontWeight: '500'
              }}>
                {item.job_profile?.job_role || item.job_profile?.product_type || 'Professional'}
              </p>

              {/* Details Grid (2x2) */}
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
                    {item.candidate.location_state || 'Remote'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {item.job_profile?.years_of_experience ? `${item.job_profile.years_of_experience} yrs exp` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {item.job_posting?.seniority_level || item.job_profile?.seniority_level || 'Any level'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {item.match_percentage != null ? `${item.match_percentage}% match` : 'Shortlisted'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                <button
                  onClick={() => setViewShortlistItem(item)}
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
                  onClick={() => {
                    if (!item.already_invited) {
                      handleAskToApply(item.candidate.id, item.job_profile?.id);
                    }
                  }}
                  disabled={item.already_invited}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    border: 'none',
                    background: item.already_invited
                      ? '#10b981'
                      : '#111827',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    cursor: item.already_invited ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (!item.already_invited) {
                      e.currentTarget.style.background = '#1f2937';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.already_invited) {
                      e.currentTarget.style.background = '#111827';
                    }
                  }}
                >
                  {item.already_invited ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Invited
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── View Details Modal (Shortlist) ── */}
      {viewShortlistItem && (() => {
        const itm = viewShortlistItem;
        const c = itm.candidate;
        const jp = itm.job_profile;

        const skillsByCategory: Record<string, any[]> = {};
        (jp?.skills || []).forEach((sk: any) => {
          const cat = sk.skill_category || 'Other';
          if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
          skillsByCategory[cat].push(sk);
        });

        const socials: { label: string; url: string; icon: JSX.Element }[] = [];
        const addSocial = (label: string, url: string | undefined | null, icon: JSX.Element) => {
          if (url) socials.push({ label, url, icon });
        };
        addSocial('LinkedIn', jp?.linkedin_url || c.linkedin_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>);
        addSocial('GitHub', jp?.github_url || c.github_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>);
        addSocial('Portfolio', jp?.portfolio_url || c.portfolio_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
        addSocial('Twitter', jp?.twitter_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>);
        addSocial('Website', jp?.website_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);

        return (
          <div className="vp-overlay" onClick={() => setViewShortlistItem(null)}>
            <div className="vp-modal" onClick={e => e.stopPropagation()}>
              <div className="vp-header">
                <div className="vp-header-avatar">{c.name.charAt(0).toUpperCase()}</div>
                <div className="vp-header-info">
                  <h2 className="vp-header-name">{c.name}</h2>
                  <p className="vp-header-role">{jp?.profile_name || 'Candidate'} &middot; {jp?.job_role || ''} &middot; {itm.job_posting?.job_title || ''}</p>
                </div>
                <button className="vp-close" onClick={() => setViewShortlistItem(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="vp-body">
                {/* Summary */}
                {(jp?.profile_summary || c.profile_summary) && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Summary
                    </div>
                    <div className="vp-summary">{jp?.profile_summary || c.profile_summary}</div>
                  </div>
                )}

                {/* Job Preferences */}
                {jp && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Job Preferences
                    </div>
                    <div className="vp-grid">
                      <div className="vp-field"><span className="vp-field-label">Product Vendor</span><span className="vp-field-value">{jp.product_vendor || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Product Type</span><span className="vp-field-value">{jp.product_type || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Seniority</span><span className="vp-field-value">{jp.seniority_level || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Experience</span><span className="vp-field-value">{jp.years_of_experience} years</span></div>
                      <div className="vp-field"><span className="vp-field-label">Work Type</span><span className="vp-field-value">{jp.worktype}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Employment</span><span className="vp-field-value">{jp.employment_type}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Salary Range</span><span className="vp-field-value">${jp.salary_min?.toLocaleString()} – ${jp.salary_max?.toLocaleString()} {jp.salary_currency} {jp.pay_type ? `(${jp.pay_type})` : ''}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Negotiability</span><span className="vp-field-value">{jp.negotiability || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Visa Status</span><span className="vp-field-value">{jp.visa_status?.replace('_', ' ')}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Education</span><span className="vp-field-value">{jp.highest_education || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Notice Period</span><span className="vp-field-value">{jp.notice_period || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Availability</span><span className="vp-field-value">{jp.availability_date || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Travel</span><span className="vp-field-value">{jp.travel_willingness || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Shift</span><span className="vp-field-value">{jp.shift_preference || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Remote</span><span className="vp-field-value">{jp.remote_acceptance || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Relocation</span><span className="vp-field-value">{jp.relocation_willingness || <em className="vp-empty">—</em>}</span></div>
                    </div>
                  </div>
                )}

                {/* Preferred Locations */}
                {jp?.location_preferences && jp.location_preferences.length > 0 && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Preferred Locations
                    </div>
                    <div className="vp-location-pills">
                      {jp.location_preferences.map((lp: any, i: number) => (
                        <span key={i} className="vp-location-pill">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {lp.city}, {lp.state}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {jp?.skills && jp.skills.length > 0 && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      Skills
                    </div>
                    {Object.entries(skillsByCategory).map(([cat, skills]) => (
                      <div key={cat}>
                        <div className="vp-skill-cat-label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                        <div className="vp-skills-wrap">
                          {skills.map((sk: any, i: number) => (
                            <span key={i} className="vp-skill-pill">
                              {sk.skill_name}
                              <span className="vp-skill-level">{sk.proficiency_level}/5</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Social Links */}
                {socials.length > 0 && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Social & Links
                    </div>
                    <div className="vp-social-row">
                      {socials.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="vp-social-link">
                          {s.icon}
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumes */}
                {c.resumes && c.resumes.length > 0 && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Resumes
                    </div>
                    {c.resumes.map((r: any) => (
                      <div key={r.id} className="vp-doc-card">
                        <div className="vp-doc-icon resume"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                        <div className="vp-doc-info">
                          <div className="vp-doc-name">{r.filename}</div>
                          {r.uploaded_at && <div className="vp-doc-meta">Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</div>}
                        </div>
                        <a href={`${API_BASE}/${r.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Certifications */}
                {c.certifications && c.certifications.length > 0 && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                      Certifications
                    </div>
                    {c.certifications.map((cert: any) => (
                      <div key={cert.id} className="vp-doc-card">
                        <div className="vp-doc-icon cert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
                        <div className="vp-doc-info">
                          <div className="vp-doc-name">{cert.name}</div>
                          <div className="vp-doc-meta">
                            {cert.issuer && <>{cert.issuer}</>}
                            {cert.issued_date && <> &middot; Issued {cert.issued_date}</>}
                            {cert.expiry_date && <> &middot; Expires {cert.expiry_date}</>}
                          </div>
                        </div>
                        {cert.filename && cert.storage_path && (
                          <a href={`${API_BASE}/${cert.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact */}
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Contact Information
                  </div>
                  <div className="vp-grid">
                    <div className="vp-field"><span className="vp-field-label">Email</span><span className="vp-field-value">{c.email}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Phone</span><span className="vp-field-value">{c.phone}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Location</span><span className="vp-field-value">{c.location_county ? `${c.location_county}, ` : ''}{c.location_state || <em className="vp-empty">—</em>}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </>
    );
  };

  // ── Applications helpers ──
  const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
    '': { subject: '', body: '' },
    interview: {
      subject: 'Interview Invitation — {{job_title}} at {{company}}',
      body: 'Hi {{name}},\n\nThank you for your interest in the {{job_title}} position. We were impressed by your background and would love to invite you for an interview.\n\nPlease let us know your availability for the coming week.\n\nBest regards,\n{{recruiter}}'
    },
    followup: {
      subject: 'Following Up — {{job_title}} Application',
      body: 'Hi {{name}},\n\nI wanted to follow up regarding your application for the {{job_title}} role. We are currently reviewing candidates and will have an update for you shortly.\n\nThank you for your patience.\n\nBest,\n{{recruiter}}'
    },
    rejection: {
      subject: 'Update on Your Application — {{job_title}}',
      body: 'Hi {{name}},\n\nThank you for taking the time to apply for the {{job_title}} position. After careful consideration, we have decided to move forward with other candidates at this time.\n\nWe truly appreciate your interest and encourage you to apply for future openings.\n\nWarm regards,\n{{recruiter}}'
    },
    offer: {
      subject: 'Congratulations! Offer for {{job_title}}',
      body: 'Hi {{name}},\n\nWe are delighted to extend an offer for the {{job_title}} position! We believe your skills and experience will be an excellent addition to our team.\n\nPlease find the offer details attached. Let us know if you have any questions.\n\nBest regards,\n{{recruiter}}'
    }
  };

  const fillTemplate = (text: string, app: any) => {
    return text
      .replace(/\{\{name\}\}/g, app.candidate?.name || '')
      .replace(/\{\{job_title\}\}/g, app.job_posting?.job_title || '')
      .replace(/\{\{company\}\}/g, companyName || 'Our Company')
      .replace(/\{\{recruiter\}\}/g, userName || '');
  };

  // Removed unused openEmailComposer function - email composer now handled inline

  const applyEmailTemplate = (key: string, app: any) => {
    setEmailTemplate(key);
    const tpl = EMAIL_TEMPLATES[key];
    if (tpl) {
      setEmailSubject(fillTemplate(tpl.subject, app));
      setEmailBody(fillTemplate(tpl.body, app));
    }
  };

  const sendEmail = () => {
    if (!selectedApp?.candidate.email || !emailSubject) return;
    const mailto = `mailto:${selectedApp.candidate.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    setShowEmailComposer(false);
    showToast('Email draft opened in your mail client');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  const filteredApplications = useMemo(() => {
    let result = [...applications];
    // Job posting filter
    if (appJobFilter !== 'all') {
      result = result.filter((a: any) => String(a.job_posting.id) === appJobFilter);
    }
    // Status filter
    if (appStatusFilter !== 'all') {
      result = result.filter((a: any) => a.status === appStatusFilter);
    }
    // Search
    if (appSearch.trim()) {
      const q = appSearch.toLowerCase();
      result = result.filter((a: any) =>
        a.candidate.name.toLowerCase().includes(q) ||
        a.candidate.email.toLowerCase().includes(q) ||
        a.job_posting.job_title.toLowerCase().includes(q) ||
        (a.job_profile.profile_name || '').toLowerCase().includes(q)
      );
    }
    // Sort
    result.sort((a: any, b: any) => {
      const da = new Date(a.applied_at).getTime();
      const db = new Date(b.applied_at).getTime();
      return appSortOrder === 'newest' ? db - da : da - db;
    });
    return result;
  }, [applications, appJobFilter, appStatusFilter, appSearch, appSortOrder]);

  const selectedApp = useMemo(() => {
    return applications.find((a: any) => a.application_id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // All company job postings for the role dropdown
  const appJobOptions = useMemo(() => {
    return jobPostings.map((jp: any) => ({ id: String(jp.id), title: jp.job_title }));
  }, [jobPostings]);

  // Per-posting application counts
  const appCountByJob = useMemo(() => {
    const m: Record<string, number> = {};
    applications.forEach((a: any) => {
      const k = String(a.job_posting.id);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [applications]);

  // Filtered combo options by search
  const comboFiltered = useMemo(() => {
    if (!comboSearch.trim()) return appJobOptions;
    const q = comboSearch.toLowerCase();
    return appJobOptions.filter(o => o.title.toLowerCase().includes(q));
  }, [appJobOptions, comboSearch]);

  // Close combo on outside click
  useEffect(() => {
    if (!comboOpen) return;
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        setComboSearch('');
        setComboFocusIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [comboOpen]);

  // Focus search input when combo opens
  useEffect(() => {
    if (comboOpen && comboSearchRef.current) {
      comboSearchRef.current.focus();
    }
  }, [comboOpen]);

  const handleComboSelect = (value: string) => {
    setAppJobFilter(value);
    setSelectedAppId(null);
    setComboOpen(false);
    setComboSearch('');
    setComboFocusIdx(-1);
  };

  const handleComboKeyDown = (e: React.KeyboardEvent) => {
    const items = [{ id: 'all', title: 'All Roles' }, ...comboFiltered];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setComboFocusIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setComboFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && comboFocusIdx >= 0 && comboFocusIdx < items.length) {
      e.preventDefault();
      handleComboSelect(items[comboFocusIdx].id);
    } else if (e.key === 'Escape') {
      setComboOpen(false);
      setComboSearch('');
      setComboFocusIdx(-1);
    }
  };

  const renderApplications = () => {
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
          <p>Applications from candidates will appear here. Review and manage their progress through your pipeline.</p>
        </div>
      );
    }

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

    return (
      <div className="ra-wrapper" style={{ background: 'transparent', padding: '0', gap: '16px' }}>
        {/* ─── Toolbar: Search + Filters + Sort ─── */}
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

          {/* Role Combobox */}
          <div className="ra-combo" ref={comboRef} onKeyDown={handleComboKeyDown}>
            <button
              className={`ra-combo-trigger ${comboOpen ? 'open' : ''}`}
              onClick={() => { setComboOpen(o => !o); setComboFocusIdx(-1); setComboSearch(''); }}
              type="button"
            >
              <svg className="ra-combo-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              <span className="ra-combo-trigger-text">
                {appJobFilter === 'all' ? 'All Roles' : (appJobOptions.find(o => o.id === appJobFilter)?.title || 'All Roles')}
              </span>
              <span className="ra-combo-trigger-count">
                {appJobFilter === 'all' ? applications.length : (appCountByJob[appJobFilter] || 0)}
              </span>
              {appJobFilter !== 'all' && (
                <button
                  className="ra-combo-trigger-clear"
                  onClick={(e) => { e.stopPropagation(); handleComboSelect('all'); }}
                  title="Clear filter"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </button>

            {comboOpen && (
              <div className="ra-combo-panel">
                <div className="ra-combo-header">
                  <div className="ra-combo-header-row">
                    <span className="ra-combo-header-title">Filter by Role</span>
                    {appJobFilter !== 'all' && (
                      <button className="ra-combo-clear-btn" onClick={() => handleComboSelect('all')} type="button">Clear filter</button>
                    )}
                  </div>
                  <div className="ra-combo-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      ref={comboSearchRef}
                      className="ra-combo-search"
                      placeholder="Search roles…"
                      value={comboSearch}
                      onChange={e => { setComboSearch(e.target.value); setComboFocusIdx(-1); }}
                    />
                  </div>
                </div>

                <div className="ra-combo-list">
                  {/* All Roles option */}
                  {!comboSearch.trim() && (
                    <>
                      <div
                        className={`ra-combo-option ${appJobFilter === 'all' ? 'selected' : ''} ${comboFocusIdx === 0 ? 'focused' : ''}`}
                        onClick={() => handleComboSelect('all')}
                      >
                        <div className="ra-combo-option-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div className="ra-combo-option-text">
                          <span className="ra-combo-option-name">All Roles</span>
                          <span className="ra-combo-option-sub">{jobPostings.length} job postings</span>
                        </div>
                        <span className={`ra-combo-option-badge ${applications.length > 0 ? 'has-apps' : 'no-apps'}`}>{applications.length}</span>
                        {appJobFilter === 'all' && (
                          <span className="ra-combo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                        )}
                      </div>
                      <div className="ra-combo-divider" />
                    </>
                  )}

                  {/* Filtered role options */}
                  {comboFiltered.length === 0 ? (
                    <div className="ra-combo-empty">No roles match "{comboSearch}"</div>
                  ) : (
                    comboFiltered.map((jp, idx) => {
                      const count = appCountByJob[jp.id] || 0;
                      const isSelected = appJobFilter === jp.id;
                      const focusOffset = comboSearch.trim() ? idx : idx + 1;
                      return (
                        <div
                          key={jp.id}
                          className={`ra-combo-option ${isSelected ? 'selected' : ''} ${count === 0 ? 'muted' : ''} ${comboFocusIdx === focusOffset ? 'focused' : ''}`}
                          onClick={() => handleComboSelect(jp.id)}
                        >
                          <div className="ra-combo-option-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                          </div>
                          <div className="ra-combo-option-text">
                            <span className="ra-combo-option-name">{jp.title}</span>
                          </div>
                          <span className={`ra-combo-option-badge ${count > 0 ? 'has-apps' : 'no-apps'}`}>{count}</span>
                          {isSelected && (
                            <span className="ra-combo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <select
            className="ra-status-filter"
            value={appStatusFilter}
            onChange={(e) => setAppStatusFilter(e.target.value)}
            style={{
              padding: '8px 32px 8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid var(--ra-border-1)',
              borderRadius: '8px',
              background: 'white',
              color: 'var(--ra-text-1)',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              transition: 'all 0.2s ease'
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

        {/* ─── Two-Column Split ─── */}
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
                  {appJobFilter !== 'all'
                    ? `No applications yet for this role.`
                    : 'No applications match your filters.'}
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
                        <span className="ra-detail-tag">
                          {selectedApp.job_profile.employment_type.toUpperCase()}
                        </span>
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
                        alert(`Cannot message this candidate - user_id is missing. Candidate ID: ${selectedApp.candidate.id}`);
                      }
                    }}
                    title="Send a direct message to this candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Message
                  </button>
                  <button 
                    className="ra-btn ra-btn-primary" 
                    onClick={() => {
                      // Map application_id to id for the modal
                      setSelectedAppForSchedule({
                        ...selectedApp,
                        id: selectedApp.application_id
                      });
                      setIsScheduleInterviewModalOpen(true);
                    }}
                    title="Schedule an interview with this candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Schedule Interview
                  </button>
                  <select
                    className="ra-detail-status-select"
                    value={selectedApp.status}
                    onChange={(e) => {
                      handleUpdateApplicationStatus(selectedApp.application_id, e.target.value);
                      showToast(`Status updated to ${e.target.value}`);
                    }}
                  >
                    <option value="applied">Applied</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="under_review">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
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
                            <div className="ra-contact-value">{selectedApp.candidate.location_county ? `${selectedApp.candidate.location_county}, ` : ''}{selectedApp.candidate.location_state}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Application Info */}
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

                  {/* Social Links */}
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedApp.job_profile.resumes.map((resume: any) => (
                          <div 
                            key={resume.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                                style={{ width: '18px', height: '18px', color: '#7c3aed', flexShrink: 0 }}
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                              </svg>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 500, 
                                  color: '#334155',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {resume.filename}
                                </div>
                                {resume.uploaded_at && (
                                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                    Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              className="ra-btn ra-btn-success"
                              onClick={() => handleDownloadResume(selectedApp.application_id, resume.id, resume.filename)}
                              title="Download resume file"
                              style={{ flexShrink: 0 }}
                            >
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#64748b', 
                        marginTop: '8px',
                        fontStyle: 'italic'
                      }}>
                        {selectedApp.job_profile.resumes.length === 1 ? '1 resume' : `${selectedApp.job_profile.resumes.length} resumes`} submitted for this application
                      </div>
                    </div>
                  )}

                  {/* Submitted Certifications */}
                  {selectedApp.job_profile.certifications && selectedApp.job_profile.certifications.length > 0 && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Submitted Certifications
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedApp.job_profile.certifications.map((cert: any) => (
                          <div 
                            key={cert.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                                style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }}
                              >
                                <circle cx="12" cy="8" r="7"/>
                                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                              </svg>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 500, 
                                  color: '#334155',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {cert.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  {cert.issuer && <span>{cert.issuer}</span>}
                                  {cert.issuer && cert.issued_date && <span> • </span>}
                                  {cert.issued_date && (
                                    <span>Issued {new Date(cert.issued_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      year: 'numeric'
                                    })}</span>
                                  )}
                                  {cert.expiry_date && (
                                    <span> • Expires {new Date(cert.expiry_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      year: 'numeric'
                                    })}</span>
                                  )}
                                </div>
                                {cert.filename && (
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#64748b', 
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <svg 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2"
                                      style={{ width: '12px', height: '12px' }}
                                    >
                                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                      <polyline points="13 2 13 9 20 9"/>
                                    </svg>
                                    <span style={{ 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>{cert.filename}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {cert.filename && (
                              <button
                                onClick={() => handleDownloadCertification(selectedApp.application_id, cert.id, cert.filename)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#10b981',
                                  backgroundColor: 'white',
                                  border: '1px solid #10b981',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#10b981';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = '#10b981';
                                }}
                              >
                                <svg 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2"
                                  style={{ width: '14px', height: '14px' }}
                                >
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
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#64748b', 
                        marginTop: '8px',
                        fontStyle: 'italic'
                      }}>
                        {selectedApp.candidate.certifications.length === 1 
                          ? '1 certification' 
                          : `${selectedApp.candidate.certifications.length} certifications`} submitted for this application
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="ra-detail-section">
                    <div className="ra-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Recruiter Notes
                    </div>
                    
                    {/* Display saved notes if they exist */}
                    {selectedApp.recruiter_notes && (
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '6px', 
                        marginBottom: '12px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                            Saved Notes
                          </span>
                          {selectedApp.notes_updated_at && (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              Last updated: {new Date(selectedApp.notes_updated_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#334155', 
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {selectedApp.recruiter_notes}
                        </div>
                      </div>
                    )}
                    
                    <textarea
                      className="ra-notes-textarea"
                      placeholder="Add interview feedback, evaluation notes, or next-step comments..."
                      value={appNotes[selectedApp.application_id] ?? selectedApp.recruiter_notes ?? ''}
                      onChange={(e) => setAppNotes(prev => ({ ...prev, [selectedApp.application_id]: e.target.value }))}
                    />
                    <div className="ra-notes-footer">
                      <button 
                        className="ra-btn ra-btn-success" 
                        onClick={() => handleSaveApplicationNotes(selectedApp.application_id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Save Notes
                      </button>
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                        Notes are private and only visible to recruiters
                      </span>
                    </div>
                  </div>

                  {/* Timeline */}
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

        {/* ─── Email Composer Modal ─── */}
        {showEmailComposer && selectedApp && (
          <div className="ra-modal-overlay" onClick={() => setShowEmailComposer(false)}>
            <div className="ra-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ra-modal-header">
                <div className="ra-modal-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Compose Email
                </div>
                <button className="ra-modal-close" onClick={() => setShowEmailComposer(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="ra-modal-body">
                <div className="ra-field">
                  <div className="ra-field-row">
                    <span className="ra-field-label">To</span>
                    <input className="ra-field-input" value={selectedApp?.candidate.email || ''} readOnly />
                  </div>
                </div>
                <div className="ra-field">
                  <div className="ra-field-row">
                    <span className="ra-field-label">Template</span>
                    <select
                      className="ra-template-select"
                      value={emailTemplate}
                      onChange={e => applyEmailTemplate(e.target.value, selectedApp)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— Custom —</option>
                      <option value="interview">Interview Invitation</option>
                      <option value="followup">Follow-Up</option>
                      <option value="rejection">Rejection</option>
                      <option value="offer">Offer Letter</option>
                    </select>
                  </div>
                </div>
                <div className="ra-field">
                  <div className="ra-field-row">
                    <span className="ra-field-label">Subject</span>
                    <input
                      className="ra-field-input"
                      placeholder="Email subject…"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ra-field">
                  <textarea
                    className="ra-email-body"
                    placeholder="Write your message…"
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                  />
                </div>
              </div>
              <div className="ra-modal-footer">
                <button className="ra-btn ra-btn-outline" onClick={() => setShowEmailComposer(false)}>Cancel</button>
                <button className="ra-btn ra-btn-primary ra-btn-lg" onClick={sendEmail}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Toast ─── */}
        {toast && (
          <div className="ra-toast">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {toast}
          </div>
        )}
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
          <p className="empty-subtitle">Continue reviewing candidates. When both you and a candidate express mutual interest, matches will appear here.</p>
          <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary">
            View Recommendations
          </button>
        </div>
      );
    }

    return (
      <>
      <div className="purple-section-wrapper">
      <style>{`
        @media (max-width: 1400px) {
          .recruiter-matches-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 1200px) {
          .recruiter-matches-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .recruiter-matches-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="recruiter-matches-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        padding: '0'
      }}>
        {matches.map((match: any, index) => {
          const candidateInitial = match.candidate.name?.charAt(0).toUpperCase() || 'C';
          return (
            <div key={`match-${match.match_id}-${index}`} style={{
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

              {/* Header: Candidate Avatar */}
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
                  {candidateInitial}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                  {match.candidate.name}
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

              {/* Job Role / Category */}
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px',
                fontWeight: '500'
              }}>
                {match.job_profile?.job_role || match.job_profile?.profile_name || 'Professional'}
              </p>

              {/* Details Grid (2x2) */}
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
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {match.job_profile?.years_of_experience ? `${match.job_profile.years_of_experience} yrs exp` : match.job_posting.seniority_level || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                    {match.candidate.email}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {match.candidate.phone || 'No phone'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                <button
                  onClick={() => setViewProfileMatch(match)}
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
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  View Profile
                </button>
                <button
                  onClick={() => {
                    if (match.candidate.user_id) {
                      handleStartDirectMessage(match.candidate.user_id);
                    } else {
                      alert('Cannot message this candidate: User ID not available');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#111827',
                    color: 'white',
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
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.4)';
                    e.currentTarget.style.background = '#1f2937';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = '#111827';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
              </div>
            </div>
          );
        })}
      </div>

        {/* ── View Profile Modal ── */}
        {viewProfileMatch && (() => {
          const m = viewProfileMatch;
          const c = m.candidate;
          const jp = m.job_profile;

          // Group skills by category
          const skillsByCategory: Record<string, any[]> = {};
          (jp.skills || []).forEach((sk: any) => {
            const cat = sk.skill_category || 'Other';
            if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
            skillsByCategory[cat].push(sk);
          });

          // Collect social links from both candidate and job_profile
          const socials: { label: string; url: string; icon: JSX.Element }[] = [];
          const addSocial = (label: string, url: string | undefined | null, icon: JSX.Element) => {
            if (url) socials.push({ label, url, icon });
          };
          addSocial('LinkedIn', jp.linkedin_url || c.linkedin_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>);
          addSocial('GitHub', jp.github_url || c.github_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>);
          addSocial('Portfolio', jp.portfolio_url || c.portfolio_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
          addSocial('Twitter', jp.twitter_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>);
          addSocial('Website', jp.website_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);

          return (
            <div className="vp-overlay" onClick={() => setViewProfileMatch(null)}>
              <div className="vp-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="vp-header">
                  <div className="vp-header-avatar">{c.name.charAt(0).toUpperCase()}</div>
                  <div className="vp-header-info">
                    <h2 className="vp-header-name">{c.name}</h2>
                    <p className="vp-header-role">{jp.profile_name} &middot; {jp.job_role} &middot; {m.match_percentage}% Match</p>
                  </div>
                  <button className="vp-close" onClick={() => setViewProfileMatch(null)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div className="vp-body">
                  {/* Summary */}
                  {(jp.profile_summary || c.profile_summary) && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Summary
                      </div>
                      <div className="vp-summary">{jp.profile_summary || c.profile_summary}</div>
                    </div>
                  )}

                  {/* Job Preferences */}
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Job Preferences
                    </div>
                    <div className="vp-grid">
                      <div className="vp-field"><span className="vp-field-label">Product Vendor</span><span className="vp-field-value">{jp.product_vendor || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Product Type</span><span className="vp-field-value">{jp.product_type || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Seniority</span><span className="vp-field-value">{jp.seniority_level || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Experience</span><span className="vp-field-value">{jp.years_of_experience} years</span></div>
                      <div className="vp-field"><span className="vp-field-label">Work Type</span><span className="vp-field-value">{jp.worktype}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Employment</span><span className="vp-field-value">{jp.employment_type}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Salary Range</span><span className="vp-field-value">${jp.salary_min?.toLocaleString()} – ${jp.salary_max?.toLocaleString()} {jp.salary_currency} {jp.pay_type ? `(${jp.pay_type})` : ''}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Negotiability</span><span className="vp-field-value">{jp.negotiability || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Visa Status</span><span className="vp-field-value">{jp.visa_status?.replace('_', ' ')}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Education</span><span className="vp-field-value">{jp.highest_education || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Notice Period</span><span className="vp-field-value">{jp.notice_period || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Availability</span><span className="vp-field-value">{jp.availability_date || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Travel</span><span className="vp-field-value">{jp.travel_willingness || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Shift</span><span className="vp-field-value">{jp.shift_preference || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Remote</span><span className="vp-field-value">{jp.remote_acceptance || <em className="vp-empty">—</em>}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Relocation</span><span className="vp-field-value">{jp.relocation_willingness || <em className="vp-empty">—</em>}</span></div>
                    </div>
                  </div>

                  {/* Preferred Locations */}
                  {jp.location_preferences && jp.location_preferences.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Preferred Locations
                      </div>
                      <div className="vp-location-pills">
                        {jp.location_preferences.map((lp: any, i: number) => (
                          <span key={i} className="vp-location-pill">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {lp.city}, {lp.state}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {jp.skills && jp.skills.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Skills
                      </div>
                      {Object.entries(skillsByCategory).map(([cat, skills]) => (
                        <div key={cat}>
                          <div className="vp-skill-cat-label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                          <div className="vp-skills-wrap">
                            {skills.map((sk: any, i: number) => (
                              <span key={i} className="vp-skill-pill">
                                {sk.skill_name}
                                <span className="vp-skill-level">{sk.proficiency_level}/5</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Social Links */}
                  {socials.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Social & Links
                      </div>
                      <div className="vp-social-row">
                        {socials.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="vp-social-link">
                            {s.icon}
                            {s.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumes */}
                  {c.resumes && c.resumes.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Resumes
                      </div>
                      {c.resumes.map((r: any) => (
                        <div key={r.id} className="vp-doc-card">
                          <div className="vp-doc-icon resume"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                          <div className="vp-doc-info">
                            <div className="vp-doc-name">{r.filename}</div>
                            {r.uploaded_at && <div className="vp-doc-meta">Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</div>}
                          </div>
                          <a href={`${API_BASE}/${r.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Certifications */}
                  {c.certifications && c.certifications.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                        Certifications
                      </div>
                      {c.certifications.map((cert: any) => (
                        <div key={cert.id} className="vp-doc-card">
                          <div className="vp-doc-icon cert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
                          <div className="vp-doc-info">
                            <div className="vp-doc-name">{cert.name}</div>
                            <div className="vp-doc-meta">
                              {cert.issuer && <>{cert.issuer}</>}
                              {cert.issued_date && <> &middot; Issued {cert.issued_date}</>}
                              {cert.expiry_date && <> &middot; Expires {cert.expiry_date}</>}
                            </div>
                          </div>
                          {cert.filename && cert.storage_path && (
                            <a href={`${API_BASE}/${cert.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Contact Information
                    </div>
                    <div className="vp-grid">
                      <div className="vp-field"><span className="vp-field-label">Email</span><span className="vp-field-value">{c.email}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Phone</span><span className="vp-field-value">{c.phone}</span></div>
                      <div className="vp-field"><span className="vp-field-label">Location</span><span className="vp-field-value">{c.location_county ? `${c.location_county}, ` : ''}{c.location_state || <em className="vp-empty">—</em>}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      </>
    );
  };

  const renderBrowseCandidates = () => {
    // Derive available roles from candidate data
    const availableRoles = React.useMemo(() => {
      const rolesSet = new Set<string>();
      browseCandidates.forEach((candidate: any) => {
        if (candidate.headline) rolesSet.add(candidate.headline);
        if (candidate.job_profiles) {
          candidate.job_profiles.forEach((jp: any) => {
            if (jp.job_role) rolesSet.add(jp.job_role);
            if (jp.profile_name) rolesSet.add(jp.profile_name);
          });
        }
      });
      return Array.from(rolesSet).sort();
    }, [browseCandidates]);

    // Filter candidates based on role selection (frontend filtering)
    const filteredCandidates = React.useMemo(() => {
      if (!browseRole) return browseCandidates;
      return browseCandidates.filter((candidate: any) => {
        if (candidate.headline === browseRole) return true;
        if (candidate.job_profiles) {
          return candidate.job_profiles.some((jp: any) => 
            jp.job_role === browseRole || jp.profile_name === browseRole
          );
        }
        return false;
      });
    }, [browseCandidates, browseRole]);

    const hasActiveFilters = browseSearch || browseRole || browseWorkType || browseLocation;
    const resultCount = filteredCandidates.length;

    if (browseLoading) {
      return (
        <div className="loading">Loading candidates...</div>
      );
    }

    return (
      <>
        <div className="purple-section-wrapper">
        {/* Page Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Browse Candidates</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Review and engage with candidate profiles across the platform</p>
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
                  placeholder="Name, email, or keywords..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Role Dropdown */}
            <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
              <label htmlFor="browse-role-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
              <select
                id="browse-role-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={browseRole}
                onChange={(e) => setBrowseRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Work Type Dropdown */}
            <div style={{ flex: '0 1 160px', minWidth: '140px' }}>
              <label htmlFor="browse-worktype-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</label>
              <select
                id="browse-worktype-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
                value={browseWorkType}
                onChange={(e) => setBrowseWorkType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Location Input */}
            <div style={{ flex: '0 1 180px', minWidth: '160px' }}>
              <label htmlFor="browse-location-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</label>
              <input
                type="text"
                id="browse-location-filter"
                className="job-select-modern"
                style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px' }}
                placeholder="City or State"
                value={browseLocation}
                onChange={(e) => setBrowseLocation(e.target.value)}
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="action-btn secondary"
                  style={{ height: '40px', padding: '0 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => { setBrowseSearch(''); setBrowseRole(''); setBrowseWorkType(''); setBrowseLocation(''); }}
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
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
              {hasActiveFilters 
                ? `Showing ${resultCount} of ${browseTotal} candidates`
                : `Showing ${browseTotal} candidates`
              }
            </span>
            {hasActiveFilters && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                {[browseSearch && 'search', browseRole && 'role', browseWorkType && 'work type', browseLocation && 'location'].filter(Boolean).join(', ')} active
              </span>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredCandidates.length === 0 && (
          <div className="empty-state-modern">
            <div className="empty-icon-professional">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="empty-title">No Candidates Found</h3>
            <p className="empty-subtitle">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more candidates.'
                : 'No candidates are available in the system at this time.'}
            </p>
          </div>
        )}

        {/* Enhanced Candidates Grid */}
        {filteredCandidates.length > 0 && (
          <div className="candidates-grid-modern" style={{ gap: '20px' }}>
            {filteredCandidates.map((candidate: any, index) => (
              <div 
                key={`browse-${candidate.candidate_id}-${index}`} 
                className="candidate-card-modern"
                style={{
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '20px',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Card Header with Avatar and Basic Info */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 600,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }}>
                    {candidate.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', marginBottom: '4px', lineHeight: 1.3 }}>
                      {candidate.full_name}
                    </h3>
                    {candidate.headline && (
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary, #667eea)', marginBottom: '6px', lineHeight: 1.4 }}>
                        {candidate.headline}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                      {candidate.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {candidate.location}
                        </span>
                      )}
                      {candidate.years_experience && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                          {candidate.years_experience} years
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Work Type Badge */}
                {candidate.work_type && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: candidate.work_type === 'Remote' ? '#dbeafe' : candidate.work_type === 'Hybrid' ? '#fef3c7' : '#e0e7ff',
                      color: candidate.work_type === 'Remote' ? '#1e40af' : candidate.work_type === 'Hybrid' ? '#92400e' : '#3730a3'
                    }}>
                      {candidate.work_type}
                    </span>
                  </div>
                )}

                {/* Skills Section */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>Top Skills</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {candidate.skills.slice(0, 6).map((skill: any, idx: number) => (
                        <span 
                          key={idx} 
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--bg-light, #f8fafc)',
                            color: 'var(--text-secondary, #64748b)',
                            border: '1px solid var(--border-color, #e2e8f0)'
                          }}
                        >
                          {skill.skill_name}
                        </span>
                      ))}
                      {candidate.skills.length > 6 && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--primary, #667eea)'
                        }}>
                          +{candidate.skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Profiles Section */}
                {candidate.job_profiles && candidate.job_profiles.length > 0 && (
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>Roles</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>
                      {candidate.job_profiles.slice(0, 2).map((jp: any, idx: number) => (
                        <span key={idx}>
                          {jp.profile_name || jp.job_role}
                          {idx < Math.min(candidate.job_profiles.length - 1, 1) && ', '}
                        </span>
                      ))}
                      {candidate.job_profiles.length > 2 && (
                        <span style={{ color: 'var(--text-muted, #94a3b8)' }}> +{candidate.job_profiles.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced CTA Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    style={{ 
                      flex: 1, 
                      minWidth: '140px',
                      height: '40px',
                      padding: '0 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewCandidateProfile(candidate);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)';
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    className={`action-btn ${candidate.already_liked ? 'liked' : 'secondary'}`}
                    style={{ 
                      padding: '0 16px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      opacity: candidate.already_liked ? 0.6 : 1,
                      cursor: candidate.already_liked ? 'not-allowed' : 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!candidate.already_liked && candidate.job_profiles && candidate.job_profiles.length > 0) {
                        handleRecruiterLike(candidate.candidate_id, candidate.job_profiles[0].id);
                      }
                    }}
                    disabled={candidate.already_liked}
                    title={candidate.already_liked ? 'Already liked this candidate' : 'Like this candidate'}
                  >
                    <svg viewBox="0 0 24 24" fill={candidate.already_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {candidate.already_liked ? 'Liked' : 'Like'}
                  </button>
                  <button
                    className="action-btn secondary"
                    style={{ 
                      padding: '0 16px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (candidate.user_id) {
                        handleStartDirectMessage(candidate.user_id);
                      } else {
                        alert('Cannot message this candidate');
                      }
                    }}
                    title="Send a message to this candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Message
                  </button>
                  <button
                    className={`action-btn ${candidate.already_invited ? 'success' : 'primary'}`}
                    style={{ 
                      padding: '0 16px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      opacity: candidate.already_invited ? 0.6 : 1,
                      cursor: candidate.already_invited ? 'not-allowed' : 'pointer',
                      background: candidate.already_invited ? '#10b981' : 'var(--primary, #667eea)',
                      color: 'white',
                      border: 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!candidate.already_invited && candidate.job_profiles && candidate.job_profiles.length > 0) {
                        handleAskToApply(candidate.candidate_id, candidate.job_profiles[0].id);
                      }
                    }}
                    disabled={candidate.already_invited}
                    title={candidate.already_invited ? 'Already invited this candidate' : 'Ask candidate to apply'}
                  >
                    {candidate.already_invited ? '✓ Asked to Apply' : 'Ask to Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {browseTotal > browseLimit && (
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <button
              className="action-btn secondary"
              style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 500, borderRadius: '8px' }}
              onClick={() => setBrowsePage(prev => Math.max(1, prev - 1))}
              disabled={browsePage === 1}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
              Page {browsePage} of {Math.ceil(browseTotal / browseLimit)}
            </span>
            <button
              className="action-btn secondary"
              style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 500, borderRadius: '8px' }}
              onClick={() => setBrowsePage(prev => Math.min(Math.ceil(browseTotal / browseLimit), prev + 1))}
              disabled={browsePage >= Math.ceil(browseTotal / browseLimit)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
      </>
    );
  };

  const renderJobPostings = () => {
    const worktypeLabel = (wt: string) => ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[wt] || (wt ? wt.charAt(0).toUpperCase() + wt.slice(1) : ''));
    const fmtSalary = (min: number, max: number, cur: string) => {
      const fmt = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : v.toLocaleString();
      return `${(cur || 'USD').toUpperCase()} ${fmt(min)} – ${fmt(max)}`;
    };
    const getJpPageNumbers = (): (number | string)[] => {
      if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
      const pages: (number | string)[] = [];
      if (jpCurrentPage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalPages); }
      else if (jpCurrentPage >= totalPages - 3) { pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
      else { pages.push(1, '...', jpCurrentPage - 1, jpCurrentPage, jpCurrentPage + 1, '...', totalPages); }
      return pages;
    };

    const filtered = allJobPostings.filter(p => {
      const matchSearch = !jpSearch || (p.job_title || p.title || '').toLowerCase().includes(jpSearch.toLowerCase());
      const matchStatus = jpStatusFilter === 'all' || (p.status || '').toLowerCase() === jpStatusFilter;
      return matchSearch && matchStatus;
    });
    const totalPages = Math.ceil(filtered.length / JP_PAGE_SIZE);
    const paginated = filtered.slice((jpCurrentPage - 1) * JP_PAGE_SIZE, jpCurrentPage * JP_PAGE_SIZE);

    const handleStatusAction = async (id: number, action: 'freeze' | 'reactivate' | 'cancel', reason?: string) => {
      try {
        await apiClient.updateJobPostingStatus(id, action, reason);
        await fetchJobPostings();
        const labels: Record<string, string> = { freeze: 'frozen', reactivate: 'reactivated', cancel: 'cancelled' };
        setToast(`Job ${labels[action] || action} successfully.`);
      } catch {
        setToast('Action failed. Please try again.');
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
            <span style={{ cursor: 'pointer', color: '#6b7280', fontSize: 13 }} onClick={() => setActiveTab('recommendations')}>Dashboard</span>
            <span style={{ color: '#d1d5db', fontSize: 12, margin: '0 6px' }}>›</span>
            <span style={{ color: '#111827', fontWeight: 500, fontSize: 13 }}>Job Postings</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Job Postings</h1>
            <button className="jpb-btn jpb-btn-primary" onClick={() => navigate('/recruiter/job-postings')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Posting
            </button>
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
          {paginated.length === 0 ? (
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
                            <button className="cp-card-menu-item" onClick={() => { setJpCardMenuOpenId(null); handleStatusAction(p.id, 'freeze'); }}>Freeze</button>
                          )}
                          {nStatus === 'frozen' && (
                            <button className="cp-card-menu-item" onClick={() => { setJpCardMenuOpenId(null); handleStatusAction(p.id, 'reactivate'); }}>Unfreeze</button>
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
                    if (jpSelectedId) await handleStatusAction(jpSelectedId, 'cancel', jpCancelReason);
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
        {/* Welcome Banner with KPI Cards */}
        <div className="welcome-banner-modern">
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

          {/* ── Hiring Pipeline ── */}
          <div style={{ padding: '16px 0 4px 0', marginTop: '8px', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" width="14" height="14">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', margin: 0, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Hiring Pipeline
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Click a stage to view applications</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {([
                { label: 'Applied',      status: 'applied',      color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
                { label: 'Scheduled',    status: 'scheduled',    color: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD' },
                { label: 'Under Review', status: 'under_review', color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A' },
                { label: 'Shortlisted',  status: 'shortlisted',  color: '#8B5CF6', bg: '#EDE9FE', border: '#DDD6FE' },
                { label: 'Selected',     status: 'selected',     color: '#10B981', bg: '#D1FAE5', border: '#A7F3D0' },
                { label: 'Rejected',     status: 'rejected',     color: '#EF4444', bg: '#FEE2E2', border: '#FECACA' },
              ] as { label: string; status: string; color: string; bg: string; border: string }[]).map(stage => {
                const count = applications.filter((a: any) => a.status === stage.status).length;
                const total = applications.length || 1;
                const pct = Math.max(count > 0 ? 8 : 0, Math.round((count / total) * 100));
                return (
                  <button
                    key={stage.status}
                    onClick={() => { setActiveTab('applications'); setAppStatusFilter(stage.status); }}
                    style={{
                      background: stage.bg,
                      border: `1px solid ${stage.border}`,
                      borderRadius: '10px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                    title={`View ${stage.label} applications`}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 700, color: stage.color, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.label}</div>
                    <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: stage.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <div className="content-panel-horizontal">
          <div style={{ display: activeTab === 'recommendations' ? 'block' : 'none' }}>
            {renderRecommendations()}
          </div>
          <div style={{ display: activeTab === 'shortlist' ? 'block' : 'none' }}>
            {renderShortlist()}
          </div>
          <div style={{ display: activeTab === 'applications' ? 'block' : 'none' }}>
            {renderApplications()}
          </div>
          <div style={{ display: activeTab === 'matches' ? 'block' : 'none' }}>
            {renderMatches()}
          </div>
          <div style={{ display: activeTab === 'browse' ? 'block' : 'none' }}>
            {renderBrowseCandidates()}
          </div>
          <div style={{ display: activeTab === 'messages' ? 'block' : 'none' }}>
            <ChatWindow />
          </div>
          <div style={{ display: activeTab === 'meetings' ? 'block' : 'none' }}>
            {activeTab === 'meetings' && <MeetingSchedulerTab role="recruiter" />}
          </div>
        </div>
      </div>

      {/* Browse Candidate Profile Drawer */}
      {viewCandidateProfile && (
        <div className="vp-overlay" onClick={() => setViewCandidateProfile(null)}>
          <div className="vp-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="vp-header">
              <div className="vp-header-avatar">{viewCandidateProfile.full_name.charAt(0).toUpperCase()}</div>
              <div className="vp-header-info">
                <h2 className="vp-header-name">{viewCandidateProfile.full_name}</h2>
                {viewCandidateProfile.headline && <p className="vp-header-role">{viewCandidateProfile.headline}</p>}
              </div>
              <button className="vp-close" onClick={() => setViewCandidateProfile(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="vp-body">
              {/* Basic Info Section */}
              <div className="vp-section">
                <div className="vp-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Contact Information
                </div>
                <div className="vp-grid">
                  <div className="vp-field">
                    <span className="vp-field-label">Location</span>
                    <span className="vp-field-value">{viewCandidateProfile.location || <em className="vp-empty">—</em>}</span>
                  </div>
                  {viewCandidateProfile.years_experience && (
                    <div className="vp-field">
                      <span className="vp-field-label">Experience</span>
                      <span className="vp-field-value">{viewCandidateProfile.years_experience} years</span>
                    </div>
                  )}
                  {viewCandidateProfile.work_type && (
                    <div className="vp-field">
                      <span className="vp-field-label">Work Type</span>
                      <span className="vp-field-value">{viewCandidateProfile.work_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              {viewCandidateProfile.skills && viewCandidateProfile.skills.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Skills
                  </div>
                  <div className="vp-skills-wrap">
                    {viewCandidateProfile.skills.map((skill: any, idx: number) => (
                      <span key={idx} className="vp-skill-pill">
                        {skill.skill_name}
                        {skill.proficiency_level && <span className="vp-skill-level">{skill.proficiency_level}/5</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Profiles Section */}
              {viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Job Profiles
                  </div>
                  {viewCandidateProfile.job_profiles.map((profile: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: idx < viewCandidateProfile.job_profiles.length - 1 ? '1px solid var(--border-color, #e2e8f0)' : 'none' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #1e293b)' }}>
                        {profile.profile_name} - {profile.job_role}
                      </h4>
                      {profile.profile_summary && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                          {profile.profile_summary}
                        </p>
                      )}
                      <div className="vp-grid" style={{ marginTop: '8px' }}>
                        {profile.years_of_experience && (
                          <div className="vp-field">
                            <span className="vp-field-label">Experience</span>
                            <span className="vp-field-value">{profile.years_of_experience} years</span>
                          </div>
                        )}
                        {profile.worktype && (
                          <div className="vp-field">
                            <span className="vp-field-label">Work Type</span>
                            <span className="vp-field-value">{profile.worktype}</span>
                          </div>
                        )}
                        {profile.employment_type && (
                          <div className="vp-field">
                            <span className="vp-field-label">Employment</span>
                            <span className="vp-field-value">{profile.employment_type}</span>
                          </div>
                        )}
                        {profile.salary_min && profile.salary_max && (
                          <div className="vp-field">
                            <span className="vp-field-label">Salary Range</span>
                            <span className="vp-field-value">
                              ${profile.salary_min.toLocaleString()} – ${profile.salary_max.toLocaleString()} 
                              {profile.salary_currency ? ` ${profile.salary_currency}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="vp-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  className={`action-btn ${viewCandidateProfile.already_liked ? 'liked' : 'secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (!viewCandidateProfile.already_liked && viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0) {
                      handleRecruiterLike(viewCandidateProfile.candidate_id, viewCandidateProfile.job_profiles[0].id);
                      setViewCandidateProfile({ ...viewCandidateProfile, already_liked: true });
                    }
                  }}
                  disabled={viewCandidateProfile.already_liked}
                >
                  <svg viewBox="0 0 24 24" fill={viewCandidateProfile.already_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span style={{ marginLeft: '8px' }}>{viewCandidateProfile.already_liked ? 'Liked' : 'Like Candidate'}</span>
                </button>
                <button
                  className={`action-btn ${viewCandidateProfile.already_invited ? 'success' : 'primary'}`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (!viewCandidateProfile.already_invited && viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0) {
                      handleAskToApply(viewCandidateProfile.candidate_id, viewCandidateProfile.job_profiles[0].id);
                      setViewCandidateProfile({ ...viewCandidateProfile, already_invited: true });
                    }
                  }}
                  disabled={viewCandidateProfile.already_invited}
                  title={viewCandidateProfile.already_invited ? 'Already invited this candidate' : 'Ask candidate to apply'}
                >
                  {viewCandidateProfile.already_invited ? '✓ Asked to Apply' : 'Ask to Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
