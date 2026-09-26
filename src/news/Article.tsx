import { useState } from 'react';
import { DS } from '../ds';
import { useComments, useCreateComment, useLikes, useNewsPost, usePostInterest, useReact } from '../api/queries';
import { htmlToText, textToHtml } from '../lib/html';
import { useIsPhone } from '../lib/useMediaQuery';
import { ReportDialog, type ReportTarget } from '../forum/ReportDialog';
import { FollowControl } from './FollowControl';
import { interestParts, myReaction, newsHref, replyTitle } from './derive';

/**
 * One article with reactions, comments and a reply box. Author, company and hashtags lead to the
 * filtered newspaper and can be followed; „Relevanz für dich“ shows the parts of the player's
 * interest in the post as the server keeps it.
 */
export function Article({ postId, onClose }: { postId: string; onClose: () => void }) {
  const post = useNewsPost(postId);
  const comments = useComments(postId);
  const likes = useLikes(postId);
  const interest = usePostInterest(postId);
  const react = useReact();
  const reply = useCreateComment();
  const [report, setReport] = useState<ReportTarget | null>(null);
  const isPhone = useIsPhone();
  const [writing, setWriting] = useState(false);

  if (post.isLoading) return <DS.Loading rows={10} label="Artikel wird geladen" />;
  if (post.isError || !post.data) return <DS.EmptyState title="Artikel nicht gefunden" />;
  const p = post.data;
  const asin = p.company?.securityIdentifier;
  const author = p.author?.username;
  const tags = (p.hashTags ?? []).map((t) => t.tag);
  const editor = (
    <>
      <DS.ForumEditor
        mode="reply"
        heading={isPhone ? undefined : 'Kommentieren'}
        submitLabel="Kommentar senden"
        submitVariant={isPhone ? 'primary' : 'secondary'}
        loading={reply.isPending}
        onSubmit={(v) =>
          reply.mutate({ postId, title: replyTitle(p.title), html: textToHtml(v.body) }, { onSuccess: () => setWriting(false) })
        }
      />
      {reply.isError && <DS.Banner variant="error">Kommentar nicht gesendet: {reply.error.message}</DS.Banner>}
    </>
  );

  return (
    <article className="article">
      <div className="article__top">
        <DS.Button variant="ghost" size="sm" onClick={onClose}>
          ← Zur Übersicht
        </DS.Button>
        <DS.Button
          variant="ghost"
          size="sm"
          onClick={() => setReport({ id: p.id, type: 'POST', label: author ? `Artikel von ${author}` : 'Artikel' })}
        >
          Melden
        </DS.Button>
      </div>
      <p className="article__kicker">
        {p.company && asin ? (
          <a href={newsHref({ kind: 'company', asin })}>{p.company.name}</a>
        ) : (
          (p.alliance?.name ?? 'Leserbeitrag')
        )}
        {p.dateCreated ? ` · ${DS.format.dateTime(p.dateCreated)}` : ''}
      </p>
      <h2 className="article__title">{p.title}</h2>
      <div className="article__byline">
        {author && (
          <span>
            von <a href={newsHref({ kind: 'author', username: author })}>{author}</a>
            {' · '}
            <a className="article__profile" href={`/spieler/${encodeURIComponent(author)}`}>
              Profil
            </a>
          </span>
        )}
        {author && <FollowControl kind="authors" id={p.author?.id} name={author} />}
      </div>
      {p.company && (
        <div className="article__follow">
          <span className="article__followLabel">{p.company.name}</span>
          <FollowControl kind="companies" id={p.company.id} name={p.company.name} />
        </div>
      )}
      <div className="article__body">
        <DS.ForumText text={htmlToText(p.content)} />
      </div>
      {tags.length > 0 && (
        <p className="article__tags">
          {tags.map((t) => (
            <a key={t} href={newsHref({ kind: 'hashtag', tag: t })}>
              #{t}
            </a>
          ))}
        </p>
      )}
      <DS.ReactionBar
        likes={p.numberOfLikes}
        dislikes={p.numberOfDislikes}
        comments={p.numberOfComments}
        myReaction={myReaction(likes.data)}
        disabled={react.isPending}
        onReact={(type) => react.mutate({ postId, type })}
      />
      <Relevance parts={interestParts(interest.data)} />

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
                actions={
                  <DS.Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReport({ id: c.id, type: 'POST', label: `Kommentar von ${c.author?.username ?? '?'}` })}
                  >
                    Melden
                  </DS.Button>
                }
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="article__none">Noch keine Kommentare.</p>
      )}
      {isPhone ? (
        <>
          {/* Phone: commenting stays in the thumb zone while reading (sticky bar → sheet). */}
          <div className="article__bar">
            <DS.Button variant="primary" fullWidth onClick={() => setWriting(true)}>
              Kommentieren
            </DS.Button>
          </div>
          <DS.Sheet open={writing} onClose={() => !reply.isPending && setWriting(false)} title="Kommentieren" side="auto">
            {editor}
          </DS.Sheet>
        </>
      ) : (
        editor
      )}
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </article>
  );
}

/** Diverging bars: which parts raise (right) or lower (left) the player's interest in this post. */
function Relevance({ parts: { parts, sum } }: { parts: ReturnType<typeof interestParts> }) {
  if (!parts.length) return null;
  const max = Math.max(...parts.map((p) => Math.abs(p.value)), 1);
  const fmt = (n: number) => (n > 0 ? `+${n.toLocaleString('de-DE')}` : n < 0 ? `−${Math.abs(n).toLocaleString('de-DE')}` : '0');
  return (
    <section className="relevance" aria-label="Relevanz für dich">
      <h3 className="relevance__h">
        Relevanz für dich <span className="relevance__sum">{fmt(sum)}</span>
      </h3>
      <ul className="relevance__list">
        {parts.map((p) => (
          <li key={p.label}>
            <span className="relevance__label">{p.label}</span>
            <span className="relevance__track" aria-hidden="true">
              <span
                className={`relevance__bar${p.value < 0 ? ' relevance__bar--neg' : ''}`}
                style={{ width: `${(Math.abs(p.value) / max) * 50}%` }}
              />
            </span>
            <span className="relevance__value">{fmt(p.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
