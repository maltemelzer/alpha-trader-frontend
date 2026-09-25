import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { usePostSearch } from '../api/queries';
import { searchTerms, termPattern, useHighlight } from '../lib/highlight';
import { useNow } from '../lib/useNow';
import { boardFacets, toSearchRow } from './derive';

const SCOPE = [
  { value: 'alle', label: 'Mit Antworten' },
  { value: 'themen', label: 'Nur Themen' },
];

/**
 * Full-text hits in the whole forum (/forum?suche=…): threads and answers with an excerpt around the
 * match, search words highlighted. Hits per board as bars – a click limits the search to that board
 * (?forum=<id>, exactly that board). ?antworten=nein leaves out answers.
 */
export function SearchResults({ query }: { query: string }) {
  const [params, setParams] = useSearchParams();
  const boardId = params.get('forum') ?? '';
  const scope = params.get('antworten') === 'nein' ? 'themen' : 'alle';
  const search = usePostSearch(query, { boardId, comments: scope === 'alle' });
  const now = useNow(60_000);
  const listRef = useRef<HTMLDivElement>(null);
  useHighlight(listRef, query, { wholeWords: true });

  const pattern = useMemo(() => termPattern(searchTerms(query), true), [query]);
  const rows = useMemo(
    () => (search.data?.pages ?? []).flatMap((p) => p.content).map((p) => toSearchRow(p, pattern, now)),
    [search.data, pattern, now],
  );
  const facets = useMemo(() => boardFacets(rows), [rows]);
  const total = search.data?.pages[0]?.totalElements;
  const filtered = boardId ? rows.find((r) => r.board?.id === boardId)?.board : undefined;
  const max = facets[0]?.count ?? 1;

  const set = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) if (v) next.set(k, v); else next.delete(k);
        return next;
      },
      { replace: true },
    );

  const count =
    total == null ? ' ' : `${total.toLocaleString('de-DE')} Treffer${filtered ? ` in „${filtered.name}“` : ''}`;

  return (
    <div className="forum-search">
      <div className="forum-search__bar">
        <span className="forum-search__count" aria-live="polite">
          {count}
        </span>
        {boardId && (
          <DS.Button variant="ghost" size="sm" onClick={() => set({ forum: null })}>
            ✕ Alle Foren
          </DS.Button>
        )}
        <DS.SegmentedControl
          size="sm"
          aria-label="Treffer"
          fullWidth={false}
          options={SCOPE}
          value={scope}
          onChange={(v) => set({ antworten: v === 'themen' ? 'nein' : null })}
        />
      </div>
      <div className={`forum-search__body${boardId ? '' : ' forum-search__body--facets'}`}>
        <div ref={listRef} className="forum-search__list">
          {query.trim().length < 2 ? (
            <DS.EmptyState compact as="h3" title="Mindestens zwei Zeichen" />
          ) : search.isLoading ? (
            <DS.Loading rows={8} label="Forum wird durchsucht" />
          ) : search.isError ? (
            <DS.Banner variant="error">Suche fehlgeschlagen: {search.error.message}</DS.Banner>
          ) : rows.length ? (
            <>
              <ul className="forum-hits" aria-label={`Treffer für „${query}“`}>
                {rows.map((r) => (
                  <li key={r.id} className="forum-hit">
                    <div className="forum-hit__meta">
                      {r.board ? (
                        <a className="forum-hit__board" href={`/forum/${r.board.id}`}>
                          {r.board.name}
                        </a>
                      ) : null}
                      {r.answer && <span className="forum__tag">Antwort</span>}
                    </div>
                    {r.href ? (
                      <a className="forum-hit__title" href={r.href}>
                        {r.title}
                      </a>
                    ) : (
                      <span className="forum-hit__title">{r.title}</span>
                    )}
                    {r.excerpt && <p className="forum-hit__excerpt">{r.excerpt}</p>}
                    <div className="forum-hit__foot">
                      <span>{r.author}</span>
                      {r.time && <span>{r.time}</span>}
                      {r.replies != null && <span>{r.replies === 1 ? '1 Antwort' : `${r.replies.toLocaleString('de-DE')} Antworten`}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {search.hasNextPage && (
                <div className="forum__more">
                  <DS.Button variant="secondary" size="sm" loading={search.isFetchingNextPage} onClick={() => search.fetchNextPage()}>
                    Weitere Treffer
                  </DS.Button>
                </div>
              )}
            </>
          ) : (
            <DS.EmptyState compact as="h3" title="Nichts gefunden">
              Die Forumssuche findet ganze Wörter: „Anleihe“ findet nicht „Anleihen“. Mehrere Wörter müssen alle vorkommen.
            </DS.EmptyState>
          )}
        </div>
        {!boardId && (
          <nav className="forum-facets" aria-label="Treffer je Forum">
            <h3 className="forum-facets__title">
              Treffer je Forum{search.hasNextPage ? <span> · erste {rows.length}</span> : null}
            </h3>
            {search.isLoading && <DS.Skeleton variant="text" lines={2} />}
            <ul>
              {facets.slice(0, 8).map((f) => (
                <li key={f.id}>
                  <button type="button" className="forum-facet" onClick={() => set({ forum: f.id })} aria-label={`Nur in ${f.name} suchen (${f.count} Treffer)`}>
                    <span className="forum-facet__label">
                      <span className="forum-facet__name">{f.name}</span>
                      <span className="forum-facet__count">{f.count.toLocaleString('de-DE')}</span>
                    </span>
                    <span className="forum-facet__bar" aria-hidden="true">
                      <span style={{ width: `${Math.max(4, (f.count / max) * 100)}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
