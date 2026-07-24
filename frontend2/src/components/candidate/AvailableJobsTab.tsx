import React, { useEffect, useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import type { AvailableJob } from '../../types/availableJob';

export interface AvailableJobsTabProps {
  availableJobs: AvailableJob[];
  applyingJobId: number | null;
  withdrawingJobId: number | null;
  handleApply: (jobPostingId: number) => Promise<void>;
  handleSwipeLike: (jobPostingId: number) => Promise<void>;
}

const JOBS_PER_PAGE = 6;

const AvailableJobsTab: React.FC<AvailableJobsTabProps> = ({
  availableJobs,
  applyingJobId,
  withdrawingJobId,
  handleApply,
  handleSwipeLike,
}) => {
  const [viewAvailableJob, setViewAvailableJob] = useState<AvailableJob | null>(null);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobRole, setSelectedJobRole] = useState('');
  const [selectedJobWorkType, setSelectedJobWorkType] = useState('');
  const [jobLocationFilter, setJobLocationFilter] = useState('');
  const [jobApplicationStatusFilter, setJobApplicationStatusFilter] = useState('');
  const [currentJobPage, setCurrentJobPage] = useState(1);

  // Reset job pagination when filters change
  useEffect(() => {
    setCurrentJobPage(1);
  }, [jobSearchTerm, selectedJobRole, selectedJobWorkType, jobLocationFilter, jobApplicationStatusFilter]);

  // Derive available job roles dynamically from job data
  const availableJobRoles = (() => {
    const rolesSet = new Set<string>();
    availableJobs.forEach((job) => {
      if (job.job_title) rolesSet.add(job.job_title);
      if (job.job_role) rolesSet.add(job.job_role);
    });
    return Array.from(rolesSet).sort();
  })();

  // Filter jobs based on all active filters
  const filteredJobs = (() => {
    return availableJobs.filter((job) => {
      // Search filter
      if (jobSearchTerm) {
        const searchLower = jobSearchTerm.toLowerCase();
        const matchesSearch =
          job.job_title?.toLowerCase().includes(searchLower) ||
          job.company_name?.toLowerCase().includes(searchLower) ||
          job.job_description?.toLowerCase().includes(searchLower) ||
          job.job_role?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (selectedJobRole) {
        const matchesRole =
          job.job_title === selectedJobRole ||
          job.job_role === selectedJobRole;
        if (!matchesRole) return false;
      }

      // Work type filter
      if (selectedJobWorkType) {
        const jobWorkType = job.worktype?.toLowerCase();
        const filterWorkType = selectedJobWorkType.toLowerCase();
        if (jobWorkType !== filterWorkType) return false;
      }

      // Location filter
      if (jobLocationFilter) {
        const locationLower = jobLocationFilter.toLowerCase();
        const matchesLocation = job.location?.toLowerCase().includes(locationLower);
        if (!matchesLocation) return false;
      }

      // Application status filter
      if (jobApplicationStatusFilter) {
        if (jobApplicationStatusFilter === 'applied' && !job.already_applied) return false;
        if (jobApplicationStatusFilter === 'not-applied' && job.already_applied) return false;
      }

      return true;
    });
  })();

  const hasActiveFilters = jobSearchTerm || selectedJobRole || selectedJobWorkType || jobLocationFilter || jobApplicationStatusFilter;

  if (availableJobs.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon-professional">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
          </svg>
        </div>
        <h3 className="empty-title">No jobs available</h3>
        <p className="empty-subtitle">New opportunities are posted regularly. Check back soon or create job preferences for personalized recommendations.</p>
      </div>
    );
  }

  // Clear all job filters handler
  const clearAllJobFilters = () => {
    setJobSearchTerm('');
    setSelectedJobRole('');
    setSelectedJobWorkType('');
    setJobLocationFilter('');
    setJobApplicationStatusFilter('');
    setCurrentJobPage(1);
  };

  // Remove individual filter
  const removeFilter = (filterType: string) => {
    switch(filterType) {
      case 'search':
        setJobSearchTerm('');
        break;
      case 'role':
        setSelectedJobRole('');
        break;
      case 'worktype':
        setSelectedJobWorkType('');
        break;
      case 'location':
        setJobLocationFilter('');
        break;
      case 'status':
        setJobApplicationStatusFilter('');
        break;
    }
    setCurrentJobPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const startIndex = (currentJobPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentJobPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentJobPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentJobPage - 1, currentJobPage, currentJobPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      {/* Page Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Browse Jobs</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Browse and filter open roles that match your interests</p>
      </div>

      {/* Modern Filter Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '24px',
        border: '1px solid #E5E7EB'
      }}>
        {/* Top Row: Search + Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 350px', minWidth: '280px' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                style={{
                  width: '100%',
                  paddingLeft: '46px',
                  paddingRight: '16px',
                  height: '48px',
                  fontSize: '15px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  background: '#F9FAFB',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                placeholder="Search by title, company, or keywords..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              />
            </div>
          </div>

          {/* Role Dropdown */}
          <div style={{ flex: '0 1 200px' }}>
            <select
              style={{
                width: '100%',
                height: '48px',
                fontSize: '14px',
                borderRadius: '12px',
                padding: '0 16px',
                paddingRight: '40px',
                border: '1px solid #E5E7EB',
                background: 'white',
                color: '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              value={selectedJobRole}
              onChange={(e) => setSelectedJobRole(e.target.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
            >
              <option value="">All Roles</option>
              {availableJobRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div style={{ flex: '0 1 200px' }}>
            <select
              style={{
                width: '100%',
                height: '48px',
                fontSize: '14px',
                borderRadius: '12px',
                padding: '0 16px',
                paddingRight: '40px',
                border: '1px solid #E5E7EB',
                background: 'white',
                color: '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              value={jobLocationFilter}
              onChange={(e) => setJobLocationFilter(e.target.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
            >
              <option value="">Any Location</option>
              <option value="Remote">Remote</option>
              <option value="San Francisco">San Francisco</option>
              <option value="New York">New York</option>
              <option value="Austin">Austin</option>
              <option value="Seattle">Seattle</option>
              <option value="Boston">Boston</option>
              <option value="Chicago">Chicago</option>
            </select>
          </div>
        </div>

        {/* Bottom Row: Work Mode Buttons + Clear */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedJobWorkType('')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: selectedJobWorkType === '' ? 'none' : '1px solid #E5E7EB',
                background: selectedJobWorkType === '' ? '#2563eb' : 'white',
                color: selectedJobWorkType === '' ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedJobWorkType !== '') {
                  e.currentTarget.style.background = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedJobWorkType !== '') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              All
            </button>
            <button
              onClick={() => setSelectedJobWorkType('Remote')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: selectedJobWorkType === 'Remote' ? 'none' : '1px solid #E5E7EB',
                background: selectedJobWorkType === 'Remote' ? '#2563eb' : 'white',
                color: selectedJobWorkType === 'Remote' ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedJobWorkType !== 'Remote') {
                  e.currentTarget.style.background = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedJobWorkType !== 'Remote') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              Remote
            </button>
            <button
              onClick={() => setSelectedJobWorkType('Hybrid')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: selectedJobWorkType === 'Hybrid' ? 'none' : '1px solid #E5E7EB',
                background: selectedJobWorkType === 'Hybrid' ? '#2563eb' : 'white',
                color: selectedJobWorkType === 'Hybrid' ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedJobWorkType !== 'Hybrid') {
                  e.currentTarget.style.background = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedJobWorkType !== 'Hybrid') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              Hybrid
            </button>
            <button
              onClick={() => setSelectedJobWorkType('Onsite')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: selectedJobWorkType === 'Onsite' ? 'none' : '1px solid #E5E7EB',
                background: selectedJobWorkType === 'Onsite' ? '#2563eb' : 'white',
                color: selectedJobWorkType === 'Onsite' ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedJobWorkType !== 'Onsite') {
                  e.currentTarget.style.background = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedJobWorkType !== 'Onsite') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              Onsite
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllJobFilters}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: '#2563eb',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>Active filters:</span>
              {jobSearchTerm && (
                <button
                  onClick={() => removeFilter('search')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  Search: {jobSearchTerm}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {selectedJobRole && (
                <button
                  onClick={() => removeFilter('role')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  Role: {selectedJobRole}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {selectedJobWorkType && (
                <button
                  onClick={() => removeFilter('worktype')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  {selectedJobWorkType}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {jobLocationFilter && (
                <button
                  onClick={() => removeFilter('location')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  Location: {jobLocationFilter}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {jobApplicationStatusFilter && (
                <button
                  onClick={() => removeFilter('status')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  {jobApplicationStatusFilter === 'applied' ? 'Applied' : 'Not Applied'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={clearAllJobFilters}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eef2ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Empty State for Filtered Results */}
      {filteredJobs.length === 0 && hasActiveFilters && (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3 className="empty-title">No jobs match your filters</h3>
          <p className="empty-subtitle">Try adjusting your search criteria or clearing filters to see more results.</p>
          <button onClick={clearAllJobFilters} className="btn btn-primary">
            Clear All Filters
          </button>
        </div>
      )}

      {/* Jobs Grid - Match Style */}
      {filteredJobs.length > 0 && (
        <>
          <style>{`
            @media (max-width: 1400px) {
              .available-jobs-grid { grid-template-columns: repeat(3, 1fr) !important; }
            }
            @media (max-width: 1200px) {
              .available-jobs-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 768px) {
              .available-jobs-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <div className="available-jobs-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            padding: '0'
          }}>
          {paginatedJobs.map((job) => {
            const companyInitial = job.company_name?.charAt(0).toUpperCase() || 'C';
            const salary = job.salary_min && job.salary_max
              ? `${job.salary_currency?.toUpperCase() || 'USD'} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
              : null;

            return (
              <div key={job.id} style={{
                background: 'white',
                border: '1px solid #E2E4EC',
                borderRadius: '16px',
                padding: '24px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.14)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#60a5fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#E2E4EC';
              }}>
                {/* Header: Company Logo */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#2563eb',
                    marginBottom: '8px'
                  }}>
                    {companyInitial}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                    {job.company_name || 'Company'}
                  </div>
                  {/* NOTE: end_date is not part of the /candidate/available-jobs response — this
                      has always been hidden. Flagging, not fixing: showing a real apply-by date
                      needs a backend change, a product call outside this refactor. */}
                  {(job as { end_date?: string }).end_date && (
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                      Apply by {new Date((job as { end_date?: string }).end_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Job Title */}
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '6px',
                  lineHeight: '1.3',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {job.job_title}
                </h3>

                {/* Department/Category */}
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '20px',
                  fontWeight: '500'
                }}>
                  {job.job_role || 'Platform & Tools'}
                </p>
                {/* Job Details Grid (2x2) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {job.location || 'Remote'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {job.employment_type || 'Full-time'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {salary || 'Competitive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                    </svg>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {job.worktype || 'Onsite'}
                    </span>
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
                  <button
                    onClick={() => setViewAvailableJob(job)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #E2E4EC',
                      background: 'white',
                      color: '#111827',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.color = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#E2E4EC';
                      e.currentTarget.style.color = '#111827';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View Details
                  </button>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: job.already_applied
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : '#111827',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      opacity: (job.already_applied || applyingJobId === job.id || withdrawingJobId === job.id) ? 0.9 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!job.already_applied && applyingJobId !== job.id && withdrawingJobId !== job.id) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.4)';
                        e.currentTarget.style.background = '#1f2937';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!job.already_applied) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = '#111827';
                      }
                    }}
                  >
                    {applyingJobId === job.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Applying...
                      </>
                    ) : withdrawingJobId === job.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Withdrawing...
                      </>
                    ) : job.already_applied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Applied
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Apply Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Pagination Footer */}
      {filteredJobs.length > 0 && totalPages > 1 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginTop: '24px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)' }}>
            Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredJobs.length)}</strong> of <strong>{filteredJobs.length}</strong> jobs
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Previous Button */}
            <button
              onClick={() => setCurrentJobPage(prev => Math.max(1, prev - 1))}
              disabled={currentJobPage === 1}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: currentJobPage === 1 ? '#f8fafc' : 'white',
                cursor: currentJobPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentJobPage === 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentJobPage !== 1) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                if (currentJobPage !== 1) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentJobPage(page as number)}
                  style={{
                    minWidth: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: currentJobPage === page ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentJobPage === page ? '#2563eb' : 'white',
                    color: currentJobPage === page ? 'white' : '#475569',
                    fontSize: '14px',
                    fontWeight: currentJobPage === page ? 600 : 500,
                    cursor: 'pointer',
                    padding: '0 12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentJobPage !== page) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentJobPage !== page) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  {page}
                </button>
              )
            ))}

            {/* Next Button */}
            <button
              onClick={() => setCurrentJobPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentJobPage === totalPages}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: currentJobPage === totalPages ? '#f8fafc' : 'white',
                cursor: currentJobPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentJobPage === totalPages ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentJobPage !== totalPages) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                if (currentJobPage !== totalPages) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      )}

    {/* Available Job Detail Drawer */}
    {viewAvailableJob && (
      <DetailDrawer onClose={() => setViewAvailableJob(null)}>
          <div className="cal-drawer-header">
            <div className="cal-drawer-header-info">
              <h2 className="cal-drawer-title">{viewAvailableJob.job_title}</h2>
              <div className="cal-drawer-subtitle">
                {viewAvailableJob.company_name || 'Company'}
                {viewAvailableJob.job_role ? ` · ${viewAvailableJob.job_role}` : ''}
              </div>
            </div>
            <button className="cal-drawer-close" onClick={() => setViewAvailableJob(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="cal-drawer-body">
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                Overview
              </div>
              <div className="cal-drawer-meta-grid">
                {viewAvailableJob.location && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Location</span>
                    <span className="cal-drawer-field-value">{viewAvailableJob.location}</span>
                  </div>
                )}
                {viewAvailableJob.worktype && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Work Type</span>
                    <span className="cal-drawer-field-value">{viewAvailableJob.worktype}</span>
                  </div>
                )}
                {viewAvailableJob.employment_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Employment</span>
                    <span className="cal-drawer-field-value">{viewAvailableJob.employment_type}</span>
                  </div>
                )}
                {/* NOTE: seniority_level and start_date are not part of the /candidate/available-jobs
                    response — these have always been hidden. Flagging, not fixing: needs a backend change. */}
                {(viewAvailableJob as any).seniority_level && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Seniority</span>
                    <span className="cal-drawer-field-value">{(viewAvailableJob as any).seniority_level}</span>
                  </div>
                )}
                {(viewAvailableJob.salary_min || viewAvailableJob.salary_max) && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Compensation</span>
                    <span className="cal-drawer-field-value">
                      {viewAvailableJob.salary_currency?.toUpperCase()} {viewAvailableJob.salary_min}{viewAvailableJob.salary_max ? ` - ${viewAvailableJob.salary_max}` : '+'}
                    </span>
                  </div>
                )}
                {viewAvailableJob.product_vendor && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Vendor</span>
                    <span className="cal-drawer-field-value">{viewAvailableJob.product_vendor}</span>
                  </div>
                )}
                {viewAvailableJob.product_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Product</span>
                    <span className="cal-drawer-field-value">{viewAvailableJob.product_type}</span>
                  </div>
                )}
                {(viewAvailableJob as any).start_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Start Date</span>
                    <span className="cal-drawer-field-value">{new Date((viewAvailableJob as any).start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {viewAvailableJob.job_description && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  Description
                </div>
                <div className="cal-drawer-description">{viewAvailableJob.job_description}</div>
              </div>
            )}

            {/* NOTE: posting_skills, education_qualifications, certifications_required,
                travel_requirements, and visa_info are not part of the /candidate/available-jobs
                response — these sections have always been hidden. Flagging, not fixing: needs a
                backend change to include this data on the available-jobs list endpoint. */}
            {(viewAvailableJob as any).posting_skills && (viewAvailableJob as any).posting_skills.length > 0 && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Required Skills
                </div>
                <div className="cal-drawer-skills">
                  {(viewAvailableJob as any).posting_skills.map((sk: any, i: number) => (
                    <span key={i} className="cal-drawer-skill">
                      {sk.skill_name}
                      {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {((viewAvailableJob as any).education_qualifications || (viewAvailableJob as any).certifications_required || (viewAvailableJob as any).travel_requirements || (viewAvailableJob as any).visa_info) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  Requirements
                </div>
                <div className="cal-drawer-meta-grid">
                  {(viewAvailableJob as any).education_qualifications && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Education</span>
                      <span className="cal-drawer-field-value">{(viewAvailableJob as any).education_qualifications}</span>
                    </div>
                  )}
                  {(viewAvailableJob as any).certifications_required && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Certifications</span>
                      <span className="cal-drawer-field-value">{(viewAvailableJob as any).certifications_required}</span>
                    </div>
                  )}
                  {(viewAvailableJob as any).travel_requirements && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Travel</span>
                      <span className="cal-drawer-field-value">{(viewAvailableJob as any).travel_requirements}</span>
                    </div>
                  )}
                  {(viewAvailableJob as any).visa_info && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Visa</span>
                      <span className="cal-drawer-field-value">{(viewAvailableJob as any).visa_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="cal-drawer-footer">
            <button
              className="cal-btn cal-btn-secondary"
              onClick={() => { handleSwipeLike(viewAvailableJob.id); setViewAvailableJob(null); }}
              title="Like this job"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like Job
            </button>
            <button
              className={`cal-btn ${viewAvailableJob.already_applied ? 'cal-btn-secondary' : 'cal-btn-primary'}`}
              onClick={() => {
                handleApply(viewAvailableJob.id);
                setViewAvailableJob(null);
              }}
              disabled={applyingJobId === viewAvailableJob.id || withdrawingJobId === viewAvailableJob.id}
            >
              {applyingJobId === viewAvailableJob.id ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} className="spin-icon">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Applying...
                </>
              ) : withdrawingJobId === viewAvailableJob.id ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} className="spin-icon">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Withdrawing...
                </>
              ) : viewAvailableJob.already_applied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Applied
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Apply Now
                </>
              )}
            </button>
            <button className="cal-btn cal-btn-secondary" onClick={() => setViewAvailableJob(null)}>Close</button>
          </div>
        </DetailDrawer>
    )}
    </>
  );
};

export default AvailableJobsTab;
