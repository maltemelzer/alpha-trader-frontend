import { describe, expect, it } from 'vitest';
import { helpText } from './help';

describe('helpText', () => {
  it('no text for unknown identifiers', () => {
    expect(helpText('Es gibt keine Hilfe für diese Kennung')).toBeNull();
    expect(helpText(undefined)).toBeNull();
    expect(helpText('  ')).toBeNull();
  });
  it('says „du“ instead of „Sie“', () => {
    expect(
      helpText(
        'Market Orders können zu jedem Kurs ausgeführt werden. Es ist nützlich für kleine Orders, aber gefährlich, wenn Sie große Mengen an Stücken, welche das Volumen zum aktuellen Geld- oder Briefkurs übersteigen, traden wollen.',
      ),
    ).toContain('wenn du große Mengen an Stücken, welche das Volumen zum aktuellen Geld- oder Briefkurs übersteigen, traden willst.');
    expect(helpText('Das ist die Geldmenge, die Sie auf Ihrem privaten Bankkonto haben.')).toBe(
      'Das ist die Geldmenge, die du auf deinem privaten Bankkonto hast.',
    );
    expect(helpText('AlphaCoins können in Ihr Portfolio transferiert werden.')).toBe('AlphaCoins können in dein Portfolio transferiert werden.');
  });
  it('fixes known typos and ends with a full stop', () => {
    expect(helpText('durch die Mulitplikation der Stücke')).toBe('durch die Multiplikation der Stücke.');
    expect(helpText('Die Differenz zwischen Geld- und Briefkurs')).toBe('Die Differenz zwischen Geld- und Briefkurs.');
    expect(helpText('Streubesitz (< 5%)')).toBe('Streubesitz (< 5%)');
  });
});
