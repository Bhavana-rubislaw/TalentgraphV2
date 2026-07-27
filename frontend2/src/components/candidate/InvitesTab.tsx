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
import type { RecruiterInvite } from '../../types/invite';

export interface InvitesTabProps {
  invites: RecruiterInvite[];
  applyingJobId: number | null;
  withdrawingJobId: number | null;
  handleApplyFromInvite: (jobPostingId: number, jobProfileId: number) => Promise<void>;
}

const INVITES_PER_PAGE = 6;

const InvitesTab: React.FC<InvitesTabProps> = ({
  invites,
  applyingJobId,
  withdrawingJobId,
  handleApplyFromInvite,
}) => {
  const [viewInviteJob, setViewInviteJob] = useState<RecruiterInvite | null>(null);
  const [currentInvitePage, setCurrentInvitePage] = useState(1);
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');
  const [selectedInviteRole, setSelectedInviteRole] = useState('');
  const [selectedInviteWorkType, setSelectedInviteWorkType] = useState('');
  const [inviteLocationFilter, setInviteLocationFilter] = useState('');

  if (invites.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon-professional">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 className="empty-title">No invites yet</h3>
        <p className="empty-subtitle">Recruiters will send you invitations when they identify you as a strong match for their opportunities.</p>
      </div>
    );
  }

  const renderInviteDrawer = () => {
    if (!viewInviteJob) return null;
    const jp = viewInviteJob.job_posting;
    const company = viewInviteJob.company;
    const salary = jp.salary_min && jp.salary_max
      ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
      : null;
    const isApplied = viewInviteJob.already_applied;
    const isApplying = applyingJobId === jp.id;

    return (
      <DetailDrawer onClose={() => setViewInviteJob(null)}>
          {/* Header */}
          <div className="cal-drawer-header">
            <div className="cal-drawer-header-info">
              <h2 className="cal-drawer-title">{jp.job_title}</h2>
              <div className="cal-drawer-subtitle">{company.company_name}{jp.job_role ? ` · ${jp.job_role}` : ''}</div>
            </div>
            <button className="cal-drawer-close" onClick={() => setViewInviteJob(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Body */}
          <div className="cal-drawer-body">
            {/* Overview */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                Overview
              </div>
              <div className="cal-drawer-meta-grid">
                {jp.location && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Location</span><span className="cal-drawer-field-value">{jp.location}</span></div>}
                {jp.worktype && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Work Type</span><span className="cal-drawer-field-value">{jp.worktype}</span></div>}
                {jp.employment_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Employment</span><span className="cal-drawer-field-value">{jp.employment_type}</span></div>}
                {jp.seniority_level && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Seniority</span><span className="cal-drawer-field-value">{jp.seniority_level}</span></div>}
                {salary && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Compensation</span><span className="cal-drawer-field-value">{salary}{jp.pay_type ? ` / ${jp.pay_type}` : ''}</span></div>}
                {jp.product_vendor && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Vendor</span><span className="cal-drawer-field-value">{jp.product_vendor}</span></div>}
                {jp.product_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Product</span><span className="cal-drawer-field-value">{jp.product_type}</span></div>}
                {jp.job_category && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Category</span><span className="cal-drawer-field-value">{jp.job_category}</span></div>}
                {jp.start_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Start Date</span><span className="cal-drawer-field-value">{new Date(jp.start_date).toLocaleDateString()}</span></div>}
                {jp.end_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">End Date</span><span className="cal-drawer-field-value">{new Date(jp.end_date).toLocaleDateString()}</span></div>}
              </div>
            </div>

            {/* Description */}
            {jp.job_description && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  Description
                </div>
                <div className="cal-drawer-description">{jp.job_description}</div>
              </div>
            )}

            {/* Skills */}
            {jp.posting_skills && jp.posting_skills.length > 0 && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Required Skills
                </div>
                <div className="cal-drawer-skills">
                  {jp.posting_skills.map((sk, i: number) => (
                    <span key={i} className="cal-drawer-skill">
                      {sk.skill_name}
                      {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {(jp.education_qualifications || jp.certifications_required || jp.travel_requirements || jp.visa_info) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  Requirements
                </div>
                <div className="cal-drawer-meta-grid">
                  {jp.education_qualifications && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Education</span><span className="cal-drawer-field-value">{jp.education_qualifications}</span></div>}
                  {jp.certifications_required && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Certifications</span><span className="cal-drawer-field-value">{jp.certifications_required}</span></div>}
                  {jp.travel_requirements && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Travel</span><span className="cal-drawer-field-value">{jp.travel_requirements}</span></div>}
                  {jp.visa_info && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Visa</span><span className="cal-drawer-field-value">{jp.visa_info}</span></div>}
                </div>
              </div>
            )}

            {/* Invitation Details */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Invitation Details
              </div>
              <div className="cal-drawer-meta-grid">
                {viewInviteJob.created_at && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Date Invited</span>
                    <span className="cal-drawer-field-value">{new Date(viewInviteJob.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                {(viewInviteJob as any).recruiter_name && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Invited By</span>
                    <span className="cal-drawer-field-value">{(viewInviteJob as any).recruiter_name}</span>
                  </div>
                )}
              </div>
              {/* message is not part of the /candidate/recruiter-invites response — recruiters
                  have no UI to compose one when sending an invite, so this never renders.
                  Would need a new compose field on the recruiter's Ask-to-Apply flow. */}
              {(viewInviteJob as any).message && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9ff', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recruiter's Message</div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{(viewInviteJob as any).message}</div>
                </div>
              )}
            </div>

            {/* AI Match Insights (if match data available) */}
            {(viewInviteJob as any).match_percentage && (() => {
              const inviteDetails = (viewInviteJob as any).match_details || {};
              const inviteDisplayDetails: MatchDetails = {
                product_match: inviteDetails.product_match ?? 0,
                skills_match: inviteDetails.skills_match ?? 0,
                experience_match: inviteDetails.experience_match ?? 0,
                salary_match: inviteDetails.salary_match ?? 0,
                location_match: inviteDetails.location_match ?? 0,
                matched_skills: inviteDetails.matched_skills ?? [],
              };
              const inviteMatchReason = generateCandidateMatchReason(inviteDisplayDetails, {
                productVendor: jp.product_vendor,
                topSkill: inviteDisplayDetails.matched_skills?.[0],
                jobTitle: jp.job_title,
              });
              return (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    AI Match Insights
                  </div>
                  <AIMatchReasonBox variant="candidate" reason={inviteMatchReason} />
                  <div style={{ marginTop: '12px' }}>
                    <MatchBreakdownBars details={inviteDisplayDetails} compact />
                  </div>
                  {inviteDisplayDetails.matched_skills && inviteDisplayDetails.matched_skills.length > 0 && (
                    <TopSkillMatches matchedSkills={inviteDisplayDetails.matched_skills} maxSkills={6} />
                  )}
                  {(() => {
                    const drivers: string[] = [];
                    if (inviteDisplayDetails.matched_skills?.[0]) drivers.push(`Skill: ${inviteDisplayDetails.matched_skills[0]}`);
                    if (jp.product_vendor && (inviteDisplayDetails.product_match ?? 0) > 0) drivers.push(`Product: ${jp.product_vendor}`);
                    if ((inviteDisplayDetails.salary_match ?? 0) > 0) drivers.push('Salary aligned');
                    if ((inviteDisplayDetails.location_match ?? 0) > 0) drivers.push('Location matched');
                    if (drivers.length > 0) return <WhyThisMatch drivers={drivers} />;
                    return null;
                  })()}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="cal-drawer-footer">
            <button
              className={`cal-btn cal-btn-primary${isApplying || withdrawingJobId === jp.id ? ' loading' : ''}`}
              onClick={() => handleApplyFromInvite(jp.id, viewInviteJob.job_profile_id)}
              disabled={isApplying || withdrawingJobId === jp.id}
            >
              {isApplying ? (
                'Applying…'
              ) : withdrawingJobId === jp.id ? (
                'Withdrawing…'
              ) : isApplied ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5"/></svg>
                  Already Applied
                </>
              ) : (
                'Apply Now'
              )}
            </button>
            <button className="cal-btn cal-btn-secondary" onClick={() => setViewInviteJob(null)}>Close</button>
          </div>
        </DetailDrawer>
    );
  };

  // Apply filters to invites
  const filteredInvites = invites.filter((invite) => {
    const jp = invite.job_posting;
    const company = invite.company;

    // Search term
    if (inviteSearchTerm) {
      const term = inviteSearchTerm.toLowerCase();
      const titleMatch = jp.job_title?.toLowerCase().includes(term);
      const companyMatch = company.company_name?.toLowerCase().includes(term);
      const descMatch = jp.job_description?.toLowerCase().includes(term);
      const roleMatch = jp.job_role?.toLowerCase().includes(term);
      if (!titleMatch && !companyMatch && !descMatch && !roleMatch) return false;
    }

    // Role filter
    if (selectedInviteRole) {
      const roleMatch = jp.job_title === selectedInviteRole || jp.job_role === selectedInviteRole;
      if (!roleMatch) return false;
    }

    // Work type filter
    if (selectedInviteWorkType && jp.worktype !== selectedInviteWorkType) return false;

    // Location filter
    if (inviteLocationFilter) {
      const locMatch = jp.location?.toLowerCase().includes(inviteLocationFilter.toLowerCase());
      if (!locMatch) return false;
    }

    return true;
  });

  // Count active filters
  const activeFiltersCount = [inviteSearchTerm, selectedInviteRole, selectedInviteWorkType, inviteLocationFilter].filter(Boolean).length;

  // Clear all filters handler
  const clearAllInviteFilters = () => {
    setInviteSearchTerm('');
    setSelectedInviteRole('');
    setSelectedInviteWorkType('');
    setInviteLocationFilter('');
    setCurrentInvitePage(1);
  };

  // Pagination calculations
  const totalInvitePages = Math.ceil(filteredInvites.length / INVITES_PER_PAGE);
  const startInviteIndex = (currentInvitePage - 1) * INVITES_PER_PAGE;
  const endInviteIndex = startInviteIndex + INVITES_PER_PAGE;
  const paginatedInvites = filteredInvites.slice(startInviteIndex, endInviteIndex);

  // Generate page numbers for pagination
  const getInvitePageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalInvitePages <= 7) {
      for (let i = 1; i <= totalInvitePages; i++) pages.push(i);
    } else {
      if (currentInvitePage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalInvitePages);
      } else if (currentInvitePage >= totalInvitePages - 2) {
        pages.push(1, '...', totalInvitePages - 3, totalInvitePages - 2, totalInvitePages - 1, totalInvitePages);
      } else {
        pages.push(1, '...', currentInvitePage - 1, currentInvitePage, currentInvitePage + 1, '...', totalInvitePages);
      }
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Invites Section Header */}
      <div className="section-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recruiter Invites</h2>
        <p className="text-sm text-gray-600 mt-1">Review personalized job invitations from recruiters</p>
        {filteredInvites.length !== invites.length && (
          <p className="text-sm text-gray-500 mt-2">
            Showing {paginatedInvites.length} of {filteredInvites.length} invites
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllInviteFilters}
                className="ml-2 text-blue-600 hover:text-blue-700 underline"
              >
                Clear filters
              </button>
            )}
          </p>
        )}
      </div>

      {/* Invites Grid */}
      <div className="cgc-grid">
        {paginatedInvites.map((invite) => {
          const jp = invite.job_posting;
          const company = invite.company;
          const salary = jp.salary_min && jp.salary_max
            ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
            : null;
          const skills = jp.posting_skills || [];
          const isBusy = applyingJobId === jp.id || withdrawingJobId === jp.id;

          return (
            <div key={invite.invite_id} className="cgc-card">
              <div className="cgc-header">
                <div className="cgc-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                  {company.company_name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="cgc-name-block">
                  <div className="cgc-name">{jp.job_title}</div>
                  <div className="cgc-title">{company.company_name}</div>
                </div>
              </div>

              <div className="cgc-meta-row">
                <div className="cgc-meta-left">
                  {jp.location && (
                    <span className="cgc-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {jp.location}
                    </span>
                  )}
                  {jp.worktype && (
                    <span className="cgc-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                      {jp.worktype}
                    </span>
                  )}
                </div>
                <span className="cgc-status-pill">Invited</span>
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
                  <button className="cgc-icon-btn" onClick={() => setViewInviteJob(invite)} title="View job details">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button
                    className="cgc-apply-btn"
                    onClick={() => handleApplyFromInvite(jp.id, invite.job_profile_id)}
                    disabled={invite.already_applied || isBusy}
                  >
                    {applyingJobId === jp.id ? 'Applying…' : withdrawingJobId === jp.id ? 'Withdrawing…' : invite.already_applied ? 'Applied' : 'Apply Now'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer for Invites — always pinned to the bottom of the tab
          panel (marginTop: 'auto' inside the flex column wrapper above), even
          when there's only one page, so the footer never floats right under
          a short list — the remaining space stays empty above it instead. */}
      {filteredInvites.length > 0 && (
        <div className="cp-pagination-footer" style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <span className="cp-pagination-info">
            Showing {(currentInvitePage - 1) * INVITES_PER_PAGE + 1}–{Math.min(currentInvitePage * INVITES_PER_PAGE, filteredInvites.length)} of {filteredInvites.length} invites
          </span>
          <div className="cp-pagination-buttons">
            <button className="cp-pag-btn" disabled={currentInvitePage === 1} onClick={() => setCurrentInvitePage(p => p - 1)}>← Prev</button>
            {getInvitePageNumbers().map((pageNum, idx) =>
              pageNum === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
              ) : (
                <button key={pageNum} className={`cp-pag-btn${currentInvitePage === pageNum ? ' active' : ''}`} onClick={() => setCurrentInvitePage(pageNum as number)}>{pageNum}</button>
              )
            )}
            <button className="cp-pag-btn" disabled={currentInvitePage === totalInvitePages} onClick={() => setCurrentInvitePage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {renderInviteDrawer()}
    </div>
  );
};

export default InvitesTab;
