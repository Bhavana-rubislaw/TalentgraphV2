import { apiClient } from './client';

export type MeetingsQuery = {
  status?: string;
  upcoming_only?: boolean;
};

export const meetingsClient = {
  getMeetings: (params: MeetingsQuery) => apiClient.getMeetings(params),
  getMyAvailabilitySlots: (includeSelected = false) => apiClient.getMyAvailabilitySlots(includeSelected),
  selectAvailabilitySlot: (slotId: number, title: string) => apiClient.selectAvailabilitySlot(slotId, title),
};
