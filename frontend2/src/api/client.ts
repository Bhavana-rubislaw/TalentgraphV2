import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Candidate Auth
  candidateSignup: (email: string, fullName: string, password: string) =>
    api.post('/auth/candidate/signup', { 
      email, 
      full_name: fullName, 
      password 
    }),
  
  candidateLogin: (email: string, password: string) =>
    api.post('/auth/candidate/login', { email, password }),

  // Company Auth
  companySignup: (email: string, fullName: string, password: string, companyRole: string) =>
    api.post('/auth/company/signup', { 
      email, 
      full_name: fullName, 
      password,
      company_role: companyRole 
    }),
  
  companyLogin: (email: string, password: string) =>
    api.post('/auth/company/login', { email, password }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),

  searchUsers: (query: string, limit: number = 10) =>
    api.get('/auth/users/search', { params: { q: query, limit } }),

  // Candidates
  createCandidateProfile: (data: any) =>
    api.post('/candidates/profile', data),
  
  getCandidateProfile: () =>
    api.get('/candidates/profile'),
  
  getCandidateProfileStatus: () =>
    api.get('/candidates/profile-status'),
  
  updateCandidateProfile: (data: any) =>
    api.put('/candidates/profile', data),
  
  createJobProfile: (data: any) =>
    api.post('/candidates/job-profiles', data),
  
  getJobProfiles: () =>
    api.get('/candidates/job-profiles'),
  
  updateJobProfile: (id: number, data: any) =>
    api.put(`/candidates/job-profiles/${id}`, data),
  
  deleteJobProfile: (id: number) =>
    api.delete(`/candidates/job-profiles/${id}`),
  
  // Skill catalogs for candidate job preferences
  getCandidateSkillCatalogs: () =>
    api.get('/candidates/skill-catalogs'),

  // Resume-assisted onboarding
  uploadResumeForOnboarding: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/candidates/onboarding/upload-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Parse resume for job preferences
  parseResumeForJobPreferences: (formData: FormData) => {
    return api.post('/candidates/parse-resume-for-job-preferences', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getOnboardingDraft: () =>
    api.get('/candidates/onboarding/draft'),

  updateOnboardingDraft: (data: any) =>
    api.put('/candidates/onboarding/draft', data),

  finalizeOnboarding: (reviewed: boolean = true) =>
    api.post('/candidates/onboarding/finalize', { reviewed }),

  deleteOnboardingDraft: () =>
    api.delete('/candidates/onboarding/draft'),

  // Resume uploads
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/candidates/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getResumes: () =>
    api.get('/candidates/resumes'),
  
  deleteResume: (id: number) =>
    api.delete(`/candidates/resumes/${id}`),
  
  // Certification uploads
  uploadCertification: (file: File, name: string, issuer?: string, issuedDate?: string, expiryDate?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (issuer) formData.append('issuer', issuer);
    if (issuedDate) formData.append('issued_date', issuedDate);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    return api.post('/candidates/certifications/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getCertifications: () =>
    api.get('/candidates/certifications'),
  
  deleteCertification: (id: number) =>
    api.delete(`/candidates/certifications/${id}`),

  // Company
  createCompanyProfile: (data: any) =>
    api.post('/company/profile', data),
  
  getCompanyProfile: () =>
    api.get('/company/profile'),
  
  updateCompanyProfile: (data: any) =>
    api.put('/company/profile', data),

  // Company Profile Setup
  setupCompanyProfile: (data: {
    full_name: string;
    company_name: string;
    company_role: string;
    company_website?: string;
    company_location?: string;
    department?: string;
    phone_number?: string;
    linkedin_profile?: string;
    hiring_focus?: string;
    company_description?: string;
  }) =>
    api.post('/company/setup-profile', data),

  getCompanyProfileStatus: () =>
    api.get('/company/profile-status'),

  updateExtendedCompanyProfile: (data: any) =>
    api.put('/company/update-profile', data),

  // Job Postings
  createJobPosting: (data: any) =>
    api.post('/job-postings', data),
  
  getJobPostings: (activeOnly: boolean = true) =>
    api.get('/job-postings', { params: { active_only: activeOnly } }),
  
  getJobPosting: (id: number) =>
    api.get(`/job-postings/${id}`),
  
  updateJobPosting: (id: number, data: any) =>
    api.put(`/job-postings/${id}`, data),
  
  deleteJobPosting: (id: number) =>
    api.delete(`/job-postings/${id}`),
  
  toggleJobPostingActive: (id: number) =>
    api.post(`/job-postings/${id}/toggle-active`),

  // Job Posting Lifecycle Management
  updateJobPostingStatus: (id: number, action: 'freeze' | 'reactivate' | 'repost' | 'cancel', cancellation_reason?: string) =>
    api.post(`/job-postings/${id}/status`, { action, cancellation_reason }),

  getSkillCatalogs: () =>
    api.get('/job-postings/catalogs'),

  addSkillToPosting: (jobId: number, data: any) =>
    api.post(`/job-postings/${jobId}/skills`, data),

  updatePostingSkill: (jobId: number, skillId: number, data: any) =>
    api.put(`/job-postings/${jobId}/skills/${skillId}`, data),

  deletePostingSkill: (jobId: number, skillId: number) =>
    api.delete(`/job-postings/${jobId}/skills/${skillId}`),

  // Matches
  getMatches: () =>
    api.get('/matches'),
  
  getMutualMatches: () =>
    api.get('/matches/mutual'),
  
  likeMatch: (matchId: number) =>
    api.post(`/matches/${matchId}/like`),
  
  unlikeMatch: (matchId: number) =>
    api.post(`/matches/${matchId}/unlike`),
  
  askToApply: (matchId: number) =>
    api.post(`/matches/${matchId}/ask-to-apply`),

  // Recommendations
  getJobRecommendations: (jobId: number) =>
    api.get(`/recommendations/job/${jobId}`),
  
  getRecommendationsDashboard: () =>
    api.get('/recommendations/dashboard'),

  // Swipes
  swipeLike: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/like', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  swipePass: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/pass', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  swipeAskToApply: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/ask-to-apply', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  undoSwipe: (jobPostingId: number) =>
    api.delete(`/swipes/undo/${jobPostingId}`),
  
  // Recruiter Swipes
  recruiterLike: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/like', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  recruiterPass: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/pass', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  recruiterAskToApply: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/ask-to-apply', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  recruiterUndoSwipe: (candidateId: number, jobPostingId: number) =>
    api.delete(`/swipes/recruiter/undo/${candidateId}/${jobPostingId}`),
  
  // Applications
  applyToJob: (jobPostingId: number, jobProfileId: number) =>
    api.post('/applications/apply', { job_posting_id: jobPostingId, job_profile_id: jobProfileId }),
  
  getMyApplications: () =>
    api.get('/applications/my-applications'),
  
  updateApplicationStatus: (applicationId: number, status: string) =>
    api.put(`/applications/${applicationId}/status`, { status }),
  
  withdrawApplication: (applicationId: number) =>
    api.delete(`/applications/${applicationId}`),
  
  scheduleInterview: (applicationId: number, payload: {
    date: string;
    time: string;
    timezone: string;
    meeting_provider?: string;  // Optional - "zoom", "google_meet", or "microsoft_teams"
    meeting_link?: string;  // Optional - for manual links
    notes_for_candidate?: string;
    email_subject?: string;
  }) =>
    api.post(`/applications/${applicationId}/schedule-interview`, payload),
  
  // Update application status and/or recruiter notes (recruiter only)
  updateApplicationReview: (applicationId: number, payload: {
    status?: string;
    recruiter_notes?: string;
  }) =>
    api.put(`/applications/${applicationId}/review`, payload),
  
  // Dashboard - Candidate
  getCandidateRecommendations: (jobProfileId: number) =>
    api.get(`/dashboard/candidate/recommendations?job_profile_id=${jobProfileId}`),
  
  getRecruiterInvites: () =>
    api.get('/dashboard/candidate/recruiter-invites'),
  
  getAvailableJobs: () =>
    api.get('/dashboard/candidate/available-jobs'),
  
  getAppliedLikedJobs: () =>
    api.get('/dashboard/candidate/applied-liked-jobs'),
  
  getCandidateMatches: () =>
    api.get('/dashboard/candidate/matches'),
  
  // Dashboard - Recruiter
  getRecruiterRecommendations: (jobPostingId: number) =>
    api.get(`/dashboard/recruiter/recommendations?job_posting_id=${jobPostingId}`),
  
  getRecruiterShortlist: (jobPostingId?: number) =>
    api.get('/dashboard/recruiter/shortlist' + (jobPostingId ? `?job_posting_id=${jobPostingId}` : '')),
  
  getRecruiterApplications: (jobPostingId?: number) =>
    api.get('/dashboard/recruiter/applications' + (jobPostingId ? `?job_posting_id=${jobPostingId}` : '')),
  
  downloadRecruiterApplicationResume: (applicationId: number, resumeId: number) =>
    api.get(`/dashboard/recruiter/applications/${applicationId}/resumes/${resumeId}/download`, {
      responseType: 'blob'
    }),
  
  downloadRecruiterApplicationCertification: (applicationId: number, certificationId: number) =>
    api.get(`/dashboard/recruiter/applications/${applicationId}/certifications/${certificationId}/download`, {
      responseType: 'blob'
    }),
  
  getRecruiterMatches: () =>
    api.get('/dashboard/recruiter/matches'),
  
  // Dashboard - Browse All Candidates
  browseCandidates: (params?: { page?: number; limit?: number; search?: string; work_type?: string; location?: string }) =>
    api.get('/dashboard/recruiter/candidates', { params }),
  
  getCandidateDetail: (candidateId: number) =>
    api.get(`/dashboard/recruiter/candidate/${candidateId}`),

  // Team Management
  getTeamMembers: () =>
    api.get('/dashboard/team-members'),

  // Notifications
  getNotifications: (params?: { unread_only?: boolean; page?: number; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  markNotificationRead: (id: number) =>
    api.post(`/notifications/${id}/read`),
  markAllNotificationsRead: () =>
    api.post('/notifications/read-all'),
  deleteNotification: (id: number) =>
    api.delete(`/notifications/${id}`),

  // Notification Preferences
  getNotificationPreferences: () =>
    api.get('/notification-preferences'),
  getDefaultNotificationPreferences: () =>
    api.get('/notification-preferences/defaults'),
  createOrUpdateNotificationPreference: (preference: {
    event_type: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
    in_app_frequency: string;
    email_frequency: string;
    priority: string;
  }) =>
    api.post('/notification-preferences', preference),
  updateNotificationPreferenceByEvent: (eventType: string, update: {
    in_app_enabled?: boolean;
    email_enabled?: boolean;
    in_app_frequency?: string;
    email_frequency?: string;
    priority?: string;
  }) =>
    api.patch(`/notification-preferences/${eventType}`, update),
  bulkUpdateNotificationPreferences: (preferences: any[]) =>
    api.post('/notification-preferences/bulk', { preferences }),
  deleteNotificationPreference: (id: number) =>
    api.delete(`/notification-preferences/${id}`),

  // Activity Feed (backend source-of-truth audit log)
  getActivityFeed: (params?: {
    category?: 'applications' | 'swipes' | 'notifications' | 'matches' | 'profile' | 'job_posting';
    page?: number;
    limit?: number;
    job_id?: number;
  }) => api.get('/activity-feed', { params }),

  // ── Chat / Messaging ────────────────────────────────────────────────────────
  createConversation: (candidateId: number, jobPostingId: number) =>
    api.post('/chat/conversations', { candidate_id: candidateId, job_posting_id: jobPostingId }),

  getConversations: () =>
    api.get('/chat/conversations'),

  getMessages: (conversationId: number, params?: { limit?: number; before?: number }) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: number, text: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { text }),

  markConversationRead: (conversationId: number) =>
    api.post(`/chat/conversations/${conversationId}/read`),

  getPresence: (userId: number) =>
    api.get(`/presence/${userId}`),

  // ── Direct Messaging (WhatsApp-style) ──────────────────────────────────────
  startConversation: (candidateUserId: number) =>
    api.post('/messages/conversations/start', { candidate_user_id: candidateUserId }),

  getDirectConversations: () =>
    api.get('/messages/conversations'),

  getConversationMessages: (conversationId: number, limit?: number, offset?: number) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { 
      params: { limit, offset } 
    }),

  sendDirectMessage: (conversationId: number, content: string) =>
    api.post(`/messages/conversations/${conversationId}/messages`, { content }),

  markDirectConversationRead: (conversationId: number) =>
    api.post(`/messages/conversations/${conversationId}/read`),

  // ── Meeting Scheduler (Phase 1 - Core Scheduling) ──────────────────────────
  
  // Meeting CRUD
  createMeeting: (data: {
    title: string;
    description?: string;
    meeting_type: 'interview' | 'screening' | 'follow_up' | 'other';
    scheduled_start: string; // ISO datetime
    scheduled_end: string;   // ISO datetime
    duration_minutes: number;
    timezone?: string;
    // Only use participants with name and email (no user IDs needed)
    participants: Array<{ name: string; email: string; is_required?: boolean }>;
    job_posting_id?: number;
    match_id?: number;
    application_id?: number;
    location?: string;
    video_meeting_url?: string;
    video_provider?: string;
  }) =>
    api.post('/meetings/create', data),

  getMeetings: (params?: { 
    status?: 'scheduled' | 'cancelled' | 'completed' | 'no_show';
    upcoming_only?: boolean;
  }) =>
    api.get('/meetings/list', { params }),

  getMeeting: (meetingId: number) =>
    api.get(`/meetings/${meetingId}`),

  updateMeeting: (meetingId: number, data: {
    title?: string;
    description?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    duration_minutes?: number;
    timezone?: string;
    location?: string;
    video_meeting_url?: string;
    participants?: Array<{ name: string; email: string; is_required?: boolean }>;
  }) =>
    api.patch(`/meetings/${meetingId}`, data),

  cancelMeeting: (meetingId: number, cancellation_reason: string) =>
    api.post(`/meetings/${meetingId}/cancel`, { cancellation_reason }),

  rescheduleMeeting: (meetingId: number, data: {
    scheduled_start: string;
    scheduled_end: string;
    timezone?: string;
    reason?: string;
  }) =>
    api.post(`/meetings/${meetingId}/reschedule`, data),

  // Availability Slot Management
  proposeAvailabilitySlots: (slots: Array<{
    proposed_to_user_id: number;
    slot_start: string;
    slot_end: string;
    timezone?: string;
    job_posting_id?: number;
    match_id?: number;
    application_id?: number;
  }>) =>
    api.post('/meetings/availability/propose', slots),

  getMyAvailabilitySlots: (includeSelected?: boolean) =>
    api.get('/meetings/availability/my-slots', { 
      params: { include_selected: includeSelected } 
    }),

  selectAvailabilitySlot: (slotId: number, title: string, description?: string) =>
    api.post('/meetings/availability/select', { 
      slot_id: slotId, 
      title, 
      description 
    }),

  // Scheduling Utilities
  checkAvailability: (userId: number, startTime: string, endTime: string) =>
    api.get('/meetings/check-availability', {
      params: { user_id: userId, start_time: startTime, end_time: endTime }
    }),

  findCommonSlots: (userIds: number[], durationMinutes: number, startRange: string, endRange: string) =>
    api.get('/meetings/find-slots', {
      params: { 
        user_ids: userIds.join(','), 
        duration_minutes: durationMinutes,
        start_range: startRange,
        end_range: endRange
      }
    }),

  // ── Calendar Integration (Phase 2) ──────────────────────────────────────────
  
  // Calendar OAuth
  initiateGoogleCalendarAuth: () =>
    api.get('/calendar/google/authorize'),

  initiateMicrosoftCalendarAuth: () =>
    api.get('/calendar/microsoft/authorize'),

  // Calendar Account Management
  getCalendarAccounts: () =>
    api.get('/calendar/accounts'),

  toggleCalendarSync: (accountId: number, enabled: boolean) =>
    api.post(`/calendar/accounts/${accountId}/sync`, null, { params: { enabled } }),

  setPrimaryCalendar: (accountId: number) =>
    api.post(`/calendar/accounts/${accountId}/primary`),

  disconnectCalendar: (accountId: number) =>
    api.delete(`/calendar/accounts/${accountId}`),

  // Video Provider Account Management
  createVideoProviderAccount: (data: {
    provider: 'zoom' | 'microsoft_teams' | 'google_meet' | 'other';
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    refresh_token?: string;
    auto_generate_links?: boolean;
    waiting_room_enabled?: boolean;
  }) =>
    api.post('/calendar/video-providers', data),

  getVideoProviderAccounts: () =>
    api.get('/calendar/video-providers'),

  updateVideoProviderAccount: (accountId: number, data: {
    api_key?: string;
    api_secret?: string;
    auto_generate_links?: boolean;
    waiting_room_enabled?: boolean;
  }) =>
    api.patch(`/calendar/video-providers/${accountId}`, data),

  deleteVideoProviderAccount: (accountId: number) =>
    api.delete(`/calendar/video-providers/${accountId}`),

  // ── Analytics (Phase 4) ─────────────────────────────────────────────────────
  
  // Get overview metrics
  getAnalyticsOverview: (rangeDays: number = 30) =>
    api.get('/analytics/overview', { params: { range_days: rangeDays } }),

  // Get funnel metrics
  getAnalyticsFunnel: (rangeDays: number = 30, jobId?: number) =>
    api.get('/analytics/funnel', { 
      params: { 
        range_days: rangeDays,
        ...(jobId && { job_id: jobId })
      } 
    }),

  // Get job-specific analytics
  getJobAnalytics: (jobId: number, rangeDays: number = 90) =>
    api.get(`/analytics/job/${jobId}`, { params: { range_days: rangeDays } }),

  // Track analytics event
  trackAnalyticsEvent: (data: {
    event_type: 'view' | 'like' | 'apply' | 'interview_scheduled' | 'interview_completed' | 'offer_made' | 'hire';
    job_posting_id?: number;
    candidate_user_id?: number;
    company_id?: number;
    metadata?: Record<string, any>;
  }) =>
    api.post('/analytics/events', data),
};

export default api;
