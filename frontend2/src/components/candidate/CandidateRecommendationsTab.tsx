import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import DetailDrawer from '../common/DetailDrawer';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useSwipeCarousel } from '../../hooks/useSwipeCarousel';
import {
  MatchBreakdownBars,
  TopSkillMatches,
  AIMatchReasonBox,
  WhyThisMatch,
  generateCandidateMatchReason,
  type MatchDetails,
} from '../MatchInsights';
import type { CandidateRecommendation } from '../../types/recommendation';
import type { Meeting } from '../../types/meeting';

// ── FilterPill: fully custom accessible dropdown ──────────────────────────────
interface FilterPillOption {
  value: string | number;
  label: string;
}
interface FilterPillProps {
  id: string;
  icon: React.ReactNode;
  options: FilterPillOption[];
  value: string | number;
  onChange: (val: string | number) => void;
  ariaLabel?: string;
}
const FilterPill: React.FC<FilterPillProps> = ({ id, icon, options, value, onChange, ariaLabel }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(o => o.value === value) ?? options[0];
  const isActive = value !== options[0]?.value;

  // Calculate menu position when opening
  React.useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 7,
        left: rect.left,
        width: Math.max(rect.width, 190)
      });
    }
  }, [open]);

  // Close on outside click
  useOutsideClick(open, () => setOpen(false), [containerRef, menuRef]);

  // Sync focused index to current value when opening
  React.useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value);
      setFocusedIdx(idx >= 0 ? idx : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll focused item into view
  React.useEffect(() => {
    if (open && menuRef.current && focusedIdx >= 0) {
      const item = menuRef.current.children[focusedIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if      (e.key === 'Escape')    { setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[focusedIdx].value);
      setOpen(false);
    }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  // Render dropdown menu
  const renderMenu = () => {
    if (!open) return null;

    return ReactDOM.createPortal(
      <ul
        ref={menuRef}
        className="rec-filter-menu"
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          minWidth: `${menuPosition.width}px`,
        }}
      >
        {options.map((opt, i) => (
          <li
            key={String(opt.value)}
            className={[
              'rec-filter-menu__option',
              opt.value === value ? 'rec-filter-menu__option--selected'  : '',
              i === focusedIdx    ? 'rec-filter-menu__option--focused'   : '',
            ].filter(Boolean).join(' ')}
            role="option"
            aria-selected={opt.value === value}
            onMouseEnter={() => setFocusedIdx(i)}
            onMouseDown={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
          >
            <span className="rec-filter-menu__option-text">{opt.label}</span>
            {opt.value === value && (
              <svg className="rec-filter-menu__checkmark" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            )}
          </li>
        ))}
      </ul>,
      document.body
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        id={id}
        className={[
          'rec-filter-pill',
          isActive ? 'rec-filter-pill--active' : '',
          open    ? 'rec-filter-pill--open'   : '',
        ].filter(Boolean).join(' ')}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className="rec-filter-pill__icon-wrap" aria-hidden="true">{icon}</span>
        <span className="rec-filter-pill__label">{selectedOption?.label}</span>
        <svg
          className={`rec-filter-pill__chevron${open ? ' rec-filter-pill__chevron--open' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </div>
      {renderMenu()}
    </>
  );
};

export interface CandidateRecommendationsTabProps {
  jobProfiles: any[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProfileId: number | null;
  setSelectedProfileId: (id: number | null) => void;
  recommendations: CandidateRecommendation[];
  loading: boolean;
  fetchRecommendations: () => Promise<void>;
  handleSwipePass: (jobPostingId: number) => void;
  handleSwipeLike: (jobPostingId: number) => void;
  handleApply: (jobPostingId: number) => void;
  applyingJobId: number | null;
  withdrawingJobId: number | null;
  allMeetings: Meeting[];
}

const CandidateRecommendationsTab: React.FC<CandidateRecommendationsTabProps> = ({
  jobProfiles,
  activeTab,
  setActiveTab,
  selectedProfileId,
  setSelectedProfileId,
  recommendations,
  loading,
  fetchRecommendations,
  handleSwipePass,
  handleSwipeLike,
  handleApply,
  applyingJobId,
  withdrawingJobId,
  allMeetings,
}) => {
  const navigate = useNavigate();
  const [recommendationsMatchFilter, setRecommendationsMatchFilter] = useState<string>('all');
  const [viewRecommendationJob, setViewRecommendationJob] = useState<CandidateRecommendation | null>(null);
  const [upcomingInterviewPage, setUpcomingInterviewPage] = useState(0);

  // Filter recommendations based on all criteria
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const matchPercentage = rec.match_percentage || 0;

      // Match score filter
      if (recommendationsMatchFilter !== 'all') {
        switch (recommendationsMatchFilter) {
          case '90+':
            if (matchPercentage < 90) return false;
            break;
          case '80-89':
            if (matchPercentage < 80 || matchPercentage >= 90) return false;
            break;
          case '70-79':
            if (matchPercentage < 70 || matchPercentage >= 80) return false;
            break;
          case '60-69':
            if (matchPercentage < 60 || matchPercentage >= 70) return false;
            break;
          case 'below-60':
            if (matchPercentage >= 60) return false;
            break;
        }
      }

      return true;
    });
  }, [recommendations, recommendationsMatchFilter]);

  const {
    index: recCardIndex,
    setIndex: setRecCardIndex,
    handleNext: handleNextRec,
    handlePrevious: handlePreviousRec,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useSwipeCarousel(filteredRecommendations.length, { enableArrowKeys: activeTab === 'recommendations' });

  // Reset card index when filter changes
  useEffect(() => {
    setRecCardIndex(0);
  }, [recommendationsMatchFilter]);

  // Reset card index when the selected job profile changes
  useEffect(() => {
    if (selectedProfileId) {
      setRecCardIndex(0);
    }
  }, [selectedProfileId]);

  // Helper to get company initial
  const getCompanyInitial = (companyName: string) => {
    return companyName ? companyName.charAt(0).toUpperCase() : 'C';
  };

  // Helper to get skill tags (posting skills for display)
  const getSkillTags = (rec: any) => {
    const skills = rec.job_posting?.posting_skills || [];
    return skills.slice(0, 6).map((sk: any) => sk.skill_name);
  };


  if (jobProfiles.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Create your job preferences</h3>
        <p className="mt-2 text-sm text-gray-500">Define your role, location, and compensation preferences to receive personalized job recommendations.</p>
        <div className="mt-6 space-x-3">
          <button
            onClick={() => navigate('/candidate/job-preferences')}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Job Preferences
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Header - matches recruiter dashboard layout ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0, marginBottom: '4px' }}>
              AI Job Recommendations
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Curated roles matched to your profile by our AI engine • Updated live
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterPill
              id="rec-match-filter-header"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z"/>
                </svg>
              }
              options={[
                { value: 'all', label: 'All Matches' },
                { value: '90+', label: '90%+ Match' },
                { value: '80-89', label: '80-89% Match' },
                { value: '70-79', label: '70-79% Match' },
                { value: '60-69', label: '60-69% Match' },
                { value: 'below-60', label: 'Below 60%' }
              ]}
              value={recommendationsMatchFilter}
              onChange={(val) => setRecommendationsMatchFilter(val as string)}
              ariaLabel="Filter by match score"
            />
            <button className="talentgraph-btn-secondary" onClick={() => fetchRecommendations()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh
            </button>
            <button
              onClick={() => navigate('/candidate/job-preferences')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: 'white', border: '1px solid #D1D5DB', color: '#374151', cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Manage Preferences
            </button>
          </div>
        </div>
        {/* Profile Selector */}
        <select
          className="job-select-modern"
          style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
          value={selectedProfileId || ''}
          onChange={(e) => setSelectedProfileId(parseInt(e.target.value))}
        >
          <option value="" disabled>Choose a job preference profile...</option>
          {jobProfiles.map((profile: any) => (
            <option key={profile.id} value={profile.id}>
              {profile.profile_name}
              {profile.product_vendor ? ` • ${profile.product_vendor}` : ''}
              {profile.product_type ? ` — ${profile.product_type}` : ''}
              {profile.worktype ? ` • ${typeof profile.worktype === 'object' ? profile.worktype.value ?? profile.worktype : profile.worktype}` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading recommendations...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No recommendations yet</h3>
          <p className="mt-2 text-sm text-gray-500">We're analyzing your profile to find the best matching opportunities. Check back soon.</p>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No matches for this filter</h3>
          <p className="mt-2 text-sm text-gray-500">Try adjusting your match score filter to see more recommendations.</p>
          <button
            onClick={() => setRecommendationsMatchFilter('all')}
            className="mt-4 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <>
          <div className="ai-recommendations-container">
          {/* Left Column - Main Content */}
          <div className="ai-recs-main">
            {/* Job Card */}
            {(() => {
              const rec = filteredRecommendations[recCardIndex];
              if (!rec) return null;

              const jobPosting = rec.job_posting;
              const companyName = jobPosting.company_name || 'Company';
              const matchPercentage = rec.match_percentage || 0;
              const skillTags = getSkillTags(rec);
              const selectedProfile = jobProfiles.find((p: any) => p.id === selectedProfileId);

              // Build display match details — use real scores when available, else estimate from overall %
              const rawDetails = rec.match_details || {};
              const hasRealBreakdown = (rawDetails.product_match || 0) + (rawDetails.skills_match || 0) +
                (rawDetails.experience_match || 0) + (rawDetails.salary_match || 0) + (rawDetails.location_match || 0) > 0;
              // Only include a category in the fallback if the job actually has that data
              const jobHasSalary = (rec.job_posting?.salary_max || 0) > 0;
              const jobHasProduct = !!(rec.job_posting?.product_vendor);
              const displayDetails: MatchDetails = hasRealBreakdown
                ? rawDetails as MatchDetails
                : {
                    product_match: jobHasProduct ? Math.round(matchPercentage * 0.40) : 0,
                    skills_match: Math.round(matchPercentage * 0.30),
                    experience_match: Math.round(matchPercentage * 0.15),
                    salary_match: jobHasSalary ? Math.round(matchPercentage * 0.10) : 0,
                    location_match: Math.round(matchPercentage * 0.05),
                    matched_skills: rawDetails.matched_skills || [],
                  };

              // Log match details for debugging
              return (
                <div
                  className="ai-job-card"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Match Badge */}
                  <div className="ai-match-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {matchPercentage}% Match
                  </div>

                  {/* Company Header */}
                  <div className="ai-job-card-header">
                    <div className="ai-company-logo">
                      {getCompanyInitial(companyName)}
                    </div>
                    <div className="ai-company-info">
                      <div className="ai-company-name">{companyName}</div>
                      <div className="ai-company-verified">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Verified company
                      </div>
                    </div>
                  </div>

                  {/* Job Title */}
                  <h3 className="ai-job-title">{jobPosting.job_title}</h3>
                  {/* NOTE: job_role was never part of the /candidate/recommendations response —
                      this has always rendered the literal fallback below. Flagging, not fixing:
                      deciding what should actually show here is a product call, not a type fix. */}
                  <p className="ai-job-team">Design Systems Team</p>

                  {/* Job Details Grid */}
                  <div className="ai-job-details">
                    <div className="ai-job-detail">
                      <div className="ai-job-detail-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        Salary
                      </div>
                      <div className="ai-job-detail-value">
                        {jobPosting.salary_min && jobPosting.salary_max
                          ? `$${Math.floor(jobPosting.salary_min / 1000)}k-${Math.floor(jobPosting.salary_max / 1000)}k`
                          : 'Not disclosed'}
                      </div>
                    </div>
                    <div className="ai-job-detail">
                      <div className="ai-job-detail-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                        Type
                      </div>
                      <div className="ai-job-detail-value">{jobPosting.employment_type || 'Full-time'}</div>
                    </div>
                    <div className="ai-job-detail">
                      <div className="ai-job-detail-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Location
                      </div>
                      <div className="ai-job-detail-value">{jobPosting.worktype || jobPosting.location || 'Remote'}</div>
                    </div>
                  </div>

                  {/* AI Match Reason + Match Breakdown */}
                  <div className="ai-match-reason">
                    <AIMatchReasonBox
                      variant="candidate"
                      reason={generateCandidateMatchReason(
                        displayDetails,
                        {
                          productVendor: rec.job_posting?.product_vendor,
                          topSkill: displayDetails.matched_skills?.[0],
                          jobTitle: jobPosting.job_title,
                          yearsExp: selectedProfile?.years_of_experience,
                        }
                      )}
                    />
                    {/* Match Score Breakdown */}
                    <div style={{ marginTop: '12px' }}>
                      <MatchBreakdownBars details={displayDetails} compact />
                    </div>
                  </div>

                  {/* Top Matched Skills */}
                  {((displayDetails.matched_skills?.length ?? 0) > 0 || skillTags.length > 0) && (
                    <div style={{ marginBottom: '12px' }}>
                      <TopSkillMatches
                        matchedSkills={
                          (displayDetails.matched_skills?.length ?? 0) > 0
                            ? displayDetails.matched_skills!
                            : skillTags
                        }
                        maxSkills={6}
                      />
                    </div>
                  )}

                  {/* Why this match? */}
                  {(() => {
                    const drivers: string[] = [];
                    const matchedSkill = displayDetails.matched_skills?.[0];
                    if (matchedSkill) drivers.push(`Skill match: ${matchedSkill}`);
                    const vendor = rec.job_posting?.product_vendor;
                    if (vendor && (displayDetails.product_match ?? 0) > 0) drivers.push(`Product expertise: ${vendor}`);
                    const yoe = selectedProfile?.years_of_experience;
                    if (yoe && yoe >= 1) drivers.push(`${yoe}+ years of experience`);
                    if ((displayDetails.salary_match ?? 0) > 0 && drivers.length < 3) drivers.push('Salary range aligned');
                    if ((displayDetails.location_match ?? 0) > 0 && drivers.length < 3) drivers.push('Location preference matched');
                    return <WhyThisMatch drivers={drivers} />;
                  })()}

                  {/* Skill Tags */}
                  <div className="ai-skill-tags">
                    {skillTags.map((skill: string, idx: number) => (
                      <span key={idx} className="ai-skill-tag">{skill}</span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="ai-action-buttons">
                    <button
                      className="ai-action-btn pass"
                      onClick={() => handleSwipePass(jobPosting.id)}
                      disabled={rec.already_swiped && rec.swipe_action === 'pass'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                      {rec.already_swiped && rec.swipe_action === 'pass' ? 'Passed' : 'Pass'}
                    </button>
                    <button
                      className="ai-action-btn save"
                      onClick={() => handleSwipeLike(jobPosting.id)}
                      disabled={rec.already_swiped && rec.swipe_action === 'like'}
                    >
                      <svg viewBox="0 0 24 24" fill={rec.already_swiped && rec.swipe_action === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {rec.already_swiped && rec.swipe_action === 'like' ? 'Liked' : 'Like'}
                    </button>
                    <button
                      className="ai-action-btn apply"
                      onClick={() => handleApply(jobPosting.id)}
                      disabled={rec.already_applied || applyingJobId === jobPosting.id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {rec.already_applied ? 'Applied' : (applyingJobId === jobPosting.id ? 'Applying...' : 'Apply')}
                    </button>
                    <button
                      className="ai-action-btn view-details"
                      onClick={() => setViewRecommendationJob(rec)}
                    >
                      View Details
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Pagination with Navigation Arrows */}
            <div className="ai-pagination">
              <button
                className="ai-pagination-arrow ai-pagination-arrow-left"
                onClick={handlePreviousRec}
                disabled={recCardIndex === 0}
                aria-label="Previous recommendation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>

              <div className="ai-pagination-content">
                <div className="ai-pagination-dots">
                  {filteredRecommendations.map((_, idx) => (
                    <div
                      key={idx}
                      className={`ai-pagination-dot ${idx === recCardIndex ? 'active' : ''}`}
                      onClick={() => setRecCardIndex(idx)}
                      role="button"
                      aria-label={`Go to recommendation ${idx + 1}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRecCardIndex(idx);
                        }
                      }}
                    />
                  ))}
                </div>
                <span className="ai-pagination-text">{recCardIndex + 1} of {filteredRecommendations.length}</span>
              </div>

              <button
                className="ai-pagination-arrow ai-pagination-arrow-right"
                onClick={handleNextRec}
                disabled={recCardIndex === filteredRecommendations.length - 1}
                aria-label="Next recommendation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="ai-recs-sidebar">
            {/* Profile Completion Card */}
            <div className="ai-profile-completion-card">
              <div className="ai-profile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="ai-profile-title">Profile Completion</span>
                </div>
              </div>
              <p className="ai-profile-subtitle">
                Add your portfolio link and 2 case studies to boost match accuracy by up to 12%.
              </p>
              <button className="ai-profile-cta" onClick={() => navigate('/candidate/profile')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Complete Profile
              </button>
            </div>

            {/* Upcoming Interviews Card */}
            {(() => {
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const weekStart = new Date(todayStart);
              weekStart.setDate(todayStart.getDate() - todayStart.getDay());
              const upcomingList = allMeetings
                .filter((m: any) => m.scheduled_start && new Date(m.scheduled_start) >= todayStart && m.status !== 'cancelled')
                .sort((a: any, b: any) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
              const UPCOMING_PAGE_SIZE = 2;
              const totalUpcomingPages = Math.ceil(upcomingList.length / UPCOMING_PAGE_SIZE);
              const safeUpcomingPage = upcomingList.length === 0 ? 0 : Math.min(upcomingInterviewPage, totalUpcomingPages - 1);
              const upcomingPageItems = upcomingList.slice(safeUpcomingPage * UPCOMING_PAGE_SIZE, safeUpcomingPage * UPCOMING_PAGE_SIZE + UPCOMING_PAGE_SIZE);
              const pastList = allMeetings
                .filter((m: any) => m.scheduled_start && new Date(m.scheduled_start) < todayStart)
                .sort((a: any, b: any) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
                .slice(0, 3);
              const pastThisWeek = allMeetings.filter((m: any) => {
                const d = m.scheduled_start ? new Date(m.scheduled_start) : null;
                return d && d >= weekStart && d < todayStart;
              }).length;
              const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const statusColor: Record<string, string> = { scheduled: '#10B981', completed: '#6B7280', cancelled: '#EF4444', rescheduled: '#F59E0B' };
              const avatarBg = ['#2563eb', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];
              const getMeetingTypeLabel = (m: any): string => {
                if (m.video_provider) {
                  const p = m.video_provider.toLowerCase();
                  if (p === 'zoom') return 'Zoom';
                  if (p === 'teams' || p === 'microsoft_teams') return 'Teams';
                  if (p === 'meet' || p === 'google_meet') return 'Meet';
                  return m.video_provider.charAt(0).toUpperCase() + m.video_provider.slice(1);
                }
                if (m.video_meeting_url) {
                  if (m.video_meeting_url.includes('zoom.us')) return 'Zoom';
                  if (m.video_meeting_url.includes('meet.google')) return 'Meet';
                  if (m.video_meeting_url.includes('teams.microsoft')) return 'Teams';
                  return 'Video';
                }
                if (m.location && m.location !== 'Virtual') return m.location;
                return 'Video';
              };
              const getInitials = (name: string) =>
                name ? name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
              const renderCard = (m: any, dimmed: boolean) => (
                <div key={m.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', opacity: dimmed ? 0.75 : 1, boxShadow: dimmed ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: '1.35', flex: 1 }}>{m.title || 'Interview'}</span>
                    <span style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋮</span>
                  </div>
                  {m.description && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', lineHeight: '1.3' }}>{m.description}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '9px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {fmtDate(m.scheduled_start)}
                    </span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {fmtTime(m.scheduled_start)}
                    </span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#6B7280' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      {getMeetingTypeLabel(m)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor[m.status] || '#6B7280', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor[m.status] || '#6B7280', textTransform: 'capitalize' as const }}>{m.status}</span>
                    </div>
                    {m.participants && m.participants.length > 0 && (
                      <div style={{ display: 'flex' }}>
                        {m.participants.slice(0, 3).map((p: any, pi: number) => (
                          <div key={pi} title={p.participant_name || p.name || ''} style={{ width: '24px', height: '24px', borderRadius: '50%', background: avatarBg[pi % avatarBg.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', border: '2px solid white', marginLeft: pi > 0 ? '-6px' : '0' }}>
                            {getInitials(p.participant_name || p.name || p.full_name || '?')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
              return (
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Upcoming Interviews</span>
                    </div>
                    <button onClick={() => setActiveTab('meetings')} style={{ fontSize: '12px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View All →</button>
                  </div>
                  {upcomingList.length === 0 && pastList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: '13px' }}>No upcoming interviews scheduled</div>
                  )}
                  {upcomingPageItems.map((m: any) => renderCard(m, false))}
                  {/* Pagination footer — only shown when there are more than 2 upcoming interviews */}
                  {totalUpcomingPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '6px 0 2px 0' }}>
                      <button
                        onClick={() => setUpcomingInterviewPage(p => Math.max(0, p - 1))}
                        disabled={safeUpcomingPage === 0}
                        style={{ background: 'none', border: 'none', cursor: safeUpcomingPage === 0 ? 'default' : 'pointer', color: safeUpcomingPage === 0 ? '#D1D5DB' : '#6B7280', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}
                        aria-label="Previous"
                      >‹</button>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {Array.from({ length: totalUpcomingPages }, (_, i) => (
                          <span
                            key={i}
                            onClick={() => setUpcomingInterviewPage(i)}
                            style={{ width: i === safeUpcomingPage ? 18 : 6, height: 6, borderRadius: 3, background: i === safeUpcomingPage ? '#2563eb' : '#D1D5DB', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-block' }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setUpcomingInterviewPage(p => Math.min(totalUpcomingPages - 1, p + 1))}
                        disabled={safeUpcomingPage === totalUpcomingPages - 1}
                        style={{ background: 'none', border: 'none', cursor: safeUpcomingPage === totalUpcomingPages - 1 ? 'default' : 'pointer', color: safeUpcomingPage === totalUpcomingPages - 1 ? '#D1D5DB' : '#6B7280', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}
                        aria-label="Next"
                      >›</button>
                    </div>
                  )}
                  {pastList.length > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 10px 0' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Recent Past</span>
                        {pastThisWeek > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '10px' }}>{pastThisWeek} this week</span>
                        )}
                      </div>
                      {pastList.map((m: any) => renderCard(m, true))}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Pro Tip Card */}
            <div className="ai-pro-tip-card">
              <div className="ai-pro-tip-header">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span className="ai-pro-tip-title">Pro Tip</span>
              </div>
              <p className="ai-pro-tip-text">
                Swipe right on roles you love. Our AI learns from every interaction to improve your matches.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendation Job Detail Drawer */}
        {viewRecommendationJob && (
        <DetailDrawer onClose={() => setViewRecommendationJob(null)}>
          <div className="cal-drawer-header">
            <div className="cal-drawer-header-info">
              <h2 className="cal-drawer-title">{viewRecommendationJob.job_posting.job_title}</h2>
              <div className="cal-drawer-subtitle">
                {viewRecommendationJob.job_posting.company_name || 'Company'}
                {/* NOTE: job_role is not part of the /candidate/recommendations response — this
                    suffix has always been silently omitted. Flagging, not fixing: needs a backend change. */}
                {(viewRecommendationJob.job_posting as any).job_role ? ` · ${(viewRecommendationJob.job_posting as any).job_role}` : ''}
              </div>
            </div>
            <button className="cal-drawer-close" onClick={() => setViewRecommendationJob(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="cal-drawer-body">
            {/* Product/Vendor Section */}
            {(viewRecommendationJob.job_posting.product_vendor || viewRecommendationJob.job_posting.product_type) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  Product & Technology
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewRecommendationJob.job_posting.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product/Vendor</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_vendor}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product Type</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_type}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting as any).job_category && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Category</span>
                      <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).job_category}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Match Score Section */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                AI Match Analysis
              </div>

              {/* Overall score row */}
              <div className="cal-drawer-field" style={{ marginBottom: '12px' }}>
                <span className="cal-drawer-field-label">Overall Match</span>
                <span className="cal-drawer-field-value" style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '18px' }}>{viewRecommendationJob.match_percentage}%</span>
              </div>

              {(() => {
                const drawerMatchPct = viewRecommendationJob.match_percentage || 0;
                const drawerRaw = viewRecommendationJob.match_details || {};
                const drawerHasReal = (drawerRaw.product_match || 0) + (drawerRaw.skills_match || 0) +
                  (drawerRaw.experience_match || 0) + (drawerRaw.salary_match || 0) + (drawerRaw.location_match || 0) > 0;
                const drawerHasSalary = (viewRecommendationJob.job_posting?.salary_max || 0) > 0;
                const drawerHasProduct = !!(viewRecommendationJob.job_posting?.product_vendor);
                const drawerDetails: MatchDetails = drawerHasReal
                  ? drawerRaw as MatchDetails
                  : {
                      product_match: drawerHasProduct ? Math.round(drawerMatchPct * 0.40) : 0,
                      skills_match: Math.round(drawerMatchPct * 0.30),
                      experience_match: Math.round(drawerMatchPct * 0.15),
                      salary_match: drawerHasSalary ? Math.round(drawerMatchPct * 0.10) : 0,
                      location_match: Math.round(drawerMatchPct * 0.05),
                      matched_skills: drawerRaw.matched_skills || [],
                    };
                return (
                  <>
                    {/* AI Match Reason */}
                    <AIMatchReasonBox
                      variant="candidate"
                      reason={generateCandidateMatchReason(
                        drawerDetails,
                        {
                          productVendor: viewRecommendationJob.job_posting?.product_vendor,
                          topSkill: drawerDetails.matched_skills?.[0],
                          jobTitle: viewRecommendationJob.job_posting?.job_title,
                          yearsExp: jobProfiles.find((p: any) => p.id === selectedProfileId)?.years_of_experience,
                        }
                      )}
                    />

                    {/* Breakdown bars */}
                    <div style={{ marginTop: '14px' }}>
                      <MatchBreakdownBars details={drawerDetails} />
                    </div>

                    {/* Top Matched Skills */}
                    {(drawerDetails.matched_skills?.length ?? 0) > 0 && (
                      <div style={{ marginTop: '14px' }}>
                        <TopSkillMatches matchedSkills={drawerDetails.matched_skills!} maxSkills={8} />
                      </div>
                    )}

                    {/* Why this match? */}
                    {(() => {
                      const drivers: string[] = [];
                      const matchedSkill = drawerDetails.matched_skills?.[0];
                      if (matchedSkill) drivers.push(`Skill match: ${matchedSkill}`);
                      const vendor = viewRecommendationJob.job_posting?.product_vendor;
                      if (vendor && (drawerDetails.product_match ?? 0) > 0) drivers.push(`Product expertise: ${vendor}`);
                      const yoe = jobProfiles.find((p: any) => p.id === selectedProfileId)?.years_of_experience;
                      if (yoe && yoe >= 1) drivers.push(`${yoe}+ years of experience`);
                      if ((drawerDetails.salary_match ?? 0) > 0 && drivers.length < 3) drivers.push('Salary range aligned');
                      if ((drawerDetails.location_match ?? 0) > 0 && drivers.length < 3) drivers.push('Location preference matched');
                      return <WhyThisMatch drivers={drivers} />;
                    })()}
                  </>
                );
              })()}
            </div>

            {/* Compensation Section */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Compensation
              </div>
              <div className="cal-drawer-meta-grid">
                <div className="cal-drawer-field">
                  <span className="cal-drawer-field-label">Salary Range</span>
                  <span className="cal-drawer-field-value">
                    ${viewRecommendationJob.job_posting.salary_min ? Math.floor(viewRecommendationJob.job_posting.salary_min / 1000) : '?'}k -
                    ${viewRecommendationJob.job_posting.salary_max ? Math.floor(viewRecommendationJob.job_posting.salary_max / 1000) : '?'}k
                    {viewRecommendationJob.job_posting.salary_currency && ` ${viewRecommendationJob.job_posting.salary_currency.toUpperCase()}`}
                  </span>
                </div>
                {(viewRecommendationJob.job_posting as any).pay_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Pay Type</span>
                    <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).pay_type === 'hourly' ? 'Hourly' : 'Annually'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Job Overview Section */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                Position Details
              </div>
              <div className="cal-drawer-meta-grid">
                {viewRecommendationJob.job_posting.location && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Location</span>
                    <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.location}</span>
                  </div>
                )}
                {viewRecommendationJob.job_posting.worktype && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Work Type</span>
                    <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.worktype}</span>
                  </div>
                )}
                {viewRecommendationJob.job_posting.employment_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Employment</span>
                    <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.employment_type.toUpperCase()}</span>
                  </div>
                )}
                {viewRecommendationJob.job_posting.seniority_level && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Seniority</span>
                    <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.seniority_level}</span>
                  </div>
                )}
                {(viewRecommendationJob.job_posting as any).start_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Start Date</span>
                    <span className="cal-drawer-field-value">{new Date((viewRecommendationJob.job_posting as any).start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {(viewRecommendationJob.job_posting as any).end_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Apply By</span>
                    <span className="cal-drawer-field-value">{new Date((viewRecommendationJob.job_posting as any).end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {viewRecommendationJob.job_posting.job_description && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  Description
                </div>
                <div className="cal-drawer-description">{viewRecommendationJob.job_posting.job_description}</div>
              </div>
            )}

            {/* NOTE: posting_skills is not part of the /candidate/recommendations response —
                this section has always been hidden. Flagging, not fixing: needs a backend change. */}
            {(viewRecommendationJob.job_posting as any).posting_skills && (viewRecommendationJob.job_posting as any).posting_skills.length > 0 && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Required Skills
                </div>
                <div className="cal-drawer-skills">
                  {(viewRecommendationJob.job_posting as any).posting_skills.map((sk: any, i: number) => (
                    <span key={i} className="cal-drawer-skill">
                      {sk.skill_name}
                      {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {((viewRecommendationJob.job_posting as any).education_qualifications || (viewRecommendationJob.job_posting as any).certifications_required || (viewRecommendationJob.job_posting as any).travel_requirements || (viewRecommendationJob.job_posting as any).visa_info) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  Requirements
                </div>
                <div className="cal-drawer-meta-grid">
                  {(viewRecommendationJob.job_posting as any).education_qualifications && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Education</span>
                      <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).education_qualifications}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting as any).certifications_required && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Certifications</span>
                      <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).certifications_required}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting as any).travel_requirements && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Travel</span>
                      <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).travel_requirements}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting as any).visa_info && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Visa</span>
                      <span className="cal-drawer-field-value">{(viewRecommendationJob.job_posting as any).visa_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="cal-drawer-footer">
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                className={`cal-btn ${viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'pass' ? 'cal-btn-done-pass' : 'cal-btn-secondary'}`}
                onClick={() => {
                  handleSwipePass(viewRecommendationJob.job_posting.id);
                  setViewRecommendationJob(null);
                }}
                style={{ flex: 1 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                {viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'pass' ? 'Passed ✓' : 'Pass'}
              </button>
              <button
                className="cal-btn cal-btn-primary"
                onClick={() => {
                  handleSwipeLike(viewRecommendationJob.job_posting.id);
                  setViewRecommendationJob(null);
                }}
                style={{ flex: 1, ...(viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? { opacity: 0.8 } : {}) }}
              >
                <svg viewBox="0 0 24 24" fill={viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {viewRecommendationJob.already_swiped && viewRecommendationJob.swipe_action === 'like' ? 'Liked ✓' : 'Like'}
              </button>
              <button
                className="cal-btn cal-btn-primary"
                onClick={() => {
                  handleApply(viewRecommendationJob.job_posting.id);
                  setViewRecommendationJob(null);
                }}
                style={{ flex: 1, background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}
                disabled={applyingJobId === viewRecommendationJob.job_posting.id || withdrawingJobId === viewRecommendationJob.job_posting.id}
              >
                {viewRecommendationJob.already_applied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                )}
                {withdrawingJobId === viewRecommendationJob.job_posting.id
                  ? 'Withdrawing...'
                  : viewRecommendationJob.already_applied
                    ? 'Applied ✓'
                    : (applyingJobId === viewRecommendationJob.job_posting.id ? 'Applying...' : 'Apply Now')
                }
              </button>
            </div>
          </div>
        </DetailDrawer>
        )}
        </>
      )}
    </>
  );
};

export default CandidateRecommendationsTab;
