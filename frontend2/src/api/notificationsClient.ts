import { http } from './httpClient';

export const notificationsClient = {
  getNotifications: (params?: { unread_only?: boolean; page?: number; limit?: number }) =>
    http.get('/notifications', { params }),

  getUnreadCount: () =>
    http.get('/notifications/unread-count'),

  markNotificationRead: (id: number) =>
    http.post(`/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    http.post('/notifications/read-all'),

  deleteNotification: (id: number) =>
    http.delete(`/notifications/${id}`),
};
