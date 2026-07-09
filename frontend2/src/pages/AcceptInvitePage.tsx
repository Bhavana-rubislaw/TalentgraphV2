import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

// ── SVG Icons ─────────────────────────────────────────────────────────────
const CheckCircleIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="28" r="28" fill="#ecfdf5"/>
    <circle cx="28" cy="28" r="20" fill="#d1fae5"/>
    <path d="M19 28.5L24.5 34L37 22" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="28" r="28" fill="#fff7ed"/>
    <circle cx="28" cy="28" r="20" fill="#fed7aa"/>
    <path d="M28 20v10M28 34v2" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const TalentGraphLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="2.5" fill="white" fillOpacity="0.9"/>
        <circle cx="15" cy="5" r="2.5" fill="white" fillOpacity="0.9"/>
        <circle cx="15" cy="15" r="2.5" fill="white" fillOpacity="0.9"/>
        <line x1="5" y1="10" x2="15" y2="5" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
        <line x1="5" y1="10" x2="15" y2="15" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
        <line x1="15" y1="5" x2="15" y2="15" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
      </svg>
    </div>
    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' }}>TalentGraph</span>
  </div>
);

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
    background: 'linear-gradient(145deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
    padding: 20,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 20,
    padding: '40px 40px 36px',
    maxWidth: 460,
    width: '100%',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -10px rgba(99,102,241,0.15)',
    border: '1px solid rgba(226,232,240,0.8)',
  };

  if (validating) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <TalentGraphLogo />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 36, height: 36, border: '3px solid #e0e7ff',
              borderTopColor: '#6366f1', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Validating your invitation…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !inviteInfo?.valid) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <TalentGraphLogo />
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <WarningIcon />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.4px' }}>
              Invalid Invitation
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              This invitation link is invalid, has already been used, or has expired.
              Please contact your administrator for a new invitation.
            </p>
            <button
              onClick={() => navigate('/signin')}
              style={{
                padding: '11px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1px',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
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
          <TalentGraphLogo />
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <CheckCircleIcon />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.4px' }}>
              Account Created Successfully
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }}>
              Welcome to <strong style={{ color: '#1e293b' }}>{inviteInfo.company_name}</strong>.
            </p>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Your account is ready. Sign in to get started.
            </p>
            <button
              onClick={() => navigate('/signin')}
              style={{
                padding: '11px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1px',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              Sign In to Your Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <TalentGraphLogo />

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            color: '#6d28d9', fontSize: 12, fontWeight: 600, marginBottom: 14,
            letterSpacing: '0.3px', textTransform: 'uppercase',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="#6d28d9" strokeWidth="1.5"/>
              <path d="M3 5l1.5 1.5L7 3.5" stroke="#6d28d9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {inviteInfo.role.charAt(0).toUpperCase() + inviteInfo.role.slice(1)} Invitation
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Join {inviteInfo.company_name}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            You've been invited as{' '}
            <strong style={{ color: '#6366f1' }}>{inviteInfo.role}</strong>.{' '}
            Complete your profile to accept.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', marginBottom: 24 }} />

        <form onSubmit={handleSubmit}>
          {/* Email (pre-filled, read-only) */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.2px' }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={inviteInfo.invitee_email}
              readOnly
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                fontSize: 14, color: '#94a3b8', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.2px' }}>
              FULL NAME
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', fontSize: 14,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.2px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', fontSize: 14,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.2px' }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', fontSize: 14,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 10,
              padding: '10px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13, lineHeight: 1.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/>
                <path d="M8 5v4M8 11v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '13px',
              background: submitting ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.1px', transition: 'all 0.2s',
              boxShadow: submitting ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            {submitting ? 'Creating Account…' : 'Accept Invitation & Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
          Already have an account?{' '}
          <span
            onClick={() => navigate('/signin')}
            style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign in here
          </span>
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
