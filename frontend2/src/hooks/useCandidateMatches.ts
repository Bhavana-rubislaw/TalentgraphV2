import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { CandidateMatch } from '../types/match';

export function useCandidateMatches() {
  const [matches, setMatches] = useState<CandidateMatch[]>([]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await apiClient.getCandidateMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  }, []);

  return { matches, setMatches, fetchMatches };
}
