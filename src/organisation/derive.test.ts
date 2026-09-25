import { bookValue, suggestionHref } from './derive';

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
