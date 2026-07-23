import React, { useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import { API_BASE } from '../../api/client';
import type { ShortlistItem } from '../../types/shortlist';
import type { Application } from '../../types/application';

export interface ShortlistTabProps {
  shortlist: ShortlistItem[];
  applications: Application[];
  handleAskToApply: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleStartMessage: (candidateUserId: number) => Promise<void>;
  setSelectedAppForSchedule: (app: any) => void;
  setIsScheduleInterviewModalOpen: (open: boolean) => void;
}

const ShortlistTab: React.FC<ShortlistTabProps> = ({
  shortlist,
  applications,
  handleAskToApply,
  handleStartMessage,
  setSelectedAppForSchedule,
  setIsScheduleInterviewModalOpen,
}) => {
  const [shortlistRoleFilter, setShortlistRoleFilter] = useState<string>('all');
  const [viewShortlistItem, setViewShortlistItem] = useState<any | null>(null);
  const [shortlistPage, setShortlistPage] = useState(1);
  const SHORTLIST_PAGE_SIZE = 8;

  if (shortlist.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon-professional">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 className="empty-title">No Shortlisted Candidates</h3>
        <p className="empty-subtitle">
          Shortlist candidates from your recommendations to keep track of your top prospects.
        </p>
      </div>
    );
  }

  // Derive unique role options from shortlist data
  const shortlistRoleOptions: string[] = Array.from(
    new Set(
      shortlist
        .map((item: any): string =>
          (item.job_profile?.job_role as string | undefined) ||
          (item.job_profile?.profile_name as string | undefined) ||
          (item.job_posting?.job_title as string | undefined) ||
          ''
        )
        .filter((s: string) => s.length > 0)
    )
  ).sort();

  const filteredShortlist = shortlistRoleFilter === 'all'
    ? shortlist
    : shortlist.filter((item: any) => {
        const role =
          (item.job_profile?.job_role as string | undefined) ||
          (item.job_profile?.profile_name as string | undefined) ||
          (item.job_posting?.job_title as string | undefined) ||
          '';
        return role === shortlistRoleFilter;
      });

  const totalShortlistPages = Math.max(1, Math.ceil(filteredShortlist.length / SHORTLIST_PAGE_SIZE));
  const currentShortlistPage = Math.min(shortlistPage, totalShortlistPages);
  const paginatedShortlist = filteredShortlist.slice(
    (currentShortlistPage - 1) * SHORTLIST_PAGE_SIZE,
    currentShortlistPage * SHORTLIST_PAGE_SIZE
  );

  const getShortlistPageNumbers = (): (number | string)[] => {
    if (totalShortlistPages <= 7) return Array.from({ length: totalShortlistPages }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (currentShortlistPage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalShortlistPages); }
    else if (currentShortlistPage >= totalShortlistPages - 3) { pages.push(1, '...', totalShortlistPages - 4, totalShortlistPages - 3, totalShortlistPages - 2, totalShortlistPages - 1, totalShortlistPages); }
    else { pages.push(1, '...', currentShortlistPage - 1, currentShortlistPage, currentShortlistPage + 1, '...', totalShortlistPages); }
    return pages;
  };

  return (
    <>
      <div className="purple-section-wrapper">
      {/* Enhanced Filter Toolbar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: '24px',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
            <label htmlFor="shortlist-role-filter" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
            <select
              id="shortlist-role-filter"
              className="job-select-modern"
              style={{ width: '100%', height: '40px', fontSize: '14px', borderRadius: '8px', padding: '0 12px', paddingRight: '32px' }}
              value={shortlistRoleFilter}
              onChange={(e) => { setShortlistRoleFilter(e.target.value); setShortlistPage(1); }}
            >
              <option value="all">All Roles</option>
              {shortlistRoleOptions.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Pills */}
        {shortlistRoleFilter !== 'all' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: '#DBEAFE',
              color: '#2563eb',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #93c5fd'
            }}>
              Role: {shortlistRoleFilter}
              <button
                onClick={() => { setShortlistRoleFilter('all'); setShortlistPage(1); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: '#2563eb', lineHeight: 1 }}
                title="Remove filter"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
            <button
              onClick={() => { setShortlistRoleFilter('all'); setShortlistPage(1); }}
              style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Count */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
            {shortlistRoleFilter !== 'all'
              ? `Filtered: ${filteredShortlist.length} of ${shortlist.length} candidates`
              : `Showing all ${shortlist.length} shortlisted candidates`}
          </span>
        </div>
      </div>

      <div className="cgc-grid">
      {paginatedShortlist.map((item: any, index) => {
        const candidateInitial = item.candidate.name?.charAt(0).toUpperCase() || 'C';
        const skills: any[] = item.job_profile?.skills || [];
        return (
          <div key={`shortlist-${index}-${item.candidate.id}-${item.job_posting?.id ?? 'x'}`} className="cgc-card">
            {/* Already-shortlisted indicator — top right (static, not a toggle;
                turns green once the candidate has also been invited to apply) */}
            <div
              className={`cgc-top-badge checked ${item.already_invited ? 'active' : ''}`}
              title={item.already_invited ? 'Invited to apply' : 'Shortlisted'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div className="cgc-header">
              <div className="cgc-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                {candidateInitial}
              </div>
              <div className="cgc-name-block">
                <div className="cgc-name">{item.candidate.name}</div>
                <div className="cgc-title">{item.job_posting?.job_title || item.job_profile?.profile_name || 'Open Role'}</div>
              </div>
            </div>

            <div className="cgc-meta-row">
              <div className="cgc-meta-left">
                <span className="cgc-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {item.candidate.location_state || 'Remote'}
                </span>
                {item.job_profile?.years_of_experience ? (
                  <span className="cgc-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    {item.job_profile.years_of_experience} yrs
                  </span>
                ) : null}
              </div>
              <span className="cgc-status-pill">
                {item.already_invited ? 'Invited' : 'Shortlisted'} · {new Date(item.shortlisted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {skills.length > 0 && (
              <div className="cgc-skills">
                {skills.slice(0, 4).map((sk: any, idx: number) => (
                  <span key={idx} className="cgc-skill-tag">{sk.skill_name}</span>
                ))}
                {skills.length > 4 && <span className="cgc-skill-tag">+{skills.length - 4} more</span>}
              </div>
            )}

            {/* No match_percentage exists on the shortlist API response — omitted
                rather than fabricated (same gap as the Browse tab). */}
            <div className="cgc-footer">
              <div className="cgc-footer-actions">
                <button
                  className="cgc-icon-btn"
                  onClick={() => handleStartMessage(item.candidate.user_id || item.candidate.id)}
                  title="Send a message to this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button
                  className="cgc-icon-btn"
                  onClick={() => setViewShortlistItem(item)}
                  title="View full profile"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
                <button
                  className="cgc-apply-btn"
                  onClick={() => {
                    if (!item.already_invited) {
                      handleAskToApply(item.candidate.id, item.job_profile?.id);
                    }
                  }}
                  disabled={item.already_invited}
                  title={item.already_invited ? 'Already invited this candidate' : 'Ask candidate to apply'}
                >
                  {item.already_invited ? '✓ Invited' : 'Ask to Apply'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Pagination */}
    {filteredShortlist.length > 0 && (
      <div className="cp-pagination-footer" style={{ marginTop: '28px', borderRadius: 12 }}>
        <span className="cp-pagination-info">
          Showing {(currentShortlistPage - 1) * SHORTLIST_PAGE_SIZE + 1}–{Math.min(currentShortlistPage * SHORTLIST_PAGE_SIZE, filteredShortlist.length)} of {filteredShortlist.length} candidates
        </span>
        <div className="cp-pagination-buttons">
          <button className="cp-pag-btn" disabled={currentShortlistPage === 1} onClick={() => setShortlistPage(p => p - 1)}>← Prev</button>
          {getShortlistPageNumbers().map((pn, i) =>
            pn === '...' ? (
              <span key={`e${i}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
            ) : (
              <button key={pn} className={`cp-pag-btn${currentShortlistPage === pn ? ' active' : ''}`} onClick={() => setShortlistPage(pn as number)}>{pn}</button>
            )
          )}
          <button className="cp-pag-btn" disabled={currentShortlistPage >= totalShortlistPages} onClick={() => setShortlistPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    )}

    {/* ── View Details Modal (Shortlist) ── */}
    {viewShortlistItem && (() => {
      const itm = viewShortlistItem;
      const c = itm.candidate;
      const jp = itm.job_profile;

      const skillsByCategory: Record<string, any[]> = {};
      (jp?.skills || []).forEach((sk: any) => {
        const cat = sk.skill_category || 'Other';
        if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
        skillsByCategory[cat].push(sk);
      });

      const socials: { label: string; url: string; icon: JSX.Element }[] = [];
      const addSocial = (label: string, url: string | undefined | null, icon: JSX.Element) => {
        if (url) socials.push({ label, url, icon });
      };
      // linkedin/github/portfolio are already merged profile→candidate server-side (merge_social_links),
      // so a candidate-side fallback here is dead; twitter/website were never part of this response.
      addSocial('LinkedIn', jp?.linkedin_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>);
      addSocial('GitHub', jp?.github_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>);
      addSocial('Portfolio', jp?.portfolio_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);

      // get_recruiter_shortlist never returns application_id; cross-reference by candidate + job posting instead.
      const matchedApplication = applications.find(
        (a) => a.candidate.id === c.id && a.job_posting.id === itm.job_posting?.id
      );

      return (
        <DetailDrawer onClose={() => setViewShortlistItem(null)} overlayClassName="vp-overlay" modalClassName="vp-modal">
            <div className="vp-header">
              <div className="vp-header-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="vp-header-info">
                <h2 className="vp-header-name">{c.name}</h2>
                <p className="vp-header-role">{jp?.profile_name || 'Candidate'} &middot; {jp?.job_role || ''} &middot; {itm.job_posting?.job_title || ''}</p>
              </div>
              <button className="vp-close" onClick={() => setViewShortlistItem(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="vp-body">
              {/* Summary */}
              {(jp?.profile_summary || c.profile_summary) && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Summary
                  </div>
                  <div className="vp-summary">{jp?.profile_summary || c.profile_summary}</div>
                </div>
              )}

              {/* Job Preferences */}
              {jp && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    Job Preferences
                  </div>
                  <div className="vp-grid">
                    <div className="vp-field"><span className="vp-field-label">Product Vendor</span><span className="vp-field-value">{jp.product_vendor || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Product Type</span><span className="vp-field-value">{jp.product_type || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Seniority</span><span className="vp-field-value">{jp.seniority_level || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Experience</span><span className="vp-field-value">{jp.years_of_experience} years</span></div>
                    <div className="vp-field"><span className="vp-field-label">Work Type</span><span className="vp-field-value">{jp.worktype}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Employment</span><span className="vp-field-value">{jp.employment_type}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Salary Range</span><span className="vp-field-value">${jp.salary_min?.toLocaleString()} – ${jp.salary_max?.toLocaleString()} {jp.salary_currency} {jp.pay_type ? `(${jp.pay_type})` : ''}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Negotiability</span><span className="vp-field-value">{jp.negotiability || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Visa Status</span><span className="vp-field-value">{jp.visa_status?.replace('_', ' ')}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Education</span><span className="vp-field-value">{jp.highest_education || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Notice Period</span><span className="vp-field-value">{jp.notice_period || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Availability</span><span className="vp-field-value">{jp.availability_date || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Travel</span><span className="vp-field-value">{jp.travel_willingness || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Shift</span><span className="vp-field-value">{jp.shift_preference || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Remote</span><span className="vp-field-value">{jp.remote_acceptance || <em className="vp-empty">—</em>}</span></div>
                    <div className="vp-field"><span className="vp-field-label">Relocation</span><span className="vp-field-value">{jp.relocation_willingness || <em className="vp-empty">—</em>}</span></div>
                  </div>
                </div>
              )}

              {/* Preferred Locations */}
              {jp?.location_preferences && jp.location_preferences.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Preferred Locations
                  </div>
                  <div className="vp-location-pills">
                    {jp.location_preferences.map((lp: any, i: number) => (
                      <span key={i} className="vp-location-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {lp.city}, {lp.state}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {jp?.skills && jp.skills.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Skills
                  </div>
                  {Object.entries(skillsByCategory).map(([cat, skills]) => (
                    <div key={cat}>
                      <div className="vp-skill-cat-label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                      <div className="vp-skills-wrap">
                        {skills.map((sk: any, i: number) => (
                          <span key={i} className="vp-skill-pill">
                            {sk.skill_name}
                            <span className="vp-skill-level">{sk.proficiency_level}/5</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Social Links */}
              {socials.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Social & Links
                  </div>
                  <div className="vp-social-row">
                    {socials.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="vp-social-link">
                        {s.icon}
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumes */}
              {c.resumes && c.resumes.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Resumes
                  </div>
                  {c.resumes.map((r: any) => (
                    <div key={r.id} className="vp-doc-card">
                      <div className="vp-doc-icon resume"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                      <div className="vp-doc-info">
                        <div className="vp-doc-name">{r.filename}</div>
                        {r.uploaded_at && <div className="vp-doc-meta">Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</div>}
                      </div>
                      <a href={`${API_BASE}/${r.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {c.certifications && c.certifications.length > 0 && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                    Certifications
                  </div>
                  {c.certifications.map((cert: any) => (
                    <div key={cert.id} className="vp-doc-card">
                      <div className="vp-doc-icon cert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
                      <div className="vp-doc-info">
                        <div className="vp-doc-name">{cert.name}</div>
                        <div className="vp-doc-meta">
                          {cert.issuer && <>{cert.issuer}</>}
                          {cert.issued_date && <> &middot; Issued {cert.issued_date}</>}
                          {cert.expiry_date && <> &middot; Expires {cert.expiry_date}</>}
                        </div>
                      </div>
                      {cert.filename && cert.storage_path && (
                        <a href={`${API_BASE}/${cert.storage_path}`} target="_blank" rel="noopener noreferrer" className="vp-doc-download" title="Download">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contact */}
              <div className="vp-section">
                <div className="vp-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Contact Information
                </div>
                <div className="vp-grid">
                  <div className="vp-field"><span className="vp-field-label">Email</span><span className="vp-field-value">{c.email}</span></div>
                  <div className="vp-field"><span className="vp-field-label">Phone</span><span className="vp-field-value">{c.phone}</span></div>
                  <div className="vp-field"><span className="vp-field-label">Location</span><span className="vp-field-value">{c.location_county ? `${c.location_county}, ` : ''}{c.location_state || <em className="vp-empty">—</em>}</span></div>
                </div>
              </div>

              {/* Shortlist Details */}
              {(itm.shortlisted_at || itm.job_posting) && (
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                    Shortlist Details
                  </div>
                  <div className="vp-grid">
                    {itm.shortlisted_at && (
                      <div className="vp-field">
                        <span className="vp-field-label">Shortlisted On</span>
                        <span className="vp-field-value">{new Date(itm.shortlisted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {itm.job_posting?.job_title && (
                      <div className="vp-field">
                        <span className="vp-field-label">For Position</span>
                        <span className="vp-field-value">{itm.job_posting.job_title}</span>
                      </div>
                    )}
                  </div>
                  {/* NOTE: notes is not part of the /recruiter/shortlist response — this "Recruiter
                      Notes" block has always been hidden. Flagging, not fixing: needs a backend change. */}
                  {itm.notes && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recruiter Notes</div>
                      <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{itm.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="vp-footer">
              <div className="vp-actions">
                <button
                  className="action-btn secondary"
                  onClick={() => { handleStartMessage(c.user_id || c.id); setViewShortlistItem(null); }}
                  title="Message this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
                {matchedApplication && (
                  <button
                    className="action-btn primary"
                    onClick={() => {
                      setSelectedAppForSchedule(matchedApplication);
                      setIsScheduleInterviewModalOpen(true);
                      setViewShortlistItem(null);
                    }}
                    title="Schedule an interview with this candidate"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Schedule Interview
                  </button>
                )}
                <button
                  className="action-btn secondary"
                  onClick={() => { setViewShortlistItem(null); }}
                >
                  Close
                </button>
              </div>
            </div>
        </DetailDrawer>
      );
    })()}
    </div>
  </>
  );
};

export default ShortlistTab;
