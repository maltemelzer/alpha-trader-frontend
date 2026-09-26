import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { DS } from '../ds';
import { useAuth } from '../auth/AuthProvider';
import { useMediaQuery } from '../lib/useMediaQuery';
import { LoginHero } from './LoginHero';
import './LoginPage.css';

export function LoginPage() {
  const { loggedIn, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wide = useMediaQuery('(min-width: 960px)');

  if (loggedIn) return <Navigate to={from} replace />;

  return (
    <div className="login">
      <LoginHero compact={!wide} />
      <div className="login__side">
        <div className="login__form">
          <DS.AuthForm
            mode="login"
            brand={<DS.Wordmark size={wide ? 'md' : 'sm'} />}
            loading={loading}
            error={error}
            resetHref="https://alpha-trader.com"
            onSubmit={async ({ username, password }) => {
              setLoading(true);
              setError(null);
              try {
                await login(username, password);
                navigate(from, { replace: true });
              } catch {
                setError('Anmeldung fehlgeschlagen. Bitte Spielername und Passwort prüfen.');
              } finally {
                setLoading(false);
              }
            }}
          />
        </div>
        <p className="login__note">Inoffizielle Oberfläche für Alpha-Trader – kein Angebot der Betreiber.</p>
      </div>
    </div>
  );
}
