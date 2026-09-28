// Pure calculations for the securities page (tested in derive.test.ts).
import type { HistorizedListingDataView, OrderbookView, PricePoint, ShareholderView } from '../api/types';

const DAY = 86_400_000;

/** Change in % against the last price at least 24 h old; undefined without enough history. */
/** Trades at a price of 0 are transfers, not market prices – they would draw a spike down to 0 €. */
const traded = (prices: PricePoint[] | undefined) => (prices ?? []).filter((p) => p.value > 0);

/**
 * Leaves out single points more than ×`factor` away from both neighbours (oldest first; ×10·`factor` at the ends): transfers
 * at a token price (0,01 €) between trades at 70 €. A real jump – an index rebase – is a step, not
 * a spike, and stays.
 */
export function withoutSpikes(points: PricePoint[], factor = 10): PricePoint[] {
  const off = (a: number, b: number, f: number) => a / b > f || b / a > f;
  // Inside: away from both neighbours.
  const inner = points.filter((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    return !(prev && next && off(p.value, prev.value, factor) && off(p.value, next.value, factor));
  });
  // Ends have one neighbour only – a real crash may be the latest trade, so only token prices (×100) go.
  const edge = factor * 10;
  const first = inner.length > 1 && off(inner[0].value, inner[1].value, edge) ? 1 : 0;
  const n = inner.length;
  const last = n - first > 1 && off(inner[n - 1].value, inner[n - 2].value, edge) ? n - 1 : n;
  return inner.slice(first, last);
}

export function change24h(prices: PricePoint[] | undefined, now = Date.now()) {
  if (!prices?.length) return undefined;
  const sorted = traded(prices).sort((a, b) => a.date - b.date);
  if (!sorted.length) return undefined;
  const last = sorted[sorted.length - 1].value;
  const ref = [...sorted].reverse().find((p) => p.date <= now - DAY);
  if (!ref || !ref.value) return undefined;
  return { pct: (last / ref.value - 1) * 100, abs: last - ref.value };
}

/** Prices of the last `ms` milliseconds, oldest first. */
export function window_(prices: PricePoint[] | undefined, ms: number, now = Date.now()) {
  return withoutSpikes(traded(prices).filter((p) => p.date >= now - ms).sort((a, b) => a.date - b.date));
}

export interface DepthSide {
  price: number[];
  cumulative: number[];
}

/** Cumulative depth: bids from best (highest) downwards, asks from best (lowest) upwards. */
export function depth(ob: OrderbookView | undefined): { bids: DepthSide; asks: DepthSide } {
  const side = (entries: { priceLimit: number; size: number }[], dir: 1 | -1): DepthSide => {
    const sorted = [...entries].sort((a, b) => dir * (a.priceLimit - b.priceLimit));
    let sum = 0;
    return {
      price: sorted.map((e) => e.priceLimit),
      cumulative: sorted.map((e) => (sum += e.size)),
    };
  };
  return { bids: side(ob?.buyEntries ?? [], -1), asks: side(ob?.sellEntries ?? [], 1) };
}

export interface HolderSlice {
  name: string;
  shares: number;
  percent: number;
  kind: 'user' | 'company' | 'rest';
}

/** Largest holders plus one "Übrige" slice – at most `max` slices (chart palette has 5). */
export function holderSlices(holders: ShareholderView[] | undefined, max = 5): HolderSlice[] {
  if (!holders?.length) return [];
  const sorted = [...holders].sort((a, b) => (b.numberOfShares ?? 0) - (a.numberOfShares ?? 0));
  const total = sorted[0].outstandingShares || sorted.reduce((s, h) => s + (h.numberOfShares ?? 0), 0);
  const toSlice = (h: ShareholderView): HolderSlice => ({
    name: h.company?.name ?? h.user?.username ?? '–',
    shares: h.numberOfShares ?? 0,
    percent: ((h.numberOfShares ?? 0) / total) * 100,
    kind: h.company ? 'company' : 'user',
  });
  if (sorted.length <= max) return sorted.map(toSlice);
  const top = sorted.slice(0, max - 1).map(toSlice);
  const restShares = sorted.slice(max - 1).reduce((s, h) => s + (h.numberOfShares ?? 0), 0);
  return [
    ...top,
    { name: `Übrige (${sorted.length - max + 1})`, shares: restShares, percent: (restShares / total) * 100, kind: 'rest' },
  ];
}

/** Daily closes within `ms` plus every recent trade price after the last daily entry, oldest first. */
export function recentPrices(
  days: HistorizedListingDataView[] | undefined,
  trades: PricePoint[] | undefined,
  ms: number,
  now = Date.now(),
): PricePoint[] {
  const daily = (days ?? [])
    .map((d) => ({ value: d.closePrice ?? 0, date: new Date(d.date!).getTime() }))
    .filter((p) => p.value && p.date >= now - ms);
  const lastDaily = daily.length ? Math.max(...daily.map((p) => p.date)) : -Infinity;
  const recent = traded(trades).filter((p) => p.date > lastDaily && p.date >= now - ms);
  return withoutSpikes([...daily, ...recent].sort((a, b) => a.date - b.date));
}

/**
 * Depth limited to prices within ±`band` around `mid`. Each side is extended flat to the band edge,
 * so far-away walls (e.g. 4 Mrd. shares at 40× the price) do not squash the chart.
 */
export function depthNear(d: { bids: DepthSide; asks: DepthSide }, mid: number, band = 0.5) {
  const lo = mid * (1 - band);
  const hi = mid * (1 + band);
  const clipSide = (s: DepthSide, edge: number, inside: (p: number) => boolean): DepthSide => {
    const idx = s.price.map((p, i) => (inside(p) ? i : -1)).filter((i) => i >= 0);
    const price = idx.map((i) => s.price[i]);
    const cumulative = idx.map((i) => s.cumulative[i]);
    if (price.length) {
      price.push(edge);
      cumulative.push(cumulative[cumulative.length - 1]);
    }
    return { price, cumulative };
  };
  return {
    bids: clipSide(d.bids, lo, (p) => p >= lo),
    asks: clipSide(d.asks, hi, (p) => p <= hi),
    range: [lo, hi] as [number, number],
  };
}

/** About `count` round tick values from 0 to max (1, 2, 2.5 or 5 × 10ⁿ steps). */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = 0; v <= max * 1.0001; v += step) out.push(v);
  return out;
}

/**
 * Drops everything before the last rebase: indexes start at their base value and jump by the
 * chaining factor, which would dwarf the real movement. A step of more than `factor`× between two
 * neighbouring points counts as rebase.
 */
export function afterRebase<T>(points: T[], value: (p: T) => number, factor = 20): T[] {
  for (let i = points.length - 1; i > 0; i--) {
    const a = Math.abs(value(points[i - 1]));
    const b = Math.abs(value(points[i]));
    if (a > 0 && b > 0 && (b / a > factor || a / b > factor)) return points.slice(i);
  }
  return points;
}

/**
 * Yield until maturity when buying at `pricePct` (% of face value): the bond pays face value plus
 * `ratePct` at maturity. Not annualised – terms in the game are often a day or two.
 */
export function bondYield(pricePct: number | null | undefined, ratePct: number): number | undefined {
  if (!pricePct || pricePct <= 0) return undefined;
  return ((100 + ratePct) / pricePct - 1) * 100;
}

const DAY_MS = 86_400_000;

/**
 * Yield per day when buying at `pricePct` now and holding to maturity: the yield until maturity
 * ((100 + coupon) / price − 1) divided by the days left – simple, like the reserve rate the central
 * bank pays each day. The coupon is paid once for the whole term, so only a per-day figure compares
 * a bond due in 10 minutes with one due in 29 days: 2 % in 12 minutes are 240 % per day.
 * Less than a minute left: undefined.
 */
export function dailyYield(pricePct: number | null | undefined, ratePct: number, msLeft: number): number | undefined {
  if (!pricePct || pricePct <= 0 || msLeft < 60_000) return undefined;
  return ((100 + ratePct) / pricePct - 1) * 100 * (DAY_MS / msLeft);
}

export interface YieldDot {
  name: string;
  /** yield per day in % */
  value: number;
  /** time left, already formatted */
  left: string;
  /** priced at the ask (tradable now) or, without an offer, at the last trade */
  price: 'ask' | 'last';
  /** ASIN to open on click */
  asin?: string;
}

/** Bonds due within this time are left out of the „tradable“ view: 2 % on a few minutes read as 2.000 % per day. */
export const LAST_HOUR = 3_600_000;

type YieldBond = {
  interestRate?: number;
  maturityDate?: number;
  name?: string;
  listing?: { name?: string; securityIdentifier?: string };
  priceSpread?: { askPrice?: number | null; lastPrice?: { value?: number | null } | number | null } | null;
};

/**
 * Dots for the yield comparison. „tradable“ (default): bonds with an ask, priced at the ask, due in
 * an hour or later. „all“: also the last hour, and bonds without an ask at their last price.
 */
export function yieldDots(
  bonds: YieldBond[] | undefined,
  now: number,
  mode: 'tradable' | 'all',
  exclude: string | undefined,
  label: (ms: number) => string,
): YieldDot[] {
  const out: YieldDot[] = [];
  for (const b of bonds ?? []) {
    if (b.listing?.securityIdentifier === exclude) continue;
    const left = (b.maturityDate ?? 0) - now;
    if (mode === 'tradable' && left < LAST_HOUR) continue;
    const ask = b.priceSpread?.askPrice ?? undefined;
    const lp = b.priceSpread?.lastPrice;
    const last = (typeof lp === 'number' ? lp : lp?.value) ?? undefined;
    if (ask == null && mode === 'tradable') continue;
    const value = dailyYield(ask ?? last, b.interestRate ?? 0, left);
    if (value == null) continue;
    out.push({ name: b.listing?.name ?? b.name ?? '–', value, left: label(left), price: ask != null ? 'ask' : 'last', asin: b.listing?.securityIdentifier });
  }
  return out;
}

/** Value at quantile `q` (0–1) of `values`, linear between neighbours. */
export function quantile(values: number[], q: number): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}

/** Share of the term already over, 0–1. */
export function termProgress(issueDate: number | undefined, maturityDate: number, now: number): number {
  if (issueDate == null || maturityDate <= issueDate) return now >= maturityDate ? 1 : 0;
  return Math.min(1, Math.max(0, (now - issueDate) / (maturityDate - issueDate)));
}

export interface Weight {
  name: string;
  asin: string;
  weight: number;
  kind: 'member' | 'rest';
}

/** Index weights by capitalisation: the `top` largest, the rest summed up as „Übrige“. */
export function indexWeights(
  members: { listing: { name: string; securityIdentifier: string }; capitalisation?: number; price: number; shares: number }[],
  top = 15,
): { weights: Weight[]; count: number; top1: number; top10: number; effective: number } {
  const cap = (m: (typeof members)[number]) => m.capitalisation ?? m.price * m.shares;
  const total = members.reduce((s, m) => s + cap(m), 0);
  if (!total) return { weights: [], count: members.length, top1: 0, top10: 0, effective: 0 };
  const sorted = [...members].sort((a, b) => cap(b) - cap(a)).map((m) => ({
    name: m.listing.name,
    asin: m.listing.securityIdentifier,
    weight: (cap(m) / total) * 100,
    kind: 'member' as const,
  }));
  const shown: Weight[] = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((s, w) => s + w.weight, 0);
  if (rest > 0) shown.push({ name: `Übrige ${sorted.length - top}`, asin: '', weight: rest, kind: 'rest' });
  const sum = (n: number) => sorted.slice(0, n).reduce((s, w) => s + w.weight, 0);
  // Effective number of members (inverse Herfindahl): 1 when one member dominates, n when equal.
  const hhi = sorted.reduce((s, w) => s + (w.weight / 100) ** 2, 0);
  return { weights: shown, count: sorted.length, top1: sum(1), top10: sum(10), effective: 1 / hhi };
}

/** Two price series on a common start = 100, for comparing an ETF with its index. */
export function rebased(a: PricePoint[], b: PricePoint[]): { a: PricePoint[]; b: PricePoint[] } {
  if (!a.length || !b.length) return { a: [], b: [] };
  const start = Math.max(a[0].date, b[0].date);
  const from = (s: PricePoint[]) => {
    const i = s.findIndex((p) => p.date >= start);
    // the last point before the start carries the value at the start
    const base = s[Math.max(0, i - 1)]?.value ?? s[0].value;
    const tail = s.filter((p) => p.date > start);
    return base ? [{ date: start, value: 100 }, ...tail.map((p) => ({ date: p.date, value: (p.value / base) * 100 }))] : [];
  };
  return { a: from(a), b: from(b) };
}

/** Building size in m² from the name („Building 1200 20/09/2026“). */
export function buildingSize(name: string): number | undefined {
  const m = /Building\s+(\d+)/i.exec(name);
  return m ? Number(m[1]) : undefined;
}

/** A running bond as the issuer's company profile lists it (`issuedBonds`). */
export interface DueBond {
  volume?: number;
  interestRate?: number;
  maturityDate?: number;
}

/**
 * How often the issuer's net cash covers the repayment of ALL its running bonds (face volume plus
 * interest). An issuer with 180 bonds must pay all of them from the same money, so the coverage of
 * one bond alone would look 180 times better than it is. `due` 0 (no running bonds) → no coverage.
 */
export function issuerCoverage(netCash: number | undefined, bonds: DueBond[] | undefined, now: number): { coverage?: number; due: number; count: number } {
  const running = (bonds ?? []).filter((b) => (b.maturityDate ?? 0) > now);
  const due = running.reduce((s, b) => s + (b.volume ?? 0) * (1 + (b.interestRate ?? 0) / 100), 0);
  return { coverage: netCash == null || !due ? undefined : netCash / due, due, count: running.length };
}

/** Coverage in % as text: „keine“ at or below 0, from 1.000 % as a multiple („25-fach“). */
export function coverageText(pctValue: number | null | undefined): string {
  if (pctValue == null || !Number.isFinite(pctValue)) return '–';
  if (pctValue <= 0) return 'keine';
  if (pctValue >= 1000) return `${Math.round(pctValue / 100).toLocaleString('de-DE')}-fach`;
  return `${Math.round(pctValue).toLocaleString('de-DE')}${String.fromCharCode(0xa0)}%`;
}

/**
 * Shares a limit order at `price` would get right now: buying, every offer at `price` or cheaper;
 * selling, every bid at `price` or higher.
 */
export function availableAt(ob: OrderbookView | undefined, side: 'BUY' | 'SELL', price: number): number {
  if (!ob) return 0;
  const entries = side === 'BUY' ? ob.sellEntries : ob.buyEntries;
  return entries.filter((e) => (side === 'BUY' ? e.priceLimit <= price : e.priceLimit >= price)).reduce((s, e) => s + e.size, 0);
}

/**
 * Default size for the order ticket: what is available at the price, but no more than the cash
 * buys (`faceValue` for bonds quoted in %) or the free shares allow – otherwise the ticket would
 * open with an error. If nothing is affordable, the available size stays and the ticket explains.
 */
export function defaultShares(
  available: number | null | undefined,
  side: 'BUY' | 'SELL',
  price: number | undefined,
  cash: number | undefined,
  held: number | undefined,
  faceValue?: number,
): number | undefined {
  if (!available || available <= 0) return undefined;
  const unit = price ? (faceValue ? (price / 100) * faceValue : price) : undefined;
  const cap = side === 'BUY' ? (unit && cash != null ? Math.floor(cash / unit) : undefined) : held;
  return cap != null && cap > 0 ? Math.min(available, cap) : available;
}

/**
 * Limit to prefill in the order ticket: the best counter quote (ask to buy, bid to sell),
 * without one the last price – so an order is possible even when nobody quotes.
 */
export function limitPrice(
  side: 'BUY' | 'SELL',
  spread: { askPrice?: number | null; bidPrice?: number | null; lastPrice?: number | { value?: number | null } | null } | undefined,
): number | undefined {
  const quote = side === 'BUY' ? spread?.askPrice : spread?.bidPrice;
  const last = spread?.lastPrice;
  return quote ?? (typeof last === 'number' ? last : last?.value) ?? undefined;
}
