import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { syncAuthUserToStorage } from '../utils/authStorage';
import OtpStep from '../components/auth/OtpStep';
import '../styles/Landing.css';
import '../styles/Auth.css';

type CompanyRole = 'recruiter' | 'hr';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get('role');
  const isCompanyFlow = searchParams.get('type') === 'company' || urlRole !== null;
  const isCandidateFlow = searchParams.get('type') === 'candidate';

  const [userType, setUserType] = useState<'candidate' | 'company'>(
    isCompanyFlow ? 'company' : (isCandidateFlow ? 'candidate' : 'company')
  );
  const [companyRole, setCompanyRole] = useState<CompanyRole>(urlRole === 'hr' ? 'hr' : 'recruiter');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpPending, setOtpPending] = useState(false);

  // Called with the verify-otp response: the account's email is now
  // verified and the server has issued the session token.
  const completeAuth = (data: any) => {
    const isProfileComplete = data.is_profile_complete ?? false;
    const authUser = {
      user_id: data.user_id,
      email: data.email,
      role: (data.role || '').toLowerCase().trim(),
      full_name: data.full_name || '',
      company_name: data.company_name,
      is_profile_complete: isProfileComplete,
    };
    localStorage.setItem('token', data.token);
    syncAuthUserToStorage(authUser);
    setUser(authUser);

    navigate(authUser.role === 'candidate' ? '/candidate-profile-setup' : '/company-profile-setup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = userType === 'candidate'
        ? await apiClient.candidateSignup(email, fullName, password)
        : await apiClient.companySignup(email, fullName, password, companyRole);

      if (response.data.otp_required) {
        setOtpPending(true);
        return;
      }

      // Fallback: server issued a token directly (no OTP flow)
      completeAuth(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
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
            <span className="tg-auth-nav-hint">Already have an account?</span>
            <button className="tg-btn tg-btn-outline" onClick={() => navigate('/signin')}>Sign in</button>
          </div>
        </div>
      </header>

      <main className="tg-auth-main">
        <div className="tg-auth-card">
          {otpPending ? (
            <OtpStep
              email={email}
              purpose="signup"
              onSuccess={completeAuth}
              onBack={() => { setOtpPending(false); setError(''); }}
            />
          ) : (
          <>
          <h1>Create your account</h1>
          <p className="tg-auth-sub">Start your 14-day free trial — no credit card required</p>

          <div className="tg-tabs tg-auth-role-tabs">
            <button type="button" className={`tg-tab ${userType === 'company' && companyRole === 'recruiter' ? 'active' : ''}`} onClick={() => { setUserType('company'); setCompanyRole('recruiter'); }}>Recruiter</button>
            <button type="button" className={`tg-tab ${userType === 'candidate' ? 'active' : ''}`} onClick={() => setUserType('candidate')}>Candidate</button>
            <button type="button" className={`tg-tab ${userType === 'company' && companyRole === 'hr' ? 'active' : ''}`} onClick={() => { setUserType('company'); setCompanyRole('hr'); }}>HR Manager</button>
          </div>

          <form onSubmit={handleSubmit} className="tg-auth-form">
            <label>Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />

            <label>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="elena.marsh@acme.co" required />

            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" required />

            <label>Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••" required />

            {error && <div className="tg-demo-error">{error}</div>}

            <button type="submit" className="tg-btn tg-btn-primary tg-btn-lg tg-btn-block" disabled={loading}>
              {loading ? 'Creating account…' : 'Sign Up to TalentGraph'}
            </button>
          </form>

          <p className="tg-auth-switch">
            Already have an account? <a href="/signin" onClick={(e) => { e.preventDefault(); navigate('/signin'); }}>Sign in</a>
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignUpPage;
