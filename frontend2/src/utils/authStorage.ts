import type { AuthUser } from '../contexts/AuthContext';

export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('email');
  localStorage.removeItem('full_name');
  localStorage.removeItem('company_name');
  localStorage.removeItem('is_profile_complete');
}

export function syncAuthUserToStorage(user: AuthUser) {
  localStorage.setItem('user_id', String(user.user_id));
  localStorage.setItem('role', user.role);
  if (user.full_name) localStorage.setItem('full_name', user.full_name);
  if (user.company_name) localStorage.setItem('company_name', user.company_name);
  if (user.email) localStorage.setItem('email', user.email);
  localStorage.setItem('is_profile_complete', String(user.is_profile_complete));
}
