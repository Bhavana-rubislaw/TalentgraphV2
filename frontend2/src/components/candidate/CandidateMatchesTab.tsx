import React, { useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import {
  MatchBreakdownBars,
  TopSkillMatches,
  AIMatchReasonBox,
  WhyThisMatch,
  generateCandidateMatchReason,
  type MatchDetails,
} from '../MatchInsights';
import type { CandidateMatch } from '../../types/match';

export interface CandidateMatchesTabProps {
  matches: CandidateMatch[];
  setActiveTab: (tab: string) => void;
  applyingJobId: number | null;
  withdrawingJobId: number | null;
  handleApplyFromMatch: (jobPostingId: number, jobProfileId: number) => void;
}

const MATCHES_PER_PAGE = 6;

const CandidateMatchesTab: React.FC<CandidateMatchesTabProps> = ({
  matches,
  setActiveTab,
  applyingJobId,
  withdrawingJobId,
  handleApplyFromMatch,
}) => {
  const [currentMatchPage, setCurrentMatchPage] = useState(1);
  const [viewMatchJob, setViewMatchJob] = useState<CandidateMatch | null>(null);

  if (matches.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon-professional">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h3 className="empty-title">No matches yet</h3>
        <p className="empty-subtitle">Continue reviewing opportunities. When both you and a recruiter express mutual interest, matches will appear here.</p>
        <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary">
          View Recommendations
        </button>
      </div>
    );
  }

  // Pagination calculations
  const totalMatchPages = Math.ceil(matches.length / MATCHES_PER_PAGE);
  const startMatchIndex = (currentMatchPage - 1) * MATCHES_PER_PAGE;
  const endMatchIndex = startMatchIndex + MATCHES_PER_PAGE;
  const paginatedMatches = matches.slice(startMatchIndex, endMatchIndex);

  // Generate page numbers for pagination
  const getMatchPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalMatchPages <= 7) {
      for (let i = 1; i <= totalMatchPages; i++) pages.push(i);
    } else {
      if (currentMatchPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalMatchPages);
      } else if (currentMatchPage >= totalMatchPages - 2) {
        pages.push(1, '...', totalMatchPages - 3, totalMatchPages - 2, totalMatchPages - 1, totalMatchPages);
      } else {
        pages.push(1, '...', currentMatchPage - 1, currentMatchPage, currentMatchPage + 1, '...', totalMatchPages);
      }
    }
    return pages;
  };

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const c = currency || 'USD';
    if (min && max) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
    if (min) return `${c} ${min.toLocaleString()}+`;
    return `${c} ${max!.toLocaleString()}`;
  };

  return (
    <>
      <style>{`
        @media (max-width: 1400px) {
          .matches-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 1200px) {
          .matches-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .matches-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="matches-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        padding: '0'
      }}>
      {paginatedMatches.map((match) => {
        const companyInitial = match.company?.company_name?.charAt(0).toUpperCase() || 'C';
        const salary = formatSalary(match.job_posting.salary_min, match.job_posting.salary_max, match.job_posting.salary_currency);

        return (
          <div key={match.match_id} style={{
            background: 'white',
            border: '1px solid #E2E4EC',
            borderRadius: '16px',
            padding: '24px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(123, 94, 167, 0.06)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#60a5fa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 94, 167, 0.06)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E2E4EC';
          }}>
            {/* Mutual Match Badge - Top Right */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{match.match_percentage}%</span>
            </div>

            {/* Header: Company Logo */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                color: '#7c3aed',
                marginBottom: '8px'
              }}>
                {companyInitial}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                {match.company?.company_name || 'Company'}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                Matched {new Date(match.matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
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
              {match.job_posting.job_title}
            </h3>

            {/* Department/Category */}
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
              fontWeight: '500'
            }}>
              {match.job_posting.job_role || 'Platform & Tools'}
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
                  {match.job_posting.location || 'Remote'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {match.job_posting.employment_type || 'Full-time'}
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {/* NOTE: applicants_count is not part of the /candidate/matches response —
                    this has always rendered "0 applied". Flagging, not fixing: showing a
                    real count needs a backend change, a product call outside this refactor. */}
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {(match.job_posting as { applicants_count?: number }).applicants_count || '0'} applied
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
              <button
                onClick={() => setViewMatchJob(match)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #E2E4EC',
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
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.color = '#7c3aed';
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
                onClick={() => handleApplyFromMatch(match.job_posting.id, match.job_profile_id)}
                disabled={match.already_applied || applyingJobId === match.job_posting.id}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: match.already_applied
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#111827',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (match.already_applied || applyingJobId === match.job_posting.id) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: (match.already_applied || applyingJobId === match.job_posting.id) ? 0.9 : 1
                }}
                onMouseEnter={(e) => {
                  if (!match.already_applied && applyingJobId !== match.job_posting.id) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.4)';
                    e.currentTarget.style.background = '#1f2937';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!match.already_applied) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = '#111827';
                  }
                }}
              >
                {applyingJobId === match.job_posting.id ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Applying...
                  </>
                ) : match.already_applied ? (
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

    {/* Pagination Footer for Matches */}
    {matches.length > 0 && totalMatchPages > 1 && (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px 20px',
        marginTop: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <button
          disabled={currentMatchPage === 1}
          onClick={() => setCurrentMatchPage(prev => Math.max(1, prev - 1))}
          style={{
            padding: '8px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: currentMatchPage === 1 ? '#f8fafc' : 'white',
            color: currentMatchPage === 1 ? '#94a3b8' : '#475569',
            fontSize: '14px',
            fontWeight: '600',
            cursor: currentMatchPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Previous
        </button>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {getMatchPageNumbers().map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => setCurrentMatchPage(pageNum as number)}
                style={{
                  minWidth: '40px',
                  height: '40px',
                  border: currentMatchPage === pageNum ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: currentMatchPage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #1d4ed8 100%)' : 'white',
                  color: currentMatchPage === pageNum ? 'white' : '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                {pageNum}
              </button>
            )
          ))}
        </div>

        <button
          disabled={currentMatchPage === totalMatchPages}
          onClick={() => setCurrentMatchPage(prev => Math.min(totalMatchPages, prev + 1))}
          style={{
            padding: '8px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: currentMatchPage === totalMatchPages ? '#f8fafc' : 'white',
            color: currentMatchPage === totalMatchPages ? '#94a3b8' : '#475569',
            fontSize: '14px',
            fontWeight: '600',
            cursor: currentMatchPage === totalMatchPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    )}

    {/* Match Job Detail Drawer */}
    {viewMatchJob && (
      <DetailDrawer onClose={() => setViewMatchJob(null)}>
          <div className="cal-drawer-header">
            <div className="cal-drawer-header-info">
              <h2 className="cal-drawer-title">{viewMatchJob.job_posting.job_title}</h2>
              <div className="cal-drawer-subtitle">
                {viewMatchJob.company.company_name}
                {viewMatchJob.job_posting.job_role ? ` · ${viewMatchJob.job_posting.job_role}` : ''}
              </div>
            </div>
            <button className="cal-drawer-close" onClick={() => setViewMatchJob(null)} aria-label="Close">
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
                {viewMatchJob.job_posting.location && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Location</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.location}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.worktype && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Work Type</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.worktype}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.employment_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Employment</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.employment_type}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.seniority_level && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Seniority</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.seniority_level}</span>
                  </div>
                )}
                {(viewMatchJob.job_posting.salary_min || viewMatchJob.job_posting.salary_max) && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Compensation</span>
                    <span className="cal-drawer-field-value">
                      {viewMatchJob.job_posting.salary_currency?.toUpperCase()} {viewMatchJob.job_posting.salary_min}{viewMatchJob.job_posting.salary_max ? ` - ${viewMatchJob.job_posting.salary_max}` : '+'}
                    </span>
                  </div>
                )}
                {viewMatchJob.job_posting.product_vendor && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Vendor</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_vendor}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.product_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Product</span>
                    <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_type}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.start_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Start Date</span>
                    <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {viewMatchJob.job_posting.end_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Apply By</span>
                    <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {viewMatchJob.job_posting.job_description && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  Description
                </div>
                <div className="cal-drawer-description">{viewMatchJob.job_posting.job_description}</div>
              </div>
            )}

            {viewMatchJob.job_posting.posting_skills && viewMatchJob.job_posting.posting_skills.length > 0 && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Required Skills
                </div>
                <div className="cal-drawer-skills">
                  {viewMatchJob.job_posting.posting_skills.map((sk: any, i: number) => (
                    <span key={i} className="cal-drawer-skill">
                      {sk.skill_name}
                      {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(viewMatchJob.job_posting.education_qualifications || viewMatchJob.job_posting.certifications_required || viewMatchJob.job_posting.travel_requirements || viewMatchJob.job_posting.visa_info) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  Requirements
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewMatchJob.job_posting.education_qualifications && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Education</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.education_qualifications}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.certifications_required && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Certifications</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.certifications_required}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.travel_requirements && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Travel</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.travel_requirements}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.visa_info && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Visa</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.visa_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Match Details */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Match Details
              </div>
              <div style={{ padding: '12px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#7c3aed' }}>{viewMatchJob.match_percentage}%</span>
                  <span style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: 500 }}>Mutual Match</span>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  You liked this job, and the company expressed interest in your profile — a mutual match!
                </p>
              </div>
              {viewMatchJob.matched_at && (
                <div className="cal-drawer-field">
                  <span className="cal-drawer-field-label">Matched On</span>
                  <span className="cal-drawer-field-value">{new Date(viewMatchJob.matched_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* AI Match Insights */}
            {(() => {
              // NOTE: match_details was never part of the /candidate/matches response — this
              // has always fallen through to an all-zero breakdown here. Flagging, not fixing:
              // showing a real per-category breakdown needs a backend change, a product call.
              const matchDetails = (viewMatchJob as { match_details?: Partial<MatchDetails> }).match_details || {};
              const displayDetails: MatchDetails = {
                product_match: matchDetails.product_match ?? 0,
                skills_match: matchDetails.skills_match ?? 0,
                experience_match: matchDetails.experience_match ?? 0,
                salary_match: matchDetails.salary_match ?? 0,
                location_match: matchDetails.location_match ?? 0,
                matched_skills: matchDetails.matched_skills ?? [],
              };
              const hasAnyScore = displayDetails.product_match > 0 || displayDetails.skills_match > 0 ||
                displayDetails.experience_match > 0 || displayDetails.salary_match > 0 || displayDetails.location_match > 0;
              if (!hasAnyScore && !viewMatchJob.match_percentage) return null;
              const matchReason = generateCandidateMatchReason(displayDetails, {
                productVendor: viewMatchJob.job_posting?.product_vendor ?? undefined,
                topSkill: displayDetails.matched_skills?.[0],
                jobTitle: viewMatchJob.job_posting?.job_title,
              });
              return (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    AI Match Insights
                  </div>
                  <AIMatchReasonBox variant="candidate" reason={matchReason} />
                  <div style={{ marginTop: '12px' }}>
                    <MatchBreakdownBars details={displayDetails} />
                  </div>
                  {displayDetails.matched_skills && displayDetails.matched_skills.length > 0 && (
                    <TopSkillMatches matchedSkills={displayDetails.matched_skills} maxSkills={8} />
                  )}
                  {(() => {
                    const drivers: string[] = [];
                    if (displayDetails.matched_skills?.[0]) drivers.push(`Skill: ${displayDetails.matched_skills[0]}`);
                    if (viewMatchJob.job_posting?.product_vendor && displayDetails.product_match > 0) drivers.push(`Product: ${viewMatchJob.job_posting.product_vendor}`);
                    if (displayDetails.salary_match > 0) drivers.push('Salary aligned');
                    if (displayDetails.location_match > 0) drivers.push('Location matched');
                    if (drivers.length > 0) return <WhyThisMatch drivers={drivers} />;
                    return null;
                  })()}
                </div>
              );
            })()}
          </div>

          <div className="cal-drawer-footer">
            <button
              className="cal-btn cal-btn-secondary"
              onClick={() => { setViewMatchJob(null); setActiveTab('messages'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Message the recruiter for this job"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Message Recruiter
            </button>
            <button
              className="cal-btn cal-btn-primary"
              onClick={() => { handleApplyFromMatch(viewMatchJob.job_posting.id, viewMatchJob.job_profile_id); setViewMatchJob(null); }}
              disabled={applyingJobId === viewMatchJob.job_posting.id || withdrawingJobId === viewMatchJob.job_posting.id}
            >
              {applyingJobId === viewMatchJob.job_posting.id ? (
                'Applying…'
              ) : withdrawingJobId === viewMatchJob.job_posting.id ? (
                'Withdrawing…'
              ) : viewMatchJob.already_applied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Already Applied
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
          </div>
        </DetailDrawer>
    )}
  </>
  );
};

export default CandidateMatchesTab;
