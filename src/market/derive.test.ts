import {
  displayName,
  heatShare,
  tickerItems,
  tileArea,
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


});
