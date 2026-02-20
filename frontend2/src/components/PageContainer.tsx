import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--gradient-light)',
        backgroundAttachment: 'fixed',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {title && (
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1
              style={{
                background: 'var(--gradient-primary)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '12px',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
