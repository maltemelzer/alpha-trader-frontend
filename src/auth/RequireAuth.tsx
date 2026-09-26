import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loggedIn, checking } = useAuth();
  const location = useLocation();
  // A new tab first asks the open ones for their login (~¼ s) – no flash of the login page.
  if (checking) return null;
  if (!loggedIn) return <Navigate to="/anmelden" replace state={{ from: location.pathname }} />;
  return children;
}
