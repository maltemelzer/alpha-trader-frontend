import { describe, expect, it } from 'vitest';
import { daysToEarnBack, licenseProgress, reservesAmountError, reservesEffect, shareOfCash } from './reserves';

describe('reservesEffect', () => {
  it('moves cash into the reserves and scales income and credit line', () => {
    const e = reservesEffect(1_000_000, { cash: 3_000_000, reserves: 9_000_000 }, 0.5, 0.1);
    expect(e.cashAfter).toBe(2_000_000);
    expect(e.reservesAfter).toBe(10_000_000);
    expect(e.ratePerDay).toBeCloseTo(0.6);
    expect(e.incomeBefore).toBeCloseTo(54_000);
    expect(e.incomeAfter).toBeCloseTo(60_000);
    expect(e.creditBefore).toBe(900_000);
    expect(e.creditAfter).toBe(1_000_000);
  });

  it('knows no income without a rate and treats a negative amount as 0', () => {
    const e = reservesEffect(-5, { cash: 10 }, undefined);
    expect(e.amount).toBe(0);
    expect(e.reservesAfter).toBe(0);
    expect(e.incomeAfter).toBeUndefined();
  });
});

describe('reservesAmountError', () => {
  it('accepts empty input and amounts up to the cash', () => {
    expect(reservesAmountError('', null, 100)).toBeUndefined();
    expect(reservesAmountError('100', 100, 100)).toBeUndefined();
  });
  it('explains what is wrong', () => {
    expect(reservesAmountError('abc', null, 100)).toMatch(/Mio/);
    expect(reservesAmountError('0', 0, 100)).toMatch(/über 0/);
    expect(reservesAmountError('200', 200, 100.5)).toBe('Nicht genug Bargeld – höchstens 100,5 €.');
  });
});

describe('shareOfCash', () => {
  it('rounds down to the cent', () => {
    expect(shareOfCash(100.019, 1)).toBe(100.01);
    expect(shareOfCash(1_000, 0.25)).toBe(250);
    expect(shareOfCash(undefined, 0.5)).toBe(0);
  });
});

describe('daysToEarnBack / licenseProgress', () => {
  it('computes days at a daily rate', () => {
    expect(daysToEarnBack(0.5)).toBe(200);
    expect(daysToEarnBack(0)).toBeUndefined();
  });
  it('caps the license progress at 100 %', () => {
    expect(licenseProgress(2_500_000)).toBe(50);
    expect(licenseProgress(9e9)).toBe(100);
  });
});
