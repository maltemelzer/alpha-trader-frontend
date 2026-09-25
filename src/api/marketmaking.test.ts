import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Quotes and deleting an index are real actions in the live game: fetch is stubbed, tests only check the request.
const calls: Request[] = [];
const fetchMock = vi.fn(async (req: Request) => {
  calls.push(req);
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});

let q: typeof import('./queries');
beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  q = await import('./queries');
});
beforeEach(() => {
  calls.length = 0;
});

const sent = () => {
  expect(calls).toHaveLength(1);
  const u = new URL(calls[0].url);
  return { method: calls[0].method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

describe('market maker and index owner requests', () => {
  it('places a quote with all six query parameters', async () => {
    await q.placeQuote({ owner: 'acc-1', securityIdentifier: 'STSN3G03LB', buyPrice: 71.2, sellPrice: 71.9, buyShares: 100, sellShares: 80 });
    expect(sent()).toEqual({
      method: 'POST',
      path: '/api/securityorders/quote',
      query: { owner: 'acc-1', securityIdentifier: 'STSN3G03LB', buyPrice: '71.2', sellPrice: '71.9', buyShares: '100', sellShares: '80' },
    });
  });
  it('deletes an own index', async () => {
    await q.deleteIndex('IDABCDEF12');
    expect(sent()).toEqual({ method: 'DELETE', path: '/api/v2/indexes/IDABCDEF12', query: {} });
  });
});
