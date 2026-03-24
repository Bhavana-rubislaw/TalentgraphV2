/**
 * Meeting Details Modal
 * View, update, cancel, or reschedule existing meetings
 */

import { useState } from 'react';
import { apiClient } from '../../api/client';
import { Meeting } from '../../types/meeting';

interface MeetingDetailsModalProps {
  meeting: Meeting;
  onClose: () => void;
  onUpdate: () => void;
}

export function MeetingDetailsModal({ meeting, onClose, onUpdate }: MeetingDetailsModalProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    try {
      setLoading(true);
      await apiClient.cancelMeeting(meeting.id, cancellationReason);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.startTime || !rescheduleData.endTime) {
      setError('Please fill in all date and time fields');
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(`${rescheduleData.date}T${rescheduleData.startTime}`);
      const endDateTime = new Date(`${rescheduleData.date}T${rescheduleData.endTime}`);

      await apiClient.rescheduleMeeting(meeting.id, {
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reschedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const configs = {
      scheduled: { bg: '#dbeafe', color: '#1e40af', label: 'Scheduled' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
      no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
    };
    const config = configs[meeting.status];
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 700,
        background: config.bg,
        color: config.color,
      }}>
        {config.label}
      </span>
    );
  };

  const getMeetingTypeIcon = () => {
    const icons = {
      interview: '💼',
      screening: '📋',
      follow_up: '🔄',
      other: '📅',
    };
    return icons[meeting.meeting_type] || '📅';
  };

  if (showCancelModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
            Cancel Meeting
          </h3>

          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            Please provide a reason for cancelling this meeting. All participants will be notified.
          </p>

          <textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Enter cancellation reason..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              marginBottom: '16px',
              resize: 'vertical',
            }}
          />

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Go Back
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#cbd5e1' : '#ef4444',
                color: 'white',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showRescheduleModal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
            Reschedule Meeting
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
              New Date
            </label>
            <input
              type="date"
              value={rescheduleData.date}
              onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                Start Time
              </label>
              <input
                type="time"
                value={rescheduleData.startTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                End Time
              </label>
              <input
                type="time"
                value={rescheduleData.endTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowRescheduleModal(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Go Back
            </button>
            <button
              onClick={handleReschedule}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                color: 'white',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{getMeetingTypeIcon()}</span>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#1e293b',
                margin: 0,
              }}>
                {meeting.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {getStatusBadge()}
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
                {meeting.meeting_type.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Description */}
          {meeting.description && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Description
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                {meeting.description}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>📅 SCHEDULED START</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{formatDateTime(meeting.scheduled_start)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>🕐 DURATION</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{meeting.duration_minutes} minutes</div>
            </div>
            {meeting.location && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>📍 LOCATION</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{meeting.location}</div>
              </div>
            )}
            {meeting.video_meeting_url && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>🎥 VIDEO LINK</div>
                <a
                  href={meeting.video_meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '14px', fontWeight: 600, color: '#6d28d9', textDecoration: 'none' }}
                >
                  Join Meeting →
                </a>
              </div>
            )}
          </div>

          {/* Participants */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Participants ({meeting.participants.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {meeting.participants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>👤</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      User #{participant.user_id}
                      {participant.user_id === meeting.organizer_user_id && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6d28d9' }}>(Organizer)</span>
                      )}
                    </span>
                  </div>
                  {participant.has_confirmed ? (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', background: '#d1fae5', padding: '4px 8px', borderRadius: '6px' }}>
                      ✓ Confirmed
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cancellation Info */}
          {meeting.status === 'cancelled' && meeting.cancellation_reason && (
            <div style={{
              padding: '16px',
              background: '#fee2e2',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                CANCELLATION REASON
              </h3>
              <p style={{ color: '#7f1d1d', fontSize: '14px', margin: 0 }}>
                {meeting.cancellation_reason}
              </p>
            </div>
          )}

          {/* Actions */}
          {meeting.status === 'scheduled' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRescheduleModal(true)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: '2px solid #6d28d9',
                  background: 'white',
                  color: '#6d28d9',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🔄 Reschedule
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ❌ Cancel Meeting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
