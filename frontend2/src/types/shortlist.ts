// Grounded in backend2/app/routers/dashboard.py: get_recruiter_shortlist
// (GET /dashboard/recruiter/shortlist) — candidate/job_profile/job_posting shapes
// are identical to get_recruiter_matches, so we reuse those types.

import type {
  RecruiterMatchCandidate,
  RecruiterMatchJobProfile,
  RecruiterMatchJobPosting,
} from './match';

export interface ShortlistItem {
  candidate: RecruiterMatchCandidate;
  job_profile: RecruiterMatchJobProfile;
  job_posting: RecruiterMatchJobPosting;
  action: 'like' | 'ask_to_apply';
  shortlisted_at: string;
  already_invited: boolean;
  invite_count: number;
}
