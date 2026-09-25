// Pure logic for market maker quotes (designated sponsoring): what the market offers now, a
// sensible first quote, checks against cash and free shares, and the request the API expects.
import type { OrderbookView } from '../api/types';

/** A paired quote: the sponsor buys at `buyPrice` and sells at `sellPrice`. */
export interface Quote {
  buyPrice: number;
  sellPrice: number;
  buyShares: number;
  sellShares: number;
}

/** Best bid/ask of the order book (falls back to the spread), and their middle. */
export function bestPrices(
  ob: Pick<OrderbookView, 'buyEntries' | 'sellEntries'> | undefined,
  spread?: { bidPrice?: number | null; askPrice?: number | null } | null,
  last?: number | null,
): { bid?: number; ask?: number; mid?: number } {
  const bids = (ob?.buyEntries ?? []).map((e) => e.priceLimit).filter((p) => p > 0);
  const asks = (ob?.sellEntries ?? []).map((e) => e.priceLimit).filter((p) => p > 0);
  const bid = bids.length ? Math.max(...bids) : spread?.bidPrice || undefined;
  const ask = asks.length ? Math.min(...asks) : spread?.askPrice || undefined;
  const mid = bid && ask ? (bid + ask) / 2 : last || bid || ask || undefined;
  return { bid, ask, mid };
}

/** Spread in % of the ask, as the API computes `spreadPercent` (0,72 € on 71,96 € → 1,0006 %). */
export function spreadPct(bid: number | undefined, ask: number | undefined): number | undefined {
  if (!bid || !ask || ask <= 0) return undefined;
  return ((ask - bid) / ask) * 100;
}

/** Price step: 0,0001 for % quotes and prices below 1 €, otherwise one cent. */
export function priceTick(p: number, percentQuoted = false): number {
  return percentQuoted || p < 1 ? 0.0001 : 0.01;
}

const onTick = (p: number, tick: number, dir: 'down' | 'up') => {
  const n = p / tick;
  // 1e-9 against float noise: 71.24 / 0.01 = 7123.999999…
  const r = dir === 'down' ? Math.floor(n + 1e-9) : Math.ceil(n - 1e-9);
  return Math.round(r * tick * 1e6) / 1e6;
};

/** Cost of one unit: the price, or price % of the face value for bonds and repos. */
export const unitCost = (price: number, faceValue?: number) => (faceValue ? (price / 100) * faceValue : price);

/** Share of cash and free shares a suggested quote commits per side. */
export const QUOTE_COMMIT = 0.1;
/** Widest spread the suggestion aims for (1 % around the middle), narrower if the market already is. */
export const QUOTE_TARGET_SPREAD = 0.01;

/**
 * First quote for the form: inside the current market (never wider than it) and at most 1 %
 * wide around the middle; buy price rounded down, sell price up. Size: a tenth of what the cash
 * buys or of the free shares, whichever is smaller, the same on both legs (at least one share).
 */
export function suggestQuote(o: {
  bid?: number;
  ask?: number;
  mid?: number;
  cash?: number;
  freeShares?: number;
  faceValue?: number;
  percentQuoted?: boolean;
}): Quote | undefined {
  const mid = o.mid;
  if (!mid || mid <= 0) return undefined;
  const marketHalf = o.bid && o.ask ? (o.ask - o.bid) / 2 : Infinity;
  const half = Math.min(marketHalf, (mid * QUOTE_TARGET_SPREAD) / 2);
  const tick = priceTick(mid, o.percentQuoted);
  const buyPrice = Math.max(tick, onTick(mid - half, tick, 'down'));
  let sellPrice = onTick(mid + half, tick, 'up');
  if (sellPrice <= buyPrice) sellPrice = Math.round((buyPrice + tick) * 1e6) / 1e6;
  const affordable = o.cash != null ? Math.floor(o.cash / unitCost(buyPrice, o.faceValue)) : 0;
  const free = Math.max(0, Math.floor(o.freeShares ?? 0));
  const part = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.floor(n * QUOTE_COMMIT)));
  // Both legs the same size (the smaller one): a rich company would otherwise bid for millions of
  // shares while it can offer only a few. Without cash or shares the other side's size stays and
  // the form explains what is missing.
  const buy = part(affordable);
  const sell = part(free);
  const n = buy && sell ? Math.min(buy, sell) : Math.max(buy, sell);
  return { buyPrice, sellPrice, buyShares: n, sellShares: n };
}

export type QuoteErrors = Partial<Record<keyof Quote | 'form', string>>;

/** What is wrong with a quote (German, per field); empty when it can be sent. The server decides in the end. */
export function quoteErrors(q: Partial<Quote>, o: { cash?: number; freeShares?: number; faceValue?: number }): QuoteErrors {
  const e: QuoteErrors = {};
  const price = (v: number | undefined) => (v == null || !Number.isFinite(v) ? 'Gib einen Kurs ein.' : v <= 0 ? 'Der Kurs muss über 0 liegen.' : undefined);
  const shares = (v: number | undefined) =>
    v == null || !Number.isFinite(v) ? 'Gib eine Stückzahl ein.' : v < 1 || !Number.isInteger(v) ? 'Ganze Stückzahl ab 1.' : undefined;
  const set = (k: keyof QuoteErrors, m: string | undefined) => {
    if (m) e[k] = m;
  };
  set('buyPrice', price(q.buyPrice));
  set('sellPrice', price(q.sellPrice));
  set('buyShares', shares(q.buyShares));
  set('sellShares', shares(q.sellShares));
  if (!e.buyPrice && !e.sellPrice && q.sellPrice! <= q.buyPrice!) e.form = 'Der Verkaufskurs muss über dem Kaufkurs liegen.';
  if (!e.buyPrice && !e.buyShares && o.cash != null && unitCost(q.buyPrice!, o.faceValue) * q.buyShares! > o.cash)
    e.buyShares = 'Mehr, als das Bargeld des Unternehmens kauft.';
  if (!e.sellShares && o.freeShares != null && q.sellShares! > o.freeShares) e.sellShares = 'Mehr, als das Unternehmen frei hält.';
  return e;
}

/** Shares quoted on one side as share of all outstanding shares (fraction, like `dailyVolumeRate`). */
export function quoteShare(shares: number | undefined, outstanding: number | undefined): number | undefined {
  if (!shares || !outstanding || outstanding <= 0) return undefined;
  return shares / outstanding;
}

/** The sponsor's running quote: its two QUOTE legs among the open orders of its account. */
export function runningQuote(
  orders: { type?: string; action: 'BUY' | 'SELL'; price?: number; numberOfShares: number; securityIdentifier?: string; listing?: { securityIdentifier?: string } }[] | undefined,
  asin: string,
): Partial<Quote> | undefined {
  const legs = (orders ?? []).filter((o) => o.type === 'QUOTE' && (o.securityIdentifier ?? o.listing?.securityIdentifier) === asin);
  if (!legs.length) return undefined;
  const buy = legs.find((o) => o.action === 'BUY');
  const sell = legs.find((o) => o.action === 'SELL');
  return { buyPrice: buy?.price, buyShares: buy?.numberOfShares, sellPrice: sell?.price, sellShares: sell?.numberOfShares };
}

/**
 * Half-width of the chart around the middle (fraction): three times the widest of market and quote,
 * between ±2 % and ±50 % – so the quote is readable and far-away walls do not squash it.
 */
export function quoteBand(mid: number | undefined, prices: (number | undefined)[]): number {
  if (!mid || mid <= 0) return 0.5;
  const far = Math.max(0, ...prices.filter((p): p is number => p != null && p > 0).map((p) => Math.abs(p - mid) / mid));
  return Math.min(0.5, Math.max(0.02, far * 3));
}
