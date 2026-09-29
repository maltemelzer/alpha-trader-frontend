import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useCompanyByAsin,
  useCreatePost,
  useHotNews,
  useNews,
  useNewsFeed,
  useUserProfile,
  type NewsSource,
  type PostView,
} from '../api/queries';
import { useHighlight } from '../lib/highlight';
import { markupToHtml } from '../lib/html';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useUrlSearch } from '../lib/useUrlSearch';
import { PhoneSearchRow, SearchIconButton } from '../forum/PhoneSearch';
import { Article } from './Article';
import { FollowControl } from './FollowControl';
import { newsFilter, newsHref, toPost } from './derive';
import './NewsPage.css';

/**
 * Newspaper: latest news as a feed (lead story on top), popular ones on the side.
 * ?autor= / ?tag= / ?unternehmen= filter the feed and offer „Folgen“ / „Ausblenden“.
 * ?suche= searches title and text (any part of a word); hits are highlighted.
 * An article opens at /zeitung/:postId (the filter and the search stay) – beside the feed on wide screens.
 * Narrower screens have no room for „Beliebt“ beside the feed: ?ansicht=beliebt shows it instead.
 * „Artikel verfassen“ (?schreiben=1) opens the editor in a sheet; the article is a post without board.
 */
export function NewsPage() {
  const { postId } = useParams();
  const { search: query } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const isPhone = useIsPhone();
  const [searchOpen, setSearchOpen] = useState(false);
  const onLinkClick = useInternalLinks();
  const filter = newsFilter(params);
  const [q, setQ, urlSearch] = useUrlSearch('suche', 400, ['ansicht']);
  const search = filter.kind === 'all' ? urlSearch : '';
  const bodyRef = useRef<HTMLDivElement>(null);
  useHighlight(bodyRef, search);

  const profile = useUserProfile(filter.kind === 'author' ? filter.username : '');
  const company = useCompanyByAsin(filter.kind === 'company' ? filter.asin : '');
  const authorId = profile.data?.user.id;
  const source: NewsSource | null =
    filter.kind === 'hashtag'
      ? { kind: 'hashtag', tag: filter.tag }
      : filter.kind === 'author' && authorId
        ? { kind: 'author', userId: authorId }
        : filter.kind === 'company' && company.data?.id
          ? { kind: 'company', companyId: company.data.id }
          : null;
  const latest = useNews(search, filter.kind === 'all');
  const filtered = useNewsFeed(source);
  const news = filter.kind === 'all' ? latest : filtered;
  const hot = useHotNews(8);
  const create = useCreatePost();
  const writing = params.get('schreiben') === '1';
  const setWriting = (open: boolean) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (open) next.set('schreiben', '1');
        else next.delete('schreiben');
        return next;
      },
      { replace: true },
    );

  const posts = useMemo(() => news.data?.pages.flatMap((p) => p.content) ?? [], [news.data]);
  const total = news.data?.pages[0]?.totalElements;
  const href = (p: { id: string }) => `/zeitung/${p.id}${query}`;
  const withLead = filter.kind === 'all' && !search;
  const showPopular = !isWide && filter.kind === 'all' && !search && params.get('ansicht') === 'beliebt';
  const notFound = profile.isError || company.isError;
  const loading = !notFound && (news.isLoading || (filter.kind !== 'all' && !source));

  const feed = (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll news__feed">
        {loading ? (
          <DS.Loading rows={8} label="Zeitung wird geladen" />
        ) : posts.length ? (
          <>
            <DS.NewsFeed
              lead={withLead ? toPost(posts[0]) : undefined}
              items={(withLead ? posts.slice(1) : posts).map(toPost)}
              hrefFor={href}
              tagHref={(tag) => newsHref({ kind: 'hashtag', tag })}
              authorHref={(username) => newsHref({ kind: 'author', username })}
              publisherHref={(p) => {
                const asin = (p as { company?: { securityIdentifier?: string } }).company?.securityIdentifier;
                return asin ? newsHref({ kind: 'company', asin }) : undefined;
              }}
              onComments={(p) => navigate(href(p))}
            />
            {news.hasNextPage && (
              <div className="news__more">
                <DS.Button variant="secondary" size="sm" loading={news.isFetchingNextPage} onClick={() => news.fetchNextPage()}>
                  Ältere Artikel
                </DS.Button>
              </div>
            )}
          </>
        ) : (
          <DS.EmptyState
            compact
            as="h3"
            title={notFound ? 'Nicht gefunden' : search ? 'Nichts gefunden' : 'Noch keine Artikel'}
          />
        )}
      </div>
    </DS.Card>
  );

  const popular = (
    <DS.Card className="panel" title={isWide ? 'Beliebt' : undefined}>
      <div className="panel__fill scroll">
        {hot.data ? (
          <DS.NewsFeed
            items={hot.data.map((p: PostView) => toPost(p))}
            variant="brief"
            hrefFor={href}
            tagHref={(tag) => newsHref({ kind: 'hashtag', tag })}
          />
        ) : (
          <DS.Loading rows={6} />
        )}
      </div>
    </DS.Card>
  );

  const article = postId && (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll news__article">
        <Article postId={postId} onClose={() => navigate(`/zeitung${query}`)} />
      </div>
    </DS.Card>
  );

  const count = total == null ? '\u00a0' : total === 1 ? '1 Artikel' : `${total.toLocaleString('de-DE')} Artikel`;
  // Phone: the page title is only in the app header („Zeitung“) – what is filtered stays visible in the meta line.
  const metaWith = (name: string) => (
    <span className="news__meta">
      {isPhone && (
        <>
          <strong className="news__metaName">{name}</strong>
          {/* flex drops plain edge spaces */}
          {'\u00a0·\u00a0'}
        </>
      )}
      {count}
    </span>
  );
  const back = (
    <DS.Button variant="ghost" size="sm" onClick={() => navigate('/zeitung')}>
      ✕ Alle Artikel
    </DS.Button>
  );
  const header =
    filter.kind === 'author' ? (
      <DS.PageHeader
        className="ph--content"
        size="md"
        eyebrow={<a href="/zeitung">Zeitung · Autor</a>}
        title={filter.username}
        meta={metaWith(`Autor ${filter.username}`)}
        actions={
          <>
            <FollowControl kind="authors" id={authorId} name={filter.username} />
            {back}
          </>
        }
      />
    ) : filter.kind === 'hashtag' ? (
      <DS.PageHeader
        className="ph--content"
        size="md"
        eyebrow={<a href="/zeitung">Zeitung · Hashtag</a>}
        title={`#${filter.tag}`}
        meta={metaWith(`#${filter.tag}`)}
        actions={
          <>
            <FollowControl kind="hashtags" id={filter.tag} name={`#${filter.tag}`} />
            {back}
          </>
        }
      />
    ) : filter.kind === 'company' ? (
      <DS.PageHeader
        className="ph--content"
        size="md"
        eyebrow={
          <>
            <a href="/zeitung">Zeitung</a> · <a href={`/unternehmen/${encodeURIComponent(filter.asin)}`}>{filter.asin}</a>
          </>
        }
        title={company.data?.name ?? filter.asin}
        meta={metaWith(company.data?.name ?? filter.asin)}
        actions={
          <>
            <FollowControl kind="companies" id={company.data?.id} name={company.data?.name ?? filter.asin} />
            {back}
          </>
        }
      />
    ) : (
      <DS.PageHeader
        size="md"
        title="Zeitung"
        meta={<span>{showPopular ? 'Meistgelesen' : count}</span>}
        actions={
          isPhone && (searchOpen || q) ? (
            <PhoneSearchRow
              label="Artikel suchen"
              placeholder="Artikel suchen"
              value={q}
              onChange={setQ}
              onClose={() => {
                setQ('');
                setSearchOpen(false);
              }}
            />
          ) : (
            <>
              {!isPhone && (
                <DS.Input
                  type="search"
                  aria-label="Artikel suchen"
                  placeholder="Artikel suchen"
                  size="sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              )}
              {!isWide && (
                <DS.SegmentedControl
                  size="sm"
                  aria-label="Ansicht"
                  className="news__views"
                  value={showPopular ? 'beliebt' : 'neu'}
                  onChange={(v) => {
                    setQ('');
                    setParams(v === 'beliebt' ? { ansicht: 'beliebt' } : {}, { replace: true });
                  }}
                  options={[
                    { value: 'neu', label: 'Neueste' },
                    { value: 'beliebt', label: 'Beliebt' },
                  ]}
                />
              )}
              {isPhone && <SearchIconButton label="Artikel suchen" onClick={() => setSearchOpen(true)} />}
              <DS.Button variant="primary" size="sm" onClick={() => setWriting(true)}>
                {isPhone ? 'Verfassen' : 'Artikel verfassen'}
              </DS.Button>
            </>
          )
        }
      />
    );

  return (
    <div className={`page news${!isWide && postId ? ' news--reading' : ''}`} onClick={onLinkClick}>
      {(isWide || !postId) && header}
      <div ref={bodyRef} className={`page__body news__body${isWide ? ' news__body--wide' : ''}`}>
        {isWide ? (
          <>
            {feed}
            {article || popular}
          </>
        ) : (
          article || (showPopular ? popular : feed)
        )}
      </div>
      <DS.Sheet open={writing} onClose={() => !create.isPending && setWriting(false)} title="Artikel verfassen" side="auto" width={640}>
        <DS.ForumEditor
          mode="thread"
          titlePlaceholder="Überschrift"
          placeholder="Dein Artikel – #Hashtags ordnen ihn Themen zu"
          submitLabel="Veröffentlichen"
          loading={create.isPending}
          onCancel={() => setWriting(false)}
          onSubmit={(v) =>
            create.mutate(
              { title: v.title, html: markupToHtml(v.body) },
              { onSuccess: (p) => navigate(p?.id ? `/zeitung/${p.id}` : '/zeitung', { replace: true }) },
            )
          }
        />
        {create.isError && <DS.Banner variant="error">Nicht veröffentlicht: {create.error.message}</DS.Banner>}
      </DS.Sheet>
    </div>
  );
}
