import React, { useEffect, useState, useCallback } from 'react';
import { getLogs, getLogStats } from '../api/client';
import {
  IconList, IconClock, IconXCircle, IconBarChart, IconAlertTriangle, IconActivity,
} from '../components/Icons';

interface LogEntry {
  id?: number;
  timestamp: string;
  level: string;
  message: string;
  module?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: number;
  request_id?: string;
}

interface LogStats {
  total_logs: number;
  by_level: Record<string, number>;
  last_24h: number;
  recent_errors: number;
  error_rate: number;
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG:    'log-level-debug',
  INFO:     'log-level-info',
  WARNING:  'log-level-warning',
  ERROR:    'log-level-error',
  CRITICAL: 'log-level-critical',
};

const ROW_COLORS: Record<string, string> = {
  ERROR:    'log-row-error',
  CRITICAL: 'log-row-critical',
};

const LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const TIME_PRESETS = [
  { label: 'Last 1 min',  minutes: 1 },
  { label: 'Last 5 mins', minutes: 5 },
  { label: 'Last 10 mins',minutes: 10 },
  { label: 'Last 30 mins',minutes: 30 },
  { label: 'Last 1 hr',   minutes: 60 },
  { label: 'Last 5 hrs',  minutes: 300 },
  { label: 'Last 24 hrs', minutes: 1440 },
  { label: 'Last 7 days', minutes: 10080 },
  { label: 'All time',    minutes: 0 },
];

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [timePreset, setTimePreset] = useState(1440); // default: last 24 hrs
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  const fetchStats = useCallback(() => {
    getLogStats()
      .then((res) => setStats(res.data))
      .catch(() => {/* stats are optional */});
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError('');
    const params: Record<string, any> = { limit: LIMIT, offset };
    if (levelFilter) params.level = levelFilter;
    if (search) params.search = search;
    if (timePreset > 0) {
      const since = new Date(Date.now() - timePreset * 60 * 1000);
      params.start_date = since.toISOString();
    }

    getLogs(params)
      .then((res) => { setLogs(res.data.logs); setTotal(res.data.total); })
      .catch((err) => { setError(err?.response?.data?.detail || 'Failed to load logs.'); })
      .finally(() => setLoading(false));
  }, [levelFilter, search, timePreset, offset]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatTs = (ts: string) => {
    try { return new Date(ts).toLocaleString(); }
    catch { return ts; }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">Backend and frontend application logs</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { fetchLogs(); fetchStats(); }}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { icon: <IconList size={18} color="#3b82f6" />,     label: 'TOTAL LOGS',     value: stats.total_logs.toLocaleString(),           iconBg: '#eff6ff' },
            { icon: <IconClock size={18} color="#764ba2" />,    label: 'LAST 24H',       value: stats.last_24h.toLocaleString(),             iconBg: '#f3f0ff' },
            { icon: <IconXCircle size={18} color="#ef4444" />,  label: 'RECENT ERRORS',  value: stats.recent_errors,                         iconBg: '#fef2f2' },
            { icon: <IconBarChart size={18} color="#f59e0b" />, label: 'ERROR RATE',     value: `${(stats.error_rate * 100).toFixed(1)}%`,   iconBg: '#fffbeb' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9599a8' }}>{s.label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1d2b', letterSpacing: '-0.5px' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error"><IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />{error}</div>}

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div className="time-filter-row" style={{ marginBottom: 12 }}>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.minutes}
              className={`time-filter-btn${timePreset === p.minutes ? ' active' : ''}`}
              onClick={() => { setTimePreset(p.minutes); setOffset(0); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="search-input"
            placeholder="Search log messages…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            style={{ flex: 1 }}
          />
          <select
            className="filter-select"
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setOffset(0); }}
          >
            <option value="">All Levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Module</th>
              <th>Message</th>
              <th>Action</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="table-empty">Loading…</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={6} className="table-empty">No logs found.</td></tr>}
            {!loading && logs.map((log, i) => (
              <tr key={log.id ?? i} className={ROW_COLORS[log.level?.toUpperCase()] || ''}>
                <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {formatTs(log.timestamp)}
                </td>
                <td>
                  <span className={`badge text-xs fw-700 ${LEVEL_COLORS[log.level?.toUpperCase()] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                    {log.level}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.module || '—'}</td>
                <td style={{ maxWidth: 400 }}>
                  <span style={{ display: 'block', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }} title={log.message}>
                    {log.message}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.action || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.user_id ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > LIMIT && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Prev</button>
            <span className="pagination-info">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <button className="btn btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
