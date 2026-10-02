// Start page variant „Mein Tag“: the day through the player's eyes. A day sentence on top, in the middle the
// timeline – what happened for you since your last visit and what comes next –, below three columns: what
// to do, what the paper writes (articles about your papers first), how your depot does today.
// Phones: the same as four views, the timeline as a list.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DS } from '../../ds';
import {
  useAccountDetails,
  useAccountPortfolio,
  useAllPriceChanges,
  useBoardNews,
  useCapitalMeasures,
  useCashLedger,
  useDividendPayments,
  useListings,
  useMe,
  useMergers,
  useMostTraded,
  useMyBankAccounts,
  useMyChats,
  useMyCompanies,
  useMyPolls,
  useNews,
  usePortfolio,
  usePossibleSalary,
  useUnclaimedAchievements,
} from '../../api/queries';
import { PageNav, usePageView, type PageView } from '../../app/pagenav';
import { chatTitle } from '../../chat/derive';
import { unreadSummary } from '../../chat/unread';
import { htmlToText } from '../../lib/html';
import { useIsPhone } from '../../lib/useMediaQuery';
import { useNow } from '../../lib/useNow';
import { useInternalLinks } from '../../lib/useInternalLinks';
import { changeLookup } from '../../market/screener';
import { ledger } from '../../me/bank';
import { pollKindLabel } from '../buehne/derive';
import {
  breadth,
  changeOf,
  dayMove,
  dayReason,
  firstSteps,
  greeting,
  mergeHoldings,
  newsAbout,
  pctText,
  relTime,
  todoItems,
  type AccountPortfolio,
  type Holding,
  type Todo,
  type TodoKind,
  type Changes,
} from './derive';
import { useAccountPortfolios, useOpenOrdersOf, useOrderLogsOf } from './queries';
import { Timeline, TimelineList } from './Timeline';
import { FUTURE_MS, futureEvents, nextVisit, pastEvents, pastFrom, type CompanyDate, type Scale, type VisitState } from './events';
import './HomePage.css';

const NBSP = ' ';
const VISIT_KEY = 'at.home.visit';

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

/** To-do items that ask for something – trades and articles stand on the timeline. */
const ACTIONS: TodoKind[] = ['chat', 'poll', 'salary', 'achievement', 'maturity', 'capital', 'dividend', 'merger', 'orders', 'step'];

const VIEWS: PageView[] = [
  { value: 'tag', label: 'Dein Tag', description: 'Was seit deinem Besuch passiert ist und was ansteht' },
  { value: 'zutun', label: 'Zu tun', description: 'Was auf dich wartet', parent: 'tag' },
  { value: 'zeitung', label: 'Zeitung', description: 'Neue Artikel, deine Papiere zuerst', parent: 'tag' },
  { value: 'depot', label: 'Depot', description: 'Wie sich deine Papiere heute bewegen', parent: 'tag' },
];

/** Articles shorter than this are one-liners – not worth a line on the start page. */
const MIN_TEXT = 200;

function readVisit(): VisitState | null {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as VisitState) : null;
  } catch {
    return null;
  }
}

function writeVisit(v: VisitState) {
  try {
    localStorage.setItem(VISIT_KEY, JSON.stringify(v));
  } catch {
    /* private mode – the page still works, only without „seit deinem Besuch“ */
  }
}

/** The end of the previous visit, read once; while the page is open it keeps noting that it is seen. */
function useLastVisit(): number | undefined {
  const [visit] = useState(() => {
    const v = nextVisit(readVisit(), Date.now());
    writeVisit(v);
    return v;
  });
  useEffect(() => {
    const note = () => {
      if (document.visibilityState === 'visible') writeVisit({ seen: Date.now(), prev: visit.prev });
    };
    const id = window.setInterval(note, 60_000);
    document.addEventListener('visibilitychange', note);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', note);
    };
  }, [visit.prev]);
  return visit.prev;
}

export function HomePage() {
  const [params] = useSearchParams();
  const phone = useIsPhone();
  const onLinks = useInternalLinks();
  const now = useNow(30_000);
  const [view, setView, views] = usePageView(VIEWS, 'tag');
  const lastVisit = useLastVisit();
  // Dev only: someone else's securities account as a stand-in (the test account holds a single coin).
  const preview = import.meta.env.DEV ? (params.get('vorschau') ?? undefined) : undefined;

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

  const banks = useMyBankAccounts();
  const previewDetails = useAccountDetails(preview ? [preview] : []);
  const bankId = preview ? previewDetails.data[preview]?.clearingAccountId : banks.data?.[0]?.id;
  const cashLog = useCashLedger(bankId);

  const moves = useAllPriceChanges();
  const chats = useMyChats();
  const polls = useMyPolls('NOT_VOTED');
  const salary = usePossibleSalary();
  const achievements = useUnclaimedAchievements();
  const openOrders = useOpenOrdersOf(accountIds);
  const fills = useOrderLogsOf(accountIds, 50);
  const capUp = useCapitalMeasures('increase');
  const capDown = useCapitalMeasures('reduction');
  const dividends = useDividendPayments();
  const mergers = useMergers();
  const news = useNews('');
  const threads = useBoardNews();
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
  const hotRows = useMemo(() => hot.data?.content ?? [], [hot.data]);
  const companyAsins = useMemo(() => companies.map((c) => c.securityIdentifier).filter((x): x is string => !!x), [companies]);

  const fillAsins = useMemo(
    () => [...new Set(fills.map((f) => f.securityIdentifier))].filter((a) => !holdings.some((h) => h.asin === a)).slice(0, 12),
    [fills, holdings],
  );
  const fillListings = useListings(fillAsins);
  const names = useMemo(() => {
    const n: Record<string, string> = {};
    for (const [a, l] of Object.entries(fillListings)) if (l?.name) n[a] = l.name;
    for (const h of holdings) n[h.asin] = h.name;
    for (const c of companies) if (c.securityIdentifier && c.name) n[c.securityIdentifier] = c.name;
    return n;
  }, [fillListings, holdings, companies]);
  const types = useMemo(() => {
    const t: Record<string, string> = {};
    for (const [a, l] of Object.entries(fillListings)) if (l?.type) t[a] = l.type;
    for (const h of holdings) t[h.asin] = h.type;
    return t;
  }, [fillListings, holdings]);

  const unread = unreadSummary(chats.data);
  const onlyChat = (chats.data ?? []).find((c) => !c.publicChat && c.numOfUnreadMessages > 0)?.id;
  const latestNews = useMemo(() => news.data?.pages[0]?.content ?? [], [news.data]);
  const watch = useMemo(
    () => [
      ...holdings.filter((h) => h.type === 'STOCK' || h.type === 'COIN' || h.type === 'ETF').map((h) => ({ asin: h.asin, name: h.name })),
      ...companyAsins.map((a) => ({ asin: a, name: names[a] ?? '' })).filter((w) => w.name),
    ],
    [holdings, companyAsins, names],
  );
  const aboutMine = useMemo(() => newsAbout(latestNews, watch), [latestNews, watch]);
  const companyDates = useMemo<CompanyDate[]>(
    () => [
      ...[...(capUp.data?.content ?? []), ...(capDown.data?.content ?? [])].map((c) => {
        const running = c.startDate <= now;
        return { id: c.id, kind: 'capital' as const, at: running && c.endDate ? c.endDate : c.startDate, running, company: c.company.name, asin: c.company.securityIdentifier };
      }),
      ...(dividends.data?.content ?? []).map((d) => ({ id: d.id, kind: 'dividend' as const, at: d.startDate, company: d.company.name, asin: d.company.securityIdentifier })),
      ...(mergers.data?.content ?? []).map((m) => ({
        id: m.id,
        kind: 'merger' as const,
        at: m.startDate,
        company: m.company.name,
        asin: m.company.securityIdentifier,
        acquirer: m.acquiringCompany?.name,
        acquirerAsin: m.acquiringCompany?.securityIdentifier,
      })),
    ],
    [capUp.data, capDown.data, dividends.data, mergers.data, now],
  );

  /* ------------------------------------------------ timeline */
  const from = pastFrom(lastVisit, now);
  const scale = useMemo<Scale>(() => ({ from, now, to: now + FUTURE_MS, nowX: phone ? 0.5 : 0.62 }), [from, now, phone]);
  const ledgerRows = useMemo(() => (cashLog.data && bankId ? ledger(cashLog.data.content, bankId, cashLog.data.cash) : []), [cashLog.data, bankId]);
  const myName = me.data?.username;
  const events = useMemo(() => {
    const past = pastEvents({
      now,
      from,
      accounts: accountIds,
      fills,
      names,
      types,
      ledger: ledgerRows,
      news: aboutMine,
      chats: (chats.data ?? [])
        .filter((c) => !c.publicChat)
        .map((c) => ({
          id: c.id,
          name: c.groupChat ? chatTitle(c, myName) : undefined,
          unread: c.numOfUnreadMessages,
          last: c.lastMessage?.dateSent,
          from: c.lastMessage?.sender?.username,
        })),
      threads: (threads.data?.pages[0]?.content ?? []).map((p) => ({
        id: p.id,
        boardId: p.messageBoard?.id ?? '',
        board: p.messageBoard?.name ?? 'Forum',
        title: p.title,
        author: p.author?.username,
        date: p.dateCreated ?? 0,
        comments: p.numberOfComments ?? 0,
      })),
    });
    const next = futureEvents({
      now,
      to: now + FUTURE_MS,
      polls: (polls.data?.content ?? []).map((p) => ({ id: p.id, company: p.company?.name ?? 'Abstimmung', label: pollKindLabel(p), endDate: p.endDate ?? 0 })),
      holdings,
      held: new Set([...holdings.map((h) => h.asin), ...companyAsins]),
      dates: companyDates,
    });
    return [...past, ...next];
  }, [now, from, accountIds, fills, names, types, ledgerRows, aboutMine, chats.data, myName, threads.data, polls.data, holdings, companyAsins, companyDates]);

  /* ------------------------------------------------ to-do */
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
      companyAsins,
      capital: [
        ...(capUp.data?.content ?? []).map((c) => ({ ...c, kind: 'increase' as const })),
        ...(capDown.data?.content ?? []).map((c) => ({ ...c, kind: 'reduction' as const })),
      ],
      dividends: dividends.data?.content ?? [],
      mergers: mergers.data?.content ?? [],
      news: latestNews,
      names,
    }).filter((t) => ACTIONS.includes(t.kind));
    if (!holdings.length && privatePf) {
      const pick = hotRows.find((r) => r.listing.type === 'STOCK') ?? hotRows[0];
      items.push(...firstSteps(pick ? { name: pick.listing.name, asin: pick.listing.securityIdentifier } : undefined, companies.length > 0));
    }
    return items;
  })();
  const todoCount = todos.filter((t) => t.kind !== 'step').length;

  /* ------------------------------------------------ readiness */
  const settled = (q: { isPending: boolean }) => !q.isPending;
  const loading = !privatePf;
  const companiesDone = preview || (settled(ceo) && companyPfs.every((p, i) => p || !companyIds[i]));
  const todoReady = !loading && companiesDone && [chats, polls, salary, achievements, capUp, capDown, dividends, mergers, news].every(settled);
  // the timeline waits for every source, then unrolls once – no event pops in during the intro
  const timelineReady = todoReady && (!bankId || settled(cashLog)) && settled(threads) && (!preview || !previewDetails.pending);

  const name = me.data?.username;
  const hour = new Date(now).getHours();
  const newCount = lastVisit ? events.filter((e) => e.at > lastVisit && e.at <= now).length : 0;

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
          Math.abs(move.pct) < 0.005 ? (
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
          )
        ) : (
          <>Wie sich dein Depot heute bewegt, sehen wir gleich.</>
        )}
      </p>
      <p className="mt-meta">
        {loading || !timelineReady ? (
          NBSP
        ) : (
          <>
            {lastVisit
              ? newCount === 0
                ? 'Seit deinem letzten Besuch ist nichts Neues passiert'
                : newCount === 1
                  ? 'Seit deinem letzten Besuch: 1 Neues'
                  : `Seit deinem letzten Besuch: ${newCount} Neue`
              : 'Willkommen zurück'}
            {' · '}
            {todoCount === 0 ? 'nichts zu tun' : `${todoCount} zu tun`}
          </>
        )}
      </p>
    </header>
  );

  const emptyDay = (
    <>
      <span className="mt-empty__head">Ein ruhiger Tag</span>
      <span>Seit deinem Besuch ist nichts für dich passiert, und in den nächsten zwei Tagen steht nichts an.</span>
    </>
  );

  const todoList = (
    <section className="mt-col mt-todo" aria-labelledby="mt-todo-title">
      <h2 id="mt-todo-title" className={`mt-col__title${phone ? ' bnk-sr' : ''}`}>
        {holdings.length || !privatePf ? 'Zu tun' : 'Deine ersten Schritte'}
        {todoReady && todoCount > 0 && <span className="mt-count">{todoCount}</span>}
      </h2>
      {!todoReady ? (
        <DS.Skeleton variant="rows" rows={4} />
      ) : todos.length === 0 ? (
        <p className="mt-col__empty">Alles erledigt. Gerade wartet nichts auf dich.</p>
      ) : (
        <ul className="mt-list">
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
    </section>
  );

  const mineIds = new Set(aboutMine.map((a) => a.post.id));
  const aboutOf = new Map(aboutMine.map((a) => [a.post.id, a.about]));
  const paperRows = [...latestNews]
    .filter((p) => mineIds.has(p.id) || htmlToText(p.content ?? '').length >= MIN_TEXT)
    .sort((a, b) => Number(mineIds.has(b.id)) - Number(mineIds.has(a.id)) || (b.dateCreated ?? 0) - (a.dateCreated ?? 0));
  const paper = (
    <section className="mt-col mt-paper" aria-labelledby="mt-paper-title">
      <h2 id="mt-paper-title" className={`mt-col__title${phone ? ' bnk-sr' : ''}`}>
        In der Zeitung
        <Link to="/zeitung" className="mt-col__all">
          Alle
        </Link>
      </h2>
      {news.data && todoReady ? (
        <ul className="mt-list">
          {paperRows.slice(0, phone ? 12 : 8).map((p) => (
            <li key={p.id}>
              <Link to={`/zeitung/${p.id}`} className={`mt-paper__item${mineIds.has(p.id) ? ' mt-paper__item--mine' : ''}`}>
                <span className="mt-paper__head">{htmlToText(p.title)}</span>
                <span className="mt-paper__meta">
                  {mineIds.has(p.id) && <span className="mt-tag">nennt {aboutOf.get(p.id)}</span>}
                  {p.author?.username ?? p.company?.name ?? 'Leserbeitrag'} · {p.dateCreated ? relTime(p.dateCreated, now) : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <DS.Skeleton variant="text" lines={4} />
      )}
    </section>
  );

  const depot = (
    <section className="mt-col mt-depot" aria-labelledby="mt-depot-title">
      <h2 id="mt-depot-title" className={`mt-col__title${phone ? ' bnk-sr' : ''}`}>
        Depot heute
        <Link to="/organisation" className="mt-col__all">
          Öffnen
        </Link>
      </h2>
      {loading || !companiesDone ? (
        <DS.Skeleton variant="rows" rows={4} />
      ) : (
        <DepotDay holdings={holdings} changes={changes} total={total} cash={cash} delta={move?.delta} accounts={accounts.length} />
      )}
    </section>
  );

  /* ------------------------------------------------ layout */
  if (phone) {
    return (
      <div className="page mt mt--phone" onClick={onLinks}>
        {sentence}
        <PageNav label="Ansicht" views={views.map((v) => (v.value === 'zutun' && todoReady && todoCount ? { ...v, count: todoCount } : v))} view={view} onView={setView} />
        <div className="mt-phbody">
          {view === 'zutun' ? (
            todoList
          ) : view === 'zeitung' ? (
            paper
          ) : view === 'depot' ? (
            depot
          ) : (
            <TimelineList events={events} now={now} lastVisit={lastVisit} loading={!timelineReady} empty={emptyDay} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page mt" onClick={onLinks}>
      {sentence}
      <Timeline events={events} scale={scale} lastVisit={lastVisit && lastVisit >= from ? lastVisit : undefined} loading={!timelineReady} empty={emptyDay} />
      <div className="mt-row">
        {todoList}
        {paper}
        {depot}
      </div>
    </div>
  );
}

/** Today's depot: value, the day in €, and the papers that moved it most as bars around zero. */
function DepotDay({
  holdings,
  changes,
  total,
  cash,
  delta,
  accounts,
}: {
  holdings: Holding[];
  changes: Changes | null;
  total: number;
  cash: number;
  delta?: number;
  accounts: number;
}) {
  const rows = holdings
    .map((h) => {
      const c = changeOf(h.asin, changes);
      const d = c == null || c <= -100 ? undefined : h.value - h.value / (1 + c / 100);
      return { h, c, d };
    })
    .filter((r): r is { h: Holding; c: number; d: number } => r.d != null && Math.abs(r.d) >= 0.01)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 5);
  const max = Math.max(...rows.map((r) => Math.abs(r.d)), 1);
  return (
    <div className="mt-dd">
      <p className="mt-dd__total">
        <DS.Amount value={total} compact="auto" />
        {delta != null && Math.abs(delta) >= 0.01 && <DS.ProfitLoss value={delta} compact="auto" size="sm" />}
      </p>
      <p className="mt-dd__meta">
        <DS.Amount value={cash} compact="auto" /> frei{accounts > 1 ? ` · ${accounts} Konten` : ''}
      </p>
      {holdings.length === 0 ? (
        <p className="mt-col__empty">
          Noch keine Wertpapiere. <Link to="/markt">Zum Markt</Link>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-col__empty">Deine Papiere haben sich heute nicht bewegt.</p>
      ) : (
        <ul className="mt-list mt-dd__bars" aria-label="Größte Bewegungen heute">
          {rows.map(({ h, c, d }) => (
            <li key={h.asin}>
              <Link to={`/wertpapier/${h.asin}`} className="mt-dd__row" title={`${h.name}: ${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('de-DE', { maximumFractionDigits: 0 })} € heute`}>
                <span className="mt-dd__name">{h.name}</span>
                <span className="mt-dd__track" aria-hidden="true">
                  <span className={`mt-dd__bar mt-dd__bar--${d > 0 ? 'up' : 'down'}`} style={{ width: `${(Math.abs(d) / max) * 50}%` }} />
                </span>
                <span className={`mt-dd__pct mt-dd__pct--${c > 0 ? 'up' : c < 0 ? 'down' : 'flat'}`}>{pctText(c)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
