import React, { useEffect, useState, useCallback } from 'react';
import {
  listUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  IconShield, IconBuilding, IconBriefcase, IconTarget,
  IconTrash, IconCheck, IconAlertTriangle,
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

const UsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // Dialog state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');

    const params: Record<string, any> = { limit: LIMIT, offset };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (activeFilter !== '') params.is_active = activeFilter === 'true';

    listUsers(params)
      .then((res) => {
        setUsers(res.data.users);
        setTotal(res.data.total);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'Failed to load users.';
        setError(String(msg));
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, activeFilter, offset]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (u: User) => {
    try {
      await updateUserStatus(u.id, !u.is_active);
      flash(`User ${u.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update user status.');
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
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete user.');
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
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update role.');
      setRoleTarget(null);
    } finally {
      setActionLoading(false);
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
          <p className="page-subtitle">{total} registered users on the platform</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {success && <div className="alert alert-success"><IconCheck size={15} color="currentColor" style={{ marginRight: 6 }} />{success}</div>}
      {error   && <div className="alert alert-error"><IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />{error}</div>}

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
        />
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
          onChange={(e) => { setActiveFilter(e.target.value as any); setOffset(0); }}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="table-empty">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="table-empty">No users found.</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id}>
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
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_active ? 'var(--success-500)' : 'var(--text-muted)', display: 'inline-block' }} />
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
            <button className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Prev</button>
            <span className="pagination-info">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <button className="btn btn-secondary btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>Next →</button>
          </div>
        )}
      </div>

      {/* ── Delete Dialog ──────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete User Account"
          message={`Permanently delete "${deleteTarget.full_name || deleteTarget.email}"? This action cannot be undone and will remove all associated data.`}
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
              <button className="modal-close" onClick={() => setRoleTarget(null)}>×</button>
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
                      {r === 'admin' ? <IconShield size={20} color="#ef4444" /> : r === 'recruiter' ? <IconBuilding size={20} color="#764ba2" /> : r === 'hr' ? <IconBriefcase size={20} color="#f59e0b" /> : <IconTarget size={20} color="#3b82f6" />}
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
    </div>
  );
};

export default UsersPage;
