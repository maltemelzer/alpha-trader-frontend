import { age, alpha, changeText, clip, euro, mix, parseDe, short, ratePct, span, changeShort } from './format';

describe('changeShort', () => {
  it('keeps small changes and shortens huge ones', () => {
    expect(changeShort(12.345)).toBe('▲ +12,35 %');
    expect(changeShort(479450)).toBe('▲ +479.450\u00a0%');
    expect(changeShort(4186450)).toBe('▲ +4,19\u00a0Mio.\u00a0%');
    expect(changeShort(-60)).toBe('▼ −60,00 %');
  });
});

describe('span', () => {
  it('reads like the game', () => {
    expect(span(12 * 60_000)).toBe('12\u00a0Min.');
    expect(span(13 * 3_600_000 + 5 * 60_000)).toBe('13\u00a0Std.');
    expect(span((5 * 24 + 4) * 3_600_000)).toBe('5\u00a0T 4\u00a0Std.');
    expect(span(2 * 86_400_000)).toBe('2\u00a0T');
  });
});

describe('age', () => {
  it('uses one unit, rounded down', () => {
    expect(age(-5)).toBe('0\u00a0Min.');
    expect(age(59 * 60_000)).toBe('59\u00a0Min.');
    expect(age(3 * 3_600_000 + 50 * 60_000)).toBe('3\u00a0Std.');
    expect(age(12 * 86_400_000)).toBe('12\u00a0T');
    expect(age(250 * 86_400_000)).toBe('8\u00a0Mon.');
    expect(age(3 * 365.25 * 86_400_000)).toBe('3\u00a0J.');
  });
});

describe('ratePct', () => {
  it('picks decimals by size', () => {
    expect(ratePct(0.0123)).toBe('0,012\u00a0%');
    expect(ratePct(0.354)).toBe('0,35\u00a0%');
    expect(ratePct(12.34)).toBe('12,3\u00a0%');
    expect(ratePct(-0.5)).toBe('−0,50\u00a0%');
    expect(ratePct(1700)).toBe('über 1.000\u00a0%');
  });
});

describe('format', () => {
  it('short', () => {
    expect(short(950)).toBe('950');
    expect(short(1234567)).toBe('1,23 Mio.');
    expect(short(69_100_000_000_000)).toBe('69,1 Bio.');
    expect(short(3_035_142_744_431_558)).toBe('3,04 Brd.');
    expect(short(-2_520_000_000)).toBe('−2,52 Mrd.');
  });
  it('euro', () => {
    expect(euro(124380.5)).toBe('124.380,50 €');
    expect(euro(-1.5)).toBe('−1,50 €');
  });
  it('changeText', () => {
    expect(changeText(2.345)).toBe('▲ +2,35 %');
    expect(changeText(-1.12)).toBe('▼ −1,12 %');
    expect(changeText(0.001)).toBe('± 0,00 %');
  });
  it('alpha and clip', () => {
    expect(alpha('#578ED4', 0.16)).toBe('rgba(87,142,212,0.16)');
    expect(clip('Hanse Beteiligungs AG')).toBe('Hanse Bete…');
  });
});

describe('mix', () => {
  it('mixes two hex colours like color-mix in srgb', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('rgb(0,0,0)');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('rgb(128,128,128)');
    expect(mix('#102030', '#305070', 0.42)).toBe('rgb(29,52,75)');
    expect(mix('#000000', '#FFFFFF', 2)).toBe('rgb(255,255,255)');
    expect(mix('red', '#FFFFFF', 0.5)).toBe('#FFFFFF');
  });
});

describe('parseDe', () => {
  it('reads German input', () => {
    expect(parseDe('1.234,5')).toBe(1234.5);
    expect(parseDe(' 12,50 ')).toBe(12.5);
    expect(parseDe('7')).toBe(7);
    expect(parseDe('1.000')).toBe(1000);
    expect(parseDe('')).toBeNaN();
    expect(parseDe('abc')).toBeNaN();
    expect(parseDe('1,2,3')).toBeNaN();
  });
});
