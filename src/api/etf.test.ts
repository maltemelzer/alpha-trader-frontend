import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Changing an ETF is a real action in the live game: fetch is stubbed, tests only check the request.
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

describe('ETF owner requests', () => {
  it('switches the base index', async () => {
    await q.changeEtfBaseIndex('EFATSBJE4I', 'IDA7LNQJCH');
    expect(sent()).toEqual({ method: 'PUT', path: '/api/v2/etfs/EFATSBJE4I/base-index', query: { baseIndexAsin: 'IDA7LNQJCH' } });
  });
  it('sets the management fee', async () => {
    await q.setEtfManagementFee('EFATSBJE4I', 0.5);
    expect(sent()).toEqual({ method: 'POST', path: '/api/v2/etfs/EFATSBJE4I/management-fee', query: { percent: '0.5' } });
  });
});
