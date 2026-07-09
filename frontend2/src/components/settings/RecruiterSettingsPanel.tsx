import React, { useState, useEffect } from 'react';
import '../../styles/RecruiterSettingsPanel.css';

export interface RecruiterSettings {
  defaultMeetingProvider: string;
  defaultMeetingDuration: number;
  defaultReminderMinutes: number;
  defaultTimezone?: string;
}

interface RecruiterSettingsPanelProps {
  onSettingsSaved: (settings: RecruiterSettings) => void;
  initialSettings?: RecruiterSettings;
}

const DEFAULT_SETTINGS: RecruiterSettings = {
  defaultMeetingProvider: 'jitsi',
  defaultMeetingDuration: 60,
  defaultReminderMinutes: 15,
  defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

export const RecruiterSettingsPanel: React.FC<RecruiterSettingsPanelProps> = ({
  onSettingsSaved,
  initialSettings
}) => {
  const [settings, setSettings] = useState<RecruiterSettings>(
    initialSettings || DEFAULT_SETTINGS
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('recruiterMeetingSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate duration
    if (settings.defaultMeetingDuration < 15 || settings.defaultMeetingDuration > 180) {
      newErrors.defaultMeetingDuration = 'Duration must be between 15 and 180 minutes';
    }

    // Validate reminder
    if (settings.defaultReminderMinutes < 0 || settings.defaultReminderMinutes > 1440) {
      newErrors.defaultReminderMinutes = 'Reminder must be between 0 and 1440 minutes (24 hours)';
    }

    // Validate provider
    const validProviders = ['jitsi', 'google_meet', 'zoom', 'teams'];
    if (!validProviders.includes(settings.defaultMeetingProvider)) {
      newErrors.defaultMeetingProvider = 'Please select a valid provider';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateSettings()) {
      return;
    }

    // Save to localStorage
    localStorage.setItem('recruiterMeetingSettings', JSON.stringify(settings));

    // Notify parent component
    onSettingsSaved(settings);

    // Show success message
    setSaveSuccess(true);
    setHasChanges(false);

    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    setErrors({});
  };

  const updateSetting = <K extends keyof RecruiterSettings>(
    key: K,
    value: RecruiterSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>Meeting Settings</h2>
        <p className="settings-panel-subtitle">
          Configure default preferences for meeting generation
        </p>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="success-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>Settings saved successfully! Your preferences will be used for new meetings.</div>
        </div>
      )}

      <div className="settings-content">
        {/* Default Provider Setting */}
        <div className="settings-card">
          <div className="setting-group">
            <div className="setting-header">
              <div className="setting-icon provider-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div>
                <h3>Default Meeting Provider</h3>
                <p>Choose your preferred video conferencing platform</p>
              </div>
            </div>

            <div className="setting-control">
              <select
                className={`form-control ${errors.defaultMeetingProvider ? 'error' : ''}`}
                value={settings.defaultMeetingProvider}
                onChange={(e) => updateSetting('defaultMeetingProvider', e.target.value)}
              >
                <option value="jitsi">Jitsi Meet (Instant, No Account)</option>
                <option value="google_meet">Google Calendar Event</option>
                <option value="zoom">Zoom (Requires API)</option>
                <option value="teams">Microsoft Teams (Requires API)</option>
              </select>
              {errors.defaultMeetingProvider && (
                <div className="field-error">{errors.defaultMeetingProvider}</div>
              )}
              <div className="setting-hint">
                This provider will be pre-selected when creating new meetings
              </div>
            </div>
          </div>
        </div>

        {/* Default Duration Setting */}
        <div className="settings-card">
          <div className="setting-group">
            <div className="setting-header">
              <div className="setting-icon duration-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <h3>Default Meeting Duration</h3>
                <p>Set your standard meeting length</p>
              </div>
            </div>

            <div className="setting-control">
              <select
                className={`form-control ${errors.defaultMeetingDuration ? 'error' : ''}`}
                value={settings.defaultMeetingDuration}
                onChange={(e) => updateSetting('defaultMeetingDuration', Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
              {errors.defaultMeetingDuration && (
                <div className="field-error">{errors.defaultMeetingDuration}</div>
              )}
              <div className="setting-hint">
                Duration must be between 15 and 180 minutes
              </div>
            </div>
          </div>
        </div>

        {/* Default Reminder Setting */}
        <div className="settings-card">
          <div className="setting-group">
            <div className="setting-header">
              <div className="setting-icon reminder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div>
                <h3>Default Reminder Time</h3>
                <p>When to send meeting reminders before start time</p>
              </div>
            </div>

            <div className="setting-control">
              <select
                className={`form-control ${errors.defaultReminderMinutes ? 'error' : ''}`}
                value={settings.defaultReminderMinutes}
                onChange={(e) => updateSetting('defaultReminderMinutes', Number(e.target.value))}
              >
                <option value={0}>No reminder</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={1440}>1 day before</option>
              </select>
              {errors.defaultReminderMinutes && (
                <div className="field-error">{errors.defaultReminderMinutes}</div>
              )}
              <div className="setting-hint">
                Reminder will be sent via email and notification
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Setting */}
        <div className="settings-card">
          <div className="setting-group">
            <div className="setting-header">
              <div className="setting-icon timezone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div>
                <h3>Default Timezone</h3>
                <p>Your local timezone for scheduling</p>
              </div>
            </div>

            <div className="setting-control">
              <input
                type="text"
                className="form-control"
                value={settings.defaultTimezone || 'Auto-detected'}
                readOnly
                disabled
              />
              <div className="setting-hint">
                Timezone is automatically detected from your browser
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Settings
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>
          <strong>Note:</strong> These settings will be used as default values when creating new meetings. 
          You can always override them for individual meetings.
        </div>
      </div>
    </div>
  );
};

export default RecruiterSettingsPanel;
