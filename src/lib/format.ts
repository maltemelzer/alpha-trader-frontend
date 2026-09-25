// Small formatters for chart labels. For amounts in the UI use DS.Amount / DS.format.

const UNITS: [number, string][] = [
  [1e15, 'Brd.'],
  [1e12, 'Bio.'],
  [1e9, 'Mrd.'],
  [1e6, 'Mio.'],
  [1e3, 'Tsd.'],
];

const de = (n: number, digits: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** 1234567 → „1,23 Mio.“ (at most three significant digits); below 1000 unchanged. */
export function short(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  for (const [f, unit] of UNITS) {
    if (abs >= f) {
      const v = abs / f;
      return `${sign}${de(v, v >= 100 ? 0 : v >= 10 ? 1 : 2)}\u00a0${unit}`;
    }
  }
  return sign + de(abs, 2);
}

/** Euro price in German format, e.g. „1.234,56 €“. */
export function euro(n: number, decimals = 2): string {
  const s = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n < 0 ? '−' : ''}${s}\u00a0€`;
}

/** „▲ +2,34 %“ / „▼ −1,12 %“ / „± 0,00 %“ */
export function changeText(pct: number): string {
  const v = Math.abs(pct).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v === '0,00') return '± 0,00 %';
  return pct > 0 ? `▲ +${v} %` : `▼ −${v} %`;
}

/** #RRGGBB + alpha → rgba() for flat translucent fills. */
export function alpha(hex: string, a: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

/**
 * Flat mix of two #RRGGBB colours in sRGB (like CSS color-mix): `t` = share of `to`.
 * For heatmap tiles: tint + up to 42 % gain/loss. Non-hex input returns `to` unchanged.
 */
export function mix(from: string, to: string, t: number): string {
  const rgb = (hex: string) => hex.trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)?.slice(1).map((x) => parseInt(x, 16));
  const a = rgb(from);
  const b = rgb(to);
  if (!a || !b) return to;
  const k = Math.max(0, Math.min(1, t));
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Shortens a label to `max` characters with „…“ (phone charts). */
export function clip(s: string, max = 11): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * A rate that spans orders of magnitude (yield per day: 0,004 % … 1.700 %), in German format:
 * three decimals below 0,1 %, two up to 10 %, one above; from 1.000 % on „über 1.000 %“.
 */
export function ratePct(pct: number): string {
  const sign = pct < 0 ? '−' : '';
  const a = Math.abs(pct);
  if (a >= 1000) return `${sign}über 1.000\u00a0%`;
  const d = a >= 10 ? 1 : a >= 0.1 ? 2 : 3;
  return `${sign}${a.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })}\u00a0%`;
}

/** Time span as it is read in the game: „12 Min.“, „13 Std.“, „5 T 4 Std.“ */
export function span(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min}\u00a0Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}\u00a0Std.`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d}\u00a0T ${rest}\u00a0Std.` : `${d}\u00a0T`;
}
