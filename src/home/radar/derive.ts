// Radar (start page): the last hour of the market as a round scope. Pure functions only – the component
// draws. Geometry: „jetzt“ sits at 12 o'clock, older trades lie counter-clockwise (−15 min at 9 o'clock,
// −30 at 6, −45 at 3), so the clockwise sweep always has the newest echoes right behind it. The distance
// from the centre is the asset class (one ring each), inside a ring outward = rose against the previous
// trade, inward = fell. The rim carries the contacts on the same clock: what came within the hour sits at its
// minute, what comes next waits in a short arc clockwise of „jetzt“ (the way the sweep goes), in order.
import type { Trade } from '../../flows/derive';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ rings */

export type RingId = 'other' | 'coin' | 'bond' | 'stock';

export interface Ring {
  id: RingId;
  label: string;
  /** on small scopes */
  short: string;
  /** share of the annulus (inner → outer, they add up to 1) */
  weight: number;
}

/** Inner to outer. Stocks make ~90 % of all trades, so their ring is the widest and outermost (most room). */
export const RINGS: Ring[] = [
  { id: 'other', label: 'Immobilien, Fonds, Scheine', short: 'Sonstige', weight: 0.16 },
  { id: 'coin', label: 'Coins', short: 'Coins', weight: 0.14 },
  { id: 'bond', label: 'Anleihen, Repos', short: 'Anleihen', weight: 0.22 },
  { id: 'stock', label: 'Aktien', short: 'Aktien', weight: 0.48 },
];

/** Asset class of a security from its ASIN prefix (ST… stock, BO/RE/SB/SR/IT… bonds and repos, AC… coin). */
export function ringOf(asin: string): RingId {
  const p = asin.slice(0, 2).toUpperCase();
  if (p === 'ST') return 'stock';
  if (p === 'AC') return 'coin';
  if (p === 'BO' || p === 'RE' || p === 'SB' || p === 'SR' || p === 'IT') return 'bond';
  return 'other';
}

/** Where the rings sit, as fractions of the scope radius R. */
export const GEOM = {
  /** the centre disc with the depot value */
  core: 0.3,
  /** outer edge of the trade rings */
  outer: 0.84,
  /** the rim scale for contacts (news, dates) */
  rim: 0.93,
};

export interface Band {
  id: RingId;
  label: string;
  short: string;
  inner: number;
  outer: number;
}

/** Radial bands of the rings as fractions of R. */
export function bands(core = GEOM.core, outer = GEOM.outer): Band[] {
  let r = core;
  return RINGS.map((ring) => {
    const inner = r;
    r += (outer - core) * ring.weight;
    return { id: ring.id, label: ring.label, short: ring.short, inner, outer: r };
  });
}

/* ------------------------------------------------------------------ echoes */

/** One echo: all trades of one security within one bucket (a minute) folded into one dot. */
export interface Echo {
  key: string;
  asin: string;
  ring: RingId;
  /** newest trade in the bucket */
  t: number;
  price: number;
  /** % against the trade before the bucket (same security); null for the first one seen or a jump beyond ×10 */
  change: number | null;
  volume: number;
  count: number;
  shares: number;
}

/** Trades at ≤ 0,01 € are transfers, no market price. */
export const isTransfer = (t: Pick<Trade, 'price'>) => !(t.price > 0.01);

const MAX_JUMP = 10;
const pct = (price: number, before: number | undefined) =>
  before && price / before <= MAX_JUMP && before / price <= MAX_JUMP ? ((price - before) / before) * 100 : null;

/**
 * Folds trades into echoes: per security and bucket (absolute, so a refresh keeps the keys), newest first.
 * Transfers are left out. `max` keeps the biggest by volume, but echoes of `keep` securities (own papers)
 * and of the last `recentMs` always stay.
 */
export function clusterEchoes(
  trades: Trade[],
  now: number,
  opts: { windowMs?: number; bucketMs?: number; max?: number; keep?: ReadonlySet<string>; recentMs?: number } = {},
): Echo[] {
  const { windowMs = HOUR, bucketMs = MIN, max = 700, keep, recentMs = 2 * MIN } = opts;
  const from = now - windowMs;
  const last = new Map<string, number>();
  const byKey = new Map<string, Echo & { before?: number }>();
  for (const t of [...trades].sort((a, b) => a.date - b.date)) {
    if (isTransfer(t) || !t.asin) continue;
    const before = last.get(t.asin);
    last.set(t.asin, t.price);
    if (t.date < from || t.date > now + MIN) continue;
    const key = `${t.asin}:${Math.floor(t.date / bucketMs)}`;
    const e = byKey.get(key);
    if (e) {
      e.t = Math.max(e.t, t.date);
      e.price = t.price;
      e.volume += t.volume;
      e.count += 1;
      e.shares += t.shares;
      e.change = pct(t.price, e.before);
    } else {
      byKey.set(key, {
        key,
        asin: t.asin,
        ring: ringOf(t.asin),
        t: t.date,
        price: t.price,
        before,
        change: pct(t.price, before),
        volume: t.volume,
        count: 1,
        shares: t.shares,
      });
    }
  }
  const all: Echo[] = [...byKey.values()].map((e) => {
    const out: Echo & { before?: number } = { ...e };
    delete out.before;
    return out;
  });
  const must = all.filter((e) => keep?.has(e.asin) || e.t >= now - recentMs);
  const mustKeys = new Set(must.map((e) => e.key));
  const rest = all
    .filter((e) => !mustKeys.has(e.key))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, Math.max(0, max - must.length));
  return [...must, ...rest].sort((a, b) => b.t - a.t);
}

/* ------------------------------------------------------------------ geometry */

/** Angle of a moment on the hour dial (radians, 0 = top, clockwise positive): the past lies counter-clockwise. */
export function angleOf(t: number, now: number, windowMs = HOUR): number {
  const age = Math.min(Math.max(now - t, 0), windowMs);
  return -TAU * (age / windowMs);
}

/** Cartesian point for a polar one (angle 0 = up, clockwise). */
export function polar(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

/** Small stable number in [−1, 1] from a string – spreads dots without jumping between renders. */
export function jitter(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 2001) / 1000 - 1;
}

/**
 * Radius of an echo as a fraction of R: the middle of its ring for „unverändert“, towards the outer edge the
 * more it rose, towards the inner edge the more it fell (tanh, ±4 % reach about three quarters). Echoes
 * without a change spread a little around the middle line so a busy minute is not one blot.
 */
export function echoRadius(e: Pick<Echo, 'ring' | 'change' | 'key'>, bandList = bands()): number {
  const b = bandList.find((x) => x.id === e.ring) ?? bandList[bandList.length - 1];
  const mid = (b.inner + b.outer) / 2;
  const half = (b.outer - b.inner) / 2;
  const move = e.change == null || e.change === 0 ? jitter(e.key) * 0.18 : Math.tanh(e.change / 4) * 0.82;
  return mid + move * half;
}

/** Dot radius in px from the volume (log scale): 100 € ≈ smallest, a billion ≈ biggest. */
export function dotSize(volume: number, unit = 1): number {
  const l = Math.log10(Math.max(volume, 1));
  return Math.min(Math.max(1.4 + (l - 2) * 0.95, 1.4), 9.5) * unit;
}

/** Opacity by age: full when new, a quarter at the end of the window (the old echoes fade, never vanish). */
export function fade(age: number, windowMs = HOUR): number {
  const x = Math.min(Math.max(age / windowMs, 0), 1);
  return 0.22 + 0.78 * (1 - x) ** 1.4;
}

/** Normalise an angle to [0, 2π). */
export const norm = (a: number) => ((a % TAU) + TAU) % TAU;

/**
 * Afterglow: how brightly the passing sweep lights an echo (1 right under it, 0 a quarter turn later).
 * The sweep turns clockwise, so it glows in the sector behind (counter-clockwise of) the sweep.
 */
export function glow(echoAngle: number, sweepAngle: number, reach = Math.PI / 2): number {
  const behind = norm(sweepAngle - echoAngle);
  return behind <= reach ? 1 - behind / reach : 0;
}

/** Pop of a fresh echo: scale over time since it was revealed (1 → overshoot 1,8 → 1 within `ms`). */
export function pop(sinceReveal: number, ms = 700): number {
  if (sinceReveal < 0) return 0;
  if (sinceReveal >= ms) return 1;
  const x = sinceReveal / ms;
  return x < 0.25 ? (x / 0.25) * 1.8 : 1 + 0.8 * (1 - (x - 0.25) / 0.75) ** 2;
}

export interface Placed {
  echo: Echo;
  x: number;
  y: number;
  r: number;
}

/** The echo under a point (px), the nearest within its dot plus `slop`; null if none. */
export function hitTest(placed: Placed[], x: number, y: number, slop = 8): Placed | null {
  let best: Placed | null = null;
  let bestD = Infinity;
  for (const p of placed) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= p.r + slop && d - p.r < bestD) {
      best = p;
      bestD = d - p.r;
    }
  }
  return best;
}

/** Labels of the hour dial: „jetzt“ on top, minutes back counter-clockwise. */
export const DIAL_MARKS = [
  { min: 0, label: 'jetzt' },
  { min: 15, label: '−15' },
  { min: 30, label: '−30 min' },
  { min: 45, label: '−45' },
];

/* ------------------------------------------------------------------ contacts */

export type ContactKind = 'news' | 'chat' | 'tender' | 'capital' | 'dividend' | 'merger';

export interface Contact {
  id: string;
  kind: ContactKind;
  t: number;
  title: string;
  text: string;
  href: string;
  /** unread chats and imminent dates come first */
  urgent?: boolean;
}

export const CONTACT_LABEL: Record<ContactKind, string> = {
  news: 'Zeitung',
  chat: 'Nachricht',
  tender: 'Zinstender',
  capital: 'Kapitalmaßnahme',
  dividend: 'Dividende',
  merger: 'Fusion',
};

/**
 * The contacts for the list: unread chats first, then by distance from now – what lies ahead counts twice as
 * far (news and what just happened matter more than a date tomorrow), at most `max`.
 */
export function rankContacts(contacts: Contact[], now: number, max = 8): Contact[] {
  const dist = (c: Contact) => (c.t > now ? 2 : 1) * Math.abs(c.t - now);
  return [...contacts].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || dist(a) - dist(b)).slice(0, max);
}

/** Where upcoming contacts start on the rim (radians clockwise of „jetzt“) and how far apart they sit. */
export const NEXT_ARC = { start: 0.28, step: 0.17, max: 4 };
/** Contacts older than this stay off the rim: their minute would run into the arc of what comes next. */
const RIM_PAST_MAX = 50 * MIN;

export interface RimMark {
  a: number;
  items: Contact[];
  next: boolean;
}

/**
 * Contacts on the rim, on the hour dial's own clock: those of the last 50 minutes at their minute (grouped
 * when the same kind meets), the next `NEXT_ARC.max` upcoming ones in order in a short arc clockwise of
 * „jetzt“ (ordinal, not to scale – the list says when). Older ones stay in the list only.
 */
export function rimMarks(contacts: Contact[], now: number, windowMs = HOUR): RimMark[] {
  const past = contacts
    .filter((c) => c.t <= now && now - c.t <= RIM_PAST_MAX)
    .map((c) => ({ c, kind: c.kind, a: angleOf(c.t, now, windowMs) }));
  const groups = groupRim(past);
  const spread = spreadAngles(groups.map((g) => g.a), 0.16);
  const marks: RimMark[] = groups.map((g, i) => ({ a: spread[i], items: g.items.map((x) => x.c), next: false }));
  const next = contacts
    .filter((c) => c.t > now)
    .sort((a, b) => a.t - b.t)
    .slice(0, NEXT_ARC.max);
  next.forEach((c, i) => marks.push({ a: NEXT_ARC.start + i * NEXT_ARC.step, items: [c], next: true }));
  return marks;
}

/**
 * Own papers as an accent, not a pattern: of each own security only the biggest echo (by volume) gets the
 * brass ring; the others get a small brass dot in their middle.
 */
export function ownRings(echoes: Echo[], own: ReadonlySet<string>): Set<string> {
  const best = new Map<string, Echo>();
  for (const e of echoes) {
    if (!own.has(e.asin)) continue;
    const b = best.get(e.asin);
    if (!b || e.volume > b.volume) best.set(e.asin, e);
  }
  return new Set([...best.values()].map((e) => e.key));
}

/**
 * Contacts on the rim, grouped: the same kind within `gap` radians becomes one blip (with a count), so six
 * mergers at the same hour are one mark instead of a stack. Groups keep the order of `items`.
 */
export function groupRim<T extends { kind: string; a: number }>(items: T[], gap = 0.12): { a: number; items: T[] }[] {
  const groups: { a: number; items: T[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.items[0].kind === it.kind && Math.abs(x.a - it.a) < gap);
    if (g) g.items.push(it);
    else groups.push({ a: it.a, items: [it] });
  }
  return groups;
}

/** Rim contacts that would sit on top of each other are nudged apart (at least `gap` radians). */
export function spreadAngles(angles: number[], gap = 0.09): number[] {
  const idx = angles.map((a, i) => ({ a, i })).sort((x, y) => x.a - y.a);
  for (let k = 1; k < idx.length; k++) {
    if (idx[k].a - idx[k - 1].a < gap) idx[k].a = idx[k - 1].a + gap;
  }
  const out = new Array<number>(angles.length);
  for (const { a, i } of idx) out[i] = a;
  return out;
}

/** „vor 3 min“, „vor 2 Std.“, „in 40 min“, „in 5 Std.“, „gestern“, „vor 3 T.“ */
export function relTime(t: number, now: number): string {
  const d = t - now;
  const a = Math.abs(d);
  const unit =
    a < MIN ? 'gerade' : a < HOUR ? `${Math.round(a / MIN)} min` : a < DAY ? `${Math.round(a / HOUR)} Std.` : `${Math.round(a / DAY)} T.`;
  if (unit === 'gerade') return d > 0 ? 'gleich' : 'gerade';
  return d > 0 ? `in ${unit}` : `vor ${unit}`;
}

/* ------------------------------------------------------------------ figures */

/** Trades per minute over the last `ms` (transfers left out). */
export function tradesPerMinute(trades: Trade[], now: number, ms = 10 * MIN): number {
  const n = trades.filter((t) => !isTransfer(t) && t.date > now - ms && t.date <= now).length;
  return n / (ms / MIN);
}

/** Turnover (€) since `from`, transfers left out. */
export function turnover(trades: Trade[], from: number): number {
  return trades.reduce((s, t) => (!isTransfer(t) && t.date >= from ? s + t.volume : s), 0);
}

export interface Hot {
  asin: string;
  count: number;
  volume: number;
  /** % first → last trade in the span, null when not comparable */
  change: number | null;
}

/** The security with the most trades in the last `ms`; ties by volume. */
export function hottest(trades: Trade[], now: number, ms = 15 * MIN): Hot | null {
  const map = new Map<string, Hot & { first: number; firstT: number; last: number; lastT: number }>();
  for (const t of trades) {
    if (isTransfer(t) || t.date <= now - ms || t.date > now) continue;
    const h = map.get(t.asin);
    if (!h) {
      map.set(t.asin, { asin: t.asin, count: 1, volume: t.volume, change: null, first: t.price, firstT: t.date, last: t.price, lastT: t.date });
      continue;
    }
    h.count += 1;
    h.volume += t.volume;
    if (t.date < h.firstT) [h.first, h.firstT] = [t.price, t.date];
    if (t.date >= h.lastT) [h.last, h.lastT] = [t.price, t.date];
  }
  let best: (Hot & { first: number; last: number }) | null = null;
  for (const h of map.values()) if (!best || h.count > best.count || (h.count === best.count && h.volume > best.volume)) best = h;
  if (!best) return null;
  return { asin: best.asin, count: best.count, volume: best.volume, change: pct(best.last, best.first) };
}

/**
 * Change against the previous day per ASIN from the server's movers lists (`priceChangeInPercent`, the
 * same basis the market uses). Beyond +900 % / −90 % the previous close was a transfer at a token price:
 * unknown (NaN). `complete` = both lists ran down to 0 %, so a missing ASIN did not move.
 */
export function dayChanges(
  winners: { listing: { securityIdentifier: string }; priceChangeInPercent?: number }[] | undefined,
  losers: { listing: { securityIdentifier: string }; priceChangeInPercent?: number }[] | undefined,
): { map: Map<string, number>; complete: boolean } | null {
  if (!winners || !losers) return null;
  const map = new Map<string, number>();
  for (const r of [...winners, ...losers]) {
    const p = r.priceChangeInPercent;
    if (p != null) map.set(r.listing.securityIdentifier, p > 900 || p < -90 ? NaN : p);
  }
  const zero = (rows: typeof winners) => !rows.length || (rows[rows.length - 1].priceChangeInPercent ?? 0) === 0;
  return { map, complete: zero(winners) && zero(losers) };
}

/**
 * How the depot moved today: each position's value yesterday = volume ÷ (1 + change), cash counts as
 * unchanged. Not from single trades of the hour – a paper bouncing between bid and ask (AlphaCoins trades
 * alternately at 18.500 and 20.000 €) would swing the depot by ±8 %. Null while a held position's change
 * is unknown (better nothing than a wrong big number in the middle of the scope).
 */
export function depotDay(
  positions: { securityIdentifier: string; volume: number }[],
  cash: number,
  changes: { map: Map<string, number>; complete: boolean } | null,
): { delta: number; pct: number } | null {
  if (!changes) return null;
  let now = cash;
  let before = cash;
  for (const p of positions) {
    const c = changes.map.get(p.securityIdentifier) ?? (changes.complete ? 0 : undefined);
    if (c == null || !Number.isFinite(c)) return null;
    now += p.volume;
    before += p.volume / (1 + c / 100);
  }
  return before > 0 ? { delta: now - before, pct: ((now - before) / before) * 100 } : null;
}

const MINUS = String.fromCharCode(0x2212);
const NB = String.fromCharCode(0xa0);

/**
 * Direction and text of a change, the arrow decided by the value itself – not by its rounded display:
 * +5,40 € at 0,0003 % is „▲ +5,40 €“, only exactly 0 is „±“. A percent too small for `decimals` reads
 * „< 0,1 %“ with its arrow instead of a signed zero.
 */
export function changeText(
  value: number,
  opts: { decimals?: number; unit?: '%' | '€' } = {},
): { dir: 'up' | 'down' | 'flat'; text: string } {
  const { decimals = 2, unit = '%' } = opts;
  if (!value) return { dir: 'flat', text: `±${NB}0${unit === '€' ? `,00${NB}€` : `${NB}%`}` };
  const dir = value > 0 ? 'up' : 'down';
  const arrow = dir === 'up' ? '▲' : '▼';
  const sign = dir === 'up' ? '+' : MINUS;
  const abs = Math.abs(value);
  const min = 10 ** -decimals;
  const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const body = unit === '€' ? `${fmt(abs)}${NB}€` : abs < min ? `<${NB}${fmt(min)}${NB}%` : `${fmt(abs)}${NB}%`;
  return { dir, text: `${arrow}${NB}${abs < min && unit === '%' ? '' : sign}${body}` };
}
