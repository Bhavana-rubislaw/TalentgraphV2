import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe } from '../api/client';

export interface AdminUser {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthCtx {
  user: AdminUser | null;
  bootStatus: 'loading' | 'done';
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  bootStatus: 'done',
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [bootStatus, setBootStatus] = useState<'loading' | 'done'>(() =>
    localStorage.getItem('admin_token') ? 'loading' : 'done'
  );

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setBootStatus('done'); return; }

    getMe()
      .then((res) => {
        const d = res.data;
        const role = (d.role ?? '').toLowerCase();
        if (role !== 'admin') {
          // Not an admin — clear session
          localStorage.removeItem('admin_token');
          setUser(null);
        } else {
          setUser({ user_id: d.user_id, email: d.email, full_name: d.full_name ?? '', role });
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        setUser(null);
      })
      .finally(() => setBootStatus('done'));
  }, []);

  const login = useCallback((token: string, u: AdminUser) => {
    localStorage.setItem('admin_token', token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
