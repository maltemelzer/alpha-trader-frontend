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
