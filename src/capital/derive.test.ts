import { describe, expect, it } from 'vitest';
import { measureRows, measureTotals, statusOf } from './derive';

const m = (id: string, startDate: number, endDate: number, cashVolume = 100) => ({
  id,
  numberOfShares: 10,
  price: 10,
  cashVolume,
  startDate,
  endDate,
  company: { id: 'c' + id, name: 'AG ' + id, securityIdentifier: 'ST' + id },
});

describe('statusOf', () => {
  it('distinguishes planned, running and ended', () => {
    expect(statusOf({ startDate: 10, endDate: 20 }, 5)).toBe('planned');
    expect(statusOf({ startDate: 10, endDate: 20 }, 10)).toBe('running');
    expect(statusOf({ startDate: 10, endDate: 20 }, 20)).toBe('ended');
  });
});

describe('measureRows', () => {
  it('merges both kinds, running first, and computes progress', () => {
    const rows = measureRows([m('a', 100, 200), m('b', 0, 10)], [m('c', 40, 60)], 50);
    expect(rows.map((r) => [r.id, r.kind, r.status])).toEqual([
      ['c', 'reduction', 'running'],
      ['a', 'increase', 'planned'],
      ['b', 'increase', 'ended'],
    ]);
    expect(rows[0].progress).toBe(0.5);
    expect(rows[1].progress).toBe(0);
    expect(rows[2].progress).toBe(1);
    expect(rows[0].asin).toBe('STc');
  });

  it('sums volumes per kind', () => {
    const rows = measureRows([m('a', 0, 1, 300), m('b', 0, 1, 200)], [m('c', 0, 1, 50)], 0);
    expect(measureTotals(rows)).toEqual({ increase: 500, reduction: 50, count: 3 });
  });
});
