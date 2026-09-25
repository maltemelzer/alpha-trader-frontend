import {
  displayName,
  heatShare,
  heatTiles,
  tickerItems,
  tileArea,
  volumeRows,
  wrapLabel,
} from './derive';

describe('tickerItems', () => {
  it('leaves out transfers at a price of 0', () => {
    const items = tickerItems(
      [
        { id: '1', securityIdentifier: 'ACX', price: 0, numberOfShares: 456488, date: 30 },
        { id: '2', securityIdentifier: 'STY', price: 3, numberOfShares: 1, date: 20 },
      ],
      {},
    );
    expect(items.map((i) => i.id)).toEqual(['2']);
  });

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
