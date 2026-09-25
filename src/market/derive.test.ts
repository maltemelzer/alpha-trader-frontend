import { applyFilter, bondRows, byYield, matchesSearch, movers, tickerItems, tradeCounts, typeMatches, uniqueRows } from './derive';
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

describe('market sources', () => {
  const row = (asin: string, name: string, type = 'STOCK') => ({ listing: { securityIdentifier: asin, name, type } });

  it('groups system bonds and repos with their class', () => {
    expect(typeMatches('SYSTEM_BOND', 'BOND')).toBe(true);
    expect(typeMatches('SYSTEM_REPO', 'REPO')).toBe(true);
    expect(typeMatches('STOCK', 'BOND')).toBe(false);
    expect(typeMatches('ETF', '')).toBe(true);
  });

  it('matches name or ASIN, ignoring one-letter terms', () => {
    expect(matchesSearch(row('BOX1', 'XTRA Bond'), 'xtra')).toBe(true);
    expect(matchesSearch(row('BOX1', 'XTRA Bond'), 'box')).toBe(true);
    expect(matchesSearch(row('BOX1', 'XTRA Bond'), 'alpha')).toBe(false);
    expect(matchesSearch(row('BOX1', 'XTRA Bond'), 'a')).toBe(true);
  });

  it('turns running bonds into rows and their repos into price-less rows', () => {
    const bond = (asin: string, maturityDate: number) => ({
      id: asin,
      listing: { securityIdentifier: asin, name: asin, type: 'BOND' as const },
      repurchaseListing: { securityIdentifier: 'RE' + asin.slice(2), name: asin, type: 'REPO' as const },
      interestRate: 2,
      faceValue: 100,
      volume: 1,
      maturityDate,
      priceSpread: { askPrice: 99, askSize: 5, lastPrice: { value: 100, date: 1 } },
    });
    const bonds = [bond('BO1', 50), bond('BO2', 200)];
    expect(bondRows(bonds, 100).map((r) => [r.listing.securityIdentifier, r.askPrice, r.lastPrice?.value])).toEqual([['BO2', 99, 100]]);
    expect(bondRows(bonds, 100, true).map((r) => [r.listing.securityIdentifier, r.askPrice])).toEqual([['RE2', undefined]]);
  });

  it('keeps the first row per ASIN', () => {
    expect(uniqueRows([row('A', 'a')], [row('A', 'b'), row('B', 'c')]).map((r) => r.listing.name)).toEqual(['a', 'c']);
  });
});

describe('byYield', () => {
  const H = 3_600_000;
  const now = 100 * H;
  const bond = (asin: string, hoursLeft: number, ask: number | null) =>
    ({
      id: asin,
      listing: { name: asin, securityIdentifier: asin, type: 'BOND' },
      interestRate: 2,
      maturityDate: now + hoursLeft * H,
      priceSpread: ask == null ? undefined : { askPrice: ask },
    }) as never;
  it('puts the best yield per day first, without the last hour and bonds without ask', () => {
    const rows = bondRows([bond('LONG', 240, 100), bond('DAY', 24, 100), bond('SOON', 0.2, 100), bond('NOASK', 24, null)], now);
    expect(rows.find((r) => r.listing.securityIdentifier === 'DAY')!.yieldPerDay).toBeCloseTo(2, 6);
    expect(byYield(rows, now).map((r) => r.listing.securityIdentifier)).toEqual(['DAY', 'LONG', 'SOON', 'NOASK']);
  });
});
