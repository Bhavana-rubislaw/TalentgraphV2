import React, { useEffect, useState, useCallback } from 'react';
import {
  listUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  bulkUserAction,
  exportUsersCSV,
  createUser,
  createInvitation,
  listInvitations,
  resendInvitation,
  InvitationSummary,
  listCompanies,
  CompanySummary,
} from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  IconShield, IconBuilding, IconBriefcase, IconTarget,
  IconTrash, IconCheck, IconAlertTriangle, IconDownload,
  IconUserPlus, IconSearch, IconX, IconRefreshCw, IconClock,
} from '../components/Icons';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin:     'badge-red',
  recruiter: 'badge-purple',
  hr:        'badge-orange',
  candidate: 'badge-blue',
};

const ROLES = ['candidate', 'recruiter', 'hr', 'admin'];

const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending:  'badge-blue',
  accepted: 'badge-green',
  expired:  'badge-gray',
  revoked:  'badge-red',
};

const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// â”€â”€ Create User Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreateUserDialog({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: CompanySummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'candidate', organization_id: '', temporary_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const needsOrg = form.role === 'recruiter' || form.role === 'hr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        organization_id: needsOrg && form.organization_id ? parseInt(form.organization_id) : undefined,
        temporary_password: form.temporary_password || undefined,
      });
      onCreated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Create User</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, organization_id: '' })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            {needsOrg && (
              <div className="form-group">
                <label className="form-label">Organization *</label>
                <select className="form-input" required value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                  <option value="">Select organization…</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Temporary Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-generated if blank)</span></label>
              <input className="form-input" type="password" value={form.temporary_password} onChange={(e) => setForm({ ...form, temporary_password: e.target.value })} placeholder="Leave blank to auto-generate" />
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€ Invite User Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InviteUserDialog({
  orgs,
  onClose,
  onSent,
}: {
  orgs: CompanySummary[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'candidate', organization_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const needsOrg = form.role === 'recruiter' || form.role === 'hr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createInvitation({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        organization_id: needsOrg && form.organization_id ? parseInt(form.organization_id) : undefined,
      });
      onSent();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Invite User</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, organization_id: '' })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            {needsOrg && (
              <div className="form-group">
                <label className="form-label">Organization *</label>
                <select className="form-input" required value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                  <option value="">Select organization…</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              An invitation email with a secure link will be sent. The link expires in 7 days.
            </p>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [view, setView] = useState<'users' | 'invitations'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invitations tab
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('');
  const [invOffset, setInvOffset] = useState(0);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const INV_LIMIT = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null);

  // Single-item dialogs
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create/Invite dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [orgs, setOrgs] = useState<CompanySummary[]>([]);

  // Export
  const [exporting, setExporting] = useState(false);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // Load organizations for create/invite dialogs
  useEffect(() => {
    listCompanies({ limit: 200, offset: 0 })
      .then((r) => setOrgs(r.data.companies))
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    setSelected(new Set()); // reset selection on filter change

    const params: Record<string, unknown> = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (activeFilter !== '') params.is_active = activeFilter === 'true';

    listUsers(params as Parameters<typeof listUsers>[0])
      .then((res) => {
        setUsers(res.data.users);
        setTotal(res.data.total);
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load users.';
        setError(String(msg));
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, activeFilter, offset]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Invitations ──────────────────────────────────────────────────────────

  const fetchInvitations = useCallback(() => {
    setInvLoading(true);
    setInvError('');
    const params: Record<string, unknown> = { limit: INV_LIMIT, offset: invOffset };
    if (invSearch) params.search = invSearch;
    if (invStatusFilter) params.status = invStatusFilter;

    listInvitations(params as Parameters<typeof listInvitations>[0])
      .then((res) => {
        setInvitations(res.data.invitations);
        setInvTotal(res.data.total);
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load invitations.';
        setInvError(String(msg));
      })
      .finally(() => setInvLoading(false));
  }, [invSearch, invStatusFilter, invOffset]);

  useEffect(() => { if (view === 'invitations') fetchInvitations(); }, [view, fetchInvitations]);

  const handleResend = async (invite: InvitationSummary) => {
    setResendingId(invite.id);
    setInvError('');
    try {
      await resendInvitation(invite.id);
      flash(`Invitation resent to ${invite.email}.`);
      fetchInvitations();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to resend invitation.';
      setInvError(String(msg));
    } finally {
      setResendingId(null);
    }
  };

  const formatExpiry = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // â”€â”€ Selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const allPageIds = users.map((u) => u.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allPageIds));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  // â”€â”€ Bulk actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const executeBulkAction = async (action: string) => {
    setBulkLoading(true);
    try {
      const res = await bulkUserAction(Array.from(selected), action);
      const { succeeded, failed } = res.data;
      flash(`Bulk ${action}: ${succeeded} succeeded, ${failed} failed.`);
      setSelected(new Set());
      fetchUsers();
    } catch {
      setError(`Bulk ${action} failed.`);
    } finally {
      setBulkLoading(false);
      setConfirmBulkAction(null);
    }
  };

  // â”€â”€ Single-item actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleToggleActive = async (u: User) => {
    try {
      await updateUserStatus(u.id, !u.is_active);
      flash(`User ${u.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      flash(`User "${deleteTarget.email}" deleted.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to delete user.');
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleConfirm = async () => {
    if (!roleTarget || !newRole) return;
    setActionLoading(true);
    try {
      await updateUserRole(roleTarget.id, newRole);
      flash(`Role updated to "${newRole}" for ${roleTarget.email}.`);
      setRoleTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update role.');
      setRoleTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  // â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Parameters<typeof exportUsersCSV>[0] = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.is_active = activeFilter === 'true';
      const res = await exportUsersCSV(params);
      downloadBlob(res.data as Blob, 'users_export.csv');
    } catch {
      setError('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            {view === 'users' ? `${total} registered users on the platform` : `${invTotal} invitations sent`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {view === 'users' && (
            <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
              <IconDownload size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(true)}>
            <IconUserPlus size={14} /> Invite User
          </button>
          {view === 'users' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <IconUserPlus size={14} /> Create User
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        <button
          className={`btn btn-sm ${view === 'users' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0' }}
          onClick={() => setView('users')}
        >
          Users
        </button>
        <button
          className={`btn btn-sm ${view === 'invitations' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0' }}
          onClick={() => setView('invitations')}
        >
          Invitations
        </button>
      </div>

      {success && <div className="alert alert-success"><IconCheck size={15} style={{ marginRight: 6 }} />{success}</div>}
      {view === 'users' && error && <div className="alert alert-error"><IconAlertTriangle size={15} style={{ marginRight: 6 }} />{error}</div>}
      {view === 'invitations' && invError && <div className="alert alert-error"><IconAlertTriangle size={15} style={{ marginRight: 6 }} />{invError}</div>}

      {view === 'users' && (
        <>
          {/* Filters */}
          <div className="filter-bar">
            <div className="search-box">
              <IconSearch size={15} />
              <input
                className="search-input"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              />
              {search && <button className="icon-btn" onClick={() => { setSearch(''); setOffset(0); }}><IconX size={14} /></button>}
            </div>
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setOffset(0); }}
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <select
              className="filter-select"
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value as '' | 'true' | 'false'); setOffset(0); }}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

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
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmBulkAction('delete')} disabled={bulkLoading}>
                  <IconTrash size={13} /> Delete
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                  <IconX size={13} /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="table-container">
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
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="table-empty">Loading…</td></tr>}
                {!loading && users.length === 0 && <tr><td colSpan={8} className="table-empty">No users found.</td></tr>}
                {!loading && users.map((u) => (
                  <tr key={u.id} className={selected.has(u.id) ? 'row-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        disabled={u.id === currentAdmin?.user_id}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{u.id}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                        <span className="user-name">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                    <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_active ? 'var(--success-500)' : 'var(--text-muted)', display: 'inline-block', marginRight: 4 }} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="action-row">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentAdmin?.user_id}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setRoleTarget(u); setNewRole(u.role); }}
                          disabled={u.id === currentAdmin?.user_id}
                        >
                          Role
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentAdmin?.user_id}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="pagination">
                <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>&larr; Prev</button>
                <span className="pagination-info">Showing {offset + 1}&ndash;{Math.min(offset + LIMIT, total)} of {total}</span>
                <button className="btn btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next &rarr;</button>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'invitations' && (
        <>
          {/* Filters */}
          <div className="filter-bar">
            <div className="search-box">
              <IconSearch size={15} />
              <input
                className="search-input"
                placeholder="Search by name or email…"
                value={invSearch}
                onChange={(e) => { setInvSearch(e.target.value); setInvOffset(0); }}
              />
              {invSearch && <button className="icon-btn" onClick={() => { setInvSearch(''); setInvOffset(0); }}><IconX size={14} /></button>}
            </div>
            <select
              className="filter-select"
              value={invStatusFilter}
              onChange={(e) => { setInvStatusFilter(e.target.value); setInvOffset(0); }}
            >
              <option value="">All Statuses</option>
              {INVITATION_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invLoading && <tr><td colSpan={7} className="table-empty">Loading…</td></tr>}
                {!invLoading && invitations.length === 0 && <tr><td colSpan={7} className="table-empty">No invitations found.</td></tr>}
                {!invLoading && invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{inv.id}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{(inv.full_name || inv.email).charAt(0).toUpperCase()}</div>
                        <span className="user-name">{inv.full_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{inv.email}</td>
                    <td><span className={`badge ${ROLE_COLORS[inv.role] || 'badge-gray'}`}>{inv.role}</span></td>
                    <td><span className={`badge ${INVITATION_STATUS_COLORS[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconClock size={12} /> {formatExpiry(inv.expires_at)}
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleResend(inv)}
                          disabled={inv.status !== 'pending' || resendingId === inv.id}
                        >
                          <IconRefreshCw size={13} /> {resendingId === inv.id ? 'Resending…' : 'Resend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {invTotal > INV_LIMIT && (
              <div className="pagination">
                <button className="btn btn-secondary btn-sm" disabled={invOffset === 0} onClick={() => setInvOffset(Math.max(0, invOffset - INV_LIMIT))}>&larr; Prev</button>
                <span className="pagination-info">Showing {invOffset + 1}&ndash;{Math.min(invOffset + INV_LIMIT, invTotal)} of {invTotal}</span>
                <button className="btn btn-secondary btn-sm" disabled={invOffset + INV_LIMIT >= invTotal} onClick={() => setInvOffset(invOffset + INV_LIMIT)}>Next &rarr;</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* â”€â”€ Bulk confirm dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {confirmBulkAction && (
        <ConfirmDialog
          title={`Bulk ${confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1)} ${selected.size} Users`}
          message={`Are you sure you want to ${confirmBulkAction} ${selected.size} selected user${selected.size !== 1 ? 's' : ''}? This action applies to all selected accounts.`}
          confirmLabel={confirmBulkAction === 'delete' ? 'Delete All' : confirmBulkAction.charAt(0).toUpperCase() + confirmBulkAction.slice(1) + ' All'}
          onConfirm={() => executeBulkAction(confirmBulkAction)}
          onCancel={() => setConfirmBulkAction(null)}
          loading={bulkLoading}
        />
      )}

      {/* â”€â”€ Delete Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete User Account"
          message={`Permanently delete "${deleteTarget.full_name || deleteTarget.email}"? This action cannot be undone.`}
          confirmLabel="Delete Permanently"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}

      {/* Role dialog */}
      {roleTarget && (
        <div className="modal-overlay" onClick={() => setRoleTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Change Role</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Changing role for <strong>{roleTarget.email}</strong>
                </p>
              </div>
              <button className="modal-close" onClick={() => setRoleTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="role-grid">
                {ROLES.map((r) => (
                  <div
                    key={r}
                    className={`role-option${newRole === r ? ' selected' : ''}`}
                    onClick={() => setNewRole(r)}
                  >
                    <div className="role-option-icon">
                      {r === 'admin' ? <IconShield size={20} color="#ef4444" /> : r === 'recruiter' ? <IconBuilding size={20} color="#2563eb" /> : r === 'hr' ? <IconBriefcase size={20} color="#f59e0b" /> : <IconTarget size={20} color="#3b82f6" />}
                    </div>
                    <div className="role-option-name">{r.charAt(0).toUpperCase() + r.slice(1)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setRoleTarget(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleRoleConfirm}
                  disabled={actionLoading || newRole === roleTarget.role}
                >
                  {actionLoading ? <span className="spinner" /> : <><IconCheck size={14} style={{ marginRight: 4 }} /> Update Role</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      {showCreate && (
        <CreateUserDialog
          orgs={orgs}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); flash('User created successfully.'); fetchUsers(); }}
        />
      )}

      {/* Invite User Dialog */}
      {showInvite && (
        <InviteUserDialog
          orgs={orgs}
          onClose={() => setShowInvite(false)}
          onSent={() => {
            setShowInvite(false);
            flash('Invitation sent successfully.');
            if (view === 'invitations') fetchInvitations();
          }}
        />
      )}
    </div>
  );
};

export default UsersPage;
