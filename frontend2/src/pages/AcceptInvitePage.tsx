import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface InviteInfo {
  valid: boolean;
  invitee_email: string;
  role: string;
  company_name: string;
}

const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    apiClient
      .validateInvite(token)
      .then(res => {
        setInviteInfo(res.data);
      })
      .catch(() => {
        setInviteInfo({ valid: false, invitee_email: '', role: '', company_name: '' });
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.acceptInvite({ token, full_name: fullName, password });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    padding: 20,
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 8px 40px rgba(99,102,241,0.12)',
  };

  if (validating) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Validating your invitation…</p>
        </div>
      </div>
    );
  }

  if (!token || !inviteInfo?.valid) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Invalid Invitation</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              This invitation link is invalid, has already been used, or has expired.
            </p>
            <button
              onClick={() => navigate('/signin')}
              style={{
                marginTop: 20, padding: '10px 24px', background: '#6366f1',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Welcome to {inviteInfo.company_name}!</h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Your account has been created. You can now sign in.
            </p>
            <button
              onClick={() => navigate('/signin')}
              style={{
                marginTop: 20, padding: '10px 24px', background: '#6366f1',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 20,
            background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 600, marginBottom: 12,
          }}>
            {inviteInfo.role.charAt(0).toUpperCase() + inviteInfo.role.slice(1)} Invitation
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
            Join {inviteInfo.company_name}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            You've been invited as{' '}
            <strong style={{ color: '#6366f1' }}>{inviteInfo.role}</strong>{' '}
            to <strong>{inviteInfo.company_name}</strong>. Create your account to accept.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email (pre-filled, read-only) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              value={inviteInfo.invitee_email}
              readOnly
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                fontSize: 14, color: '#64748b', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '12px', background: '#6366f1',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {submitting ? 'Creating Account…' : 'Accept & Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
          Already have an account?{' '}
          <span
            onClick={() => navigate('/signin')}
            style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
