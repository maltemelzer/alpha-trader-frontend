import { achievementItems } from './derive';

describe('achievementItems', () => {
  it('lists achieved (newest first) before open ones (closest first), without duplicates', () => {
    const items = achievementItems(
      [
        { type: 'A', achievedDate: 1, description: 'a' },
        { type: 'B', achievedDate: 5, description: 'b' },
      ],
      [
        { type: 'A', progressInPercent: 100 },
        { type: 'C', progressInPercent: 10 },
        { type: 'D', progressInPercent: 80 },
      ],
      (m) => String(m ?? '').toUpperCase(),
    );
    expect(items.map((i) => i.type)).toEqual(['B', 'A', 'D', 'C']);
    expect(items[0].description).toBe('B');
  });
});
