import { canManageChat, canRemoveMember, chatNameError, chatTitle, dayLabel, listTime, myChatRole, systemText, toConversations, toThread } from './derive';
import { upsertMessage } from '../api/queries';
import type { ChatMembershipView, ChatView, MessageView } from '../api/types';

// Thursday, 24.9.2026, 18:00 local time
const now = new Date(2026, 8, 24, 18, 0).getTime();
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).getTime();

const user = (username: string, myUser = false) => ({ id: username, username, myUser });
const msg = (id: string, sender: string, content: string, dateSent: number, extra: Partial<MessageView> = {}) =>
  ({ id, chatId: 'c', content, dateSent, sender: user(sender, sender === 'Ich'), ...extra }) as MessageView;
const chat = (id: string, extra: Partial<ChatView>): ChatView => ({
  id,
  chatName: null,
  groupChat: false,
  publicChat: false,
  readonly: false,
  dateCreated: at(1, 12),
  numOfUnreadMessages: 0,
  participants: [],
  ...extra,
});

describe('times', () => {
  it('shows the clock today, the weekday this week, the date later', () => {
    expect(listTime(at(24, 9, 5), now)).toBe('09:05');
    expect(listTime(at(21, 9), now)).toBe('Mo.');
    expect(listTime(at(10, 9), now)).toBe('10.9.');
    expect(listTime(new Date(2025, 0, 3).getTime(), now)).toBe('3.1.2025');
  });
  it('labels days', () => {
    expect(dayLabel(at(24, 1), now)).toBe('Heute');
    expect(dayLabel(at(23, 23), now)).toBe('Gestern');
    expect(dayLabel(at(21, 9), now)).toBe('Montag, 21.9.');
    expect(dayLabel(new Date(2025, 0, 3).getTime(), now)).toBe('3.1.2025');
  });
});

describe('chatTitle', () => {
  it('uses the chat name, else the other participants', () => {
    expect(chatTitle(chat('a', { chatName: 'Lobby (de)' }))).toBe('Lobby (de)');
    expect(chatTitle(chat('b', { participants: [user('Ich', true), user('Frieda')] }))).toBe('Frieda');
    expect(chatTitle(chat('c', { participants: [user('Ich'), user('Paul')] }), 'Ich')).toBe('Paul');
  });
});

describe('toThread', () => {
  it('inserts day separators, system lines and marks own messages', () => {
    const t = toThread(
      [
        msg('1', 'Frieda', 'Moin $STHANSEREE', at(23, 18, 2)),
        msg('2', 'Alphabanker', 'Paul has joined', at(24, 9)),
        msg('3', 'Ich', 'Hallo', at(24, 9, 14), { read: true }),
      ],
      { direct: true, now },
    );
    expect(t.map((m) => m.day ?? m.system ?? m.text)).toEqual([
      'Gestern',
      'Moin $STHANSEREE',
      'Heute',
      'Paul ist beigetreten.',
      'Hallo',
    ]);
    expect(t[1]).toMatchObject({ own: false, author: { name: 'Frieda' }, time: '18:02' });
    expect(t[4]).toMatchObject({ own: true, status: 'Gelesen' });
  });
  it('trusts the own name over myUser (live pushes carry the sender\'s view)', () => {
    const live = msg('1', 'Frieda', 'Hallo', at(24, 9), { sender: user('Frieda', true) });
    const t = toThread([live], { me: 'Ich', now });
    expect(t[1]).toMatchObject({ own: false, author: { name: 'Frieda' } });
  });
  it('shows no read receipts in group chats', () => {
    const t = toThread([msg('1', 'Ich', 'Hallo', at(24, 9))], { direct: false, now });
    expect(t[1].status).toBeUndefined();
  });
});

describe('systemText', () => {
  it('only matches join/leave lines', () => {
    expect(systemText('km has left')).toBe('km hat den Chat verlassen.');
    expect(systemText('Paul has joined the game')).toBeNull();
  });
});

describe('toConversations', () => {
  const chats = [
    chat('lobby', { chatName: 'Lobby (de)', groupChat: true, publicChat: true, lastMessage: msg('x', 'Paul', 'Hi', at(24, 10)) }),
    chat('old', { participants: [user('Frieda')], lastMessage: msg('y', 'Ich', 'Bis dann', at(20, 10)) }),
    chat('new', { participants: [user('Paul')], numOfUnreadMessages: 2, lastMessage: msg('z', 'Paul', 'Moin', at(24, 11)) }),
  ];
  it('lists all joined chats together, newest message first', () => {
    const g = toConversations(chats, { activeId: 'old', now });
    expect(g).toHaveLength(1);
    expect(g[0].items.map((c) => c.id)).toEqual(['new', 'lobby', 'old']);
    expect(g[0].items[0]).toMatchObject({ name: 'Paul', unread: 2, preview: 'Moin', time: '11:00' });
    expect(g[0].items[1]).toMatchObject({ kind: 'public', preview: 'Paul: Hi' });
    expect(g[0].items[2]).toMatchObject({ active: true, preview: 'Du: Bis dann', time: 'So.' });
  });
  it('lists public rooms not joined yet, biggest first', () => {
    const g = toConversations(chats, {
      now,
      rooms: [
        { id: 'lobby', name: 'Lobby (de)', numberOfMembers: 2672 },
        { id: 'small', name: 'Fussball', numberOfMembers: 5 },
        { id: 'big', name: 'Lobby (en)', numberOfMembers: 9463 },
      ],
    });
    const rooms = g.find((x) => x.label === 'Öffentliche Räume')!;
    expect(rooms.items.map((c) => c.id)).toEqual(['big', 'small']);
    expect(rooms.items[0].preview).toBe('9.463 Mitglieder · beitreten');
  });
  it('filters by name', () => {
    expect(toConversations(chats, { filter: 'frie', now })[0].items.map((c) => c.id)).toEqual(['old']);
  });
});

describe('upsertMessage', () => {
  const data = { pages: [[msg('1', 'A', 'a', 1), msg('2', 'A', 'b', 3)]], pageParams: [undefined] };
  it('appends new messages in date order', () => {
    expect(upsertMessage(data, msg('3', 'A', 'c', 2)).pages[0].map((m) => m.id)).toEqual(['1', '3', '2']);
  });
  it('replaces known and drops deleted messages', () => {
    expect(upsertMessage(data, msg('2', 'A', 'B', 3)).pages[0][1].content).toBe('B');
    expect(upsertMessage(data, msg('2', 'A', 'b', 3, { status: 'DELETED' })).pages[0]).toHaveLength(1);
  });
});

describe('group management', () => {
  const member = (username: string, role: ChatMembershipView['role']): ChatMembershipView => ({
    id: `m-${username}`,
    chatId: 'g',
    online: false,
    role,
    member: user(username),
  });
  const members = [member('Chef', 'OWNER'), member('Vize', 'DEPUTY'), member('Mod', 'MODERATOR'), member('Ich', 'AUTHOR')];

  it('finds my role in the member list, else via the owner field', () => {
    expect(myChatRole({ owner: user('Chef') }, members, 'Vize')).toBe('DEPUTY');
    expect(myChatRole({ owner: user('Chef') }, undefined, 'Chef')).toBe('OWNER');
    expect(myChatRole({ owner: user('Chef') }, undefined, 'Ich')).toBeUndefined();
    expect(myChatRole({ owner: user('Chef') }, members, undefined)).toBeUndefined();
  });
  it('only owner and deputy manage, and only groups', () => {
    expect(canManageChat('group', 'OWNER')).toBe(true);
    expect(canManageChat('group', 'DEPUTY')).toBe(true);
    expect(canManageChat('group', 'MODERATOR')).toBe(false);
    expect(canManageChat('public', 'OWNER')).toBe(false);
    expect(canManageChat('direct', 'OWNER')).toBe(false);
    expect(canManageChat('group', undefined)).toBe(false);
  });
  it('removes only members below the own role, never oneself', () => {
    const [chef, vize, mod, ich] = members;
    expect(canRemoveMember('group', 'OWNER', vize, 'Chef')).toBe(true);
    expect(canRemoveMember('group', 'OWNER', chef, 'Chef')).toBe(false);
    expect(canRemoveMember('group', 'DEPUTY', chef, 'Vize')).toBe(false);
    expect(canRemoveMember('group', 'DEPUTY', vize, 'Vize')).toBe(false);
    expect(canRemoveMember('group', 'DEPUTY', mod, 'Vize')).toBe(true);
    expect(canRemoveMember('group', 'MODERATOR', ich, 'Mod')).toBe(false);
    expect(canRemoveMember('public', 'OWNER', ich, 'Chef')).toBe(false);
  });
  it('checks a new name', () => {
    expect(chatNameError('  ', 'Alt')).toBe('Gib einen Namen ein.');
    expect(chatNameError(' Alt ', 'Alt')).toBe('Der Name ist unverändert.');
    expect(chatNameError('x'.repeat(61), 'Alt')).toBe('Höchstens 60 Zeichen.');
    expect(chatNameError('Neu', null)).toBeNull();
  });
});
