// Start page „Skyline“: the market as a city at night. Pure layout and bookkeeping – which securities
// become towers, in which district they stand, how tall and wide they are, where their windows sit and
// which windows a trade lights up. Drawn in Skyline.tsx.

export type DistrictKey = 'BUILDING' | 'STOCK' | 'COIN';

/** One tower: a security, or – for real estate – all buildings of one size together. */
export interface TowerData {
  /** the security's ASIN; buildings of one size: „BD-1200“ */
  asin: string;
  name: string;
  type: DistrictKey;
  /** 24 h volume in €; null = unknown (an own position outside the busiest list) */
  volume: number | null;
  /** change to the previous day in %; null = unknown */
  change: number | null;
  price: number | null;
  own: boolean;
  /** buildings: floor space in m² (from the name „Building 1200 07/08/2026“) */
  size?: number;
  /** buildings: how many of this size traded in 24 h */
  count?: number;
  /** where „Handeln“ leads */
  href: string;
}

/** A row of the busiest-securities lists (biggesttradedsecurities), reduced to what the city needs. */
export interface ListingRow {
  asin: string;
  name: string;
  type: string;
  volume: number | null;
  price: number | null;
}

export interface OwnPosition {
  asin: string;
  name: string;
  type?: string;
  price?: number | null;
}

/** Shares downtown, the coin next to them, real estate at the back edge. */
export const DISTRICT_ORDER: DistrictKey[] = ['STOCK', 'COIN', 'BUILDING'];
export const DISTRICT_LABEL: Record<DistrictKey, string> = { BUILDING: 'Immobilien', STOCK: 'Aktien', COIN: 'Coin' };

export function districtOf(type: string | undefined): DistrictKey | null {
  return type === 'STOCK' || type === 'BUILDING' || type === 'COIN' ? type : null;
}

/** „Building 1200 07/08/2026“ → 1200. */
export function buildingSize(name: string): number | undefined {
  const m = /^Building\s+(\d+)/i.exec(name);
  return m ? Number(m[1]) : undefined;
}

/** Tower key of the buildings of one size. */
export const sizeKey = (size: number) => `BD-${size}`;

export function towerLabel(t: Pick<TowerData, 'name' | 'type' | 'size'>): string {
  if (t.type === 'BUILDING' && t.size != null) return `Gebäude ${t.size.toLocaleString('de-DE')} m²`;
  return t.name;
}

export const DEFAULT_COUNTS: Record<DistrictKey, number> = { STOCK: 24, BUILDING: 4, COIN: 1 };

export interface PickOptions {
  counts?: Record<DistrictKey, number>;
  maxOwn?: number;
  /** ASINs from the news: shown too when they are among the rows (at most `maxFeatured`) */
  featured?: string[];
  maxFeatured?: number;
}

/**
 * The towers: the busiest `counts` shares and coins (rows come sorted by volume), buildings summed per
 * size (the biggest `counts.BUILDING` sizes), news companies found in the rows, and up to `maxOwn` own
 * positions that are not among them (they stand at the edge, low, with unknown volume).
 */
export function pickTowers(
  rows: ListingRow[],
  changes: ReadonlyMap<string, number> | null,
  changesComplete: boolean,
  own: OwnPosition[],
  opts: PickOptions = {},
): TowerData[] {
  const { counts = DEFAULT_COUNTS, maxOwn = 4, featured = [], maxFeatured = 4 } = opts;
  const owned = new Set(own.map((o) => o.asin));
  const changeOf = (asin: string): number | null => {
    const c = changes?.get(asin);
    if (c != null) return Number.isFinite(c) ? c : null;
    return changes && changesComplete ? 0 : null;
  };
  const single = (r: ListingRow, d: DistrictKey): TowerData => ({
    asin: r.asin,
    name: r.name,
    type: d,
    volume: r.volume,
    change: changeOf(r.asin),
    price: r.price,
    own: owned.has(r.asin),
    href: `/wertpapier/${r.asin}`,
  });

  const out: TowerData[] = [];
  const seen = new Set<string>();
  const taken = new Map<DistrictKey, number>();
  for (const r of rows) {
    const d = districtOf(r.type);
    if (!d || d === 'BUILDING' || seen.has(r.asin) || !(r.volume && r.volume > 0)) continue;
    if ((taken.get(d) ?? 0) >= counts[d]) continue;
    taken.set(d, (taken.get(d) ?? 0) + 1);
    seen.add(r.asin);
    out.push(single(r, d));
  }
  let feat = 0;
  for (const asin of featured) {
    if (feat >= maxFeatured || seen.has(asin)) continue;
    const r = rows.find((x) => x.asin === asin);
    const d = districtOf(r?.type);
    if (!r || !d || d === 'BUILDING' || !(r.volume && r.volume > 0)) continue;
    seen.add(asin);
    feat += 1;
    out.push(single(r, d));
  }

  // Real estate: one tower per size – volume summed, change weighted by volume.
  const bySize = new Map<number, { volume: number; weighted: number; known: number; count: number; own: boolean }>();
  for (const r of rows) {
    if (r.type !== 'BUILDING' || !(r.volume && r.volume > 0)) continue;
    const size = buildingSize(r.name);
    if (size == null) continue;
    const g = bySize.get(size) ?? { volume: 0, weighted: 0, known: 0, count: 0, own: false };
    g.volume += r.volume;
    g.count += 1;
    const c = changeOf(r.asin);
    if (c != null) {
      g.weighted += c * r.volume;
      g.known += r.volume;
    }
    g.own ||= owned.has(r.asin);
    bySize.set(size, g);
  }
  for (const o of own) {
    const size = o.type === 'BUILDING' ? buildingSize(o.name) : undefined;
    if (size == null) continue;
    const g = bySize.get(size) ?? { volume: 0, weighted: 0, known: 0, count: 0, own: false };
    g.own = true;
    bySize.set(size, g);
  }
  [...bySize.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, Math.max(counts.BUILDING, [...bySize.values()].filter((g) => g.own && !g.volume).length))
    .forEach(([size, g]) => {
      out.push({
        asin: sizeKey(size),
        name: `Gebäude ${size} m²`,
        type: 'BUILDING',
        volume: g.volume || null,
        change: g.known ? g.weighted / g.known : null,
        price: null,
        own: g.own,
        size,
        count: g.count,
        href: `/markt?art=BUILDING&gr=${size}`,
      });
    });

  let extra = 0;
  for (const o of own) {
    const d = districtOf(o.type);
    if (!d || d === 'BUILDING' || seen.has(o.asin) || extra >= maxOwn) continue;
    seen.add(o.asin);
    extra += 1;
    const known = rows.find((r) => r.asin === o.asin);
    out.push({
      asin: o.asin,
      name: o.name,
      type: d,
      volume: known?.volume ?? null,
      change: changeOf(o.asin),
      price: known?.price ?? o.price ?? null,
      own: true,
      href: `/wertpapier/${o.asin}`,
    });
  }
  return out;
}

/**
 * Which tower a trade or article belongs to: the tower of that ASIN, or – for a building – the tower of
 * its size (`buildingNames` = known names of building ASINs).
 */
export function towerKeyOf(
  asin: string | undefined,
  towers: ReadonlySet<string>,
  buildingNames: Readonly<Record<string, string | undefined>> = {},
): string | undefined {
  if (!asin) return undefined;
  if (towers.has(asin)) return asin;
  const name = buildingNames[asin];
  const size = name ? buildingSize(name) : undefined;
  const key = size != null ? sizeKey(size) : undefined;
  return key && towers.has(key) ? key : undefined;
}

/**
 * Skyline order: the biggest in the middle, falling off to both sides (a, b, c, d, e → d b a c e).
 * Input sorted biggest first.
 */
export function peakOrder<T>(sorted: T[]): T[] {
  const out: T[] = [];
  sorted.forEach((x, i) => (i % 2 === 0 ? out.push(x) : out.unshift(x)));
  return out;
}

/** The core: tallest near the middle, neighbours alternating (sorted indices placed left to right). */
const CORE_PATTERN = [2, 0, 3, 1, 4];

/**
 * City order instead of a bell curve: the five biggest form the centre („Bankenviertel“) with high and
 * low neighbours taking turns, the rest fall off to both sides – roughly by size, but mixed by up to six
 * places with a jitter from the ASIN, so neighbours are not monotonic. Deterministic: the same towers in
 * the same ranking always stand in the same place. Input sorted biggest first.
 */
export function cityOrder<T extends { asin: string }>(sorted: T[]): T[] {
  const core = CORE_PATTERN.filter((i) => i < sorted.length).map((i) => sorted[i]);
  const rest = sorted
    .slice(CORE_PATTERN.length)
    .map((t, i) => ({ t, i, key: i + ((hash(t.asin) % 1000) / 1000) * 6 }))
    .sort((a, b) => a.key - b.key);
  const left: T[] = [];
  const right: T[] = [];
  rest.forEach(({ t }, n) => (n % 2 ? left : right).push(t));
  return [...left.reverse(), ...core, ...right];
}

/**
 * Height as a share of the tallest: log of the volume between the smallest and largest, lifted a little
 * (power 0.8) so the middle of the market does not crouch under the few giants.
 */
export function heightShare(volume: number | null, min: number, max: number, floor = 0.2): number {
  if (!volume || volume <= 0) return floor * 0.55;
  if (!(max > min)) return 1;
  const f = (Math.log(volume) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return floor + (1 - floor) * Math.pow(Math.min(1, Math.max(0, f)), 0.8);
}

/**
 * Relative width: the coin wide, the real-estate towers slim (they stand at the back), shares between
 * 0,85 and 1,2 by their ASIN – a street of equal widths reads like a bar chart.
 */
export function widthFactor(t: Pick<TowerData, 'type' | 'size' | 'asin'>): number {
  if (t.type === 'COIN') return 1.7;
  if (t.type === 'BUILDING') return 0.8;
  return 0.85 + (hash(`w-${t.asin}`) % 8) * 0.05;
}

export interface Tower extends TowerData {
  x: number;
  w: number;
  h: number;
  block: DistrictKey;
}

export interface Block {
  key: DistrictKey;
  label: string;
  x0: number;
  x1: number;
}

export interface CityLayout {
  towers: Tower[];
  blocks: Block[];
  /** drawing width (≥ the given width when the city is a panorama) */
  width: number;
  /** tallest possible tower in px */
  maxHeight: number;
  unit: number;
}

export interface LayoutOptions {
  width: number;
  /** room for towers above the ground */
  height: number;
  minUnit?: number;
  maxUnit?: number;
}

const GAP = 0.22; // between towers, in units
const DISTRICT_GAP = 2; // between districts
/** Real estate stands in the second row: lower, so the shares keep the stage. */
export const BACK_SCALE = 0.7;

/**
 * Places the towers: districts left to right (shares, coin, real estate), shares with the biggest in the
 * middle, real estate by size. The unit width fills `width`; below `minUnit` the city gets wider than
 * the screen (a panorama to swipe), above `maxUnit` it is centred.
 */
export function layoutCity(towers: TowerData[], opts: LayoutOptions): CityLayout {
  const { width, height, minUnit = 14, maxUnit = 46 } = opts;
  const vols = towers.map((t) => t.volume ?? 0).filter((v) => v > 0);
  const min = vols.length ? Math.min(...vols) : 1;
  const max = vols.length ? Math.max(...vols) : 1;
  const byVolume = (a: TowerData, b: TowerData) => (b.volume ?? 0) - (a.volume ?? 0);

  const groups = DISTRICT_ORDER.map((d) => {
    const inD = towers.filter((t) => t.type === d);
    const items = d === 'BUILDING' ? inD.sort((a, b) => (a.size ?? 0) - (b.size ?? 0)) : cityOrder(inD.sort(byVolume));
    return { district: d, items };
  }).filter((g) => g.items.length);

  let units = 0;
  groups.forEach((g, gi) => {
    if (gi > 0) units += DISTRICT_GAP;
    g.items.forEach((t, i) => {
      units += widthFactor(t) + (i > 0 ? GAP : 0);
    });
  });
  const raw = units > 0 ? width / units : maxUnit;
  const unit = Math.max(minUnit, Math.min(maxUnit, raw));
  const cityWidth = units * unit;
  const drawWidth = Math.max(width, cityWidth);
  let x = (drawWidth - cityWidth) / 2;

  const out: Tower[] = [];
  const blocks: Block[] = [];
  groups.forEach((g, gi) => {
    if (gi > 0) x += DISTRICT_GAP * unit;
    const x0 = x;
    g.items.forEach((t, i) => {
      if (i > 0) x += GAP * unit;
      const w = widthFactor(t) * unit;
      const back = t.type === 'BUILDING' ? BACK_SCALE : 1;
      out.push({ ...t, x, w, h: Math.max(6, heightShare(t.volume, min, max) * height * back), block: g.district });
      x += w;
    });
    blocks.push({ key: g.district, label: DISTRICT_LABEL[g.district], x0, x1: x });
  });
  return { towers: out, blocks, width: drawWidth, maxHeight: height, unit };
}

/**
 * The name a vertical sign on a tower can carry: as much as fits between roof and foot (6,4 px a
 * letter, 34 px margins), cut with „…“; none when a cut name would keep fewer than 7 letters or the tower is too thin.
 */
export function signText(label: string, h: number, w: number): string | null {
  if (w < 15) return null;
  const fit = Math.min(26, Math.floor((h - 34) / 6.4));
  if (label.length <= fit) return fit >= 3 ? label : null;
  // a stump like „GREE…“ tells nothing – cut names only where most of them fits
  if (fit < 8) return null;
  return `${label.slice(0, fit - 1).trimEnd()}…`;
}

/* ------------------------------------------------------------------ silhouettes */

export type Roof = 'flat' | 'setback' | 'stepped' | 'dome' | 'antenna';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Outline of a tower: the body with windows, an optional crown on top, and where the roof cap sits. */
export interface Silhouette {
  roof: Roof;
  body: Box;
  /** solid parts above the body (setback, steps) */
  crown: Box[];
  /** coin: half circle on the body */
  dome?: { cx: number; cy: number; r: number };
  /** tallest share: a mast above the roof */
  mast?: { x: number; y1: number; y2: number };
  /** the colored roof edge */
  cap: Box;
}

/**
 * Roof of a tower: the coin gets a dome, the tallest share a mast, tall shares a setback or steps
 * (by ASIN, so a tower keeps its shape), everything else a flat roof.
 */
export function roofOf(t: Pick<Tower, 'asin' | 'type' | 'h' | 'w'>, tallest: boolean): Roof {
  if (t.type === 'COIN') return 'dome';
  if (t.type !== 'STOCK') return 'flat';
  if (tallest) return 'antenna';
  if (t.h < 90 || t.w < 14) return 'flat';
  return (['setback', 'stepped', 'flat'] as const)[hash(t.asin) % 3];
}

/** The parts of a tower standing on `ground`. The cap is `capH` thick. */
export function silhouette(t: Pick<Tower, 'x' | 'w' | 'h'>, ground: number, roof: Roof, capH = 3): Silhouette {
  const top = ground - t.h;
  const full: Box = { x: t.x, y: top, w: t.w, h: t.h };
  const capOf = (b: Box): Box => ({ x: b.x, y: b.y, w: b.w, h: Math.min(capH, b.h) });
  switch (roof) {
    case 'setback': {
      const ch = Math.min(30, Math.round(t.h * 0.16));
      const cw = t.w * 0.62;
      const crown = { x: t.x + (t.w - cw) / 2, y: top, w: cw, h: ch };
      return { roof, body: { x: t.x, y: top + ch, w: t.w, h: t.h - ch }, crown: [crown], cap: capOf(crown) };
    }
    case 'stepped': {
      const s1 = { x: t.x + t.w * 0.12, y: top + 9, w: t.w * 0.76, h: 9 };
      const s2 = { x: t.x + t.w * 0.26, y: top, w: t.w * 0.48, h: 9 };
      return { roof, body: { x: t.x, y: top + 18, w: t.w, h: t.h - 18 }, crown: [s1, s2], cap: capOf(s2) };
    }
    case 'dome': {
      const r = Math.min(t.w * 0.42, t.h * 0.5);
      const body = { x: t.x, y: top + r, w: t.w, h: t.h - r };
      return { roof, body, crown: [], dome: { cx: t.x + t.w / 2, cy: top + r, r }, cap: capOf(body) };
    }
    case 'antenna':
      return { roof, body: full, crown: [], mast: { x: t.x + t.w * 0.3, y1: top, y2: top - 16 }, cap: capOf(full) };
    default:
      return { roof, body: full, crown: [], cap: capOf(full) };
  }
}

/**
 * The far city behind the towers: plain low silhouettes over the whole width, always the same for the
 * same width (no data – it only gives the skyline depth, like the back layer of a paper cut).
 */
export function backdrop(width: number, maxHeight: number, seed = 'skyline'): Box[] {
  const r = rng(hash(seed));
  const out: Box[] = [];
  let x = -r() * 20;
  while (x < width) {
    const w = 18 + r() * 42;
    const h = maxHeight * (0.12 + r() * 0.3);
    out.push({ x, y: -h, w, h });
    x += w + (r() < 0.3 ? 4 + r() * 10 : 0);
  }
  return out;
}

/* ------------------------------------------------------------------ windows */

export interface WindowGrid {
  cols: number;
  rows: number;
  /** top-left of the first window */
  x0: number;
  y0: number;
  ww: number;
  wh: number;
  pitchX: number;
  pitchY: number;
}

/** Window raster of a tower whose roof is at `top`: small panes, evenly spaced, centred. */
export function windowGrid(t: Pick<Tower, 'x' | 'w' | 'h'>, top: number, unit: number): WindowGrid {
  const ww = Math.max(2, Math.min(4, Math.round(unit * 0.13)));
  const wh = ww + 1;
  const pitchX = ww + 3;
  const pitchY = wh + 4;
  const side = Math.max(3, t.w * 0.14);
  const roof = 7;
  const foot = 5;
  const cols = Math.max(0, Math.floor((t.w - 2 * side + (pitchX - ww)) / pitchX));
  const rows = Math.max(0, Math.floor((t.h - roof - foot + (pitchY - wh)) / pitchY));
  const used = cols * pitchX - (pitchX - ww);
  return { cols, rows, x0: t.x + (t.w - used) / 2, y0: top + roof, ww, wh, pitchX, pitchY };
}

export function windowAt(g: WindowGrid, i: number): { x: number; y: number } {
  return { x: g.x0 + (i % g.cols) * g.pitchX, y: g.y0 + Math.floor(i / g.cols) * g.pitchY };
}

/** FNV-1a – a stable number from a string (ASIN, trade id). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic generator (mulberry32). */
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` distinct window indices out of `total`, always the same for the same seed. */
export function pickWindows(seed: string, count: number, total: number): number[] {
  const n = Math.min(Math.max(0, Math.floor(count)), total);
  if (!n) return [];
  const r = rng(hash(seed));
  const picked = new Set<number>();
  while (picked.size < n) picked.add(Math.floor(r() * total));
  return [...picked];
}

/**
 * Windows lit all the time: more the busier the tower was in the last minutes. The first `k` of a fixed
 * order, so a busier tower keeps its lit windows and adds more instead of reshuffling.
 */
export function ambientWindows(asin: string, recentTrades: number, total: number, max = 36): number[] {
  if (!total) return [];
  const share = recentTrades > 0 ? Math.min(0.4, 0.04 + recentTrades * 0.025) : 0.02;
  const k = Math.min(max, Math.round(total * share));
  return pickWindows(`amb-${asin}`, Math.max(k, recentTrades > 0 ? 1 : 0), total);
}

/** Windows a trade lights up: one for small trades, up to six for the biggest (€ volume, log). */
export function flashCount(volume: number): number {
  if (!(volume > 0)) return 1;
  return Math.max(1, Math.min(6, Math.floor(Math.log10(volume) / 2)));
}

/* ------------------------------------------------------------------ trades */

export interface TradeLike {
  id?: string;
  securityIdentifier?: string;
  price?: number;
  numberOfShares?: number;
  volume?: number;
  date?: number;
}

export const tradeId = (t: TradeLike) => t.id ?? `${t.securityIdentifier}-${t.date}`;

/** € volume of a trade; transfers at a token price count as nothing. */
export function tradeVolume(t: TradeLike): number {
  if (!t.price || t.price <= 0.01) return 0;
  return t.volume ?? t.price * (t.numberOfShares ?? 0);
}

/** Trades per security within `windowMs` before `now` (transfers left out). */
export function recentCounts(trades: TradeLike[], now: number, windowMs = 10 * 60_000): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of trades) {
    if ((t.date ?? 0) < now - windowMs || !(tradeVolume(t) > 0) || !t.securityIdentifier) continue;
    out.set(t.securityIdentifier, (out.get(t.securityIdentifier) ?? 0) + 1);
  }
  return out;
}

/**
 * Trades not seen before, oldest first – at most `max` (after a pause the city would otherwise light
 * up hundreds of windows at once).
 */
export function freshTrades<T extends TradeLike>(trades: T[], seen: ReadonlySet<string>, max = 24): T[] {
  return trades
    .filter((t) => !seen.has(tradeId(t)) && tradeVolume(t) > 0)
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, max)
    .reverse();
}

/* ------------------------------------------------------------------ sky */

/** Name of the edition by the hour – the news column is the city's newspaper. */
export function edition(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Morgenausgabe';
  if (hour >= 11 && hour < 17) return 'Mittagsausgabe';
  if (hour >= 17 && hour < 23) return 'Abendausgabe';
  return 'Nachtausgabe';
}

/** „gerade eben“, „vor 12 Min.“, „vor 3 Std.“, „vor 2 Tagen“. */
export function ago(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'vor 1 Tag' : `vor ${d} Tagen`;
}

/** „in 40 Min.“, „in 5 Std.“, „morgen 13:00“, „Fr. 13:00“. */
export function when(at: number, now: number): string {
  const diff = at - now;
  if (diff <= 0) return 'jetzt';
  const min = Math.round(diff / 60_000);
  if (min < 60) return `in ${Math.max(1, min)} Min.`;
  if (diff < 6 * 3_600_000) return `in ${Math.round(diff / 3_600_000)} Std.`;
  const d = new Date(at);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(new Date(now))) / 86_400_000);
  if (days === 0) return `heute ${time}`;
  if (days === 1) return `morgen ${time}`;
  const wd = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'][d.getDay()];
  return `${wd} ${time}`;
}

export interface CityEvent {
  key: string;
  kind: 'dividende' | 'fusion' | 'kapital' | 'chat' | 'tender';
  title: string;
  at: number;
  href: string;
  /** own security involved */
  own?: boolean;
  /** the company's security – links the event with its tower */
  asin?: string;
  /** short name for a bundle („EVERY. Cloud Services“) */
  subject?: string;
}

const PLURAL: Partial<Record<CityEvent['kind'], string>> = { dividende: 'Dividenden', fusion: 'Fusionen', kapital: 'Kapitalerhöhungen' };
const GROUP_HREF: Partial<Record<CityEvent['kind'], string>> = {
  dividende: '/kapitalmassnahmen?art=dividenden',
  fusion: '/kapitalmassnahmen?art=fusionen',
  kapital: '/kapitalmassnahmen?art=kapital',
};
const SAME_TIME = 15 * 60_000;

/**
 * Events of one kind due at about the same time (within 15 min) as one line: „4 Fusionen: A, B, …“.
 * Own events stay single, so they are never hidden in a bundle.
 */
export function bundleEvents(events: CityEvent[]): CityEvent[] {
  const out: CityEvent[] = [];
  const groups = new Map<string, CityEvent[]>();
  for (const e of events) {
    if (e.own || !PLURAL[e.kind]) {
      out.push(e);
      continue;
    }
    const key = `${e.kind}-${Math.round(e.at / SAME_TIME)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const first = list[0];
    out.push({
      key: `g-${first.key}`,
      kind: first.kind,
      title: `${list.length} ${PLURAL[first.kind]}: ${list.map((e) => e.subject ?? e.title).join(', ')}`,
      at: Math.min(...list.map((e) => e.at)),
      href: GROUP_HREF[first.kind] ?? first.href,
    });
  }
  return out;
}

/**
 * Upcoming events: chats (at = last message) first, then one of each kind before a second of any
 * (own ones first, then the soonest), bundled by `bundleEvents` – variety over four fusions in a row.
 */
export function nextEvents(events: CityEvent[], now: number, max = 4): CityEvent[] {
  const chats = events.filter((e) => e.kind === 'chat').sort((a, b) => b.at - a.at);
  const dated = bundleEvents(events.filter((e) => e.kind !== 'chat' && e.at > now)).sort(
    (a, b) => Number(!!b.own) - Number(!!a.own) || a.at - b.at,
  );
  const seen = new Set<string>();
  const firsts: CityEvent[] = [];
  const later: CityEvent[] = [];
  for (const e of dated) {
    (seen.has(e.kind) ? later : firsts).push(e);
    seen.add(e.kind);
  }
  return [...chats.slice(0, 2), ...firsts, ...later].slice(0, max);
}

/**
 * A chat worth announcing: someone else wrote last and that message is unread. The server's unread
 * count alone also counts one's own or already read last messages (seen: „1 neue“ five days later).
 */
export function isFreshUnread(
  c: { publicChat: boolean; numOfUnreadMessages: number; lastMessage?: { read?: boolean; sender?: { username?: string } } | null },
  me: string | undefined,
): boolean {
  if (c.publicChat || !(c.numOfUnreadMessages > 0) || !c.lastMessage) return false;
  if (c.lastMessage.read) return false;
  return !me || c.lastMessage.sender?.username !== me;
}

/** Securities an article is about: its listing and its publishing company. */
export function articleAsins(p: { listing?: { securityIdentifier?: string } | null; company?: { securityIdentifier?: string } | null }): string[] {
  return [...new Set([p.listing?.securityIdentifier, p.company?.securityIdentifier].filter((a): a is string => !!a))];
}

/** Share of the 24 h tender window already gone (0 … 1), for the clock in the sky. */
export function tenderProgress(endDate: number | undefined, now: number): number | null {
  if (!endDate) return null;
  const left = endDate - now;
  if (left <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - left / 86_400_000));
}

/** „3:12 Std.“ / „14 Min.“ until the tender closes. */
export function countdown(endDate: number, now: number): string {
  const min = Math.max(0, Math.round((endDate - now) / 60_000));
  if (min < 60) return `${min} Min.`;
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')} Std.`;
}
