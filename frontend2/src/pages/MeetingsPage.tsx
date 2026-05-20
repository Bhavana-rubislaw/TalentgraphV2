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

type ViewMode = 'list' | 'timeline';
type FilterStatus = MeetingStatus | 'all';
type DateRange = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<MeetingAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(false);  // Changed from true to false to show all meetings by default
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
    loadAvailabilitySlots();
  }, [filterStatus, upcomingOnly, dateRange, customStartDate, customEndDate]);

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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filterMeetingsByDateRange = (meetings: Meeting[]) => {
    if (dateRange === 'all') return meetings;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduled_start);
      
      switch (dateRange) {
        case 'today':
          const meetingDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
          return meetingDay.getTime() === today.getTime();
        
        case 'thisWeek':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          return meetingDate >= weekStart && meetingDate < weekEnd;
        
        case 'thisMonth':
          return meetingDate.getMonth() === now.getMonth() && 
                 meetingDate.getFullYear() === now.getFullYear();
        
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return meetingDate.getMonth() === lastMonth.getMonth() && 
                 meetingDate.getFullYear() === lastMonth.getFullYear();
        
        case 'custom':
          if (!customStartDate && !customEndDate) return true;
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(customEndDate) : new Date(8640000000000000); // Max date
          end.setHours(23, 59, 59, 999); // Include entire end date
          return meetingDate >= start && meetingDate <= end;
        
        default:
          return true;
      }
    });
  };

  const groupMeetingsByDate = (meetings: Meeting[]) => {
    const groups: { [key: string]: Meeting[] } = {};
    
    meetings.forEach(meeting => {
      const dateKey = formatDate(meeting.scheduled_start);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
    });
    
    // Sort meetings within each group by time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      );
    });
    
    return groups;
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isPast = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const filteredMeetings = filterMeetingsByDateRange(meetings);
  const groupedMeetings = groupMeetingsByDate(filteredMeetings);

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
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px', 
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0' 
          }}>
            {/* Status Filter */}
            <div>
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

            {/* Date Range Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* View Mode */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                View
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'list' ? '#6d28d9' : '#f1f5f9',
                    color: viewMode === 'list' ? 'white' : '#64748b',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'timeline' ? '#6d28d9' : '#f1f5f9',
                    color: viewMode === 'timeline' ? 'white' : '#64748b',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📍 Timeline
                </button>
              </div>
            </div>

            {/* Upcoming Toggle */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#64748b', 
                marginBottom: '8px' 
              }}>
                Time Filter
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
                {upcomingOnly ? '⏭️ Upcoming' : '📅 All'}
              </button>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              marginTop: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#64748b', 
                  marginBottom: '8px' 
                }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#64748b', 
                  marginBottom: '8px' 
                }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}
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
            {upcomingOnly ? 'Upcoming Meetings' : 'All Meetings'} ({filteredMeetings.length})
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
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
          ) : viewMode === 'timeline' ? (
            // Timeline View
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(groupedMeetings)
                .sort((a, b) => new Date(b[1][0].scheduled_start).getTime() - new Date(a[1][0].scheduled_start).getTime())
                .map(([dateKey, dayMeetings]) => (
                  <div key={dateKey}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: isToday(dayMeetings[0].scheduled_start) ? '#6d28d9' : '#1e293b',
                      }}>
                        {dateKey}
                      </span>
                      {isToday(dayMeetings[0].scheduled_start) && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          background: '#6d28d9',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          Today
                        </span>
                      )}
                      <span style={{
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: 600,
                      }}>
                        {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      paddingLeft: '16px',
                      borderLeft: '3px solid ' + (isToday(dayMeetings[0].scheduled_start) ? '#6d28d9' : '#e2e8f0')
                    }}>
                      {dayMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          onClick={() => handleMeetingClick(meeting)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: '12px',
                            opacity: isPast(meeting.scheduled_start) && meeting.status === 'scheduled' ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6d28d9';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.15)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 700, 
                                  color: '#6d28d9',
                                  minWidth: '60px'
                                }}>
                                  {formatTime(meeting.scheduled_start)}
                                </span>
                                <h3 style={{ 
                                  fontSize: '16px', 
                                  fontWeight: 600, 
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
                                  fontSize: '13px', 
                                  margin: '0 0 8px 72px' 
                                }}>
                                  {meeting.description}
                                </p>
                              )}

                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '12px', 
                                fontSize: '13px',
                                marginLeft: '72px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                  <span>⏱️</span>
                                  <span>{meeting.duration_minutes} min</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                  <span>👥</span>
                                  <span>{meeting.participants.length} participants</span>
                                </div>
                                {meeting.video_meeting_url && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6d28d9' }}>
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
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                color: '#6d28d9',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Details →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // List View
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMeetings.map((meeting) => (
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
