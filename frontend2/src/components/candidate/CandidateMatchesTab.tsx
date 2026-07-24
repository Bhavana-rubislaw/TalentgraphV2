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
      <div className="cgc-grid">
      {paginatedMatches.map((match) => {
        const companyInitial = match.company?.company_name?.charAt(0).toUpperCase() || 'C';
        const salary = formatSalary(match.job_posting.salary_min, match.job_posting.salary_max, match.job_posting.salary_currency);
        const isNew = Date.now() - new Date(match.matched_at).getTime() < 3 * 24 * 60 * 60 * 1000;
        const skills = match.job_posting.posting_skills || [];

        return (
          <div key={match.match_id} className="cgc-card">
            <div className="cgc-header" style={{ paddingRight: 0 }}>
              <div className="cgc-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                {companyInitial}
              </div>
              <div className="cgc-name-block">
                <div className="cgc-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {match.company?.company_name || 'Company'}
                  {isNew && <span className="cgc-status-pill" style={{ background: '#dbeafe', color: '#1d4ed8' }}>New</span>}
                </div>
                <div className="cgc-title">{match.job_posting.job_role || 'Professional'}</div>
              </div>
              <div
                className="ai-match-ring"
                style={{ '--pct': match.match_percentage } as React.CSSProperties}
                title={`${match.match_percentage}% match`}
              >
                <span className="ai-match-ring-value">{match.match_percentage}%</span>
              </div>
            </div>

            <div className="cgc-meta-row">
              <div className="cgc-meta-left">
                <span className="cgc-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {match.job_posting.location || 'Remote'}
                </span>
                <span className="cgc-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {match.job_posting.employment_type || 'Full-time'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2563eb', fontWeight: 600, marginBottom: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 11-14h-7l1-8z"/></svg>
              Matched for <span style={{ color: '#111827' }}>{match.job_posting.job_title}</span>
            </div>

            {skills.length > 0 && (
              <div className="cgc-skills">
                {skills.slice(0, 4).map((sk, idx: number) => (
                  <span key={idx} className="cgc-skill-tag">{sk.skill_name}</span>
                ))}
                {skills.length > 4 && <span className="cgc-skill-tag">+{skills.length - 4} more</span>}
              </div>
            )}

            <div className="cgc-footer">
              {salary && <span className="cgc-match-pill">{salary}</span>}
              <div className="cgc-footer-actions">
                <button
                  className="cgc-icon-btn"
                  onClick={() => setActiveTab('messages')}
                  title="Message the recruiter for this job"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button
                  className="cgc-apply-btn"
                  onClick={() => setViewMatchJob(match)}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Pagination Footer for Matches */}
    {matches.length > 0 && totalMatchPages > 1 && (
      <div className="cp-pagination-footer" style={{ marginTop: '24px' }}>
        <span className="cp-pagination-info">
          Showing {startMatchIndex + 1}–{Math.min(endMatchIndex, matches.length)} of {matches.length} matches
        </span>
        <div className="cp-pagination-buttons">
          <button className="cp-pag-btn" disabled={currentMatchPage === 1} onClick={() => setCurrentMatchPage(p => p - 1)}>← Prev</button>
          {getMatchPageNumbers().map((pageNum, idx) =>
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
            ) : (
              <button key={pageNum} className={`cp-pag-btn${currentMatchPage === pageNum ? ' active' : ''}`} onClick={() => setCurrentMatchPage(pageNum as number)}>{pageNum}</button>
            )
          )}
          <button className="cp-pag-btn" disabled={currentMatchPage === totalMatchPages} onClick={() => setCurrentMatchPage(p => p + 1)}>Next →</button>
        </div>
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
              <div style={{ padding: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{viewMatchJob.match_percentage}%</span>
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
