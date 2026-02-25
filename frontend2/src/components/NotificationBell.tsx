import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import '../styles/NotificationBell.css';

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  job_posting_id?: number;
  job_title?: string;
  candidate_id?: number;
  candidate_name?: string;
  job_profile_id?: number;
  job_profile_name?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  onNavigate?: (type: string, notification: Notification) => void;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

const TYPE_ICONS: Record<string, string> = {
  recruiter_liked: '❤️',
  recruiter_invite: '✉️',
  new_match: '🤝',
  job_preference_added: '📋',
  application_submitted: '✅',
  job_posting_created: '📢',
  new_application: '📥',
  candidate_shortlisted: '⭐',
};

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.getUnreadCount();
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getNotifications();
      setNotifications(res.data || []);
      setUnreadCount((res.data || []).filter((n: Notification) => !n.is_read).length);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (!open) {
      fetchNotifications();
    }
    setOpen(prev => !prev);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await apiClient.markNotificationRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    if (onNavigate) {
      onNavigate(notification.notification_type, notification);
    }
    setOpen(false);
  };

  return (
    <div className="nb-container">
      <button
        ref={bellRef}
        className={`nb-bell-btn icon-btn${unreadCount > 0 ? ' nb-has-unread' : ''}`}
        title="Notifications"
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="nb-panel" role="dialog" aria-label="Notifications panel">
          <div className="nb-panel-header">
            <span className="nb-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="nb-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="nb-panel-body">
            {loading ? (
              <div className="nb-empty">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">No notifications yet</div>
            ) : (
              <ul className="nb-list">
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={`nb-item${n.is_read ? '' : ' nb-item-unread'}`}
                    onClick={() => handleItemClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleItemClick(n)}
                  >
                    {!n.is_read && <span className="nb-unread-dot" aria-hidden="true" />}
                    <span className="nb-item-icon" aria-hidden="true">
                      {TYPE_ICONS[n.notification_type] || '🔔'}
                    </span>
                    <div className="nb-item-content">
                      <p className="nb-item-title">{n.title}</p>
                      <p className="nb-item-message">{n.message}</p>
                      {(n.job_title || n.candidate_name || n.job_profile_name) && (
                        <p className="nb-item-meta">
                          {[n.job_title, n.candidate_name, n.job_profile_name]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      <span
                        className="nb-item-time"
                        title={new Date(n.created_at).toLocaleString()}
                      >
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
