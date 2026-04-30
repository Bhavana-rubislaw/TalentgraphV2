import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/CandidatePages.css';

/* ── SVG Icons ── */
const Icons = {
  building: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  fileText: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  alertCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

interface CompanyProfileForm {
  full_name: string;
  company_name: string;
  company_role: string;
  company_website: string;
  company_location: string;
  department: string;
  phone_number: string;
  linkedin_profile: string;
  hiring_focus: string[];
  company_description: string;
}

const EMPTY_FORM: CompanyProfileForm = {
  full_name: '',
  company_name: '',
  company_role: 'recruiter',
  company_website: '',
  company_location: '',
  department: '',
  phone_number: '',
  linkedin_profile: '',
  hiring_focus: [],
  company_description: '',
};

const JOB_CATEGORIES = [
  'Software Engineering',
  'Data Science',
  'Product Management',
  'Sales',
  'Marketing',
  'Finance',
  'Human Resources',
  'Operations',
  'Customer Support',
  'Design',
  'DevOps',
  'Quality Assurance',
  'Business Development',
  'Consulting',
  'Other',
];

const CompanyProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CompanyProfileForm>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill email and name from localStorage
  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    const fullName = localStorage.getItem('full_name') || '';
    
    setFormData(prev => ({
      ...prev,
      full_name: fullName,
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleHiringFocus = (category: string) => {
    setFormData(prev => ({
      ...prev,
      hiring_focus: prev.hiring_focus.includes(category)
        ? prev.hiring_focus.filter(c => c !== category)
        : [...prev.hiring_focus, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.company_name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.company_role) {
      setError('Company role is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name,
        company_name: formData.company_name,
        company_role: formData.company_role,
        company_website: formData.company_website || undefined,
        company_location: formData.company_location || undefined,
        department: formData.department || undefined,
        phone_number: formData.phone_number || undefined,
        linkedin_profile: formData.linkedin_profile || undefined,
        hiring_focus: formData.hiring_focus.length > 0 ? JSON.stringify(formData.hiring_focus) : undefined,
        company_description: formData.company_description || undefined,
      };

      console.log('[COMPANY SETUP] Submitting profile:', payload);

      const response = await apiClient.setupCompanyProfile(payload);
      console.log('[COMPANY SETUP] Profile setup successful:', response.data);

      setSuccess('Profile setup completed successfully!');

      // Update localStorage
      localStorage.setItem('full_name', formData.full_name);
      localStorage.setItem('company_name', formData.company_name);

      // Redirect to Recruiter Dashboard after a short delay
      setTimeout(() => {
        navigate('/recruiter-dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('[COMPANY SETUP] Error:', err);
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
            {Icons.building}
          </div>
          <h1 className="cp-onboarding-title">Company Profile Setup</h1>
          <p className="cp-onboarding-subtitle">
            Complete your company details to access the recruiter dashboard
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
                  <p className="cp-onboarding-section-desc">Tell us about yourself</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group">
                  <label className="cp-label">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Company Role *</label>
                  <select
                    name="company_role"
                    value={formData.company_role}
                    onChange={handleChange}
                    className="cp-select"
                    required
                  >
                    <option value="recruiter">Recruiter</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.building}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Company Information</h3>
                  <p className="cp-onboarding-section-desc">Provide your company details</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group">
                  <label className="cp-label">Company Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Company Website</label>
                  <input
                    type="url"
                    name="company_website"
                    value={formData.company_website}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="https://www.company.com"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Company Location</label>
                  <input
                    type="text"
                    name="company_location"
                    value={formData.company_location}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="San Francisco, CA"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Department / Team</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="Engineering"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.mail}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Contact Details</h3>
                  <p className="cp-onboarding-section-desc">How can candidates reach you?</p>
                </div>
              </div>
              <div className="cp-onboarding-grid">
                <div className="cp-form-group">
                  <label className="cp-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">LinkedIn Profile</label>
                  <input
                    type="url"
                    name="linkedin_profile"
                    value={formData.linkedin_profile}
                    onChange={handleChange}
                    className="cp-input"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>
            </div>

            {/* Hiring Preferences */}
            <div className="cp-onboarding-section">
              <div className="cp-onboarding-section-header">
                <div className="cp-onboarding-section-icon">{Icons.target}</div>
                <div>
                  <h3 className="cp-onboarding-section-title">Hiring Preferences</h3>
                  <p className="cp-onboarding-section-desc">Select the job categories you typically hire for</p>
                </div>
              </div>
              <div className="cp-chip-container">
                {JOB_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleHiringFocus(category)}
                    className={`cp-chip ${formData.hiring_focus.includes(category) ? 'cp-chip-selected' : ''}`}
                  >
                    {formData.hiring_focus.includes(category) && <span className="cp-chip-check">{Icons.check}</span>}
                    {category}
                  </button>
                ))}
              </div>

              <div className="cp-form-group" style={{ marginTop: '16px' }}>
                <label className="cp-label">Company Description</label>
                <textarea
                  name="company_description"
                  value={formData.company_description}
                  onChange={handleChange}
                  className="cp-textarea"
                  rows={3}
                  placeholder="Brief description of your company, culture, and what makes it unique..."
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

export default CompanyProfileSetupPage;
