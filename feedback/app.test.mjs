import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cachedVerifier, createHandler, HttpError, parseRating, parseUsage, rateLimiter, summarize } from './app.mjs';
import { openStore } from './store.mjs';

describe('validation', () => {
  it('accepts a rating and trims the comment', () => {
    expect(parseRating({ experiment: 'start', variant: 'puls', stars: 4, comment: '  gut  ' })).toEqual({
      experiment: 'start',
      variant: 'puls',
      stars: 4,
      comment: 'gut',
    });
  });

  it('rejects stars outside 1–5, odd ids and long comments', () => {
    expect(() => parseRating({ experiment: 'start', variant: 'puls', stars: 6 })).toThrow(HttpError);
    expect(() => parseRating({ experiment: 'start', variant: 'puls', stars: 2.5 })).toThrow(HttpError);
    expect(() => parseRating({ experiment: 'Start!', variant: 'puls', stars: 3 })).toThrow(HttpError);
    expect(() => parseRating({ experiment: 'start', variant: 'puls', stars: 3, comment: 'x'.repeat(2001) })).toThrow(HttpError);
  });

  it('caps dwell time and click counts of a usage batch', () => {
    const u = parseUsage({ experiment: 'start', variant: 'puls', visit: true, dwellMs: 5 * 3600_000, clicks: { '/markt': 500 } });
    expect(u).toEqual({ experiment: 'start', variant: 'puls', visits: 1, dwellMs: 30 * 60_000, clicks: { '/markt': 100 } });
    expect(() => parseUsage({ experiment: 'start', variant: 'puls', clicks: { '/markt?q=Alpha Kasse': 1 } })).toThrow(HttpError);
  });
});

describe('summarize', () => {
  it('counts people, median dwell per visit, stars and favourites per variant', () => {
    const s = summarize('start', {
      exposures: [
        { variant: 'puls', visits: 2, dwell_ms: 60_000 },
        { variant: 'puls', visits: 1, dwell_ms: 10_000 },
        { variant: 'zeitstrom', visits: 1, dwell_ms: 5_000 },
      ],
      ratings: [
        { variant: 'puls', username: 'a', stars: 5, comment: 'super', created: 1, updated: 1 },
        { variant: 'puls', username: 'b', stars: 3, comment: '', created: 1, updated: 1 },
      ],
      favorites: [{ variant: 'puls', n: 2 }],
      clicks: [{ variant: 'puls', target: '/markt', count: 4 }],
    });
    expect(s.variants.puls).toMatchObject({ people: 2, visits: 3, dwellMedianMs: 20_000, ratings: 2, avgStars: 4, favorites: 2 });
    expect(s.variants.puls.stars).toEqual([0, 0, 1, 0, 1]);
    expect(s.variants.zeitstrom).toMatchObject({ people: 1, ratings: 0, avgStars: null });
    expect(s.comments).toHaveLength(2);
  });
});

describe('rateLimiter / cachedVerifier', () => {
  it('limits per key within the window', () => {
    const ok = rateLimiter(2, 1000);
    expect([ok('a', 0), ok('a', 1), ok('a', 2), ok('b', 2), ok('a', 1000)]).toEqual([true, true, false, true, true]);
  });

  it('asks the game server once per token and window', async () => {
    let calls = 0;
    const verify = cachedVerifier(async () => (calls++, 'Malte'), 1000);
    expect(await verify('t', 0)).toBe('Malte');
    expect(await verify('t', 500)).toBe('Malte');
    await verify('t', 1500);
    expect(calls).toBe(2);
  });
});

describe('HTTP', () => {
  let store;
  let server;
  let base;
  const users = { tok1: 'Malte', tok2: 'Anna' };

  beforeEach(async () => {
    store = openStore(':memory:');
    const verify = async (token) => {
      if (!users[token]) throw new HttpError(401, 'nicht angemeldet');
      return users[token];
    };
    server = createServer(createHandler({ store, verify, admins: new Set(['malte']) }));
    await new Promise((r) => server.listen(0, r));
    base = `http://127.0.0.1:${server.address().port}/feedback-api`;
  });

  afterEach(() => {
    server.close();
    store.close();
  });

  const call = (path, { token = 'tok2', method = 'GET', body } = {}) =>
    fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  it('needs a valid login', async () => {
    expect((await call('/me?experiment=start', { token: 'nope' })).status).toBe(401);
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });

  it('stores one rating per player and variant, updating it on the second send', async () => {
    await call('/rating', { method: 'PUT', body: { experiment: 'start', variant: 'puls', stars: 2, comment: 'zu voll' } });
    await call('/rating', { method: 'PUT', body: { experiment: 'start', variant: 'puls', stars: 4, comment: 'doch gut' } });
    await call('/favorite', { method: 'PUT', body: { experiment: 'start', variant: 'titelseite', note: ' Kurse aus Puls ' } });
    const me = await call('/me?experiment=start');
    expect(me.body).toMatchObject({ username: 'Anna', admin: false, favorite: 'titelseite', favoriteNote: 'Kurse aus Puls' });
    expect(me.body.ratings).toMatchObject([{ variant: 'puls', stars: 4, comment: 'doch gut' }]);
  });

  it('shows the evaluation only to admins, with names on comments but not on usage', async () => {
    await call('/usage', { method: 'POST', body: { experiment: 'start', variant: 'puls', visit: true, dwellMs: 42_000, clicks: { '/markt': 1 } } });
    await call('/usage', { method: 'POST', body: { experiment: 'start', variant: 'puls', dwellMs: 8_000 } });
    await call('/rating', { method: 'PUT', body: { experiment: 'start', variant: 'puls', stars: 5, comment: 'lebendig' } });
    expect((await call('/results?experiment=start')).status).toBe(403);
    const r = await call('/results?experiment=start', { token: 'tok1' });
    expect(r.body.variants.puls).toMatchObject({ people: 1, visits: 1, dwellMedianMs: 50_000, avgStars: 5 });
    expect(r.body.variants.puls.clicks).toEqual([{ target: '/markt', count: 1 }]);
    expect(r.body.comments[0]).toMatchObject({ username: 'Anna', comment: 'lebendig' });
    await call('/favorite', { method: 'PUT', body: { experiment: 'start', variant: 'puls', note: 'mehr Farbe' } });
    const r2 = await call('/results?experiment=start', { token: 'tok1' });
    expect(r2.body.variants.puls.favorites).toBe(1);
    expect(r2.body.notes).toMatchObject([{ username: 'Anna', variant: 'puls', note: 'mehr Farbe' }]);
    expect(JSON.stringify(r.body)).not.toContain('user_hash');
    expect((await call('/experiments', { token: 'tok1' })).body[0].experiment).toBe('start');
  });

  it('answers 400 on bad input and 404 on unknown paths', async () => {
    expect((await call('/rating', { method: 'PUT', body: { experiment: 'start', variant: 'puls', stars: 0 } })).status).toBe(400);
    expect((await call('/nope')).status).toBe(404);
  });
});
