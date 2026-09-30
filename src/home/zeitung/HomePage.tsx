// Start page „Zeitung“: the front page of a financial paper that sets itself from live data. Masthead
// with two ears (market weather, your depot and letters) and the dateline (edition, issue number after the
// game day, main rate, trades per minute); the lead story – a fresh article or a report set from the
// data (strongest move with turnover, merger, capital measure, tender, big trade) with a paper graphic;
// two column stories and „Kurz notiert“ below; the price list („Kurszettel“) at the right with your own
// papers marked and prices lighting up on new trades. Breaking news take over the dateline for a moment.
// Phones: the single-column edition, the price list as its own view.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DS } from '../../ds';
import {
  useAllPriceChanges,
  useBondUniverse,
  useCapitalMeasures,
  useDailyHistory,
  useDailyHistoriesState,
  useDividendPayments,
  useInterestHistory,
  useInterestTender,
  useListingProfile,
  useListings,
  useMergers,
  useMinimalStats,
  useMyChats,
  useNews,
  usePortfolio,
  useRecentTrades,
} from '../../api/queries';
import { useSearchParams } from 'react-router';
import type { PricePoint } from '../../api/types';
import { Plot } from '../../charts/Plot';
import { PageNav, usePageView, type PageView } from '../../app/pagenav';
import { tradesPerMinute, withTicks } from '../../app/tape';
import { htmlToText } from '../../lib/html';
import { useIsPhone, useMediaQuery } from '../../lib/useMediaQuery';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { useNow } from '../../lib/useNow';
import { tickClass, useTick } from '../../lib/useTick';
import { changeLookup } from '../../market/screener';
import { bookValue } from '../../organisation/derive';
import { recentPrices, withoutSpikes } from '../../security/derive';
import { germanPart } from '../../whatsnew/derive';
import { leadPriceChart, rateChart } from './charts';
import {
  DAY,
  articleStory,
  bestYields,
  bigTrades,
  breadth as toBreadth,
  breaking,
  briefs as toBriefs,
  capitalStories,
  changeFigure,
  clock,
  depotDay,
  dirOf,
  dividendStories,
  edition,
  firstSentences,
  frontPage,
  keepTrades,
  lastClose,
  latestLetter,
  moveCandidates,
  mergerStories,
  moveQuotes,
  moveStory,
  mostTraded,
  movers,
  pickLead,
  priceFigure,
  rank,
  rateDays,
  rateStory,
  rebase,
  sinceClose,
  sentences,
  toQuotes,
  tradeStory,
  weather,
  withLiveTrades,
  type Article,
  type BigTrade,
  type Close,
  type Breadth,
  type Brief,
  type Letter,
  type ListLine,
  type RateDay,
  type Story,
} from './derive';
import { useTraded, useTradesSince } from './queries';
import './HomePage.css';

const NBSP = String.fromCharCode(0xa0);
const PAPER = 'Alpha-Allgemeine';
const MOTTO = 'Zeitung für Handel und Kapital';
const BREAKING_MS = 45_000;

const VIEWS: PageView[] = [
  { value: 'titel', label: 'Titelseite', description: 'Aufmacher, Meldungen, Kurz notiert' },
  { value: 'kurse', label: 'Kurse', description: 'Der Kurszettel: meistgehandelt, Gewinner, Verlierer, Anleihen', parent: 'titel' },
];

const rate2 = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`;

/* ================================================================== data */

function useElapsed(ms: number) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return done;
}

/** Everything the paper prints, from the shared hooks (same cache as market, tape and security page). */
function usePaper() {
  const now = useNow(20_000);
  const traded = useTraded();
  const changesQ = useAllPriceChanges();
  const trades = useRecentTrades();
  const bonds = useBondUniverse();
  const news = useNews('');
  const mergers = useMergers();
  const dividends = useDividendPayments();
  const increases = useCapitalMeasures('increase');
  const reductions = useCapitalMeasures('reduction');
  const history = useInterestHistory(400);
  const tender = useInterestTender();
  const portfolio = usePortfolio();
  const chats = useMyChats();
  const stats = useMinimalStats();

  const changes = useMemo(() => changeLookup(changesQ.data?.winners, changesQ.data?.losers), [changesQ.data]);
  const mine = useMemo(
    () => new Set((portfolio.data?.positions ?? []).map((p) => p.securityIdentifier ?? p.listing?.securityIdentifier ?? '')),
    [portfolio.data],
  );
  const quotes = useMemo(() => withLiveTrades(toQuotes(traded.data, changes), trades.data), [traded.data, changes, trades.data]);
  const volume = useMemo(() => new Map(quotes.map((q) => [q.asin, q.volume ?? 0])), [quotes]);
  const moving = useMemo(
    () => withLiveTrades(moveQuotes([...(changesQ.data?.winners ?? []), ...(changesQ.data?.losers ?? [])], volume, changes), trades.data),
    [changesQ.data, volume, changes, trades.data],
  );
  // The strongest movers get their real last close (same cache as the security page): the lead and the
  // price list count against it, so headline, figure and chart agree.
  const candidateKey = moveCandidates(moving).join(',');
  const candidates = useMemo(() => (candidateKey ? candidateKey.split(',') : []), [candidateKey]);
  const histories = useDailyHistoriesState(candidates);
  const closes = useMemo(() => {
    const m = new Map<string, Close>();
    for (const a of candidates) {
      const c = lastClose(histories.data[a], now);
      if (c) m.set(a, c);
    }
    return m;
  }, [candidates, histories.data, now]);
  const movingR = useMemo(() => rebase(moving, closes), [moving, closes]);
  const quotesR = useMemo(() => rebase(quotes, closes), [quotes, closes]);
  const breadth = useMemo(() => toBreadth(quotes.filter((q) => q.type === 'STOCK')), [quotes]);
  const ranks = useMemo(() => new Map(mostTraded(quotes, new Set(), 10).map((l, i) => [l.asin, i + 1])), [quotes]);
  const rates = useMemo(() => rateDays(history.data), [history.data]);
  const tape = useMemo(() => withTicks(trades.data ?? []), [trades.data]);
  const pace = tradesPerMinute(tape, now);

  // Big trades: the live feed holds a few minutes only – the page keeps what it saw for half an hour.
  const [kept, setKept] = useState<{ from: unknown; list: BigTrade[] }>({ from: undefined, list: [] });
  if (trades.data !== kept.from) setKept({ from: trades.data, list: keepTrades(kept.list, bigTrades(trades.data, now - 30 * 60_000, 6), now) });
  const tradeNames = useListings(useMemo(() => kept.list.slice(0, 4).map((t) => t.asin), [kept.list]));

  const articles = useMemo<Article[]>(
    () =>
      (news.data?.pages[0]?.content ?? []).slice(0, 12).map((p) => {
        const engine = /^Updates on Alpha-Trader/i.test(p.title);
        return {
          id: p.id,
          title: p.title,
          text: htmlToText(engine ? germanPart(p.content ?? '') : p.content),
          author: p.author?.username,
          date: p.dateCreated ?? 0,
          comments: p.numberOfComments ?? 0,
          company: p.company,
          engine,
        };
      }),
    [news.data],
  );

  const events = useMemo(
    () => [
      ...mergerStories(mergers.data?.content, now, volume),
      ...capitalStories(increases.data?.content, now, false, volume),
      ...capitalStories(reductions.data?.content, now, true, volume),
      ...dividendStories(dividends.data?.content, now, volume),
    ],
    [mergers.data, increases.data, reductions.data, dividends.data, now, volume],
  );
  const rateNews = useMemo(() => rateStory(rates, tender.data?.endDate, now), [rates, tender.data, now]);
  const tradeList = useMemo(
    () => kept.list.slice(0, 4).map((t) => ({ trade: t, name: tradeNames[t.asin]?.name?.trim() ?? t.asin })),
    [kept.list, tradeNames],
  );

  const ranked = useMemo(() => {
    const move = moveStory(movingR, breadth, ranks);
    return rank([
      ...(move ? [move] : []),
      ...articles.map((a) => articleStory(a, now)),
      ...events,
      ...(rateNews ? [rateNews] : []),
      ...tradeList.slice(0, 1).map((t) => tradeStory(t.trade, t.name, now)),
    ]);
  }, [movingR, breadth, ranks, articles, events, rateNews, tradeList, now]);

  // The lead waits for the sources that can lead (a lead swapping a second later is no news) – at most 10 s.
  const patience = useElapsed(10_000);
  const settled = patience || ([traded, changesQ, news, history, mergers].every((q) => !q.isLoading) && !histories.isLoading);

  const positions = portfolio.data?.positions ?? [];
  const depot = portfolio.data
    ? (depotDay(portfolio.data.cash, positions, changes) ?? { value: bookValue({ cash: portfolio.data.cash, positions }), abs: 0, pct: NaN })
    : undefined;

  const list = {
    most: traded.data ? mostTraded(quotesR, mine, 8) : undefined,
    up: changesQ.data && traded.data ? movers(movingR, 'up', mine, 3) : undefined,
    down: changesQ.data && traded.data ? movers(movingR, 'down', mine, 3) : undefined,
    bonds: bonds.data ? bestYields(bonds.data, now, mine, 3) : undefined,
    coin: traded.data ? quotesR.filter((q) => q.type === 'COIN').slice(0, 1).map((q) => ({ asin: q.asin, name: q.name, price: q.price, change: q.change, mine: mine.has(q.asin) })) : undefined,
  };

  return {
    now,
    settled,
    ranked,
    events,
    rateNews,
    tradeList,
    list,
    breadth,
    pace,
    rate: rates[rates.length - 1]?.rate,
    rates,
    tenderEnd: tender.data?.endDate,
    stats: stats.data,
    depot,
    letter: latestLetter(chats.data),
    unread: (chats.data ?? []).reduce((n, c) => n + (!c.publicChat && c.numOfUnreadMessages > 0 ? c.numOfUnreadMessages : 0), 0),
    loadingDepot: portfolio.isLoading,
  };
}

/** Lead (sticky), column stories, short reports and the breaking story of the moment. */
function useLayout(ranked: Story[], settled: boolean, now: number, columns: number) {
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  // Dev only: `?aufmacher=artikel|fusion|…` puts the first story of that kind on top, to see each form of the lead.
  const [params] = useSearchParams();
  const force = import.meta.env.DEV ? params.get('aufmacher') : null;
  const forced = force ? ranked.find((s) => s.kind === force)?.id : undefined;
  const next = settled ? (forced ?? pickLead(ranked, leadId)?.id) : undefined;
  if (next && next !== leadId) setLeadId(next);

  // What was on the page when it settled is no breaking news; everything later may be.
  const [seen, setSeen] = useState<Set<string> | null>(null);
  if (settled && !seen) setSeen(new Set(ranked.map((s) => s.id)));
  const [flash, setFlash] = useState<{ story: Story; at: number } | null>(null);
  const fresh = seen && !flash ? breaking(ranked, seen, now) : undefined;
  if (fresh) {
    setFlash({ story: fresh, at: now });
    setSeen(new Set([...seen!, fresh.id]));
  }
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), BREAKING_MS);
    return () => clearTimeout(id);
  }, [flash]);

  const page = useMemo(() => frontPage(ranked, next ?? leadId, columns), [ranked, next, leadId, columns]);
  return { ...page, seen, flash: flash?.story };
}

/* ================================================================== page */

export function HomePage() {
  const phone = useIsPhone();
  const tall = useMediaQuery('(min-height: 820px)');
  const links = useInternalLinks();
  const [view, setView, views] = usePageView(VIEWS, 'titel');
  const paper = usePaper();
  const { now, settled } = paper;
  const layout = useLayout(paper.ranked, settled, now, 2);
  const ed = edition(now);

  const onPage = useMemo(() => new Set([layout.lead?.id, ...layout.columns.map((c) => c.id)].filter(Boolean) as string[]), [layout.lead, layout.columns]);
  const shorts = useMemo(
    () => toBriefs({ trades: paper.tradeList, events: paper.events, rate: paper.rateNews, stats: paper.stats, skip: onPage, now, n: phone ? 8 : tall ? 5 : 4 }),
    [paper.tradeList, paper.events, paper.rateNews, paper.stats, onPage, now, phone, tall],
  );

  const lead = <Lead story={settled ? layout.lead : undefined} rates={paper.rates} now={now} phone={phone} />;
  // always two column slots: skeletons until the page has settled, so „Kurz notiert“ never jumps sideways
  const cols = settled
    ? [0, 1].map((i) => {
        const st = layout.columns[i];
        return st ? <ColumnStory key={st.id} story={st} fresh={!!layout.seen && !layout.seen.has(st.id)} /> : <div key={`empty-${i}`} className="ztg-col" />;
      })
    : [0, 1].map((i) => <ColumnSkeleton key={i} />);
  const brief = <ShortNews items={shorts} loading={!settled} />;

  if (phone) {
    return (
      <div className="page ztg ztg--phone" onClick={links}>
        <h1 className="bnk-sr">{PAPER} – Titelseite</h1>
        <header className="ztg-pmast">
          <p className="ztg-pmast__title">{PAPER}</p>
          <p className="ztg-pmast__line" aria-live="polite">
            {layout.flash ? (
              <Flash story={layout.flash} now={now} inline />
            ) : (
              <>
                <span>
                  {ed.dateShort} · Nr.{NBSP}{ed.number.toLocaleString('de-DE')}
                </span>
                <span className="ztg-mono">
                  {paper.rate != null ? `Leitzins ${rate2(paper.rate)}` : NBSP} · <Pace value={paper.pace} />
                  {NBSP}Trades/min
                </span>
              </>
            )}
          </p>
        </header>
        <PageNav label="Ressort" views={views} view={view} onView={setView} />
        {view === 'kurse' ? (
          <div className="ztg-pscroll">
            <DepotBox depot={paper.depot} letter={paper.letter} unread={paper.unread} loading={paper.loadingDepot} />
            <PriceList list={paper.list} phone />
          </div>
        ) : (
          <div className="ztg-pscroll">
            {lead}
            <div className="ztg-pcols">{cols}</div>
            {brief}
            <DepotBox depot={paper.depot} letter={paper.letter} unread={paper.unread} loading={paper.loadingDepot} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page ztg" onClick={links}>
      <h1 className="bnk-sr">{PAPER} – Titelseite</h1>
      <header className="ztg-mast">
        <Weather breadth={paper.breadth} />
        <div className="ztg-mast__center">
          <p className="ztg-mast__title">{PAPER}</p>
          <p className="ztg-mast__motto">{MOTTO}</p>
        </div>
        <DepotEar depot={paper.depot} letter={paper.letter} unread={paper.unread} loading={paper.loadingDepot} />
      </header>
      <div className="ztg-dateline" aria-live="polite">
        {layout.flash ? (
          <Flash story={layout.flash} now={now} inline />
        ) : (
          <>
            <span>
              {ed.date} · {ed.name} · {ed.volume}.{NBSP}Jahrgang · Nr.{NBSP}{ed.number.toLocaleString('de-DE')}
            </span>
            <span className="ztg-dateline__live">
              <a href="/zentralbank">Leitzins {paper.rate != null ? rate2(paper.rate) : '…'}</a>
              {paper.tenderEnd ? <> · Tender {clock(paper.tenderEnd)}{NBSP}Uhr</> : null} · <Pace value={paper.pace} />
              {NBSP}Trades/min · <span className="ztg-mono">{ed.time}</span>
              {NBSP}Uhr
            </span>
          </>
        )}
      </div>
      <div className="ztg-body">
        <div className="ztg-main">
          {lead}
          <div className="ztg-cols">
            {cols}
            {brief}
          </div>
        </div>
        <aside className="ztg-side" aria-label="Kurszettel">
          <PriceList list={paper.list} />
        </aside>
      </div>
    </div>
  );
}

/* ================================================================== masthead */

function Pace({ value }: { value: number }) {
  const tick = useTick(value);
  return <span className={`ztg-mono${tickClass(tick)}`}>{value.toLocaleString('de-DE')}</span>;
}

/** Left ear: the market weather – one word, the count of rising and falling shares and a thin split bar. */
function Weather({ breadth: b }: { breadth: Breadth }) {
  const total = b.up + b.down + b.flat;
  return (
    <a className="ztg-ear" href="/markt?ansicht=karte" aria-label={total ? `Börsenwetter: ${weather(b)}, ${b.up} Aktien steigen, ${b.down} fallen` : 'Börsenwetter'}>
      <span className="ztg-ear__label">Börsenwetter</span>
      <span className="ztg-ear__word">{total ? weather(b) : NBSP}</span>
      <span className="ztg-ear__line ztg-mono" aria-hidden="true">
        {total ? (
          <>
            <span className="ztg-up">▲{NBSP}{b.up}</span> <span className="ztg-down">▼{NBSP}{b.down}</span> <span className="ztg-muted">={NBSP}{b.flat}</span>
          </>
        ) : (
          NBSP
        )}
      </span>
      <span className="ztg-split" aria-hidden="true">
        <i className="ztg-split__up" style={{ flexGrow: b.up }} />
        <i className="ztg-split__flat" style={{ flexGrow: b.flat }} />
        <i className="ztg-split__down" style={{ flexGrow: b.down }} />
      </span>
    </a>
  );
}

type Depot = { value: number; abs: number; pct: number } | undefined;

function DepotChange({ depot }: { depot: NonNullable<Depot> }) {
  if (Number.isNaN(depot.pct)) return null;
  const dir = dirOf(depot.pct);
  return (
    <span className={`ztg-mono ${dir === 'up' ? 'ztg-up' : dir === 'down' ? 'ztg-down' : 'ztg-muted'}`}>
      {dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}
      {changeFigure(depot.pct)}
      {NBSP}%
    </span>
  );
}

/** Right ear: your depot against yesterday's close and the newest unread letter. */
function DepotEar({ depot, letter, unread, loading }: { depot: Depot; letter?: Letter; unread: number; loading: boolean }) {
  const tick = useTick(depot?.value);
  return (
    <div className="ztg-ear ztg-ear--right">
      <a className="ztg-ear__label" href="/organisation">
        Dein Depot
      </a>
      <a className={`ztg-ear__word ztg-mono${tickClass(tick)}`} href="/organisation">
        {depot ? <DS.Amount value={depot.value} compact="auto" /> : loading ? <DS.Skeleton variant="text" width={110} /> : '–'}
      </a>
      <span className="ztg-ear__line">{depot ? <><DepotChange depot={depot} /> <span className="ztg-muted">zum Vortag</span></> : NBSP}</span>
      <a className="ztg-ear__post" href={letter ? `/nachrichten/${letter.chatId}` : '/nachrichten'}>
        <span className="ztg-ear__label">Leserpost</span>{' '}
        {letter ? (
          <>
            <b>{unread}</b> · {letter.from}
          </>
        ) : (
          <span className="ztg-muted">alles gelesen</span>
        )}
      </a>
    </div>
  );
}

/** Breaking news: the dateline (wide) or a bar above the lead (phone) for 45 seconds. */
function Flash({ story, now, inline = false }: { story?: Story; now: number; inline?: boolean }) {
  if (!story) return null;
  return (
    <a className={`ztg-flash${inline ? ' ztg-flash--inline' : ''}`} href={story.href} key={story.id}>
      <span className="ztg-flash__tag">Eilmeldung</span>
      <span className="ztg-mono ztg-flash__time">{clock(Math.min(story.at, now))}</span>
      <span className="ztg-flash__text">{story.title}</span>
    </a>
  );
}

/* ================================================================== lead */

/** The lead's price line: 2 days for moves and trades (the last close as reference), 14 days otherwise. */
function usePricePoints(asin: string, days: number, now: number) {
  const profile = useListingProfile(asin);
  const history = useDailyHistory(asin);
  const points = useMemo(
    () => (asin ? recentPrices(history.data, profile.data?.prices14d, days * DAY, now) : []),
    [asin, history.data, profile.data?.prices14d, days, now],
  );
  return { points, loading: !!asin && (profile.isLoading || history.isLoading) };
}

function Lead({ story, rates, now, phone }: { story?: Story; rates: RateDay[]; now: number; phone: boolean }) {
  if (!story)
    return (
      <article className="ztg-lead" aria-busy="true">
        <p className="ztg-kicker">{NBSP}</p>
        <h2 className="ztg-lead__title ztg-wait">{NBSP}</h2>
        <p className="ztg-lead__dek ztg-wait ztg-wait--short">{NBSP}</p>
        <div className="ztg-lead__body">
          <div className="ztg-lead__text">
            <DS.Skeleton variant="text" lines={4} />
          </div>
          <div className="ztg-fig">
            <DS.Skeleton variant="block" height="100%" />
          </div>
        </div>
      </article>
    );
  const cta = story.chart?.kind === 'price' ? (story.kind === 'artikel' ? 'Weiterlesen' : `Zur Aktie ${story.chart.name}`) : story.kind === 'artikel' ? 'Weiterlesen' : 'Mehr dazu';
  return (
    <article className={`ztg-lead${story.chart ? '' : ' ztg-lead--text'}`}>
      <p className="ztg-kicker">{story.kicker}</p>
      <h2 className="ztg-lead__title">
        <a href={story.href}>{story.title}</a>
      </h2>
      {story.dek && <p className="ztg-lead__dek">{story.dek}</p>}
      <div className="ztg-lead__body">
        <div className="ztg-lead__text">
          <p className="ztg-byline">{story.byline}</p>
          {!story.chart && !phone ? <FitLede text={story.more ?? story.lede} /> : <p className="ztg-lede">{story.lede}</p>}
          <p className="ztg-lead__more">
            <a href={story.href}>{cta}</a>
            {story.kind === 'artikel' && story.chart?.kind === 'price' && (
              <>
                {' · '}
                <a href={`/wertpapier/${story.chart.asin}`}>Zur Aktie</a>
              </>
            )}
          </p>
        </div>
        {story.chart && <Graphic story={story} rates={rates} now={now} phone={phone} />}
      </div>
    </article>
  );
}

/**
 * The lede of a lead without graphic, set in two columns: as many whole sentences as fit, then „…“ – a
 * paper never breaks off mid-sentence. Measured after layout (an overflowing third column = too long).
 */
function FitLede({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const list = useMemo(() => sentences(text), [text]);
  const [fit, setFit] = useState<{ text: string; n: number }>({ text: '', n: 0 });
  const n = fit.text === text ? fit.n : list.length;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = -1;
    // try the text sentence by sentence on the element itself, then render the count that fits once
    const measure = () => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      let k = list.length;
      for (; k > 1; k--) {
        el.textContent = firstSentences(list, k);
        if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) break;
      }
      el.textContent = firstSentences(list, k);
      setFit((f) => (f.text === text && f.n === k ? f : { text, n: k }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // the measuring rewrites the text node, so the element is keyed by what it shows and measured anew
  }, [text, list, n]);
  return (
    <p className="ztg-lede" ref={ref} key={`${text.length}-${n}`}>
      {firstSentences(list, n)}
    </p>
  );
}

/** The paper graphic: a title line, the plot, the source line. */
function Graphic({ story, rates, now, phone }: { story: Story; rates: RateDay[]; now: number; phone: boolean }) {
  const chart = story.chart!;
  const asin = chart.kind === 'price' ? chart.asin : '';
  const short = story.kind === 'bewegung' || story.kind === 'trade';
  const close = chart.kind === 'price' ? chart.close : undefined;
  // with a real close: the close, then every trade since (once per lead from the log, then live)
  const logged = useTradesSince(close ? asin : '', close?.date);
  const live = useRecentTrades();
  const recent = usePricePoints(close ? '' : asin, short ? 2 : 14, now);
  const points = useMemo(
    () => (close ? withoutSpikes(sinceClose(close, logged.data, live.data, asin)) : recent.points),
    [close, logged.data, live.data, asin, recent.points],
  );
  const loading = close ? logged.isLoading : recent.loading;
  const ref = chart.kind === 'price' ? chart.ref : undefined;
  const days = useMemo(() => rates.slice(-14), [rates]);
  const startLabel = close ? `Schluss ${clock(close.date)}` : undefined;
  const refLabel = close || !short ? 'Schluss' : 'Vortag';
  const priceFig = useCallback(
    (t: Parameters<typeof leadPriceChart>[0], w: number) => leadPriceChart(t, w, points as PricePoint[], ref, startLabel, refLabel),
    [points, ref, startLabel, refLabel],
  );
  const rateFigure = useCallback((t: Parameters<typeof rateChart>[0], w: number) => rateChart(t, w, days), [days]);
  const last = chart.kind === 'price' ? points[points.length - 1]?.value : days[days.length - 1]?.rate;
  const dir = chart.kind === 'price' && ref && last ? dirOf((last / ref - 1) * 100) : null;
  const title =
    chart.kind === 'price' ? (
      <>
        <b>{chart.name}</b> · Kurs in €, {close ? 'seit dem letzten Tagesschluss' : short ? 'seit gestern' : 'letzte 14 Tage'}
      </>
    ) : (
      <>
        <b>Leitzins</b> · in %, je Zinstender
      </>
    );
  const value =
    last == null ? null : (
      <span className={`ztg-fig__value ztg-mono${dir === 'up' ? ' ztg-up' : dir === 'down' ? ' ztg-down' : ''}`}>
        {dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}
        {chart.kind === 'price' ? `${priceFigure(last)}${NBSP}€` : rate2(last)}
      </span>
    );
  const source =
    chart.kind === 'price'
      ? `Quelle: Alpha-Trader, ${close ? 'Tagesschluss und alle Trades seither' : 'Trades und Tagesschlusskurse'} · Stand ${clock(now)} Uhr`
      : 'Quelle: Alpha-Trader Zentralbank';
  const empty = chart.kind === 'price' ? points.length < 2 : days.length < 2;
  return (
    <figure className="ztg-fig">
      <figcaption className="ztg-fig__title">
        <span className="ztg-fig__name">{title}</span>
        {value}
      </figcaption>
      <div className="ztg-fig__plot">
        {empty ? (
          loading || chart.kind === 'rate' ? (
            <DS.Skeleton variant="block" height="100%" />
          ) : (
            <p className="ztg-muted ztg-fig__empty">Keine Kurse in diesem Zeitraum.</p>
          )
        ) : chart.kind === 'price' ? (
          <Plot figure={priceFig} aria-label={`Kursverlauf ${chart.name}`} />
        ) : (
          <Plot figure={rateFigure} aria-label="Leitzins der letzten 14 Tage" />
        )}
      </div>
      {!phone && <p className="ztg-fig__source">{source}</p>}
    </figure>
  );
}

/* ================================================================== columns */

function ColumnStory({ story, fresh }: { story: Story; fresh: boolean }) {
  return (
    <article className={`ztg-col${fresh ? ' is-new' : ''}`}>
      <p className="ztg-kicker">{story.kicker}</p>
      <h3 className="ztg-col__title">
        <a href={story.href}>{story.title}</a>
      </h3>
      <p className="ztg-byline">{story.byline}</p>
      <p className="ztg-col__text">
        {story.dek ? <span className="ztg-col__dek">{story.dek}. </span> : null}
        {story.lede}
      </p>
    </article>
  );
}

function ColumnSkeleton() {
  return (
    <div className="ztg-col" aria-hidden="true">
      <p className="ztg-kicker">{NBSP}</p>
      <DS.Skeleton variant="title" />
      <DS.Skeleton variant="text" lines={4} />
    </div>
  );
}

/** „Kurz notiert“: short reports with a time stamp in the margin; new ones slide in. */
function ShortNews({ items, loading }: { items: Brief[]; loading: boolean }) {
  // what stood there when the page settled is no news; later reports slide in
  const [first, setFirst] = useState<Set<string> | null>(null);
  if (!loading && !first) setFirst(new Set(items.map((b) => b.id)));
  return (
    <section className="ztg-col ztg-short" aria-label="Kurz notiert">
      <p className="ztg-kicker">Kurz notiert</p>
      {loading ? (
        <DS.Skeleton variant="rows" rows={4} />
      ) : items.length ? (
        <ul className="ztg-short__list">
          {items.map((b) => (
            <li key={b.id} className={first && !first.has(b.id) ? 'is-new' : undefined}>
              <a href={b.href}>
                <span className="ztg-short__stamp ztg-mono">{b.stamp}</span>
                <span className="ztg-short__text">{b.text}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ztg-muted">Nichts angekündigt.</p>
      )}
    </section>
  );
}

/* ================================================================== the price list */

type List = {
  most?: ListLine[];
  up?: ListLine[];
  down?: ListLine[];
  bonds?: ListLine[];
  coin?: ListLine[];
};

function PriceList({ list, phone = false }: { list: List; phone?: boolean }) {
  return (
    <div className={`ztg-kz${phone ? ' ztg-kz--phone' : ''}`}>
      <p className="ztg-kz__head">
        <span>Kurszettel</span>
        <span className="ztg-kz__unit">Kurs € · zum Vortag %</span>
      </p>
      <Section title="Meistgehandelt" note="Aktien, Umsatz 24 Std." rows={list.most} n={8} href="/markt?sort=-ums" className="ztg-kz__sec--most" />
      <Section title="Gewinner" note="mit Umsatz" rows={list.up} n={3} href="/markt?sort=-ver" className="ztg-kz__sec--move" />
      <Section title="Verlierer" note="mit Umsatz" rows={list.down} n={3} href="/markt?sort=ver" className="ztg-kz__sec--move" />
      <Section title="Anleihen" note="Rendite je Tag zum Brief, %" rows={list.bonds} n={3} href="/markt?art=BOND" className="ztg-kz__sec--bonds" />
      <Section title="AlphaCoin" rows={list.coin} n={1} href="/wertpapier/ACALPHCOIN" />
      <p className="ztg-kz__foot">
        <i className="ztg-kz__mark" aria-hidden="true" /> = in deinem Depot
      </p>
    </div>
  );
}

function Section({ title, note, rows, n, href, className }: { title: string; note?: string; rows?: ListLine[]; n: number; href: string; className?: string }) {
  return (
    <section className={`ztg-kz__sec${className ? ` ${className}` : ''}`}>
      <h3 className="ztg-kz__title">
        <a href={href}>{title}</a>
        {note && <span className="ztg-kz__note">{note}</span>}
      </h3>
      <ol className="ztg-kz__rows">
        {rows
          ? rows.length
            ? rows.map((r) => <PriceRow key={r.asin} row={r} />)
            : <li className="ztg-kz__none">–</li>
          : Array.from({ length: n }, (_, i) => (
              <li key={i} className="ztg-kz__row ztg-kz__row--wait" aria-hidden="true">
                <DS.Skeleton variant="text" width="60%" />
              </li>
            ))}
      </ol>
    </section>
  );
}

function PriceRow({ row }: { row: ListLine }) {
  const tick = useTick(row.pct ? null : row.price);
  const dir = dirOf(row.change);
  const cls = dir === 'up' ? 'ztg-up' : dir === 'down' ? 'ztg-down' : 'ztg-muted';
  const label = `${row.name}${row.mine ? ' (in deinem Depot)' : ''}`;
  return (
    <li className={`ztg-kz__row${row.mine ? ' is-mine' : ''}`}>
      <a href={`/wertpapier/${row.asin}`} title={label}>
        <span className="ztg-kz__name">
          {row.name}
          {row.note && <span className="ztg-kz__rownote"> {row.note}</span>}
        </span>
        <span className={`ztg-kz__price ztg-mono${tickClass(tick)}`}>
          {row.price == null ? '–' : row.pct ? row.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : priceFigure(row.price)}
        </span>
        <span className={`ztg-kz__chg ztg-mono ${cls}`}>
          {row.pct ? (row.left ?? '') : row.change == null ? '–' : `${dir === 'up' ? '▲' : dir === 'down' ? '▼' : ''}${changeFigure(row.change)}`}
        </span>
      </a>
    </li>
  );
}

/* ================================================================== phone: depot box */

function DepotBox({ depot, letter, unread, loading }: { depot: Depot; letter?: Letter; unread: number; loading: boolean }): ReactNode {
  return (
    <div className="ztg-box">
      <a className="ztg-box__row" href="/organisation">
        <span className="ztg-ear__label">Dein Depot</span>
        <span className="ztg-mono">{depot ? <DS.Amount value={depot.value} compact="auto" /> : loading ? <DS.Skeleton variant="text" width={90} /> : '–'}</span>
        {depot && <DepotChange depot={depot} />}
      </a>
      <a className="ztg-box__row" href={letter ? `/nachrichten/${letter.chatId}` : '/nachrichten'}>
        <span className="ztg-ear__label">Leserpost</span>
        {letter ? (
          <span className="ztg-box__letter">
            <b>{unread}</b> · {letter.from}: „{letter.text}“
          </span>
        ) : (
          <span className="ztg-muted">alles gelesen</span>
        )}
      </a>
    </div>
  );
}
