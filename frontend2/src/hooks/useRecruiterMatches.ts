import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { RecruiterMatch } from '../types/match';

export function useRecruiterMatches() {
  const [matches, setMatches] = useState<RecruiterMatch[]>([]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await apiClient.getRecruiterMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  }, []);

  return { matches, fetchMatches };
}
