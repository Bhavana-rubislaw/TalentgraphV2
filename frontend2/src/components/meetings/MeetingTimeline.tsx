/**
 * Meeting Timeline Component
 * Displays chronological history of all meeting actions
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
  id: number;
  event_type: string;
  message: string;
  created_at: string;
  actor_role?: string;
  metadata_json?: string;
  previous_scheduled_start?: string;
  previous_scheduled_end?: string;
}

interface MeetingTimelineProps {
  meetingId: number;
}

const eventIcons: Record<string, string> = {
  interview_scheduled: '🗓️',
  recruiter_cancelled: '❌',
  candidate_cancelled: '❌',
  candidate_requested_reschedule: '🔄',
  recruiter_rescheduled: '📅',
  recruiter_approved_reschedule: '✅',
  recruiter_rejected_reschedule: '❌',
  reminder_sent: '🔔',
  attendance_confirmed: '✅',
  interview_completed: '✓',
  no_show_marked: '⚠️',
};

const eventColors: Record<string, string> = {
  interview_scheduled: 'bg-blue-100 text-blue-800',
  recruiter_cancelled: 'bg-red-100 text-red-800',
  candidate_cancelled: 'bg-red-100 text-red-800',
  candidate_requested_reschedule: 'bg-yellow-100 text-yellow-800',
  recruiter_rescheduled: 'bg-green-100 text-green-800',
  recruiter_approved_reschedule: 'bg-green-100 text-green-800',
  recruiter_rejected_reschedule: 'bg-red-100 text-red-800',
  reminder_sent: 'bg-gray-100 text-gray-800',
  attendance_confirmed: 'bg-green-100 text-green-800',
  interview_completed: 'bg-green-100 text-green-800',
  no_show_marked: 'bg-orange-100 text-orange-800',
};

export const MeetingTimeline: React.FC<MeetingTimelineProps> = ({ meetingId }) => {
  const [timeline, setTimeline] = React.useState<TimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchTimeline();
  }, [meetingId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meetings/${meetingId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const data = await response.json();
      setTimeline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading timeline: {error}</p>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No timeline events yet</p>
      </div>
    );
  }

  const formatEventMetadata = (event: TimelineEvent) => {
    if (!event.metadata_json) return null;

    try {
      const metadata = JSON.parse(event.metadata_json);
      
      if (event.previous_scheduled_start && event.previous_scheduled_end) {
        return (
          <div className="mt-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Previous:</span>{' '}
              {new Date(event.previous_scheduled_start).toLocaleString()}
            </div>
            {metadata.new_start && (
              <div>
                <span className="font-medium">New:</span>{' '}
                {new Date(metadata.new_start).toLocaleString()}
              </div>
            )}
          </div>
        );
      }

      if (metadata.preferred_times && metadata.preferred_times.length > 0) {
        return (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Preferred times:</span>
            <ul className="list-disc list-inside ml-2">
              {metadata.preferred_times.map((time: string, idx: number) => (
                <li key={idx}>{new Date(time).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        );
      }

      if (metadata.reason) {
        return (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Reason:</span> {metadata.reason}
          </div>
        );
      }
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Meeting Timeline</h3>
      
      <div className="space-y-4">
        {timeline.map((event, index) => {
          const icon = eventIcons[event.event_type] || '📝';
          const colorClass = eventColors[event.event_type] || 'bg-gray-100 text-gray-800';
          
          return (
            <div
              key={event.id}
              className={`border-l-4 ${
                index === 0 ? 'border-blue-500' : 'border-gray-300'
              } pl-4 pb-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-lg`}>
                  {icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {event.message}
                  </p>
                  
                  {formatEventMetadata(event)}
                  
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                    {event.actor_role && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{event.actor_role}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeetingTimeline;
