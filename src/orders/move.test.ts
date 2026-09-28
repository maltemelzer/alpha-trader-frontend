import { describe, expect, it } from 'vitest';
import { freeShares, moveOrders, movePrice, moveProblem, moveTotals, openMoveSell, type MoveItem } from './move';

const item = (over: Partial<MoveItem> = {}): MoveItem => ({
  asin: 'STSN3G03LB',
  name: 'Alphakasse SE',
  free: 100,
  shares: 100,
  price: 0.01,
  ...over,
});

describe('moveOrders', () => {
  it('builds the sell to the target and the buy back from the source at the same limit', () => {
    expect(moveOrders({ from: 'A', to: 'B', asin: 'STSN3G03LB', shares: 5, price: 0.01 })).toEqual([
      { owner: 'A', securityIdentifier: 'STSN3G03LB', action: 'SELL', type: 'LIMIT', price: '0.01', numberOfShares: 5, counterparty: 'B', checkOrderOnly: false },
      { owner: 'B', securityIdentifier: 'STSN3G03LB', action: 'BUY', type: 'LIMIT', price: '0.01', numberOfShares: 5, counterparty: 'A', checkOrderOnly: false },
    ]);
  });

  it('refuses the same account and a missing price', () => {
    expect(() => moveOrders({ from: 'A', to: 'A', asin: 'X', shares: 1, price: 1 })).toThrow();
    expect(() => moveOrders({ from: 'A', to: 'B', asin: 'X', shares: 1, price: 0 })).toThrow();
  });
});

describe('movePrice', () => {
  it('uses 0,01 symbolically, otherwise bid, then last price', () => {
    expect(movePrice({ currentBidPrice: 70, lastPrice: { value: 71, date: 0 } }, 'symbolisch')).toBe(0.01);
    expect(movePrice({ currentBidPrice: 70, lastPrice: { value: 71, date: 0 } }, 'kurs')).toBe(70);
    expect(movePrice({ currentBidPrice: 0, lastPrice: { value: 71, date: 0 } }, 'kurs')).toBe(71);
    expect(movePrice({}, 'kurs')).toBeUndefined();
  });
});

describe('freeShares', () => {
  it('subtracts shares in open orders', () => {
    expect(freeShares({ numberOfShares: 10, committedShares: 4 })).toBe(6);
    expect(freeShares({ numberOfShares: 3, committedShares: 5 })).toBe(0);
  });
});

describe('moveTotals', () => {
  it('counts chosen items and sums the purchase price', () => {
    expect(moveTotals([item({ shares: 10, price: 70 }), item({ shares: 0 }), item({ shares: 3, price: 98.5 })])).toEqual({
      count: 2,
      cost: 995.5,
    });
  });
});

describe('moveProblem', () => {
  it('accepts a valid move', () => {
    expect(moveProblem({ from: 'A', to: 'B', items: [item()], cashTo: 5 })).toBeNull();
  });

  it('names the first problem', () => {
    expect(moveProblem({ from: 'A', to: 'A', items: [item()] })).toMatch(/verschieden/);
    expect(moveProblem({ from: 'A', to: 'B', items: [item({ shares: 0 })] })).toMatch(/mindestens ein/);
    expect(moveProblem({ from: 'A', to: 'B', items: [item({ shares: 1.5 })] })).toMatch(/ganze Zahl/);
    expect(moveProblem({ from: 'A', to: 'B', items: [item({ shares: 101 })] })).toMatch(/Nur 100 freie/);
    expect(moveProblem({ from: 'A', to: 'B', items: [item({ price: undefined })] })).toMatch(/Kein Kurs/);
    expect(moveProblem({ from: 'A', to: 'B', items: [item({ price: 70 })], cashTo: 1000 })).toMatch(/Bargeld/);
  });
});

describe('openMoveSell', () => {
  it('finds the sell of a move that is still open', () => {
    const orders = [
      { id: '1', action: 'SELL' as const, type: 'LIMIT' as const, numberOfShares: 5, price: 0.01, securityIdentifier: 'X', counterParty: 'C' },
      { id: '2', action: 'SELL' as const, type: 'LIMIT' as const, numberOfShares: 5, price: 0.01, securityIdentifier: 'X', counterParty: 'B' },
    ];
    expect(openMoveSell(orders, { to: 'B', asin: 'X', price: 0.01 })?.id).toBe('2');
    expect(openMoveSell(orders, { to: 'B', asin: 'Y', price: 0.01 })).toBeUndefined();
  });
});
