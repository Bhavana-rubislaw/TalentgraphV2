import { apiClient } from './client';

export const notificationsClient = {
  getNotifications: (params?: { unread_only?: boolean; page?: number; limit?: number }) =>
    apiClient.getNotifications(params),
  getUnreadCount: () => apiClient.getUnreadCount(),
  markNotificationRead: (id: number) => apiClient.markNotificationRead(id),
};
