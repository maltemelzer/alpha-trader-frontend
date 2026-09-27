import { describe, expect, it } from 'vitest';
import { applyFilters, changedFilters, filtersFor, filterSummary, readFilters, resolveView, splitFilters, visibleViews, type FilterDef } from './pagenav';
import { rangeMs, rangeOptions } from './ranges';

const views = [
  { value: 'zinsen', label: 'Zinsen' },
  { value: 'banken', label: 'Banken', parent: 'zinsen' },
  { value: 'tender', label: 'Tender' },
];

const defs: FilterDef[] = [
  { key: 'zeitraum', label: 'Zeitraum', fallback: '30T', options: rangeOptions(['7T', '30T', 'alle']), primary: true, aliases: ['verlauf'] },
  { key: 'annahme', label: 'Übrige Gebote', fallback: 'buch', options: [{ value: 'buch', label: 'Buch jetzt' }, { value: 'gestern', label: 'wie zuletzt' }], views: ['tender'] },
  { key: 'konto', label: 'Konto', fallback: '', summary: (v) => `Konto ${v}` },
];

describe('resolveView', () => {
  it('falls back for missing and unknown values', () => {
    expect(resolveView(null, views, 'zinsen', false)).toBe('zinsen');
    expect(resolveView('quatsch', views, 'zinsen', true)).toBe('zinsen');
  });
  it('shows the parent of a phone-only view on wide screens', () => {
    expect(resolveView('banken', views, 'zinsen', false)).toBe('zinsen');
    expect(resolveView('banken', views, 'zinsen', true)).toBe('banken');
  });
  it('maps old values', () => {
    expect(resolveView('book', views, 'zinsen', true, { book: 'tender' })).toBe('tender');
  });
  it('hides phone-only views on wide screens', () => {
    expect(visibleViews(views, false).map((v) => v.value)).toEqual(['zinsen', 'tender']);
    expect(visibleViews(views, true)).toHaveLength(3);
  });
});

describe('filters', () => {
  it('reads values, validates them and honours old keys', () => {
    expect(readFilters(new URLSearchParams('verlauf=7T&konto=42'), defs)).toEqual({ zeitraum: '7T', annahme: 'buch', konto: '42' });
    expect(readFilters(new URLSearchParams('zeitraum=14T&annahme=x'), defs)).toEqual({ zeitraum: '30T', annahme: 'buch', konto: '' });
  });
  it('writes a patch in one step, keeps other keys, drops fallbacks, aliases and the page', () => {
    const next = applyFilters(new URLSearchParams('ansicht=tender&verlauf=7T&seite=3&annahme=gestern'), defs, { zeitraum: 'alle', annahme: 'buch' });
    expect(next.toString()).toBe('ansicht=tender&zeitraum=alle');
    expect(applyFilters(new URLSearchParams('zeitraum=7T'), defs, { zeitraum: '30T' }).toString()).toBe('');
  });
  it('limits filters to their views', () => {
    expect(filtersFor(defs, 'zinsen').map((d) => d.key)).toEqual(['zeitraum', 'konto']);
    expect(filtersFor(defs, 'tender')).toHaveLength(3);
  });
  it('summarises changed filters', () => {
    const values = { zeitraum: '7T', annahme: 'buch', konto: '42' };
    expect(changedFilters(defs, values).map((d) => d.key)).toEqual(['zeitraum', 'konto']);
    expect(filterSummary(defs, values)).toBe('7 T · Konto 42');
  });
  it('puts up to two controls in the bar, else only the primary ones', () => {
    expect(splitFilters(defs).inline.map((d) => d.key)).toEqual(['zeitraum', 'annahme']);
    const three = [...defs, { key: 'art', label: 'Art', fallback: 'a', options: [{ value: 'a', label: 'A' }] }];
    const split = splitFilters(three);
    expect(split.inline.map((d) => d.key)).toEqual(['zeitraum']);
    expect(split.sheet.map((d) => d.key)).toEqual(['annahme', 'art']);
  });
});

describe('ranges', () => {
  it('shares one vocabulary', () => {
    expect(rangeOptions(['1h', 'alle'])).toEqual([
      { value: '1h', label: '1 Std', ms: 3_600_000 },
      { value: 'alle', label: 'Alle', ms: undefined },
    ]);
    expect(rangeMs('7T')).toBe(7 * 86_400_000);
    expect(rangeMs('x')).toBeUndefined();
  });
});
