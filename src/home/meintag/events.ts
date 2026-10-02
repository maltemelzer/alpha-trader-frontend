// „Mein Tag“ – the timeline: what happened for the player since the last visit (left of „jetzt“) and what
// comes next (right). Pure: events from every source, the time scale, the labels in lanes, the ticks.
import { PERCENT_QUOTED } from '../../security/charts';
import type { CashCategory, LedgerRow } from '../../me/bank';
import type { Fill, Holding, NewsLike } from './derive';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export type EventKind = 'fill' | 'cash' | 'news' | 'chat' | 'forum' | 'poll' | 'maturity' | 'expiry' | 'capital' | 'dividend' | 'merger';

export interface DayEvent {
  id: string;
  kind: EventKind;
  /** when it happened / happens (ms) */
  at: number;
  title: string;
  detail?: string;
  href: string;
  /** signed € (cash in/out, buys negative) – shown neutral, money flows are no price moves */
  amount?: number;
  /** how much it matters, 0…1 – labels go to the heaviest first */
  weight: number;
}

const NBSP = String.fromCharCode(0xa0);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const deNum = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
/** 0 at 100 €, 1 at 10 Mrd. € – amounts span ten orders of magnitude. */
export const amountWeight = (v: number) => clamp01((Math.log10(Math.max(Math.abs(v), 1)) - 2) / 8);
const plural = (n: number, one: string, many: string) => `${deNum(n)} ${n === 1 ? one : many}`;
const euro = (n: number, type?: string) =>
  type && PERCENT_QUOTED.includes(type)
    ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}${NBSP}%`
    : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n < 0.01 ? 4 : 2 })}${NBSP}€`;

/* ---------------------------------------------------------------- last visit */

/** A pause longer than this starts a new visit. */
export const VISIT_GAP = 30 * MIN;

export interface VisitState {
  /** last moment the page was open */
  seen: number;
  /** end of the visit before this one */
  prev?: number;
}

/**
 * The stored visit after opening the page at `now`: a gap of more than VISIT_GAP since `seen` makes `seen`
 * the previous visit; within a visit (reload, coming back from another page) the previous visit stays.
 */
export function nextVisit(stored: VisitState | null, now: number): VisitState {
  if (!stored || !(stored.seen > 0)) return { seen: now };
  if (now - stored.seen > VISIT_GAP) return { seen: now, prev: stored.seen };
  return { seen: now, prev: stored.prev };
}

/** Left end of the timeline: the last visit, but at least 12 h and at most 3 days back. */
export function pastFrom(lastVisit: number | undefined, now: number): number {
  const visit = lastVisit && lastVisit < now ? lastVisit : now - DAY;
  return Math.max(now - 3 * DAY, Math.min(visit, now - 12 * HOUR));
}

/** Right end: two days ahead. */
export const FUTURE_MS = 2 * DAY;

/* ---------------------------------------------------------------- past */

export interface ChatLike {
  id: string;
  name?: string;
  unread: number;
  last?: number;
  /** author of the last message */
  from?: string;
}

export interface ThreadLike {
  id: string;
  boardId: string;
  board: string;
  title: string;
  author?: string;
  date: number;
  comments: number;
}

export interface PastInput {
  now: number;
  from: number;
  /** own securities accounts – a fill is a buy when the buyer is one of them */
  accounts: string[];
  fills: Fill[];
  names: Record<string, string>;
  types: Record<string, string>;
  /** bookings of the private bank account (src/me/bank.ts) */
  ledger: LedgerRow[];
  /** articles about own securities/companies (newsAbout) */
  news: { post: NewsLike; about: string }[];
  chats: ChatLike[];
  threads: ThreadLike[];
}

/** Bookings that tell something on their own – trades come as fills, fees are noise. */
const CASH_SHOWN: CashCategory[] = ['gehalt', 'zinsen', 'dividenden', 'anleihen', 'ueberweisung', 'optionsscheine', 'kapital', 'zentralbank'];

const CASH_TITLE: Partial<Record<CashCategory, (n: number) => string>> = {
  gehalt: () => 'Gehalt eingegangen',
  zinsen: () => 'Zinsen gutgeschrieben',
  dividenden: (n) => (n === 1 ? 'Dividende erhalten' : `${deNum(n)} Dividenden erhalten`),
  anleihen: (n) => (n === 1 ? 'Anleihe zurückgezahlt' : `${deNum(n)} Anleihen zurückgezahlt`),
  ueberweisung: (n) => (n === 1 ? 'Überweisung' : `${deNum(n)} Überweisungen`),
  optionsscheine: () => 'Optionsschein abgerechnet',
  kapital: () => 'Kapitalmaßnahme gebucht',
  zentralbank: () => 'Zentralbank-Einlage',
};

const hourOf = (t: number) => Math.floor(t / HOUR);

/** „Micha8 Corp. 2.0500% 01/10/2026“ → „Micha8 Corp.“ – rate and date of a bond's name are noise in a list. */
export const shortName = (name: string) => name.replace(/\s+\d+[.,]\d+\s?%.*$/, '').trim() || name;

/** Up to two different names, „…“ for more. */
const someNames = (names: string[]) => {
  const unique = [...new Set(names.map(shortName).filter(Boolean))];
  return unique.length ? unique.slice(0, 2).join(', ') + (unique.length > 2 ? ' …' : '') : undefined;
};

/** Everything since `from` that concerns the player: own trades, money, articles, messages, forum threads. */
export function pastEvents(i: PastInput): DayEvent[] {
  const out: DayEvent[] = [];
  const inside = (t: number | undefined): t is number => !!t && t >= i.from && t <= i.now;

  // own trades: one event per security (bonds: per issuer), side and hour
  const own = new Set(i.accounts);
  const fills = new Map<string, { asins: Set<string>; name: string; buy: boolean; shares: number; volume: number; last: number }>();
  for (const f of i.fills) {
    if (!inside(f.date) || !(f.price > 0.01)) continue;
    const buy = !!f.buyerSecuritiesAccount && own.has(f.buyerSecuritiesAccount);
    const sell = !!f.sellerSecuritiesAccount && own.has(f.sellerSecuritiesAccount);
    if (buy === sell) continue; // between own accounts, or not ours
    const name = shortName(i.names[f.securityIdentifier] ?? f.securityIdentifier);
    const key = `${name}:${buy}:${hourOf(f.date)}`;
    const g = fills.get(key) ?? { asins: new Set<string>(), name, buy, shares: 0, volume: 0, last: 0 };
    g.asins.add(f.securityIdentifier);
    g.shares += f.numberOfShares;
    // bonds too: price in % × 100 € face value = € per piece
    g.volume += f.numberOfShares * f.price;
    g.last = Math.max(g.last, f.date);
    fills.set(key, g);
  }
  for (const [key, g] of fills) {
    const asins = [...g.asins];
    const type = i.types[asins[0]];
    const bonds = type && PERCENT_QUOTED.includes(type);
    out.push({
      id: `fill:${key}`,
      kind: 'fill',
      at: g.last,
      title: `${g.buy ? 'Gekauft' : 'Verkauft'}: ${deNum(g.shares)} × ${g.name}`,
      detail: `zu ${euro(g.volume / g.shares, type)}${asins.length > 1 ? ` · ${deNum(asins.length)} ${bonds ? 'Anleihen' : 'Papiere'}` : ''}`,
      href: `/wertpapier/${asins[0]}`,
      amount: g.buy ? -g.volume : g.volume,
      weight: 0.35 + 0.5 * amountWeight(g.volume),
    });
  }

  // money: one event per category and hour
  const cash = new Map<string, { category: CashCategory; rows: LedgerRow[] }>();
  for (const r of i.ledger) {
    if (!inside(r.date) || !CASH_SHOWN.includes(r.category) || Math.abs(r.amount) < 0.01) continue;
    const key = `${r.category}:${hourOf(r.date)}`;
    const g = cash.get(key) ?? { category: r.category, rows: [] };
    g.rows.push(r);
    cash.set(key, g);
  }
  for (const [key, g] of cash) {
    const sum = g.rows.reduce((s, r) => s + r.amount, 0);
    const first = g.rows[0];
    out.push({
      id: `cash:${key}`,
      kind: 'cash',
      at: Math.max(...g.rows.map((r) => r.date)),
      title: CASH_TITLE[g.category]?.(g.rows.length) ?? first.text,
      detail: someNames(g.rows.map((r) => r.subject)),
      href: first.asin && g.rows.length === 1 ? `/wertpapier/${first.asin}` : `/bank?art=${g.category}`,
      amount: sum,
      weight: (g.category === 'gehalt' || g.category === 'dividenden' ? 0.5 : 0.3) + 0.45 * amountWeight(sum),
    });
  }

  for (const { post, about } of i.news) {
    if (!inside(post.dateCreated)) continue;
    out.push({ id: `news:${post.id}`, kind: 'news', at: post.dateCreated, title: post.title, detail: `Zeitung · nennt ${about}`, href: `/zeitung/${post.id}`, weight: 0.75 });
  }

  for (const c of i.chats) {
    if (!(c.unread > 0) || !inside(c.last)) continue;
    out.push({
      id: `chat:${c.id}`,
      kind: 'chat',
      at: c.last,
      title: c.unread === 1 ? '1 neue Nachricht' : `${deNum(c.unread)} neue Nachrichten`,
      detail: [c.from && `von ${c.from}`, c.name].filter(Boolean).join(' · ') || undefined,
      href: `/nachrichten/${c.id}`,
      weight: 0.8,
    });
  }

  for (const t of i.threads) {
    if (!inside(t.date)) continue;
    out.push({
      id: `forum:${t.id}`,
      kind: 'forum',
      at: t.date,
      title: t.title,
      detail: [t.board, t.author && `von ${t.author}`].filter(Boolean).join(' · '),
      href: t.boardId ? `/forum/${t.boardId}/${t.id}` : '/forum',
      weight: 0.4 + Math.min(0.2, t.comments * 0.02),
    });
  }

  return out.sort((a, b) => b.at - a.at);
}

/* ---------------------------------------------------------------- future */

export interface PollLike {
  id: string;
  company: string;
  /** „Kapitalerhöhung“, „Fusion“ … */
  label: string;
  endDate: number;
}

export interface CompanyDate {
  id: string;
  kind: 'capital' | 'dividend' | 'merger';
  /** the date that comes: start of a dividend/merger, end of a running subscription, start of a planned one */
  at: number;
  running?: boolean;
  company: string;
  asin?: string;
  acquirer?: string;
  acquirerAsin?: string;
}

export interface FutureInput {
  now: number;
  to: number;
  polls: PollLike[];
  holdings: Holding[];
  /** ASINs the player holds or runs */
  held: Set<string>;
  dates: CompanyDate[];
}

/** What comes in (now, to]: poll deadlines, maturities and expiries, company dates of own securities. */
export function futureEvents(i: FutureInput): DayEvent[] {
  const out: DayEvent[] = [];
  const ahead = (t: number | undefined): t is number => !!t && t > i.now && t <= i.to;

  for (const p of i.polls) {
    if (!ahead(p.endDate)) continue;
    out.push({ id: `poll:${p.id}`, kind: 'poll', at: p.endDate, title: `Abstimmung endet: ${p.label}`, detail: `${p.company} · deine Stimme fehlt`, href: '/abstimmungen', weight: 0.9 });
  }

  // bonds and warrants that end: one event per kind and hour („3 Anleihen fällig“)
  const ends = new Map<string, Holding[]>();
  for (const h of i.holdings) {
    if (!ahead(h.endDate)) continue;
    const kind = h.type === 'WARRANT' ? 'expiry' : PERCENT_QUOTED.includes(h.type) ? 'maturity' : null;
    if (!kind) continue;
    const key = `${kind}:${hourOf(h.endDate!)}`;
    ends.set(key, [...(ends.get(key) ?? []), h]);
  }
  for (const [key, hs] of ends) {
    const kind = key.startsWith('expiry') ? 'expiry' : 'maturity';
    const value = hs.reduce((s, h) => s + h.value, 0);
    const one = hs.length === 1 ? hs[0] : undefined;
    out.push({
      id: `${key}`,
      kind,
      at: Math.min(...hs.map((h) => h.endDate!)),
      title:
        kind === 'expiry'
          ? one
            ? `Optionsschein läuft aus`
            : `${plural(hs.length, 'Optionsschein läuft', 'Optionsscheine laufen')} aus`
          : one
            ? 'Anleihe wird fällig'
            : `${deNum(hs.length)} Anleihen werden fällig`,
      detail: someNames(hs.map((h) => h.name)),
      href: one ? `/wertpapier/${one.asin}` : '/organisation',
      amount: value,
      weight: 0.5 + 0.35 * amountWeight(value),
    });
  }

  // company dates: several of one kind into one acquirer / in one hour are one event
  const groups = new Map<string, CompanyDate[]>();
  for (const d of i.dates) {
    const mine = (d.asin && i.held.has(d.asin)) || (d.acquirerAsin && i.held.has(d.acquirerAsin));
    if (!mine || !ahead(d.at)) continue;
    const key = d.kind === 'merger' && d.acquirer ? `merger:${d.acquirer}` : `${d.kind}:${hourOf(d.at)}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  for (const [key, ds] of groups) {
    const d = ds[0];
    const n = ds.length;
    const names = someNames(ds.map((x) => x.company));
    const title =
      d.kind === 'merger'
        ? n === 1
          ? `${d.company} geht in ${d.acquirer ?? 'einer anderen Firma'} auf`
          : `${d.acquirer} übernimmt ${deNum(n)} Firmen`
        : d.kind === 'dividend'
          ? n === 1
            ? `Dividende von ${d.company}`
            : `${deNum(n)} Dividenden`
          : n === 1
            ? d.running
              ? `Zeichnung endet: ${d.company}`
              : `Kapitalmaßnahme bei ${d.company}`
            : `${deNum(n)} Kapitalmaßnahmen`;
    out.push({
      id: `${key}:${d.id}`,
      kind: d.kind,
      at: Math.min(...ds.map((x) => x.at)),
      title,
      detail: n > 1 ? names : d.kind === 'capital' && !d.running ? 'beginnt' : undefined,
      href: `/kapitalmassnahmen?art=${d.kind === 'capital' ? 'kapital' : d.kind === 'dividend' ? 'dividenden' : 'fusionen'}`,
      weight: d.kind === 'capital' && d.running ? 0.7 : 0.6,
    });
  }

  return out.sort((a, b) => a.at - b.at);
}

/* ---------------------------------------------------------------- scale */

export interface Scale {
  from: number;
  now: number;
  to: number;
  /** where „jetzt“ stands, 0…1 of the width */
  nowX: number;
}

/**
 * Position 0…1 of a moment. Square root on both sides of „jetzt“: the last and the next hours get the
 * most room, a day ago and in two days are squeezed to the edges.
 */
export function xOf(s: Scale, t: number): number {
  if (t <= s.now) {
    const f = clamp01((s.now - t) / Math.max(1, s.now - s.from));
    return s.nowX * (1 - Math.sqrt(f));
  }
  const f = clamp01((t - s.now) / Math.max(1, s.to - s.now));
  return s.nowX + (1 - s.nowX) * Math.sqrt(f);
}

const TICK_OFFSETS = [-2 * DAY, -DAY, -12 * HOUR, -6 * HOUR, -3 * HOUR, -HOUR, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY];

export function tickLabel(offset: number): string {
  const a = Math.abs(offset);
  const n = a >= DAY ? a / DAY : a / HOUR;
  const unit = a >= DAY ? (n === 1 ? 'Tag' : 'Tagen') : 'Std.';
  return offset < 0 ? `vor ${n} ${unit}` : `in ${n} ${unit}`;
}

/** Relative ticks that fit: each at least `minPx` from „jetzt“ and from the one before. */
export function ticks(s: Scale, width: number, minPx = 72): { t: number; x: number; label: string }[] {
  const nowPx = s.nowX * width;
  const out: { t: number; x: number; label: string }[] = [];
  // from „jetzt“ outwards on both sides, so the near ticks win
  for (const side of [-1, 1]) {
    let last = nowPx;
    for (const o of TICK_OFFSETS.filter((o) => Math.sign(o) === side).sort((a, b) => Math.abs(a) - Math.abs(b))) {
      const t = s.now + o;
      if (t < s.from || t > s.to) continue;
      const x = xOf(s, t) * width;
      if (Math.abs(x - last) < minPx || x < minPx / 2 || x > width - minPx / 2) continue;
      out.push({ t, x, label: tickLabel(o) });
      last = x;
    }
  }
  return out.sort((a, b) => a.x - b.x);
}

/* ---------------------------------------------------------------- labels */

export interface Placed {
  ev: DayEvent;
  /** px of the dot on the axis */
  x: number;
  /** left edge of the label box */
  left: number;
  /** 1, 2 … below the axis, −1, −2 … above */
  lane: number;
}

/**
 * Labels in lanes above and below the axis, nearest lane first, heaviest events (and the new ones) first.
 * A label starts at its dot and runs right; where it would cross „jetzt“ (`nowPx`, past events) or the right
 * edge, it ends at the dot instead. Events without room keep only their dot.
 */
export function placeLabels(
  events: DayEvent[],
  xPx: (t: number) => number,
  width: number,
  opts: { lanes: number; labelW: number; gap?: number; boost?: (e: DayEvent) => number; nowPx?: number },
): { placed: Placed[]; dots: { ev: DayEvent; x: number }[] } {
  const gap = opts.gap ?? 12;
  const w = Math.min(opts.labelW, width);
  const order: number[] = [];
  for (let l = 1; l <= opts.lanes; l++) order.push(l, -l);
  const used = new Map<number, [number, number][]>();
  const dots = events.map((ev) => ({ ev, x: xPx(ev.at) }));
  const placed: Placed[] = [];
  const byWeight = [...dots].sort((a, b) => b.ev.weight + (opts.boost?.(b.ev) ?? 0) - (a.ev.weight + (opts.boost?.(a.ev) ?? 0)) || b.ev.at - a.ev.at);
  for (const d of byWeight) {
    // a label runs right from its dot; past ones near „jetzt“ and any near the right edge run left
    const limit = opts.nowPx != null && d.x <= opts.nowPx ? opts.nowPx : width;
    const left = d.x + w <= limit ? d.x : Math.max(0, d.x - w);
    const span: [number, number] = [left - gap / 2, left + w + gap / 2];
    for (const lane of order) {
      const taken = used.get(lane) ?? [];
      if (taken.some(([a, b]) => span[0] < b && span[1] > a)) continue;
      used.set(lane, [...taken, span]);
      placed.push({ ev: d.ev, x: d.x, left, lane });
      break;
    }
  }
  return { placed, dots };
}
