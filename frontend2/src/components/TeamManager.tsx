import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import '../styles/TeamManager.css';

interface TeamMember {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  employee_type: string;
  role: string;
  jobs_posted: number;
}

interface TeamManagerProps {
  userRole?: string;
  canManageTeam?: boolean;
}

const TeamManager: React.FC<TeamManagerProps> = ({ userRole = 'recruiter', canManageTeam = false }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const members = await apiClient.getTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const companyName = localStorage.getItem('company_name') || '';
      await apiClient.inviteTeamMember(inviteEmail, inviteRole, companyName);
      alert('Invitation sent successfully!');
      setInviteEmail('');
      setInviteRole('recruiter');
      setShowInviteForm(false);
      fetchTeamMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: number) => {
    if (!newRole) return;

    try {
      setLoading(true);
      await apiClient.updateTeamMemberRole(memberId, newRole);
      alert('Member role updated successfully!');
      setEditingMemberId(null);
      setNewRole('');
      fetchTeamMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update member role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.removeTeamMember(memberId);
      alert('Team member removed successfully!');
      fetchTeamMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove team member');
    } finally {
      setLoading(false);
    }
  };

  if (loading && teamMembers.length === 0) {
    return <div className="team-manager loading">Loading team members...</div>;
  }

  return (
    <div className="team-manager">
      <div className="team-header">
        <h3>Team Members</h3>
        {canManageTeam && (
          <button
            className="btn-add-member"
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            {showInviteForm ? 'Cancel' : '+ Add Team Member'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showInviteForm && canManageTeam && (
        <form className="invite-form" onSubmit={handleInviteMember}>
          <h4>Invite Team Member</h4>
          <div className="form-group">
            <label htmlFor="invite-email">Email Address</label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="recruiter">Recruiter</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            Send Invitation
          </button>
        </form>
      )}

      <div className="team-list">
        {teamMembers.length === 0 ? (
          <p className="no-members">No team members yet</p>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Job Postings</th>
                {canManageTeam && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name}</td>
                  <td>{member.email}</td>
                  <td>
                    {editingMemberId === member.id && canManageTeam ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                      >
                        <option value="">Select Role</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`role-badge ${member.role.toLowerCase()}`}>
                        {member.role.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td>{member.jobs_posted}</td>
                  {canManageTeam && (
                    <td className="actions">
                      {editingMemberId === member.id ? (
                        <>
                          <button
                            className="btn-save"
                            onClick={() => handleUpdateRole(member.id)}
                            disabled={!newRole || loading}
                          >
                            Save
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => {
                              setEditingMemberId(null);
                              setNewRole('');
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-edit"
                            onClick={() => {
                              setEditingMemberId(member.id);
                              setNewRole(member.role);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-remove"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeamManager;
