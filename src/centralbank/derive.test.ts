import { describe, expect, it } from 'vitest';
import { bankShares, dueByDay, rateWindow, reserveIncome, tenderRate } from './derive';

describe('tenderRate', () => {
  it('reads a bid as rate', () => {
    expect(tenderRate(98)).toBe(2);
    expect(tenderRate(102)).toBe(-2);
    expect(tenderRate(99.29)).toBeCloseTo(0.71, 6);
    expect(tenderRate(undefined)).toBeUndefined();
  });
});

describe('bankShares', () => {
  it('keeps the largest and sums the rest', () => {
    const rows = bankShares(
      [
        { name: 'A', reserves: 60 },
        { name: 'B', reserves: 30 },
        { name: 'C', reserves: 6 },
        { name: 'D', reserves: 4 },
        { name: 'E', reserves: 0 },
      ],
      2,
    );
    expect(rows.map((r) => [r.name, r.percent])).toEqual([
      ['A', 60],
      ['B', 30],
      ['Übrige (2)', 10],
    ]);
    expect(rows[2].rest).toBe(true);
  });
  it('is empty without reserves', () => {
    expect(bankShares([{ name: 'A', reserves: 0 }])).toEqual([]);
  });
});

describe('rateWindow', () => {
  it('sorts and cuts to the window', () => {
    const pts = [{ date: 30 }, { date: 10 }, { date: 20 }];
    expect(rateWindow(pts, 15, 35).map((p) => p.date)).toEqual([20, 30]);
    expect(rateWindow(pts, undefined).map((p) => p.date)).toEqual([10, 20, 30]);
  });
});

describe('reserveIncome', () => {
  it('is reserves times the daily rate', () => {
    expect(reserveIncome(100_000_000, 2)).toBe(2_000_000);
    expect(reserveIncome(undefined, 2)).toBeUndefined();
  });
});

describe('dueByDay', () => {
  it('sums running bonds per day and skips matured ones', () => {
    const day = (d: number, h: number) => new Date(2026, 8, d, h).getTime();
    const out = dueByDay(
      [
        { maturityDate: day(26, 3), volume: 10 },
        { maturityDate: day(26, 20), volume: 5 },
        { maturityDate: day(27, 1), volume: 7 },
        { maturityDate: day(24, 1), volume: 99 },
      ],
      day(25, 12),
    );
    expect(out.map((d) => [new Date(d.day).getDate(), d.volume, d.count])).toEqual([
      [26, 15, 2],
      [27, 7, 1],
    ]);
  });
});
