import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useCompanyByAsin,
  useHotNews,
  useNews,
  useNewsFeed,
  useUserProfile,
  type NewsSource,
  type PostView,
} from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Article } from './Article';
import { FollowControl } from './FollowControl';
import { newsFilter, newsHref, toPost } from './derive';
import './NewsPage.css';

/**
 * Newspaper: latest news as a feed (lead story on top), popular ones on the side.
 * ?autor= / ?tag= / ?unternehmen= filter the feed and offer „Folgen“ / „Ausblenden“.
 * An article opens at /zeitung/:postId (the filter stays) – beside the feed on wide screens.
 */
export function NewsPage() {
  const { postId } = useParams();
  const { search: query } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const onLinkClick = useInternalLinks();
  const filter = newsFilter(params);
  const [q, setQ] = useState('');
  const search = useDebounced(q, 300);

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

  const posts = useMemo(() => news.data?.pages.flatMap((p) => p.content) ?? [], [news.data]);
  const total = news.data?.pages[0]?.totalElements;
  const href = (p: { id: string }) => `/zeitung/${p.id}${query}`;
  const withLead = filter.kind === 'all' && !search;
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
    <DS.Card className="panel" title="Beliebt">
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
  const back = (
    <DS.Button variant="ghost" size="sm" onClick={() => navigate('/zeitung')}>
      ✕ Alle Artikel
    </DS.Button>
  );
  const header =
    filter.kind === 'author' ? (
      <DS.PageHeader
        size="md"
        eyebrow={<a href="/zeitung">Zeitung · Autor</a>}
        title={filter.username}
        meta={<span>{count}</span>}
        actions={
          <>
            <FollowControl kind="authors" id={authorId} name={filter.username} />
            {back}
          </>
        }
      />
    ) : filter.kind === 'hashtag' ? (
      <DS.PageHeader
        size="md"
        eyebrow={<a href="/zeitung">Zeitung · Hashtag</a>}
        title={`#${filter.tag}`}
        meta={<span>{count}</span>}
        actions={
          <>
            <FollowControl kind="hashtags" id={filter.tag} name={`#${filter.tag}`} />
            {back}
          </>
        }
      />
    ) : filter.kind === 'company' ? (
      <DS.PageHeader
        size="md"
        eyebrow={
          <>
            <a href="/zeitung">Zeitung</a> · <a href={`/unternehmen/${encodeURIComponent(filter.asin)}`}>{filter.asin}</a>
          </>
        }
        title={company.data?.name ?? filter.asin}
        meta={<span>{count}</span>}
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
        meta={<span>{count}</span>}
        actions={<DS.Input aria-label="Artikel suchen" placeholder="Artikel suchen" size="sm" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
    );

  return (
    <div className={`page news${!isWide && postId ? ' news--reading' : ''}`} onClick={onLinkClick}>
      {(isWide || !postId) && header}
      <div className={`page__body news__body${isWide ? ' news__body--wide' : ''}`}>
        {isWide ? (
          <>
            {feed}
            {article || popular}
          </>
        ) : (
          article || feed
        )}
      </div>
    </div>
  );
}
