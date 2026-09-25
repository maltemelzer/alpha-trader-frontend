import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatView, MessageView } from '../api/types';

// No connection and no request: topics are captured here, the chat list is seeded into the cache.
const topics = new Map<string, (body: unknown) => void>();
vi.mock('../api/live', () => ({
  LIVE_RECONNECTED_EVENT: 'test:reconnected',
  useTopic: (dest: string | null, fn: (body: unknown) => void) => {
    if (dest) topics.set(dest, fn);
  },
}));
vi.mock('../api/client', () => ({
  api: new Proxy({}, { get: () => () => Promise.reject(new Error('no requests in tests')) }),
  ApiError: class extends Error {},
  unwrap: (p: Promise<unknown>) => p,
}));

const { ChatLive } = await import('./ChatLive');

const chat = (id: string, extra: Partial<ChatView> = {}): ChatView => ({
  id,
  chatName: null,
  groupChat: false,
  publicChat: false,
  readonly: false,
  dateCreated: 1,
  numOfUnreadMessages: 0,
  participants: [{ id: 'f', username: 'frieda' }],
  ...extra,
});
const msg = (id: string, chatId: string, sender: string, dateSent: number) =>
  ({ id, chatId, content: 'Moin', dateSent, sender: { id: sender, username: sender, myUser: true } }) as MessageView;

describe('ChatLive', () => {
  it('counts a new message from someone else at once and reports it; own messages and lobbies do not count', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    qc.setQueryData<ChatView[]>(['chats'], [chat('d1', { lastMessage: msg('m0', 'd1', 'frieda', 10) }), chat('lobby', { publicChat: true })]);
    const onFresh = vi.fn();
    render(
      <QueryClientProvider client={qc}>
        <ChatLive me="ich" onFresh={onFresh} />
      </QueryClientProvider>,
    );

    // Only the direct chat is watched (lobbies never count), plus the chat list updates.
    expect([...topics.keys()].sort()).toEqual(['/user/topic/chatmessages/d1', '/user/topic/my/chats']);

    act(() => topics.get('/user/topic/chatmessages/d1')!(msg('m1', 'd1', 'frieda', 20)));
    expect(qc.getQueryData<ChatView[]>(['chats'])![0].numOfUnreadMessages).toBe(1);
    expect(onFresh).toHaveBeenCalledTimes(1);
    expect(onFresh.mock.calls[0][0].id).toBe('d1');

    // The same message again (it also comes with the chat update) and an own reply: no change.
    act(() => topics.get('/user/topic/chatmessages/d1')!(msg('m1', 'd1', 'frieda', 20)));
    act(() => topics.get('/user/topic/chatmessages/d1')!(msg('m2', 'd1', 'ich', 30)));
    const d1 = qc.getQueryData<ChatView[]>(['chats'])![0];
    expect(d1.numOfUnreadMessages).toBe(1);
    expect(d1.lastMessage?.id).toBe('m2');
    expect(onFresh).toHaveBeenCalledTimes(1);
  });
});
