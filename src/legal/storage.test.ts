import { describe, expect, it } from 'vitest';
import { NOT_STORAGE, STORAGE } from './storage';

// All source files as text – a new key in the code must show up in the privacy policy.
const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../api/schema.d.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('privacy policy: browser storage', () => {
  it('lists every key the code uses', () => {
    const listed = STORAGE.map((e) => e.key.replace('<id>', ''));
    const used = new Set<string>();
    for (const text of Object.values(sources)) {
      // a template like `at.exp.${id}` yields the prefix `at.exp.`, matched against `at.exp.<id>`
      for (const m of text.matchAll(/['`](at[.:][a-zA-Z.-]+)/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !NOT_STORAGE.includes(k) && !listed.some((l) => (l.endsWith('.') ? k.startsWith(l) : k === l)));
    expect(missing).toEqual([]);
  });
});
