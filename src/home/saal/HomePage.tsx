// Start page „Börsensaal“: the big board of an old exchange hall. Split-flap lines: the news (unread
// messages, articles, capital measures, dividends, mergers, big trades) across the top, below the most
// traded and the most moved papers, the best bond yields per day and your own positions (in brass); the
// hall clock with the main rate, the tender's close and your depot above. Every line opens its security,
// article or chat. Phones: a narrow board (name, price, change), one section per view.
import { useMemo, useState } from 'react';
import { DS } from '../../ds';
import {
  useAllPriceChanges,
  useBondUniverse,
  useCapitalMeasures,
  useChatUnread,
  useDividendPayments,
  useInterestTender,
  useListings,
  useMainInterestRate,
  useMergers,
  useNews,
  usePortfolio,
  useRecentTrades,
} from '../../api/queries';
import type { SecurityOrderLogEntryView } from '../../api/types';
import { MiniStats } from '../../app/phone';
import { PageNav, usePageView, type PageView } from '../../app/pagenav';
import { tradesPerMinute, withTicks } from '../../app/tape';
import { short } from '../../lib/format';
import { useIsPhone, useMediaQuery, useViewportQuery } from '../../lib/useMediaQuery';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { useNow } from '../../lib/useNow';
import { changeLookup } from '../../market/screener';
import { Board } from './Board';
import { HallClock } from './Clock';
import { Flap } from './Flap';
import { useTradingMatrix } from './queries';
import {
  bestYields,
  bigTrades,
  biggestMoves,
  boardChange,
  cells,
  countdown,
  depotChange,
  dirOf,
  lastTrades,
  mostTraded,
  newsRows,
  ownRows,
  TICKER_LABELS,
  tickerOrder,
  type BoardRow,
  type BoardSection,
  type SectionId,
  type TickerItem,
} from './derive';
import './HomePage.css';

const NBSP = String.fromCharCode(0xa0);

const VIEWS: PageView[] = [
  { value: 'kurse', label: 'Kurse', description: 'Neueste Meldungen, meistgehandelt und größte Bewegung' },
  { value: 'meldungen', label: 'Meldungen', description: 'Zeitung, Kapitalmaßnahmen, Fusionen, große Trades' },
  { value: 'anleihen', label: 'Anleihen', description: 'Die beste Rendite je Tag zum Brief' },
  { value: 'depot', label: 'Depot', description: 'Deine Papiere' },
];

const loadingRows = (n: number): BoardRow[] =>
  Array.from({ length: n }, () => ({ asin: '', name: '', price: '', priceShort: '', dir: null, change: '', volume: '', mine: false }));

const time = (ms: number) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const day = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/** Everything the board shows, from the shared hooks (same cache as market, tape and security page). */
function useHall() {
  const now = useNow(30_000);
  // trades after the opening light their line up; the ones loaded with the page are history
  const [opened] = useState(() => Date.now());
  const matrix = useTradingMatrix();
  const moves = useAllPriceChanges();
  const trades = useRecentTrades();
  const bonds = useBondUniverse();
  const portfolio = usePortfolio();

  const changes = useMemo(() => changeLookup(moves.data?.winners, moves.data?.losers), [moves.data]);
  const mine = useMemo(() => new Set((portfolio.data?.positions ?? []).filter((p) => p.numberOfShares > 0).map((p) => p.securityIdentifier)), [portfolio.data]);
  const tradeList = useMemo(() => trades.data ?? [], [trades.data]);

  const sections = useMemo((): Record<Exclude<SectionId, 'meldungen'>, BoardSection> => {
    const ctx = { changes, mine, flashes: lastTrades(tradeList, opened) };
    const handel = matrix.data ? mostTraded(matrix.data, ctx, 12) : loadingRows(12);
    const skip = new Set(handel.map((r) => r.asin));
    const bewegung = matrix.data && moves.data ? biggestMoves(moves.data.winners, moves.data.losers, matrix.data, ctx, skip, 5) : loadingRows(5);
    const anleihen = bonds.data ? bestYields(bonds.data, now, mine, 4) : loadingRows(4);
    const depot = portfolio.data ? ownRows(portfolio.data.positions, ctx) : loadingRows(3);
    return {
      handel: {
        id: 'handel',
        title: 'Meistgehandelt · 24 Std.',
        heads: ['Kurs €', 'Zum Vortag %', 'Umsatz €'],
        rows: handel,
        empty: 'Gerade kein Umsatz.',
      },
      bewegung: {
        id: 'bewegung',
        title: 'Größte Bewegung',
        heads: ['Kurs €', 'Zum Vortag %', 'Umsatz €'],
        rows: bewegung,
        empty: 'Heute bewegt sich nichts mit Umsatz.',
      },
      anleihen: {
        id: 'anleihen',
        title: 'Anleihen · Rendite je Tag',
        heads: ['Brief %', 'Pro Tag %', 'Laufzeit'],
        rows: anleihen,
        empty: 'Gerade keine Anleihe im Brief.',
      },
      depot: {
        id: 'depot',
        title: 'Dein Depot',
        heads: ['Kurs', 'Zum Vortag %', 'Wert €'],
        rows: depot,
        empty: 'Noch keine Papiere – tipp eine Zeile an, um zu kaufen.',
      },
    };
  }, [matrix.data, moves.data, bonds.data, portfolio.data, changes, tradeList, mine, now, opened]);

  const depot = useMemo(() => depotChange(portfolio.data, changes), [portfolio.data, changes]);
  const pace = useMemo(() => tradesPerMinute(withTicks(tradeList), now), [tradeList, now]);
  return { sections, depot, pace, trades: tradeList, loading: matrix.isLoading };
}

/** News, capital measures, dividends, mergers, big trades and unread messages for the news section. */
function useTickerItems(trades: SecurityOrderLogEntryView[]) {
  const news = useNews('');
  const increases = useCapitalMeasures('increase');
  const dividends = useDividendPayments();
  const mergers = useMergers();
  const unread = useChatUnread();
  const big = useMemo(() => bigTrades(trades), [trades]);
  const names = useListings(big.map((t) => t.securityIdentifier ?? ''));

  const items = useMemo(() => {
    const out: TickerItem[] = [];
    const add = (i: Omit<TickerItem, 'label'>) => out.push({ ...i, label: TICKER_LABELS[i.kind] });
    if (unread.messages > 0)
      add({
        id: 'chat',
        kind: 'chat',
        text: `${unread.messages.toLocaleString('de-DE')} ungelesene ${unread.messages === 1 ? 'Nachricht' : 'Nachrichten'}`,
        href: '/nachrichten',
        date: Infinity,
      });
    for (const p of news.data?.pages[0]?.content.slice(0, 8) ?? [])
      add({ id: `n-${p.id}`, kind: 'zeitung', text: p.title, href: `/zeitung/${p.id}`, date: p.dateCreated ?? 0 });
    for (const c of increases.data?.content.slice(0, 3) ?? [])
      add({
        id: `k-${c.id}`,
        kind: 'kapital',
        text: `${c.company.name}: ${short(c.numberOfShares)} neue Aktien zu ${DS.format.price(c.price)} bis ${day(c.endDate)} ${time(c.endDate)}`,
        href: `/wertpapier/${c.company.securityIdentifier}?ansicht=ueberblick`,
        date: c.startDate,
      });
    for (const d of dividends.data?.content.slice(0, 3) ?? [])
      add({
        id: `d-${d.id}`,
        kind: 'dividende',
        text: `${d.company.name} schüttet am ${day(d.startDate)} aus`,
        href: `/wertpapier/${d.company.securityIdentifier}?ansicht=ueberblick`,
        date: d.startDate - 86_400_000,
        at: d.startDate,
      });
    for (const m of mergers.data?.content.slice(0, 3) ?? [])
      add({
        id: `f-${m.id}`,
        kind: 'fusion',
        text: `${m.company.name} geht am ${day(m.startDate)} in ${m.acquiringCompany.name} auf`,
        href: `/wertpapier/${m.company.securityIdentifier}?ansicht=ueberblick`,
        date: m.startDate - 86_400_000,
        at: m.startDate,
      });
    for (const t of big) {
      const asin = t.securityIdentifier ?? '';
      add({
        id: `t-${t.id ?? asin}`,
        kind: 'trade',
        text: `${names[asin]?.name ?? asin}: ${short(t.volume ?? 0)}${NBSP}€ zu ${DS.format.price(t.price ?? 0, names[asin]?.type)}`,
        href: `/wertpapier/${asin}`,
        date: t.date ?? 0,
      });
    }
    return tickerOrder(out);
  }, [news.data, increases.data, dividends.data, mergers.data, big, names, unread.messages]);

  return { items, loading: news.isLoading };
}

/** The clock ticks every second on its own, so the board does not re-render with it. */
function useRates() {
  const rate = useMainInterestRate();
  const tender = useInterestTender();
  return { rate: rate.data?.value, tenderEnd: tender.data?.endDate };
}

function ClockBlock({ phone = false }: { phone?: boolean }) {
  const now = useNow(1000);
  const { rate, tenderEnd } = useRates();
  const left = tenderEnd != null ? countdown(tenderEnd - now) : '--:--:--';
  if (phone) return <Flap className="saal-mini" text={left} stagger={0} steps={1} label={tenderEnd ? `Tenderschluss in ${left}` : 'Kein Tender'} />;
  return (
    <div className="saal-hall">
      <HallClock now={now} />
      <div className="saal-hall__figs">
        <a className="saal-fig" href="/zentralbank">
          <span className="saal-fig__label">Leitzins</span>
          <Flap className="saal-fig__value" text={cells(rate == null ? '' : `${rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} %`, 7, 'right')} />
        </a>
        <a className="saal-fig" href="/zentralbank?ansicht=tender">
          <span className="saal-fig__label">Tenderschluss in</span>
          <Flap className="saal-fig__value" text={left} stagger={0} steps={1} label={tenderEnd ? left : 'kein Tender'} />
        </a>
      </div>
    </div>
  );
}

function DepotBlock({ depot }: { depot: ReturnType<typeof depotChange> }) {
  const dir = dirOf(depot?.pct);
  const tone = dir === 'up' ? 'saal-c--up' : dir === 'down' ? 'saal-c--down' : undefined;
  const value = depot ? `${short(depot.value)} €` : '';
  const change = depot?.pct != null ? `${dir === 'up' ? '▲' : dir === 'down' ? '▼' : ' '}${boardChange(depot.pct)} %` : '';
  return (
    <a className="saal-fig saal-fig--depot" href="/organisation">
      <span className="saal-fig__label">Dein Depot · zum Vortag</span>
      <span className="saal-fig__row">
        <Flap className="saal-fig__value saal-fig__value--brass" text={cells(value, 11, 'right')} tone={() => 'saal-c--brass'} label={depot ? DS.format.money(depot.value) : 'wird geladen'} />
        <Flap className="saal-fig__value saal-fig__value--sm" text={cells(change, 9, 'right')} tone={() => tone} label={change || null} />
      </span>
    </a>
  );
}

/** The news board: chat, articles, capital measures, dividends, mergers, big trades – as flap lines. */
function newsSection(items: TickerItem[], loading: boolean, now: number): BoardSection {
  return {
    id: 'meldungen',
    title: 'Meldungen',
    heads: ['Zeitung', 'Kapital und Fusionen', 'große Trades'],
    rows: loading && !items.length ? loadingRows(4) : newsRows(items, now),
    empty: 'Gerade keine Meldungen.',
  };
}

export function HomePage() {
  const phone = useIsPhone();
  const wide = useMediaQuery('(min-width: 1100px)');
  const tall = useViewportQuery('(min-height: 820px)');
  const onClick = useInternalLinks();
  const [view, setView, views] = usePageView(VIEWS, 'kurse');
  const hall = useHall();
  const ticker = useTickerItems(hall.trades);
  const { rate } = useRates();
  const today = useNow(60_000);
  const s = hall.sections;
  const news = useMemo(() => newsSection(ticker.items, ticker.loading, today), [ticker.items, ticker.loading, today]);
  const newsTop = useMemo(() => ({ ...news, rows: news.rows.slice(0, 3) }), [news]);

  if (phone) {
    const d = hall.depot;
    const dir = dirOf(d?.pct);
    const board =
      view === 'meldungen' ? [news] : view === 'anleihen' ? [s.anleihen] : view === 'depot' ? [s.depot] : [newsTop, s.handel, s.bewegung];
    return (
      <div className="page saal saal--phone" onClick={onClick}>
        <h1 className="bnk-sr">Börsensaal</h1>
        <p className="saal-meta">
          Leitzins {rate == null ? '…' : `${rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })}${NBSP}%`} · {hall.pace.toLocaleString('de-DE')} Trades/min
        </p>
        <PageNav label="Abteilung" views={views} view={view} onView={setView} />
        <MiniStats
          label="Depot und Tender"
          items={[
            { label: 'Depot', value: d ? <DS.Amount value={d.value} compact /> : <DS.Skeleton width={72} /> },
            {
              label: 'Zum Vortag',
              value: (
                <span className={dir === 'up' ? 'saal-up' : dir === 'down' ? 'saal-down' : undefined}>
                  {d?.pct != null ? `${dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}${boardChange(d.pct)}${NBSP}%` : '–'}
                </span>
              ),
            },
            { label: 'Tender in', value: <ClockBlock phone /> },
          ]}
        />
        <Board key={view} sections={board} phone label="Kurstafel" />
      </div>
    );
  }

  return (
    <div className="page saal" onClick={onClick}>
      <h1 className="bnk-sr">Börsensaal</h1>
      <header className="saal-top">
        <div className="saal-top__title">
          <p className="saal-top__name">Börsensaal</p>
          <p className="saal-meta">
            {new Date(today).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {hall.pace.toLocaleString('de-DE')} Trades/min
          </p>
        </div>
        <ClockBlock />
        <DepotBlock depot={hall.depot} />
      </header>
      <div className={`saal-hallwrap${wide ? '' : ' saal-hallwrap--one'}`}>
        <Board sections={[news]} lines={tall ? 5 : 4} label="Anzeigetafel: Meldungen" className="saal-board--news" />
        {wide ? (
          <div className="saal-halves">
            <Board sections={[s.handel]} label="Kurstafel: meistgehandelt" />
            <Board sections={[s.bewegung, s.anleihen, s.depot]} label="Kurstafel: Bewegung, Anleihen, dein Depot" />
          </div>
        ) : (
          <div className="saal-halves saal-halves--one">
            <Board sections={[s.handel, s.bewegung, s.anleihen, s.depot]} label="Kurstafel" />
          </div>
        )}
      </div>
    </div>
  );
}
