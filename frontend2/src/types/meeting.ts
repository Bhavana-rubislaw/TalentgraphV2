/**
 * TypeScript types for Meeting & Scheduling Domain
 * Matches backend models and schemas
 */

export type MeetingStatus = 'scheduled' | 'cancelled' | 'completed' | 'no_show';

export type MeetingType = 'interview' | 'screening' | 'follow_up' | 'other';

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: number;
  is_required: boolean;
  has_confirmed: boolean;
  confirmed_at?: string;
  attended?: boolean;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
  created_at: string;
  updated_at: string;
  // New fields for display
  participant_name?: string;
  participant_email?: string;
}

export interface Meeting {
  id: number;
  title: string;
  description?: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  scheduled_start: string; // ISO datetime
  scheduled_end: string;   // ISO datetime
  duration_minutes: number;
  timezone: string;
  organizer_user_id: number;
  job_posting_id?: number;
  match_id?: number;
  application_id?: number;
  location?: string;
  video_meeting_url?: string;
  video_provider?: string;
  google_calendar_event_id?: string;
  microsoft_calendar_event_id?: string;
  cancelled_at?: string;
  cancelled_by_user_id?: number;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  participants: MeetingParticipant[];
}

export interface MeetingAvailabilitySlot {
  id: number;
  proposed_by_user_id: number;
  proposed_to_user_id: number;
  slot_start: string;
  slot_end: string;
  timezone: string;
  job_posting_id?: number;
  match_id?: number;
  application_id?: number;
  is_selected: boolean;
  selected_at?: string;
  meeting_id?: number;
  created_at: string;
  expired_at?: string;
}

export interface ParticipantSpec {
  name: string;
  email: string;
  is_required?: boolean;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  meeting_type: MeetingType;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone?: string;
  // Only use participants with name and email (no more user IDs)
  participants: ParticipantSpec[];
  job_posting_id?: number;
  match_id?: number;
  application_id?: number;
  location?: string;
  video_meeting_url?: string;
  video_provider?: string;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes?: number;
  timezone?: string;
  location?: string;
  video_meeting_url?: string;
  participants?: ParticipantSpec[];  // Allow updating participants
}

export interface ProposeAvailabilitySlotRequest {
  proposed_to_user_id: number;
  slot_start: string;
  slot_end: string;
  timezone?: string;
  job_posting_id?: number;
  match_id?: number;
  application_id?: number;
}

export interface SelectSlotRequest {
  slot_id: number;
  title: string;
  description?: string;
}

// Calendar Provider types (Phase 2)
export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarAccount {
  id: number;
  user_id: number;
  provider: CalendarProvider;
  provider_account_id: string;
  provider_email: string;
  is_primary: boolean;
  sync_enabled: boolean;
  last_synced_at?: string;
  calendar_name?: string;
  calendar_timezone: string;
  connected_at: string;
  updated_at: string;
}

// Video Provider types (Phase 2)
export type VideoProvider = 'zoom' | 'microsoft_teams' | 'google_meet' | 'other';

export interface VideoProviderAccount {
  id: number;
  user_id: number;
  provider: VideoProvider;
  provider_account_id?: string;
  provider_email?: string;
  is_primary: boolean;
  auto_generate_links: boolean;
  default_meeting_password?: string;
  waiting_room_enabled: boolean;
  connected_at: string;
  updated_at: string;
}
