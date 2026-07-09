import React from 'react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: EmptyStateAction[];
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actions = [],
  className = ''
}) => {
  return (
    <div className={`empty-state-modern ${className}`}>
      <div className="empty-icon-professional">
        {icon}
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-subtitle">{subtitle}</p>
      
      {actions.length > 0 && (
        <div className="empty-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`action-btn ${action.variant}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmptyState;