import { apiClient } from './client';

export const applicationsClient = {
  getMyApplications: () => apiClient.getMyApplications(),
  getRecruiterApplications: (jobPostingId?: number) =>
    apiClient.getRecruiterApplications(jobPostingId),
  updateApplicationStatus: (applicationId: number, status: string) =>
    apiClient.updateApplicationStatus(applicationId, status),
  updateApplicationReview: (
    applicationId: number,
    payload: { status?: string; recruiter_notes?: string }
  ) => apiClient.updateApplicationReview(applicationId, payload),
  downloadRecruiterApplicationResume: (applicationId: number, resumeId: number) =>
    apiClient.downloadRecruiterApplicationResume(applicationId, resumeId),
  downloadRecruiterApplicationCertification: (applicationId: number, certificationId: number) =>
    apiClient.downloadRecruiterApplicationCertification(applicationId, certificationId),
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
  ) => apiClient.scheduleInterview(applicationId, payload),
};
