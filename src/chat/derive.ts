// Pure mapping from API chats/messages to the design system's chat props.
import type { ChatMessage, Conversation } from '../../design-system/components';
import type { ChatMembershipView, ChatRoomView, ChatView, MessageView } from '../api/types';
import { gameLinksToMentions } from '../lib/html';

const DAY = 86_400_000;
const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const pad = (n: number) => String(n).padStart(2, '0');

/** „17:42“ */
export function clock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** List time: „17:42“ today, „Mo.“ within the week, „24.9.“ this year, else „24.9.2025“. */
export function listTime(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  const d = new Date(ms);
  if (days <= 0) return clock(ms);
  if (days < 7) return WEEKDAYS[d.getDay()];
  if (d.getFullYear() === new Date(now).getFullYear()) return `${d.getDate()}.${d.getMonth() + 1}.`;
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

/** Day separator: „Heute“, „Gestern“, „Montag, 21.9.“, „3.1.2025“. */
export function dayLabel(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  const d = new Date(ms);
  if (days <= 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (d.getFullYear() !== new Date(now).getFullYear()) return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
}

export type ChatKind = 'direct' | 'group' | 'public';

export function chatKind(c: Pick<ChatView, 'publicChat' | 'groupChat'>): ChatKind {
  return c.publicChat ? 'public' : c.groupChat ? 'group' : 'direct';
}

/** Name of a chat; direct chats have none and are named after the other side. */
export function chatTitle(c: ChatView, me?: string): string {
  if (c.chatName) return c.chatName;
  const others = c.participants.filter((p) => !isMe(p, me)).map((p) => p.username ?? '');
  return others.join(', ') || 'Unterhaltung';
}

// Lobbies announce new members as „<name> has joined“ – shown as a system line.
const JOIN = /^(\S+) has (joined|left)$/;

export function systemText(content: string): string | null {
  const m = content.match(JOIN);
  if (!m) return null;
  return m[2] === 'joined' ? `${m[1]} ist beigetreten.` : `${m[1]} hat den Chat verlassen.`;
}

// `myUser` is relative to whoever the server built the object for: live pushes are built once
// for the sender, so every recipient sees `myUser: true`. Trust the name once it is known.
const isMe = (u: { myUser?: boolean; username?: string } | undefined, me?: string) =>
  me ? u?.username === me : !!u?.myUser;
const isOwn = (m: MessageView, me?: string) => isMe(m.sender, me);

/** Messages (oldest first) → ChatThread items with day separators and system lines. */
export function toThread(
  messages: MessageView[],
  opts: { me?: string; direct?: boolean; now?: number } = {},
): ChatMessage[] {
  const now = opts.now ?? Date.now();
  const out: ChatMessage[] = [];
  let lastDay = -1;
  messages.forEach((m, i) => {
    const date = m.dateSent ?? 0;
    const day = startOfDay(date);
    if (day !== lastDay) {
      out.push({ id: `day-${day}`, day: dayLabel(date, now) });
      lastDay = day;
    }
    const content = m.content ?? '';
    const sys = systemText(content);
    if (sys) return void out.push({ id: m.id, system: sys });
    const own = isOwn(m, opts.me);
    const lastOwn = own && i === messages.length - 1;
    out.push({
      id: m.id,
      own,
      author: own ? undefined : { name: m.sender?.username ?? '?' },
      // Links into the original game read as #ASIN and open here.
      text: gameLinksToMentions(content),
      time: clock(date),
      // Read receipts only mean something between two people.
      status: lastOwn && opts.direct ? (m.read ? 'Gelesen' : 'Gesendet') : undefined,
    });
  });
  return out;
}

function preview(c: ChatView, me?: string): string {
  const m = c.lastMessage;
  if (!m?.content) return '';
  const sys = systemText(m.content);
  if (sys) return sys;
  const text = gameLinksToMentions(m.content);
  if (isOwn(m, me)) return `Du: ${text}`;
  return chatKind(c) === 'direct' ? text : `${m.sender?.username}: ${text}`;
}

const lastActivity = (c: ChatView) => c.lastMessage?.dateSent ?? c.dateCreated;

/** Joined chats of every kind in one list, newest message first; then public rooms not joined yet. */
export function toConversations(
  chats: ChatView[],
  opts: { me?: string; activeId?: string; filter?: string; now?: number; rooms?: ChatRoomView[] } = {},
): { label: string; items: Conversation[] }[] {
  const q = opts.filter?.trim().toLowerCase();
  const sorted = [...chats]
    .filter((c) => !q || chatTitle(c, opts.me).toLowerCase().includes(q))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
  const item = (c: ChatView): Conversation => ({
    id: c.id,
    kind: chatKind(c),
    name: chatTitle(c, opts.me),
    preview: preview(c, opts.me),
    time: c.lastMessage?.dateSent ? listTime(c.lastMessage.dateSent, opts.now) : undefined,
    unread: c.numOfUnreadMessages || undefined,
    active: c.id === opts.activeId,
    href: `/nachrichten/${c.id}`,
  });
  // Public rooms the player has not joined yet, biggest first.
  const joined = new Set(chats.map((c) => c.id));
  const rooms = (opts.rooms ?? [])
    .filter((r) => !joined.has(r.id) && (!q || r.name.toLowerCase().includes(q)))
    .sort((a, b) => b.numberOfMembers - a.numberOfMembers)
    .map(
      (r): Conversation => ({
        id: r.id,
        kind: 'public',
        name: r.name,
        preview: `${r.numberOfMembers.toLocaleString('de-DE')} Mitglieder · beitreten`,
        active: r.id === opts.activeId,
        href: `/nachrichten/${r.id}`,
      }),
    );
  return [
    { label: '', items: sorted.map(item) },
    { label: 'Öffentliche Räume', items: rooms },
  ].filter((g) => g.items.length > 0);
}

// ---------- Managing a group ----------

type Role = ChatMembershipView['role'];
const RANK: Record<Role, number> = { READER: 0, AUTHOR: 1, MODERATOR: 2, DEPUTY: 3, OWNER: 4 };

/** My role in a chat: from the member list, else the chat's owner field. */
export function myChatRole(chat: Pick<ChatView, 'owner'>, members: ChatMembershipView[] | undefined, me?: string): Role | undefined {
  if (!me) return undefined;
  const mine = members?.find((m) => m.member.username === me)?.role;
  return mine ?? (chat.owner?.username === me ? 'OWNER' : undefined);
}

/** Only groups are managed here (not lobbies, not direct chats) – by the owner or the deputy. */
export function canManageChat(kind: ChatKind, role: Role | undefined): boolean {
  return kind === 'group' && !!role && RANK[role] >= RANK.DEPUTY;
}

/** Remove a member: managers remove members below their own role, never themselves (that is „Verlassen“). */
export function canRemoveMember(kind: ChatKind, role: Role | undefined, target: ChatMembershipView, me?: string): boolean {
  return canManageChat(kind, role) && target.member.username !== me && RANK[role!] > RANK[target.role];
}

export const CHAT_NAME_MAX = 60;

/** Problem with a new chat name, or null. */
export function chatNameError(name: string, current?: string | null): string | null {
  const v = name.trim();
  if (!v) return 'Gib einen Namen ein.';
  if (v.length > CHAT_NAME_MAX) return `Höchstens ${CHAT_NAME_MAX} Zeichen.`;
  if (v === (current ?? '').trim()) return 'Der Name ist unverändert.';
  return null;
}
