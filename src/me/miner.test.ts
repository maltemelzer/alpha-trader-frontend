import { describe, expect, it } from 'vitest';
import { affordableStep, bestStep, minerSteps, netAfter, planLength, storageHours } from './miner';

const miner = {
  coinsPerHour: 1,
  nextLevelCoinsPerHour: 1.25,
  nextLevelCosts: 100,
  maximumCapacity: 20,
  storage: 0,
  transferableCoins: 0,
};

describe('minerSteps', () => {
  it('grows cost by 1,5 and coins by 1,25 per level', () => {
    const s = minerSteps(miner, 10, 3);
    expect(s.map((x) => x.cost)).toEqual([0, 100, 150, 225]);
    expect(s.map((x) => x.totalCost)).toEqual([0, 100, 250, 475]);
    expect(s[3].rate).toBeCloseTo(1.953125);
    expect(s[2].extraRate).toBeCloseTo(0.5625);
  });

  it('makes each level pay back 1,2× slower than the one before', () => {
    const s = minerSteps(miner, 10, 3);
    expect(s[1].stepPaybackHours).toBeCloseTo(100 / (0.25 * 10));
    expect(s[2].stepPaybackHours! / s[1].stepPaybackHours!).toBeCloseTo(1.2);
    expect(s[3].stepPaybackHours! / s[2].stepPaybackHours!).toBeCloseTo(1.2);
    expect(s[2].paybackHours).toBeCloseTo(250 / (0.5625 * 10));
  });

  it('has no payback without a coin price and no steps without a next level', () => {
    expect(minerSteps(miner, undefined, 2)[1].stepPaybackHours).toBeNull();
    expect(minerSteps({ ...miner, nextLevelCosts: undefined }, 10, 5)).toHaveLength(1);
  });
});

describe('bestStep', () => {
  const s = minerSteps(miner, 10, 12);
  it('builds nothing when the horizon is shorter than the first payback', () => {
    expect(bestStep(s, 39, 10)).toBe(0);
  });
  it('builds as long as the level alone pays back within the horizon', () => {
    // paybacks: 40, 48, 57,6, 69,1 … hours
    expect(bestStep(s, 60, 10)).toBe(3);
    expect(netAfter(s[3], 60, 10)).toBeGreaterThan(netAfter(s[4], 60, 10));
  });
});

describe('affordableStep / planLength / storageHours', () => {
  const s = minerSteps(miner, 10, 5);
  it('counts levels the cash covers in total', () => {
    expect(affordableStep(s, 249)).toBe(1);
    expect(affordableStep(s, 250)).toBe(2);
    expect(affordableStep(s, 50)).toBe(0);
    expect(affordableStep(s, undefined)).toBeNull();
  });
  it('shows at least 10 levels and a few past the best', () => {
    expect(planLength(2, 1)).toBe(10);
    expect(planLength(9, 3)).toBe(13);
    expect(planLength(3, 40)).toBe(30);
  });
  it('reads the storage in hours', () => {
    expect(storageHours(miner)).toBe(20);
  });
});
