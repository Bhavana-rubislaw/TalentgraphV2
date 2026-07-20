import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/httpClient', () => ({
  API_BASE: 'http://localhost:8001',
  http: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    put: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    patch: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { ok: true } })),
  },
}));

import { http } from '../api/httpClient';
import { applicationsClient } from '../api/applicationsClient';
import { meetingsClient } from '../api/meetingsClient';
import { notificationsClient } from '../api/notificationsClient';
import { apiClient } from '../api/client';

describe('workflow smoke clients', () => {
  it('covers candidate and recruiter meetings/application/notification paths', async () => {
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

    // Domain clients call the shared http client directly (real implementation,
    // not a pass-through to apiClient).
    expect(http.get).toHaveBeenCalledWith('/meetings/list', { params: { upcoming_only: true } });
    expect(http.get).toHaveBeenCalledWith('/meetings/availability/my-slots', { params: { include_selected: false } });
    expect(http.post).toHaveBeenCalledWith('/meetings/availability/select', {
      slot_id: 1,
      title: 'Interview Meeting',
      description: undefined,
    });

    expect(http.get).toHaveBeenCalledWith('/applications/my-applications');
    expect(http.put).toHaveBeenCalledWith('/applications/123/status', { status: 'scheduled' });
    expect(http.put).toHaveBeenCalledWith('/applications/123/review', { status: 'under_review' });
    expect(http.post).toHaveBeenCalledWith('/applications/123/schedule-interview', {
      date: '2026-07-15',
      start_time: '10:00',
      end_time: '10:30',
      timezone: 'UTC',
    });

    expect(http.get).toHaveBeenCalledWith('/notifications', { params: { unread_only: true } });
    expect(http.get).toHaveBeenCalledWith('/notifications/unread-count');
    expect(http.post).toHaveBeenCalledWith('/notifications/22/read');

    // apiClient still exposes the same methods (unchanged call sites elsewhere
    // in the app), now delegating to the domain clients above rather than
    // owning its own duplicate implementation.
    expect(apiClient.getMeetings).toBe(meetingsClient.getMeetings);
    expect(apiClient.scheduleInterview).toBe(applicationsClient.scheduleInterview);
    expect(apiClient.getNotifications).toBe(notificationsClient.getNotifications);
  });
});
