import { describe, expect, it } from 'vitest';
import { assignedVariant, clickTarget, hash, parseLocal, pickVariant, PROMPT_AFTER_MS, shouldPrompt } from './assign';
import type { Experiment } from './registry';

const exp: Experiment = {
  id: 'start',
  title: 'Test',
  question: '?',
  variants: [
    { id: 'a', label: 'A', description: '' },
    { id: 'b', label: 'B', description: '' },
    { id: 'c', label: 'C', description: '' },
  ],
  until: '2026-10-31',
  fallback: 'a',
};

describe('assignment', () => {
  it('is stable and ignores case of the name', () => {
    expect(assignedVariant(exp, 'Malte')).toBe(assignedVariant(exp, 'malte'));
    expect(hash('x')).toBe(hash('x'));
  });

  it('spreads players roughly evenly', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const v = assignedVariant(exp, `spieler${i}`);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(850);
  });

  it('lets an own valid choice win, falls back after the end', () => {
    expect(pickVariant(exp, 'x', { override: 'b', day: '2026-10-01' })).toEqual({ variant: 'b', chosen: true });
    expect(pickVariant(exp, 'x', { override: 'zzz', day: '2026-10-01' })?.chosen).toBe(false);
    expect(pickVariant(exp, 'x', { override: 'b', day: '2026-11-01' })).toEqual({ variant: 'a', chosen: false });
    expect(pickVariant(exp, 'x', { day: '2026-10-31' })?.variant).toBe(assignedVariant(exp, 'x'));
    expect(pickVariant(exp, undefined, { day: '2026-10-01', cached: 'c' })).toEqual({ variant: 'c', chosen: false });
    expect(pickVariant(exp, undefined, { day: '2026-10-01' })).toBeUndefined();
  });
});

describe('prompt', () => {
  it('asks once per variant after enough visible time, never when rated', () => {
    const s = parseLocal(JSON.stringify({ dwell: { a: PROMPT_AFTER_MS }, prompted: ['b'] }));
    expect(shouldPrompt(s, 'a', false)).toBe(true);
    expect(shouldPrompt(s, 'a', true)).toBe(false);
    expect(shouldPrompt({ ...s, dwell: { b: PROMPT_AFTER_MS } }, 'b', false)).toBe(false);
    expect(shouldPrompt(s, 'c', false)).toBe(false);
  });

  it('survives broken storage', () => {
    expect(parseLocal('{kaputt')).toEqual({ seen: [], dwell: {}, prompted: [] });
  });
});

describe('clickTarget', () => {
  it('keeps only coarse targets', () => {
    expect(clickTarget(null, '/wertpapier/STSN3G03LB?markt=depth')).toBe('/wertpapier');
    expect(clickTarget('card:Herzschlag', '/x')).toBe('card:herzschlag');
    expect(clickTarget(null, 'https://example.com/a')).toBeNull();
    expect(clickTarget(null, '//evil')).toBeNull();
    expect(clickTarget(null, '/')).toBeNull();
  });
});
