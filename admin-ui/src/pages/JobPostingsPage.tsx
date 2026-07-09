import React, { useEffect, useState, useCallback } from 'react';
import { listJobPostings, updateJobStatus, bulkJobAction, exportJobsCSV } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconSearch, IconFileList, IconBuilding, IconMapPin, IconMonitor,
  IconDollarSign, IconClock, IconEdit, IconSnowflake, IconX,
  IconPlay, IconRefreshCw, IconCheck, IconAlertTriangle, IconBriefcase,
  IconDownload, IconTrash,
} from '../components/Icons';

interface Job {
  id: number;
  title: string;
  company_name: string | null;
  status: string;
  created_at: string | null;
  application_count: number;
  location: string | null;
  worktype: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active:    'badge-green',
  frozen:    'badge-orange',
  reposted:  'badge-blue',
  cancelled: 'badge-gray',
};

const STATUSES = ['active', 'frozen', 'reposted', 'cancelled'];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const JobPostingsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  const [statusTarget, setStatusTarget] = useState<{ job: Job; newStatus: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError('');
    setSelected(new Set());
    const params: Record<string, unknown> = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    listJobPostings(params as Parameters<typeof listJobPostings>[0])
      .then((res) => { setJobs(res.data.jobs); setTotal(res.data.total); })
      .catch((err: unknown) => { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load jobs.'); })
      .finally(() => setLoading(false));
  }, [search, statusFilter, offset]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleStatusChange = (job: Job, newStatus: string) => setStatusTarget({ job, newStatus });

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;
    setActionLoading(true);
    try {
      await updateJobStatus(statusTarget.job.id, statusTarget.newStatus);
      flash(`Job "${statusTarget.job.title}" status updated to "${statusTarget.newStatus}".`);
      setStatusTarget(null);
      fetchJobs();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update job status.');
      setStatusTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  // â”€â”€ Bulk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const allPageIds = jobs.map((j) => j.id);
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
      const res = await bulkJobAction(Array.from(selected), action);
      const { succeeded, failed } = res.data;
      flash(`Bulk ${action}: ${succeeded} succeeded, ${failed} failed.`);
      setSelected(new Set());
      fetchJobs();
    } catch {
      setError(`Bulk ${action} failed.`);
    } finally {
      setBulkLoading(false);
      setConfirmBulkAction(null);
    }
  };

  // â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Parameters<typeof exportJobsCSV>[0] = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await exportJobsCSV(params);
      downloadBlob(res.data as Blob, 'jobs_export.csv');
    } catch {
      setError('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const fmtSalary = (job: Job) => {
    if (!job.salary_min && !job.salary_max) return null;
    const fmt = (v: number) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
    return `${fmt(job.salary_min ?? 0)} – ${fmt(job.salary_max ?? 0)}`;
  };

  const timeAgo = (d: string | null) => {
    if (!d) return null;
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return '1 week ago';
    return `${Math.floor(days / 7)} weeks ago`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Postings</h1>
          <p className="page-subtitle">Manage all job postings across vendors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
            <IconDownload size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success"><IconCheck size={15} color="currentColor" style={{ marginRight: 6 }} />{success}</div>}
      {error   && <div className="alert alert-error"><IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />{error}</div>}

      {/* Search + Status Pills */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', lineHeight: 0 }}><IconSearch size={15} /></span>
          <input
            className="search-input"
            style={{ paddingLeft: 36, width: '100%' }}
            placeholder="Search job postings by title, company, or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setOffset(0); }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: statusFilter === s ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f3f4f6',
                color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-count">{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setConfirmBulkAction('freeze')} disabled={bulkLoading}>
              <IconSnowflake size={13} /> Freeze
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setConfirmBulkAction('cancel')} disabled={bulkLoading}>
              <IconX size={13} /> Cancel
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
              <IconX size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Select All row */}
      {jobs.length > 0 && (
        <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {allSelected ? 'Deselect all on this page' : 'Select all on this page'}
          </span>
        </div>
      )}

      {/* Job Cards */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>}
      {!loading && jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <IconBriefcase size={40} color="#c4c8d8" />
        </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No job postings found</div>
          <div style={{ fontSize: 13 }}>Try adjusting your search or filter</div>
        </div>
      )}
      {!loading && jobs.map((job) => {
        const salary = fmtSalary(job);
        const ago = timeAgo(job.created_at);
        const isActive = job.status === 'active';
        const isFrozen = job.status === 'frozen';
        return (
          <div key={job.id} style={{ background: '#fff', border: `1px solid ${selected.has(job.id) ? '#6366f1' : '#e8eaed'}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.05)', position: 'relative' }}>
            {/* Checkbox */}
            <div style={{ position: 'absolute', top: 20, left: 16 }}>
              <input
                type="checkbox"
                checked={selected.has(job.id)}
                onChange={() => toggleSelect(job.id)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div style={{ paddingLeft: 28 }}>
              {/* Card top: title + status + time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2b', letterSpacing: '-0.2px' }}>{job.title}</span>
                  <span className={`badge ${STATUS_COLORS[job.status] || 'badge-gray'}`} style={{ fontWeight: 700, letterSpacing: '0.3px' }}>
                    {'â— '}{job.status.toUpperCase()}
                  </span>
                </div>
                {ago && <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><IconClock size={13} />Posted {ago}</span>}
              </div>
              {/* Meta row */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                {job.company_name && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><IconBuilding size={14} />{job.company_name}</span>}
                {job.location && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><IconMapPin size={14} />{job.location}</span>}
                {job.worktype && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><IconMonitor size={14} />{job.worktype.charAt(0).toUpperCase() + job.worktype.slice(1)}</span>}
                {salary && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><IconDollarSign size={14} />{salary}</span>}
              </div>
              {/* Divider */}
              <div style={{ borderTop: '1px solid #f0f1f4', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={() => handleStatusChange(job, job.status)}><IconEdit size={14} /> Edit</button>
                {isActive && <>
                  <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => handleStatusChange(job, 'frozen')}><IconSnowflake size={14} /> Freeze</button>
                  <button className="btn btn-sm btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => handleStatusChange(job, 'cancelled')}><IconX size={14} /> Cancel</button>
                </>}
                {isFrozen && <>
                  <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => handleStatusChange(job, 'active')}><IconPlay size={14} /> Unfreeze</button>
                  <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => handleStatusChange(job, 'reposted')}><IconRefreshCw size={14} /> Repost</button>
                </>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="pagination" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>&larr; Prev</button>
          <span className="pagination-info">Showing {offset + 1}&ndash;{Math.min(offset + LIMIT, total)} of {total}</span>
          <button className="btn btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next &rarr;</button>
        </div>
      )}

      {/* Bulk confirm */}
      {confirmBulkAction && (
        <ConfirmDialog
          title={`Bulk ${confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1)} ${selected.size} Jobs`}
          message={`Are you sure you want to ${confirmBulkAction} ${selected.size} selected job${selected.size !== 1 ? 's' : ''}?`}
          confirmLabel={`${confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1)} All`}
          variant="warning"
          onConfirm={() => executeBulkAction(confirmBulkAction)}
          onCancel={() => setConfirmBulkAction(null)}
          loading={bulkLoading}
        />
      )}

      {statusTarget && (
        <ConfirmDialog
          title="Update Job Status"
          message={`Change "${statusTarget.job.title}" status to "${statusTarget.newStatus}"?`}
          confirmLabel="Update Status"
          variant="warning"
          onConfirm={handleStatusConfirm}
          onCancel={() => setStatusTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default JobPostingsPage;
