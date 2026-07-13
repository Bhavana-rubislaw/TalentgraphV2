import { useCallback, useState } from 'react';

import { meetingsClient, type MeetingsQuery } from '../api/meetingsClient';
import type { Meeting, MeetingAvailabilitySlot } from '../types/meeting';

export function useMeetingsData() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<MeetingAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeetings = useCallback(async (params: MeetingsQuery) => {
    try {
      setLoading(true);
      const response = await meetingsClient.getMeetings(params);
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailabilitySlots = useCallback(async () => {
    try {
      const response = await meetingsClient.getMyAvailabilitySlots(false);
      setAvailabilitySlots(response.data);
    } catch (error) {
      console.error('Failed to load availability slots:', error);
    }
  }, []);

  const selectAvailabilitySlot = useCallback(
    async (slotId: number, title: string, refreshParams: MeetingsQuery) => {
      try {
        await meetingsClient.selectAvailabilitySlot(slotId, title);
        await Promise.all([loadMeetings(refreshParams), loadAvailabilitySlots()]);
      } catch (error) {
        console.error('Failed to select slot:', error);
        throw error;
      }
    },
    [loadAvailabilitySlots, loadMeetings]
  );

  return {
    meetings,
    availabilitySlots,
    loading,
    loadMeetings,
    loadAvailabilitySlots,
    selectAvailabilitySlot,
  };
}
