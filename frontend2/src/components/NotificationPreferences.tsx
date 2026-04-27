import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import '../styles/NotificationPreferences.css';

/* ── SVG Icons ── */
const Icons = {
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  alertTriangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

/* ── Interfaces ── */
interface NotificationPreference {
  id: number;
  event_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  in_app_frequency: string;
  email_frequency: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface EventTypeMetadata {
  label: string;
  description: string;
  icon: string;
  category: 'applications' | 'matches' | 'interviews' | 'messages' | 'jobs';
}

/* ── Event Type Metadata ── */
const EVENT_METADATA: Record<string, EventTypeMetadata> = {
  // Candidate Events
  application_status: {
    label: 'Application Status Updates',
    description: 'When your application status changes (under review, shortlisted, etc.)',
    icon: '📬',
    category: 'applications'
  },
  match_found: {
    label: 'New Matches',
    description: 'When you match with a new job or candidate',
    icon: '🎯',
    category: 'matches'
  },
  shortlisted: {
    label: 'Shortlisted by Recruiter',
    description: 'When a recruiter adds you to their shortlist',
    icon: '⭐',
    category: 'applications'
  },
  invitation: {
    label: 'Direct Invitations',
    description: 'When recruiters invite you to apply for positions',
    icon: '✉️',
    category: 'applications'
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    description: 'When an interview is scheduled with you',
    icon: '📅',
    category: 'interviews'
  },
  interview_reminder: {
    label: 'Interview Reminders',
    description: 'Reminders before your upcoming interviews',
    icon: '⏰',
    category: 'interviews'
  },
  message_received: {
    label: 'New Messages',
    description: 'When you receive new messages from recruiters or candidates',
    icon: '💬',
    category: 'messages'
  },
  job_recommendation: {
    label: 'Job Recommendations',
    description: 'When new jobs matching your preferences are posted',
    icon: '💼',
    category: 'jobs'
  },
  
  // Recruiter Events
  application_received: {
    label: 'New Applications',
    description: 'When candidates apply to your job postings',
    icon: '📄',
    category: 'applications'
  },
  interview_confirmed: {
    label: 'Interview Confirmations',
    description: 'When candidates confirm interview appointments',
    icon: '✅',
    category: 'interviews'
  },
  job_update: {
    label: 'Job Posting Updates',
    description: 'Updates about your job postings (expiring, frozen, etc.)',
    icon: '📋',
    category: 'jobs'
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  applications: 'Applications',
  matches: 'Matches & Connections',
  interviews: 'Interviews & Meetings',
  messages: 'Messages',
  jobs: 'Job Postings'
};

/* ================================================================
   COMPONENT
   ================================================================ */
const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getNotificationPreferences();
      setPreferences(response.data);
    } catch (error: any) {
      showToast('Failed to load preferences', 'error');
      console.error('[PREFERENCES] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggle = (eventType: string, field: 'in_app_enabled' | 'email_enabled', value: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.event_type === eventType
          ? { ...pref, [field]: value }
          : pref
      )
    );
    setHasChanges(true);
  };

  const handleFrequencyChange = (eventType: string, field: 'in_app_frequency' | 'email_frequency', value: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.event_type === eventType
          ? { ...pref, [field]: value }
          : pref
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Bulk update all preferences
      const prefsToUpdate = preferences.map(pref => ({
        event_type: pref.event_type,
        in_app_enabled: pref.in_app_enabled,
        email_enabled: pref.email_enabled,
        in_app_frequency: pref.in_app_frequency,
        email_frequency: pref.email_frequency,
        priority: pref.priority
      }));

      await apiClient.bulkUpdateNotificationPreferences(prefsToUpdate);
      showToast('Preferences saved successfully!', 'success');
      setHasChanges(false);
    } catch (error: any) {
      showToast('Failed to save preferences', 'error');
      console.error('[PREFERENCES] Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleAllEmail = (enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref => ({ ...pref, email_enabled: enabled }))
    );
    setHasChanges(true);
  };

  const toggleAllInApp = (enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref => ({ ...pref, in_app_enabled: enabled }))
    );
    setHasChanges(true);
  };

  // Group preferences by category
  const groupedPreferences = preferences.reduce((acc, pref) => {
    const metadata = EVENT_METADATA[pref.event_type];
    const category = metadata?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(pref);
    return acc;
  }, {} as Record<string, NotificationPreference[]>);

  if (loading) {
    return (
      <div className="notif-prefs-loading">
        <div className="spinner"></div>
        <p>Loading notification preferences...</p>
      </div>
    );
  }

  return (
    <div className="notification-preferences">
      {/* Toast */}
      {toast && (
        <div className={`notif-prefs-toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? Icons.check : Icons.alertTriangle}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="notif-prefs-header">
        <div className="header-content">
          <div className="header-icon">{Icons.bell}</div>
          <div className="header-text">
            <h2>Notification Preferences</h2>
            <p>Choose how and when you want to be notified</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => toggleAllEmail(true)}
            title="Enable all email notifications"
          >
            {Icons.mail} Enable All Emails
          </button>
          <button
            className="quick-action-btn"
            onClick={() => toggleAllEmail(false)}
            title="Disable all email notifications"
          >
            {Icons.x} Disable All Emails
          </button>
        </div>
      </div>

      {/* Preferences by Category */}
      {Object.entries(groupedPreferences).map(([category, prefs]) => (
        <div key={category} className="notif-category-section">
          <h3 className="category-title">{CATEGORY_LABELS[category] || category}</h3>
          
          <div className="notif-prefs-cards">
            {prefs.map(pref => {
              const metadata = EVENT_METADATA[pref.event_type];
              if (!metadata) return null;

              return (
                <div key={pref.id} className="notif-pref-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <span className="event-icon">{metadata.icon}</span>
                    <div className="event-info">
                      <h4>{metadata.label}</h4>
                      <p>{metadata.description}</p>
                    </div>
                    {pref.priority === 'urgent' && (
                      <span className="priority-badge urgent">Urgent</span>
                    )}
                  </div>

                  {/* Card Body - Toggles and Frequency */}
                  <div className="card-body">
                    {/* In-App Notification */}
                    <div className="notification-channel">
                      <div className="channel-header">
                        <div className="channel-label">
                          <span className="channel-icon">{Icons.bell}</span>
                          <span>In-App Notification</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={pref.in_app_enabled}
                            onChange={(e) => handleToggle(pref.event_type, 'in_app_enabled', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      {pref.in_app_enabled && (
                        <div className="frequency-selector">
                          <label>Frequency:</label>
                          <select
                            value={pref.in_app_frequency}
                            onChange={(e) => handleFrequencyChange(pref.event_type, 'in_app_frequency', e.target.value)}
                          >
                            <option value="realtime">Realtime</option>
                            <option value="daily">Daily Digest</option>
                            <option value="weekly">Weekly Digest</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Email Notification */}
                    <div className="notification-channel">
                      <div className="channel-header">
                        <div className="channel-label">
                          <span className="channel-icon">{Icons.mail}</span>
                          <span>Email Notification</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={pref.email_enabled}
                            onChange={(e) => handleToggle(pref.event_type, 'email_enabled', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      {pref.email_enabled && (
                        <div className="frequency-selector">
                          <label>Frequency:</label>
                          <select
                            value={pref.email_frequency}
                            onChange={(e) => handleFrequencyChange(pref.event_type, 'email_frequency', e.target.value)}
                          >
                            <option value="realtime">Realtime</option>
                            <option value="daily">Daily Digest</option>
                            <option value="weekly">Weekly Digest</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="notif-prefs-footer">
        <button
          className={`save-btn ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <>
              <span className="btn-spinner"></span>
              Saving...
            </>
          ) : (
            <>
              {Icons.save}
              Save Preferences
            </>
          )}
        </button>
        {hasChanges && (
          <p className="unsaved-changes-note">You have unsaved changes</p>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;
