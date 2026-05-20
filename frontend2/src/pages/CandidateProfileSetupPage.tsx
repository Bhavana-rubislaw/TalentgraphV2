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
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
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

interface DraftProfile extends CandidateProfileForm {
  name_confidence?: number;
  email_confidence?: number;
  phone_confidence?: number;
  residential_address_confidence?: number;
  location_state_confidence?: number;
  location_county_confidence?: number;
  location_zipcode_confidence?: number;
  linkedin_url_confidence?: number;
  github_url_confidence?: number;
  portfolio_url_confidence?: number;
  profile_summary_confidence?: number;
  missing_required_fields?: string[];
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

const REQUIRED_FIELDS = ['name', 'email', 'phone', 'residential_address', 'location_state', 'location_county', 'location_zipcode'];
const LOW_CONFIDENCE_THRESHOLD = 0.5;

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

type OnboardingMode = 'selection' | 'manual' | 'resume';

const CandidateProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<OnboardingMode>('selection');
  const [formData, setFormData] = useState<CandidateProfileForm>({ ...EMPTY_FORM });
  const [draftProfile, setDraftProfile] = useState<DraftProfile | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill email and name from localStorage (for manual path)
  useEffect(() => {
    const email = localStorage.getItem('email') || '';
    const fullName = localStorage.getItem('full_name') || '';
    
    setFormData(prev => ({
      ...prev,
      name: fullName,
      email: email,
    }));
  }, []);

  // Check if there's an existing draft
  useEffect(() => {
    const checkExistingDraft = async () => {
      try {
        const response = await apiClient.getOnboardingDraft();
        if (response.data) {
          // Draft exists, switch to resume mode and load it
          setDraftProfile(response.data);
          loadDraftToForm(response.data);
          setMode('resume');
        }
      } catch (err: any) {
        // No draft exists, that's fine
        if (err.response?.status !== 404) {
          console.error('[ONBOARDING] Error checking for draft:', err);
        }
      }
    };
    
    checkExistingDraft();
  }, []);

  const loadDraftToForm = (draft: DraftProfile) => {
    setFormData({
      name: draft.name || '',
      email: draft.email || '',
      phone: draft.phone || '',
      residential_address: draft.residential_address || '',
      location_state: draft.location_state || '',
      location_county: draft.location_county || '',
      location_zipcode: draft.location_zipcode || '',
      linkedin_url: draft.linkedin_url || '',
      github_url: draft.github_url || '',
      portfolio_url: draft.portfolio_url || '',
      profile_summary: draft.profile_summary || '',
    });
  };

  const handleModeSelection = (selectedMode: 'manual' | 'resume') => {
    setMode(selectedMode);
    setError('');
    
    // Mark that onboarding has started
    localStorage.setItem('onboarding_started', 'true');
  };

  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF or DOCX file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setResumeFile(file);
      setError('');
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setError('Please select a resume file');
      return;
    }

    setUploadingResume(true);
    setError('');

    try {
      const response = await apiClient.uploadResumeForOnboarding(resumeFile);
      
      if (response.data) {
        setDraftProfile(response.data);
        loadDraftToForm(response.data);
        setSuccess('Resume parsed! Please review and fill any missing information.');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error('[ONBOARDING] Resume upload failed:', err);
      setError(err.response?.data?.detail || 'Failed to upload and parse resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = async () => {
    if (mode !== 'resume' || !draftProfile) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.updateOnboardingDraft(formData);
      setDraftProfile(response.data);
      setSuccess('Draft saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ONBOARDING] Draft save failed:', err);
      setError(err.response?.data?.detail || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !formData[field as keyof CandidateProfileForm]?.trim());
    
    if (missingFields.length > 0) {
      setError(`Please fill all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'resume' && draftProfile) {
        // Resume path - finalize the draft
        // Update draft first with latest changes
        await apiClient.updateOnboardingDraft(formData);
        
        // Then finalize
        const response = await apiClient.finalizeOnboarding(true);
      } else {
        // Manual path - create profile directly
        await apiClient.createCandidateProfile(formData);
      }

      setSuccess('Profile setup completed successfully!');

      // Update localStorage
      localStorage.setItem('full_name', formData.name);
      localStorage.setItem('is_profile_complete', 'true');
      localStorage.removeItem('onboarding_started'); // Clear onboarding flag

      // Redirect to Candidate Dashboard
      setTimeout(() => {
        navigate('/candidate-dashboard');
      }, 1500);
      
    } catch (err: any) {
      console.error('[ONBOARDING] Submission failed:', err);
      const errorDetail = err.response?.data?.detail;
      
      if (errorDetail && typeof errorDetail === 'object' && errorDetail.missing_fields) {
        setError(`Missing required fields: ${errorDetail.missing_fields.join(', ')}`);
      } else {
        setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to complete profile setup');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFieldMissing = (fieldName: string): boolean => {
    return REQUIRED_FIELDS.includes(fieldName) && !formData[fieldName as keyof CandidateProfileForm]?.trim();
  };

  const isFieldLowConfidence = (fieldName: string): boolean => {
    if (mode !== 'resume' || !draftProfile) return false;
    const confidence = draftProfile[`${fieldName}_confidence` as keyof DraftProfile] as number | undefined;
    return confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD;
  };

  const getFieldClassName = (fieldName: string, baseClass: string): string => {
    let className = baseClass;
    if (isFieldMissing(fieldName)) {
      className += ' cp-input-missing';
    } else if (isFieldLowConfidence(fieldName)) {
      className += ' cp-input-low-confidence';
    }
    return className;
  };

  // Render mode selection screen
  if (mode === 'selection') {
    return (
      <div className="cp-onboarding-page">
        <div className="cp-onboarding-container">
          <div className="cp-onboarding-header">
            <div className="cp-onboarding-icon">{Icons.user}</div>
            <h1 className="cp-onboarding-title">Complete Your Profile</h1>
            <p className="cp-onboarding-subtitle">
              Choose how you'd like to set up your candidate profile
            </p>
          </div>

          <div className="cp-onboarding-mode-selection">
            <div 
              className="cp-mode-card"
              onClick={() => handleModeSelection('manual')}
            >
              <div className="cp-mode-icon">{Icons.edit}</div>
              <h3 className="cp-mode-title">Fill Manually</h3>
              <p className="cp-mode-desc">
                Enter your information step by step in a guided form
              </p>
              <button className="cp-btn cp-btn-primary">
                Start Manual Entry
              </button>
            </div>

            <div 
              className="cp-mode-card"
              onClick={() => handleModeSelection('resume')}
            >
              <div className="cp-mode-icon">{Icons.upload}</div>
              <h3 className="cp-mode-title">Upload Resume</h3>
              <p className="cp-mode-desc">
                We'll auto-fill your information from your resume (PDF or DOCX)
              </p>
              <button className="cp-btn cp-btn-primary">
                Upload Resume
              </button>
            </div>
          </div>

          {error && (
            <div className="cp-alert cp-alert-error">
              <div className="cp-alert-icon">{Icons.alertCircle}</div>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render resume upload screen (before parsing)
  if (mode === 'resume' && !draftProfile) {
    return (
      <div className="cp-onboarding-page">
        <div className="cp-onboarding-container">
          <div className="cp-onboarding-header">
            <div className="cp-onboarding-icon">{Icons.upload}</div>
            <h1 className="cp-onboarding-title">Upload Your Resume</h1>
            <p className="cp-onboarding-subtitle">
              We'll extract your information automatically
            </p>
          </div>

          <div className="cp-onboarding-card">
            <div className="cp-upload-area">
              <div className="cp-upload-icon">{Icons.fileText}</div>
              <h3 className="cp-upload-title">Select Resume File</h3>
              <p className="cp-upload-desc">PDF or DOCX format, up to 10MB</p>
              
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeFileSelect}
                style={{ display: 'none' }}
              />
              
              <label htmlFor="resume-upload" className="cp-btn cp-btn-outline">
                Choose File
              </label>

              {resumeFile && (
                <div className="cp-file-selected">
                  <span className="cp-file-name">{resumeFile.name}</span>
                  <span className="cp-file-size">
                    ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="cp-alert cp-alert-error">
                <div className="cp-alert-icon">{Icons.alertCircle}</div>
                <span>{error}</span>
              </div>
            )}

            <div className="cp-onboarding-actions">
              <button
                type="button"
                className="cp-btn cp-btn-outline"
                onClick={() => setMode('selection')}
                disabled={uploadingResume}
              >
                Back
              </button>
              <button
                type="button"
                className="cp-btn cp-btn-primary cp-btn-lg"
                onClick={handleResumeUpload}
                disabled={!resumeFile || uploadingResume}
              >
                {uploadingResume ? (
                  <>
                    <span className="cp-spinner"></span>
                    Parsing Resume...
                  </>
                ) : (
                  'Parse Resume'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render shared profile form (for both manual and resume-parsed modes)
  return (
    <div className="cp-onboarding-page">
      <div className="cp-onboarding-container">
        {/* Header */}
        <div className="cp-onboarding-header">
          <div className="cp-onboarding-icon">{Icons.user}</div>
          <h1 className="cp-onboarding-title">
            {mode === 'resume' ? 'Review & Complete Your Profile' : 'Complete Your Profile'}
          </h1>
          <p className="cp-onboarding-subtitle">
            {mode === 'resume' 
              ? 'Review auto-filled information and fill any missing fields'
              : 'Tell us about yourself to get matched with the best job opportunities'
            }
          </p>
        </div>

        {/* Info banner for resume mode */}
        {mode === 'resume' && draftProfile && (
          <div className="cp-info-banner">
            <div className="cp-info-icon">{Icons.alertCircle}</div>
            <div className="cp-info-content">
              <strong>Review Required:</strong> We've pre-filled your information from your resume.
              {draftProfile.missing_required_fields && draftProfile.missing_required_fields.length > 0 && (
                <span> Please fill the highlighted required fields before submitting.</span>
              )}
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="cp-onboarding-card">
          <form onSubmit={handleFinalSubmit} className="cp-onboarding-form">
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
                  <label className="cp-label">
                    Full Name *
                    {isFieldLowConfidence('name') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={getFieldClassName('name', 'cp-input')}
                    placeholder="John Doe"
                    required
                  />
                  {isFieldMissing('name') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    Email Address *
                    {isFieldLowConfidence('email') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={getFieldClassName('email', 'cp-input')}
                    placeholder="john.doe@example.com"
                    required
                  />
                  {isFieldMissing('email') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    Phone Number *
                    {isFieldLowConfidence('phone') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={getFieldClassName('phone', 'cp-input')}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                  {isFieldMissing('phone') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
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
                  <label className="cp-label">
                    Residential Address *
                    {isFieldLowConfidence('residential_address') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="residential_address"
                    value={formData.residential_address}
                    onChange={handleChange}
                    className={getFieldClassName('residential_address', 'cp-input')}
                    placeholder="123 Main Street, Apt 4B"
                    required
                  />
                  {isFieldMissing('residential_address') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    State *
                    {isFieldLowConfidence('location_state') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <select
                    name="location_state"
                    value={formData.location_state}
                    onChange={handleChange}
                    className={getFieldClassName('location_state', 'cp-select')}
                    required
                  >
                    <option value="">Select state...</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {isFieldMissing('location_state') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    County *
                    {isFieldLowConfidence('location_county') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="location_county"
                    value={formData.location_county}
                    onChange={handleChange}
                    className={getFieldClassName('location_county', 'cp-input')}
                    placeholder="e.g., Los Angeles"
                    required
                  />
                  {isFieldMissing('location_county') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    Zipcode *
                    {isFieldLowConfidence('location_zipcode') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="location_zipcode"
                    value={formData.location_zipcode}
                    onChange={handleChange}
                    className={getFieldClassName('location_zipcode', 'cp-input')}
                    placeholder="12345"
                    required
                  />
                  {isFieldMissing('location_zipcode') && (
                    <span className="cp-field-error">This field is required</span>
                  )}
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
                  <label className="cp-label">
                    LinkedIn Profile
                    {isFieldLowConfidence('linkedin_url') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className={getFieldClassName('linkedin_url', 'cp-input')}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">
                    GitHub Profile
                    {isFieldLowConfidence('github_url') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="url"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    className={getFieldClassName('github_url', 'cp-input')}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="cp-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="cp-label">
                    Portfolio / Website
                    {isFieldLowConfidence('portfolio_url') && (
                      <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                    )}
                  </label>
                  <input
                    type="url"
                    name="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={handleChange}
                    className={getFieldClassName('portfolio_url', 'cp-input')}
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
                <label className="cp-label">
                  Profile Summary
                  {isFieldLowConfidence('profile_summary') && (
                    <span className="cp-confidence-badge">Low Confidence - Please Review</span>
                  )}
                </label>
                <textarea
                  name="profile_summary"
                  value={formData.profile_summary}
                  onChange={handleChange}
                  className={getFieldClassName('profile_summary', 'cp-textarea')}
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
                onClick={() => mode === 'resume' ? setMode('selection') : navigate('/signin')}
                disabled={loading}
              >
                {mode === 'resume' ? 'Start Over' : 'Back to Login'}
              </button>
              
              {mode === 'resume' && draftProfile && (
                <button
                  type="button"
                  className="cp-btn cp-btn-secondary"
                  onClick={handleSaveDraft}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </button>
              )}
              
              <button
                type="submit"
                className="cp-btn cp-btn-primary cp-btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="cp-spinner"></span>
                    {mode === 'resume' ? 'Finalizing...' : 'Saving...'}
                  </>
                ) : (
                  mode === 'resume' ? 'Final Save & Complete' : 'Save & Continue'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <p className="cp-onboarding-footer">
          All fields marked with * are required
          {mode === 'resume' && ' • Low confidence fields are highlighted for your review'}
        </p>
      </div>
    </div>
  );
};

export default CandidateProfileSetupPage;
