import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  broadcastLogout,
  getToken,
  login as apiLogin,
  LOGOUT_EVENT,
  requestTokenFromOtherTabs,
  setToken,
} from '../api/client';
import { disconnectLive } from '../api/live';

interface Auth {
  loggedIn: boolean;
  /** true while a new tab asks the open ones for their login */
  checking: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loggedIn, setLoggedIn] = useState(() => !!getToken());
  const [checking, setChecking] = useState(() => !getToken());

  useEffect(() => {
    if (!checking) return;
    let alive = true;
    requestTokenFromOtherTabs().then((token) => {
      if (!alive) return;
      if (token) setLoggedIn(true);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [checking]);

  const logout = useCallback(() => {
    setToken(null);
    broadcastLogout();
    disconnectLive();
    qc.clear();
    setLoggedIn(false);
  }, [qc]);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    await apiLogin(username, password, remember);
    setLoggedIn(true);
  }, []);

  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, logout);
    return () => window.removeEventListener(LOGOUT_EVENT, logout);
  }, [logout]);

  const value = useMemo(() => ({ loggedIn, checking, login, logout }), [loggedIn, checking, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
