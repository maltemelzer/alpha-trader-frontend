import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useSpreadSearch } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';

const typeLabel = (t: string) => (DS.LISTING_TYPES as Record<string, string>)[t] ?? t;

/** Security search in the header („/“ focuses it from anywhere). */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const search = useSpreadSearch(useDebounced(q, 250), 8);
  const results = (search.data?.content ?? []).map((r) => ({
    id: r.listing.securityIdentifier,
    name: r.listing.name,
    ticker: r.listing.securityIdentifier,
    meta: typeLabel(r.listing.type),
    price: r.lastPrice?.value ?? undefined,
  }));
  return (
    <div className="global-search">
      <DS.StockSearch
        aria-label="Wertpapier suchen"
        placeholder="Suchen"
        size="sm"
        shortcut="/"
        align="end"
        value={q}
        onChange={setQ}
        results={q.trim().length >= 2 ? results : []}
        loading={search.isFetching}
        emptyText={q.trim().length < 2 ? 'Mindestens zwei Zeichen eingeben.' : 'Nichts gefunden.'}
        onSelect={(r) => {
          setQ('');
          if (r.id) navigate(`/wertpapier/${r.id}`);
        }}
      />
    </div>
  );
}
