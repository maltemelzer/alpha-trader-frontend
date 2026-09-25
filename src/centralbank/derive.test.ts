import { describe, expect, it } from 'vitest';
import { bankShares, dueByDay, potRows, rateOnlyBelowTarget, rateWindow, reserveIncome, signedPct, supplySeries, targetGrowthPct } from './derive';

describe('supplySeries', () => {
  it('sorts oldest first, computes the gap to the target and the rate in %', () => {
    const s = supplySeries([
      { date: 2, playerMoneySupply: 97, targetSupply: 100, soldBondVolume: 5, appliedInterestRate: 0.02 },
      { date: 1, playerMoneySupply: 110, targetSupply: 100, soldBondVolume: 0, appliedInterestRate: 0 },
    ]);
    expect(s.map((p) => p.date)).toEqual([1, 2]);
    expect(s[0].gapPct).toBeCloseTo(10);
    expect(s[1].gapPct).toBeCloseTo(-3);
    expect(s[1].ratePct).toBeCloseTo(2);
    expect(supplySeries(undefined)).toEqual([]);
  });
});

describe('targetGrowthPct / rateOnlyBelowTarget', () => {
  const pt = (supply: number, target: number, ratePct = 0) => ({ date: 0, supply, target, gapPct: (supply / target - 1) * 100, soldBondVolume: 0, ratePct });

  it('finds the fixed step of the target over the previous supply', () => {
    expect(targetGrowthPct([pt(100, 90), pt(120, 100.1), pt(50, 120.12)])).toBeCloseTo(0.1);
    expect(targetGrowthPct([pt(100, 90), pt(120, 105)])).toBeCloseTo(5);
    expect(targetGrowthPct([pt(100, 90), pt(120, 100.1), pt(50, 150)])).toBeUndefined();
    expect(targetGrowthPct([pt(100, 90)])).toBeUndefined();
  });

  it('holds only when every rate came below target', () => {
    expect(rateOnlyBelowTarget([pt(99, 100, 2), pt(110, 100, 0)])).toBe(true);
    expect(rateOnlyBelowTarget([pt(99, 100, 2), pt(110, 100, 1)])).toBe(false);
    expect(rateOnlyBelowTarget([pt(110, 100, 0)])).toBe(false);
  });
});

describe('potRows', () => {
  it('drops empty pots, labels in German and sorts by cash', () => {
    const rows = potRows([
      { pot: 'PLAYERS', cash: 25, accountCount: 10 },
      { pot: 'ORPHANED', cash: 0, accountCount: 0 },
      { pot: 'ALPHA_BANK', cash: 75, accountCount: 1 },
      { pot: 'NEW_POT', cash: 0.0001, accountCount: 1 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(['Alpha Bank', 'Spieler', 'NEW_POT']);
    expect(rows[0].percent).toBeCloseTo(75);
    expect(potRows([])).toEqual([]);
  });
});

describe('signedPct', () => {
  it('writes sign and real minus', () => {
    expect(signedPct(5.88)).toBe('+5,9 %');
    expect(signedPct(-3.296, 2)).toBe('−3,30 %');
    expect(signedPct(0)).toBe('±0,0 %');
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
