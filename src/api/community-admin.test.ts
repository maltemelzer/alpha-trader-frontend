import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Renaming a chat and removing members are real actions in the live game: fetch is stubbed,
// the tests only check the request that would be sent. Searching and help texts are GETs.
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

describe('chat management requests', () => {
  it('renames a group chat and sends the other flags unchanged', async () => {
    await q.renameChat({ id: 'c1', readonly: false, publicChat: false }, 'Neue Runde');
    expect(sent()).toEqual({
      method: 'PUT',
      path: '/api/v2/chats/c1',
      query: { chatName: 'Neue Runde', readonly: 'false', public: 'false' },
    });
  });
  it('removes a member by membership id', async () => {
    await q.removeChatMember('m9');
    expect(sent()).toEqual({ method: 'DELETE', path: '/api/v2/chatmemberships/m9', query: {} });
  });
});
