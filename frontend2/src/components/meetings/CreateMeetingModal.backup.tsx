/**
 * Create Meeting Modal
 * Direct meeting scheduling with participant selection
 */

import { useState } from 'react';
import { apiClient } from '../../api/client';
import { MeetingType, CreateMeetingRequest } from '../../types/meeting';

interface CreateMeetingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultParticipantId?: number;
  jobPostingId?: number;
  matchId?: number;
  applicationId?: number;
}

export function CreateMeetingModal({
  onClose,
  onSuccess,
  defaultParticipantId,
  jobPostingId,
  matchId,
  applicationId,
}: CreateMeetingModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingType: 'interview' as MeetingType,
    date: '',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    participantIds: defaultParticipantId ? [defaultParticipantId.toString()] : [''],
    location: '',
    videoMeetingUrl: '',
    videoProvider: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const addParticipant = () => {
    setFormData({
      ...formData,
      participantIds: [...formData.participantIds, ''],
    });
  };

  const updateParticipant = (index: number, value: string) => {
    const newIds = [...formData.participantIds];
    newIds[index] = value;
    setFormData({ ...formData, participantIds: newIds });
  };

  const removeParticipant = (index: number) => {
    setFormData({
      ...formData,
      participantIds: formData.participantIds.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    const validParticipantIds = formData.participantIds
      .filter(id => id.trim() !== '')
      .map(id => parseInt(id));

    if (validParticipantIds.length === 0) {
      setError('Please add at least one participant');
      return;
    }

    try {
      setLoading(true);

      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const meetingData: CreateMeetingRequest = {
        title: formData.title,
        description: formData.description || undefined,
        meeting_type: formData.meetingType,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        duration_minutes: formData.durationMinutes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        participant_user_ids: validParticipantIds,
        job_posting_id: jobPostingId,
        match_id: matchId,
        application_id: applicationId,
        location: formData.location || undefined,
        video_meeting_url: formData.videoMeetingUrl || undefined,
        video_provider: formData.videoProvider || undefined,
      };

      await apiClient.createMeeting(meetingData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

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
          alignItems: 'center',
          background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'white',
            margin: 0,
          }}>
            ➕ Schedule New Meeting
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Technical Interview"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add meeting details, agenda, or preparation notes..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Meeting Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Meeting Type *
            </label>
            <select
              value={formData.meetingType}
              onChange={(e) => handleChange('meetingType', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            >
              <option value="interview">Interview</option>
              <option value="screening">Screening</option>
              <option value="follow_up">Follow-up</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                End Time *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                required
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

          {/* Participants */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Participants (User IDs) *
            </label>

            {formData.participantIds.map((id, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number"
                  value={id}
                  onChange={(e) => updateParticipant(index, e.target.value)}
                  placeholder="Enter user ID"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                />
                {formData.participantIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#fee2e2',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addParticipant}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px dashed #cbd5e1',
                background: 'white',
                color: '#6d28d9',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              + Add Participant
            </button>
          </div>

          {/* Location */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Conference Room A or Virtual"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Video Meeting URL */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Video Meeting URL
            </label>
            <input
              type="url"
              value={formData.videoMeetingUrl}
              onChange={(e) => handleChange('videoMeetingUrl', e.target.value)}
              placeholder="https://zoom.us/j/... or Teams link"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: !loading ? '0 4px 12px rgba(109, 40, 217, 0.3)' : 'none',
              }}
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
