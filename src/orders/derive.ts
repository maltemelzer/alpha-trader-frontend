import type { SecurityOrderView } from '../../vendor/bankiersgruen';

/** Count and volume of open buy and sell orders. */
export function orderTotals(orders: SecurityOrderView[]) {
  const t = { count: orders.length, buys: 0, sells: 0, buyVolume: 0, sellVolume: 0 };
  for (const o of orders) {
    const v = o.volume ?? o.numberOfShares * (o.price ?? 0);
    if (o.action === 'BUY') {
      t.buys += 1;
      t.buyVolume += v;
    } else {
      t.sells += 1;
      t.sellVolume += v;
    }
  }
  return t;
}
