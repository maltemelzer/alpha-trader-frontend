// Start page variant „Mein Tag“: the market through the player's eyes – a day sentence, the depot as a
// living field of bubbles, a short „Zu tun“ column and a quiet strip of market context.
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DS } from '../../ds';
import {
  useAccountPortfolio,
  useAllPriceChanges,
  useCapitalMeasures,
  useDailyHistories,
  useDividendPayments,
  useListings,
  useMe,
  useMergers,
  useMostTraded,
  useMyChats,
  useMyCompanies,
  useMyPolls,
  useNews,
  usePortfolio,
  usePossibleSalary,
  useRecentTrades,
  useUnclaimedAchievements,
} from '../../api/queries';
import { changeLookup } from '../../market/screener';
import { withoutSpikes } from '../../security/derive';
import { unreadSummary } from '../../chat/unread';
import { htmlToText } from '../../lib/html';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useNow } from '../../lib/useNow';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { Option, OptionsButton } from '../../app/phone';
import { Bubbles, usePulses, type ColorBy } from './Bubbles';
import {
  breadth,
  cashReach,
  shortNames,
  sparkValues,
  dayMove,
  dayReason,
  depotBubbles,
  firstSteps,
  ghostBubbles,
  greeting,
  mergeHoldings,
  relTime,
  todoItems,
  tradesIn,
  tradesPerMinute,
  type AccountPortfolio,
  type Todo,
  type TradeLike,
  type TodoKind,
} from './derive';
import { useAccountPortfolios, useOpenOrdersOf, useOrderLogsOf } from './queries';
import './HomePage.css';

const NBSP = ' ';

const ICON: Record<TodoKind, Parameters<typeof DS.Icon>[0]['name']> = {
  chat: 'chat',
  poll: 'haken',
  salary: 'bank',
  achievement: 'erfolg',
  maturity: 'uhr',
  capital: 'kalender',
  dividend: 'kalender',
  merger: 'kalender',
  news: 'zeitung',
  fill: 'orders',
  orders: 'orders',
  step: 'plus',
};

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const phone = useMediaQuery('(max-width: 719.98px)');
  const onLinks = useInternalLinks();
  const now = useNow(30_000);
  const [options, setOptions] = useState(false);
  const colorBy: ColorBy = params.get('farbe') === 'kauf' ? 'kauf' : 'heute';
  const view = params.get('ansicht') === 'zutun' ? 'zutun' : 'depot';
  // Dev only: someone else's depot as a stand-in (the test account holds a single coin).
  const preview = import.meta.env.DEV ? (params.get('vorschau') ?? undefined) : undefined;

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v == null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );

  /* ------------------------------------------------ data */
  const me = useMe();
  const own = usePortfolio();
  const previewPf = useAccountPortfolio(preview);
  const ceo = useMyCompanies(preview ? undefined : me.data?.id);
  const companies = useMemo(() => (ceo.data ?? []).filter((c) => c.securitiesAccountId), [ceo.data]);
  const companyIds = useMemo(() => companies.map((c) => c.securitiesAccountId!), [companies]);
  const companyPfs = useAccountPortfolios(companyIds);
  const privatePf = preview ? previewPf.data : own.data;
  const accountIds = useMemo(
    () => [privatePf?.securitiesAccountId, ...companyIds].filter((x): x is string => !!x),
    [privatePf?.securitiesAccountId, companyIds],
  );

  const moves = useAllPriceChanges();
  const recent = useRecentTrades();
  const chats = useMyChats();
  const polls = useMyPolls('NOT_VOTED');
  const salary = usePossibleSalary();
  const achievements = useUnclaimedAchievements();
  const openOrders = useOpenOrdersOf(accountIds);
  const fills = useOrderLogsOf(accountIds);
  const capUp = useCapitalMeasures('increase');
  const capDown = useCapitalMeasures('reduction');
  const dividends = useDividendPayments();
  const mergers = useMergers();
  const news = useNews('');
  const hot = useMostTraded(undefined, 12);

  /* ------------------------------------------------ derived */
  const accounts = useMemo<AccountPortfolio[]>(() => {
    const list: AccountPortfolio[] = [];
    if (privatePf) list.push({ label: preview ? 'Vorschau' : 'Privat', cash: privatePf.cash, positions: privatePf.positions ?? [] });
    companyPfs.forEach((p, i) => {
      if (p) list.push({ label: companies[i]?.name ?? 'Firma', cash: p.cash, positions: p.positions ?? [] });
    });
    return list;
  }, [privatePf, preview, companyPfs, companies]);
  const holdings = useMemo(() => mergeHoldings(accounts), [accounts]);
  const cash = accounts.reduce((s, a) => s + a.cash, 0);
  const total = cash + holdings.reduce((s, h) => s + h.value, 0);
  const changes = useMemo(() => changeLookup(moves.data?.winners, moves.data?.losers), [moves.data]);
  const move = useMemo(() => dayMove(holdings, cash, changes), [holdings, cash, changes]);
  const wide = useMemo(() => breadth(changes), [changes]);

  const owned = useMemo(() => new Set(holdings.map((h) => h.asin)), [holdings]);
  const hotRows = useMemo(() => hot.data?.content ?? [], [hot.data]);
  const trades = useMemo<TradeLike[] | undefined>(
    () =>
      recent.data?.map((t) => ({
        id: t.id,
        date: t.date ?? 0,
        securityIdentifier: t.securityIdentifier ?? '',
        numberOfShares: t.numberOfShares ?? 0,
        price: t.price ?? 0,
      })),
    [recent.data],
  );
  const baseOwn = useMemo(() => depotBubbles(holdings, changes, phone ? 10 : 18), [holdings, changes, phone]);
  const ghosts = useMemo(() => {
    const g = ghostBubbles(hotRows, owned, phone ? 6 : 8, changes);
    const short = shortNames(g.map((b) => b.label), phone ? 10 : 12);
    return g.map((b, i) => ({ ...b, short: short[i] }));
  }, [hotRows, owned, phone, changes]);
  // Mini lines for the biggest single securities: the last 7 daily closes + the current price.
  const sparkAsins = useMemo(
    () => baseOwn.filter((b) => b.kind === 'position' && !/^(BO|RE|SB|SR)/.test(b.id)).slice(0, 6).map((b) => b.id),
    [baseOwn],
  );
  const histories = useDailyHistories(sparkAsins);
  const lastTrade = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trades ?? []) if (t.price > 0.01 && t.date > (m.get(t.securityIdentifier) ?? 0)) m.set(t.securityIdentifier, t.date);
    return m;
  }, [trades]);
  const ownBubbles = useMemo(
    () =>
      baseOwn.map((b) => {
        const hist = histories[b.id];
        const mark = holdings.find((h) => h.asin === b.id)?.mark;
        const points = hist
          ? [...hist.slice(-7).map((d) => ({ value: d.closePrice ?? 0, date: Number(d.date) || 0 })), ...(mark ? [{ value: mark, date: now }] : [])]
          : [];
        const spark = sparkValues(withoutSpikes(points.filter((p) => p.value > 0)).map((p) => p.value)) ?? undefined;
        const seen = lastTrade.get(b.id);
        return { ...b, spark, last: seen && (!b.last || seen > b.last) ? seen : b.last };
      }),
    [baseOwn, histories, holdings, lastTrade, now],
  );
  const allBubbles = useMemo(() => [...ownBubbles, ...ghosts], [ownBubbles, ghosts]);
  const pulses = usePulses(trades, allBubbles);

  const fillAsins = useMemo(() => [...new Set(fills.map((f) => f.securityIdentifier))].filter((a) => !owned.has(a)).slice(0, 10), [fills, owned]);
  const fillListings = useListings(fillAsins);
  const names = useMemo(() => {
    const n: Record<string, string> = {};
    for (const [a, l] of Object.entries(fillListings)) if (l?.name) n[a] = l.name;
    for (const h of holdings) n[h.asin] = h.name;
    for (const c of companies) if (c.securityIdentifier && c.name) n[c.securityIdentifier] = c.name;
    for (const r of hotRows) n[r.listing.securityIdentifier] ??= r.listing.name;
    return n;
  }, [fillListings, holdings, companies, hotRows]);

  const unread = unreadSummary(chats.data);
  const onlyChat = (chats.data ?? []).find((c) => !c.publicChat && c.numOfUnreadMessages > 0)?.id;
  const latestNews = useMemo(() => news.data?.pages[0]?.content ?? [], [news.data]);

  const todos: Todo[] = (() => {
    const items = todoItems({
      now,
      unread: { ...unread, onlyChatId: onlyChat },
      polls: polls.data?.content ?? [],
      salary: salary.data?.value,
      achievements: achievements.data?.length ?? 0,
      accounts: accountIds,
      fills,
      openOrders,
      holdings,
      companyAsins: companies.map((c) => c.securityIdentifier).filter((x): x is string => !!x),
      capital: [
        ...(capUp.data?.content ?? []).map((c) => ({ ...c, kind: 'increase' as const })),
        ...(capDown.data?.content ?? []).map((c) => ({ ...c, kind: 'reduction' as const })),
      ],
      dividends: dividends.data?.content ?? [],
      mergers: mergers.data?.content ?? [],
      news: latestNews,
      names,
    });
    if (!holdings.length && privatePf) {
      const pick = hotRows.find((r) => r.listing.type === 'STOCK') ?? hotRows[0];
      items.push(...firstSteps(pick ? { name: pick.listing.name, asin: pick.listing.securityIdentifier } : undefined, companies.length > 0));
    }
    return items;
  })();
  const todoCount = todos.filter((t) => t.kind !== 'step').length;

  const perMin = trades ? tradesPerMinute(trades, now, 2) : undefined;
  const mineAsins = useMemo(() => new Set(ownBubbles.flatMap((b) => b.asins)), [ownBubbles]);
  const mineTrades = trades ? tradesIn(trades, mineAsins, phone ? 1 : 3) : [];

  const loading = !privatePf;
  // Show bubbles and the list only once everything they depend on has answered – no jumping when a
  // late source (price changes, company depots, hot list) moves every bubble.
  const settled = (q: { isPending: boolean }) => !q.isPending;
  const companiesDone = preview || (settled(ceo) && companyPfs.every((p, i) => p || !companyIds[i]));
  const bubblesReady = !loading && companiesDone && settled(moves) && settled(hot);
  const todoReady =
    !loading && companiesDone && [chats, polls, salary, achievements, capUp, capDown, dividends, mergers, news].every(settled);
  const name = me.data?.username;
  const hour = new Date(now).getHours();

  /* ------------------------------------------------ pieces */
  const sentence = (
    <header className="mt-head">
      <h1 className="bnk-sr">Start</h1>
      <p className="mt-hello">
        {greeting(hour)}
        {name ? `, ${name}.` : '.'}
      </p>
      <p className="mt-day">
        {loading || (holdings.length > 0 && !settled(moves)) ? (
          <DS.Skeleton variant="text" width="70%" />
        ) : !holdings.length ? (
          <>Du hast noch keine Wertpapiere – schau dir an, was gerade gehandelt wird.</>
        ) : move ? (
          <>
            {Math.abs(move.pct) < 0.005 ? (
              dayReason(move, phone ? null : wide)
            ) : (
              <>
                Dein Depot liegt heute <DS.PriceChange value={move.pct} variant="tag" size="lg" />
                {move.lead ? (
                  <>
                    {' '}– vor allem {move.pct > 0 ? 'dank' : 'wegen'}{' '}
                    <Link to={`/wertpapier/${move.lead.asin}`} className="mt-day__lead">
                      {move.lead.name}
                    </Link>
                    .
                  </>
                ) : (
                  '.'
                )}
              </>
            )}
          </>
        ) : (
          <>Wie sich dein Depot heute bewegt, sehen wir gleich.</>
        )}
      </p>
      <p className="mt-meta">
        {loading ? (
          NBSP
        ) : (
          <>
            Depotwert <DS.Amount value={total} compact="auto" />
            {move && Math.abs(move.delta) >= 0.01 ? (
              <>
                {' '}
                · heute <DS.ProfitLoss value={move.delta} compact="auto" size="sm" />
              </>
            ) : null}
            {phone ? (
              <>
                {' · '}
                <DS.Amount value={cash} compact="auto" /> frei
              </>
            ) : null}
            {accounts.length > 1 ? ` · ${accounts.length} Konten` : ''}
            {phone ? null : ' · '}
            {phone ? null : !todoReady ? NBSP : todoCount === 0 ? 'nichts wartet auf dich' : todoCount === 1 ? 'eine Sache wartet auf dich' : `${todoCount} Dinge warten auf dich`}
          </>
        )}
      </p>
    </header>
  );

  const legend = (
    <p className="mt-legend">
      <span>Größe = Wert</span>
      <span>Farbe = {colorBy === 'kauf' ? 'seit Kauf' : 'heute'}</span>
      {ghosts.length > 0 && <span className="mt-legend__ghost">außen = gerade viel gehandelt</span>}
    </p>
  );
  const colorSwitch = (
    <DS.SegmentedControl
      size={phone ? 'md' : 'sm'}
      fullWidth={phone}
      aria-label="Farbe der Blasen"
      options={[
        { value: 'heute', label: 'Heute' },
        { value: 'kauf', label: 'Seit Kauf' },
      ]}
      value={colorBy}
      onChange={(v) => set({ farbe: v === 'heute' ? null : v })}
    />
  );

  const live = (
    <div className="mt-live" aria-live="off">
      <span className="mt-live__dot" aria-hidden="true" />
      <span className="mt-live__label">Markt</span>
      <span className="mt-live__fig">{perMin != null ? `${Math.round(perMin).toLocaleString('de-DE')} Trades/Min.` : NBSP}</span>
      {wide && wide.up + wide.down > 0 ? (
        <span className="mt-live__breadth" title={`${wide.up} Papiere gestiegen, ${wide.down} gefallen (zum Vortag)`}>
          <span className="mt-live__up">▲ {wide.up}</span>
          <span className="mt-split" aria-hidden="true">
            <span style={{ flexGrow: wide.up }} className="mt-split__up" />
            <span style={{ flexGrow: wide.down }} className="mt-split__down" />
          </span>
          <span className="mt-live__down">▼ {wide.down}</span>
        </span>
      ) : (
        <span className="mt-live__breadth" aria-hidden="true" />
      )}
      <span className="mt-live__mine">
        {!phone && <span className="mt-live__label">Deine Papiere</span>}
        {mineTrades.length ? (
          mineTrades.map((t) => (
            <Link key={t.id ?? `${t.date}${t.securityIdentifier}`} to={`/wertpapier/${t.securityIdentifier}`} className="mt-live__trade">
              <span className="mt-live__name">{names[t.securityIdentifier] ?? t.securityIdentifier}</span>{' '}
              <span className="mt-live__num">
                {t.numberOfShares.toLocaleString('de-DE')} × {DS.format.price(t.price, t.securityIdentifier.slice(0, 2) === 'BO' ? 'BOND' : undefined, '€')}
              </span>{' '}
              <span className="mt-live__when">{relTime(Math.min(t.date, now), now)}</span>
            </Link>
          ))
        ) : (
          <span className="mt-live__quiet">{trades && !phone ? 'Gerade kein Handel in deinen Papieren' : NBSP}</span>
        )}
      </span>
    </div>
  );

  const reach = cashReach(cash, holdings);
  const cashRow = (
    <p className="mt-cash">
      {loading ? (
        NBSP
      ) : (
        <>
          <Link to="/bank" className="mt-cash__amount">
            <DS.Amount value={cash} compact="auto" />
          </Link>{' '}
          frei
          {reach && (
            <>
              {' '}
              – reicht für {reach.shares.toLocaleString('de-DE')} ×{' '}
              <Link to={`/wertpapier/${reach.asin}`}>{reach.name}</Link> zum Brief
            </>
          )}
        </>
      )}
    </p>
  );

  const stage = (
    <section className="mt-stage" aria-label="Dein Depot">
      <div className="mt-stage__bar">
        {legend}
        {!phone && colorSwitch}
      </div>
      {phone && live}
      <Bubbles
        own={ownBubbles}
        ghosts={ghosts}
        colorBy={colorBy}
        pulses={pulses}
        loading={!bubblesReady}
        now={now}
        minRadius={phone ? 22 : 12}
        bottomPad={phone ? 60 : 0}
        empty={
          <>
            <span className="mt-field__emptyhead">Dein Depot ist noch leer</span>
            <span>Außen kreisen die Papiere, die gerade gehandelt werden – tippe eins an.</span>
          </>
        }
      />
      {!phone && cashRow}
      {!phone && live}
    </section>
  );

  const todoList = (
    <div className="mt-todo">
      <h2 className={`mt-todo__title${phone && (holdings.length || !privatePf) ? ' bnk-sr' : ''}`}>
        {holdings.length || !privatePf ? 'Zu tun' : 'Deine ersten Schritte'}
        {todoReady && todoCount > 0 && <span className="mt-count">{todoCount}</span>}
      </h2>
      {!todoReady ? (
        <DS.Skeleton variant="rows" rows={4} />
      ) : todos.length === 0 ? (
        <p className="mt-todo__empty">Alles erledigt. Gerade wartet nichts auf dich.</p>
      ) : (
        <ul className="mt-todo__list">
          {todos.slice(0, 8).map((t) => (
            <li key={t.id} className={`mt-item mt-item--${t.kind}`}>
              <Link to={t.href} className="mt-item__link">
                <span className="mt-item__icon" aria-hidden="true">
                  <DS.Icon name={ICON[t.kind]} size={16} />
                </span>
                <span className="mt-item__text">
                  <span className="mt-item__title">{t.title}</span>
                  {t.detail && <span className="mt-item__detail">{t.detail}</span>}
                </span>
                <span className="mt-item__action">{t.action} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const aboutMe = new Set(todos.filter((t) => t.kind === 'news').map((t) => t.id.slice(5)));
  const paper = (
    <div className="mt-paper">
      <h2 className="mt-todo__title">
        In der Zeitung
        <Link to="/zeitung" className="mt-paper__all">
          Alle
        </Link>
      </h2>
      {news.data && todoReady ? (
        <ul className="mt-paper__list">
          {latestNews
            .filter((p) => !aboutMe.has(p.id))
            .slice(0, phone ? 5 : 12)
            .map((p) => (
              <li key={p.id}>
                <Link to={`/zeitung/${p.id}`} className="mt-paper__item">
                  <span className="mt-paper__head">{htmlToText(p.title)}</span>
                  <span className="mt-paper__meta">
                    {p.author?.username ?? p.company?.name ?? 'Leserbeitrag'} · {p.dateCreated ? relTime(p.dateCreated, now) : ''}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      ) : (
        <DS.Skeleton variant="text" lines={4} />
      )}
    </div>
  );

  /* ------------------------------------------------ layout */
  if (phone) {
    return (
      <div className="page mt mt--phone" onClick={onLinks}>
        {sentence}
        <div className="mt-phbody">
          <div className="ph-bar mt-phbar">
            <DS.SegmentedControl
              aria-label="Ansicht"
              options={[
                { value: 'depot', label: 'Depot' },
                { value: 'zutun', label: todoReady && todoCount ? `Zu tun (${todoCount})` : 'Zu tun' },
              ]}
              value={view}
              onChange={(v) => set({ ansicht: v === 'depot' ? null : v })}
            />
            {view === 'depot' && (
              <OptionsButton
                iconOnly
                label="Darstellung"
                description="Darstellung: Farbe der Blasen"
                active={colorBy === 'kauf' ? 1 : 0}
                onClick={() => setOptions(true)}
              />
            )}
          </div>
          <DS.Sheet open={options} onClose={() => setOptions(false)} title="Darstellung">
            <div className="ph-sheet">
              <Option title="Farbe der Blasen" note="Heute: Veränderung zum Vortag. Seit Kauf: Buchgewinn gegen deinen Einstand.">
                {colorSwitch}
              </Option>
            </div>
          </DS.Sheet>
          {view === 'depot' ? (
            stage
          ) : (
            <div className="mt-aside mt-aside--phone">
              {todoList}
              {paper}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page mt" onClick={onLinks}>
      {sentence}
      <div className="mt-body">
        {stage}
        <aside className="mt-aside" aria-label="Für dich">
          {todoList}
          {paper}
        </aside>
      </div>
    </div>
  );
}
