import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DetailDrawer from '../common/DetailDrawer';
import { useSwipeCarousel } from '../../hooks/useSwipeCarousel';
import {
  MatchBreakdownBars,
  TopSkillMatches,
  AIMatchReasonBox,
  WhyThisMatch,
  generateRecruiterMatchReason,
  type MatchDetails,
} from '../MatchInsights';
import type { JobPosting } from '../../types/jobPosting';
import type { Application } from '../../types/application';
import type { Meeting } from '../../types/meeting';

export interface RecruiterRecommendationsTabProps {
  jobPostings: JobPosting[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedJobId: number | null;
  setSelectedJobId: (id: number | null) => void;
  loading: boolean;
  recommendations: any;
  applications: Application[];
  setAppStatusFilter: (status: string) => void;
  allMeetings: Meeting[];
  handleRecruiterLike: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleRecruiterPass: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleAskToApply: (candidateId: number, jobProfileId: number) => Promise<void>;
  handleStartMessage: (candidateUserId: number) => Promise<void>;
}

const RecruiterRecommendationsTab: React.FC<RecruiterRecommendationsTabProps> = ({
  jobPostings,
  activeTab,
  setActiveTab,
  selectedJobId,
  setSelectedJobId,
  loading,
  recommendations,
  applications,
  setAppStatusFilter,
  allMeetings,
  handleRecruiterLike,
  handleRecruiterPass,
  handleAskToApply,
  handleStartMessage,
}) => {
  const navigate = useNavigate();
  const [recommendationRoleFilter] = useState<string>('all');
  const [recommendationQuickFilter] = useState<'all' | 'top_picks' | 'recently_active' | 'open_to_offers'>('all');
  const [recommendationWorkTypeFilter, setRecommendationWorkTypeFilter] = useState<string>('all');
  const [viewRecommendationProfile, setViewRecommendationProfile] = useState<any | null>(null);
  const [interviewCardIndex, setInterviewCardIndex] = useState(0);

  // Recommendations visible after role + quick + work-type filters — the single
  // source of truth for both the rendered list and card-navigation bounds.
  const visibleRecommendations = useMemo(() => {
    if (!recommendations?.recommendations) return [];
    let visible = recommendationRoleFilter === 'all'
      ? recommendations.recommendations
      : recommendations.recommendations.filter((r: any) => {
          const role =
            (r.job_profile?.job_role as string | undefined) ||
            (r.job_posting?.job_title as string | undefined) ||
            (r.role as string | undefined) ||
            '';
          return role === recommendationRoleFilter;
        });
    if (recommendationQuickFilter === 'top_picks') {
      visible = visible.filter((r: any) => (r.match_percentage || 0) >= 80);
    } else if (recommendationQuickFilter === 'recently_active') {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      visible = visible.filter((r: any) => r.candidate.created_at && new Date(r.candidate.created_at) >= cutoff);
    } else if (recommendationQuickFilter === 'open_to_offers') {
      visible = visible.filter((r: any) =>
        r.job_profile?.worktype === 'Remote' || r.job_profile?.employment_type === 'Full-time'
      );
    }
    if (recommendationWorkTypeFilter !== 'all') {
      visible = visible.filter((r: any) =>
        (r.job_profile?.worktype || '').toLowerCase() === recommendationWorkTypeFilter.toLowerCase()
      );
    }
    return visible;
  }, [recommendations, recommendationRoleFilter, recommendationQuickFilter, recommendationWorkTypeFilter]);

  const {
    index: recCardIndex,
    setIndex: setRecCardIndex,
    handleNext: handleNextRec,
    handlePrevious: handlePreviousRec,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useSwipeCarousel(visibleRecommendations.length, { enableArrowKeys: activeTab === 'recommendations' });

  // Reset card index when the selected job posting changes
  useEffect(() => {
    if (selectedJobId) {
      setRecCardIndex(0);
    }
  }, [selectedJobId]);

  // Helper functions for recommendations
  const getCandidateInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'C';
  };

  const getMatchedSkills = (rec: any) => {
    // Prefer API-provided matched_skills from match_details
    if (rec.match_details?.matched_skills?.length > 0) {
      return rec.match_details.matched_skills.slice(0, 6).map((name: string) => ({ name, level: 3 }));
    }
    // Fall back to candidate job_profile skills
    const skills = rec.job_profile?.skills || [];
    return skills.slice(0, 4).map((sk: any) => ({
      name: sk.skill_name,
      level: sk.proficiency_level || 3
    }));
  };

  if (jobPostings.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon-professional">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <h3 className="empty-title">No Job Postings Yet</h3>
        <p className="empty-subtitle">
          Create your first job posting to start receiving candidate recommendations and applications.
        </p>
        <div className="empty-actions">
          <button onClick={() => { navigate('/recruiter/job-postings'); }} className="btn-primary">
            Create Job Posting
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading recommendations...</div>;
  }

  if (!recommendations) {
    return <div className="loading">Select a job posting...</div>;
  }

  // Calculate metrics for KPI cards
  const newToday = recommendations.recommendations.filter((r: any) => {
    if (!r.candidate.created_at) return false;
    const createdDate = new Date(r.candidate.created_at);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  const visibleRecs = visibleRecommendations;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '16px', padding: '16px 20px 0 20px' }}>
        <div className="ai-recs-header-row">
          <div className="ai-recs-header-title">
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: 0, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Candidate Recommendations
              {newToday > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {newToday} new
                </span>
              )}
            </h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Top candidates matched to: Sr. Product Designer - Stripe • Updated 12 min ago
            </p>
          </div>

          <div className="ai-recs-header-filters">
            {/* Job Selector */}
            <select
              className="job-select-modern"
              style={{ padding: '7px 12px', fontSize: '13px' }}
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(parseInt(e.target.value))}
            >
              <option value="" disabled>Choose a position...</option>
              {jobPostings.map(job => (
                <option key={job.id} value={job.id}>
                  {job.job_title} • {job.location || 'Remote'}
                  {(job.status || '').toLowerCase() === 'reposted' ? ' [REOPENED]' : ''}
                </option>
              ))}
            </select>

            {/* Work Type Filter */}
            <select
              value={recommendationWorkTypeFilter}
              onChange={(e) => setRecommendationWorkTypeFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'white',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              <option value="all">All Work Types</option>
              <option value="Remote">Remote</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Swipe Card + Sidebar */}
      <div className="ai-recommendations-container">
        {/* Left Column - Swipe Card */}
        <div className="ai-recs-main">
          {visibleRecs.length === 0 ? (
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
                No matching candidates found for this job posting yet. Check back later as new candidates join the platform.
              </p>
            </div>
          ) : (
            <>
              {/* Single Card View */}
              {(() => {
                const rec = visibleRecs[recCardIndex];
                if (!rec) return null;

                const candidate = rec.candidate;
                const jobProfile = rec.job_profile;
                const matchPercentage = rec.match_percentage || 0;
                const matchedSkills = getMatchedSkills(rec);

                // Build display match details — use real scores when available, else estimate from overall %
                const rawDetails = rec.match_details || {};
                const hasRealBreakdown = (rawDetails.product_match || 0) + (rawDetails.skills_match || 0) +
                  (rawDetails.experience_match || 0) + (rawDetails.salary_match || 0) + (rawDetails.location_match || 0) > 0;
                // Only include a category in the fallback if the posting actually has that data
                const jobHasSalary = (rec.job_posting?.salary_max || 0) > 0;
                const jobHasProduct = !!(rec.job_posting?.product_vendor || jobProfile?.product_vendor);
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

                // Calculate compensation overlap
                const jobSalaryMin = rec.job_posting?.salary_min || 0;
                const jobSalaryMax = rec.job_posting?.salary_max || 0;
                const candidateSalaryMin = jobProfile.salary_min || 0;
                const candidateSalaryMax = jobProfile.salary_max || 0;

                const overlapMin = Math.max(jobSalaryMin, candidateSalaryMin);
                const overlapMax = Math.min(jobSalaryMax, candidateSalaryMax);
                const hasOverlap = overlapMax >= overlapMin;
                const overlapPct = hasOverlap
                  ? ((overlapMax - overlapMin) / Math.max(candidateSalaryMax - candidateSalaryMin, 1)) * 100
                  : 0;

                const compStatus = overlapPct > 70 ? 'high' : overlapPct > 30 ? 'medium' : 'low';
                const compColor = compStatus === 'high' ? '#10B981' : compStatus === 'medium' ? '#F59E0B' : '#EF4444';

                return (
                  <div
                    className="ai-job-card"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {/* Candidate Header */}
                    <div className="ai-job-card-header">
                      <div className="ai-company-logo" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        {getCandidateInitial(candidate.name)}
                      </div>
                      <div className="ai-company-info">
                        <div className="ai-company-name">{candidate.name}</div>
                        <div className="ai-company-verified">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {jobProfile.job_role || 'Professional'}
                        </div>
                      </div>
                      {/* Match Badge */}
                      <div
                        className="ai-match-ring"
                        style={{ '--pct': matchPercentage } as React.CSSProperties}
                        title={`${matchPercentage}% Match`}
                      >
                        <span className="ai-match-ring-value">{matchPercentage}%</span>
                      </div>
                    </div>

                    {/* Profile Title */}
                    <h3 className="ai-job-title">{jobProfile.profile_name || candidate.name}</h3>
                    <p className="ai-job-team">
                      {jobProfile.job_role || 'Professional'} • {candidate.location_state || 'Location not specified'}
                    </p>

                    {rec.job_posting && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: '#F9FAFB',
                        borderRadius: '6px',
                        marginTop: '8px',
                        fontSize: '12px'
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <span style={{ color: '#6B7280' }}>
                          Applied for: <span style={{ fontWeight: 600, color: '#374151' }}>{rec.job_posting.job_title}</span>
                        </span>
                      </div>
                    )}

                    {/* Match Breakdown + Top Matched Skills (left) / AI Match Reason (right) */}
                    <div className="ai-match-breakdown-reason-grid">
                      <div className="ai-match-breakdown-col">
                        <div className="ai-match-breakdown-heading">Match Breakdown</div>
                        <MatchBreakdownBars details={displayDetails} compact />
                        {((displayDetails.matched_skills?.length ?? 0) > 0 || matchedSkills.length > 0) && (
                          <div style={{ marginTop: '16px' }}>
                            <TopSkillMatches
                              matchedSkills={
                                (displayDetails.matched_skills?.length ?? 0) > 0
                                  ? displayDetails.matched_skills
                                  : matchedSkills.map((s: any) => s.name || s.skill_name || s)
                              }
                              maxSkills={6}
                            />
                          </div>
                        )}
                      </div>
                      <div className="ai-match-reason-col">
                        {/* Reason text is generated by generateRecruiterMatchReason() from the
                            real match_details/job_profile data below — not static copy. */}
                        <AIMatchReasonBox
                          variant="recruiter"
                          reason={generateRecruiterMatchReason(
                            displayDetails,
                            {
                              productVendor: rec.job_profile?.product_vendor,
                              topSkill: displayDetails.matched_skills?.[0] || rec.job_profile?.skills?.[0]?.skill_name,
                              jobTitle: rec.job_posting?.job_title || recommendations?.job_title,
                              yearsExp: rec.job_profile?.years_of_experience,
                              candidateName: candidate.name,
                            }
                          )}
                        />
                      </div>
                    </div>

                    {/* Candidate Details Grid */}
                    <div className="ai-job-details">
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                          Experience
                        </div>
                        <div className="ai-job-detail-value">
                          {jobProfile.years_of_experience || 0}+ years
                        </div>
                      </div>
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          Salary
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="ai-job-detail-value">
                            ${jobProfile.salary_min || 0}k-${jobProfile.salary_max || 0}k
                          </div>
                          {hasOverlap && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${compColor}20`,
                              color: compColor,
                              fontWeight: 700
                            }}>
                              {compStatus === 'high' ? '✓' : compStatus === 'medium' ? '~' : '!'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ai-job-detail">
                        <div className="ai-job-detail-label">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Work Type
                        </div>
                        <div className="ai-job-detail-value">{jobProfile.worktype || 'Remote'}</div>
                      </div>
                    </div>

                    {/* Job Posting Preview */}
                    {rec.job_posting && (
                      <div style={{
                        background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginTop: '16px',
                        border: '1px solid #C7D2FE'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="20" height="20">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e3a8a' }}>
                            Job Posting Preview
                          </h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                            {rec.job_posting.job_title || 'Untitled Position'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                            <div style={{ color: '#6B7280' }}>
                              <span style={{ fontWeight: 500 }}>Location:</span> {rec.job_posting.location_city || 'Remote'}
                            </div>
                            <div style={{ color: '#6B7280' }}>
                              <span style={{ fontWeight: 500 }}>Salary:</span> ${rec.job_posting.salary_min || 0}k-${rec.job_posting.salary_max || 0}k
                            </div>
                            <div style={{ color: '#6B7280' }}>
                              <span style={{ fontWeight: 500 }}>Type:</span> {rec.job_posting.worktype || 'Full-time'}
                            </div>
                            <div style={{ color: '#6B7280' }}>
                              <span style={{ fontWeight: 500 }}>Experience:</span> {rec.job_posting.years_of_experience || 0}+ yrs
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="ai-action-buttons" style={{ marginTop: '20px' }}>
                      <button
                        className="ai-action-btn pass"
                        onClick={() => handleRecruiterPass(candidate.id, jobProfile.id)}
                        disabled={rec.action_taken === 'pass'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        {rec.action_taken === 'pass' ? 'Passed' : 'Pass'}
                      </button>
                      <button
                        className="ai-action-btn save"
                        onClick={() => handleRecruiterLike(candidate.id, jobProfile.id)}
                        disabled={rec.action_taken === 'like'}
                      >
                        <svg viewBox="0 0 24 24" fill={rec.action_taken === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
                        </svg>
                        {rec.action_taken === 'like' ? 'Liked' : 'Like'}
                      </button>
                      <button
                        className="ai-action-btn apply"
                        onClick={() => handleStartMessage(candidate.user_id)}
                        disabled={!candidate.user_id}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Message
                      </button>
                      <button
                        className="ai-action-btn view-details"
                        onClick={() => setViewRecommendationProfile(rec)}
                      >
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                    </div>

                    {/* Invite Button (prominent secondary action) */}
                    <button
                      className="ai-action-btn-primary"
                      onClick={() => handleAskToApply(candidate.id, jobProfile.id)}
                      disabled={rec.action_taken === 'ask_to_apply'}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        background: rec.action_taken === 'ask_to_apply' ? '#10B981' : 'linear-gradient(135deg, #2563eb, #60a5fa)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: rec.action_taken === 'ask_to_apply' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {rec.action_taken === 'ask_to_apply' ? 'Invitation Sent' : 'Invite to Apply'}
                    </button>
                  </div>
                );
              })()}

              {/* Pagination with Navigation Arrows */}
              <div className="ai-pagination">
                <button
                  className="ai-pagination-arrow ai-pagination-arrow-left"
                  onClick={handlePreviousRec}
                  disabled={recCardIndex === 0}
                  aria-label="Previous candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>

                <div className="ai-pagination-content">
                  <div className="ai-pagination-dots">
                    {visibleRecs.map((_: any, idx: number) => (
                      <div
                        key={idx}
                        className={`ai-pagination-dot ${idx === recCardIndex ? 'active' : ''}`}
                        onClick={() => setRecCardIndex(idx)}
                        role="button"
                        aria-label={`Go to candidate ${idx + 1}`}
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
                  <span className="ai-pagination-text">{recCardIndex + 1} of {visibleRecs.length}</span>
                </div>

                <button
                  className="ai-pagination-arrow ai-pagination-arrow-right"
                  onClick={handleNextRec}
                  disabled={recCardIndex === visibleRecs.length - 1}
                  aria-label="Next candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          {/* Hiring Funnel */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0, marginBottom: '16px' }}>
              Hiring Funnel
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const funnelStages = [
                  { label: 'Applications', count: applications.length,                                                                                                                                       color: '#2563eb', status: 'all' },
                  { label: 'Interview',    count: applications.filter((a: any) => ['scheduled','under_review','shortlisted','selected'].includes(a.status)).length, color: '#10B981', status: 'scheduled' },
                  { label: 'Shortlisted',  count: applications.filter((a: any) => ['shortlisted','selected'].includes(a.status)).length,                           color: '#3b82f6', status: 'shortlisted' },
                  { label: 'Selected',     count: applications.filter((a: any) => a.status === 'selected').length,                                                 color: '#F59E0B', status: 'selected' },
                  { label: 'Rejected',     count: applications.filter((a: any) => a.status === 'rejected').length,                                                 color: '#EF4444', status: 'rejected' },
                ];
                const maxCount = Math.max(...funnelStages.map(s => s.count), 1);
                return funnelStages.map((stage, idx) => (
                  <div key={idx} style={{ cursor: 'pointer' }} onClick={() => { setAppStatusFilter(stage.status); setActiveTab('applications'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', alignItems: 'center' }}>
                      <span style={{ color: '#4B5563', fontWeight: 500 }}>{stage.label}</span>
                      <span style={{ fontWeight: 600, color: '#1F2937' }}>{stage.count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((stage.count / maxCount) * 100)}%`, height: '100%', background: stage.color, borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#9CA3AF', textAlign: 'right' }}>Click a stage to view applications</div>
          </div>

          {/* Upcoming Interviews */}
          {(() => {
            const now = new Date();
            const upcomingList = allMeetings
              .filter((m: any) => m.scheduled_start && new Date(m.scheduled_start) >= now && m.status !== 'cancelled')
              .sort((a: any, b: any) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
            const interviewCards = upcomingList;
            const cardIndex = interviewCards.length ? Math.min(interviewCardIndex, interviewCards.length - 1) : 0;
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
            const renderCard = (m: any) => (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: '1.35', flex: 1 }}>{m.title || 'Interview'}</span>
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

                {interviewCards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: '13px' }}>No upcoming interviews scheduled</div>
                )}

                {interviewCards.length > 0 && renderCard(interviewCards[cardIndex])}

                {interviewCards.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <button
                      onClick={() => setInterviewCardIndex(Math.max(cardIndex - 1, 0))}
                      disabled={cardIndex === 0}
                      style={{ width: '26px', height: '26px', borderRadius: '999px', border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cardIndex === 0 ? 'default' : 'pointer', opacity: cardIndex === 0 ? 0.4 : 1 }}
                      aria-label="Previous interview"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>{cardIndex + 1} of {interviewCards.length}</span>
                    <button
                      onClick={() => setInterviewCardIndex(Math.min(cardIndex + 1, interviewCards.length - 1))}
                      disabled={cardIndex === interviewCards.length - 1}
                      style={{ width: '26px', height: '26px', borderRadius: '999px', border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cardIndex === interviewCards.length - 1 ? 'default' : 'pointer', opacity: cardIndex === interviewCards.length - 1 ? 0.4 : 1 }}
                      aria-label="Next interview"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Recruiter Tip */}
          <div className="ai-pro-tip-card" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: '12px', padding: '16px', border: '1px solid #FCD34D' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" width="20" height="20">
                  <path d="M9 18h6M10 22h4M15 2a6 6 0 0 1 3 11.24V16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.76A6 6 0 0 1 9 2z"/>
                </svg>
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', margin: 0, marginBottom: '6px' }}>
                  Recruiter Tip
                </h4>
                <p style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.5', margin: 0 }}>
                  Candidates with 95%+ match scores have a 3x higher response rate. Prioritize reaching out to them first!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Candidate Profile Drawer */}
      {viewRecommendationProfile && (() => {
        const rec = viewRecommendationProfile;
        const drawerMatchPct = rec.match_percentage || 0;
        const drawerRaw = rec.match_details || {};
        const drawerHasReal = (drawerRaw.product_match || 0) + (drawerRaw.skills_match || 0) +
          (drawerRaw.experience_match || 0) + (drawerRaw.salary_match || 0) + (drawerRaw.location_match || 0) > 0;
        const drawerJobHasSalary = (rec.job_posting?.salary_max || 0) > 0;
        const drawerJobHasProduct = !!(rec.job_posting?.product_vendor || rec.job_profile?.product_vendor);
        const drawerDetails: MatchDetails = drawerHasReal
          ? drawerRaw as MatchDetails
          : {
              product_match: drawerJobHasProduct ? Math.round(drawerMatchPct * 0.40) : 0,
              skills_match: Math.round(drawerMatchPct * 0.30),
              experience_match: Math.round(drawerMatchPct * 0.15),
              salary_match: drawerJobHasSalary ? Math.round(drawerMatchPct * 0.10) : 0,
              location_match: Math.round(drawerMatchPct * 0.05),
              matched_skills: drawerRaw.matched_skills || [],
            };
      return (
        <DetailDrawer onClose={() => setViewRecommendationProfile(null)} overlayClassName="vp-overlay" modalClassName="vp-modal">
            <div className="vp-header">
              <div className="vp-header-content">
                <div className="vp-avatar">
                  <div className="vp-avatar-circle">{rec.candidate.name.charAt(0).toUpperCase()}</div>
                </div>
                <div className="vp-header-info">
                  <h2 className="vp-name">{rec.candidate.name}</h2>
                  <div className="vp-location">{rec.candidate.location_state}</div>
                  <div className="vp-match-badge">
                    <span className="vp-match-percentage">{rec.match_percentage}%</span>
                    <span className="vp-match-label">Match</span>
                  </div>
                </div>
              </div>
              <button className="vp-close" onClick={() => setViewRecommendationProfile(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="vp-body">
              <div className="vp-section">
                <h3 className="vp-section-title">
                  <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Contact Information
                </h3>
                <div className="vp-info-grid">
                  <div className="vp-info-item">
                    <span className="vp-info-label">Email</span>
                    <span className="vp-info-value">{rec.candidate.email}</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Phone</span>
                    <span className="vp-info-value">{rec.candidate.phone}</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Location</span>
                    <span className="vp-info-value">{rec.candidate.location_state}</span>
                  </div>
                </div>
              </div>

              <div className="vp-section">
                <h3 className="vp-section-title">
                  <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  Experience & Preferences
                </h3>
                <div className="vp-info-grid">
                  <div className="vp-info-item">
                    <span className="vp-info-label">Experience</span>
                    <span className="vp-info-value">{rec.job_profile.years_of_experience} years</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Work Type</span>
                    <span className="vp-info-value">{rec.job_profile.worktype}</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Employment</span>
                    <span className="vp-info-value">{rec.job_profile.employment_type}</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Salary Range</span>
                    <span className="vp-info-value">${rec.job_profile.salary_min}k - ${rec.job_profile.salary_max}k</span>
                  </div>
                  <div className="vp-info-item">
                    <span className="vp-info-label">Visa Status</span>
                    <span className="vp-info-value">{rec.job_profile.visa_status.replace('_', ' ')}</span>
                  </div>
                  {rec.job_profile.availability_date && (
                    <div className="vp-info-item">
                      <span className="vp-info-label">Available From</span>
                      <span className="vp-info-value">{rec.job_profile.availability_date}</span>
                    </div>
                  )}
                </div>
              </div>

              {rec.job_profile.skills && rec.job_profile.skills.length > 0 && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Skills
                  </h3>
                  <div className="vp-skills-grid">
                    {rec.job_profile.skills.map((skill: any, index: number) => (
                      <div key={index} className="vp-skill-tag">
                        <span className="vp-skill-name">{skill.skill_name}</span>
                        {skill.rating && <span className="vp-skill-level">L{skill.rating}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Match Analysis Section */}
              <div className="vp-section">
                <h3 className="vp-section-title">
                  <svg className="vp-section-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                  AI Match Analysis
                </h3>

                {/* Match Reason */}
                <div style={{ marginBottom: '12px' }}>
                  <AIMatchReasonBox
                    variant="recruiter"
                    reason={generateRecruiterMatchReason(
                      drawerDetails,
                      {
                        productVendor: rec.job_profile?.product_vendor,
                        topSkill: drawerDetails.matched_skills?.[0] || rec.job_profile?.skills?.[0]?.skill_name,
                        jobTitle: rec.job_posting?.job_title || recommendations?.job_title,
                        yearsExp: rec.job_profile?.years_of_experience,
                        candidateName: rec.candidate?.name,
                      }
                    )}
                  />
                </div>

                {/* Breakdown Bars */}
                <div style={{ marginBottom: '14px' }}>
                  <MatchBreakdownBars details={drawerDetails} />
                </div>

                {/* Top Matched Skills */}
                {((drawerDetails.matched_skills?.length ?? 0) > 0 || (rec.job_profile?.skills?.length ?? 0) > 0) && (
                  <div style={{ marginBottom: '14px' }}>
                    <TopSkillMatches
                      matchedSkills={
                        (drawerDetails.matched_skills?.length ?? 0) > 0
                          ? drawerDetails.matched_skills
                          : (rec.job_profile?.skills || []).map((s: any) => s.skill_name || s)
                      }
                      maxSkills={8}
                    />
                  </div>
                )}

                {/* Why this match? */}
                {(() => {
                  const drivers: string[] = [];
                  const rawMatchedSkill = drawerDetails.matched_skills?.[0] || rec.job_profile?.skills?.[0]?.skill_name;
                  const matchedSkill = typeof rawMatchedSkill === 'string' ? rawMatchedSkill : rawMatchedSkill?.skill ?? rawMatchedSkill?.skill_name ?? rawMatchedSkill?.name;
                  if (matchedSkill) drivers.push(`Skill match: ${matchedSkill}`);
                  const yoe = rec.job_profile?.years_of_experience;
                  if (yoe && yoe >= 1) drivers.push(`${yoe}+ years of experience`);
                  const loc = rec.candidate?.location_state;
                  if (loc) drivers.push(`Located in ${loc}`);
                  const vendor = rec.job_profile?.product_vendor;
                  if (vendor && (drawerDetails.product_match ?? 0) > 0 && drivers.length < 3) drivers.push(`Product: ${vendor}`);
                  if ((drawerDetails.salary_match ?? 0) > 0 && drivers.length < 3) drivers.push('Salary range aligned');
                  return <WhyThisMatch drivers={drivers} />;
                })()}
              </div>

              {/* Education & Authorization Section */}
              {(rec.job_profile.highest_education || rec.job_profile.security_clearance) && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                    Education & Clearance
                  </h3>
                  <div className="vp-info-grid">
                    {rec.job_profile.highest_education && (
                      <div className="vp-info-item">
                        <span className="vp-info-label">Education</span>
                        <span className="vp-info-value">{rec.job_profile.highest_education.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                      </div>
                    )}
                    {rec.job_profile.security_clearance && (
                      <div className="vp-info-item">
                        <span className="vp-info-label">Security Clearance</span>
                        <span className="vp-info-value">{rec.job_profile.security_clearance.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hyperlinks Section */}
              {(rec.job_profile.linkedin_url || rec.job_profile.github_url || rec.job_profile.portfolio_url || rec.job_profile.twitter_url || rec.job_profile.website_url || rec.candidate.linkedin_url || rec.candidate.github_url || rec.candidate.portfolio_url) && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Professional Links
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(rec.job_profile.linkedin_url || rec.candidate.linkedin_url) && (
                      <a
                        href={rec.job_profile.linkedin_url || rec.candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: '#0A66C2',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn Profile
                      </a>
                    )}
                    {(rec.job_profile.github_url || rec.candidate.github_url) && (
                      <a
                        href={rec.job_profile.github_url || rec.candidate.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: '#24292e',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub Profile
                      </a>
                    )}
                    {(rec.job_profile.portfolio_url || rec.candidate.portfolio_url) && (
                      <a
                        href={rec.job_profile.portfolio_url || rec.candidate.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: '#1d4ed8',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                        Portfolio
                      </a>
                    )}
                    {rec.job_profile.twitter_url && (
                      <a
                        href={rec.job_profile.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: '#1DA1F2',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        Twitter/X
                      </a>
                    )}
                    {rec.job_profile.website_url && (
                      <a
                        href={rec.job_profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          background: '#6B7280',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Resume Section */}
              {rec.candidate.resumes && rec.candidate.resumes.length > 0 && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Resumes
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rec.candidate.resumes.map((resume: any) => (
                      <a
                        key={resume.id}
                        href={`http://127.0.0.1:8001/uploads/resumes/${resume.storage_path}`}
                        download
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: '#F3F4F6',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: '#111827',
                          border: '1px solid #E5E7EB',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E5E7EB';
                          e.currentTarget.style.borderColor = '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F3F4F6';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        <svg style={{ width: '20px', height: '20px', color: '#1d4ed8', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{resume.filename}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                        <svg style={{ width: '18px', height: '18px', color: '#1d4ed8', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {rec.candidate.certifications && rec.candidate.certifications.length > 0 && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                    </svg>
                    Certifications
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rec.candidate.certifications.map((cert: any) => (
                      <div key={cert.id}>
                        {cert.storage_path ? (
                          <a
                            href={`http://127.0.0.1:8001/uploads/certifications/${cert.storage_path}`}
                            download
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: '#F0FDF4',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: '#111827',
                              border: '1px solid #86EFAC',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#DCFCE7';
                              e.currentTarget.style.borderColor = '#10B981';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F0FDF4';
                              e.currentTarget.style.borderColor = '#86EFAC';
                            }}
                          >
                            <svg style={{ width: '20px', height: '20px', color: '#10B981', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                            </svg>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{cert.name}</div>
                              {cert.issuer && <div style={{ fontSize: '12px', color: '#059669' }}>Issued by: {cert.issuer}</div>}
                              {(cert.issued_date || cert.expiry_date) && (
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                  {cert.issued_date && `Issued: ${cert.issued_date}`}
                                  {cert.issued_date && cert.expiry_date && ' • '}
                                  {cert.expiry_date && `Expires: ${cert.expiry_date}`}
                                </div>
                              )}
                            </div>
                            <svg style={{ width: '18px', height: '18px', color: '#10B981', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </a>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: '#F9FAFB',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB'
                          }}>
                            <svg style={{ width: '20px', height: '20px', color: '#9CA3AF', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                            </svg>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{cert.name}</div>
                              {cert.issuer && <div style={{ fontSize: '12px', color: '#6B7280' }}>Issued by: {cert.issuer}</div>}
                              {(cert.issued_date || cert.expiry_date) && (
                                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                  {cert.issued_date && `Issued: ${cert.issued_date}`}
                                  {cert.issued_date && cert.expiry_date && ' • '}
                                  {cert.expiry_date && `Expires: ${cert.expiry_date}`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rec.has_applied && (
                <div className="vp-section">
                  <h3 className="vp-section-title">
                    <svg className="vp-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Application Status
                  </h3>
                  <div className="vp-status-badge applied">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Applied • {rec.application_status}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="vp-footer">
              <div className="vp-actions">
                <button
                  className={`vp-btn ${rec.action_taken === 'pass' ? 'vp-btn-done-pass' : 'vp-btn-secondary'}`}
                  onClick={() => { if (rec.action_taken !== 'pass') handleRecruiterPass(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                  disabled={rec.action_taken === 'pass'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {rec.action_taken === 'pass' ? 'Passed' : 'Pass'}
                </button>
                <button
                  className={`vp-btn ${rec.action_taken === 'like' ? 'vp-btn-done-like' : 'vp-btn-primary'}`}
                  onClick={() => { if (rec.action_taken !== 'like') handleRecruiterLike(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                  disabled={rec.action_taken === 'like'}
                >
                  <svg viewBox="0 0 24 24" fill={rec.action_taken === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {rec.action_taken === 'like' ? 'Shortlisted' : 'Like'}
                </button>
                <button
                  className={`vp-btn ${rec.action_taken === 'ask_to_apply' ? 'vp-btn-done-invite' : 'vp-btn-success'}`}
                  onClick={() => { if (rec.action_taken !== 'ask_to_apply') handleAskToApply(rec.candidate.id, rec.job_profile.id); setViewRecommendationProfile(null); }}
                  disabled={rec.action_taken === 'ask_to_apply'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {rec.action_taken === 'ask_to_apply' ? 'Asked to Apply' : 'Ask to Apply'}
                </button>
                <button
                  className="vp-btn vp-btn-message"
                  onClick={() => { handleStartMessage(rec.candidate.id); setViewRecommendationProfile(null); }}
                  aria-label={`Message ${rec.candidate.name}`}
                  title="Start conversation with candidate"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
              </div>
            </div>
        </DetailDrawer>
      );
    })()}
    </>
  );
};

export default RecruiterRecommendationsTab;
