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

/**
 * Rules for a designated sponsor's quote (game rules as the operator states them; not in the spec):
 * each side quotes 1–2 % of the outstanding shares, and bid and ask are at least 5 % apart.
 * The spread is measured like the API's `spreadPercent` – (ask − bid) / ask – the strictest reading.
 */
export const MM_RULES = { minSpreadPct: 5, minShare: 0.01, maxShare: 0.02 } as const;

/** Shares per side the rules allow: 1 % rounded up to 2 % rounded down (undefined without a share count). */
export function shareBounds(outstanding: number | undefined): { min: number; max: number } | undefined {
  if (!outstanding || outstanding <= 0) return undefined;
  return { min: Math.max(1, Math.ceil(outstanding * MM_RULES.minShare - 1e-9)), max: Math.floor(outstanding * MM_RULES.maxShare + 1e-9) };
}

/** Shares for a share of the outstanding ones (fraction), kept inside the rules' bounds. */
export function sharesFor(share: number, outstanding: number | undefined): number | undefined {
  const b = shareBounds(outstanding);
  if (!b || !Number.isFinite(share)) return undefined;
  return Math.min(Math.max(Math.round(share * outstanding!), b.min), Math.max(b.min, b.max));
}

/**
 * Buy and sell price `spread` % apart (as `spreadPct` measures it) around `mid`: buy rounded down
 * to the tick, then the lowest sell price that keeps the spread – never below the target, and only
 * as much wider as the tick forces (1,57 € → 1,66 € = 5,4 %).
 */
export function pricesAround(mid: number, spread: number, percentQuoted = false): Pick<Quote, 'buyPrice' | 'sellPrice'> | undefined {
  if (!(mid > 0) || !(spread > 0) || spread >= 100) return undefined;
  const s = spread / 100;
  // (ask − bid) / ask = s with ask = mid·(1 + h), bid = mid·(1 − h) → h = s / (2 − s)
  const h = s / (2 - s);
  const tick = priceTick(mid, percentQuoted);
  const buyPrice = Math.max(tick, onTick(mid * (1 - h), tick, 'down'));
  // (ask − bid) / ask ≥ s ⇔ ask ≥ bid / (1 − s)
  let sellPrice = onTick(buyPrice / (1 - s), tick, 'up');
  if (sellPrice <= buyPrice) sellPrice = Math.round((buyPrice + tick) * 1e6) / 1e6;
  return { buyPrice, sellPrice };
}

/** Share of cash and free shares a suggested quote commits per side when the share count is unknown. */
export const QUOTE_COMMIT = 0.1;

/**
 * First quote for the form: the narrowest spread the rules allow (5 %) around the middle and the
 * smallest volume they allow (1 % of the outstanding shares) on both sides. Without a share count:
 * a tenth of what the cash buys or of the free shares, whichever is smaller (at least one).
 * Cash or shares may not reach the rules' minimum – the form then says what is missing.
 */
export function suggestQuote(o: {
  mid?: number;
  cash?: number;
  freeShares?: number;
  outstanding?: number;
  faceValue?: number;
  percentQuoted?: boolean;
}): Quote | undefined {
  const prices = o.mid ? pricesAround(o.mid, MM_RULES.minSpreadPct, o.percentQuoted) : undefined;
  if (!prices) return undefined;
  const bounds = shareBounds(o.outstanding);
  if (bounds) return { ...prices, buyShares: bounds.min, sellShares: bounds.min };
  const affordable = o.cash != null ? Math.floor(o.cash / unitCost(prices.buyPrice, o.faceValue)) : 0;
  const free = Math.max(0, Math.floor(o.freeShares ?? 0));
  const part = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.floor(n * QUOTE_COMMIT)));
  const buy = part(affordable);
  const sell = part(free);
  const n = buy && sell ? Math.min(buy, sell) : Math.max(buy, sell);
  return { ...prices, buyShares: n, sellShares: n };
}

export type QuoteErrors = Partial<Record<keyof Quote | 'form' | 'spread', string>>;

const NBSP = String.fromCharCode(0xa0);
const de = (n: number, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * What is wrong with a quote (German, per field); empty when it can be sent. Checks the market
 * maker rules (`MM_RULES`) when the outstanding shares are known. The server decides in the end.
 */
export function quoteErrors(
  q: Partial<Quote>,
  o: { cash?: number; freeShares?: number; faceValue?: number; outstanding?: number },
): QuoteErrors {
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
  else if (!e.buyPrice && !e.sellPrice) {
    const sp = spreadPct(q.buyPrice, q.sellPrice)!;
    if (sp < MM_RULES.minSpreadPct - 1e-9)
      e.spread = `Mindestens ${MM_RULES.minSpreadPct}${NBSP}% Spread – jetzt ${de(sp, 2)}${NBSP}%.`;
  }
  const bounds = shareBounds(o.outstanding);
  if (bounds)
    for (const k of ['buyShares', 'sellShares'] as const) {
      if (e[k]) continue;
      if (q[k]! < bounds.min) e[k] = `Mindestens 1${NBSP}% der Anteile: ${de(bounds.min)} Stk.`;
      else if (q[k]! > bounds.max) e[k] = `Höchstens 2${NBSP}% der Anteile: ${de(bounds.max)} Stk.`;
    }
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
