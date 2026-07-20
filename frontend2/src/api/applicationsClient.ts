import { http } from './httpClient';

export const applicationsClient = {
  applyToJob: (jobPostingId: number, jobProfileId: number) =>
    http.post('/applications/apply', { job_posting_id: jobPostingId, job_profile_id: jobProfileId }),

  getMyApplications: () =>
    http.get('/applications/my-applications'),

  updateApplicationStatus: (applicationId: number, status: string) =>
    http.put(`/applications/${applicationId}/status`, { status }),

  withdrawApplication: (applicationId: number) =>
    http.delete(`/applications/${applicationId}`),

  scheduleInterview: (
    applicationId: number,
    payload: {
      date: string;
      start_time?: string;
      end_time?: string;
      time?: string;
      timezone: string;
      meeting_provider?: string;
      meeting_link?: string;
      notes_for_candidate?: string;
      email_subject?: string;
    }
  ) =>
    http.post(`/applications/${applicationId}/schedule-interview`, payload),

  // Update application status and/or recruiter notes (recruiter only)
  updateApplicationReview: (
    applicationId: number,
    payload: { status?: string; recruiter_notes?: string }
  ) =>
    http.put(`/applications/${applicationId}/review`, payload),

  // Recruiter-facing application list (dashboard router)
  getRecruiterApplications: (jobPostingId?: number) =>
    http.get('/dashboard/recruiter/applications' + (jobPostingId ? `?job_posting_id=${jobPostingId}` : '')),

  downloadRecruiterApplicationResume: (applicationId: number, resumeId: number) =>
    http.get(`/dashboard/recruiter/applications/${applicationId}/resumes/${resumeId}/download`, {
      responseType: 'blob'
    }),

  downloadRecruiterApplicationCertification: (applicationId: number, certificationId: number) =>
    http.get(`/dashboard/recruiter/applications/${applicationId}/certifications/${certificationId}/download`, {
      responseType: 'blob'
    }),
};
