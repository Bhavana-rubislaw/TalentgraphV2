import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { clearAuthStorage, syncAuthUserToStorage } from '../utils/authStorage';

// ── Types ────────────────────────────────────────────────────────
export interface AuthUser {
  user_id: number;
  email: string;
  /** normalised to lowercase: candidate | recruiter | admin | hr */
  role: string;
  full_name: string;
  company_name?: string;
  is_profile_complete?: boolean;
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
          is_profile_complete: data.is_profile_complete ?? false,
        };
        setUser(authUser);
        
        // Sync back to localStorage so legacy reads still work
        syncAuthUserToStorage(authUser);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token is expired / invalid — hard-clear auth state
          clearAuthStorage();
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
    clearAuthStorage();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootStatus, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
