// Start page „Bühne“: which scene deserves the stage right now, and the geometry of the stage's chart.
// Pure functions, tested in derive.test.ts.
import type { SecurityOrderLogEntryView } from '../../api/types';
import { short } from '../../lib/format';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const NBSP = String.fromCharCode(0xa0);

/** How long one scene stays on stage before the next one comes. */
export const SCENE_MS = 12_000;
/** At most this many scenes in the programme. */
export const MAX_SCENES = 8;
/** Trades at or below this price are transfers, never a market price. */
const TRANSFER_PRICE = 0.01;
/** Moves beyond this are spot-price trades or new listings, not news (the screener uses the same bound). */
const MAX_MOVE = 900;
/** A move needs this much 24 h turnover (€) to be a scene – otherwise one trade of 3 € makes +400 %. */
export const MIN_MOVER_VOLUME = 10_000;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ---------------------------------------------------------------- inputs */

/** A row of the movers or most-traded lists, reduced to what the stage needs. */
export interface MarketLine {
  asin: string;
  name: string;
  type: string;
  price?: number;
  /** % against the last daily close (server) */
  change?: number;
  /** € traded in 24 h */
  volume?: number;
  /** what `change` is measured against: the daily close we draw, the server's reference, or not known yet */
  basis?: 'close' | 'server' | 'pending';
}

export interface NewsInput {
  id: string;
  title: string;
  text: string;
  author?: string;
  company?: { name: string; asin?: string };
  date: number;
  likes: number;
  comments: number;
  tags?: string[];
}

export interface EventInput {
  id: string;
  kind: 'dividend' | 'merger' | 'increase' | 'reduction';
  company: string;
  asin?: string;
  /** when it happens (dividend, merger) or the subscription ends (capital measures) */
  date: number;
  amount?: number;
  shares?: number;
  price?: number;
  acquirer?: string;
}

export interface PositionInput {
  asin: string;
  shares: number;
  value: number;
}

/* ---------------------------------------------------------------- scenes */

interface SceneBase {
  id: string;
  /** relevance 0 … 1 – the programme runs from the highest down */
  score: number;
  /** always in the programme (the newest articles) */
  pinned?: boolean;
}

export type Scene =
  | (SceneBase & { kind: 'mover'; line: MarketLine & { change: number; volume: number }; mine?: PositionInput; rank: number })
  | (SceneBase & { kind: 'trade'; trade: BigTrade })
  | (SceneBase & { kind: 'news'; news: NewsInput })
  | (SceneBase & { kind: 'tender'; asin: string; endDate: number; rate?: number })
  | (SceneBase & { kind: 'event'; event: EventInput });

export type SceneKind = Scene['kind'];

export interface BigTrade {
  id: string;
  asin: string;
  price: number;
  shares: number;
  volume: number;
  date: number;
  buyer?: string;
  seller?: string;
  /** securities account ids, to look up names (private accounts have none in the log) */
  buyerAccount?: string;
  sellerAccount?: string;
}

/** Weight of a € turnover: 10 Tsd. € → 0, 1 Bio. € → 1 (log). */
export const volumeWeight = (v: number) => clamp01((Math.log10(Math.max(v, 1)) - 4) / 8);

/** Weight of a price move: 1 % → 0,15, 10 % → 0,52, 100 % → 1 (log). */
export const moveWeight = (pct: number) => clamp01(Math.log1p(Math.abs(pct)) / Math.log1p(100));

/** Weight of an age with a half-life: 1 now, ½ after `half`. */
export const freshness = (age: number, half: number) => Math.pow(0.5, Math.max(0, age) / half);

/** Weight of a deadline: 1 when it is due now, 0 from `horizon` on; nothing after it passed. */
export const urgency = (left: number, horizon: number) => (left <= 0 ? 0 : clamp01(1 - left / horizon));

/**
 * Moves with real turnover, strongest first (move × turnover). Moves beyond ±900 % (spot prices,
 * brand-new listings) and moves on less than 10 Tsd. € turnover are left out.
 */
export function moverScenes(lines: MarketLine[], positions: PositionInput[] = []): Scene[] {
  const mine = new Map(positions.map((p) => [p.asin, p]));
  const seen = new Set<string>();
  const out: Scene[] = [];
  for (const l of lines) {
    if (seen.has(l.asin)) continue;
    const change = l.change;
    const volume = l.volume ?? 0;
    if (change == null || !Number.isFinite(change) || change === 0 || Math.abs(change) > MAX_MOVE) continue;
    if (volume < MIN_MOVER_VOLUME) continue;
    seen.add(l.asin);
    const own = mine.get(l.asin);
    // A move of your own position matters more to you than the same move elsewhere.
    const base = moveWeight(change) * (0.35 + 0.65 * volumeWeight(volume));
    const score = clamp01(0.15 + 0.7 * base * (own ? 1.35 : 1));
    out.push({ id: `mover-${l.asin}`, kind: 'mover', line: { ...l, change, volume }, mine: own, score, rank: 0 });
  }
  out.sort((a, b) => b.score - a.score);
  return out.map((s, i) => (s.kind === 'mover' ? { ...s, rank: i } : s));
}

/**
 * The largest share trade since `since` – only stocks: bonds carry ~98 % of the money (tender bonds) and
 * AlphaCoins trade billions every minute; transfers at ≤ 0,01 € never count.
 */
export function biggestTrade(trades: SecurityOrderLogEntryView[] | undefined, since: number): BigTrade | undefined {
  let best: BigTrade | undefined;
  for (const t of trades ?? []) {
    const asin = t.securityIdentifier ?? '';
    const price = t.price ?? 0;
    if (!asin.startsWith('ST') || price <= TRANSFER_PRICE || (t.date ?? 0) < since) continue;
    const volume = t.volume ?? price * (t.numberOfShares ?? 0);
    if (!best || volume > best.volume)
      best = {
        id: t.id ?? `${asin}-${t.date}`,
        asin,
        price,
        shares: t.numberOfShares ?? 0,
        volume,
        date: t.date ?? 0,
        buyer: t.buyerSecuritiesAccountName || undefined,
        seller: t.sellerSecuritiesAccountName || undefined,
        buyerAccount: t.buyerSecuritiesAccount,
        sellerAccount: t.sellerSecuritiesAccount,
      };
  }
  return best;
}

export function tradeScene(trade: BigTrade | undefined, now: number): Scene | undefined {
  if (!trade || trade.volume < 1_000_000) return undefined;
  const score = clamp01(0.1 + 0.6 * clamp01((Math.log10(trade.volume) - 6) / 6) * freshness(now - trade.date, 10 * MIN));
  return { id: `trade-${trade.id}`, kind: 'trade', trade, score };
}

/** An article counts as breaking news this long – it jumps the queue of the running programme. */
export const FRESH_NEWS_MS = 30 * MIN;

/**
 * The newest articles, always in the programme (pinned): relevance from freshness (half-life 3 h) and a
 * little from reactions; breaking news (< 30 min) on top of everything else.
 */
export function newsScenes(news: NewsInput[], now: number, max = 3): Scene[] {
  return [...news]
    .sort((a, b) => b.date - a.date)
    .slice(0, max)
    .map((n): Scene => {
      const talk = Math.min(0.1, (n.likes + 2 * n.comments) * 0.015);
      const breaking = now - n.date < FRESH_NEWS_MS ? 0.3 : 0;
      return {
        id: `news-${n.id}`,
        kind: 'news',
        news: n,
        pinned: true,
        score: clamp01(0.1 + 0.55 * freshness(now - n.date, 3 * HOUR) + talk + breaking),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Breaking news that the running programme does not hold yet – it goes on right after the current scene. */
export function breakingNews(ranked: Scene[], held: Scene[], now: number): Scene | undefined {
  const have = new Set(held.map((s) => s.id));
  return ranked.find((s) => s.kind === 'news' && now - s.news.date < FRESH_NEWS_MS && !have.has(s.id));
}

/**
 * A sentence from further down the article for the stage – the part the excerpt does not show: the longest
 * sentence of 40–200 characters that starts after `skip` characters, else the first such sentence.
 */
export function pullQuote(text: string, skip = 220): string | undefined {
  const clean = text.replace(/\s+/g, ' ').trim();
  const out: { s: string; at: number }[] = [];
  const re = /[^.!?]+[.!?]+(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const t = m[0].trim();
    if (t.length >= 40 && t.length <= 200) out.push({ s: t, at: m.index });
  }
  const later = out.filter((x) => x.at >= skip);
  if (later.length) return later.reduce((a, b) => (b.s.length > a.s.length ? b : a)).s;
  return out[0]?.s;
}

/** Name of a securities account for people: firms without „(ASIN) | CEO“, ETF funds as such. */
export function accountLabel(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (/^ef-sec-acc-/.test(name)) return 'ETF-Fonds';
  return name.replace(/\s*\([A-Z0-9]{10}\)\s*\|.*$/, '').trim() || undefined;
}

/** The interest tender: the closer the end of bidding, the bigger (horizon 3 h). */
export function tenderScene(tender: { asin: string; endDate: number } | undefined, rate: number | undefined, now: number): Scene | undefined {
  if (!tender || tender.endDate <= now) return undefined;
  return {
    id: `tender-${tender.asin}`,
    kind: 'tender',
    asin: tender.asin,
    endDate: tender.endDate,
    rate,
    score: clamp01(0.12 + 0.7 * urgency(tender.endDate - now, 3 * HOUR)),
  };
}

/** Dividends, mergers and capital measures due within two days, soonest first. */
export function eventScenes(events: EventInput[], now: number, max = 2): Scene[] {
  return events
    .filter((e) => e.date > now && e.date - now < 2 * DAY)
    .map((e): Scene => ({ id: `event-${e.kind}-${e.id}`, kind: 'event', event: e, score: clamp01(0.15 + 0.5 * urgency(e.date - now, DAY)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/**
 * The programme: pinned scenes (the newest articles) first, then every other kind that has a candidate
 * once (its best one), then the rest by relevance – at most `perKind` of a kind (a stage of five movers
 * would be a ticker, not a programme) and `max` scenes in all, running from the most relevant down.
 */
export function programme(candidates: Scene[], max = MAX_SCENES, perKind = 3): Scene[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const picked = new Set<Scene>();
  const count = new Map<SceneKind, number>();
  const take = (s: Scene) => {
    picked.add(s);
    count.set(s.kind, (count.get(s.kind) ?? 0) + 1);
  };
  for (const s of sorted) if (s.pinned && picked.size < max) take(s);
  for (const s of sorted) if (!picked.has(s) && !count.has(s.kind) && picked.size < max) take(s);
  for (const s of sorted) if (!picked.has(s) && (count.get(s.kind) ?? 0) < perKind && picked.size < max) take(s);
  return sorted.filter((s) => picked.has(s));
}

/**
 * Where the programme stands after the list changed: the running scene keeps playing if it is still in the
 * list; otherwise the one that took its place.
 */
export function followScene(list: Scene[], activeId: string | undefined, index: number): number {
  if (!list.length) return 0;
  const i = activeId ? list.findIndex((s) => s.id === activeId) : -1;
  return i >= 0 ? i : Math.min(index, list.length - 1);
}

/* ---------------------------------------------------------------- words */

const pct = (n: number, d: number) => `${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })}${NBSP}%`;
const money = (n: number) => `${short(n)}${NBSP}€`;
export const priceText = (n: number) =>
  `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 })}${NBSP}€`;
const count = (n: number) => (n >= 1e6 ? short(n) : n.toLocaleString('de-DE'));

/** „gerade eben“, „vor 12 Min.“, „vor 3 Std.“ */
export function ago(ms: number, now: number): string {
  const d = Math.max(0, now - ms);
  if (d < MIN) return 'gerade eben';
  if (d < HOUR) return `vor ${Math.round(d / MIN)}${NBSP}Min.`;
  if (d < DAY) return `vor ${Math.round(d / HOUR)}${NBSP}Std.`;
  const days = Math.round(d / DAY);
  return days === 1 ? 'vor einem Tag' : `vor ${days}${NBSP}Tagen`;
}

/**
 * Hourly rate snapshots without blips: a value that differs from both neighbours while they agree (the
 * provisional rate a few minutes before the tender closes, caught by one snapshot).
 */
export function withoutBlips<T extends { price: number }>(points: T[]): T[] {
  return points.filter((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    return !(prev && next && prev.price === next.price && p.price !== prev.price);
  });
}

/** Countdown for the big figure: „42 Min.“, „3 Std. 12 Min.“, „1 T 4 Std.“ */
export function countdown(left: number): string {
  const min = Math.max(0, Math.ceil(left / MIN));
  if (min < 60) return `${min}${NBSP}Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}${NBSP}Std. ${m}${NBSP}Min.` : `${h}${NBSP}Std.`;
  const d = Math.floor(h / 24);
  return `${d}${NBSP}T ${h % 24}${NBSP}Std.`;
}

/** One unit for narrow places: „42 Min.“, „5 Std.“, „2 T“ */
export function countdownShort(left: number): string {
  const min = Math.max(0, Math.ceil(left / MIN));
  if (min < 60) return `${min}${NBSP}Min.`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}${NBSP}Std.` : `${Math.floor(h / 24)}${NBSP}T`;
}

/** „steigt“, „springt“, „fällt“, „bricht ein“ – by the size of the move. */
export function moveVerb(c: number): string {
  const a = Math.abs(c);
  if (c > 0) return a >= 30 ? 'springt' : a >= 10 ? 'klettert' : 'steigt';
  return a >= 15 ? 'bricht ein' : a >= 8 ? 'rutscht ab' : 'fällt';
}

const EVENT_LABEL: Record<EventInput['kind'], string> = {
  dividend: 'Dividende',
  merger: 'Fusion',
  increase: 'Kapitalerhöhung',
  reduction: 'Kapitalherabsetzung',
};

/** The rubric over the title. */
export function eyebrowOf(s: Scene): string {
  switch (s.kind) {
    case 'mover':
      if (s.mine) return 'Deine Position bewegt sich';
      return s.rank === 0 ? 'Stärkste Bewegung mit Umsatz' : 'Bewegung mit Umsatz';
    case 'trade':
      return 'Größter Trade der letzten Minuten';
    case 'news':
      return 'Frisch in der Zeitung';
    case 'tender':
      return 'Zinstender';
    case 'event':
      return EVENT_LABEL[s.event.kind];
  }
}

/** Short label for the programme strip. */
export function kindLabel(s: Scene): string {
  switch (s.kind) {
    case 'mover':
      return s.mine ? 'Dein Papier' : 'Bewegung';
    case 'trade':
      return 'Großer Trade';
    case 'news':
      return 'Zeitung';
    case 'tender':
      return 'Zinstender';
    case 'event':
      return EVENT_LABEL[s.event.kind];
  }
}

/** Why the scene is on stage – one sentence. */
export function reasonOf(s: Scene, now: number): string {
  switch (s.kind) {
    case 'mover': {
      const { change, volume } = s.line;
      const d = Math.abs(change) < 10 ? 1 : 0;
      const [verb, particle] = moveVerb(change).split(' ');
      const since = s.line.basis === 'server' ? 'zum Vortag' : 'seit dem letzten Tagesschluss';
      const head = `${capital(verb)} ${since} um ${pct(change, d)}${particle ? ` ${particle}` : ''}`;
      const why = s.mine
        ? ` – du hältst ${count(s.mine.shares)} Stück im Wert von ${money(s.mine.value)}.`
        : s.rank === 0
          ? ` – bei ${money(volume)} Umsatz in 24${NBSP}Std. die stärkste Bewegung mit echtem Handel.`
          : ` – bei ${money(volume)} Umsatz in 24${NBSP}Std.`;
      return head + why;
    }
    case 'trade': {
      const t = s.trade;
      const when = ago(t.date, now);
      return `${count(t.shares)} Stück zu ${priceText(t.price)} in einem Zug – ${when}${when.endsWith('.') ? '' : '.'}`;
    }
    case 'news': {
      const text = s.news.text.replace(/\s+/g, ' ').trim();
      return text.length > 220 ? `${text.slice(0, 219).replace(/\s+\S*$/, '')} …` : text;
    }
    case 'tender': {
      const rate = s.rate != null ? ` Leitzins zurzeit ${pct(s.rate, 2)}.` : '';
      return `Banken bieten zwischen 98 und 102${NBSP}% – der Schluss des Tenders setzt den Leitzins für alle.${rate}`;
    }
    case 'event': {
      const e = s.event;
      const when = atText(e.date, now);
      switch (e.kind) {
        case 'dividend':
          return `${e.company} schüttet ${when} aus${e.amount ? ` – bis zu ${money(e.amount)} laut Beschluss` : ''}.`;
        case 'merger':
          return `${e.company} geht ${when} in ${e.acquirer ?? 'einem anderen Unternehmen'} auf.`;
        case 'increase':
          return `${e.company} gibt ${e.shares ? `${count(e.shares)} neue Aktien` : 'neue Aktien'}${e.price ? ` zu ${priceText(e.price)}` : ''} aus – Zeichnung endet ${when}.`;
        case 'reduction':
          return `${e.company} zieht ${e.shares ? `${count(e.shares)} Aktien` : 'Aktien'} ein – ${when}.`;
      }
    }
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** „heute um 20:59 Uhr“, „morgen um 09:12 Uhr“, „am 3.10. um 14:00 Uhr“ */
export function atText(ms: number, now: number): string {
  const d = new Date(ms);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}${NBSP}Uhr`;
  const day = (x: number) => new Date(x).toDateString();
  if (day(ms) === day(now)) return `heute um ${time}`;
  if (day(ms) === day(now + DAY)) return `morgen um ${time}`;
  return `am ${d.getDate()}.${d.getMonth() + 1}. um ${time}`;
}

/** „in 12 Min.“, „in 3 Std.“, „morgen“ */
export function aheadText(ms: number, now: number): string {
  const d = ms - now;
  if (d <= 0) return 'jetzt';
  if (d < HOUR) return `in ${Math.max(1, Math.round(d / MIN))}${NBSP}Min.`;
  if (d < DAY) return `in ${Math.round(d / HOUR)}${NBSP}Std.`;
  const days = Math.round(d / DAY);
  return days === 1 ? 'morgen' : `in ${days}${NBSP}Tagen`;
}

/** The security the stage draws behind a scene, if any. */
export function stageAsin(s: Scene): string | undefined {
  switch (s.kind) {
    case 'mover':
      return s.line.asin;
    case 'trade':
      return s.trade.asin;
    case 'news':
      return s.news.company?.asin;
    case 'event':
      return s.event.asin;
    case 'tender':
      return undefined;
  }
}

/* ---------------------------------------------------------------- stage chart */

export interface StagePoint {
  id: string;
  date: number;
  price: number;
  volume: number;
  /** the last daily close in front of the trades – drawn as a marker, joined by a dashed line */
  close?: boolean;
}

const dayOf = (d: { date?: string | number | null }) => (typeof d.date === 'number' ? d.date : Date.parse(String(d.date)));

/** The latest daily close (the game closes once a day, ~01:00) at or before `now`. */
export function lastClose(history: { date?: string | number | null; closePrice?: number | null }[] | undefined, now: number): StagePoint | undefined {
  let best: StagePoint | undefined;
  for (const h of history ?? []) {
    const date = dayOf(h);
    const price = h.closePrice ?? 0;
    if (!(price > 0) || !Number.isFinite(date) || date > now) continue;
    if (!best || date > best.date) best = { id: `close-${date}`, date, price, volume: 0, close: true };
  }
  return best;
}

/** A mover measured against the given daily close (the one its chart draws) instead of the server's reference. */
export function sinceClose(s: Scene, close: StagePoint | undefined, settled = true): Scene {
  if (s.kind !== 'mover') return s;
  if (!settled) return { ...s, line: { ...s.line, basis: 'pending' } };
  if (!close || !(s.line.price && s.line.price > 0)) return { ...s, line: { ...s.line, basis: 'server' } };
  return { ...s, line: { ...s.line, change: (s.line.price / close.price - 1) * 100, basis: 'close' } };
}

/**
 * Article HTML without its lead-in: a first paragraph that is only bold text (or a heading) repeats the
 * title in other words – the excerpt starts after it.
 */
export function stripLead(html: string | null | undefined): string {
  const s = html ?? '';
  const lead = /^\s*(?:<(p|div)[^>]*>\s*<(strong|b)>[^<]*<\/\2>\s*<\/\1>|<h[1-6][^>]*>[^<]*<\/h[1-6]>)/i;
  const rest = s.replace(lead, '');
  return rest.trim() ? rest : s;
}

/**
 * The trades since the last close, with the close in front – so a move since yesterday is in the line,
 * not only in the figure. Without a close (or none before the trades) the trades alone.
 */
export function withClose(points: StagePoint[], close: StagePoint | undefined): StagePoint[] {
  if (!close) return points;
  const after = points.filter((p) => p.date > close.date);
  return after.length ? [close, ...after] : points;
}

/** Rolling median over `window` values, centred and narrower at the ends (first and last stay exact). */
export function rollingMedian(values: number[], window = 9): number[] {
  const n = values.length;
  return values.map((_, i) => {
    const half = Math.min(Math.floor(window / 2), i, n - 1 - i);
    const part = values.slice(i - half, i + half + 1).sort((a, b) => a - b);
    return part[Math.floor(part.length / 2)];
  });
}

/**
 * The line through the trades: a rolling median of 9 trades, which then only moves when it is more than
 * 1 % (or 2,5 ticks of 0,01 €) away from where the line stands – bid/ask ping-pong (2,10 – 2,12 – 2,10 …)
 * stays one calm level, real moves go through. The dots keep the real prices.
 */
export function calmLine(values: number[]): number[] {
  const med = rollingMedian(values);
  let level = med[0];
  return med.map((v) => {
    const th = Math.max(0.01, 0.025 / Math.max(v, 1e-9));
    if (Math.abs(v - level) / level > th) level = v;
    return level;
  });
}

/**
 * Trades of one security for the stage, oldest first: transfers out, single spikes (×10 against both
 * neighbours) out, and at most the last `span` – or the last `min` trades when that is too few.
 */
export function stagePoints(trades: SecurityOrderLogEntryView[] | undefined, now: number, span = DAY, min = 30): StagePoint[] {
  // The trades since the close and the polled newest ones overlap – each trade once.
  const ids = new Set<string>();
  const all = (trades ?? [])
    .filter((t) => (t.price ?? 0) > TRANSFER_PRICE && t.date != null)
    .map((t) => ({
      id: t.id ?? `${t.securityIdentifier}-${t.date}`,
      date: t.date as number,
      price: t.price as number,
      volume: t.volume ?? (t.price ?? 0) * (t.numberOfShares ?? 0),
    }))
    .filter((p) => !ids.has(p.id) && Boolean(ids.add(p.id)))
    .sort((a, b) => a.date - b.date);
  const off = (a: number, b: number) => a / b > 10 || b / a > 10;
  const clean = all.filter((p, i) => {
    const prev = all[i - 1];
    const next = all[i + 1];
    return !(prev && next && off(p.price, prev.price) && off(p.price, next.price));
  });
  // Runs of spot-price trades (several 0,02 € in a row) survive the neighbour test – drop anything ×10 off the median.
  const mid = [...clean].map((p) => p.price).sort((a, b) => a - b)[Math.floor(clean.length / 2)];
  const sane = mid ? clean.filter((p) => p.price * 10 >= mid && p.price <= mid * 10) : clean;
  const recent = sane.filter((p) => p.date >= now - span);
  return recent.length >= min ? recent : sane.slice(-min);
}

export interface Box {
  width: number;
  height: number;
  /** inner padding: top, right, bottom, left */
  pad: [number, number, number, number];
}

export interface Geometry {
  /** SVG path of the line (calmed, see calmLine) */
  line: string;
  /** dashed join from the last close to the first loaded trade */
  gap?: string;
  /** true when the gap between close and first trade is gathered to a fixed share of the width */
  gathered?: boolean;
  /** the close marker */
  close?: { x: number; y: number; price: number };
  dots: { id: string; x: number; y: number; r: number }[];
  last?: { x: number; y: number; price: number };
  lo: number;
  hi: number;
  /** highest and lowest traded price (without the air) */
  top: number;
  bottom: number;
  /** y of a price – for reference lines */
  yOf: (price: number) => number;
}

/** Radius of a trade dot: area grows with the log of its € volume, `min` … `max` px. */
export function dotRadius(volume: number, min = 2, max = 7): number {
  const t = clamp01(Math.log10(Math.max(1, volume)) / 10);
  return min + (max - min) * Math.sqrt(t);
}

/**
 * Line and dots in the box. x is time (first to last trade), y is price with 10 % air; a flat line sits in
 * the middle (±1 %).
 */
type Dot = { id: string; x: number; y: number; r: number };

/**
 * At most `max` dots: thousands of trades on 800 px are one smear. Per column of `px` pixels only the
 * largest trade (and every one in `keep`, e.g. the big trade of the scene, and the last one) stays.
 */
export function thinDots(dots: Dot[], keep: string[] = [], max = 600, px = 3): Dot[] {
  if (dots.length <= max) return dots;
  const must = new Set(keep);
  const last = dots[dots.length - 1];
  const best = new Map<number, Dot>();
  for (const d of dots) {
    const col = Math.floor(d.x / px);
    const b = best.get(col);
    if (!b || d.r > b.r) best.set(col, d);
  }
  const chosen = new Set(best.values());
  return dots.filter((d) => chosen.has(d) || must.has(d.id) || d === last);
}

/** Share of the width for the gap between the daily close and the first loaded trade. */
export const GAP_SHARE = 0.28;

export function stageGeometry(points: StagePoint[], box: Box, ref?: number, keep: string[] = []): Geometry {
  const [pt, pr, pb, pl] = box.pad;
  const w = Math.max(1, box.width - pl - pr);
  const h = Math.max(1, box.height - pt - pb);
  const traded = points.map((p) => p.price);
  const prices = ref != null && ref > 0 ? [...traded, ref] : traded;
  let lo = prices.length ? Math.min(...prices) : 0;
  let hi = prices.length ? Math.max(...prices) : 1;
  if (hi - lo < Math.abs(hi) * 0.02) {
    const mid = (hi + lo) / 2 || 1;
    lo = mid * 0.99;
    hi = mid * 1.01;
  }
  const air = (hi - lo) * 0.1;
  lo -= air;
  hi += air;
  // With a close in front, the hours between it and the first loaded trade get a fixed share of the width
  // (GAP_SHARE) – otherwise a day's gap would squeeze the trades into a sliver at the right.
  // Only a real gap (over 15 min and a tenth of the trades' span) is gathered; otherwise time runs linear from the close.
  const withGap =
    !!points[0]?.close &&
    points.length > 2 &&
    points[1].date - points[0].date > Math.max(15 * MIN, 0.1 * (points[points.length - 1].date - points[1].date));
  const hasClose = withGap;
  const start = hasClose ? 1 : 0;
  const t0 = points[start]?.date ?? 0;
  const t1 = points[points.length - 1]?.date ?? t0 + 1;
  const dt = Math.max(1, t1 - t0);
  const x0 = hasClose ? pl + w * GAP_SHARE : pl;
  const wt = hasClose ? w * (1 - GAP_SHARE) : w;
  const xOf = (d: number) => (hasClose && d < t0 ? pl : x0 + (points.length - start > 1 ? ((d - t0) / dt) * wt : wt));
  const yOf = (p: number) => pt + (1 - (p - lo) / (hi - lo)) * h;
  const r = (n: number) => Math.round(n * 10) / 10;
  const closePoint = points[0]?.close ? points[0] : undefined;
  const trades = closePoint ? points.slice(1) : points;
  const dots = trades.map((p) => ({ id: p.id, x: r(xOf(p.date)), y: r(yOf(p.price)), r: r(dotRadius(p.volume)) }));
  // A step line over the median: a price holds until the next trade, like a ticker board.
  const median = calmLine(trades.map((p) => p.price));
  let line = '';
  let lastY = NaN;
  dots.forEach((d, i) => {
    const y = r(yOf(median[i]));
    if (i === 0) line = `M${d.x},${y}`;
    else if (y !== lastY) line += `H${d.x}V${y}`;
    lastY = y;
  });
  if (dots.length > 1 && !line.endsWith(`H${dots[dots.length - 1].x}V${lastY}`)) line += `H${dots[dots.length - 1].x}`;
  const close = closePoint ? { x: r(xOf(closePoint.date)), y: r(yOf(closePoint.price)), price: closePoint.price } : undefined;
  const gap = close && dots[0] ? `M${close.x},${close.y}L${dots[0].x},${r(yOf(median[0]))}` : undefined;
  const gathered = withGap;
  const lastDot = dots[dots.length - 1];
  const lastPoint = trades[trades.length - 1];
  return {
    line,
    gap,
    gathered,
    close,
    dots: thinDots(dots, keep),
    last: lastDot && lastPoint ? { x: lastDot.x, y: lastDot.y, price: lastPoint.price } : undefined,
    lo,
    hi,
    top: traded.length ? Math.max(...traded) : hi,
    bottom: traded.length ? Math.min(...traded) : lo,
    yOf,
  };
}

/**
 * The reference price (last close) only when it sits near the trades: a move that happened before the drawn
 * trades would squeeze them into a flat line at the edge. Near = within the traded range once more on
 * either side (at least ±5 % of the price).
 */
export function usableRef(points: StagePoint[], ref: number | undefined): number | undefined {
  if (ref == null || !(ref > 0) || !points.length) return undefined;
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const room = Math.max(hi - lo, hi * 0.05);
  return ref >= lo - room && ref <= hi + room ? ref : undefined;
}

/** Trades per bucket over the last `window`, oldest first – the market's pace behind scenes without a security. */
export function paceBars(trades: SecurityOrderLogEntryView[] | undefined, now: number, window = 30 * MIN, bucket = MIN): number[] {
  const n = Math.round(window / bucket);
  const end = Math.max(now, ...(trades ?? []).map((t) => t.date ?? 0));
  const out = Array.from({ length: n }, () => 0);
  for (const t of trades ?? []) {
    if ((t.price ?? 0) <= TRANSFER_PRICE || t.date == null) continue;
    const i = n - 1 - Math.floor((end - t.date) / bucket);
    if (i >= 0 && i < n) out[i] += 1;
  }
  return out;
}
