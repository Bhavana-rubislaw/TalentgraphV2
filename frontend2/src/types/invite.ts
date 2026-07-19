// Grounded in backend2/app/routers/dashboard.py: get_recruiter_invites
// (GET /dashboard/candidate/recruiter-invites)

export interface InvitePostingSkill {
  skill_name: string;
  skill_category: string;
  rating: number;
}

export interface InviteJobPosting {
  id: number;
  job_title: string;
  location: string;
  worktype: string;
  employment_type: string;
  seniority_level: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  pay_type: string | null;
  job_description: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  start_date: string;
  end_date: string | null;
  job_category: string | null;
  travel_requirements: string | null;
  visa_info: string | null;
  education_qualifications: string | null;
  certifications_required: string | null;
  posting_skills: InvitePostingSkill[];
}

export interface InviteCompany {
  id: number;
  company_name: string;
  employee_type: string | null;
}

export interface RecruiterInvite {
  invite_id: number;
  job_profile_id: number;
  already_applied: boolean;
  job_posting: InviteJobPosting;
  company: InviteCompany;
  invite_count: number;
  created_at: string;
}
