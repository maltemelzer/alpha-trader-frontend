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
  return { tickvals, ticktext: tickLabels(tickvals, suffix) };
}

const distinct = (labels: string[]) => new Set(labels).size === labels.length;

/** Number of trailing zeros of an integer tick – the „roundest“ tick becomes the base of offset labels. */
const roundness = (n: number) => {
  if (n === 0) return Infinity;
  let k = 0;
  while (k < 20 && Math.abs(n) % 10 ** (k + 1) === 0) k++;
  return k;
};

/**
 * Short labels that stay distinct. A narrow range on a huge value (200 Bio. € ± 40 Mio.) would read
 * „200 Bio. €“ four times: first up to three decimals, then the roundest tick in full and the others
 * as the distance to it („+20 Mio. €“).
 */
export function tickLabels(ticks: number[], suffix: string): string[] {
  const plain = ticks.map((t) => `${short(t)}${suffix}`);
  if (distinct(plain)) return plain;
  const finer = ticks.map((t) => `${short(t, 3)}${suffix}`);
  if (distinct(finer)) return finer;
  const base = ticks.reduce((b, t) => (roundness(t) > roundness(b) ? t : b), ticks[0]);
  return ticks.map((t) => (t === base ? `${short(t, 6)}${suffix}` : `${t > base ? '+' : ''}${short(t - base)}${suffix}`));
}
