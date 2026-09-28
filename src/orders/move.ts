import type { SecurityOrderView } from '../../design-system/components';
import type { PortfolioView } from '../api/types';
import { apiPrice, type AddOrderQuery } from './derive';

// ---------- Moving positions between my own accounts ----------
// A move is an OTC pair: account A sells to B (counterparty B), then B buys from A (counterparty A)
// at the same limit – the second order executes the first. Both accounts are mine (private account or
// a company I run as CEO), so nobody else can step in.

/** symbolic = 0,01 (like the transfers in the trade log, cash stays where it is) · market = bid, else last price */
export type MovePriceMode = 'symbolisch' | 'kurs';
export const SYMBOLIC_PRICE = 0.01;

type Position = PortfolioView['positions'][number];

export interface MoveItem {
  asin: string;
  name: string;
  type?: string;
  /** free shares in the source account */
  free: number;
  shares: number;
  /** limit per share in the listing's unit (bonds/repos in %) */
  price?: number;
}

/** Free (not committed) shares of a position. */
export const freeShares = (p: Pick<Position, 'numberOfShares' | 'committedShares'>) =>
  Math.max(0, p.numberOfShares - (p.committedShares ?? 0));

/** Limit for a position: 0,01 or the market price (bid, else last trade). */
export function movePrice(
  p: Pick<Position, 'currentBidPrice' | 'lastPrice'>,
  mode: MovePriceMode,
): number | undefined {
  if (mode === 'symbolisch') return SYMBOLIC_PRICE;
  if (p.currentBidPrice != null && p.currentBidPrice > 0) return p.currentBidPrice;
  const last = p.lastPrice?.value;
  return last != null && last > 0 ? last : undefined;
}

/**
 * Cash the receiving account pays per share. Bonds and repos are quoted in % of a 100 € face value,
 * so the number is the same: 98,5 % × 100 € = 98,50 €.
 */
export const unitCash = (price: number) => price;

/** The two orders of one move: the sell from `from`, then the buy from `to` that executes it. */
export function moveOrders(input: {
  from: string;
  to: string;
  asin: string;
  shares: number;
  price: number;
}): [AddOrderQuery, AddOrderQuery] {
  const { from, to, asin, shares, price } = input;
  if (from === to) throw new Error('Von- und Nach-Depot müssen verschieden sein.');
  if (!(price > 0)) throw new Error('Umbuchen braucht einen Preis.');
  const base = { securityIdentifier: asin, type: 'LIMIT' as const, price: apiPrice(price), numberOfShares: shares, checkOrderOnly: false };
  return [
    { ...base, owner: from, action: 'SELL', counterparty: to },
    { ...base, owner: to, action: 'BUY', counterparty: from },
  ];
}

/** Total cost for the receiving account and number of chosen securities. */
export function moveTotals(items: MoveItem[]) {
  let cost = 0;
  let count = 0;
  for (const i of items) {
    if (!(i.shares > 0)) continue;
    count += 1;
    if (i.price != null) cost += i.shares * unitCash(i.price);
  }
  return { count, cost };
}

/** Why the move can't be sent as entered – null if it can. */
export function moveProblem(input: { from?: string; to?: string; items: MoveItem[]; cashTo?: number }): string | null {
  const { from, to, items, cashTo } = input;
  if (!from || !to) return 'Bitte beide Depots wählen.';
  if (from === to) return 'Von- und Nach-Depot müssen verschieden sein.';
  const chosen = items.filter((i) => i.shares !== 0);
  if (!chosen.length) return 'Bitte mindestens ein Wertpapier wählen.';
  for (const i of chosen) {
    if (!Number.isInteger(i.shares) || i.shares < 1) return `${i.name}: Bitte eine ganze Zahl ab 1 eingeben.`;
    if (i.shares > i.free)
      return i.free > 0
        ? `${i.name}: Nur ${i.free.toLocaleString('de-DE')} freie Anteile.`
        : `${i.name}: Keine freien Anteile (alle in offenen Orders).`;
    if (!(i.price != null && i.price > 0)) return `${i.name}: Kein Kurs bekannt – symbolisch umbuchen.`;
  }
  const { cost } = moveTotals(chosen);
  if (cashTo != null && cost > cashTo + 1e-9) return 'Das Nach-Depot hat nicht genug Bargeld für den Kaufpreis.';
  return null;
}

/** A sell of a move that is still open after the buy: the pair didn't execute (fully). */
export function openMoveSell(
  orders: SecurityOrderView[],
  m: { to: string; asin: string; price: number },
): SecurityOrderView | undefined {
  return orders.find(
    (o) =>
      o.action === 'SELL' &&
      o.counterParty === m.to &&
      (o.listing?.securityIdentifier ?? o.securityIdentifier) === m.asin &&
      o.price != null &&
      Math.abs(o.price - m.price) < 1e-9,
  );
}
