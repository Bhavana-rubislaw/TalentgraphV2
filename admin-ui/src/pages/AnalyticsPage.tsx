/**
 * AnalyticsPage – Platform-wide analytics for TalentGraph Admin Portal.
 *
 * Calls GET /api/admin/analytics?range_days={7|30|90}
 * and renders KPI cards, line/bar/pie charts using Recharts.
 *
 * Job status classification used server-side:
 *   Active  = ACTIVE + REPOSTED
 *   Closed  = FROZEN + CANCELLED
 *
 * Activity score formula (server-side):
 *   activity_score = jobs_created + applications + interviews + hires
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LabelList,
} from 'recharts';
import {
  getAdminAnalytics,
  AdminAnalyticsResponse,
  UserSignupPoint,
  FunnelStage,
  JobsCreatedPoint,
  TopCompany,
} from '../api/client';

// ── Types ────────────────────────────────────────────────────
type RangeDays = 7 | 30 | 90;

// ── Color palette ────────────────────────────────────────────
const COLORS = {
  primary:   '#4f46e5',
  secondary: '#7c3aed',
  success:   '#059669',
  warning:   '#d97706',
  danger:    '#dc2626',
  muted:     '#6b7280',
  active:    '#4f46e5',
  closed:    '#e5e7eb',
};

const FUNNEL_COLORS = ['#4f46e5', '#7c3aed', '#a855f7', '#c084fc'];
const PIE_COLORS   = [COLORS.active, '#c7d2fe'];

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString();

const fmtDate = (iso: string) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const fmtWeek = (iso: string) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
};

// ── KPI Card ──────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub }) => (
  <div className="analytics-kpi-card">
    <div className="analytics-kpi-label">{label}</div>
    <div className="analytics-kpi-value">{value}</div>
    {sub && <div className="analytics-kpi-sub">{sub}</div>}
  </div>
);

// ── Custom Tooltip for Funnel ─────────────────────────────────
interface FunnelTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FunnelStage }>;
}

const FunnelTooltip: React.FC<FunnelTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="analytics-tooltip">
      <div className="analytics-tooltip-title">{d.stage}</div>
      <div>{fmt(d.count)} total</div>
      <div>From previous: {d.conversion_from_previous.toFixed(1)}%</div>
      <div>From views: {d.conversion_from_views.toFixed(1)}%</div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [data, setData]           = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Guard against stale responses when the user changes the range quickly
  const requestIdRef = useRef(0);

  useEffect(() => {
    const id = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    getAdminAnalytics(rangeDays)
      .then((res) => {
        if (id !== requestIdRef.current) return; // stale – discard
        setData(res.data);
      })
      .catch((err) => {
        if (id !== requestIdRef.current) return;
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load analytics data.';
        setError(String(msg));
      })
      .finally(() => {
        if (id !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [rangeDays]);

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <span className="spinner" />
          Loading analytics…
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => setRangeDays((r) => r)} // triggers re-fetch
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, user_signups, application_funnel, jobs_created, job_status_breakdown, top_companies } = data;

  // Prepare signup chart data
  const signupChartData = user_signups.map((p: UserSignupPoint) => ({
    ...p,
    label: fmtDate(p.date),
  }));

  // Prepare funnel chart data (horizontal bar)
  const funnelChartData = application_funnel.map((s: FunnelStage) => ({
    ...s,
    label: `${s.stage} (${s.conversion_from_views.toFixed(1)}%)`,
  }));

  // Prepare jobs per week chart data
  const jobsChartData = jobs_created.map((p: JobsCreatedPoint) => ({
    ...p,
    label: fmtWeek(p.week_start),
  }));

  // Prepare donut chart data
  const pieData = job_status_breakdown.map((s) => ({
    name: s.status,
    value: s.count,
  }));

  // Top companies – already sorted by activity_score desc from backend
  const topCoData = top_companies.map((c: TopCompany) => ({
    ...c,
    label: c.company_name.length > 20 ? c.company_name.slice(0, 18) + '…' : c.company_name,
  }));

  return (
    <div className="analytics-page">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Analytics &amp; Reports</h2>
          <p className="analytics-subtitle">
            Platform-wide metrics from{' '}
            {new Date(data.start_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}{' '}
            to{' '}
            {new Date(data.end_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        {/* Date range selector */}
        <div className="analytics-range-selector">
          {([7, 30, 90] as RangeDays[]).map((d) => (
            <button
              key={d}
              className={`analytics-range-btn${rangeDays === d ? ' active' : ''}`}
              onClick={() => setRangeDays(d)}
            >
              {d === 7 ? 'Last 7 Days' : d === 30 ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="analytics-kpi-grid">
        <KpiCard label="New Signups"    value={fmt(summary.total_signups)} />
        <KpiCard label="Job Views"      value={fmt(summary.total_views)} />
        <KpiCard label="Applications"   value={fmt(summary.total_applications)} />
        <KpiCard label="Interviews"     value={fmt(summary.total_interviews)} />
        <KpiCard label="Hires"          value={fmt(summary.total_hires)} />
        <KpiCard
          label="Avg. Time-to-Hire"
          value={
            summary.average_time_to_hire_days !== null
              ? `${summary.average_time_to_hire_days} days`
              : 'N/A'
          }
          sub="Based on CANDIDATE_HIRED events"
        />
      </div>

      {/* ── Charts grid ───────────────────────────────────── */}
      <div className="analytics-charts-grid">

        {/* User Signups – Line Chart */}
        <div className="analytics-chart-card analytics-chart-wide">
          <div className="analytics-chart-title">User Signups Over Time</div>
          {signupChartData.length === 0 || signupChartData.every((p) => p.total === 0) ? (
            <div className="analytics-empty">No signup data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={signupChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Legend iconSize={10} />
                <Line type="monotone" dataKey="total"      stroke={COLORS.primary}   strokeWidth={2} dot={false} name="Total" />
                <Line type="monotone" dataKey="candidates" stroke={COLORS.success}   strokeWidth={1.5} dot={false} name="Candidates" />
                <Line type="monotone" dataKey="recruiters" stroke={COLORS.warning}   strokeWidth={1.5} dot={false} name="Recruiters" />
                <Line type="monotone" dataKey="hr"         stroke={COLORS.secondary} strokeWidth={1.5} dot={false} name="HR" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Application Funnel – Horizontal Bar */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Application Funnel</div>
          {funnelChartData.every((s) => s.count === 0) ? (
            <div className="analytics-empty">No funnel data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={funnelChartData}
                margin={{ top: 8, right: 60, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={72} />
                <Tooltip content={<FunnelTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(v: unknown) => fmt(v as number)}
                    style={{ fontSize: 11, fill: COLORS.muted }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="analytics-funnel-legend">
            {application_funnel.map((s, i) => (
              <span key={s.stage} className="analytics-funnel-badge" style={{ background: FUNNEL_COLORS[i] + '22', color: FUNNEL_COLORS[i], border: `1px solid ${FUNNEL_COLORS[i]}44` }}>
                {s.stage}: {fmt(s.count)}
              </span>
            ))}
          </div>
        </div>

        {/* Jobs Created per Week – Vertical Bar */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Jobs Created per Week</div>
          {jobsChartData.every((p) => p.created === 0) ? (
            <div className="analytics-empty">No jobs created in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Bar dataKey="created" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Jobs Created" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active vs Closed – Donut */}
        <div className="analytics-chart-card analytics-chart-narrow">
          <div className="analytics-chart-title">Active vs Closed Jobs</div>
          <p className="analytics-chart-note">
            Active = Published + Reposted &nbsp;·&nbsp; Closed = Frozen + Cancelled
          </p>
          {pieData.every((d) => d.value === 0) ? (
            <div className="analytics-empty">No job data available.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [fmt(v as number), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="analytics-pie-legend">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="analytics-pie-legend-item">
                    <span className="analytics-pie-dot" style={{ background: PIE_COLORS[i] }} />
                    <span>{entry.name}</span>
                    <span className="analytics-pie-count">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Companies – Horizontal Bar */}
        <div className="analytics-chart-card analytics-chart-wide">
          <div className="analytics-chart-title">Top 10 Companies by Activity</div>
          <p className="analytics-chart-note">
            Activity score = jobs + applications + interviews + hires
          </p>
          {topCoData.length === 0 ? (
            <div className="analytics-empty">No company activity data for this period.</div>
          ) : (
            <div className="analytics-top-companies">
              <div className="analytics-top-header">
                <span>Company</span>
                <span>Jobs</span>
                <span>Apps</span>
                <span>Interviews</span>
                <span>Hires</span>
                <span>Score</span>
              </div>
              {topCoData.map((c, i) => (
                <div key={c.company_id} className={`analytics-top-row${i % 2 === 0 ? ' even' : ''}`}>
                  <span className="analytics-top-name" title={c.company_name}>
                    <span className="analytics-top-rank">{i + 1}</span>
                    {c.company_name}
                  </span>
                  <span>{fmt(c.jobs_created)}</span>
                  <span>{fmt(c.applications)}</span>
                  <span>{fmt(c.interviews)}</span>
                  <span>{fmt(c.hires)}</span>
                  <span className="analytics-top-score">{fmt(c.activity_score)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;
