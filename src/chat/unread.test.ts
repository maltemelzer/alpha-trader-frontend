import { applyIncoming, incomingNotice, titleWithUnread, unreadSummary } from './unread';
import type { ChatView, MessageView } from '../api/types';

const chat = (id: string, extra: Partial<ChatView> = {}): ChatView => ({
  id,
  chatName: null,
  groupChat: false,
  publicChat: false,
  readonly: false,
  dateCreated: 1,
  numOfUnreadMessages: 0,
  participants: [],
  ...extra,
});
const msg = (id: string, chatId: string, sender: string, dateSent: number, content = 'Hallo', extra: Partial<MessageView> = {}) =>
  ({ id, chatId, content, dateSent, sender: { id: sender, username: sender, myUser: true }, ...extra }) as MessageView;

describe('unreadSummary', () => {
  it('counts messages and chats, lobbies never', () => {
    const chats = [
      chat('a', { numOfUnreadMessages: 2 }),
      chat('b', { numOfUnreadMessages: 1, groupChat: true }),
      chat('c', { numOfUnreadMessages: 5, publicChat: true }),
      chat('d'),
    ];
    expect(unreadSummary(chats)).toEqual({ messages: 3, chats: 2 });
    expect(unreadSummary(undefined)).toEqual({ messages: 0, chats: 0 });
  });
});

describe('titleWithUnread', () => {
  it('puts the count in front and replaces an old one', () => {
    expect(titleWithUnread('Alpha-Trader', 3)).toBe('(3) Alpha-Trader');
    expect(titleWithUnread('(3) Alpha-Trader', 4)).toBe('(4) Alpha-Trader');
    expect(titleWithUnread('(4) Alpha-Trader', 0)).toBe('Alpha-Trader');
    expect(titleWithUnread('Alpha-Trader', 250)).toBe('(99+) Alpha-Trader');
    expect(titleWithUnread('(99+) Alpha-Trader', 0)).toBe('Alpha-Trader');
  });
});

describe('applyIncoming', () => {
  const list = [chat('a', { lastMessage: msg('m1', 'a', 'frieda', 100) }), chat('lobby', { publicChat: true })];

  it('raises the count for a new message from someone else', () => {
    const r = applyIncoming(list, msg('m2', 'a', 'frieda', 200), 'ich');
    expect(r.fresh).toBe(true);
    expect(r.chats[0].numOfUnreadMessages).toBe(1);
    expect(r.chats[0].lastMessage?.id).toBe('m2');
  });

  it('ignores own messages (by name – live messages say myUser: true for everyone)', () => {
    const r = applyIncoming(list, msg('m2', 'a', 'ich', 200), 'ich');
    expect(r.fresh).toBe(false);
    expect(r.chats[0].numOfUnreadMessages).toBe(0);
    expect(r.chats[0].lastMessage?.id).toBe('m2');
  });

  it('ignores messages of blocked players', () => {
    const r = applyIncoming(list, msg('m2', 'a', 'troll', 200), 'ich', new Set(['troll']));
    expect(r.fresh).toBe(false);
    expect(r.chats).toBe(list);
  });

  it('counts a message only once and never an older one', () => {
    const once = applyIncoming(list, msg('m2', 'a', 'frieda', 200), 'ich').chats;
    const twice = applyIncoming(once, msg('m2', 'a', 'frieda', 200), 'ich');
    expect(twice.chats).toBe(once);
    expect(twice.fresh).toBe(false);
    expect(applyIncoming(list, msg('m0', 'a', 'frieda', 50), 'ich').chats).toBe(list);
  });

  it('leaves unknown chats, deleted messages and lobby counts alone', () => {
    expect(applyIncoming(list, msg('x', 'zzz', 'frieda', 300), 'ich').chats).toBe(list);
    expect(applyIncoming(list, msg('m3', 'a', 'frieda', 300, 'x', { status: 'DELETED' }), 'ich').chats).toBe(list);
    const lobby = applyIncoming(list, msg('l1', 'lobby', 'frieda', 300), 'ich');
    expect(lobby.chats[1].numOfUnreadMessages).toBe(0);
    expect(lobby.chats[1].lastMessage?.id).toBe('l1');
  });
});

describe('incomingNotice', () => {
  it('names the sender (and the group) and shortens the text', () => {
    expect(incomingNotice(chat('a'), msg('m', 'a', 'frieda', 1, 'Kaufst  du\nmit?'))).toEqual({
      title: 'Nachricht von frieda',
      text: 'Kaufst du mit?',
    });
    const long = incomingNotice(chat('g', { groupChat: true, chatName: 'Hanse' }), msg('m', 'g', 'otto', 1, 'x'.repeat(200)), 20);
    expect(long.title).toBe('otto in Hanse');
    expect(long.text).toHaveLength(20);
    expect(long.text.endsWith('…')).toBe(true);
  });
});
