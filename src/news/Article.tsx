import { DS } from '../ds';
import { useComments, useCreateComment, useLikes, useNewsPost, useReact } from '../api/queries';
import { htmlToText, textToHtml } from '../lib/html';
import { myReaction, replyTitle } from './derive';

/** One article with reactions, comments and a reply box. */
export function Article({ postId, onClose }: { postId: string; onClose: () => void }) {
  const post = useNewsPost(postId);
  const comments = useComments(postId);
  const likes = useLikes(postId);
  const react = useReact();
  const reply = useCreateComment();

  if (post.isLoading) return <DS.Loading rows={10} label="Artikel wird geladen" />;
  if (post.isError || !post.data) return <DS.EmptyState title="Artikel nicht gefunden" />;
  const p = post.data;
  const from = p.company?.name ?? p.alliance?.name;

  return (
    <article className="article">
      <div className="article__top">
        <DS.Button variant="ghost" size="sm" onClick={onClose}>
          ← Zur Übersicht
        </DS.Button>
      </div>
      <p className="article__kicker">
        {from ?? 'Leserbeitrag'}
        {p.dateCreated ? ` · ${DS.format.dateTime(p.dateCreated)}` : ''}
      </p>
      <h2 className="article__title">{p.title}</h2>
      {p.author?.username && (
        <p className="article__byline">
          von <a href={`/spieler/${encodeURIComponent(p.author.username)}`}>{p.author.username}</a>
        </p>
      )}
      <div className="article__body">
        <DS.ForumText text={htmlToText(p.content)} />
      </div>
      <DS.ReactionBar
        likes={p.numberOfLikes}
        dislikes={p.numberOfDislikes}
        comments={p.numberOfComments}
        myReaction={myReaction(likes.data)}
        disabled={react.isPending}
        onReact={(type) => react.mutate({ postId, type })}
      />

      <h3 className="article__h">Kommentare</h3>
      {comments.isLoading ? (
        <DS.Loading rows={3} />
      ) : comments.data?.length ? (
        <ol className="article__comments">
          {comments.data.map((c, i) => (
            <li key={c.id}>
              <DS.ForumPost
                author={{ name: c.author?.username ?? '?', href: `/spieler/${encodeURIComponent(c.author?.username ?? '')}` }}
                number={i + 1}
                time={c.dateCreated ? DS.format.dateTime(c.dateCreated) : undefined}
                text={htmlToText(c.content)}
                actions={false}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="article__none">Noch keine Kommentare.</p>
      )}
      <DS.ForumEditor
        mode="reply"
        heading="Kommentieren"
        submitLabel="Kommentar senden"
        submitVariant="secondary"
        loading={reply.isPending}
        onSubmit={(v) => reply.mutate({ postId, title: replyTitle(p.title), html: textToHtml(v.body) })}
      />
      {reply.isError && <DS.Banner variant="error">Kommentar nicht gesendet: {reply.error.message}</DS.Banner>}
    </article>
  );
}
