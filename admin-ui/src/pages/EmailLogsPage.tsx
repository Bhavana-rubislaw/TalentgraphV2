import React, { useState, useCallback, useEffect } from 'react';
import {
  listEmailDeliveries, getEmailDelivery, resendEmailDelivery,
  EmailDeliverySummary,
} from '../api/client';
import {
  IconSearch, IconX, IconMail, IconRefreshCw, IconAlertTriangle,
} from '../components/Icons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'badge-blue',
  sending: 'badge-purple',
  sent: 'badge-green',
  failed: 'badge-red',
  bounced: 'badge-red',
  suppressed: 'badge-gray',
};

const EMAIL_STATUSES = ['queued', 'sending', 'sent', 'failed', 'bounced', 'suppressed'];

// ── Detail Drawer ────────────────────────────────────────────────────────────

function EmailDetailDrawer({
  deliveryId,
  onClose,
  onResent,
}: {
  deliveryId: number;
  onClose: () => void;
  onResent: () => void;
}) {
  const [detail, setDetail] = useState<EmailDeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [confirmResend, setConfirmResend] = useState(false);

  useEffect(() => {
    setLoading(true);
    getEmailDelivery(deliveryId)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load delivery details'))
      .finally(() => setLoading(false));
  }, [deliveryId]);

  const handleResend = async () => {
    if (!confirmResend) {
      setConfirmResend(true);
      return;
    }
    setResending(true);
    try {
      const res = await resendEmailDelivery(deliveryId);
      setResendMsg((res.data as { message: string }).message || 'Email queued for resend');
      setConfirmResend(false);
      onResent();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setResendMsg(msg || 'Resend failed');
    } finally {
      setResending(false);
    }
  };

  const canResend = detail?.status === 'failed' || detail?.status === 'bounced';

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 500, maxWidth: '95vw' }}
      >
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconMail size={18} />
            <h2 style={{ margin: 0, fontSize: 18 }}>Email Delivery #{deliveryId}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="drawer-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          {loading && <div className="loading-row"><span className="spinner" /></div>}
          {error && <div className="alert alert-error">{error}</div>}
          {resendMsg && (
            <div className={`alert ${resendMsg.includes('fail') ? 'alert-error' : 'alert-success'}`}>
              {resendMsg}
            </div>
          )}

          {detail && !loading && (
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Recipient</span>
                <span className="detail-value">{detail.recipient_email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Subject</span>
                <span className="detail-value">{detail.subject}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event Type</span>
                <span className="detail-value">{detail.event_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`badge ${STATUS_COLORS[detail.status] ?? 'badge-gray'}`}>
                  {detail.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Attempts</span>
                <span className="detail-value">{detail.attempts} / {detail.max_attempts}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Queued At</span>
                <span className="detail-value">{fmtDateTime(detail.created_at)}</span>
              </div>
              {detail.sent_at && (
                <div className="detail-row">
                  <span className="detail-label">Sent At</span>
                  <span className="detail-value">{fmtDateTime(detail.sent_at)}</span>
                </div>
              )}
              {detail.failed_at && (
                <div className="detail-row">
                  <span className="detail-label">Failed At</span>
                  <span className="detail-value">{fmtDateTime(detail.failed_at)}</span>
                </div>
              )}
              {detail.last_error && (
                <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <span className="detail-label" style={{ color: 'var(--danger)' }}>Error</span>
                  <span className="detail-value error-text">{detail.last_error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {detail && canResend && (
          <div className="drawer-footer">
            {confirmResend && (
              <div className="alert alert-warning" style={{ marginBottom: 12, fontSize: 13 }}>
                <IconAlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                This will create a new delivery record and queue the email again. Continue?
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {confirmResend && (
                <button className="btn btn-ghost" onClick={() => setConfirmResend(false)}>
                  Cancel
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={resending}
                onClick={handleResend}
              >
                <IconRefreshCw size={14} />
                {resending ? 'Resending…' : confirmResend ? 'Confirm Resend' : 'Resend Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function EmailLogsPage() {
  const [deliveries, setDeliveries] = useState<EmailDeliverySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 10;

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Parameters<typeof listEmailDeliveries>[0] = {
        limit: LIMIT,
        offset: page * LIMIT,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (eventTypeFilter) params.event_type = eventTypeFilter;

      const res = await listEmailDeliveries(params);
      setDeliveries(res.data.deliveries);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load email deliveries');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, eventTypeFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchDeliveries, 300);
    return () => clearTimeout(t);
  }, [fetchDeliveries]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Email Logs</h2>
          <p className="page-subtitle">{total} email record{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <IconSearch size={15} />
          <input
            className="search-input"
            placeholder="Search recipient or subject…"
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
          {EMAIL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <input
          className="filter-input"
          placeholder="Event type…"
          value={eventTypeFilter}
          onChange={(e) => { setEventTypeFilter(e.target.value); setPage(0); }}
          style={{ width: 160 }}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Queued</th>
              <th>Sent / Failed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="empty-state"><span className="spinner" /></td></tr>
            )}
            {!loading && deliveries.length === 0 && (
              <tr><td colSpan={8} className="empty-state">No email deliveries found</td></tr>
            )}
            {!loading && deliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.recipient_email}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.subject}
                </td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {d.event_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <span className={`badge ${STATUS_COLORS[d.status] ?? 'badge-gray'}`}>
                    {d.status}
                  </span>
                </td>
                <td>{d.attempts}/{d.max_attempts}</td>
                <td>{fmtDateTime(d.created_at)}</td>
                <td>
                  {d.sent_at
                    ? fmtDateTime(d.sent_at)
                    : d.failed_at
                    ? <span style={{ color: 'var(--danger)', fontSize: 12 }}>{fmtDateTime(d.failed_at)}</span>
                    : '—'}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setSelectedId(d.id)}
                  >
                    {d.status === 'failed' || d.status === 'bounced' ? 'View / Resend' : 'View'}
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

      {selectedId !== null && (
        <EmailDetailDrawer
          deliveryId={selectedId}
          onClose={() => setSelectedId(null)}
          onResent={() => { setSelectedId(null); fetchDeliveries(); }}
        />
      )}
    </div>
  );
}
