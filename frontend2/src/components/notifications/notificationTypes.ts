export type EventType = 'match' | 'invite' | 'application' | 'status_update' | 'shortlisted';

export interface NotificationPayload {
  route: string;
  route_context?: Record<string, unknown>;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  event_type: EventType;
  read: boolean;
  timestamp: string; // ISO string with "Z"
  payload?: NotificationPayload;
}

export interface GroupedNotifications {
  label: string; // "Today", "Yesterday", "Earlier"
  items: Notification[];
}
