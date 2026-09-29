// Evaluation of an experiment (page /experimente): rows per variant, in the order of the registry.
import type { ExperimentResults, VariantResult } from './api';
import type { Experiment } from './registry';

export interface ResultRow extends VariantResult {
  id: string;
  label: string;
  /** share of all favourite votes, 0–1 */
  favoriteShare: number;
  /** share of ratings per star, 0–1 (index 0 = 1 star) */
  starShares: number[];
}

const EMPTY: VariantResult = { people: 0, visits: 0, dwellMedianMs: null, ratings: 0, stars: [0, 0, 0, 0, 0], avgStars: null, favorites: 0, clicks: [] };

export function resultRows(exp: Experiment, res: ExperimentResults | undefined): ResultRow[] {
  const votes = exp.variants.reduce((s, v) => s + (res?.variants[v.id]?.favorites ?? 0), 0);
  return exp.variants.map((v) => {
    const r = res?.variants[v.id] ?? EMPTY;
    return {
      ...r,
      id: v.id,
      label: v.label,
      favoriteShare: votes ? r.favorites / votes : 0,
      starShares: r.stars.map((n) => (r.ratings ? n / r.ratings : 0)),
    };
  });
}

/** „45 s“, „2:05 Min.“, „1 Std. 10 Min.“ – visible time per visit. */
export function formatDwell(ms: number | null): string {
  if (ms == null) return '–';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} Min.`;
  return `${Math.floor(s / 3600)} Std. ${Math.round((s % 3600) / 60)} Min.`;
}

/** Average stars with one decimal, German: „4,2“. */
export function formatStars(avg: number | null): string {
  return avg == null ? '–' : avg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** The variant ahead: most favourite votes, then best average (at least 3 ratings). */
export function leader(rows: ResultRow[]): string | undefined {
  const votes = rows.reduce((s, r) => s + r.favorites, 0);
  if (votes) {
    const best = [...rows].sort((a, b) => b.favorites - a.favorites)[0];
    if (rows.filter((r) => r.favorites === best.favorites).length === 1) return best.id;
  }
  const rated = rows.filter((r) => r.ratings >= 3 && r.avgStars != null);
  if (!rated.length) return undefined;
  const top = [...rated].sort((a, b) => b.avgStars! - a.avgStars!);
  return top.length === 1 || top[0].avgStars! > top[1].avgStars! ? top[0].id : undefined;
}
