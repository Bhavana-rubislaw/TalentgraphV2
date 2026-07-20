import React, { useMemo, useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import type { BrowseCandidate } from '../../types/browseCandidate';

export interface BrowseCandidatesTabProps {
  browseCandidates: BrowseCandidate[];
  browseTotal: number;
  browseLoading: boolean;
  browsePage: number;
  setBrowsePage: React.Dispatch<React.SetStateAction<number>>;
  browseLimit: number;
  browseSearch: string;
  setBrowseSearch: (value: string) => void;
  browseRole: string;
  setBrowseRole: (value: string) => void;
  browseWorkType: string;
  setBrowseWorkType: (value: string) => void;
  browseLocation: string;
  setBrowseLocation: (value: string) => void;
  handleRecruiterLike: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleAskToApply: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleStartDirectMessage: (candidateUserId: number) => Promise<void>;
  handleStartMessage: (candidateUserId: number) => Promise<void>;
}

const BrowseCandidatesTab: React.FC<BrowseCandidatesTabProps> = ({
  browseCandidates,
  browseTotal,
  browseLoading,
  browsePage,
  setBrowsePage,
  browseLimit,
  browseSearch,
  setBrowseSearch,
  browseRole,
  setBrowseRole,
  browseWorkType,
  setBrowseWorkType,
  browseLocation,
  setBrowseLocation,
  handleRecruiterLike,
  handleAskToApply,
  handleStartDirectMessage,
  handleStartMessage,
}) => {
  const [viewCandidateProfile, setViewCandidateProfile] = useState<any | null>(null);

  // Derive available roles from candidate data
  const availableRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    browseCandidates.forEach((candidate: any) => {
      if (candidate.headline) rolesSet.add(candidate.headline);
      if (candidate.job_profiles) {
        candidate.job_profiles.forEach((jp: any) => {
          if (jp.job_role) rolesSet.add(jp.job_role);
          if (jp.profile_name) rolesSet.add(jp.profile_name);
        });
      }
    });
    return Array.from(rolesSet).sort();
  }, [browseCandidates]);

  // Filter candidates based on role selection (frontend filtering)
  const filteredCandidates = useMemo(() => {
    if (!browseRole) return browseCandidates;
    return browseCandidates.filter((candidate: any) => {
      if (candidate.headline === browseRole) return true;
      if (candidate.job_profiles) {
        return candidate.job_profiles.some((jp: any) =>
          jp.job_role === browseRole || jp.profile_name === browseRole
        );
      }
      return false;
    });
  }, [browseCandidates, browseRole]);

  const hasActiveFilters = browseSearch || browseRole || browseWorkType || browseLocation;
  const resultCount = filteredCandidates.length;

  if (browseLoading) {
    return (
      <div className="loading">Loading candidates...</div>
    );
  }

  return (
    <>
      <div className="purple-section-wrapper">
      {/* Page Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>Browse Candidates</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>Review and engage with candidate profiles across the platform</p>
      </div>

      {/* Enhanced Filter Toolbar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: '24px',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 280px', minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="job-select-modern"
                style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '40px', fontSize: '14px', borderRadius: '8px' }}
                placeholder="Name, email, or keywords..."
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Role Dropdown */}
          <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
            <label htmlFor="browse-role-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
            <select
              id="browse-role-filter"
              className="job-select-modern"
              style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
              value={browseRole}
              onChange={(e) => setBrowseRole(e.target.value)}
            >
              <option value="">All Roles</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Work Type Dropdown */}
          <div style={{ flex: '0 1 160px', minWidth: '140px' }}>
            <label htmlFor="browse-worktype-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</label>
            <select
              id="browse-worktype-filter"
              className="job-select-modern"
              style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
              value={browseWorkType}
              onChange={(e) => setBrowseWorkType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Remote">Remote</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          {/* Location Input */}
          <div style={{ flex: '0 1 180px', minWidth: '160px' }}>
            <label htmlFor="browse-location-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</label>
            <input
              type="text"
              id="browse-location-filter"
              className="job-select-modern"
              style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px' }}
              placeholder="City or State"
              value={browseLocation}
              onChange={(e) => setBrowseLocation(e.target.value)}
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="action-btn secondary"
                style={{ height: '40px', padding: '0 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setBrowseSearch(''); setBrowseRole(''); setBrowseWorkType(''); setBrowseLocation(''); }}
              >
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
            {hasActiveFilters
              ? `Showing ${resultCount} of ${browseTotal} candidates`
              : `Showing ${browseTotal} candidates`
            }
          </span>
          {hasActiveFilters && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              {[browseSearch && 'search', browseRole && 'role', browseWorkType && 'work type', browseLocation && 'location'].filter(Boolean).join(', ')} active
            </span>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredCandidates.length === 0 && (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 className="empty-title">No Candidates Found</h3>
          <p className="empty-subtitle">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more candidates.'
              : 'No candidates are available in the system at this time.'}
          </p>
        </div>
      )}

      {/* Enhanced Candidates Grid */}
      {filteredCandidates.length > 0 && (
        <div className="candidates-grid-modern" style={{ gap: '20px' }}>
          {filteredCandidates.map((candidate: any, index) => (
            <div
              key={`browse-${candidate.candidate_id}-${index}`}
              className="candidate-card-modern"
              style={{
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '20px',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Card Header with Avatar and Basic Info */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 600,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}>
                  {candidate.full_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', marginBottom: '4px', lineHeight: 1.3 }}>
                    {candidate.full_name}
                  </h3>
                  {candidate.headline && (
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary, #667eea)', marginBottom: '6px', lineHeight: 1.4 }}>
                      {candidate.headline}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                    {candidate.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {candidate.location}
                      </span>
                    )}
                    {candidate.years_experience && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                        {candidate.years_experience} years
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Work Type Badge */}
              {candidate.work_type && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: candidate.work_type === 'Remote' ? '#dbeafe' : candidate.work_type === 'Hybrid' ? '#fef3c7' : '#e0e7ff',
                    color: candidate.work_type === 'Remote' ? '#1e40af' : candidate.work_type === 'Hybrid' ? '#92400e' : '#3730a3'
                  }}>
                    {candidate.work_type}
                  </span>
                </div>
              )}

              {/* Skills Section */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>Top Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {candidate.skills.slice(0, 6).map((skill: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: 'var(--bg-light, #f8fafc)',
                          color: 'var(--text-secondary, #64748b)',
                          border: '1px solid var(--border-color, #e2e8f0)'
                        }}
                      >
                        {skill.skill_name}
                      </span>
                    ))}
                    {candidate.skills.length > 6 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--primary, #667eea)'
                      }}>
                        +{candidate.skills.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Job Profiles Section */}
              {candidate.job_profiles && candidate.job_profiles.length > 0 && (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>Roles</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>
                    {candidate.job_profiles.slice(0, 2).map((jp: any, idx: number) => (
                      <span key={idx}>
                        {jp.profile_name || jp.job_role}
                        {idx < Math.min(candidate.job_profiles.length - 1, 1) && ', '}
                      </span>
                    ))}
                    {candidate.job_profiles.length > 2 && (
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}> +{candidate.job_profiles.length - 2} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced CTA Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    height: '40px',
                    padding: '0 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewCandidateProfile(candidate);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)';
                  }}
                >
                  View Profile
                </button>
                <button
                  className={`action-btn ${candidate.already_liked ? 'liked' : 'secondary'}`}
                  style={{
                    padding: '0 16px',
                    height: '40px',
                    fontSize: '14px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: candidate.already_liked ? 0.6 : 1,
                    cursor: candidate.already_liked ? 'not-allowed' : 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!candidate.already_liked && candidate.job_profiles && candidate.job_profiles.length > 0) {
                      handleRecruiterLike(candidate.candidate_id, candidate.job_profiles[0].id);
                    }
                  }}
                  disabled={candidate.already_liked}
                  title={candidate.already_liked ? 'Already liked this candidate' : 'Like this candidate'}
                >
                  <svg viewBox="0 0 24 24" fill={candidate.already_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {candidate.already_liked ? 'Liked' : 'Like'}
                </button>
                <button
                  className="action-btn secondary"
                  style={{
                    padding: '0 16px',
                    height: '40px',
                    fontSize: '14px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (candidate.user_id) {
                      handleStartDirectMessage(candidate.user_id);
                    } else {
                      alert('Cannot message this candidate');
                    }
                  }}
                  title="Send a message to this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
                <button
                  className={`action-btn ${candidate.already_invited ? 'success' : 'primary'}`}
                  style={{
                    padding: '0 16px',
                    height: '40px',
                    fontSize: '14px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    opacity: candidate.already_invited ? 0.6 : 1,
                    cursor: candidate.already_invited ? 'not-allowed' : 'pointer',
                    background: candidate.already_invited ? '#10b981' : 'var(--primary, #667eea)',
                    color: 'white',
                    border: 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!candidate.already_invited && candidate.job_profiles && candidate.job_profiles.length > 0) {
                      handleAskToApply(candidate.candidate_id, candidate.job_profiles[0].id);
                    }
                  }}
                  disabled={candidate.already_invited}
                  title={candidate.already_invited ? 'Already invited this candidate' : 'Ask candidate to apply'}
                >
                  {candidate.already_invited ? '✓ Asked to Apply' : 'Ask to Apply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {browseTotal > 0 && (() => {
        const totalBrowsePages = Math.max(1, Math.ceil(browseTotal / browseLimit));
        const getBrowsePageNumbers = (): (number | string)[] => {
          if (totalBrowsePages <= 7) return Array.from({ length: totalBrowsePages }, (_, i) => i + 1);
          const pages: (number | string)[] = [];
          if (browsePage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalBrowsePages); }
          else if (browsePage >= totalBrowsePages - 3) { pages.push(1, '...', totalBrowsePages - 4, totalBrowsePages - 3, totalBrowsePages - 2, totalBrowsePages - 1, totalBrowsePages); }
          else { pages.push(1, '...', browsePage - 1, browsePage, browsePage + 1, '...', totalBrowsePages); }
          return pages;
        };
        const startItem = (browsePage - 1) * browseLimit + 1;
        const endItem = Math.min(browsePage * browseLimit, browseTotal);
        return (
          <div className="cp-pagination-footer" style={{ marginTop: '28px', borderRadius: 12 }}>
            <span className="cp-pagination-info">
              Showing {startItem}–{endItem} of {browseTotal} candidates
            </span>
            <div className="cp-pagination-buttons">
              <button className="cp-pag-btn" disabled={browsePage === 1} onClick={() => setBrowsePage(p => p - 1)}>← Prev</button>
              {getBrowsePageNumbers().map((pn, i) =>
                pn === '...' ? (
                  <span key={`e${i}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
                ) : (
                  <button key={pn} className={`cp-pag-btn${browsePage === pn ? ' active' : ''}`} onClick={() => setBrowsePage(pn as number)}>{pn}</button>
                )
              )}
              <button className="cp-pag-btn" disabled={browsePage >= totalBrowsePages} onClick={() => setBrowsePage(p => p + 1)}>Next →</button>
            </div>
          </div>
        );
      })()}
      </div>

      {/* Browse Candidate Profile Drawer */}
      {viewCandidateProfile && (
        <DetailDrawer onClose={() => setViewCandidateProfile(null)} overlayClassName="vp-overlay" modalClassName="vp-modal">
            {/* Header */}
            <div className="vp-header">
              <div className="vp-header-avatar">{viewCandidateProfile.full_name.charAt(0).toUpperCase()}</div>
              <div className="vp-header-info">
                <h2 className="vp-header-name">{viewCandidateProfile.full_name}</h2>
                {viewCandidateProfile.headline && <p className="vp-header-role">{viewCandidateProfile.headline}</p>}
              </div>
              <button className="vp-close" onClick={() => setViewCandidateProfile(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="vp-body">
              {/* Basic Info Section */}
              <div className="vp-section">
                <div className="vp-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Contact Information
                </div>
                <div className="vp-grid">
                  <div className="vp-field">
                    <span className="vp-field-label">Location</span>
                    <span className="vp-field-value">{viewCandidateProfile.location || <em className="vp-empty">—</em>}</span>
                  </div>
                  {viewCandidateProfile.years_experience && (
                    <div className="vp-field">
                      <span className="vp-field-label">Experience</span>
                      <span className="vp-field-value">{viewCandidateProfile.years_experience} years</span>
                    </div>
                  )}
                  {viewCandidateProfile.work_type && (
                    <div className="vp-field">
                      <span className="vp-field-label">Work Type</span>
                      <span className="vp-field-value">{viewCandidateProfile.work_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              {viewCandidateProfile.skills && viewCandidateProfile.skills.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Skills
                  </div>
                  <div className="vp-skills-wrap">
                    {viewCandidateProfile.skills.map((skill: any, idx: number) => (
                      <span key={idx} className="vp-skill-pill">
                        {skill.skill_name}
                        {skill.proficiency_level && <span className="vp-skill-level">{skill.proficiency_level}/5</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Profiles Section */}
              {viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Job Profiles
                  </div>
                  {viewCandidateProfile.job_profiles.map((profile: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: idx < viewCandidateProfile.job_profiles.length - 1 ? '1px solid var(--border-color, #e2e8f0)' : 'none' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #1e293b)' }}>
                        {profile.profile_name} - {profile.job_role}
                      </h4>
                      {profile.profile_summary && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                          {profile.profile_summary}
                        </p>
                      )}
                      <div className="vp-grid" style={{ marginTop: '8px' }}>
                        {profile.years_of_experience && (
                          <div className="vp-field">
                            <span className="vp-field-label">Experience</span>
                            <span className="vp-field-value">{profile.years_of_experience} years</span>
                          </div>
                        )}
                        {profile.worktype && (
                          <div className="vp-field">
                            <span className="vp-field-label">Work Type</span>
                            <span className="vp-field-value">{profile.worktype}</span>
                          </div>
                        )}
                        {profile.employment_type && (
                          <div className="vp-field">
                            <span className="vp-field-label">Employment</span>
                            <span className="vp-field-value">{profile.employment_type}</span>
                          </div>
                        )}
                        {profile.salary_min && profile.salary_max && (
                          <div className="vp-field">
                            <span className="vp-field-label">Salary Range</span>
                            <span className="vp-field-value">
                              ${profile.salary_min.toLocaleString()} – ${profile.salary_max.toLocaleString()}
                              {profile.salary_currency ? ` ${profile.salary_currency}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="vp-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', flexWrap: 'wrap' }}>
                <button
                  className={`action-btn ${viewCandidateProfile.already_liked ? 'liked' : 'secondary'}`}
                  style={{ flex: 1, minWidth: '120px' }}
                  onClick={() => {
                    if (!viewCandidateProfile.already_liked && viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0) {
                      handleRecruiterLike(viewCandidateProfile.candidate_id, viewCandidateProfile.job_profiles[0].id);
                      setViewCandidateProfile({ ...viewCandidateProfile, already_liked: true });
                    }
                  }}
                  disabled={viewCandidateProfile.already_liked}
                >
                  <svg viewBox="0 0 24 24" fill={viewCandidateProfile.already_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span style={{ marginLeft: '8px' }}>{viewCandidateProfile.already_liked ? 'Liked' : 'Like'}</span>
                </button>
                <button
                  className={`action-btn ${viewCandidateProfile.already_invited ? 'success' : 'primary'}`}
                  style={{ flex: 1, minWidth: '120px' }}
                  onClick={() => {
                    if (!viewCandidateProfile.already_invited && viewCandidateProfile.job_profiles && viewCandidateProfile.job_profiles.length > 0) {
                      handleAskToApply(viewCandidateProfile.candidate_id, viewCandidateProfile.job_profiles[0].id);
                      setViewCandidateProfile({ ...viewCandidateProfile, already_invited: true });
                    }
                  }}
                  disabled={viewCandidateProfile.already_invited}
                  title={viewCandidateProfile.already_invited ? 'Already invited this candidate' : 'Ask candidate to apply'}
                >
                  {viewCandidateProfile.already_invited ? '✓ Invited' : 'Ask to Apply'}
                </button>
                <button
                  className="action-btn secondary"
                  style={{ flex: 1, minWidth: '120px' }}
                  onClick={() => { handleStartMessage(viewCandidateProfile.user_id || viewCandidateProfile.candidate_id); setViewCandidateProfile(null); }}
                  title="Message this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ marginLeft: '8px' }}>Message</span>
                </button>
              </div>
            </div>
        </DetailDrawer>
      )}
    </>
  );
};

export default BrowseCandidatesTab;
