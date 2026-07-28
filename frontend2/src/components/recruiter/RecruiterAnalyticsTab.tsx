import React from 'react';
import { KPICard } from '../hr/HRDashboardCards';

const STATUS_COLOURS: Record<string, string> = {
  applied:    '#2563eb',
  shortlisted:'#06b6d4',
  interview:  '#f59e0b',
  selected:   '#10b981',
  rejected:   '#ef4444',
};

interface RecruiterAnalyticsTabProps {
  analyticsLoading: boolean;
  analyticsRange: number;
  setAnalyticsRange: (value: number) => void;
  recruiterAnalytics: any;
}

const RecruiterAnalyticsTab: React.FC<RecruiterAnalyticsTabProps> = ({
  analyticsLoading, analyticsRange, setAnalyticsRange, recruiterAnalytics,
}) => (
  <div className="content-panel-horizontal hr-tab-panel">
    <div className="hr-panel-header">
      <div>
        <h2 className="hr-panel-title">My Sourcing Analytics</h2>
        <p className="hr-panel-subtitle">Your job postings, applications received, and candidate response metrics.</p>
      </div>
      <select
        className="hr-range-select"
        value={analyticsRange}
        onChange={e => setAnalyticsRange(Number(e.target.value))}
      >
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
        <option value={365}>Last 12 months</option>
      </select>
    </div>

    {analyticsLoading ? (
      <div className="hr-loading"><span className="hr-loading-spinner" />Loading analytics…</div>
    ) : !recruiterAnalytics ? (
      <div className="hr-empty"><p className="hr-empty-text">No analytics data available.</p></div>
    ) : (
      <>
        {/* KPI Grid */}
        <div className="hr-kpi-grid">
          <KPICard label="Active Jobs"          value={recruiterAnalytics.total_active_jobs ?? 0}            color="#2563eb" stripe="#2563eb" />
          <KPICard label="Applications"         value={recruiterAnalytics.total_applications_received ?? 0}  color="#3b82f6" stripe="#3b82f6" />
          <KPICard label="Candidate Likes"      value={recruiterAnalytics.candidate_likes ?? 0}               color="#10b981" stripe="#10b981" />
          <KPICard label="Candidate Passes"     value={recruiterAnalytics.candidate_passes ?? 0}              color="#94a3b8" stripe="#94a3b8" />
        </div>

        {/* Application Status Breakdown */}
        {recruiterAnalytics.application_status_breakdown && (
          <div className="hr-analytics-panel">
            <h3 className="hr-analytics-panel-title">Application Status Breakdown</h3>
            <div className="hr-status-chips">
              {Object.entries(recruiterAnalytics.application_status_breakdown as Record<string, number>).map(([status, count]) => (
                <div key={status} className="hr-status-chip">
                  <span className="hr-status-chip-dot" style={{ background: STATUS_COLOURS[status] || '#94a3b8' }} />
                  <span className="hr-status-chip-name">{status}</span>
                  <span className="hr-status-chip-count">{count}</span>
                </div>
              ))}
              {Object.keys(recruiterAnalytics.application_status_breakdown).length === 0 && (
                <p className="hr-empty-text">No applications in this period.</p>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

export default RecruiterAnalyticsTab;
