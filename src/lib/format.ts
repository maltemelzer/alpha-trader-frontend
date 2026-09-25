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

/** Shortens a label to `max` characters with „…“ (phone charts). */
export function clip(s: string, max = 11): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
