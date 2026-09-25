import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useBoard,
  useBoardPosts,
  useBoards,
  useComments,
  useCreateComment,
  useCreatePost,
  usePost,
  useSubboards,
} from '../api/queries';
import { htmlToText, textToHtml } from '../lib/html';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { replyTitle } from '../news/derive';
import { sortBoards, toCategory, toThread } from './derive';
import './ForumPage.css';

/** Forum: /forum (boards) · /forum/:boardId (sub-boards and threads) · /forum/:boardId/:postId (thread). */
export function ForumPage() {
  const { boardId, postId } = useParams();
  const onLinkClick = useInternalLinks();
  return (
    <div className="page forum" onClick={onLinkClick}>
      {postId && boardId ? <Thread boardId={boardId} postId={postId} /> : boardId ? <Board boardId={boardId} /> : <Boards />}
    </div>
  );
}

function Boards() {
  const boards = useBoards();
  const list = sortBoards(boards.data?.content ?? []);
  return (
    <>
      <DS.PageHeader size="md" title="Forum" meta={<span>{list.length} Foren</span>} />
      <DS.Card fill flush>
        {boards.isLoading ? <DS.Loading rows={8} /> : <DS.ForumCategoryList categories={list.map((b) => toCategory(b))} />}
      </DS.Card>
    </>
  );
}

function Board({ boardId }: { boardId: string }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const board = useBoard(boardId);
  const subs = useSubboards(boardId);
  const [q, setQ] = useState('');
  const search = useDebounced(q, 300);
  const page = Math.max(0, Number(params.get('seite') ?? 1) - 1);
  const posts = useBoardPosts(boardId, page, search);
  const [writing, setWriting] = useState(false);
  const create = useCreatePost();
  const total = posts.data?.totalElements ?? 0;
  const b = board.data;

  return (
    <>
      <DS.PageHeader
        size="md"
        title={b?.name ?? 'Forum'}
        eyebrow={b?.parent ? <a href={`/forum/${b.parent.id}`}>{b.parent.name}</a> : <a href="/forum">Forum</a>}
        meta={<span>{total === 1 ? "1 Thema" : `${total.toLocaleString("de-DE")} Themen`}</span>}
        actions={
          <>
            <DS.Input aria-label="Themen durchsuchen" placeholder="Suchen" size="sm" value={q} onChange={(e) => setQ(e.target.value)} />
            <DS.Button variant="primary" size="sm" onClick={() => setWriting(true)}>
              Neues Thema
            </DS.Button>
          </>
        }
      />
      <DS.Card fill flush>
        {b?.description && <p className="forum__desc">{htmlToText(b.description)}</p>}
        {subs.data?.content.length ? (
          <div className="forum__subs">
            <DS.ForumCategoryList label="Unterforen" categories={subs.data.content.map((s) => toCategory(s))} />
          </div>
        ) : null}
        {posts.isLoading ? (
          <DS.Loading rows={8} />
        ) : (
          <DS.ThreadList
            threads={(posts.data?.content ?? []).map((p) => toThread(p, boardId))}
            emptyText={search ? 'Nichts gefunden.' : 'Noch keine Themen.'}
          />
        )}
        {total > 30 && (
          <div className="forum__pages">
            <DS.Pagination
              page={page + 1}
              pages={Math.ceil(total / 30)}
              onChange={(p) => setParams(p > 1 ? { seite: String(p) } : {}, { replace: true })}
            />
          </div>
        )}
      </DS.Card>
      <DS.Sheet open={writing} onClose={() => !create.isPending && setWriting(false)} title="Neues Thema" side="auto" width={640}>
        <DS.ForumEditor
          mode="thread"
          submitLabel="Thema erstellen"
          loading={create.isPending}
          onCancel={() => setWriting(false)}
          onSubmit={(v) =>
            create.mutate(
              { title: v.title, html: textToHtml(v.body), messageBoardId: boardId },
              {
                onSuccess: (p) => {
                  setWriting(false);
                  if (p?.id) navigate(`/forum/${boardId}/${p.id}`);
                },
              },
            )
          }
        />
        {create.isError && <DS.Banner variant="error">Nicht gespeichert: {create.error.message}</DS.Banner>}
      </DS.Sheet>
    </>
  );
}

function Thread({ boardId, postId }: { boardId: string; postId: string }) {
  const post = usePost(postId);
  const board = useBoard(boardId);
  const comments = useComments(postId);
  const reply = useCreateComment();
  const p = post.data;
  const author = (u?: { username?: string }) => ({
    name: u?.username ?? '?',
    href: `/spieler/${encodeURIComponent(u?.username ?? '')}`,
  });

  if (post.isLoading) return <DS.Loading rows={10} />;
  if (!p) return <DS.EmptyState title="Thema nicht gefunden" />;
  return (
    <DS.Card fill flush className="forum__thread">
      <DS.ForumThread
        title={p.title}
        eyebrow={<a href={`/forum/${boardId}`}>{board.data?.name ?? 'Forum'}</a>}
        meta={`${(p.numberOfComments ?? 0).toLocaleString('de-DE')} Antworten`}
        reply={
          <>
            <DS.ForumEditor
              mode="reply"
              submitLabel="Antworten"
              loading={reply.isPending}
              onSubmit={(v) => reply.mutate({ postId, title: replyTitle(p.title), html: textToHtml(v.body) })}
            />
            {reply.isError && <DS.Banner variant="error">Antwort nicht gesendet: {reply.error.message}</DS.Banner>}
          </>
        }
      >
        <DS.ForumPost
          op
          number={1}
          author={author(p.author)}
          time={p.dateCreated ? DS.format.dateTime(p.dateCreated) : undefined}
          text={htmlToText(p.content)}
          actions={false}
        />
        {(comments.data ?? []).map((c, i) => (
          <DS.ForumPost
            key={c.id}
            number={i + 2}
            author={author(c.author)}
            time={c.dateCreated ? DS.format.dateTime(c.dateCreated) : undefined}
            text={htmlToText(c.content)}
            actions={false}
          />
        ))}
      </DS.ForumThread>
    </DS.Card>
  );
}
