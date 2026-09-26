import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useAllPriceChanges,
  useBiggestTraded,
  useBond,
  useBondList,
  useIndexes,
  useMarketTrades,
  useMinimalStats,
  useMostTraded,
  useSpreadSearch,
  useTopBookValues,
  useTradingMatrix,
} from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { short } from '../lib/format';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useNow } from '../lib/useNow';
import { useUrlSearch } from '../lib/useUrlSearch';
import { heatmapChart, marketMapChart, volumeChart } from './charts';
import { heatTiles, tickerItems, tileArea, TYPE_LABEL, volumeRows } from './derive';
import {
  applyScreen,
  bookLookup,
  changeLookup,
  chips,
  defaultSort,
  fromBonds,
  fromMarketRow,
  groupOf,
  marketMap,
  matchesText,
  mergeRows,
  readScreen,
  sortRows,
  tradesLookup,
  visibleColumns,
  volumeLookup,
  type ScreenRow,
} from './screener';
import { Screener } from './ScreenerPanel';
import { ClassOverview } from './ClassOverview';
import { overviewKind } from './overview';
import { RealEstateView } from './RealEstateView';
import { WarrantMarket } from './WarrantMarket';
import './MarketPage.css';

const PAGE = 50;
const UNIVERSE = 1000;
const SEARCH = 500;
const href = (asin: string) => `/wertpapier/${asin}`;

/**
 * Market – a screener over everything the fast lists deliver (search, types, ranges, presets, sort,
 * columns – all in the URL), turnover heatmap and live trades beside it; the „Marktkarte“ tab shows
 * all securities traded in 24 h grouped by type. Phone: one view at a time.
 *
 * Views: ?ansicht=suche|karte (wide tabs) plus umsatz|live on the phone; old `heatmap` → karte,
 * old `bewegung` → umsatz. Side card ?diagramm=heatmap|liste (old `umsatz` → liste).
 */
export function MarketPage() {
  const isWide = useMediaQuery('(min-width: 1100px)');
  const isPhone = useIsPhone();
  const onLinkClick = useInternalLinks();
  const [params, setParams] = useSearchParams();
  // All changes of one interaction go into ONE update: React Router hands every functional updater
  // the params of the last render, so a second call in the same tick would undo the first.
  const setParam = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, v] of Object.entries(changes)) {
            if (v) next.set(key, v);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const screen = useMemo(() => readScreen(params), [params]);
  const [text, setText] = useUrlSearch('q', 300, ['seite']);
  const q = screen.q.trim();
  const searching = q.length >= 2;
  const types = screen.types;
  const all = !types.length;
  const wantsBonds = all || types.includes('BOND') || types.includes('REPO');
  const onlyWarrants = types.length === 1 && types[0] === 'WARRANT';
  const now = useNow(60_000);

  // Sources. Without a search: everything traded recently (24 h volumes, trade counts); with a
  // search: the spread search over all listings. Bonds, repos and indexes come from their own lists.
  const volumes = useBiggestTraded('', UNIVERSE);
  const frequent = useMostTraded(undefined, UNIVERSE);
  const changes = useAllPriceChanges();
  const found = useSpreadSearch(searching ? q : '', SEARCH);
  const bonds = useBondList(wantsBonds && !onlyWarrants);
  const upper = q.toUpperCase();
  const asinBond = useBond(
    wantsBonds && /^(BO|SB|RE|SR)[A-Z0-9]{8}$/.test(upper) ? upper.replace(/^RE/, 'BO').replace(/^SR/, 'SB') : undefined,
    upper.startsWith('S') ? 'SYSTEM_BOND' : 'BOND',
  );
  const indexes = useIndexes(types.includes('INDEX'));
  const cols = visibleColumns(screen);
  const needBook = !!screen.ranges.bw || cols.includes('bw') || screen.sort?.key === 'bw';
  const book = useTopBookValues(needBook);

  const universe: ScreenRow[] = useMemo(() => {
    const bondList = [...(asinBond.data ? [asinBond.data] : []), ...(bonds.data ?? [])];
    const bondRowsAll = [...fromBonds(bondList, now), ...fromBonds(bondList, now, true)];
    const indexRows = (indexes.data?.content ?? []).map((i) =>
      fromMarketRow({ listing: { name: i.listing.name, securityIdentifier: i.listing.securityIdentifier, type: 'INDEX' } }),
    );
    const lists = searching
      ? [
          (found.data?.content ?? []).map(fromMarketRow),
          bondRowsAll.filter((r) => matchesText(r, q)),
          indexRows.filter((r) => r && matchesText(r, q)),
        ]
      : [(volumes.data?.content ?? []).map((r) => fromMarketRow(r as never)), (frequent.data?.content ?? []).map(fromMarketRow), bondRowsAll, indexRows];
    return mergeRows(lists, {
      volume: volumeLookup(volumes.data?.content, volumes.data?.totalElements),
      trades: tradesLookup(frequent.data?.content, frequent.data?.totalElements),
      change: changeLookup(changes.data?.winners, changes.data?.losers),
      book: bookLookup(book.data?.content),
    });
  }, [searching, q, found.data, volumes.data, frequent.data, bonds.data, asinBond.data, indexes.data, changes.data, book.data, now]);

  const sort = screen.sort ?? defaultSort(types);
  const base = useMemo(() => applyScreen(universe, { ...screen, ranges: {}, quote: '', issuer: '', sizes: [] }, now), [universe, screen, now]);
  const filtered = useMemo(() => applyScreen(universe, screen, now), [universe, screen, now]);
  const rows = useMemo(() => sortRows(filtered, sort), [filtered, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(Math.max(0, Number(params.get('seite') ?? 1) - 1), pages - 1);
  const pageRows = useMemo(() => rows.slice(page * PAGE, (page + 1) * PAGE), [rows, page]);
  const maxVolume = useMemo(() => rows.reduce((m, r) => Math.max(m, r.volume ?? 0), 0), [rows]);
  const loading = searching ? found.isLoading : volumes.isLoading || frequent.isLoading || (types.includes('INDEX') && indexes.isLoading);
  const loadingBonds = wantsBonds && bonds.isLoading;
  const error = (searching ? found.error : volumes.error ?? frequent.error) ?? null;

  // Where the rows come from – said once, next to the count.
  const note = useMemo(() => {
    const parts: string[] = [];
    if (searching) {
      const total = found.data?.totalElements ?? 0;
      parts.push(total > SEARCH ? `die ersten ${SEARCH} von ${total.toLocaleString('de-DE')} Suchtreffern – such genauer` : 'Suche über alle Wertpapiere');
    } else {
      parts.push(`aus ${universe.length.toLocaleString('de-DE')} zuletzt gehandelten Wertpapieren${wantsBonds ? ' und laufenden Anleihen' : ''}`);
      parts.push('andere über die Suche');
    }
    if (loadingBonds) parts.push('Anleihen laden …');
    if (needBook) parts.push('Buchwert nur für die 1.000 größten Unternehmen');
    return parts.join(' · ');
  }, [searching, found.data, universe.length, wantsBonds, loadingBonds, needBook]);

  // Own views in the results area: warrants per underlying; buildings as an overview unless filtered.
  const estate = types.length === 1 && types[0] === 'BUILDING' && !searching;
  const estateOverview = estate && (params.get('immo') === 'uebersicht' || (params.get('immo') !== 'liste' && !chips(screen).length && !screen.sort));
  const special = onlyWarrants ? (
    <WarrantMarket searching={searching} found={found.data?.content} />
  ) : estateOverview ? (
    <RealEstateView />
  ) : null;
  const estateSwitch = estate ? (
    <DS.SegmentedControl
      size="sm"
      fullWidth={false}
      aria-label="Immobilien"
      value={estateOverview ? 'uebersicht' : 'liste'}
      onChange={(v) => setParam({ immo: v })}
      options={[
        { value: 'uebersicht', label: 'Übersicht' },
        { value: 'liste', label: 'Liste' },
      ]}
    />
  ) : null;

  // Class overview above the list (scrolls away with it); ?ueb=aus hides it.
  // Phone: only the three figures by default (one compact row); the chart opens with ?ueb=an.
  const kind = special ? null : overviewKind(types);
  const showOverview = isPhone ? true : params.get('ueb') !== 'aus';
  const phoneChart = params.get('ueb') === 'an';
  const overviewEl = kind ? (
    <ClassOverview
      kind={kind}
      rows={filtered}
      now={now}
      loading={loading || ((kind === 'bond' || kind === 'repo') && loadingBonds)}
      onSelectType={(g) => setParam({ art: g, seite: null, sp: null, sort: null, immo: null })}
    />
  ) : null;
  const overview = !overviewEl || !showOverview ? null : isPhone ? <div className={phoneChart ? 'ovw-wrap' : 'ovw-wrap ovw-wrap--figs'}>{overviewEl}</div> : overviewEl;
  const overviewToggle = kind ? (
    isPhone ? (
      <button
        type="button"
        className="ovw-toggle"
        aria-pressed={phoneChart}
        aria-label={phoneChart ? 'Diagramm einklappen' : 'Diagramm zeigen'}
        onClick={() => setParam({ ueb: phoneChart ? null : 'an' })}
      >
        <DS.Icon name="markt" size={18} />
        <span>Diagramm</span>
      </button>
    ) : (
      <DS.Button size="sm" variant="ghost" aria-pressed={showOverview} onClick={() => setParam({ ueb: showOverview ? 'aus' : null })}>
        {showOverview ? 'Diagramm ausblenden' : 'Diagramm zeigen'}
      </DS.Button>
    )
  ) : null;

  const stats = useMinimalStats();
  const trades = useMarketTrades();
  // Names for the ticker: whatever lists are already loaded (the traded lists cover nearly every trade).
  const names = useMemo(() => {
    const out: Record<string, { name: string; type: string }> = {};
    const add = (l?: { securityIdentifier?: string; name?: string; type?: string }) => {
      if (l?.securityIdentifier && l.name) out[l.securityIdentifier] = { name: l.name, type: l.type ?? '' };
    };
    volumes.data?.content.forEach((r) => add(r.listing));
    [frequent.data, found.data].forEach((p) => p?.content.forEach((r) => add(r.listing)));
    for (const r of universe) out[r.asin] = { name: r.name, type: r.type };
    return out;
  }, [volumes.data, frequent.data, found.data, universe]);
  const ticker = useMemo(() => tickerItems(trades.data ?? [], names), [trades.data, names]);

  // Turnover: heatmap of the top 100 (24 h change) or ranking bars of the chosen types.
  const matrix = useTradingMatrix();
  // Tile colour = the same change as in the table and the map (to the previous day); the matrix's own
  // 24 h change only where the movers lists are not loaded yet.
  const changeMap = useMemo(() => changeLookup(changes.data?.winners, changes.data?.losers), [changes.data]);
  const tiles = useMemo(
    () =>
      heatTiles(matrix.data ?? []).map((t) =>
        changeMap ? { ...t, change: changeMap.map.get(t.asin) ?? (changeMap.complete ? 0 : t.change) } : t,
      ),
    [matrix.data, changeMap],
  );
  const ranking = useMemo(
    () =>
      volumeRows(
        (volumes.data?.content ?? []).filter((r) => {
          const g = groupOf(r.listing?.type ?? r.type);
          return !!g && (all || types.includes(g));
        }),
        10,
      ),
    [volumes.data, all, types],
  );
  // Market map: all securities with 24 h volume, independent of the screener filter.
  const allTraded = useMemo(
    () =>
      mergeRows([(volumes.data?.content ?? []).map((r) => fromMarketRow(r as never))], {
        volume: volumeLookup(volumes.data?.content, volumes.data?.totalElements),
        change: changeLookup(changes.data?.winners, changes.data?.losers),
      }),
    [volumes.data, changes.data],
  );
  const mapAll = useMemo(() => marketMap(allTraded, tileArea), [allTraded]);

  const navigate = useNavigate();
  const openPoint = useCallback(
    (p: PlotPoint) => {
      const asin = Array.isArray(p.customdata) ? p.customdata[0] : p.customdata;
      if (typeof asin === 'string' && asin) navigate(href(asin));
    },
    [navigate],
  );
  type Theme = Parameters<typeof heatmapChart>[0];
  const heatFigure = useCallback((t: Theme, w: number) => heatmapChart(t, w, tiles), [tiles]);
  const rankFigure = useCallback((t: Theme, w: number) => volumeChart(t, w, ranking, types.length !== 1), [ranking, types.length]);
  const mapFigure = useCallback((t: Theme, w: number) => marketMapChart(t, w, mapAll), [mapAll]);

  const rawView = params.get('ansicht') ?? 'suche';
  const view = rawView === 'heatmap' ? 'karte' : rawView === 'bewegung' ? 'umsatz' : rawView;
  const chart = params.get('diagramm') === 'liste' || params.get('diagramm') === 'umsatz' ? 'liste' : 'heatmap';
  const typeText = types.length === 1 ? (TYPE_LABEL[types[0]] ?? types[0]) : all ? 'Alle Arten' : types.map((t) => TYPE_LABEL[t] ?? t).join(', ');

  const searchPanel = (
    <DS.Card flush className="panel market__search">
      <Screener
        screen={screen}
        base={base}
        params={params}
        setParam={setParam}
        text={text}
        setText={setText}
        pageRows={pageRows}
        total={loading ? undefined : rows.length}
        sort={sort}
        now={now}
        maxVolume={maxVolume}
        loading={loading}
        error={error}
        note={note}
        isPhone={isPhone}
        special={special}
        estateSwitch={estateSwitch}
        overview={overview}
        overviewToggle={overviewToggle}
        pagination={
          pages > 1 && !special ? (
            <div className="market__pages">
              <DS.Pagination
                page={page + 1}
                pages={pages}
                total={isPhone ? undefined : `${rows.length.toLocaleString('de-DE')} Treffer`}
                onChange={(n) => setParam({ seite: n > 1 ? String(n) : null })}
              />
            </div>
          ) : null
        }
      />
    </DS.Card>
  );

  const turnover = (
    <DS.Card
      className="panel market__turnover"
      title="Umsatz 24 h"
      action={
        <DS.SegmentedControl
          size="sm"
          aria-label="Darstellung"
          value={chart}
          onChange={(v) => setParam({ diagramm: v === 'liste' ? v : null })}
          options={[
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'liste', label: 'Rangliste' },
          ]}
        />
      }
      footer={chart === 'heatmap' ? <HeatLegend note="Top 100 · Fläche nach Umsatz" suffix="zum Vortag" /> : `${typeText} mit dem größten Umsatz in 24 h.`}
    >
      <div className="panel__fill market__chart">
        {chart === 'heatmap' ? (
          matrix.error ? (
            <DS.Banner variant="error">Heatmap nicht geladen: {matrix.error.message}</DS.Banner>
          ) : tiles.length ? (
            <Plot
              aria-label="Heatmap der 100 umsatzstärksten Wertpapiere: Fläche nach Umsatz, Farbe nach Veränderung zum Vortag; eine Kachel öffnet das Wertpapier"
              figure={heatFigure}
              onPointClick={openPoint}
            />
          ) : (
            <DS.Loading rows={6} label="Heatmap wird geladen" />
          )
        ) : volumes.isLoading ? (
          <DS.Loading rows={6} />
        ) : ranking.length ? (
          <Plot aria-label="Größte Umsätze in 24 Stunden; ein Balken öffnet das Wertpapier" figure={rankFigure} onPointClick={openPoint} />
        ) : (
          <DS.EmptyState compact title="Keine Umsätze">In den letzten 24 Stunden wurde hier nichts gehandelt.</DS.EmptyState>
        )}
      </div>
    </DS.Card>
  );

  const map = (
    <DS.Card
      className="panel market__map"
      title="Marktkarte"
      action={
        <span className="market__heat-note">
          {mapAll.filter((n) => n.asin).length.toLocaleString('de-DE')} {isPhone ? 'mit Umsatz' : 'Wertpapiere mit Umsatz in 24 h'}
        </span>
      }
      footer={<HeatLegend note="Fläche nach Umsatz · Gruppe antippen zum Vergrößern" suffix="zum Vortag" />}
    >
      <div className="panel__fill market__chart">
        {volumes.error ? (
          <DS.Banner variant="error">Marktkarte nicht geladen: {volumes.error.message}</DS.Banner>
        ) : mapAll.length ? (
          <Plot
            aria-label="Marktkarte aller in 24 Stunden gehandelten Wertpapiere nach Art: Fläche nach Umsatz, Farbe nach Veränderung zum Vortag; eine Gruppe vergrößert, eine Kachel öffnet das Wertpapier"
            figure={mapFigure}
            onPointClick={openPoint}
          />
        ) : (
          <DS.Loading rows={8} label="Marktkarte wird geladen" />
        )}
      </div>
    </DS.Card>
  );

  const live = (
    <DS.Card flush className="panel">
      {isPhone && stats.data && (
        <div className="market__pulse">
          <DS.MarketPulse
            stats={{
              onlineUsers: stats.data.numberOfOnlineUsers,
              users: stats.data.numberOfUsers,
              companies: stats.data.numberOfCompanies,
              trades24h: stats.data.numberOfTrades24h,
              volume24h: stats.data.tradeVolume24h,
            }}
          />
        </div>
      )}
      <div className="panel__fill scroll market__ticker">
        <DS.LiveTicker items={ticker} title="Letzte Trades" max={30} hrefFor={(i) => href(i.listing.securityIdentifier)} />
      </div>
    </DS.Card>
  );

  const s = stats.data;
  const wideView = view === 'karte' ? 'karte' : 'suche';
  return (
    <div className={`page market${isWide ? ' market--wide' : ''}`} onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Markt"
        meta={
          s && isPhone ? (
            <>
              <span>{s.numberOfTrades24h.toLocaleString('de-DE')} Trades 24 h</span>
              <span>{short(s.tradeVolume24h)} €</span>
              <span className="market__meta-online">{s.numberOfOnlineUsers.toLocaleString('de-DE')} online</span>
            </>
          ) : isPhone ? (
            '\u00a0'
          ) : undefined
        }
        tabs={
          isWide ? (
            <DS.Tabs
              size="sm"
              aria-label="Ansicht"
              value={wideView}
              onChange={(v) => setParam({ ansicht: v === 'karte' ? v : null })}
              items={[
                { value: 'suche', label: 'Wertpapiere' },
                { value: 'karte', label: 'Marktkarte' },
              ]}
            />
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
        <div className={`page__body market__body${wideView === 'karte' ? ' market__body--map' : ''}`}>
          {wideView === 'karte' ? map : searchPanel}
          <div className="page__col market__side">
            {wideView === 'karte' ? null : turnover}
            {live}
          </div>
        </div>
      ) : (
        <div className="page__body market__body">
          <DS.SegmentedControl
            aria-label="Ansicht"
            fullWidth
            value={['suche', 'umsatz', 'karte', 'live'].includes(view) ? view : 'suche'}
            onChange={(v) => setParam({ ansicht: v === 'suche' ? null : v })}
            options={[
              { value: 'suche', label: 'Suche' },
              { value: 'umsatz', label: 'Umsatz' },
              { value: 'karte', label: 'Karte' },
              { value: 'live', label: 'Live' },
            ]}
          />
          {view === 'umsatz' ? turnover : view === 'karte' ? map : view === 'live' ? live : searchPanel}
        </div>
      )}
    </div>
  );
}

/** Colour key of the heatmaps: the same mixes as the tiles (tint + up to 42 % gain/loss), via CSS tokens. */
function HeatLegend({ note, suffix }: { note: string; suffix: string }) {
  const steps: [string, string][] = [
    ['loss', '42%'],
    ['loss', '21%'],
    ['', ''],
    ['gain', '21%'],
    ['gain', '42%'],
  ];
  return (
    <div className="market__legend">
      <span>▼ −10 %</span>
      <span className="market__legend-scale" aria-hidden="true">
        {steps.map(([k, p], i) => (
          <i key={i} style={{ background: k ? `color-mix(in srgb, var(--${k}) ${p}, var(--${k}-tint))` : 'var(--bg-raised)' }} />
        ))}
      </span>
      <span>▲ +10 %</span>
      <span className="market__legend-suffix">{suffix}</span>
      <span className="market__legend-note">{note}</span>
    </div>
  );
}
