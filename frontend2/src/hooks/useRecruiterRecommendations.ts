import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export function useRecruiterRecommendations(selectedJobId: number | null) {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [jobAnalytics, setJobAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const response = await apiClient.getRecruiterRecommendations(selectedJobId);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  const fetchJobAnalytics = useCallback(async () => {
    if (!selectedJobId) return;
    setAnalyticsLoading(true);
    try {
      const response = await apiClient.getJobAnalytics(selectedJobId, 90);
      setJobAnalytics(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job analytics:', error);
      setJobAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchRecommendations();
      fetchJobAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId]);

  return {
    recommendations,
    setRecommendations,
    loading,
    jobAnalytics,
    analyticsLoading,
    fetchRecommendations,
    fetchJobAnalytics,
  };
}
