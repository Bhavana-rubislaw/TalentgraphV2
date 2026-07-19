import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import { parseIntParam } from './useQueryState';
import type { JobProfile } from '../types/candidateProfile';

export function useJobProfiles(
  getParam: (name: string, defaultValue?: string) => string,
  setSelectedProfileId: (id: number) => void
) {
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);

  const fetchJobProfiles = useCallback(async () => {
    try {
      const response = await apiClient.getJobProfiles();
      setJobProfiles(response.data);
      if (response.data.length === 0) return;
      const validIds: number[] = response.data.map((p: JobProfile) => p.id);
      // Honour ?profile= URL param; validate it exists, else fall back to first
      const parsedId = parseIntParam(getParam('profile'));
      if (parsedId && validIds.includes(parsedId)) {
        setSelectedProfileId(parsedId);
      } else {
        setSelectedProfileId(response.data[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job profiles:', error);
    }
  }, [getParam, setSelectedProfileId]);

  return { jobProfiles, fetchJobProfiles };
}
