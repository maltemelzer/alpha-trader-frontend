import { orderTotals } from './derive';

describe('orderTotals', () => {
  it('sums buy and sell volumes, falling back to shares × limit', () => {
    const t = orderTotals([
      { id: '1', action: 'BUY', type: 'LIMIT', numberOfShares: 10, price: 5, volume: 50 },
      { id: '2', action: 'BUY', type: 'LIMIT', numberOfShares: 2, price: 3 },
      { id: '3', action: 'SELL', type: 'LIMIT', numberOfShares: 1, price: 100, volume: 100 },
    ]);
    expect(t).toEqual({ count: 3, buys: 2, sells: 1, buyVolume: 56, sellVolume: 100 });
  });
});
