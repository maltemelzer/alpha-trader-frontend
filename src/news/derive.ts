import type { Post, Reaction } from '../../vendor/bankiersgruen';
import type { PostView } from '../api/queries';
import { htmlToText } from '../lib/html';

/** API post → the design system's Post (content as plain text, author name only). */
export function toPost(p: PostView): Post {
  return {
    id: p.id,
    title: p.title,
    content: htmlToText(p.content),
    locale: p.locale ?? undefined,
    author: p.author?.username ? { username: p.author.username } : undefined,
    company: p.company ?? undefined,
    alliance: p.alliance ?? undefined,
    listing: p.listing ? { securityIdentifier: p.listing.securityIdentifier, name: p.listing.name } : undefined,
    hashTags: p.hashTags,
    numberOfLikes: p.numberOfLikes,
    numberOfDislikes: p.numberOfDislikes,
    numberOfComments: p.numberOfComments,
    dateCreated: p.dateCreated,
    dateEdited: p.dateEdited ?? undefined,
  };
}

/** The player's own reaction from the list of likes of a post. */
export function myReaction(likes: { type: 'LIKE' | 'DISLIKE'; user: { myUser?: boolean } }[] | undefined): Reaction {
  return likes?.find((l) => l.user.myUser)?.type ?? null;
}

/** Comment titles are required by the API; the game uses „Re: <title>“. */
export const replyTitle = (title: string) => (title.startsWith('Re: ') ? title : `Re: ${title}`).slice(0, 100);

/** Filter of the newspaper, read from the URL (?autor=, ?tag=, ?unternehmen=). */
export type NewsFilter =
  | { kind: 'all' }
  | { kind: 'author'; username: string }
  | { kind: 'hashtag'; tag: string }
  | { kind: 'company'; asin: string };

export function newsFilter(params: URLSearchParams): NewsFilter {
  const author = params.get('autor');
  if (author) return { kind: 'author', username: author };
  const tag = params.get('tag');
  if (tag) return { kind: 'hashtag', tag: tag.replace(/^#/, '') };
  const asin = params.get('unternehmen');
  if (asin) return { kind: 'company', asin };
  return { kind: 'all' };
}

/** Link to a filtered newspaper. */
export function newsHref(f: NewsFilter): string {
  switch (f.kind) {
    case 'author':
      return `/zeitung?autor=${encodeURIComponent(f.username)}`;
    case 'hashtag':
      return `/zeitung?tag=${encodeURIComponent(f.tag)}`;
    case 'company':
      return `/zeitung?unternehmen=${encodeURIComponent(f.asin)}`;
    default:
      return '/zeitung';
  }
}

/**
 * Follow state from the interest the server keeps. Following should set a positive interest,
 * hiding a negative one – the API has no GET for subscriptions, so this is inferred.
 */
export type FollowState = 'follow' | 'ignore' | 'none';
export function followState(interest: number | undefined): FollowState {
  if (!interest) return 'none';
  return interest > 0 ? 'follow' : 'ignore';
}

const INTEREST_LABELS: Record<string, string> = {
  authorInterest: 'Autor',
  companyInterest: 'Unternehmen',
  allianceInterest: 'Allianz',
  meanHashTagInterest: 'Hashtags',
  localeInterest: 'Sprache',
  postInterest: 'Artikel',
  commonPopularity: 'Beliebtheit',
  commonControversy: 'Kontroverse',
  commonGossip: 'Gesprächsstoff',
};

/** Parts of the player's interest in a post: non-zero parts, largest first, and the server's sum. */
export function interestParts(v: Record<string, unknown> | undefined): {
  parts: { label: string; value: number }[];
  sum: number;
} {
  if (!v) return { parts: [], sum: 0 };
  const val = (x: unknown) =>
    x && typeof x === 'object' && 'interest' in x ? Number((x as { interest: unknown }).interest) || 0 : 0;
  const parts = Object.entries(INTEREST_LABELS)
    .map(([k, label]) => ({ label, value: val(v[k]) }))
    .filter((p) => p.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const sum = 'interestSum' in v ? val(v.interestSum) : parts.reduce((s, p) => s + p.value, 0);
  return { parts, sum };
}
