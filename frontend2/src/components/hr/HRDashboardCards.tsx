import React from 'react';

// Small shared presentational cards used by both HRJobPostingsTab and
// HRAnalyticsTab (extracted from the former monolithic HRDashboard.tsx).

interface KPICardProps { label: string; value: number; color: string; stripe: string; }

const KPICard: React.FC<KPICardProps> = ({ label, value, color, stripe }) => (
  <div className="hr-kpi-card">
    <span className="hr-kpi-label">{label}</span>
    <span className="hr-kpi-value" style={{ color }}>{value}</span>
    <div className="hr-kpi-stripe" style={{ background: stripe }} />
  </div>
);

interface FunnelRateProps { label: string; value: number; }

const FunnelRate: React.FC<FunnelRateProps> = ({ label, value }) => (
  <div className="hr-funnel-rate">
    <span className="hr-funnel-rate-label">{label}</span>
    <div className="hr-funnel-bar-track">
      <div className="hr-funnel-bar-fill" style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
    </div>
    <span className="hr-funnel-rate-pct">{value ?? 0}%</span>
  </div>
);

export { KPICard, FunnelRate };
