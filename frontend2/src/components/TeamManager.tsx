import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  jobs_posted: number;
  status: string;
  is_self: boolean;
  is_primary_account: boolean;
}

interface PendingInvite {
  id: number;
  invitee_email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface TeamManagerProps {
  userRole: string; // 'admin' | 'hr' | 'recruiter'
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: '#6366f1',
  HR: '#0ea5e9',
  RECRUITER: '#10b981',
};

const TeamManager: React.FC<TeamManagerProps> = ({ userRole }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [inviting, setInviting] = useState(false);

  const [resendingInvite, setResendingInvite] = useState<string | null>(null); // tracks email being resent

  // Role edit state
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');

  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const canManage = isAdmin || isHR;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, invitesRes] = await Promise.all([
        apiClient.getTeamMembersV2(),
        canManage ? apiClient.getPendingInvites() : Promise.resolve({ data: [] }),
      ]);
      setMembers(membersRes.data || []);
      setPendingInvites(invitesRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.inviteTeamMember({ email: inviteEmail, role: inviteRole });
      const data = res.data;
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteForm(false);
      fetchMembers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleUpdate = async (userId: number) => {
    try {
      await apiClient.updateMemberRole(userId, editRole);
      setSuccess('Role updated successfully');
      setEditingMember(null);
      fetchMembers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!window.confirm(`Remove ${name} from the team? They will be deactivated.`)) return;
    try {
      await apiClient.removeTeamMember(userId);
      setSuccess(`${name} has been removed from the team`);
      fetchMembers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleRevokeInvite = async (inviteId: number, email: string) => {
    if (!window.confirm(`Revoke invitation for ${email}?`)) return;
    try {
      await apiClient.revokeInvite(inviteId);
      setSuccess('Invitation revoked');
      fetchMembers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to revoke invitation');
    }
  };

  const handleResendInvite = async (email: string, role: string) => {
    setResendingInvite(email);
    setError('');
    setSuccess('');
    try {
      await apiClient.resendInvite(email, role);
      setSuccess(`Invitation resent to ${email}`);
      fetchMembers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to resend invitation');
    } finally {
      setResendingInvite(null);
    }
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
            Team Members
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted, #64748b)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#4f46e5')}
            onMouseOut={e => (e.currentTarget.style.background = '#6366f1')}
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#16a34a', fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <form onSubmit={handleInvite} style={{
          background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 20,
        }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: 'var(--text-primary, #1e293b)' }}>
            Invite a new team member
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Email address"
              required
              style={{
                flex: '1 1 220px', padding: '8px 12px', borderRadius: 6,
                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 6,
                border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', cursor: 'pointer',
              }}
            >
              {isAdmin && <option value="hr">HR</option>}
              <option value="recruiter">Recruiter</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              style={{
                padding: '8px 18px', background: '#6366f1', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.7 : 1,
              }}
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              style={{ padding: '8px 14px', background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 }}>Loading team…</div>
      ) : (
        <div style={{ border: '1px solid var(--border-light, #e2e8f0)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px',
            gap: 12, padding: '10px 16px',
            background: 'var(--bg-tertiary, #f1f5f9)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94a3b8',
          }}>
            <span>Member</span>
            <span>Role</span>
            <span>Jobs Posted</span>
            {canManage && <span>Actions</span>}
          </div>

          {members.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No team members found
            </div>
          ) : (
            members.map(member => (
              <div
                key={member.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px',
                  gap: 12, padding: '14px 16px', alignItems: 'center',
                  borderTop: '1px solid var(--border-light, #e2e8f0)',
                  background: member.is_self ? 'rgba(99,102,241,0.04)' : 'transparent',
                }}
              >
                {/* Name / email */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{member.name}</span>
                    {member.is_self && (
                      <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>You</span>
                    )}
                    {member.is_primary_account && (
                      <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>Owner</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{member.email}</div>
                </div>

                {/* Role badge / edit */}
                <div>
                  {editingMember === member.user_id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      >
                        <option value="hr">HR</option>
                        <option value="recruiter">Recruiter</option>
                      </select>
                      <button onClick={() => handleRoleUpdate(member.user_id)} style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingMember(null)} style={{ padding: '4px 8px', background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                      fontSize: 12, fontWeight: 600, color: '#fff',
                      background: ROLE_BADGE[member.role.toUpperCase()] || '#94a3b8',
                    }}>
                      {member.role}
                    </span>
                  )}
                </div>

                {/* Jobs posted */}
                <div style={{ fontSize: 13, color: '#475569' }}>{member.jobs_posted}</div>

                {/* Actions */}
                {canManage && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isAdmin && !member.is_self && member.role.toUpperCase() !== 'ADMIN' && (
                      <button
                        onClick={() => { setEditingMember(member.user_id); setEditRole(member.role.toLowerCase()); }}
                        title="Change role"
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#475569' }}
                      >
                        Edit
                      </button>
                    )}
                    {isAdmin && !member.is_self && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.name)}
                        title="Remove member"
                        style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#ef4444' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Invitations */}
      {canManage && pendingInvites.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#475569' }}>
            Pending Invitations ({pendingInvites.length})
          </h4>
          <div style={{ border: '1px solid #fde68a', borderRadius: 10, overflow: 'hidden', background: '#fffbeb' }}>
            {pendingInvites.map(inv => (
              <div
                key={inv.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderTop: '1px solid #fde68a',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{inv.invitee_email}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>
                    {inv.role}
                  </span>
                  <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => handleResendInvite(inv.invitee_email, inv.role)}
                    disabled={resendingInvite === inv.invitee_email}
                    title="Resend invitation email"
                    style={{
                      fontSize: 12, color: '#6366f1', background: 'none',
                      border: '1px solid #c7d2fe', borderRadius: 6, padding: '4px 10px',
                      cursor: resendingInvite === inv.invitee_email ? 'not-allowed' : 'pointer',
                      opacity: resendingInvite === inv.invitee_email ? 0.6 : 1,
                      fontWeight: 600,
                    }}
                  >
                    {resendingInvite === inv.invitee_email ? 'Sending…' : '↩ Send Again'}
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(inv.id, inv.invitee_email)}
                    style={{ fontSize: 12, color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;
