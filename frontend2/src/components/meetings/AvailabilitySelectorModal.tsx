/**
 * Availability Selector Modal
 * Allows recruiters to propose multiple interview time slots to candidates
 */

import { useState } from 'react';
import { apiClient } from '../../api/client';
import { ProposeAvailabilitySlotRequest } from '../../types/meeting';

interface AvailabilitySelectorModalProps {
  onClose: () => void;
  onSuccess: () => void;
  candidateUserId?: number;
  jobPostingId?: number;
  matchId?: number;
  applicationId?: number;
}

export function AvailabilitySelectorModal({
  onClose,
  onSuccess,
  candidateUserId,
  jobPostingId,
  matchId,
  applicationId,
}: AvailabilitySelectorModalProps) {
  const [slots, setSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([
    { date: '', startTime: '', endTime: '' },
  ]);
  const [targetUserId, setTargetUserId] = useState(candidateUserId?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSlot = () => {
    setSlots([...slots, { date: '', startTime: '', endTime: '' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetUserId) {
      setError('Please enter a candidate user ID');
      return;
    }

    // Validate all slots
    for (const slot of slots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        setError('Please fill in all slot fields');
        return;
      }
    }

    try {
      setLoading(true);

      // Convert slots to API format
      const proposalSlots: ProposeAvailabilitySlotRequest[] = slots.map(slot => {
        const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
        const endDateTime = new Date(`${slot.date}T${slot.endTime}`);

        return {
          proposed_to_user_id: parseInt(targetUserId),
          slot_start: startDateTime.toISOString(),
          slot_end: endDateTime.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          job_posting_id: jobPostingId,
          match_id: matchId,
          application_id: applicationId,
        };
      });

      await apiClient.proposeAvailabilitySlots(proposalSlots);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to propose time slots');
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
        maxWidth: '600px',
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
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#1e293b',
            margin: 0,
          }}>
            📌 Propose Interview Times
          </h2>
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
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Candidate User ID */}
          {!candidateUserId && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                Candidate User ID *
              </label>
              <input
                type="number"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter candidate user ID"
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
          )}

          {/* Time Slots */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '12px',
            }}>
              Proposed Time Slots *
            </label>

            {slots.map((slot, index) => (
              <div key={index} style={{
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontWeight: 600, color: '#6d28d9', fontSize: '14px' }}>
                    Slot {index + 1}
                  </span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateSlot(index, 'date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSlot}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px dashed #cbd5e1',
                background: 'white',
                color: '#6d28d9',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              + Add Another Slot
            </button>
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
              {loading ? 'Proposing...' : `Propose ${slots.length} Time${slots.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
