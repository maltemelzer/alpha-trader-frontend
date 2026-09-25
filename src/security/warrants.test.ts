import { callPutCount, corridors, mergeWarrants, ratioText, toWarrantView, underlyingsOf, warrantPosition, warrantsByUnderlying } from './warrants';

const w = (id: string, end: number, type: 'CALL' | 'PUT' = 'CALL') => ({ id, type, subscriptionPeriodDate: end, listing: { name: id, securityIdentifier: `WA${id}`, type: 'WARRANT' as const } });

describe('mergeWarrants', () => {
  it('keeps each running warrant once, next to expire first', () => {
    const out = mergeWarrants([[w('a', 30), w('b', 10)], undefined, [w('a', 30), w('c', 5), w('old', 1)]], 2);
    expect(out.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('ratioText', () => {
  it('writes the ratio as German number instead of „1:0“', () => {
    expect(ratioText(0.1)).toBe('0,1');
    expect(ratioText(0.001)).toBe('0,001');
    expect(ratioText(undefined)).toBe('–');
  });
});

describe('toWarrantView', () => {
  it('takes the issuer name from the company listing', () => {
    const v = toWarrantView({
      ...w('a', 10),
      ratio: 0.1,
      underlyingValue: 56.5,
      underlyingCapValue: 62.15,
      company: { listing: { name: 'Preginund33 Corp.', securityIdentifier: 'STP0D85CC1' } } as never,
    });
    expect(v.company).toEqual({ name: 'Preginund33 Corp.', securityIdentifier: 'STP0D85CC1' });
    expect(v.ratio).toBe('0,1');
    expect(v.subscriptionPeriodDate).toBe(10);
  });
});

describe('warrantPosition', () => {
  it('measures the underlying against strike and cap', () => {
    const call = warrantPosition({ type: 'CALL', underlyingValue: 50, underlyingCapValue: 55 }, 52)!;
    expect(call.toStrike).toBeCloseTo(4);
    expect(call.toCap).toBeCloseTo((55 / 52 - 1) * 100);
    expect(call.inTheMoney).toBe(true);
    expect(call.beyondCap).toBe(false);
    const put = warrantPosition({ type: 'PUT', underlyingValue: 50, underlyingCapValue: 45 }, 44)!;
    expect(put.inTheMoney).toBe(true);
    expect(put.beyondCap).toBe(true);
    expect(warrantPosition({ type: 'CALL', underlyingValue: 50 }, undefined)).toBeUndefined();
  });
});

describe('corridors', () => {
  it('puts reference price and cap in % from the underlying price', () => {
    const c = corridors(
      [
        { ...w('a', 10), underlying: { name: 'Alpha', securityIdentifier: 'STA', type: 'STOCK' }, underlyingValue: 50, underlyingCapValue: 55 },
        { ...w('b', 10, 'PUT'), underlying: { name: 'Beta', securityIdentifier: 'STB', type: 'STOCK' }, underlyingValue: 1, underlyingCapValue: 0.9 },
      ] as never,
      (a) => (a === 'STA' ? 40 : undefined),
      true,
    );
    expect(c).toHaveLength(1);
    expect(c[0].strikePct).toBeCloseTo(25);
    expect(c[0].capPct).toBeCloseTo(37.5);
    expect(c[0].label.startsWith('Alpha Call 50 · ')).toBe(true);
  });
});

describe('warrantsByUnderlying', () => {
  it('counts calls and puts per underlying, most first', () => {
    const on = (x: ReturnType<typeof w>, asin: string) => ({ ...x, underlying: { name: `N${asin}`, securityIdentifier: asin, type: 'STOCK' as const } });
    expect(warrantsByUnderlying([on(w('a', 1), 'X'), on(w('b', 1, 'PUT'), 'Y'), on(w('c', 1, 'PUT'), 'Y'), w('d', 1)])).toEqual([
      { asin: 'Y', name: 'NY', type: 'STOCK', calls: 0, puts: 2 },
      { asin: 'X', name: 'NX', type: 'STOCK', calls: 1, puts: 0 },
    ]);
  });
});

describe('callPutCount / underlyingsOf', () => {
  it('counts calls and puts', () => {
    expect(callPutCount([w('a', 1), w('b', 1, 'PUT'), w('c', 1)])).toEqual({ calls: 2, puts: 1 });
  });
  it('picks shares, coins and indexes once', () => {
    const r = (a: string, type: string) => ({ listing: { securityIdentifier: a, type } });
    expect(underlyingsOf([r('A', 'STOCK'), r('B', 'BUILDING'), r('A', 'STOCK'), r('C', 'INDEX'), r('D', 'COIN')], 2)).toEqual(['A', 'C']);
  });
});
