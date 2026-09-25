import type { CapitalMeasureKind, CapitalMeasureView, DividendPaymentView, MergerView } from '../api/queries';

export type MeasureStatus = 'planned' | 'running' | 'ended';

export interface MeasureRow extends CapitalMeasureView {
  kind: CapitalMeasureKind;
  status: MeasureStatus;
  /** Share of the subscription phase already over, 0–1 */
  progress: number;
  name: string;
  asin: string;
}

export const KIND_LABEL: Record<CapitalMeasureKind, string> = { increase: 'Kapitalerhöhung', reduction: 'Kapitalherabsetzung' };
export const STATUS_LABEL: Record<MeasureStatus, string> = { planned: 'Geplant', running: 'Läuft', ended: 'Beendet' };

export function statusOf(m: Pick<CapitalMeasureView, 'startDate' | 'endDate'>, now: number): MeasureStatus {
  if (now < m.startDate) return 'planned';
  return now < m.endDate ? 'running' : 'ended';
}

/** Increases and reductions in one list: running first, then planned by start, ended last. */
export function measureRows(increases: CapitalMeasureView[], reductions: CapitalMeasureView[], now: number): MeasureRow[] {
  const order: Record<MeasureStatus, number> = { running: 0, planned: 1, ended: 2 };
  const rows = [
    ...increases.map((m) => ({ ...m, kind: 'increase' as const })),
    ...reductions.map((m) => ({ ...m, kind: 'reduction' as const })),
  ].map((m) => {
    const span = Math.max(1, m.endDate - m.startDate);
    return {
      ...m,
      status: statusOf(m, now),
      progress: Math.min(1, Math.max(0, (now - m.startDate) / span)),
      name: m.company.name,
      asin: m.company.securityIdentifier,
    };
  });
  return rows.sort((a, b) => order[a.status] - order[b.status] || a.startDate - b.startDate);
}

/** Money raised by increases and paid back by reductions. */
export function measureTotals(rows: MeasureRow[]) {
  const sum = (k: CapitalMeasureKind) => rows.filter((r) => r.kind === k).reduce((s, r) => s + (r.cashVolume ?? 0), 0);
  return { increase: sum('increase'), reduction: sum('reduction'), count: rows.length };
}

// ---------- Dividends and mergers ----------

export interface DividendRow {
  id: string;
  name: string;
  asin: string;
  startDate: number;
  maximalCashVolume: number;
}

export interface MergerRow extends DividendRow {
  acquirer: string;
  acquirerAsin: string;
}

const dividendRow = (d: DividendPaymentView): DividendRow => ({
  id: d.id,
  name: d.company?.name ?? '–',
  asin: d.company?.securityIdentifier ?? '',
  startDate: d.startDate,
  maximalCashVolume: d.maximalCashVolume ?? 0,
});

/** Announced dividends, the next one first. */
export function dividendRows(list: DividendPaymentView[] | undefined): DividendRow[] {
  return (list ?? []).map(dividendRow).sort((a, b) => a.startDate - b.startDate);
}

/** Announced mergers, the next one first. */
export function mergerRows(list: MergerView[] | undefined): MergerRow[] {
  return (list ?? [])
    .map((m) => ({
      ...dividendRow(m),
      acquirer: m.acquiringCompany?.name ?? '–',
      acquirerAsin: m.acquiringCompany?.securityIdentifier ?? '',
    }))
    .sort((a, b) => a.startDate - b.startDate);
}

export interface AcquirerGroup {
  name: string;
  asin?: string;
  /** Companies merging into this one */
  count: number;
  /** Sum of the caps */
  volume: number;
  first: number;
  last: number;
  rest?: boolean;
}

/** Mergers per acquiring company, most first; beyond `top` one „Übrige“ group. */
export function mergersByAcquirer(rows: MergerRow[], top = 8): AcquirerGroup[] {
  const map = new Map<string, AcquirerGroup>();
  for (const r of rows) {
    const key = r.acquirerAsin || r.acquirer;
    const g = map.get(key) ?? { name: r.acquirer, asin: r.acquirerAsin || undefined, count: 0, volume: 0, first: r.startDate, last: r.startDate };
    g.count += 1;
    g.volume += r.maximalCashVolume;
    g.first = Math.min(g.first, r.startDate);
    g.last = Math.max(g.last, r.startDate);
    map.set(key, g);
  }
  const groups = [...map.values()].sort((a, b) => b.count - a.count || b.volume - a.volume || a.name.localeCompare(b.name, 'de'));
  if (groups.length <= top + 1) return groups;
  const rest = groups.slice(top);
  return [
    ...groups.slice(0, top),
    {
      name: `Übrige (${rest.length.toLocaleString('de-DE')})`,
      count: rest.reduce((s, g) => s + g.count, 0),
      volume: rest.reduce((s, g) => s + g.volume, 0),
      first: Math.min(...rest.map((g) => g.first)),
      last: Math.max(...rest.map((g) => g.last)),
      rest: true,
    },
  ];
}

/** The next date still ahead of `now`, if any. */
export function nextDate(rows: { startDate: number }[], now: number): number | undefined {
  const ahead = rows.map((r) => r.startDate).filter((d) => d > now);
  return ahead.length ? Math.min(...ahead) : undefined;
}
