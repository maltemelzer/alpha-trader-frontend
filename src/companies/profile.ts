// Pure logic for the company profile's „Einordnung“ (where the company stands among all companies,
// from GET /api/v2/companyhistograms/{companyId}) and „Chronik“ (GET /api/v2/history?entityId=).
import { translate, type ApiMessage } from '../lib/messages';

// ---------- Einordnung (histograms) ----------

/** HistogramView: bins as „[lower,upper]“ → count, the company's value, its bin and its decile (1 = lowest tenth). */
export interface HistogramView {
  highlightValue?: number;
  histogram?: Record<string, number>;
  highlightRange?: { lowerBound?: number; upperBound?: number };
  decile?: number;
}

export type HistogramKey =
  | 'bookValue'
  | 'netCash'
  | 'cash'
  | 'cashFlow'
  | 'tradeVolume'
  | 'outstandingShares'
  | 'sharesInBuys'
  | 'sharesInSells'
  | 'bondsVolume'
  | 'reposVolume'
  | 'systemReposVolume'
  | 'centralBankReserves';

/** CompanyHistogramView: one histogram per figure (`<key>Histogram`). */
export type CompanyHistograms = { company?: { id?: string; name?: string } } & { [K in `${HistogramKey}Histogram`]?: HistogramView };

export interface HistogramMetric {
  key: HistogramKey;
  label: string;
  /** money in €, or a number of shares */
  unit: '€' | 'Stk.';
  /** only shown when the company has a value (most companies have no bonds, repos or reserves) */
  optional?: boolean;
  /**
   * Who the company is compared with. The company figures count ~9.500 companies; the listing
   * figures (turnover, shares, orders) count all ~200.000 securities – buildings (1 share), bonds
   * and repos (~1.000 each) included –, so every stock lands in the top tenth of „Aktien im Umlauf“.
   */
  population: 'companies' | 'securities';
}

// The values are those of the latest daily snapshot (/api/v2/historizedcompanydata, ~18:50), not the
// live profile. closePriceHistogram is left out: its value is the day's close, but its bins reach
// −100 and count ~200.000 entries (all listings, bonds in %) – no fair comparison between companies.
// Company figures first, then those compared with all securities.
export const HISTOGRAM_METRICS: HistogramMetric[] = [
  { key: 'bookValue', label: 'Buchwert', unit: '€', population: 'companies' },
  { key: 'netCash', label: 'Net Cash', unit: '€', population: 'companies' },
  { key: 'cash', label: 'Bargeld', unit: '€', population: 'companies' },
  { key: 'cashFlow', label: 'Cashflow', unit: '€', population: 'companies' },
  { key: 'bondsVolume', label: 'Anleihen im Depot', unit: '€', optional: true, population: 'companies' },
  { key: 'reposVolume', label: 'Repos (netto)', unit: '€', optional: true, population: 'companies' },
  { key: 'systemReposVolume', label: 'System-Repos (netto)', unit: '€', optional: true, population: 'companies' },
  { key: 'centralBankReserves', label: 'Zentralbank-Einlage', unit: '€', optional: true, population: 'companies' },
  { key: 'tradeVolume', label: 'Handelsumsatz', unit: '€', population: 'securities' },
  { key: 'outstandingShares', label: 'Aktien im Umlauf', unit: 'Stk.', population: 'securities' },
  { key: 'sharesInBuys', label: 'In Kauforders', unit: 'Stk.', optional: true, population: 'securities' },
  { key: 'sharesInSells', label: 'In Verkaufsorders', unit: 'Stk.', optional: true, population: 'securities' },
];

export const POPULATION_LABEL: Record<HistogramMetric['population'], string> = {
  companies: 'der Unternehmen',
  securities: 'aller Wertpapiere',
};

export interface Bin {
  lo: number;
  hi: number;
  count: number;
}

/** „[−5,38]“ → bins sorted by their lower bound; malformed keys are skipped. */
export function parseBins(histogram: Record<string, number> | undefined): Bin[] {
  const out: Bin[] = [];
  for (const [k, count] of Object.entries(histogram ?? {})) {
    const m = k.match(/^\[\s*(-?[\d.eE+]+)\s*,\s*(-?[\d.eE+]+)\s*\]$/);
    if (m) out.push({ lo: Number(m[1]), hi: Number(m[2]), count });
  }
  return out.sort((a, b) => a.lo - b.lo);
}

/** Index of the company's bin: the one matching highlightRange, else the one containing the value; −1 if none. */
export function highlightBin(bins: Bin[], h: Pick<HistogramView, 'highlightValue' | 'highlightRange'>): number {
  const r = h.highlightRange;
  if (r?.lowerBound != null && r.upperBound != null) {
    const i = bins.findIndex((b) => b.lo === r.lowerBound && b.hi === r.upperBound);
    if (i >= 0) return i;
  }
  const v = h.highlightValue;
  if (v == null) return -1;
  return bins.findIndex((b) => v >= b.lo && v <= b.hi);
}

/**
 * Where the company stands, as shares (0–1) of the whole distribution: entries in lower bins
 * (`below`), in its own bin (`same`), in higher bins (`above`), and `share` – the best estimate of
 * the fraction with a lower value.
 *
 * The API's decile is ⌊fraction strictly below × 10⌋ + 1 over the exact values (checked against the
 * bins of Alphakasse SE, lalaland72, Aykoc, georgysorosi96 and Prime Reserve Bank: it always falls
 * inside the company's bin), so it narrows the position within the bin: `share` is the middle of
 * bin ∩ decile. Where many companies share a value (77 % have a cash flow of 0, 91 % no bonds) the
 * decile says 1 = „untere 10 %“ although the company is level with most – `tied` marks that case.
 */
export interface Standing {
  below: number;
  same: number;
  above: number;
  share: number;
  /** the company's bin holds a quarter or more of all entries – read as „gleichauf mit …“ */
  tied: boolean;
}

export function standing(bins: Bin[], highlight: number, decile?: number): Standing | undefined {
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (!total || highlight < 0 || highlight >= bins.length) return undefined;
  const below = bins.slice(0, highlight).reduce((s, b) => s + b.count, 0) / total;
  const same = bins[highlight].count / total;
  const above = Math.max(0, 1 - below - same);
  let lo = below;
  let hi = below + same;
  if (decile && decile >= 1 && decile <= 10) {
    const dlo = Math.max(lo, (decile - 1) / 10);
    const dhi = Math.min(hi, decile / 10);
    if (dlo <= dhi) [lo, hi] = [dlo, dhi];
  }
  return { below, same, above, share: (lo + hi) / 2, tied: same >= 0.25 };
}

const NBSP = String.fromCharCode(0xa0);
/** whole percent, never 0 or 100 – „mehr als 100 %“ would be wrong */
const pct = (x: number) => Math.min(99, Math.max(1, Math.floor(x * 100)));

/** „mehr als 87 % der Unternehmen“, „weniger als 60 % aller Wertpapiere“, „gleichauf mit 77 % der Unternehmen“. */
export function standingText(s: Standing | undefined, population: HistogramMetric['population'] = 'companies', withWho = true): string {
  if (!s) return '–';
  const who = withWho ? ` ${POPULATION_LABEL[population]}` : '';
  if (s.tied) return `gleichauf mit ${pct(s.same)}${NBSP}%${who}`;
  return s.share >= 0.5 ? `mehr als ${pct(s.share)}${NBSP}%${who}` : `weniger als ${pct(1 - s.share)}${NBSP}%${who}`;
}

export interface RankRow extends HistogramMetric {
  value: number;
  decile: number;
  bins: Bin[];
  highlight: number;
  /** number of entries in the whole distribution */
  total: number;
  standing?: Standing;
}

/** One row per figure the API sent (companies first, then all securities); optional figures only when the company has a value. */
export function rankRows(h: CompanyHistograms | undefined): RankRow[] {
  if (!h) return [];
  const rows: RankRow[] = [];
  for (const m of HISTOGRAM_METRICS) {
    const v = h[`${m.key}Histogram`];
    if (!v || v.highlightValue == null || !v.histogram) continue;
    if (m.optional && !v.highlightValue) continue;
    const bins = parseBins(v.histogram);
    const highlight = highlightBin(bins, v);
    rows.push({
      ...m,
      value: v.highlightValue,
      decile: v.decile ?? 0,
      bins,
      highlight,
      total: bins.reduce((s, b) => s + b.count, 0),
      standing: standing(bins, highlight, v.decile),
    });
  }
  return rows;
}

/** A share (0–1) as a readable percentage: „53 %“, „0,4 %“, „99,6 %“, „< 0,1 %“, „> 99,9 %“, „0 %“. */
export function sharePct(x: number): string {
  if (!(x > 0)) return `0${NBSP}%`;
  if (x >= 1) return `100${NBSP}%`;
  if (x < 0.001) return `<${NBSP}0,1${NBSP}%`;
  if (x > 0.999) return `>${NBSP}99,9${NBSP}%`;
  const p = x * 100;
  return `${p.toLocaleString('de-DE', { maximumFractionDigits: p < 10 || p > 90 ? 1 : 0 })}${NBSP}%`;
}

/** 645813 → 650000, 10323346 → 10000000: bin edges to two significant digits for axis labels. */
export function roundEdge(n: number): number {
  if (!n) return 0;
  const p = 10 ** (Math.floor(Math.log10(Math.abs(n))) - 1);
  return Math.round(n / p) * p;
}

// ---------- Chronik (history entries) ----------

export type HistoryType = string;

/** HistoryEntryView */
export interface HistoryEntry {
  id?: string;
  type?: HistoryType;
  content?: ApiMessage;
  date?: number;
  entityId?: string;
}

/** Lanes of the timeline, top to bottom. */
export const HISTORY_LANES = ['Meilensteine', 'Kapital', 'Fusionen', 'Fonds', 'CEO', 'Name & Logo', 'Allianz', 'Sonstiges'] as const;
export type HistoryLane = (typeof HISTORY_LANES)[number];

const LANE: Record<string, HistoryLane> = {
  COMPANY_CREATED: 'Meilensteine',
  USER_CREATED: 'Meilensteine',
  BANK_LICENSE_GRANTED: 'Meilensteine',
  COMPANY_CASH_OUT_STARTED: 'Meilensteine',
  COMPANY_LIQUIDATED: 'Meilensteine',
  COMPANY_CAPITAL_INCREASE: 'Kapital',
  COMPANY_CAPITAL_REDUCTION: 'Kapital',
  COMPANY_DIVIDEND_PAYMENT: 'Kapital',
  COMPANY_BOND_STOCKS_ISSUED: 'Kapital',
  COMPANY_MERGER: 'Fusionen',
  COMPANY_CEO_CHANGED: 'CEO',
  COMPANY_NAME_CHANGED: 'Name & Logo',
  COMPANY_LOGO_CHANGED: 'Name & Logo',
  USERNAME_CHANGED: 'Name & Logo',
  ALLIANCE_MEMBERSHIP_START: 'Allianz',
  ALLIANCE_MEMBERSHIP_END: 'Allianz',
  ALLIANCE_CREATED: 'Allianz',
  ALLIANCE_MEMBERSHIP_CHANGE: 'Allianz',
  ALLIANCE_LOGO_CHANGED: 'Allianz',
  ALLIANCE_NAME_CHANGED: 'Allianz',
};

export function historyLane(type: HistoryType | undefined): HistoryLane {
  if (!type) return 'Sonstiges';
  return LANE[type] ?? (type.startsWith('ETF_') ? 'Fonds' : 'Sonstiges');
}

export interface ChronicleEvent {
  id: string;
  date: number;
  lane: HistoryLane;
  text: string;
  /** the same CEO re-hired at a new salary, not a change of person */
  minor: boolean;
}

/** Entries as timeline events, oldest first. Logo changes carry image URLs in the text – the translation drops them. */
export function chronicle(entries: HistoryEntry[] | undefined): ChronicleEvent[] {
  return (entries ?? [])
    .filter((e) => e.date != null)
    .map((e, i) => {
      const subs = e.content?.substitutions ?? [];
      return {
        id: e.id ?? `${e.date}-${i}`,
        date: e.date!,
        lane: historyLane(e.type),
        text: translate(e.content) || e.type || '',
        minor: e.type === 'COMPANY_CEO_CHANGED' && subs[0] != null && subs[0] === subs[3],
      };
    })
    .sort((a, b) => a.date - b.date);
}

/** The lanes that have events, in HISTORY_LANES order (empty lanes would waste the chart's height). */
export function usedLanes(events: ChronicleEvent[]): HistoryLane[] {
  const used = new Set(events.map((e) => e.lane));
  return HISTORY_LANES.filter((l) => used.has(l));
}
