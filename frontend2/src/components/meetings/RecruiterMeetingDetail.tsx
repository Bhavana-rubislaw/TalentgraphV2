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

      alert('Meeting cancelled successfully');
      setShowCancelModal(false);
      onUpdate();
    } catch (error) {
      alert('Error cancelling meeting: ' + error);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.scheduled_start || !rescheduleData.scheduled_end) {
      alert('Please select new date and time');
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meeting.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(rescheduleData),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule meeting');
      }

      alert('Meeting rescheduled successfully');
      setShowRescheduleModal(false);
      onUpdate();
    } catch (error) {
      alert('Error rescheduling meeting: ' + error);
    }
  };

  const handleRespondToRequest = async () => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/respond-reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(responseData),
      });

      if (!response.ok) {
        throw new Error('Failed to respond to reschedule request');
      }

      alert(responseData.approved ? 'Reschedule approved' : 'Reschedule declined');
      setShowRespondModal(false);
      onUpdate();
    } catch (error) {
      alert('Error responding to request: ' + error);
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

  const parsePreferredTimes = () => {
    if (!meeting.reschedule_request_preferred_times) return [];
    try {
      return JSON.parse(meeting.reschedule_request_preferred_times);
    } catch {
      return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{meeting.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Interview with {candidateName}
              {applicationStatus && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                  {applicationStatus}
                </span>
              )}
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

          {/* Reschedule Request Alert */}
          {meeting.status === 'reschedule_requested' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔄</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900">Reschedule Requested</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    {candidateName} requested to reschedule this interview
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    <strong>Reason:</strong> {meeting.reschedule_request_reason}
                  </p>
                  {parsePreferredTimes().length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-yellow-900">Preferred times:</p>
                      <ul className="list-disc list-inside text-sm text-yellow-700 ml-2">
                        {parsePreferredTimes().map((time: string, idx: number) => (
                          <li key={idx}>{formatDateTime(time)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => setShowRespondModal(true)}
                    className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    Review and Respond
                  </button>
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
                  className="text-blue-600 hover:underline font-medium"
                >
                  {meeting.video_meeting_url}
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
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-900">{meeting.description}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {meeting.status === 'scheduled' && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                📅 Reschedule
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
              >
                ❌ Cancel Interview
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
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
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

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Reschedule Interview</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleData.scheduled_start}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, scheduled_start: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleData.scheduled_end}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, scheduled_end: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={rescheduleData.reason}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Respond to Request Modal */}
        {showRespondModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Respond to Reschedule Request</h3>
              
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setResponseData({ ...responseData, approved: true })}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    responseData.approved
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => setResponseData({ ...responseData, approved: false })}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    !responseData.approved
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  ❌ Decline
                </button>
              </div>

              {responseData.approved && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={responseData.scheduled_start}
                      onChange={(e) => setResponseData({ ...responseData, scheduled_start: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={responseData.scheduled_end}
                      onChange={(e) => setResponseData({ ...responseData, scheduled_end: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note to Candidate (optional)
                </label>
                <textarea
                  value={responseData.response_note}
                  onChange={(e) => setResponseData({ ...responseData, response_note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRespondModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespondToRequest}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    responseData.approved
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
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
