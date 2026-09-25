import { bookValue, etfsTracking, indexTrend, suggestionHref } from './derive';

describe('suggestionHref', () => {
  it('leads to the security of the suggestion', () => {
    expect(
      suggestionHref({ type: 'SPARE_COMPANY', text: '', actionData: { listing: { securityIdentifier: 'STS4E1ZHN3' } } }),
    ).toBe('/wertpapier/STS4E1ZHN3');
  });
  it('leads to the matching area for non-security suggestions', () => {
    expect(suggestionHref({ type: 'VOTING_POSSIBLE', text: '' })).toBe('/abstimmungen');
    expect(suggestionHref({ type: 'USER_ACHIEVEMENT', text: '' })).toBe('/erfolge');
    expect(suggestionHref({ type: 'UPGRADE_PRIVATE_MINER', text: '' })).toBe('/miner');
    expect(suggestionHref({ type: 'STOCK_DIVERSIFICATION', text: '' })).toBe('/markt');
  });
});

describe('bookValue', () => {
  it('adds the positions to the cash', () => {
    const positions = [{ volume: 1_079_381.7 }, { volume: 20 }] as Parameters<typeof bookValue>[0]['positions'];
    expect(bookValue({ cash: 993_113.48, positions })).toBeCloseTo(2_072_515.18);
    expect(bookValue({ cash: 5, positions: [] })).toBe(5);
  });
});

describe('indexTrend', () => {
  const day = (closePrice?: number) => ({ closePrice });
  it('takes the closes after the last chaining', () => {
    const t = indexTrend([day(1000), day(1010), day(2_400_000), day(2_460_000)]);
    expect(t.spark).toEqual([2_400_000, 2_460_000]);
    expect(t.change).toBeCloseTo(2.5);
  });
  it('keeps the last days and skips empty closes', () => {
    const t = indexTrend([day(10), day(undefined), day(11), day(12)], 2);
    expect(t.spark).toEqual([11, 12]);
    expect(t.change).toBeCloseTo(9.0909, 3);
  });
  it('has no change with fewer than two closes', () => {
    expect(indexTrend(undefined)).toEqual({ spark: [], change: undefined });
    expect(indexTrend([day(5)]).change).toBeUndefined();
  });
});

describe('etfsTracking', () => {
  it('finds the ETFs on an index', () => {
    const etfs = [{ name: 'A', baseIndexAsin: 'ID1' }, { name: 'B', baseIndexAsin: 'ID2' }, { name: 'C' }];
    expect(etfsTracking(etfs, 'ID1').map((e) => e.name)).toEqual(['A']);
    expect(etfsTracking(undefined, 'ID1')).toEqual([]);
  });
});
