import { describe, expect, it } from 'vitest';
import { isComplete, parseLegal } from './config';

describe('parseLegal', () => {
  it('keeps strings, trims them and knows only cloudflare as service in front', () => {
    const c = parseLegal({ name: ' Max ', street: 'Weg 1', city: '1 Ort', email: 'a@b.de', cdn: 'Cloudflare', phone: 42 });
    expect(c).toMatchObject({ name: 'Max', phone: '', cdn: 'cloudflare' });
    expect(isComplete(c)).toBe(true);
    expect(parseLegal({ cdn: 'akamai' }).cdn).toBe('');
    expect(isComplete(parseLegal(null))).toBe(false);
  });
});
