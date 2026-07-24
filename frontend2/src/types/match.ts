// Grounded in backend2/app/routers/dashboard.py:
// get_candidate_matches (GET /dashboard/candidate/matches)
// get_recruiter_matches (GET /dashboard/recruiter/matches)

export interface CandidateMatchPostingSkill {
  skill_name: string;
  rating: number | null;
}

export interface CandidateMatchJobPosting {
  id: number;
  job_title: string;
  location: string | null;
  job_description: string;
  job_role: string | null;
  product_vendor: string | null;
  product_type: string | null;
  seniority_level: string | null;
  worktype: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  start_date: string | null;
  end_date: string | null;
  education_qualifications: string | null;
  certifications_required: string | null;
  travel_requirements: string | null;
  visa_info: string | null;
  posting_skills: CandidateMatchPostingSkill[];
}

export interface CandidateMatchCompany {
  id: number;
  company_name: string;
  email: string | null;
  user_id: number;
}

export interface CandidateMatch {
  match_id: number;
  job_profile_id: number;
  job_posting: CandidateMatchJobPosting;
  company: CandidateMatchCompany;
  match_percentage: number;
  matched_at: string;
  already_applied: boolean;
}

export interface RecruiterMatchSkill {
  skill_name: string;
  skill_category: string | null;
  proficiency_level: string | null;
}

export interface RecruiterMatchLocationPreference {
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface RecruiterMatchResume {
  id: number;
  filename: string;
  storage_path: string;
  uploaded_at: string | null;
}

export interface RecruiterMatchCertification {
  id: number;
  name: string;
  issuer: string | null;
  filename: string | null;
  storage_path: string | null;
  issued_date: string | null;
  expiry_date: string | null;
}

export interface RecruiterMatchCandidate {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  location_state: string | null;
  location_county: string | null;
  profile_summary: string | null;
  resumes: RecruiterMatchResume[];
  certifications: RecruiterMatchCertification[];
}

export interface RecruiterMatchJobProfile {
  id: number;
  profile_name: string;
  job_role: string | null;
  product_vendor: string | null;
  product_type: string | null;
  years_of_experience: number | null;
  worktype: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  visa_status: string | null;
  seniority_level: string | null;
  highest_education: string | null;
  notice_period: string | null;
  profile_summary: string | null;
  availability_date: string | null;
  travel_willingness: string | null;
  shift_preference: string | null;
  remote_acceptance: string | null;
  relocation_willingness: string | null;
  pay_type: string | null;
  negotiability: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  other_social_url: string | null;
  skills: RecruiterMatchSkill[];
  location_preferences: RecruiterMatchLocationPreference[];
}

export interface RecruiterMatchJobPosting {
  id: number;
  job_title: string;
  location: string | null;
  seniority_level: string | null;
}

export interface RecruiterMatch {
  match_id: number;
  candidate: RecruiterMatchCandidate;
  job_profile: RecruiterMatchJobProfile;
  job_posting: RecruiterMatchJobPosting;
  match_percentage: number;
  matched_at: string;
}
