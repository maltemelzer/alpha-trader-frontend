import { afterRebase, bondCoverage, bondYield, buildingSize, change24h, depth, depthNear, holderSlices, indexWeights, niceTicks, rebased, recentPrices, termProgress, withoutSpikes, dailyYield, quantile, yieldDots, availableAt, defaultShares } from './derive';
import { assetClass, bondOfRepo, isTradable } from './assetClass';
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

describe('withoutSpikes', () => {
  const pts = (...v: number[]) => v.map((value, date) => ({ value, date }));
  it('drops a token-price trade between normal ones', () => {
    expect(withoutSpikes(pts(70, 71, 0.01, 72)).map((p) => p.value)).toEqual([70, 71, 72]);
    expect(withoutSpikes(pts(70, 71, 0.01)).map((p) => p.value)).toEqual([70, 71]);
  });
  it('keeps a step such as an index rebase', () => {
    expect(withoutSpikes(pts(1000, 1010, 2_300_000, 2_310_000)).map((p) => p.value)).toEqual([1000, 1010, 2_300_000, 2_310_000]);
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

  it('leaves out transfers at a price of 0', () => {
    const now = Date.parse('2026-09-24T20:00:00Z');
    const trades = [
      { value: 70, date: Date.parse('2026-09-24T18:00:00Z') },
      { value: 0, date: Date.parse('2026-09-24T18:30:00Z') },
      { value: 71, date: Date.parse('2026-09-24T19:00:00Z') },
    ];
    expect(recentPrices([], trades, 86_400_000, now).map((p) => p.value)).toEqual([70, 71]);
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

describe('asset class helpers', () => {
  it('drops points before a rebase jump', () => {
    const pts = [1000, 1010, 4_600_000, 4_620_000].map((value, i) => ({ value, date: i }));
    expect(afterRebase(pts, (p) => p.value).map((p) => p.value)).toEqual([4_600_000, 4_620_000]);
    const calm = [100, 120, 90].map((value, i) => ({ value, date: i }));
    expect(afterRebase(calm, (p) => p.value)).toHaveLength(3);
  });

  it('computes the bond yield until maturity', () => {
    expect(bondYield(100, 2)).toBeCloseTo(2);
    expect(bondYield(102, 2)).toBeCloseTo(0);
    expect(bondYield(98, 2)).toBeCloseTo(4.0816, 3);
    expect(bondYield(null, 2)).toBeUndefined();
  });

  it('measures how well the issuer covers the repayment', () => {
    expect(bondCoverage(220, 100, 10)).toBeCloseTo(2);
    expect(bondCoverage(-5, 100, 0)).toBe(-0.05);
    expect(bondCoverage(undefined, 100, 0)).toBeUndefined();
  });

  it('measures term progress', () => {
    expect(termProgress(0, 100, 25)).toBe(0.25);
    expect(termProgress(0, 100, 200)).toBe(1);
    expect(termProgress(undefined, 100, 50)).toBe(0);
  });

  it('weights index members and sums the rest', () => {
    const m = (name: string, capitalisation: number) => ({ listing: { name, securityIdentifier: name }, capitalisation, price: 1, shares: 1 });
    const r = indexWeights([m('a', 50), m('b', 30), m('c', 20)], 2);
    expect(r.weights.map((w) => [w.name, Math.round(w.weight)])).toEqual([
      ['a', 50],
      ['b', 30],
      ['Übrige 1', 20],
    ]);
    expect(r.top1).toBe(50);
    expect(r.effective).toBeCloseTo(1 / (0.25 + 0.09 + 0.04));
  });

  it('rebases two series to 100 at the common start', () => {
    const etf = [{ date: 0, value: 50 }, { date: 10, value: 55 }];
    const idx = [{ date: 5, value: 200 }, { date: 10, value: 240 }];
    const r = rebased(etf, idx);
    expect(r.a.map((p) => [p.date, Math.round(p.value)])).toEqual([[5, 100], [10, 110]]);
    expect(r.b.map((p) => [p.date, Math.round(p.value)])).toEqual([[5, 100], [10, 120]]);
  });

  it('reads the building size from the name', () => {
    expect(buildingSize('Building 1200 20/09/2026')).toBe(1200);
    expect(buildingSize('Villa')).toBeUndefined();
  });
});

describe('assetClass', () => {
  it('maps listing types and repos to their bond', () => {
    expect(assetClass('SYSTEM_BOND')).toBe('bond');
    expect(assetClass('SYSTEM_REPO')).toBe('repo');
    expect(isTradable(assetClass('INDEX'))).toBe(false);
    expect(bondOfRepo('REF1BNW2GP')).toBe('BOF1BNW2GP');
    expect(bondOfRepo('SRST5HD84X')).toBe('SBST5HD84X');
  });
});

describe('dailyYield', () => {
  const DAY = 86_400_000;
  it('equals the yield until maturity when one day is left', () => {
    expect(dailyYield(98, 0, DAY)).toBeCloseTo((100 / 98 - 1) * 100, 6);
  });
  it('spreads the yield over the days left', () => {
    expect(dailyYield(98, 0, 10 * DAY)).toBeCloseTo(((100 / 98 - 1) * 100) / 10, 6);
    // 2,05 % in 12 minutes
    expect(dailyYield(100, 2.05, 12 * 60_000)).toBeCloseTo(2.05 * 120, 6);
  });
  it('counts the coupon paid at maturity and turns negative above the payout', () => {
    expect(dailyYield(100, 2, DAY)).toBeCloseTo(2, 6);
    expect(dailyYield(103, 2, DAY)!).toBeLessThan(0);
  });
  it('has no value without a price or with under a minute left', () => {
    expect(dailyYield(undefined, 2, DAY)).toBeUndefined();
    expect(dailyYield(99, 2, 30_000)).toBeUndefined();
  });
});

describe('quantile', () => {
  it('interpolates between sorted values', () => {
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2.5);
    expect(quantile([5], 0.9)).toBe(5);
    expect(quantile([], 0.5)).toBeUndefined();
  });
});

describe('yieldDots', () => {
  const H = 3_600_000;
  const now = 1_000 * H;
  const bond = (asin: string, hoursLeft: number, ask: number | null, last = 100) => ({
    interestRate: 2,
    maturityDate: now + hoursLeft * H,
    listing: { name: asin, securityIdentifier: asin },
    priceSpread: { askPrice: ask, lastPrice: { value: last } },
  });
  const bonds = [bond('A', 20, 100), bond('B', 0.2, 100), bond('C', 20, null, 99), bond('OWN', 20, 100)];
  const names = (mode: 'tradable' | 'all') => yieldDots(bonds, now, mode, 'OWN', String).map((d) => `${d.name}:${d.price}`);

  it('shows tradable bonds by default: with an ask, due in an hour or later', () => {
    expect(names('tradable')).toEqual(['A:ask']);
  });
  it('adds the last hour and bonds without an ask (at the last price) on request', () => {
    expect(names('all')).toEqual(['A:ask', 'B:ask', 'C:last']);
  });
  it('prices at the ask', () => {
    expect(yieldDots([bond('A', 24, 98)], now, 'tradable', undefined, String)[0].value).toBeCloseTo((102 / 98 - 1) * 100, 6);
  });
});

describe('availableAt', () => {
  const ob = {
    buyEntries: [
      { priceLimit: 10, size: 5 },
      { priceLimit: 9, size: 7 },
    ],
    sellEntries: [
      { priceLimit: 11, size: 3 },
      { priceLimit: 12, size: 4 },
    ],
  };
  it('sums the other side up to the price', () => {
    expect(availableAt(ob, 'BUY', 11)).toBe(3);
    expect(availableAt(ob, 'BUY', 12)).toBe(7);
    expect(availableAt(ob, 'SELL', 10)).toBe(5);
    expect(availableAt(ob, 'SELL', 9)).toBe(12);
    expect(availableAt(undefined, 'BUY', 11)).toBe(0);
  });
});

describe('defaultShares', () => {
  it('takes what is available when cash or shares allow it', () => {
    expect(defaultShares(189, 'BUY', 71.3, 1_000_000, undefined)).toBe(189);
    expect(defaultShares(50, 'SELL', 70, undefined, 80)).toBe(50);
  });
  it('caps at what the cash buys or the free shares', () => {
    expect(defaultShares(189, 'BUY', 71.3, 1_000, undefined)).toBe(14);
    expect(defaultShares(50, 'SELL', 70, undefined, 20)).toBe(20);
  });
  it('prices bonds in % of the face value', () => {
    // 99 % of 100 € = 99 € per piece
    expect(defaultShares(1_000, 'BUY', 99, 990, undefined, 100)).toBe(10);
  });
  it('keeps the available size when nothing is affordable, and nothing when nothing is offered', () => {
    expect(defaultShares(30, 'BUY', 100, 5, undefined)).toBe(30);
    expect(defaultShares(30, 'SELL', 100, undefined, 0)).toBe(30);
    expect(defaultShares(undefined, 'BUY', 100, 5, undefined)).toBeUndefined();
  });
});
