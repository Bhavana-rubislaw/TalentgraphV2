// Grounded in backend2/app/routers/dashboard.py: get_available_jobs
// (GET /dashboard/candidate/available-jobs)

export interface AvailableJob {
  id: number;
  job_title: string;
  company_name: string;
  location: string;
  worktype: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  job_description: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  created_at: string;
  already_applied: boolean;
}
