// Unread messages: counting, the tab title and live messages arriving for chats that are not open.
import type { ChatView, MessageView } from '../api/types';

/**
 * Lobbies (public chats) never carry an unread count on the server; only direct and group chats count.
 * `/api/v2/my/chats/unread/count` is the number of such chats – the same as `chats` here.
 */
export function unreadSummary(chats: ChatView[] | undefined): { messages: number; chats: number } {
  let messages = 0;
  let count = 0;
  for (const c of chats ?? []) {
    if (c.publicChat || !(c.numOfUnreadMessages > 0)) continue;
    messages += c.numOfUnreadMessages;
    count += 1;
  }
  return { messages, chats: count };
}

/** „(3) Alpha-Trader“ – a count in front of the tab title, like mail clients do. */
export function titleWithUnread(base: string, unread: number): string {
  const clean = base.replace(/^\(\d+\+?\)\s*/, '');
  if (!(unread > 0)) return clean;
  return `(${unread > 99 ? '99+' : unread}) ${clean}`;
}

/**
 * A live message for a chat of the list: becomes its `lastMessage`; a message from someone else that
 * is newer than what the list knows raises the unread count by one. Returns the same array when nothing
 * changes (a message seen twice – it also comes with the chat update – counts once).
 * `me` is the own name: live messages carry the sender's view of `myUser`.
 */
export function applyIncoming(chats: ChatView[], m: MessageView, me: string | undefined): { chats: ChatView[]; fresh: boolean } {
  const i = chats.findIndex((c) => c.id === m.chatId);
  if (i < 0 || m.status === 'DELETED') return { chats, fresh: false };
  const c = chats[i];
  const last = c.lastMessage;
  if (last?.id === m.id || (last?.dateSent ?? 0) > (m.dateSent ?? 0)) return { chats, fresh: false };
  const own = me ? m.sender?.username === me : false;
  const next = [...chats];
  next[i] = {
    ...c,
    lastMessage: m,
    numOfUnreadMessages: own || c.publicChat ? c.numOfUnreadMessages : (c.numOfUnreadMessages || 0) + 1,
  };
  return { chats: next, fresh: !own };
}

/** Text of a notice for a new message: sender and a short preview (one line). */
export function incomingNotice(chat: ChatView, m: MessageView, max = 90): { title: string; text: string } {
  const who = m.sender?.username ?? 'Jemand';
  const content = (m.content ?? '').replace(/\s+/g, ' ').trim();
  const text = content.length > max ? `${content.slice(0, max - 1)}…` : content;
  return { title: chat.groupChat && chat.chatName ? `${who} in ${chat.chatName}` : `Nachricht von ${who}`, text };
}
