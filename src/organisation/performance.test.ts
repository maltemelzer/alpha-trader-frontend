import { asinType, periodStart, plBars, positionResult, tradeBars, unrealised } from './performance';
import type { PortfolioView } from '../api/types';
import type { TradeResultView } from '../api/queries';

type Position = PortfolioView['positions'][number];
const pos = (p: Partial<Position>): Position =>
  ({ securityIdentifier: 'STX', numberOfShares: 0, committedShares: 0, averageBuyingPrice: 0, volume: 0, type: 'STOCK', listing: { name: 'X' }, ...p }) as Position;

describe('positionResult', () => {
  it('values a stock at the bid against the Einstand', () => {
    const r = positionResult(pos({ numberOfShares: 100, averageBuyingPrice: 10, currentBidPrice: 12, lastPrice: { value: 11, date: 0 } }))!;
    expect(r.pl).toBeCloseTo(200);
    expect(r.pct).toBeCloseTo(20);
    expect(r.cost).toBeCloseTo(1000);
    expect(r.value).toBeCloseTo(1200);
  });
  it('falls back to the last price without a bid', () => {
    const r = positionResult(pos({ numberOfShares: 10, averageBuyingPrice: 5, lastPrice: { value: 4, date: 0 } }))!;
    expect(r.pl).toBeCloseTo(-10);
    expect(r.pct).toBeCloseTo(-20);
  });
  it('computes bonds (quoted in %) from their volume, like PositionTable', () => {
    const r = positionResult(pos({ type: 'BOND', numberOfShares: 1000, averageBuyingPrice: 95, currentBidPrice: 100, volume: 1000 }))!;
    expect(r.pl).toBeCloseTo(50);
    expect(r.value).toBe(1000);
    expect(r.cost).toBeCloseTo(950);
  });
  it('has no result without a cost basis (mined coins) or price', () => {
    expect(positionResult(pos({ numberOfShares: 54, averageBuyingPrice: 0, currentBidPrice: 20475 }))).toBeNull();
    expect(positionResult(pos({ numberOfShares: 5, averageBuyingPrice: 3 }))).toBeNull();
  });
});

describe('unrealised', () => {
  it('sums up, counts winners/losers and positions without Einstand, biggest result first', () => {
    const u = unrealised([
      pos({ securityIdentifier: 'A', numberOfShares: 10, averageBuyingPrice: 10, currentBidPrice: 11 }), // +10
      pos({ securityIdentifier: 'B', numberOfShares: 10, averageBuyingPrice: 10, currentBidPrice: 5 }), // −50
      pos({ securityIdentifier: 'C', numberOfShares: 54, averageBuyingPrice: 0, currentBidPrice: 20475 }),
    ]);
    expect(u.rows.map((r) => r.asin)).toEqual(['B', 'A']);
    expect(u.pl).toBeCloseTo(-40);
    expect(u.cost).toBeCloseTo(200);
    expect(u.pct).toBeCloseTo(-20);
    expect([u.winners, u.losers, u.noBasis]).toEqual([1, 1, 1]);
  });
  it('has no percentage without cost', () => {
    expect(unrealised([]).pct).toBeNull();
  });
});

describe('plBars', () => {
  it('keeps the n biggest, gains on top, and sums the rest', () => {
    const rows = unrealised([
      pos({ securityIdentifier: 'A', numberOfShares: 1, averageBuyingPrice: 10, currentBidPrice: 110 }), // +100
      pos({ securityIdentifier: 'B', numberOfShares: 1, averageBuyingPrice: 100, currentBidPrice: 50 }), // −50
      pos({ securityIdentifier: 'C', numberOfShares: 1, averageBuyingPrice: 10, currentBidPrice: 12 }), // +2
      pos({ securityIdentifier: 'D', numberOfShares: 1, averageBuyingPrice: 10, currentBidPrice: 9 }), // −1
    ]).rows;
    const bars = plBars(rows, 2, (r) => r.asin);
    expect(bars.map((b) => b.id)).toEqual(['A', 'B', 'rest']);
    expect(bars[2]).toMatchObject({ label: 'Übrige 2', pl: 1, pct: null });
    expect(bars[2].asin).toBeUndefined();
  });
  it('has no rest bar when everything fits', () => {
    expect(plBars([], 5, () => '')).toEqual([]);
  });
});

describe('tradeBars', () => {
  const t = (tradeId: string, profitLoss: number): TradeResultView => ({ tradeId, profitLoss, listingName: tradeId, securityIdentifier: 'ST' + tradeId });
  it('orders best to worst and drops duplicates and wrong signs', () => {
    const bars = tradeBars([t('a', 5), t('b', 50), t('a', 5), t('z', 0)], [t('c', -3), t('d', -30)], () => '');
    expect(bars.map((b) => [b.id, b.pl])).toEqual([
      ['b', 50],
      ['a', 5],
      ['c', -3],
      ['d', -30],
    ]);
    expect(bars[0].asin).toBe('STb');
  });
});

describe('periodStart', () => {
  const now = Date.UTC(2026, 8, 25, 12, 34, 56);
  it('goes back whole days and rounds down to the hour', () => {
    expect(periodStart('7T', now)).toBe(Date.UTC(2026, 8, 18, 12));
    expect(periodStart('30T', now)).toBe(Date.UTC(2026, 7, 26, 12));
  });
  it('is open for „alle“ and unknown values', () => {
    expect(periodStart('alle', now)).toBeUndefined();
    expect(periodStart('x', now)).toBeUndefined();
  });
});

describe('asinType', () => {
  it('treats bonds and repos as quoted in %', () => {
    expect(asinType('BOGX2X3WZT')).toBe('BOND');
    expect(asinType('SRABCDEF12')).toBe('BOND');
    expect(asinType('STSN3G03LB')).toBeUndefined();
    expect(asinType(undefined)).toBeUndefined();
  });
});
