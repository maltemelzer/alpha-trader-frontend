import { rangeTicks, shortAxis, tickLabels } from './ticks';

describe('rangeTicks', () => {
  it('covers the range with round steps', () => {
    expect(rangeTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(rangeTicks(-1.2e12, 7.2e13)).toEqual([-2e13, 0, 2e13, 4e13, 6e13, 8e13]);
  });
  it('handles a flat range', () => {
    expect(rangeTicks(5, 5)).toEqual([5]);
  });
});

describe('shortAxis', () => {
  it('keeps plain ticks below a million', () => {
    expect(shortAxis([12, 150_000], ' €')).toEqual({ ticksuffix: ' €' });
  });
  it('writes Mio. instead of M from a million up', () => {
    const a = shortAxis([4_590_000, 4_700_000], ' €');
    expect(a.ticktext?.length).toBeGreaterThan(1);
    expect(a.ticktext?.every((t) => /Mio\.\u00a0?\s?€$/.test(t) || t.endsWith('Mio. €'))).toBe(true);
    expect(a.tickvals?.every((v) => v >= 4_500_000 && v <= 4_800_000)).toBe(true);
  });
});

describe('tickLabels', () => {
  const nb = (s: string) => s.replace(/\u00a0/g, ' ');
  it('keeps the usual short form when the labels differ', () => {
    expect(tickLabels([1e6, 2e6, 3e6], ' €').map(nb)).toEqual(['1 Mio. €', '2 Mio. €', '3 Mio. €']);
  });
  it('adds decimals when that is enough', () => {
    expect(tickLabels([1.234e12, 1.235e12, 1.236e12], ' €').map(nb)).toEqual(['1,234 Bio. €', '1,235 Bio. €', '1,236 Bio. €']);
  });
  it('labels a narrow range on a huge value as distance to the roundest tick', () => {
    expect(tickLabels([2e14 - 2e7, 2e14, 2e14 + 2e7, 2e14 + 4e7], ' €').map(nb)).toEqual([
      '−20 Mio. €',
      '200 Bio. €',
      '+20 Mio. €',
      '+40 Mio. €',
    ]);
  });
});
