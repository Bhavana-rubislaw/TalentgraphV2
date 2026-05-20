import React, { useEffect, useState, useCallback } from 'react';
import { listJobPreferences } from '../api/client';

interface LocationPref {
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
}

interface JobPreference {
  id: number;
  candidate_id: number;
  candidate_name: string | null;
  candidate_email: string | null;
  profile_name: string;
  product_vendor: string | null;
  product_type: string | null;
  job_role: string | null;
  years_of_experience: number | null;
  seniority_level: string | null;
  preferred_job_titles: string | null;
  job_category: string | null;
  worktype: string | null;
  employment_type: string | null;
  shift_preference: string | null;
  travel_willingness: string | null;
  remote_acceptance: string | null;
  relocation_willingness: string | null;
  location_preferences: LocationPref[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  pay_type: string | null;
  negotiability: string | null;
  visa_status: string | null;
  notice_period: string | null;
  start_date_preference: string | null;
  availability_date: string | null;
  highest_education: string | null;
  security_clearance: string | null;
  core_strengths: string | null;
  profile_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const WORKTYPE_COLORS: Record<string, string> = {
  remote:   'badge-blue',
  onsite:   'badge-orange',
  hybrid:   'badge-purple',
};

const SENIORITY_COLORS: Record<string, string> = {
  entry:   'badge-gray',
  junior:  'badge-blue',
  mid:     'badge-green',
  senior:  'badge-orange',
  lead:    'badge-purple',
  manager: 'badge-red',
};

const WORKTYPES    = ['remote', 'onsite', 'hybrid'];
const EMP_TYPES    = ['full_time', 'part_time', 'contract', 'internship', 'freelance'];
const VISA_OPTS    = ['us_citizen', 'green_card', 'h1b', 'opt', 'other', 'none'];
const SENIORITY    = ['entry', 'junior', 'mid', 'senior', 'lead', 'manager'];

function tryParseJson(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function fmtSalary(min: number | null, max: number | null, cur: string | null): string {
  if (!min && !max) return '—';
  const c = cur ? cur.toUpperCase() : 'USD';
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`;
  if (min) return `${c} ${fmt(min)}+`;
  return `${c} up to ${fmt(max!)}`;
}

function fmtLocation(prefs: LocationPref[]): string {
  if (!prefs || prefs.length === 0) return '—';
  return prefs.map(p => [p.city, p.state, p.country].filter(Boolean).join(', ') || (p.remote ? 'Remote' : '')).filter(Boolean).join(' / ') || '—';
}

// ── Detail Modal ──────────────────────────────────────────────────
const DetailModal: React.FC<{ profile: JobPreference; onClose: () => void }> = ({ profile, onClose }) => {
  const titles = tryParseJson(profile.preferred_job_titles);
  const cats   = tryParseJson(profile.job_category);
  const strengths = tryParseJson(profile.core_strengths);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{profile.profile_name}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {profile.candidate_name} · {profile.candidate_email}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Taxonomy */}
          <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
            <h4 className="detail-section-title">Technology Stack</h4>
            <div className="detail-row"><span className="detail-label">Vendor</span><span>{profile.product_vendor || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Product Type</span><span>{profile.product_type || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Role</span><span>{profile.job_role || '—'}</span></div>
          </div>

          {/* Role preferences */}
          <div className="detail-section">
            <h4 className="detail-section-title">Role Preferences</h4>
            <div className="detail-row"><span className="detail-label">Seniority</span><span>{profile.seniority_level || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Experience</span><span>{profile.years_of_experience != null ? `${profile.years_of_experience} yrs` : '—'}</span></div>
            {titles.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">Job Titles</span>
                <span>{titles.join(', ')}</span>
              </div>
            )}
            {cats.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">Categories</span>
                <span>{cats.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Work style */}
          <div className="detail-section">
            <h4 className="detail-section-title">Work Style</h4>
            <div className="detail-row"><span className="detail-label">Work Type</span><span>{profile.worktype || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Employment</span><span>{profile.employment_type || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Shift</span><span>{profile.shift_preference || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Travel</span><span>{profile.travel_willingness || '—'}</span></div>
          </div>

          {/* Location */}
          <div className="detail-section">
            <h4 className="detail-section-title">Location</h4>
            <div className="detail-row"><span className="detail-label">Preferred</span><span>{fmtLocation(profile.location_preferences)}</span></div>
            <div className="detail-row"><span className="detail-label">Remote</span><span>{profile.remote_acceptance || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Relocation</span><span>{profile.relocation_willingness || '—'}</span></div>
          </div>

          {/* Compensation */}
          <div className="detail-section">
            <h4 className="detail-section-title">Compensation</h4>
            <div className="detail-row"><span className="detail-label">Range</span><span>{fmtSalary(profile.salary_min, profile.salary_max, profile.salary_currency)}</span></div>
            <div className="detail-row"><span className="detail-label">Pay Type</span><span>{profile.pay_type || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Negotiable</span><span>{profile.negotiability || '—'}</span></div>
          </div>

          {/* Availability */}
          <div className="detail-section">
            <h4 className="detail-section-title">Availability</h4>
            <div className="detail-row"><span className="detail-label">Visa</span><span>{profile.visa_status || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Notice</span><span>{profile.notice_period || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Start Date</span><span>{profile.start_date_preference || profile.availability_date || '—'}</span></div>
          </div>

          {/* Education & Clearance */}
          <div className="detail-section">
            <h4 className="detail-section-title">Background</h4>
            <div className="detail-row"><span className="detail-label">Education</span><span>{profile.highest_education || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Clearance</span><span>{profile.security_clearance || '—'}</span></div>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h4 className="detail-section-title">Core Strengths</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {strengths.map((s, i) => (
                  <span key={i} className="badge badge-blue">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {profile.profile_summary && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h4 className="detail-section-title">Profile Summary</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{profile.profile_summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const JobPreferencesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<JobPreference[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [search, setSearch]               = useState('');
  const [worktypeFilter, setWorktypeFilter] = useState('');
  const [empTypeFilter, setEmpTypeFilter]   = useState('');
  const [visaFilter, setVisaFilter]         = useState('');
  const [seniorityFilter, setSeniorityFilter] = useState('');
  const [offset, setOffset]               = useState(0);
  const LIMIT = 50;

  const [selectedProfile, setSelectedProfile] = useState<JobPreference | null>(null);

  const fetchProfiles = useCallback(() => {
    setLoading(true);
    setError('');
    const params: Record<string, any> = { limit: LIMIT, offset };
    if (search)         params.search          = search;
    if (worktypeFilter) params.worktype         = worktypeFilter;
    if (empTypeFilter)  params.employment_type  = empTypeFilter;
    if (visaFilter)     params.visa_status      = visaFilter;
    if (seniorityFilter) params.seniority_level = seniorityFilter;

    listJobPreferences(params)
      .then((res) => { setProfiles(res.data.profiles); setTotal(res.data.total); })
      .catch((err) => { setError(err?.response?.data?.detail || 'Failed to load job preferences.'); })
      .finally(() => setLoading(false));
  }, [search, worktypeFilter, empTypeFilter, visaFilter, seniorityFilter, offset]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Preferences</h1>
          <p className="page-subtitle">All candidate job profiles &amp; preferences &mdash; {total.toLocaleString()} total</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchProfiles} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search candidate name, email or profile name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
        />

        <select
          className="filter-select"
          value={worktypeFilter}
          onChange={(e) => { setWorktypeFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All Work Types</option>
          {WORKTYPES.map((w) => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
        </select>

        <select
          className="filter-select"
          value={empTypeFilter}
          onChange={(e) => { setEmpTypeFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All Emp. Types</option>
          {EMP_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>

        <select
          className="filter-select"
          value={visaFilter}
          onChange={(e) => { setVisaFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All Visa Statuses</option>
          {VISA_OPTS.map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
        </select>

        <select
          className="filter-select"
          value={seniorityFilter}
          onChange={(e) => { setSeniorityFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All Seniority</option>
          {SENIORITY.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Profile Name</th>
              <th>Technology</th>
              <th>Seniority</th>
              <th>Work Type</th>
              <th>Employment</th>
              <th>Salary Range</th>
              <th>Location</th>
              <th>Visa</th>
              <th>Notice</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="table-empty">Loading…</td>
              </tr>
            )}
            {!loading && profiles.length === 0 && (
              <tr>
                <td colSpan={11} className="table-empty">No job preferences found.</td>
              </tr>
            )}
            {!loading && profiles.map((p) => {
              const titles = tryParseJson(p.preferred_job_titles);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {(p.candidate_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-name">{p.candidate_name || '—'}</div>
                        <div className="user-email">{p.candidate_email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="profile-name">{p.profile_name}</span>
                    {titles.length > 0 && (
                      <div className="sub-text">{titles.slice(0, 2).join(', ')}{titles.length > 2 ? '…' : ''}</div>
                    )}
                  </td>
                  <td>
                    <div>{p.product_vendor || '—'}</div>
                    {p.product_type && <div className="sub-text">{p.product_type}</div>}
                    {p.job_role && <div className="sub-text">{p.job_role}</div>}
                  </td>
                  <td>
                    {p.seniority_level
                      ? <span className={`badge ${SENIORITY_COLORS[p.seniority_level] || 'badge-gray'}`}>{p.seniority_level}</span>
                      : '—'}
                    {p.years_of_experience != null && (
                      <div className="sub-text">{p.years_of_experience} yrs</div>
                    )}
                  </td>
                  <td>
                    {p.worktype
                      ? <span className={`badge ${WORKTYPE_COLORS[p.worktype] || 'badge-gray'}`}>{p.worktype}</span>
                      : '—'}
                  </td>
                  <td>
                    <span className="badge badge-gray">{p.employment_type ? p.employment_type.replace(/_/g, ' ') : '—'}</span>
                  </td>
                  <td className="mono-text">
                    {fmtSalary(p.salary_min, p.salary_max, p.salary_currency)}
                    {p.pay_type && <div className="sub-text">{p.pay_type}</div>}
                  </td>
                  <td>{fmtLocation(p.location_preferences)}</td>
                  <td>
                    <span className="badge badge-gray">{p.visa_status || '—'}</span>
                  </td>
                  <td>{p.notice_period || '—'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedProfile(p)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          >
            ← Prev
          </button>
          <span className="pagination-info">Page {currentPage} of {totalPages} ({total} profiles)</span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset(offset + LIMIT)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedProfile && (
        <DetailModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}
    </div>
  );
};

export default JobPreferencesPage;
