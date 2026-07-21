import React from 'react';
import { KPICard, FunnelRate } from './HRDashboardCards';

const STATUS_COLOURS: Record<string, string> = {
  draft:    '#f59e0b',
  active:   '#10b981',
  frozen:   '#6366f1',
  cancelled:'#ef4444',
  closed:   '#6b7280',
};

interface HRAnalyticsTabProps {
  analyticsLoading: boolean;
  analyticsRange: number;
  setAnalyticsRange: (value: number) => void;
  hrAnalytics: any;
}

const HRAnalyticsTab: React.FC<HRAnalyticsTabProps> = ({
  analyticsLoading, analyticsRange, setAnalyticsRange, hrAnalytics,
}) => (
    <div className="content-panel-horizontal hr-tab-panel">
      <div className="hr-panel-header">
        <div>
          <h2 className="hr-panel-title">Company-Wide Analytics</h2>
          <p className="hr-panel-subtitle">Hiring funnel, job performance, and team productivity metrics.</p>
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
      ) : !hrAnalytics ? (
        <div className="hr-empty"><p className="hr-empty-text">No analytics data available.</p></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="hr-kpi-grid">
            <KPICard label="Total Jobs"         value={hrAnalytics.total_jobs ?? 0}                          color="#6366f1" stripe="#6366f1" />
            <KPICard label="Pending Approval"   value={hrAnalytics.jobs_pending_approval ?? 0}               color="#f59e0b" stripe="#f59e0b" />
            <KPICard label="Applications"       value={hrAnalytics.hiring_funnel?.total_applications ?? 0}   color="#3b82f6" stripe="#3b82f6" />
            <KPICard label="Interviews"         value={hrAnalytics.hiring_funnel?.scheduled_interviews ?? 0} color="#3b82f6" stripe="#3b82f6" />
            <KPICard label="Shortlisted"        value={hrAnalytics.hiring_funnel?.shortlisted ?? 0}          color="#06b6d4" stripe="#06b6d4" />
            <KPICard label="Selected"           value={hrAnalytics.hiring_funnel?.selected ?? 0}             color="#10b981" stripe="#10b981" />
            <KPICard label="Meetings Scheduled" value={hrAnalytics.meetings_scheduled ?? 0}                  color="#f97316" stripe="#f97316" />
          </div>

          {/* Job Status Breakdown */}
          {hrAnalytics.job_status_breakdown && (
            <div className="hr-analytics-panel">
              <h3 className="hr-analytics-panel-title">Job Status Breakdown</h3>
              <div className="hr-status-chips">
                {Object.entries(hrAnalytics.job_status_breakdown as Record<string, number>).map(([status, count]) => (
                  <div key={status} className="hr-status-chip">
                    <span className="hr-status-chip-dot" style={{ background: STATUS_COLOURS[status] || '#94a3b8' }} />
                    <span className="hr-status-chip-name">{status}</span>
                    <span className="hr-status-chip-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hiring Funnel */}
          {hrAnalytics.hiring_funnel && (
            <div className="hr-analytics-panel">
              <h3 className="hr-analytics-panel-title">Hiring Funnel Rates</h3>
              <div className="hr-funnel-rates">
                <FunnelRate label="Interview Rate" value={hrAnalytics.hiring_funnel.interview_rate_pct} />
                <FunnelRate label="Selection Rate" value={hrAnalytics.hiring_funnel.selection_rate_pct} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

export default HRAnalyticsTab;
