import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import '../styles/NotificationPreferences.css';

/* ── SVG Icons ── */
const Icons = {
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  alertTriangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
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

/* ── Event Type Metadata (icons + fallback labels for offline/cache) ── */
const EVENT_METADATA: Record<string, EventTypeMetadata> = {
  // Candidate Events
  application_status: {
    label: 'Application Status Updates',
    description: 'When your application status changes',
    icon: '📬',
    category: 'applications'
  },
  match_found: {
    label: 'New Matches',
    description: 'When you match with a new job',
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
    description: 'When recruiters invite you to apply',
    icon: '✉️',
    category: 'applications'
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    description: 'When an interview is scheduled',
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
    description: 'When you receive new messages',
    icon: '💬',
    category: 'messages'
  },
  conversation_started: {
    label: 'Conversation Started',
    description: 'When a recruiter starts a conversation with you',
    icon: '💬',
    category: 'messages'
  },
  job_recommendation: {
    label: 'Job Recommendations',
    description: 'When new matching jobs are posted',
    icon: '💼',
    category: 'jobs'
  },
  
  // Recruiter Events
  application_received: {
    label: 'New Applications',
    description: 'When candidates apply to your postings',
    icon: '📄',
    category: 'applications'
  },
  candidate_match: {
    label: 'Candidate Match',
    description: 'When a new candidate matches your job posting',
    icon: '🎯',
    category: 'matches'
  },
  recruiter_interview_scheduled: {
    label: 'Interview Scheduled',
    description: 'When an interview is scheduled with a candidate',
    icon: '📅',
    category: 'interviews'
  },
  interview_confirmed: {
    label: 'Interview Confirmations',
    description: 'When candidates confirm appointments',
    icon: '✅',
    category: 'interviews'
  },
  recruiter_message_received: {
    label: 'New Messages',
    description: 'When you receive new messages from candidates',
    icon: '💬',
    category: 'messages'
  },
  job_update: {
    label: 'Job Posting Updates',
    description: 'Updates about your job postings',
    icon: '📋',
    category: 'jobs'
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  applications: 'Applications',
  matches: 'Matches & Connections',
  interviews: 'Interviews & Meetings',
  messages: 'Messages',
  jobs: 'Job Updates'
};

/* ================================================================
   COMPONENT
   ================================================================ */
const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  // Merged metadata: backend registry labels/descriptions overriding local fallbacks
  const [eventMetadata, setEventMetadata] = useState<Record<string, EventTypeMetadata>>(EVENT_METADATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
    fetchRegistry();
  }, []);

  const fetchRegistry = async () => {
    try {
      const response = await apiClient.getNotificationRegistry();
      const registryItems: Array<{ event_type: string; label: string; description: string; category: string; priority: string }> = response.data;
      // Merge backend registry into local metadata, preserving local icons
      setEventMetadata(prev => {
        const merged = { ...prev };
        for (const item of registryItems) {
          merged[item.event_type] = {
            label: item.label,
            description: item.description,
            icon: prev[item.event_type]?.icon ?? '🔔',
            category: (item.category as EventTypeMetadata['category']) ?? 'jobs',
          };
        }
        return merged;
      });
    } catch (error) {
      // Registry fetch failing is non-fatal; local EVENT_METADATA is the fallback
      console.warn('[PREFERENCES] Registry fetch failed, using local metadata fallback:', error);
    }
  };

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefsToUpdate = preferences.map(pref => ({
        event_type: pref.event_type,
        in_app_enabled: pref.in_app_enabled,
        email_enabled: pref.email_enabled,
        in_app_frequency: 'realtime',
        email_frequency: 'realtime',
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

  const toggleAllNotifications = (enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref => ({ 
        ...pref, 
        in_app_enabled: enabled,
        email_enabled: enabled 
      }))
    );
    setHasChanges(true);
  };

  // Group preferences by category
  const groupedPreferences = preferences.reduce((acc, pref) => {
    const metadata = eventMetadata[pref.event_type];
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
    <div className="cp-form-container">
      {/* Toast */}
      {toast && (
        <div className={`cp-toast ${toast.type}`}>
          {toast.type === 'success' ? Icons.check : Icons.alertTriangle}
          {toast.message}
        </div>
      )}

      <div className="cp-form-section">
        {/* Section Header */}
        <div className="notif-section-header">
          <h3 className="cp-form-section-title">
            {Icons.bell} Notification Preferences
          </h3>
          <p className="notif-section-subtitle">Choose how you want to be notified</p>
          
          {/* Global Controls */}
          <div className="notif-global-actions">
            <button
              className="cp-btn cp-btn-outline cp-btn-sm"
              onClick={() => toggleAllNotifications(true)}
              title="Enable all notifications"
            >
              Enable All
            </button>
            <button
              className="cp-btn cp-btn-outline cp-btn-sm"
              onClick={() => toggleAllNotifications(false)}
              title="Disable all notifications"
            >
              Disable All
            </button>
          </div>
        </div>

        {/* Notification Items Grid (2-column) */}
        {Object.entries(groupedPreferences).map(([category, prefs]) => (
          <div key={category} className="notif-category-section">
            {/* Category Title */}
            <div className="notif-category-title-row">
              <h4 className="notif-category-title">
                {CATEGORY_LABELS[category] || category}
                <span className="cp-count-badge">{prefs.length}</span>
              </h4>
            </div>

            {/* Grid of Notification Cards */}
            <div className="notif-items-grid">
              {prefs.map(pref => {
                const metadata = eventMetadata[pref.event_type];
                if (!metadata) return null;

                return (
                  <div key={pref.id} className="notif-item-card">
                    {/* Card Header */}
                    <div className="notif-card-header">
                      <div className="notif-card-title-wrapper">
                        <h5 className="notif-card-title">
                          {metadata.label}
                          {pref.priority === 'urgent' && (
                            <span className="notif-badge-urgent">URGENT</span>
                          )}
                        </h5>
                        <p className="notif-card-description">{metadata.description}</p>
                      </div>
                    </div>

                    {/* Controls Section */}
                    <div className="notif-card-controls">
                      {/* In-App Row */}
                      <div className="notif-control-row">
                        <label className="notif-control-label">
                          <span className="notif-label-icon">{Icons.bell}</span>
                          In-App
                        </label>
                        <div className="notif-control-inputs">
                          <label className="notif-toggle">
                            <input
                              type="checkbox"
                              checked={pref.in_app_enabled}
                              onChange={(e) => handleToggle(pref.event_type, 'in_app_enabled', e.target.checked)}
                            />
                            <span className="notif-toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Email Row */}
                      <div className="notif-control-row">
                        <label className="notif-control-label">
                          <span className="notif-label-icon">{Icons.mail}</span>
                          Email
                        </label>
                        <div className="notif-control-inputs">
                          <label className="notif-toggle">
                            <input
                              type="checkbox"
                              checked={pref.email_enabled}
                              onChange={(e) => handleToggle(pref.event_type, 'email_enabled', e.target.checked)}
                            />
                            <span className="notif-toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Save Footer (only when changes) */}
        {hasChanges && (
          <div className="notif-save-banner">
            <div className="notif-save-banner-content">
              <div className="notif-save-banner-left">
                <span className="notif-save-banner-icon">{Icons.alertTriangle}</span>
                <div className="notif-save-banner-text">
                  <span className="notif-save-banner-title">Unsaved Changes</span>
                  <span className="notif-save-banner-subtitle">Your notification preferences haven't been saved yet</span>
                </div>
              </div>
              <div className="notif-save-banner-actions">
                <button
                  className="cp-btn cp-btn-outline cp-btn-sm"
                  onClick={() => {
                    fetchPreferences();
                    setHasChanges(false);
                  }}
                  disabled={saving}
                >
                  Discard
                </button>
                <button
                  className="cp-btn cp-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="notif-btn-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;
