import { useCallback, useEffect, useState } from 'react';

import { applicationsClient } from '../api/applicationsClient';
import type { Application } from '../types/application';

/**
 * Recruiter-side applications: fetch (with 60s auto-refresh), status updates,
 * notes, and resume/certification downloads. Extracted from RecruiterDashboardNew.
 */
export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try {
      const response = await applicationsClient.getRecruiterApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    const interval = setInterval(() => {
      fetchApplications();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchApplications]);

  const updateApplicationStatus = useCallback(async (applicationId: number, status: string) => {
    try {
      await applicationsClient.updateApplicationStatus(applicationId, status);
      alert(`Application status updated to ${status}`);
      await fetchApplications();
    } catch (error) {
      console.error('[API ERROR] Failed to update application status:', error);
      alert('Failed to update application status');
    }
  }, [fetchApplications]);

  const saveApplicationNotes = useCallback(async (applicationId: number, notes: string) => {
    try {
      await applicationsClient.updateApplicationReview(applicationId, {
        recruiter_notes: notes.trim() || undefined,
      });
      alert('Notes saved successfully');
      await fetchApplications();
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to save notes';
      alert(errorMsg);
      throw error;
    }
  }, [fetchApplications]);

  const downloadResume = useCallback(async (applicationId: number, resumeId: number, filename: string) => {
    try {
      const response = await applicationsClient.downloadRecruiterApplicationResume(applicationId, resumeId);
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
  }, []);

  const downloadCertification = useCallback(async (applicationId: number, certificationId: number, filename: string) => {
    try {
      const response = await applicationsClient.downloadRecruiterApplicationCertification(applicationId, certificationId);
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
  }, []);

  return {
    applications,
    applicationsLoading,
    fetchApplications,
    updateApplicationStatus,
    saveApplicationNotes,
    downloadResume,
    downloadCertification,
  };
}
