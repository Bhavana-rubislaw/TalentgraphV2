/**
 * MatchInsights — Shared UI components for AI match reasons, breakdowns, and skill chips.
 * Used by both CandidateDashboardNew and RecruiterDashboardNew.
 */
import React from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MatchDetails {
  product_match: number;
  skills_match: number;
  experience_match: number;
  salary_match: number;
  location_match: number;
  matched_skills?: string[];
}

// Weights that reflect the current scoring algorithm
const WEIGHTS = {
  product_match: 40,
  skills_match: 30,
  experience_match: 15,
  salary_match: 10,
  location_match: 5,
};

const CATEGORY_COLORS: Record<string, { bar: string; text: string }> = {
  product_match:    { bar: '#7B5EA7', text: '#7B5EA7' },
  skills_match:     { bar: '#10B981', text: '#059669' },
  experience_match: { bar: '#3B82F6', text: '#2563EB' },
  salary_match:     { bar: '#F59E0B', text: '#D97706' },
  location_match:   { bar: '#EC4899', text: '#DB2777' },
};

const CATEGORY_LABELS: Record<string, string> = {
  product_match:    'Product & Role',
  skills_match:     'Skills',
  experience_match: 'Experience',
  salary_match:     'Salary',
  location_match:   'Location',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return the top N categories by their actual score, descending. */
export function topCategories(details: MatchDetails, n = 3) {
  return (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[])
    .map(k => ({ key: k, score: (details as any)[k] as number, max: WEIGHTS[k] }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ── generateCandidateMatchReason ─────────────────────────────────────────────

/**
 * Produces a human-readable match reason string from the candidate's perspective.
 * Returns an array of JSX parts so callers can embed <strong> tags.
 */
export function generateCandidateMatchReason(
  details: MatchDetails,
  meta?: { productVendor?: string; topSkill?: string; jobTitle?: string; yearsExp?: number }
): string {
  const d = details;
  const vendor = meta?.productVendor || 'the required product';
  const topSkill = meta?.topSkill || (details.matched_skills?.[0]) || 'relevant skills';
  const yearsExp = meta?.yearsExp;

  const productHigh  = d.product_match >= 28;
  const skillsHigh   = d.skills_match  >= 20;
  const expHigh      = d.experience_match >= 12;
  const salaryMatch  = d.salary_match > 0;
  const locationMatch = d.location_match > 0;

  // Strong overall
  if (productHigh && skillsHigh) {
    return `Your profile is a strong match for this role due to your deep experience with ${vendor} and high alignment with the required skills.`;
  }
  if (productHigh && expHigh) {
    return `Your ${vendor} background and ${yearsExp ? `${yearsExp}+ years of` : 'relevant'} experience closely match what this role needs.`;
  }
  if (skillsHigh && expHigh) {
    return `Your ${topSkill} proficiency and ${yearsExp ? `${yearsExp}+ years of` : 'relevant'} experience make you a strong candidate for this role.`;
  }
  if (salaryMatch && locationMatch && skillsHigh) {
    return `This job aligns well with your salary range and location, complemented by your ${topSkill} expertise.`;
  }
  if (productHigh) {
    return `Your ${vendor} expertise is a great fit for this role's primary requirements.`;
  }
  if (skillsHigh) {
    return `Your ${topSkill} skills show strong alignment with what this role requires.`;
  }
  if (salaryMatch && locationMatch) {
    return 'This opportunity matches your preferred salary range and location preferences.';
  }
  if (expHigh) {
    return `Your ${yearsExp ? `${yearsExp}+ years of` : 'solid'} experience aligns well with this position's requirements.`;
  }
  return 'This role aligns with your profile and preferences.';
}

// ── generateRecruiterMatchReason ──────────────────────────────────────────────

export function generateRecruiterMatchReason(
  details: MatchDetails,
  meta?: { productVendor?: string; topSkill?: string; jobTitle?: string; yearsExp?: number; candidateName?: string }
): string {
  const d = details;
  const vendor = meta?.productVendor || 'the required product';
  const topSkill = meta?.topSkill || (details.matched_skills?.[0]) || 'relevant skills';
  const yearsExp = meta?.yearsExp;
  const jobTitle = meta?.jobTitle || 'this role';

  const productHigh  = d.product_match >= 28;
  const skillsHigh   = d.skills_match  >= 20;
  const expHigh      = d.experience_match >= 12;
  const salaryMatch  = d.salary_match > 0;
  const locationMatch = d.location_match > 0;

  if (productHigh && skillsHigh) {
    return `Strong fit: deep ${vendor} experience and significant overlap with required skills for ${jobTitle}.`;
  }
  if (productHigh && expHigh) {
    return `${vendor} background with ${yearsExp ? `${yearsExp}+ years` : 'relevant'} experience makes this candidate highly relevant for ${jobTitle}.`;
  }
  if (skillsHigh && expHigh) {
    return `Their ${topSkill} expertise and ${yearsExp ? `${yearsExp}+ years of` : 'strong'} experience make this a compelling match for ${jobTitle}.`;
  }
  if (salaryMatch && locationMatch) {
    return `Profile shows excellent alignment with your location and salary requirements, with strong ${topSkill} proficiency.`;
  }
  if (productHigh) {
    return `Primary fit driver: strong ${vendor} specialisation aligned with your job requirements.`;
  }
  if (skillsHigh) {
    return `Candidate's skill set shows strong overlap with the required skills for ${jobTitle}.`;
  }
  if (expHigh) {
    return `${yearsExp ? `${yearsExp}+ years of` : 'Solid'} industry experience relevant to ${jobTitle}.`;
  }
  return 'Candidate profile shows relevant alignment with the job requirements.';
}

// ── MatchBreakdownBars ────────────────────────────────────────────────────────

interface MatchBreakdownBarsProps {
  details: MatchDetails;
  /** compact = smaller font/height, suitable for cards */
  compact?: boolean;
}

export const MatchBreakdownBars: React.FC<MatchBreakdownBarsProps> = ({ details, compact = false }) => {
  const barHeight = compact ? 4 : 6;
  const fontSize  = compact ? '11px' : '12px';
  const labelWidth = compact ? '80px' : '100px';

  const rows = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map(key => ({
    key,
    label: CATEGORY_LABELS[key],
    score: (details as any)[key] as number,
    max: WEIGHTS[key],
    colors: CATEGORY_COLORS[key],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '8px' }}>
      {rows.map(({ key, label, score, max, colors }) => (
        score > 0 && (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize, color: '#6B7280', minWidth: labelWidth, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: `${barHeight}px`, background: '#E5E7EB', borderRadius: `${barHeight / 2}px`, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min((score / max) * 100, 100)}%`,
                height: '100%',
                background: colors.bar,
                transition: 'width 0.35s ease',
              }} />
            </div>
            <span style={{ fontSize, fontWeight: 600, color: colors.text, minWidth: compact ? '28px' : '34px', textAlign: 'right' }}>
              {score}%
            </span>
          </div>
        )
      ))}
    </div>
  );
};

// ── MatchBreakdownTable ───────────────────────────────────────────────────────

interface MatchBreakdownTableProps {
  details: MatchDetails;
  overallScore: number;
}

export const MatchBreakdownTable: React.FC<MatchBreakdownTableProps> = ({ details, overallScore }) => {
  const rows = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map(key => ({
    key,
    label: CATEGORY_LABELS[key],
    weight: WEIGHTS[key],
    score: (details as any)[key] as number,
    colors: CATEGORY_COLORS[key],
  }));

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#374151', fontWeight: 700 }}>Category</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#374151', fontWeight: 700 }}>Max Weight</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#374151', fontWeight: 700 }}>Your Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, label, weight, score, colors }) => (
          <tr key={key} style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '6px 8px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.bar, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{weight}%</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: score > 0 ? colors.text : '#9CA3AF' }}>
              {score}%
            </td>
          </tr>
        ))}
        <tr style={{ borderTop: '2px solid #E5E7EB', background: '#F9FAFB' }}>
          <td style={{ padding: '8px 8px', fontWeight: 700, color: '#111827' }}>Total Match</td>
          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#6B7280' }}>100%</td>
          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: '#7B5EA7', fontSize: '14px' }}>{overallScore}%</td>
        </tr>
      </tbody>
    </table>
  );
};

// ── TopSkillMatches ───────────────────────────────────────────────────────────

interface TopSkillMatchesProps {
  matchedSkills: string[];
  maxSkills?: number;
  label?: string;
}

export const TopSkillMatches: React.FC<TopSkillMatchesProps> = ({
  matchedSkills,
  maxSkills = 8,
  label = 'Top Matched Skills',
}) => {
  if (!matchedSkills || matchedSkills.length === 0) return null;

  const displayed = matchedSkills.slice(0, maxSkills);
  const remaining = matchedSkills.length - displayed.length;

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width="14" height="14">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {displayed.map((skill, idx) => (
          <span key={idx} style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B98120, #05966920)',
            border: '1px solid #10B981',
            color: '#047857',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {skill}
          </span>
        ))}
        {remaining > 0 && (
          <span style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: '#F3F4F6',
            color: '#6B7280',
            fontWeight: 600,
          }}>
            +{remaining} more
          </span>
        )}
      </div>
    </div>
  );
};

// ── AIMatchReasonBox ──────────────────────────────────────────────────────────

interface AIMatchReasonBoxProps {
  reason: string;
  /** 'candidate' shows purple theme; 'recruiter' shows indigo theme */
  variant?: 'candidate' | 'recruiter';
}

export const AIMatchReasonBox: React.FC<AIMatchReasonBoxProps> = ({ reason, variant = 'candidate' }) => {
  const isRecruiter = variant === 'recruiter';
  return (
    <div style={{
      background: isRecruiter
        ? 'linear-gradient(135deg, #EDE9FE, #F5F3FF)'
        : 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
      border: `1px solid ${isRecruiter ? '#DDD6FE' : '#C4B5FD'}`,
      borderRadius: '10px',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: '#7C3AED', flexShrink: 0 }}>
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#5B21B6' }}>AI Match Reason</span>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#4C1D95', lineHeight: 1.5 }}>{reason}</p>
    </div>
  );
};
