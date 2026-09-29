import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useAllPriceChanges,
  useBiggestTradedAll,
  useBond,
  useBondList,
  useIndexes,
  useIssuerProfiles,
  useMarketTrades,
  useMinimalStats,
  useMostTraded,
  useSpreadSearch,
  useTopBookValues,
} from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { short } from '../lib/format';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useNow } from '../lib/useNow';
import { useUrlSearch } from '../lib/useUrlSearch';
import { marketMapChart } from './charts';
import { tickerItems, tileArea } from './derive';
import {
  applyScreen,
  bookLookup,
  changeLookup,
  chips,
  coverageLookup,
  defaultSort,
  fromBonds,
  fromMarketRow,
  issuerIds,
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
 * columns – all in the URL) over the full width, its class overview (a turnover heatmap for shares and
 * several classes) on top; the „Marktkarte“ tab shows all securities traded in 24 h grouped by type.
 * Phone: one view at a time.
 *
 * Views: ?ansicht=suche|karte (wide tabs) plus live on the phone; old `heatmap` → karte, old
 * `umsatz`/`bewegung` (the removed turnover card) → suche.
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
  const volumes = useBiggestTradedAll(UNIVERSE);
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
  // Coverage: one company profile per bond issuer, only while the column, filter or sort asks for it.
  const needCoverage = wantsBonds && (!!screen.ranges.deck || cols.includes('deck') || screen.sort?.key === 'deck');
  const issuers = useMemo(() => {
    const bondList = [...(asinBond.data ? [asinBond.data] : []), ...(bonds.data ?? [])];
    return issuerIds(fromBonds(bondList, now));
  }, [asinBond.data, bonds.data, now]);
  const profiles = useIssuerProfiles(issuers, needCoverage);

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
      coverage: needCoverage ? coverageLookup(profiles.data, now) : null,
    });
  }, [searching, q, found.data, volumes.data, frequent.data, bonds.data, asinBond.data, indexes.data, changes.data, book.data, needCoverage, profiles.data, now]);

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
    if (needCoverage && profiles.pending)
      parts.push(`Deckung lädt (${(profiles.total - profiles.pending).toLocaleString('de-DE')} von ${profiles.total.toLocaleString('de-DE')} Emittenten)`);
    return parts.join(' · ');
  }, [searching, found.data, universe.length, wantsBonds, loadingBonds, needBook, needCoverage, profiles.pending, profiles.total]);

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
      <DS.Button
        size="sm"
        variant="ghost"
        className="market__ovw-btn"
        aria-pressed={showOverview}
        title={showOverview ? 'Diagramm ausblenden' : 'Diagramm zeigen'}
        onClick={() => setParam({ ueb: showOverview ? 'aus' : null })}
      >
        <DS.Icon name="markt" size={16} />
        Diagramm
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
  type Theme = Parameters<typeof marketMapChart>[0];
  const mapFigure = useCallback((t: Theme, w: number) => marketMapChart(t, w, mapAll), [mapAll]);

  const rawView = params.get('ansicht') ?? 'suche';
  const view = rawView === 'heatmap' ? 'karte' : rawView;

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
            <DS.Pagination
              page={page + 1}
              pages={pages}
              total={isPhone ? undefined : `${rows.length.toLocaleString('de-DE')} Treffer`}
              onChange={(n) => setParam({ seite: n > 1 ? String(n) : null })}
            />
          ) : null
        }
      />
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
  // One quiet line instead of five big figures: what the whole market did in 24 h, who is online.
  const pulse = (
    <p className="market__pulse-line" aria-label="Markt in 24 Stunden">
      {s ? (
        <>
          <span>
            <b>{s.numberOfTrades24h.toLocaleString('de-DE')}</b> Trades 24 h
          </span>
          <span>
            <b>{short(s.tradeVolume24h)}{'\u00a0'}€</b> Umsatz
          </span>
          <span>
            <b>{s.numberOfOnlineUsers.toLocaleString('de-DE')}</b> online
          </span>
        </>
      ) : (
        '\u00a0'
      )}
    </p>
  );
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
            <div className="market__top">
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
              {pulse}
            </div>
          ) : undefined
        }
        aside={!isWide && !isPhone ? pulse : undefined}
      />
      {isWide ? (
        // The live trades run in the tape under the header – no second ticker here.
        <div className="page__body market__body">
          {wideView === 'karte' ? map : searchPanel}
        </div>
      ) : (
        <div className="page__body market__body">
          <DS.SegmentedControl
            aria-label="Ansicht"
            fullWidth
            value={['suche', 'karte', 'live'].includes(view) ? view : 'suche'}
            onChange={(v) => setParam({ ansicht: v === 'suche' ? null : v })}
            options={[
              { value: 'suche', label: 'Suche' },
              { value: 'karte', label: 'Karte' },
              { value: 'live', label: 'Live' },
            ]}
          />
          {view === 'karte' ? map : view === 'live' ? live : searchPanel}
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
