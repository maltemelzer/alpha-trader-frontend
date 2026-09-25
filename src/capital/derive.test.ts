import { describe, expect, it } from 'vitest';
import { dividendRows, measureRows, measureTotals, mergerRows, mergersByAcquirer, nextDate, statusOf } from './derive';

const co = (id: string) => ({ id, name: 'AG ' + id, securityIdentifier: 'ST' + id });
const merger = (id: string, acq: string, startDate: number, maximalCashVolume = 100) => ({
  id,
  startDate,
  maximalCashVolume,
  company: co(id),
  acquiringCompany: co(acq),
});

describe('dividendRows / mergerRows', () => {
  it('sorts by date and flattens the companies', () => {
    const d = dividendRows([
      { id: 'a', startDate: 20, maximalCashVolume: 5, company: co('a') },
      { id: 'b', startDate: 10, maximalCashVolume: 7, company: co('b') },
    ]);
    expect(d.map((r) => [r.id, r.asin, r.maximalCashVolume])).toEqual([
      ['b', 'STb', 7],
      ['a', 'STa', 5],
    ]);
    expect(mergerRows([merger('x', 'y', 3)])[0]).toMatchObject({ name: 'AG x', asin: 'STx', acquirer: 'AG y', acquirerAsin: 'STy' });
    expect(dividendRows(undefined)).toEqual([]);
  });
});

describe('mergersByAcquirer', () => {
  it('counts per acquirer, most first, with date span and summed caps', () => {
    const rows = mergerRows([merger('1', 'A', 30, 10), merger('2', 'A', 10, 5), merger('3', 'B', 20)]);
    expect(mergersByAcquirer(rows)).toEqual([
      { name: 'AG A', asin: 'STA', count: 2, volume: 15, first: 10, last: 30 },
      { name: 'AG B', asin: 'STB', count: 1, volume: 100, first: 20, last: 20 },
    ]);
  });

  it('folds small acquirers into „Übrige“, but never a single one', () => {
    const rows = mergerRows([merger('1', 'A', 1), merger('2', 'A', 2), merger('3', 'B', 3), merger('4', 'C', 4, 50)]);
    expect(mergersByAcquirer(rows, 2)).toHaveLength(3);
    const g = mergersByAcquirer(rows, 1);
    expect(g.map((x) => [x.name, x.count, x.rest ?? false])).toEqual([
      ['AG A', 2, false],
      ['Übrige (2)', 2, true],
    ]);
    expect(g[1]).toMatchObject({ volume: 150, first: 3, last: 4 });
  });
});

describe('nextDate', () => {
  it('finds the next date after now', () => {
    expect(nextDate([{ startDate: 5 }, { startDate: 30 }, { startDate: 20 }], 10)).toBe(20);
    expect(nextDate([{ startDate: 5 }], 10)).toBeUndefined();
  });
});

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
