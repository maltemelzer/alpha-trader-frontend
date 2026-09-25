import type { CapitalMeasureKind, CapitalMeasureView } from '../api/queries';

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
