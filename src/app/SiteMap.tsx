import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DS } from '../ds';
import { AREAS, EXTRA_PAGES, pageOf, pagesOf } from './nav';

/** Every page of the app, grouped by area – the phone's way to everything the desktop header offers.
 *  The current area comes first; the current page is marked. */
export function SiteMap({
  pathname,
  current,
  badges,
  onPick,
  footer,
}: {
  pathname: string;
  current?: string;
  badges?: Record<string, number | undefined>;
  onPick: () => void;
  footer?: ReactNode;
}) {
  const here = pageOf(pathname)?.href;
  const areas = [...AREAS].sort((a, b) => Number(b.value === current) - Number(a.value === current));
  const link = (p: { label: string; href: string; description?: string }) => (
    <li key={p.href}>
      <Link to={p.href} aria-current={p.href === here ? 'page' : undefined} onClick={onPick}>
        <span className="sitemap__label">
          {p.label}
          {badges?.[p.href] ? <span className="sitemap__badge">{badges[p.href]}</span> : null}
        </span>
        {p.description && <span className="sitemap__desc">{p.description}</span>}
      </Link>
    </li>
  );
  return (
    <nav className="sitemap" aria-label="Alle Seiten">
      {areas.map((a) => (
        <section key={a.value} className="sitemap__area">
          <h3 className="sitemap__head">
            <DS.Icon name={a.icon} size={16} />
            {a.label}
          </h3>
          <ul>{pagesOf(a).map(link)}</ul>
        </section>
      ))}
      <section className="sitemap__area">
        <h3 className="sitemap__head">
          <DS.Icon name="einstellungen" size={16} />
          Konto
        </h3>
        <ul>
          {EXTRA_PAGES.map(link)}
          {footer}
        </ul>
      </section>
    </nav>
  );
}
