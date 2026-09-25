import { applyFilter, movers, tickerItems, tradeCounts } from './derive';
import type { MarketRow } from '../api/queries';

const row = (asin: string, type: string, change: number, last = true): MarketRow => ({
  listing: { name: asin.toLowerCase(), securityIdentifier: asin, type },
  lastPrice: last ? { value: 1, date: 1 } : null,
  priceChangeInPercent: change,
});

describe('movers', () => {
  it('takes winners and losers of one type, strongest outside', () => {
    const m = movers(
      [row('A', 'STOCK', 50), row('I', 'INDEX', 900), row('B', 'STOCK', 10), row('N', 'STOCK', 5, false)],
      [row('C', 'STOCK', -40), row('D', 'STOCK', -3), row('E', 'STOCK', 2)],
      'STOCK',
      5,
    );
    expect(m.map((x) => x.asin)).toEqual(['A', 'B', 'D', 'C']);
  });
});

describe('tickerItems', () => {
  it('sorts newest first and names known securities', () => {
    const items = tickerItems(
      [
        { id: '1', securityIdentifier: 'STX', price: 2, numberOfShares: 5, date: 10 },
        { id: '2', securityIdentifier: 'STY', price: 3, numberOfShares: 1, date: 20 },
      ],
      { STX: { name: 'X AG', type: 'STOCK' } },
    );
    expect(items.map((i) => [i.id, i.listing.name])).toEqual([
      ['2', 'STY'],
      ['1', 'X AG'],
    ]);
  });
});

describe('tradeCounts', () => {
  it('counts trades and sums volume per security', () => {
    expect(
      tradeCounts([
        { securityIdentifier: 'A', volume: 5 },
        { securityIdentifier: 'B', volume: 50 },
        { securityIdentifier: 'A', volume: 10 },
      ]),
    ).toEqual([
      { asin: 'B', count: 1, volume: 50 },
      { asin: 'A', count: 2, volume: 15 },
    ]);
  });
});

describe('applyFilter', () => {
  const rows: MarketRow[] = [
    { listing: { name: 'a', securityIdentifier: 'STA', type: 'STOCK' }, askPrice: 10, askSize: 5, bidSize: 0 },
    { listing: { name: 'b', securityIdentifier: 'STB', type: 'STOCK' }, askPrice: 1500, askSize: 1, bidSize: 3 },
    { listing: { name: 'c', securityIdentifier: 'BOC', type: 'BOND' }, askPrice: null, askSize: null, bidSize: 7 },
  ];
  const ids = (v: Parameters<typeof applyFilter>[1]) => applyFilter(rows, v).map((r) => r.listing.securityIdentifier);
  it('filters by type, sides and ask price (German number input)', () => {
    expect(ids({ type: 'STOCK' })).toEqual(['STA', 'STB']);
    expect(ids({ withBid: true })).toEqual(['STB', 'BOC']);
    expect(ids({ minPrice: '1.000' })).toEqual(['STB']);
    expect(ids({ maxPrice: '10,5' })).toEqual(['STA']);
    expect(ids({})).toEqual(['STA', 'STB', 'BOC']);
  });
});
