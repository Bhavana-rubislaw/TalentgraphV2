import React, { useState, useCallback, useEffect } from 'react';
import {
  listCompanies, getCompany, updateCompanyStatus, bulkCompanyAction,
  CompanySummary, CompanyDetail,
} from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconBuildings, IconSearch, IconX, IconCheck, IconAlertTriangle, IconUsers, IconTrash,
} from '../components/Icons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge-green' : 'badge-gray'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'];

// ── Company Detail Drawer ────────────────────────────────────────────────────

function CompanyDetailDrawer({
  orgId,
  onClose,
}: {
  orgId: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    getCompany(orgId)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load company details'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleToggleStatus = async () => {
    if (!detail) return;
    if (!detail.is_active) {
      // Reactivating — just do it
      setActionLoading(true);
      try {
        await updateCompanyStatus(orgId, true);
        setDetail({ ...detail, is_active: true });
        setActionMsg('Company reactivated');
      } catch {
        setActionMsg('Action failed');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    // Deactivating — confirm first
    if (!confirmDeactivate) {
      setConfirmDeactivate(true);
      return;
    }
    setActionLoading(true);
    try {
      await updateCompanyStatus(orgId, false);
      setDetail({ ...detail, is_active: false });
      setConfirmDeactivate(false);
      setActionMsg('Company deactivated. All members deactivated and active jobs frozen.');
    } catch {
      setActionMsg('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520, maxWidth: '95vw' }}
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconBuildings size={20} />
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {detail?.name ?? 'Loading…'}
            </h2>
            {detail && <StatusBadge active={detail.is_active} />}
          </div>
          <button className="icon-btn" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="drawer-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {loading && <div className="loading-row"><span className="spinner" /></div>}
          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          {detail && !loading && (
            <>
              {/* Info grid */}
              <div className="detail-grid" style={{ marginBottom: 20 }}>
                <div className="detail-row">
                  <span className="detail-label">Industry</span>
                  <span className="detail-value">{detail.industry ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Size</span>
                  <span className="detail-value">{detail.company_size ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{detail.location ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Website</span>
                  <span className="detail-value">
                    {detail.website
                      ? <a href={detail.website} target="_blank" rel="noreferrer">{detail.website}</a>
                      : '—'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{fmtDate(detail.created_at)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-row" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Recruiters', value: detail.recruiters.length },
                  { label: 'HR Members', value: detail.hr_members.length },
                  { label: 'Active Jobs', value: detail.job_counts_by_status['active'] ?? 0 },
                  { label: 'Total Jobs', value: Object.values(detail.job_counts_by_status).reduce((a, b) => a + b, 0) },
                  { label: 'Applications', value: detail.total_applications },
                ].map(({ label, value }) => (
                  <div key={label} className="stat-card">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                ))}
              </div>

              {/* Members */}
              {detail.recruiters.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recruiters
                  </h4>
                  {detail.recruiters.map((m) => (
                    <div key={m.user_id} className="member-row">
                      <span className="member-name">{m.full_name}</span>
                      <span className="member-email">{m.email}</span>
                      <StatusBadge active={m.is_active} />
                    </div>
                  ))}
                </div>
              )}
              {detail.hr_members.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    HR Members
                  </h4>
                  {detail.hr_members.map((m) => (
                    <div key={m.user_id} className="member-row">
                      <span className="member-name">{m.full_name}</span>
                      <span className="member-email">{m.email}</span>
                      <StatusBadge active={m.is_active} />
                    </div>
                  ))}
                </div>
              )}

              {/* Recent jobs */}
              {detail.recent_jobs.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recent Jobs
                  </h4>
                  {detail.recent_jobs.slice(0, 5).map((j) => (
                    <div key={j.id} className="member-row">
                      <span className="member-name">{j.title}</span>
                      <span className={`badge badge-${j.status === 'active' ? 'green' : j.status === 'frozen' ? 'orange' : 'gray'}`}>
                        {j.status}
                      </span>
                      <span className="member-email">{j.application_count} apps</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {detail && (
          <div className="drawer-footer">
            {confirmDeactivate && (
              <div className="alert alert-warning" style={{ marginBottom: 12, fontSize: 13 }}>
                <IconAlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                This will deactivate all members and freeze active jobs. Continue?
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {confirmDeactivate && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDeactivate(false)}
                >
                  Cancel
                </button>
              )}
              <button
                className={`btn ${detail.is_active ? 'btn-danger' : 'btn-primary'}`}
                disabled={actionLoading}
                onClick={handleToggleStatus}
              >
                {actionLoading
                  ? 'Working…'
                  : confirmDeactivate
                  ? 'Confirm Deactivate'
                  : detail.is_active
                  ? 'Deactivate'
                  : 'Reactivate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 10;

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelected(new Set());
    try {
      const params: Record<string, unknown> = { limit: LIMIT, offset: page * LIMIT };
      if (search) params.search = search;
      if (industry) params.industry = industry;
      if (companySize) params.company_size = companySize;
      if (statusFilter === 'active') params.is_active = true;
      if (statusFilter === 'inactive') params.is_active = false;

      const res = await listCompanies(params as Parameters<typeof listCompanies>[0]);
      setCompanies(res.data.companies);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, industry, companySize, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(t);
  }, [fetchCompanies]);

  const totalPages = Math.ceil(total / LIMIT);

  // ── Bulk helpers ───────────────────────────────────────────────
  const allPageIds = companies.map((c) => c.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allPageIds));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const executeBulkAction = async (action: string) => {
    setBulkLoading(true);
    try {
      const res = await bulkCompanyAction(Array.from(selected), action);
      const { succeeded, failed } = res.data;
      flash(`Bulk ${action}: ${succeeded} succeeded, ${failed} failed.`);
      setSelected(new Set());
      fetchCompanies();
    } catch {
      setError(`Bulk ${action} failed.`);
    } finally {
      setBulkLoading(false);
      setConfirmBulkAction(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Companies</h2>
          <p className="page-subtitle">{total} organization{total !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <IconSearch size={15} />
          <input
            className="search-input"
            placeholder="Search by company name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="icon-btn" onClick={() => { setSearch(''); setPage(0); }}>
              <IconX size={14} />
            </button>
          )}
        </div>

        <input
          className="filter-input"
          placeholder="Industry…"
          value={industry}
          onChange={(e) => { setIndustry(e.target.value); setPage(0); }}
          style={{ width: 160 }}
        />

        <select
          className="filter-select"
          value={companySize}
          onChange={(e) => { setCompanySize(e.target.value); setPage(0); }}
        >
          <option value="">All Sizes</option>
          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success"><IconCheck size={15} style={{ marginRight: 6 }} />{success}</div>}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-count">{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setConfirmBulkAction('activate')} disabled={bulkLoading}>
              <IconCheck size={13} /> Activate
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setConfirmBulkAction('deactivate')} disabled={bulkLoading}>
              Deactivate
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
              <IconX size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Company</th>
              <th>Industry</th>
              <th>Size</th>
              <th>Recruiters</th>
              <th>HR</th>
              <th>Active Jobs</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="empty-state"><span className="spinner" /></td></tr>
            )}
            {!loading && companies.length === 0 && (
              <tr><td colSpan={10} className="empty-state">No companies found</td></tr>
            )}
            {!loading && companies.map((co) => (
              <tr key={co.id} style={{ background: selected.has(co.id) ? 'var(--selected-bg, #f0f4ff)' : undefined }}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(co.id)}
                    onChange={() => toggleSelect(co.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{co.name}</div>
                  {co.location && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{co.location}</div>}
                </td>
                <td>{co.industry ?? '—'}</td>
                <td>{co.company_size ?? '—'}</td>
                <td><span className="badge badge-blue">{co.recruiter_count}</span></td>
                <td><span className="badge badge-purple">{co.hr_count}</span></td>
                <td><span className="badge badge-green">{co.active_job_count}</span></td>
                <td><StatusBadge active={co.is_active} /></td>
                <td>{fmtDate(co.created_at)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setSelectedOrgId(co.id)}
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
      {selectedOrgId !== null && (
        <CompanyDetailDrawer
          orgId={selectedOrgId}
          onClose={() => { setSelectedOrgId(null); fetchCompanies(); }}
        />
      )}

      {/* Bulk confirm dialog */}
      {confirmBulkAction && (
        <ConfirmDialog
          title={`Bulk ${confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1)} ${selected.size} Companies`}
          message={`Are you sure you want to ${confirmBulkAction} ${selected.size} selected compan${selected.size !== 1 ? 'ies' : 'y'}?`}
          confirmLabel={`${confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1)} All`}
          variant="warning"
          onConfirm={() => executeBulkAction(confirmBulkAction)}
          onCancel={() => setConfirmBulkAction(null)}
          loading={bulkLoading}
        />
      )}
    </div>
  );
}
