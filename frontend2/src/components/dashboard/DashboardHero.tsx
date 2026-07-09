import React from 'react';

export interface StatCardData {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  trend?: string;
  change?: string;
  colorClass?: string;
}

interface DashboardHeroProps {
  userName: string;
  userInitial: string;
  title: string;
  subtitle: string;
  stats: StatCardData[];
}

const DashboardHero: React.FC<DashboardHeroProps> = ({
  userName,
  userInitial,
  title,
  subtitle,
  stats
}) => {
  return (
    <div className="welcome-card-modern candidate-welcome">
      <div className="welcome-content-enhanced">
        <div className="welcome-header">
          <div className="welcome-avatar">
            <div className="user-avatar">{userInitial}</div>
          </div>
          <div className="welcome-text">
            <h1 className="welcome-title-modern">{title}, {userName}</h1>
            <p className="welcome-subtitle-modern">{subtitle}</p>
          </div>
        </div>
      </div>
      
      {/* Enhanced KPI Cards with Icons */}
      <div className="kpi-grid-modern">
        {stats.map((stat, index) => (
          <div key={index} className={`kpi-card-enhanced ${stat.colorClass || ''}`}>
            <div className="kpi-icon">
              {stat.icon}
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{stat.value}</div>
              <div className="kpi-label">{stat.label}</div>
            </div>
            {stat.trend && (
              <div className={`kpi-trend ${stat.trend.includes('+') ? 'positive' : ''}`}>
                {stat.trend}
              </div>
            )}
            {stat.change && (
              <div className="kpi-change">{stat.change}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHero;