/**
 * MeetingSchedulerTab
 * Embedded meeting scheduler for Candidate & Recruiter dashboards.
 * Matches the Meeting Scheduler mockup with calendar widget, filter chips,
 * date-grouped meeting list, and CreateMeeting / AvailabilitySelector modals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { Meeting, MeetingStatus } from '../../types/meeting';
import { CreateMeetingModal, MeetingDetailsModal, AvailabilitySelectorModal } from './index';

type FilterStatus = MeetingStatus | 'all';
type DateRange = 'today' | 'thisWeek' | 'thisMonth' | 'all';

interface MeetingSchedulerTabProps {
  role?: 'candidate' | 'recruiter';
}

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const fmtDayFull = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const initials = (name?: string) =>
  (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];
const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const providerIcon = (provider?: string, url?: string) => {
  const p = (provider || url || '').toLowerCase();
  if (p.includes('zoom')) return { label: 'Zoom', icon: '📹' };
  if (p.includes('teams') || p.includes('microsoft')) return { label: 'Microsoft Teams', icon: '🟦' };
  if (p.includes('meet') || p.includes('google')) return { label: 'Google Meet', icon: '🟢' };
  if (p.includes('jitsi')) return { label: 'Jitsi', icon: '🔵' };
  return { label: 'Video Call', icon: '🎥' };
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  scheduled: { bg: '#EFF6FF', color: '#1E40AF', label: 'Scheduled' },
  completed: { bg: '#F0FDF4', color: '#166534', label: 'Completed' },
  cancelled: { bg: '#FEF2F2', color: '#991B1B', label: 'Cancelled' },
  no_show:   { bg: '#FFFBEB', color: '#92400E', label: 'No Show' },
};

// ─── mini calendar ────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  current: Date;
  selected: Date;
  meetingDates: Date[];
  onMonthChange: (delta: number) => void;
  onDaySelect: (d: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ current, selected, meetingDates, onMonthChange, onDaySelect }) => {
  const year = current.getFullYear();
  const month = current.getMonth();
  const monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: { day: number; currentMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrev - i);
    cells.push({ day: daysInPrev - i, currentMonth: false, date: d });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
  }

  const hasMeeting = (date: Date) =>
    meetingDates.some(md => isSameDay(md, date));

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a2e' }}>{monthName}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => onMonthChange(-1)} style={{ ...calNavBtn }}>‹</button>
          <button onClick={() => onMonthChange(1)} style={{ ...calNavBtn }}>›</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: '6px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', padding: '2px 0' }}>{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {cells.map(({ day, currentMonth, date }, idx) => {
          const isT = isSameDay(date, today);
          const isSel = isSameDay(date, selected);
          const hasMtg = currentMonth && hasMeeting(date);

          let bg = 'transparent';
          let color = currentMonth ? '#1e293b' : '#cbd5e1';
          let fontWeight: number | string = 400;
          let borderRadius = '50%';
          let border = 'none';

          if (isT && !isSel) { bg = '#dbeafe'; color = '#1d4ed8'; fontWeight = 700; border = '2px solid #3b82f6'; }
          if (isSel) { bg = 'linear-gradient(135deg,#7c3aed,#6d28d9)'; color = 'white'; fontWeight = 700; border = 'none'; }

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={() => currentMonth && onDaySelect(date)}
                disabled={!currentMonth}
                style={{
                  width: 30, height: 30,
                  borderRadius,
                  border,
                  background: bg,
                  color,
                  fontWeight,
                  fontSize: '12px',
                  cursor: currentMonth ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {day}
              </button>
              {hasMtg && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c3aed', marginTop: 1 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const calNavBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '6px', border: '1px solid #e2e8f0',
  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: '16px', color: '#64748b', fontWeight: 700,
};

// ─── main component ──────────────────────────────────────────────────────────

export const MeetingSchedulerTab: React.FC<MeetingSchedulerTabProps> = ({ role = 'candidate' }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('thisWeek');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [subTab, setSubTab] = useState<'schedule' | 'upcoming'>('schedule');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (upcomingOnly) params.upcoming_only = true;
      const res = await apiClient.getMeetings(params);
      setMeetings(res.data || []);
    } catch (e) {
      console.error('Failed to load meetings', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, upcomingOnly]);

  const loadSlots = useCallback(async () => {
    try {
      const res = await apiClient.getMyAvailabilitySlots(false);
      setAvailabilitySlots(res.data || []);
    } catch (e) {
      console.error('Failed to load slots', e);
    }
  }, []);

  useEffect(() => { loadMeetings(); loadSlots(); }, [loadMeetings, loadSlots]);

  // ── filter by date range ──────────────────────────────────────────────────
  const applyDateRange = (list: Meeting[]) => {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return list.filter(m => {
      const d = new Date(m.scheduled_start);
      if (dateRange === 'today') return isSameDay(d, today0);
      if (dateRange === 'thisWeek') {
        const wStart = new Date(today0); wStart.setDate(today0.getDate() - today0.getDay());
        const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
        return d >= wStart && d < wEnd;
      }
      if (dateRange === 'thisMonth') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  // ── subTab filtering ──────────────────────────────────────────────────────
  const allFiltered = applyDateRange(meetings);
  const upcomingMeetings = meetings.filter(m => new Date(m.scheduled_start) > new Date() && m.status === 'scheduled');
  const displayMeetings = subTab === 'upcoming' ? upcomingMeetings : allFiltered;

  // ── group by date ─────────────────────────────────────────────────────────
  const grouped: Record<string, Meeting[]> = {};
  [...displayMeetings]
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    .forEach(m => {
      const key = fmtDayFull(m.scheduled_start);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

  // ── calendar meeting dates ────────────────────────────────────────────────
  const meetingDates = meetings.map(m => new Date(m.scheduled_start));

  // ── upcoming calls for sidebar ────────────────────────────────────────────
  const sidebarUpcoming = [...meetings]
    .filter(m => new Date(m.scheduled_start) > new Date() && m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    .slice(0, 3);

  const handleSlotSelect = async (slotId: number) => {
    try {
      await apiClient.selectAvailabilitySlot(slotId, 'Interview Meeting');
      loadMeetings(); loadSlots();
    } catch (e) { console.error('Failed to select slot', e); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 160px)', overflow: 'hidden' }}>

      {/* ── Purple banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 24, height: 24 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
              Meeting Scheduler
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '3px' }}>
              Manage interviews and meetings
            </p>
          </div>
        </div>
        {role !== 'candidate' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '10px 18px', borderRadius: '10px',
                border: 'none',
                background: 'white',
                color: '#7c3aed', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 15, height: 15 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Schedule Meeting
            </button>
          </div>
        )}
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', flexShrink: 0,
      }}>
        {([['schedule', 'Schedule'], ['upcoming', `Upcoming`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: subTab === key ? '#7c3aed' : '#64748b',
              fontWeight: subTab === key ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            {label}
            {key === 'upcoming' && upcomingMeetings.length > 0 && (
              <span style={{
                marginLeft: 6,
                background: '#ede9fe', color: '#7c3aed',
                borderRadius: '10px', padding: '2px 7px',
                fontSize: '11px', fontWeight: 700,
              }}>{upcomingMeetings.length}</span>
            )}
            {subTab === key && (
              <div style={{
                position: 'absolute', bottom: -2, left: 0, right: 0,
                height: 2, background: '#7c3aed', borderRadius: '1px',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Two-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: meeting list panel ── */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Filter chips */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['all', 'scheduled', 'completed', 'cancelled', 'no_show'] as FilterStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: filterStatus === s ? 'none' : '1px solid #e2e8f0',
                  background: filterStatus === s ? '#7c3aed' : 'white',
                  color: filterStatus === s ? 'white' : '#64748b',
                  fontSize: '13px', fontWeight: filterStatus === s ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'All Meetings' : s === 'no_show' ? 'No Show' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Controls bar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Date range selector */}
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DateRange)}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                fontSize: '13px', fontWeight: 500, color: '#374151', background: 'white',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="all">All Time</option>
            </select>

            <div style={{ flex: 1 }} />

            {/* Upcoming Only toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              <div
                onClick={() => setUpcomingOnly(v => !v)}
                style={{
                  width: 36, height: 20, borderRadius: '10px',
                  background: upcomingOnly ? '#7c3aed' : '#e2e8f0',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: upcomingOnly ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </div>
              Upcoming Only
            </label>
          </div>

          {/* Meeting list */}
          <div className="meeting-list-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 0 0' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
                Loading meetings...
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#64748b' }}>No meetings found</div>
                <div style={{ fontSize: '13px' }}>Try a different filter or schedule a new meeting</div>
              </div>
            ) : (
              <>
              {Object.entries(grouped).map(([dateKey, dayMeetings]) => (
                <div key={dateKey}>
                  {/* Date header */}
                  <div style={{
                    padding: '12px 20px 8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{dateKey}</span>
                    {isToday(dayMeetings[0].scheduled_start) && (
                      <span style={{
                        background: '#7c3aed', color: 'white',
                        borderRadius: '6px', padding: '2px 8px',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
                      }}>TODAY</span>
                    )}
                  </div>

                  {/* Meeting cards */}
                  {dayMeetings.map(meeting => {
                    const st = STATUS_STYLES[meeting.status] || STATUS_STYLES.scheduled;
                    const pv = providerIcon(meeting.video_provider, meeting.video_meeting_url);
                    const parts = meeting.participants || [];
                    return (
                      <div
                        key={meeting.id}
                        style={{
                          margin: '0 16px 12px',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#fafbff',
                          display: 'grid',
                          gridTemplateColumns: '68px 1fr auto',
                          gap: '12px',
                          alignItems: 'start',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#a78bfa'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(124,58,237,0.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      >
                        {/* Time column */}
                        <div style={{ textAlign: 'right', paddingTop: '2px' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{fmtTime(meeting.scheduled_start)}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{meeting.duration_minutes} min</div>
                        </div>

                        {/* Content column */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{meeting.title}</span>
                          </div>

                          {/* Avatars + platform */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {/* Participant avatars */}
                            <div style={{ display: 'flex' }}>
                              {parts.slice(0, 3).map((p, i) => (
                                <div
                                  key={i}
                                  title={p.participant_name || `User ${p.user_id}`}
                                  style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: avatarColor(i),
                                    color: 'white', fontSize: '10px', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid white',
                                    marginLeft: i > 0 ? -8 : 0,
                                    zIndex: 3 - i,
                                    position: 'relative',
                                  }}
                                >
                                  {initials(p.participant_name)}
                                </div>
                              ))}
                            </div>

                            {/* Platform chip */}
                            {(meeting.video_meeting_url || meeting.video_provider) && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 10px', borderRadius: '6px',
                                background: '#f1f5f9', fontSize: '12px', color: '#475569', fontWeight: 500,
                              }}>
                                {pv.icon} {pv.label}
                              </span>
                            )}

                            {/* Copy link icon */}
                            {meeting.video_meeting_url && (
                              <button
                                title="Copy meeting link"
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(meeting.video_meeting_url!); }}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#94a3b8', display: 'flex', padding: '0',
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Action column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px',
                            background: st.bg, color: st.color,
                            fontSize: '11px', fontWeight: 700,
                            marginBottom: '4px', whiteSpace: 'nowrap',
                          }}>
                            {st.label}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting); }}
                            style={{
                              padding: '6px 12px', borderRadius: '7px',
                              border: '1px solid #e2e8f0', background: 'white',
                              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              color: '#374151', whiteSpace: 'nowrap',
                            }}
                          >
                            View Details
                          </button>
                          {meeting.video_meeting_url && meeting.status === 'scheduled' && (
                            <a
                              href={meeting.video_meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px', borderRadius: '7px',
                                border: 'none',
                                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                color: 'white', textDecoration: 'none',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(109,40,217,0.3)',
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                              </svg>
                              Join Meeting
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* ── Scroll footer ── */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {Object.values(grouped).flat().length} meeting{Object.values(grouped).flat().length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => { const el = document.querySelector('.meeting-list-scroll'); if (el) el.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '6px',
                    border: '1px solid #e2e8f0', background: 'white',
                    fontSize: '11px', fontWeight: 600, color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                  Back to top
                </button>
              </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: calendar + upcoming calls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

          {/* Mini calendar */}
          <MiniCalendar
            current={calendarMonth}
            selected={selectedCalDay}
            meetingDates={meetingDates}
            onMonthChange={delta => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + delta, 1))}
            onDaySelect={day => setSelectedCalDay(day)}
          />

          {/* Availability slots */}
          {availabilitySlots.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>
                ⏰ Proposed Times
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                {availabilitySlots.length} slot{availabilitySlots.length !== 1 ? 's' : ''} available
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availabilitySlots.slice(0, 3).map(slot => (
                  <div key={slot.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ede9fe', background: '#faf5ff' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>
                      {fmtShortDate(slot.slot_start)} · {fmtTime(slot.slot_start)}
                    </div>
                    {slot.proposed_by_user_id && (
                      <button
                        onClick={() => handleSlotSelect(slot.id)}
                        style={{
                          marginTop: '6px', padding: '4px 10px', borderRadius: '6px',
                          background: '#7c3aed', color: 'white', border: 'none',
                          fontSize: '11px', fontWeight: 700, cursor: 'pointer', width: '100%',
                        }}
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Calls */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>
              Upcoming Calls
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
              Next scheduled meetings
            </div>
            {sidebarUpcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '13px' }}>
                No upcoming meetings
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sidebarUpcoming.map(m => {
                  const d = new Date(m.scheduled_start);
                  const monthAbbr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const dayNum = d.getDate();
                  const parts = m.participants || [];
                  const otherParticipant = parts.find(p => p.participant_name);
                  const pv = providerIcon(m.video_provider, m.video_meeting_url);

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeeting(m)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px',
                        border: '1px solid #f1f5f9', cursor: 'pointer',
                        transition: 'all 0.15s', background: 'white',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#a78bfa'; (e.currentTarget as HTMLElement).style.background = '#faf5ff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                    >
                      {/* Date block */}
                      <div style={{
                        width: 38, height: 38, borderRadius: '8px',
                        background: '#ede9fe', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.5px' }}>{monthAbbr}</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{dayNum}</span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {otherParticipant?.participant_name || m.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {fmtTime(m.scheduled_start)} · {m.duration_minutes} min
                        </div>
                      </div>

                      {/* Video icon */}
                      {m.video_meeting_url && (
                        <span title={pv.label} style={{ fontSize: '14px', flexShrink: 0 }}>{pv.icon}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadMeetings(); }}
        />
      )}

      {showAvailabilityModal && (
        <AvailabilitySelectorModal
          onClose={() => setShowAvailabilityModal(false)}
          onSuccess={() => { setShowAvailabilityModal(false); loadSlots(); }}
        />
      )}

      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={() => { setSelectedMeeting(null); loadMeetings(); }}
        />
      )}
    </div>
  );
};
