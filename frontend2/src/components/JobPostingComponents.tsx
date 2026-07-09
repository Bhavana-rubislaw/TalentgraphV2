import React from 'react';

// ============ STATUS BADGE ============
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalizedStatus = (status || '').toLowerCase();
  
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#ECFDF5', color: '#059669', label: 'Active' },
    frozen: { bg: '#F3F4F6', color: '#6B7280', label: 'Frozen' },
    reposted: { bg: '#EDE9FE', color: '#7C3AED', label: 'Reposted' },
    cancelled: { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
  };

  const style = styles[normalizedStatus] || styles.active;
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: '6px',
        fontSize,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
    >
      {style.label}
    </span>
  );
};

// ============ SECTION CARD ============
interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, description }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '24px',
        marginBottom: '20px',
      }}
    >
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};

// ============ FORM PROGRESS BAR ============
interface FormProgressBarProps {
  percentage: number;
}

export const FormProgressBar: React.FC<FormProgressBarProps> = ({ percentage }) => {
  return (
    <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
          Form Completion
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#7C3AED' }}>
          {percentage}%
        </span>
      </div>
      <div style={{
        height: '6px',
        backgroundColor: '#E5E7EB',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: '#7C3AED',
          transition: 'width 0.3s ease',
          borderRadius: '3px',
        }} />
      </div>
    </div>
  );
};

// ============ LIFECYCLE ACTION BUTTONS ============
interface LifecycleActionsProps {
  status: string;
  onFreeze: () => void;
  onUnfreeze: () => void;
  onRepost: () => void;
}

export const LifecycleActions: React.FC<LifecycleActionsProps> = ({
  status,
  onFreeze,
  onUnfreeze,
  onRepost,
}) => {
  const normalizedStatus = (status || '').toLowerCase();

  const buttonStyle = {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  };

  if (normalizedStatus === 'active' || normalizedStatus === 'reposted') {
    return (
      <button
        onClick={onFreeze}
        style={{
          ...buttonStyle,
          backgroundColor: '#F3F4F6',
          color: '#374151',
          border: '1px solid #D1D5DB',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E5E7EB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }}
      >
        Freeze Posting
      </button>
    );
  }

  if (normalizedStatus === 'frozen') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onUnfreeze}
          style={{
            ...buttonStyle,
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            flex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#D1FAE5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ECFDF5';
          }}
        >
          Unfreeze
        </button>
        <button
          onClick={onRepost}
          style={{
            ...buttonStyle,
            backgroundColor: '#EDE9FE',
            color: '#7C3AED',
            border: '1px solid #C4B5FD',
            flex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#DDD6FE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#EDE9FE';
          }}
        >
          Repost
        </button>
      </div>
    );
  }

  return null;
};

// ============ JOB PREVIEW PANEL ============
interface JobPreviewPanelProps {
  jobTitle: string;
  location: string;
  worktype: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  payType: string;
  status?: string;
  description: string;
  completionPercentage: number;
  missingFields: string[];
}

export const JobPreviewPanel: React.FC<JobPreviewPanelProps> = ({
  jobTitle,
  location,
  worktype,
  employmentType,
  salaryMin,
  salaryMax,
  currency,
  payType,
  status,
  description,
  completionPercentage,
  missingFields,
}) => {
  const formatSalary = () => {
    const sym = currency === 'usd' ? '$' : currency === 'gbp' ? '£' : '€';
    const suffix = payType === 'hourly' ? '/hr' : '/yr';
    if (!salaryMin && !salaryMax) return 'Not specified';
    if (salaryMin && salaryMax) {
      return `${sym}${Number(salaryMin).toLocaleString()} – ${sym}${Number(salaryMax).toLocaleString()}${suffix}`;
    }
    if (salaryMin) return `From ${sym}${Number(salaryMin).toLocaleString()}${suffix}`;
    return `Up to ${sym}${Number(salaryMax).toLocaleString()}${suffix}`;
  };

  return (
    <div style={{
      position: 'sticky',
      top: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      padding: '20px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
          Live Preview
        </h3>
        <div style={{
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            {jobTitle || 'Untitled Position'}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {status && <StatusBadge status={status} size="sm" />}
            <span style={{ fontSize: '12px', color: '#6B7280', padding: '2px 8px', backgroundColor: '#ffffff', borderRadius: '4px' }}>
              {location || 'No location'}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280', padding: '2px 8px', backgroundColor: '#ffffff', borderRadius: '4px' }}>
              {worktype?.charAt(0).toUpperCase() + worktype?.slice(1) || 'N/A'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#059669', fontWeight: 500, marginBottom: '8px' }}>
            {formatSalary()}
          </p>
          <p style={{
            fontSize: '12px',
            color: '#6B7280',
            lineHeight: '1.5',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {description || 'No description provided'}
          </p>
        </div>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: completionPercentage === 100 ? '#ECFDF5' : '#FEF3C7',
        borderRadius: '8px',
        border: `1px solid ${completionPercentage === 100 ? '#A7F3D0' : '#FDE68A'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
            Completeness
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: completionPercentage === 100 ? '#059669' : '#D97706',
          }}>
            {completionPercentage}%
          </span>
        </div>
        <div style={{
          height: '4px',
          backgroundColor: '#ffffff',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}>
          <div style={{
            height: '100%',
            width: `${completionPercentage}%`,
            backgroundColor: completionPercentage === 100 ? '#059669' : '#D97706',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {missingFields.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
              Missing fields:
            </p>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#6B7280' }}>
              {missingFields.slice(0, 5).map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
              {missingFields.length > 5 && (
                <li>+ {missingFields.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
