import { useEffect, type RefObject } from 'react';
import './highlight.css';

// Search terms highlighted in rendered text (also inside design-system components) through the
// CSS Custom Highlight API: ranges are registered under a name and styled with ::highlight(name) –
// no extra markup. Browsers without the API simply show no highlight.

/** Words of a search query, longest first (so „Anleihen“ wins over „Anleihe“), without duplicates. */
export function searchTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^["'„“]+|["'“”]+$/g, ''))
    .filter((w) => w.length >= 2);
  return [...new Set(words)].sort((a, b) => b.length - a.length);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex for the terms: whole words (the forum search) or anywhere in a word (the newspaper search). */
export function termPattern(terms: string[], wholeWords: boolean): RegExp | null {
  if (!terms.length) return null;
  const alt = terms.map(escape).join('|');
  return wholeWords ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'giu') : new RegExp(alt, 'giu');
}

/** Start/end offsets of all matches in a text. */
export function matchRanges(text: string, pattern: RegExp | null): [number, number][] {
  if (!pattern) return [];
  const out: [number, number][] = [];
  for (const m of text.matchAll(pattern)) out.push([m.index, m.index + m[0].length]);
  return out;
}

/**
 * A short excerpt around the first match (for result lists): whole words, „…“ where cut.
 * Without a match the beginning of the text.
 */
export function snippet(text: string, pattern: RegExp | null, max = 180): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const first = matchRanges(flat, pattern)[0];
  let start = first ? Math.max(0, first[0] - Math.round(max / 3)) : 0;
  if (start > 0) {
    const space = flat.indexOf(' ', start);
    start = space >= 0 && space < (first?.[0] ?? Infinity) ? space + 1 : start;
  }
  let end = Math.min(flat.length, start + max);
  if (end < flat.length) {
    const space = flat.lastIndexOf(' ', end);
    if (space > start + max / 2) end = space;
  }
  return `${start > 0 ? '… ' : ''}${flat.slice(start, end)}${end < flat.length ? ' …' : ''}`;
}

type HighlightRegistry = Map<string, unknown>;
type HighlightCtor = new (...ranges: Range[]) => unknown;

/**
 * Highlights the search terms in everything rendered inside `ref` (named highlight, CSS
 * `::highlight(<name>)`), and again whenever the content changes.
 */
export function useHighlight(ref: RefObject<HTMLElement | null>, query: string, opts: { wholeWords?: boolean; name?: string } = {}) {
  const name = opts.name ?? 'suche';
  const wholeWords = !!opts.wholeWords;
  useEffect(() => {
    const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined)?.highlights;
    const Ctor = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
    const root = ref.current;
    if (!registry || !Ctor || !root) return;
    const pattern = termPattern(searchTerms(query), wholeWords);
    if (!pattern) {
      registry.delete(name);
      return;
    }
    let frame = 0;
    const paint = () => {
      frame = 0;
      const ranges: Range[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.nodeValue ?? '';
        for (const [a, b] of matchRanges(text, pattern)) {
          const r = document.createRange();
          r.setStart(n, a);
          r.setEnd(n, b);
          ranges.push(r);
        }
      }
      registry.set(name, new Ctor(...ranges));
    };
    paint();
    const mo = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(paint);
    });
    mo.observe(root, { subtree: true, childList: true, characterData: true });
    return () => {
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
      registry.delete(name);
    };
  }, [ref, query, wholeWords, name]);
}
