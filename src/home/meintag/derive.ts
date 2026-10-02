// „Mein Tag“ – pure logic: the day sentence, the to-do list and the depot's day. The timeline's events live in events.ts.
import { PERCENT_QUOTED } from '../../security/charts';

/* ---------------------------------------------------------------- holdings */

/** The fields of a portfolio position this page uses (GET /api/v2/my/portfolio, /api/portfolios/{id}). */
export interface PositionLike {
  securityIdentifier?: string;
  numberOfShares: number;
  averageBuyingPrice?: number;
  volume: number;
  type?: string;
  currentBidPrice?: number;
  lastPrice?: { value: number; date?: number } | number | null;
  currentAskPrice?: number;
  listing: { securityIdentifier?: string; name: string; type?: string; endDate?: number | null };
}

export interface AccountPortfolio {
  /** „Privat“ or the company's name */
  label: string;
  cash: number;
  positions: PositionLike[];
}

/** One security over all own accounts. */
export interface Holding {
  asin: string;
  name: string;
  type: string;
  value: number;
  shares: number;
  /** value-weighted cost basis per share (0 = none: mined, issued, gifted) */
  avg: number;
  /** bid, else last price */
  mark?: number;
  /** maturity (bonds, repos) */
  endDate?: number;
  /** best ask (what one more share costs) */
  ask?: number;
  /** time of the last trade in this security */
  lastDate?: number;
  accounts: string[];
}

const lastOf = (p: PositionLike) => (typeof p.lastPrice === 'number' ? p.lastPrice : p.lastPrice?.value);

/** Positions of all accounts merged by ASIN, biggest value first. */
export function mergeHoldings(accounts: AccountPortfolio[]): Holding[] {
  const by = new Map<string, Holding & { costShares: number }>();
  for (const acc of accounts) {
    for (const p of acc.positions) {
      const asin = p.listing.securityIdentifier ?? p.securityIdentifier;
      if (!asin || !(p.numberOfShares > 0)) continue;
      const avg = Number(p.averageBuyingPrice) || 0;
      const h = by.get(asin) ?? {
        asin,
        name: p.listing.name,
        type: p.type ?? p.listing.type ?? 'OTHER',
        value: 0,
        shares: 0,
        avg: 0,
        costShares: 0,
        mark: p.currentBidPrice || lastOf(p) || undefined,
        endDate: p.listing.endDate ?? undefined,
        ask: p.currentAskPrice || undefined,
        lastDate: typeof p.lastPrice === 'object' ? (p.lastPrice?.date ?? undefined) : undefined,
        accounts: [],
      };
      if (avg > 0) {
        h.avg = (h.avg * h.costShares + avg * p.numberOfShares) / (h.costShares + p.numberOfShares);
        h.costShares += p.numberOfShares;
      }
      h.value += Number(p.volume) || 0;
      h.shares += p.numberOfShares;
      if (!h.accounts.includes(acc.label)) h.accounts.push(acc.label);
      by.set(asin, h);
    }
  }
  return [...by.values()]
    .map((h): Holding => ({ asin: h.asin, name: h.name, type: h.type, value: h.value, shares: h.shares, avg: h.avg, mark: h.mark, endDate: h.endDate, ask: h.ask, lastDate: h.lastDate, accounts: h.accounts }))
    .sort((a, b) => b.value - a.value);
}

/** Book result since purchase in %, or undefined without a cost basis. */
export function sinceBuy(h: Pick<Holding, 'avg' | 'mark'>): number | undefined {
  if (!(h.avg > 0) || !h.mark) return undefined;
  return (h.mark / h.avg - 1) * 100;
}

/* ---------------------------------------------------------------- the day */

/** Change against the previous day in % per ASIN; `complete` = a missing ASIN did not move. */
export interface Changes {
  map: Map<string, number>;
  complete: boolean;
}

export function changeOf(asin: string, changes: Changes | null | undefined): number | undefined {
  if (!changes) return undefined;
  const c = changes.map.get(asin);
  if (c != null) return Number.isFinite(c) ? c : undefined;
  return changes.complete ? 0 : undefined;
}

export interface DayMove {
  /** change of the whole depot (cash included) against yesterday, in % */
  pct: number;
  /** in € */
  delta: number;
  /** the position that moved the depot most in the direction of the day */
  lead?: { asin: string; name: string; delta: number };
  /** holdings with a known change */
  known: number;
}

/**
 * How the depot moved today: each position's value yesterday = value ÷ (1 + change); cash counts as
 * unchanged. Null without holdings or without any known change.
 */
export function dayMove(holdings: Holding[], cash: number, changes: Changes | null | undefined): DayMove | null {
  let now = cash;
  let before = cash;
  let known = 0;
  let lead: DayMove['lead'];
  const deltas: { h: Holding; d: number }[] = [];
  for (const h of holdings) {
    now += h.value;
    const c = changeOf(h.asin, changes);
    if (c == null || c <= -100) {
      before += h.value;
      continue;
    }
    known += 1;
    const prev = h.value / (1 + c / 100);
    before += prev;
    deltas.push({ h, d: h.value - prev });
  }
  if (!known || !(before > 0)) return null;
  const delta = now - before;
  const sign = Math.sign(delta);
  for (const { h, d } of deltas) {
    if (sign !== 0 && Math.sign(d) === sign && (!lead || Math.abs(d) > Math.abs(lead.delta))) {
      lead = { asin: h.asin, name: h.name, delta: d };
    }
  }
  return { pct: (delta / before) * 100, delta, lead, known };
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 18) return 'Guten Tag';
  if (hour >= 18 && hour < 23) return 'Guten Abend';
  return 'Noch wach';
}

/** The rest of the day sentence after „Dein Depot liegt heute ▲ +2,3 %“. */
export function dayReason(move: DayMove, market?: { up: number; down: number } | null): string {
  if (Math.abs(move.pct) < 0.005) {
    if (market && market.up + market.down > 0) {
      return `Deine Papiere haben sich heute kaum bewegt – im Markt liegen ${deNum(market.up)} Papiere im Plus, ${deNum(market.down)} im Minus.`;
    }
    return 'Deine Papiere haben sich heute kaum bewegt.';
  }
  if (!move.lead) return move.pct > 0 ? 'Mehrere Papiere haben zugelegt.' : 'Mehrere Papiere haben nachgegeben.';
  return move.pct > 0 ? `– vor allem dank ${move.lead.name}.` : `– vor allem wegen ${move.lead.name}.`;
}

/* ---------------------------------------------------------------- figures */

const deNum = (n: number) => n.toLocaleString('de-DE');

export const pctText = (n: number) => {
  const a = Math.abs(n);
  if (a < 0.05) return '± 0\u00a0%';
  // beyond +999 % a factor reads better and fits a small bubble: „▲ ×197“
  if (n >= 1000) return `▲ ×${Math.round(1 + n / 100).toLocaleString('de-DE')}`;
  const digits = a < 10 ? 1 : 0;
  return `${n > 0 ? '▲ +' : '▼ −'}${a.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}\u00a0%`;
};

/* ---------------------------------------------------------------- time */

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „in 2 Std.“, „in 3 Tagen“. */
export function relTime(ms: number, now: number): string {
  const d = ms - now;
  const a = Math.abs(d);
  const future = d > 0;
  if (a < 60_000) return future ? 'gleich' : 'gerade eben';
  const unit = (n: number, one: string, many: string) => `${future ? 'in' : 'vor'} ${n} ${n === 1 ? one : many}`;
  if (a < 3_600_000) return unit(Math.round(a / 60_000), 'Min.', 'Min.');
  if (a < 86_400_000) return unit(Math.round(a / 3_600_000), 'Std.', 'Std.');
  const days = Math.round(a / 86_400_000);
  return future ? unit(days, 'Tag', 'Tagen') : unit(days, 'Tag', 'Tagen');
}

/* ---------------------------------------------------------------- to-do */

export type TodoKind =
  | 'chat'
  | 'poll'
  | 'salary'
  | 'achievement'
  | 'maturity'
  | 'capital'
  | 'dividend'
  | 'merger'
  | 'news'
  | 'fill'
  | 'orders'
  | 'step';

export interface Todo {
  id: string;
  kind: TodoKind;
  /** higher first */
  priority: number;
  title: string;
  detail?: string;
  href: string;
  /** the one action, a verb */
  action: string;
  /** when it happened / happens (ms) */
  date?: number;
}

export interface Fill {
  id?: string;
  date: number;
  securityIdentifier: string;
  numberOfShares: number;
  price: number;
  buyerSecuritiesAccount?: string;
  sellerSecuritiesAccount?: string;
}

export interface CompanyEvent {
  id: string;
  startDate: number;
  endDate?: number;
  company: { name: string; securityIdentifier?: string };
}

export interface NewsLike {
  id: string;
  title: string;
  content?: string;
  dateCreated?: number;
  company?: { name: string; securityIdentifier?: string } | null;
  listing?: { name: string; securityIdentifier: string } | null;
}

export interface TodoInput {
  now: number;
  unread: { messages: number; chats: number; onlyChatId?: string };
  /** polls the player has not voted on */
  polls: { id: string; company?: { name: string } | null; endDate?: number }[];
  salary?: number | null;
  achievements: number;
  /** own securities accounts (to tell buys from sells) */
  accounts: string[];
  fills: Fill[];
  openOrders: number;
  holdings: Holding[];
  /** ASINs of the companies the player runs */
  companyAsins: string[];
  capital: (CompanyEvent & { kind: 'increase' | 'reduction' })[];
  dividends: CompanyEvent[];
  mergers: (CompanyEvent & { acquiringCompany?: { name: string; securityIdentifier?: string } })[];
  news: NewsLike[];
  names: Record<string, string>;
}

const shares = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const euro = (n: number, type?: string) =>
  type && PERCENT_QUOTED.includes(type)
    ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}\u00a0%`
    : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n < 0.01 ? 4 : 2 })}\u00a0€`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Articles about the player's securities or companies: tagged with the company/listing, or naming it
 * (whole word, names of at least 4 letters). Newest first; returns the name that matched.
 */
export function newsAbout(news: NewsLike[], watch: { asin: string; name: string }[]): { post: NewsLike; about: string }[] {
  const byAsin = new Map(watch.map((w) => [w.asin, w.name]));
  const words = watch
    .filter((w) => w.name.trim().length >= 4 && !/^(Building|Alpha Bank)\b/i.test(w.name))
    .map((w) => ({ name: w.name, re: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w.name.trim())}($|[^\\p{L}\\p{N}])`, 'iu') }));
  const out: { post: NewsLike; about: string }[] = [];
  for (const p of news) {
    const tagged =
      (p.company?.securityIdentifier && byAsin.get(p.company.securityIdentifier)) ||
      (p.listing?.securityIdentifier && byAsin.get(p.listing.securityIdentifier));
    if (tagged) {
      out.push({ post: p, about: tagged });
      continue;
    }
    const text = `${p.title} ${(p.content ?? '').replace(/<[^>]*>/g, ' ')}`;
    const hit = words.find((w) => w.re.test(text));
    if (hit) out.push({ post: p, about: hit.name });
  }
  return out.sort((a, b) => (b.post.dateCreated ?? 0) - (a.post.dateCreated ?? 0));
}

const DAY = 86_400_000;

/** More than two company events of one kind → one line „5 Kapitalmaßnahmen bei deinen Papieren“. */
function bundleEvents(items: Todo[], plural: string): Todo[] {
  if (items.length <= 2) return items;
  const sorted = [...items].sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
  const names = sorted.map((t) => t.title.replace(/^.* (bei|von) /, '').replace(/ geht in .*$/, ''));
  return [
    {
      id: `${items[0].kind}:all`,
      kind: items[0].kind,
      priority: Math.max(...items.map((t) => t.priority)),
      title: `${deNum(items.length)} ${plural} bei deinen Papieren`,
      detail: `${[...new Set(names)].slice(0, 2).join(', ')} …`,
      href: items[0].href,
      action: 'Ansehen',
      date: sorted[0].date,
    },
  ];
}

/** Everything the player should react to, most urgent first. Each item has exactly one link. */
export function todoItems(i: TodoInput): Todo[] {
  const out: Todo[] = [];
  const mine = new Set(i.holdings.map((h) => h.asin));
  const held = new Set([...mine, ...i.companyAsins]);

  if (i.unread.messages > 0) {
    out.push({
      id: 'chat',
      kind: 'chat',
      priority: 90,
      title: i.unread.messages === 1 ? '1 ungelesene Nachricht' : `${deNum(i.unread.messages)} ungelesene Nachrichten`,
      detail: i.unread.chats > 1 ? `in ${deNum(i.unread.chats)} Chats` : undefined,
      href: i.unread.chats === 1 && i.unread.onlyChatId ? `/nachrichten/${i.unread.onlyChatId}` : '/nachrichten',
      action: 'Lesen',
    });
  }

  const polls = i.polls.filter((p) => !p.endDate || p.endDate > i.now);
  if (polls.length) {
    const soonest = [...polls].sort((a, b) => (a.endDate ?? Infinity) - (b.endDate ?? Infinity))[0];
    const companies = [...new Set(polls.map((p) => p.company?.name).filter(Boolean))] as string[];
    out.push({
      id: 'poll',
      kind: 'poll',
      priority: 85,
      title: polls.length === 1 ? 'Eine Abstimmung wartet auf deine Stimme' : `${deNum(polls.length)} Abstimmungen warten auf deine Stimme`,
      detail: [companies.slice(0, 2).join(', '), soonest.endDate ? `endet ${relTime(soonest.endDate, i.now)}` : ''].filter(Boolean).join(' · ') || undefined,
      href: '/abstimmungen',
      action: 'Abstimmen',
      date: soonest.endDate,
    });
  }

  if (i.salary && i.salary > 0) {
    out.push({ id: 'salary', kind: 'salary', priority: 80, title: 'Dein Gehalt liegt bereit', detail: euro(i.salary), href: '/unternehmen', action: 'Abholen' });
  }
  if (i.achievements > 0) {
    out.push({
      id: 'achievement',
      kind: 'achievement',
      priority: 75,
      title: i.achievements === 1 ? 'Ein Erfolg zum Abholen' : `${deNum(i.achievements)} Erfolge zum Abholen`,
      href: '/erfolge',
      action: 'Abholen',
    });
  }

  const due = i.holdings
    .filter((h) => h.endDate && h.endDate > i.now && h.endDate - i.now < DAY && PERCENT_QUOTED.includes(h.type))
    .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));
  if (due.length === 1) {
    const h = due[0];
    out.push({ id: `due:${h.asin}`, kind: 'maturity', priority: 70, title: `${h.name} wird fällig`, detail: relTime(h.endDate!, i.now), href: `/wertpapier/${h.asin}`, action: 'Ansehen', date: h.endDate });
  } else if (due.length > 1) {
    out.push({
      id: 'due',
      kind: 'maturity',
      priority: 70,
      title: `${deNum(due.length)} deiner Anleihen werden fällig`,
      detail: `die erste ${relTime(due[0].endDate!, i.now)}`,
      href: `/wertpapier/${due[0].asin}`,
      action: 'Ansehen',
      date: due[0].endDate,
    });
  }

  const events: Todo[] = [];
  for (const c of i.capital) {
    const asin = c.company.securityIdentifier;
    if (!asin || !held.has(asin) || (c.endDate && c.endDate < i.now)) continue;
    const running = c.startDate <= i.now;
    events.push({
      id: `cap:${c.id}`,
      kind: 'capital',
      priority: running ? 68 : 62,
      title: `${c.kind === 'increase' ? 'Kapitalerhöhung' : 'Kapitalherabsetzung'} bei ${c.company.name}`,
      detail: running && c.endDate ? `Zeichnung endet ${relTime(c.endDate, i.now)}` : `beginnt ${relTime(c.startDate, i.now)}`,
      href: '/kapitalmassnahmen?art=kapital',
      action: 'Ansehen',
      date: c.startDate,
    });
  }
  for (const d of i.dividends) {
    const asin = d.company.securityIdentifier;
    if (!asin || !held.has(asin) || d.startDate < i.now) continue;
    events.push({ id: `div:${d.id}`, kind: 'dividend', priority: 60, title: `Dividende von ${d.company.name}`, detail: relTime(d.startDate, i.now), href: '/kapitalmassnahmen?art=dividenden', action: 'Ansehen', date: d.startDate });
  }
  for (const m of i.mergers) {
    const asin = m.company.securityIdentifier;
    const acq = m.acquiringCompany?.securityIdentifier;
    if (!((asin && held.has(asin)) || (acq && held.has(acq))) || m.startDate < i.now) continue;
    events.push({
      id: `mer:${m.id}`,
      kind: 'merger',
      priority: 60,
      title: `${m.company.name} geht in ${m.acquiringCompany?.name ?? 'einer anderen Firma'} auf`,
      detail: relTime(m.startDate, i.now),
      href: '/kapitalmassnahmen?art=fusionen',
      action: 'Ansehen',
      date: m.startDate,
    });
  }

  out.push(...bundleEvents(events.filter((e) => e.kind === 'capital'), 'Kapitalmaßnahmen'));
  out.push(...bundleEvents(events.filter((e) => e.kind === 'dividend'), 'Dividenden'));
  out.push(...bundleEvents(events.filter((e) => e.kind === 'merger'), 'Fusionen'));

  const watch = [
    ...i.holdings.filter((h) => h.type === 'STOCK' || h.type === 'COIN' || h.type === 'ETF').map((h) => ({ asin: h.asin, name: h.name })),
    ...i.companyAsins.map((a) => ({ asin: a, name: i.names[a] ?? '' })).filter((w) => w.name),
  ];
  for (const { post, about } of newsAbout(i.news, watch).slice(0, 2)) {
    out.push({ id: `news:${post.id}`, kind: 'news', priority: 55, title: post.title, detail: `nennt ${about}`, href: `/zeitung/${post.id}`, action: 'Lesen', date: post.dateCreated });
  }

  // Own trades of the last 24 h, one line per security and side.
  const own = new Set(i.accounts);
  const fills = new Map<string, { asin: string; buy: boolean; shares: number; volume: number; last: number; n: number }>();
  for (const f of i.fills) {
    if (f.date < i.now - DAY || !(f.price > 0)) continue;
    const buy = !!f.buyerSecuritiesAccount && own.has(f.buyerSecuritiesAccount);
    const sell = !!f.sellerSecuritiesAccount && own.has(f.sellerSecuritiesAccount);
    if (buy && sell) continue; // between own accounts
    const key = `${f.securityIdentifier}:${buy}`;
    const g = fills.get(key) ?? { asin: f.securityIdentifier, buy, shares: 0, volume: 0, last: 0, n: 0 };
    g.shares += f.numberOfShares;
    g.volume += f.numberOfShares * f.price;
    g.last = Math.max(g.last, f.date);
    g.n += 1;
    fills.set(key, g);
  }
  const typeOf = new Map(i.holdings.map((h) => [h.asin, h.type]));
  [...fills.values()]
    .sort((a, b) => b.last - a.last)
    .slice(0, 3)
    .forEach((g) => {
      const name = i.names[g.asin] ?? g.asin;
      out.push({
        id: `fill:${g.asin}:${g.buy}`,
        kind: 'fill',
        priority: 45,
        title: `${g.buy ? 'Gekauft' : 'Verkauft'}: ${shares(g.shares)} × ${name}`,
        detail: `zu ${euro(g.volume / g.shares, typeOf.get(g.asin))} · ${relTime(g.last, i.now)}`,
        href: `/wertpapier/${g.asin}`,
        action: 'Ansehen',
        date: g.last,
      });
    });

  if (i.openOrders > 0) {
    out.push({
      id: 'orders',
      kind: 'orders',
      priority: 40,
      title: i.openOrders === 1 ? 'Eine Order ist offen' : `${deNum(i.openOrders)} Orders sind offen`,
      href: '/orders',
      action: 'Prüfen',
    });
  }

  return out.sort((a, b) => b.priority - a.priority || (b.date ?? 0) - (a.date ?? 0));
}

/** First steps for a player without securities. */
export function firstSteps(hot: { name: string; asin: string } | undefined, hasCompany: boolean): Todo[] {
  const steps: Todo[] = [
    { id: 'step:markt', kind: 'step', priority: 30, title: 'Sieh dir an, was gerade gehandelt wird', detail: 'Kurse, Umsatz, Marktkarte', href: '/markt', action: 'Zum Markt' },
  ];
  if (hot) {
    steps.push({ id: 'step:buy', kind: 'step', priority: 29, title: 'Kaufe dein erstes Papier', detail: `zum Beispiel ${hot.name}`, href: `/wertpapier/${hot.asin}`, action: 'Ansehen' });
  }
  if (!hasCompany) {
    steps.push({ id: 'step:found', kind: 'step', priority: 28, title: 'Gründe ein eigenes Unternehmen', detail: 'und bring es an die Börse', href: '/unternehmen?gruenden=1', action: 'Gründen' });
  }
  steps.push({ id: 'step:miner', kind: 'step', priority: 27, title: 'Lass deinen Miner AlphaCoins schürfen', href: '/miner', action: 'Zum Miner' });
  return steps;
}

/* ---------------------------------------------------------------- market context */

/** How many securities rose / fell today (moves beyond ×10 are transfers, left out). */
export function breadth(changes: Changes | null | undefined): { up: number; down: number } | null {
  if (!changes) return null;
  let up = 0;
  let down = 0;
  for (const c of changes.map.values()) {
    if (!Number.isFinite(c)) continue;
    if (c > 0) up += 1;
    else if (c < 0) down += 1;
  }
  return { up, down };
}
