import { suggestionHref } from './derive';

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
