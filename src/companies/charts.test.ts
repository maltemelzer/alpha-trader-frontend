import { rangeTicks } from './charts';

describe('rangeTicks', () => {
  it('covers the range with round steps', () => {
    expect(rangeTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(rangeTicks(-1.2e12, 7.2e13)).toEqual([-2e13, 0, 2e13, 4e13, 6e13, 8e13]);
  });
  it('handles a flat range', () => {
    expect(rangeTicks(5, 5)).toEqual([5]);
  });
});
