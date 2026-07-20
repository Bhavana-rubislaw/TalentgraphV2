// Shared types for the Job Posting Builder page and its extracted view
// components (JobPostingListView, JobPostingFormView).

export interface PostingSkill {
  id?: number;
  skill_name: string;
  skill_category: 'technical' | 'soft';
  rating: number;
}

export interface JobPostingFormData {
  job_title: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  pay_type: string;
  job_description: string;
  job_category: string;
  travel_requirements: string;
  visa_info: string;
  education_qualifications: string;
  certifications_required: string[];
  skills: PostingSkill[];
}

export interface JobPosting {
  id: number;
  company_id: number;
  job_title: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  start_date: string;
  end_date?: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  pay_type?: string;
  job_description: string;
  job_category?: string;
  travel_requirements?: string;
  visa_info?: string;
  education_qualifications?: string;
  certifications_required?: string;
  required_skills?: string;
  posting_skills: PostingSkill[];
  is_active: boolean;
  status?: string; // 'active', 'frozen', 'reposted', 'cancelled'
  frozen_at?: string;
  reposted_at?: string;
  last_reactivated_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Catalogs {
  technical_skills: string[];
  soft_skills: string[];
  certifications: string[];
}
