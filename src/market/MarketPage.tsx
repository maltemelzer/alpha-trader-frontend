import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useBigMovers, useMarketTrades, useMinimalStats, useMostTraded, useSpreadSearch } from '../api/queries';
import { Plot } from '../charts/Plot';
import { short } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { activityChart, moversChart } from './charts';
import { applyFilter, movers, tickerItems, toResult, tradeCounts } from './derive';
import type { MarketFilterValue } from '../../vendor/bankiersgruen';
import './MarketPage.css';

const PAGE = 50;
const href = (asin: string) => `/wertpapier/${asin}`;

/**
 * Market – search/filter all listings; winners and losers; live trades.
 * Wide: results left, charts and ticker right. Phone: one view at a time.
 */
export function MarketPage() {
  const isWide = useMediaQuery('(min-width: 1100px)');
  const isPhone = useIsPhone();
  const onLinkClick = useInternalLinks();
  const [params, setParams] = useSearchParams();
  const setParam = useCallback(
    (key: string, v: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v) next.set(key, v);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  // Filter: type and search live in the URL, the rest only in the page.
  const [more, setMore] = useState<MarketFilterValue>({});
  const type = params.get('art') ?? 'STOCK';
  const q = params.get('q') ?? '';
  const value: MarketFilterValue = useMemo(() => ({ ...more, type, search: q }), [more, type, q]);
  const search = useDebounced(value.search ?? '', 250);
  const searching = search.trim().length >= 2;
  const found = useSpreadSearch(search);
  const stats = useMinimalStats();
  const winners = useBigMovers(false);
  const losers = useBigMovers(true);
  const mostTraded = useMostTraded(value.type || undefined, 50);
  // Without a search term: the most traded securities of the chosen type.
  const source = searching ? found : mostTraded;
  const rows = useMemo(() => applyFilter(source.data?.content ?? [], value), [source.data, value]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(Math.max(0, Number(params.get('seite') ?? 1) - 1), pages - 1);
  const results = useMemo(() => rows.slice(page * PAGE, (page + 1) * PAGE).map(toResult), [rows, page]);
  const trades = useMarketTrades();

  const moverRows = useMemo(
    () => movers(winners.data?.content ?? [], losers.data?.content ?? []),
    [winners.data, losers.data],
  );
  // Names for the ticker: whatever lists are already loaded.
  const names = useMemo(() => {
    const out: Record<string, { name: string; type: string }> = {};
    const add = (l?: { securityIdentifier: string; name: string; type?: string }) => {
      if (l) out[l.securityIdentifier] = { name: l.name, type: l.type ?? '' };
    };
    [found.data, winners.data, losers.data, mostTraded.data].forEach((p) => p?.content.forEach((r) => add(r.listing)));
    return out;
  }, [found.data, winners.data, losers.data, mostTraded.data]);
  const ticker = useMemo(() => tickerItems(trades.data ?? [], names), [trades.data, names]);
  const active = useMemo(
    () =>
      tradeCounts(trades.data ?? [])
        .slice(0, 8)
        .map((r) => ({ ...r, name: names[r.asin]?.name ?? r.asin })),
    [trades.data, names],
  );

  const [chart, setChart] = useState('bewegung');
  const view = params.get('ansicht') ?? 'suche';

  const searchPanel = (
    <DS.Card flush className="panel market__search">
      <div className="market__filter">
        <DS.MarketFilterBar
          value={value}
          total={source.data ? rows.length : undefined}
          onChange={(v) => {
            setMore({ minPrice: v.minPrice, maxPrice: v.maxPrice, withAsk: v.withAsk, withBid: v.withBid });
            if ((v.type ?? '') !== value.type) setParam('art', v.type ?? '');
            if ((v.search ?? '') !== value.search) setParam('q', v.search || null);
            setParam('seite', null);
          }}
        />
      </div>
      <div className="panel__fill scroll market__results">
        {!searching && <p className="market__hint">Meistgehandelt – für alle Wertpapiere Name oder ASIN eingeben.</p>}
        {source.isLoading ? (
          <DS.Loading rows={10} label="Wertpapiere werden geladen" />
        ) : source.isError ? (
          <DS.Banner variant="error">Suche fehlgeschlagen: {source.error?.message}</DS.Banner>
        ) : (
          <DS.MarketResults
            results={results}
            hrefFor={(r) => href(r.id)}
            density="sm"
          />
        )}
      </div>
      {pages > 1 && (
        <div className="market__pages">
          <DS.Pagination
            page={page + 1}
            pages={pages}
            total={`${rows.length.toLocaleString('de-DE')} Treffer`}
            onChange={(p) => setParam('seite', p > 1 ? String(p) : null)}
          />
        </div>
      )}
    </DS.Card>
  );

  const charts = (
    <DS.Card
      className="panel"
      title={chart === 'bewegung' ? 'Bewegung' : 'Umsatz'}
      action={
        <DS.SegmentedControl
          size="sm"
          aria-label="Diagramm"
          value={chart}
          onChange={setChart}
          options={[
            { value: 'bewegung', label: 'Kurs' },
            { value: 'umsatz', label: 'Umsatz' },
          ]}
        />
      }
      footer={chart === 'bewegung' ? 'Aktien mit den größten Kursbewegungen.' : 'Umsatz in den letzten ~1.000 Trades.'}
    >
      <div className="panel__fill market__chart">
        {chart === 'bewegung' ? (
          moverRows.length ? (
            <Plot aria-label="Gewinner und Verlierer" figure={(t, w) => moversChart(t, w, moverRows)} />
          ) : (
            <DS.Loading rows={5} />
          )
        ) : active.length ? (
          <Plot aria-label="Größte Umsätze" figure={(t, w) => activityChart(t, w, active)} />
        ) : (
          <DS.Loading rows={5} />
        )}
      </div>
    </DS.Card>
  );

  const live = (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll market__ticker">
        <DS.LiveTicker items={ticker} title="Letzte Trades" max={30} hrefFor={(i) => href(i.listing.securityIdentifier)} />
      </div>
    </DS.Card>
  );

  const s = stats.data;
  return (
    <div className={`page market${isWide ? ' market--wide' : ''}`} onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Markt"
        meta={
          s && isPhone ? (
            <>
              <span>{s.numberOfTrades24h.toLocaleString('de-DE')} Trades in 24 h</span>
              <span>{short(s.tradeVolume24h)} € Umsatz</span>
            </>
          ) : undefined
        }
        aside={
          s && !isPhone ? (
            <DS.MarketPulse
              stats={{
                onlineUsers: s.numberOfOnlineUsers,
                users: s.numberOfUsers,
                companies: s.numberOfCompanies,
                trades24h: s.numberOfTrades24h,
                volume24h: s.tradeVolume24h,
              }}
            />
          ) : undefined
        }
      />
      {isWide ? (
        <div className="page__body market__body">
          {searchPanel}
          <div className="page__col market__side">
            {charts}
            {live}
          </div>
        </div>
      ) : (
        <div className="page__body market__body">
          <DS.SegmentedControl
            aria-label="Ansicht"
            fullWidth
            value={view}
            onChange={(v) => setParam('ansicht', v === 'suche' ? null : v)}
            options={[
              { value: 'suche', label: 'Suche' },
              { value: 'bewegung', label: 'Bewegung' },
              { value: 'live', label: 'Live' },
            ]}
          />
          {view === 'bewegung' ? charts : view === 'live' ? live : searchPanel}
        </div>
      )}
    </div>
  );
}
