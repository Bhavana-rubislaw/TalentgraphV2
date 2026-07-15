/**
 * TypeScript types for the Recruiter Applications domain.
 * Matches the response shape of GET /dashboard/recruiter/applications
 * (backend2/app/routers/dashboard.py::get_recruiter_applications) —
 * that endpoint is typed response_model=List[Dict[str, Any]] on the backend,
 * so this type is grounded in the actual dict construction, not a Pydantic schema.
 */

export interface ApplicationSkill {
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
}

export interface ApplicationResume {
  id: number;
  filename: string;
  uploaded_at: string;
}

export interface ApplicationCertification {
  id: number;
  name: string;
  issuer: string | null;
  filename: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  created_at: string | null;
}

export interface ApplicationCandidate {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
}

export interface ApplicationJobPosting {
  id: number;
  title: string;
  location: string;
}

export interface ApplicationJobProfile {
  id: number;
  profile_name: string;
  desired_role: string | null;
  desired_salary: string | null;
  desired_location: string | null;
  work_preference: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  other_social_url: string | null;
  skills: ApplicationSkill[];
  experience: number | null;
  education: string | null;
  certifications: ApplicationCertification[];
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
  resumes: ApplicationResume[];
}

export type ApplicationStatus =
  | 'applied'
  | 'scheduled'
  | 'under_review'
  | 'shortlisted'
  | 'selected'
  | 'rejected';

export interface Application {
  application_id: number;
  status: ApplicationStatus;
  applied_at: string;
  recruiter_notes: string | null;
  notes_updated_at: string | null;
  candidate: ApplicationCandidate;
  job_posting: ApplicationJobPosting;
  job_profile: ApplicationJobProfile;
}
