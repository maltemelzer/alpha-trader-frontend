import { goalHours, goalName, goalSponsors, groupGoals, hoursText, pctText, periodCoverage, type SponsoringGoal } from './derive';

const NOW = Date.UTC(2026, 8, 25);
const LATER = Date.UTC(2026, 8, 30, 22);
const PAST = Date.UTC(2023, 0, 1);

const goals: SponsoringGoal[] = [
  { id: '1', description: 'own indices feature', achievedPercentage: 20.5, neededGoldHours: 48000, recurring: false, endDate: Date.UTC(2032, 0, 1), sponsors: [{ hours: 480, user: { username: 'Toubieh' } }, { hours: 240, user: { username: 'Schiggimollo' } }, { hours: 240, user: { username: 'Toubieh' } }] },
  { id: '2', description: 'stock split feature', achievedPercentage: 5, neededGoldHours: 28080, recurring: false, endDate: Date.UTC(2032, 0, 1), sponsors: [] },
  { id: '3', description: 'Server', achievedPercentage: 0, neededGoldHours: 5760, recurring: true, endDate: LATER, sponsors: [] },
  { id: '4', description: 'email feature', achievedPercentage: 50, neededGoldHours: 480, recurring: true, endDate: LATER, sponsors: [{ hours: 240, user: { username: 'X' } }] },
  { id: '5', description: 'Server', achievedPercentage: 0, neededGoldHours: 5760, recurring: true, endDate: PAST },
  { id: '6', description: 'email feature', achievedPercentage: 100, neededGoldHours: 480, recurring: true, endDate: PAST },
  { id: '7', description: 'interest tender feature', achievedPercentage: 100, neededGoldHours: 4080, recurring: false, endDate: PAST },
];

describe('goalName', () => {
  it('translates known goals and cleans unknown ones', () => {
    expect(goalName('own indices feature')).toBe('Eigene Indizes');
    expect(goalName('Server')).toBe('Server');
    expect(goalName('teleport feature')).toBe('Teleport');
    expect(goalName(undefined)).toBe('Ziel');
  });
});

describe('goalHours / goalSponsors', () => {
  it('sums the hours given, falling back to the percentage', () => {
    expect(goalHours(goals[0])).toBe(960);
    expect(goalHours(goals[1])).toBe(1404);
  });
  it('sums per sponsor, largest first', () => {
    expect(goalSponsors(goals[0])).toEqual([
      { username: 'Toubieh', hours: 720 },
      { username: 'Schiggimollo', hours: 240 },
    ]);
  });
});

describe('groupGoals', () => {
  it('keeps only the running period of costs and open features', () => {
    const g = groupGoals(goals, NOW);
    expect(g.costs.map((x) => x.id)).toEqual(['4', '3']);
    expect(g.features.map((x) => x.id)).toEqual(['1', '2']);
    expect(g.funded.map((x) => x.id)).toEqual(['7']);
    expect(g.fundedPeriods).toBe(1);
    expect(g.periodEnd).toBe(LATER);
  });
  it('weights the coverage of the running costs by hours', () => {
    const c = periodCoverage(groupGoals(goals, NOW).costs);
    expect(c).toEqual({ given: 240, needed: 6240, pct: (240 / 6240) * 100 });
    expect(periodCoverage([]).pct).toBe(0);
  });
});

describe('formatting', () => {
  it('writes hours and percentages in German', () => {
    expect(hoursText(13920)).toBe('13.920 Std.');
    expect(pctText(20.5)).toBe('20,5 %');
    expect(pctText(100)).toBe('100 %');
    expect(pctText(0)).toBe('0 %');
  });
});
