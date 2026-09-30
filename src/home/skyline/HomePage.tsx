import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DS } from '../../ds';
import {
  useAllPriceChanges,
  useCapitalMeasures,
  useDividendPayments,
  useInterestTender,
  useListings,
  useMainInterestRate,
  useMe,
  useMergers,
  useMinimalStats,
  useMyChats,
  useNews,
  usePortfolio,
  useRecentTrades,
  type PostView,
} from '../../api/queries';
import type { SecurityOrderLogEntryView } from '../../api/types';
import { changeLookup } from '../../market/screener';
import { bookValue } from '../../organisation/derive';
import { chatTitle } from '../../chat/derive';
import { mergeTrades, tradesPerMinute, withTicks } from '../../app/tape';
import { MiniStats, useEdgeFade } from '../../app/phone';
import { useIsPhone, useMediaQuery } from '../../lib/useMediaQuery';
import { useNow } from '../../lib/useNow';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { tickClass, useTick } from '../../lib/useTick';
import { Skyline } from './Skyline';
import { useCityListings, useTradeSeed } from './queries';
import {
  ago,
  articleAsins,
  countdown,
  edition,
  isFreshUnread,
  nextEvents,
  pickTowers,
  recentCounts,
  tenderProgress,
  towerKeyOf,
  towerLabel,
  when,
  type CityEvent,
  type ListingRow,
  type Tower,
  type TowerData,
} from './derive';
import './HomePage.css';

const NBSP = String.fromCharCode(0xa0);
const EMPTY_TRADES: SecurityOrderLogEntryView[] = [];
const EMPTY_ROWS: ListingRow[] = [];
const VOLUME_24H = 'Umsatz 24 Std.';

type KeyOf = (asin: string | undefined) => string | undefined;

/**
 * Start page „Skyline“: the market as a city at night. Every busy security is a tower – height from the
 * 24 h volume, roof and facade from the change to the previous day, own positions fly a brass flag, and
 * each trade lights windows in its tower. The news hang in the sky above and point at their towers, the
 * moon is the central bank's clock, the street below carries the book value and the pace of the market.
 * Phone: the city becomes a panorama to swipe, the news below, „Handeln“ at the bottom.
 */
export function HomePage() {
  const phone = useIsPhone();
  const short = useMediaQuery('(max-height: 780px)');
  const onClick = useInternalLinks();
  const navigate = useNavigate();
  const now = useNow(5000);

  const news = useNews('');
  const posts = useMemo(() => news.data?.pages[0]?.content ?? [], [news.data]);
  const events = useEvents(now, phone);
  const featured = useMemo(
    () => [...posts.slice(0, 6).flatMap(articleAsins), ...events.flatMap((e) => (e.asin ? [e.asin] : []))],
    [posts, events],
  );

  const city = useCity(featured);
  const recent = useRecentTrades();
  const seed = useTradeSeed();
  const live = recent.data ?? EMPTY_TRADES;
  const all = useMemo(() => mergeTrades(live, seed.data ?? [], 5000), [live, seed.data]);
  const keyOf = useKeyOf(city.towers, city.rows, all);
  const counts = useMemo(() => {
    const out = new Map<string, number>();
    for (const [asin, n] of recentCounts(all, now)) {
      const k = keyOf(asin);
      if (k) out.set(k, (out.get(k) ?? 0) + n);
    }
    return out;
  }, [all, now, keyOf]);
  const perMin = useMemo(() => tradesPerMinute(withTicks(all), now), [all, now]);
  const tradesReady = !!seed.data || !!recent.data;

  const stats = useMinimalStats();
  const portfolio = usePortfolio();
  const book = portfolio.data ? bookValue(portfolio.data) : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const select = (asin: string | null, via: 'hover' | 'tap') => {
    if (via === 'hover' && pinned && asin == null) return;
    setPinned(via === 'tap' && asin != null);
    setSelected(asin);
  };
  const byAsin = useMemo(() => new Map(city.towers.map((t) => [t.asin, t])), [city.towers]);
  const open = (asin: string) => navigate(byAsin.get(asin)?.href ?? `/wertpapier/${asin}`);

  const panRef = useRef<HTMLDivElement>(null);
  useEdgeFade(panRef, '.skyl-city', undefined, phone ? city.towers.length : 0);

  const hour = new Date(now).getHours();
  const date = new Date(now).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const ed = edition(hour);

  const skyProps = { now, posts, loading: news.isLoading, events, keyOf, active: selected, onHover: setHover };

  const cityEl = (
    <Skyline
      towers={city.towers}
      trades={live}
      keyOf={keyOf}
      counts={counts}
      highlight={hover}
      selected={selected}
      onSelect={select}
      onOpen={open}
      panorama={phone}
      loading={city.loading}
    >
      {phone ? undefined : (t, pos) => <TowerCard t={t} pos={pos} onClose={() => select(null, 'tap')} />}
    </Skyline>
  );

  if (phone) {
    return (
      <div className="page skyl skyl--phone" onClick={onClick}>
        <h1 className="bnk-sr">Start</h1>
        <div className="skyl__top">
          <p className="skyl__meta">
            {ed} · {date} · {time}
          </p>
          <MiniStats
            label="Markt und Depot"
            items={[
              { label: 'Dein Depot', value: <BookValue value={book} /> },
              { label: 'Trades/Min.', value: tradesReady ? perMin.toLocaleString('de-DE') : NBSP },
              { label: VOLUME_24H, value: stats.data ? <DS.Amount value={stats.data.tradeVolume24h} compact="auto" /> : NBSP },
            ]}
          />
        </div>
        <div className="skyl__body">
          <div className="skyl__citywrap" ref={panRef}>
            {cityEl}
          </div>
          <div className="skyl__phonenews">
            <Sky {...skyProps} compact phone />
          </div>
          <PhoneTowerStrip t={selected ? byAsin.get(selected) : undefined} onOpen={open} />
        </div>
      </div>
    );
  }

  return (
    <div className="page skyl" onClick={onClick}>
      <h1 className="bnk-sr">Start</h1>
      <div className="skyl__body">
        <Sky {...skyProps} compact={short} edition={ed} date={`${date} · ${time}`} />
        <div className="skyl__citywrap">
          {cityEl}
          <Moon now={now} />
        </div>
        <Street book={book} perMin={tradesReady ? perMin : undefined} volume24h={stats.data?.tradeVolume24h} online={stats.data?.numberOfOnlineUsers} />
      </div>
    </div>
  );
}

/** The towers: busiest securities per district with their change, news companies, own positions marked. */
function useCity(featured: string[]) {
  const listings = useCityListings();
  const changes = useAllPriceChanges();
  const portfolio = usePortfolio();
  const rows = listings.data ?? EMPTY_ROWS;
  const featuredKey = featured.join(',');
  const towers = useMemo(() => {
    const lookup = changeLookup(changes.data?.winners, changes.data?.losers);
    const own = (portfolio.data?.positions ?? []).map((p) => ({
      asin: p.securityIdentifier,
      name: p.listing?.name ?? p.securityIdentifier,
      type: p.listing?.type ?? p.type,
      price: p.lastPrice?.value ?? null,
    }));
    return pickTowers(rows, lookup?.map ?? null, lookup?.complete ?? false, own, { featured: featuredKey ? featuredKey.split(',') : [] });
  }, [rows, changes.data, portfolio.data, featuredKey]);
  return { towers, rows, loading: listings.isLoading };
}

/**
 * Tower of an ASIN. Buildings go to the tower of their size – known from the busiest list, else from
 * their listing name (the market tape has fetched most of them already, same cache).
 */
function useKeyOf(towers: TowerData[], rows: ListingRow[], trades: SecurityOrderLogEntryView[]): KeyOf {
  const keys = useMemo(() => new Set(towers.map((t) => t.asin)), [towers]);
  const known = useMemo(() => Object.fromEntries(rows.filter((r) => r.type === 'BUILDING').map((r) => [r.asin, r.name])), [rows]);
  const unknown = useMemo(() => {
    const out = new Set<string>();
    for (const t of trades) {
      const a = t.securityIdentifier;
      if (a?.startsWith('BD') && !known[a]) out.add(a);
      if (out.size >= 40) break;
    }
    return [...out];
  }, [trades, known]);
  const fetched = useListings(unknown);
  return useCallback(
    (asin: string | undefined) => towerKeyOf(asin, keys, asin && !known[asin] ? { [asin]: fetched[asin]?.name } : known),
    [keys, known, fetched],
  );
}

function BookValue({ value }: { value: number | undefined }) {
  const tick = useTick(value);
  return <span className={`tick${tickClass(tick)}`}>{value != null ? <DS.Amount value={value} compact="auto" /> : <DS.Skeleton width="8ch" />}</span>;
}

/* ------------------------------------------------------------------ tower details */

function TowerFacts({ t }: { t: TowerData }) {
  const buildings = t.type === 'BUILDING';
  return (
    <dl className="skyl-facts">
      <div>
        <dt>{buildings ? 'Gehandelt' : 'Kurs'}</dt>
        <dd>{buildings ? `${(t.count ?? 0).toLocaleString('de-DE')} Geb.` : t.price != null ? <DS.Amount value={t.price} compact={1e6} /> : '–'}</dd>
      </div>
      <div>
        <dt>Zum Vortag</dt>
        <dd>{t.change != null ? <DS.PriceChange value={t.change} size="sm" /> : '–'}</dd>
      </div>
      <div>
        <dt>{VOLUME_24H}</dt>
        <dd>{t.volume != null ? <DS.Amount value={t.volume} compact={1e6} /> : 'kaum'}</dd>
      </div>
    </dl>
  );
}

const CARD_W = 280;
const CARD_H = 136;

/** Wide: the card right above the hovered or focused tower's roof, with „Handeln“. */
function TowerCard({ t, pos, onClose }: { t: Tower; pos: { left: number; top: number; width: number }; onClose: () => void }) {
  const navigate = useNavigate();
  const left = Math.max(8, Math.min(pos.width - CARD_W - 8, pos.left - CARD_W / 2));
  const top = pos.top - CARD_H - 6;
  // the little pointer stays over the tower even when the card is pushed from the edge
  const tip = Math.max(14, Math.min(CARD_W - 14, pos.left - left));
  return (
    <div
      className="skyl-card"
      style={{ left, top, width: CARD_W, height: CARD_H, ['--tip' as string]: `${tip}px` }}
      role="dialog"
      aria-label={towerLabel(t)}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="skyl-card__head">
        <Link to={t.href} className="skyl-card__name">
          {towerLabel(t)}
        </Link>
        <span className="skyl-card__asin">
          {t.type === 'BUILDING' ? 'alle Gebäude dieser Größe' : t.asin}
          {t.own && <b className="skyl-card__own"> · in deinem Depot</b>}
        </span>
      </div>
      <TowerFacts t={t} />
      <DS.Button variant="primary" size="sm" fullWidth onClick={() => navigate(t.href)}>
        {t.type === 'BUILDING' ? 'Gebäude ansehen' : 'Handeln'}
      </DS.Button>
    </div>
  );
}

/** Phone: a fixed strip at the bottom (thumb zone) – the tapped tower, or how to read the city. */
function PhoneTowerStrip({ t, onOpen }: { t: TowerData | undefined; onOpen: (asin: string) => void }) {
  if (!t) {
    return (
      <p className="skyl-strip skyl-strip--hint">
        Höhe = {VOLUME_24H} · ▲▼ zum Vortag · Fenster leuchten bei Trades · <span className="skyl-flagmark" aria-hidden="true" /> dein Depot.{' '}
        <b>Tippe auf einen Turm.</b>
      </p>
    );
  }
  return (
    <div className="skyl-strip">
      <div className="skyl-strip__name">
        <b>{towerLabel(t)}</b>
        <span>
          {t.type === 'BUILDING'
            ? `${(t.count ?? 0).toLocaleString('de-DE')} Geb. gehandelt`
            : t.price != null
              ? DS.format.price(t.price, t.type)
              : '–'}{' '}
          {t.change != null && <DS.PriceChange value={t.change} size="sm" />}
        </span>
      </div>
      <DS.Button variant="primary" size="lg" onClick={() => onOpen(t.asin)}>
        {t.type === 'BUILDING' ? 'Ansehen' : 'Handeln'}
      </DS.Button>
    </div>
  );
}

/* ------------------------------------------------------------------ moon: the central bank's clock */

/** Moon over the city = the central bank's clock: key rate inside, the ring runs to the tender's close. */
function Moon({ now }: { now: number }) {
  const rate = useMainInterestRate();
  const tender = useInterestTender();
  const end = tender.data?.endDate;
  const progress = tenderProgress(end, now);
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <Link to="/zentralbank?ansicht=tender" className="skyl-moon" aria-label={`Leitzins ${rate.data ? `${rate.data.value.toLocaleString('de-DE')} %` : ''}${end ? `, Zinstender schließt in ${countdown(end, now)}` : ''}`}>
      <svg width={116} height={116} viewBox="0 0 116 116" aria-hidden="true">
        <circle className="skyl-moon__disc" cx={58} cy={58} r={r} />
        {progress != null && (
          <circle
            className="skyl-moon__ring"
            cx={58}
            cy={58}
            r={r}
            strokeDasharray={`${progress * c} ${c}`}
            transform="rotate(-90 58 58)"
          />
        )}
      </svg>
      <span className="skyl-moon__text">
        <span className="skyl-moon__lbl">Leitzins</span>
        <span className="skyl-moon__val">
          {rate.data ? `${rate.data.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%` : NBSP}
        </span>
        <span className="skyl-moon__sub">{end ? `Tender in ${countdown(end, now)}` : NBSP}</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ sky: the news */

const KIND_LABEL: Record<CityEvent['kind'], string> = {
  chat: 'Nachricht',
  dividende: 'Dividende',
  fusion: 'Fusion',
  kapital: 'Kapital',
  tender: 'Zins',
};

/** Unread chats and upcoming corporate actions; on the phone (no moon) also the interest tender. */
function useEvents(now: number, withTender: boolean): CityEvent[] {
  const tender = useInterestTender();
  const rate = useMainInterestRate();
  const me = useMe();
  const chats = useMyChats();
  const dividends = useDividendPayments();
  const mergers = useMergers();
  const capital = useCapitalMeasures('increase');
  const portfolio = usePortfolio();
  const minute = Math.floor(now / 60_000);
  return useMemo(() => {
    const at = minute * 60_000;
    const owned = new Set((portfolio.data?.positions ?? []).map((p) => p.securityIdentifier));
    const out: CityEvent[] = [];
    for (const c of chats.data ?? []) {
      if (!isFreshUnread(c, me.data?.username)) continue;
      const n = c.numOfUnreadMessages;
      out.push({
        key: `c${c.id}`,
        kind: 'chat',
        title: `${chatTitle(c, me.data?.username)} · ${n} ungelesen`,
        at: c.lastMessage?.dateSent ?? c.dateCreated,
        href: `/nachrichten/${c.id}`,
      });
    }
    for (const d of dividends.data?.content ?? []) {
      out.push({
        key: `d${d.id}`,
        kind: 'dividende',
        title: `Dividende ${d.company.name}`,
        at: d.startDate,
        href: `/wertpapier/${d.company.securityIdentifier}`,
        own: owned.has(d.company.securityIdentifier),
        asin: d.company.securityIdentifier,
        subject: d.company.name,
      });
    }
    for (const m of mergers.data?.content ?? []) {
      out.push({
        key: `m${m.id}`,
        kind: 'fusion',
        title: `${m.company.name} geht in ${m.acquiringCompany.name} auf`,
        at: m.startDate,
        href: `/wertpapier/${m.company.securityIdentifier}`,
        own: owned.has(m.company.securityIdentifier) || owned.has(m.acquiringCompany.securityIdentifier),
        asin: m.company.securityIdentifier,
        subject: m.company.name,
      });
    }
    for (const k of capital.data?.content ?? []) {
      const running = k.startDate <= at;
      out.push({
        key: `k${k.id}`,
        kind: 'kapital',
        title: `Kapitalerhöhung ${k.company.name}${running ? ' · Zeichnung läuft' : ''}`,
        at: running ? k.endDate : k.startDate,
        href: `/wertpapier/${k.company.securityIdentifier}`,
        own: owned.has(k.company.securityIdentifier),
        asin: k.company.securityIdentifier,
        subject: k.company.name,
      });
    }
    const end = tender.data?.endDate;
    if (withTender && end && end > at) {
      const r = rate.data?.value;
      out.push({
        key: 'tender',
        kind: 'tender',
        title: `Zinstender${r != null ? ` · Leitzins ${r.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %` : ''}`,
        at: end,
        href: '/zentralbank?ansicht=tender',
      });
    }
    return nextEvents(out, at, 4);
  }, [chats.data, dividends.data, mergers.data, capital.data, portfolio.data, me.data, minute, withTender, tender.data, rate.data]);
}

function newsMeta(p: PostView, now: number) {
  const by = p.company?.name ?? p.author?.username;
  return `${by ? `${by} · ` : ''}${p.dateCreated ? ago(now - p.dateCreated) : ''}`;
}

interface SkyProps {
  now: number;
  posts: PostView[];
  loading: boolean;
  events: CityEvent[];
  keyOf: KeyOf;
  /** the selected tower: its articles and events are marked */
  active: string | null;
  /** hovering an item with a tower: that tower stands out */
  onHover: (key: string | null) => void;
  compact?: boolean;
  phone?: boolean;
  edition?: string;
  date?: string;
}

/** The sky: the city's newspaper (lead + headlines) and what comes tonight (events, unread chats). */
function Sky({ now, posts, loading, events, keyOf, active, onHover, compact = false, phone = false, edition: ed, date }: SkyProps) {
  const lead = posts[0];
  const more = posts.slice(1, compact ? 4 : 5);
  const towerOf = (p: PostView) => articleAsins(p).map(keyOf).find(Boolean);
  /** hover/focus wiring and marks for an item that belongs to a tower */
  const link = (key: string | undefined) =>
    key
      ? {
          'data-tower': '',
          'data-active': active === key ? '' : undefined,
          onMouseEnter: () => onHover(key),
          onMouseLeave: () => onHover(null),
          onFocus: () => onHover(key),
          onBlur: () => onHover(null),
        }
      : {};

  const head = (p: PostView) => (
    <li key={p.id}>
      <Link to={`/zeitung/${p.id}`} className="skyl-head" {...link(towerOf(p))}>
        <span className="skyl-head__title">{p.title}</span>
        <span className="skyl-head__meta">{newsMeta(p, now)}</span>
      </Link>
    </li>
  );
  const skeletons = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <li key={i} className="skyl-head">
        <DS.Skeleton width="85%" />
      </li>
    ));

  const eventList = (
    <ul className="skyl-events">
      {events.length ? (
        events.map((e) => (
          <li key={e.key}>
            <Link to={e.href} className={`skyl-ev skyl-ev--${e.kind}${e.own ? ' skyl-ev--own' : ''}`} {...link(keyOf(e.asin))}>
              <span className="skyl-ev__kind">{KIND_LABEL[e.kind]}</span>
              <span className="skyl-ev__title">{e.title}</span>
              <span className="skyl-ev__when">{e.kind === 'chat' ? ago(now - e.at) : when(e.at, now)}</span>
            </Link>
          </li>
        ))
      ) : (
        <li className="skyl-ev skyl-ev--none">Keine Termine, nichts Ungelesenes.</li>
      )}
    </ul>
  );

  if (phone) {
    return (
      <div className="skyl-sky skyl-sky--phone">
        <h2 className="skyl-sky__rubric">
          Zeitung{' '}
          <Link to="/zeitung" className="skyl-more">
            Alle →
          </Link>
        </h2>
        <ul className="skyl-heads">{loading ? skeletons(4) : posts.slice(0, 5).map(head)}</ul>
        <h2 className="skyl-sky__rubric">Heute in der Stadt</h2>
        {eventList}
      </div>
    );
  }

  return (
    <section className={`skyl-sky${compact ? ' skyl-sky--compact' : ''}`} aria-label="Nachrichten">
      <div className="skyl-sky__lead">
        <p className="skyl-sky__rubric">
          <span className="skyl-sky__edition">{ed}</span> · {date}
        </p>
        {lead ? (
          <Link to={`/zeitung/${lead.id}`} className="skyl-lead" {...link(towerOf(lead))}>
            <span className="skyl-lead__title">{lead.title}</span>
            <span className="skyl-head__meta">{newsMeta(lead, now)}</span>
          </Link>
        ) : (
          <div className="skyl-lead">
            <DS.Skeleton width="90%" />
            <DS.Skeleton width="60%" />
          </div>
        )}
      </div>
      <div className="skyl-sky__more">
        <p className="skyl-sky__rubric">
          Zeitung{' '}
          <Link to="/zeitung" className="skyl-more">
            Alle →
          </Link>
        </p>
        <ul className="skyl-heads">{more.length ? more.map(head) : loading ? skeletons(3) : null}</ul>
      </div>
      <div className="skyl-sky__events">
        <p className="skyl-sky__rubric">Heute in der Stadt</p>
        {eventList}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ street */

function Street({ book, perMin, volume24h, online }: { book?: number; perMin?: number; volume24h?: number; online?: number }) {
  return (
    <footer className="skyl-street">
      <dl className="skyl-street__stats">
        <div className="skyl-street__me">
          <dt>
            <Link to="/organisation">Dein Depot</Link>
          </dt>
          <dd>
            <BookValue value={book} />
          </dd>
        </div>
        <div>
          <dt>Trades / Min.</dt>
          <dd>{perMin != null ? perMin.toLocaleString('de-DE') : NBSP}</dd>
        </div>
        <div>
          <dt>{VOLUME_24H}</dt>
          <dd>{volume24h != null ? <DS.Amount value={volume24h} compact="auto" /> : NBSP}</dd>
        </div>
        <div>
          <dt>Online</dt>
          <dd>{online != null ? online.toLocaleString('de-DE') : NBSP}</dd>
        </div>
      </dl>
      <div className="skyl-street__links">
        <DS.Tooltip
          width={280}
          title="So liest du die Stadt"
          content={
            <>
              Jeder Turm ist ein Wertpapier, Immobilien je Größe ein Turm. Höhe = {VOLUME_24H}. Dach und Fassade{' '}
              <span className="skyl-up">▲</span>/<span className="skyl-down">▼</span> = Veränderung zum Vortag. Fenster leuchten bei jedem Trade,
              große Trades mehrere. <span className="skyl-flagmark" aria-hidden="true" /> = in deinem Depot. Der Mond: Leitzins und Zeit bis zum
              Zinstender.
            </>
          }
        >
          <button type="button" className="skyl-info">
            ⓘ Legende
          </button>
        </DS.Tooltip>
        <Link to="/markt?ansicht=karte" className="skyl-more">
          Marktkarte →
        </Link>
      </div>
    </footer>
  );
}
