import { describe, expect, it } from 'vitest';
import type { ExperimentResults } from './api';
import type { Experiment } from './registry';
import { formatDwell, formatStars, leader, resultRows } from './results';

const exp: Experiment = {
  id: 'start',
  title: 'T',
  question: '?',
  until: '2026-10-31',
  fallback: 'a',
  variants: [
    { id: 'a', label: 'A', description: '' },
    { id: 'b', label: 'B', description: '' },
  ],
};

const variant = (o: Partial<ExperimentResults['variants'][string]>) => ({
  people: 0,
  visits: 0,
  dwellMedianMs: null,
  ratings: 0,
  stars: [0, 0, 0, 0, 0],
  avgStars: null,
  favorites: 0,
  clicks: [],
  ...o,
});

describe('resultRows', () => {
  it('keeps the registry order, fills missing variants, computes shares', () => {
    const rows = resultRows(exp, {
      experiment: 'start',
      comments: [],
      notes: [],
      variants: { b: variant({ ratings: 4, stars: [0, 0, 1, 1, 2], avgStars: 4.25, favorites: 3 }), a: variant({ favorites: 1 }) },
    });
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows[1].favoriteShare).toBe(0.75);
    expect(rows[1].starShares).toEqual([0, 0, 0.25, 0.25, 0.5]);
    expect(resultRows(exp, undefined)[0].people).toBe(0);
  });
});

describe('leader', () => {
  it('prefers favourite votes, then the average with enough ratings, else nobody', () => {
    const rows = resultRows(exp, {
      experiment: 'start',
      comments: [],
      notes: [],
      variants: { a: variant({ favorites: 2 }), b: variant({ favorites: 1, ratings: 5, avgStars: 5 }) },
    });
    expect(leader(rows)).toBe('a');
    const tie = resultRows(exp, {
      experiment: 'start',
      comments: [],
      notes: [],
      variants: { a: variant({ ratings: 3, avgStars: 3 }), b: variant({ ratings: 2, avgStars: 5 }) },
    });
    expect(leader(tie)).toBe('a');
    expect(leader(resultRows(exp, undefined))).toBeUndefined();
  });
});

describe('format', () => {
  it('writes dwell times and stars in German', () => {
    expect(formatDwell(45_000)).toBe('45 s');
    expect(formatDwell(125_000)).toBe('2:05 Min.');
    expect(formatDwell(4_200_000)).toBe('1 Std. 10 Min.');
    expect(formatDwell(null)).toBe('–');
    expect(formatStars(4.25)).toBe('4,3');
  });
});
