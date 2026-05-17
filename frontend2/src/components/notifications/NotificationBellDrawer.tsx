import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from './notificationService';
import { getRelativeTime } from './utils';
import type { Notification } from './notificationTypes';
import '../../styles/NotificationPopup.css';

interface Props {
  role: 'candidate' | 'recruiter';
}

type FilterTab = 'all' | 'applications' | 'messages' | 'system';

const POLL_INTERVAL_MS = 25_000;

export default function NotificationBellDrawer({ role }: Props) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  const pollCount = useCallback(async () => {
    try {
      const count = await notificationService.fetchUnreadCount();
      setUnreadCount(count);
    } catch (error) {
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
      const data = await notificationService.fetchNotifications(false, 1, 50);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
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

  const handleDismiss = async (id: number) => {
    await notificationService.remove(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleReply = (notif: Notification) => {
    // Navigate to messages tab with conversation
    if (notif.payload?.route) {
      // Close the popup
      setIsOpen(false);
      // Navigate to the route specified in the notification
      navigate(notif.payload.route);
    } else if (notif.payload?.route_context?.conversation_id) {
      // Fallback: construct route from conversation_id
      setIsOpen(false);
      const convId = notif.payload.route_context.conversation_id;
      navigate(`/${role}-dashboard?tab=messages&c=${convId}`);
    }
  };

  const handleReview = (notif: Notification) => {
    // Navigate to applications tab or specific application
    setIsOpen(false);
    if (notif.payload?.route) {
      navigate(notif.payload.route);
    } else if (notif.payload?.route_context) {
      const ctx = notif.payload.route_context;
      if (ctx.applicationId) {
        navigate(`/${role}-dashboard?tab=applications&applicationId=${ctx.applicationId}`);
      } else {
        navigate(`/${role}-dashboard?tab=applications`);
      }
    } else {
      navigate(`/${role}-dashboard?tab=applications`);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    // Generic handler for clicking notifications
    setIsOpen(false);
    if (notif.payload?.route) {
      navigate(notif.payload.route);
    } else if (notif.payload?.route_context) {
      // Construct route from context
      const ctx = notif.payload.route_context;
      if (ctx.tab) {
        const query = new URLSearchParams(ctx as Record<string, string>).toString();
        navigate(`/${role}-dashboard?${query}`);
      }
    }
    // Mark as read
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
  };

  // Filter notifications by type
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    
    // Applications: application, status updates, interviews, shortlist
    if (filter === 'applications') {
      return [
        'application_submitted',
        'application_received',
        'application',
        'status_update',
        'interview_scheduled',
        'shortlisted'
      ].includes(n.event_type);
    }
    
    // Messages: chat and message events
    if (filter === 'messages') {
      return [
        'new_message_received',
        'chat_started_by_recruiter',
        'conversation_started',
        'message'
      ].includes(n.event_type);
    }
    
    // System: matches, invites, meetings, job posting updates
    if (filter === 'system') {
      return [
        'match',
        'invite',
        'job_posting_frozen',
        'job_posting_reactivated',
        'job_posting_reposted',
        'job_posting_cancelled',
        'meeting_updated',
        'candidate_requested_reschedule',
        'meeting_reschedule_requested',
        'recruiter_approved_reschedule',
        'meeting_reschedule_approved',
        'recruiter_rejected_reschedule',
        'meeting_reschedule_rejected',
        'attendance_confirmed'
      ].includes(n.event_type);
    }
    
    return true;
  });

  // Group by date
  const groupedNotifications = groupByDate(filteredNotifications);

  const getNotificationIcon = (eventType: string) => {
    // Application-related events (blue)
    if ([
      'application_submitted',
      'application_received',
      'application',
      'status_update',
      'shortlisted'
    ].includes(eventType)) {
      return (
        <div className="notif-popup-icon notif-popup-icon-application">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        </div>
      );
    }
    
    // Match events (green)
    if (eventType === 'match') {
      return (
        <div className="notif-popup-icon notif-popup-icon-match">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    
    // Message events (purple)
    if ([
      'new_message_received',
      'chat_started_by_recruiter',
      'conversation_started',
      'message'
    ].includes(eventType)) {
      return (
        <div className="notif-popup-icon notif-popup-icon-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      );
    }
    
    // Interview/meeting events (yellow)
    if ([
      'invite',
      'interview_scheduled',
      'meeting_updated',
      'candidate_requested_reschedule',
      'meeting_reschedule_requested',
      'recruiter_approved_reschedule',
      'meeting_reschedule_approved',
      'recruiter_rejected_reschedule',
      'meeting_reschedule_rejected',
      'attendance_confirmed'
    ].includes(eventType)) {
      return (
        <div className="notif-popup-icon notif-popup-icon-invite">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      );
    }
    
    // Default for any other event types
    return (
      <div className="notif-popup-icon notif-popup-icon-default">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
    );
  };

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

      {/* Notification Popup */}
      {isOpen && (
        <div className="notification-popup">
          {/* Header */}
          <div className="notif-popup-header">
            <div className="notif-popup-title-row">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <h3 className="notif-popup-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-new-badge">{unreadCount} new</span>
              )}
            </div>
            <div className="notif-popup-actions">
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
              <button 
                className="notif-settings-btn" 
                title="Notification settings"
                onClick={() => setIsOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notif-popup-tabs">
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
              {notifications.filter(n => !n.read && [
                'application_submitted',
                'application_received',
                'application',
                'status_update',
                'interview_scheduled',
                'shortlisted'
              ].includes(n.event_type)).length > 0 && (
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
          <div className="notif-popup-content">
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
                        
                        <div 
                          className="notif-content"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="notif-title">{notif.title}</div>
                          <div className="notif-message">{notif.message}</div>
                          
                          {[
                            'application_submitted',
                            'application_received',
                            'application'
                          ].includes(notif.event_type) && !notif.read && (
                            <div className="notif-actions">
                              <button 
                                className="notif-action-btn notif-btn-review"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReview(notif);
                                }}
                              >
                                Review
                              </button>
                              <button 
                                className="notif-action-btn notif-btn-dismiss"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismiss(notif.id);
                                }}
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
                          
                          {[
                            'invite',
                            'interview_scheduled',
                            'meeting_updated'
                          ].includes(notif.event_type) && (
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
                        
                        {[
                          'new_message_received',
                          'chat_started_by_recruiter',
                          'conversation_started',
                          'message'
                        ].includes(notif.event_type) && (
                          <button 
                            className="notif-reply-btn" 
                            title="Reply"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(notif);
                            }}
                          >
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
            <div className="notif-popup-footer">
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
      )}
    </div>
  );
}

// Helper function to group notifications by date
function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const groups: Record<string, Notification[]> = {
    'TODAY': [],
    'YESTERDAY': [],
    'EARLIER': []
  };
  
  notifications.forEach(notif => {
    const notifDate = new Date(notif.timestamp);
    const isToday = notifDate.toDateString() === today.toDateString();
    const isYesterday = notifDate.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      groups['TODAY'].push(notif);
    } else if (isYesterday) {
      groups['YESTERDAY'].push(notif);
    } else {
      groups['EARLIER'].push(notif);
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
