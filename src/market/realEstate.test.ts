import type { MarketRow } from '../api/queries';
import { estateBySize, estateDots, estateOffers } from './realEstate';

const row = (asin: string, size: number, last: number, extra: Partial<MarketRow> = {}): MarketRow => ({
  listing: { name: `Building ${size} 20/09/2026`, securityIdentifier: asin, type: 'BUILDING' },
  lastPrice: { value: last, date: 0 },
  count: 2,
  ...extra,
});

const rows = [
  row('A', 150, 150 * 100),
  row('B', 150, 150 * 300, { askPrice: 150 * 250, askSize: 1 }),
  row('C', 150, 150 * 200, { askPrice: 150 * 220, askSize: 1 }),
  row('D', 1200, 1200 * 50, { askPrice: 1200 * 40, askSize: 0 }),
  row('E', 999, 999 * 10),
];

describe('estateBySize', () => {
  it('sums up each size with median price per m² and the cheapest offer', () => {
    const s = estateBySize(rows);
    expect(s.map((x) => x.size)).toEqual([150, 999, 1200, 5000, 7500]);
    const small = s[0];
    expect(small).toMatchObject({ traded: 3, trades: 6, medianPerSqm: 200, offers: 2, cheapestPerSqm: 220, cheapestAsin: 'C' });
    // an ask without size is no offer
    expect(s[2]).toMatchObject({ traded: 1, offers: 0, medianPerSqm: 50, cheapestAsk: undefined });
    expect(s[3]).toMatchObject({ traded: 0, medianPerSqm: undefined });
  });
});

describe('estateOffers', () => {
  it('lists buildings with an ask, optionally of one size', () => {
    expect(estateOffers(rows).map((o) => o.listing.securityIdentifier)).toEqual(['B', 'C']);
    expect(estateOffers(rows, 1200)).toEqual([]);
    expect(estateOffers(rows, 150)[0].price).toEqual({ askPrice: 150 * 250, askSize: 1, bidPrice: undefined });
  });
});

describe('estateDots', () => {
  it('gives price per m² and the ask per m² when on offer', () => {
    const d = estateDots([...rows, row('Z', 150, 0)]);
    expect(d).toHaveLength(5);
    expect(d[1]).toMatchObject({ asin: 'B', size: 150, perSqm: 300, askPerSqm: 250, trades: 2 });
    expect(d[3].askPerSqm).toBeUndefined();
  });
});
