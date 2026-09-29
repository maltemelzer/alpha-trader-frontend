// Class overviews above the market list: one question per asset class, answered from the screener
// rows (so every filter applies) plus a few cached extras (daily closes, ETF details).
// Pure functions only – tested in overview.test.ts, drawn in overviewCharts.ts.
import type { HeatTile } from './derive';
import type { HistorizedListingDataView, PricePoint } from '../api/types';
import { afterRebase, quantile, withoutSpikes } from '../security/derive';
import { GROUPS, type Group, type ScreenRow } from './screener';

const DAY = 86_400_000;

export type OverviewKind = 'stock' | 'bond' | 'repo' | 'coin' | 'index' | 'etf' | 'mixed';

/** Which overview the chosen types get; buildings and warrants have their own views (null). */
export function overviewKind(types: Group[]): OverviewKind | null {
  if (!types.length) return 'mixed';
  if (types.length > 1) return 'mixed';
  switch (types[0]) {
    case 'STOCK':
      return 'stock';
    case 'BOND':
      return 'bond';
    case 'REPO':
      return 'repo';
    case 'COIN':
      return 'coin';
    case 'INDEX':
      return 'index';
    case 'ETF':
      return 'etf';
    default:
      return null;
  }
}

// ---------- Shares: biggest moves with turnover ----------

/** Shares below this 24 h turnover never make the movers chart – a single tiny trade would top it. */
export const MOVER_MIN_VOLUME = 10_000;

export interface MoverDot {
  asin: string;
  name: string;
  volume: number;
  /** change to the previous day in % (unclipped) */
  change: number;
  trades: number;
  last: number | null;
}

/** Rows traded in 24 h with a known change. */
export function moverDots(rows: ScreenRow[]): MoverDot[] {
  return rows
    .filter((r) => (r.volume ?? 0) > 0 && r.change != null && Number.isFinite(r.change))
    .map((r) => ({ asin: r.asin, name: r.name, volume: r.volume!, change: r.change!, trades: r.trades ?? 0, last: r.last }));
}

/** Heatmap tiles of the traded rows with a known change, biggest turnover first (price 0 when unknown). */
export function heatRows(rows: ScreenRow[]): HeatTile[] {
  return moverDots(rows)
    .sort((a, b) => b.volume - a.volume)
    .map((d) => ({ asin: d.asin, name: d.name, last: d.last ?? 0, change: d.change, volume: d.volume }));
}

export interface Movers {
  /** biggest gains first */
  up: MoverDot[];
  /** biggest losses first */
  down: MoverDot[];
  /** traded shares with a known change and at least the minimum turnover */
  candidates: number;
}

/** The `n` biggest gains and losses among the dots with at least `min` € turnover in 24 h. */
export function topMovers(dots: MoverDot[], n: number, min = MOVER_MIN_VOLUME): Movers {
  const ok = dots.filter((d) => d.volume >= min);
  return {
    up: ok.filter((d) => d.change > 0.005).sort((a, b) => b.change - a.change).slice(0, n),
    down: ok.filter((d) => d.change < -0.005).sort((a, b) => a.change - b.change).slice(0, n),
    candidates: ok.length,
  };
}

export interface Breadth {
  up: number;
  down: number;
  /** known change of (nearly) 0 */
  flat: number;
  /** change unknown (not in the movers lists yet, token-price jump) */
  unknown: number;
}

/** Market breadth: how many rows rose, fell, stayed (changes below 0,005 % count as unchanged). */
export function breadth(rows: ScreenRow[]): Breadth {
  const out: Breadth = { up: 0, down: 0, flat: 0, unknown: 0 };
  for (const r of rows) {
    if (r.change == null || !Number.isFinite(r.change)) out.unknown++;
    else if (r.change > 0.005) out.up++;
    else if (r.change < -0.005) out.down++;
    else out.flat++;
  }
  return out;
}

/** Share (0–1) of the 24 h volume that the `n` largest rows take; undefined without volume. */
export function topShare(rows: ScreenRow[], n: number): number | undefined {
  const vols = rows.map((r) => r.volume ?? 0).filter((v) => v > 0).sort((a, b) => b - a);
  const total = vols.reduce((s, v) => s + v, 0);
  if (!(total > 0)) return undefined;
  return vols.slice(0, n).reduce((s, v) => s + v, 0) / total;
}

export const sumVolume = (rows: ScreenRow[]) => rows.reduce((s, r) => s + (r.volume ?? 0), 0);

export function median(xs: number[]): number | undefined {
  return quantile(xs, 0.5);
}

// ---------- Bonds and repos ----------

const isSystem = (type: string) => type.startsWith('SYSTEM') || type === 'INTEREST_TENDER_BOND';

export interface BondDot {
  asin: string;
  name: string;
  /** time left in ms */
  left: number;
  /** yield per day at the ask in % */
  perDay: number;
  /** interest until maturity in % */
  rate: number | null;
  system: boolean;
  issuer: string | null;
}

/** Bonds with a yield (i.e. an ask) that are still running: yield per day against time left. */
export function bondDots(rows: ScreenRow[], now: number): BondDot[] {
  return rows
    .filter((r) => r.group === 'BOND' && r.yieldPerDay != null && r.maturity != null && r.maturity > now)
    .map((r) => ({
      asin: r.asin,
      name: r.name,
      left: r.maturity! - now,
      perDay: r.yieldPerDay!,
      rate: r.rate,
      system: isSystem(r.type),
      issuer: r.issuer,
    }));
}

export interface RepoDot {
  asin: string;
  name: string;
  left: number;
  /** interest of the bond until maturity in % */
  rate: number;
  system: boolean;
  issuer: string | null;
}

/** Running repos with the rate of their bond: rate until maturity against time left. */
export function repoDots(rows: ScreenRow[], now: number): RepoDot[] {
  return rows
    .filter((r) => r.group === 'REPO' && r.rate != null && r.maturity != null && r.maturity > now)
    .map((r) => ({ asin: r.asin, name: r.name, left: r.maturity! - now, rate: r.rate!, system: isSystem(r.type), issuer: r.issuer }));
}

export interface Cluster<T> {
  /** the dot shown (the first of the cluster in the given order) */
  lead: T;
  count: number;
}

/**
 * Bonds come in cohorts: hundreds with the same rate, maturity and ask would sit on one spot and look
 * like a single bond. Dots closer than 1/`steps` of a decade on both log axes (and of the same kind)
 * become one cluster; the order of `dots` decides which one leads (best first, say).
 */
export function clusterLog<T>(dots: T[], x: (d: T) => number, y: (d: T) => number, kind: (d: T) => string, steps = 40): Cluster<T>[] {
  const cell = (v: number) => (v > 0 ? Math.round(Math.log10(v) * steps) : 'x');
  const out = new Map<string, Cluster<T>>();
  for (const d of dots) {
    const key = `${kind(d)}|${cell(x(d))}|${cell(y(d))}`;
    const c = out.get(key);
    if (c) c.count++;
    else out.set(key, { lead: d, count: 1 });
  }
  return [...out.values()];
}

/**
 * The rate per day a repo pays when held to maturity, simple: rate ÷ days left. Only for comparing
 * with the daily reserve rate – never next to a bond coupon (that is for the whole term).
 */
export const ratePerDay = (rate: number, left: number) => (left > 0 ? rate / (left / DAY) : undefined);

// ---------- Daily closes (coins, indexes, ETFs) ----------

export interface Close {
  date: number;
  value: number;
  /** traded volume of the day in € */
  volume: number;
}

const ms = (d: string | number | undefined) => (typeof d === 'number' ? d : d ? Date.parse(d) : NaN);

/** Daily closes, oldest first, without transfers at token prices and without days before the last index rebase. */
export function closes(history: HistorizedListingDataView[] | undefined): Close[] {
  const raw = (history ?? [])
    .map((h) => ({ date: ms(h.date), value: h.closePrice ?? 0, volume: h.tradeVolume ?? 0 }))
    .filter((p) => Number.isFinite(p.date) && p.value > 0)
    .sort((a, b) => a.date - b.date);
  // withoutSpikes keeps the objects it is given, so the volume stays on each close.
  return afterRebase(withoutSpikes(raw as PricePoint[]) as Close[], (p) => p.value);
}

/** Change in % from the first close at or after `from` to the last close; undefined with fewer than two. */
export function changeSince(points: Close[], from = -Infinity): { change: number; start: number; days: number } | undefined {
  const own = points.filter((p) => p.date >= from);
  if (own.length < 2) return undefined;
  const a = own[0];
  const b = own[own.length - 1];
  return { change: (b.value / a.value - 1) * 100, start: a.date, days: Math.max(1, Math.round((b.date - a.date) / DAY)) };
}

export interface IndexBar {
  asin: string;
  name: string;
  /** change since the last rebase (or the first close) in % */
  change: number;
  days: number;
  members: number | null;
  /** names of the ETFs that track this index */
  etfs: string[];
}

/** One bar per index with at least two closes, best first. */
export function indexBars(
  indexes: { asin: string; name: string }[],
  histories: Record<string, HistorizedListingDataView[]>,
  members: Map<string, number>,
  etfsByIndex: Map<string, string[]>,
): IndexBar[] {
  const out: IndexBar[] = [];
  for (const i of indexes) {
    const c = changeSince(closes(histories[i.asin]));
    if (!c) continue;
    out.push({ asin: i.asin, name: i.name, change: c.change, days: c.days, members: members.get(i.asin) ?? null, etfs: etfsByIndex.get(i.asin) ?? [] });
  }
  return out.sort((a, b) => b.change - a.change);
}

export interface EtfPair {
  asin: string;
  name: string;
  indexAsin: string;
  indexName: string;
  /** changes over the same days (from the later start of both) in % */
  etf: number;
  index: number;
  /** ETF − index in percentage points */
  gap: number;
  start: number;
  days: number;
  fee: number | null;
  indexEnded: boolean;
}

/** ETF against its base index over the same days: both from the later of their first closes. */
export function etfPair(
  etf: { asin: string; name: string; baseIndexAsin?: string; baseIndexName?: string; managementFeePercent?: number; baseIndexEnded?: boolean },
  histories: Record<string, HistorizedListingDataView[]>,
): EtfPair | undefined {
  if (!etf.baseIndexAsin) return undefined;
  const a = closes(histories[etf.asin]);
  const b = closes(histories[etf.baseIndexAsin]);
  if (a.length < 2 || b.length < 2) return undefined;
  // Closes are taken once a day at about the same time; half a day of slack pairs them up.
  const from = Math.max(a[0].date, b[0].date) - DAY / 2;
  const x = changeSince(a, from);
  const y = changeSince(b, from);
  if (!x || !y) return undefined;
  return {
    asin: etf.asin,
    name: etf.name,
    indexAsin: etf.baseIndexAsin,
    indexName: etf.baseIndexName ?? etf.baseIndexAsin,
    etf: x.change,
    index: y.change,
    gap: x.change - y.change,
    start: Math.max(x.start, y.start),
    days: Math.min(x.days, y.days),
    fee: etf.managementFeePercent ?? null,
    indexEnded: !!etf.baseIndexEnded,
  };
}

/** Last `n` days of closes (for the coin chart). */
export function lastDays(points: Close[], n: number, now: number): Close[] {
  return points.filter((p) => p.date >= now - n * DAY);
}

// ---------- Several classes: breadth per class ----------

export interface ClassRow {
  group: Group;
  label: string;
  count: number;
  /** with volume in 24 h */
  traded: number;
  up: number;
  down: number;
  volume: number;
  /** the class has a change to the previous day at all (bonds and repos do not) */
  hasChange: boolean;
  /** some row has a known 24 h volume (bonds and repos are not in the turnover list) */
  volumeKnown: boolean;
}

/** Per class in the filter's order: count, traded, rising, falling, 24 h volume. */
export function classRows(rows: ScreenRow[]): ClassRow[] {
  const out: ClassRow[] = [];
  for (const g of GROUPS) {
    const own = rows.filter((r) => r.group === g.value);
    if (!own.length) continue;
    const b = breadth(own);
    out.push({
      group: g.value,
      label: g.label,
      count: own.length,
      traded: own.filter((r) => (r.volume ?? 0) > 0).length,
      up: b.up,
      down: b.down,
      volume: sumVolume(own),
      hasChange: own.some((r) => r.change != null),
      volumeKnown: own.some((r) => r.volume != null),
    });
  }
  return out;
}
