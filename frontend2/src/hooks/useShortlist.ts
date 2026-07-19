import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { ShortlistItem } from '../types/shortlist';

export function useShortlist() {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);

  const fetchShortlist = useCallback(async () => {
    try {
      const response = await apiClient.getRecruiterShortlist();
      setShortlist(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch shortlist:', error);
    }
  }, []);

  return { shortlist, setShortlist, fetchShortlist };
}
