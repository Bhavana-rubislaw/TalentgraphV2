import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../api/client';
import type { CandidateRecommendation } from '../types/recommendation';

/**
 * Candidate-side job recommendations for a given job profile. Refetches
 * automatically whenever profileId changes. Extracted from CandidateDashboardNew.
 */
export function useCandidateRecommendations(profileId: number | null) {
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const response = await apiClient.getCandidateRecommendations(profileId);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (profileId) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  return { recommendations, setRecommendations, loading, fetchRecommendations };
}
