import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Form.css';
import '../styles/AuthLayout.css';

const SignupPage: React.FC = () => {
  console.log('[COMPONENT MOUNT] SignupPage loaded');
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isSignIn = location.pathname === '/signin';
  const urlRole = searchParams.get('role');
  const isCompanyFlow = searchParams.get('type') === 'company' || urlRole !== null;
  const isCandidateFlow = searchParams.get('type') === 'candidate';
  console.log('[PAGE INFO] Mode:', isSignIn ? 'SignIn' : 'SignUp', 'URL Role:', urlRole, 'IsCompany:', isCompanyFlow, 'IsCandidate:', isCandidateFlow);
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    userType: isCompanyFlow ? 'company' : (isCandidateFlow ? 'candidate' : 'company'),
    companyRole: urlRole === 'recruiter' ? 'recruiter' : 'admin',
    signInRole: 'admin', // For sign-in role validation
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update companyRole if URL param changes
    if (urlRole) {
      if (urlRole === 'recruiter') {
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: 'recruiter'
        }));
      } else {
        // Default to admin for any other URL role
        setFormData(prev => ({
          ...prev,
          userType: 'company',
          companyRole: 'admin'
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

    console.log('[AUTH] Sign in attempt - Email:', formData.email, 'UserType:', formData.userType);
    try {
      let response;
      
      // Use appropriate login endpoint based on user type
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateLogin(formData.email, formData.password);
        console.log('[AUTH SUCCESS] Candidate logged in - Email:', response.data.email);
      } else {
        response = await apiClient.companyLogin(formData.email, formData.password);
        console.log('[AUTH SUCCESS] Company user logged in - Email:', response.data.email, 'Role:', response.data.role);
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', String(response.data.user_id));
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);

      // Immediately sync AuthContext so ProtectedRoute uses the fresh role
      setUser({
        user_id: response.data.user_id,
        email: response.data.email,
        role: (response.data.role || '').toLowerCase().trim(),
        full_name: response.data.full_name || '',
        company_name: response.data.company_name,
      });

      // Redirect based on user type
      if (formData.userType === 'candidate') {
        console.log('[NAVIGATION] Redirecting to candidate dashboard');
        navigate('/candidate-dashboard');
      } else {
        console.log('[NAVIGATION] Redirecting to recruiter dashboard');
        navigate('/recruiter-dashboard');
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

    if (formData.password !== formData.confirmPassword) {
      console.warn('[VALIDATION] Password mismatch');
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    console.log('[AUTH] Sign up attempt - Email:', formData.email, 'UserType:', formData.userType, 'CompanyRole:', formData.companyRole);
    try {
      let response;
      
      // Use appropriate signup endpoint based on user type
      if (formData.userType === 'candidate') {
        response = await apiClient.candidateSignup(
          formData.email,
          formData.fullName,
          formData.password
        );
        console.log('[AUTH SUCCESS] Candidate registered - Email:', response.data.email);
      } else {
        response = await apiClient.companySignup(
          formData.email,
          formData.fullName,
          formData.password,
          formData.companyRole
        );
        console.log('[AUTH SUCCESS] Company user registered - Email:', response.data.email, 'Role:', response.data.role);
      }

      // Save token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', String(response.data.user_id));
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);
      if (response.data.full_name) localStorage.setItem('full_name', response.data.full_name);
      if (response.data.company_name) localStorage.setItem('company_name', response.data.company_name);

      // Immediately sync AuthContext so ProtectedRoute uses the fresh role
      setUser({
        user_id: response.data.user_id,
        email: response.data.email,
        role: (response.data.role || '').toLowerCase().trim(),
        full_name: response.data.full_name || '',
        company_name: response.data.company_name,
      });

      // Redirect based on user type
      if (formData.userType === 'candidate') {
        console.log('[NAVIGATION] Redirecting to candidate dashboard');
        navigate('/candidate-dashboard');
      } else {
        console.log('[NAVIGATION] Redirecting to recruiter dashboard');
        navigate('/recruiter-dashboard');
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
          <div className="auth-brand-logo">
            <h1 className="auth-app-name">TalentGraph</h1>
            <div className="auth-app-version">V2</div>
          </div>
          <p className="auth-tagline">Smart Hiring. Smarter Matches.</p>
          <p className="auth-description">
            {formData.userType === 'candidate' 
              ? 'Connect with top companies and discover opportunities that match your skills and aspirations.'
              : 'Find exceptional talent faster with our AI-powered matching algorithm and comprehensive candidate insights.'
            }
          </p>
          <div className="auth-features">
            <div className="auth-feature-item">
              <svg className="auth-feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>AI-Powered Matching</span>
            </div>
            <div className="auth-feature-item">
              <svg className="auth-feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Real-time Analytics</span>
            </div>
            <div className="auth-feature-item">
              <svg className="auth-feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Seamless Communication</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {/* Back to Home Link */}
          <div className="auth-back-link">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="auth-back-button"
            >
              <svg className="auth-back-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </button>
          </div>

          <div className="auth-card">
            {/* Header */}
            <div className="auth-header">
              <h2 className="auth-title">
                {isSignIn ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="auth-subtitle">
                {isSignIn ? 
                  `Sign in to your ${formData.userType} account` : 
                  `Sign up as a ${formData.userType}`
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Company Role Selection for Company Signup/Signin */}
              {formData.userType === 'company' && (
                <div className="auth-form-group">
                  <label className="auth-form-label">Select Your Role</label>
                  <div className="auth-radio-group">
                    <label className={`auth-radio-option ${formData.companyRole === 'admin' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="companyRole"
                        value="admin"
                        checked={formData.companyRole === 'admin'}
                        onChange={handleChange}
                        className="auth-radio-input"
                      />
                      <div className="auth-radio-content">
                        <div className="auth-radio-title">ADMIN</div>
                        <div className="auth-radio-description">Full company access and management</div>
                      </div>
                    </label>
                    
                    <label className={`auth-radio-option ${formData.companyRole === 'hr' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="companyRole"
                        value="hr"
                        checked={formData.companyRole === 'hr'}
                        onChange={handleChange}
                        className="auth-radio-input"
                      />
                      <div className="auth-radio-content">
                        <div className="auth-radio-title">HR</div>
                        <div className="auth-radio-description">Manage jobs and candidates</div>
                      </div>
                    </label>
                    
                    <label className={`auth-radio-option ${formData.companyRole === 'recruiter' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="companyRole"
                        value="recruiter"
                        checked={formData.companyRole === 'recruiter'}
                        onChange={handleChange}
                        className="auth-radio-input"
                      />
                      <div className="auth-radio-content">
                        <div className="auth-radio-title">RECRUITER</div>
                        <div className="auth-radio-description">Manage assigned postings</div>
                      </div>
                    </label>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', marginTop: '8px' }}>
                    This role determines which features you can access after signing in
                  </p>
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

              <div className="auth-form-group">
                <label className="auth-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="auth-form-input"
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isSignIn ? "Your password" : "Min 8 chars, 1 uppercase, 1 digit, 1 special char"}
                  required
                  className="auth-form-input"
                />
                {!isSignIn && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Must be at least 8 characters with uppercase, digit, and special character
                  </p>
                )}
              </div>

              {!isSignIn && (
                <div className="auth-form-group">
                  <label className="auth-form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    className="auth-form-input"
                  />
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
                {loading ? (isSignIn ? 'Signing in...' : 'Creating Account...') : (isSignIn ? 'Sign In' : 'Sign Up')}
              </button>

              <div className="auth-toggle">
                <button
                  type="button"
                  onClick={() => {
                    const userTypeParam = formData.userType === 'candidate' ? '?type=candidate' : '?type=company';
                    navigate(isSignIn ? `/signup${userTypeParam}` : `/signin${userTypeParam}`);
                  }}
                  className="auth-toggle-button"
                >
                  {isSignIn 
                    ? "Don't have an account? Sign Up Here" 
                    : 'Already have an account? Sign In Here'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
