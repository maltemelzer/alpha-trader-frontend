import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { DS } from '../ds';
import { useMe, usePortfolio, useUnreadChats } from '../api/queries';
import { bookValue } from '../organisation/derive';
import { useAuth } from '../auth/AuthProvider';
import { useIsPhone } from '../lib/useMediaQuery';
import { AREAS, areaOf } from './nav';
import { Notifications } from './Notifications';
import { GlobalSearch } from './GlobalSearch';
import { MarketTape } from './MarketTape';
import { tickClass, useTick } from '../lib/useTick';
import './AppShell.css';
import './layout.css';

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const { logout } = useAuth();
  const me = useMe();
  const portfolio = usePortfolio();
  const book = portfolio.data ? bookValue(portfolio.data) : undefined;
  const [moreOpen, setMoreOpen] = useState(false);
  const valueTick = useTick(book);
  const unreadChats = useUnreadChats();
  const badges: Record<string, number | undefined> = { community: unreadChats || undefined, '/nachrichten': unreadChats || undefined };

  const current = areaOf(pathname);
  // Securities pages on the phone bring their own top bar and the TradeBar – no second bar at the bottom.
  const bare = isPhone && pathname.startsWith('/wertpapier/');

  const items = AREAS.map((a) => ({
    label: a.label,
    href: a.href,
    active: a.value === current,
    badge: badges[a.value],
    children: a.children?.map((c) => ({ ...c, active: pathname === c.href || pathname.startsWith(c.href + '/'), badge: badges[c.href] })),
  }));

  // Placeholders of the same size while the portfolio loads – otherwise search and nav jump sideways.
  const pending = <DS.Skeleton width="14ch" />;
  const stats = [
    <span key="d" className={`tick${tickClass(valueTick)}`}>
      <DS.HeaderStat label="Depotwert" value={book ?? pending} />
    </span>,
    <DS.HeaderStat key="b" label="Bargeld" value={portfolio.data?.cash ?? pending} />,
  ];

  const menu = (
    <DS.PlayerMenu
      key="p"
      name={me.data?.username ?? '…'}
      items={[
        { label: 'Einstellungen', href: '/einstellungen' },
        { divider: true },
        { label: 'Abmelden', onClick: logout },
      ]}
      onNavigate={(item, e) => {
        if (item.href) {
          e.preventDefault();
          navigate(item.href);
        }
      }}
    />
  );

  const bottomNav = {
    'aria-label': 'Bereiche',
    value: moreOpen ? 'mehr' : current,
    items: [
      ...AREAS.filter((a) => a.value !== 'highscores').map((a) => ({
        value: a.value,
        label: a.label,
        icon: a.icon,
        href: a.href ?? a.children?.[0].href,
        badge: badges[a.value],
      })),
      { value: 'mehr', label: 'Mehr', icon: 'menue' as const },
    ],
    onChange: (value: string, e: React.MouseEvent) => {
      e.preventDefault();
      if (value === 'mehr') return setMoreOpen(true);
      const a = AREAS.find((x) => x.value === value);
      const href = a?.href ?? a?.children?.[0].href;
      if (href) navigate(href);
    },
  };

  return (
    <div className={`shell${bare ? ' shell--bare' : ''}${isPhone && !bare ? ' shell--tabbar' : ''}`}>
      {!bare && (
        <DS.AppHeader
          brand="Alpha-Trader"
          brandHref="/"
          items={items}
          meta={[...(isPhone ? [] : [<GlobalSearch key="s" />]), ...stats, <Notifications key="n" />, menu]}
          bottomNav={bottomNav}
          renderLink={(item, { key, ...props }, children) => (
            <Link key={key} to={item.href ?? '/'} {...props}>
              {children}
            </Link>
          )}
        />
      )}
      {!bare && <MarketTape />}
      <main className="shell__main">
        <Outlet />
      </main>
      <DS.Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mehr">
        <MoreList onPick={() => setMoreOpen(false)}>
          <Link to="/highscores">Highscores</Link>
          <Link to="/einstellungen">Einstellungen</Link>
          <button type="button" onClick={logout}>
            Abmelden
          </button>
        </MoreList>
        <DS.AppFooter note="Inoffizielle Oberfläche für Alpha-Trader – kein Angebot der Betreiber." />
      </DS.Sheet>
    </div>
  );
}

function MoreList({ children, onPick }: { children: ReactNode[]; onPick: () => void }) {
  return (
    <ul className="more-list" onClick={onPick}>
      {children.map((c, i) => (
        <li key={i}>{c}</li>
      ))}
    </ul>
  );
}
