import type { SecurityOrderView } from '../../design-system/components';
import type { operations } from '../api/schema';
import type { SecurityOrderWithVolumeView } from '../api/types';

/** Count and volume of open buy and sell orders. */
export function orderTotals(orders: SecurityOrderView[]) {
  const t = {
    count: orders.length,
    buys: 0,
    sells: 0,
    buyVolume: 0,
    sellVolume: 0,
  };
  for (const o of orders) {
    const v = o.volume ?? o.numberOfShares * (o.price ?? 0);
    if (o.action === 'BUY') {
      t.buys += 1;
      t.buyVolume += v;
    } else {
      t.sells += 1;
      t.sellVolume += v;
    }
  }
  return t;
}

// ---------- OTC ----------
// An OTC order names one counterparty (a securities account); only that account can execute it.
// Executing = placing the opposite order with the offerer as counterparty (POST /api/securityorders).

type OtcOrder = SecurityOrderWithVolumeView;
export type AddOrderQuery = operations['addOrder']['parameters']['query'];

/** An offer addressed to one of my accounts. */
export interface IncomingOtc {
  order: OtcOrder & { id: string };
  /** my account the offer is addressed to */
  accountId: string;
  accountName: string;
  /** goodAfterDate still in the future – visible, but not yet executable */
  pending: boolean;
}

/** Offers for all my accounts, newest first; expired ones dropped, duplicates removed. */
export function incomingOtc(
  lists: { accountId: string; accountName: string; orders?: OtcOrder[] }[],
  now = Date.now(),
): IncomingOtc[] {
  const seen = new Set<string>();
  const out: IncomingOtc[] = [];
  for (const l of lists) {
    for (const o of l.orders ?? []) {
      if (!o.id || seen.has(o.id)) continue;
      if (o.goodTillDate != null && o.goodTillDate < now) continue;
      seen.add(o.id);
      out.push({
        order: o as IncomingOtc['order'],
        accountId: l.accountId,
        accountName: l.accountName,
        pending: o.goodAfterDate != null && o.goodAfterDate > now,
      });
    }
  }
  return out.sort((a, b) => (b.order.creationDate ?? 0) - (a.order.creationDate ?? 0));
}

export const counterAction = (a: 'BUY' | 'SELL'): 'BUY' | 'SELL' => (a === 'BUY' ? 'SELL' : 'BUY');

/** € per share at the offer's price. Bonds are quoted in %, so prefer the API's volume (it knows the face value). */
export function unitValue(o: Pick<OtcOrder, 'volume' | 'numberOfShares' | 'price'>): number | undefined {
  if (o.volume && o.numberOfShares > 0) return o.volume / o.numberOfShares;
  return o.price ?? undefined;
}

/** Price as the API wants it: dot decimal, no exponent, no trailing zeros. */
export function apiPrice(n: number): string {
  const s = n.toFixed(6);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/**
 * Query for POST /api/securityorders that executes an OTC offer: the opposite action at the offer's
 * limit, addressed back to the offerer's account. MARKET offers have no price, the caller supplies one.
 */
export function acceptParams(input: {
  order: Pick<OtcOrder, 'owner' | 'securityIdentifier' | 'action' | 'type' | 'price'>;
  owner: string;
  shares: number;
  price?: number;
}): AddOrderQuery {
  const { order, owner, shares } = input;
  const px = order.type === 'LIMIT' && order.price != null ? order.price : input.price;
  if (!(px != null && px > 0)) throw new Error('OTC-Ausführung braucht einen Preis.');
  return {
    owner,
    securityIdentifier: order.securityIdentifier,
    action: counterAction(order.action),
    type: 'LIMIT',
    price: apiPrice(px),
    numberOfShares: shares,
    counterparty: order.owner,
    checkOrderOnly: false,
  };
}

/** Why the offer can't be executed as entered – null if it can. */
export function acceptProblem(input: {
  order: Pick<OtcOrder, 'owner' | 'action' | 'numberOfShares'>;
  owner: string;
  shares: number;
  /** € per share (already including the face value for bonds) */
  unit?: number;
  cash?: number;
  freeShares?: number;
}): string | null {
  const { order, owner, shares, unit, cash, freeShares } = input;
  if (order.owner === owner) return 'Das ist deine eigene Order.';
  if (!Number.isInteger(shares) || shares < 1) return 'Bitte eine ganze Zahl ab 1 eingeben.';
  if (shares > order.numberOfShares)
    return `Angeboten sind höchstens ${order.numberOfShares.toLocaleString('de-DE')} Anteile.`;
  if (!(unit && unit > 0)) return 'Bitte einen Preis eingeben.';
  if (counterAction(order.action) === 'BUY') {
    if (cash != null && shares * unit > cash + 1e-9) {
      const max = Math.floor(cash / unit);
      return max > 0
        ? `Nicht genug Bargeld – höchstens ${max.toLocaleString('de-DE')} Anteile.`
        : 'Nicht genug Bargeld.';
    }
  } else if (freeShares != null && shares > freeShares) {
    return freeShares > 0
      ? `Im Portfolio sind nur ${freeShares.toLocaleString('de-DE')} freie Anteile.`
      : 'Dieses Portfolio hält keine freien Anteile.';
  }
  return null;
}

/** Market price to compare with: what I'd pay (Brief) when buying, what I'd get (Geld) when selling. */
export function referencePrice(
  spread: { askPrice?: number; bidPrice?: number; lastPrice?: { value?: number } } | undefined,
  myAction: 'BUY' | 'SELL',
): { price: number; label: string } | undefined {
  if (!spread) return undefined;
  const quote = myAction === 'BUY' ? spread.askPrice : spread.bidPrice;
  if (quote != null && quote > 0) return { price: quote, label: myAction === 'BUY' ? 'Brief' : 'Geld' };
  const last = spread.lastPrice?.value;
  return last != null && last > 0 ? { price: last, label: 'Kurs' } : undefined;
}

/** Premium of the offer over the market in % (negative = below). */
export function premiumPct(price: number | undefined, reference: number | undefined): number | undefined {
  if (price == null || !reference) return undefined;
  return (price / reference - 1) * 100;
}

/** From my side: buying below / selling above the market is favourable; within ±1 % counts as fair. */
export function verdict(myAction: 'BUY' | 'SELL', pct: number | undefined): 'good' | 'fair' | 'poor' | undefined {
  if (pct == null) return undefined;
  if (Math.abs(pct) <= 1) return 'fair';
  return (myAction === 'BUY') === pct < 0 ? 'good' : 'poor';
}

/** Key figures of the offers addressed to me. */
export function otcTotals(rows: IncomingOtc[]) {
  const t = { count: rows.length, toBuy: 0, toSell: 0, volume: 0 };
  for (const r of rows) {
    if (counterAction(r.order.action) === 'BUY') t.toBuy += 1;
    else t.toSell += 1;
    t.volume += r.order.volume ?? r.order.numberOfShares * (r.order.price ?? 0);
  }
  return t;
}

/** Order ticket params plus the chosen counterparty; ready for POST /api/securityorders. */
export function otcOfferParams<P extends { owner: string }>(
  params: P,
  counterparty: string,
): P & { counterparty: string; checkOrderOnly: false } {
  if (!counterparty) throw new Error('Bitte eine Gegenpartei wählen.');
  if (params.owner === counterparty) throw new Error('Die Gegenpartei muss ein anderes Portfolio sein.');
  return { ...params, counterparty, checkOrderOnly: false };
}

/** Label for a possible counterparty from GET /api/v2/securitiesaccountdetails: „Firma (ASIN) | CEO“ or the player's name. */
export function counterpartyLabel(a: { name?: string; privateAccount?: boolean }) {
  const name = a.name ?? '';
  const i = name.lastIndexOf(' | ');
  return a.privateAccount || i < 0
    ? { title: name, meta: a.privateAccount ? 'Privatdepot' : 'Unternehmen' }
    : {
        title: name.slice(0, i),
        meta: `Unternehmen · CEO ${name.slice(i + 3)}`,
      };
}

/**
 * Counterparty hits in a useful order. The server also matches the CEO part of „Firma (ASIN) | CEO“,
 * so a search for a player lists all their companies before e.g. „<Name> Inc.“. Rank by the account's
 * own name: exact, starts with, contains, then CEO-only matches; server order within each rank.
 */
export function rankCounterparties<T extends { name?: string; privateAccount?: boolean }>(list: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return list;
  const rank = (a: T) => {
    const t = counterpartyLabel(a).title.toLowerCase();
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.includes(q)) return 2;
    return 3;
  };
  return list
    .map((a, i) => ({ a, i, r: rank(a) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.a);
}
