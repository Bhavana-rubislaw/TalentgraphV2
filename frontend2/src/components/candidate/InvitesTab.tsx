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
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">No invites yet</h3>
        <p className="mt-2 text-sm text-gray-500">Recruiters will send you invitations when they identify you as a strong match for their opportunities.</p>
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
                {/* NOTE: recruiter_name is not part of the /candidate/recruiter-invites response —
                    "Invited By" has always been hidden. Flagging, not fixing: needs a backend change. */}
                {(viewInviteJob as any).recruiter_name && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Invited By</span>
                    <span className="cal-drawer-field-value">{(viewInviteJob as any).recruiter_name}</span>
                  </div>
                )}
              </div>
              {/* NOTE: message is not part of the /candidate/recruiter-invites response — this
                  "Recruiter's Message" block has always been hidden. Flagging, not fixing. */}
              {(viewInviteJob as any).message && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9ff', borderRadius: '8px', borderLeft: '3px solid #7c3aed' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recruiter's Message</div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{(viewInviteJob as any).message}</div>
                </div>
              )}
            </div>

            {/* AI Match Insights (if match data available) */}
            {/* NOTE: match_percentage/match_details are not part of the /candidate/recruiter-invites
                response — invites are one-sided recruiter actions, not mutual matches, so this
                section has always been hidden. Flagging, not fixing: needs a backend change. */}
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
    <>
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
      <div className="jobs-grid-modern">
        {paginatedInvites.map((invite) => {
          const jp = invite.job_posting;
          const company = invite.company;
          const salary = jp.salary_min && jp.salary_max
            ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
            : null;

          return (
            <div key={invite.invite_id} className="job-card-modern">
              {/* Professional Invitation Badge */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  Recruiter Invitation
                </div>
              </div>

              {/* Job Header */}
              <div className="job-card-header" style={{ marginBottom: '12px' }}>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#1a202c',
                  marginBottom: '6px',
                  lineHeight: '1.4'
                }}>
                  {jp.job_title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: '500',
                  margin: 0
                }}>
                  {company.company_name}
                </p>
              </div>

              {/* Professional Job Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                padding: '16px 0',
                borderTop: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                {jp.location && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{jp.location}</div>
                    </div>
                  </div>
                )}
                {jp.worktype && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Type</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{jp.worktype}</div>
                    </div>
                  </div>
                )}
                {salary && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>{salary}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setViewInviteJob(invite)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1.5px solid #e2e8f0',
                    background: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View Details
                </button>
                <button
                  onClick={() => handleApplyFromInvite(jp.id, invite.job_profile_id)}
                  disabled={applyingJobId === jp.id || withdrawingJobId === jp.id}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    background: invite.already_applied ? '#10b981' : ((applyingJobId === jp.id || withdrawingJobId === jp.id) ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'),
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    cursor: (applyingJobId === jp.id || withdrawingJobId === jp.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: ((applyingJobId === jp.id || withdrawingJobId === jp.id) && !invite.already_applied) ? 1 : (invite.already_applied ? 1 : 1)
                  }}
                  onMouseEnter={(e) => {
                    if (applyingJobId !== jp.id && withdrawingJobId !== jp.id) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {applyingJobId === jp.id ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                        <line x1="12" y1="2" x2="12" y2="6"/>
                        <line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/>
                        <line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                      Applying...
                    </>
                  ) : withdrawingJobId === jp.id ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                        <line x1="12" y1="2" x2="12" y2="6"/>
                        <line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/>
                        <line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                      Withdrawing...
                    </>
                  ) : invite.already_applied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Applied ✓
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

      {/* Pagination Footer for Invites */}
      {filteredInvites.length > 0 && totalInvitePages > 1 && (
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
            disabled={currentInvitePage === 1}
            onClick={() => setCurrentInvitePage(prev => Math.max(1, prev - 1))}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: currentInvitePage === 1 ? '#f8fafc' : 'white',
              color: currentInvitePage === 1 ? '#94a3b8' : '#475569',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentInvitePage === 1 ? 'not-allowed' : 'pointer',
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
            {getInvitePageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => setCurrentInvitePage(pageNum as number)}
                  style={{
                    minWidth: '40px',
                    height: '40px',
                    border: currentInvitePage === pageNum ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentInvitePage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #1d4ed8 100%)' : 'white',
                    color: currentInvitePage === pageNum ? 'white' : '#475569',
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
            disabled={currentInvitePage === totalInvitePages}
            onClick={() => setCurrentInvitePage(prev => Math.min(totalInvitePages, prev + 1))}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: currentInvitePage === totalInvitePages ? '#f8fafc' : 'white',
              color: currentInvitePage === totalInvitePages ? '#94a3b8' : '#475569',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentInvitePage === totalInvitePages ? 'not-allowed' : 'pointer',
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

      {renderInviteDrawer()}
    </>
  );
};

export default InvitesTab;
