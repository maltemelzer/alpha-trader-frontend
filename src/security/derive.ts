// Pure calculations for the securities page (tested in derive.test.ts).
import type { HistorizedListingDataView, OrderbookView, PricePoint, ShareholderView } from '../api/types';

const DAY = 86_400_000;

/** Change in % against the last price at least 24 h old; undefined without enough history. */
export function change24h(prices: PricePoint[] | undefined, now = Date.now()) {
  if (!prices?.length) return undefined;
  const sorted = [...prices].sort((a, b) => a.date - b.date);
  const last = sorted[sorted.length - 1].value;
  const ref = [...sorted].reverse().find((p) => p.date <= now - DAY);
  if (!ref || !ref.value) return undefined;
  return { pct: (last / ref.value - 1) * 100, abs: last - ref.value };
}

/** Prices of the last `ms` milliseconds, oldest first. */
export function window_(prices: PricePoint[] | undefined, ms: number, now = Date.now()) {
  return (prices ?? []).filter((p) => p.date >= now - ms).sort((a, b) => a.date - b.date);
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
  const recent = (trades ?? []).filter((p) => p.date > lastDaily && p.date >= now - ms);
  return [...daily, ...recent].sort((a, b) => a.date - b.date);
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
