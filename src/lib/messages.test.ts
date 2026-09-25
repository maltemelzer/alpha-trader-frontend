import { translate } from './messages';

describe('translate', () => {
  it('translates known templates and formats numbers', () => {
    expect(
      translate({
        message: 'You can realize # of cash if you sell # pieces of # (#)',
        substitutions: ['1079380.08', '54', 'AlphaCoins', 'ACALPHCOIN'],
        filledString: 'You can realize 1079380.08 …',
      }),
    ).toBe('Du kannst 1,08 Mio. € Gewinn mitnehmen, wenn du 54 Stück AlphaCoins (ACALPHCOIN) verkaufst.');
    expect(translate({ message: 'You can transfer # AlphaCoins to your private portfolio', substitutions: ['1234.5'] })).toBe(
      'Du kannst 1.234,5 AlphaCoins in dein Privatportfolio übertragen.',
    );
  });
  it('falls back to the filled string', () => {
    expect(translate({ message: 'Unknown #', substitutions: ['x'], filledString: 'Unknown x' })).toBe('Unknown x');
    expect(translate({ message: 'Unknown #', substitutions: ['x'] })).toBe('Unknown x');
    expect(translate('plain')).toBe('plain');
    expect(translate(undefined)).toBe('');
  });
});
