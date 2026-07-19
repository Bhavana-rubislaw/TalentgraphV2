// Grounded in backend2/app/routers/dashboard.py: get_applied_liked_jobs
// (GET /dashboard/candidate/applied-liked-jobs)

export interface AppliedLikedPostingSkill {
  skill_name: string;
  skill_category: string;
  rating: number;
}

export interface AppliedJob {
  application_id: number;
  job_id: number;
  job_title: string;
  company_name: string | null;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  pay_type: string | null;
  job_description: string;
  required_skills: string | null;
  posting_skills: AppliedLikedPostingSkill[];
  start_date: string;
  end_date: string | null;
  travel_requirements: string | null;
  visa_info: string | null;
  education_qualifications: string | null;
  certifications_required: string | null;
  status: string;
  interview_scheduled: boolean;
  applied_at: string;
}

export interface LikedJob {
  job_id: number;
  job_title: string;
  company_name: string | null;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  pay_type: string | null;
  job_description: string;
  required_skills: string | null;
  posting_skills: AppliedLikedPostingSkill[];
  start_date: string;
  end_date: string | null;
  travel_requirements: string | null;
  visa_info: string | null;
  education_qualifications: string | null;
  certifications_required: string | null;
  already_applied: boolean;
  liked_at: string;
}

export interface AppliedLikedJobs {
  applied_jobs: AppliedJob[];
  liked_jobs: LikedJob[];
}
