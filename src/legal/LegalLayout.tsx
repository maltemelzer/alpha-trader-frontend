import { useEffect, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { DS } from '../ds';
import { useAuth } from '../auth/AuthProvider';
import { useLegalConfig, isComplete } from './config';
import './legal.css';

/**
 * Frame of Impressum and Datenschutz: reachable without login, outside the app shell. Long text – the
 * page scrolls on purpose (exception to „one page = one screen“).
 */
export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const { loggedIn } = useAuth();
  useNoIndex();
  return (
    <div className="legal">
      <header className="legal__head">
        <DS.Wordmark size="sm" href="/" />
        <nav className="legal__nav" aria-label="Rechtliches">
          <NavLink to="/impressum">Impressum</NavLink>
          <NavLink to="/datenschutz">Datenschutz</NavLink>
          <Link to="/">{loggedIn ? 'Zur App' : 'Zur Anmeldung'}</Link>
        </nav>
      </header>
      <main className="legal__main">
        <h1 className="legal__title">{title}</h1>
        {children}
      </main>
    </div>
  );
}

/**
 * Keeps search engines from listing these pages (name and address). nginx also sends `X-Robots-Tag`
 * for them – this meta tag covers crawlers that render the app and the dev server.
 */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** Name and address block, or a notice while LEGAL_* are not set. */
export function Operator({ withContact = true }: { withContact?: boolean }) {
  const { data, isLoading } = useLegalConfig();
  if (isLoading) return <DS.Skeleton variant="text" lines={4} />;
  if (!data || !isComplete(data))
    return (
      <DS.Banner variant="info" title="Angaben zum Anbieter fehlen">
        Die Angaben werden gerade ergänzt. {import.meta.env.DEV && 'Entwicklung: LEGAL_NAME, LEGAL_STREET, LEGAL_CITY und LEGAL_EMAIL in der .env setzen.'}
      </DS.Banner>
    );
  return (
    <address className="legal__address">
      {data.name}
      <br />
      {data.street}
      <br />
      {data.city}
      {data.country && (
        <>
          <br />
          {data.country}
        </>
      )}
      {withContact && (
        <>
          <br />
          <br />
          E-Mail: <a href={`mailto:${data.email}`}>{data.email}</a>
          {data.phone && (
            <>
              <br />
              Telefon: {data.phone}
            </>
          )}
        </>
      )}
    </address>
  );
}
