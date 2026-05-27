/**
 * Candidate Meeting Detail Modal
 * View for candidates to manage their interviews
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
  reschedule_requested_at?: string;
  reschedule_request_reason?: string;
}

interface CandidateMeetingDetailProps {
  meeting: Meeting;
  recruiterName: string;
  companyName?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const CandidateMeetingDetail: React.FC<CandidateMeetingDetailProps> = ({
  meeting,
  recruiterName,
  companyName,
  onClose,
  onUpdate,
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleRequest, setRescheduleRequest] = useState({
    reason: '',
    preferred_times: [''],
    note: '',
  });

  const statusColors: Record<string, string> = {
    scheduled: 'bg-green-100 text-green-800',
    reschedule_requested: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meeting.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel meeting');
      }

      alert('Interview cancelled successfully. The recruiter has been notified.');
      setShowCancelModal(false);
      onUpdate();
    } catch (error) {
      alert('Error cancelling interview: ' + error);
    }
  };

  const handleRequestReschedule = async () => {
    if (!rescheduleRequest.reason.trim()) {
      alert('Please provide a reason for rescheduling');
      return;
    }

    // Filter out empty preferred times
    const preferredTimes = rescheduleRequest.preferred_times.filter(t => t.trim() !== '');

    try {
      const response = await fetch(`/api/meetings/${meeting.id}/request-reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reason: rescheduleRequest.reason,
          preferred_times: preferredTimes.length > 0 ? preferredTimes : undefined,
          note: rescheduleRequest.note || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request reschedule');
      }

      alert('Reschedule request sent! The recruiter will review and respond.');
      setShowRescheduleModal(false);
      onUpdate();
    } catch (error) {
      alert('Error requesting reschedule: ' + error);
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to confirm attendance');
      }

      alert('Attendance confirmed!');
      onUpdate();
    } catch (error) {
      alert('Error confirming attendance: ' + error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const addPreferredTime = () => {
    setRescheduleRequest({
      ...rescheduleRequest,
      preferred_times: [...rescheduleRequest.preferred_times, ''],
    });
  };

  const updatePreferredTime = (index: number, value: string) => {
    const newTimes = [...rescheduleRequest.preferred_times];
    newTimes[index] = value;
    setRescheduleRequest({ ...rescheduleRequest, preferred_times: newTimes });
  };

  const removePreferredTime = (index: number) => {
    const newTimes = rescheduleRequest.preferred_times.filter((_, i) => i !== index);
    setRescheduleRequest({ ...rescheduleRequest, preferred_times: newTimes });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Interview with {recruiterName}
              {companyName && ` at ${companyName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Status Badge */}
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[meeting.status]}`}>
              {meeting.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Pending Reschedule Alert */}
          {meeting.status === 'reschedule_requested' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔄</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900">Reschedule Request Pending</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Your reschedule request has been sent to {recruiterName}. You'll be notified when they respond.
                  </p>
                  {meeting.reschedule_request_reason && (
                    <p className="text-sm text-yellow-700 mt-2">
                      <strong>Your reason:</strong> {meeting.reschedule_request_reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Meeting Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-600">Date & Time</p>
              <p className="font-semibold text-gray-900">{formatDateTime(meeting.scheduled_start)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold text-gray-900">{meeting.duration_minutes} minutes</p>
            </div>

            {meeting.video_meeting_url && (
              <div>
                <p className="text-sm text-gray-600">Meeting Link</p>
                <a
                  href={meeting.video_meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  📹 Join Video Call
                </a>
              </div>
            )}

            {meeting.location && (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-900">{meeting.location}</p>
              </div>
            )}

            {meeting.description && (
              <div>
                <p className="text-sm text-gray-600">About this interview</p>
                <p className="text-gray-900">{meeting.description}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {meeting.status === 'scheduled' && (
            <div className="space-y-3">
              <button
                onClick={handleConfirmAttendance}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                ✅ Confirm Attendance
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-gray-200 pt-6">
            <MeetingTimeline meetingId={meeting.id} />
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Cancel Interview</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please let {recruiterName} know why you need to cancel. They'll be notified immediately.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Accepted another offer, Schedule conflict, etc."
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 min-h-[100px]"
                required
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Nevermind
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Request Modal */}
        {showRescheduleModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
              <h3 className="text-lg font-bold mb-4">Request Reschedule</h3>
              <p className="text-sm text-gray-600 mb-4">
                {recruiterName} will review your request and either approve with a new time or keep the original time.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Rescheduling *
                  </label>
                  <textarea
                    value={rescheduleRequest.reason}
                    onChange={(e) => setRescheduleRequest({ ...rescheduleRequest, reason: e.target.value })}
                    placeholder="e.g., Conflict with another interview, Family emergency, etc."
                    className="w-full border border-gray-300 rounded-lg p-3 min-h-[80px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Alternative Times (optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Suggest times that work better for you
                  </p>
                  {rescheduleRequest.preferred_times.map((time, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="datetime-local"
                        value={time}
                        onChange={(e) => updatePreferredTime(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg p-2"
                      />
                      {rescheduleRequest.preferred_times.length > 1 && (
                        <button
                          onClick={() => removePreferredTime(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addPreferredTime}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Another Time
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Note (optional)
                  </label>
                  <textarea
                    value={rescheduleRequest.note}
                    onChange={(e) => setRescheduleRequest({ ...rescheduleRequest, note: e.target.value })}
                    placeholder="Any additional information..."
                    className="w-full border border-gray-300 rounded-lg p-2 min-h-[60px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestReschedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateMeetingDetail;
