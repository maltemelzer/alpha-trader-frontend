import type { ForumCategory, ForumThreadItem } from '../../vendor/bankiersgruen';
import type { BoardView, PostView } from '../api/queries';
import { listTime } from '../chat/derive';
import { htmlToText } from '../lib/html';

const TICKER = /\$([A-Z][A-Z0-9]{1,9})\b/g;

export function toCategory(b: BoardView, now = Date.now()): ForumCategory {
  const last = b.latestPost;
  return {
    id: b.id,
    name: b.name,
    description: b.description ? htmlToText(b.description) : undefined,
    href: `/forum/${b.id}`,
    posts: b.numberOfPosts,
    threads: b.numberOfSubboards || undefined,
    last: last
      ? {
          title: last.title,
          author: last.author?.username,
          time: last.dateCreated ? listTime(last.dateCreated, now) : undefined,
        }
      : undefined,
  };
}

/** Board posts → thread list rows; tickers ($ASIN) found in title or text, at most three. */
export function toThread(p: PostView, boardId: string, now = Date.now()): ForumThreadItem {
  const text = `${p.title} ${htmlToText(p.content)}`;
  const tickers = [...new Set([...text.matchAll(TICKER)].map((m) => m[1]))].slice(0, 3);
  return {
    id: p.id,
    title: p.title,
    href: `/forum/${boardId}/${p.id}`,
    author: { name: p.author?.username ?? '?' },
    time: p.dateCreated ? listTime(p.dateCreated, now) : undefined,
    replies: p.numberOfComments,
    tickers: tickers.length ? tickers : undefined,
  };
}

/** A thread from my/boardnews: links into its own board; the board name goes in front of the author. */
export function boardNewsThread(
  p: PostView & { messageBoard?: { id: string; name: string } | null },
  now = Date.now(),
): ForumThreadItem {
  const t = toThread(p, p.messageBoard?.id ?? '', now);
  const author = p.author?.username ?? '?';
  return {
    ...t,
    href: p.messageBoard ? t.href : undefined,
    author: { name: p.messageBoard ? `${p.messageBoard.name} · ${author}` : author },
  };
}

/** Memberships belong to the top board: a sub-board is subscribed through its root. */
export function membershipBoard(b: BoardView): { id: string; name: string; publicBoard?: boolean | null } {
  return b.root ?? b;
}

/** Boards (by default only those without parent), the official ones first, then by activity. */
export function sortBoards(boards: BoardView[], topOnly = true): BoardView[] {
  const official = (b: BoardView) => /offiziell|official/i.test(b.name);
  return [...boards]
    .filter((b) => !topOnly || !b.parent)
    .sort(
      (a, b) =>
        Number(official(b)) - Number(official(a)) ||
        (b.latestPost?.dateCreated ?? 0) - (a.latestPost?.dateCreated ?? 0),
    );
}
