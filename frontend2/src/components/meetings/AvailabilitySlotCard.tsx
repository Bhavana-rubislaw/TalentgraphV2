/**
 * Availability Slot Card Component
 * Displays a proposed interview time slot that can be selected
 */

import { MeetingAvailabilitySlot } from '../../types/meeting';

interface AvailabilitySlotCardProps {
  slot: MeetingAvailabilitySlot;
  onSelect: (slotId: number) => void;
}

export function AvailabilitySlotCard({ slot, onSelect }: AvailabilitySlotCardProps) {
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  };

  const start = formatDateTime(slot.slot_start);
  const end = formatDateTime(slot.slot_end);
  const duration = Math.round((new Date(slot.slot_end).getTime() - new Date(slot.slot_start).getTime()) / (1000 * 60));

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#6d28d9';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(109, 40, 217, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* Day of Week */}
      <div style={{
        fontSize: '12px',
        fontWeight: 700,
        color: '#6d28d9',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '8px',
      }}>
        {start.dayOfWeek}
      </div>

      {/* Date */}
      <div style={{
        fontSize: '18px',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: '12px',
      }}>
        {start.date}
      </div>

      {/* Time Range */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        padding: '12px',
        background: 'white',
        borderRadius: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>🕐</span>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            {start.time} - {end.time}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {duration} minutes · {slot.timezone}
          </div>
        </div>
      </div>

      {/* Select Button */}
      <button
        onClick={() => onSelect(slot.id)}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
          color: 'white',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        ✅ Select This Time
      </button>
    </div>
  );
}
