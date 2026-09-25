import { describe, expect, it } from 'vitest';
import { bestPrices, priceTick, quoteBand, quoteErrors, quoteShare, runningQuote, spreadPct, suggestQuote } from './quote';

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

describe('suggestQuote', () => {
  it('quotes inside a wide market, at most 1 % around the middle', () => {
    const q = suggestQuote({ bid: 90, ask: 110, mid: 100, cash: 10_000, freeShares: 1_000 })!;
    expect(q.buyPrice).toBe(99.5);
    expect(q.sellPrice).toBe(100.5);
    // a tenth of what cash buys (10) or of the free shares (100) – the smaller, on both legs
    expect(q.buyShares).toBe(10);
    expect(q.sellShares).toBe(10);
  });
  it('joins a market that is already narrower than 1 %', () => {
    const q = suggestQuote({ bid: 71.24, ask: 71.6, mid: 71.42, cash: 1e6, freeShares: 50 })!;
    expect(q.buyPrice).toBe(71.24);
    expect(q.sellPrice).toBe(71.6);
  });
  it('keeps at least one tick between buy and sell', () => {
    const q = suggestQuote({ bid: 10, ask: 10, mid: 10, cash: 100, freeShares: 3 })!;
    expect(q.sellPrice).toBeGreaterThan(q.buyPrice);
    expect(q.sellShares).toBe(1);
  });
  it('sizes bonds by face value', () => {
    const q = suggestQuote({ mid: 100, cash: 100_000, freeShares: 0, faceValue: 1000, percentQuoted: true })!;
    expect(q.buyPrice).toBe(99.5);
    // 100.000 / 995 = 100 bonds, a tenth; no bonds to sell – the size stays, the form explains
    expect(q.buyShares).toBe(10);
    expect(q.sellShares).toBe(10);
  });
  it('needs a middle price', () => {
    expect(suggestQuote({ cash: 100 })).toBeUndefined();
  });
});

describe('quoteErrors', () => {
  const ok = { buyPrice: 10, sellPrice: 11, buyShares: 5, sellShares: 5 };
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
  it('counts bonds at price % of the face value', () => {
    expect(quoteErrors({ ...ok, buyPrice: 100, sellPrice: 101 }, { cash: 5000, faceValue: 1000 })).toEqual({});
    expect(quoteErrors({ ...ok, buyPrice: 100, sellPrice: 101 }, { cash: 4999, faceValue: 1000 }).buyShares).toBeDefined();
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
