import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
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
import { useIsPhone } from '../lib/useMediaQuery';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useTick } from '../lib/useTick';
import { afterRebase, availableAt, change24h, defaultShares, depth, depthNear, holderSlices, limitPrice, recentPrices, window_ } from './derive';
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
import { WarrantPanel, WarrantsOnView, useWarrantsOf, WithWarrants } from './WarrantPanels';
import { WarrantScenarioPanel } from './WarrantScenario';
import { readTicketDraft, type Draft } from './payoff';
import { parseDe } from '../lib/format';
import { ratioText, warrantEnd } from './warrants';
import { QuotePanel } from '../companies/QuotePanel';
import type { Sponsorship } from '../companies/derive';
import { useCompanyByAsin, useCompanyPolls } from '../api/queries';
import { PageNav, usePageView, type PageView } from '../app/pagenav';
import { CompanyView } from '../companies/CompanyViews';
import { companyHref, stockAliases, stockFallback, stockViews } from '../companies/views';
import './SecurityPage.css';

type Side = 'BUY' | 'SELL';
/** A click on buy/sell: side, price and the shares available at that price right now. */
type Pick = { side: Side; price?: number; type: 'MARKET' | 'LIMIT'; available?: number };
type Result = { ok: boolean; text: string; title?: string };
type OrderParams = Parameters<NonNullable<React.ComponentProps<typeof DS.OrderTicket>['onSubmit']>>[0];

const DAY = 86_400_000;

const RANGES = [
  { value: '1T', label: '1T' },
  { value: '14T', label: '14T' },
  { value: 'K', label: 'Kerzen' },
];

/** A listing the player's company sponsors: ?handel=quote opens the market maker quote. */
const HANDEL = [{ value: 'boerse' }, { value: 'quote' }];

/**
 * Securities page – one screen, no page scroll. The frame is the same for every asset class; facts,
 * the analysis panel and the actions follow the class (see assetClass.ts and ClassPanels.tsx):
 * stock/coin → holders · bond/repo → yield · index → weights + members, no trading · ETF → tracking +
 * subscribe/redeem · building → price comparison.
 * Desktop/tablet: header · chart · [order book | depth | trades] + holders. The order ticket opens on demand as a
 * dialog (buy/sell in the header, a row of the order book) – the charts keep the whole width.
 * Phone: top bar · header · one panel chosen by a segmented control · TradeBar + Sheet.
 *
 * A stock is also its company: one page with tabs (companies/views.ts) – „Handel“ (the layout above) and the company
 * views (Überblick, Zahlen, Presse, …) in the same cell; the ticket column stays. /unternehmen/:asin redirects here.
 */
export function SecurityPage() {
  const { asin = '' } = useParams();
  const isPhone = useIsPhone();
  const navigate = useNavigate();
  const onLinkClick = useInternalLinks();

  const profile = useListingProfile(asin);
  const spread = usePriceSpread(asin);
  const etf = useEtf(asin, profile.data?.type === 'ETF');
  const me = useMe();
  const myCompanies = useMyCompanies(me.data?.id);
  const [handel, setHandel] = useParamState('handel', 'boerse', HANDEL);
  // Stock → company views as tabs of this page (the listing profile carries the company).
  const company = profile.data?.type === 'STOCK' ? profile.data.company : null;
  const viewOpts = useMemo(() => ({ bank: !!company?.companyCapabilities?.bank, ceo: !!company?.ceo?.myUser }), [company?.companyCapabilities?.bank, company?.ceo?.myUser]);
  const allViews = useMemo<PageView[]>(() => stockViews(viewOpts, isPhone), [viewOpts, isPhone]);
  const [view, setView, shownViews] = usePageView(allViews, stockFallback(isPhone), { aliases: stockAliases(isPhone) });

  const [pick, setPick] = useState<Pick | null>(null);
  // The order ticket opens on demand (dialog, phone: sheet) – no column is reserved for it.
  const [sheet, setSheet] = useState(false);
  // ETF: the dialog also subscribes/redeems units (and lets the owner manage the fund).
  const [etfTab, setEtfTab] = useState('handeln');
  // Phone: facts and actions that do not fit the screen (company, quote, OTC, all key figures).
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<Result | null>(null);
  // Warrants: what the player types in the ticket (number, buy limit) feeds the „Wenn … dann …“ scenario.
  const [draft, setDraft] = useState<Draft>({});
  const onDraft = useCallback(
    (d: Draft) => setDraft((prev) => (prev.shares === d.shares && prev.limit === d.limit ? prev : d)),
    [],
  );
  const openOrder = useCallback((p: Pick) => {
    setPick(p);
    setEtfTab('handeln');
    setSheet(true);
  }, []);

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
  // A company the player runs is designated sponsor of this listing: it may quote here.
  const mine = myCompanies.data ?? [];
  const sponsoring = ((p as ListingProfile & { designatedSponsors?: Sponsorship[] }).designatedSponsors ?? []).find((s) =>
    mine.some((c) => c.id === s.designatedSponsor.id),
  );
  const sponsorAccount = sponsoring
    ? (sponsoring.designatedSponsor.securitiesAccountId ?? mine.find((c) => c.id === sponsoring.designatedSponsor.id)?.securitiesAccountId)
    : undefined;

  const header = (
    <ClassHeader
      key={asin}
      profile={p}
      cls={cls}
      compact={isPhone}
      listing={listing}
      spread={sp}
      company={p.company ? { ...p.company, logoUrl: p.company.logoUrl ?? undefined } : null}
      change={ch?.pct}
      changeAmount={ch?.abs}
      changeSuffix="24 h"
      tradeWithoutQuote
      onBuy={isPhone || !tradable ? undefined : () => openOrder({ side: 'BUY', price: limitPrice('BUY', sp), type: 'LIMIT', available: spread.data?.askSize })}
      onSell={isPhone || !tradable ? undefined : () => openOrder({ side: 'SELL', price: limitPrice('SELL', sp), type: 'LIMIT', available: spread.data?.bidSize })}
      actions={
        isPhone ? undefined : cls === 'etf' ? (
          <DS.Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEtfTab('anteile');
              setSheet(true);
            }}
          >
            Zeichnen / Zurückgeben
          </DS.Button>
        ) : sponsoring ? (
          <DS.Button variant="ghost" size="sm" onClick={() => setHandel('quote')}>
            Market Maker
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
      onDraft={cls === 'warrant' ? onDraft : undefined}
      onResult={(r) => {
        setToast(r);
        if (r.ok) setSheet(false);
      }}
    />
  );

  const dialogBody =
    cls === 'etf' ? (
      <DS.Tabs
        size="sm"
        aria-label="Handeln"
        value={etfTab}
        onChange={setEtfTab}
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

  const orderTitle = cls === 'etf' && etfTab !== 'handeln' ? p.name : `${pick?.side === 'SELL' ? 'Verkaufen' : 'Kaufen'}: ${p.name}`;
  const sheetEl = (
    <OrderDialog open={sheet} onClose={() => setSheet(false)} title={orderTitle} phone={isPhone}>
      {sheet && (isPhone ? ticket : dialogBody)}
    </OrderDialog>
  );
  // A company the player runs sponsors this listing: its market maker quote, on demand like the ticket (?handel=quote).
  const quoteEl = sponsoring && (
    <OrderDialog open={handel === 'quote'} onClose={() => setHandel('boerse')} title={`Market Maker: ${p.name}`} phone={isPhone}>
      {handel === 'quote' && <QuotePanel compact sponsorship={sponsoring} owner={sponsorAccount} onDone={(text) => setToast({ ok: true, text })} />}
    </OrderDialog>
  );


  const toastEl = toast && (
    <DS.ToastRegion>
      <DS.Toast
        variant={toast.ok ? 'info' : 'error'}
        title={toast.title ?? (toast.ok ? 'Order aufgegeben' : 'Order fehlgeschlagen')}
        duration={toast.ok ? 5000 : undefined}
        onClose={() => setToast(null)}
      >
        {toast.text}
      </DS.Toast>
    </DS.ToastRegion>
  );

  const companyView = company && (
    <StockCompanyView view={view} fallback={stockFallback(isPhone)} asin={asin} onDone={(text) => setToast({ ok: true, text, title: company.name })} />
  );

  if (isPhone) {
    const hasBar = !!sp && tradable;
    return (
      <div className={`sec sec--phone sec--${cls}${hasBar ? '' : ' sec--nobar'}`} onClick={onLinkClick}>
        <DS.MobileTopBar
          title={p.name}
          eyebrow={p.securityIdentifier}
          onBack={() => navigate(-1)}
          backText="Zurück"
          actions={[
            {
              icon: (
                <span className="sec__more-icon" aria-hidden="true">
                  ⋯
                </span>
              ),
              label: 'Mehr: Kennzahlen und Aktionen',
              pressed: more,
              onClick: () => setMore(true),
            },
          ]}
        />
        <div className="sec__phone-scroll">
          {header}
          <PhonePanels
            asin={asin}
            profile={p}
            cls={cls}
            onPick={openOrder}
            ownsEtf={ownsEtf}
            draft={draft}
            company={company ? { views: shownViews, view, other: companyView } : undefined}
          />
        </div>
        <DS.Sheet open={more} onClose={() => setMore(false)} title={p.name}>
          {more && (
            <PhoneMore
              profile={p}
              cls={cls}
              tradable={tradable}
              canQuote={!!sponsoring}
              canMove={!!myCompanies.data?.length}
              onClose={() => setMore(false)}
              onQuote={() => {
                setMore(false);
                setHandel('quote');
              }}
            />
          )}
        </DS.Sheet>
        {quoteEl}
        {hasBar && (
          <DS.TradeBar
            listing={listing}
            spread={sp}
            tradeWithoutQuote
            onTrade={(t) =>
              openOrder({
                side: t.action,
                price: limitPrice(t.action, sp),
                type: 'LIMIT',
                available: t.action === 'BUY' ? spread.data?.askSize : spread.data?.bidSize,
              })
            }
          />
        )}
        {sheetEl}
        {toastEl}
      </div>
    );
  }

  const yieldFirst = cls === 'bond' || cls === 'repo';
  const trading = !company || view === 'handel';
  return (
    <div className={`sec sec--${cls}`} onClick={onLinkClick}>
      <div className="sec__head">
        {header}
        {company && <PageNav label="Ansicht" views={shownViews} view={view} onView={setView} />}
      </div>
      <div className="sec__body">
        {trading ? (
        <div className="sec__main">
          {/* Bonds and repos: the price hardly moves around 100 %, the yield is the story – it takes the wide slot. */}
          {yieldFirst ? (
            <BondPanel profile={p} />
          ) : cls === 'warrant' ? (
            // A warrant hardly trades – its own price line is empty; the payoff at maturity is the story.
            <WarrantScenarioPanel profile={p} draft={draft} />
          ) : (
            <PricePanel asin={asin} profile={p} />
          )}
          <div className="sec__lower">
            {cls === 'index' ? <IndexWeightsPanel asin={asin} /> : <MarketPanel asin={asin} profile={p} onPick={openOrder} />}
            {yieldFirst ? <PricePanel asin={asin} profile={p} /> : <ClassPanel asin={asin} profile={p} cls={cls} />}
          </div>
        </div>
        ) : (
          <div className="sec__main sec__main--one">{companyView}</div>
        )}
      </div>
      {tradable && sheetEl}
      {quoteEl}
      {toastEl}
    </div>
  );
}

// ---------- header facts ----------

type Facts = NonNullable<React.ComponentProps<typeof DS.SecurityHeader>['facts']>;
const pct = (n: number, d = 2) => `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const when = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Key figures in the header, chosen by asset class; at most five, three on the phone (one row). */
function useClassFacts(p: ListingProfile, cls: AssetClass, compact: boolean, limit = compact ? 3 : 5): Facts {
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
        if (b.issuer) f.push({ label: 'Emittent', value: b.issuer.securityIdentifier ? <a href={companyHref(b.issuer.securityIdentifier)}>{b.issuer.name}</a> : b.issuer.name });
        else if (p.type.startsWith('SYSTEM')) f.push({ label: 'Emittent', value: 'Zentralbank' });
        if (!compact) f.push({ label: 'Volumen', value: b.volume });
        if (!compact) f.push({ label: 'Nennwert', value: b.faceValue, compact: false });
      }
      break;
    }
    case 'index': {
      const i = index.data;
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
        // Desktop header: only when there is room (no maturity); the phone „⋯“ sheet shows all.
        if (!compact && w.ratio != null) f.push({ label: 'Bezugsverhältnis', value: ratioText(w.ratio) });
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
  return f.slice(0, limit);
}

/** SecurityHeader with the class-specific facts (the facts need queries, hence a component). */
function ClassHeader({
  profile,
  cls,
  compact,
  ...rest
}: Omit<React.ComponentProps<typeof DS.SecurityHeader>, 'facts'> & {
  profile: ListingProfile;
  cls: AssetClass;
  compact: boolean;
}) {
  // The last price lights up when a trade moves it (keyed by ASIN, so a new page does not tick).
  const lp = rest.spread?.lastPrice;
  const tick = useTick(typeof lp === 'number' ? lp : lp?.value);
  return (
    <DS.SecurityHeader
      {...rest}
      compact
      className={[rest.className, tick && `tick-price--${tick}`].filter(Boolean).join(' ') || undefined}
      facts={useClassFacts(profile, cls, compact)}
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

/**
 * Phone: one panel at a time, at most four views per class. The market (order book, depth, trades)
 * is one view with its own small switch in the card head – like the desktop card. Warrants on a
 * stock, coin or index are a view of their own (not a second switch inside „Eigner“).
 */
function phoneViews(cls: AssetClass) {
  const price = { value: 'price', label: 'Kurs' };
  const market = { value: 'markt', label: 'Markt' };
  const warrants = { value: 'scheine', label: 'Scheine' };
  switch (cls) {
    case 'index':
      return [price, { value: 'weights', label: 'Gewichte' }, { value: 'members', label: 'Mitglieder' }, warrants];
    case 'bond':
    case 'repo':
      return [{ value: 'yield', label: 'Rendite' }, price, market];
    case 'etf':
      return [price, { value: 'tracking', label: 'vs. Index' }, market, { value: 'units', label: 'Zeichnen' }];
    case 'building':
      return [price, { value: 'compare', label: 'Vergleich' }, market];
    case 'warrant':
      return [{ value: 'szenario', label: 'Szenario' }, { value: 'basis', label: 'Basiswert' }, market];
    default:
      return [price, market, { value: 'holders', label: 'Eigner' }, warrants];
  }
}

/** The phone views of a stock that belong to trading – every other view is a company view. */
const TRADING_VIEWS = new Set(['price', 'markt', 'holders', 'scheine']);

/** Old phone links (?ansicht=book|trades, ?karte=scheine) still open the right view. */
const LEGACY_MARKET = new Set(['book', 'depth', 'trades']);

function PhonePanels({
  asin,
  profile,
  cls,
  onPick,
  ownsEtf = false,
  draft,
  company,
}: {
  asin: string;
  profile: ListingProfile;
  cls: AssetClass;
  onPick: (p: Pick) => void;
  ownsEtf?: boolean;
  draft?: Draft;
  /** a stock: the company views follow the trading views (one row of scrolling tabs with ☰); `other` shows them */
  company?: { views: PageView[]; view: string; other: React.ReactNode };
}) {
  const views = company ? company.views : phoneViews(cls);
  const [params, setParams] = useSearchParams();
  const raw = params.get('ansicht');
  const legacyMarket = raw != null && LEGACY_MARKET.has(raw);
  // ?karte=scheine is the desktop card switch (and the old phone switch under „Eigner“/„Mitglieder“).
  const legacyWarrants =
    params.get('karte') === 'scheine' && views.some((v) => v.value === 'scheine') && (raw == null || raw === 'holders' || raw === 'members');
  const view = legacyMarket
    ? 'markt'
    : legacyWarrants
      ? 'scheine'
      : company
        ? company.view
        : views.some((v) => v.value === raw)
          ? raw!
          : views[0].value;
  const marketParam = params.get('markt');
  const market = MARKET_VIEWS.some((v) => v.value === marketParam) ? marketParam! : legacyMarket ? raw! : 'book';
  // One call per interaction (see CLAUDE.md): view, market sub-view and the old card switch together.
  const go = useCallback(
    (v: string, m?: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === views[0].value) next.delete('ansicht');
          else next.set('ansicht', v);
          next.delete('karte');
          if (m) {
            if (m === 'book') next.delete('markt');
            else next.set('markt', m);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams, views],
  );
  const [note, setNote] = useState<Result | null>(null);
  return (
    <div className="sec__phone-panels">
      {company ? (
        <PageNav label="Ansicht" views={views} view={view} onView={(v) => go(v, legacyMarket ? raw! : undefined)} />
      ) : (
        <DS.SegmentedControl aria-label="Ansicht" size="sm" options={views} value={view} onChange={(v) => go(v, legacyMarket ? raw! : undefined)} />
      )}
      <div className={`sec__phone-panel sec__phone-panel--${view}`}>
        {view === 'price' && <PricePanel asin={asin} profile={profile} bare />}
        {view === 'markt' && (
          <Panel
            className="panel--market"
            action={
              <DS.SegmentedControl
                aria-label="Markt"
                size="sm"
                options={MARKET_VIEWS}
                value={market}
                onChange={(m) => go('markt', m)}
              />
            }
          >
            {market === 'book' && <BookView asin={asin} profile={profile} onPick={onPick} />}
            {market === 'depth' && <DepthView asin={asin} type={profile.type} />}
            {market === 'trades' && <TradesView asin={asin} type={profile.type} />}
          </Panel>
        )}
        {view === 'holders' && <HoldersView asin={asin} />}
        {company && !TRADING_VIEWS.has(view) && company.other}
        {view === 'scheine' && <PhoneWarrants asin={asin} name={profile.name} />}
        {view === 'yield' && <BondPanel profile={profile} bare />}
        {view === 'weights' && <IndexWeightsPanel asin={asin} bare />}
        {view === 'members' && <IndexMembersPanel asin={asin} bare />}
        {view === 'tracking' && <EtfTrackingPanel profile={profile} bare />}
        {view === 'compare' && <BuildingPanel profile={profile} bare />}
        {view === 'basis' && <WarrantPanel profile={profile} bare />}
        {view === 'szenario' && <WarrantScenarioPanel profile={profile} draft={draft} bare />}
        {view === 'units' && (
          <div className="sec__units">
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

/** A company view of a stock page: the company profile and its polls load only when one is shown. */
function StockCompanyView({ view, fallback, asin, onDone }: { view: string; fallback: string; asin: string; onDone: (text: string) => void }) {
  const company = useCompanyByAsin(asin);
  const polls = useCompanyPolls(company.data?.id);
  if (company.isError)
    return (
      <DS.Card flush className="panel">
        <DS.EmptyState compact title="Unternehmen konnte nicht geladen werden">Bitte gleich noch einmal versuchen.</DS.EmptyState>
      </DS.Card>
    );
  return (
    <CompanyView
      view={view}
      fallback={fallback}
      asin={asin}
      company={company.data}
      polls={polls.data}
      pollsLoading={!polls.data && !polls.isError}
      onDone={onDone}
    />
  );
}

/** Phone view „Scheine“: warrants on this security, or why there are none. */
function PhoneWarrants({ asin, name }: { asin: string; name: string }) {
  const { list, isLoading } = useWarrantsOf(asin);
  if (isLoading) return <DS.Skeleton variant="rows" />;
  if (!list.length)
    return (
      <DS.EmptyState compact title="Keine laufenden Optionsscheine">
        Auf {name} läuft gerade kein Optionsschein. Scheine laufen etwa einen Tag, neue gibt der Emittent aus.
      </DS.EmptyState>
    );
  return <WarrantsOnView asin={asin} />;
}

/**
 * Phone sheet behind „⋯“: every key figure the header has no room for, and the actions that sit in
 * the header or the ticket column on the desktop (company, underlying, market maker quote, OTC, miner).
 */
function PhoneMore({
  profile,
  cls,
  tradable,
  canQuote,
  canMove,
  onClose,
  onQuote,
}: {
  profile: ListingProfile;
  cls: AssetClass;
  tradable: boolean;
  canQuote: boolean;
  /** I run a company, so there is a second account to move shares to */
  canMove: boolean;
  onClose: () => void;
  onQuote: () => void;
}) {
  const navigate = useNavigate();
  const facts = useClassFacts(profile, cls, false, 10);
  const index = useIndexDetails(profile.securityIdentifier, cls === 'index');
  const warrant = useWarrant(cls === 'warrant' ? profile.securityIdentifier : undefined);
  const etf = useEtf(profile.securityIdentifier, cls === 'etf');
  const go = (to: string) => {
    onClose();
    navigate(to);
  };
  const underlying = warrant.data?.underlying?.securityIdentifier;
  const baseIndex = etf.data?.baseIndexAsin;
  const actions: { label: string; hint?: string; run: () => void }[] = [];
  if (underlying) actions.push({ label: `Basiswert öffnen: ${warrant.data?.underlying?.name ?? underlying}`, run: () => go(`/wertpapier/${underlying}`) });
  if (baseIndex) actions.push({ label: `Basisindex öffnen: ${etf.data?.baseIndexName ?? baseIndex}`, run: () => go(`/wertpapier/${baseIndex}`) });
  if (canQuote) actions.push({ label: 'Market Maker', hint: 'Quote stellen: Geld- und Briefkurs deines Unternehmens', run: onQuote });
  if (tradable)
    actions.push({ label: 'Außerbörslich (OTC) an einen Spieler …', hint: 'Angebot direkt an ein anderes Depot', run: () => go(`/orders?ansicht=otc&neu=${profile.securityIdentifier}`) });
  if (tradable && canMove)
    actions.push({ label: 'Zwischen eigenen Depots umbuchen …', hint: 'Privat ⇄ deine Unternehmen, per OTC-Paar', run: () => go(`/orders?ansicht=otc&umbuchen=${profile.securityIdentifier}`) });
  if (cls === 'coin') actions.push({ label: 'Miner: AlphaCoins schürfen', run: () => go('/miner') });
  return (
    <div className="sec-more">
      {cls === 'index' ? (
        index.data ? (
          <>
            <DS.IndexFacts index={index.data} />
            <p className="class__note">
              Ein Index wird aus den Kursen seiner Mitglieder berechnet und nicht gehandelt. Handelbar sind ETFs und Optionsscheine darauf.
            </p>
          </>
        ) : (
          <DS.Skeleton variant="rows" />
        )
      ) : (
        facts.length > 0 && (
          <dl className="sec-more__facts" aria-label="Kennzahlen">
            {facts.map((f, i) => (
              <div key={i} className="sec-more__fact">
                <dt>{f.label}</dt>
                <dd>
                  {typeof f.value === 'number' ? (
                    <DS.Amount value={f.value} currency={f.currency} unit={f.unit} decimals={f.decimals} compact={f.compact ?? 'auto'} />
                  ) : (
                    f.value
                  )}
                  {f.sub && <small>{f.sub}</small>}
                </dd>
              </div>
            ))}
          </dl>
        )
      )}
      {actions.length > 0 && (
        <div className="sec-more__actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className="sec-more__action" onClick={a.run}>
              <span>{a.label}</span>
              {a.hint && <small>{a.hint}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- order ticket ----------

/** The order ticket (or quote) on demand: a dialog, on the phone a sheet from below. */
function OrderDialog({ open, onClose, title, phone, children }: { open: boolean; onClose: () => void; title: string; phone: boolean; children: React.ReactNode }) {
  if (phone)
    return (
      <DS.Sheet open={open} onClose={onClose} title={title}>
        {children}
      </DS.Sheet>
    );
  return (
    <DS.Dialog open={open} onClose={onClose} title={title} className="sec-order">
      {children}
    </DS.Dialog>
  );
}

function Ticket({
  profile,
  listing,
  spread,
  change,
  pick,
  onResult,
  onDraft,
}: {
  profile: ListingProfile;
  listing: React.ComponentProps<typeof DS.OrderTicket>['listing'];
  spread: React.ComponentProps<typeof DS.OrderTicket>['spread'];
  change?: number;
  pick: Pick | null;
  onResult: (r: Result) => void;
  /** Warrants: reports the ticket's draft (number, buy limit) – the DS ticket has no change callback. */
  onDraft?: (d: Draft) => void;
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
    <TicketDraft onDraft={onDraft} price={spread?.askPrice ?? undefined}>
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
        defaultType={pick?.type ?? 'LIMIT'}
        defaultPrice={pick ? (pick.type === 'LIMIT' ? pick.price : undefined) : limitPrice('BUY', spread ?? undefined)}
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
      {accounts.length > 1 && pos && pos.numberOfShares > 0 && (
        <DS.Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() =>
            navigate(`/orders?ansicht=otc&umbuchen=${profile.securityIdentifier}&von=${account?.id ?? accounts[0].id}`)
          }
        >
          In ein anderes eigenes Depot umbuchen …
        </DS.Button>
      )}
    </TicketDraft>
  );
}

/**
 * Wrapper that reads the ticket's inputs after every input or click inside (and once after mounting,
 * for the prefilled number) and reports them. `display: contents` keeps the ticket's layout.
 */
function TicketDraft({ onDraft, price, children }: { onDraft?: (d: Draft) => void; price?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const read = useCallback(() => {
    if (!onDraft) return;
    requestAnimationFrame(() => {
      if (ref.current) onDraft(readTicketDraft(ref.current, price, parseDe));
    });
  }, [onDraft, price]);
  useLayoutEffect(read, [read]);
  if (!onDraft) return <>{children}</>;
  return (
    <div ref={ref} className="sec__draft" onInput={read} onClick={read} onKeyUp={read}>
      {children}
    </div>
  );
}
