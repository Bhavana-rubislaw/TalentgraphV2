import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { IconAlertTriangle } from '../components/Icons';
import OtpStep from '../components/OtpStep';
import '../styles/Landing.css';
import '../styles/Auth.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpPending, setOtpPending] = useState(false);

  const completeLogin = (data: any) => {
    const token = data.token || data.access_token;
    const role = (data.role ?? '').toLowerCase();

    if (!token || role !== 'admin') {
      setError('Access denied. This portal is for administrators only.');
      setOtpPending(false);
      return;
    }

    login(token, {
      user_id: data.user_id,
      email: data.email,
      full_name: data.full_name || '',
      role,
    });

    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(email.trim(), password);

      if (res.data.otp_required) {
        setOtpPending(true);
        return;
      }

      // Fallback: server issued a token directly (no OTP flow)
      completeLogin(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-landing tg-auth">
      <header className="tg-nav">
        <div className="tg-nav-inner">
          <div className="tg-logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
            <span className="tg-logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </span>
            TalentGraph
            <span className="tg-badge tg-badge-blue" style={{ marginLeft: 8 }}>Admin</span>
          </div>
          <div className="tg-nav-actions">
            <span className="tg-auth-nav-hint">Restricted access — administrators only</span>
          </div>
        </div>
      </header>

      <main className="tg-auth-main">
        <div className="tg-auth-card">
          {otpPending ? (
            <OtpStep
              email={email}
              onSuccess={completeLogin}
              onBack={() => { setOtpPending(false); setError(''); }}
            />
          ) : (
          <>
          <h1>Administrator Sign In</h1>
          <p className="tg-auth-sub">Sign in to the TalentGraph admin console</p>

          <form onSubmit={handleSubmit} className="tg-auth-form" autoComplete="on">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="tg-demo-error">
                <IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />
                {error}
              </div>
            )}

            <button type="submit" className="tg-btn tg-btn-primary tg-btn-lg tg-btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to Admin Portal'}
            </button>
          </form>
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
