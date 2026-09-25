import { alpha, changeText, clip, euro, short } from './format';

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
