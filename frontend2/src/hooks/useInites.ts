import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { RecruiterInvite } from '../types/invite';

export function useInvites() {
  const [invites, setInvites] = useState<RecruiterInvite[]>([]);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await apiClient.getRecruiterInvites();
      setInvites(response.data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  }, []);

  return { invites, setInvites, fetchInvites };
}
