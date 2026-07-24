import React, { useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import { API_BASE } from '../../api/client';
import type { Application } from '../../types/application';
import type { RecruiterMatch } from '../../types/match';

export interface RecruiterMatchesTabProps {
  matches: RecruiterMatch[];
  applications: Application[];
  setActiveTab: (tab: string) => void;
  handleStartMessage: (candidateUserId: number) => Promise<void>;
  handleStartDirectMessage: (candidateUserId: number) => Promise<void>;
  setSelectedAppForSchedule: (app: any) => void;
  setIsScheduleInterviewModalOpen: (open: boolean) => void;
}

const RecruiterMatchesTab: React.FC<RecruiterMatchesTabProps> = ({
  matches,
  applications,
  setActiveTab,
  handleStartMessage,
  handleStartDirectMessage,
  setSelectedAppForSchedule,
  setIsScheduleInterviewModalOpen,
}) => {
  const [viewProfileMatch, setViewProfileMatch] = useState<RecruiterMatch | null>(null);
  const [matchesPage, setMatchesPage] = useState(1);
  const MATCHES_PAGE_SIZE = 9;

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
        <p className="empty-subtitle">Continue reviewing candidates. When both you and a candidate express mutual interest, matches will appear here.</p>
        <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary">
          View Recommendations
        </button>
      </div>
    );
  }

  const totalMatchesPages = Math.max(1, Math.ceil(matches.length / MATCHES_PAGE_SIZE));
  const currentMatchesPage = Math.min(matchesPage, totalMatchesPages);
  const paginatedMatches = matches.slice(
    (currentMatchesPage - 1) * MATCHES_PAGE_SIZE,
    currentMatchesPage * MATCHES_PAGE_SIZE
  );

  const getMatchesPageNumbers = (): (number | string)[] => {
    if (totalMatchesPages <= 7) return Array.from({ length: totalMatchesPages }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (currentMatchesPage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalMatchesPages); }
    else if (currentMatchesPage >= totalMatchesPages - 3) { pages.push(1, '...', totalMatchesPages - 4, totalMatchesPages - 3, totalMatchesPages - 2, totalMatchesPages - 1, totalMatchesPages); }
    else { pages.push(1, '...', currentMatchesPage - 1, currentMatchesPage, currentMatchesPage + 1, '...', totalMatchesPages); }
    return pages;
  };

  return (
    <>
    <div className="purple-section-wrapper">
    <style>{`
      @media (max-width: 1400px) {
        .recruiter-matches-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
      @media (max-width: 1200px) {
        .recruiter-matches-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 768px) {
        .recruiter-matches-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
    <div className="recruiter-matches-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      padding: '0'
    }}>
      {paginatedMatches.map((match, index) => {
        const candidateInitial = match.candidate.name?.charAt(0).toUpperCase() || 'C';
        const skills = match.job_profile?.skills || [];
        const isNew = Date.now() - new Date(match.matched_at).getTime() < 3 * 24 * 60 * 60 * 1000;
        const jp = match.job_profile as any;
        const salaryText = jp?.salary_min && jp?.salary_max
          ? `${(jp.salary_currency || 'USD').toUpperCase()} ${Math.round(jp.salary_min / 1000)}k–${Math.round(jp.salary_max / 1000)}k`
          : null;
        return (
          <div key={`match-${match.match_id}-${index}`} className="cgc-card">
            {/* No absolutely-positioned top-right badge here (unlike Browse/Shortlist),
                since the match ring sits in-flow inside the header row instead —
                cancel out .cgc-header's reserved padding-right for that badge. */}
            <div className="cgc-header" style={{ paddingRight: 0 }}>
              <div className="cgc-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                {candidateInitial}
              </div>
              <div className="cgc-name-block">
                <div className="cgc-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {match.candidate.name}
                  {isNew && <span className="cgc-status-pill" style={{ background: '#dbeafe', color: '#1d4ed8' }}>New</span>}
                </div>
                <div className="cgc-title">{match.job_profile?.job_role || match.job_profile?.profile_name || 'Professional'}</div>
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
                {match.job_profile?.years_of_experience ? (
                  <span className="cgc-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    {match.job_profile.years_of_experience} yrs
                  </span>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2563eb', fontWeight: 600, marginBottom: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 11-14h-7l1-8z"/></svg>
              Matched for <span style={{ color: '#111827' }}>{match.job_posting.job_title}</span>
            </div>

            {skills.length > 0 && (
              <div className="cgc-skills">
                {skills.slice(0, 4).map((sk: any, idx: number) => (
                  <span key={idx} className="cgc-skill-tag">{sk.skill_name}</span>
                ))}
                {skills.length > 4 && <span className="cgc-skill-tag">+{skills.length - 4} more</span>}
              </div>
            )}

            {/* No curated "achievement" tags (e.g. "React expert", "AWS certified") or
                candidate status (New/Liked/Viewed) exist in the matches API response —
                omitted rather than fabricated, except "New" above which is derived
                honestly from matched_at recency. */}
            <div className="cgc-footer">
              {salaryText && <span className="cgc-match-pill">{salaryText}</span>}
              <div className="cgc-footer-actions">
                <button
                  className="cgc-icon-btn"
                  onClick={() => {
                    if (match.candidate.user_id) {
                      handleStartDirectMessage(match.candidate.user_id);
                    } else {
                      alert('Cannot message this candidate: User ID not available');
                    }
                  }}
                  title="Send a message to this candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button
                  className="cgc-apply-btn"
                  onClick={() => setViewProfileMatch(match)}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

      {/* Pagination */}
      <div className="cp-pagination-footer" style={{ marginTop: '28px', borderRadius: 12 }}>
        <span className="cp-pagination-info">
          Showing {(currentMatchesPage - 1) * MATCHES_PAGE_SIZE + 1}–{Math.min(currentMatchesPage * MATCHES_PAGE_SIZE, matches.length)} of {matches.length} matches
        </span>
        <div className="cp-pagination-buttons">
          <button className="cp-pag-btn" disabled={currentMatchesPage === 1} onClick={() => setMatchesPage(p => p - 1)}>← Prev</button>
          {getMatchesPageNumbers().map((pn, i) =>
            pn === '...' ? (
              <span key={`e${i}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
            ) : (
              <button key={pn} className={`cp-pag-btn${currentMatchesPage === pn ? ' active' : ''}`} onClick={() => setMatchesPage(pn as number)}>{pn}</button>
            )
          )}
          <button className="cp-pag-btn" disabled={currentMatchesPage >= totalMatchesPages} onClick={() => setMatchesPage(p => p + 1)}>Next →</button>
        </div>
      </div>

      {/* ── View Profile Modal ── */}
      {viewProfileMatch && (() => {
        const m = viewProfileMatch;
        const c = m.candidate;
        const jp = m.job_profile;
        // get_recruiter_matches never returns application_id; cross-reference by candidate + job posting instead.
        const matchedApplication = applications.find(
          (a) => a.candidate.id === c.id && a.job_posting.id === m.job_posting.id
        );

        // Group skills by category
        const skillsByCategory: Record<string, any[]> = {};
        (jp.skills || []).forEach((sk: any) => {
          const cat = sk.skill_category || 'Other';
          if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
          skillsByCategory[cat].push(sk);
        });

        // Collect social links from both candidate and job_profile
        const socials: { label: string; url: string; icon: JSX.Element }[] = [];
        const addSocial = (label: string, url: string | undefined | null, icon: JSX.Element) => {
          if (url) socials.push({ label, url, icon });
        };
        // linkedin/github/portfolio are already merged profile→candidate server-side (merge_social_links),
        // so a candidate-side fallback here is dead; twitter/website were never part of this response.
        addSocial('LinkedIn', jp.linkedin_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>);
        addSocial('GitHub', jp.github_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>);
        addSocial('Portfolio', jp.portfolio_url, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);

        return (
          <DetailDrawer onClose={() => setViewProfileMatch(null)} overlayClassName="vp-overlay" modalClassName="vp-modal">
              {/* Header */}
              <div className="vp-header">
                <div className="vp-header-avatar">{c.name.charAt(0).toUpperCase()}</div>
                <div className="vp-header-info">
                  <h2 className="vp-header-name">{c.name}</h2>
                  <p className="vp-header-role">{jp.profile_name} &middot; {jp.job_role} &middot; {m.match_percentage}% Match</p>
                </div>
                <button className="vp-close" onClick={() => setViewProfileMatch(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="vp-body">
                {/* Summary */}
                {(jp.profile_summary || c.profile_summary) && (
                  <div className="vp-section">
                    <div className="vp-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Summary
                    </div>
                    <div className="vp-summary">{jp.profile_summary || c.profile_summary}</div>
                  </div>
                )}

                {/* Job Preferences */}
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

                {/* Preferred Locations */}
                {jp.location_preferences && jp.location_preferences.length > 0 && (
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
                {jp.skills && jp.skills.length > 0 && (
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

                {/* Contact Info */}
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

                {/* Match Details */}
                <div className="vp-section">
                  <div className="vp-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Match Details
                  </div>
                  <div style={{ padding: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{m.match_percentage}%</span>
                      <span style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: 500 }}>Mutual Match</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      You liked this candidate, and they liked your job posting — a mutual match!
                    </p>
                  </div>
                  {m.matched_at && (
                    <div className="vp-field">
                      <span className="vp-field-label">Matched On</span>
                      <span className="vp-field-value">{new Date(m.matched_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {m.job_posting?.job_title && (
                    <div className="vp-field" style={{ marginTop: '8px' }}>
                      <span className="vp-field-label">Matched For</span>
                      <span className="vp-field-value">{m.job_posting.job_title}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="vp-footer">
                <div className="vp-actions">
                  <button
                    className="action-btn secondary"
                    onClick={() => { handleStartMessage(c.user_id || c.id); setViewProfileMatch(null); }}
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
                        setViewProfileMatch(null);
                      }}
                      title="Schedule an interview"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Schedule Interview
                    </button>
                  )}
                  <button
                    className="action-btn secondary"
                    onClick={() => setViewProfileMatch(null)}
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

export default RecruiterMatchesTab;
