import { describe, expect, it } from 'vitest';
import { candles, nextCandle, priceRange, rng } from './candles';

describe('candles', () => {
  it('is the same picture for the same seed', () => {
    expect(candles(10, 3)).toEqual(candles(10, 3));
    expect(candles(10, 3)).not.toEqual(candles(10, 4));
  });

  it('chains open to the previous close and keeps wicks around the body', () => {
    const cs = candles(50);
    for (let i = 1; i < cs.length; i++) expect(cs[i].open).toBe(cs[i - 1].close);
    for (const c of cs) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it('never goes to zero', () => {
    const c = nextCandle(0.01, () => 0);
    expect(c.close).toBeGreaterThan(0);
  });

  it('pads the price range', () => {
    const [lo, hi] = priceRange([{ open: 10, close: 20, high: 20, low: 10, volume: 1 }]);
    expect(lo).toBeCloseTo(9.2);
    expect(hi).toBeCloseTo(20.8);
  });

  it('draws numbers in [0, 1)', () => {
    const r = rng(1);
    for (let i = 0; i < 100; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
