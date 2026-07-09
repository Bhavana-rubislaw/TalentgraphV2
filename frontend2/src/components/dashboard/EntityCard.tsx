import React from 'react';

export interface EntityAction {
  id: string;
  label: string;  
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'success' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export interface EntityBadge {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'info' | 'purple';
}

export interface EntityMeta {
  icon: React.ReactNode;
  value: string;
  label?: string;
}

interface EntityCardProps {
  title: string;
  subtitle: string;
  specialHeader?: React.ReactNode; // For invite badges, match scores, etc.
  dateInfo?: string;
  metadata: EntityMeta[];
  badges?: EntityBadge[];
  actions: EntityAction[];
  className?: string;
  onClick?: () => void; // For making entire card clickable
}

const EntityCard: React.FC<EntityCardProps> = ({
  title,
  subtitle,
  specialHeader,
  dateInfo,
  metadata,
  badges = [],
  actions,
  className = '',
  onClick
}) => {
  return (
    <div 
      className={`job-card-modern ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Special Header (for invites, matches, etc.) */}
      {specialHeader && (
        <div className="job-header-modern special-header">
          {specialHeader}
        </div>
      )}

      {/* Main Header */}
      <div className="job-header-modern">
        <div className="job-title-section">
          <h3 className="job-title-modern">{title}</h3>
          <div className="job-company">{subtitle}</div>
        </div>
        {dateInfo && (
          <div className="entity-date">
            <small>{dateInfo}</small>
          </div>
        )}
      </div>

      {/* Content/Metadata */}
      <div className="job-content-modern">
        {/* Badges */}
        {badges.length > 0 && (
          <div className="entity-badges" style={{ marginBottom: '16px' }}>
            {badges.map((badge, index) => (
              <span 
                key={index} 
                className={`entity-badge ${badge.variant}`}
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  marginRight: '8px',
                  marginBottom: '4px'
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="job-info-section">
          <div className="info-group">
            <div className="info-items" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {metadata.map((meta, index) => (
                <div key={index} className="info-item">
                  <span className="info-icon">
                    {meta.icon}
                  </span>
                  <div>
                    <span className="info-value">{meta.value}</span>
                    {meta.label && <div className="info-label" style={{ fontSize: '12px', color: '#64748b' }}>{meta.label}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="job-actions-modern">
        <div className="action-buttons-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                action.onClick();
              }}
              disabled={action.disabled || action.loading}
              className={`action-btn ${action.variant}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {action.loading ? (
                <svg 
                  className="animate-spin w-4 h-4" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              ) : action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntityCard;