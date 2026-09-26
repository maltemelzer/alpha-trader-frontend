// Illustrative candles for the login page – a seeded random walk, not market data.

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Small seeded PRNG (mulberry32), so the first picture is the same on every load (no layout jitter in shots). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Next candle after `prevClose`: slight upward drift, wicks on both sides, volume larger on big moves. */
export function nextCandle(prevClose: number, rand: () => number): Candle {
  const move = (rand() - 0.47) * 0.06;
  const open = prevClose;
  const close = Math.max(0.01, open * (1 + move));
  const high = Math.max(open, close) * (1 + rand() * 0.018);
  const low = Math.min(open, close) * (1 - rand() * 0.018);
  const volume = 0.3 + Math.abs(move) * 18 + rand() * 0.4;
  return { open, high, low, close, volume };
}

export function candles(count: number, seed = 7, start = 100): Candle[] {
  const rand = rng(seed);
  const out: Candle[] = [];
  let close = start;
  for (let i = 0; i < count; i++) {
    const c = nextCandle(close, rand);
    out.push(c);
    close = c.close;
  }
  return out;
}

/** Price range of the candles with a margin, for the y scale. */
export function priceRange(cs: Candle[]): [number, number] {
  const lo = Math.min(...cs.map((c) => c.low));
  const hi = Math.max(...cs.map((c) => c.high));
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}
