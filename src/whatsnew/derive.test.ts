import { describe, expect, it } from 'vitest';
import { UI_CHANGES } from './changelog';
import { dayLabel, engineUpdates, germanPart, mergeSeen, parseSeen, sections, seenAfter, unseen, type EngineUpdate } from './derive';

const POST = {
  id: 'p1',
  title: 'Updates on Alpha-Trader.com (20260928)',
  dateCreated: 1790591215600,
  content:
    '<h2>Funds invest</h2>\n<p>English text.</p>\n<hr>\n<h2 style="x">Fonds investieren</h2>\n<p>Erster Absatz.</p>\n<p>Zweiter.</p>\n<h2>Fairer NAV</h2>\n<p>Text &amp; mehr.</p>',
};

describe('engineUpdates', () => {
  it('keeps only update posts and takes the German topics', () => {
    const [u, ...rest] = engineUpdates([POST, { id: 'x', title: 'Something else', dateCreated: 1, content: '' }]);
    expect(rest).toEqual([]);
    expect(u.day).toBe('2026-09-28');
    expect(u.sections).toEqual([
      { heading: 'Fonds investieren', text: 'Erster Absatz.\n\nZweiter.' },
      { heading: 'Fairer NAV', text: 'Text & mehr.' },
    ]);
  });

  it('sorts newest first', () => {
    const list = engineUpdates([
      { ...POST, id: 'a', dateCreated: 1 },
      { ...POST, id: 'b', dateCreated: 3 },
    ]);
    expect(list.map((u) => u.id)).toEqual(['b', 'a']);
  });
});

describe('germanPart / sections', () => {
  it('uses the whole post without <hr> and keeps text before the first heading', () => {
    expect(germanPart('<p>nur</p>')).toBe('<p>nur</p>');
    expect(sections('<p>Vorwort</p><h2>A</h2><p>a</p>')).toEqual([
      { heading: '', text: 'Vorwort' },
      { heading: 'A', text: 'a' },
    ]);
  });
});

describe('seen', () => {
  const u = (id: string, date: number): EngineUpdate => ({ id, date, day: '', sections: [] });
  const ui = [{ id: '2026-09-28', title: '', items: [] }, { id: '2026-09-01', title: '', items: [] }];
  const now = Date.UTC(2026, 8, 28, 12);

  it('parses only valid records', () => {
    expect(parseSeen('{"engine":5,"ui":"2026-09-01"}')).toEqual({ engine: 5, ui: '2026-09-01' });
    expect(parseSeen('kaputt')).toBeNull();
    expect(parseSeen('{"engine":"5"}')).toBeNull();
    expect(parseSeen(null)).toBeNull();
  });

  it('merges to the later of local and server', () => {
    expect(mergeSeen({ engine: 5, ui: '2026-09-28' }, { engine: 9, ui: '2026-09-01' })).toEqual({ engine: 9, ui: '2026-09-28' });
    expect(mergeSeen(null, { engine: 1, ui: 'a' })).toEqual({ engine: 1, ui: 'a' });
  });

  it('shows what is newer than seen, on a first visit only the last 14 days', () => {
    const engine = [u('new', now - 86_400_000), u('old', now - 30 * 86_400_000)];
    expect(unseen({ engine, ui, seen: null, now })).toEqual({ engine: [engine[0]], ui: [ui[0]] });
    expect(unseen({ engine, ui, seen: { engine: now - 86_400_000, ui: '2026-09-01' }, now })).toEqual({ engine: [], ui: [ui[0]] });
  });

  it('marks everything shown as seen and never goes back', () => {
    expect(seenAfter(null, [u('a', 7), u('b', 3)], ui)).toEqual({ engine: 7, ui: '2026-09-28' });
    expect(seenAfter({ engine: 9, ui: '2027-01-01' }, [u('a', 7)], ui)).toEqual({ engine: 9, ui: '2027-01-01' });
  });
});

describe('changelog', () => {
  it('is newest first with unique ids', () => {
    const ids = UI_CHANGES.map((c) => c.id);
    expect([...ids].sort().reverse()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(dayLabel('2026-09-28-2')).toBe('28.09.2026');
  });
});
