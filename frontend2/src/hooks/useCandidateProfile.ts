import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import type { CandidateProfile } from '../types/candidateProfile';

export function useCandidateProfile() {
  const [userProfile, setUserProfile] = useState<CandidateProfile | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await apiClient.getCandidateProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }, []);

  return { userProfile, fetchUserProfile };
}
