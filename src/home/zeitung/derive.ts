// Start page „Zeitung“ – pure calculations: the edition line (date, volume, issue number), the price
// list („Kurszettel“), the stories set from live data, their rank (which one leads) and the short
// reports („Kurz notiert“). Tested in derive.test.ts. No DOM here: article text comes in as plain text.
import { dailyYield } from '../../security/derive';
import { gameLinksToMentions } from '../../lib/html';

const NBSP = ' ';
const MIN = 60_000;
const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** The first day of the game (the Alpha Bank was listed on 5 August 2021) – issue no. 1. */
export const FOUNDED = new Date(2021, 7, 5).getTime();

/* ------------------------------------------------------------------ numbers */

const de = (n: number, min: number, max = min) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max });

/** 1234567 → „1,23 Mio.“, like format.short, but with „Tsd.“ only from 10.000 on (reads better in text). */
export function shortMoney(n: number): string {
  const a = Math.abs(n);
  const units: [number, string][] = [
    [1e15, 'Brd.'],
    [1e12, 'Bio.'],
    [1e9, 'Mrd.'],
    [1e6, 'Mio.'],
  ];
  for (const [f, u] of units) if (a >= f) return `${n < 0 ? '−' : ''}${de(a / f, 0, a / f >= 100 ? 0 : a / f >= 10 ? 1 : 2)}${NBSP}${u}${NBSP}€`;
  return `${n < 0 ? '−' : ''}${de(a, 0, a >= 100 ? 0 : 2)}${NBSP}€`;
}

/** A price in €: two decimals, below 1 € up to four (penny stocks). */
export const priceText = (n: number) => `${de(n, 2, n < 1 ? 4 : 2)}${NBSP}€`;

/** A price as the list prints it, without the unit: „1.234,56“, „0,0123“. */
export const priceFigure = (n: number) => de(n, 2, n < 1 ? 4 : 2);

/** „46 %“ (whole numbers from 10 on, else one decimal) */
export const pctText = (n: number) => `${de(Math.abs(n), 0, Math.abs(n) < 10 ? 1 : 0)}${NBSP}%`;

/** „+2,34“ / „−1,20“ / „±0,00“ – the list's change column (the unit is in the column head). */
export function changeFigure(n: number): string {
  const v = de(Math.abs(n), 2);
  if (v === '0,00') return `±${v}`;
  return `${n > 0 ? '+' : '−'}${v}`;
}

export type Dir = 'up' | 'down' | null;
export const dirOf = (n: number | undefined | null): Dir => (n == null || Math.abs(n) < 0.005 ? null : n > 0 ? 'up' : 'down');

/* ------------------------------------------------------------------ edition */

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export interface Edition {
  /** „Mittwoch, 30. September 2026“ */
  date: string;
  /** „Mi., 30.09.“ – phones */
  dateShort: string;
  /** the game's year, counted from August 2021: „6. Jahrgang“ */
  volume: number;
  /** days since the game began, the first day is no. 1 */
  number: number;
  /** Morgen-, Mittags-, Abend- or Nachtausgabe after the hour */
  name: string;
  /** „14:32“ */
  time: string;
}

export function edition(now: number, founded = FOUNDED): Edition {
  const d = new Date(now);
  const f = new Date(founded);
  const h = d.getHours();
  // calendar days (local midnight to midnight), not 24-hour blocks – daylight saving must not skip a number
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime()) / DAY);
  const anniversary = d.getMonth() > f.getMonth() || (d.getMonth() === f.getMonth() && d.getDate() >= f.getDate());
  return {
    date: `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    dateShort: `${WEEKDAYS[d.getDay()].slice(0, 2)}., ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`,
    volume: d.getFullYear() - f.getFullYear() + (anniversary ? 1 : 0),
    number: days + 1,
    name: h < 5 ? 'Nachtausgabe' : h < 11 ? 'Morgenausgabe' : h < 17 ? 'Mittagsausgabe' : h < 22 ? 'Abendausgabe' : 'Nachtausgabe',
    time: clock(now),
  };
}

/** „14:32“ */
export const clock = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** „14:32“ today, „gestern 14:32“, else „Mo., 28.09.“ – the time stamp of a report. */
export function stamp(ms: number, now: number): string {
  const d = new Date(ms);
  const n = new Date(now);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, n)) return clock(ms);
  const y = new Date(now - DAY);
  if (sameDay(d, y)) return `gestern ${clock(ms)}`;
  return `${WEEKDAYS[d.getDay()].slice(0, 2)}., ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/** „heute 14:00 Uhr“, „morgen 14:00 Uhr“, „Fr., 02.10., 14:00 Uhr“ – when something is due. */
export function due(ms: number, now: number): string {
  const d = new Date(ms);
  const n = new Date(now);
  const t = `${clock(ms)}${NBSP}Uhr`;
  if (d.toDateString() === n.toDateString()) return `heute ${t}`;
  if (d.toDateString() === new Date(now + DAY).toDateString()) return `morgen ${t}`;
  return `${WEEKDAYS[d.getDay()].slice(0, 2)}., ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}., ${t}`;
}

/** „gerade eben“, „vor 12 Min.“, „vor 3 Std.“, „vor 2 Tagen“ */
export function ago(ms: number, now: number): string {
  const d = Math.max(0, now - ms);
  if (d < MIN) return 'gerade eben';
  if (d < HOUR) return `vor ${Math.round(d / MIN)}${NBSP}Min.`;
  if (d < DAY) return `vor ${Math.round(d / HOUR)}${NBSP}Std.`;
  const days = Math.round(d / DAY);
  return days === 1 ? 'vor einem Tag' : `vor ${days}${NBSP}Tagen`;
}

/* ------------------------------------------------------------------ quotes */

/** A row of the market lists (biggest traded, big movers) – the fields the page reads. */
export interface ListRow {
  listing: { name: string; securityIdentifier: string; type?: string };
  lastPrice?: { value: number; date?: number } | null;
  bidPrice?: number | null;
  askPrice?: number | null;
  volume?: number | null;
  priceChangeInPercent?: number | null;
}

export interface Quote {
  asin: string;
  name: string;
  type: string;
  price?: number;
  /** time of the last trade */
  date?: number;
  /** % against the last daily close; undefined = unknown */
  change?: number;
  /** € turnover in 24 h */
  volume?: number;
  bid?: number;
  ask?: number;
  /** the real last daily close the change is counted against (set by `rebase`); without it the change is the server's „zum Vortag“ */
  close?: Close;
}

export interface Close {
  date: number;
  value: number;
}

/** The last daily close (historizedlistingdata, oldest first) up to `now` – the snapshot taken around 01:40. */
export function lastClose(days: { date?: string | number; closePrice?: number | null }[] | undefined, now: number): Close | undefined {
  for (let i = (days?.length ?? 0) - 1; i >= 0; i--) {
    const d = days![i];
    const date = new Date(d.date ?? 0).getTime();
    if (d.closePrice && d.closePrice > 0 && date <= now) return { date, value: d.closePrice };
  }
  return undefined;
}

/**
 * The change counted against the real last close where it is known – the server's „zum Vortag“ matches
 * none of the closes at times (Prime Market Making: −66 % at closes 11,95 / 35,14 / 24,16 €). A headline,
 * its figure and its chart must agree, so the lead and the price list both use this.
 */
export function rebase(quotes: Quote[], closes: ReadonlyMap<string, Close>): Quote[] {
  return quotes.map((q) => {
    const c = closes.get(q.asin);
    if (!c || q.price == null) return q;
    const change = (q.price / c.value - 1) * 100;
    // the app's rule: beyond +900 % / −90 % the close was a transfer at a token price – unknown, never news
    return { ...q, close: c, change: change > 900 || change < -90 ? undefined : change };
  });
}

/**
 * Article text for print: markdown remains (`**`, `__`, `[Text](URL)`) go, links to a security – the old
 * game's and this app's `/wertpapier/X` – become `#X`, every other URL is cut to its host.
 */
export function cleanText(text: string): string {
  return gameLinksToMentions(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
    .replace(/https?:\/\/[^\s/]+\/wertpapier\/([A-Z][A-Z0-9]{9})\b\/?/g, '#$1')
    .replace(/https?:\/\/(?:www\.)?([^\s/?#]+)(\S*)/g, (m: string, host: string) => {
      // keep a sentence mark that followed the URL
      const end = m.match(/[.,;:!?)]+$/)?.[0] ?? '';
      return host.replace(/[.,;:!?)]+$/, '') + end;
    })
    .replace(/\*\*|__/g, '')
    .replace(/[ \t]{2,}/g, ' ');
}

/** The sentences of a text, each with its end mark („Erster Satz.“, „Zweiter?“). */
export function sentences(text: string): string[] {
  // a sentence ends at a mark followed by a space – „alpha-trader.nordquint.de“ stays one word
  return text
    .split(/(?<=[.!?…]["“”»«]?)\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** The first `n` sentences; „ …“ at the end when some were left out. */
export function firstSentences(list: string[], n: number): string {
  const shown = list.slice(0, Math.max(1, n)).join(' ');
  return n < list.length ? `${shown}\u00a0…` : shown;
}

/** The `n` strongest movers by the server's change – the ones whose real close is worth fetching. */
export function moveCandidates(quotes: Quote[], n = 6): string[] {
  return quotes
    .filter((q) => (q.type === 'STOCK' || q.type === 'COIN') && q.change != null && Math.abs(q.change) >= 3 && (q.volume ?? 0) >= 1e6 && q.price)
    .sort((a, z) => moveWeight(z.change!, z.volume!) - moveWeight(a.change!, a.volume!))
    .slice(0, n)
    .map((q) => q.asin);
}

/** Changes by ASIN, as `changeLookup` builds them (NaN = a jump beyond ×10, unknown). */
export interface ChangeLookup {
  map: Map<string, number>;
  /** both lists reached 0: every listing not in them is unchanged */
  complete: boolean;
}

export function changeOf(asin: string, changes: ChangeLookup | null | undefined): number | undefined {
  if (!changes) return undefined;
  const c = changes.map.get(asin);
  if (c == null) return changes.complete ? 0 : undefined;
  return Number.isNaN(c) ? undefined : c;
}

/** The traded rows as quotes, with the change from the movers lists. */
export function toQuotes(rows: ListRow[] | undefined, changes: ChangeLookup | null | undefined): Quote[] {
  return (rows ?? []).map((r) => ({
    asin: r.listing.securityIdentifier,
    name: r.listing.name.trim(),
    type: r.listing.type ?? '',
    price: r.lastPrice?.value ?? undefined,
    date: r.lastPrice?.date,
    change: changeOf(r.listing.securityIdentifier, changes),
    volume: r.volume ?? undefined,
    bid: r.bidPrice ?? undefined,
    ask: r.askPrice ?? undefined,
  }));
}

type TradeLike = { securityIdentifier?: string; price?: number; date?: number };

/**
 * Prices from the live trades: a trade newer than the list's last price replaces it, and the change
 * against the last close moves with it (close = price ÷ (1 + change)). Trades at ≤ 0,01 € are transfers.
 */
export function withLiveTrades(quotes: Quote[], trades: TradeLike[] | undefined): Quote[] {
  const latest = new Map<string, TradeLike>();
  for (const t of trades ?? []) {
    if (!t.securityIdentifier || !t.price || t.price <= 0.01) continue;
    const seen = latest.get(t.securityIdentifier);
    if (!seen || (t.date ?? 0) > (seen.date ?? 0)) latest.set(t.securityIdentifier, t);
  }
  return quotes.map((q) => {
    const t = latest.get(q.asin);
    if (!t || (q.date != null && (t.date ?? 0) <= q.date) || q.price === t.price) return q;
    const close = q.price != null && q.change != null ? q.price / (1 + q.change / 100) : undefined;
    const price = t.price!;
    // a live price beyond ×10 of the close is a transfer, not a move – keep the list's figures
    if (close && (price / close > 10 || close / price > 10)) return q;
    return { ...q, price, date: t.date, change: close ? (price / close - 1) * 100 : q.change };
  });
}

/* ------------------------------------------------------------------ the price list (Kurszettel) */

export interface ListLine {
  asin: string;
  name: string;
  /** printed price (bonds: yield per day, see `note`) */
  price?: number;
  /** price in % (bonds) – printed with four decimals */
  pct?: boolean;
  change?: number;
  /** small text after the name: „×84“ (a cohort of equal bonds) */
  note?: string;
  /** bonds: time left, printed in the change column */
  left?: string;
  mine: boolean;
  volume?: number;
}

const line = (q: Quote, mine: ReadonlySet<string>): ListLine => ({
  asin: q.asin,
  name: q.name,
  price: q.price,
  change: q.change,
  mine: mine.has(q.asin),
  volume: q.volume,
});

/** Shares with the most turnover in 24 h. */
export function mostTraded(quotes: Quote[], mine: ReadonlySet<string>, n = 8): ListLine[] {
  return quotes
    .filter((q) => q.type === 'STOCK' && (q.volume ?? 0) > 0 && q.price != null)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, n)
    .map((q) => line(q, mine));
}

/** Rows of the movers list with turnover joined in: a move only counts with real trading behind it. */
export function moveQuotes(movers: ListRow[] | undefined, volume: Map<string, number>, changes: ChangeLookup | null | undefined): Quote[] {
  return (movers ?? []).flatMap((r) => {
    const asin = r.listing.securityIdentifier;
    const change = changeOf(asin, changes);
    if (change == null) return [];
    return [
      {
        asin,
        name: r.listing.name.trim(),
        type: r.listing.type ?? '',
        price: r.lastPrice?.value ?? undefined,
        date: r.lastPrice?.date,
        change,
        volume: volume.get(asin),
        bid: r.bidPrice ?? undefined,
        ask: r.askPrice ?? undefined,
      },
    ];
  });
}

/** Winners (`dir` up) or losers among shares and coins with at least `minVolume` € turnover. */
export function movers(quotes: Quote[], dir: 'up' | 'down', mine: ReadonlySet<string>, n = 3, minVolume = 10_000): ListLine[] {
  const seen = new Set<string>();
  return quotes
    .filter((q) => (q.type === 'STOCK' || q.type === 'COIN') && (q.volume ?? 0) >= minVolume && q.change != null)
    .filter((q) => (dir === 'up' ? q.change! >= 0.01 : q.change! <= -0.01))
    .sort((a, b) => (dir === 'up' ? b.change! - a.change! : a.change! - b.change!))
    .filter((q) => (seen.has(q.asin) ? false : (seen.add(q.asin), true)))
    .slice(0, n)
    .map((q) => line(q, mine));
}

export interface BondLike {
  name?: string;
  interestRate?: number;
  maturityDate?: number;
  issuer?: { name?: string } | null;
  listing?: { name?: string; securityIdentifier?: string };
  priceSpread?: { askPrice?: number | null } | null;
}

/** „datOlen Corp. 2.0600% 30/09/2026“ → „datOlen Corp.“ */
export const bondIssuer = (name: string) => name.replace(/\s+\d+[.,]\d+%.*$/, '').trim() || name;

/** „3 Std.“, „2 T.“ – time left to maturity */
export function leftText(ms: number): string {
  if (ms < DAY) return `${Math.max(1, Math.round(ms / HOUR))}${NBSP}Std.`;
  return `${Math.round(ms / DAY)}${NBSP}T.`;
}

/**
 * The best yields per day at the ask. Bonds due within the hour are left out (2 % on a few minutes reads
 * as thousands of % a day); a cohort of equal bonds (coupon, ask, maturity ± 10 min) is one line „×84“.
 * `price` = yield per day in %, `change` stays empty.
 */
export function bestYields(bonds: BondLike[] | undefined, now: number, mine: ReadonlySet<string>, n = 3): ListLine[] {
  const groups = new Map<string, { bond: BondLike; value: number; count: number; mine: boolean }>();
  for (const b of bonds ?? []) {
    const asin = b.listing?.securityIdentifier;
    const ask = b.priceSpread?.askPrice;
    const left = (b.maturityDate ?? 0) - now;
    if (!asin || ask == null || left < HOUR) continue;
    const value = dailyYield(ask, b.interestRate ?? 0, left);
    if (value == null || !Number.isFinite(value)) continue;
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
      name: bond.issuer?.name?.trim() || bondIssuer(bond.listing?.name ?? bond.name ?? ''),
      price: value,
      pct: true,
      note: count > 1 ? `×${count}` : undefined,
      left: leftText((bond.maturityDate ?? 0) - now),
      mine: own,
    }));
}

/* ------------------------------------------------------------------ market mood */

export interface Breadth {
  up: number;
  down: number;
  flat: number;
}

/** Rising / falling / unchanged among the traded quotes whose change is known. */
export function breadth(quotes: Quote[]): Breadth {
  const b = { up: 0, down: 0, flat: 0 };
  for (const q of quotes) {
    if (q.change == null || !(q.volume && q.volume > 0)) continue;
    if (q.change >= 0.05) b.up++;
    else if (q.change <= -0.05) b.down++;
    else b.flat++;
  }
  return b;
}

/** The mood in one word, like the weather box of a paper. */
export function weather(b: Breadth): string {
  const moving = b.up + b.down;
  if (moving < 3) return 'Windstill';
  const r = b.up / moving;
  if (r >= 0.7) return 'Sonnig';
  if (r >= 0.55) return 'Heiter';
  if (r > 0.45) return 'Wechselhaft';
  if (r > 0.3) return 'Bewölkt';
  return 'Regen';
}

/* ------------------------------------------------------------------ the player */

type PositionLike = { securityIdentifier?: string; listing?: { securityIdentifier?: string }; volume?: number };

/** Change of the depot against yesterday's close, from the positions' known changes (cash counts as unchanged). */
export function depotDay(cash: number, positions: PositionLike[], changes: ChangeLookup | null | undefined): { value: number; abs: number; pct: number } | undefined {
  if (!changes) return undefined;
  let value = cash;
  let before = cash;
  for (const p of positions) {
    const v = p.volume ?? 0;
    value += v;
    const c = changeOf(p.securityIdentifier ?? p.listing?.securityIdentifier ?? '', changes) ?? 0;
    before += v / (1 + c / 100);
  }
  if (before <= 0) return undefined;
  return { value, abs: value - before, pct: (value / before - 1) * 100 };
}

/* ------------------------------------------------------------------ stories */

export type StoryKind = 'artikel' | 'bewegung' | 'fusion' | 'kapital' | 'dividende' | 'tender' | 'leitzins' | 'trade';

export type StoryChart = { kind: 'price'; asin: string; name: string; ref?: number; close?: Close } | { kind: 'rate' };

export interface Story {
  id: string;
  kind: StoryKind;
  /** Dachzeile, e.g. „Kursbewegung“ */
  kicker: string;
  title: string;
  /** Unterzeile: one sentence under the headline */
  dek: string;
  /** Vorspann: two or three sentences */
  lede: string;
  /** articles: a longer lede for a lead without a graphic (set in two columns) */
  more?: string;
  /** byline or source, e.g. „Von Zombiemind · 11:22 Uhr“ */
  byline: string;
  href: string;
  /** how much it matters now, 0–100 */
  weight: number;
  /** when it happened (or is due) – for the order of the short reports and „fresh“ */
  at: number;
  chart?: StoryChart;
  /** price stories: ▲/▼ */
  change?: number;
}

/** Verb for a price move of `c` %. */
export function moveVerb(c: number): string {
  const a = Math.abs(c);
  if (c > 0) return a >= 30 ? 'springt um' : a >= 10 ? 'klettert um' : 'steigt um';
  return a >= 15 ? 'bricht um' : a >= 8 ? 'rutscht um' : 'fällt um';
}

/** „Prime Market Making bricht um 46 % ein“ */
export function moveTitle(name: string, c: number): string {
  return `${name} ${moveVerb(c)} ${pctText(c)}${c < 0 && Math.abs(c) >= 15 ? ' ein' : ''}`;
}

/** 0,3 … 1 by turnover: a move in a security traded for billions counts more than one in a sleeper. */
export const volumeWeight = (v: number) => Math.min(1, Math.max(0.3, Math.log10(Math.max(v, 1)) / 12));

/** Weight of a price move: 1,5 per percent up to 80, times the turnover weight – +250 % in a sleeper loses to −66 % in a big one. */
export const moveWeight = (change: number, volume: number) => Math.min(80, Math.abs(change) * 1.5) * volumeWeight(volume);

/** Names ending in a full stop („EVERY. Inc.“) must not end a sentence with „..“. */
export const tidy = (text: string) => text.replace(/(?<!\.)\.\.(?!\.)/g, '.');

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;

/**
 * The strongest move with turnover (≥ 1 Mio. € in 24 h, ≥ 3 %), shares and the coin only. `b` is the
 * whole market's breadth for the closing sentence.
 */
export function moveStory(quotes: Quote[], b: Breadth | undefined, ranks?: ReadonlyMap<string, number>): Story | undefined {
  const best = quotes
    .filter((q) => (q.type === 'STOCK' || q.type === 'COIN') && q.change != null && Math.abs(q.change) >= 3 && (q.volume ?? 0) >= 1e6 && q.price)
    .sort((a, z) => moveWeight(z.change!, z.volume!) - moveWeight(a.change!, a.volume!))[0];
  if (!best) return undefined;
  const c = best.change!;
  const price = best.price!;
  const ref = best.close?.value ?? price / (1 + c / 100);
  const up = c > 0;
  const from = best.close ? `vom letzten Schluss bei ${priceText(ref)}` : `von ${priceText(ref)} zum Vortag`;
  const market =
    b && b.up + b.down > 0
      ? ` Im ganzen Markt ${b.up === 1 ? 'steigt' : 'steigen'} ${plural(b.up, 'Wert', 'Werte')}, ${b.down === 1 ? 'fällt' : 'fallen'} ${b.down.toLocaleString('de-DE')}.`
      : '';
  // bid and ask only when both are plausible (within ×10 of the price) – a stray 0,02 € bid is no news
  const near = (x?: number) => !!x && x > 0 && x <= price * 10 && x >= price / 10;
  const quote = near(best.bid) && near(best.ask) ? ` Geld ${priceText(best.bid!)}, Brief ${priceText(best.ask!)}.` : '';
  const place = ranks?.get(best.asin);
  const what = best.type === 'COIN' ? 'der Coin' : 'die Aktie';
  const turnover =
    place != null && place <= 10
      ? `Mit ${shortMoney(best.volume!)} Umsatz in 24 Stunden ist ${what} die Nummer ${place} im Handel.`
      : `Umgesetzt wurden in 24 Stunden ${shortMoney(best.volume!)}.`;
  return {
    id: `move-${best.asin}`,
    kind: 'bewegung',
    kicker: best.type === 'COIN' ? 'Coins' : 'Kursbewegung',
    title: moveTitle(best.name, c),
    dek: `Kurs ${up ? 'steigt' : 'fällt'} ${from} auf ${priceText(price)} – kein umsatzstarker Wert bewegt sich stärker`,
    lede: `${turnover}${quote}${market}`,
    byline: `Aus den Kursdaten gesetzt`,
    href: `/wertpapier/${best.asin}`,
    weight: moveWeight(c, best.volume!),
    at: best.date ?? 0,
    chart: { kind: 'price', asin: best.asin, name: best.name, ref, close: best.close },
    change: c,
  };
}

export interface Article {
  id: string;
  title: string;
  /** plain text (htmlToText of the post) */
  text: string;
  author?: string;
  date: number;
  comments: number;
  company?: { name: string; securityIdentifier?: string } | null;
  /** operator's bilingual engine update („Updates on Alpha-Trader.com (20260929)“) */
  engine?: boolean;
}

/**
 * Splits an article's plain text into a subhead and the lede: a short first paragraph (< 150
 * characters, not the title again) reads as the subhead, like the bold first line most authors write.
 */
export function splitArticle(title: string, text: string, max = 320): { dek: string; lede: string } {
  const paras = text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  let dek = '';
  // a short first paragraph reads as subhead – not a salutation („Liebe Börsengemeinde,“)
  const first = paras[0] ?? '';
  if (paras.length > 1 && first.length >= 12 && first.length < 150 && !/[,:]$/.test(first) && first.toLowerCase() !== title.trim().toLowerCase())
    dek = paras.shift()!;
  return { dek, lede: cut(paras.join(' '), max) };
}

/** Cuts at the last sentence end (or word) before `max` characters, with „…“ when cut inside a sentence. */
export function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  const part = text.slice(0, max);
  const end = Math.max(part.lastIndexOf('. '), part.lastIndexOf('! '), part.lastIndexOf('? '));
  if (end > max * 0.5) return part.slice(0, end + 1);
  const space = part.lastIndexOf(' ');
  return `${part.slice(0, space > 0 ? space : max).replace(/[,;:–-]$/, '')}${NBSP}…`;
}

/** „Updates on Alpha-Trader.com (20260929)“ → „29.09.“ */
const engineDay = (title: string) => {
  const m = title.match(/\((\d{4})(\d{2})(\d{2})\)/);
  return m ? `${m[3]}.${m[2]}.` : '';
};

/** A paper article as a story: fresh ones weigh most (95 at once, −25 an hour), comments add a little. */
export function articleStory(a: Article, now: number): Story {
  const hours = Math.max(0, now - a.date) / HOUR;
  const title = a.engine ? `Neu im Spiel: die Updates vom ${engineDay(a.title)}` : a.title.trim();
  const text = cleanText(a.text);
  const { dek, lede } = splitArticle(title, text);
  const more = splitArticle(title, text, 1400).lede;
  return {
    id: `news-${a.id}`,
    kind: 'artikel',
    more,
    kicker: a.engine ? 'In eigener Sache' : (a.company?.name?.trim() ?? 'Leserbeitrag'),
    title,
    dek,
    lede,
    byline: `${a.author ? `Von ${a.author} · ` : ''}${stamp(a.date, now)}${a.comments > 0 ? ` · ${plural(a.comments, 'Kommentar', 'Kommentare')}` : ''}`,
    href: `/zeitung/${a.id}`,
    weight: Math.max(0, 95 - hours * 25) + Math.min(10, a.comments * 2) - (a.engine ? 20 : 0),
    at: a.date,
    chart: a.company?.securityIdentifier?.startsWith('ST') ? { kind: 'price', asin: a.company.securityIdentifier, name: a.company.name.trim() } : undefined,
  };
}

type Company = { name: string; securityIdentifier?: string };
export interface MergerLike {
  id: string;
  startDate: number;
  company: Company;
  acquiringCompany: Company;
}
export interface DividendLike {
  id: string;
  startDate: number;
  company: Company;
}
export interface CapitalLike {
  id: string;
  type?: string;
  numberOfShares: number;
  price: number;
  cashVolume: number;
  startDate: number;
  endDate: number;
  company: Company;
}

const companyHref = (c: Company, ansicht = 'ueberblick') => (c.securityIdentifier ? `/wertpapier/${c.securityIdentifier}?ansicht=${ansicht}` : '/kapitalmassnahmen');
const priceChart = (c: Company): StoryChart | undefined =>
  c.securityIdentifier?.startsWith('ST') ? { kind: 'price', asin: c.securityIdentifier, name: c.name.trim() } : undefined;

/** How much a company's share is traded: `volumeWeight` of its 24-h turnover, 0 below 1 Mio. € or unknown. */
export function tradedWeight(c: Company, volume?: ReadonlyMap<string, number>): number {
  const v = c.securityIdentifier ? (volume?.get(c.securityIdentifier) ?? 0) : 0;
  return v >= 1e6 ? volumeWeight(v) : 0;
}

/** „A“, „A und B“, „A, B und 3 weitere“ */
export function nameList(names: string[], show = 2): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length <= show) return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`;
  return `${names.slice(0, show).join(', ')} und ${names.length - show} weitere`;
}

/**
 * Mergers from an hour ago to three days ahead. Several companies merging into the same one on the same
 * day are one story („uriSTAY übernimmt 5 Firmen“). Weight: 12, +10 within a day, up to +30 when one of
 * the shares is really traded – a merger of two empty shells is no front-page news.
 */
export function mergerStories(list: MergerLike[] | undefined, now: number, volume?: ReadonlyMap<string, number>): Story[] {
  const groups = new Map<string, MergerLike[]>();
  for (const m of list ?? []) {
    if (m.startDate <= now - HOUR || m.startDate >= now + 3 * DAY) continue;
    const key = `${m.acquiringCompany.securityIdentifier ?? m.acquiringCompany.name}|${new Date(m.startDate).toDateString()}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.values()].map((ms) => {
    ms.sort((x, y) => x.startDate - y.startDate);
    const m = ms[0];
    const b = m.acquiringCompany.name.trim();
    const names = ms.map((x) => x.company.name.trim());
    const soon = m.startDate - now < DAY;
    const traded = Math.max(tradedWeight(m.acquiringCompany, volume), ...ms.map((x) => tradedWeight(x.company, volume)));
    const one = ms.length === 1;
    return {
      id: `merger-${m.id}`,
      kind: 'fusion' as const,
      kicker: 'Fusion',
      title: one ? `${names[0]} geht in ${b} auf` : `${b} übernimmt ${ms.length} Firmen`,
      dek: `Vollzug ${one ? '' : 'ab '}${due(m.startDate, now)}`,
      lede: one
        ? `${names[0]} wird mit ${b} verschmolzen, die Aktionäre haben zugestimmt. Danach gibt es die Aktie von ${names[0]} nicht mehr.`
        : `${b} verschmilzt ${nameList(names, 4)} mit sich. Die Aktionäre haben zugestimmt.`,
      byline: 'Aus den Kapitalmaßnahmen gesetzt',
      href: one ? companyHref(m.company) : companyHref(m.acquiringCompany),
      weight: 12 + (soon ? 10 : 0) + traded * 30,
      at: m.startDate,
      chart: one ? (priceChart(m.company) ?? priceChart(m.acquiringCompany)) : (priceChart(m.acquiringCompany) ?? priceChart(m.company)),
    };
  });
}

/** Capital increases/reductions whose subscription starts within a day or is running. */
export function capitalStories(list: CapitalLike[] | undefined, now: number, reduction = false, volume?: ReadonlyMap<string, number>): Story[] {
  return (list ?? [])
    .filter((c) => c.endDate > now && c.startDate < now + DAY)
    .map((c) => {
      const name = c.company.name.trim();
      const running = c.startDate <= now;
      const rights = c.type === 'WITH_SUBSCRIPTION_RIGHTS';
      const shares = c.numberOfShares.toLocaleString('de-DE');
      return {
        id: `capital-${c.id}`,
        kind: 'kapital' as const,
        kicker: reduction ? 'Kapitalherabsetzung' : 'Kapitalerhöhung',
        title: reduction ? `${name} zieht ${shares} Aktien ein` : `${name} holt sich ${shortMoney(c.cashVolume)}`,
        dek: running ? `Zeichnung läuft bis ${due(c.endDate, now)}` : `Zeichnung ab ${due(c.startDate, now)}`,
        lede: reduction
          ? `${name} setzt das Kapital herab: ${shares} Aktien werden eingezogen.`
          : `${name} gibt ${shares} neue Aktien zu je ${priceText(c.price)} aus.${rights ? ' Wer schon Aktien hat, bekommt ein Bezugsrecht.' : ''} Gezeichnet wird ${running ? `noch bis ${due(c.endDate, now)}` : `von ${due(c.startDate, now)} bis ${due(c.endDate, now)}`}.`,
        byline: 'Aus den Kapitalmaßnahmen gesetzt',
        href: companyHref(c.company),
        weight: 12 + Math.min(15, Math.max(0, Math.log10(Math.max(c.cashVolume, 1)) - 6) * 2.5) + tradedWeight(c.company, volume) * 25,
        at: running ? c.endDate : c.startDate,
        chart: priceChart(c.company),
      };
    });
}

/** Dividends due within two days. */
export function dividendStories(list: DividendLike[] | undefined, now: number, volume?: ReadonlyMap<string, number>): Story[] {
  return (list ?? [])
    .filter((d) => d.startDate > now - HOUR && d.startDate < now + 2 * DAY)
    .map((d) => {
      const name = d.company.name.trim();
      return {
        id: `dividend-${d.id}`,
        kind: 'dividende' as const,
        kicker: 'Dividende',
        title: `${name} schüttet aus`,
        dek: `Die Dividende ist beschlossen, gezahlt wird ${due(d.startDate, now)}`,
        lede: `Die Aktionäre von ${name} haben einer Dividende zugestimmt. Ausgezahlt wird ${due(d.startDate, now)}.`,
        byline: 'Aus den Kapitalmaßnahmen gesetzt',
        href: companyHref(d.company),
        weight: (d.startDate - now < DAY ? 10 : 4) + tradedWeight(d.company, volume) * 25,
        at: d.startDate,
        chart: priceChart(d.company),
      };
    });
}

export interface RateDay {
  date: number;
  rate: number;
  reserve?: number;
}

type RateSnapshot = { date: number; mainInterestRate?: number; reserveInterestRate?: number };

/** One main rate per day: the day's last snapshot (the rate is set twice per tender, the second counts). */
export function rateDays(history: RateSnapshot[] | undefined): RateDay[] {
  const byDay = new Map<string, RateDay>();
  for (const s of [...(history ?? [])].sort((a, b) => a.date - b.date)) {
    if (s.mainInterestRate == null) continue;
    byDay.set(new Date(s.date).toDateString(), { date: s.date, rate: s.mainInterestRate, reserve: s.reserveInterestRate });
  }
  return [...byDay.values()];
}

const rateText = (n: number) => `${de(n, 2)}${NBSP}%`;

/**
 * The central bank: before the tender closes (last 45 minutes) the close is the news; otherwise a changed
 * main rate (the last tender against the day before).
 */
export function rateStory(days: RateDay[], tenderEnd: number | undefined, now: number): Story | undefined {
  const last = days[days.length - 1];
  if (!last) return undefined;
  const before = days[days.length - 2];
  const delta = before ? last.rate - before.rate : 0;
  const reserve = last.reserve != null ? ` Der Einlagezins steht bei ${rateText(last.reserve)} pro Tag.` : '';
  if (tenderEnd && tenderEnd > now && tenderEnd - now < 45 * MIN) {
    return {
      id: `tender-${tenderEnd}`,
      kind: 'tender',
      kicker: 'Zentralbank',
      title: `Zinstender schließt um ${clock(tenderEnd)}${NBSP}Uhr`,
      dek: `Banken bieten zwischen 98 und 102 % – der Leitzins steht bei ${rateText(last.rate)}`,
      lede: `Bis ${clock(tenderEnd)}${NBSP}Uhr nimmt die Zentralbank Gebote an. Gebote über 100 % heben den Leitzins, darunter senken sie ihn; zählen werden alle Zuteilungen der letzten sieben Tage.${reserve}`,
      byline: 'Aus den Zentralbankdaten gesetzt',
      href: '/zentralbank?ansicht=tender',
      weight: 50,
      at: tenderEnd,
      chart: { kind: 'rate' },
    };
  }
  if (!before || Math.abs(delta) < 0.005) {
    return {
      id: `rate-${last.date}`,
      kind: 'leitzins',
      kicker: 'Zentralbank',
      title: `Leitzins bleibt bei ${rateText(last.rate)}`,
      dek: tenderEnd ? `Nächster Zinstender schließt ${due(tenderEnd, now)}` : 'Kein Zinstender angesetzt',
      lede: `Der letzte Zinstender hat den Leitzins nicht bewegt.${reserve}`,
      byline: 'Aus den Zentralbankdaten gesetzt',
      href: '/zentralbank',
      weight: 5,
      at: last.date,
      chart: { kind: 'rate' },
    };
  }
  const lo = Math.min(...days.map((d) => d.rate));
  const hi = Math.max(...days.map((d) => d.rate));
  const record = days.length >= 7 && (last.rate === lo || last.rate === hi);
  const up = delta > 0;
  return {
    id: `rate-${last.date}`,
    kind: 'leitzins',
    kicker: 'Zentralbank',
    title: `Leitzins ${up ? 'steigt' : 'fällt'} auf ${rateText(last.rate)}`,
    dek: `${up ? '+' : '−'}${de(Math.abs(delta), 2)}${NBSP}Prozentpunkte nach dem Zinstender${record ? ` – ${up ? 'höchster' : 'tiefster'} Stand seit ${days.length} Tagen` : ''}`,
    lede: `Der Zinstender hat den Leitzins von ${rateText(before.rate)} auf ${rateText(last.rate)} ${up ? 'angehoben' : 'gesenkt'}.${reserve}${tenderEnd ? ` Der nächste Tender schließt ${due(tenderEnd, now)}.` : ''}`,
    byline: 'Aus den Zentralbankdaten gesetzt',
    href: '/zentralbank',
    weight: Math.min(60, 15 + Math.abs(delta) * 60 + (record ? 15 : 0)),
    at: last.date,
    chart: { kind: 'rate' },
  };
}

export interface BigTrade {
  id: string;
  asin: string;
  price: number;
  shares: number;
  volume: number;
  date: number;
  buyer?: string;
  seller?: string;
}

type LogLike = {
  id?: string;
  securityIdentifier?: string;
  price?: number;
  numberOfShares?: number;
  volume?: number;
  date?: number;
  buyerSecuritiesAccountName?: string;
  sellerSecuritiesAccountName?: string;
};

/**
 * The largest share trades since `since`, biggest first (shares only: bonds carry most of the money –
 * tender bonds – and transfers at ≤ 0,01 € never count).
 */
export function bigTrades(trades: LogLike[] | undefined, since: number, n = 3, min = 1e8): BigTrade[] {
  return (trades ?? [])
    .flatMap((t) => {
      const asin = t.securityIdentifier ?? '';
      const price = t.price ?? 0;
      const volume = t.volume ?? price * (t.numberOfShares ?? 0);
      if (!asin.startsWith('ST') || price <= 0.01 || (t.date ?? 0) < since || volume < min) return [];
      return [
        {
          id: t.id ?? `${asin}-${t.date}`,
          asin,
          price,
          shares: t.numberOfShares ?? 0,
          volume,
          date: t.date ?? 0,
          buyer: t.buyerSecuritiesAccountName?.trim() || undefined,
          seller: t.sellerSecuritiesAccountName?.trim() || undefined,
        },
      ];
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
}

/**
 * The page keeps the big trades it has seen: the live feed only holds the last few minutes. New ones
 * join, the ones older than `window` go, at most `max` stay (biggest first).
 */
export function keepTrades(prev: BigTrade[], fresh: BigTrade[], now: number, window = 30 * MIN, max = 12): BigTrade[] {
  const byId = new Map<string, BigTrade>();
  for (const t of [...prev, ...fresh]) if (t.date >= now - window) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => b.volume - a.volume).slice(0, max);
}

/** A big trade as a story: from 1 Mrd. € on it can make the front page (weight up to 40). */
export function tradeStory(t: BigTrade, name: string, now: number): Story {
  const who = t.buyer ? `${t.buyer} kauft` : 'Großauftrag in';
  return {
    id: `trade-${t.id}`,
    kind: 'trade',
    kicker: 'Großer Trade',
    title: `${who} ${name} für ${shortMoney(t.volume)}`,
    dek: `${t.shares.toLocaleString('de-DE')} Aktien zu je ${priceText(t.price)} in einem Zug – um ${clock(t.date)}${NBSP}Uhr`,
    lede: `Um ${clock(t.date)}${NBSP}Uhr wechselten ${t.shares.toLocaleString('de-DE')} Aktien von ${name} den Besitzer${t.seller ? `, verkauft hat ${t.seller}` : ''}. Es ist einer der größten Aktien-Trades der letzten Minuten.`,
    byline: 'Aus dem Handelsbuch gesetzt',
    href: `/wertpapier/${t.asin}`,
    weight: Math.max(0, Math.min(40, (Math.log10(t.volume) - 8.5) * 16)) - Math.min(20, Math.max(0, now - t.date) / MIN),
    at: t.date,
    chart: { kind: 'price', asin: t.asin, name },
  };
}

/* ------------------------------------------------------------------ the front page */

/** Stories by weight, heaviest first; the same security appears once (the heavier story keeps it). */
export function rank(stories: Story[]): Story[] {
  const seen = new Set<string>();
  return stories
    .map((s) => ({ ...s, title: tidy(s.title), dek: tidy(s.dek), lede: tidy(s.lede) }))
    .sort((a, b) => b.weight - a.weight || b.at - a.at)
    .filter((s) => {
      const key = s.chart?.kind === 'price' && s.kind !== 'artikel' ? s.chart.asin : s.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * The lead: the heaviest story – but the one leading stays unless a new one weighs `margin` more
 * (a front page that swaps its lead at every poll is no paper).
 */
export function pickLead(ranked: Story[], current: string | undefined, margin = 12): Story | undefined {
  const top = ranked[0];
  const kept = current ? ranked.find((s) => s.id === current) : undefined;
  if (!kept || !top) return top;
  return top.weight > kept.weight + margin ? top : kept;
}

export interface FrontPage {
  lead?: Story;
  /** the column stories under the lead: articles first (newest), then set stories */
  columns: Story[];
}

/**
 * Lead + `n` column stories: the newest article (the paper's own voice) and the heaviest story set from
 * the data take turns, so both kinds are on the page; set stories need a weight of 10.
 */
export function frontPage(ranked: Story[], leadId: string | undefined, n = 2): FrontPage {
  const lead = ranked.find((s) => s.id === leadId);
  const rest = ranked.filter((s) => s !== lead);
  const articles = rest.filter((s) => s.kind === 'artikel').sort((a, b) => b.at - a.at);
  const others = rest.filter((s) => s.kind !== 'artikel' && s.weight >= 10);
  const columns: Story[] = [];
  for (let i = 0; columns.length < n && (i < articles.length || i < others.length); i++) {
    if (articles[i]) columns.push(articles[i]);
    if (others[i] && columns.length < n) columns.push(others[i]);
  }
  return { lead, columns };
}

/* ------------------------------------------------------------------ Kurz notiert */

export interface Brief {
  id: string;
  /** time stamp in the margin: „14:31“, „morgen“ … */
  stamp: string;
  text: string;
  href: string;
  at: number;
}

/**
 * The short reports: big trades of the last minutes, upcoming mergers, dividends and capital measures,
 * the tender. Stories already on the page (`skip`) are left out. Newest trade first, then what is due next.
 */
export function briefs(input: {
  trades: { trade: BigTrade; name: string }[];
  events: Story[];
  rate?: Story;
  /** the market in figures (minimal stats), the last line when there is room */
  stats?: { numberOfTrades24h: number; tradeVolume24h: number; numberOfOnlineUsers: number };
  skip: ReadonlySet<string>;
  now: number;
  n?: number;
}): Brief[] {
  const { trades, events, rate, stats, skip, now, n = 6 } = input;
  const out: Brief[] = [];
  for (const { trade: t, name } of trades) {
    if (skip.has(`trade-${t.id}`)) continue;
    out.push({
      id: `trade-${t.id}`,
      stamp: clock(t.date),
      text: `${shortMoney(t.volume)} in einem Zug: ${t.shares.toLocaleString('de-DE')} ${name} zu ${priceText(t.price)}${t.buyer ? ` an ${t.buyer}` : ''}.`,
      href: `/wertpapier/${t.asin}`,
      at: t.date,
    });
  }
  const line = (st: Story) => ({
    id: st.id,
    stamp: st.kind === 'leitzins' ? dayWord(st.at, now) : whenShort(st.at, now),
    text:
      st.kind === 'kapital'
        ? `${st.title}: ${st.dek}.`
        : st.kind === 'leitzins'
          ? `${st.title}. ${st.dek}.`
          : st.kind !== 'tender' && st.at > now && st.at - now < 2 * DAY
          ? `${st.title} – ${clock(st.at)}${NBSP}Uhr.`
          : `${st.title}.`,
    href: st.href,
    at: st.at,
  });
  const upcoming = events.filter((st) => !skip.has(st.id)).sort((a, b) => a.at - b.at).map(line);
  const rateBrief = rate && !skip.has(rate.id) ? [line(rate)] : [];
  const market = stats
    ? [
        {
          id: 'stats',
          stamp: '24 Std.',
          text: `Markt in Zahlen: ${stats.numberOfTrades24h.toLocaleString('de-DE')} Trades, ${shortMoney(stats.tradeVolume24h)} Umsatz, ${stats.numberOfOnlineUsers.toLocaleString('de-DE')} Spieler online.`,
          href: '/markt',
          at: now,
        },
      ]
    : [];
  // two trades at most, so the calendar keeps its room; the figures only fill what is left
  return [...out.slice(0, 2), ...rateBrief, ...upcoming, ...market].slice(0, n);
}

/** „heute“, „gestern“, else the weekday „Mo.“ */
export function dayWord(ms: number, now: number): string {
  const d = new Date(ms).toDateString();
  if (d === new Date(now).toDateString()) return 'heute';
  if (d === new Date(now - DAY).toDateString()) return 'gestern';
  return `${WEEKDAYS[new Date(ms).getDay()].slice(0, 2)}.`;
}

/** Margin stamp: past → „14:31“ (older days „Di.“), later today → „heute“, tomorrow → „morgen“, later → „Fr.“ */
export function whenShort(ms: number, now: number): string {
  const d = new Date(ms);
  const today = d.toDateString() === new Date(now).toDateString();
  if (ms <= now) return today ? clock(ms) : `${WEEKDAYS[d.getDay()].slice(0, 2)}.`;
  if (today) return 'heute';
  if (d.toDateString() === new Date(now + DAY).toDateString()) return 'morgen';
  return `${WEEKDAYS[d.getDay()].slice(0, 2)}.`;
}

/* ------------------------------------------------------------------ breaking news */

/**
 * A story that is breaking news: new since the page was opened (not in `seen`), happened within the last
 * ten minutes, and weighty enough (an article, or ≥ 25). The heaviest one wins.
 */
export function breaking(ranked: Story[], seen: ReadonlySet<string>, now: number): Story | undefined {
  return ranked.find((s) => !seen.has(s.id) && s.at <= now + MIN && now - s.at < 10 * MIN && (s.kind === 'artikel' || s.weight >= 25));
}

/* ------------------------------------------------------------------ letters (unread chats) */

type ChatLike = {
  id: string;
  chatName?: string | null;
  groupChat?: boolean;
  publicChat?: boolean;
  numOfUnreadMessages?: number;
  lastMessage?: { content?: string | null; dateSent?: number | null; sender?: { username?: string } | null } | null;
};

export interface Letter {
  chatId: string;
  from: string;
  text: string;
  unread: number;
}

/** The newest unread message of a direct or group chat (lobbies never count). */
export function latestLetter(chats: ChatLike[] | undefined): Letter | undefined {
  const c = (chats ?? [])
    .filter((x) => !x.publicChat && (x.numOfUnreadMessages ?? 0) > 0)
    .sort((a, b) => (b.lastMessage?.dateSent ?? 0) - (a.lastMessage?.dateSent ?? 0))[0];
  if (!c) return undefined;
  const who = c.lastMessage?.sender?.username ?? 'Jemand';
  return {
    chatId: c.id,
    from: c.groupChat && c.chatName ? `${who} in ${c.chatName}` : who,
    text: cut((c.lastMessage?.content ?? '').replace(/\s+/g, ' ').trim(), 70),
    unread: c.numOfUnreadMessages ?? 0,
  };
}

/* ------------------------------------------------------------------ the lead's price line */

type TradePoint = { securityIdentifier?: string; price?: number; date?: number; id?: string };

/**
 * The line of a price lead: the close as the first point, then every trade since (the loaded log and the
 * live feed, each trade once, transfers at ≤ 0,01 € left out), oldest first.
 */
export function sinceClose(close: Close, logged: TradePoint[] | undefined, live: TradePoint[] | undefined, asin: string): Close[] {
  const byKey = new Map<string, Close>();
  for (const t of [...(logged ?? []), ...(live ?? [])]) {
    if (t.securityIdentifier && t.securityIdentifier !== asin) continue;
    if (!t.price || t.price <= 0.01 || !t.date || t.date < close.date) continue;
    // a trade beyond ×10 / ÷10 of the close is a transfer at a token price, not a move
    if (t.price > close.value * 10 || t.price < close.value / 10) continue;
    byKey.set(t.id ?? `${t.date}-${t.price}`, { date: t.date, value: t.price });
  }
  return [close, ...[...byKey.values()].sort((a, b) => a.date - b.date)];
}
