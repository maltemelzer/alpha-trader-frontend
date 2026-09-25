// Market screener: one row shape for all sources, filters/sort/columns as compact URL parameters.
// Pure functions only – the page loads the sources, this file merges, filters and sorts them.
import type { MarketRow } from '../api/queries';
import type { ListingWithTradingVolumeView } from '../api/types';
import type { BondView, HighscoreEntry } from '../../vendor/bankiersgruen';
import { buildingSize, dailyYield } from '../security/derive';
import { short } from '../lib/format';
import { displayName } from './derive';

// ---------- Rows ----------

/** Type groups of the filter („Anleihen“ covers system bonds and tender bonds, „Repos“ system repos). */
export type Group = 'STOCK' | 'BOND' | 'REPO' | 'COIN' | 'INDEX' | 'ETF' | 'BUILDING' | 'WARRANT';

export const GROUPS: { value: Group; label: string; one: string }[] = [
  { value: 'STOCK', label: 'Aktien', one: 'Aktie' },
  { value: 'BOND', label: 'Anleihen', one: 'Anleihe' },
  { value: 'REPO', label: 'Repos', one: 'Repo' },
  { value: 'COIN', label: 'Coins', one: 'Coin' },
  { value: 'INDEX', label: 'Indizes', one: 'Index' },
  { value: 'ETF', label: 'ETFs', one: 'ETF' },
  { value: 'BUILDING', label: 'Immobilien', one: 'Immobilie' },
  { value: 'WARRANT', label: 'Optionsscheine', one: 'Optionsschein' },
];

export function groupOf(type: string | undefined): Group | null {
  switch (type) {
    case 'BOND':
    case 'SYSTEM_BOND':
    case 'INTEREST_TENDER_BOND':
      return 'BOND';
    case 'REPO':
    case 'SYSTEM_REPO':
      return 'REPO';
    case 'STOCK':
    case 'COIN':
    case 'INDEX':
    case 'ETF':
    case 'BUILDING':
    case 'WARRANT':
      return type;
    default:
      return null;
  }
}

/** One screener row; `null` = not known for this row (never mixed up with 0). */
export interface ScreenRow {
  asin: string;
  name: string;
  /** name as the API sends it (search matches it, e.g. „Building 1200“) */
  rawName: string;
  /** listing type as the API names it (for price formatting: bonds and repos in %) */
  type: string;
  group: Group;
  bid: number | null;
  bidSize: number | null;
  ask: number | null;
  askSize: number | null;
  last: number | null;
  /** (ask − bid) ÷ ask in %, only with both sides */
  spread: number | null;
  /** change in % as the server reports it (against the previous day) */
  change: number | null;
  /** traded volume in the last 24 h in € */
  volume: number | null;
  /** number of trades (most frequently traded list) */
  trades: number | null;
  /** companies: book value in € (company highscore) */
  bookValue: number | null;
  /** bonds/repos: interest until maturity in % */
  rate: number | null;
  /** bonds: yield per day at the ask in % */
  yieldPerDay: number | null;
  /** bonds/repos: maturity in ms */
  maturity: number | null;
  issuer: string | null;
  issuerAsin: string | null;
  /** buildings: size in m² */
  size: number | null;
  /** buildings: ask (or last price without ask) per m² */
  perSqm: number | null;
}

type Spreadish = {
  bidPrice?: number | null;
  bidSize?: number | null;
  askPrice?: number | null;
  askSize?: number | null;
  lastPrice?: { value?: number | null } | number | null;
};

const lastOf = (lp: Spreadish['lastPrice']) => (lp == null ? null : typeof lp === 'number' ? lp : (lp.value ?? null));

function spreadOf(bid: number | null, ask: number | null): number | null {
  if (bid == null || ask == null || !(ask > 0) || !(bid > 0)) return null;
  return ((ask - bid) / ask) * 100;
}

function base(asin: string, name: string, type: string, s: Spreadish | null | undefined): ScreenRow | null {
  const group = groupOf(type);
  if (!group || !asin) return null;
  const bid = s?.bidPrice ?? null;
  const ask = s?.askPrice ?? null;
  const last = lastOf(s?.lastPrice);
  const size = group === 'BUILDING' ? (buildingSize(name) ?? null) : null;
  const ref = ask ?? last;
  return {
    asin,
    name: displayName(name),
    rawName: name,
    type,
    group,
    bid,
    bidSize: s?.bidSize ?? null,
    ask,
    askSize: s?.askSize ?? null,
    last,
    spread: spreadOf(bid, ask),
    change: null,
    volume: null,
    trades: null,
    bookValue: null,
    rate: null,
    yieldPerDay: null,
    maturity: null,
    issuer: null,
    issuerAsin: null,
    size,
    perSqm: size && ref != null ? ref / size : null,
  };
}

/** A market list row (pricespreads, most traded, biggest traded) as a screener row. */
export function fromMarketRow(r: MarketRow): ScreenRow | null {
  return base(r.listing.securityIdentifier, r.listing.name, r.listing.type, r);
}

/** Running bonds as rows – bonds with their spread, repos (with `repos`) without prices. */
export function fromBonds(bonds: BondView[], now: number, repos = false): ScreenRow[] {
  const out: ScreenRow[] = [];
  for (const b of bonds) {
    if (!(b.maturityDate > now)) continue;
    const l = repos ? b.repurchaseListing : b.listing;
    if (!l) continue;
    const row = base(l.securityIdentifier, l.name, l.type ?? (repos ? 'REPO' : 'BOND'), repos ? null : (b.priceSpread as Spreadish));
    if (!row) continue;
    row.rate = b.interestRate ?? null;
    row.maturity = b.maturityDate;
    row.issuer = b.issuer?.name ?? null;
    row.issuerAsin = b.issuer?.securityIdentifier ?? null;
    if (!repos) row.yieldPerDay = dailyYield(row.ask, b.interestRate ?? 0, b.maturityDate - now) ?? null;
    out.push(row);
  }
  return out;
}

/** Lookup of a figure by ASIN; `complete` = the source listed every row that has one (others are 0). */
export interface Lookup {
  map: Map<string, number>;
  complete: boolean;
}

export const lookup = (entries: [string, number][], complete: boolean): Lookup => ({ map: new Map(entries), complete });

/** 24 h volumes (biggest traded securities); complete when the page held all of them. */
export function volumeLookup(content: ListingWithTradingVolumeView[] | undefined, total: number | undefined): Lookup | null {
  if (!content) return null;
  const entries = content
    .map((r): [string, number] => [r.listing?.securityIdentifier ?? r.securityIdentifier ?? '', r.volume ?? 0])
    .filter(([a]) => !!a);
  return lookup(entries, total != null && content.length >= total);
}

/** Trade counts (most frequently traded). */
export function tradesLookup(content: MarketRow[] | undefined, total: number | undefined): Lookup | null {
  if (!content) return null;
  return lookup(
    content.map((r) => [r.listing.securityIdentifier, r.count ?? 0]),
    total != null && content.length >= total,
  );
}

/**
 * Changes from the big-movers lists (winners first and losers first). Every listing with a change
 * is in one of them when both lists reach a 0 – then all others are unchanged.
 */
export function changeLookup(winners: MarketRow[] | undefined, losers: MarketRow[] | undefined): Lookup | null {
  if (!winners || !losers) return null;
  const entries: [string, number][] = [];
  for (const r of [...winners, ...losers]) {
    if (r.priceChangeInPercent != null) entries.push([r.listing.securityIdentifier, r.priceChangeInPercent]);
  }
  const reachedZero = (rows: MarketRow[]) => !rows.length || (rows[rows.length - 1].priceChangeInPercent ?? 0) === 0;
  return lookup(entries, reachedZero(winners) && reachedZero(losers));
}

/** Book values of the largest companies (company highscore BOOK_VALUE), by the company's ASIN. */
export function bookLookup(entries: HighscoreEntry[] | undefined): Lookup | null {
  if (!entries) return null;
  return lookup(
    entries.filter((e) => e.company?.securityIdentifier).map((e) => [e.company!.securityIdentifier!, e.value]),
    false,
  );
}

function pick(l: Lookup | null | undefined, asin: string): number | null {
  if (!l) return null;
  const v = l.map.get(asin);
  return v != null ? v : l.complete ? 0 : null;
}

/** Merges row lists (first occurrence of an ASIN wins, later lists fill its gaps) and adds the lookups. */
export function mergeRows(
  lists: (ScreenRow | null)[][],
  add: { volume?: Lookup | null; trades?: Lookup | null; change?: Lookup | null; book?: Lookup | null },
): ScreenRow[] {
  const byAsin = new Map<string, ScreenRow>();
  for (const list of lists) {
    for (const r of list) {
      if (!r) continue;
      const seen = byAsin.get(r.asin);
      if (!seen) byAsin.set(r.asin, { ...r });
      else for (const k of Object.keys(r) as (keyof ScreenRow)[]) if (seen[k] == null && r[k] != null) (seen as unknown as Record<string, unknown>)[k] = r[k];
    }
  }
  const rows = [...byAsin.values()];
  for (const r of rows) {
    r.volume ??= pick(add.volume, r.asin);
    r.trades ??= pick(add.trades, r.asin);
    // Bonds and repos are not in the movers lists; indexes and ETFs are.
    if (r.group !== 'BOND' && r.group !== 'REPO') r.change ??= pick(add.change, r.asin);
    if (r.group === 'STOCK') r.bookValue ??= pick(add.book, r.asin);
  }
  return rows;
}

// ---------- Filter state (URL) ----------

export interface Range {
  min?: number;
  max?: number;
}

export type Quote = '' | 'brief' | 'geld' | 'beide';

export type ColKey = 'kurs' | 'ver' | 'geld' | 'brief' | 'spr' | 'ums' | 'tr' | 'bw' | 'zins' | 'rt' | 'lz' | 'em' | 'gr' | 'qm';

export type RangeKey = 'kurs' | 'ver' | 'spr' | 'ums' | 'tr' | 'bw' | 'zins' | 'rt' | 'lz' | 'qm';

export interface Screen {
  /** empty = all types */
  types: Group[];
  q: string;
  ranges: Partial<Record<RangeKey, Range>>;
  quote: Quote;
  issuer: string;
  sizes: number[];
  sort: { key: ColKey | 'name'; dir: 'asc' | 'desc' } | null;
  /** chosen columns, null = the default for the types */
  cols: ColKey[] | null;
}

/** URL parameters owned by the screener (a preset or „Zurücksetzen“ clears all of them). */
export const SCREEN_KEYS = ['art', 'q', 'kurs', 'ver', 'spr', 'ums', 'tr', 'bw', 'zins', 'rt', 'lz', 'qm', 'mit', 'em', 'gr', 'sort', 'sp', 'seite'] as const;

export const RANGE_KEYS: RangeKey[] = ['kurs', 'ver', 'spr', 'ums', 'tr', 'bw', 'zins', 'rt', 'lz', 'qm'];

const num = (s: string) => {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/** „10..50“, „10..“, „..50“, „-5..5“ → range; anything else → undefined. */
export function parseRange(s: string | null | undefined): Range | undefined {
  if (!s) return undefined;
  const m = s.match(/^([^.]*(?:\.\d+)?)\.\.(.*)$/);
  if (!m) return undefined;
  const r: Range = { min: num(m[1]), max: num(m[2]) };
  return r.min == null && r.max == null ? undefined : r;
}

const plain = (n: number) => String(Math.round(n * 1e8) / 1e8);

export function formatRange(r: Range | undefined): string | null {
  if (!r || (r.min == null && r.max == null)) return null;
  return `${r.min != null ? plain(r.min) : ''}..${r.max != null ? plain(r.max) : ''}`;
}

const COL_KEYS: ColKey[] = ['kurs', 'ver', 'geld', 'brief', 'spr', 'ums', 'tr', 'bw', 'zins', 'rt', 'lz', 'em', 'gr', 'qm'];

/** Reads the screener from the URL. Without `art` it shows shares (as before), `art=alle` all types. */
export function readScreen(p: URLSearchParams): Screen {
  const art = p.get('art');
  const types =
    art == null
      ? (['STOCK'] as Group[])
      : art === 'alle'
        ? []
        : [...new Set(art.split(',').map((t) => groupOf(t.trim().toUpperCase())).filter((g): g is Group => !!g))];
  const ranges: Screen['ranges'] = {};
  for (const k of RANGE_KEYS) {
    const r = parseRange(p.get(k));
    if (r) ranges[k] = r;
  }
  const mit = p.get('mit');
  const sortRaw = p.get('sort');
  let sort: Screen['sort'] = null;
  if (sortRaw) {
    const desc = sortRaw.startsWith('-');
    const key = sortRaw.replace(/^-/, '');
    if (key === 'name' || (COL_KEYS as string[]).includes(key)) sort = { key: key as ColKey | 'name', dir: desc ? 'desc' : 'asc' };
  }
  const sp = p.get('sp');
  return {
    types,
    q: p.get('q') ?? '',
    ranges,
    quote: mit === 'brief' || mit === 'geld' || mit === 'beide' ? mit : '',
    issuer: p.get('em') ?? '',
    sizes: (p.get('gr') ?? '')
      .split(',')
      .map(Number)
      .filter((n) => n > 0),
    sort,
    cols: sp ? (sp.split(',').filter((c) => (COL_KEYS as string[]).includes(c)) as ColKey[]) : null,
  };
}

/** `art` value of a type selection. */
export function typesParam(types: Group[]): string {
  return types.length ? types.join(',') : 'alle';
}

export const sortParam = (s: Screen['sort']) => (s ? `${s.dir === 'desc' ? '-' : ''}${s.key}` : null);

/** Toggles a type; with „all“ selected a click picks just that type. */
export function toggleType(types: Group[], g: Group): Group[] {
  // Warrants have their own view (listed per underlying only), so they are chosen alone.
  if (g === 'WARRANT') return types.length === 1 && types[0] === 'WARRANT' ? [] : ['WARRANT'];
  if (!types.length || (types.length === 1 && types[0] === 'WARRANT')) return [g];
  const next = types.includes(g) ? types.filter((t) => t !== g) : [...types, g];
  return GROUPS.map((x) => x.value).filter((v) => next.includes(v));
}

const has = (types: Group[], ...g: Group[]) => !types.length || g.some((x) => types.includes(x));
const only = (types: Group[], ...g: Group[]) => types.length > 0 && types.every((t) => g.includes(t));

/** Filters that make sense for the chosen types (the filter sheet shows only these sections). */
export function sections(types: Group[]) {
  return {
    company: has(types, 'STOCK'),
    bonds: has(types, 'BOND', 'REPO'),
    buildings: has(types, 'BUILDING'),
  };
}

// ---------- Columns ----------

export interface ColumnDef {
  key: ColKey;
  label: string;
  /** shorter label for chips and the phone list */
  short: string;
  unit: string;
  /** types for which the column carries values (empty = all) */
  for: Group[];
  value: (r: ScreenRow) => number | string | null;
  /** first sort direction */
  dir: 'asc' | 'desc';
}

export const COLUMNS: ColumnDef[] = [
  { key: 'kurs', label: 'Kurs', short: 'Kurs', unit: '€', for: [], value: (r) => r.last, dir: 'desc' },
  { key: 'ver', label: 'Veränd. Tag', short: 'Veränd.', unit: '%', for: [], value: (r) => r.change, dir: 'desc' },
  { key: 'geld', label: 'Geld', short: 'Geld', unit: '€', for: [], value: (r) => r.bid, dir: 'desc' },
  { key: 'brief', label: 'Brief', short: 'Brief', unit: '€', for: [], value: (r) => r.ask, dir: 'asc' },
  { key: 'spr', label: 'Spread', short: 'Spread', unit: '%', for: [], value: (r) => r.spread, dir: 'asc' },
  { key: 'ums', label: 'Umsatz 24 h', short: 'Umsatz', unit: '€', for: [], value: (r) => r.volume, dir: 'desc' },
  { key: 'tr', label: 'Trades', short: 'Trades', unit: '', for: [], value: (r) => r.trades, dir: 'desc' },
  { key: 'bw', label: 'Buchwert', short: 'Buchwert', unit: '€', for: ['STOCK'], value: (r) => r.bookValue, dir: 'desc' },
  { key: 'zins', label: 'Zins bis Fälligkeit', short: 'Zins', unit: '%', for: ['BOND', 'REPO'], value: (r) => r.rate, dir: 'desc' },
  { key: 'rt', label: 'Rendite / Tag', short: 'Rendite/Tag', unit: '%', for: ['BOND'], value: (r) => r.yieldPerDay, dir: 'desc' },
  { key: 'lz', label: 'Restlaufzeit', short: 'Laufzeit', unit: 'T', for: ['BOND', 'REPO'], value: (r) => r.maturity, dir: 'asc' },
  { key: 'em', label: 'Emittent', short: 'Emittent', unit: '', for: ['BOND', 'REPO'], value: (r) => r.issuer, dir: 'asc' },
  { key: 'gr', label: 'Größe', short: 'Größe', unit: 'm²', for: ['BUILDING'], value: (r) => r.size, dir: 'desc' },
  { key: 'qm', label: 'Preis je m²', short: 'je m²', unit: '€', for: ['BUILDING'], value: (r) => r.perSqm, dir: 'asc' },
];

export const column = (k: ColKey) => COLUMNS.find((c) => c.key === k)!;

/** Default columns: bonds and buildings get their own figures, everything else the market figures. */
export function defaultColumns(types: Group[]): ColKey[] {
  // The issuer, rate and maturity date are part of a bond's name – the columns make them sortable.
  if (only(types, 'BOND')) return ['kurs', 'brief', 'zins', 'rt', 'lz'];
  if (only(types, 'REPO', 'BOND')) return ['kurs', 'brief', 'zins', 'lz', 'em'];
  if (only(types, 'BUILDING')) return ['kurs', 'brief', 'gr', 'qm', 'ums'];
  if (only(types, 'INDEX')) return ['kurs', 'ver', 'tr'];
  // Five figures fit next to the name at 1280 px; Geld and Trades are one click away („Spalten“).
  return ['kurs', 'ver', 'brief', 'spr', 'ums'];
}

/** Columns shown: the chosen ones (in table order) or the default. */
export function visibleColumns(s: Screen): ColKey[] {
  const chosen = s.cols?.length ? s.cols : defaultColumns(s.types);
  return COL_KEYS.filter((k) => chosen.includes(k));
}

/** Columns offered for the types (others stay empty and are not offered). */
export function offeredColumns(types: Group[]): ColumnDef[] {
  return COLUMNS.filter((c) => !c.for.length || has(types, ...c.for));
}

export function defaultSort(types: Group[]): NonNullable<Screen['sort']> {
  if (only(types, 'BOND')) return { key: 'rt', dir: 'desc' };
  if (only(types, 'REPO', 'BOND')) return { key: 'lz', dir: 'asc' };
  if (only(types, 'INDEX')) return { key: 'name', dir: 'asc' };
  return { key: 'ums', dir: 'desc' };
}

// ---------- Filter and sort ----------

const DAY = 86_400_000;

/** Value a range filter tests (Restlaufzeit in days). */
export function rangeValue(k: RangeKey, r: ScreenRow, now: number): number | null {
  switch (k) {
    case 'kurs':
      return r.last;
    case 'ver':
      return r.change;
    case 'spr':
      return r.spread;
    case 'ums':
      return r.volume;
    case 'tr':
      return r.trades;
    case 'bw':
      return r.bookValue;
    case 'zins':
      return r.rate;
    case 'rt':
      return r.yieldPerDay;
    case 'lz':
      return r.maturity == null ? null : (r.maturity - now) / DAY;
    case 'qm':
      return r.perSqm;
  }
}

/** Which rows a range applies to – a bond filter does not remove shares when both are listed. */
const RANGE_FOR: Partial<Record<RangeKey, Group[]>> = {
  bw: ['STOCK'],
  zins: ['BOND', 'REPO'],
  rt: ['BOND'],
  lz: ['BOND', 'REPO'],
  qm: ['BUILDING'],
};

export function matchesText(r: ScreenRow, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return true;
  return r.name.toLowerCase().includes(t) || r.rawName.toLowerCase().includes(t) || r.asin.toLowerCase().includes(t) || (r.issuer?.toLowerCase().includes(t) ?? false);
}

export function applyScreen(rows: ScreenRow[], s: Screen, now: number): ScreenRow[] {
  const issuer = s.issuer.trim().toLowerCase();
  return rows.filter((r) => {
    if (s.types.length && !s.types.includes(r.group)) return false;
    if (!matchesText(r, s.q)) return false;
    if ((s.quote === 'brief' || s.quote === 'beide') && !((r.askSize ?? 0) > 0)) return false;
    if ((s.quote === 'geld' || s.quote === 'beide') && !((r.bidSize ?? 0) > 0)) return false;
    for (const k of RANGE_KEYS) {
      const range = s.ranges[k];
      if (!range) continue;
      const scope = RANGE_FOR[k];
      if (scope && !scope.includes(r.group)) continue;
      const v = rangeValue(k, r, now);
      if (v == null) return false;
      if (range.min != null && v < range.min) return false;
      if (range.max != null && v > range.max) return false;
    }
    if (issuer && (r.group === 'BOND' || r.group === 'REPO') && !(r.issuer ?? '').toLowerCase().includes(issuer)) return false;
    if (s.sizes.length && r.group === 'BUILDING' && !(r.size != null && s.sizes.includes(r.size))) return false;
    return true;
  });
}

/** Sort value of a column (null = unknown, always last – like DataTable). */
export function sortValue(key: ColKey | 'name', r: ScreenRow): number | string | null {
  if (key === 'name') return r.name;
  return column(key).value(r);
}

export function sortRows(rows: ScreenRow[], sort: NonNullable<Screen['sort']>): ScreenRow[] {
  const mul = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(sort.key, a);
    const y = sortValue(sort.key, b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
    return String(x).localeCompare(String(y), 'de', { sensitivity: 'base' }) * mul;
  });
}

// ---------- Chips ----------

export interface Chip {
  /** URL parameter to delete */
  key: string;
  label: string;
}

const de = (n: number, d = 2) => n.toLocaleString('de-DE', { maximumFractionDigits: d });
const MINUS = '−';
const signed = (n: number, d = 2) => (n < 0 ? MINUS + de(-n, d) : de(n, d));
const money = (n: number) => (Math.abs(n) >= 1e6 ? short(n) : de(n));

const LABEL: Record<RangeKey, { name: string; fmt: (n: number) => string; unit: string }> = {
  kurs: { name: 'Kurs', fmt: (n) => money(n), unit: '€' },
  ver: { name: 'Veränd.', fmt: (n) => signed(n), unit: '%' },
  spr: { name: 'Spread', fmt: (n) => de(n), unit: '%' },
  ums: { name: 'Umsatz', fmt: (n) => money(n), unit: '€' },
  tr: { name: 'Trades', fmt: (n) => de(n, 0), unit: '' },
  bw: { name: 'Buchwert', fmt: (n) => money(n), unit: '€' },
  zins: { name: 'Zins', fmt: (n) => de(n, 4), unit: '%' },
  rt: { name: 'Rendite/Tag', fmt: (n) => de(n, 3), unit: '%' },
  lz: { name: 'Laufzeit', fmt: (n) => de(n), unit: 'T' },
  qm: { name: 'je m²', fmt: (n) => money(n), unit: '€' },
};

export function rangeText(k: RangeKey, r: Range): string {
  const { name, fmt, unit } = LABEL[k];
  const u = unit ? `\u00a0${unit}` : '';
  if (r.min != null && r.max != null) return `${name} ${fmt(r.min)}–${fmt(r.max)}${u}`;
  if (r.min != null) return `${name} ≥ ${fmt(r.min)}${u}`;
  return `${name} ≤ ${fmt(r.max!)}${u}`;
}

const QUOTE_TEXT: Record<Exclude<Quote, ''>, string> = { brief: 'mit Brief', geld: 'mit Geld', beide: 'Brief und Geld' };

/** Active filters (besides types and search) as removable chips. */
export function chips(s: Screen): Chip[] {
  const out: Chip[] = [];
  if (s.quote) out.push({ key: 'mit', label: QUOTE_TEXT[s.quote] });
  for (const k of RANGE_KEYS) {
    const r = s.ranges[k];
    if (r) out.push({ key: k, label: rangeText(k, r) });
  }
  if (s.issuer.trim()) out.push({ key: 'em', label: `Emittent: ${s.issuer.trim()}` });
  if (s.sizes.length) out.push({ key: 'gr', label: `Größe ${s.sizes.map((n) => de(n, 0)).join(', ')}\u00a0m²` });
  return out;
}

// ---------- Presets ----------

export interface Preset {
  id: string;
  label: string;
  description: string;
  params: Record<string, string>;
}

export const PRESETS: Preset[] = [
  { id: 'meist', label: 'Meistgehandelt', description: 'Alle Arten nach Zahl der Trades', params: { art: 'alle', sort: '-tr' } },
  {
    id: 'gewinner',
    label: 'Größte Gewinner',
    description: 'Heute gehandelt, mit Brief und Geld',
    params: { art: 'alle', mit: 'beide', ums: '1..', sort: '-ver' },
  },
  {
    id: 'verlierer',
    label: 'Größte Verlierer',
    description: 'Heute gehandelt, mit Brief und Geld',
    params: { art: 'alle', mit: 'beide', ums: '1..', sort: 'ver' },
  },
  {
    id: 'spread',
    label: 'Enge Spreads',
    description: 'Aktien mit Brief und Geld, heute gehandelt',
    params: { art: 'STOCK', mit: 'beide', ums: '1..', sort: 'spr' },
  },
  {
    id: 'rendite',
    label: 'Anleihen mit Rendite',
    description: 'Kaufbar, noch mindestens eine Stunde',
    params: { art: 'BOND', mit: 'brief', lz: `${plain(1 / 24)}..`, sort: '-rt' },
  },
  {
    id: 'immo',
    label: 'Günstige Immobilien',
    description: 'Angebote nach Preis je m²',
    params: { art: 'BUILDING', mit: 'brief', sort: 'qm' },
  },
];

/** URL changes that apply a preset: all screener keys cleared, the preset's set. */
export function presetChanges(p: Preset): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const k of SCREEN_KEYS) out[k] = null;
  return { ...out, ...p.params };
}

/** The preset the URL matches exactly (search and columns do not count). */
export function activePreset(p: URLSearchParams): Preset | undefined {
  const own = SCREEN_KEYS.filter((k) => k !== 'q' && k !== 'sp' && k !== 'seite');
  return PRESETS.find((x) => own.every((k) => (p.get(k) ?? undefined) === x.params[k]));
}

/** Number of active filters for the badge – the types are visible as toggles and do not count. */
export function filterCount(s: Screen): number {
  return chips(s).length;
}

// ---------- Market map ----------

export interface MapNode {
  id: string;
  parent: string;
  label: string;
  /** tile area: fourth root of the volume for leaves, 0 for groups (Plotly adds up the children) */
  area: number;
  volume: number;
  change: number | null;
  /** leaves only */
  asin: string;
  last: number | null;
  type: string;
}

/**
 * All securities traded in 24 h as a treemap: groups by type (buildings once more by size), inside
 * each group one tile per security. The compressed area (`area`, e.g. the fourth root) applies on
 * every level: a group's share follows area(group volume) against its siblings, and its tiles split
 * that share by area(volume) – otherwise hundreds of small buildings would outweigh a few big shares.
 * Leaves carry the areas, groups 0 (Plotly adds them up). Groups and tiles ordered by volume.
 */
export function marketMap(rows: ScreenRow[], area: (v: number) => number): MapNode[] {
  const groups = new Map<string, { label: string; parent: string; volume: number }>();
  const leaves: MapNode[] = [];
  for (const r of rows) {
    const v = r.volume ?? 0;
    if (!(v > 0)) continue;
    const gid = `g:${r.group}`;
    const sub = r.group === 'BUILDING' && r.size ? `${gid}:${r.size}` : null;
    const top = groups.get(gid) ?? { label: GROUPS.find((x) => x.value === r.group)!.label, parent: '', volume: 0 };
    top.volume += v;
    groups.set(gid, top);
    if (sub) {
      const s = groups.get(sub) ?? { label: `${r.size!.toLocaleString('de-DE')}\u00a0m²`, parent: gid, volume: 0 };
      s.volume += v;
      groups.set(sub, s);
    }
    leaves.push({ id: r.asin, parent: sub ?? gid, label: r.name, area: 0, volume: v, change: r.change, asin: r.asin, last: r.last, type: r.type });
  }
  // Share of each node among its siblings, then multiplied down from the top.
  const nodes = [...groups.entries()].map(([id, g]) => ({ id, parent: g.parent, volume: g.volume }));
  const all = [...nodes, ...leaves];
  const siblings = new Map<string, number>();
  for (const n of all) siblings.set(n.parent, (siblings.get(n.parent) ?? 0) + area(n.volume));
  const share = new Map<string, number>();
  const shareOf = (parent: string, volume: number): number => {
    const own = area(volume) / (siblings.get(parent) || 1);
    if (!parent) return own;
    const p = groups.get(parent)!;
    if (!share.has(parent)) share.set(parent, shareOf(p.parent, p.volume));
    return own * share.get(parent)!;
  };
  for (const l of leaves) l.area = shareOf(l.parent, l.volume) * 1000;
  const groupNodes: MapNode[] = [...groups.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .map(([id, g]) => ({ id, parent: g.parent, label: g.label, area: 0, volume: g.volume, change: null, asin: '', last: null, type: '' }));
  return [...groupNodes, ...leaves.sort((a, b) => b.volume - a.volume)];
}

// ---------- Distributions for the filter sheet ----------

export interface Bin {
  from: number;
  to: number;
  count: number;
}

/** How each range is binned: log scale for amounts spanning orders of magnitude, clipped linear otherwise. */
export const HIST: Record<RangeKey, { log?: boolean; lo?: number; hi?: number }> = {
  kurs: { log: true },
  ver: { lo: -30, hi: 30 },
  spr: { lo: 0, hi: 10 },
  ums: { log: true },
  tr: { log: true },
  bw: { log: true },
  zins: { lo: 0 },
  rt: { log: true },
  lz: { lo: 0 },
  qm: { log: true },
};

/**
 * Histogram of the values of one range filter. Log scale: only positive values, edges evenly in
 * log10. Linear: values outside lo/hi go into the first/last bin. Empty without at least two values.
 */
export function histogram(values: number[], opt: { log?: boolean; lo?: number; hi?: number }, bins = 24): Bin[] {
  const xs = values.filter((v) => Number.isFinite(v) && (!opt.log || v > 0));
  if (xs.length < 2) return [];
  const f = opt.log ? Math.log10 : (v: number) => v;
  const inv = opt.log ? (v: number) => 10 ** v : (v: number) => v;
  let lo = opt.lo ?? Infinity;
  let hi = opt.hi ?? -Infinity;
  if (opt.lo == null || opt.hi == null) {
    for (const x of xs) {
      if (opt.lo == null) lo = Math.min(lo, x);
      if (opt.hi == null) hi = Math.max(hi, x);
    }
  }
  const a = f(lo);
  const b = f(hi);
  if (!(b > a)) return [{ from: lo, to: hi, count: xs.length }];
  const w = (b - a) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({ from: inv(a + i * w), to: inv(a + (i + 1) * w), count: 0 }));
  for (const x of xs) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((f(x) - a) / w)));
    out[i].count++;
  }
  return out;
}

/** A bin lies (partly) inside the chosen range. */
export function inRange(b: Bin, r: Range | undefined): boolean {
  if (!r) return false;
  return (r.min == null || b.to > r.min) && (r.max == null || b.from <= r.max);
}
