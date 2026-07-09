import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Form.css';
import '../styles/AuthLayout.css';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isSignIn = location.pathname === '/signin';
  const urlRole = searchParams.get('role');
  const isCompanyFlow = searchParams.get('type') === 'company' || urlRole !== null;
  const isCandidateFlow = searchParams.get('type') === 'candidate';
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    userType: isCompanyFlow ? 'company' : (isCandidateFlow ? 'candidate' : 'company'),
    companyRole: urlRole === 'recruiter' ? 'recruiter' : 'recruiter', // Default to recruiter instead of admin
    signInRole: 'recruiter', // For sign-in role validation
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update companyRole if URL param changes
    if (urlRole) {
      if (urlRole === 'recruiter' || urlRole === 'hr' || urlRole === 'admin') {
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: urlRole
        }));
      } else {
        // Default to recruiter for any other URL role
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: 'recruiter'
        }));
      }
    }
  }, [urlRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      
      // Check if admin role is selected OR if this is the system admin email
      if ((formData.userType === 'company' && formData.companyRole === 'admin') || 
          formData.email.toLowerCase() === 'talentgraph.interviews@gmail.com') {
        // Use admin login endpoint
        response = await apiClient.post('/auth/admin/login', {
          email: formData.email,
          password: formData.password
        });
        // Save token and user info
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user_id', String(response.data.user_id));
        localStorage.setItem('email', response.data.email);
        localStorage.setItem('role', 'admin');
        if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
        
        // Set user in context
        setUser({
          user_id: response.data.user_id,
          email: response.data.email,
          role: 'admin',
          full_name: response.data.full_name || '',
          is_profile_complete: true,
        });
        
        // Redirect to admin dashboard or default page
        navigate('/admin/logs'); // or any admin route you have
        return;
      }
      
      // Regular user login (candidate/recruiter/hr)
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateLogin(formData.email, formData.password);
      } else {
        response = await apiClient.companyLogin(formData.email, formData.password);
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', String(response.data.user_id));
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);
      
      // Store profile completion status
      const isProfileComplete = response.data.is_profile_complete ?? false;
      localStorage.setItem('is_profile_complete', String(isProfileComplete));

      // Immediately sync AuthContext so ProtectedRoute uses the fresh role
      setUser({
        user_id: response.data.user_id,
        email: response.data.email,
        role: (response.data.role || '').toLowerCase().trim(),
        full_name: response.data.full_name || '',
        company_name: response.data.company_name,
        is_profile_complete: isProfileComplete,
      });

      // Redirect based on profile completion status
      if (formData.userType === 'candidate') {
        if (isProfileComplete) {
          navigate('/candidate-dashboard');
        } else {
          navigate('/candidate-profile-setup');
        }
      } else {
        if (isProfileComplete) {
          navigate('/recruiter-dashboard');
        } else {
          navigate('/company-profile-setup');
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignIn) {
      return handleSignIn(e);
    }

    setError('');

    // Prevent admin signup
    if (formData.userType === 'company' && formData.companyRole === 'admin') {
      setError('System Admin accounts cannot be created through signup. Admin is for sign-in only.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      console.warn('[VALIDATION] Password mismatch');
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      // Use appropriate signup endpoint based on user type
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateSignup(
          formData.email,
          formData.fullName,
          formData.password
        );
      } else {
        response = await apiClient.companySignup(
          formData.email,
          formData.fullName,
          formData.password,
          formData.companyRole
        );
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', String(response.data.user_id));
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);
      
      // Store profile completion status (new signups are always incomplete)
      const isProfileComplete = response.data.is_profile_complete ?? false;
      localStorage.setItem('is_profile_complete', String(isProfileComplete));

      // Immediately sync AuthContext so ProtectedRoute uses the fresh role
      setUser({
        user_id: response.data.user_id,
        email: response.data.email,
        role: (response.data.role || '').toLowerCase().trim(),
        full_name: response.data.full_name || '',
        company_name: response.data.company_name,
        is_profile_complete: isProfileComplete,
      });

      // New users always go to profile setup (is_profile_complete will be false)
      if (formData.userType === 'candidate') {
        navigate('/candidate-profile-setup');
      } else {
        navigate('/company-profile-setup');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Branding Panel */}
      <div className="auth-branding-panel">
        <div className="auth-gradient-bg"></div>
        <div className="auth-visual-elements">
          <div className="auth-blur-shape auth-blur-1"></div>
          <div className="auth-blur-shape auth-blur-2"></div>
          <div className="auth-blur-shape auth-blur-3"></div>
        </div>
        <div className="auth-branding-content">
          <div className="auth-brand-header">
            <div className="auth-brand-logo-small">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="auth-brand-name">TalentGraph</span>
          </div>
          
          <div className="auth-brand-content-main">
            <p className="auth-tagline">Welcome Back</p>
            <p className="auth-description">
            Sign in to your TalentGraph account
          </p>
          <p className="auth-platform-description">
            TalentGraph connects candidates, recruiters, HR teams, and system administrators through intelligent profile matching, job discovery, application tracking, interview scheduling, and real-time notifications.
          </p>
          
          {/* Role Cards */}
          <div className="auth-role-cards">
            <div className="auth-role-card">
              <div className="auth-role-icon candidate-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="auth-role-content">
                <h3 className="auth-role-title">Candidate</h3>
                <p className="auth-role-description">Discover and apply for matched opportunities</p>
              </div>
            </div>
            
            <div className="auth-role-card">
              <div className="auth-role-icon recruiter-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21V19C23 18.1171 22.7241 17.2843 22.2338 16.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-role-content">
                <h3 className="auth-role-title">Recruiter</h3>
                <p className="auth-role-description">Source talent and manage applications</p>
              </div>
            </div>
            
            <div className="auth-role-card">
              <div className="auth-role-icon hr-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-role-content">
                <h3 className="auth-role-title">HR Manager</h3>
                <p className="auth-role-description">Oversee company-wide hiring initiatives</p>
              </div>
            </div>
            
            <div className="auth-role-card">
              <div className="auth-role-icon admin-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-role-content">
                <h3 className="auth-role-title">System Admin</h3>
                <p className="auth-role-description">Platform administration (restricted access)</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-card">
            {/* Logo Icon */}
            <div className="auth-logo-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {/* Header */}
            <div className="auth-header">
              <h2 className="auth-title">TalentGraph</h2>
              <p className="auth-subtitle">Where careers and companies connect</p>
            </div>
            
            {/* Sign In / Sign Up Toggle */}
            <div className="auth-mode-toggle">
              <button
                type="button"
                className={`auth-mode-button ${isSignIn ? 'active' : ''}`}
                onClick={() => {
                  const userTypeParam = formData.userType === 'candidate' ? '?type=candidate' : '?type=company';
                  navigate(`/signin${userTypeParam}`);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-mode-button ${!isSignIn ? 'active' : ''}`}
                onClick={() => {
                  const userTypeParam = formData.userType === 'candidate' ? '?type=candidate' : '?type=company';
                  navigate(`/signup${userTypeParam}`);
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Role Selection Buttons */}
              <div className="auth-form-group">
                <label className="auth-form-label">I AM A</label>
                <div className="auth-role-buttons">
                  <button
                    type="button"
                    className={`auth-role-select-button ${formData.userType === 'company' && formData.companyRole === 'recruiter' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, userType: 'company', companyRole: 'recruiter' })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M23 21V19C23 18.1171 22.7241 17.2843 22.2338 16.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Recruiter
                  </button>
                  <button
                    type="button"
                    className={`auth-role-select-button ${formData.userType === 'candidate' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, userType: 'candidate', companyRole: 'recruiter' })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Candidate
                  </button>
                  <button
                    type="button"
                    className={`auth-role-select-button ${formData.userType === 'company' && formData.companyRole === 'hr' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, userType: 'company', companyRole: 'hr' })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    HR Manager
                  </button>
                  <button
                    type="button"
                    className={`auth-role-select-button ${formData.userType === 'company' && formData.companyRole === 'admin' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, userType: 'company', companyRole: 'admin' })}
                    title="System Administrator - Sign in only"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Admin
                  </button>
                </div>
                {formData.userType === 'company' && formData.companyRole === 'admin' && (
                  <div style={{marginTop: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic'}}>
                    System Admin login only. Use: talentgraph.interviews@gmail.com
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="auth-form-group">
                <label className="auth-form-label">Email address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="elena.marsh@acme.co"
                  required
                  className="auth-form-input"
                />
              </div>

              {/* Password Field */}
              <div className="auth-form-group">
                <div className="auth-label-row">
                  <label className="auth-form-label">Password</label>
                  {isSignIn && (
                    <a href="#" className="auth-forgot-link" onClick={(e) => { e.preventDefault(); alert('Password reset coming soon!'); }}>
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••"
                  required
                  className="auth-form-input"
                />
              </div>

              {/* Confirm Password - Only for signup */}
              {!isSignIn && (
                <div className="auth-form-group">
                  <label className="auth-form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••"
                    required
                    className="auth-form-input"
                  />
                </div>
              )}

              {/* Full Name - Only for signup */}
              {!isSignIn && (
                <div className="auth-form-group">
                  <label className="auth-form-label">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    className="auth-form-input"
                  />
                </div>
              )}

              {/* Remember Me - Only for sign in */}
              {isSignIn && (
                <div className="auth-checkbox-group">
                  <label className="auth-checkbox-label">
                    <input type="checkbox" className="auth-checkbox" />
                    <span>Remember me on this device for 30 days</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-button"
              >
                {loading ? (isSignIn ? 'Signing in...' : 'Creating Account...') : (isSignIn ? 'Sign In to TalentGraph' : 'Sign Up to TalentGraph')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
