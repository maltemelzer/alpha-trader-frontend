import { short } from '../lib/format';

/** About five round tick values covering lo…hi (unlike security's niceTicks, which starts at 0). */
export function rangeTicks(lo: number, hi: number, n = 5): number[] {
  if (hi === lo) return [lo];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step / 2; t += step) out.push(Math.round(t / step) * step);
  return out;
}

/**
 * Axis ticks in German short form („4,7 Mio. €“) for values from a million up – Plotly would write
 * „4.7M“. Below that the theme's plain numbers with thousands dots are fine; then this returns {}.
 */
export function shortAxis(values: number[], suffix: string): { tickvals?: number[]; ticktext?: string[]; ticksuffix?: string } {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { ticksuffix: suffix };
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  if (Math.max(Math.abs(lo), Math.abs(hi)) < 1e6) return { ticksuffix: suffix };
  const pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.01;
  const tickvals = rangeTicks(lo - pad, hi + pad, 4).filter((t) => t >= lo - pad && t <= hi + pad);
  return { tickvals, ticktext: tickvals.map((t) => `${short(t)}${suffix}`) };
}
