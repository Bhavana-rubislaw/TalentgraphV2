import React, { useState, useCallback, useEffect } from 'react';
import {
  listApplications, getApplication,
  exportApplicationsCSV,
  ApplicationListItem, ApplicationDetail, TimelineEvent,
} from '../api/client';
import {
  IconSearch, IconX, IconAlertTriangle, IconDownload,
  IconClock, IconCheck, IconActivity,
} from '../components/Icons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
  applied: 'badge-blue',
  under_review: 'badge-orange',
  shortlisted: 'badge-orange',
  scheduled: 'badge-purple',
  selected: 'badge-green',
  rejected: 'badge-gray',
};

const ALL_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
];

// ── Timeline component ───────────────────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No timeline events</p>;
  }
  return (
    <div className="timeline">
      {events.map((evt, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-title">{evt.title}</div>
            {evt.description && <div className="timeline-desc">{evt.description}</div>}
            <div className="timeline-meta">
              {fmtDateTime(evt.occurred_at)}
              {evt.performed_by && ` · ${evt.performed_by}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail Drawer ────────────────────────────────────────────────────────────

function ApplicationDetailDrawer({
  appId,
  onClose,
}: {
  appId: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getApplication(appId)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load application details'))
      .finally(() => setLoading(false));
  }, [appId]);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 540, maxWidth: '95vw' }}
      >
        <div className="drawer-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Application #{appId}
          </h2>
          <button className="icon-btn" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="drawer-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          {loading && <div className="loading-row"><span className="spinner" /></div>}
          {error && <div className="alert alert-error">{error}</div>}

          {detail && !loading && (
            <>
              {/* Header info */}
              <div className="detail-grid" style={{ marginBottom: 20 }}>
                <div className="detail-row">
                  <span className="detail-label">Candidate</span>
                  <span className="detail-value">{detail.candidate_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{detail.candidate_email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Job</span>
                  <span className="detail-value">{detail.job_title}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Company</span>
                  <span className="detail-value">{detail.company_name ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`badge ${STATUS_COLORS[detail.operational_status] ?? 'badge-gray'}`}>
                    {detail.display_status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Applied</span>
                  <span className="detail-value">{fmtDate(detail.applied_at)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{fmtDate(detail.last_status_updated_at)}</span>
                </div>
                {detail.recruiter_notes && (
                  <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span className="detail-label">Recruiter Notes</span>
                    <span className="detail-value" style={{ fontStyle: 'italic' }}>{detail.recruiter_notes}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timeline
              </h4>
              <Timeline events={detail.timeline} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stuckOnly, setStuckOnly] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 10;

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Parameters<typeof listApplications>[0] = {
        limit: LIMIT,
        offset: page * LIMIT,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (stuckOnly) params.stuck_days = 7;

      const res = await listApplications(params);
      let items = res.data.applications;
      if (stuckOnly) items = items.filter((a) => a.is_stuck);
      setApplications(items);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, stuckOnly, page]);

  useEffect(() => {
    const t = setTimeout(fetchApps, 300);
    return () => clearTimeout(t);
  }, [fetchApps]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Parameters<typeof exportApplicationsCSV>[0] = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await exportApplicationsCSV(params);
      downloadBlob(res.data as Blob, 'applications_export.csv');
    } catch {
      setError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Applications</h2>
          <p className="page-subtitle">{total} application{total !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <IconDownload size={14} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <IconSearch size={15} />
          <input
            className="search-input"
            placeholder="Search candidate or job…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="icon-btn" onClick={() => { setSearch(''); setPage(0); }}>
              <IconX size={14} />
            </button>
          )}
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={stuckOnly}
            onChange={(e) => { setStuckOnly(e.target.checked); setPage(0); }}
          />
          <IconAlertTriangle size={14} color={stuckOnly ? 'var(--warning)' : 'currentColor'} />
          Stuck 7+ days
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Job</th>
              <th>Company</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Days In Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="empty-state"><span className="spinner" /></td></tr>
            )}
            {!loading && applications.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No applications found</td></tr>
            )}
            {!loading && applications.map((app) => (
              <tr
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                style={{ cursor: 'pointer' }}
                className={app.is_stuck ? 'row-warning' : ''}
              >
                <td>
                  <div style={{ fontWeight: 500 }}>{app.candidate_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.candidate_email}</div>
                </td>
                <td>{app.job_title}</td>
                <td>{app.company_name}</td>
                <td>
                  <span className={`badge ${STATUS_COLORS[app.operational_status] ?? 'badge-gray'}`}>
                    {app.display_status}
                  </span>
                </td>
                <td>{fmtDate(app.applied_at)}</td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {app.is_stuck && (
                      <IconAlertTriangle size={13} color="var(--warning)" />
                    )}
                    {app.days_in_current_status}d
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={(e) => { e.stopPropagation(); setSelectedAppId(app.id); }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="pagination-info">Page {page + 1} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedAppId !== null && (
        <ApplicationDetailDrawer
          appId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </div>
  );
}
