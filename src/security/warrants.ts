// Warrants: pure helpers for the market list and the securities page.
import type { WarrantApiView } from '../api/queries';
import type { WarrantView } from '../../vendor/bankiersgruen';

/** End of a warrant: the subscription period date, else the listing's end. */
export const warrantEnd = (w: WarrantApiView): number | undefined => w.subscriptionPeriodDate ?? w.listing?.endDate ?? undefined;

/** Warrants of several underlyings merged: each once, only running ones, the next to expire first. */
export function mergeWarrants(lists: (WarrantApiView[] | undefined)[], now: number): WarrantApiView[] {
  const seen = new Set<string>();
  const out: WarrantApiView[] = [];
  for (const w of lists.flat()) {
    if (!w?.id || seen.has(w.id)) continue;
    seen.add(w.id);
    const end = warrantEnd(w);
    if (end != null && end <= now) continue;
    out.push(w);
  }
  return out.sort((a, b) => (warrantEnd(a) ?? Infinity) - (warrantEnd(b) ?? Infinity));
}

/**
 * Bezugsverhältnis as German number: the API sends the underlying per warrant (0,1 for shares,
 * 0,001 for indexes). The DS column would print a number as „1:0“, so it gets a string.
 */
export function ratioText(ratio: number | undefined): string {
  if (ratio == null) return '–';
  return ratio.toLocaleString('de-DE', { maximumFractionDigits: 6 });
}

/** API warrant → the shape of DS.WarrantList. */
export function toWarrantView(w: WarrantApiView): WarrantView {
  const c = w.company as { name?: string; securityIdentifier?: string; listing?: { name?: string; securityIdentifier?: string } } | undefined;
  return {
    id: w.id ?? w.listing?.securityIdentifier ?? '',
    type: w.type ?? 'CALL',
    listing: w.listing as WarrantView['listing'],
    underlying: w.underlying as WarrantView['underlying'],
    company: c ? { name: c.name ?? c.listing?.name ?? '–', securityIdentifier: c.listing?.securityIdentifier ?? c.securityIdentifier } : undefined,
    subscriptionPeriodDate: warrantEnd(w),
    ratio: ratioText(w.ratio),
    underlyingValue: w.underlyingValue,
    underlyingCapValue: w.underlyingCapValue,
  };
}

export function callPutCount(ws: { type?: string }[]): { calls: number; puts: number } {
  const puts = ws.filter((w) => w.type === 'PUT').length;
  return { calls: ws.length - puts, puts };
}

/**
 * Where the underlying stands against reference price (strike) and cap, in % of the spot.
 * A call gains while the underlying is above the strike (up to the cap), a put below it.
 */
export function warrantPosition(w: Pick<WarrantApiView, 'type' | 'underlyingValue' | 'underlyingCapValue'>, spot: number | undefined) {
  const k = w.underlyingValue;
  const cap = w.underlyingCapValue;
  if (!spot || !k) return undefined;
  const toStrike = (spot / k - 1) * 100;
  const toCap = cap ? (cap / spot - 1) * 100 : undefined;
  const put = w.type === 'PUT';
  const inTheMoney = put ? spot < k : spot > k;
  const beyondCap = cap != null && (put ? spot <= cap : spot >= cap);
  return { toStrike, toCap, inTheMoney, beyondCap };
}

/** One warrant as a corridor from reference price to cap, both in % from the underlying's price now. */
export interface Corridor {
  asin: string;
  label: string;
  type: 'CALL' | 'PUT';
  strikePct: number;
  capPct: number;
  end?: number;
}

/** Corridors of the warrants whose underlying price is known; `label` names the bar (underlying, strike, date). */
export function corridors(ws: WarrantApiView[], spotOf: (underlyingAsin: string) => number | undefined, withUnderlying = false): Corridor[] {
  const out: Corridor[] = [];
  for (const w of ws) {
    const spot = spotOf(w.underlying?.securityIdentifier ?? '');
    const k = w.underlyingValue;
    if (!spot || !k || !w.listing?.securityIdentifier) continue;
    const cap = w.underlyingCapValue ?? k;
    const end = warrantEnd(w);
    const kind = w.type === 'PUT' ? 'Put' : 'Call';
    const when = end ? new Date(end).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const strike = k.toLocaleString('de-DE', { maximumFractionDigits: k < 1 ? 4 : 2 });
    out.push({
      asin: w.listing.securityIdentifier,
      label: `${withUnderlying ? `${w.underlying?.name ?? ''} ` : ''}${kind} ${strike} · ${when}`,
      type: w.type === 'PUT' ? 'PUT' : 'CALL',
      strikePct: (k / spot - 1) * 100,
      capPct: (cap / spot - 1) * 100,
      end,
    });
  }
  return out;
}

/** Running calls and puts per underlying, the most warrants first. */
export function warrantsByUnderlying(ws: WarrantApiView[]): { asin: string; name: string; type?: string; calls: number; puts: number }[] {
  const m = new Map<string, { asin: string; name: string; type?: string; calls: number; puts: number }>();
  for (const w of ws) {
    const asin = w.underlying?.securityIdentifier;
    if (!asin) continue;
    const e = m.get(asin) ?? { asin, name: w.underlying?.name ?? asin, type: w.underlying?.type, calls: 0, puts: 0 };
    if (w.type === 'PUT') e.puts += 1;
    else e.calls += 1;
    m.set(asin, e);
  }
  return [...m.values()].sort((a, b) => b.calls + b.puts - (a.calls + a.puts) || a.name.localeCompare(b.name, 'de'));
}

/** The underlyings to look up warrants for: shares, coins and indexes, each once, in the given order. */
export function underlyingsOf(rows: { listing: { securityIdentifier: string; type: string } }[], max: number): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (!['STOCK', 'INDEX', 'COIN'].includes(r.listing.type)) continue;
    if (!out.includes(r.listing.securityIdentifier)) out.push(r.listing.securityIdentifier);
    if (out.length >= max) break;
  }
  return out;
}
