import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api/client';
import { useAuth } from '../contexts/AuthContext';import { IconAlertTriangle } from '../components/Icons';
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(email.trim(), password);
      const data = res.data;
      const token = data.token || data.access_token;
      const role = (data.role ?? '').toLowerCase();

      if (!token || role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        return;
      }

      login(token, {
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name || '',
        role,
      });

      navigate('/dashboard');
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
    <div className="auth-shell">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">TG</div>
          <div className="auth-logo-text">
            <div className="auth-logo-name">TalentGraph</div>
            <div className="auth-logo-badge">Admin Portal</div>
          </div>
        </div>

        <div className="auth-title">Administrator Sign In</div>
        <div className="auth-subtitle">
          Restricted access — system administrators only.
        </div>

        {error && <div className="auth-error"><IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit btn-lg"
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in to Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
