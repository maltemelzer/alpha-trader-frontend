// Portfolio performance: unrealised result per position (from the portfolio's averageBuyingPrice)
// and the realised result of closed trades (/api/v2/trades/stats/*). Pure functions, tested.
import type { PortfolioView } from '../api/types';
import type { TradeResultView } from '../api/queries';
import { PERCENT_QUOTED } from '../security/charts';

type Position = PortfolioView['positions'][number];

export interface PositionResult {
  asin: string;
  name: string;
  type: string;
  shares: number;
  /** Einstandskurs (average buying price) */
  avg: number;
  /** price the position is valued at: best bid, else the last price */
  mark: number;
  cost: number;
  value: number;
  /** unrealised result in € */
  pl: number;
  /** unrealised result in % of the cost */
  pct: number;
}

/**
 * Unrealised result of one position – computed like the design system's PositionTable, so the
 * numbers match its G/V column: valued at the bid (else the last price); bonds and repos (quoted in %)
 * from their volume. `null` without a cost basis (mined, issued or gifted: averageBuyingPrice 0) or price.
 */
export function positionResult(p: Position): PositionResult | null {
  const type = p.type ?? p.listing?.type ?? 'OTHER';
  const avg = Number(p.averageBuyingPrice) || 0;
  const shares = Number(p.numberOfShares) || 0;
  const mark = p.currentBidPrice ?? p.lastPrice?.value;
  if (avg <= 0 || !mark || !shares) return null;
  const percent = PERCENT_QUOTED.includes(type);
  const pl = percent ? (Number(p.volume) || 0) * (1 - avg / mark) : (mark - avg) * shares;
  const value = percent ? Number(p.volume) || 0 : mark * shares;
  return {
    asin: p.securityIdentifier,
    name: p.listing?.name ?? p.securityIdentifier,
    type,
    shares,
    avg,
    mark,
    cost: value - pl,
    value,
    pl,
    pct: (mark / avg - 1) * 100,
  };
}

export interface Unrealised {
  /** positions with a cost basis, biggest result (either sign) first */
  rows: PositionResult[];
  cost: number;
  value: number;
  pl: number;
  /** pl in % of cost, null without cost */
  pct: number | null;
  winners: number;
  losers: number;
  /** positions without a cost basis (left out of the sums) */
  noBasis: number;
}

export function unrealised(positions: Position[]): Unrealised {
  const rows: PositionResult[] = [];
  let noBasis = 0;
  for (const p of positions) {
    const r = positionResult(p);
    if (r) rows.push(r);
    else noBasis++;
  }
  rows.sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl));
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const value = rows.reduce((s, r) => s + r.value, 0);
  const pl = value - cost;
  return {
    rows,
    cost,
    value,
    pl,
    pct: cost > 0 ? (pl / cost) * 100 : null,
    winners: rows.filter((r) => r.pl > 0).length,
    losers: rows.filter((r) => r.pl < 0).length,
    noBasis,
  };
}

export interface PlBar {
  /** unique category (ASIN, trade id or „rest“) */
  id: string;
  label: string;
  /** security to open on click; none for the rest bar */
  asin?: string;
  pl: number;
  /** % against the cost, null for the rest bar */
  pct: number | null;
  /** short day („25.09.“) written after the label, for trades */
  date?: string;
  /** hover detail */
  detail: string;
}

/**
 * The `n` biggest results as bars, gains on top, losses below (display order, top to bottom);
 * all further positions summed up in one „Übrige“ bar at the bottom.
 */
export function plBars(rows: PositionResult[], n: number, fmt: (r: PositionResult) => string): PlBar[] {
  const shown = rows.slice(0, n).sort((a, b) => b.pl - a.pl);
  const bars: PlBar[] = shown.map((r) => ({ id: r.asin, label: r.name, asin: r.asin, pl: r.pl, pct: r.pct, detail: fmt(r) }));
  const rest = rows.slice(n);
  if (rest.length) {
    const pl = rest.reduce((s, r) => s + r.pl, 0);
    const label = `Übrige ${rest.length.toLocaleString('de-DE')}`;
    bars.push({ id: 'rest', label, pl, pct: null, detail: `${label} Positionen zusammen` });
  }
  return bars;
}

/** ISO date → „25.09.“ in local time. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/** Best trades first (biggest gain on top), then the losses, worst at the bottom; unique by trade id. */
export function tradeBars(wins: TradeResultView[], losses: TradeResultView[], fmt: (t: TradeResultView) => string): PlBar[] {
  const seen = new Set<string>();
  const all = [...wins.filter((t) => (t.profitLoss ?? 0) > 0), ...losses.filter((t) => (t.profitLoss ?? 0) < 0)];
  return all
    .filter((t) => {
      const id = t.tradeId ?? '';
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => (b.profitLoss ?? 0) - (a.profitLoss ?? 0))
    .map((t) => ({
      id: t.tradeId!,
      label: t.listingName ?? t.securityIdentifier ?? '',
      // The same security often appears several times – the day tells the trades apart.
      date: t.dateCreated ? dayMonth(t.dateCreated) : undefined,
      asin: t.securityIdentifier,
      pl: t.profitLoss ?? 0,
      pct: t.profitLossPercentage ?? null,
      detail: fmt(t),
    }));
}

/** Trade results carry no listing type – bonds (BO…, SB…) and repos (RE…, SR…) are quoted in %. */
export function asinType(asin: string | undefined): string | undefined {
  return asin && /^(BO|SB|RE|SR)/.test(asin) ? 'BOND' : undefined;
}

export const PERIODS = [
  { value: '7T', label: '7 T', days: 7 },
  { value: '30T', label: '30 T', days: 30 },
  { value: 'alle', label: 'Gesamt', days: 0 },
];

/** Start of a period in ms, rounded down to the full hour (a stable query key while time passes); undefined = all. */
export function periodStart(period: string, now: number): number | undefined {
  const days = PERIODS.find((p) => p.value === period)?.days;
  if (!days) return undefined;
  const h = 3_600_000;
  return Math.floor((now - days * 86_400_000) / h) * h;
}
