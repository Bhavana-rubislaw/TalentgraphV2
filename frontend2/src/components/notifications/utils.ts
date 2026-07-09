import type { Notification, GroupedNotifications } from './notificationTypes';

export function getRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return getExactTime(isoTimestamp, { dateOnly: true });
}

export function getExactTime(isoTimestamp: string, opts?: { dateOnly?: boolean }): string {
  const d = new Date(isoTimestamp);
  if (opts?.dateOnly) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function groupNotificationsByDate(notifications: Notification[]): GroupedNotifications[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of notifications) {
    const t = new Date(n.timestamp).getTime();
    if (t >= today) {
      groups['Today'].push(n);
    } else if (t >= yesterday) {
      groups['Yesterday'].push(n);
    } else {
      groups['Earlier'].push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
