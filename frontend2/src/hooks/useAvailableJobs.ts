import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { AvailableJob } from '../types/availableJob';

export function useAvailableJobs() {
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);

  const fetchAvailableJobs = useCallback(async () => {
    try {
      const response = await apiClient.getAvailableJobs();
      setAvailableJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch available jobs:', error);
    }
  }, []);

  return { availableJobs, setAvailableJobs, fetchAvailableJobs };
}
