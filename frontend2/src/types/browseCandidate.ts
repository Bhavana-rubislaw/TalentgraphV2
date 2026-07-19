// Grounded in backend2/app/routers/dashboard.py: browse_all_candidates
// (GET /dashboard/recruiter/candidates)

export interface BrowseCandidateSkill {
  skill_name: string;
  proficiency_level: string;
}

export interface BrowseCandidateJobProfile {
  id: number;
  profile_name: string;
  job_role: string;
  product_vendor: string;
  product_type: string;
  years_of_experience: number;
  worktype: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  seniority_level: string;
}

export interface BrowseCandidate {
  candidate_id: number;
  user_id: number;
  full_name: string;
  email: string;
  headline: string;
  location: string;
  years_experience: number;
  skills: BrowseCandidateSkill[];
  work_type: string | null;
  availability: string;
  profile_summary: string;
  job_profiles: BrowseCandidateJobProfile[];
  already_liked: boolean;
  already_invited: boolean;
  invite_count: number;
}

export interface BrowseCandidatesResponse {
  items: BrowseCandidate[];
  page: number;
  limit: number;
  total: number;
}
