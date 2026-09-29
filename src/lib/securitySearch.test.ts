import { describe, expect, it } from 'vitest';
import { isAsin, mergeHits, searchTerm, type SecurityHit } from './securitySearch';

const hit = (asin: string, type = 'STOCK'): SecurityHit => ({ asin, name: asin, type });

describe('searchTerm / isAsin', () => {
  it('drops the mention sign', () => {
    expect(searchTerm(' #BOXLWU96VV ')).toBe('BOXLWU96VV');
    expect(isAsin('#boxlwu96vv')).toBe(true);
    expect(isAsin('Alpha')).toBe(false);
    expect(isAsin('BOXLWU96V')).toBe(false);
  });
});

describe('mergeHits', () => {
  it('puts the exact ASIN first and keeps room for bonds', () => {
    const spreads = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map((a) => hit(a));
    const bonds = [hit('B1', 'BOND'), hit('S1', 'BOND')];
    expect(mergeHits({ exact: hit('X1'), spreads, bonds }, 6).map((h) => h.asin)).toEqual(['X1', 'S1', 'S2', 'S3', 'B1', 'S4']);
  });
  it('fills with spreads when there are no bonds', () => {
    expect(mergeHits({ spreads: [hit('S1'), hit('S2')], bonds: [] }, 8).map((h) => h.asin)).toEqual(['S1', 'S2']);
  });
});
