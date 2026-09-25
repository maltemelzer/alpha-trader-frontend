import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DS } from '../ds';
import { useHotNews, useNews, type PostView } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Article } from './Article';
import { toPost } from './derive';
import './NewsPage.css';

/**
 * Newspaper: latest news as a feed (lead story on top), popular ones on the side.
 * An article opens at /zeitung/:postId – beside the feed on wide screens, alone on narrow ones.
 */
export function NewsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const onLinkClick = useInternalLinks();
  const [q, setQ] = useState('');
  const search = useDebounced(q, 300);
  const news = useNews(search);
  const hot = useHotNews(8);

  const posts = useMemo(() => news.data?.pages.flatMap((p) => p.content) ?? [], [news.data]);
  const total = news.data?.pages[0]?.totalElements ?? 0;
  const href = (p: { id: string }) => `/zeitung/${p.id}`;

  const feed = (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll news__feed">
        {news.isLoading ? (
          <DS.Loading rows={8} label="Zeitung wird geladen" />
        ) : posts.length ? (
          <>
            <DS.NewsFeed
              lead={search ? undefined : toPost(posts[0])}
              items={(search ? posts : posts.slice(1)).map(toPost)}
              hrefFor={href}
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
          <DS.EmptyState compact as="h3" title={search ? 'Nichts gefunden' : 'Noch keine Artikel'} />
        )}
      </div>
    </DS.Card>
  );

  const popular = (
    <DS.Card className="panel" title="Beliebt">
      <div className="panel__fill scroll">
        {hot.data ? (
          <DS.NewsFeed items={hot.data.map((p: PostView) => toPost(p))} variant="brief" hrefFor={href} />
        ) : (
          <DS.Loading rows={6} />
        )}
      </div>
    </DS.Card>
  );

  const article = postId && (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll news__article">
        <Article postId={postId} onClose={() => navigate('/zeitung')} />
      </div>
    </DS.Card>
  );

  return (
    <div className="page news" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Zeitung"
        meta={total ? <span>{total.toLocaleString('de-DE')} Artikel</span> : '\u00a0'}
        actions={<DS.Input aria-label="Artikel suchen" placeholder="Artikel suchen" size="sm" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
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
