import { http } from './httpClient';

export type MeetingsQuery = {
  status?: 'scheduled' | 'cancelled' | 'completed' | 'no_show';
  upcoming_only?: boolean;
};

export const meetingsClient = {
  createMeeting: (data: {
    title: string;
    description?: string;
    meeting_type: 'interview' | 'screening' | 'follow_up' | 'other';
    scheduled_start: string; // ISO datetime
    scheduled_end: string;   // ISO datetime
    duration_minutes: number;
    timezone?: string;
    // Only use participants with name and email (no user IDs needed)
    participants: Array<{ name: string; email: string; is_required?: boolean }>;
    job_posting_id?: number;
    match_id?: number;
    application_id?: number;
    location?: string;
    video_meeting_url?: string;
    video_provider?: string;
  }) =>
    http.post('/meetings/create', data),

  getMeetings: (params?: MeetingsQuery) =>
    http.get('/meetings/list', { params }),

  getMeeting: (meetingId: number) =>
    http.get(`/meetings/${meetingId}`),

  updateMeeting: (meetingId: number, data: {
    title?: string;
    description?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    duration_minutes?: number;
    timezone?: string;
    location?: string;
    video_meeting_url?: string;
    participants?: Array<{ name: string; email: string; is_required?: boolean }>;
  }) =>
    http.patch(`/meetings/${meetingId}`, data),

  cancelMeeting: (meetingId: number, cancellation_reason: string) =>
    http.post(`/meetings/${meetingId}/cancel`, { cancellation_reason }),

  markMeetingComplete: (meetingId: number, notes?: string) =>
    http.post(`/meetings/${meetingId}/complete`, { notes: notes ?? null }),

  markMeetingNoShow: (meetingId: number, notes?: string) =>
    http.post(`/meetings/${meetingId}/no-show`, { notes: notes ?? null }),

  rescheduleMeeting: (meetingId: number, data: {
    scheduled_start: string;
    scheduled_end: string;
    timezone?: string;
    reason?: string;
  }) =>
    http.post(`/meetings/${meetingId}/reschedule`, data),

  // Availability Slot Management
  proposeAvailabilitySlots: (slots: Array<{
    proposed_to_user_id: number;
    slot_start: string;
    slot_end: string;
    timezone?: string;
    job_posting_id?: number;
    match_id?: number;
    application_id?: number;
  }>) =>
    http.post('/meetings/availability/propose', slots),

  getMyAvailabilitySlots: (includeSelected = false) =>
    http.get('/meetings/availability/my-slots', {
      params: { include_selected: includeSelected }
    }),

  selectAvailabilitySlot: (slotId: number, title: string, description?: string) =>
    http.post('/meetings/availability/select', {
      slot_id: slotId,
      title,
      description
    }),
};
