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
}

// The values are those of the latest daily snapshot (/api/v2/historizedcompanydata, ~18:50), not the
// live profile. closePriceHistogram is left out: its value is the day's close, but its bins reach
// −100 and count ~170.000 entries (all listings, bonds in %) – no fair comparison between companies.
export const HISTOGRAM_METRICS: HistogramMetric[] = [
  { key: 'bookValue', label: 'Buchwert', unit: '€' },
  { key: 'netCash', label: 'Net Cash', unit: '€' },
  { key: 'cash', label: 'Bargeld', unit: '€' },
  { key: 'cashFlow', label: 'Cashflow', unit: '€' },
  { key: 'tradeVolume', label: 'Handelsumsatz', unit: '€' },
  { key: 'outstandingShares', label: 'Aktien im Umlauf', unit: 'Stk.' },
  { key: 'sharesInBuys', label: 'In Kauforders', unit: 'Stk.', optional: true },
  { key: 'sharesInSells', label: 'In Verkaufsorders', unit: 'Stk.', optional: true },
  { key: 'bondsVolume', label: 'Anleihen', unit: '€', optional: true },
  { key: 'reposVolume', label: 'Repos', unit: '€', optional: true },
  { key: 'systemReposVolume', label: 'System-Repos', unit: '€', optional: true },
  { key: 'centralBankReserves', label: 'Zentralbank-Einlage', unit: '€', optional: true },
];

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

/** Decile as words: 10 → „obere 10 %“, 7 → „obere 40 %“, 3 → „untere 30 %“. */
export function placement(decile: number | undefined): string {
  if (!decile || decile < 1 || decile > 10) return '–';
  return decile >= 6 ? `obere ${(11 - decile) * 10} %` : `untere ${decile * 10} %`;
}

export interface RankRow extends HistogramMetric {
  value: number;
  decile: number;
  bins: Bin[];
  highlight: number;
  /** number of entries in the whole distribution */
  total: number;
}

/** One row per figure the API sent; optional figures only when the company has a value. */
export function rankRows(h: CompanyHistograms | undefined): RankRow[] {
  if (!h) return [];
  const rows: RankRow[] = [];
  for (const m of HISTOGRAM_METRICS) {
    const v = h[`${m.key}Histogram`];
    if (!v || v.highlightValue == null || !v.histogram) continue;
    if (m.optional && !v.highlightValue) continue;
    const bins = parseBins(v.histogram);
    rows.push({
      ...m,
      value: v.highlightValue,
      decile: v.decile ?? 0,
      bins,
      highlight: highlightBin(bins, v),
      total: bins.reduce((s, b) => s + b.count, 0),
    });
  }
  return rows;
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
