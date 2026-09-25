import type { SecurityOrderLogEntryView } from '../api/types';

/** One trade on the tape, with the move against the previous trade of the same security. */
export interface TapeTrade {
  id: string;
  asin: string;
  price: number;
  shares: number;
  date: number;
  /** Percent against the previous trade of this security in the loaded window; null for the first one. */
  change: number | null;
  /** Trades folded into this item: one order filling several counter-orders at the same price. */
  count: number;
}

/** Back-to-back trades of one security at one price within this time are shown as one item („×6“). */
const BURST_MS = 60_000;

const idOf = (t: SecurityOrderLogEntryView) => t.id ?? `${t.securityIdentifier}-${t.date}`;

/** Fresh and known trades together: newest first, each id once, at most `max`. */
export function mergeTrades(
  fresh: SecurityOrderLogEntryView[],
  prev: SecurityOrderLogEntryView[],
  max = 300,
): SecurityOrderLogEntryView[] {
  const seen = new Set<string>();
  return [...fresh, ...prev]
    .filter((t) => {
      const id = idOf(t);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, max);
}

/**
 * Tape items, newest first; `change` compares each trade with the one before it in the same security.
 * Trades at a price of 0 (transfers, a few percent of all) are left out – they are no market price.
 * Jumps beyond ×10 or ÷10 get no change either: next to a transfer at a token price (0,01 €) they
 * would read „+199.885.500 %“.
 */
const MAX_JUMP = 10;

export function withTicks(trades: SecurityOrderLogEntryView[]): TapeTrade[] {
  const last = new Map<string, number>();
  const out: TapeTrade[] = [];
  for (const t of [...trades].sort((a, b) => (a.date ?? 0) - (b.date ?? 0))) {
    const asin = t.securityIdentifier ?? '';
    const price = t.price ?? 0;
    if (price <= 0) continue;
    const before = last.get(asin);
    last.set(asin, price);
    const prev = out[out.length - 1];
    if (prev && prev.asin === asin && prev.price === price && (t.date ?? 0) - prev.date <= BURST_MS) {
      prev.count += 1;
      prev.shares += t.numberOfShares ?? 0;
      prev.date = t.date ?? prev.date;
      continue;
    }
    out.push({
      id: idOf(t),
      asin,
      price,
      shares: t.numberOfShares ?? 0,
      date: t.date ?? 0,
      count: 1,
      change: before && price / before <= MAX_JUMP && before / price <= MAX_JUMP ? ((price - before) / before) * 100 : null,
    });
  }
  return out.reverse();
}

/**
 * The trades still to show, oldest first. There are far more trades than a calm tape can show,
 * so only the newest `keep` wait – the tape stays close to now instead of falling behind.
 */
export function waiting(trades: TapeTrade[], seen: ReadonlySet<string>, keep = 12): TapeTrade[] {
  return trades
    .filter((t) => !seen.has(t.id))
    .slice(0, keep)
    .reverse();
}

/** Trades in the minute before `now` (or before the newest trade, if the clocks disagree). */
export function tradesPerMinute(trades: TapeTrade[], now: number): number {
  const end = Math.max(now, trades[0]?.date ?? 0);
  return trades.filter((t) => t.date > end - 60_000).reduce((n, t) => n + t.count, 0);
}

/** Bonds and repos are quoted in percent; the ASIN prefix tells when the listing type is unknown. */
export function typeOfAsin(asin: string): string | undefined {
  if (/^(BO|SB)/.test(asin)) return 'BOND';
  if (/^(RE|SR)/.test(asin)) return 'REPO';
  return undefined;
}
