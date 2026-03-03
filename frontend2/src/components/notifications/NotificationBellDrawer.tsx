import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from './notificationService';
import { getRelativeTime, getExactTime, groupNotificationsByDate } from './utils';
import type { Notification } from './notificationTypes';

interface Props {
  role: 'candidate' | 'recruiter';
}

const POLL_INTERVAL_MS = 25_000;

export default function NotificationBellDrawer({ role }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  const pollCount = useCallback(async () => {
    try {
      const count = await notificationService.fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently skip on auth failure
    }
  }, []);

  useEffect(() => {
    pollCount();
    const interval = setInterval(pollCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollCount]);

  // Load notifications when drawer opens
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.fetchNotifications(
        filter === 'unread',
        1,
        50
      );
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    await notificationService.markRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleDelete = async (id: number, wasUnread: boolean) => {
    await notificationService.remove(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClickNotification = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.payload?.route) {
      window.location.href = n.payload.route;
    }
    setIsOpen(false);
  };

  const visibleNotifications =
    filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const groups = groupNotificationsByDate(visibleNotifications);

  const emptyCta =
    role === 'candidate'
      ? 'Like a job or get shortlisted to see updates here.'
      : 'When candidates apply or you get matches, you\'ll see them here.';

  return (
    <div className="notif-bell-wrapper" ref={drawerRef}>
      {/* Bell button */}
      <button
        className="icon-btn notification-btn"
        title="Notifications"
        onClick={() => setIsOpen(o => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="notif-drawer">
          {/* Header */}
          <div className="notif-drawer-header">
            <span className="notif-drawer-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="notif-filter-tabs">
            <button
              className={`notif-tab${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`notif-tab${filter === 'unread' ? ' active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread {unreadCount > 0 && <span className="notif-tab-count">{unreadCount}</span>}
            </button>
          </div>

          {/* List */}
          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">
                <span>Loading…</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="notif-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0b8d4" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="notif-empty-main">No notifications yet</p>
                <p className="notif-empty-sub">{emptyCta}</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.label} className="notif-group">
                  <div className="notif-group-label">{group.label}</div>
                  {group.items.map(n => (
                    <div
                      key={n.id}
                      className={`notif-row${n.read ? '' : ' unread'}`}
                      onClick={() => handleClickNotification(n)}
                    >
                      {!n.read && <span className="notif-unread-dot" />}
                      <div className="notif-row-body">
                        <div className="notif-row-title">{n.title}</div>
                        <div className="notif-row-msg">{n.message}</div>
                        <div
                          className="notif-row-time"
                          title={getExactTime(n.timestamp)}
                        >
                          {getRelativeTime(n.timestamp)}
                        </div>
                      </div>
                      <div className="notif-row-actions" onClick={e => e.stopPropagation()}>
                        {!n.read && (
                          <button
                            className="notif-action-btn"
                            title="Mark as read"
                            onClick={() => handleMarkRead(n.id)}
                          >
                            ✓
                          </button>
                        )}
                        <button
                          className="notif-action-btn delete"
                          title="Delete"
                          onClick={() => handleDelete(n.id, !n.read)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
