import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { DS } from '../ds';
import { api, ApiError, unwrap } from '../api/client';
import {
  useDailyHistory,
  useListingProfile,
  useMe,
  useMyCompanies,
  useOrderbook,
  usePortfolio,
  usePriceSpread,
  useShareholders,
  useTrades,
} from '../api/queries';
import { toSpread, type ListingProfile, type OrderCheck } from '../api/types';
import { Plot } from '../charts/Plot';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useInternalLinks } from '../lib/useInternalLinks';
import { change24h, depth, depthNear, holderSlices, recentPrices, window_ } from './derive';
import { candles, depthChart, holdersBars, priceLine, tradesChart } from './charts';
import './SecurityPage.css';

type Side = 'BUY' | 'SELL';
type Pick = { side: Side; price?: number; type: 'MARKET' | 'LIMIT' };
type Result = { ok: boolean; text: string };
type OrderParams = Parameters<NonNullable<React.ComponentProps<typeof DS.OrderTicket>['onSubmit']>>[0];

const DAY = 86_400_000;

/** A view choice kept in the URL (?key=value), so views can be linked and reloaded. */
function useParamState(key: string, fallback: string, allowed: { value: string }[]) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = allowed.some((o) => o.value === raw) ? raw! : fallback;
  const set = useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === fallback) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  return [value, set] as const;
}
const RANGES = [
  { value: '1T', label: '1T' },
  { value: '14T', label: '14T' },
  { value: 'K', label: 'Kerzen' },
];

/**
 * Securities page – one screen, no page scroll.
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
  const listing = { securityIdentifier: p.securityIdentifier, name: p.name, type: p.type, startDate: p.startDate };
  const sp = toSpread(spread.data ?? p.currentSpread);
  const ch = change24h(p.prices14d);

  const header = (
    <DS.SecurityHeader
      listing={listing}
      spread={sp}
      company={p.company ? { ...p.company, logoUrl: p.company.logoUrl ?? undefined } : null}
      change={ch?.pct}
      changeAmount={ch?.abs}
      changeSuffix="24 h"
      facts={facts(p, isPhone)}
      onBuy={isPhone ? undefined : (price) => openOrder({ side: 'BUY', price, type: 'MARKET' })}
      onSell={isPhone ? undefined : (price) => openOrder({ side: 'SELL', price, type: 'MARKET' })}
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
      key={pick ? `${pick.side}${pick.price}${pick.type}` : 'none'}
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
      <div className="sec sec--phone" onClick={onLinkClick}>
        <DS.MobileTopBar title={p.name} eyebrow={p.securityIdentifier} onBack={() => navigate(-1)} backText="Zurück" />
        <div className="sec__phone-scroll">
          {header}
          <PhonePanels asin={asin} profile={p} onPick={openOrder} />
        </div>
        {sp && (
          <DS.TradeBar
            listing={listing}
            spread={sp}
            onTrade={(t) => openOrder({ side: t.action, price: t.price, type: 'MARKET' })}
          />
        )}
        {sheetEl}
        {toastEl}
      </div>
    );
  }

  return (
    <div className={`sec${isWide ? ' sec--wide' : ''}`} onClick={onLinkClick}>
      <div className="sec__head">{header}</div>
      <div className="sec__body">
        <div className="sec__main">
          <PricePanel asin={asin} profile={p} />
          <div className="sec__lower">
            <MarketPanel asin={asin} profile={p} onPick={openOrder} />
            <HoldersPanel asin={asin} />
          </div>
        </div>
        {isWide && <aside className="sec__ticket">{ticket}</aside>}
      </div>
      {!isWide && sheetEl}
      {toastEl}
    </div>
  );
}

// ---------- header facts ----------

function facts(p: ListingProfile, compact: boolean) {
  const c = p.company;
  const f: React.ComponentProps<typeof DS.SecurityHeader>['facts'] = [];
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
  return f.slice(0, 5);
}

// ---------- panels ----------

function Panel({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <DS.Card title={title} titleAs="h2" action={action} flush className={`panel ${className}`}>
      <div className="panel__fill">{children}</div>
    </DS.Card>
  );
}

function PricePanel({ asin, profile, bare = false }: { asin: string; profile: ListingProfile; bare?: boolean }) {
  const [range, setRange] = useParamState('zeitraum', '14T', RANGES);
  const history = useDailyHistory(asin);
  const book = profile.company?.companyCapabilities?.bookValuePerShare;

  // prices14d holds the last ~500 trades – for busy stocks only a few hours. 14 days therefore
  // combine daily closes with the recent trades.
  const points = useMemo(
    () => (range === '1T' ? window_(profile.prices14d, DAY) : recentPrices(history.data, profile.prices14d, 14 * DAY)),
    [profile.prices14d, history.data, range],
  );
  const rangeChange =
    points.length > 1 && points[0].value ? (points[points.length - 1].value / points[0].value - 1) * 100 : undefined;

  const figure = useCallback(
    (t: Parameters<typeof priceLine>[0], w: number) =>
      range === 'K' ? candles(t, w, history.data ?? [], book, profile.type) : priceLine(t, w, points, book, profile.type),
    [range, history.data, points, book, profile.type],
  );

  const empty = range === 'K' ? !history.data?.length : points.length < 2;
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
        onSelect={(s) => onPick({ side: s.side, price: s.price, type: 'LIMIT' })}
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
    <Panel title={n ? `Anteilseigner · ${n.toLocaleString('de-DE')}` : 'Anteilseigner'} className="panel--holders">
      <HoldersView asin={asin} />
    </Panel>
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

const PHONE_VIEWS = [
  { value: 'price', label: 'Kurs' },
  { value: 'book', label: 'Orderbuch' },
  { value: 'trades', label: 'Trades' },
  { value: 'holders', label: 'Eigner' },
];

function PhonePanels({ asin, profile, onPick }: { asin: string; profile: ListingProfile; onPick: (p: Pick) => void }) {
  const [view, setView] = useParamState('ansicht', 'price', PHONE_VIEWS);
  return (
    <div className="sec__phone-panels">
      <DS.SegmentedControl aria-label="Ansicht" size="sm" options={PHONE_VIEWS} value={view} onChange={setView} />
      <div className="sec__phone-panel">
        {view === 'price' && <PricePanel asin={asin} profile={profile} bare />}
        {view === 'book' && <BookView asin={asin} profile={profile} onPick={onPick} />}
        {view === 'trades' && <TradesView asin={asin} type={profile.type} />}
        {view === 'holders' && <HoldersView asin={asin} />}
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
  const pos = privateSelected
    ? portfolio.data?.positions.find((x) => x.securityIdentifier === profile.securityIdentifier)
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
    <DS.OrderTicket
      listing={listing}
      spread={spread}
      change={change}
      changeSuffix="24 h"
      accounts={accounts}
      accountId={accountId ?? accounts[0].id}
      onAccountChange={setAccountId}
      position={pos ? { numberOfShares: pos.numberOfShares - pos.committedShares, averageBuyingPrice: pos.averageBuyingPrice } : undefined}
      faceValue={profile.bond?.faceValue}
      premium={!!me.data?.userCapabilities?.premium}
      defaultAction={pick?.side ?? 'BUY'}
      defaultType={pick?.type ?? 'MARKET'}
      defaultPrice={pick?.type === 'LIMIT' ? pick.price : undefined}
      onCheck={onCheck}
      onSubmit={onSubmit}
      loading={sending}
    />
  );
}
