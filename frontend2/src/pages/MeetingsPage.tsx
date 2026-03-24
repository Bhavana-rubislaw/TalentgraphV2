/**
 * Meeting Management Page
 * Comprehensive view of all meetings with filtering, creation, and management
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Meeting, MeetingStatus, MeetingAvailabilitySlot } from '../types/meeting';
import {
  AvailabilitySelectorModal,
  CreateMeetingModal,
  MeetingDetailsModal,
  AvailabilitySlotCard,
} from '../components/meetings';

type ViewMode = 'list' | 'calendar';
type FilterStatus = MeetingStatus | 'all';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<MeetingAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
    loadAvailabilitySlots();
  }, [filterStatus, upcomingOnly]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const params: any = { upcoming_only: upcomingOnly };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await apiClient.getMeetings(params);
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailabilitySlots = async () => {
    try {
      const response = await apiClient.getMyAvailabilitySlots(false);
      setAvailabilitySlots(response.data);
    } catch (error) {
      console.error('Failed to load availability slots:', error);
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleSlotSelect = async (slotId: number) => {
    try {
      await apiClient.selectAvailabilitySlot(slotId, 'Interview Meeting');
      loadMeetings();
      loadAvailabilitySlots();
    } catch (error) {
      console.error('Failed to select slot:', error);
      alert('Failed to select time slot');
    }
  };

  const getStatusBadge = (status: MeetingStatus) => {
    const configs = {
      scheduled: { bg: '#dbeafe', color: '#1e40af', label: 'Scheduled' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
      no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
    };
    const config = configs[status];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}>
        {config.label}
      </span>
    );
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '32px 16px' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '32px', 
          marginBottom: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 800, 
                color: '#1e293b', 
                margin: '0 0 8px 0' 
              }}>
                📅 Meeting Scheduler
              </h1>
              <p style={{ color: '#64748b', margin: 0 }}>
                Manage your interviews and meetings
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowAvailabilityModal(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '2px solid #6d28d9',
                  background: 'white',
                  color: '#6d28d9',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📌 Propose Times
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(109, 40, 217, 0.3)',
                }}
              >
                ➕ Schedule Meeting
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0' 
          }}>
            {/* Status Filter */}
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Meetings</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            {/* View Mode */}
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                View
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'list' ? '#6d28d9' : '#f1f5f9',
                    color: viewMode === 'list' ? 'white' : '#64748b',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'calendar' ? '#6d28d9' : '#f1f5f9',
                    color: viewMode === 'calendar' ? 'white' : '#64748b',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  📅 Calendar
                </button>
              </div>
            </div>

            {/* Upcoming Toggle */}
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                Time Range
              </label>
              <button
                onClick={() => setUpcomingOnly(!upcomingOnly)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: upcomingOnly ? '#dbeafe' : 'white',
                  color: upcomingOnly ? '#1e40af' : '#64748b',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {upcomingOnly ? '⏭️ Upcoming Only' : '📅 All Time'}
              </button>
            </div>
          </div>
        </div>

        {/* Availability Slots Section */}
        {availabilitySlots.length > 0 && (
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '24px', 
            marginBottom: '24px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              color: '#1e293b', 
              margin: '0 0 16px 0' 
            }}>
              ⏰ Proposed Interview Times ({availabilitySlots.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Select a time slot to confirm your interview
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '16px' 
            }}>
              {availabilitySlots.map((slot) => (
                <AvailabilitySlotCard
                  key={slot.id}
                  slot={slot}
                  onSelect={handleSlotSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Meetings List */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: '#1e293b', 
            margin: '0 0 20px 0' 
          }}>
            {upcomingOnly ? 'Upcoming Meetings' : 'All Meetings'} ({meetings.length})
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading meetings...
            </div>
          ) : meetings.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#94a3b8' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                No meetings found
              </div>
              <div style={{ fontSize: '14px' }}>
                {upcomingOnly ? 'No upcoming meetings scheduled' : 'No meetings match your filters'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => handleMeetingClick(meeting)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6d28d9';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ 
                          fontSize: '18px', 
                          fontWeight: 700, 
                          color: '#1e293b', 
                          margin: 0 
                        }}>
                          {meeting.title}
                        </h3>
                        {getStatusBadge(meeting.status)}
                      </div>
                      
                      {meeting.description && (
                        <p style={{ 
                          color: '#64748b', 
                          fontSize: '14px', 
                          margin: '0 0 12px 0' 
                        }}>
                          {meeting.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                          <span>📅</span>
                          <span>{formatDateTime(meeting.scheduled_start)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                          <span>⏱️</span>
                          <span>{meeting.duration_minutes} min</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                          <span>👥</span>
                          <span>{meeting.participants.length} participants</span>
                        </div>
                        {meeting.video_meeting_url && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6d28d9' }}>
                            <span>🎥</span>
                            <span>Video call</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingClick(meeting);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        color: '#6d28d9',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMeetings();
          }}
        />
      )}

      {showAvailabilityModal && (
        <AvailabilitySelectorModal
          onClose={() => setShowAvailabilityModal(false)}
          onSuccess={() => {
            setShowAvailabilityModal(false);
            loadAvailabilitySlots();
          }}
        />
      )}

      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={() => {
            setSelectedMeeting(null);
            loadMeetings();
          }}
        />
      )}
    </div>
  );
}
