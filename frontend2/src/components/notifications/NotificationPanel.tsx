import React, { useState, useEffect, useCallback } from 'react';
import { notificationService } from './notificationService';
import { getRelativeTime } from './utils';
import type { Notification } from './notificationTypes';
import '../../styles/NotificationPanel.css';

interface Props {
  role: 'candidate' | 'recruiter';
}

type FilterTab = 'all' | 'applications' | 'messages' | 'system';

const NotificationPanel: React.FC<Props> = ({ role }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.fetchNotifications(false, 1, 50);
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await notificationService.remove(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  // Filter notifications by type
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'applications') return n.event_type === 'application' || n.event_type === 'status_update';
    if (filter === 'messages') return n.event_type === 'message';
    if (filter === 'system') return n.event_type === 'match' || n.event_type === 'invite';
    return true;
  });

  // Group by date
  const groupedNotifications = groupByDate(filteredNotifications);

  const getNotificationIcon = (eventType: string) => {
    switch (eventType) {
      case 'application':
        return (
          <div className="notif-icon notif-icon-application">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          </div>
        );
      case 'match':
        return (
          <div className="notif-icon notif-icon-match">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case 'message':
        return (
          <div className="notif-icon notif-icon-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        );
      case 'invite':
        return (
          <div className="notif-icon notif-icon-invite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        );
      case 'status_update':
        return (
          <div className="notif-icon notif-icon-status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="notif-icon notif-icon-default">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        );
    }
  };

  const getFilterCount = (filterType: FilterTab) => {
    if (filterType === 'all') return unreadCount;
    const filtered = notifications.filter(n => {
      if (!n.read) {
        if (filterType === 'applications') return n.event_type === 'application' || n.event_type === 'status_update';
        if (filterType === 'messages') return n.event_type === 'message';
        if (filterType === 'system') return n.event_type === 'match' || n.event_type === 'invite';
      }
      return false;
    });
    return filtered.length;
  };

  return (
    <div className="notification-panel">
      {/* Header */}
      <div className="notif-panel-header">
        <div className="notif-panel-title-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <h3 className="notif-panel-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="notif-new-badge">{unreadCount} new</span>
          )}
        </div>
        <div className="notif-panel-actions">
          <button 
            className="notif-mark-all-read"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            title="Mark all read"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark all read
          </button>
          <button className="notif-settings-btn" title="Notification settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-panel-tabs">
        <button
          className={`notif-tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`notif-tab-btn ${filter === 'applications' ? 'active' : ''}`}
          onClick={() => setFilter('applications')}
        >
          Applications
          {getFilterCount('applications') > 0 && (
            <span className="tab-dot"></span>
          )}
        </button>
        <button
          className={`notif-tab-btn ${filter === 'messages' ? 'active' : ''}`}
          onClick={() => setFilter('messages')}
        >
          Messages
        </button>
        <button
          className={`notif-tab-btn ${filter === 'system' ? 'active' : ''}`}
          onClick={() => setFilter('system')}
        >
          System
        </button>
      </div>

      {/* Notifications List */}
      <div className="notif-panel-content">
        {loading ? (
          <div className="notif-loading">
            <div className="notif-loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e0" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="notif-empty-title">No notifications</p>
            <p className="notif-empty-subtitle">
              {filter === 'all' 
                ? "You're all caught up!"
                : `No ${filter} notifications yet`}
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="notif-group">
                <div className="notif-date-label">{date}</div>
                {items.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item ${notif.read ? '' : 'unread'}`}
                  >
                    {!notif.read && <span className="notif-unread-indicator"></span>}
                    
                    {getNotificationIcon(notif.event_type)}
                    
                    <div className="notif-content">
                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-message">{notif.message}</div>
                      
                      {notif.event_type === 'application' && !notif.read && (
                        <div className="notif-actions">
                          <button className="notif-action-btn notif-btn-review">
                            Review
                          </button>
                          <button 
                            className="notif-action-btn notif-btn-dismiss"
                            onClick={() => handleDismiss(notif.id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      
                      {notif.event_type === 'match' && (
                        <div className="notif-badge-row">
                          <span className="notif-ai-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            AI Insight
                          </span>
                        </div>
                      )}
                      
                      {notif.event_type === 'invite' && (
                        <div className="notif-meeting-info">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 2h4" />
                            <path d="M12 14v4" />
                            <path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6" />
                            <path d="M9 17H4v5" />
                          </svg>
                          Google Meet · 45 min
                        </div>
                      )}
                    </div>
                    
                    <div className="notif-time">{getRelativeTime(notif.timestamp)}</div>
                    
                    {notif.event_type === 'message' && (
                      <button className="notif-reply-btn" title="Reply">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 10 4 15 9 20" />
                          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                        </svg>
                        Reply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="notif-panel-footer">
          <button className="notif-view-all-btn">
            View all notifications
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to group notifications by date
function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const groups: Record<string, Notification[]> = {
    'TODAY': [],
    'YESTERDAY': []
  };
  
  notifications.forEach(notif => {
    const notifDate = new Date(notif.timestamp);
    const isToday = notifDate.toDateString() === today.toDateString();
    const isYesterday = notifDate.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      groups['TODAY'].push(notif);
    } else if (isYesterday) {
      groups['YESTERDAY'].push(notif);
    }
  });
  
  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

export default NotificationPanel;
