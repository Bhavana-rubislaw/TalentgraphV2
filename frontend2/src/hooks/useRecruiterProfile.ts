import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';

export function useRecruiterProfile() {
  const [userFullName, setUserFullName] = useState(localStorage.getItem('full_name') || '');
  const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'admin');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.getCurrentUser();
      if (res.data.full_name) {
        setUserFullName(res.data.full_name);
        localStorage.setItem('full_name', res.data.full_name);
      }
      if (res.data.company_name) {
        setCompanyName(res.data.company_name);
        localStorage.setItem('company_name', res.data.company_name);
      }
      if (res.data.role) {
        setUserRole(res.data.role);
        localStorage.setItem('role', res.data.role);
      }
    } catch (err) {
    }
  }, []);

  return { userFullName, companyName, userRole, fetchProfile };
}
