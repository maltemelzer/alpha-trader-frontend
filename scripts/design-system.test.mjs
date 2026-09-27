import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DS_DIR, NAMESPACE, expectedTokensCss, tokensToCss } from './design-system.mjs';

describe('tokensToCss', () => {
  const css = tokensToCss({
    color: {
      themes: [{ id: 'dark' }, { id: 'cb' }],
      tokens: [
        { name: 'gain', value: { dark: '#7FD1A3', cb: '#82B6F0' } },
        { name: 'bg-card', value: { dark: '#182A22' } },
        { name: 'unchanged', value: '{text-secondary}' },
      ],
    },
    type: { families: { mono: 'Plex, monospace' }, groups: [] },
    spacing: { tokens: [{ name: 'space-4', value: '16px' }] },
  });

  it('writes the first theme to :root', () => {
    expect(css).toMatch(/:root \{[^}]*--gain: #7FD1A3;[^}]*--bg-card: #182A22;/s);
  });

  it('overrides only tokens that differ per theme', () => {
    expect(css).toMatch(/\[data-theme="cb"\] \{\n {2}--gain: #82B6F0;\n\}/);
  });

  it('resolves aliases, fonts and other families', () => {
    expect(css).toContain('--unchanged: var(--text-secondary);');
    expect(css).toContain('--font-mono: Plex, monospace;');
    expect(css).toContain('--space-4: 16px;');
  });
});

describe('design-system/', () => {
  it('has an up-to-date tokens.css (run `npm run ds:tokens`)', () => {
    expect(readFileSync(join(DS_DIR, 'tokens.css'), 'utf8')).toBe(expectedTokensCss());
  });

  it('bundle.js assigns the namespace', () => {
    expect(readFileSync(join(DS_DIR, 'components/bundle.js'), 'utf8')).toContain(`window.${NAMESPACE}`);
  });
});
