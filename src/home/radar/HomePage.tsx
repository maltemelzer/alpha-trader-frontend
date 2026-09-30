// Start page variant „Radar“: the last hour of the market as a round scope. Every trade is an echo
// (angle = when, ring = asset class, outward = rose, size = volume, colour = ▲/▼), the sweep turns and
// lights them up, own papers wear a brass ring, the depot sits in the centre. News, chats and dates are
// contacts on the rim (past 24 h left, next 24 h right) and in a short list beside the scope.
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { DS, format } from '../../ds';
import {
  useAllPriceChanges,
  useCapitalMeasures,
  useDividendPayments,
  useInterestTender,
  useListings,
  useMe,
  useMergers,
  useMyChats,
  useNews,
  usePortfolio,
  useRecentTrades,
  useTradeWindow,
  useTradeWindowProgress,
  type MergerView,
} from '../../api/queries';
import { toTrade, type Trade } from '../../flows/derive';
import { bookValue } from '../../organisation/derive';
import { chatTitle } from '../../chat/derive';
import { MiniStats, useEdgeFade } from '../../app/phone';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { useIsPhone } from '../../lib/useMediaQuery';
import { useNow } from '../../lib/useNow';
import {
  clusterEchoes,
  CONTACT_LABEL,
  DAY,
  depotDay,
  changeText,
  dayChanges,
  HOUR,
  hottest,
  rankContacts,
  relTime,
  RINGS,
  tradesPerMinute,
  turnover,
  type Contact,
  type Echo,
} from './derive';
import { CONTACT_ICON, Scope } from './Scope';
import './HomePage.css';

const NBSP = String.fromCharCode(0xa0);

/** Trades of the last hour: the loaded window plus the live poll (15 s), each once. */
function useHour(now: number) {
  const window = useTradeWindow(60);
  const recent = useRecentTrades();
  const progress = useTradeWindowProgress(60);
  const trades = useMemo(() => {
    const seen = new Set<string>();
    const out: Trade[] = [];
    for (const t of [...(recent.data ?? []).map(toTrade), ...(window.data?.trades ?? [])]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
    return out;
  }, [recent.data, window.data]);
  return { trades, loading: !window.data, loaded: progress.data?.loaded ?? 0, from: window.data?.from ?? now - HOUR };
}

/** News, unread chats, the tender close, capital measures, dividends and mergers as contacts. */
function useContacts(now: number, me: string | undefined): { contacts: Contact[]; ready: boolean } {
  const news = useNews('');
  const chats = useMyChats();
  const tender = useInterestTender();
  const increases = useCapitalMeasures('increase');
  const reductions = useCapitalMeasures('reduction');
  const dividends = useDividendPayments();
  const mergers = useMergers();
  // the list appears at once when every source has answered (or failed) – no rows jumping in one by one
  const ready = [news, chats, tender, increases, reductions, dividends, mergers].every((q) => !q.isPending);
  const contacts = useMemo(() => {
    const out: Contact[] = [];
    for (const p of news.data?.pages[0]?.content.slice(0, 12) ?? []) {
      if (!p.dateCreated || p.dateCreated < now - 7 * DAY) continue;
      out.push({
        id: `news-${p.id}`,
        kind: 'news',
        t: p.dateCreated,
        title: p.title,
        text: p.company?.name ?? p.author?.username ?? 'Zeitung',
        href: `/zeitung/${p.id}`,
      });
    }
    for (const c of chats.data ?? []) {
      if (c.publicChat || !(c.numOfUnreadMessages > 0)) continue;
      const m = c.lastMessage;
      out.push({
        id: `chat-${c.id}`,
        kind: 'chat',
        t: m?.dateSent ?? c.dateCreated,
        title: chatTitle(c, me),
        text: `${c.numOfUnreadMessages} ungelesen${m?.content ? ` · ${m.sender?.username ? `${m.sender.username}: ` : ''}${m.content.slice(0, 80)}` : ''}`,
        href: `/nachrichten/${c.id}`,
        // unread and fresh goes first; an unread chat from days ago sorts by its age like everything else
        urgent: (m?.dateSent ?? 0) > now - DAY,
      });
    }
    if (tender.data?.endDate) {
      out.push({
        id: 'tender',
        kind: 'tender',
        t: tender.data.endDate,
        title: 'Zinstender schließt',
        text: 'Banken bieten 98–102 % – das setzt den Leitzins',
        href: '/zentralbank?ansicht=tender',
        urgent: tender.data.endDate - now < HOUR && tender.data.endDate > now,
      });
    }
    const measures = [
      ...(increases.data?.content ?? []).map((m) => ({ m, word: 'Kapitalerhöhung' })),
      ...(reductions.data?.content ?? []).map((m) => ({ m, word: 'Kapitalherabsetzung' })),
    ];
    for (const { m, word } of measures) {
      if (m.endDate < now - DAY) continue;
      const running = m.startDate <= now;
      out.push({
        id: `cap-${m.id}`,
        kind: 'capital',
        t: running ? m.endDate : m.startDate,
        title: `${word}: ${m.company.name}`,
        text: `${running ? 'Zeichnung endet' : 'Zeichnung beginnt'} · ${format.money(m.price)} je Aktie`,
        href: `/wertpapier/${m.company.securityIdentifier}?ansicht=ueberblick`,
      });
    }
    for (const d of dividends.data?.content ?? []) {
      out.push({
        id: `div-${d.id}`,
        kind: 'dividend',
        t: d.startDate,
        title: `Dividende: ${d.company.name}`,
        text: `bis zu ${format.money(d.maximalCashVolume, '€', 2, true)}`,
        href: `/wertpapier/${d.company.securityIdentifier}?ansicht=ueberblick`,
      });
    }
    // mergers into the same company on the same day are one contact
    const byTarget = new Map<string, MergerView[]>();
    for (const g of mergers.data?.content ?? []) {
      const k = `${g.acquiringCompany.id}:${Math.round(g.startDate / HOUR)}`;
      byTarget.set(k, [...(byTarget.get(k) ?? []), g]);
    }
    for (const list of byTarget.values()) {
      const g = list[0];
      out.push({
        id: `mer-${g.id}`,
        kind: 'merger',
        t: g.startDate,
        title: list.length === 1 ? `Fusion: ${g.company.name}` : `Fusion: ${list.length} Firmen → ${g.acquiringCompany.name}`,
        text: list.length === 1 ? `geht in ${g.acquiringCompany.name} auf` : list.map((x) => x.company.name).join(', '),
        href: '/kapitalmassnahmen?art=fusionen',
      });
    }
    return out;
  }, [news.data, chats.data, tender.data, increases.data, reductions.data, dividends.data, mergers.data, now, me]);
  return { contacts, ready };
}

export function HomePage() {
  const onLinkClick = useInternalLinks();
  const phone = useIsPhone();
  const now = useNow(5_000);
  const me = useMe();
  const portfolio = usePortfolio();
  const hour = useHour(now);
  const { contacts: allContacts, ready } = useContacts(now, me.data?.username);
  const contacts = useMemo(() => (ready ? rankContacts(allContacts, now, phone ? 8 : 10) : []), [allContacts, now, ready, phone]);
  const [activeContact, setActiveContact] = useState<string | undefined>();

  const positions = useMemo(() => portfolio.data?.positions ?? [], [portfolio.data]);
  const own = useMemo(() => new Set(positions.map((p) => p.securityIdentifier)), [positions]);
  const echoes = useMemo(() => clusterEchoes(hour.trades, now, { keep: own, max: phone ? 450 : 750 }), [hour.trades, now, own, phone]);

  const value = portfolio.data ? bookValue(portfolio.data) : undefined;
  const movers = useAllPriceChanges();
  const changes = useMemo(() => dayChanges(movers.data?.winners, movers.data?.losers), [movers.data]);
  const move = useMemo(() => (portfolio.data ? depotDay(positions, portfolio.data.cash, changes) : null), [portfolio.data, positions, changes]);
  const perMin = useMemo(() => tradesPerMinute(hour.trades, now), [hour.trades, now]);
  const volume = useMemo(() => turnover(hour.trades, now - HOUR), [hour.trades, now]);
  const hot = useMemo(() => hottest(hour.trades, now), [hour.trades, now]);

  const hotName = useListings(hot ? [hot.asin] : [])[hot?.asin ?? ''];

  const center = (
    <Link to="/organisation" className="radar-depot" aria-label="Dein Depot – zu Meine Organisation">
      <span className="radar-depot__label">Dein Depot</span>
      <span className="radar-depot__value">
        {value == null ? <DS.Skeleton variant="text" width="6em" /> : <DS.Amount value={value} compact="auto" />}
      </span>
      <span className="radar-depot__change">
        {move && Math.abs(move.delta) >= 0.005 ? (
          <Change value={move.delta} unit="€" suffix="heute" />
        ) : (
          <span className="radar-depot__flat">{move ? '± 0 heute' : NBSP}</span>
        )}
      </span>
      {hour.loading && <span className="radar-depot__load">{hour.loaded ? `lädt ${hour.loaded.toLocaleString('de-DE')} Trades …` : 'lädt die Stunde …'}</span>}
    </Link>
  );

  const summary = `Radarschirm der letzten Stunde: ${echoes.length} Echos, ${Math.round(perMin)} Trades je Minute.`;

  const stats = [
    { key: 'tpm', label: 'Trades/min', value: hour.trades.length ? Math.round(perMin).toLocaleString('de-DE') : NBSP },
    { key: 'ums', label: 'Umsatz 1 Std.', value: hour.loading ? NBSP : <DS.Amount value={volume} compact="auto" /> },
    {
      key: 'hot',
      label: 'Am heißesten',
      value: hot ? (
        <Link to={`/wertpapier/${hot.asin}`} className="radar-hot">
          <span className="radar-hot__name">{hotName?.name ?? hot.asin}</span>
        </Link>
      ) : (
        NBSP
      ),
      hint: hot ? (
        hot.change != null ? (
          <>
            <Change value={hot.change} decimals={1} /> · {hot.count} {phone ? 'Tr.' : 'Trades in 15 min'}
          </>
        ) : (
          `${hot.count} Trades in 15 min`
        )
      ) : (
        NBSP
      ),
    },
  ];

  return (
    <div className={`page radar${phone ? ' radar--phone' : ''}`} onClick={onLinkClick}>
      <h1 className="bnk-sr">Start – Radar</h1>
      <div className="radar__body">
        {phone && <MiniStats items={stats} label="Markt in der letzten Stunde" columns="repeat(3, minmax(0, 1fr))" />}
        <section className="radar__stage" aria-label="Radarschirm">
          <div className="radar__grid">
          {!phone && (
            <dl className="radar-gauges" aria-label="Markt in der letzten Stunde">
              {stats.map((s) => (
                <div key={s.key} className="radar-gauge">
                  <dt>{s.label}</dt>
                  <dd className="radar-gauge__value">{s.value}</dd>
                  <dd className="radar-gauge__hint">{s.hint ?? NBSP}</dd>
                </div>
              ))}
            </dl>
          )}
          <Scope
            echoes={echoes}
            own={own}
            contacts={contacts}
            now={now}
            activeContact={activeContact}
            onContact={setActiveContact}
            center={center}
            summary={summary}
            renderCard={(e, close) => <EchoCard echo={e} own={positions.find((p) => p.securityIdentifier === e.asin)?.numberOfShares} trades={hour.trades} now={now} onClose={close} />}
          />
          <Legend phone={phone} />
          </div>
        </section>
        <Contacts contacts={contacts} ready={ready} now={now} active={activeContact} onActive={setActiveContact} phone={phone} />
      </div>
    </div>
  );
}

/** What an echo means – small print in a corner (desktop) or one line under the scope (phone). */
/** A change with ▲/▼ from the value itself (see `changeText`), coloured like DS.PriceChange. */
function Change({ value, unit, decimals, suffix }: { value: number; unit?: '%' | '€'; decimals?: number; suffix?: string }) {
  const c = changeText(value, { unit, decimals });
  return (
    <span className={`radar-change radar-change--${c.dir}`}>
      {c.text}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function Legend({ phone }: { phone: boolean }) {
  return (
    <div className="radar-legend" aria-label="Legende">
      <p className="radar-legend__row">
        <span className="radar-legend__item">
          <span className="radar-legend__dot radar-legend__dot--up" aria-hidden="true" />▲ gestiegen
        </span>
        <span className="radar-legend__item">
          <span className="radar-legend__dot radar-legend__dot--down" aria-hidden="true" />▼ gefallen
        </span>
        <span className="radar-legend__item">
          <span className="radar-legend__dot radar-legend__dot--own" aria-hidden="true" />
          deins
        </span>
      </p>
      <p className="radar-legend__row radar-legend__more">Größe = Umsatz · außen = gestiegen</p>
      {phone && <p className="radar-legend__row radar-legend__more">Ringe von innen: Sonstige · Coins · Anleihen · Aktien</p>}
    </div>
  );
}

function EchoCard({ echo, own, trades, now, onClose }: { echo: Echo; own?: number; trades: Trade[]; now: number; onClose: () => void }) {
  const listing = useListings([echo.asin])[echo.asin];
  const hourOf = useMemo(() => {
    let volume = 0;
    let count = 0;
    for (const t of trades) {
      if (t.asin !== echo.asin || t.price <= 0.01 || t.date < now - HOUR) continue;
      volume += t.volume;
      count += 1;
    }
    return { volume, count };
  }, [trades, echo.asin, now]);
  const ring = RINGS.find((r) => r.id === echo.ring);
  return (
    <div className="radar-echo">
      <div className="radar-echo__head">
        <div className="radar-echo__title">
          <Link to={`/wertpapier/${echo.asin}`} className="radar-echo__name">
            {listing?.name ?? echo.asin}
          </Link>
          <span className="radar-echo__meta">
            <span className="radar-echo__asin">{echo.asin}</span> · {ring?.label.split(',')[0]}
          </span>
        </div>
        <button type="button" className="radar-echo__close" onClick={onClose} aria-label="Schließen">
          <DS.Icon name="schliessen" size={16} />
        </button>
      </div>
      <div className="radar-echo__price">
        <span className="radar-echo__figure">{format.price(echo.price, listing?.type)}</span>
        {echo.change != null ? <Change value={echo.change} /> : <span className="radar-echo__muted">erster Trade</span>}
      </div>
      <p className="radar-echo__line">
        {relTime(echo.t, now)} · {echo.count === 1 ? '1 Trade' : `${echo.count} Trades`} · <DS.Amount value={echo.volume} compact="auto" />
      </p>
      <p className="radar-echo__line radar-echo__muted">
        Letzte Stunde: {hourOf.count.toLocaleString('de-DE')} Trades · <DS.Amount value={hourOf.volume} compact="auto" />
      </p>
      {own != null && <p className="radar-echo__line radar-echo__own">Im Depot: {own.toLocaleString('de-DE')} Stück</p>}
      <Link to={`/wertpapier/${echo.asin}`} className="bnk-btn bnk-btn--primary bnk-btn--md bnk-btn--full radar-echo__go">
        <span className="bnk-btn__label">Handeln</span>
      </Link>
    </div>
  );
}

function Contacts({
  contacts,
  ready,
  now,
  active,
  onActive,
  phone,
}: {
  contacts: Contact[];
  ready: boolean;
  now: number;
  active?: string;
  onActive: (id: string | undefined) => void;
  phone: boolean;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useEdgeFade(listRef, undefined, undefined, contacts.length);
  return (
    <section className="radar-contacts" aria-labelledby="radar-contacts-title">
      <h2 id="radar-contacts-title" className="radar-contacts__title">
        Kontakte <span className="radar-contacts__hint">{phone ? 'wischen' : 'am Rand zur Minute, was kommt rechts von „jetzt“'}</span>
      </h2>
      <ol className={`radar-contacts__list${phone ? ' ph-fade' : ''}`} ref={listRef}>
        {!ready &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="radar-contact radar-contact--skeleton">
              <DS.Skeleton variant="text" lines={2} />
            </li>
          ))}
        {ready && contacts.length === 0 && <li className="radar-contact radar-contact--empty">Gerade keine Kontakte – der Markt ist unter sich.</li>}
        {contacts.map((c) => (
          <li key={c.id} className={`radar-contact${c.urgent ? ' radar-contact--urgent' : ''}${active === c.id ? ' is-active' : ''}`}>
            <Link
              to={c.href}
              className="radar-contact__link"
              onPointerEnter={() => onActive(c.id)}
              onPointerLeave={() => onActive(undefined)}
              onFocus={() => onActive(c.id)}
              onBlur={() => onActive(undefined)}
            >
              <span className={`radar-contact__icon${c.t > now ? ' radar-contact__icon--future' : ''}`} aria-hidden="true">
                <DS.Icon name={CONTACT_ICON[c.kind]} size={16} />
              </span>
              <span className="radar-contact__text">
                <span className="radar-contact__meta">
                  {CONTACT_LABEL[c.kind]} · {relTime(c.t, now)}
                </span>
                <span className="radar-contact__name">{c.title}</span>
                <span className="radar-contact__detail">{c.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

