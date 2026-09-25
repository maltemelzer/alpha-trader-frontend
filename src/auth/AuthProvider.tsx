import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, login as apiLogin, LOGOUT_EVENT, setToken } from '../api/client';
import { disconnectLive } from '../api/live';

interface Auth {
  loggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loggedIn, setLoggedIn] = useState(() => !!getToken());

  const logout = useCallback(() => {
    setToken(null);
    disconnectLive();
    qc.clear();
    setLoggedIn(false);
  }, [qc]);

  const login = useCallback(async (username: string, password: string) => {
    await apiLogin(username, password);
    setLoggedIn(true);
  }, []);

  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, logout);
    return () => window.removeEventListener(LOGOUT_EVENT, logout);
  }, [logout]);

  const value = useMemo(() => ({ loggedIn, login, logout }), [loggedIn, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
