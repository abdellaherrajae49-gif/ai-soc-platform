import React, { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, getMe } from '../api/api';

export type Role = 'employee' | 'expert' | 'admin';

export interface AuthUser {
  username: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem('soc_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(username, password);
      const { token, role } = response.data;
      const authUser: AuthUser = { username, role: role as Role };

      localStorage.setItem('soc_jwt', token);
      localStorage.setItem('soc_user', JSON.stringify(authUser));
      setUser(authUser);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Erreur de connexion';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('soc_jwt');
    localStorage.removeItem('soc_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
