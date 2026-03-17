import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient, API_BASE } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/RecruiterApplications.css';
import NotificationBellDrawer from '../components/notifications/NotificationBellDrawer';
import ChatWindow from '../components/chat/ChatWindow';
import ScheduleInterviewModal from '../components/interviews/ScheduleInterviewModal';

const RECRUITER_TABS = ['recommendations', 'shortlist', 'applications', 'matches', 'browse', 'messages'] as const;

const RecruiterDashboard: React.FC = () => {
  console.log('[COMPONENT MOUNT] RecruiterDashboard loaded');
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

  console.log('[STATE] Initial tab:', activeTab);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [isScheduleInterviewModalOpen, setIsScheduleInterviewModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<any | null>(null);
  const [jobPostings, setJobPostings] = useState<any[]>([]);

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

  // ── Filter states ─────────────────────────────────────────────
  const [shortlistRoleFilter, setShortlistRoleFilter] = useState<string>('all');
  const [recommendationRoleFilter, setRecommendationRoleFilter] = useState<string>('all');

  const userEmail = localStorage.getItem('email') || 'recruiter@company.com';
  const [userFullName, setUserFullName] = useState(localStorage.getItem('full_name') || '');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'admin');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const userName = userFullName || userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1);
  const userInitial = userName.charAt(0).toUpperCase();

  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const canManageTeam = isAdmin || isHR;

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
        console.log('[PROFILE] Could not fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await apiClient.getTeamMembers();
      setTeamMembers(res.data.team_members || []);
      if (res.data.my_role) {
        setUserRole(res.data.my_role);
      }
      if (res.data.company_name) {
        setCompanyName(res.data.company_name);
      }
    } catch (err) {
      console.log('[TEAM] Could not fetch team members:', err);
    }
  };

  useEffect(() => {
    fetchJobPostings();
    fetchShortlist();
    fetchApplications();
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchRecommendations();
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

  const fetchJobPostings = async () => {
    console.log('[API CALL] Fetching job postings');
    try {
      const response = await apiClient.getJobPostings();
      console.log('[API SUCCESS] Job postings fetched, count:', response.data.length);
      setJobPostings(response.data);
      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((j: any) => j.id);
      // Honour ?job= URL param; validate it exists, else fall back to first
      const urlJobId = new URLSearchParams(window.location.search).get('job');
      const parsedId = urlJobId ? parseInt(urlJobId, 10) : null;
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedJobId(parsedId);
      } else {
        console.log('[STATE] Auto-selecting first job:', response.data[0].id);
        setSelectedJobId(response.data[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job postings:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedJobId) return;
    console.log('[API CALL] Fetching recruiter recommendations for job:', selectedJobId);
    setLoading(true);
    try {
      const response = await apiClient.getRecruiterRecommendations(selectedJobId);
      console.log('[API SUCCESS] Recommendations fetched with analytics:', response.data);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShortlist = async () => {
    try {
      console.log('[API CALL] Fetching recruiter shortlist');
      const response = await apiClient.getRecruiterShortlist();
      console.log('[API SUCCESS] Shortlist fetched, count:', response.data.length, 'data:', response.data);
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
    console.log('[RECRUITER SWIPE] Like - Candidate:', candidateId, 'Job Profile:', jobProfileId, 'Job Posting:', selectedJobId);
    try {
      await apiClient.recruiterLike(candidateId, jobProfileId, selectedJobId);
      console.log('[API SUCCESS] Recruiter like recorded');
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
    console.log('[RECRUITER SWIPE] Pass - Candidate:', candidateId, 'Job Profile:', jobProfileId, 'Job Posting:', selectedJobId);
    try {
      await apiClient.recruiterPass(candidateId, jobProfileId, selectedJobId);
      console.log('[API SUCCESS] Recruiter pass recorded');
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
    console.log('[RECRUITER ACTION] Ask to Apply - Candidate:', candidateId, 'Job Profile:', jobProfileId, 'Job Posting:', selectedJobId);
    try {
      await apiClient.recruiterAskToApply(candidateId, jobProfileId, selectedJobId);
      console.log('[API SUCCESS] Invitation sent to candidate');
      // Optimistic update — card stays with Invited badge
      setRecommendations((prev: any) => ({
        ...prev,
        recommendations: prev.recommendations.map((r: any) =>
          r.candidate.id === candidateId && r.job_profile.id === jobProfileId
            ? { ...r, already_actioned: true, action_taken: 'ask_to_apply' }
            : r
        )
      }));
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
      console.log('[MESSAGE] Starting conversation with candidate user ID:', candidateUserId);
      const res = await apiClient.startConversation(candidateUserId);
      console.log('[MESSAGE] Conversation response:', res.data);
      
      const convId = res.data.conversation.id;
      
      // Navigate to messages tab with conversation
      console.log('[MESSAGE] Navigating to messages tab with conversation ID:', convId);
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
      console.log('[MESSAGE] Starting conversation with candidate user ID:', candidateUserId);
      const res = await apiClient.startConversation(candidateUserId);
      console.log('[MESSAGE] Conversation response:', res.data);
      
      const convId = res.data.conversation.id;
      
      // Navigate to messages tab with conversation
      console.log('[MESSAGE] Navigating to messages tab with conversation ID:', convId);
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
    console.log('[APPLICATION UPDATE] Application ID:', applicationId, 'New Status:', status);
    try {
      await apiClient.updateApplicationStatus(applicationId, status);
      console.log('[API SUCCESS] Application status updated to:', status);
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
            <button onClick={() => { console.log('[NAVIGATION] To Job Posting Builder'); navigate('/recruiter/job-postings'); }} className="btn-primary">
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

    return (
      <>
        <div>
        {/* Enhanced Job Posting Selector */}
        <div className="job-selector-modern">
          <div className="selector-header">
            <h3 className="selector-title">Select Job Posting</h3>
            <span className="selector-count">{jobPostings.length} active positions</span>
          </div>
          <select
            className="job-select-modern"
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(parseInt(e.target.value))}
          >
            <option value="" disabled>Choose a position...</option>
            {jobPostings.map(job => (
              <option key={job.id} value={job.id}>
                {job.job_title} • {job.location || 'Remote'}
              </option>
            ))}
          </select>
        </div>

        {/* Recommendations Role Filter */}
        {(() => {
          const recRoleOptions: string[] = Array.from<string>(new Set<string>(
              recommendations.recommendations
                .map((r: any): string =>
                  (r.job_profile?.job_role as string | undefined) ||
                  (r.job_posting?.job_title as string | undefined) ||
                  (r.role as string | undefined) ||
                  ''
                )
                .filter((s: string) => s.length > 0)
            )).sort();
          if (recRoleOptions.length === 0) return null;
          return (
            <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label htmlFor="rec-role-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Role</label>
                <select
                  id="rec-role-filter"
                  className="job-select-modern"
                  style={{ minWidth: '160px', padding: '6px 10px', fontSize: '13px' }}
                  value={recommendationRoleFilter}
                  onChange={(e) => { setRecommendationRoleFilter(e.target.value); setRecCardIndex(0); }}
                >
                  <option value="all">All Roles</option>
                  {recRoleOptions.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {recommendationRoleFilter !== 'all' && (
                <button
                  className="action-btn secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => { setRecommendationRoleFilter('all'); setRecCardIndex(0); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          );
        })()}

        {/* Enhanced Analytics Panel */}
        <div className="analytics-panel-modern">
          <div className="analytics-header">
            <h3 className="analytics-title">Recruitment Analytics</h3>
          </div>
          <div className="analytics-grid">
            <div className="analytics-card shortlisted">
              <div className="analytics-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="analytics-content">
                <div className="analytics-label">Shortlisted</div>
                <div className="analytics-value">{recommendations.analytics.shortlisted_count}</div>
              </div>
            </div>
            <div className="analytics-card interviews">
              <div className="analytics-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="analytics-content">
                <div className="analytics-label">Interviews</div>
                <div className="analytics-value">{recommendations.analytics.interview_count}</div>
              </div>
            </div>
            <div className="analytics-card offers">
              <div className="analytics-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="analytics-content">
                <div className="analytics-label">Offers</div>
                <div className="analytics-value">{recommendations.analytics.offered_count}</div>
              </div>
            </div>
          </div>
        </div>

        {recommendations.recommendations.length === 0 ? (
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
        ) : (() => {
          // Show ALL cards with their status badges (shortlisted, passed, invited)
          const allRecs = recommendations.recommendations;
          const visibleRecs = recommendationRoleFilter === 'all'
            ? allRecs
            : allRecs.filter((r: any) => {
                const role =
                  (r.job_profile?.job_role as string | undefined) ||
                  (r.job_posting?.job_title as string | undefined) ||
                  (r.role as string | undefined) ||
                  '';
                return role === recommendationRoleFilter;
              });
          if (visibleRecs.length === 0) {
            return (
              <div className="empty-state-modern" style={{ marginTop: '24px' }}>
                <h3 className="empty-title">No candidates match the selected role</h3>
                <p className="empty-subtitle">Try selecting a different role or clear the filter.</p>
              </div>
            );
          }
          const safeIndex = Math.min(recCardIndex, visibleRecs.length - 1);
          const rec = visibleRecs[safeIndex];
          return (
            <div className="carousel-container">
              {/* Showing count */}
              {recommendationRoleFilter !== 'all' && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
                  Showing {visibleRecs.length} of {allRecs.length} candidates
                </div>
              )}
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
                  <span className="carousel-hint">candidates</span>
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
              <div className="carousel-card-wrapper" key={`rec-${rec.candidate.id}-${rec.job_profile.id}`}>
                <div className="candidate-card-modern carousel-card" onClick={() => setViewRecommendationProfile(rec)} style={{ cursor: 'pointer' }}>
                  {/* Status Strip: shows action taken for this candidate */}
                  {rec.already_actioned && (
                    <div className="rec-status-strip">
                      {rec.action_taken === 'like' && (
                        <span className="rec-status-chip liked">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          Shortlisted
                        </span>
                      )}
                      {rec.action_taken === 'pass' && (
                        <span className="rec-status-chip passed">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Passed
                        </span>
                      )}
                      {rec.action_taken === 'ask_to_apply' && (
                        <span className="rec-status-chip applied">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                          Invited
                        </span>
                      )}
                    </div>
                  )}
                  {/* Card Header */}
                  <div className="candidate-header-modern">
                    <div className="candidate-avatar-modern">
                      <div className="avatar-circle">
                        {rec.candidate.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="candidate-title-section">
                      <h3 className="candidate-name-modern">{rec.candidate.name}</h3>
                      <div className="candidate-location">{rec.candidate.location_state}</div>
                    </div>
                    <div className="match-badge-modern">
                      <div className="match-percentage">{rec.match_percentage}%</div>
                      <div className="match-label">Match</div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="candidate-content-modern">
                    <div className="candidate-info-section">
                      <div className="info-group">
                        <h4 className="info-group-title">Contact Information</h4>
                        <div className="info-items">
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <span className="info-value">{rec.candidate.email}</span>
                          </div>
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            <span className="info-value">{rec.candidate.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="info-group">
                        <h4 className="info-group-title">Experience & Skills</h4>
                        <div className="info-items">
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                            <span className="info-value">{rec.job_profile.years_of_experience} years experience</span>
                          </div>
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span className="info-value">{rec.job_profile.worktype} • {rec.job_profile.employment_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="candidate-preferences-section">
                      <div className="info-group">
                        <h4 className="info-group-title">Preferences</h4>
                        <div className="info-items">
                          <div className="salary-range">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="1" x2="12" y2="23"/>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            <div className="salary-info">
                              <span className="salary-amount">${rec.job_profile.salary_min}k - ${rec.job_profile.salary_max}k</span>
                              <span className="salary-label">Expected salary</span>
                            </div>
                          </div>
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 11l3 3L22 4"/>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                            <span className="info-value">Visa: {rec.job_profile.visa_status.replace('_', ' ')}</span>
                          </div>
                          {rec.job_profile.availability_date && (
                            <div className="info-item">
                              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <span className="info-value">Available: {rec.job_profile.availability_date}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {rec.has_applied && (
                        <div className="application-status">
                          <div className="status-badge applied">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Applied • {rec.application_status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="candidate-actions-modern">
                    <div className="action-buttons-grid">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (rec.action_taken !== 'pass') handleRecruiterPass(rec.candidate.id, rec.job_profile.id); }}
                        className={`action-btn ${rec.action_taken === 'pass' ? 'action-btn-done passed-done' : 'secondary'}`}
                        disabled={rec.action_taken === 'pass'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        {rec.action_taken === 'pass' ? 'Passed ✓' : 'Pass'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (rec.action_taken !== 'like') handleRecruiterLike(rec.candidate.id, rec.job_profile.id); }}
                        className={`action-btn ${rec.action_taken === 'like' ? 'action-btn-done liked-done' : 'primary'}`}
                        disabled={rec.action_taken === 'like'}
                      >
                        <svg viewBox="0 0 24 24" fill={rec.action_taken === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        {rec.action_taken === 'like' ? 'Shortlisted ✓' : 'Like'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (rec.action_taken !== 'ask_to_apply') handleAskToApply(rec.candidate.id, rec.job_profile.id); }}
                        className={`action-btn ${rec.action_taken === 'ask_to_apply' ? 'action-btn-done applied-done' : 'success'}`}
                        disabled={rec.action_taken === 'ask_to_apply'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        {rec.action_taken === 'ask_to_apply' ? 'Invited ✓' : 'Ask to Apply'}
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (rec.candidate.user_id) {
                            handleStartMessage(rec.candidate.user_id);
                          } else {
                            alert('Cannot message this candidate: User ID not available');
                          }
                        }}
                        className="action-btn message"
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

              {/* Keyboard hint */}
              <div className="carousel-keyboard-hint">
                Use <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> arrow keys to browse
              </div>
            </div>
          );
        })()}
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
                    {rec.action_taken === 'ask_to_apply' ? 'Invited ✓' : 'Ask to Apply'}
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
      {/* Shortlist Filters */}
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="shortlist-role-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Role</label>
          <select
            id="shortlist-role-filter"
            className="job-select-modern"
            style={{ minWidth: '160px', padding: '6px 10px', fontSize: '13px' }}
            value={shortlistRoleFilter}
            onChange={(e) => setShortlistRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            {shortlistRoleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        {shortlistRoleFilter !== 'all' && (
          <button
            className="action-btn secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setShortlistRoleFilter('all')}
          >
            Clear filters
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>
          Showing {filteredShortlist.length} of {shortlist.length}
        </span>
      </div>

      <div className="candidates-grid-modern">
        {filteredShortlist.map((item: any, index) => (
          <div key={`shortlist-${index}-${item.candidate.id}-${item.job_posting?.id ?? 'x'}`} className="candidate-card-modern shortlisted">
            <div className="candidate-header-modern">
              <div className="candidate-avatar-modern">
                <div className="avatar-circle">
                  {item.candidate.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="candidate-title-section">
                <h3 className="candidate-name-modern">{item.candidate.name}</h3>
                <div className="candidate-location">{item.candidate.location_state || 'N/A'}</div>
              </div>
              <div className="action-status-badge shortlisted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Shortlisted</span>
              </div>
            </div>

            <div className="candidate-content-modern">
              <div className="candidate-info-section">
                <div className="info-group">
                  <h4 className="info-group-title">Contact Information</h4>
                  <div className="info-items">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span className="info-value">{item.candidate.email}</span>
                    </div>
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <span className="info-value">{item.candidate.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="candidate-preferences-section">
                <div className="info-group">
                  <h4 className="info-group-title">Position Details</h4>
                  <div className="info-items">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      <span className="info-value">{item.job_posting?.job_title || 'Position'}</span>
                    </div>
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                      <span className="info-value">{item.job_profile?.years_of_experience || 'N/A'} years experience</span>
                    </div>
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span className="info-value">Shortlisted: {new Date(item.shortlisted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="candidate-actions-modern">
              <div className="action-buttons-grid">
                <a
                  href={`mailto:${item.candidate.email}`}
                  className="action-btn primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Contact
                </a>
                <button
                  className="action-btn secondary"
                  onClick={() => setViewShortlistItem(item)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  View Details
                </button>
                <button
                  className="action-btn success"
                  onClick={() => handleAskToApply(item.candidate.id, item.job_profile?.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Ask to Apply
                </button>
                <button
                  className="action-btn message"
                  onClick={() => {
                    if (item.candidate.user_id) {
                      handleStartDirectMessage(item.candidate.user_id);
                    } else {
                      alert('Cannot message this candidate: User ID not available');
                    }
                  }}
                  aria-label={`Message ${item.candidate.name}`}
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
        ))}
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
      <div className="ra-wrapper">
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
                        <div className="ra-card-role">{app.job_profile.profile_name || app.job_posting.job_title}</div>
                      </div>
                    </div>
                    <div className="ra-card-meta">
                      <span className={`ra-status-chip ${app.status}`}>{app.status}</span>
                      <span className="ra-card-posting">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        {app.job_posting.job_title}
                      </span>
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
                    className="ra-btn ra-btn-outline" 
                    onClick={() => {
                      console.log('Candidate data:', selectedApp.candidate);
                      console.log('user_id:', selectedApp.candidate.user_id);
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
                    className="ra-btn ra-btn-outline" 
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
                  {(selectedApp.job_profile.linkedin_url || selectedApp.job_profile.github_url || selectedApp.job_profile.portfolio_url || selectedApp.job_profile.twitter_url || selectedApp.job_profile.website_url || selectedApp.candidate.linkedin_url || selectedApp.candidate.github_url) && (
                    <div className="ra-detail-section">
                      <div className="ra-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Social &amp; Web Links
                      </div>
                      <div className="ra-socials-row">
                        {(selectedApp.job_profile.linkedin_url || selectedApp.candidate.linkedin_url) && (
                          <a href={selectedApp.job_profile.linkedin_url || selectedApp.candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            LinkedIn
                          </a>
                        )}
                        {(selectedApp.job_profile.github_url || selectedApp.candidate.github_url) && (
                          <a href={selectedApp.job_profile.github_url || selectedApp.candidate.github_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
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
                        {selectedApp.job_profile.twitter_url && (
                          <a href={selectedApp.job_profile.twitter_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            X / Twitter
                          </a>
                        )}
                        {selectedApp.job_profile.website_url && (
                          <a href={selectedApp.job_profile.website_url} target="_blank" rel="noopener noreferrer" className="ra-social-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            Website
                          </a>
                        )}
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
                        className="ra-btn ra-btn-outline" 
                        style={{ height: 30, fontSize: 12 }} 
                        onClick={() => handleSaveApplicationNotes(selectedApp.application_id)}
                      >
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
      <div className="jobs-grid-modern">
        {matches.map((match: any, index) => (
          <div key={`match-${match.match_id}-${index}`} className="job-card-modern match-card">
            {/* Mutual Match Banner */}
            <div className="job-header-modern match-header">
              <div className="match-badge-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>Mutual Match - {match.match_percentage}%</span>
              </div>
            </div>

            {/* Card Header: Candidate name + position */}
            <div className="job-header-modern">
              <div className="job-title-section">
                <h3 className="job-title-modern">{match.candidate.name}</h3>
                <div className="job-company">{match.job_posting.job_title} · {match.job_profile.profile_name}</div>
              </div>
              <div className="match-date">
                <small>Matched {new Date(match.matched_at).toLocaleDateString()}</small>
              </div>
            </div>

            {/* Card Body */}
            <div className="job-content-modern">
              <div className="job-info-section">
                <div className="info-group">
                  <h4 className="info-group-title">Position Details</h4>
                  <div className="info-items">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                      <span className="info-value">{match.job_posting.job_title}</span>
                    </div>
                    {match.job_posting.location && (
                      <div className="info-item">
                        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="info-value">{match.job_posting.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="job-compensation-section">
                <div className="info-group">
                  <h4 className="info-group-title">Contact Information</h4>
                  <div className="contact-info">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span className="info-value">{match.candidate.email}</span>
                    </div>
                    {match.candidate.phone && (
                      <div className="info-item">
                        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span className="info-value">{match.candidate.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="job-actions-modern">
              <div className="action-buttons-grid">
                <button
                  onClick={() => setViewProfileMatch(match)}
                  className="action-btn light"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  className="action-btn primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
                <a
                  href={`mailto:${match.candidate.email}`}
                  className="action-btn secondary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Email
                </a>
                {match.candidate.phone && (
                  <a
                    href={`tel:${match.candidate.phone}`}
                    className="action-btn success"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Call
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
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
                    {candidate.already_invited ? '✓ Invited' : 'Ask to Apply'}
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
      </>
    );
  };

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
          <h2 className="page-title">Recruiter Dashboard</h2>
        </div>
        
        <div className="navbar-right">
          <NotificationBellDrawer role="recruiter" />
          
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
                <button onClick={() => { setShowProfileMenu(false); setShowProfilePage(true); fetchTeamMembers(); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  My Profile
                </button>
                <button onClick={() => { setShowProfileMenu(false); navigate('/recruiter/job-postings'); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                  </svg>
                  Settings
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
        {/* Sidebar */}
        <div className="sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <span className="nav-label">Recommendations</span>
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'shortlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortlist')}
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span className="nav-label">Shortlist</span>
              {shortlist.length > 0 && <span className="nav-badge">{shortlist.length}</span>}
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </span>
              <span className="nav-label">Applications</span>
              {applications.length > 0 && <span className="nav-badge">{applications.length}</span>}
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

            <button 
              className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <span className="nav-label">Browse Candidates</span>
              {browseTotal > 0 && <span className="nav-badge">{browseTotal}</span>}
            </button>

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

            <button 
              type="button"
              className="nav-item"
              onClick={() => {
                console.log('[NAV] Post Job clicked — token:', !!localStorage.getItem('token'), '| role:', localStorage.getItem('role'));
                navigate('/recruiter/job-postings');
              }}
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </span>
              <span className="nav-label">Post Job</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Welcome Card - Enhanced with modern design */}
          <div className="welcome-card-modern">
            <div className="welcome-content-enhanced">
              <div className="welcome-header">
                <div className="welcome-avatar">
                  <div className="user-avatar">{userInitial}</div>
                </div>
                <div className="welcome-text">
                  <h1 className="welcome-title-modern">Welcome back, {userName}</h1>
                  <p className="welcome-subtitle-modern">Here's your recruitment activity overview</p>
                </div>
              </div>
            </div>
            
            {/* Enhanced KPI Cards with Icons */}
            <div className="kpi-grid-modern">
              <div className="kpi-card-enhanced active-jobs">
                <div className="kpi-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{jobPostings.length}</div>
                  <div className="kpi-label">Active Jobs</div>
                </div>
                <div className="kpi-trend positive">+12%</div>
              </div>
              
              <div className="kpi-card-enhanced shortlisted">
                <div className="kpi-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{shortlist.length}</div>
                  <div className="kpi-label">Shortlisted</div>
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
                  <div className="kpi-value">{applications.length}</div>
                  <div className="kpi-label">Applications</div>
                </div>
                <div className="kpi-change">Pending review</div>
              </div>
              
              <div className="kpi-card-enhanced matches">
                <div className="kpi-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{matches.length}</div>
                  <div className="kpi-label">Matches</div>
                </div>
                <div className="kpi-trend positive">+3 new</div>
              </div>
            </div>
          </div>

          {/* Content Panel */}
          <div className="content-panel">
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
          </div>
        </div>
      </div>

      {/* Profile Page Overlay */}
      {showProfilePage && (
        <div className="profile-page-overlay" onClick={() => setShowProfilePage(false)}>
          <div className="profile-page-panel" onClick={(e) => e.stopPropagation()}>
            <div className="profile-page-header">
              <h2>My Profile</h2>
              <button className="profile-page-close" onClick={() => setShowProfilePage(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Profile Card */}
            <div className="profile-info-card">
              <div className="profile-info-avatar">
                <div className="profile-avatar-large">{userInitial}</div>
              </div>
              <div className="profile-info-details">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Full Name</span>
                  <span className="profile-detail-value">{userName}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Email</span>
                  <span className="profile-detail-value">{userEmail}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Company</span>
                  <span className="profile-detail-value">{companyName || 'Not specified'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Role</span>
                  <span className="profile-detail-value profile-role-badge">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                </div>
              </div>
            </div>

            {/* Team Management Section - Admin and HR only */}
            {canManageTeam && (
              <div className="team-management-section">
                <div className="team-section-header">
                  <h3>Team Management</h3>
                  <button className="btn-add-member">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Invite Member
                  </button>
                </div>
                <div className="team-members-table">
                  <div className="team-table-header">
                    <span>Member</span>
                    <span>Role</span>
                    <span>Jobs Posted</span>
                    <span>Status</span>
                  </div>
                  {teamMembers.length === 0 ? (
                    <div className="team-table-empty">Loading team data...</div>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id} className={`team-table-row ${member.is_self ? 'is-self' : ''}`}>
                        <div className="team-member-info">
                          <div className="team-member-avatar">{member.name.charAt(0)}</div>
                          <div>
                            <div className="team-member-name">
                              {member.name}
                              {member.is_self && <span className="self-tag">You</span>}
                            </div>
                            <div className="team-member-email">{member.email}</div>
                          </div>
                        </div>
                        <span className={`team-role-tag role-${member.role.toLowerCase()}`}>{member.role}</span>
                        <span className="team-jobs-count">
                          <strong>{member.jobs_posted}</strong> {member.jobs_posted === 1 ? 'job' : 'jobs'}
                        </span>
                        <span className={`team-status-tag ${member.status.toLowerCase()}`}>{member.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                >
                  {viewCandidateProfile.already_invited ? 'Invited' : 'Ask to Apply'}
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
