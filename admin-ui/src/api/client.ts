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
