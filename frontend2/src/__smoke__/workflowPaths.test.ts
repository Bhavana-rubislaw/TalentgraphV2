import { describe, expect, it, vi } from 'vitest';

import { applicationsClient } from '../api/applicationsClient';
import { meetingsClient } from '../api/meetingsClient';
import { notificationsClient } from '../api/notificationsClient';

vi.mock('../api/client', () => ({
  apiClient: {
    getMeetings: vi.fn(() => Promise.resolve({ data: [] })),
    getMyAvailabilitySlots: vi.fn(() => Promise.resolve({ data: [] })),
    selectAvailabilitySlot: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    getMyApplications: vi.fn(() => Promise.resolve({ data: [] })),
    updateApplicationStatus: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    updateApplicationReview: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    scheduleInterview: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    getNotifications: vi.fn(() => Promise.resolve({ data: [] })),
    getUnreadCount: vi.fn(() => Promise.resolve({ data: { unread_count: 0 } })),
    markNotificationRead: vi.fn(() => Promise.resolve({ data: { ok: true } })),
  },
}));

import { apiClient } from '../api/client';

describe('workflow smoke clients', () => {
  it('covers candidate and recruiter meetings/application notification paths', async () => {
    await meetingsClient.getMeetings({ upcoming_only: true });
    await meetingsClient.getMyAvailabilitySlots(false);
    await meetingsClient.selectAvailabilitySlot(1, 'Interview Meeting');

    await applicationsClient.getMyApplications();
    await applicationsClient.updateApplicationStatus(123, 'scheduled');
    await applicationsClient.updateApplicationReview(123, { status: 'under_review' });
    await applicationsClient.scheduleInterview(123, {
      date: '2026-07-15',
      start_time: '10:00',
      end_time: '10:30',
      timezone: 'UTC',
    });

    await notificationsClient.getNotifications({ unread_only: true });
    await notificationsClient.getUnreadCount();
    await notificationsClient.markNotificationRead(22);

    expect(apiClient.getMeetings).toHaveBeenCalled();
    expect(apiClient.scheduleInterview).toHaveBeenCalled();
    expect(apiClient.getNotifications).toHaveBeenCalled();
  });
});
