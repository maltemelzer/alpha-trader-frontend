import { describe, expect, it } from 'vitest';
import { assignedVariant, clickTarget, hash, nextInTour, parseLocal, pickVariant, PROMPT_AFTER_MS, shouldPrompt, tourOrder } from './assign';
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
const ab: Experiment = { ...exp, mode: 'ab' };
const day = '2026-10-01';

describe('tour (compare)', () => {
  it('gives every player all variants, in an order that differs between players', () => {
    const orders = new Set<string>();
    const firsts: Record<string, number> = {};
    for (let i = 0; i < 600; i++) {
      const o = tourOrder(exp, `spieler${i}`);
      expect([...o].sort()).toEqual(['a', 'b', 'c']);
      orders.add(o.join(''));
      firsts[o[0]] = (firsts[o[0]] ?? 0) + 1;
    }
    expect(orders.size).toBe(6);
    for (const n of Object.values(firsts)) expect(n).toBeGreaterThan(150);
    expect(tourOrder(exp, 'Malte')).toEqual(tourOrder(exp, 'malte'));
  });

  it('goes on with the next unrated variant after the current one, wrapping around', () => {
    expect(nextInTour(['b', 'c', 'a'], [])).toBe('b');
    expect(nextInTour(['b', 'c', 'a'], ['b'])).toBe('c');
    expect(nextInTour(['b', 'c', 'a'], ['c'], 'c')).toBe('a');
    expect(nextInTour(['b', 'c', 'a'], ['a'], 'a')).toBe('b');
    expect(nextInTour(['b', 'c', 'a'], ['a', 'b', 'c'])).toBeUndefined();
  });

  it('shows the next unrated variant, then the favourite; an own choice always wins', () => {
    const order = tourOrder(exp, 'x');
    expect(pickVariant(exp, 'x', { day, rated: [] })).toEqual({ variant: order[0], source: 'tour' });
    expect(pickVariant(exp, 'x', { day, rated: [order[0]] })).toEqual({ variant: order[1], source: 'tour' });
    expect(pickVariant(exp, 'x', { day, rated: order })).toEqual({ variant: order[0], source: 'tour' });
    expect(pickVariant(exp, 'x', { day, rated: order, favorite: 'c' })).toEqual({ variant: 'c', source: 'favorite' });
    expect(pickVariant(exp, 'x', { day, rated: [], override: 'b' })).toEqual({ variant: 'b', source: 'chosen' });
  });

  it('waits for name and ratings, showing the variant from last time meanwhile', () => {
    expect(pickVariant(exp, 'x', { day })).toBeUndefined();
    expect(pickVariant(exp, undefined, { day, cached: 'c' })).toEqual({ variant: 'c', source: 'tour' });
    expect(pickVariant(exp, 'x', { day, cached: 'zzz' })).toBeUndefined();
  });
});

describe('assignment (ab)', () => {
  it('is stable and spreads players roughly evenly', () => {
    expect(assignedVariant(ab, 'Malte')).toBe(assignedVariant(ab, 'malte'));
    expect(hash('x')).toBe(hash('x'));
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const v = assignedVariant(ab, `spieler${i}`);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(850);
    expect(pickVariant(ab, 'x', { day })).toEqual({ variant: assignedVariant(ab, 'x'), source: 'assigned' });
  });

  it('falls back after the end, whatever was chosen', () => {
    expect(pickVariant(ab, 'x', { override: 'b', day: '2026-11-01' })).toEqual({ variant: 'a', source: 'fallback' });
    expect(pickVariant(exp, 'x', { override: 'zzz', day, rated: [] })?.source).toBe('tour');
  });
});

describe('prompt', () => {
  it('asks once per variant after enough visible time, never when rated', () => {
    const s = parseLocal(JSON.stringify({ dwell: { a: PROMPT_AFTER_MS.compare }, prompted: ['b'] }));
    expect(shouldPrompt(s, 'a', false, PROMPT_AFTER_MS.compare)).toBe(true);
    expect(shouldPrompt(s, 'a', false, PROMPT_AFTER_MS.ab)).toBe(false);
    expect(shouldPrompt(s, 'a', true, PROMPT_AFTER_MS.compare)).toBe(false);
    expect(shouldPrompt({ ...s, dwell: { b: PROMPT_AFTER_MS.ab } }, 'b', false, PROMPT_AFTER_MS.compare)).toBe(false);
    expect(shouldPrompt(s, 'c', false, PROMPT_AFTER_MS.compare)).toBe(false);
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
