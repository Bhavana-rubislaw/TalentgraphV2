// Grounded in backend2/app/schemas.py: JobPostingRead (used as response_model
// by GET /jobs in backend2/app/routers/job_postings.py)

export interface JobPostingSkill {
  id: number;
  skill_name: string;
  skill_category: string;
  rating: number;
}

export type JobPostingStatus = 'active' | 'frozen' | 'reposted' | 'cancelled';

export interface JobPosting {
  id: number;
  company_id: number;
  job_title: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: 'remote' | 'hybrid' | 'onsite';
  location: string;
  employment_type: 'ft' | 'pt' | 'contract' | 'c2c' | 'w2';
  start_date: string;
  salary_min: number;
  salary_max: number;
  salary_currency: 'usd' | 'gbp' | 'eur';
  job_description: string;
  end_date: string | null;
  job_category: string | null;
  travel_requirements: string | null;
  visa_info: string | null;
  education_qualifications: string | null;
  certifications_required: string | null;
  pay_type: string | null;
  required_skills: string | null;
  is_active: boolean;
  status: JobPostingStatus;
  frozen_at: string | null;
  reposted_at: string | null;
  last_reactivated_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  posting_skills: JobPostingSkill[];
}
