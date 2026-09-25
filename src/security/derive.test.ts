import { change24h, depth, depthNear, holderSlices, niceTicks, recentPrices } from './derive';
import type { ShareholderView } from '../api/types';

const H = 3_600_000;

describe('change24h', () => {
  const now = 100 * H;
  it('compares with the last price at least 24 h old', () => {
    const prices = [
      { value: 50, date: now - 30 * H },
      { value: 40, date: now - 25 * H },
      { value: 45, date: now - 2 * H },
      { value: 44, date: now - H },
    ];
    const c = change24h(prices, now)!;
    expect(c.pct).toBeCloseTo(10);
    expect(c.abs).toBe(4);
  });
  it('is undefined without 24 h of history', () => {
    expect(change24h([{ value: 1, date: now - H }], now)).toBeUndefined();
  });
});

describe('depth', () => {
  it('accumulates from the best price outwards', () => {
    const d = depth({
      buyEntries: [
        { priceLimit: 9, size: 1 },
        { priceLimit: 10, size: 2 },
      ],
      sellEntries: [
        { priceLimit: 12, size: 5 },
        { priceLimit: 11, size: 3 },
      ],
    });
    expect(d.bids).toEqual({ price: [10, 9], cumulative: [2, 3] });
    expect(d.asks).toEqual({ price: [11, 12], cumulative: [3, 8] });
  });
});

describe('holderSlices', () => {
  const h = (name: string, n: number, company = false): ShareholderView =>
    ({
      numberOfShares: n,
      outstandingShares: 100,
      ...(company ? { company: { name } } : { user: { username: name } }),
    }) as ShareholderView;

  it('keeps the largest holders and groups the rest', () => {
    const s = holderSlices([h('a', 5), h('b', 50, true), h('c', 20), h('d', 10), h('e', 8), h('f', 7)], 5);
    expect(s.map((x) => x.name)).toEqual(['b', 'c', 'd', 'e', 'Übrige (2)']);
    expect(s[0]).toMatchObject({ kind: 'company', percent: 50 });
    expect(s[4]).toMatchObject({ kind: 'rest', shares: 12, percent: 12 });
  });
});

describe('recentPrices', () => {
  it('uses daily closes, then trades after the last close', () => {
    const now = Date.parse('2026-09-24T20:00:00Z');
    const days = [
      { date: '2026-09-01T18:00:00Z', closePrice: 1 },
      { date: '2026-09-22T18:00:00Z', closePrice: 50 },
      { date: '2026-09-23T18:00:00Z', closePrice: 55 },
    ];
    const trades = [
      { value: 54, date: Date.parse('2026-09-23T17:00:00Z') },
      { value: 2, date: Date.parse('2026-09-24T19:00:00Z') },
    ];
    expect(recentPrices(days as never, trades, 14 * 86_400_000, now).map((p) => p.value)).toEqual([50, 55, 2]);
  });
});

describe('depthNear', () => {
  it('drops far levels and extends each side to the band edge', () => {
    const d = depthNear(
      { bids: { price: [10, 9, 2], cumulative: [1, 3, 10] }, asks: { price: [11, 40], cumulative: [5, 4e9] } },
      10,
      0.5,
    );
    expect(d.bids).toEqual({ price: [10, 9, 5], cumulative: [1, 3, 3] });
    expect(d.asks).toEqual({ price: [11, 15], cumulative: [5, 5] });
  });
});

describe('niceTicks', () => {
  it('uses round steps', () => {
    expect(niceTicks(9_000_000)).toEqual([0, 2.5e6, 5e6, 7.5e6]);
    expect(niceTicks(0)).toEqual([0]);
  });
});
