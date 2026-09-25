import { describe, expect, it } from 'vitest';
import { mergeTrades, tradesPerMinute, typeOfAsin, waiting, withTicks } from './tape';

const t = (id: string, date: number, price: number, asin = 'STA') => ({
  id,
  date,
  price,
  securityIdentifier: asin,
  numberOfShares: 10,
});

describe('mergeTrades', () => {
  it('keeps each trade once, newest first, capped', () => {
    const out = mergeTrades([t('c', 3, 1), t('b', 2, 1)], [t('b', 2, 1), t('a', 1, 1)], 2);
    expect(out.map((x) => x.id)).toEqual(['c', 'b']);
  });
});

describe('withTicks', () => {
  it('compares with the previous trade of the same security', () => {
    const out = withTicks([t('c', 3, 110), t('x', 2, 5, 'STB'), t('a', 1, 100)]);
    expect(out.map((x) => x.id)).toEqual(['c', 'x', 'a']);
    expect(out[0].change).toBeCloseTo(10);
    expect(out[1].change).toBeNull();
    expect(out[2].change).toBeNull();
  });

  it('leaves out trades at a price of 0', () => {
    const out = withTicks([t('c', 3, 110), t('b', 2, 0), t('a', 1, 100)]);
    expect(out.map((x) => x.id)).toEqual(['c', 'a']);
    expect(out[0].change).toBeCloseTo(10);
  });

  it('folds back-to-back trades of one security at one price', () => {
    const out = withTicks([t('d', 4, 5), t('c', 3, 5), t('b', 2, 5), t('a', 1, 4)]);
    expect(out.map((x) => [x.id, x.count, x.shares])).toEqual([
      ['b', 3, 30],
      ['a', 1, 10],
    ]);
    expect(tradesPerMinute(out, 10)).toBe(4);
  });

  it('shows no change next to a token-price transfer', () => {
    const out = withTicks([t('c', 3, 20_000), t('b', 2, 0.01), t('a', 1, 19_990)]);
    expect(out.map((x) => x.change)).toEqual([null, null, null]);
  });
});

describe('waiting', () => {
  it('returns the newest unseen trades, oldest first', () => {
    const trades = withTicks([t('d', 4, 4), t('c', 3, 3), t('b', 2, 2), t('a', 1, 1)]);
    expect(waiting(trades, new Set(['d']), 2).map((x) => x.id)).toEqual(['b', 'c']);
  });
});

describe('tradesPerMinute', () => {
  it('counts the last minute', () => {
    const trades = withTicks([t('c', 100_000, 3), t('b', 50_000, 2), t('a', 30_000, 1)]);
    expect(tradesPerMinute(trades, 100_000)).toBe(2);
    // Server clock ahead: the newest trade marks the end.
    expect(tradesPerMinute(trades, 90_000)).toBe(2);
  });
});

describe('typeOfAsin', () => {
  it('knows percent-quoted listings', () => {
    expect(typeOfAsin('BOADHCPS2D')).toBe('BOND');
    expect(typeOfAsin('SRX')).toBe('REPO');
    expect(typeOfAsin('STSN3G03LB')).toBeUndefined();
  });
});
