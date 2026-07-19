import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { BrowseCandidate } from '../types/browseCandidate';

export interface BrowseCandidatesParams {
  page: number;
  limit: number;
  search?: string;
  work_type?: string;
  location?: string;
}

export function useBrowseCandidates() {
  const [browseCandidates, setBrowseCandidates] = useState<BrowseCandidate[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);

  const fetchBrowseCandidates = useCallback(async (params: BrowseCandidatesParams) => {
    setBrowseLoading(true);
    try {
      const response = await apiClient.browseCandidates(params);
      setBrowseCandidates(response.data.items || []);
      setBrowseTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch browse candidates:', error);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  return { browseCandidates, setBrowseCandidates, browseTotal, browseLoading, fetchBrowseCandidates };
}
