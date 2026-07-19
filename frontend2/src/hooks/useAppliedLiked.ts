import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { AppliedLikedJobs } from '../types/appliedLiked';

const EMPTY: AppliedLikedJobs = { applied_jobs: [], liked_jobs: [] };

export function useAppliedLiked() {
  const [appliedLiked, setAppliedLiked] = useState<AppliedLikedJobs>(EMPTY);

  const fetchAppliedLiked = useCallback(async () => {
    try {
      const response = await apiClient.getAppliedLikedJobs();
      setAppliedLiked(response.data);
    } catch (error) {
      console.error('Failed to fetch applied/liked jobs:', error);
    }
  }, []);

  return { appliedLiked, fetchAppliedLiked };
}
