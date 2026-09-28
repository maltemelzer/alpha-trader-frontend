import { describe, expect, it } from 'vitest';
import {
  bestPrices,
  pricesAround,
  priceTick,
  quoteBand,
  quoteErrors,
  quoteShare,
  runningQuote,
  shareBounds,
  sharesFor,
  spreadPct,
  suggestQuote,
} from './quote';

const ob = {
  buyEntries: [
    { priceLimit: 71.18, size: 28 },
    { priceLimit: 71.24, size: 52222 },
  ],
  sellEntries: [
    { priceLimit: 72.5, size: 10 },
    { priceLimit: 71.96, size: 627305946 },
  ],
};

describe('bestPrices', () => {
  it('takes the best level of each side and the middle', () => {
    expect(bestPrices(ob)).toEqual({ bid: 71.24, ask: 71.96, mid: 71.6 });
  });
  it('falls back to the spread, then to the last price', () => {
    expect(bestPrices(undefined, { bidPrice: 10, askPrice: 12 })).toEqual({ bid: 10, ask: 12, mid: 11 });
    expect(bestPrices({ buyEntries: [], sellEntries: [] }, null, 5)).toEqual({ bid: undefined, ask: undefined, mid: 5 });
    expect(bestPrices(undefined).mid).toBeUndefined();
  });
});

describe('spreadPct', () => {
  it('is relative to the ask, like the API', () => {
    expect(spreadPct(71.24, 71.96)).toBeCloseTo(1.00056, 4);
    expect(spreadPct(undefined, 5)).toBeUndefined();
  });
});

describe('priceTick', () => {
  it('uses cents above 1 € and four decimals below or in %', () => {
    expect(priceTick(71)).toBe(0.01);
    expect(priceTick(0.5)).toBe(0.0001);
    expect(priceTick(99, true)).toBe(0.0001);
  });
});

describe('shareBounds / sharesFor', () => {
  it('allows 1 % (rounded up) to 2 % (rounded down) of the outstanding shares per side', () => {
    expect(shareBounds(1_000_000)).toEqual({ min: 10_000, max: 20_000 });
    expect(shareBounds(150)).toEqual({ min: 2, max: 3 });
    expect(shareBounds(undefined)).toBeUndefined();
  });
  it('turns a share into shares inside the bounds', () => {
    expect(sharesFor(0.015, 1_000_000)).toBe(15_000);
    expect(sharesFor(0.05, 1_000_000)).toBe(20_000);
    expect(sharesFor(0.001, 1_000_000)).toBe(10_000);
    expect(sharesFor(0.01, undefined)).toBeUndefined();
  });
});

describe('pricesAround', () => {
  it('puts buy and sell the given spread apart, measured like the API', () => {
    const p = pricesAround(100, 5)!;
    expect(p).toEqual({ buyPrice: 97.43, sellPrice: 102.56 });
    expect(spreadPct(p.buyPrice, p.sellPrice)).toBeGreaterThanOrEqual(5);
  });
  it('never ends below the spread after rounding, also for small prices and % quotes', () => {
    for (const [mid, pct] of [[0.37, false], [71.6, false], [99.87, true], [1.62, false]] as const) {
      const p = pricesAround(mid, 5, pct)!;
      expect(spreadPct(p.buyPrice, p.sellPrice)!).toBeGreaterThanOrEqual(5);
      expect(spreadPct(p.buyPrice, p.sellPrice)!).toBeLessThan(5.5);
    }
  });
  it('needs a price and a spread below 100 %', () => {
    expect(pricesAround(0, 5)).toBeUndefined();
    expect(pricesAround(10, 100)).toBeUndefined();
  });
});

describe('suggestQuote', () => {
  it('quotes the minimum the rules allow: 5 % spread, 1 % of the shares on each side', () => {
    const q = suggestQuote({ mid: 100, cash: 10_000, freeShares: 1_000, outstanding: 1_000_000 })!;
    expect(q).toEqual({ buyPrice: 97.43, sellPrice: 102.56, buyShares: 10_000, sellShares: 10_000 });
  });
  it('falls back to a tenth of cash or free shares without a share count', () => {
    const q = suggestQuote({ mid: 100, cash: 10_000, freeShares: 1_000 })!;
    // cash buys 102 at 97,43 → 10; free shares 100 → the smaller, on both legs
    expect(q.buyShares).toBe(10);
    expect(q.sellShares).toBe(10);
  });
  it('quotes bonds in % of the face value', () => {
    const q = suggestQuote({ mid: 100, cash: 100_000, freeShares: 0, faceValue: 1000, percentQuoted: true })!;
    expect(q.buyPrice).toBe(97.4358);
    expect(q.buyShares).toBe(10);
  });
  it('needs a middle price', () => {
    expect(suggestQuote({ cash: 100 })).toBeUndefined();
  });
});

describe('quoteErrors', () => {
  const ok = { buyPrice: 10, sellPrice: 11, buyShares: 5, sellShares: 5 };
  const NB = String.fromCharCode(0xa0);
  it('accepts a sound quote', () => {
    expect(quoteErrors(ok, { cash: 100, freeShares: 5 })).toEqual({});
  });
  it('names the field that is wrong', () => {
    expect(quoteErrors({ ...ok, buyPrice: undefined }, {}).buyPrice).toBe('Gib einen Kurs ein.');
    expect(quoteErrors({ ...ok, sellShares: 1.5 }, {}).sellShares).toBe('Ganze Stückzahl ab 1.');
    expect(quoteErrors({ ...ok, sellPrice: 10 }, {}).form).toBe('Der Verkaufskurs muss über dem Kaufkurs liegen.');
    expect(quoteErrors(ok, { cash: 49 }).buyShares).toBe('Mehr, als das Bargeld des Unternehmens kauft.');
    expect(quoteErrors(ok, { freeShares: 4 }).sellShares).toBe('Mehr, als das Unternehmen frei hält.');
  });
  it('checks the market maker rules: spread and 1–2 % of the shares per side', () => {
    expect(quoteErrors(ok, { outstanding: 300 })).toEqual({});
    expect(quoteErrors({ ...ok, sellPrice: 10.4 }, {}).spread).toBe(`Mindestens 5${NB}% Spread – jetzt 3,85${NB}%.`);
    expect(quoteErrors({ ...ok, buyShares: 2 }, { outstanding: 300 }).buyShares).toBe(`Mindestens 1${NB}% der Anteile: 3 Stk.`);
    expect(quoteErrors({ ...ok, sellShares: 7 }, { outstanding: 300 }).sellShares).toBe(`Höchstens 2${NB}% der Anteile: 6 Stk.`);
    // without a share count only the spread rule applies
    expect(quoteErrors({ ...ok, buyShares: 1 }, {})).toEqual({});
  });
  it('counts bonds at price % of the face value', () => {
    expect(quoteErrors({ ...ok, buyPrice: 100, sellPrice: 106 }, { cash: 5000, faceValue: 1000 })).toEqual({});
    expect(quoteErrors({ ...ok, buyPrice: 100, sellPrice: 106 }, { cash: 4999, faceValue: 1000 }).buyShares).toBeDefined();
  });
});

describe('quoteShare', () => {
  it('is the fraction of all outstanding shares', () => {
    expect(quoteShare(1000, 1_000_000)).toBe(0.001);
    expect(quoteShare(0, 10)).toBeUndefined();
    expect(quoteShare(5, undefined)).toBeUndefined();
  });
});

describe('runningQuote', () => {
  it('reads the two QUOTE legs of the listing', () => {
    const orders = [
      { type: 'QUOTE', action: 'BUY' as const, price: 9, numberOfShares: 4, securityIdentifier: 'A' },
      { type: 'QUOTE', action: 'SELL' as const, price: 11, numberOfShares: 3, listing: { securityIdentifier: 'A' } },
      { type: 'LIMIT', action: 'BUY' as const, price: 8, numberOfShares: 1, securityIdentifier: 'A' },
      { type: 'QUOTE', action: 'BUY' as const, price: 1, numberOfShares: 1, securityIdentifier: 'B' },
    ];
    expect(runningQuote(orders, 'A')).toEqual({ buyPrice: 9, buyShares: 4, sellPrice: 11, sellShares: 3 });
    expect(runningQuote(orders, 'C')).toBeUndefined();
  });
});

describe('quoteBand', () => {
  it('is three times the widest distance, between 2 % and 50 %', () => {
    expect(quoteBand(100, [99, 101.5])).toBeCloseTo(0.045);
    expect(quoteBand(100, [100, undefined])).toBe(0.02);
    expect(quoteBand(100, [10])).toBe(0.5);
    expect(quoteBand(undefined, [1])).toBe(0.5);
  });
});
