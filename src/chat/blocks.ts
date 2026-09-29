// Blocked players (`/api/v2/chat-blocks`): their chat messages are hidden for me – old and new, in every
// chat – and never count as unread. The server filters what it sends; live pushes and cached pages are
// filtered here as well, so a block takes effect at once.
import type { MessageView, UsernameView } from '../api/types';

/** Names of the blocked players (the API blocks by username). */
export function blockedNames(blocks: UsernameView[] | undefined): Set<string> {
  return new Set((blocks ?? []).map((u) => u.username ?? '').filter(Boolean));
}

/** A message from a blocked player – never my own, even if I appear in the list. */
export function isBlockedMessage(m: Pick<MessageView, 'sender'> | undefined, blocked: ReadonlySet<string>, me?: string): boolean {
  const name = m?.sender?.username;
  return !!name && name !== me && blocked.has(name);
}

/** Messages without those of blocked players (same array when nothing is hidden). */
export function withoutBlocked<M extends Pick<MessageView, 'sender'>>(messages: M[], blocked: ReadonlySet<string>, me?: string): M[] {
  if (!blocked.size) return messages;
  const kept = messages.filter((m) => !isBlockedMessage(m, blocked, me));
  return kept.length === messages.length ? messages : kept;
}

/** Blocked players sorted by name for the list „Blockierte Spieler“. */
export function sortedBlocks(blocks: UsernameView[] | undefined): UsernameView[] {
  return [...(blocks ?? [])].sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'de'));
}
