/**
 * Recruiter Meeting Detail Modal
 * Comprehensive view for recruiters to manage interviews
 */

import React, { useState } from 'react';
import MeetingTimeline from './MeetingTimeline';

interface Meeting {
  id: number;
  title: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone: string;
  video_meeting_url?: string;
  location?: string;
  description?: string;
  organizer_user_id: number;
  application_id?: number;
  reschedule_requested_at?: string;
  reschedule_requested_by_user_id?: number;
  reschedule_request_reason?: string;
  reschedule_request_preferred_times?: string;
  participants: Array<{
    user_id: number;
    has_confirmed: boolean;
  }>;
}

interface RecruiterMeetingDetailProps {
  meeting: Meeting;
  candidateName: string;
  applicationStatus?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const RecruiterMeetingDetail: React.FC<RecruiterMeetingDetailProps> = ({
  meeting,
  candidateName,
  applicationStatus,
  onClose,
  onUpdate,
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({
    scheduled_start: '',
    scheduled_end: '',
    timezone: meeting.timezone,
    reason: '',
  });
  const [responseData, setResponseData] = useState({
    approved: true,
    scheduled_start: '',
    scheduled_end: '',
    timezone: meeting.timezone,
    response_note: '',
  });

  const statusStyle: Record<string, { background: string; color: string }> = {
    scheduled:             { background: '#DCFCE7', color: '#15803D' },
    reschedule_requested:  { background: '#FEF9C3', color: '#B45309' },
    cancelled:             { background: '#FEE2E2', color: '#B91C1C' },
    completed:             { background: '#DBEAFE', color: '#1D4ED8' },
  };

  const currentUserRole = localStorage.getItem('role') || '';
  const isAdminOrHR = currentUserRole === 'admin' || currentUserRole === 'hr';

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  };

  const parsePreferredTimes = () => {
    if (!meeting.reschedule_request_preferred_times) return [];
    try { return JSON.parse(meeting.reschedule_request_preferred_times); }
    catch { return []; }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { alert('Please provide a cancellation reason'); return; }
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });
      if (!response.ok) throw new Error('Failed to cancel meeting');
      alert('Meeting cancelled successfully');
      setShowCancelModal(false);
      onUpdate();
    } catch (error) { alert('Error cancelling meeting: ' + error); }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.scheduled_start || !rescheduleData.scheduled_end) { alert('Please select new date and time'); return; }
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(rescheduleData),
      });
      if (!response.ok) throw new Error('Failed to reschedule meeting');
      alert('Meeting rescheduled successfully');
      setShowRescheduleModal(false);
      onUpdate();
    } catch (error) { alert('Error rescheduling meeting: ' + error); }
  };

  const handleRespondToRequest = async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/respond-reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(responseData),
      });
      if (!response.ok) throw new Error('Failed to respond to reschedule request');
      alert(responseData.approved ? 'Reschedule approved' : 'Reschedule declined');
      setShowRespondModal(false);
      onUpdate();
    } catch (error) { alert('Error responding to request: ' + error); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0px 4px 12px rgba(0,0,0,0.08)', border: '1px solid #E4E7EC', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #E4E7EC', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D2939', margin: 0 }}>{meeting.title}</h2>
            <p style={{ fontSize: '13px', color: '#667085', marginTop: '4px', marginBottom: 0 }}>
              Interview with <strong>{candidateName}</strong>
              {applicationStatus && (
                <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#DBEAFE', color: '#1D4ED8', fontSize: '11px', borderRadius: '10px', fontWeight: 600 }}>
                  {applicationStatus}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #E4E7EC', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667085' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Badge */}
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, ...(statusStyle[meeting.status] || { background: '#F3F4F6', color: '#374151' }) }}>
              {meeting.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          {/* Reschedule Request Alert */}
          {meeting.status === 'reschedule_requested' && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '22px' }}>ðŸ”„</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 700, color: '#78350F', margin: '0 0 4px' }}>Reschedule Requested</h4>
                  <p style={{ fontSize: '13px', color: '#92400E', margin: '0 0 6px' }}>{candidateName} requested to reschedule this interview</p>
                  <p style={{ fontSize: '13px', color: '#78350F', margin: '0 0 8px' }}><strong>Reason:</strong> {meeting.reschedule_request_reason}</p>
                  {parsePreferredTimes().length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#78350F', margin: '0 0 4px' }}>Preferred times:</p>
                      <ul style={{ paddingLeft: '18px', margin: 0 }}>
                        {parsePreferredTimes().map((time: string, idx: number) => (
                          <li key={idx} style={{ fontSize: '13px', color: '#92400E' }}>{formatDateTime(time)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setShowRespondModal(true)}
                    style={{ padding: '8px 16px', background: '#D97706', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Review and Respond
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Details Card */}
          <div style={{ background: '#F5F6FA', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 2px' }}>Date &amp; Time</p>
              <p style={{ fontWeight: 600, color: '#1D2939', margin: 0 }}>{formatDateTime(meeting.scheduled_start)}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 2px' }}>Duration</p>
              <p style={{ fontWeight: 600, color: '#1D2939', margin: 0 }}>{meeting.duration_minutes} minutes</p>
            </div>
            {meeting.video_meeting_url && (
              <div>
                <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 2px' }}>Meeting Link</p>
                <a href={meeting.video_meeting_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#7C3AED', fontWeight: 500, fontSize: '14px', textDecoration: 'none' }}>
                  {meeting.video_meeting_url}
                </a>
              </div>
            )}
            {meeting.location && (
              <div>
                <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 2px' }}>Location</p>
                <p style={{ fontWeight: 600, color: '#1D2939', margin: 0 }}>{meeting.location}</p>
              </div>
            )}
            {meeting.description && (
              <div>
                <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 2px' }}>Description</p>
                <p style={{ color: '#1D2939', margin: 0 }}>{meeting.description}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {meeting.status === 'scheduled' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowRescheduleModal(true)}
                style={{ flex: 1, padding: '10px 16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                ðŸ“… Reschedule
              </button>
              <button onClick={() => setShowCancelModal(true)}
                style={{ flex: 1, padding: '10px 16px', background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                âŒ Cancel Interview
              </button>
            </div>
          )}

          {/* Admin Control Center */}
          {isAdminOrHR && (
            <div style={{ padding: '18px', background: 'linear-gradient(135deg, #EDE9FE, #F3F0FF)', borderRadius: '16px', border: '1px solid #DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#5B21B6', margin: 0 }}>Admin Control Center</h3>
                <span style={{ fontSize: '11px', padding: '2px 8px', background: '#7C3AED', color: 'white', borderRadius: '10px', fontWeight: 600 }}>{currentUserRole.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowRescheduleModal(true)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #C4B5FD', background: 'white', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Force Reschedule
                </button>
                <button style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #C4B5FD', background: 'white', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Manage Participants
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
            <MeetingTimeline meetingId={meeting.id} />
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D2939', margin: '0 0 16px' }}>Cancel Interview</h3>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
                style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '10px', padding: '12px', marginBottom: '16px', minHeight: '100px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowCancelModal(false)}
                  style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Nevermind
                </button>
                <button onClick={handleCancel}
                  style={{ flex: 1, padding: '10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D2939', margin: '0 0 16px' }}>Reschedule Interview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>New Start Time</label>
                  <input type="datetime-local" value={rescheduleData.scheduled_start}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, scheduled_start: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>New End Time</label>
                  <input type="datetime-local" value={rescheduleData.scheduled_end}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, scheduled_end: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>Reason (optional)</label>
                  <textarea value={rescheduleData.reason}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} rows={2} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowRescheduleModal(false)}
                  style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleReschedule}
                  style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Respond to Request Modal */}
        {showRespondModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1D2939', margin: '0 0 16px' }}>Respond to Reschedule Request</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setResponseData({ ...responseData, approved: true })}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: responseData.approved ? '#059669' : '#F3F4F6', color: responseData.approved ? 'white' : '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  âœ… Approve
                </button>
                <button onClick={() => setResponseData({ ...responseData, approved: false })}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: !responseData.approved ? '#EF4444' : '#F3F4F6', color: !responseData.approved ? 'white' : '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  âŒ Decline
                </button>
              </div>
              {responseData.approved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>New Start Time *</label>
                    <input type="datetime-local" value={responseData.scheduled_start}
                      onChange={(e) => setResponseData({ ...responseData, scheduled_start: e.target.value })}
                      style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>New End Time *</label>
                    <input type="datetime-local" value={responseData.scheduled_end}
                      onChange={(e) => setResponseData({ ...responseData, scheduled_end: e.target.value })}
                      style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} required />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#667085', display: 'block', marginBottom: '4px' }}>Note to Candidate (optional)</label>
                <textarea value={responseData.response_note}
                  onChange={(e) => setResponseData({ ...responseData, response_note: e.target.value })}
                  style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }} rows={2} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowRespondModal(false)}
                  style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleRespondToRequest}
                  style={{ flex: 1, padding: '10px', background: responseData.approved ? '#059669' : '#EF4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Send Response
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default RecruiterMeetingDetail;
