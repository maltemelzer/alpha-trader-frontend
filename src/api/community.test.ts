import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The write actions (follow, claim, join/leave board, report) are real actions in the live game.
// They are never sent from tests: fetch is stubbed before the client is created and each test
// only checks method and URL of the request that would go out.
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

describe('community write requests', () => {
  it('follows, hides and resets authors, companies and hashtags', async () => {
    await q.setSubscription('authors', 'u-1', 'SUBSCRIBE');
    expect(sent()).toEqual({ method: 'PUT', path: '/api/v2/my/subscriptions/authors/u-1', query: { action: 'SUBSCRIBE' } });
    calls.length = 0;
    await q.setSubscription('companies', 'c-1', 'IGNORE');
    expect(sent()).toEqual({ method: 'PUT', path: '/api/v2/my/subscriptions/companies/c-1', query: { action: 'IGNORE' } });
    calls.length = 0;
    await q.setSubscription('hashtags', 'Börse', null);
    expect(sent()).toEqual({ method: 'DELETE', path: '/api/v2/my/subscriptions/hashtags/B%C3%B6rse', query: {} });
  });

  it('claims one or all alliance achievements', async () => {
    await q.claimAllianceAchievement('a-1');
    expect(sent()).toEqual({ method: 'PUT', path: '/api/v2/my/allianceachievementclaim/a-1', query: {} });
    calls.length = 0;
    await q.claimAllAllianceAchievements();
    expect(sent()).toEqual({ method: 'PUT', path: '/api/v2/my/allianceachievementclaim', query: {} });
  });

  it('joins a board as reader and leaves it by board id', async () => {
    await q.joinBoard('me', 'b-1');
    expect(sent()).toEqual({
      method: 'POST',
      path: '/api/v2/messageboardmemberships',
      query: { userId: 'me', messageBoardId: 'b-1', role: 'READER' },
    });
    calls.length = 0;
    await q.leaveBoard('b-1');
    expect(sent()).toEqual({ method: 'DELETE', path: '/api/v2/messageboardmemberships', query: { boardId: 'b-1' } });
  });

  it('reports a post with an optional reason in the query', async () => {
    await q.createComplaint({ subjectMatterId: 'p-1', subjectMatterType: 'POST', text: '  Spam  ' });
    expect(sent()).toEqual({
      method: 'POST',
      path: '/api/complaints',
      query: { subjectMatterId: 'p-1', subjectMatterType: 'POST', text: 'Spam' },
    });
    calls.length = 0;
    await q.createComplaint({ subjectMatterId: 'p-1', subjectMatterType: 'POST', text: ' ' });
    expect(sent().query).toEqual({ subjectMatterId: 'p-1', subjectMatterType: 'POST' });
  });
});

describe('newsSourcePath', () => {
  it('builds the feed paths', () => {
    expect(q.newsSourcePath({ kind: 'author', userId: 'u-1' })).toBe('/api/v2/authors/u-1/news');
    expect(q.newsSourcePath({ kind: 'hashtag', tag: 'a b' })).toBe('/api/v2/hashtags/a%20b/news');
    expect(q.newsSourcePath({ kind: 'company', companyId: 'c' })).toBe('/api/v2/companies/c/news');
    expect(q.newsSourcePath({ kind: 'alliance', allianceId: 'x' })).toBe('/api/v2/alliances/x/news');
    expect(q.interestPath('hashtags', '#x')).toBe('/api/v2/my/interests/hashtags/%23x');
  });
});
