import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('news-token'));
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const t = localStorage.getItem('news-token');
    if (!t) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    setToken(t);
    // We don't have a /me endpoint; token validity is checked on first API call
    // For now, decode JWT payload (base64) to get email - or we could add a /me endpoint
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      setUser({ id: payload.userId, email: payload.email });
    } catch {
      localStorage.removeItem('news-token');
      setUser(null);
      setToken(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onLogout = () => loadUser();
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await api.auth.login(email, password);
    localStorage.setItem('news-token', t);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await api.auth.register(email, password);
    localStorage.setItem('news-token', t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('news-token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
