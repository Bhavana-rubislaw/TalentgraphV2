import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import { parseIntParam } from './useQueryState';
import type { JobPosting } from '../types/jobPosting';

export function useJobPostings(
  getParam: (name: string, defaultValue?: string) => string,
  setSelectedJobId: (id: number) => void
) {
  const [allJobPostings, setAllJobPostings] = useState<JobPosting[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);

  const fetchJobPostings = useCallback(async () => {
    try {
      const response = await apiClient.getJobPostings();
      setAllJobPostings(response.data);

      const activeJobs = response.data.filter((job: JobPosting) => {
        const status = (job.status || '').toLowerCase();
        return status === 'active' || status === 'reposted';
      });
      setJobPostings(activeJobs);

      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((j: JobPosting) => j.id);
      const parsedId = parseIntParam(getParam('job'));
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedJobId(parsedId);
      } else if (activeJobs.length > 0) {
        setSelectedJobId(activeJobs[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job postings:', error);
    }
  }, [getParam, setSelectedJobId]);

  return { allJobPostings, jobPostings, fetchJobPostings };
}
