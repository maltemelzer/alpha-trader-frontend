// Pure logic of the interest tender (Zinstender): how bids become the main rate.
//
// Verified against stable (25.09.2026, 76 of 76 rate changes since 19.08. exact): the main rate is the
// mean of (bid − 100) over all allotments of the last seven days, weighted by the number of bonds,
// rounded to 2 decimals. High bids raise it (102 % ≙ +2), low bids lower it (98 % ≙ −2) – for the
// bidding bank itself 98 % means +2 % return on the 7-day bond. Reserve rate = raw rate / 2, system
// bond = main rate + 1 (both rounded to 2 decimals).

const DAY = 86_400_000;
export const WINDOW_DAYS = 7;
/** Face value of a tender bond in € (price 102 = 102 € per bond). */
export const FACE = 100;
export const MIN_BID = 98;
export const MAX_BID = 102;

export interface Bid {
  price: number;
  shares: number;
}

/** One allotment at the end of a tender: the Alpha Bank sells each bid at its own price. */
export interface TenderTrade extends Bid {
  date: number;
  asin: string;
  bidder: string;
  account?: string;
}

export interface Tender {
  asin: string;
  /** Time of the allotment (first trade) */
  date: number;
  shares: number;
  /** Volume-weighted mean effect on the main rate (bid − 100), −2 … +2 */
  effect: number;
  bids: TenderTrade[];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a bid does to the main rate: 102 % → +2, 98 % → −2. */
export const bidEffect = (price: number) => price - FACE;
/** What the bid earns the bank over the 7 days, in % of face value: 98 % → +2, 102 % → −2. */
export const bidReturn = (price: number) => FACE - price;

/** Tender allotments from the order log of the Alpha Bank's account (ASINs „ITI…“), without transfers at price 0. */
export function tenderTrades(
  logs:
    | {
        date?: number;
        securityIdentifier?: string;
        price?: number;
        numberOfShares?: number;
        buyerSecuritiesAccountName?: string;
        buyerSecuritiesAccount?: string;
      }[]
    | undefined,
): TenderTrade[] {
  return (logs ?? [])
    .filter((l) => l.securityIdentifier?.startsWith('ITI') && l.date != null && (l.price ?? 0) > 0 && (l.numberOfShares ?? 0) > 0)
    .map((l) => ({
      date: l.date!,
      asin: l.securityIdentifier!,
      price: l.price!,
      shares: l.numberOfShares!,
      bidder: l.buyerSecuritiesAccountName?.trim() || 'Unbekannt',
      account: l.buyerSecuritiesAccount,
    }))
    .sort((a, b) => a.date - b.date);
}

/** Σ(bid − 100) · bonds / Σ bonds – the unrounded rate of a set of bids; undefined without bonds. */
export function weightedEffect(bids: Bid[]): number | undefined {
  let n = 0;
  let s = 0;
  for (const b of bids) {
    if (!(b.shares > 0)) continue;
    n += b.shares;
    s += bidEffect(b.price) * b.shares;
  }
  return n > 0 ? s / n : undefined;
}

/** One entry per tender (grouped by bond), oldest first. */
export function groupTenders(trades: TenderTrade[]): Tender[] {
  const by = new Map<string, TenderTrade[]>();
  for (const t of trades) by.set(t.asin, [...(by.get(t.asin) ?? []), t]);
  return [...by.entries()]
    .map(([asin, bids]) => ({
      asin,
      date: Math.min(...bids.map((b) => b.date)),
      shares: bids.reduce((s, b) => s + b.shares, 0),
      effect: weightedEffect(bids) ?? 0,
      bids: [...bids].sort((a, b) => b.shares - a.shares),
    }))
    .sort((a, b) => a.date - b.date);
}

/** Main rate (unrounded) at time `at`: allotments within the seven days before, optionally without one bidder. */
export function rateAt(trades: TenderTrade[], at: number, without?: string): number | undefined {
  return weightedEffect(trades.filter((t) => t.date <= at && t.date > at - WINDOW_DAYS * DAY && t.bidder !== without));
}

export interface Rates {
  /** unrounded main rate */
  raw: number;
  main: number;
  reserve: number;
  system: number;
}

export function ratesFrom(raw: number | undefined): Rates | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined;
  const main = round2(raw);
  return { raw, main, reserve: round2(raw / 2), system: round2(main + 1) };
}

export type Assumption = 'buch' | 'gestern';

/**
 * The bids the next main rate will be made of, apart from mine: the last six tenders (the oldest of the
 * seven drops out when the running one is allotted) plus the running tender – either the bids in its
 * book now, or, since most bids come in at the last minute, the bids of the last tender again.
 */
export function projectionBase(tenders: Tender[], book: Bid[], assume: Assumption): Bid[] {
  const kept = tenders.slice(-(WINDOW_DAYS - 1));
  const running = assume === 'gestern' ? (tenders.at(-1)?.bids ?? []) : book;
  return [...kept.flatMap((t) => t.bids), ...running];
}

/** Rates if the tender ended with `base` plus my bid. */
export function project(base: Bid[], mine?: Bid): Rates | undefined {
  return ratesFrom(weightedEffect(mine && mine.shares > 0 ? [...base, mine] : base));
}

/** `count` values evenly spaced on a log scale from `min` to `max` (both included). */
export function logSpace(min: number, max: number, count: number): number[] {
  if (!(min > 0) || !(max > min) || count < 2) return [min];
  const a = Math.log10(min);
  const step = (Math.log10(max) - a) / (count - 1);
  return Array.from({ length: count }, (_, i) => 10 ** (a + i * step));
}

/** Resulting unrounded main rate for my bid at `price` and each volume. */
export function effectCurve(base: Bid[], price: number, volumes: number[]): { shares: number; rate: number }[] {
  return volumes.flatMap((shares) => {
    const r = weightedEffect([...base, { price, shares }]);
    return r == null ? [] : [{ shares, rate: r }];
  });
}

/**
 * Bonds needed so the rate moves from `from` to `target` with a bid at `price` (both unrounded):
 * (S + e·x) / (N + x) = target → x = (target·N − S) / (e − target). Undefined if the bid cannot get there.
 */
export function sharesToReach(base: Bid[], price: number, target: number): number | undefined {
  const n = base.reduce((s, b) => s + (b.shares > 0 ? b.shares : 0), 0);
  const sum = base.reduce((s, b) => s + (b.shares > 0 ? bidEffect(b.price) * b.shares : 0), 0);
  const e = bidEffect(price);
  if (e === target) return undefined;
  const x = (target * n - sum) / (e - target);
  return x > 0 && Number.isFinite(x) ? Math.ceil(x) : undefined;
}

/**
 * Most bonds a bank may bid for: its central bank credit line (maxCentralBankLoans) in face value.
 * Forum „Zinstender-Verfahren“ (2022): „maximal in Höhe ihrer System-Kreditsumme“; observed: the
 * largest bids have exactly 10 % of the bidder's reserves as face value (Stockbrot 8 Bio. Stk. × 100 €).
 */
export function maxBidShares(maxCentralBankLoans: number | undefined): number | undefined {
  return maxCentralBankLoans != null && maxCentralBankLoans > 0 ? Math.floor(maxCentralBankLoans / FACE) : undefined;
}

/**
 * Central bank credit (system bonds, 100 € face value each): how many a bank may still issue, and what
 * it gets and pays back for `n` of them at the system bond rate (whole term, in %).
 */
export function systemBondCredit(n: number, rate: number | undefined, max?: number, taken = 0) {
  const room = max != null ? Math.max(0, Math.floor((max - taken) / FACE)) : undefined;
  const volume = n * FACE;
  return { room, volume, payback: rate != null ? volume * (1 + rate / 100) : undefined, usedAfter: max ? ((taken + volume) / max) * 100 : undefined };
}

/** Money of a bid: paid now, paid back after seven days, and the difference for the bank. */
export function bidMoney(price: number, shares: number) {
  const cost = (price / 100) * FACE * shares;
  const payout = FACE * shares;
  return { cost, payout, result: payout - cost };
}

/** Why a bid cannot be sent; null when it can. */
export function bidError(price: number, shares: number, opts: { maxShares?: number; cash?: number } = {}): string | null {
  if (!Number.isFinite(price) || price < MIN_BID || price > MAX_BID) return 'Gebot zwischen 98 % und 102 %.';
  if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) return 'Höchstens zwei Nachkommastellen.';
  if (!Number.isInteger(shares) || shares < 1) return 'Mindestens eine Anleihe.';
  if (opts.maxShares != null && shares > opts.maxShares) return 'Mehr als dein Kreditrahmen erlaubt.';
  if (opts.cash != null && bidMoney(price, shares).cost > opts.cash) return 'Das Bargeld der Bank reicht nicht.';
  return null;
}

export interface BidderShare {
  bidder: string;
  shares: number;
  /** share of all allotted bonds in % */
  percent: number;
  /** volume-weighted effect of this bidder's bids (−2 … +2) */
  effect: number;
  tenders: number;
}

/** Bidders by allotted bonds, largest first. */
export function bidderShares(tenders: Tender[]): BidderShare[] {
  const by = new Map<string, { shares: number; sum: number; asins: Set<string> }>();
  let total = 0;
  for (const t of tenders)
    for (const b of t.bids) {
      const e = by.get(b.bidder) ?? { shares: 0, sum: 0, asins: new Set<string>() };
      e.shares += b.shares;
      e.sum += bidEffect(b.price) * b.shares;
      e.asins.add(t.asin);
      by.set(b.bidder, e);
      total += b.shares;
    }
  return [...by.entries()]
    .map(([bidder, e]) => ({
      bidder,
      shares: e.shares,
      percent: total ? (e.shares / total) * 100 : 0,
      effect: e.shares ? e.sum / e.shares : 0,
      tenders: e.asins.size,
    }))
    .sort((a, b) => b.shares - a.shares);
}

/** Main rate right after each tender – with all bidders and without one (what if they had not bid). */
export function rateAfterTenders(trades: TenderTrade[], tenders: Tender[], without?: string) {
  const first = trades[0]?.date ?? 0;
  return tenders
    // the window must lie in the data (tenders are daily: the first one may be up to a day after its start)
    .filter((t) => t.date - WINDOW_DAYS * DAY >= first - DAY)
    .map((t) => {
      const at = Math.max(...t.bids.map((b) => b.date));
      return { date: at, rate: rateAt(trades, at), without: without ? rateAt(trades, at, without) : undefined };
    });
}

/** Signed German percent for rate effects: „+1,50 %“, „−0,25 %“, „±0,00 %“ (or another unit, e.g. „Pp.“). */
export function signedRate(n: number, digits = 2, unit = '%'): string {
  const s = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const zero = Math.abs(n) < 0.5 * 10 ** -digits;
  return `${zero ? '±' : n > 0 ? '+' : '−'}${s}${String.fromCharCode(0xa0)}${unit}`;
}

/** Bid price in % with two decimals: „101,50 %“. */
export function bidPct(price: number): string {
  return `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${String.fromCharCode(0xa0)}%`;
}

/**
 * Colour token per bidder, fixed while filtering (diagram rule 3): my banks chart-1 (brass), the four
 * largest other bidders chart-2 … chart-5, everyone else line-strong („Übrige“).
 */
export function bidderColors(bidders: { bidder: string }[], mine: Iterable<string> = []): Record<string, string> {
  const own = new Set(mine);
  const out: Record<string, string> = {};
  let next = 2;
  for (const b of bidders) {
    if (own.has(b.bidder)) out[b.bidder] = 'chart-1';
    else if (next <= 5) out[b.bidder] = `chart-${next++}`;
    else out[b.bidder] = 'line-strong';
  }
  return out;
}
