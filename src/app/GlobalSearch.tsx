import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useSecuritySearch } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { searchTerm } from '../lib/securitySearch';

const typeLabel = (t: string) => (DS.LISTING_TYPES as Record<string, string>)[t] ?? t;

/** Security search in the header („/“ focuses it from anywhere). */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const search = useSecuritySearch(useDebounced(q, 250), 8);
  const results = (search.data ?? []).map((r) => ({
    id: r.asin,
    name: r.name,
    ticker: r.asin,
    meta: typeLabel(r.type),
    price: r.price,
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
        results={searchTerm(q).length >= 2 ? results : []}
        loading={search.isFetching}
        emptyText={searchTerm(q).length < 2 ? 'Mindestens zwei Zeichen eingeben.' : 'Nichts gefunden.'}
        onSelect={(r) => {
          setQ('');
          if (r.id) navigate(`/wertpapier/${r.id}`);
        }}
      />
    </div>
  );
}
