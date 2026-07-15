/**
 * TypeScript types for the Candidate Recommendations domain.
 * Matches the response shape of GET /dashboard/candidate/recommendations
 * (backend2/app/routers/dashboard.py::get_candidate_recommendations) —
 * that endpoint is typed response_model=List[Dict[str, Any]] on the backend,
 * so this type is grounded in the actual dict construction, not a Pydantic schema.
 */
import type { MatchDetails } from '../components/MatchInsights';

export interface RecommendedJobPosting {
  id: number;
  job_title: string;
  company_id: number;
  company_name: string;
  location: string;
  worktype: string | null;
  employment_type: string | null;
  salary_min: number;
  salary_max: number;
  salary_currency: string | null;
  job_description: string;
  seniority_level: string;
  required_skills: string | null;
  product_vendor: string;
  product_type: string;
}

export interface CandidateRecommendation {
  job_posting: RecommendedJobPosting;
  match_percentage: number;
  match_details: MatchDetails;
  already_swiped: boolean;
  swipe_action: 'like' | 'pass' | 'ask_to_apply' | null;
  already_applied: boolean;
  is_match: boolean;
  recruiter_interested: boolean;
  recruiter_invited: boolean;
}
