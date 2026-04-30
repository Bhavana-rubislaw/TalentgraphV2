import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/CandidatePages.css';

/* ── SVG Icons ── */
const Icons = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  github: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>,
  fileText: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  alertCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

interface CandidateProfileForm {
  name: string;
  email: string;
  phone: string;
  residential_address: string;
  location_state: string;
  location_county: string;
  location_zipcode: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  profile_summary: string;
}

const EMPTY_FORM: CandidateProfileForm = {
  name: '',
  email: '',
  phone: '',
  residential_address: '',
  location_state: '',
  location_county: '',
  location_zipcode: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  profile_summary: '',
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const CandidateProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CandidateProfileForm>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill email and name from localStorage
  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    const fullName = localStorage.getItem('full_name') || '';
    
    setFormData(prev => ({
      ...prev,
      name: fullName,
      email: email,
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        residential_address: formData.residential_address || undefined,
        location_state: formData.location_state || undefined,
        location_county: formData.location_county || undefined,
        location_zipcode: formData.location_zipcode || undefined,
        linkedin_url: formData.linkedin_url || undefined,
        github_url: formData.github_url || undefined,
        portfolio_url: formData.portfolio_url || undefined,
        profile_summary: formData.profile_summary || undefined,
      };

      console.log('[CANDIDATE SETUP] Submitting profile:', payload);

      // Check if profile exists, if so update, else create
      try {
        await apiClient.getCandidateProfile();
        // Profile exists, update it
        await apiClient.updateCandidateProfile(payload);
        console.log('[CANDIDATE SETUP] Profile updated successfully');
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Profile doesn't exist, create it
          await apiClient.createCandidateProfile(payload);
          console.log('[CANDIDATE SETUP] Profile created successfully');
        } else {
          throw err;
        }
      }

      setSuccess('Profile setup completed successfully!');

      // Update localStorage
      localStorage.setItem('full_name', formData.name);
      localStorage.setItem('profile_complete', 'true');

      // Redirect to Candidate Dashboard after a short delay
      setTimeout(() => {
        navigate('/candidate-dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('[CANDIDATE SETUP] Error:', err);
      setError(err.response?.data?.detail || 'Failed to complete profile setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-onboarding-page">
      {/* Centered Content Container */}
      <div className="cp-onboarding-container">
        {/* Header */}
        <div className="cp-onboarding-header">
          <div className="cp-onboarding-icon">
            {Icons.user}
          </div>
          <h1 className="cp-onboarding-title">Complete Your Profile</h1>
          <p className="cp-onboarding-subtitle">
            Tell us about yourself to get matched with the best job opportunities
          </p>
        </div>

        {/* Form Card */}
        <div className="cp-onboarding-card">
          <form onSubmit={handleSubmit} className="cp-onboarding-form">
            {/* Personal Information */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.user}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Personal Information</h3>
                  <p className="cp-onboarding-section-desc">Basic details about you</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group">
                  <label className="cp-label">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.home}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Location</h3>
                  <p className="cp-onboarding-section-desc">Where are you based?</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="cp-label">Residential Address</label>
                  <input
                    type="text"
                    name="residential_address"
                    value={formData.residential_address}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">State</label>
                  <select
                    name="location_state"
                    value={formData.location_state}
                    onChange={handleChange}
                    className="cp-select"
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">County</label>
                  <input
                    type="text"
                    name="location_county"
                    value={formData.location_county}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="e.g., Los Angeles"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Zipcode</label>
                  <input
                    type="text"
                    name="location_zipcode"
                    value={formData.location_zipcode}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            {/* Professional Links */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.link}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Professional Links</h3>
                  <p className="cp-onboarding-section-desc">Showcase your work and presence online</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group">
                  <label className="cp-label">LinkedIn Profile</label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">GitHub Profile</label>
                  <input
                    type="url"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="cp-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="cp-label">Portfolio / Website</label>
                  <input
                    type="url"
                    name="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>

            {/* About You */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.fileText}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">About You</h3>
                  <p className="cp-onboarding-section-desc">Brief summary of your background and goals</p>
                </div>
              </div>
              <div className="cp-form-group">
                <label className="cp-label">Profile Summary</label>
                <textarea
                  name="profile_summary"
                  value={formData.profile_summary}
                  onChange={handleChange}
                  className="cp-textarea"
                  rows={3}
                  placeholder="Tell recruiters about your experience, skills, and what you're looking for in your next role..."
                />
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="cp-alert cp-alert-error">
                <div className="cp-alert-icon">{Icons.alertCircle}</div>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="cp-alert cp-alert-success">
                <div className="cp-alert-icon">{Icons.check}</div>
                <span>{success}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="cp-onboarding-actions">
              <button
                type="button"
                className="cp-btn cp-btn-outline"
                onClick={() => navigate('/signin')}
                disabled={loading}
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="cp-btn cp-btn-primary cp-btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="cp-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <p className="cp-onboarding-footer">
          All fields marked with * are required
        </p>
      </div>
    </div>
  );
};

export default CandidateProfileSetupPage;
