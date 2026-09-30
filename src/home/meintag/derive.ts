// „Mein Tag“ – pure logic: the day sentence, the bubbles of the depot and their layout, the to-do list.
import { PERCENT_QUOTED } from '../../security/charts';

/* ---------------------------------------------------------------- holdings */

/** The fields of a portfolio position this page uses (GET /api/v2/my/portfolio, /api/portfolios/{id}). */
export interface PositionLike {
  securityIdentifier?: string;
  numberOfShares: number;
  averageBuyingPrice?: number;
  volume: number;
  type?: string;
  currentBidPrice?: number;
  lastPrice?: { value: number; date?: number } | number | null;
  currentAskPrice?: number;
  listing: { securityIdentifier?: string; name: string; type?: string; endDate?: number | null };
}

export interface AccountPortfolio {
  /** „Privat“ or the company's name */
  label: string;
  cash: number;
  positions: PositionLike[];
}

/** One security over all own accounts. */
export interface Holding {
  asin: string;
  name: string;
  type: string;
  value: number;
  shares: number;
  /** value-weighted cost basis per share (0 = none: mined, issued, gifted) */
  avg: number;
  /** bid, else last price */
  mark?: number;
  /** maturity (bonds, repos) */
  endDate?: number;
  /** best ask (what one more share costs) */
  ask?: number;
  /** time of the last trade in this security */
  lastDate?: number;
  accounts: string[];
}

const lastOf = (p: PositionLike) => (typeof p.lastPrice === 'number' ? p.lastPrice : p.lastPrice?.value);

/** Positions of all accounts merged by ASIN, biggest value first. */
export function mergeHoldings(accounts: AccountPortfolio[]): Holding[] {
  const by = new Map<string, Holding & { costShares: number }>();
  for (const acc of accounts) {
    for (const p of acc.positions) {
      const asin = p.listing.securityIdentifier ?? p.securityIdentifier;
      if (!asin || !(p.numberOfShares > 0)) continue;
      const avg = Number(p.averageBuyingPrice) || 0;
      const h = by.get(asin) ?? {
        asin,
        name: p.listing.name,
        type: p.type ?? p.listing.type ?? 'OTHER',
        value: 0,
        shares: 0,
        avg: 0,
        costShares: 0,
        mark: p.currentBidPrice || lastOf(p) || undefined,
        endDate: p.listing.endDate ?? undefined,
        ask: p.currentAskPrice || undefined,
        lastDate: typeof p.lastPrice === 'object' ? (p.lastPrice?.date ?? undefined) : undefined,
        accounts: [],
      };
      if (avg > 0) {
        h.avg = (h.avg * h.costShares + avg * p.numberOfShares) / (h.costShares + p.numberOfShares);
        h.costShares += p.numberOfShares;
      }
      h.value += Number(p.volume) || 0;
      h.shares += p.numberOfShares;
      if (!h.accounts.includes(acc.label)) h.accounts.push(acc.label);
      by.set(asin, h);
    }
  }
  return [...by.values()]
    .map((h): Holding => ({ asin: h.asin, name: h.name, type: h.type, value: h.value, shares: h.shares, avg: h.avg, mark: h.mark, endDate: h.endDate, ask: h.ask, lastDate: h.lastDate, accounts: h.accounts }))
    .sort((a, b) => b.value - a.value);
}

/** Book result since purchase in %, or undefined without a cost basis. */
export function sinceBuy(h: Pick<Holding, 'avg' | 'mark'>): number | undefined {
  if (!(h.avg > 0) || !h.mark) return undefined;
  return (h.mark / h.avg - 1) * 100;
}

/* ---------------------------------------------------------------- the day */

/** Change against the previous day in % per ASIN; `complete` = a missing ASIN did not move. */
export interface Changes {
  map: Map<string, number>;
  complete: boolean;
}

export function changeOf(asin: string, changes: Changes | null | undefined): number | undefined {
  if (!changes) return undefined;
  const c = changes.map.get(asin);
  if (c != null) return Number.isFinite(c) ? c : undefined;
  return changes.complete ? 0 : undefined;
}

export interface DayMove {
  /** change of the whole depot (cash included) against yesterday, in % */
  pct: number;
  /** in € */
  delta: number;
  /** the position that moved the depot most in the direction of the day */
  lead?: { asin: string; name: string; delta: number };
  /** holdings with a known change */
  known: number;
}

/**
 * How the depot moved today: each position's value yesterday = value ÷ (1 + change); cash counts as
 * unchanged. Null without holdings or without any known change.
 */
export function dayMove(holdings: Holding[], cash: number, changes: Changes | null | undefined): DayMove | null {
  let now = cash;
  let before = cash;
  let known = 0;
  let lead: DayMove['lead'];
  const deltas: { h: Holding; d: number }[] = [];
  for (const h of holdings) {
    now += h.value;
    const c = changeOf(h.asin, changes);
    if (c == null || c <= -100) {
      before += h.value;
      continue;
    }
    known += 1;
    const prev = h.value / (1 + c / 100);
    before += prev;
    deltas.push({ h, d: h.value - prev });
  }
  if (!known || !(before > 0)) return null;
  const delta = now - before;
  const sign = Math.sign(delta);
  for (const { h, d } of deltas) {
    if (sign !== 0 && Math.sign(d) === sign && (!lead || Math.abs(d) > Math.abs(lead.delta))) {
      lead = { asin: h.asin, name: h.name, delta: d };
    }
  }
  return { pct: (delta / before) * 100, delta, lead, known };
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 18) return 'Guten Tag';
  if (hour >= 18 && hour < 23) return 'Guten Abend';
  return 'Noch wach';
}

/** The rest of the day sentence after „Dein Depot liegt heute ▲ +2,3 %“. */
export function dayReason(move: DayMove, market?: { up: number; down: number } | null): string {
  if (Math.abs(move.pct) < 0.005) {
    if (market && market.up + market.down > 0) {
      return `Deine Papiere haben sich heute kaum bewegt – im Markt liegen ${deNum(market.up)} Papiere im Plus, ${deNum(market.down)} im Minus.`;
    }
    return 'Deine Papiere haben sich heute kaum bewegt.';
  }
  if (!move.lead) return move.pct > 0 ? 'Mehrere Papiere haben zugelegt.' : 'Mehrere Papiere haben nachgegeben.';
  return move.pct > 0 ? `– vor allem dank ${move.lead.name}.` : `– vor allem wegen ${move.lead.name}.`;
}

/* ---------------------------------------------------------------- bubbles */

export type BubbleKind = 'position' | 'group' | 'rest' | 'cash' | 'ghost';

export interface Bubble {
  id: string;
  kind: BubbleKind;
  label: string;
  /** shorter label for small bubbles, e.g. „1.200 m²“ */
  short?: string;
  /** e.g. „812 Anleihen“ */
  sub?: string;
  href: string;
  value: number;
  /** change today in % (value-weighted for groups) */
  today?: number;
  /** since purchase in % */
  sinceBuy?: number;
  /** ASINs that make this bubble pulse when traded */
  asins: string[];
  /** single securities: time of the last trade */
  last?: number;
  /** single securities: recent closes for a mini line (oldest first) */
  spark?: number[];
}

const deNum = (n: number) => n.toLocaleString('de-DE');

/** Which bubble group a holding goes into: bonds by issuer, buildings by size, warrants together – or none. */
export function groupKey(h: Pick<Holding, 'name' | 'type'>): { key: string; label: string; short?: string; unit: [string, string] } | null {
  const t = h.type;
  if (PERCENT_QUOTED.includes(t)) {
    const issuer = h.name.replace(/\s+-?\d+[.,]\d+\s*%.*$/, '').trim() || h.name;
    const repo = t.includes('REPO');
    return { key: `${repo ? 'R' : 'B'}:${issuer}`, label: issuer, unit: repo ? ['Repo', 'Repos'] : ['Anleihe', 'Anleihen'] };
  }
  if (t === 'BUILDING') {
    const size = /Building\s+(\d+)/i.exec(h.name)?.[1];
    return { key: `I:${size ?? ''}`, label: size ? `Immobilien ${deNum(+size)} m²` : 'Immobilien', short: size ? `${deNum(+size)} m²` : undefined, unit: ['Gebäude', 'Gebäude'] };
  }
  if (t === 'WARRANT') return { key: 'W', label: 'Optionsscheine', unit: ['Schein', 'Scheine'] };
  return null;
}

function weighted(items: { value: number; c?: number }[]): number | undefined {
  let w = 0;
  let s = 0;
  for (const i of items) {
    if (i.c == null) continue;
    w += i.value;
    s += i.value * i.c;
  }
  return w > 0 ? s / w : undefined;
}

/**
 * The depot as bubbles: single securities, look-alikes (bonds of one issuer, buildings of one size)
 * as one bubble, beyond `max` bubbles the rest as „Übrige“. Cash is no bubble – the field belongs to the securities.
 */
export function depotBubbles(holdings: Holding[], changes: Changes | null | undefined, max = 18): Bubble[] {
  type Acc = { key: string; label: string; short?: string; unit?: [string, string]; members: Holding[] };
  const groups = new Map<string, Acc>();
  for (const h of holdings) {
    const g = groupKey(h);
    const key = g?.key ?? `S:${h.asin}`;
    const acc = groups.get(key) ?? { key, label: g?.label ?? h.name, short: g?.short, unit: g?.unit, members: [] };
    acc.members.push(h);
    groups.set(key, acc);
  }
  const toBubble = (g: Acc): Bubble => {
    const value = g.members.reduce((s, m) => s + m.value, 0);
    const today = weighted(g.members.map((m) => ({ value: m.value, c: changeOf(m.asin, changes) })));
    const buy = weighted(g.members.map((m) => ({ value: m.value, c: sinceBuy(m) })));
    const top = g.members[0];
    if (g.members.length === 1) {
      return { id: top.asin, kind: 'position', label: top.name, href: `/wertpapier/${top.asin}`, value, today, sinceBuy: buy, asins: [top.asin], last: top.lastDate };
    }
    const n = g.members.length;
    return {
      id: g.key,
      kind: 'group',
      label: g.label,
      short: g.short,
      sub: `${deNum(n)} ${g.unit ? g.unit[n === 1 ? 0 : 1] : 'Papiere'}`,
      href: '/organisation',
      value,
      today,
      sinceBuy: buy,
      asins: g.members.map((m) => m.asin),
    };
  };
  const all = [...groups.values()].map(toBubble).sort((a, b) => b.value - a.value);
  const keep = all.length > max ? all.slice(0, max - 1) : all;
  const rest = all.length > max ? all.slice(max - 1) : [];
  const out = [...keep];
  if (rest.length) {
    const n = rest.reduce((s, b) => s + b.asins.length, 0);
    out.push({
      id: 'rest',
      kind: 'rest',
      label: 'Übrige',
      sub: `${deNum(n)} Papiere`,
      href: '/organisation',
      value: rest.reduce((s, b) => s + b.value, 0),
      today: weighted(rest.map((b) => ({ value: b.value, c: b.today }))),
      sinceBuy: weighted(rest.map((b) => ({ value: b.value, c: b.sinceBuy }))),
      asins: rest.flatMap((b) => b.asins),
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

/** Hot securities to look at (for new or small depots): not owned, as ghost bubbles. */
export function ghostBubbles(
  hot: { listing: { name: string; securityIdentifier: string }; priceChangeInPercent?: number }[],
  owned: Set<string>,
  count: number,
  changes?: Changes | null,
): Bubble[] {
  return hot
    .filter((r) => !owned.has(r.listing.securityIdentifier))
    .slice(0, count)
    .map((r) => ({
      id: `ghost:${r.listing.securityIdentifier}`,
      kind: 'ghost' as const,
      label: r.listing.name,
      href: `/wertpapier/${r.listing.securityIdentifier}`,
      value: 0,
      today:
        r.priceChangeInPercent != null
          ? Math.abs(r.priceChangeInPercent) <= 900
            ? r.priceChangeInPercent
            : undefined
          : changeOf(r.listing.securityIdentifier, changes),
      asins: [r.listing.securityIdentifier],
    }));
}

/**
 * Radius per bubble, relative (the largest = 1): area ∝ √value, so a position 10.000× smaller is still
 * a readable 10 % of the largest's width (at least `floor`). Ghosts get a fixed middle size.
 */
export function radii(bubbles: Bubble[], floor = 0.16): number[] {
  const own = bubbles.filter((b) => b.kind !== 'ghost' && b.value > 0);
  const top = Math.max(...own.map((b) => b.value), 0);
  return bubbles.map((b) => {
    if (b.kind === 'ghost' || !(top > 0)) return own.length ? 0.42 : 0.6;
    return Math.max(floor, Math.pow(b.value / top, 0.25));
  });
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Greedy circle packing: largest first in the middle, each next one touching two placed circles (or
 * one), at the free spot closest to the centre. Distances in x count 1/aspect, so a wide area fills
 * sideways. Returns circles in the input order; deterministic.
 */
export function pack(rs: number[], aspect = 1, gap = 0.04): Circle[] {
  const order = rs.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r || a.i - b.i);
  const placed: (Circle & { i: number })[] = [];
  const cost = (x: number, y: number) => (x / aspect) ** 2 + y ** 2;
  const free = (x: number, y: number, r: number) => placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + gap - 1e-9);
  for (const { r, i } of order) {
    if (!placed.length) {
      placed.push({ x: 0, y: 0, r, i });
      continue;
    }
    let best: { x: number; y: number; c: number } | null = null;
    const consider = (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !free(x, y, r)) return;
      const c = cost(x, y);
      if (!best || c < best.c - 1e-12) best = { x, y, c };
    };
    for (const a of placed) {
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2;
        consider(a.x + Math.cos(t) * (a.r + r + gap), a.y + Math.sin(t) * (a.r + r + gap));
      }
    }
    for (let m = 0; m < placed.length; m++) {
      for (let n = m + 1; n < placed.length; n++) {
        const a = placed[m];
        const b = placed[n];
        const ra = a.r + r + gap;
        const rb = b.r + r + gap;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > ra + rb || d < Math.abs(ra - rb) || d === 0) continue;
        const l = (ra * ra - rb * rb + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, ra * ra - l * l));
        const mx = a.x + (dx * l) / d;
        const my = a.y + (dy * l) / d;
        consider(mx + (h * dy) / d, my - (h * dx) / d);
        consider(mx - (h * dy) / d, my + (h * dx) / d);
      }
    }
    const b = best as { x: number; y: number } | null;
    placed.push({ x: b?.x ?? 0, y: b?.y ?? 0, r, i });
  }
  return placed.sort((a, b) => a.i - b.i).map(({ x, y, r }) => ({ x, y, r }));
}

/**
 * Packs and fits the bubbles; raises the size floor until the smallest bubble is at least `minPx`
 * across in radius (tap targets of 44 px on phones).
 */
export function layoutBubbles(bubbles: Bubble[], width: number, height: number, minPx = 0): Circle[] {
  if (!bubbles.length || width <= 0 || height <= 0) return [];
  let floor = 0.16;
  let out: Circle[] = [];
  for (let k = 0; k < 4; k++) {
    out = fit(pack(radii(bubbles, floor), width / height, 0.05), width, height, 6);
    const scale = Math.max(...out.map((c) => c.r)) || 1;
    const smallest = Math.min(...out.map((c) => c.r));
    if (smallest >= minPx - 0.5 || floor >= 0.9) break;
    floor = Math.min(0.9, (minPx / scale) * 1.08);
  }
  return out;
}

export interface Orbit {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** radius of each ghost */
  r: number;
}

/**
 * Own bubbles packed in the middle, hot securities (ghosts) circling on an ellipse around them. The
 * cluster gets the rectangle inside the ring (factor 0,7 of the inner ellipse). Without ghosts the
 * cluster takes the whole box.
 */
export function orbitLayout(
  own: Bubble[],
  ghosts: number,
  width: number,
  fullHeight: number,
  minPx = 0,
  /** room kept free at the bottom (phones: the host's floating bar) */
  bottomPad = 0,
): { own: Circle[]; orbit: Orbit | null } {
  const height = fullHeight - bottomPad;
  if (width <= 0 || height <= 0) return { own: [], orbit: null };
  if (!ghosts) return { own: layoutBubbles(own, width, height, minPx), orbit: null };
  const pad = 6;
  const circ = Math.PI * (width + height) * 0.5; // rough ellipse circumference
  const r = Math.max(minPx || 18, Math.min(46, Math.min(width, height) * 0.085, (circ / ghosts) * 0.3));
  const rx = width / 2 - r - pad;
  const ry = height / 2 - r - pad;
  const innerW = Math.max(40, 2 * (rx - r - pad) * 0.9);
  const innerH = Math.max(40, 2 * (ry - r - pad) * 0.9);
  const inner = layoutBubbles(own, innerW, innerH, minPx).map((c) => ({
    ...c,
    x: c.x + (width - innerW) / 2,
    y: c.y + (height - innerH) / 2,
  }));
  return { own: inner, orbit: { cx: width / 2, cy: height / 2, rx, ry, r } };
}

/** Where ghost `i` of `n` stands on the orbit after turning by `turn` (radians). */
export function orbitPoint(o: Orbit, i: number, n: number, turn = 0): { x: number; y: number } {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2 + turn;
  return { x: o.cx + o.rx * Math.cos(a), y: o.cy + o.ry * Math.sin(a) };
}

/**
 * Short labels that stay apart: names cut to `max` characters, and where two cuts would read the same,
 * the end of the name is kept („falscheracc…“ twice → „falsch…nt28“, „falsch…nt31“).
 */
export function shortNames(names: string[], max = 11): string[] {
  const cut = (n: string) => (n.length <= max ? n : `${n.slice(0, max - 1).trimEnd()}…`);
  const first = names.map(cut);
  const count = new Map<string, number>();
  for (const f of first) count.set(f, (count.get(f) ?? 0) + 1);
  return names.map((n, i) => {
    if (n.length <= max || (count.get(first[i]) ?? 0) < 2) return first[i];
    // the legal form is the same everywhere – the telling part is just before it
    const core = n.replace(/\s+(Inc\.?|AG|SE|GmbH|Corp\.?|Ltd\.?|KG)$/i, '');
    if (core.length <= max) return core;
    const tail = Math.max(3, Math.floor((max - 1) / 2));
    return `${core.slice(0, max - 1 - tail).trimEnd()}…${core.slice(-tail)}`;
  });
}

/**
 * Values for a mini line: transfer spikes removed; null when fewer than 3 different values remain
 * (two levels make a tent, not a trend).
 */
export function sparkValues(values: number[]): number[] | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0);
  const clean = v.filter((x, i) => {
    const prev = v[i - 1];
    const next = v[i + 1];
    const off = (a: number | undefined) => a != null && (x / a > 3 || a / x > 3);
    return !(off(prev) && (next == null || off(next))) && !(prev == null && off(next));
  });
  return new Set(clean.map((x) => x.toPrecision(6))).size >= 3 ? clean : null;
}

/** SVG paths for a mini line in a w × h box (area closed to the bottom); null below 2 points. */
export function sparkPaths(values: number[], w: number, h: number): { line: string; area: string } | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0);
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  // at least 4 % of the price as range: a quiet week stays a quiet line, not a mountain
  const span = Math.max(hi - lo, hi * 0.04) || 1;
  const base = lo - (span - (hi - lo)) / 2;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, h - ((x - base) / span) * h * 0.9 - h * 0.05] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${w},${h} L0,${h} Z` };
}

/** „reicht für 53 × AlphaCoins“: how many of the biggest share/coin position the cash buys at the ask. */
export function cashReach(cash: number, holdings: Holding[]): { shares: number; name: string; asin: string } | null {
  const h = holdings.find((x) => (x.type === 'STOCK' || x.type === 'COIN') && (x.ask ?? 0) > 0);
  if (!h || !(cash > 0)) return null;
  const shares = Math.floor(cash / h.ask!);
  return shares >= 1 ? { shares, name: h.name, asin: h.asin } : null;
}

/** Scales packed circles into a box of width × height (pixels), centred, with `pad` around. */
export function fit(circles: Circle[], width: number, height: number, pad = 8): Circle[] {
  if (!circles.length || width <= 0 || height <= 0) return [];
  const x0 = Math.min(...circles.map((c) => c.x - c.r));
  const x1 = Math.max(...circles.map((c) => c.x + c.r));
  const y0 = Math.min(...circles.map((c) => c.y - c.r));
  const y1 = Math.max(...circles.map((c) => c.y + c.r));
  const s = Math.min((width - 2 * pad) / (x1 - x0 || 1), (height - 2 * pad) / (y1 - y0 || 1));
  const ox = width / 2 - ((x0 + x1) / 2) * s;
  const oy = height / 2 - ((y0 + y1) / 2) * s;
  return circles.map((c) => ({ x: ox + c.x * s, y: oy + c.y * s, r: c.r * s }));
}

/** Fill strength of a bubble for a move of `pct` %: 0 (none) … 1 (±8 % and more). */
export function intensity(pct: number | undefined): number {
  if (pct == null || !Number.isFinite(pct)) return 0;
  return Math.min(1, Math.sqrt(Math.abs(pct) / 8));
}

/** „▲ +3,9 %“, „▼ −26 %“ (no decimals from 10 %), „▲ ×197“ from +1.000 %, „± 0 %“ below 0,05 %. */
export const flatBelow = 0.05;

export const pctText = (n: number) => {
  const a = Math.abs(n);
  if (a < 0.05) return '± 0\u00a0%';
  // beyond +999 % a factor reads better and fits a small bubble: „▲ ×197“
  if (n >= 1000) return `▲ ×${Math.round(1 + n / 100).toLocaleString('de-DE')}`;
  const digits = a < 10 ? 1 : 0;
  return `${n > 0 ? '▲ +' : '▼ −'}${a.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}\u00a0%`;
};

/* ---------------------------------------------------------------- time */

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „in 2 Std.“, „in 3 Tagen“. */
export function relTime(ms: number, now: number): string {
  const d = ms - now;
  const a = Math.abs(d);
  const future = d > 0;
  if (a < 60_000) return future ? 'gleich' : 'gerade eben';
  const unit = (n: number, one: string, many: string) => `${future ? 'in' : 'vor'} ${n} ${n === 1 ? one : many}`;
  if (a < 3_600_000) return unit(Math.round(a / 60_000), 'Min.', 'Min.');
  if (a < 86_400_000) return unit(Math.round(a / 3_600_000), 'Std.', 'Std.');
  const days = Math.round(a / 86_400_000);
  return future ? unit(days, 'Tag', 'Tagen') : unit(days, 'Tag', 'Tagen');
}

/* ---------------------------------------------------------------- to-do */

export type TodoKind =
  | 'chat'
  | 'poll'
  | 'salary'
  | 'achievement'
  | 'maturity'
  | 'capital'
  | 'dividend'
  | 'merger'
  | 'news'
  | 'fill'
  | 'orders'
  | 'step';

export interface Todo {
  id: string;
  kind: TodoKind;
  /** higher first */
  priority: number;
  title: string;
  detail?: string;
  href: string;
  /** the one action, a verb */
  action: string;
  /** when it happened / happens (ms) */
  date?: number;
}

export interface Fill {
  id?: string;
  date: number;
  securityIdentifier: string;
  numberOfShares: number;
  price: number;
  buyerSecuritiesAccount?: string;
  sellerSecuritiesAccount?: string;
}

export interface CompanyEvent {
  id: string;
  startDate: number;
  endDate?: number;
  company: { name: string; securityIdentifier?: string };
}

export interface NewsLike {
  id: string;
  title: string;
  content?: string;
  dateCreated?: number;
  company?: { name: string; securityIdentifier?: string } | null;
  listing?: { name: string; securityIdentifier: string } | null;
}

export interface TodoInput {
  now: number;
  unread: { messages: number; chats: number; onlyChatId?: string };
  /** polls the player has not voted on */
  polls: { id: string; company?: { name: string } | null; endDate?: number }[];
  salary?: number | null;
  achievements: number;
  /** own securities accounts (to tell buys from sells) */
  accounts: string[];
  fills: Fill[];
  openOrders: number;
  holdings: Holding[];
  /** ASINs of the companies the player runs */
  companyAsins: string[];
  capital: (CompanyEvent & { kind: 'increase' | 'reduction' })[];
  dividends: CompanyEvent[];
  mergers: (CompanyEvent & { acquiringCompany?: { name: string; securityIdentifier?: string } })[];
  news: NewsLike[];
  names: Record<string, string>;
}

const shares = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const euro = (n: number, type?: string) =>
  type && PERCENT_QUOTED.includes(type)
    ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}\u00a0%`
    : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n < 0.01 ? 4 : 2 })}\u00a0€`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Articles about the player's securities or companies: tagged with the company/listing, or naming it
 * (whole word, names of at least 4 letters). Newest first; returns the name that matched.
 */
export function newsAbout(news: NewsLike[], watch: { asin: string; name: string }[]): { post: NewsLike; about: string }[] {
  const byAsin = new Map(watch.map((w) => [w.asin, w.name]));
  const words = watch
    .filter((w) => w.name.trim().length >= 4 && !/^(Building|Alpha Bank)\b/i.test(w.name))
    .map((w) => ({ name: w.name, re: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w.name.trim())}($|[^\\p{L}\\p{N}])`, 'iu') }));
  const out: { post: NewsLike; about: string }[] = [];
  for (const p of news) {
    const tagged =
      (p.company?.securityIdentifier && byAsin.get(p.company.securityIdentifier)) ||
      (p.listing?.securityIdentifier && byAsin.get(p.listing.securityIdentifier));
    if (tagged) {
      out.push({ post: p, about: tagged });
      continue;
    }
    const text = `${p.title} ${(p.content ?? '').replace(/<[^>]*>/g, ' ')}`;
    const hit = words.find((w) => w.re.test(text));
    if (hit) out.push({ post: p, about: hit.name });
  }
  return out.sort((a, b) => (b.post.dateCreated ?? 0) - (a.post.dateCreated ?? 0));
}

const DAY = 86_400_000;

/** More than two company events of one kind → one line „5 Kapitalmaßnahmen bei deinen Papieren“. */
function bundleEvents(items: Todo[], plural: string): Todo[] {
  if (items.length <= 2) return items;
  const sorted = [...items].sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
  const names = sorted.map((t) => t.title.replace(/^.* (bei|von) /, '').replace(/ geht in .*$/, ''));
  return [
    {
      id: `${items[0].kind}:all`,
      kind: items[0].kind,
      priority: Math.max(...items.map((t) => t.priority)),
      title: `${deNum(items.length)} ${plural} bei deinen Papieren`,
      detail: `${[...new Set(names)].slice(0, 2).join(', ')} …`,
      href: items[0].href,
      action: 'Ansehen',
      date: sorted[0].date,
    },
  ];
}

/** Everything the player should react to, most urgent first. Each item has exactly one link. */
export function todoItems(i: TodoInput): Todo[] {
  const out: Todo[] = [];
  const mine = new Set(i.holdings.map((h) => h.asin));
  const held = new Set([...mine, ...i.companyAsins]);

  if (i.unread.messages > 0) {
    out.push({
      id: 'chat',
      kind: 'chat',
      priority: 90,
      title: i.unread.messages === 1 ? '1 ungelesene Nachricht' : `${deNum(i.unread.messages)} ungelesene Nachrichten`,
      detail: i.unread.chats > 1 ? `in ${deNum(i.unread.chats)} Chats` : undefined,
      href: i.unread.chats === 1 && i.unread.onlyChatId ? `/nachrichten/${i.unread.onlyChatId}` : '/nachrichten',
      action: 'Lesen',
    });
  }

  const polls = i.polls.filter((p) => !p.endDate || p.endDate > i.now);
  if (polls.length) {
    const soonest = [...polls].sort((a, b) => (a.endDate ?? Infinity) - (b.endDate ?? Infinity))[0];
    const companies = [...new Set(polls.map((p) => p.company?.name).filter(Boolean))] as string[];
    out.push({
      id: 'poll',
      kind: 'poll',
      priority: 85,
      title: polls.length === 1 ? 'Eine Abstimmung wartet auf deine Stimme' : `${deNum(polls.length)} Abstimmungen warten auf deine Stimme`,
      detail: [companies.slice(0, 2).join(', '), soonest.endDate ? `endet ${relTime(soonest.endDate, i.now)}` : ''].filter(Boolean).join(' · ') || undefined,
      href: '/abstimmungen',
      action: 'Abstimmen',
      date: soonest.endDate,
    });
  }

  if (i.salary && i.salary > 0) {
    out.push({ id: 'salary', kind: 'salary', priority: 80, title: 'Dein Gehalt liegt bereit', detail: euro(i.salary), href: '/unternehmen', action: 'Abholen' });
  }
  if (i.achievements > 0) {
    out.push({
      id: 'achievement',
      kind: 'achievement',
      priority: 75,
      title: i.achievements === 1 ? 'Ein Erfolg zum Abholen' : `${deNum(i.achievements)} Erfolge zum Abholen`,
      href: '/erfolge',
      action: 'Abholen',
    });
  }

  const due = i.holdings
    .filter((h) => h.endDate && h.endDate > i.now && h.endDate - i.now < DAY && PERCENT_QUOTED.includes(h.type))
    .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));
  if (due.length === 1) {
    const h = due[0];
    out.push({ id: `due:${h.asin}`, kind: 'maturity', priority: 70, title: `${h.name} wird fällig`, detail: relTime(h.endDate!, i.now), href: `/wertpapier/${h.asin}`, action: 'Ansehen', date: h.endDate });
  } else if (due.length > 1) {
    out.push({
      id: 'due',
      kind: 'maturity',
      priority: 70,
      title: `${deNum(due.length)} deiner Anleihen werden fällig`,
      detail: `die erste ${relTime(due[0].endDate!, i.now)}`,
      href: `/wertpapier/${due[0].asin}`,
      action: 'Ansehen',
      date: due[0].endDate,
    });
  }

  const events: Todo[] = [];
  for (const c of i.capital) {
    const asin = c.company.securityIdentifier;
    if (!asin || !held.has(asin) || (c.endDate && c.endDate < i.now)) continue;
    const running = c.startDate <= i.now;
    events.push({
      id: `cap:${c.id}`,
      kind: 'capital',
      priority: running ? 68 : 62,
      title: `${c.kind === 'increase' ? 'Kapitalerhöhung' : 'Kapitalherabsetzung'} bei ${c.company.name}`,
      detail: running && c.endDate ? `Zeichnung endet ${relTime(c.endDate, i.now)}` : `beginnt ${relTime(c.startDate, i.now)}`,
      href: '/kapitalmassnahmen?art=kapital',
      action: 'Ansehen',
      date: c.startDate,
    });
  }
  for (const d of i.dividends) {
    const asin = d.company.securityIdentifier;
    if (!asin || !held.has(asin) || d.startDate < i.now) continue;
    events.push({ id: `div:${d.id}`, kind: 'dividend', priority: 60, title: `Dividende von ${d.company.name}`, detail: relTime(d.startDate, i.now), href: '/kapitalmassnahmen?art=dividenden', action: 'Ansehen', date: d.startDate });
  }
  for (const m of i.mergers) {
    const asin = m.company.securityIdentifier;
    const acq = m.acquiringCompany?.securityIdentifier;
    if (!((asin && held.has(asin)) || (acq && held.has(acq))) || m.startDate < i.now) continue;
    events.push({
      id: `mer:${m.id}`,
      kind: 'merger',
      priority: 60,
      title: `${m.company.name} geht in ${m.acquiringCompany?.name ?? 'einer anderen Firma'} auf`,
      detail: relTime(m.startDate, i.now),
      href: '/kapitalmassnahmen?art=fusionen',
      action: 'Ansehen',
      date: m.startDate,
    });
  }

  out.push(...bundleEvents(events.filter((e) => e.kind === 'capital'), 'Kapitalmaßnahmen'));
  out.push(...bundleEvents(events.filter((e) => e.kind === 'dividend'), 'Dividenden'));
  out.push(...bundleEvents(events.filter((e) => e.kind === 'merger'), 'Fusionen'));

  const watch = [
    ...i.holdings.filter((h) => h.type === 'STOCK' || h.type === 'COIN' || h.type === 'ETF').map((h) => ({ asin: h.asin, name: h.name })),
    ...i.companyAsins.map((a) => ({ asin: a, name: i.names[a] ?? '' })).filter((w) => w.name),
  ];
  for (const { post, about } of newsAbout(i.news, watch).slice(0, 2)) {
    out.push({ id: `news:${post.id}`, kind: 'news', priority: 55, title: post.title, detail: `nennt ${about}`, href: `/zeitung/${post.id}`, action: 'Lesen', date: post.dateCreated });
  }

  // Own trades of the last 24 h, one line per security and side.
  const own = new Set(i.accounts);
  const fills = new Map<string, { asin: string; buy: boolean; shares: number; volume: number; last: number; n: number }>();
  for (const f of i.fills) {
    if (f.date < i.now - DAY || !(f.price > 0)) continue;
    const buy = !!f.buyerSecuritiesAccount && own.has(f.buyerSecuritiesAccount);
    const sell = !!f.sellerSecuritiesAccount && own.has(f.sellerSecuritiesAccount);
    if (buy && sell) continue; // between own accounts
    const key = `${f.securityIdentifier}:${buy}`;
    const g = fills.get(key) ?? { asin: f.securityIdentifier, buy, shares: 0, volume: 0, last: 0, n: 0 };
    g.shares += f.numberOfShares;
    g.volume += f.numberOfShares * f.price;
    g.last = Math.max(g.last, f.date);
    g.n += 1;
    fills.set(key, g);
  }
  const typeOf = new Map(i.holdings.map((h) => [h.asin, h.type]));
  [...fills.values()]
    .sort((a, b) => b.last - a.last)
    .slice(0, 3)
    .forEach((g) => {
      const name = i.names[g.asin] ?? g.asin;
      out.push({
        id: `fill:${g.asin}:${g.buy}`,
        kind: 'fill',
        priority: 45,
        title: `${g.buy ? 'Gekauft' : 'Verkauft'}: ${shares(g.shares)} × ${name}`,
        detail: `zu ${euro(g.volume / g.shares, typeOf.get(g.asin))} · ${relTime(g.last, i.now)}`,
        href: `/wertpapier/${g.asin}`,
        action: 'Ansehen',
        date: g.last,
      });
    });

  if (i.openOrders > 0) {
    out.push({
      id: 'orders',
      kind: 'orders',
      priority: 40,
      title: i.openOrders === 1 ? 'Eine Order ist offen' : `${deNum(i.openOrders)} Orders sind offen`,
      href: '/orders',
      action: 'Prüfen',
    });
  }

  return out.sort((a, b) => b.priority - a.priority || (b.date ?? 0) - (a.date ?? 0));
}

/** First steps for a player without securities. */
export function firstSteps(hot: { name: string; asin: string } | undefined, hasCompany: boolean): Todo[] {
  const steps: Todo[] = [
    { id: 'step:markt', kind: 'step', priority: 30, title: 'Sieh dir an, was gerade gehandelt wird', detail: 'Kurse, Umsatz, Marktkarte', href: '/markt', action: 'Zum Markt' },
  ];
  if (hot) {
    steps.push({ id: 'step:buy', kind: 'step', priority: 29, title: 'Kaufe dein erstes Papier', detail: `zum Beispiel ${hot.name}`, href: `/wertpapier/${hot.asin}`, action: 'Ansehen' });
  }
  if (!hasCompany) {
    steps.push({ id: 'step:found', kind: 'step', priority: 28, title: 'Gründe ein eigenes Unternehmen', detail: 'und bring es an die Börse', href: '/unternehmen?gruenden=1', action: 'Gründen' });
  }
  steps.push({ id: 'step:miner', kind: 'step', priority: 27, title: 'Lass deinen Miner AlphaCoins schürfen', href: '/miner', action: 'Zum Miner' });
  return steps;
}

/* ---------------------------------------------------------------- market context */

export interface TradeLike {
  id?: string;
  date: number;
  securityIdentifier: string;
  numberOfShares: number;
  price: number;
  volume?: number;
}

/** Trades per minute over the last `minutes` (transfers at ≤ 0,01 € left out). */
export function tradesPerMinute(trades: TradeLike[], now: number, minutes = 5): number {
  const from = now - minutes * 60_000;
  const n = trades.filter((t) => t.date >= from && t.date <= now && t.price > 0.01).length;
  return n / minutes;
}

/** Latest real trades in the given securities, newest first. */
export function tradesIn(trades: TradeLike[], asins: Set<string>, count = 4): TradeLike[] {
  return trades
    .filter((t) => asins.has(t.securityIdentifier) && t.price > 0.01)
    .sort((a, b) => b.date - a.date)
    .slice(0, count);
}

/** How many securities rose / fell today (moves beyond ×10 are transfers, left out). */
export function breadth(changes: Changes | null | undefined): { up: number; down: number } | null {
  if (!changes) return null;
  let up = 0;
  let down = 0;
  for (const c of changes.map.values()) {
    if (!Number.isFinite(c)) continue;
    if (c > 0) up += 1;
    else if (c < 0) down += 1;
  }
  return { up, down };
}
