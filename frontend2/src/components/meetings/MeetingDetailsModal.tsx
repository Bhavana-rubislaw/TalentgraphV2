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
  const [showForceReschedule, setShowForceReschedule] = useState(false);
  const [forceRescheduleData, setForceRescheduleData] = useState({ date: '', startTime: '', reason: '' });
  
  const currentUserRole = localStorage.getItem('role') || '';
  const isAdminOrHR = currentUserRole === 'admin' || currentUserRole === 'hr';
  
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0px 4px 12px rgba(0,0,0,0.08)', border: '1px solid #E4E7EC' }}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #f0f1f4', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
            {getMeetingTypeIcon()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1d2b' }}>{meeting.title}</h2>
              {getStatusBadge()}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {meeting.meeting_type.replace('_', ' ').charAt(0).toUpperCase() + meeting.meeting_type.replace('_', ' ').slice(1)}
              {meeting.participants[0]?.participant_name && <> · <span style={{ color: '#6d28d9' }}>{meeting.participants[0].participant_name.split(' ')[0]}'s Company</span></>}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b', flexShrink: 0 }}>
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px 24px' }}>

          {/* Description */}
          {meeting.description && (
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px', lineHeight: 1.65 }}>
              {meeting.description}
            </p>
          )}

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>📅 Scheduled Start</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{formatDateTime(meeting.scheduled_start)}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>🕐 Duration</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{meeting.duration_minutes} minutes</div>
            </div>
            {meeting.location && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>📍 Location</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{meeting.location}</div>
              </div>
            )}
            {meeting.video_meeting_url && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>🎥 Video Link</div>
                <a href={meeting.video_meeting_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 600, color: '#6d28d9', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meeting.video_meeting_url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Participants */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Participants</h3>
              {meeting.status === 'scheduled' && (
                <button onClick={() => setShowEditParticipants(true)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#6d28d9', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Edit
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {meeting.participants.map((participant, idx) => {
                const name = participant.participant_name || `User #${participant.user_id}`;
                const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                const avatarColors = ['#6d28d9', '#0284c7', '#059669', '#b45309', '#be123c', '#7c3aed'];
                const avatarBg = avatarColors[idx % avatarColors.length];
                const isOrganizer = participant.user_id === meeting.organizer_user_id;
                const isConfirmed = participant.has_confirmed;
                return (
                  <div key={participant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f0f1f4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {participant.participant_email || ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {isOrganizer && (
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#ede9fe', color: '#6d28d9' }}>Organizer</span>
                      )}
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px',
                        background: isConfirmed ? '#dcfce7' : '#fef3c7',
                        color: isConfirmed ? '#15803d' : '#b45309'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConfirmed ? '#16a34a' : '#f59e0b', display: 'inline-block' }} />
                        {isConfirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancellation reason */}
          {meeting.status === 'cancelled' && meeting.cancellation_reason && (
            <div style={{ padding: '14px 16px', background: '#fee2e2', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancellation Reason</div>
              <p style={{ color: '#7f1d1d', fontSize: '14px', margin: 0 }}>{meeting.cancellation_reason}</p>
            </div>
          )}

          {/* Actions */}
          {meeting.status === 'scheduled' && (
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button onClick={() => meeting.video_meeting_url ? window.open(meeting.video_meeting_url, '_blank') : null}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📅 Open in Calendar
              </button>
              <button onClick={() => setShowRescheduleModal(true)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                ↺ Reschedule
              </button>
              <button onClick={() => setShowCancelModal(true)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                ✕ Cancel Meeting
              </button>
            </div>
          )}
          {/* Admin Control Center */}
          {isAdminOrHR && (
            <div style={{ marginTop: '24px', padding: '18px', background: 'linear-gradient(135deg, #EDE9FE, #F3F0FF)', borderRadius: '16px', border: '1px solid #DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#5B21B6', margin: 0 }}>Admin Control Center</h3>
                <span style={{ fontSize: '11px', padding: '2px 8px', background: '#7C3AED', color: 'white', borderRadius: '10px', fontWeight: 600 }}>{currentUserRole.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowForceReschedule(!showForceReschedule)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #C4B5FD', background: showForceReschedule ? '#7C3AED' : 'white', color: showForceReschedule ? 'white' : '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Force Reschedule
                </button>
                <button
                  onClick={() => setShowEditParticipants(true)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #C4B5FD', background: 'white', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Manage Participants
                </button>
              </div>
              {showForceReschedule && (
                <div style={{ marginTop: '14px', padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginBottom: '10px' }}>Force Reschedule (Admin Override)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>New Date</label>
                      <input type="date" value={forceRescheduleData.date} onChange={e => setForceRescheduleData(d => ({ ...d, date: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #DDD6FE', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>New Start Time</label>
                      <input type="time" value={forceRescheduleData.startTime} onChange={e => setForceRescheduleData(d => ({ ...d, startTime: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #DDD6FE', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Override Reason</label>
                    <input type="text" placeholder="Required: reason for admin override..." value={forceRescheduleData.reason}
                      onChange={e => setForceRescheduleData(d => ({ ...d, reason: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #DDD6FE', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <button
                    onClick={() => {
                      if (!forceRescheduleData.date || !forceRescheduleData.startTime || !forceRescheduleData.reason) return;
                      setShowRescheduleModal(true);
                      setShowForceReschedule(false);
                    }}
                    style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#7C3AED', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Apply Override
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
