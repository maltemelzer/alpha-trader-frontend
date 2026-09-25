import { allianceAchievements, belongsTo } from './derive';
import { translate } from '../lib/messages';

const reached = {
  id: 'a',
  type: 'TOP_TEN_PERCENT_ALLIANCE_HIGHSCORE',
  description: 'Reach the top 10% in an alliance highscore',
  claimed: true,
  coinReward: 3,
  achievedDate: 2,
};
const older = { ...reached, id: 'b', type: 'TOP_HALF_ALLIANCE_HIGHSCORE', description: 'x', achievedDate: 1 };
const progress = { type: 'BEST_IN_ALLIANCE_HIGHSCORE', progressInPercent: 93.93, description: 'Stay the best in a alliance highscore', coinReward: 10 };

describe('allianceAchievements', () => {
  it('lists reached ones newest first, then progress; translates descriptions', () => {
    const r = allianceAchievements({ done: [older, reached], progress: [progress] }, [], translate);
    expect(r.map((x) => x.type)).toEqual(['TOP_TEN_PERCENT_ALLIANCE_HIGHSCORE', 'TOP_HALF_ALLIANCE_HIGHSCORE', 'BEST_IN_ALLIANCE_HIGHSCORE']);
    expect(r[0].description).toBe('Kommt in einem Allianz-Highscore unter die besten 10 %.');
    expect(r[2].description).toBe('Bleibt Erste in einem Allianz-Highscore.');
  });
  it('uses the unclaimed version of a reached achievement', () => {
    const r = allianceAchievements({ done: [reached], progress: [] }, [{ ...reached, claimed: false }], translate);
    expect(r).toHaveLength(1);
    expect(r[0].claimed).toBe(false);
  });
  it('is empty while loading', () => {
    expect(allianceAchievements(undefined, [], translate)).toEqual([]);
  });
});

describe('belongsTo', () => {
  it('keeps achievements of this alliance or without alliance', () => {
    expect(belongsTo({ type: 'x', alliance: { id: 'A' } } as never, 'A')).toBe(true);
    expect(belongsTo({ type: 'x', alliance: { id: 'B' } } as never, 'A')).toBe(false);
    expect(belongsTo({ type: 'x' }, 'A')).toBe(true);
  });
});
