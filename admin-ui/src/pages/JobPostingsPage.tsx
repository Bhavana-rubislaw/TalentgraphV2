import React, { useEffect, useState, useCallback } from 'react';
import { listJobPostings, updateJobStatus } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconSearch, IconFileList, IconBuilding, IconMapPin, IconMonitor,
  IconDollarSign, IconClock, IconEdit, IconSnowflake, IconX,
  IconPlay, IconRefreshCw, IconCheck, IconAlertTriangle, IconBriefcase,
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

const JobPostingsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const [statusTarget, setStatusTarget] = useState<{ job: Job; newStatus: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError('');
    const params: Record<string, any> = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    listJobPostings(params)
      .then((res) => { setJobs(res.data.jobs); setTotal(res.data.total); })
      .catch((err) => { setError(err?.response?.data?.detail || 'Failed to load jobs.'); })
      .finally(() => setLoading(false));
  }, [search, statusFilter, offset]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleStatusChange = (job: Job, newStatus: string) => {
    setStatusTarget({ job, newStatus });
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;
    setActionLoading(true);
    try {
      await updateJobStatus(statusTarget.job.id, statusTarget.newStatus);
      flash(`Job "${statusTarget.job.title}" status updated to "${statusTarget.newStatus}".`);
      setStatusTarget(null);
      fetchJobs();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update job status.');
      setStatusTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const fmtSalary = (job: Job) => {
    if (!job.salary_min && !job.salary_max) return null;
    const cur = (job.salary_currency || 'usd').toUpperCase();
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
        <button className="btn btn-primary" onClick={fetchJobs} disabled={loading}>
          + New Posting
        </button>
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
          <div key={job.id} style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            {/* Card top: title + status + time */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2b', letterSpacing: '-0.2px' }}>{job.title}</span>
                <span className={`badge ${STATUS_COLORS[job.status] || 'badge-gray'}`} style={{ fontWeight: 700, letterSpacing: '0.3px' }}>
                  {'● '}{job.status.toUpperCase()}
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
        );
      })}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="pagination" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Prev</button>
          <span className="pagination-info">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
          <button className="btn btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next →</button>
        </div>
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
