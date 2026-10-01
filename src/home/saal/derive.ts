// Start page „Börsensaal“: the board's rows, their fixed-width cells, the paging and the flap sequences.
// Pure functions only – the page (HomePage.tsx) and the flaps (Flap.tsx) render what comes out of here.
import type { MarketRow } from '../../api/queries';
import type { SecurityOrderLogEntryView, TradingMatrixItemView } from '../../api/types';
import { withTicks } from '../../app/tape';
import { short } from '../../lib/format';
import type { Lookup } from '../../market/screener';
import { dailyYield } from '../../security/derive';

const NBSP = String.fromCharCode(0xa0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/* ------------------------------------------------------------------ cells */

/**
 * Fixed board columns in character cells: price, change (without the arrow cell), 4th column. The name
 * (and a headline) takes whatever the board's width leaves – at least `minName` cells.
 */
export const COLS = { price: 9, change: 7, volume: 9, minName: 11 } as const;
/** News lines: time and kind; the headline takes the rest. */
export const NEWS_COLS = { time: 6, kind: 7 } as const;

/**
 * Text → exactly `width` board cells: upper case (the flaps know capitals only), padded left or right,
 * cut with a final „.“ when too long. Non-breaking spaces count as blanks.
 */
export function cells(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const t = text.replaceAll(NBSP, ' ').toLocaleUpperCase('de-DE').replaceAll('ẞ', 'SS');
  if (t.length > width) return align === 'left' ? `${t.slice(0, width - 1).trimEnd()}.`.padEnd(width) : t.slice(t.length - width);
  return align === 'left' ? t.padEnd(width) : t.padStart(width);
}

/** Legal forms at the end of a name – they say nothing on a board. */
const LEGAL = /\s+(inc|corp|corporation|co|ag|se|gmbh|kg|kgaa|ltd|llc|plc|sa|nv)\.?$/i;

/**
 * A name shortened for `width` cells without losing what tells it apart: the legal form goes first;
 * a numbered end („017“, „#3“) is never cut – the words before it shrink to their initial from the
 * right („ZFLOAT V.017“), then the start is cut. Returns plain text (not padded).
 */
export function boardName(name: string, width: number): string {
  let n = name.replaceAll(NBSP, ' ').trim().replace(/\s+/g, ' ');
  while (LEGAL.test(n) && n.replace(LEGAL, '').length > 0) n = n.replace(LEGAL, '');
  if (n.length <= width) return n;
  const words = n.split(' ');
  const tail = words.length > 1 && /\d/.test(words[words.length - 1]) ? words.pop()! : '';
  // without a numbered end the start tells names apart – `cells` cuts the end with a „.“
  if (!tail) return n;
  const join = () => {
    const head = words.join(' ');
    return `${head}${head.endsWith('.') ? '' : ' '}${tail}`;
  };
  for (let i = words.length - 1; i >= 1 && join().length > width; i--) {
    if (words[i].length > 2) words[i] = `${words[i][0]}.`;
  }
  if (join().length <= width) return join();
  const room = width - tail.length - 1;
  if (room < 2) return n;
  return `${words.join(' ').slice(0, room - 1).trimEnd()}. ${tail}`;
}

/** A name with a suffix that must stay readable („MALLJENS CO. ×84“): the name is cut, never the suffix. */
export function nameCells(name: string, suffix: string, width: number): string {
  if (!suffix) return cells(boardName(name, width), width);
  const room = Math.max(1, width - suffix.length - 1);
  return cells(`${cells(boardName(name, room), room).trimEnd()} ${suffix}`, width);
}

/** How many cells of pitch `pitch` px fill `px` (never fewer than `min`). */
export const cellsIn = (px: number, pitch: number, min = 1) => (pitch > 0 ? Math.max(min, Math.floor(px / pitch)) : min);

const de = (n: number, min: number, max = min) => n.toLocaleString('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max });

/** A price for the board: 2 decimals, two significant digits below 0,01 €, short form from 1 Mio. */
export function boardPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '–';
  if (Math.abs(v) >= 1e6) return short(v);
  if (v !== 0 && Math.abs(v) < 0.01) return v.toLocaleString('de-DE', { maximumSignificantDigits: 2 });
  return de(v, 2);
}

/** A price in short form from 1.000 on („508 Tsd.“), for narrow boards. */
export const shortPrice = (v: number | null | undefined) => (v != null && Math.abs(v) >= 1000 ? short(v) : boardPrice(v));

/** The price that fits `width` cells: the full one, else the short form. */
export const fitPrice = (r: { price: string; priceShort: string }, width: number) => (r.price.length <= width ? r.price : r.priceShort);

/** A bond price in % with four decimals (the rule for bonds and repos). */
export const bondPrice = (v: number | null | undefined) => (v == null ? '–' : de(v, 4));

/**
 * The change in percent points for the column „Zum Vortag %“: „+24,31“, „−0,40“; from 1.000 without
 * decimals, from a million short; unknown „–“. The % sign stands in the column head.
 */
export function boardChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '–';
  const a = Math.abs(pct);
  const v = a >= 1e6 ? short(a) : a >= 1000 ? de(a, 0) : de(a, 2);
  if (v === '0,00') return '0,00';
  return `${pct > 0 ? '+' : '−'}${v}`;
}

export type Dir = 'up' | 'down' | 'flat' | null;

export const dirOf = (pct: number | null | undefined): Dir =>
  pct == null || !Number.isFinite(pct) ? null : Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';

export const arrowOf = (d: Dir) => (d === 'up' ? '▲' : d === 'down' ? '▼' : d === 'flat' ? '·' : ' ');

/** „2T 04:13“ / „04:13“ – time left like a departure board: days, hours:minutes. */
export function boardLeft(ms: number): string {
  if (ms <= 0) return '00:00';
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return d > 0 ? `${d}T ${hm}` : hm;
}

/** „02:13:45“ – countdown with seconds; past → „00:00:00“, beyond 99 h capped. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.min(Math.floor(ms / 1000), 99 * 3600 + 59 * 60 + 59));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * „18:42“ today, „29.09“ on another day – and „14.10▸“ / „18:30▸“ for what is still to come (a payday,
 * a subscription start), so the future reads apart from the past. Six cells for the news lines.
 */
export function boardTime(ms: number, now: number): string {
  const d = new Date(ms);
  const n = new Date(now);
  const p = (x: number) => String(x).padStart(2, '0');
  const sameDay = d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  const text = sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getDate())}.${p(d.getMonth() + 1)}`;
  return ms > now ? `${text}▸` : text;
}

/* ------------------------------------------------------------------ flaps */

/**
 * The calm characters a flap may show on its way – letters and digits only. Punctuation in between
 * („?:;€+“) reads as broken; the drum turns forward through these instead.
 */
export const QUIET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * The characters a flap shows on its way from `from` to `to`, ending with `to`: up to `max − 1` calm
 * characters forward from `from` on the quiet drum (from the start of it for a blank or a sign), then
 * the new one. Same character: nothing to do.
 */
export function flapSequence(from: string, to: string, max = 2): string[] {
  if (from === to) return [];
  if (max <= 1) return [to];
  const start = QUIET.indexOf(from);
  const out: string[] = [];
  for (let i = 1; i < max; i++) {
    const c = QUIET[(Math.max(start, 0) + i * 3) % QUIET.length];
    if (c !== to) out.push(c);
  }
  return [...out, to];
}

/** Which cells of two equally long board strings differ (the ones that flip). */
export function changedCells(prev: string, next: string): boolean[] {
  return Array.from({ length: Math.max(prev.length, next.length) }, (_, i) => prev[i] !== next[i]);
}

/** Delay of a cell's turn: row after row, cell after cell, the whole board within `cap` ms. */
export const flipDelay = (row: number, cell: number, cap = 600) => Math.min(cap, row * 45 + cell * 6);

/* ------------------------------------------------------------------ rows */

export interface BoardRow {
  asin: string;
  name: string;
  /** after the name, never cut (cohort size of bonds „×84“) */
  suffix?: string;
  price: string;
  /** the price in short form, for narrow boards where `price` does not fit („508 Tsd.“) */
  priceShort: string;
  /** direction for the arrow and the colour of the change column */
  dir: Dir;
  change: string;
  /** 4th column: volume (shares), time left (bonds), value (own positions) */
  volume: string;
  mine: boolean;
  /** the latest trade seen since the page opened: the line lights up once per trade */
  flash?: { id: string; dir: Dir };
  /** news lines: where the line leads (default: the security) */
  href?: string;
}

export type SectionId = 'meldungen' | 'handel' | 'bewegung' | 'anleihen' | 'depot';

export interface BoardSection {
  id: SectionId;
  title: string;
  /** column heads: price, change, 4th (news: time, kind, –) */
  heads: [string, string, string];
  rows: BoardRow[];
  /** shown on an empty section (still loading, or nothing to show) */
  empty: string;
}

/** Shares and the coin – the board leaves out buildings (hundreds of equally named houses) and bonds (own section). */
export const onBoard = (asin: string) => /^(ST|AC)/.test(asin);

/** % change of a listing to the day before: known, 0 when the mover lists are complete, else null. */
export function changeOf(asin: string, changes: Lookup | null): number | null {
  if (!changes) return null;
  const v = changes.map.get(asin);
  if (v != null) return Number.isNaN(v) ? null : v;
  return changes.complete ? 0 : null;
}

/**
 * The newest trade of each security after `since` (the page's opening) with its move against the
 * trade before: a line lights up once for it, in gain/loss colour or neutral. Transfers (≤ 0,01 €) are
 * no trade here.
 */
export function lastTrades(trades: SecurityOrderLogEntryView[], since: number): Map<string, { id: string; dir: Dir }> {
  const out = new Map<string, { id: string; dir: Dir }>();
  for (const t of withTicks(trades.filter((x) => (x.price ?? 0) > 0.01))) {
    if (t.date <= since || out.has(t.asin)) continue;
    out.set(t.asin, { id: t.id, dir: t.change == null ? 'flat' : dirOf(t.change) });
  }
  return out;
}

export interface RowContext {
  changes: Lookup | null;
  mine: ReadonlySet<string>;
  flashes?: Map<string, { id: string; dir: Dir }>;
}

function shareRow(
  asin: string,
  name: string,
  price: number | null | undefined,
  volume: number | null | undefined,
  ctx: RowContext,
  known?: number,
): BoardRow {
  const pct = known ?? changeOf(asin, ctx.changes);
  return {
    asin,
    name,
    price: boardPrice(price),
    priceShort: shortPrice(price),
    dir: dirOf(pct),
    change: boardChange(pct),
    volume: volume == null ? '–' : short(volume),
    mine: ctx.mine.has(asin),
    flash: ctx.flashes?.get(asin),
  };
}

/** Most traded in 24 h (useMostTraded, shape of the trading matrix): shares and the coin by € volume. */
export function mostTraded(matrix: TradingMatrixItemView[] | undefined, ctx: RowContext, n = 12): BoardRow[] {
  return (matrix ?? [])
    .filter((m) => m.securityIdentifier && onBoard(m.securityIdentifier))
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, n)
    .map((m) => shareRow(m.securityIdentifier!, m.name ?? m.securityIdentifier!, m.lastPrice, m.volume24h, ctx));
}

/** Movers below this 24 h volume are one lonely trade at an odd price – not worth a line on the board. */
export const MIN_MOVER_VOLUME = 10_000;

/**
 * Biggest moves to the day before, both ways, largest first – only shares/coin with a bid and an ask and,
 * where known, at least 10 Tsd. € volume. Rows already on the board (`skip`) are left out.
 */
export function biggestMoves(
  winners: MarketRow[] | undefined,
  losers: MarketRow[] | undefined,
  matrix: TradingMatrixItemView[] | undefined,
  ctx: RowContext,
  skip: ReadonlySet<string>,
  n = 6,
): BoardRow[] {
  const volume = new Map((matrix ?? []).map((m) => [m.securityIdentifier ?? '', m.volume24h ?? 0]));
  const seen = new Set<string>();
  return [...(winners ?? []), ...(losers ?? [])]
    .filter((r) => {
      const asin = r.listing.securityIdentifier;
      const pct = r.priceChangeInPercent;
      if (!onBoard(asin) || skip.has(asin) || seen.has(asin) || pct == null || pct === 0) return false;
      if (pct > 900 || pct < -90) return false; // a transfer at a token price the day before
      if (r.bidPrice == null || r.askPrice == null) return false;
      const v = volume.get(asin);
      if (v != null && v < MIN_MOVER_VOLUME) return false;
      seen.add(asin);
      return true;
    })
    .sort((a, b) => Math.abs(b.priceChangeInPercent ?? 0) - Math.abs(a.priceChangeInPercent ?? 0))
    .slice(0, n)
    .map((r) =>
      shareRow(r.listing.securityIdentifier, r.listing.name, r.lastPrice?.value, volume.get(r.listing.securityIdentifier), ctx, r.priceChangeInPercent),
    );
}

export interface BoardBond {
  name?: string;
  interestRate?: number;
  maturityDate?: number;
  issuer?: { name?: string } | null;
  listing?: { name?: string; securityIdentifier?: string };
  priceSpread?: { askPrice?: number | null } | null;
}

/** Bonds due within the hour are left out: 2 % on a few minutes would read as thousands of % a day. */
const MIN_LEFT = HOUR;

/**
 * The best yields per day at the ask, one line per cohort: bonds of the same coupon, ask and maturity
 * (± 10 min) are sold by the hundred and would fill the board – the line names the first and counts them.
 */
export function bestYields(bonds: BoardBond[] | undefined, now: number, mine: ReadonlySet<string>, n = 5): BoardRow[] {
  const groups = new Map<string, { bond: BoardBond; value: number; count: number; mine: boolean }>();
  for (const b of bonds ?? []) {
    const asin = b.listing?.securityIdentifier;
    const ask = b.priceSpread?.askPrice;
    const left = (b.maturityDate ?? 0) - now;
    if (!asin || ask == null || left < MIN_LEFT) continue;
    const value = dailyYield(ask, b.interestRate ?? 0, left);
    if (value == null) continue;
    const key = `${b.interestRate}|${ask}|${Math.round((b.maturityDate ?? 0) / (10 * MIN))}`;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      g.mine ||= mine.has(asin);
    } else groups.set(key, { bond: b, value, count: 1, mine: mine.has(asin) });
  }
  return [...groups.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map(({ bond, value, count, mine: own }) => ({
      asin: bond.listing!.securityIdentifier!,
      name: bond.issuer?.name ?? bondIssuer(bond.listing?.name ?? bond.name ?? ''),
      suffix: count > 1 ? `×${count}` : undefined,
      price: bondPrice(bond.priceSpread?.askPrice),
      priceShort: bondPrice(bond.priceSpread?.askPrice),
      dir: null,
      change: de(value, 2),
      volume: boardLeft((bond.maturityDate ?? 0) - now),
      mine: own,
    }));
}

/** „datOlen Corp. 2.0600% 30/09/2026“ → „datOlen Corp.“ */
export const bondIssuer = (name: string) => name.replace(/\s+\d+[.,]\d+%.*$/, '').trim() || name;

export interface OwnPosition {
  securityIdentifier: string;
  volume: number;
  numberOfShares: number;
  lastPrice?: { value?: number | null } | null;
  listing: { name: string; type?: string };
}

/** The player's own positions by value (bonds by their last price in %). */
export function ownRows(positions: OwnPosition[] | undefined, ctx: RowContext, n = 12): BoardRow[] {
  return (positions ?? [])
    .filter((p) => p.numberOfShares > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, n)
    .map((p) => {
      const asin = p.securityIdentifier;
      const pct = changeOf(asin, ctx.changes);
      const pctQuoted = /^(BO|SB|RE|SR)/.test(asin);
      return {
        asin,
        name: pctQuoted ? bondIssuer(p.listing.name) : p.listing.name,
        price: pctQuoted ? bondPrice(p.lastPrice?.value) : boardPrice(p.lastPrice?.value),
        priceShort: pctQuoted ? bondPrice(p.lastPrice?.value) : shortPrice(p.lastPrice?.value),
        dir: dirOf(pct),
        change: boardChange(pct),
        volume: short(p.volume ?? 0),
        mine: true,
        flash: ctx.flashes?.get(asin),
      };
    });
}

/** Ticker items → news lines: time (or date), kind, headline; each leads to its article or page. */
export function newsRows(items: TickerItem[], now: number): BoardRow[] {
  return items.map((i) => ({
    asin: i.id,
    name: i.text,
    price: i.kind === 'chat' ? 'NEU' : boardTime(i.at ?? i.date, now),
    priceShort: '',
    dir: null,
    change: NEWS_KIND[i.kind],
    volume: '',
    mine: i.kind === 'chat',
    href: i.href,
  }));
}

/* ------------------------------------------------------------------ paging */

export type BoardLine =
  | { kind: 'head'; section: BoardSection; cont: boolean }
  | { kind: 'row'; section: BoardSection; row: BoardRow; index: number }
  | { kind: 'note'; section: BoardSection };

/**
 * Sections → pages of at most `perPage` lines. Every section starts with its head line (repeated as
 * „continued“ on the next page); a head never stands alone at the bottom of a page; an empty section
 * takes one line for its note. At least one page, even when there is nothing.
 */
export function paginate(sections: BoardSection[], perPage: number): BoardLine[][] {
  const size = Math.max(2, Math.floor(perPage));
  const pages: BoardLine[][] = [[]];
  const room = () => size - pages[pages.length - 1].length;
  const push = (l: BoardLine) => pages[pages.length - 1].push(l);
  const newPage = () => pages.push([]);
  for (const section of sections) {
    const body = Math.max(1, section.rows.length);
    if (room() < 2) newPage();
    push({ kind: 'head', section, cont: false });
    for (let i = 0; i < body; i++) {
      if (room() < 1) {
        newPage();
        push({ kind: 'head', section, cont: true });
      }
      const row = section.rows[i];
      if (row) push({ kind: 'row', section, row, index: i });
      else push({ kind: 'note', section });
    }
  }
  if (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();
  return pages;
}

/** Lines that fit a height: body height ÷ line height, at least 3. */
export const linesFor = (height: number, lineHeight: number) => (lineHeight > 0 ? Math.max(3, Math.floor(height / lineHeight)) : 10);

/* ------------------------------------------------------------------ depot */

/**
 * Depot value (cash + positions, like `bookValue`) and its change to the day before: each position's
 * value is taken back by its own change; unknown changes count as unchanged, and are counted.
 */
export function depotChange(
  portfolio: { cash: number; positions: { securityIdentifier: string; volume: number }[] } | undefined,
  changes: Lookup | null,
): { value: number; change: number | null; pct: number | null; unknown: number } | null {
  if (!portfolio) return null;
  let value = portfolio.cash;
  let before = portfolio.cash;
  let unknown = 0;
  for (const p of portfolio.positions) {
    const v = p.volume ?? 0;
    value += v;
    const pct = changeOf(p.securityIdentifier, changes);
    if (pct == null) {
      unknown += 1;
      before += v;
    } else before += v / (1 + pct / 100);
  }
  if (!changes) return { value, change: null, pct: null, unknown };
  const change = value - before;
  return { value, change, pct: before > 0 ? (change / before) * 100 : null, unknown };
}

/* ------------------------------------------------------------------ ticker */

export type TickerKind = 'zeitung' | 'kapital' | 'dividende' | 'fusion' | 'trade' | 'chat' | 'tender';

export interface TickerItem {
  id: string;
  kind: TickerKind;
  label: string;
  text: string;
  href: string;
  /** order of the news (newest first) */
  date: number;
  /** when it happens, for the time column (default `date`) – a dividend's payday */
  at?: number;
}

export const TICKER_LABELS: Record<TickerKind, string> = {
  zeitung: 'Zeitung',
  kapital: 'Kapital',
  dividende: 'Dividende',
  fusion: 'Fusion',
  trade: 'Großer Trade',
  chat: 'Nachrichten',
  tender: 'Zinstender',
};

/** The kind on a news line, at most seven cells. */
export const NEWS_KIND: Record<TickerKind, string> = {
  zeitung: 'ZEITUNG',
  kapital: 'KAPITAL',
  dividende: 'DIVID.',
  fusion: 'FUSION',
  trade: 'TRADE',
  chat: 'CHAT',
  tender: 'TENDER',
};

/** Big trades of the loaded window: the largest by €, at least `min`, transfers left out. */
export function bigTrades(trades: SecurityOrderLogEntryView[], min = 1e8, n = 3): SecurityOrderLogEntryView[] {
  return trades
    .filter((t) => (t.price ?? 0) > 0.01 && (t.volume ?? 0) >= min)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, n);
}

/**
 * The news order: unread messages first (they need you), then the three newest articles (news at a
 * glance), then everything else newest first – at most `max` items.
 */
export function tickerOrder(items: TickerItem[], max = 14): TickerItem[] {
  const newest = (a: TickerItem, b: TickerItem) => b.date - a.date;
  const chat = items.filter((i) => i.kind === 'chat');
  const news = items.filter((i) => i.kind === 'zeitung').sort(newest).slice(0, 3);
  const rest = items.filter((i) => i.kind !== 'chat' && !news.includes(i)).sort(newest);
  return [...chat, ...news, ...rest].slice(0, max);
}

