/**
 * Meeting Details Modal
 * View, update, cancel, or reschedule existing meetings
 * Includes participant management with search
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Meeting, MeetingParticipant } from '../../types/meeting';

interface MeetingDetailsModalProps {
  meeting: Meeting;
  onClose: () => void;
  onUpdate: () => void;
}

interface UserSearchResult {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

export function MeetingDetailsModal({ meeting, onClose, onUpdate }: MeetingDetailsModalProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditParticipants, setShowEditParticipants] = useState(false);
  
  const [cancellationReason, setCancellationReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  
  // Participant management state
  const [editedParticipants, setEditedParticipants] = useState<Array<{name: string; email: string}>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize edited participants from meeting data
  useEffect(() => {
    const participants = meeting.participants
      .filter(p => p.participant_name && p.participant_email)
      .map(p => ({
        name: p.participant_name!,
        email: p.participant_email!,
      }));
    setEditedParticipants(participants);
  }, [meeting]);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const response = await apiClient.searchUsers(searchQuery);
        setSearchResults(response.data);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const addParticipant = (user: UserSearchResult) => {
    // Check if already added
    if (editedParticipants.some(p => p.email === user.email)) {
      setError('Participant already added');
      return;
    }

    setEditedParticipants([...editedParticipants, { name: user.full_name, email: user.email }]);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const removeParticipant = (email: string) => {
    setEditedParticipants(editedParticipants.filter(p => p.email !== email));
  };

  const handleUpdateParticipants = async () => {
    if (editedParticipants.length === 0) {
      setError('Meeting must have at least one participant');
      return;
    }

    try {
      setLoading(true);
      await apiClient.updateMeeting(meeting.id, {
        participants: editedParticipants.map(p => ({ name: p.name, email: p.email, is_required: true }))
      });
      setShowEditParticipants(false);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update participants');
    } finally {
      setLoading(false);
    }
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

  // Edit Participants Modal
  if (showEditParticipants) {
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
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            Manage Participants
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Add or remove participants. All participants will be notified of changes.
          </p>

          {/* Search for users to add */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
              Add Participant
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
            {searching && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                Searching...
              </div>
            )}
            {searchResults.length > 0 && (
              <div style={{
                marginTop: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => addParticipant(user)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                      {user.full_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {user.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current participants */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              Current Participants ({editedParticipants.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {editedParticipants.map((participant, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      {participant.name}
                      {meeting.participants.find(p => p.participant_email === participant.email)?.user_id === meeting.organizer_user_id && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6d28d9' }}>(Organizer)</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {participant.email}
                    </div>
                  </div>
                  <button
                    onClick={() => removeParticipant(participant.email)}
                    disabled={editedParticipants.length === 1}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: editedParticipants.length === 1 ? '#cbd5e1' : '#ef4444',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: editedParticipants.length === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
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
              onClick={() => {
                setShowEditParticipants(false);
                setError('');
                // Reset to original participants
                const participants = meeting.participants
                  .filter(p => p.participant_name && p.participant_email)
                  .map(p => ({
                    name: p.participant_name!,
                    email: p.participant_email!,
                  }));
                setEditedParticipants(participants);
              }}
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
              Cancel
            </button>
            <button
              onClick={handleUpdateParticipants}
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
              {loading ? 'Updating...' : 'Save Changes'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Participants ({meeting.participants.length})
              </h3>
              {meeting.status === 'scheduled' && (
                <button
                  onClick={() => setShowEditParticipants(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #6d28d9',
                    background: 'white',
                    color: '#6d28d9',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit Participants
                </button>
              )}
            </div>
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
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {participant.participant_name || `User #${participant.user_id}`}
                        {participant.user_id === meeting.organizer_user_id && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6d28d9' }}>(Organizer)</span>
                        )}
                      </div>
                      {participant.participant_email && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {participant.participant_email}
                        </div>
                      )}
                    </div>
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
