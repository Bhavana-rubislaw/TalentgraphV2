import React from 'react';

interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const PrimaryButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  style,
  type = 'button',
  icon,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 h-8',
    md: 'text-sm px-4 py-2 h-10',
    lg: 'text-base px-6 py-3 h-12'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`action-btn primary ${sizeClasses[size]} ${className}`}
      style={style}
    >
      {loading ? (
        <svg 
          className="animate-spin inline-block w-4 h-4 mr-2" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ) : icon ? (
        <span className="inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      ) : null}
      {!loading && !icon && children}
    </button>
  );
};

export const SecondaryButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  style,
  type = 'button',
  icon,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 h-8',
    md: 'text-sm px-4 py-2 h-10', 
    lg: 'text-base px-6 py-3 h-12'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`action-btn secondary ${sizeClasses[size]} ${className}`}
      style={style}
    >
      {loading ? (
        <svg 
          className="animate-spin inline-block w-4 h-4 mr-2" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ) : icon ? (
        <span className="inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      ) : null}
      {!loading && !icon && children}
    </button>
  );
};

export const GhostButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  style,
  type = 'button',
  icon,
  size = 'md'
}) => {
  const baseStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary, #64748b)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    ...style
  };

  const sizeStyles = {
    sm: { fontSize: '13px', padding: '4px 8px' },
    md: { fontSize: '14px', padding: '6px 12px' },
    lg: { fontSize: '15px', padding: '8px 16px' }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{ ...baseStyle, ...sizeStyles[size] }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = 'var(--text-primary, #1e293b)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
        }
      }}
    >
      {loading ? (
        <svg 
          className="animate-spin w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ) : icon}
      {children}
    </button>
  );
};

export const SuccessButton: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  style,
  type = 'button',
  icon,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 h-8',
    md: 'text-sm px-4 py-2 h-10',
    lg: 'text-base px-6 py-3 h-12'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`action-btn success ${sizeClasses[size]} ${className}`}
      style={style}
    >
      {loading ? (
        <svg 
          className="animate-spin inline-block w-4 h-4 mr-2" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ) : icon ? (
        <span className="inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      ) : null}
      {!loading && !icon && children}
    </button>
  );
};