import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach admin token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  api.post('/auth/admin/login', { email, password });

export const getMe = () => api.get('/auth/me');

// ─── Admin: Overview ─────────────────────────────────────────────
export const getOverview = () => api.get('/api/admin/overview');

// ─── Admin: Users ────────────────────────────────────────────────
export const listUsers = (params: {
  search?: string;
  role?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}) => api.get('/api/admin/users', { params });

export const getUser = (userId: number) => api.get(`/api/admin/users/${userId}`);

export const updateUserStatus = (userId: number, is_active: boolean) =>
  api.patch(`/api/admin/users/${userId}/status`, { is_active });

export const updateUserRole = (userId: number, role: string) =>
  api.patch(`/api/admin/users/${userId}/role`, { role });

export const deleteUser = (userId: number) =>
  api.delete(`/api/admin/users/${userId}`);

// ─── Admin: Job Postings ──────────────────────────────────────────
export const listJobPostings = (params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get('/api/admin/job-postings', { params });

export const updateJobStatus = (jobId: number, status: string) =>
  api.patch(`/api/admin/job-postings/${jobId}/status`, { status });

// ─── Admin: Job Preferences ───────────────────────────────────────
export const listJobPreferences = (params: {
  search?: string;
  worktype?: string;
  employment_type?: string;
  visa_status?: string;
  seniority_level?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get('/api/admin/job-preferences', { params });

// ─── Logs ────────────────────────────────────────────────────────
export const getLogs = (params: {
  level?: string;
  module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => api.get('/api/logs', { params });

export const getLogStats = () => api.get('/api/logs/stats');

// ─── Product Taxonomy ─────────────────────────────────────────────
export const getVendors = (search?: string) =>
  api.get('/product-taxonomy/vendors', { params: { search, limit: 200 } });

export const getProductTypes = (vendorId: number) =>
  api.get(`/product-taxonomy/vendors/${vendorId}/product-types`);

export const getRoles = (typeId: number) =>
  api.get(`/product-taxonomy/product-types/${typeId}/roles`);

export const createCustomVendor = (name: string) =>
  api.post('/product-taxonomy/vendors/custom', { name });

export const createCustomProductType = (vendor_id: number, name: string) =>
  api.post('/product-taxonomy/product-types/custom', { vendor_id, name });

export const createCustomRole = (product_type_id: number, name: string) =>
  api.post('/product-taxonomy/roles/custom', { product_type_id, name });

// ─── Admin: Analytics ─────────────────────────────────────────────

export interface AnalyticsSummary {
  total_signups: number;
  total_views: number;
  total_applications: number;
  total_interviews: number;
  total_hires: number;
  average_time_to_hire_days: number | null;
}

export interface UserSignupPoint {
  date: string;        // "YYYY-MM-DD"
  total: number;
  candidates: number;
  recruiters: number;
  hr: number;
  admins: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversion_from_previous: number;
  conversion_from_views: number;
}

export interface JobsCreatedPoint {
  week_start: string;  // "YYYY-MM-DD"
  created: number;
}

export interface JobStatusBreakdown {
  status: string;
  count: number;
}

export interface TopCompany {
  company_id: number;
  company_name: string;
  jobs_created: number;
  applications: number;
  interviews: number;
  hires: number;
  activity_score: number;
}

export interface AdminAnalyticsResponse {
  range_days: number;
  start_date: string;
  end_date: string;
  summary: AnalyticsSummary;
  user_signups: UserSignupPoint[];
  application_funnel: FunnelStage[];
  jobs_created: JobsCreatedPoint[];
  job_status_breakdown: JobStatusBreakdown[];
  top_companies: TopCompany[];
}

export const getAdminAnalytics = (rangeDays: 7 | 30 | 90) =>
  api.get<AdminAnalyticsResponse>('/api/admin/analytics', {
    params: { range_days: rangeDays },
  });

// ─── Admin: Companies (Organizations) ────────────────────────────────────────

export interface CompanySummary {
  id: number;
  name: string;
  industry: string | null;
  company_size: string | null;
  is_active: boolean;
  website: string | null;
  location: string | null;
  recruiter_count: number;
  hr_count: number;
  active_job_count: number;
  total_job_count: number;
  created_at: string | null;
}

export interface CompanyListResponse {
  companies: CompanySummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanyMember {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface CompanyJobSummary {
  id: number;
  title: string;
  status: string;
  created_at: string | null;
  application_count: number;
}

export interface CompanyDetail {
  id: number;
  name: string;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  location: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  recruiters: CompanyMember[];
  hr_members: CompanyMember[];
  job_counts_by_status: Record<string, number>;
  recent_jobs: CompanyJobSummary[];
  total_applications: number;
}

export const listCompanies = (params: {
  search?: string;
  industry?: string;
  company_size?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}) => api.get<CompanyListResponse>('/api/admin/companies', { params });

export const getCompany = (organizationId: number) =>
  api.get<CompanyDetail>(`/api/admin/companies/${organizationId}`);

export const updateCompanyStatus = (organizationId: number, is_active: boolean) =>
  api.patch(`/api/admin/companies/${organizationId}/status`, { is_active });

// ─── Admin: Applications ─────────────────────────────────────────────────────

export interface ApplicationListItem {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  job_id: number;
  job_title: string;
  organization_id: number | null;
  company_name: string;
  operational_status: string;
  display_status: string;
  applied_at: string | null;
  last_status_updated_at: string | null;
  days_in_current_status: number;
  is_stuck: boolean;
}

export interface ApplicationListResponse {
  applications: ApplicationListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TimelineEvent {
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
  performed_by: string | null;
}

export interface ApplicationDetail {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  job_id: number;
  job_title: string;
  company_id: number | null;
  company_name: string | null;
  organization_id: number | null;
  operational_status: string;
  display_status: string;
  applied_at: string | null;
  last_status_updated_at: string | null;
  recruiter_notes: string | null;
  timeline: TimelineEvent[];
}

export const listApplications = (params: {
  search?: string;
  job_id?: number;
  candidate_id?: number;
  organization_id?: number;
  status?: string;
  stuck_days?: number;
  applied_from?: string;
  applied_to?: string;
  limit?: number;
  offset?: number;
}) => api.get<ApplicationListResponse>('/api/admin/applications', { params });

export const getApplication = (applicationId: number) =>
  api.get<ApplicationDetail>(`/api/admin/applications/${applicationId}`);

export const getApplicationTimeline = (applicationId: number) =>
  api.get<TimelineEvent[]>(`/api/admin/applications/${applicationId}/timeline`);

// ─── Admin: Create User ────────────────────────────────────────────────────────

export interface CreateUserRequest {
  full_name: string;
  email: string;
  role: string;
  organization_id?: number;
  temporary_password?: string;
}

export interface CreateUserResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  temporary_password_generated: boolean;
}

export const createUser = (data: CreateUserRequest) =>
  api.post<CreateUserResponse>('/api/admin/users', data);

// ─── Admin: Invitations ───────────────────────────────────────────────────────

export interface InvitationSummary {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id: number | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationListResponse {
  invitations: InvitationSummary[];
  total: number;
  limit: number;
  offset: number;
}

export const createInvitation = (data: {
  full_name: string;
  email: string;
  role: string;
  organization_id?: number;
}) => api.post<InvitationSummary>('/api/admin/invitations', data);

export const listInvitations = (params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get<InvitationListResponse>('/api/admin/invitations', { params });

export const resendInvitation = (invitationId: number) =>
  api.post(`/api/admin/invitations/${invitationId}/resend`);

// ─── Admin: Bulk Actions ─────────────────────────────────────────────────────

export interface BulkResult {
  id: number;
  ok: boolean;
  error?: string;
}

export interface BulkActionResponse {
  requested: number;
  succeeded: number;
  failed: number;
  results: BulkResult[];
}

export const bulkUserAction = (user_ids: number[], action: string) =>
  api.post<BulkActionResponse>('/api/admin/users/bulk-action', { user_ids, action });

export const bulkJobAction = (job_ids: number[], action: string) =>
  api.post<BulkActionResponse>('/api/admin/job-postings/bulk-action', { job_ids, action });

export const bulkCompanyAction = (org_ids: number[], action: string) =>
  api.post<BulkActionResponse>('/api/admin/companies/bulk-action', { org_ids, action });

export const bulkJobPrefAction = (profile_ids: number[], action: string) =>
  api.post<BulkActionResponse>('/api/admin/job-preferences/bulk-action', { profile_ids, action });

// ─── Admin: CSV Exports ────────────────────────────────────────────────────────

export const exportUsersCSV = (params: {
  search?: string;
  role?: string;
  is_active?: boolean;
}) => api.get('/api/admin/users/export.csv', { params, responseType: 'blob' });

export const exportJobsCSV = (params: {
  search?: string;
  status?: string;
}) => api.get('/api/admin/job-postings/export.csv', { params, responseType: 'blob' });

export const exportApplicationsCSV = (params: {
  search?: string;
  job_id?: number;
  candidate_id?: number;
  organization_id?: number;
  status?: string;
  applied_from?: string;
  applied_to?: string;
}) => api.get('/api/admin/applications/export.csv', { params, responseType: 'blob' });

// ─── Admin: Email Logs ────────────────────────────────────────────────────────

export interface EmailDeliverySummary {
  id: number;
  recipient_email: string;
  event_type: string;
  subject: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
}

export interface EmailDeliveryListResponse {
  deliveries: EmailDeliverySummary[];
  total: number;
  limit: number;
  offset: number;
}

export const listEmailDeliveries = (params: {
  search?: string;
  event_type?: string;
  status?: string;
  sent_from?: string;
  sent_to?: string;
  limit?: number;
  offset?: number;
}) => api.get<EmailDeliveryListResponse>('/api/admin/email-deliveries', { params });

export const getEmailDelivery = (deliveryId: number) =>
  api.get<EmailDeliverySummary>(`/api/admin/email-deliveries/${deliveryId}`);

export const resendEmailDelivery = (deliveryId: number) =>
  api.post(`/api/admin/email-deliveries/${deliveryId}/resend`);

