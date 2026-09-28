import {
  acceptParams,
  acceptProblem,
  apiPrice,
  counterpartyLabel,
  incomingOtc,
  orderTotals,
  otcOfferParams,
  rankCounterparties,
  otcTotals,
  premiumPct,
  referencePrice,
  unitValue,
  verdict,
} from './derive';
import type { SecurityOrderWithVolumeView } from '../api/types';

describe('orderTotals', () => {
  it('sums buy and sell volumes, falling back to shares × limit', () => {
    const t = orderTotals([
      {
        id: '1',
        action: 'BUY',
        type: 'LIMIT',
        numberOfShares: 10,
        price: 5,
        volume: 50,
      },
      { id: '2', action: 'BUY', type: 'LIMIT', numberOfShares: 2, price: 3 },
      {
        id: '3',
        action: 'SELL',
        type: 'LIMIT',
        numberOfShares: 1,
        price: 100,
        volume: 100,
      },
    ]);
    expect(t).toEqual({
      count: 3,
      buys: 2,
      sells: 1,
      buyVolume: 56,
      sellVolume: 100,
    });
  });
});

// Shape as returned by GET /api/securityorders/counterparty/{id} (SecurityOrderWithVolumeView).
const offer = (o: Partial<SecurityOrderWithVolumeView>): SecurityOrderWithVolumeView => ({
  id: 'o1',
  type: 'LIMIT',
  owner: 'acc-seller',
  ownerName: 'Esteban',
  securityIdentifier: 'STSN3G03LB',
  listing: {
    name: 'Alphakasse SE',
    securityIdentifier: 'STSN3G03LB',
    type: 'STOCK',
  },
  numberOfShares: 100,
  price: 12.5,
  volume: 1250,
  action: 'SELL',
  counterParty: 'acc-me',
  counterPartyName: 'CptnIglo',
  creationDate: 1_000,
  ...o,
});

describe('incomingOtc', () => {
  const now = 10_000;
  it('merges all accounts, newest first, drops expired and duplicates, marks not-yet-valid', () => {
    const rows = incomingOtc(
      [
        {
          accountId: 'acc-me',
          accountName: 'Privat',
          orders: [offer({ id: 'a', creationDate: 1 }), offer({ id: 'x', goodTillDate: 9_999 })],
        },
        {
          accountId: 'acc-co',
          accountName: 'Firma AG',
          orders: [offer({ id: 'b', creationDate: 5, goodAfterDate: 20_000 }), offer({ id: 'a', creationDate: 1 })],
        },
        { accountId: 'acc-empty', accountName: 'Leer' },
      ],
      now,
    );
    expect(rows.map((r) => [r.order.id, r.accountName, r.pending])).toEqual([
      ['b', 'Firma AG', true],
      ['a', 'Privat', false],
    ]);
  });
});

describe('acceptParams', () => {
  it('builds the opposite limit order addressed back to the offerer', () => {
    expect(acceptParams({ order: offer({}), owner: 'acc-me', shares: 40 })).toEqual({
      owner: 'acc-me',
      securityIdentifier: 'STSN3G03LB',
      action: 'BUY',
      type: 'LIMIT',
      price: '12.5',
      numberOfShares: 40,
      counterparty: 'acc-seller',
      checkOrderOnly: false,
    });
  });
  it('sells into an OTC buy offer', () => {
    const p = acceptParams({
      order: offer({ action: 'BUY', price: 99.1234 }),
      owner: 'acc-me',
      shares: 1,
    });
    expect(p.action).toBe('SELL');
    expect(p.price).toBe('99.1234');
  });
  it('needs a price for market offers', () => {
    expect(() =>
      acceptParams({
        order: offer({ type: 'MARKET', price: undefined }),
        owner: 'acc-me',
        shares: 1,
      }),
    ).toThrow();
    expect(
      acceptParams({
        order: offer({ type: 'MARKET', price: undefined }),
        owner: 'acc-me',
        shares: 1,
        price: 3,
      }).price,
    ).toBe('3');
  });
});

describe('apiPrice', () => {
  it('writes dot decimals without exponent or trailing zeros', () => {
    expect(apiPrice(12.5)).toBe('12.5');
    expect(apiPrice(100)).toBe('100');
    expect(apiPrice(0.0000012)).toBe('0.000001');
    expect(apiPrice(1234567.891)).toBe('1234567.891');
  });
});

describe('unitValue', () => {
  it('uses the volume (bonds: % × face value) and falls back to the price', () => {
    expect(unitValue({ volume: 2000, numberOfShares: 2, price: 100 })).toBe(1000);
    expect(unitValue({ numberOfShares: 2, price: 7 })).toBe(7);
  });
});

describe('acceptProblem', () => {
  const base = { order: offer({}), owner: 'acc-me', unit: 12.5 };
  it('accepts a payable amount', () => {
    expect(acceptProblem({ ...base, shares: 100, cash: 1250 })).toBeNull();
  });
  it('rejects own orders, bad counts, too many shares', () => {
    expect(acceptProblem({ ...base, owner: 'acc-seller', shares: 1 })).toMatch(/eigene/);
    expect(acceptProblem({ ...base, shares: 1.5 })).toMatch(/ganze Zahl/);
    expect(acceptProblem({ ...base, shares: 101 })).toMatch(/höchstens 100/);
  });
  it('checks cash when buying and free shares when selling', () => {
    expect(acceptProblem({ ...base, shares: 50, cash: 300 })).toBe('Nicht genug Bargeld – höchstens 24 Anteile.');
    expect(acceptProblem({ ...base, shares: 1, cash: 1 })).toBe('Nicht genug Bargeld.');
    const sell = { ...base, order: offer({ action: 'BUY' }) };
    expect(acceptProblem({ ...sell, shares: 5, freeShares: 3 })).toMatch(/nur 3 freie/);
    expect(acceptProblem({ ...sell, shares: 5, freeShares: 0 })).toMatch(/keine freien/);
    expect(acceptProblem({ ...sell, shares: 5, freeShares: 5 })).toBeNull();
  });
});

describe('market comparison', () => {
  const spread = { askPrice: 10, bidPrice: 9, lastPrice: { value: 9.5 } };
  it('compares with Brief when buying and Geld when selling, else the last price', () => {
    expect(referencePrice(spread, 'BUY')).toEqual({
      price: 10,
      label: 'Brief',
    });
    expect(referencePrice(spread, 'SELL')).toEqual({ price: 9, label: 'Geld' });
    expect(referencePrice({ lastPrice: { value: 9.5 } }, 'BUY')).toEqual({
      price: 9.5,
      label: 'Kurs',
    });
    expect(referencePrice(undefined, 'BUY')).toBeUndefined();
  });
  it('rates the premium from my side', () => {
    expect(premiumPct(12.5, 10)).toBeCloseTo(25);
    expect(premiumPct(1, undefined)).toBeUndefined();
    expect(verdict('BUY', -5)).toBe('good');
    expect(verdict('BUY', 5)).toBe('poor');
    expect(verdict('SELL', 5)).toBe('good');
    expect(verdict('SELL', -0.5)).toBe('fair');
    expect(verdict('SELL', undefined)).toBeUndefined();
  });
});

describe('otcTotals', () => {
  it('counts what I can buy or sell and the offered volume', () => {
    const rows = incomingOtc([
      {
        accountId: 'a',
        accountName: 'P',
        orders: [offer({ id: '1' }), offer({ id: '2', action: 'BUY', volume: 50 })],
      },
    ]);
    expect(otcTotals(rows)).toEqual({
      count: 2,
      toBuy: 1,
      toSell: 1,
      volume: 1300,
    });
  });
});

describe('otcOfferParams', () => {
  const params = {
    owner: 'acc-me',
    securityIdentifier: 'STSN3G03LB',
    action: 'SELL' as const,
    type: 'LIMIT' as const,
    price: '12.5',
    numberOfShares: 3,
  };
  it('adds the counterparty and sends for real (not only a check)', () => {
    expect(otcOfferParams({ ...params, checkOrderOnly: true }, 'acc-other')).toEqual({
      ...params,
      counterparty: 'acc-other',
      checkOrderOnly: false,
    });
  });
  it('refuses a missing or own counterparty', () => {
    expect(() => otcOfferParams(params, '')).toThrow(/Gegenpartei/);
    expect(() => otcOfferParams(params, 'acc-me')).toThrow(/anderes Portfolio/);
  });
});

describe('counterpartyLabel', () => {
  it('splits company accounts into name and CEO', () => {
    expect(
      counterpartyLabel({
        name: 'Alphakasse SE (STSN3G03LB) | Esteban',
        privateAccount: false,
      }),
    ).toEqual({
      title: 'Alphakasse SE (STSN3G03LB)',
      meta: 'Unternehmen · CEO Esteban',
    });
    expect(counterpartyLabel({ name: 'Malte', privateAccount: true })).toEqual({
      title: 'Malte',
      meta: 'Privatdepot',
    });
  });
});

describe('rankCounterparties', () => {
  it('puts name matches before accounts found only through their CEO', () => {
    const list = [
      { name: 'Guinea Pig (STG2EF16CB) | Malte' },
      { name: 'Malte_Fan', privateAccount: true },
      { name: 'Malte_Fan Inc. (STS9ETMHN1) | Malte_Fan' },
      { name: 'Malte', privateAccount: true },
      { name: 'Die Malte-Werke (STX) | Otto' },
    ];
    expect(rankCounterparties(list, 'malte').map((a) => a.name)).toEqual([
      'Malte',
      'Malte_Fan',
      'Malte_Fan Inc. (STS9ETMHN1) | Malte_Fan',
      'Die Malte-Werke (STX) | Otto',
      'Guinea Pig (STG2EF16CB) | Malte',
    ]);
  });
});
