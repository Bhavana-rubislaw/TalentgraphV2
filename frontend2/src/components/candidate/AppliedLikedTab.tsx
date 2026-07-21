import React, { useEffect, useState } from 'react';
import DetailDrawer from '../common/DetailDrawer';
import type { AppliedLikedJobs } from '../../types/appliedLiked';

export interface AppliedLikedTabProps {
  appliedLiked: AppliedLikedJobs;
  setActiveTab: (tab: string) => void;
  applyingJobId: number | null;
  withdrawingJobId: number | null;
  handleApply: (jobPostingId: number) => Promise<void>;
  handleWithdrawApplication: (applicationId: number, jobPostingId: number) => Promise<void>;
}

const LIKED_JOBS_PER_PAGE = 6;
const APPLIED_JOBS_PER_PAGE = 6;

const AppliedLikedTab: React.FC<AppliedLikedTabProps> = ({
  appliedLiked,
  setActiveTab,
  applyingJobId,
  withdrawingJobId,
  handleApply,
  handleWithdrawApplication,
}) => {
  const [jobListTab, setJobListTab] = useState<'liked' | 'applied'>('liked');
  const [drawerJob, setDrawerJob] = useState<any | null>(null);
  const [currentLikedPage, setCurrentLikedPage] = useState(1);
  const [currentAppliedPage, setCurrentAppliedPage] = useState(1);
  const [appliedLikedRoleFilter, setAppliedLikedRoleFilter] = useState<string>('all');
  const [appliedLikedStatusFilter, setAppliedLikedStatusFilter] = useState<string>('all');
  const [appliedLikedSort, setAppliedLikedSort] = useState<'newest' | 'oldest'>('newest');

  // Reset pagination when filters change in Applied/Liked tabs
  useEffect(() => {
    if (jobListTab === 'liked') {
      setCurrentLikedPage(1);
    } else {
      setCurrentAppliedPage(1);
    }
  }, [appliedLikedRoleFilter, appliedLikedStatusFilter, appliedLikedSort, jobListTab]);

  const { applied_jobs, liked_jobs } = appliedLiked;
  const rawItems = jobListTab === 'applied' ? applied_jobs : liked_jobs;

  // Calculate application statistics
  const totalApplied = applied_jobs.length;
  const inReview = applied_jobs.filter((job: any) =>
    job.application_status?.toLowerCase().includes('review') ||
    job.status?.toLowerCase().includes('review')
  ).length;
  const interviews = applied_jobs.filter((job: any) =>
    job.application_status?.toLowerCase().includes('interview') ||
    job.status?.toLowerCase().includes('interview') ||
    job.interview_scheduled
  ).length;
  const offers = applied_jobs.filter((job: any) =>
    job.application_status?.toLowerCase().includes('offer') ||
    job.status?.toLowerCase().includes('offer')
  ).length;

  // Derive unique role options from both lists
  const alRoleOptions: string[] = Array.from<string>(new Set<string>(
      rawItems
        .map((job: any): string =>
          (job.job_role as string | undefined) ||
          (job.job_title as string | undefined) ||
          ''
        )
        .filter((s: string) => s.length > 0)
    )).sort();

  // Derive unique status options from applied list
  const alStatusOptions: string[] = Array.from<string>(new Set<string>(
      (applied_jobs as any[])
        .map((job: any): string => (job.status as string | undefined) || '')
        .filter((s: string) => s.length > 0)
    )).sort();

  // Filter logic
  let filteredItems = rawItems.filter((job: any) => {
    const role =
      (job.job_role as string | undefined) ||
      (job.job_title as string | undefined) ||
      '';
    if (appliedLikedRoleFilter !== 'all' && role !== appliedLikedRoleFilter) return false;
    if (jobListTab === 'applied' && appliedLikedStatusFilter !== 'all') {
      const status = (job.status as string | undefined) || '';
      if (status !== appliedLikedStatusFilter) return false;
    }
    return true;
  });

  // Sorting
  filteredItems = [...filteredItems].sort((a: any, b: any) => {
    const getTime = (item: any) => {
      const ts =
        item.applied_at ||
        item.liked_at ||
        item.created_at ||
        item.timestamp ||
        '';
      return ts ? new Date(ts).getTime() : 0;
    };
    return appliedLikedSort === 'newest'
      ? getTime(b) - getTime(a)
      : getTime(a) - getTime(b);
  });

  const hasActiveFilters =
    appliedLikedRoleFilter !== 'all' ||
    (jobListTab === 'applied' && appliedLikedStatusFilter !== 'all') ||
    appliedLikedSort !== 'newest';

  // Pagination logic for liked jobs
  const currentPage = jobListTab === 'liked' ? currentLikedPage : currentAppliedPage;
  const itemsPerPage = jobListTab === 'liked' ? LIKED_JOBS_PER_PAGE : APPLIED_JOBS_PER_PAGE;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Page numbers logic for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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

  const getStatusClass = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('review')) return 'reviewed';
    if (s.includes('interview')) return 'interview';
    if (s.includes('offer')) return 'offered';
    if (s.includes('reject') || s.includes('denied')) return 'rejected';
    return 'applied';
  };

  const renderCard = (job: any, type: 'applied' | 'liked') => {
    const key = type === 'applied' ? `app-${job.application_id}` : `liked-${job.job_id}`;
    const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
    const dateStr = type === 'applied'
      ? `Applied ${new Date(job.applied_at).toLocaleDateString()}`
      : `Liked ${new Date(job.liked_at).toLocaleDateString()}`;
    const isApplied = type === 'applied' || job.already_applied;
    const isApplying = applyingJobId === job.job_id;

    // Determine application progress stage
    const getApplicationStage = () => {
      const status = (job.application_status || job.status || '').toLowerCase();
      if (status.includes('offer')) return 4;
      if (status.includes('interview') || job.interview_scheduled) return 3;
      if (status.includes('review')) return 2;
      return 1; // submitted
    };

    const stage = type === 'applied' ? getApplicationStage() : 0;

    // LIKED JOBS - Professional Card Design (3 per row)
    if (type === 'liked') {
      const companyInitial = job.company_name?.charAt(0).toUpperCase() || 'C';

      return (
        <div key={key} style={{
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
              {job.company_name}
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              Posted {new Date(job.liked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                {salary || '$180-240k'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {/* NOTE: applicants_count is not part of the /candidate/applied-liked-jobs response —
                  this has always rendered the hardcoded "87 applied" fallback. Flagging, not
                  fixing: showing a real count needs a backend change, a product call. */}
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {job.applicants_count || '87'} applied
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', alignItems: 'center' }}>
            <button
              onClick={() => setDrawerJob({ ...job, _type: type })}
              style={{
                width: '40px',
                height: '40px',
                border: '1.5px solid #e5e7eb',
                background: 'white',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.background = '#f0fdf4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={job.already_applied ? '#10b981' : 'none'} stroke={job.already_applied ? '#10b981' : '#9ca3af'} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button
              onClick={() => setDrawerJob({ ...job, _type: type })}
              style={{
                flex: 1,
                padding: '10px 20px',
                border: '1.5px solid #e5e7eb',
                background: 'white',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }}
            >
              Details
            </button>
            <button
              onClick={() => handleApply(job.job_id)}
              disabled={isApplying || withdrawingJobId === job.job_id}
              style={{
                flex: 1,
                padding: '10px 20px',
                border: 'none',
                background: isApplied ? '#10b981' : ((isApplying || withdrawingJobId === job.job_id) ? '#9ca3af' : '#111827'),
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                cursor: (isApplying || withdrawingJobId === job.job_id) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isApplying && withdrawingJobId !== job.job_id && !isApplied) {
                  e.currentTarget.style.background = '#1f2937';
                }
              }}
              onMouseLeave={(e) => {
                if (!isApplied && !isApplying && withdrawingJobId !== job.job_id) {
                  e.currentTarget.style.background = '#111827';
                }
              }}
            >
              {isApplying ? 'Applying…' : withdrawingJobId === job.job_id ? 'Withdrawing…' : isApplied ? 'Applied ✓' : 'Apply'}
            </button>
          </div>
        </div>
      );
    }

    // APPLIED JOBS - Rectangular Full-Width Card
    return (
      <div
        key={key}
        className="cal-card"
        style={{
          position: 'relative',
          transition: 'all 0.2s',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr auto',
          gap: '32px',
          alignItems: 'start',
          padding: '32px',
          marginBottom: '24px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(123, 94, 167, 0.14)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = '#60a5fa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = '#E2E4EC';
        }}>
        {/* Progress Bar for Applied Jobs */}
        {type === 'applied' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: '#f1f5f9',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(stage / 4) * 100}%`,
              background: stage === 4 ? '#10b981' : stage === 3 ? '#6366f1' : stage === 2 ? '#f59e0b' : '#94a3b8',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {/* Left Column: Company & Job Info */}
        <div style={{ paddingTop: '8px' }}>
          <h4 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '6px',
            lineHeight: '1.3'
          }}>
            {job.job_title}
          </h4>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px',
            fontWeight: '500'
          }}>
            {job.company_name}
            {job.job_role && <><span style={{ margin: '0 6px' }}>·</span>{job.job_role}</>}
          </div>
          {job.status && (
            <span className={`cal-status-chip ${getStatusClass(job.status)}`} style={{ display: 'inline-flex' }}>
              {job.status}
            </span>
          )}
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
            {dateStr}
          </div>
        </div>

        {/* Center Column: Timeline & Job Details */}
        <div style={{ paddingTop: '8px' }}>

          {/* Application Progress Tracker */}
          <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 0',
              marginBottom: '16px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: stage >= 1 ? '#6366f1' : '#e2e8f0',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {stage >= 1 ? '✓' : '1'}
                </div>
                <span style={{ fontSize: '11px', color: stage >= 1 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                  Submitted
                </span>
              </div>
              <div style={{ width: '24px', height: '2px', background: stage >= 2 ? '#6366f1' : '#e2e8f0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: stage >= 2 ? '#f59e0b' : '#e2e8f0',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {stage >= 2 ? '✓' : '2'}
                </div>
                <span style={{ fontSize: '11px', color: stage >= 2 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                  In Review
                </span>
              </div>
              <div style={{ width: '24px', height: '2px', background: stage >= 3 ? '#6366f1' : '#e2e8f0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: stage >= 3 ? '#6366f1' : '#e2e8f0',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {stage >= 3 ? '✓' : '3'}
                </div>
                <span style={{ fontSize: '11px', color: stage >= 3 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                  Interview
                </span>
              </div>
              <div style={{ width: '24px', height: '2px', background: stage >= 4 ? '#10b981' : '#e2e8f0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: stage >= 4 ? '#10b981' : '#e2e8f0',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {stage >= 4 ? '✓' : '4'}
                </div>
                <span style={{ fontSize: '11px', color: stage >= 4 ? '#475569' : '#94a3b8', fontWeight: 500 }}>
                  Offer
                </span>
              </div>
            </div>

          {/* Job Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px 16px'
          }}>
            {job.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.location}</span>
              </div>
            )}
            {job.worktype && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.worktype}</span>
              </div>
            )}
            {job.employment_type && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.employment_type}</span>
              </div>
            )}
            {job.seniority_level && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{job.seniority_level}</span>
              </div>
            )}
            {salary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{salary}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingTop: '8px',
          minWidth: '180px'
        }}>
          <button
            onClick={() => setDrawerJob({ ...job, _type: type })}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = 'white';
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View Details
          </button>
          <button
            onClick={() => handleApply(job.job_id)}
            disabled={isApplying || withdrawingJobId === job.job_id}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isApplied ? '#10b981' : 'linear-gradient(135deg, #7c3aed 0%, #1d4ed8 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (isApplying || withdrawingJobId === job.job_id) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (isApplying || withdrawingJobId === job.job_id) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isApplying && withdrawingJobId !== job.job_id) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isApplying ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Applying…
              </>
            ) : withdrawingJobId === job.job_id ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Withdrawing…
              </>
            ) : isApplied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                Applied ✓
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Apply Now
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderDrawer = () => {
    if (!drawerJob) return null;
    const job = drawerJob;
    const type = job._type as 'applied' | 'liked';
    const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
    const isApplied = type === 'applied' || job.already_applied;
    const isApplying = applyingJobId === job.job_id;

    return (
      <DetailDrawer onClose={() => setDrawerJob(null)}>
          {/* Header */}
          <div className="cal-drawer-header">
            <div className="cal-drawer-header-info">
              <h2 className="cal-drawer-title">{job.job_title}</h2>
              <div className="cal-drawer-subtitle">
                {job.company_name}{job.job_role ? ` · ${job.job_role}` : ''}
              </div>
            </div>
            <button className="cal-drawer-close" onClick={() => setDrawerJob(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Body */}
          <div className="cal-drawer-body">
            {/* Application Status — only shown for applied jobs */}
            {type === 'applied' && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Application Status
                </div>
                <div className="cal-drawer-meta-grid">
                  {(job.application_status || job.status) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Current Stage</span>
                      <span className="cal-drawer-field-value">
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: (() => {
                            const s = (job.application_status || job.status || '').toLowerCase();
                            if (s.includes('offer')) return '#dcfce7';
                            if (s.includes('interview')) return '#dbeafe';
                            if (s.includes('review') || s.includes('screening')) return '#fef9c3';
                            if (s.includes('reject') || s.includes('decline')) return '#fee2e2';
                            return '#f1f5f9';
                          })(),
                          color: (() => {
                            const s = (job.application_status || job.status || '').toLowerCase();
                            if (s.includes('offer')) return '#166534';
                            if (s.includes('interview')) return '#1d4ed8';
                            if (s.includes('review') || s.includes('screening')) return '#854d0e';
                            if (s.includes('reject') || s.includes('decline')) return '#991b1b';
                            return '#475569';
                          })(),
                        }}>
                          {(job.application_status || job.status || 'Submitted').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                      </span>
                    </div>
                  )}
                  {job.applied_at && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Date Applied</span>
                      <span className="cal-drawer-field-value">{new Date(job.applied_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {job.application_id && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Application ID</span>
                      <span className="cal-drawer-field-value">#{job.application_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overview grid */}
            <div className="cal-drawer-section">
              <div className="cal-drawer-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                Overview
              </div>
              <div className="cal-drawer-meta-grid">
                {job.location && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Location</span>
                    <span className="cal-drawer-field-value">{job.location}</span>
                  </div>
                )}
                {job.worktype && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Work Type</span>
                    <span className="cal-drawer-field-value">{job.worktype}</span>
                  </div>
                )}
                {job.employment_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Employment</span>
                    <span className="cal-drawer-field-value">{job.employment_type}</span>
                  </div>
                )}
                {job.seniority_level && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Seniority</span>
                    <span className="cal-drawer-field-value">{job.seniority_level}</span>
                  </div>
                )}
                {salary && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Compensation</span>
                    <span className="cal-drawer-field-value">{salary}{job.pay_type ? ` / ${job.pay_type}` : ''}</span>
                  </div>
                )}
                {job.product_vendor && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Vendor</span>
                    <span className="cal-drawer-field-value">{job.product_vendor}</span>
                  </div>
                )}
                {job.product_type && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Product</span>
                    <span className="cal-drawer-field-value">{job.product_type}</span>
                  </div>
                )}
                {job.start_date && (
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Start Date</span>
                    <span className="cal-drawer-field-value">{new Date(job.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {job.job_description && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  Description
                </div>
                <div className="cal-drawer-description">{job.job_description}</div>
              </div>
            )}

            {/* Skills */}
            {job.posting_skills && job.posting_skills.length > 0 && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Required Skills
                </div>
                <div className="cal-drawer-skills">
                  {job.posting_skills.map((sk: any, i: number) => (
                    <span key={i} className="cal-drawer-skill">
                      {sk.skill_name}
                      {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {(job.education_qualifications || job.certifications_required || job.travel_requirements || job.visa_info) && (
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  Requirements
                </div>
                <div className="cal-drawer-meta-grid">
                  {job.education_qualifications && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Education</span>
                      <span className="cal-drawer-field-value">{job.education_qualifications}</span>
                    </div>
                  )}
                  {job.certifications_required && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Certifications</span>
                      <span className="cal-drawer-field-value">{job.certifications_required}</span>
                    </div>
                  )}
                  {job.travel_requirements && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Travel</span>
                      <span className="cal-drawer-field-value">{job.travel_requirements}</span>
                    </div>
                  )}
                  {job.visa_info && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Visa</span>
                      <span className="cal-drawer-field-value">{job.visa_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="cal-drawer-footer">
            {type === 'applied' && job.application_id && (
              <button
                className="cal-btn cal-btn-secondary"
                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => { handleWithdrawApplication(job.application_id, job.job_id); setDrawerJob(null); }}
                disabled={withdrawingJobId === job.job_id}
                title="Withdraw this application"
              >
                {withdrawingJobId === job.job_id ? 'Withdrawing…' : 'Withdraw Application'}
              </button>
            )}
            {type !== 'applied' && (
              <button
                className={`cal-btn cal-btn-primary${isApplying || withdrawingJobId === job.job_id ? ' loading' : ''}`}
                onClick={() => handleApply(job.job_id)}
                disabled={isApplying || withdrawingJobId === job.job_id}
              >
                {isApplying ? (
                  'Applying…'
                ) : withdrawingJobId === job.job_id ? (
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
            )}
            <button className="cal-btn cal-btn-secondary" onClick={() => setDrawerJob(null)}>Close</button>
          </div>
        </DetailDrawer>
    );
  };

  return (
    <div className="cal-page">
      {/* Tab filter */}
      <div className="cal-tabs">
        <button className={`cal-tab${jobListTab === 'liked' ? ' active' : ''}`} onClick={() => setJobListTab('liked')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={jobListTab === 'liked' ? '#db2777' : 'none'} stroke={jobListTab === 'liked' ? '#db2777' : 'currentColor'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Liked
          <span className="cal-tab-count">{liked_jobs.length}</span>
        </button>
        <button className={`cal-tab${jobListTab === 'applied' ? ' active' : ''}`} onClick={() => setJobListTab('applied')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Applied
          <span className="cal-tab-count">{applied_jobs.length}</span>
        </button>
      </div>

      {/* Application Statistics Summary (for Applied tab only) */}
      {jobListTab === 'applied' && applied_jobs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          margin: '24px 0',
        }}>
          {/* Total Applied */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{totalApplied}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Total Applied</div>
            </div>
          </div>

          {/* In Review */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{inReview}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>In Review</div>
            </div>
          </div>

          {/* Interviews */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{interviews}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Interviews</div>
            </div>
          </div>

          {/* Offers */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{offers}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Offers</div>
            </div>
          </div>
        </div>
      )}

      {/* Applied/Liked Filters */}
      {rawItems.length > 0 && (
        <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0', flexWrap: 'wrap' }}>
          {alRoleOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="al-role-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Role</label>
              <select
                id="al-role-filter"
                className="job-select-modern"
                style={{ minWidth: '150px', padding: '6px 10px', fontSize: '13px' }}
                value={appliedLikedRoleFilter}
                onChange={(e) => setAppliedLikedRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {alRoleOptions.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
          )}
          {jobListTab === 'applied' && alStatusOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="al-status-filter" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Status</label>
              <select
                id="al-status-filter"
                className="job-select-modern"
                style={{ minWidth: '140px', padding: '6px 10px', fontSize: '13px' }}
                value={appliedLikedStatusFilter}
                onChange={(e) => setAppliedLikedStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {alStatusOptions.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="al-sort" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>Sort</label>
            <select
              id="al-sort"
              className="job-select-modern"
              style={{ minWidth: '120px', padding: '6px 10px', fontSize: '13px' }}
              value={appliedLikedSort}
              onChange={(e) => setAppliedLikedSort(e.target.value as 'newest' | 'oldest')}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              className="action-btn secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => {
                setAppliedLikedRoleFilter('all');
                setAppliedLikedStatusFilter('all');
                setAppliedLikedSort('newest');
              }}
            >
              Clear filters
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginLeft: 'auto' }}>
            {jobListTab === 'liked' && totalPages > 1
              ? `Showing ${startIndex + 1}–${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length}`
              : `Showing ${filteredItems.length} of ${rawItems.length}`}
          </span>
        </div>
      )}

      {/* List or Empty */}
      {filteredItems.length === 0 ? (
        <div className="cal-empty">
          <div className="cal-empty-icon">
            {jobListTab === 'liked' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            )}
          </div>
          <h3 className="cal-empty-title">
            {rawItems.length === 0
              ? (jobListTab === 'liked' ? 'No liked jobs yet' : 'No applications yet')
              : 'No results match your filters'}
          </h3>
          <p className="cal-empty-subtitle">
            {rawItems.length === 0
              ? (jobListTab === 'liked'
                  ? 'Swipe right on recommended jobs to save them here for quick reference.'
                  : 'Start applying to positions from your liked jobs or browse new opportunities.')
              : 'Try adjusting or clearing the filters above.'}
          </p>
          <button className="cal-empty-link" onClick={() => setActiveTab('recommendations')}>
            Browse Jobs
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: jobListTab === 'applied' ? '1fr' : 'repeat(3, 1fr)',
            gap: jobListTab === 'applied' ? '0' : '20px',
            padding: '0'
          }}>
            {paginatedItems.map((job: any) => renderCard(job, jobListTab))}
          </div>

          {/* Pagination Footer for Applied Jobs */}
          {jobListTab === 'applied' && filteredItems.length > 0 && totalPages > 1 && (
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
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentAppliedPage(prev => Math.max(1, prev - 1));
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: currentPage === 1 ? '#f8fafc' : 'white',
                  color: currentPage === 1 ? '#94a3b8' : '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
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
                {getPageNumbers().map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentAppliedPage(pageNum as number);
                      }}
                      style={{
                        minWidth: '40px',
                        height: '40px',
                        border: currentPage === pageNum ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: currentPage === pageNum ? 'linear-gradient(135deg, #7c3aed 0%, #1d4ed8 100%)' : 'white',
                        color: currentPage === pageNum ? 'white' : '#475569',
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
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentAppliedPage(prev => Math.min(totalPages, prev + 1));
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: currentPage === totalPages ? '#f8fafc' : 'white',
                  color: currentPage === totalPages ? '#94a3b8' : '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
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

          {/* Pagination Footer for Liked Jobs */}
          {jobListTab === 'liked' && filteredItems.length > 0 && totalPages > 1 && (
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
                Showing <strong>{startIndex + 1}–{Math.min(endIndex, filteredItems.length)}</strong> of <strong>{filteredItems.length}</strong> jobs
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentLikedPage(prev => Math.max(1, prev - 1))}
                  disabled={currentLikedPage === 1}
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentLikedPage === 1 ? '#f8fafc' : 'white',
                    cursor: currentLikedPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentLikedPage === 1 ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLikedPage !== 1) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLikedPage !== 1) {
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
                      onClick={() => setCurrentLikedPage(page as number)}
                      style={{
                        minWidth: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: currentLikedPage === page ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: currentLikedPage === page ? '#6366f1' : 'white',
                        color: currentLikedPage === page ? 'white' : '#475569',
                        fontSize: '14px',
                        fontWeight: currentLikedPage === page ? 600 : 500,
                        cursor: 'pointer',
                        padding: '0 12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentLikedPage !== page) {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentLikedPage !== page) {
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
                  onClick={() => setCurrentLikedPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentLikedPage === totalPages}
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: currentLikedPage === totalPages ? '#f8fafc' : 'white',
                    cursor: currentLikedPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentLikedPage === totalPages ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLikedPage !== totalPages) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLikedPage !== totalPages) {
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
        </>
      )}

      {/* Side Drawer */}
      {renderDrawer()}
    </div>
  );
};

export default AppliedLikedTab;
