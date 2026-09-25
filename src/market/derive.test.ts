import {
  applyFilter,
  bondRows,
  displayName,
  heatShare,
  heatTiles,
  matchesSearch,
  movers,
  tickerItems,
  tileArea,
  typeMatches,
  uniqueRows,
  volumeRows,
  wrapLabel,
} from './derive';
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

describe('market overview', () => {
  it('names buildings in German', () => {
    expect(displayName('Building 1200 20/09/2026')).toBe('Gebäude 1200 (20.09.)');
    expect(displayName('Nexus Realty Holding ')).toBe('Nexus Realty Holding');
  });

  it('wraps tile labels into two lines', () => {
    expect(wrapLabel('Prime Reserve Bank', 12)).toBe('Prime<br>Reserve Bank');
    expect(wrapLabel('Iftar', 12)).toBe('Iftar');
    expect(wrapLabel('International Share and Bonds Holder AG', 14)).toBe('International<br>Share and Bon…');
    expect(wrapLabel('GYPHzZqDFpRToeCwQZtn Inc.', 12)).toBe('GYPHzZqDFpR…<br>Inc.');
  });

  it('builds heat tiles with the 24 h change, largest volume first', () => {
    const tiles = heatTiles([
      { securityIdentifier: 'STA', name: 'A', lastPrice: 110, previousPrice: 100, volume24h: 5 },
      { securityIdentifier: 'STB', name: 'B', lastPrice: 2, previousPrice: 0, volume24h: 50 },
      { securityIdentifier: 'STC', name: 'C', lastPrice: 1, previousPrice: 1, volume24h: 0 },
    ]);
    expect(tiles.map((t) => t.asin)).toEqual(['STB', 'STA']);
    expect(tiles[0].change).toBeNull();
    expect(tiles[1].change).toBeCloseTo(10);
  });

  it('keeps the order of volumes but compresses the area', () => {
    expect(tileArea(10_000)).toBe(10);
    expect(tileArea(1e12) / tileArea(1e4)).toBe(100);
    expect(tileArea(-1)).toBe(0);
  });

  it('mixes at most 42 % of gain/loss, nothing for unchanged', () => {
    expect(heatShare(null)).toBe(0);
    expect(heatShare(0.001)).toBe(0);
    expect(heatShare(5)).toBeCloseTo(0.21);
    expect(heatShare(-5)).toBeCloseTo(0.21);
    expect(heatShare(300)).toBe(0.42);
  });

  it('turns biggest traded securities into bar rows', () => {
    const rows = volumeRows([
      { listing: { securityIdentifier: 'STA', name: 'A', type: 'STOCK' }, volume: 10 },
      { listing: { securityIdentifier: 'BDB', name: 'Building 500 01/10/2026', type: 'BUILDING' }, volume: 30 },
      { listing: { securityIdentifier: 'STZ', name: 'Z', type: 'STOCK' }, volume: 0 },
    ]);
    expect(rows).toEqual([
      { asin: 'BDB', name: 'Gebäude 500 (01.10.)', type: 'BUILDING', volume: 30 },
      { asin: 'STA', name: 'A', type: 'STOCK', volume: 10 },
    ]);
  });
});
