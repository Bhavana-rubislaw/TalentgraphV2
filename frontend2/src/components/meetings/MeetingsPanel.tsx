import React, { useState, useEffect } from 'react';
import {
  validateMeetingInputs,
  generateMeetingLink,
  getProviderDisplayName,
  requiresBackendAPI,
  formatDuration,
  type MeetingDetails,
  type ValidationError
} from '../../utils/meetingLinkGenerator';
import '../../styles/MeetingsPanel.css';

interface MeetingsPanelProps {
  defaultProvider?: string;
  defaultDuration?: number;
  defaultReminderMinutes?: number;
}

export const MeetingsPanel: React.FC<MeetingsPanelProps> = ({
  defaultProvider = 'jitsi',
  defaultDuration = 60,
  defaultReminderMinutes = 15
}) => {
  // Meeting state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(defaultDuration);
  const [meetingProvider, setMeetingProvider] = useState(defaultProvider);
  const [meetingDescription, setMeetingDescription] = useState('');
  
  // UI state
  const [generatedMeetingLink, setGeneratedMeetingLink] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Update defaults when props change
  useEffect(() => {
    if (!generatedMeetingLink) {
      setMeetingProvider(defaultProvider);
      setMeetingDuration(defaultDuration);
    }
  }, [defaultProvider, defaultDuration, generatedMeetingLink]);

  // Auto-set current date + 1 day as default
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setMeetingDate(dateStr);
    setMeetingTime('10:00'); // Default to 10 AM
  }, []);

  const handleGenerateLink = () => {
    // Reset states
    setErrors([]);
    setShowSuccess(false);
    setGeneratedMeetingLink('');

    const details: MeetingDetails = {
      title: meetingTitle,
      date: meetingDate,
      time: meetingTime,
      duration: meetingDuration,
      provider: meetingProvider as any,
      description: meetingDescription
    };

    // Validate inputs
    const validationErrors = validateMeetingInputs(details);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check if backend API is required
    if (requiresBackendAPI(meetingProvider)) {
      setErrors([{
        field: 'provider',
        message: `${getProviderDisplayName(meetingProvider)} requires backend API integration. Please use Jitsi or Google Calendar for now.`
      }]);
      return;
    }

    // Generate link
    try {
      const link = generateMeetingLink(details);
      setGeneratedMeetingLink(link);
      setShowSuccess(true);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      setErrors([{
        field: 'generation',
        message: error instanceof Error ? error.message : 'Failed to generate meeting link'
      }]);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedMeetingLink) return;

    try {
      await navigator.clipboard.writeText(generatedMeetingLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleOpenLink = () => {
    if (!generatedMeetingLink) return;
    window.open(generatedMeetingLink, '_blank', 'noopener,noreferrer');
  };

  const handleClearForm = () => {
    setMeetingTitle('');
    setMeetingDescription('');
    setGeneratedMeetingLink('');
    setErrors([]);
    setShowSuccess(false);
    setMeetingProvider(defaultProvider);
    setMeetingDuration(defaultDuration);
    
    // Reset to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setMeetingDate(dateStr);
    setMeetingTime('10:00');
  };

  const getErrorForField = (field: string): string | null => {
    const error = errors.find(e => e.field === field || e.field === 'datetime');
    return error ? error.message : null;
  };

  const generalErrors = errors.filter(e => 
    !['title', 'date', 'time', 'datetime', 'duration', 'provider'].includes(e.field)
  );

  return (
    <div className="meetings-panel">
      <div className="meetings-panel-header">
        <h2>Generate Meeting Link</h2>
        <p className="meetings-panel-subtitle">
          Create meeting links for interviews and team discussions
        </p>
      </div>

      {/* General Error Banner */}
      {generalErrors.length > 0 && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            {generalErrors.map((error, idx) => (
              <div key={idx}>{error.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Success Banner */}
      {showSuccess && (
        <div className="success-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>Meeting link generated successfully!</div>
        </div>
      )}

      <div className="meetings-panel-content">
        {/* Meeting Form */}
        <div className="meeting-form-card">
          <h3>Meeting Details</h3>
          
          <div className="form-grid">
            {/* Meeting Title */}
            <div className="form-group full-width">
              <label htmlFor="meeting-title">
                Meeting Title <span className="required">*</span>
              </label>
              <input
                id="meeting-title"
                type="text"
                className={`form-control ${getErrorForField('title') ? 'error' : ''}`}
                placeholder="e.g., Frontend Developer Interview"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                maxLength={200}
              />
              {getErrorForField('title') && (
                <div className="field-error">{getErrorForField('title')}</div>
              )}
            </div>

            {/* Date and Time */}
            <div className="form-group">
              <label htmlFor="meeting-date">
                Date <span className="required">*</span>
              </label>
              <input
                id="meeting-date"
                type="date"
                className={`form-control ${getErrorForField('date') || getErrorForField('datetime') ? 'error' : ''}`}
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
              {getErrorForField('date') && (
                <div className="field-error">{getErrorForField('date')}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="meeting-time">
                Time <span className="required">*</span>
              </label>
              <input
                id="meeting-time"
                type="time"
                className={`form-control ${getErrorForField('time') || getErrorForField('datetime') ? 'error' : ''}`}
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
              {getErrorForField('time') && (
                <div className="field-error">{getErrorForField('time')}</div>
              )}
              {getErrorForField('datetime') && (
                <div className="field-error">{getErrorForField('datetime')}</div>
              )}
            </div>

            {/* Duration */}
            <div className="form-group">
              <label htmlFor="meeting-duration">
                Duration <span className="required">*</span>
              </label>
              <select
                id="meeting-duration"
                className={`form-control ${getErrorForField('duration') ? 'error' : ''}`}
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
              {getErrorForField('duration') && (
                <div className="field-error">{getErrorForField('duration')}</div>
              )}
            </div>

            {/* Provider */}
            <div className="form-group">
              <label htmlFor="meeting-provider">
                Provider <span className="required">*</span>
              </label>
              <select
                id="meeting-provider"
                className={`form-control ${getErrorForField('provider') ? 'error' : ''}`}
                value={meetingProvider}
                onChange={(e) => setMeetingProvider(e.target.value)}
              >
                <option value="jitsi">Jitsi Meet</option>
                <option value="google_meet">Google Calendar Event</option>
                <option value="zoom">Zoom (Requires API)</option>
                <option value="teams">Microsoft Teams (Requires API)</option>
              </select>
              {getErrorForField('provider') && (
                <div className="field-error">{getErrorForField('provider')}</div>
              )}
            </div>

            {/* Description/Notes */}
            <div className="form-group full-width">
              <label htmlFor="meeting-description">
                Description / Notes (Optional)
              </label>
              <textarea
                id="meeting-description"
                className="form-control"
                placeholder="Add any additional details or agenda for the meeting..."
                rows={3}
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                maxLength={500}
              />
              <div className="char-count">{meetingDescription.length} / 500</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateLink}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Generate Meeting Link
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearForm}
            >
              Clear Form
            </button>
          </div>
        </div>

        {/* Generated Link Display */}
        {generatedMeetingLink && (
          <div className="meeting-link-card">
            <div className="meeting-link-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h3>Meeting Link Generated</h3>
            </div>

            <div className="meeting-summary">
              <div className="summary-row">
                <span className="summary-label">Title:</span>
                <span className="summary-value">{meetingTitle}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Date & Time:</span>
                <span className="summary-value">
                  {new Date(`${meetingDate}T${meetingTime}`).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Duration:</span>
                <span className="summary-value">{formatDuration(meetingDuration)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Provider:</span>
                <span className="summary-value">{getProviderDisplayName(meetingProvider)}</span>
              </div>
            </div>

            <div className="meeting-link-display">
              <input
                type="text"
                className="link-input"
                value={generatedMeetingLink}
                readOnly
              />
            </div>

            <div className="meeting-link-actions">
              <button
                type="button"
                className="btn btn-copy"
                onClick={handleCopyLink}
              >
                {copySuccess ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-open"
                onClick={handleOpenLink}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingsPanel;
