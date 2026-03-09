import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

// ── Types ────────────────────────────────────────────────────────
export interface AuthUser {
  user_id: number;
  email: string;
  /** normalised to lowercase: candidate | recruiter | admin | hr */
  role: string;
  full_name: string;
  company_name?: string;
}

type BootStatus = 'loading' | 'done';

interface AuthContextValue {
  user: AuthUser | null;
  /** 'loading' while the /auth/me boot call is in flight; 'done' once resolved */
  bootStatus: BootStatus;
  logout: () => void;
  /** Call after a successful login to update context without re-requesting /me */
  setUser: (u: AuthUser | null) => void;
}

// ── Context ──────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  bootStatus: 'done',
  logout: () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Provider ─────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootStatus, setBootStatus] = useState<BootStatus>(() => {
    // If no token exists skip the loading phase entirely
    return localStorage.getItem('token') ? 'loading' : 'done';
  });

  // ── Boot: validate token against backend on startup ────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setBootStatus('done');
      return;
    }

    apiClient
      .getCurrentUser()
      .then((res) => {
        const data = res.data;
        const authUser: AuthUser = {
          user_id: data.user_id,
          email: data.email ?? '',
          role: (data.role ?? '').toString().toLowerCase().trim(),
          full_name: data.full_name ?? '',
          company_name: data.company_name,
        };
        setUser(authUser);
        // Sync back to localStorage so legacy reads still work
        localStorage.setItem('user_id', String(authUser.user_id));
        localStorage.setItem('role', authUser.role);
        if (authUser.full_name) localStorage.setItem('full_name', authUser.full_name);
        if (authUser.company_name) localStorage.setItem('company_name', authUser.company_name);
        if (authUser.email) localStorage.setItem('email', authUser.email);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token is expired / invalid — hard-clear auth state
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('email');
          localStorage.removeItem('full_name');
          localStorage.removeItem('company_name');
          setUser(null);
        }
        // Network error (status undefined) → keep existing localStorage state;
        // the ProtectedRoute will fall back to localStorage.
      })
      .finally(() => {
        setBootStatus('done');
      });
  }, []); // runs once on app mount

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('email');
    localStorage.removeItem('full_name');
    localStorage.removeItem('company_name');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootStatus, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
