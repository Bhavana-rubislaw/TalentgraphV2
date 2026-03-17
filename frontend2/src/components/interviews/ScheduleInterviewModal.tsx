import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import './ScheduleInterviewModal.css';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: {
    id: number;
    candidate?: {
      name?: string;
      email?: string;
    };
    job_posting?: {
      job_title?: string;
      company_name?: string;
    };
  };
  onSuccess?: () => void;
}

interface FormData {
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  timezone: string;
  meetingLink: string;
  notes: string;
  subject: string;
}

interface FormErrors {
  candidateEmail?: string;
  interviewDate?: string;
  interviewTime?: string;
  meetingLink?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
];

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    candidateEmail: '',
    interviewDate: '',
    interviewTime: '',
    timezone: 'America/New_York',
    meetingLink: '',
    notes: '',
    subject: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Prefill form when modal opens
  useEffect(() => {
    if (isOpen && application) {
      const candidateEmail = application.candidate?.email || '';
      const jobTitle = application.job_posting?.job_title || 'the position';
      const companyName = application.job_posting?.company_name || 'our company';
      
      setFormData({
        candidateEmail,
        interviewDate: '',
        interviewTime: '10:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        meetingLink: '',
        notes: '',
        subject: `Interview for ${jobTitle} at ${companyName}`
      });
      setErrors({});
      setSubmitSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen, application]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate email
    if (!formData.candidateEmail.trim()) {
      newErrors.candidateEmail = 'Candidate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.candidateEmail)) {
      newErrors.candidateEmail = 'Invalid email format';
    }
    
    // Validate date
    if (!formData.interviewDate) {
      newErrors.interviewDate = 'Interview date is required';
    } else {
      const selectedDate = new Date(formData.interviewDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.interviewDate = 'Interview date cannot be in the past';
      }
    }
    
    // Validate time
    if (!formData.interviewTime) {
      newErrors.interviewTime = 'Interview time is required';
    }
    
    // Validate meeting link
    if (!formData.meetingLink.trim()) {
      newErrors.meetingLink = 'Meeting link is required';
    } else if (!/^https?:\/\/.+/.test(formData.meetingLink.trim())) {
      newErrors.meetingLink = 'Meeting link must be a valid URL (starting with http:// or https://)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Format datetime for backend
      const date = new Date(formData.interviewDate);
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Convert 24h time to 12h format
      const [hours, minutes] = formData.interviewTime.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const formattedTime = `${hour12}:${minutes} ${ampm}`;
      
      const interviewDatetime = `${formattedDate} at ${formattedTime}`;
      
      // Get timezone name
      const timezoneName = TIMEZONES.find(tz => tz.value === formData.timezone)?.label || formData.timezone;
      
      const payload = {
        candidate_email: formData.candidateEmail.trim(),
        interview_datetime: interviewDatetime,
        timezone: timezoneName,
        meeting_link: formData.meetingLink.trim(),
        notes: formData.notes.trim() || undefined,
        subject: formData.subject.trim() || undefined
      };
      
      const response = await apiClient.scheduleInterview(application.id, payload);
      
      console.log('[INTERVIEW] Successfully scheduled:', response.data);
      
      setSubmitSuccess(true);
      
      // Call success callback after a short delay to show success state
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('[INTERVIEW] Failed to schedule:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to schedule interview';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const candidateName = application.candidate?.name || 'Candidate';
  const jobTitle = application.job_posting?.job_title || 'Position';
  const companyName = application.job_posting?.company_name || 'Company';

  return (
    <div className="schedule-interview-overlay" onClick={handleClose}>
      <div className="schedule-interview-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="schedule-interview-header">
          <div className="schedule-interview-header-icon">📅</div>
          <div className="schedule-interview-header-text">
            <h2>Schedule Interview</h2>
            <p>Send interview invitation to candidate and recruiter from TalentGraph</p>
          </div>
          <button 
            className="schedule-interview-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Success State */}
        {submitSuccess && (
          <div className="schedule-interview-success">
            <div className="schedule-interview-success-icon">✓</div>
            <h3>Interview Scheduled Successfully!</h3>
            <p>Confirmation emails sent to candidate and recruiter from TalentGraph Interviews. Both parties have been notified with interview details.</p>
          </div>
        )}

        {/* Form */}
        {!submitSuccess && (
          <form onSubmit={handleSubmit} className="schedule-interview-form">
            
            {/* Candidate Context Section */}
            <div className="schedule-interview-section">
              <h3 className="schedule-interview-section-title">
                <span className="schedule-interview-section-icon">👤</span>
                Candidate Information
              </h3>
              <div className="schedule-interview-context">
                <div className="schedule-interview-context-item">
                  <span className="schedule-interview-context-label">Name:</span>
                  <span className="schedule-interview-context-value">{candidateName}</span>
                </div>
                <div className="schedule-interview-context-item">
                  <span className="schedule-interview-context-label">Position:</span>
                  <span className="schedule-interview-context-value">{jobTitle}</span>
                </div>
                <div className="schedule-interview-context-item">
                  <span className="schedule-interview-context-label">Company:</span>
                  <span className="schedule-interview-context-value">{companyName}</span>
                </div>
              </div>
              
              <div className="schedule-interview-field">
                <label htmlFor="candidateEmail">
                  Email Address <span className="schedule-interview-required">*</span>
                </label>
                <input
                  id="candidateEmail"
                  type="email"
                  value={formData.candidateEmail}
                  onChange={(e) => handleInputChange('candidateEmail', e.target.value)}
                  placeholder="candidate@example.com"
                  disabled={isSubmitting}
                  className={errors.candidateEmail ? 'schedule-interview-input-error' : ''}
                />
                {errors.candidateEmail && (
                  <span className="schedule-interview-error">{errors.candidateEmail}</span>
                )}
              </div>
            </div>

            {/* Interview Details Section */}
            <div className="schedule-interview-section">
              <h3 className="schedule-interview-section-title">
                <span className="schedule-interview-section-icon">📆</span>
                Interview Details
              </h3>
              
              <div className="schedule-interview-field-group">
                <div className="schedule-interview-field schedule-interview-field-half">
                  <label htmlFor="interviewDate">
                    Date <span className="schedule-interview-required">*</span>
                  </label>
                  <input
                    id="interviewDate"
                    type="date"
                    value={formData.interviewDate}
                    onChange={(e) => handleInputChange('interviewDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isSubmitting}
                    className={errors.interviewDate ? 'schedule-interview-input-error' : ''}
                  />
                  {errors.interviewDate && (
                    <span className="schedule-interview-error">{errors.interviewDate}</span>
                  )}
                </div>
                
                <div className="schedule-interview-field schedule-interview-field-half">
                  <label htmlFor="interviewTime">
                    Time <span className="schedule-interview-required">*</span>
                  </label>
                  <input
                    id="interviewTime"
                    type="time"
                    value={formData.interviewTime}
                    onChange={(e) => handleInputChange('interviewTime', e.target.value)}
                    disabled={isSubmitting}
                    className={errors.interviewTime ? 'schedule-interview-input-error' : ''}
                  />
                  {errors.interviewTime && (
                    <span className="schedule-interview-error">{errors.interviewTime}</span>
                  )}
                </div>
              </div>

              <div className="schedule-interview-field">
                <label htmlFor="timezone">
                  Timezone <span className="schedule-interview-required">*</span>
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  disabled={isSubmitting}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <div className="schedule-interview-field">
                <label htmlFor="meetingLink">
                  Meeting Link <span className="schedule-interview-required">*</span>
                </label>
                <input
                  id="meetingLink"
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                  placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                  disabled={isSubmitting}
                  className={errors.meetingLink ? 'schedule-interview-input-error' : ''}
                />
                {errors.meetingLink && (
                  <span className="schedule-interview-error">{errors.meetingLink}</span>
                )}
                <span className="schedule-interview-hint">
                  Provide a Zoom, Teams, Google Meet, or other video call link
                </span>
              </div>
            </div>

            {/* Optional Details Section */}
            <div className="schedule-interview-section">
              <h3 className="schedule-interview-section-title">
                <span className="schedule-interview-section-icon">📝</span>
                Additional Details (Optional)
              </h3>
              
              <div className="schedule-interview-field">
                <label htmlFor="subject">
                  Email Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Leave blank to use default subject"
                  disabled={isSubmitting}
                />
              </div>

              <div className="schedule-interview-field">
                <label htmlFor="notes">
                  Notes for Candidate
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional information or preparation instructions..."
                  rows={4}
                  disabled={isSubmitting}
                />
                <span className="schedule-interview-hint">
                  These notes will be included in the interview confirmation email
                </span>
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="schedule-interview-error-banner">
                <span className="schedule-interview-error-icon">⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="schedule-interview-footer">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="schedule-interview-btn schedule-interview-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="schedule-interview-btn schedule-interview-btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <span className="schedule-interview-spinner"></span>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <span>📧</span>
                    Send Interview Invite
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScheduleInterviewModal;
