import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useBoard,
  useBoardPosts,
  useBoards,
  useComments,
  useCreateComment,
  useCreatePost,
  useBoardMembership,
  useBoardNews,
  useMe,
  useMyBoards,
  usePost,
  useSubboards,
  type BoardView,
} from '../api/queries';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import { htmlToText, textToHtml } from '../lib/html';
import { useHighlight } from '../lib/highlight';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone } from '../lib/useMediaQuery';
import { useUrlSearch } from '../lib/useUrlSearch';
import { replyTitle } from '../news/derive';
import { boardNewsThread, membershipBoard, sortBoards, toCategory, toThread } from './derive';
import { PhoneSearchRow, SearchIconButton } from './PhoneSearch';
import { SearchResults } from './SearchResults';
import './ForumPage.css';

/**
 * Forum: /forum (boards; ?suche= searches all posts) · /forum/:boardId (sub-boards and threads, ?suche= within)
 * · /forum/:boardId/:postId (thread).
 */
export function ForumPage() {
  const { boardId, postId } = useParams();
  const onLinkClick = useInternalLinks();
  return (
    <div className={`page forum${postId && boardId ? ' forum--thread' : ''}`} onClick={onLinkClick}>
      {postId && boardId ? <Thread boardId={boardId} postId={postId} /> : boardId ? <Board boardId={boardId} /> : <Boards />}
    </div>
  );
}

function Boards() {
  const [params, setParams] = useSearchParams();
  const boards = useBoards();
  const mine = useMyBoards();
  const [text, setText, search] = useUrlSearch('suche', 400, ['seite', 'forum']);
  const isPhone = useIsPhone();
  const [searchOpen, setSearchOpen] = useState(false);
  const view = params.get('ansicht') === 'meine' ? 'meine' : params.get('ansicht') === 'neu' ? 'neu' : 'alle';
  const onlyMine = view === 'meine';
  const myIds = new Set((mine.data?.content ?? []).map((b) => b.id));
  const all = sortBoards(boards.data?.content ?? []);
  const own = sortBoards(mine.data?.content ?? [], false);
  const list = onlyMine ? own : all;
  const loading = onlyMine ? mine.isLoading : boards.isLoading;
  return (
    <>
      <DS.PageHeader
        size="md"
        title="Forum"
        meta={<span>{boards.data && mine.data ? `${all.length} Foren · ${own.length} abonniert` : '\u00a0'}</span>}
        actions={
          isPhone && (searchOpen || text) ? (
            <PhoneSearchRow
              label="Forum durchsuchen"
              placeholder="Forum durchsuchen"
              value={text}
              onChange={setText}
              onClose={() => {
                setText('');
                setSearchOpen(false);
              }}
            />
          ) : (
            <>
              {!isPhone && (
                <DS.Input
                  type="search"
                  aria-label="Forum durchsuchen"
                  placeholder="Forum durchsuchen"
                  size="sm"
                  className="forum__search"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              )}
              <DS.SegmentedControl
                size="sm"
                aria-label="Ansicht"
                className="forum__views"
                value={view}
                onChange={(v) => setParams(v === 'alle' ? {} : { ansicht: v }, { replace: true })}
                options={[
                  { value: 'alle', label: isPhone ? 'Alle' : 'Alle Foren' },
                  { value: 'meine', label: isPhone ? 'Meine' : 'Meine Foren' },
                  { value: 'neu', label: isPhone ? 'Neu' : 'Neue Themen' },
                ]}
              />
              {isPhone && <SearchIconButton label="Forum durchsuchen" onClick={() => setSearchOpen(true)} />}
            </>
          )
        }
      />
      <DS.Card fill flush>
        {search ? (
          <SearchResults query={search} />
        ) : view === 'neu' ? (
          <BoardNews />
        ) : loading ? (
          <DS.Loading rows={8} />
        ) : list.length ? (
          <DS.ForumCategoryList
            categories={list.map((b) => {
              const c = toCategory(b);
              return !onlyMine && myIds.has(b.id)
                ? { ...c, description: <><span className="forum__tag">Abonniert</span> {c.description}</> }
                : c;
            })}
          />
        ) : (
          <DS.EmptyState compact as="h3" title="Noch keine Foren abonniert">
            Öffne ein Forum und tippe auf „Abonnieren“.
          </DS.EmptyState>
        )}
      </DS.Card>
    </>
  );
}

/** Newest threads of all boards the player subscribed to (my/boardnews). */
function BoardNews() {
  const news = useBoardNews();
  const posts = news.data?.pages.flatMap((p) => p.content) ?? [];
  if (news.isLoading) return <DS.Loading rows={8} />;
  return (
    <>
      <DS.ThreadList
        aria-label="Neue Themen aus deinen Foren"
        threads={posts.map((p) => boardNewsThread(p))}
        emptyText="Noch nichts – abonniere ein Forum, dann erscheinen seine neuen Themen hier."
      />
      {news.hasNextPage && (
        <div className="forum__more">
          <DS.Button variant="secondary" size="sm" loading={news.isFetchingNextPage} onClick={() => news.fetchNextPage()}>
            Ältere Themen
          </DS.Button>
        </div>
      )}
    </>
  );
}

function Board({ boardId }: { boardId: string }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const board = useBoard(boardId);
  const subs = useSubboards(boardId);
  const [q, setQ, search] = useUrlSearch();
  const isPhone = useIsPhone();
  const [searchOpen, setSearchOpen] = useState(false);
  const page = Math.max(0, Number(params.get('seite') ?? 1) - 1);
  const posts = useBoardPosts(boardId, page, search);
  const listRef = useRef<HTMLDivElement>(null);
  useHighlight(listRef, search);
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
        meta={
          <span className="forum__meta">
            {/* Phone: the title is only in the app header („Forum“) – name and the way up stay here. */}
            {isPhone && !b ? (
              '\u00a0'
            ) : isPhone && (
              <>
                <a
                  className="forum__up"
                  href={b?.parent ? `/forum/${b.parent.id}` : '/forum'}
                  aria-label={`Zurück zu ${b?.parent?.name ?? 'allen Foren'}`}
                >
                  ‹
                </a>
                <strong className="forum__name">{b?.name ?? '\u00a0'}</strong>
                {/* flex drops plain edge spaces */}
                {'\u00a0·\u00a0'}
              </>
            )}
            {(!isPhone || b) && <span className="forum__count">
              {total === 1 ? '1 Thema' : `${total.toLocaleString('de-DE')} Themen`}
              {b?.numberOfMembers && !isPhone ? ` · ${b.numberOfMembers.toLocaleString('de-DE')} Abonnenten` : ''}
            </span>}
          </span>
        }
        actions={
          isPhone && (searchOpen || q) ? (
            <PhoneSearchRow
              label="Themen durchsuchen"
              placeholder={`In ${b?.name ?? 'diesem Forum'} suchen`}
              value={q}
              onChange={setQ}
              onClose={() => {
                setQ('');
                setSearchOpen(false);
              }}
            />
          ) : (
            <>
              <SubscribeButton board={b} />
              {isPhone ? (
                <SearchIconButton label="Themen durchsuchen" onClick={() => setSearchOpen(true)} />
              ) : (
                <DS.Input type="search" aria-label="Themen durchsuchen" placeholder="Suchen" size="sm" value={q} onChange={(e) => setQ(e.target.value)} />
              )}
              <DS.Button variant="primary" size="sm" onClick={() => setWriting(true)}>
                Neues Thema
              </DS.Button>
            </>
          )
        }
      />
      <DS.Card fill flush>
        {search && (
          <p className="forum__elsewhere">
            <a href={`/forum?suche=${encodeURIComponent(search)}`}>„{search}“ im ganzen Forum suchen, auch in Antworten</a>
          </p>
        )}
        {/* Description and sub-boards live in the same box as the list: they arrive with it, nothing below jumps. */}
        <div ref={listRef}>
          {b?.description && !subs.isLoading && !posts.isLoading && <p className="forum__desc">{htmlToText(b.description)}</p>}
          {subs.data?.content.length && !board.isLoading && !posts.isLoading ? (
            isPhone ? (
              // Phone: sub-boards as one scrolling row of links, so the threads start right below.
              <nav className="forum__subchips" aria-label="Unterforen">
                {subs.data.content.map((s) => (
                  <a key={s.id} href={`/forum/${s.id}`} className="forum__subchip">
                    <span className="forum__subchipName">{s.name}</span>
                    <span className="forum__subchipCount">{(s.numberOfPosts ?? 0).toLocaleString('de-DE')}</span>
                  </a>
                ))}
              </nav>
            ) : (
              <div className="forum__subs">
                <DS.ForumCategoryList label="Unterforen" categories={subs.data.content.map((s) => toCategory(s))} />
              </div>
            )
          ) : null}
          {posts.isLoading || board.isLoading || subs.isLoading ? (
            <DS.Loading rows={8} />
          ) : (
            <DS.ThreadList
              threads={(posts.data?.content ?? []).map((p) => toThread(p, boardId))}
              emptyText={search ? 'Nichts gefunden.' : 'Noch keine Themen.'}
            />
          )}
        </div>

        {total > 30 && (
          <div className="forum__pages">
            <DS.Pagination
              page={page + 1}
              pages={Math.ceil(total / 30)}
              onChange={(p) =>
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    if (p > 1) next.set('seite', String(p));
                    else next.delete('seite');
                    return next;
                  },
                  { replace: true },
                )
              }
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

/**
 * Subscribe to a board (membership as reader) or unsubscribe. Sub-boards are subscribed through
 * their top board. Leaving a non-public board may lock the player out, so that asks first.
 */
function SubscribeButton({ board: b }: { board: BoardView | undefined }) {
  const me = useMe();
  const mine = useMyBoards();
  const membership = useBoardMembership();
  const [confirm, setConfirm] = useState(false);
  const board = b ? membershipBoard(b) : { id: '', name: '' };
  const member = !!mine.data?.content.some((x) => x.id === board.id);
  const busy = membership.join.isPending || membership.leave.isPending;
  const failed = membership.join.error ?? membership.leave.error;
  const leave = () => membership.leave.mutate(board.id, { onSettled: () => setConfirm(false) });
  const via = b && board.id !== b.id ? ` (über „${board.name}“)` : '';
  return (
    <>
      <DS.Button
        variant="secondary"
        size="sm"
        aria-pressed={member}
        loading={busy}
        disabled={!b || !me.data?.id || mine.isLoading}
        title={failed ? `Nicht gespeichert: ${failed.message}` : member ? `Abonniert${via}` : `Abonnieren${via}`}
        onClick={() =>
          member
            ? board.publicBoard === false
              ? setConfirm(true)
              : leave()
            : membership.join.mutate({ userId: me.data!.id!, boardId: board.id })
        }
      >
        {member ? '✓ Abonniert' : 'Abonnieren'}
      </DS.Button>
      <DS.Dialog
        open={confirm}
        role="alertdialog"
        size="sm"
        onClose={() => setConfirm(false)}
        title={`${board.name} nicht mehr abonnieren?`}
        description="Das Forum ist nicht öffentlich. Ohne Mitgliedschaft kommst du vielleicht nicht wieder hinein."
        actions={
          <>
            <DS.Button variant="ghost" onClick={() => setConfirm(false)}>
              Abbrechen
            </DS.Button>
            <DS.Button variant="danger" loading={membership.leave.isPending} onClick={leave}>
              Austreten
            </DS.Button>
          </>
        }
      />
    </>
  );
}

function Thread({ boardId, postId }: { boardId: string; postId: string }) {
  const post = usePost(postId);
  const board = useBoard(boardId);
  const comments = useComments(postId);
  const reply = useCreateComment();
  const [report, setReport] = useState<ReportTarget | null>(null);
  const isPhone = useIsPhone();
  const [replying, setReplying] = useState(false);
  const p = post.data;
  const author = (u?: { username?: string }) => ({
    name: u?.username ?? '?',
    href: `/spieler/${encodeURIComponent(u?.username ?? '')}`,
  });
  const reportButton = (id: string, u: { username?: string } | undefined, n: number) => (
    <DS.Button
      variant="ghost"
      size="sm"
      aria-label={`Beitrag #${n} von ${u?.username ?? '?'} melden`}
      onClick={() => setReport({ id, type: 'POST', label: `Beitrag #${n} von ${u?.username ?? '?'}` })}
    >
      Melden
    </DS.Button>
  );

  if (post.isLoading) return <DS.Loading rows={10} />;
  if (!p) return <DS.EmptyState title="Thema nicht gefunden" />;
  const editor = (
    <>
      <DS.ForumEditor
        mode="reply"
        submitLabel="Antworten"
        loading={reply.isPending}
        onSubmit={(v) =>
          reply.mutate(
            { postId, title: replyTitle(p.title), html: textToHtml(v.body) },
            { onSuccess: () => setReplying(false) },
          )
        }
      />
      {reply.isError && <DS.Banner variant="error">Antwort nicht gesendet: {reply.error.message}</DS.Banner>}
    </>
  );
  return (
    <>
      <DS.Card fill flush className="forum__thread">
        <DS.ForumThread
          title={p.title}
          eyebrow={<a href={`/forum/${boardId}`}>{board.data?.name ?? 'Forum'}</a>}
          meta={`${(p.numberOfComments ?? 0).toLocaleString('de-DE')} Antworten`}
          // Phone: answering sits in the thumb zone below the thread (bar + sheet), not after the last post.
          reply={isPhone ? undefined : editor}
        >
          <DS.ForumPost
            op
            number={1}
            author={author(p.author)}
            time={p.dateCreated ? DS.format.dateTime(p.dateCreated) : undefined}
            text={htmlToText(p.content)}
            actions={reportButton(p.id, p.author, 1)}
          />
          {(comments.data ?? []).map((c, i) => (
            <DS.ForumPost
              key={c.id}
              number={i + 2}
              author={author(c.author)}
              time={c.dateCreated ? DS.format.dateTime(c.dateCreated) : undefined}
              text={htmlToText(c.content)}
              actions={reportButton(c.id, c.author, i + 2)}
            />
          ))}
        </DS.ForumThread>
        <ReportDialog target={report} onClose={() => setReport(null)} />
      </DS.Card>
      {isPhone && (
        <>
          <div className="forum__replybar">
            <DS.Button variant="primary" fullWidth onClick={() => setReplying(true)}>
              Antworten
            </DS.Button>
          </div>
          <DS.Sheet open={replying} onClose={() => !reply.isPending && setReplying(false)} title="Antworten" side="auto">
            {editor}
          </DS.Sheet>
        </>
      )}
    </>
  );
}
