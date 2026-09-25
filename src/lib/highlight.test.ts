import { describe, expect, it } from 'vitest';
import { matchRanges, searchTerms, snippet, termPattern } from './highlight';

describe('searchTerms', () => {
  it('splits, lowercases, drops one-letter words and quotes, longest first', () => {
    expect(searchTerms(' „Leitzins“  a Zins leitzins ')).toEqual(['leitzins', 'zins']);
    expect(searchTerms('')).toEqual([]);
  });
});

describe('termPattern / matchRanges', () => {
  it('whole words only for the forum search', () => {
    const p = termPattern(['anleihe'], true);
    expect(matchRanges('Anleihe, Anleihen und Systemanleihe', p)).toEqual([[0, 7]]);
  });
  it('any part of a word for the newspaper search', () => {
    const p = termPattern(['anleihe'], false);
    expect(matchRanges('Anleihe, Anleihen und Systemanleihe', p)).toEqual([
      [0, 7],
      [9, 16],
      [28, 35],
    ]);
  });
  it('treats umlauts as letters and escapes regex characters', () => {
    expect(matchRanges('Brötchen Brötchenkrümel', termPattern(['brötchen'], true))).toEqual([[0, 8]]);
    expect(matchRanges('Kurs (+5 %)', termPattern(['(+5'], false))).toEqual([[5, 8]]);
  });
  it('no terms → no pattern, no ranges', () => {
    expect(termPattern([], true)).toBeNull();
    expect(matchRanges('abc', null)).toEqual([]);
  });
});

describe('snippet', () => {
  const long = `${'Vorrede '.repeat(40)}Hier steht der Leitzins im Text ${'und danach noch mehr '.repeat(20)}`;
  it('cuts around the first match at word boundaries', () => {
    const s = snippet(long, termPattern(['leitzins'], true), 120);
    expect(s.startsWith('… ')).toBe(true);
    expect(s.endsWith(' …')).toBe(true);
    expect(s).toContain('Leitzins');
    expect(s.length).toBeLessThanOrEqual(124);
    expect(s).not.toMatch(/… \S*orred /); // starts with a whole word
  });
  it('short texts stay whole, whitespace collapsed', () => {
    expect(snippet('  kurz \n und  knapp ', null)).toBe('kurz und knapp');
  });
  it('without a match: the beginning', () => {
    expect(snippet(long, termPattern(['fehlt'], true), 60).startsWith('Vorrede')).toBe(true);
  });
});
