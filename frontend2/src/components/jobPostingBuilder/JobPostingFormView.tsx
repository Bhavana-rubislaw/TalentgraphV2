import React from 'react';
import { StatusBadge } from '../JobPostingComponents';
import CascadingTaxonomySelect from '../CascadingTaxonomySelect';
import type { JobPosting, JobPostingFormData } from '../../types/jobPostingBuilderTypes';
import { SENIORITY_LEVELS, EMPLOYMENT_TYPES, TRAVEL_OPTIONS, VISA_OPTIONS, EDUCATION_OPTIONS } from '../../constants/jobPostingBuilderConstants';

interface JobPostingFormViewProps {
  postings: JobPosting[];
  formData: JobPostingFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobPostingFormData>>;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  saving: boolean;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  listSearch: string;
  setListSearch: (value: string) => void;
  statusFilter: 'all' | 'active' | 'frozen' | 'cancelled';
  setStatusFilter: (value: 'all' | 'active' | 'frozen' | 'cancelled') => void;
  showPreview: boolean;
  setShowPreview: (value: boolean) => void;
  setShowForm: (value: boolean) => void;
  showCancelModal: number | null;
  setShowCancelModal: (id: number | null) => void;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  customReason: string;
  setCustomReason: (value: string) => void;
  skillSearchTech: string;
  setSkillSearchTech: (value: string) => void;
  skillSearchSoft: string;
  setSkillSearchSoft: (value: string) => void;
  showTechDropdown: boolean;
  setShowTechDropdown: (value: boolean) => void;
  showSoftDropdown: boolean;
  setShowSoftDropdown: (value: boolean) => void;
  certSearch: string;
  setCertSearch: (value: string) => void;
  showCertDropdown: boolean;
  setShowCertDropdown: (value: boolean) => void;
  errors: Record<string, string>;
  setSelectedRoleId: (id: number | null) => void;
  formRef: React.RefObject<HTMLFormElement>;
  techDropdownRef: React.RefObject<HTMLDivElement>;
  softDropdownRef: React.RefObject<HTMLDivElement>;
  certDropdownRef: React.RefObject<HTMLDivElement>;
  userName: string;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  handleSave: () => void;
  loadPosting: (posting: JobPosting) => void;
  handleDuplicatePosting: (posting: JobPosting) => void;
  handleNewPosting: () => void;
  handleJobLifecycleAction: (jobId: number, action: 'freeze' | 'reactivate', e: React.MouseEvent) => void;
  handleCancelJob: () => void;
  addSkill: (name: string, category: 'technical' | 'soft') => void;
  removeSkill: (name: string) => void;
  updateSkillRating: (name: string, rating: number) => void;
  addCertification: (name: string) => void;
  removeCertification: (name: string) => void;
  filteredTechSkills: string[];
  filteredSoftSkills: string[];
  filteredCerts: string[];
  filteredPostings: JobPosting[];
  formatSalary: (min: string, max: string, currency: string, payType: string) => string;
  empTypeLabel: (val: string) => string;
  worktypeLabel: (val: string) => string;
}

const JobPostingFormView: React.FC<JobPostingFormViewProps> = ({
  postings, formData, setFormData, editingId, setEditingId, saving, isDirty, setIsDirty,
  toast, listSearch, setListSearch, statusFilter, setStatusFilter, showPreview, setShowPreview,
  setShowForm, showCancelModal, setShowCancelModal, cancelReason, setCancelReason,
  customReason, setCustomReason, skillSearchTech, setSkillSearchTech, skillSearchSoft, setSkillSearchSoft,
  showTechDropdown, setShowTechDropdown, showSoftDropdown, setShowSoftDropdown,
  certSearch, setCertSearch, showCertDropdown, setShowCertDropdown, errors, setSelectedRoleId,
  formRef, techDropdownRef, softDropdownRef, certDropdownRef, userName,
  handleInputChange, handleSave, loadPosting, handleDuplicatePosting, handleNewPosting,
  handleJobLifecycleAction, handleCancelJob, addSkill, removeSkill, updateSkillRating,
  addCertification, removeCertification, filteredTechSkills, filteredSoftSkills, filteredCerts,
  filteredPostings, formatSalary, empTypeLabel, worktypeLabel,
}) => {
  return (
    <div className="jpb-page">
      {/* Toast */}
      {toast && (
        <div className={`jpb-toast jpb-toast-${toast.type}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {toast.type === 'success'
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
              : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
            }
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="jpb-topbar">
        <div className="jpb-topbar-left">
          <button 
            type="button"
            className="jpb-back-btn" 
            onClick={() => {
              if (isDirty && !window.confirm('Discard unsaved changes?')) return;
              setShowForm(false);
              setEditingId(null);
              setIsDirty(false);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="jpb-topbar-title">
            <h1>Job Posting Builder</h1>
            <span className="jpb-topbar-sub">{postings.length} posting{postings.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="jpb-topbar-right">
          {isDirty && <span className="jpb-unsaved-badge">Unsaved changes</span>}
          <button className="jpb-btn jpb-btn-ghost" onClick={handleNewPosting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Posting
          </button>
          <button className="jpb-btn jpb-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><div className="jpb-btn-spinner" /> Saving...</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> {editingId ? 'Update Posting' : 'Save Posting'}</>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="jpb-layout">
        {/* LEFT: Postings List */}
        <aside className="jpb-sidebar">
          <div className="jpb-sidebar-header">
            <div className="jpb-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search postings..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginTop: '12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="frozen">Frozen Only</option>
              <option value="reposted">Reposted Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
          <div className="jpb-sidebar-list">
            {filteredPostings.length === 0 ? (
              <div className="jpb-empty-list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <p>No {statusFilter === 'all' ? 'job' : statusFilter} postings {statusFilter === 'all' ? 'yet' : 'found'}</p>
                <span>{statusFilter === 'all' ? 'Create your first posting' : 'Try adjusting your filters'}</span>
              </div>
            ) : (
              filteredPostings.map(p => {
                const normalizedStatus = (p.status || '').toLowerCase();
                return (
                  <div
                    key={p.id}
                    className={`jpb-posting-card ${editingId === p.id ? 'active' : ''}`}
                    onClick={() => loadPosting(p)}
                  >
                    <div className="jpb-posting-card-top">
                      <h4>{p.job_title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.status && <StatusBadge status={p.status} size="sm" />}
                      </div>
                    </div>
                    <div className="jpb-posting-card-meta">
                      <span>{p.location || 'No location'}</span>
                      <span className="jpb-meta-dot">·</span>
                      <span>{worktypeLabel(p.worktype)}</span>
                      <span className="jpb-meta-dot">·</span>
                      <span>{empTypeLabel(p.employment_type)}</span>
                    </div>
                    <div className="jpb-posting-card-bottom">
                      <span className="jpb-posting-vendor">{p.product_vendor}</span>
                      {p.posting_skills?.length > 0 && (
                        <span className="jpb-skill-count">{p.posting_skills.length} skill{p.posting_skills.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {/* Lifecycle Control Buttons */}
                    <div className="jpb-posting-card-actions" style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}>
                      {/* Duplicate button - always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePosting(p);
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: 'fit-content',
                        }}
                        title="Duplicate this posting"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Duplicate
                      </button>

                      {normalizedStatus === 'cancelled' ? (
                        <div style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          textAlign: 'center',
                          flex: 1,
                        }}>
                          Cancelled: {p.cancellation_reason}
                        </div>
                      ) : (
                        <>
                          {(normalizedStatus === 'active' || normalizedStatus === 'reposted') ? (
                            <>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'freeze', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#f9fafb',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                  color: '#374151',
                                }}
                                title="Freeze this job posting"
                              >
                                Freeze
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCancelModal(p.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Cancel this job posting"
                              >
                                Cancel
                              </button>
                            </>
                          ) : normalizedStatus === 'frozen' ? (
                            <>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'reactivate', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #10b981',
                                  backgroundColor: '#d1fae5',
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Unfreeze this job posting"
                              >
                                Unfreeze
                              </button>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'repost', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #3b82f6',
                                  backgroundColor: '#dbeafe',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Repost this job posting"
                              >
                                Repost
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCancelModal(p.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Cancel this job posting"
                              >
                                Cancel
                              </button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT: Form + Preview */}
        <main className="jpb-main">
          <div className="jpb-main-tabs">
            <button
              className={`jpb-main-tab ${!showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Form
            </button>
            <button
              className={`jpb-main-tab ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Live Preview
            </button>
          </div>

          <div className="jpb-main-content">
            {/* ======= FORM PANEL ======= */}
            <div className={`jpb-form-panel ${showPreview ? 'hidden-mobile' : ''}`}>
              <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSave(); }}>

                {/* Duplicate Mode Banner */}
                {isDirty && !editingId && formData.job_title.includes('(Copy)') && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#92400e'
                  }}>
                    📋 You're creating a <strong>duplicate</strong> — this will save as a new job posting.
                  </div>
                )}

                {/* SECTION: Metadata */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h3>Recruiter & Metadata</h3>
                  </div>
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Recruiter</label>
                      <div className="jpb-readonly-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        {userName}
                      </div>
                    </div>
                    <div className="jpb-field">
                      <label>Posting End Date <span className="jpb-required">*</span></label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className={errors.end_date ? 'jpb-error-input' : ''}
                      />
                      {errors.end_date && <span className="jpb-error-text">{errors.end_date}</span>}
                    </div>
                  </div>
                </div>

                {/* SECTION: Job Details */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <h3>Job Details</h3>
                  </div>

                  {/* Dynamic 3-Tier Taxonomy Selection */}
                  <div className="jpb-field jpb-field-full">
                    <CascadingTaxonomySelect
                      selectedVendor={formData.product_vendor}
                      selectedProductType={formData.product_type}
                      selectedRole={formData.job_role}
                      onVendorChange={(name) => { setSelectedRoleId(null); setFormData(prev => ({ ...prev, product_vendor: name, product_type: '', job_role: '' })); }}
                      onProductTypeChange={(name) => { setSelectedRoleId(null); setFormData(prev => ({ ...prev, product_type: name, job_role: '' })); }}
                      onRoleChange={(name, roleId) => { setSelectedRoleId(roleId || null); setFormData(prev => ({ ...prev, job_role: name })); }}
                      required={true}
                      errors={{
                        vendor: errors.product_vendor,
                        productType: errors.job_category || errors.product_type,
                        role: errors.job_role,
                      }}
                    />
                  </div>

                  {/* Row 3: Job Title */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Title <span className="jpb-required">*</span></label>
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Oracle Fusion Financials Consultant"
                      className={errors.job_title ? 'jpb-error-input' : ''}
                    />
                    {errors.job_title && <span className="jpb-error-text">{errors.job_title}</span>}
                  </div>

                  {/* Row 4: Job Description */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Description <span className="jpb-required">*</span></label>
                    <textarea
                      name="job_description"
                      value={formData.job_description}
                      onChange={handleInputChange}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      rows={6}
                      className={errors.job_description ? 'jpb-error-input' : ''}
                    />
                    {errors.job_description && <span className="jpb-error-text">{errors.job_description}</span>}
                  </div>

                  {/* Row 5: Seniority Level & Type of Job */}
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Seniority Level</label>
                      <select name="seniority_level" value={formData.seniority_level} onChange={handleInputChange}>
                        <option value="">Select Level</option>
                        {SENIORITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Type of Job</label>
                      <select name="employment_type" value={formData.employment_type} onChange={handleInputChange}>
                        {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Travel Requirements & Work Mode */}
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Travel Requirements</label>
                      <select name="travel_requirements" value={formData.travel_requirements} onChange={handleInputChange}>
                        {TRAVEL_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Work Mode <span className="jpb-required">*</span></label>
                      <div className="jpb-radio-group">
                        {['remote', 'hybrid', 'onsite'].map(mode => (
                          <label key={mode} className={`jpb-radio-pill ${formData.worktype === mode ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name="worktype"
                              value={mode}
                              checked={formData.worktype === mode}
                              onChange={handleInputChange}
                            />
                            {worktypeLabel(mode)}
                          </label>
                        ))}
                      </div>
                      {errors.worktype && <span className="jpb-error-text">{errors.worktype}</span>}
                    </div>
                  </div>

                  {/* Row 7: Job Location */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Location <span className="jpb-required">*</span></label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g., San Francisco, CA"
                      className={errors.location ? 'jpb-error-input' : ''}
                    />
                    {errors.location && <span className="jpb-error-text">{errors.location}</span>}
                  </div>
                </div>

                {/* SECTION: Requirements */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>Candidate Requirements</h3>
                  </div>

                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Education Qualifications</label>
                      <select
                        name="education_qualifications"
                        value={formData.education_qualifications}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Qualification</option>
                        {EDUCATION_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Visa Information</label>
                      <select name="visa_info" value={formData.visa_info} onChange={handleInputChange}>
                        <option value="">Select Visa Requirement</option>
                        {VISA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Product Type</label>
                      <input
                        type="text"
                        name="product_type"
                        value={formData.product_type}
                        onChange={handleInputChange}
                        placeholder="e.g., ERP, CRM, Cloud"
                      />
                    </div>
                  </div>

                  {/* Certifications multi-select */}
                  <div className="jpb-field jpb-field-full">
                    <label>Certifications</label>
                    <div className="jpb-multi-select" ref={certDropdownRef}>
                      <div className="jpb-multi-input-wrap">
                        {formData.certifications_required.map(cert => (
                          <span key={cert} className="jpb-multi-tag">
                            {cert}
                            <button type="button" onClick={() => removeCertification(cert)}>×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={certSearch}
                          onChange={e => { setCertSearch(e.target.value); setShowCertDropdown(true); }}
                          onFocus={() => setShowCertDropdown(true)}
                          placeholder={formData.certifications_required.length === 0 ? "Search certifications..." : "Add more..."}
                        />
                      </div>
                      {showCertDropdown && filteredCerts.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredCerts.slice(0, 10).map(cert => (
                            <div key={cert} className="jpb-dropdown-item" onClick={() => addCertification(cert)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {cert}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION: Compensation */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <h3>Compensation</h3>
                  </div>

                  <div className="jpb-form-row jpb-form-row-3">
                    <div className="jpb-field">
                      <label>Salary Min</label>
                      <input
                        type="number"
                        name="salary_min"
                        value={formData.salary_min}
                        onChange={handleInputChange}
                        placeholder="e.g., 120000"
                        className={errors.salary_min ? 'jpb-error-input' : ''}
                      />
                      {errors.salary_min && <span className="jpb-error-text">{errors.salary_min}</span>}
                    </div>
                    <div className="jpb-field">
                      <label>Salary Max</label>
                      <input
                        type="number"
                        name="salary_max"
                        value={formData.salary_max}
                        onChange={handleInputChange}
                        placeholder="e.g., 180000"
                      />
                    </div>
                    <div className="jpb-field">
                      <label>Currency</label>
                      <select name="salary_currency" value={formData.salary_currency} onChange={handleInputChange}>
                        <option value="usd">USD ($)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="eur">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div className="jpb-field">
                    <label>Pay Type</label>
                    <div className="jpb-radio-group">
                      {['annually', 'hourly'].map(pt => (
                        <label key={pt} className={`jpb-radio-pill ${formData.pay_type === pt ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="pay_type"
                            value={pt}
                            checked={formData.pay_type === pt}
                            onChange={handleInputChange}
                          />
                          {pt.charAt(0).toUpperCase() + pt.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION: Skills */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <h3>Skills</h3>
                  </div>
                  {errors.skills && <span className="jpb-error-text jpb-error-block">{errors.skills}</span>}

                  {/* Technical Skills */}
                  <div className="jpb-skill-group">
                    <h4 className="jpb-skill-group-title">
                      <span className="jpb-skill-dot tech" />
                      Technical Skills
                    </h4>
                    <div className="jpb-multi-select" ref={techDropdownRef}>
                      <input
                        type="text"
                        value={skillSearchTech}
                        onChange={e => { setSkillSearchTech(e.target.value); setShowTechDropdown(true); }}
                        onFocus={() => setShowTechDropdown(true)}
                        placeholder="Search and add technical skills..."
                        className="jpb-skill-search-input"
                      />
                      {showTechDropdown && filteredTechSkills.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredTechSkills.slice(0, 12).map(s => (
                            <div key={s} className="jpb-dropdown-item" onClick={() => addSkill(s, 'technical')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div className="jpb-skill-group">
                    <h4 className="jpb-skill-group-title">
                      <span className="jpb-skill-dot soft" />
                      Soft Skills
                    </h4>
                    <div className="jpb-multi-select" ref={softDropdownRef}>
                      <input
                        type="text"
                        value={skillSearchSoft}
                        onChange={e => { setSkillSearchSoft(e.target.value); setShowSoftDropdown(true); }}
                        onFocus={() => setShowSoftDropdown(true)}
                        placeholder="Search and add soft skills..."
                        className="jpb-skill-search-input"
                      />
                      {showSoftDropdown && filteredSoftSkills.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredSoftSkills.slice(0, 12).map(s => (
                            <div key={s} className="jpb-dropdown-item" onClick={() => addSkill(s, 'soft')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Skills List */}
                  {formData.skills.length > 0 && (
                    <div className="jpb-skills-list">
                      <h4 className="jpb-skills-list-title">Selected Skills ({formData.skills.length})</h4>
                      {formData.skills.map(skill => (
                        <div key={skill.skill_name} className="jpb-skill-item">
                          <div className="jpb-skill-item-left">
                            <span className={`jpb-skill-dot ${skill.skill_category}`} />
                            <span className="jpb-skill-item-name">{skill.skill_name}</span>
                            <span className="jpb-skill-item-cat">{skill.skill_category}</span>
                          </div>
                          <div className="jpb-skill-item-right">
                            <div className="jpb-rating-control">
                              <button type="button" onClick={() => updateSkillRating(skill.skill_name, Math.max(1, skill.rating - 1))}>−</button>
                              <span className="jpb-rating-value">{skill.rating}</span>
                              <span className="jpb-rating-max">/10</span>
                              <button type="button" onClick={() => updateSkillRating(skill.skill_name, Math.min(10, skill.rating + 1))}>+</button>
                            </div>
                            <div className="jpb-rating-bar">
                              <div className="jpb-rating-fill" style={{ width: `${skill.rating * 10}%` }} />
                            </div>
                            <button type="button" className="jpb-skill-delete" onClick={() => removeSkill(skill.skill_name)} title="Remove skill">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            </div>

            {/* ======= PREVIEW PANEL ======= */}
            <div className={`jpb-preview-panel ${!showPreview ? 'hidden-mobile' : ''}`}>
              <div className="jpb-preview-card">
                <div className="jpb-preview-header">
                  <h2 className="jpb-preview-title">{formData.job_title || 'Untitled Position'}</h2>
                  <div className="jpb-preview-badges">
                    {formData.job_category && <span className="jpb-preview-badge category">{formData.job_category}</span>}
                    {formData.seniority_level && <span className="jpb-preview-badge seniority">{formData.seniority_level}</span>}
                    <span className="jpb-preview-badge workmode">{worktypeLabel(formData.worktype)}</span>
                    <span className="jpb-preview-badge emptype">{empTypeLabel(formData.employment_type)}</span>
                    {formData.product_vendor && formData.product_vendor !== 'Other' && (
                      <span className="jpb-preview-badge vendor">{formData.product_vendor}</span>
                    )}
                  </div>
                </div>

                <div className="jpb-preview-meta-row">
                  {formData.location && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {formData.location}
                    </div>
                  )}
                  {formData.visa_info && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      {formData.visa_info}
                    </div>
                  )}
                  {formData.travel_requirements && formData.travel_requirements !== 'None' && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      Travel: {formData.travel_requirements}
                    </div>
                  )}
                </div>

                {/* Salary */}
                <div className="jpb-preview-salary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>{formatSalary(formData.salary_min, formData.salary_max, formData.salary_currency, formData.pay_type)}</span>
                </div>

                {/* Description */}
                {formData.job_description && (
                  <div className="jpb-preview-section">
                    <h3>Job Description</h3>
                    <div className="jpb-preview-description">
                      {formData.job_description.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {(formData.education_qualifications || formData.visa_info) && (
                  <div className="jpb-preview-section">
                    <h3>Requirements</h3>
                    <div className="jpb-preview-req-grid">
                      {formData.education_qualifications && (
                        <div className="jpb-preview-req-item">
                          <span className="jpb-preview-req-label">Education</span>
                          <span className="jpb-preview-req-value">{formData.education_qualifications}</span>
                        </div>
                      )}
                      {formData.visa_info && (
                        <div className="jpb-preview-req-item">
                          <span className="jpb-preview-req-label">Visa</span>
                          <span className="jpb-preview-req-value">{formData.visa_info}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {formData.skills.length > 0 && (
                  <div className="jpb-preview-section">
                    <h3>Required Skills</h3>
                    {formData.skills.filter(s => s.skill_category === 'technical').length > 0 && (
                      <div className="jpb-preview-skill-group">
                        <h4>Technical Skills</h4>
                        <div className="jpb-preview-skills">
                          {formData.skills.filter(s => s.skill_category === 'technical').map(s => (
                            <div key={s.skill_name} className="jpb-preview-skill-chip">
                              <span className="jpb-preview-skill-name">{s.skill_name}</span>
                              <div className="jpb-preview-skill-rating">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <span key={i} className={`jpb-preview-star ${i < s.rating ? 'filled' : ''}`}>●</span>
                                ))}
                              </div>
                              <span className="jpb-preview-skill-num">{s.rating}/10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.skills.filter(s => s.skill_category === 'soft').length > 0 && (
                      <div className="jpb-preview-skill-group">
                        <h4>Soft Skills</h4>
                        <div className="jpb-preview-skills">
                          {formData.skills.filter(s => s.skill_category === 'soft').map(s => (
                            <div key={s.skill_name} className="jpb-preview-skill-chip">
                              <span className="jpb-preview-skill-name">{s.skill_name}</span>
                              <div className="jpb-preview-skill-rating">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <span key={i} className={`jpb-preview-star ${i < s.rating ? 'filled' : ''}`}>●</span>
                                ))}
                              </div>
                              <span className="jpb-preview-skill-num">{s.rating}/10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Certifications */}
                {formData.certifications_required.length > 0 && (
                  <div className="jpb-preview-section">
                    <h3>Required Certifications</h3>
                    <div className="jpb-preview-certs">
                      {formData.certifications_required.map(c => (
                        <span key={c} className="jpb-preview-cert-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* End Date */}
                {formData.end_date && (
                  <div className="jpb-preview-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Applications close on {new Date(formData.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Cancel Job Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              Cancel Job Posting?
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
              This action is <strong>permanent</strong> and cannot be undone. The job will no longer accept applications.
            </p>

            {/* Reason Dropdown */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                Reason for cancellation *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              >
                <option value="">Select a reason...</option>
                <option value="Position Filled">Position Filled</option>
                <option value="Budget Cut">Budget Cut</option>
                <option value="Requirements Changed">Requirements Changed</option>
                <option value="Company Restructuring">Company Restructuring</option>
                <option value="Other">Other (please specify)</option>
              </select>
            </div>

            {/* Custom Reason Textarea */}
            {cancelReason === 'Other' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  Please specify reason *
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Brief explanation..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
                <small style={{ fontSize: '11px', color: '#6b7280' }}>
                  {customReason.length}/500 characters
                </small>
              </div>
            )}

            {/* Info Box */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                What you'll still have access to:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#15803d' }}>
                <li>All candidate matches and recommendations</li>
                <li>All applications received</li>
                <li>All notes and communications</li>
                <li>Historical data and analytics</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                  setCustomReason('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelJob}
                disabled={!cancelReason || (cancelReason === 'Other' && !customReason.trim())}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: cancelReason && (cancelReason !== 'Other' || customReason.trim()) ? '#ef4444' : '#d1d5db',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: cancelReason && (cancelReason !== 'Other' || customReason.trim()) ? 'pointer' : 'not-allowed',
                }}
              >
                Yes, Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingFormView;
