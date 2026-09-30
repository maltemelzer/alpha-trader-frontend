// Start page „Bühne“: one lead on a big stage – whatever moves the market most right now. Scenes change by
// themselves (12 s, progress like stories), hover/focus/the pause button hold them, arrows and swiping move
// on. Underneath a slim programme of the next scenes and one quiet line with depot and unread messages.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DS } from '../../ds';
import {
  useCapitalMeasures,
  useChatUnread,
  useDividendPayments,
  useInterestTender,
  useListings,
  useMainInterestRate,
  useMergers,
  useNews,
  usePortfolio,
  useTrades,
  useAccountDetails,
} from '../../api/queries';
import { htmlToText } from '../../lib/html';
import { useIsPhone, useMediaQuery } from '../../lib/useMediaQuery';
import { useNow } from '../../lib/useNow';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { bookValue } from '../../organisation/derive';
import {
  SCENE_MS,
  biggestTrade,
  countdown,
  countdownShort,
  eventScenes,
  eyebrowOf,
  followScene,
  lastClose,
  sinceClose,
  stripLead,
  breakingNews,
  accountLabel,
  pullQuote,
  kindLabel,
  moverScenes,
  newsScenes,
  paceBars,
  programme,
  reasonOf,
  stageAsin,
  tenderScene,
  tradeScene,
  ago,
  MIN,
  HOUR,
  type EventInput,
  type NewsInput,
  type Scene,
} from './derive';
import { useCloses, useMoverBoard, useStageTrades } from './queries';
import { ClockStage, NewsStage, PaceFloor, STAGE_TRADES, StageChart, useSeconds, useSize } from './Stage';
import './HomePage.css';

const NBSP = String.fromCharCode(0xa0);

/** All scene candidates from the live data, ranked into the programme. */
function useProgramme(now: number) {
  const trades = useStageTrades();
  const movers = useMoverBoard();
  const news = useNews('');
  const tender = useInterestTender();
  const rate = useMainInterestRate();
  const dividends = useDividendPayments();
  const mergers = useMergers();
  const increases = useCapitalMeasures('increase');
  const portfolio = usePortfolio();

  const positions = useMemo(
    () => (portfolio.data?.positions ?? []).map((p) => ({ asin: p.securityIdentifier, shares: p.numberOfShares, value: p.volume ?? 0 })),
    [portfolio.data],
  );

  const list = useMemo(() => {
    const articles: NewsInput[] = (news.data?.pages[0]?.content ?? []).slice(0, 8).map((p) => ({
      id: p.id,
      title: p.title,
      text: htmlToText(stripLead(p.content)),
      author: p.author?.username,
      company: p.company ? { name: p.company.name, asin: p.company.securityIdentifier } : p.listing ? { name: p.listing.name, asin: p.listing.securityIdentifier } : undefined,
      date: p.dateCreated ?? 0,
      likes: p.numberOfLikes ?? 0,
      comments: p.numberOfComments ?? 0,
      tags: (p.hashTags ?? []).map((t) => t.tag),
    }));
    const events: EventInput[] = [
      ...(dividends.data?.content ?? []).map((d) => ({
        id: d.id,
        kind: 'dividend' as const,
        company: d.company.name,
        asin: d.company.securityIdentifier,
        date: d.startDate,
        amount: d.maximalCashVolume,
      })),
      ...(mergers.data?.content ?? []).map((m) => ({
        id: m.id,
        kind: 'merger' as const,
        company: m.company.name,
        asin: m.company.securityIdentifier,
        date: m.startDate,
        acquirer: m.acquiringCompany?.name,
      })),
      ...(increases.data?.content ?? []).map((c) => ({
        id: c.id,
        kind: 'increase' as const,
        company: c.company.name,
        asin: c.company.securityIdentifier,
        date: c.startDate > now ? c.startDate : c.endDate,
        shares: c.numberOfShares,
        price: c.price,
      })),
    ];
    const candidates: Scene[] = [
      ...moverScenes(movers.data ?? [], positions),
      ...newsScenes(articles, now),
      ...eventScenes(events, now),
    ];
    const t = tradeScene(biggestTrade(trades.data, now - 15 * MIN), now);
    if (t) candidates.push(t);
    const td = tenderScene(
      tender.data ? { asin: tender.data.bondListing.securityIdentifier ?? '', endDate: tender.data.endDate } : undefined,
      rate.data?.value,
      now,
    );
    if (td) candidates.push(td);
    return programme(candidates);
  }, [movers.data, positions, news.data, dividends.data, mergers.data, increases.data, trades.data, tender.data, rate.data, now]);

  const loading = movers.isPending || news.isPending || trades.isPending || tender.isPending || mergers.isPending || dividends.isPending;
  return { list, loading, trades: trades.data, portfolio: portfolio.data };
}

/** Primary action of a scene: where it leads and what the brass button says. */
function actionOf(s: Scene, type?: string): { href: string; label: string; second?: { href: string; label: string } } {
  const security = type === 'COIN' ? 'Zum Coin · handeln' : type === 'STOCK' || !type ? 'Zur Aktie · handeln' : 'Zum Wertpapier';
  switch (s.kind) {
    case 'mover':
      return { href: `/wertpapier/${s.line.asin}`, label: security };
    case 'trade':
      return { href: `/wertpapier/${s.trade.asin}`, label: security, second: { href: '/stroeme', label: 'Geldflüsse' } };
    case 'news':
      return {
        href: `/zeitung/${s.news.id}`,
        label: 'Artikel lesen',
        second: s.news.company?.asin ? { href: `/wertpapier/${s.news.company.asin}`, label: s.news.company.name } : undefined,
      };
    case 'tender':
      return { href: '/zentralbank?ansicht=tender', label: 'Zum Zinstender', second: { href: '/zentralbank', label: 'Zentralbank' } };
    case 'event':
      return {
        href: `/kapitalmassnahmen?art=${s.event.kind === 'dividend' ? 'dividenden' : s.event.kind === 'merger' ? 'fusionen' : 'kapital'}`,
        label: 'Alle Termine',
        second: s.event.asin ? { href: `/wertpapier/${s.event.asin}`, label: 'Zur Aktie' } : undefined,
      };
  }
}

/** Title of a scene; trades need the security's name first. */
function titleOf(s: Scene, names: Record<string, string>): string {
  switch (s.kind) {
    case 'mover':
      return s.line.name;
    case 'trade':
      return names[s.trade.asin] ?? s.trade.asin;
    case 'news':
      return s.news.title;
    case 'tender':
      return 'Der Leitzins wird ausgehandelt';
    case 'event':
      return s.event.company;
  }
}

const titleSize = (t: string) => (t.length <= 22 ? 'xl' : t.length <= 44 ? 'lg' : 'md');

/** The big figure of a scene. */
function Figure({ s, now, parties }: { s: Scene; now: number; parties?: { buyer?: string; seller?: string } }) {
  switch (s.kind) {
    case 'mover':
      return (
        <div className="buehne-figure">
          <span className="buehne-figure__num">{s.line.price != null ? DS.format.price(s.line.price, s.line.type) : '–'}</span>
          {s.line.basis === 'pending' ? (
            <DS.Skeleton variant="text" width={200} />
          ) : (
            <DS.PriceChange
              value={s.line.change}
              variant="tag"
              size="lg"
              decimals={Math.abs(s.line.change) < 10 ? 2 : 1}
              suffix={s.line.basis === 'close' ? 'seit Tagesschluss' : 'zum Vortag'}
            />
          )}
        </div>
      );
    case 'trade':
      return (
        <div className="buehne-figure">
          <span className="buehne-figure__num">
            <DS.Amount value={s.trade.volume} compact />
          </span>
          <span className="buehne-figure__note">in einem Trade · {ago(s.trade.date, now)}</span>
          {(parties?.seller || parties?.buyer) && (
            <p className="buehne-parties">
              <span className="buehne-parties__who">
                <small>Verkauft</small>
                {parties.seller ?? 'unbekannt'}
              </span>
              <span className="buehne-parties__arrow" aria-label="an">
                →
              </span>
              <span className="buehne-parties__who">
                <small>Gekauft</small>
                {parties.buyer ?? 'unbekannt'}
              </span>
            </p>
          )}
        </div>
      );
    case 'news':
      return (
        <p className="buehne-byline">
          {s.news.author ? `von ${s.news.author} · ` : ''}
          {ago(s.news.date, now)}
          {s.news.comments ? ` · ${s.news.comments} Kommentar${s.news.comments === 1 ? '' : 'e'}` : ''}
          {s.news.likes ? ` · ${s.news.likes} Likes` : ''}
        </p>
      );
    case 'tender':
      return (
        <div className="buehne-figure">
          <span className="buehne-figure__num">noch {(s.endDate - now < 3 * HOUR ? countdown : countdownShort)(s.endDate - now)}</span>
          <span className="buehne-figure__note">
            Bieterschluss {new Date(s.endDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            {NBSP}Uhr
          </span>
        </div>
      );
    case 'event':
      return (
        <div className="buehne-figure">
          <span className="buehne-figure__num">in {(s.event.date - now < 3 * HOUR ? countdown : countdownShort)(s.event.date - now)}</span>
          {s.event.amount ? (
            <span className="buehne-figure__note">
              bis zu <DS.Amount value={s.event.amount} compact />
            </span>
          ) : null}
        </div>
      );
  }
}

/** Small figure on a programme tile. */
function TileFigure({ s, now }: { s: Scene; now: number }) {
  switch (s.kind) {
    case 'mover':
      return s.line.basis === 'pending' ? (
        <DS.Skeleton variant="text" width={48} />
      ) : (
        <DS.PriceChange value={s.line.change} size="sm" decimals={Math.abs(s.line.change) < 10 ? 2 : 0} />
      );
    case 'trade':
      return <span className="buehne-tile__fig">{DS.format.money(s.trade.volume, '€', 2, true)}</span>;
    case 'news':
      return <span className="buehne-tile__fig">{ago(s.news.date, now)}</span>;
    case 'tender':
      return <span className="buehne-tile__fig">noch {countdownShort(s.endDate - now)}</span>;
    case 'event':
      return <span className="buehne-tile__fig">in {countdownShort(s.event.date - now)}</span>;
  }
}

const KINDS = ['mover', 'trade', 'news', 'tender', 'event'];

export function HomePage() {
  const phone = useIsPhone();
  const wide = useMediaQuery('(min-width: 900px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const onLinks = useInternalLinks();
  const [params] = useSearchParams();
  const now = useNow(30_000);
  const { list: ranked, loading, trades, portfolio } = useProgramme(now);

  // The programme holds still while it runs: it is ranked once everything has loaded and again each time it
  // starts over – tiles never jump around under the viewer. The scenes' figures stay live meanwhile.
  const [held, setHeld] = useState<Scene[] | null>(null);
  if (held == null && !loading && ranked.length) setHeld(ranked);
  const rawList = useMemo(() => {
    if (!held) return [];
    const fresh = new Map(ranked.map((s) => [s.id, s]));
    return held.map((s) => fresh.get(s.id) ?? s);
  }, [held, ranked]);
  const unread = useChatUnread();
  const pace = useMemo(() => paceBars(trades, now, 12 * MIN, 20_000), [trades, now]);
  const rate = useMainInterestRate();

  // Which scene plays: kept by id, so a re-ranked list does not cut the running scene.
  const [active, setActive] = useState<{ id?: string; index: number; since: number }>(() => ({ index: 0, since: Date.now() }));
  const wanted = params.get('szene');
  const startKind = wanted && KINDS.includes(wanted) ? wanted : undefined;
  const index = useMemo(() => {
    if (!active.id && startKind) {
      const i = rawList.findIndex((s) => s.kind === startKind);
      if (i >= 0) return i;
    }
    return followScene(rawList, active.id, active.index);
  }, [rawList, active, startKind]);

  // A move on stage is measured against the daily close the chart draws, so figure and line agree.
  // Tiles and stage show the same number: every move in the programme against its last daily close.
  const moverAsins = useMemo(() => rawList.flatMap((s) => (s.kind === 'mover' ? [s.line.asin] : [])), [rawList]);
  const closes = useCloses(moverAsins);
  const list = useMemo(
    () =>
      rawList.map((s) =>
        s.kind === 'mover' ? sinceClose(s, lastClose(closes.data[s.line.asin], now), closes.settled[s.line.asin]) : s,
      ),
    [rawList, closes, now],
  );
  const scene = list[index] as Scene | undefined;

  // Breaking news (< 30 min) does not wait for the next round: it comes on right after the running scene.
  const breaking = held ? breakingNews(ranked, held, now) : undefined;
  if (held && breaking) setHeld([...list.slice(0, index + 1), breaking, ...list.slice(index + 1)]);

  const go = useCallback(
    (i: number) => {
      if (!list.length) return;
      if (i >= list.length && ranked.length) {
        // One round is over: the next one runs in the new order.
        setHeld(ranked);
        setActive({ id: ranked[0].id, index: 0, since: Date.now() });
        return;
      }
      const n = (i + list.length) % list.length;
      setActive({ id: list[n].id, index: n, since: Date.now() });
    },
    [list, ranked],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Hold: hover or focus on stage/programme, the pause button, a hidden tab; reduced motion starts held.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [paused, setPaused] = useState(reduced);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const holding = paused || hover || focus || hidden;

  // Arrow keys anywhere on the page (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Swipe on the stage.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) (dx < 0 ? next : prev)();
  };

  const tradeAsins = list.flatMap((s) => (s.kind === 'trade' ? [s.trade.asin] : []));
  const listings = useListings(tradeAsins);
  const names = Object.fromEntries(Object.entries(listings).map(([k, v]) => [k, v.name ?? k]));

  // Buyer and seller of the big trade by name (private depots have none in the log).
  const accountIds = list.flatMap((s) => (s.kind === 'trade' ? [s.trade.buyerAccount, s.trade.sellerAccount].filter((x): x is string => !!x) : []));
  const accounts = useAccountDetails(accountIds);
  const parties =
    scene?.kind === 'trade'
      ? {
          buyer: accountLabel(accounts.data[scene.trade.buyerAccount ?? '']?.name) ?? accountLabel(scene.trade.buyer),
          seller: accountLabel(accounts.data[scene.trade.sellerAccount ?? '']?.name) ?? accountLabel(scene.trade.seller),
        }
      : undefined;

  const tick = useSeconds(!!scene && (scene.kind === 'tender' || scene.kind === 'event'));
  const clock = Math.max(now, tick);

  // The stage keeps the left part free for the text when it is wide enough to overlap.
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = useSize(stageRef);
  const inset = wide ? Math.round(stageSize.width * 0.44) : 16;

  const depot = portfolio ? bookValue(portfolio) : undefined;

  // The running scene's tile stays in view in the swipeable programme (phone) – without scrolling the page.
  const tilesRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = tilesRef.current;
    const li = ol?.children[index] as HTMLElement | undefined;
    if (!ol || !li || ol.scrollWidth <= ol.clientWidth) return;
    const left = li.getBoundingClientRect().left - ol.getBoundingClientRect().left + ol.scrollLeft;
    if (left < ol.scrollLeft || left + li.offsetWidth > ol.scrollLeft + ol.clientWidth) ol.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }, [index, reduced, list.length]);

  const quiet = (
    <p className="buehne-quiet">
      <span className="buehne-quiet__live">
        <i aria-hidden="true" /> Live
      </span>
      {!phone && (
        <>
          {rate.data && (
            <>
              <span className="buehne-quiet__sep">·</span>
              <span>
                Leitzins <b>{rate.data.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{NBSP}%</b>
              </span>
            </>
          )}
        </>
      )}
      <span className="buehne-quiet__right">
        <Link to="/organisation" className="buehne-quiet__link">
          Dein Depot{' '}
          <b>{depot != null ? <DS.Amount value={depot} compact /> : <DS.Skeleton variant="text" width={72} />}</b>
        </Link>
        <span className="buehne-quiet__sep">·</span>
        <Link to="/nachrichten" className="buehne-quiet__link">
          {unread.messages > 0 ? (
            <>
              <b>{unread.messages}</b> {unread.messages === 1 ? 'ungelesene Nachricht' : 'ungelesene Nachrichten'}
            </>
          ) : (
            'Keine neuen Nachrichten'
          )}
        </Link>
      </span>
    </p>
  );

  const action = scene ? actionOf(scene, scene.kind === 'mover' ? scene.line.type : undefined) : undefined;
  const title = scene ? titleOf(scene, names) : '';
  const asin = scene ? stageAsin(scene) : undefined;
  // No scene yet: the market's pace holds the stage.
  const quietNews = !scene;
  const newsStage =
    scene?.kind === 'news' ? (
      <NewsStage
        key={`news-${scene.id}`}
        quote={pullQuote(scene.news.text)}
        likes={scene.news.likes}
        comments={scene.news.comments}
        tags={scene.news.tags ?? []}
        inset={inset}
      />
    ) : undefined;
  const nextAsin = list[(index + 1) % Math.max(1, list.length)] ? stageAsin(list[(index + 1) % list.length]) : undefined;

  return (
    <div className={`page buehne${phone ? ' buehne--phone' : !wide ? ' buehne--narrow' : ''}`} onClick={onLinks}>
      <h1 className="bnk-sr">Start – was den Markt gerade bewegt</h1>
      {quiet}
      <div
        className="buehne-main"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocus(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
        }}
      >
        <section
          ref={stageRef}
          className="buehne-stage"
          aria-roledescription="Bühne"
          aria-label={scene ? `${eyebrowOf(scene)}: ${title}` : 'Bühne wird vorbereitet'}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {!quietNews && <PaceFloor bars={pace} />}
          {quietNews && <PaceFloor bars={pace} tall inset={inset} />}
          {scene?.kind === 'news' && !asin && newsStage}
          {scene?.kind === 'event' && (
            <ClockStage
              key={`clock-${scene.id}`}
              to={scene.event.date}
              now={clock}
              inset={inset}
              caption={scene.event.kind === 'merger' && scene.event.acquirer ? `${scene.event.company} → ${scene.event.acquirer}` : undefined}
            />
          )}
          {scene && scene.kind !== 'event' && (asin || scene.kind === 'tender') && (
            <StageChart
              key={`chart-${asin ?? 'rate'}`}
              asin={asin}
              rate={scene.kind === 'tender'}
              type={scene.kind === 'mover' ? scene.line.type : 'STOCK'}
              refPrice={scene.kind === 'mover' && scene.line.price ? scene.line.price / (1 + scene.line.change / 100) : undefined}
              refLabel="Tagesschluss"
              change={scene.kind === 'mover' ? scene.line.change : undefined}
              sceneKey={scene.id}
              since={active.since}
              inset={inset}
              now={now}
              name={title}
              fallback={newsStage ?? <PaceFloor bars={pace} tall inset={inset} />}
              sinceClose={scene.kind === 'mover'}
              highlight={scene.kind === 'trade' ? { id: scene.trade.id, label: 'dieser Trade' } : undefined}
            />
          )}
          {nextAsin && nextAsin !== asin && <Prefetch asin={nextAsin} />}
          <div className="buehne-text" key={`text-${scene?.id ?? 'wait'}`} aria-live={holding ? 'polite' : 'off'}>
            {scene ? (
              <>
                <p className="buehne-eyebrow">{eyebrowOf(scene)}</p>
                <h2 className={`buehne-title buehne-title--${titleSize(title)}`}>
                  {asin && scene.kind !== 'news' ? <Link to={`/wertpapier/${asin}`}>{title}</Link> : title}
                </h2>
                <Figure s={scene} now={clock} parties={parties} />
                {scene.kind === 'mover' && scene.line.basis === 'pending' ? (
                  <div className="buehne-reason">
                    <DS.Skeleton variant="text" lines={2} />
                  </div>
                ) : (
                  <p className="buehne-reason">{reasonOf(scene, clock)}</p>
                )}
                {action && (
                  <div className="buehne-actions">
                    <Link to={action.href} className="bnk-btn bnk-btn--primary bnk-btn--lg">
                      {action.label}
                    </Link>
                    {action.second && (
                      <Link to={action.second.href} className="bnk-btn bnk-btn--secondary bnk-btn--lg buehne-second">
                        <span className="buehne-second__txt">{action.second.label}</span>
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="buehne-wait">
                <DS.Skeleton variant="text" width={220} />
                <DS.Skeleton variant="title" width="80%" />
                <DS.Skeleton variant="title" width={260} />
                <DS.Skeleton variant="text" lines={2} />
              </div>
            ) : (
              <DS.EmptyState title="Gerade ist es still">Keine Bewegung, kein Artikel, kein Termin – schau gleich noch einmal vorbei.</DS.EmptyState>
            )}
          </div>
        </section>

        <nav className="buehne-programme" aria-label="Programm: die nächsten Szenen">
          <div className="buehne-controls">
            <button type="button" className="buehne-ctl" onClick={prev} aria-label="Vorige Szene" disabled={list.length < 2}>
              <CtlIcon d="M12.5 4.5 7 10l5.5 5.5" />
            </button>
            <button
              type="button"
              className="buehne-ctl"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? 'Szenen weiterlaufen lassen' : 'Szenen anhalten'}
            >
              {paused ? <CtlIcon d="M7 4.5v11l8.5-5.5z" fill /> : <CtlIcon d="M7.5 4.5v11M12.5 4.5v11" />}
            </button>
            <button type="button" className="buehne-ctl" onClick={next} aria-label="Nächste Szene" disabled={list.length < 2}>
              <CtlIcon d="M7.5 4.5 13 10l-5.5 5.5" />
            </button>
          </div>
          <ol className="buehne-tiles" ref={tilesRef}>
            {(list.length ? list : Array.from({ length: 5 }, () => undefined)).map((s, i) =>
              s ? (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`buehne-tile${i === index ? ' is-on' : ''}`}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="buehne-tile__track" aria-hidden="true">
                      {i === index ? (
                        <span
                          key={`${s.id}-${active.since}`}
                          className="buehne-tile__fill"
                          style={{ animationDuration: `${SCENE_MS}ms`, animationPlayState: holding ? 'paused' : 'running' } as CSSProperties}
                          onAnimationEnd={next}
                        />
                      ) : i < index ? (
                        <span className="buehne-tile__fill buehne-tile__fill--done" />
                      ) : null}
                    </span>
                    <span className="buehne-tile__kind">{kindLabel(s)}</span>
                    <span className="buehne-tile__name">{titleOf(s, names)}</span>
                    <TileFigure s={s} now={clock} />
                  </button>
                </li>
              ) : (
                <li key={i} className="buehne-tile buehne-tile--wait" aria-hidden="true">
                  <DS.Skeleton variant="text" width="60%" />
                  <DS.Skeleton variant="text" width="85%" />
                </li>
              ),
            )}
          </ol>
        </nav>
      </div>
    </div>
  );
}

function CtlIcon({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={fill ? 'buehne-ico buehne-ico--fill' : 'buehne-ico'}>
      <path d={d} />
    </svg>
  );
}

/** Loads the next scene's trades while this one plays, so its line is there when it comes on. */
function Prefetch({ asin }: { asin: string }) {
  useTrades(asin, STAGE_TRADES);
  return null;
}
