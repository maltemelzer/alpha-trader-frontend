import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { DS } from '../ds';
import { useParamState } from '../lib/useParamState';
import { api, ApiError, unwrap } from '../api/client';
import {
  useDailyHistory,
  useEtf,
  useIndexDetails,
  useListingProfile,
  useMe,
  useMyCompanies,
  useOrderbook,
  usePortfolio,
  useSharePositions,
  usePriceSpread,
  useShareholders,
  useTrades,
  useWarrant,
} from '../api/queries';
import { toSpread, type ListingProfile, type OrderCheck } from '../api/types';
import { Plot } from '../charts/Plot';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useTick } from '../lib/useTick';
import { afterRebase, availableAt, change24h, defaultShares, depth, depthNear, holderSlices, recentPrices, window_ } from './derive';
import { assetClass, isTradable, type AssetClass } from './assetClass';
import {
  BondPanel,
  BuildingPanel,
  EtfManagePanel,
  EtfTrackingPanel,
  EtfUnitsPanel,
  IndexMembersPanel,
  IndexMembersView,
  IndexWeightsPanel,
  useBondOf,
} from './ClassPanels';
import { candles, depthChart, holdersBars, priceLine, tradesChart } from './charts';
import { Panel } from './Panel';
import { WarrantPanel, WarrantTabs, WithWarrants } from './WarrantPanels';
import { ratioText, warrantEnd } from './warrants';
import './SecurityPage.css';

type Side = 'BUY' | 'SELL';
/** A click on buy/sell: side, price and the shares available at that price right now. */
type Pick = { side: Side; price?: number; type: 'MARKET' | 'LIMIT'; available?: number };
type Result = { ok: boolean; text: string };
type OrderParams = Parameters<NonNullable<React.ComponentProps<typeof DS.OrderTicket>['onSubmit']>>[0];

const DAY = 86_400_000;

const RANGES = [
  { value: '1T', label: '1T' },
  { value: '14T', label: '14T' },
  { value: 'K', label: 'Kerzen' },
];

/**
 * Securities page – one screen, no page scroll. The frame is the same for every asset class; facts,
 * the analysis panel and the actions follow the class (see assetClass.ts and ClassPanels.tsx):
 * stock/coin → holders · bond/repo → yield · index → weights + members, no trading · ETF → tracking +
 * subscribe/redeem · building → price comparison.
 * Desktop (≥ 1100 px): header · chart · [order book | depth | trades] + holders · order ticket on the right.
 * Tablet: same without the ticket column (ticket opens in a Sheet).
 * Phone: top bar · header · one panel chosen by a segmented control · TradeBar + Sheet.
 */
export function SecurityPage() {
  const { asin = '' } = useParams();
  const isPhone = useIsPhone();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const navigate = useNavigate();
  const onLinkClick = useInternalLinks();

  const profile = useListingProfile(asin);
  const spread = usePriceSpread(asin);
  const etf = useEtf(asin, profile.data?.type === 'ETF');
  const me = useMe();

  const [pick, setPick] = useState<Pick | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<Result | null>(null);
  const openOrder = useCallback(
    (p: Pick) => {
      setPick(p);
      if (!isWide) setSheet(true);
    },
    [isWide],
  );

  if (profile.isPending) return <DS.Loading label="Wertpapier wird geladen" rows={6} />;
  if (profile.isError) {
    const notFound = profile.error instanceof ApiError && profile.error.status === 404;
    return (
      <div className="sec-msg">
        <DS.EmptyState
          title={notFound ? 'Wertpapier nicht gefunden' : 'Wertpapier konnte nicht geladen werden'}
          action={<DS.Button onClick={() => navigate('/markt')}>Zum Markt</DS.Button>}
        >
          {notFound ? `Zur ASIN ${asin} gibt es kein Wertpapier.` : 'Bitte gleich noch einmal versuchen.'}
        </DS.EmptyState>
      </div>
    );
  }

  const p = profile.data;
  const cls = assetClass(p.type);
  const tradable = isTradable(cls);
  const listing = { securityIdentifier: p.securityIdentifier, name: p.name, type: p.type, startDate: p.startDate };
  const sp = toSpread(spread.data ?? p.currentSpread);
  const ch = change24h(p.prices14d);
  const ownsEtf = !!me.data?.username && etf.data?.owner?.username === me.data.username;

  const header = (
    <ClassHeader
      key={asin}
      profile={p}
      cls={cls}
      compact={isPhone}
      sideFacts={isWide}
      listing={listing}
      spread={sp}
      company={p.company ? { ...p.company, logoUrl: p.company.logoUrl ?? undefined } : null}
      change={ch?.pct}
      changeAmount={ch?.abs}
      changeSuffix="24 h"
      onBuy={isPhone || !tradable ? undefined : (price) => openOrder({ side: 'BUY', price, type: 'MARKET', available: spread.data?.askSize })}
      onSell={isPhone || !tradable ? undefined : (price) => openOrder({ side: 'SELL', price, type: 'MARKET', available: spread.data?.bidSize })}
      actions={
        p.company && !isPhone ? (
          <DS.Button variant="ghost" size="sm" onClick={() => navigate(`/unternehmen/${asin}`)}>
            Unternehmen
          </DS.Button>
        ) : undefined
      }
    />
  );

  const ticket = (
    <Ticket
      key={pick ? `${pick.side}${pick.price}${pick.type}${pick.available}` : 'none'}
      profile={p}
      listing={listing}
      spread={sp}
      change={ch?.pct}
      pick={pick}
      onResult={(r) => {
        setToast(r);
        if (r.ok) setSheet(false);
      }}
    />
  );

  const side =
    cls === 'index' ? (
      <IndexSide asin={asin} />
    ) : cls === 'etf' ? (
      <DS.Tabs
        size="sm"
        aria-label="Handeln"
        items={[
          { value: 'handeln', label: 'Börse', content: ticket },
          {
            value: 'anteile',
            label: 'Zeichnen / Zurückgeben',
            content: <EtfUnitsPanel profile={p} onDone={(ok, text) => setToast({ ok, text })} />,
          },
          ...(ownsEtf
            ? [{ value: 'verwalten', label: 'Verwalten', content: <EtfManagePanel profile={p} onDone={(ok, text) => setToast({ ok, text })} /> }]
            : []),
        ]}
      />
    ) : (
      ticket
    );

  const sheetEl = (
    <DS.Sheet
      open={sheet}
      onClose={() => setSheet(false)}
      title={`${pick?.side === 'SELL' ? 'Verkaufen' : 'Kaufen'}: ${p.name}`}
    >
      {sheet && ticket}
    </DS.Sheet>
  );


  const toastEl = toast && (
    <DS.ToastRegion>
      <DS.Toast
        variant={toast.ok ? 'info' : 'error'}
        title={toast.ok ? 'Order aufgegeben' : 'Order fehlgeschlagen'}
        duration={toast.ok ? 5000 : undefined}
        onClose={() => setToast(null)}
      >
        {toast.text}
      </DS.Toast>
    </DS.ToastRegion>
  );

  if (isPhone) {
    return (
      <div className={`sec sec--phone sec--${cls}`} onClick={onLinkClick}>
        <DS.MobileTopBar title={p.name} eyebrow={p.securityIdentifier} onBack={() => navigate(-1)} backText="Zurück" />
        <div className="sec__phone-scroll">
          {header}
          <PhonePanels asin={asin} profile={p} cls={cls} onPick={openOrder} ownsEtf={ownsEtf} />
        </div>
        {sp && tradable && (
          <DS.TradeBar
            listing={listing}
            spread={sp}
            onTrade={(t) =>
              openOrder({ side: t.action, price: t.price, type: 'MARKET', available: t.action === 'BUY' ? spread.data?.askSize : spread.data?.bidSize })
            }
          />
        )}
        {sheetEl}
        {toastEl}
      </div>
    );
  }

  const yieldFirst = cls === 'bond' || cls === 'repo';
  return (
    <div className={`sec sec--${cls}${isWide ? ' sec--wide' : ''}`} onClick={onLinkClick}>
      <div className="sec__head">{header}</div>
      <div className="sec__body">
        <div className="sec__main">
          {/* Bonds and repos: the price hardly moves around 100 %, the yield is the story – it takes the wide slot. */}
          {yieldFirst ? <BondPanel profile={p} /> : <PricePanel asin={asin} profile={p} />}
          <div className="sec__lower">
            {cls === 'index' ? <IndexWeightsPanel asin={asin} /> : <MarketPanel asin={asin} profile={p} onPick={openOrder} />}
            {yieldFirst ? <PricePanel asin={asin} profile={p} /> : <ClassPanel asin={asin} profile={p} cls={cls} />}
          </div>
        </div>
        {isWide && <aside className="sec__ticket">{side}</aside>}
      </div>
      {!isWide && tradable && sheetEl}
      {toastEl}
    </div>
  );
}

// ---------- header facts ----------

type Facts = NonNullable<React.ComponentProps<typeof DS.SecurityHeader>['facts']>;
const pct = (n: number, d = 2) => `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const when = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Key figures in the header, chosen by asset class; at most five, fewer on the phone. */
function useClassFacts(p: ListingProfile, cls: AssetClass, compact: boolean, sideFacts: boolean): Facts {
  const bondInfo = useBondOf(p);
  const index = useIndexDetails(p.securityIdentifier, cls === 'index');
  const warrant = useWarrant(cls === 'warrant' ? p.securityIdentifier : undefined);
  const f: Facts = [];
  const c = p.company;
  switch (cls) {
    case 'bond':
    case 'repo': {
      const b = bondInfo.bond;
      if (b) {
        f.push({ label: 'Zins', value: pct(b.interestRate) });
        f.push({ label: 'Fällig', value: when(b.maturityDate) });
        if (b.issuer) f.push({ label: 'Emittent', value: b.issuer.securityIdentifier ? <a href={`/unternehmen/${b.issuer.securityIdentifier}`}>{b.issuer.name}</a> : b.issuer.name });
        else if (p.type.startsWith('SYSTEM')) f.push({ label: 'Emittent', value: 'Zentralbank' });
        if (!compact) f.push({ label: 'Volumen', value: b.volume });
        if (!compact) f.push({ label: 'Nennwert', value: b.faceValue, compact: false });
      }
      break;
    }
    case 'index': {
      // Wide screens show IndexFacts in the right column; the header repeats nothing.
      const i = sideFacts ? undefined : index.data;
      if (i) {
        f.push({ label: 'Mitglieder', value: (i.members?.length ?? i.membersCount ?? 0).toLocaleString('de-DE') });
        if (i.owner?.username) f.push({ label: 'Betreiber', value: <a href={`/spieler/${encodeURIComponent(i.owner.username)}`}>{i.owner.username}</a> });
        if (!compact && i.baseValue) f.push({ label: 'Basiswert', value: i.baseValue.toLocaleString('de-DE'), compact: false });
        if (!compact && i.nextChainingDate) f.push({ label: 'Nächste Verkettung', value: when(i.nextChainingDate) });
      }
      break;
    }
    case 'etf':
      if (p.outstandingShares != null) f.push({ label: 'Anteile im Umlauf', value: p.outstandingShares.toLocaleString('de-DE') });
      if (p.lastPrice && p.outstandingShares) f.push({ label: 'Fondsvolumen', value: p.lastPrice.value * p.outstandingShares });
      break;
    case 'coin':
      if (p.marketCap) f.push({ label: 'Marktkap.', value: p.marketCap });
      if (p.outstandingShares) f.push({ label: 'Im Umlauf', value: DS.format.compact(p.outstandingShares, 1e6) ?? String(p.outstandingShares) });
      if (!compact) f.push({ label: 'Schürfen', value: <a href="/miner">Miner</a> });
      break;
    case 'warrant': {
      const w = warrant.data;
      if (w) {
        const u = w.underlying;
        if (!compact) f.push({ label: 'Typ', value: w.type === 'PUT' ? 'Put' : 'Call' });
        // Phone: the underlying is linked in the view „Basiswert“ (a link in the facts is too small to tap).
        if (!compact && u?.securityIdentifier) f.push({ label: 'Basiswert', value: <a href={`/wertpapier/${u.securityIdentifier}`}>{u.name}</a> });
        if (w.underlyingValue != null) f.push({ label: 'Referenzkurs', value: w.underlyingValue, compact: false });
        if (w.underlyingCapValue != null) f.push({ label: 'Cap', value: w.underlyingCapValue, compact: false });
        const end = warrantEnd(w);
        if (end) f.push({ label: 'Fällig', value: when(end) });
        else if (!compact && w.ratio != null) f.push({ label: 'Bezugsverhältnis', value: ratioText(w.ratio) });
      }
      break;
    }
    case 'building': {
      const size = p.building?.size;
      if (size) f.push({ label: 'Fläche', value: `${size.toLocaleString('de-DE')} m²` });
      if (size && p.lastPrice) f.push({ label: 'Preis je m²', value: p.lastPrice.value / size });
      if (!compact && p.building?.type) f.push({ label: 'Art', value: p.building.type.startsWith('OFFICE') ? 'Büro' : p.building.type });
      break;
    }
    default:
      if (p.marketCap) f.push({ label: 'Marktkap.', value: p.marketCap });
      if (c?.companyCapabilities?.bookValuePerShare != null)
        f.push({ label: 'Buchwert / Aktie', value: c.companyCapabilities.bookValuePerShare, compact: false });
      if (!compact && c?.companyCapabilities?.netCash != null) f.push({ label: 'Net Cash', value: c.companyCapabilities.netCash });
      if (!compact && c?.ceo)
        f.push({
          label: 'CEO',
          value: <a href={`/spieler/${encodeURIComponent(c.ceo.username)}`}>{c.ceo.username}</a>,
          sub: c.ceoEmploymentAgreement?.dailyWage ? `${DS.format.compact(c.ceoEmploymentAgreement.dailyWage, 1e6) ?? ''} € am Tag` : undefined,
        });
      if (!compact && c?.marketMakerPolicy)
        f.push({ label: 'Market Maker', value: c.marketMakerPolicy === 'OPEN' ? 'offen' : 'geschlossen' });
  }
  return f.slice(0, 5);
}

/** SecurityHeader with the class-specific facts (the facts need queries, hence a component). */
function ClassHeader({
  profile,
  cls,
  compact,
  sideFacts,
  ...rest
}: Omit<React.ComponentProps<typeof DS.SecurityHeader>, 'facts'> & {
  profile: ListingProfile;
  cls: AssetClass;
  compact: boolean;
  sideFacts: boolean;
}) {
  // The last price lights up when a trade moves it (keyed by ASIN, so a new page does not tick).
  const lp = rest.spread?.lastPrice;
  const tick = useTick(typeof lp === 'number' ? lp : lp?.value);
  return (
    <DS.SecurityHeader
      {...rest}
      compact
      className={[rest.className, tick && `tick-price--${tick}`].filter(Boolean).join(' ') || undefined}
      facts={useClassFacts(profile, cls, compact, sideFacts)}
    />
  );
}

/** The panel next to the market panel: what matters most for judging this asset class. */
function ClassPanel({ asin, profile, cls }: { asin: string; profile: ListingProfile; cls: AssetClass }) {
  switch (cls) {
    case 'bond':
    case 'repo':
      return <BondPanel profile={profile} />;
    case 'index':
      return (
        <WithWarrants asin={asin} title="Mitglieder" className="panel--class">
          <IndexMembersView asin={asin} />
        </WithWarrants>
      );
    case 'etf':
      return <EtfTrackingPanel profile={profile} />;
    case 'building':
      return <BuildingPanel profile={profile} />;
    case 'warrant':
      return <WarrantPanel profile={profile} />;
    default:
      return <HoldersPanel asin={asin} />;
  }
}

/** Right column of an index: facts instead of an order ticket – an index is calculated, not traded. */
function IndexSide({ asin }: { asin: string }) {
  const index = useIndexDetails(asin);
  if (!index.data) return <DS.Skeleton variant="block" />;
  return (
    <div className="sec__side">
      <DS.IndexFacts index={index.data} />
      <p className="class__note">
        Ein Index wird aus den Kursen seiner Mitglieder berechnet und nicht gehandelt. Handelbar sind ETFs und Optionsscheine darauf.
      </p>
    </div>
  );
}

// ---------- panels ----------


function PricePanel({ asin, profile, bare = false }: { asin: string; profile: ListingProfile; bare?: boolean }) {
  const [range, setRange] = useParamState('zeitraum', '14T', RANGES);
  const history = useDailyHistory(asin);
  const book = profile.company?.companyCapabilities?.bookValuePerShare;

  // prices14d holds the last ~500 trades – for busy stocks only a few hours. 14 days therefore
  // combine daily closes with the recent trades.
  // Indexes and ETFs start at a base value and are chained later: cut everything before such a jump.
  const rebases = profile.type === 'INDEX' || profile.type === 'ETF';
  const points = useMemo(() => {
    const pts = range === '1T' ? window_(profile.prices14d, DAY) : recentPrices(history.data, profile.prices14d, 14 * DAY);
    return rebases ? afterRebase(pts, (x) => x.value) : pts;
  }, [profile.prices14d, history.data, range, rebases]);
  const days = useMemo(
    () => (rebases ? afterRebase(history.data ?? [], (d) => d.closePrice ?? 0) : (history.data ?? [])),
    [history.data, rebases],
  );
  const rangeChange =
    points.length > 1 && points[0].value ? (points[points.length - 1].value / points[0].value - 1) * 100 : undefined;

  const figure = useCallback(
    (t: Parameters<typeof priceLine>[0], w: number) =>
      range === 'K' ? candles(t, w, days, book, profile.type) : priceLine(t, w, points, book, profile.type),
    [range, days, points, book, profile.type],
  );

  const empty = range === 'K' ? !days.length : points.length < 2;
  return (
    <Panel
      title={bare ? undefined : 'Kursverlauf'}
      className="panel--price"
      action={
        <div className="panel__actions">
          {range !== 'K' && rangeChange !== undefined && (
            <DS.PriceChange value={rangeChange} variant="tag" suffix={rangeLabel(range, points[0].date)} />
          )}
          <DS.SegmentedControl aria-label="Zeitraum" size="sm" fullWidth={false} options={RANGES} value={range} onChange={setRange} />
        </div>
      }
    >
      {empty ? (
        <DS.EmptyState compact title="Noch keine Kurse">In diesem Zeitraum wurde nicht gehandelt.</DS.EmptyState>
      ) : (
        <Plot aria-label={`Kursverlauf ${profile.name}`} figure={figure} />
      )}
    </Panel>
  );
}

/** „24 h“, „14 Tage“ – or „seit 24.9.“ when the data starts later (newly listed). */
function rangeLabel(range: string, first: number) {
  const full = range === '1T' ? DAY : 14 * DAY;
  if (first > Date.now() - full * 0.9)
    return `seit ${new Date(first).toLocaleString('de-DE', range === '1T' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'numeric' })}`;
  return range === '1T' ? '24 h' : '14 Tage';
}

const MARKET_VIEWS = [
  { value: 'book', label: 'Orderbuch' },
  { value: 'depth', label: 'Markttiefe' },
  { value: 'trades', label: 'Trades' },
];

function MarketPanel({ asin, profile, onPick }: { asin: string; profile: ListingProfile; onPick: (p: Pick) => void }) {
  const [view, setView] = useParamState('markt', 'book', MARKET_VIEWS);
  const title = MARKET_VIEWS.find((v) => v.value === view)!.label;
  return (
    <Panel
      title={title}
      className="panel--market"
      action={<DS.SegmentedControl aria-label="Ansicht" size="sm" fullWidth={false} options={MARKET_VIEWS} value={view} onChange={setView} />}
    >
      {view === 'book' && <BookView asin={asin} profile={profile} onPick={onPick} />}
      {view === 'depth' && <DepthView asin={asin} type={profile.type} />}
      {view === 'trades' && <TradesView asin={asin} type={profile.type} />}
    </Panel>
  );
}

function BookView({ asin, profile, onPick }: { asin: string; profile: ListingProfile; onPick: (p: Pick) => void }) {
  const ob = useOrderbook(asin);
  const ref = useRef<HTMLDivElement>(null);
  const loaded = !ob.isPending;
  // Start centred on the spread: best ask above, best bid below.
  useLayoutEffect(() => {
    const box = ref.current;
    const mid = box?.querySelector<HTMLElement>('.bnk-ob__spread');
    if (box && mid) box.scrollTop = mid.offsetTop - box.offsetTop - box.clientHeight / 2 + mid.clientHeight / 2;
  }, [loaded]);
  if (ob.isPending) return <DS.Skeleton variant="rows" />;
  return (
    <div className="scroll" ref={ref}>
      <DS.OrderBook
        listing={{ securityIdentifier: profile.securityIdentifier, name: profile.name, type: profile.type }}
        orderbook={ob.data}
        lastPrice={profile.lastPrice?.value}
        depth={8}
        // A limit at this row also takes every better row: the size is the running total up to it.
        onSelect={(s) => onPick({ side: s.side, price: s.price, type: 'LIMIT', available: availableAt(ob.data, s.side, s.price) || s.numberOfShares })}
      />
    </div>
  );
}

function DepthView({ asin, type }: { asin: string; type?: string }) {
  const ob = useOrderbook(asin);
  const spread = usePriceSpread(asin);
  const mid =
    spread.data?.bidPrice && spread.data?.askPrice ? (spread.data.bidPrice + spread.data.askPrice) / 2 : undefined;
  // Depth within ±50 % of the mid price; the full book is in the Orderbuch view.
  const d = useMemo(() => (mid ? depthNear(depth(ob.data), mid) : depth(ob.data)), [ob.data, mid]);
  const figure = useCallback(
    (t: Parameters<typeof depthChart>[0], w: number) => depthChart(t, w, d, mid, type),
    [d, mid, type],
  );
  if (ob.isPending) return <DS.Skeleton variant="block" />;
  if (!d.bids.price.length && !d.asks.price.length)
    return <DS.EmptyState compact title="Orderbuch leer">Es liegen keine Aufträge vor.</DS.EmptyState>;
  return <Plot aria-label="Markttiefe" figure={figure} />;
}

function TradesView({ asin, type }: { asin: string; type?: string }) {
  const trades = useTrades(asin, 100);
  const figure = useCallback(
    (t: Parameters<typeof tradesChart>[0], w: number) => tradesChart(t, w, trades.data ?? [], type),
    [trades.data, type],
  );
  if (trades.isPending) return <DS.Skeleton variant="block" />;
  if (!trades.data?.length) return <DS.EmptyState compact title="Noch keine Trades" />;
  return <Plot aria-label="Letzte Trades: Kurs über Zeit, Kreisfläche nach Volumen" figure={figure} />;
}

function HoldersPanel({ asin }: { asin: string }) {
  const holders = useShareholders(asin);
  const n = holders.data?.length;
  return (
    <WithWarrants asin={asin} title={n ? `Anteilseigner · ${n.toLocaleString('de-DE')}` : 'Anteilseigner'} tabLabel="Eigner" className="panel--holders">
      <HoldersView asin={asin} />
    </WithWarrants>
  );
}

function HoldersView({ asin }: { asin: string }) {
  const holders = useShareholders(asin);
  const slices = useMemo(() => holderSlices(holders.data), [holders.data]);
  const figure = useCallback(
    (t: Parameters<typeof holdersBars>[0], w: number) => holdersBars(t, w, slices),
    [slices],
  );
  if (holders.isPending) return <DS.Skeleton variant="block" />;
  if (!slices.length) return <DS.EmptyState compact title="Keine Anteilseigner" />;
  return <Plot aria-label="Größte Anteilseigner in Prozent" figure={figure} />;
}

/** Phone: one panel at a time; the class decides which. */
function phoneViews(cls: AssetClass) {
  const price = { value: 'price', label: 'Kurs' };
  switch (cls) {
    case 'index':
      return [price, { value: 'weights', label: 'Gewichtung' }, { value: 'members', label: 'Mitglieder' }];
    case 'bond':
    case 'repo':
      return [{ value: 'yield', label: 'Rendite' }, price, { value: 'book', label: 'Orderbuch' }, { value: 'trades', label: 'Trades' }];
    case 'etf':
      return [price, { value: 'tracking', label: 'vs. Index' }, { value: 'book', label: 'Orderbuch' }, { value: 'units', label: 'Zeichnen' }];
    case 'building':
      return [price, { value: 'compare', label: 'Vergleich' }, { value: 'book', label: 'Orderbuch' }, { value: 'trades', label: 'Trades' }];
    case 'warrant':
      return [price, { value: 'basis', label: 'Basiswert' }, { value: 'book', label: 'Orderbuch' }, { value: 'trades', label: 'Trades' }];
    default:
      return [price, { value: 'book', label: 'Orderbuch' }, { value: 'trades', label: 'Trades' }, { value: 'holders', label: 'Eigner' }];
  }
}

function PhonePanels({
  asin,
  profile,
  cls,
  onPick,
  ownsEtf = false,
}: {
  asin: string;
  profile: ListingProfile;
  cls: AssetClass;
  onPick: (p: Pick) => void;
  ownsEtf?: boolean;
}) {
  const views = phoneViews(cls);
  const [view, setView] = useParamState('ansicht', views[0].value, views);
  const [note, setNote] = useState<Result | null>(null);
  return (
    <div className="sec__phone-panels">
      <DS.SegmentedControl aria-label="Ansicht" size="sm" options={views} value={view} onChange={setView} />
      <div className="sec__phone-panel">
        {view === 'price' && <PricePanel asin={asin} profile={profile} bare />}
        {view === 'book' && <BookView asin={asin} profile={profile} onPick={onPick} />}
        {view === 'trades' && <TradesView asin={asin} type={profile.type} />}
        {view === 'holders' && (
          <WarrantTabs asin={asin} label="Eigner">
            <HoldersView asin={asin} />
          </WarrantTabs>
        )}
        {view === 'yield' && <BondPanel profile={profile} bare />}
        {view === 'weights' && <IndexWeightsPanel asin={asin} bare />}
        {view === 'members' && (
          <WarrantTabs asin={asin} label="Mitglieder">
            <IndexMembersPanel asin={asin} bare />
          </WarrantTabs>
        )}
        {view === 'tracking' && <EtfTrackingPanel profile={profile} bare />}
        {view === 'compare' && <BuildingPanel profile={profile} bare />}
        {view === 'basis' && <WarrantPanel profile={profile} bare />}
        {view === 'units' && (
          <div>
            {ownsEtf ? (
              <DS.Tabs
                size="sm"
                aria-label="Anteile"
                items={[
                  { value: 'anteile', label: 'Zeichnen / Zurückgeben', content: <EtfUnitsPanel profile={profile} onDone={(ok, text) => setNote({ ok, text })} /> },
                  { value: 'verwalten', label: 'Verwalten', content: <EtfManagePanel profile={profile} onDone={(ok, text) => setNote({ ok, text })} /> },
                ]}
              />
            ) : (
              <EtfUnitsPanel profile={profile} onDone={(ok, text) => setNote({ ok, text })} />
            )}
            {note && <DS.Banner variant={note.ok ? 'info' : 'error'}>{note.text}</DS.Banner>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- order ticket ----------

function Ticket({
  profile,
  listing,
  spread,
  change,
  pick,
  onResult,
}: {
  profile: ListingProfile;
  listing: React.ComponentProps<typeof DS.OrderTicket>['listing'];
  spread: React.ComponentProps<typeof DS.OrderTicket>['spread'];
  change?: number;
  pick: Pick | null;
  onResult: (r: Result) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useMe();
  const portfolio = usePortfolio();
  const companies = useMyCompanies(me.data?.id);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const accounts = [
    ...(portfolio.data
      ? [{ id: portfolio.data.securitiesAccountId, name: 'Mein Portfolio', privateAccount: true, cash: portfolio.data.cash }]
      : []),
    ...(companies.data ?? []).map((c) => ({ id: c.securitiesAccountId!, name: c.name!, cash: c.bankAccount?.cash })),
  ];
  const privateSelected = !accountId || accountId === portfolio.data?.securitiesAccountId;
  const privatePos = privateSelected
    ? portfolio.data?.positions.find((x) => x.securityIdentifier === profile.securityIdentifier)
    : undefined;
  // Company accounts: /api/v2/sharepositions lists this security in all my accounts (without the shares in orders).
  const empire = useSharePositions(companies.data?.length ? profile.securityIdentifier : undefined);
  const companyPos = privateSelected ? undefined : empire.data?.find((x) => x.securitiesAccount?.id === accountId);
  const pos = privatePos
    ? { numberOfShares: privatePos.numberOfShares - privatePos.committedShares, averageBuyingPrice: privatePos.averageBuyingPrice }
    : companyPos?.numberOfShares
      ? { numberOfShares: companyPos.numberOfShares, averageBuyingPrice: companyPos.averageBuyingPrice }
      : undefined;
  const account = accounts.find((a) => a.id === (accountId ?? accounts[0]?.id));
  const shares = pick
    ? defaultShares(pick.available, pick.side, pick.price, account?.cash, pos?.numberOfShares, profile.bond?.faceValue)
    : undefined;

  const onCheck = async (params: OrderParams) => {
    const check = await unwrap<OrderCheck>(
      api.GET('/api/securityorders/check', {
        params: {
          query: {
            owner: params.owner,
            securityIdentifier: params.securityIdentifier,
            action: params.action,
            type: params.type,
            price: params.price,
            numberOfShares: params.numberOfShares,
          },
        },
      }),
    );
    return { ...check, spread: toSpread(check.spread) };
  };

  const onSubmit = async (params: OrderParams) => {
    setSending(true);
    try {
      await unwrap(
        api.POST('/api/securityorders', {
          params: {
            query: {
              ...params,
              checkOrderOnly: false,
            },
          },
        }),
      );
      onResult({ ok: true, text: `${params.action === 'BUY' ? 'Kauf' : 'Verkauf'}order über ${params.numberOfShares.toLocaleString('de-DE')} Anteile aufgegeben.` });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['orderbook', profile.securityIdentifier] });
      qc.invalidateQueries({ queryKey: ['pricespread', profile.securityIdentifier] });
    } catch (e) {
      onResult({ ok: false, text: e instanceof Error ? e.message : 'Order konnte nicht aufgegeben werden.' });
    } finally {
      setSending(false);
    }
  };

  if (!accounts.length) return <DS.Skeleton variant="block" />;
  return (
    <>
      <DS.OrderTicket
        listing={listing}
        spread={spread}
        change={change}
        changeSuffix="24 h"
        accounts={accounts}
        accountId={accountId ?? accounts[0].id}
        onAccountChange={setAccountId}
        position={pos}
        faceValue={profile.bond?.faceValue}
        premium={!!me.data?.userCapabilities?.premium}
        defaultAction={pick?.side ?? 'BUY'}
        defaultType={pick?.type ?? 'MARKET'}
        defaultPrice={pick?.type === 'LIMIT' ? pick.price : undefined}
        defaultShares={shares}
        onCheck={onCheck}
        onSubmit={onSubmit}
        loading={sending}
      />
      <DS.Button
        variant="ghost"
        size="sm"
        fullWidth
        className="sec__otc"
        onClick={() => navigate(`/orders?ansicht=otc&neu=${profile.securityIdentifier}`)}
      >
        Außerbörslich (OTC) an einen Spieler …
      </DS.Button>
    </>
  );
}
