import {
  bidderColors,
  bidderShares,
  bidError,
  bidMoney,
  bidPct,
  effectCurve,
  groupTenders,
  logSpace,
  maxBidShares,
  project,
  projectionBase,
  rateAfterTenders,
  rateAt,
  ratesFrom,
  sharesToReach,
  signedRate,
  systemBondCredit,
  tenderTrades,
  weightedEffect,
} from './tender';

// Real allotments of the tenders 19.–25.09.2026 (order log of the Alpha Bank's account on stable).
const RAW: [string, number, number, number, string][] = [
  ['ITIJVX98OY', 1789817509182, 98, 4000000000, 'OstTra KGaA'],
  ['ITIJVX98OY', 1789817509221, 102, 5715336791729, 'Stockbrot Bank'],
  ['ITIJVX98OY', 1789817509257, 102, 147058823529, 'Argo'],
  ['ITIJVX98OY', 1789817509291, 102, 315126050, 'Seylor Tender Bank'],
  ['ITINCZ1NXD', 1789903953561, 98, 7653053571428, 'Stockbrot Bank'],
  ['ITINCZ1NXD', 1789903953884, 102, 147058823529, 'Argo'],
  ['ITINCZ1NXD', 1789903954170, 102, 315126050, 'Seylor Tender Bank'],
  ['ITI6VMCP69', 1789990361735, 102, 7352933823529, 'Stockbrot Bank'],
  ['ITI6VMCP69', 1789990362058, 102, 147058823529, 'Argo'],
  ['ITI6VMCP69', 1789990362337, 102, 315126050, 'Seylor Tender Bank'],
  ['ITIYHXW498', 1790076768792, 98, 4000000000, 'OstTra KGaA'],
  ['ITIYHXW498', 1790076768897, 102, 4470844996375, 'Stockbrot Bank'],
  ['ITIYHXW498', 1790076769016, 102, 147058823529, 'Argo'],
  ['ITIYHXW498', 1790076769084, 102, 315126050, 'Seylor Tender Bank'],
  ['ITIP64Y9PX', 1790163209472, 98, 4000000000, 'OstTra KGaA'],
  ['ITIP64Y9PX', 1790163209506, 102, 7173708019811, 'Stockbrot Bank'],
  ['ITIP64Y9PX', 1790163209530, 102, 147058823529, 'Argo'],
  ['ITIP64Y9PX', 1790163209559, 102, 315126050, 'Seylor Tender Bank'],
  ['ITIBKQ90UM', 1790249618891, 98, 8001002834980, 'Stockbrot Bank'],
  ['ITIBKQ90UM', 1790249618920, 102, 147058823529, 'Argo'],
  ['ITIBKQ90UM', 1790249618944, 102, 315126050, 'Seylor Tender Bank'],
  ['ITI3GXRN8Z', 1790336028551, 98, 4000000000, 'OstTra KGaA'],
  ['ITI3GXRN8Z', 1790336028575, 102, 7365406896379, 'Stockbrot Bank'],
  ['ITI3GXRN8Z', 1790336028601, 102, 315126050, 'Seylor Tender Bank'],
];
const logs = RAW.map(([securityIdentifier, date, price, numberOfShares, buyerSecuritiesAccountName]) => ({
  securityIdentifier,
  date,
  price,
  numberOfShares,
  buyerSecuritiesAccountName,
  volume: price * numberOfShares,
}));
const trades = tenderTrades([
  ...logs,
  // not tender bonds / transfers: ignored
  { securityIdentifier: 'BOAX6UYY49', date: 1790336028000, price: 99.9, numberOfShares: 5, buyerSecuritiesAccountName: 'X' },
  { securityIdentifier: 'ITI3GXRN8Z', date: 1790336028000, price: 0, numberOfShares: 5, buyerSecuritiesAccountName: 'X' },
]);
const tenders = groupTenders(trades);

describe('tender trades', () => {
  it('keeps only allotments of tender bonds, oldest first', () => {
    expect(trades).toHaveLength(24);
    expect(trades[0].bidder).toBe('OstTra KGaA');
    expect(tenders.map((t) => t.asin)).toEqual([
      'ITIJVX98OY',
      'ITINCZ1NXD',
      'ITI6VMCP69',
      'ITIYHXW498',
      'ITIP64Y9PX',
      'ITIBKQ90UM',
      'ITI3GXRN8Z',
    ]);
    expect(tenders[5].effect).toBeCloseTo(-1.9277, 3);
    expect(tenders[5].bids[0].bidder).toBe('Stockbrot Bank');
  });

  it('reproduces the published main rates exactly (rounded to 2 decimals)', () => {
    // 25.09. 13:34:31 → 0,71 % (7 tenders), 13:31:29 (before the allotment, 6 tenders) → 0,48 %
    expect(ratesFrom(rateAt(trades, 1790336071982))).toMatchObject({ main: 0.71, reserve: 0.36, system: 1.71 });
    expect(ratesFrom(rateAt(trades, 1790335889601))?.main).toBe(0.48);
    // and 24.09. 13:31:26 → 1,24 % (window 18.–23.09. is not fully in the fixture, so only the 25.09. values)
  });

  it('computes what the rate would be without one bidder', () => {
    const without = rateAt(trades, 1790336071982, 'Stockbrot Bank')!;
    expect(without).toBeCloseTo(1.929, 3); // everyone else bid 102 % except OstTra (98 %)
    const r = rateAfterTenders(trades, tenders, 'Stockbrot Bank');
    expect(r.at(-1)?.rate).toBeCloseTo(0.711, 3);
    expect(r.at(-1)?.without).toBeCloseTo(without, 6);
  });

  it('ranks bidders by allotted bonds', () => {
    const b = bidderShares(tenders);
    expect(b[0]).toMatchObject({ bidder: 'Stockbrot Bank', tenders: 7 });
    expect(b[0].percent).toBeGreaterThan(95);
    expect(b.find((x) => x.bidder === 'OstTra KGaA')?.effect).toBe(-2);
    expect(b.reduce((s, x) => s + x.percent, 0)).toBeCloseTo(100, 6);
  });
});

describe('projection', () => {
  const book = [{ price: 102, shares: 315126050 }];

  it('uses the last six tenders plus the running book or the last tender again', () => {
    const now = projectionBase(tenders, book, 'buch');
    expect(now).toHaveLength(24 - 4 + 1); // 24 allotments − the oldest tender (4) + 1 bid in the book
    const again = projectionBase(tenders, book, 'gestern');
    expect(again).toHaveLength(20 + 3);
  });

  it('shows how a bid moves the rate', () => {
    const base = projectionBase(tenders, book, 'buch');
    const without = project(base)!;
    const low = project(base, { price: 98, shares: 5e12 })!;
    const high = project(base, { price: 102, shares: 5e12 })!;
    expect(low.main).toBeLessThan(without.main);
    expect(high.main).toBeGreaterThan(without.main);
    // a small bid changes nothing visible
    expect(project(base, { price: 98, shares: 1_000_000 })!.main).toBe(without.main);
    expect(project(base, { price: 98, shares: 0 })).toEqual(without);
  });

  it('draws the effect over the volume and finds the bonds needed for a target', () => {
    const base = projectionBase(tenders, book, 'buch');
    const curve = effectCurve(base, 102, [1e6, 1e12, 1e14]);
    expect(curve[0].rate).toBeLessThan(curve[1].rate);
    expect(curve[2].rate).toBeLessThan(2);
    const now = weightedEffect(base)!;
    const x = sharesToReach(base, 102, now + 0.5)!;
    expect(weightedEffect([...base, { price: 102, shares: x }])!).toBeCloseTo(now + 0.5, 4);
    expect(sharesToReach(base, 98, 3)).toBeUndefined(); // 98 % can never raise the rate
  });

  it('spaces volumes on a log scale', () => {
    expect(logSpace(1, 1000, 4).map((n) => Math.round(n))).toEqual([1, 10, 100, 1000]);
    expect(logSpace(0, 10, 3)).toEqual([0]);
  });
});

describe('bid', () => {
  it('knows the cost, the payback and the limit', () => {
    expect(bidMoney(98, 1000)).toEqual({ cost: 98_000, payout: 100_000, result: 2000 });
    expect(bidMoney(102, 10).result).toBe(-20);
    expect(maxBidShares(800_000_000_000_000)).toBe(8_000_000_000_000);
    expect(maxBidShares(0)).toBeUndefined();
  });

  it('checks a bid before it is sent', () => {
    expect(bidError(101.5, 10)).toBeNull();
    expect(bidError(97.99, 10)).toMatch(/98 %/);
    expect(bidError(102.01, 10)).toMatch(/102 %/);
    expect(bidError(100.123, 10)).toMatch(/zwei Nachkommastellen/);
    expect(bidError(100, 0)).toMatch(/Mindestens/);
    expect(bidError(100, 1.5)).toMatch(/Mindestens/);
    expect(bidError(100, 11, { maxShares: 10 })).toMatch(/Kreditrahmen/);
    expect(bidError(100, 10, { cash: 999 })).toMatch(/Bargeld/);
    expect(bidError(100, 10, { cash: 1000, maxShares: 10 })).toBeNull();
  });

  it('formats rates and bids in German', () => {
    expect(signedRate(1.5)).toBe('+1,50\u00a0%');
    expect(signedRate(-0.254)).toBe('−0,25\u00a0%');
    expect(signedRate(0.001)).toBe('±0,00\u00a0%');
    expect(bidPct(101.5)).toBe('101,50\u00a0%');
  });
});

describe('systemBondCredit', () => {
  it('knows the room left in the credit line and the payback', () => {
    const c = systemBondCredit(1000, 1.71, 500_000, 100_000);
    expect(c).toMatchObject({ room: 4000, volume: 100_000, usedAfter: 40 });
    expect(c.payback).toBeCloseTo(101_710, 6);
    expect(systemBondCredit(1, undefined).room).toBeUndefined();
    expect(systemBondCredit(1, 1, 50, 100).room).toBe(0);
  });
});

describe('bidderColors', () => {
  it('keeps brass for my banks and fixed colours for the largest others', () => {
    const c = bidderColors([{ bidder: 'A' }, { bidder: 'Me' }, { bidder: 'B' }, { bidder: 'C' }, { bidder: 'D' }, { bidder: 'E' }], ['Me']);
    expect(c).toEqual({ A: 'chart-2', Me: 'chart-1', B: 'chart-3', C: 'chart-4', D: 'chart-5', E: 'line-strong' });
  });
});
