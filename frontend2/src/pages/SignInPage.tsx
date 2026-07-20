import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { syncAuthUserToStorage } from '../utils/authStorage';
import '../styles/Landing.css';
import '../styles/Auth.css';

type CompanyRole = 'recruiter' | 'hr' | 'admin';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get('role');
  const isCandidateFlow = searchParams.get('type') === 'candidate';

  const [userType, setUserType] = useState<'candidate' | 'company'>(isCandidateFlow ? 'candidate' : 'company');
  const [companyRole, setCompanyRole] = useState<CompanyRole>(
    urlRole === 'recruiter' || urlRole === 'hr' || urlRole === 'admin' ? urlRole : 'recruiter'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;

      const isAdminLogin =
        (userType === 'company' && companyRole === 'admin') ||
        email.toLowerCase() === 'talentgraph.interviews@gmail.com';

      if (isAdminLogin) {
        response = await apiClient.adminLogin(email, password);
        localStorage.setItem('token', response.data.token);
        syncAuthUserToStorage({
          user_id: response.data.user_id,
          email: response.data.email,
          role: 'admin',
          full_name: response.data.full_name || '',
          is_profile_complete: true,
        });
        setUser({
          user_id: response.data.user_id,
          email: response.data.email,
          role: 'admin',
          full_name: response.data.full_name || '',
          is_profile_complete: true,
        });
        navigate('/admin/logs');
        return;
      }

      response = userType === 'candidate'
        ? await apiClient.candidateLogin(email, password)
        : await apiClient.companyLogin(email, password);

      const isProfileComplete = response.data.is_profile_complete ?? false;
      const authUser = {
        user_id: response.data.user_id,
        email: response.data.email,
        role: (response.data.role || '').toLowerCase().trim(),
        full_name: response.data.full_name || '',
        company_name: response.data.company_name,
        is_profile_complete: isProfileComplete,
      };

      localStorage.setItem('token', response.data.token);
      syncAuthUserToStorage(authUser);
      setUser(authUser);

      if (userType === 'candidate') {
        navigate(isProfileComplete ? '/candidate-dashboard' : '/candidate-profile-setup');
      } else {
        navigate(isProfileComplete ? '/recruiter-dashboard' : '/company-profile-setup');
      }
    } catch (err: any) {
      console.error('[AUTH ERROR] Sign in failed:', err);
      if (err.response?.status === 403) {
        setError('Access denied: Please check your credentials and user type.');
      } else {
        setError(err.response?.data?.detail || 'Sign in failed');
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
          </div>
          <div className="tg-nav-actions">
            <span className="tg-auth-nav-hint">New to TalentGraph?</span>
            <button className="tg-btn tg-btn-outline" onClick={() => navigate('/signup')}>Create account</button>
          </div>
        </div>
      </header>

      <main className="tg-auth-main">
        <div className="tg-auth-card">
          <h1>Welcome back</h1>
          <p className="tg-auth-sub">Sign in to your TalentGraph account</p>

          <div className="tg-tabs tg-auth-role-tabs">
            <button type="button" className={`tg-tab ${userType === 'company' && companyRole === 'recruiter' ? 'active' : ''}`} onClick={() => { setUserType('company'); setCompanyRole('recruiter'); }}>Recruiter</button>
            <button type="button" className={`tg-tab ${userType === 'candidate' ? 'active' : ''}`} onClick={() => setUserType('candidate')}>Candidate</button>
            <button type="button" className={`tg-tab ${userType === 'company' && companyRole === 'hr' ? 'active' : ''}`} onClick={() => { setUserType('company'); setCompanyRole('hr'); }}>HR Manager</button>
            <button type="button" className={`tg-tab ${userType === 'company' && companyRole === 'admin' ? 'active' : ''}`} onClick={() => { setUserType('company'); setCompanyRole('admin'); }} title="System Administrator - sign in only">Admin</button>
          </div>

          <form onSubmit={handleSubmit} className="tg-auth-form">
            <label>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="elena.marsh@acme.co" required />

            <div className="tg-auth-label-row">
              <label>Password</label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset coming soon!'); }}>Forgot password?</a>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" required />

            <label className="tg-auth-checkbox">
              <input type="checkbox" />
              Remember me on this device for 30 days
            </label>

            {error && <div className="tg-demo-error">{error}</div>}

            <button type="submit" className="tg-btn tg-btn-primary tg-btn-lg tg-btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to TalentGraph'}
            </button>
          </form>

          <p className="tg-auth-switch">
            Don't have an account? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Sign up</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
