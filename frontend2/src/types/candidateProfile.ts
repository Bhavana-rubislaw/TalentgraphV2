// Grounded in backend2/app/schemas.py: CandidateRead, JobProfileRead
// (used as response_model by GET /candidates/profile and GET /candidates/job-profiles
// in backend2/app/routers/candidates.py)

export interface ResumeSummary {
  id: number;
  filename: string;
  uploaded_at: string;
}

export interface CertificationSummary {
  id: number;
  name: string;
  issuer: string | null;
  issued_date: string | null;
  expiry_date: string | null;
}

export interface JobProfileSkill {
  id: number;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
}

export interface JobProfileLocationPreference {
  id: number;
  city: string;
  state: string;
  country: string | null;
}

export interface JobProfile {
  id: number;
  candidate_id: number;
  profile_name: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  years_of_experience: number;
  worktype: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  visa_status: string;
  resume_id: number | null;
  certification_ids: string | null;
  ethnicity: string | null;
  availability_date: string | null;
  profile_summary: string | null;
  preferred_job_titles: string | null;
  job_category: string | null;
  seniority_level: string | null;
  travel_willingness: string | null;
  shift_preference: string | null;
  remote_acceptance: string | null;
  relocation_willingness: string | null;
  pay_type: string | null;
  negotiability: string | null;
  core_strengths: string | null;
  relevant_experience: number | null;
  notice_period: string | null;
  start_date_preference: string | null;
  security_clearance: string | null;
  highest_education: string | null;
  primary_resume_id: number | null;
  attached_resume_ids: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  skills: JobProfileSkill[];
  location_preferences: JobProfileLocationPreference[];
  created_at: string;
  updated_at: string | null;
}

export interface CandidateProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  residential_address: string;
  location_state: string;
  location_county: string;
  location_zipcode: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  profile_summary: string | null;
  resumes: ResumeSummary[];
  certifications: CertificationSummary[];
  job_profiles: JobProfile[];
  created_at: string;
}
