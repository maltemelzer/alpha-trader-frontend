import { plRange } from './charts';

describe('plRange', () => {
  it('leaves room for the text on both sides', () => {
    const [lo, hi] = plRange(
      [
        { value: 100, chars: 20 },
        { value: -50, chars: 20 },
      ],
      600,
    );
    // 600 px − 2 × 136 px text = 328 px for 150 units
    const scale = 328 / 150;
    expect(hi).toBeCloseTo(100 + 136 / scale);
    expect(lo).toBeCloseTo(-(50 + 136 / scale));
  });
  it('keeps a small margin on a side without bars', () => {
    const [lo, hi] = plRange([{ value: 10, chars: 10 }], 400);
    expect(lo).toBeCloseTo(-0.2);
    expect(hi).toBeGreaterThan(10);
  });
  it('keeps a third of the plot for the bars when the text is very long', () => {
    const [lo, hi] = plRange([{ value: 10, chars: 200 }], 300);
    expect(lo).toBeCloseTo(-0.2);
    expect(hi).toBeCloseTo(10 + (200 * 6.8) / (100 / 10));
  });
});
