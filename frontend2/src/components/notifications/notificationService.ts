import { apiClient } from '../../api/client';
import type { Notification } from './notificationTypes';

export const notificationService = {
  async fetchNotifications(unreadOnly = false, page = 1, limit = 30): Promise<Notification[]> {
    const res = await apiClient.getNotifications({ unread_only: unreadOnly, page, limit });
    return res.data;
  },

  async fetchUnreadCount(): Promise<number> {
    const res = await apiClient.getUnreadCount();
    return res.data.count ?? 0;
  },

  async markRead(id: number): Promise<void> {
    await apiClient.markNotificationRead(id);
  },

  async markAllRead(): Promise<void> {
    await apiClient.markAllNotificationsRead();
  },

  async remove(id: number): Promise<void> {
    await apiClient.deleteNotification(id);
  },
};
