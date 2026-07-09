import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
  isActive?: boolean;
  special?: 'ai' | 'new';
}

export interface NavSection {
  title: string;
  description: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  title: string;
  subtitle: string;
  sections: NavSection[];
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  title,
  subtitle,
  sections
}) => {
  return (
    <div className="sidebar">
      <div style={{
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--gray-200)',
        marginBottom: 'var(--space-6)'
      }}>
        <h3 style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--gray-700)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '0 0 var(--space-2) 0'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          margin: '0',
          lineHeight: 'var(--leading-normal)'
        }}>
          {subtitle}
        </p>
      </div>
      
      <nav className="sidebar-nav">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-3)',
              paddingLeft: 'var(--space-6)'
            }}>
              {section.title}
            </div>
            
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${item.isActive ? 'active' : ''}`}
                onClick={item.onClick}
              >
                <span className="nav-icon">
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                
                {item.special === 'ai' && (
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    background: 'linear-gradient(90deg, var(--accent-primary), #8b5cf6)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 'var(--font-semibold)'
                  }}>
                    AI
                  </span>
                )}
                
                {item.badge && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default DashboardSidebar;