import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useAccountDetails, useListings, useOwnerAccounts, useTradeWindow, useTradeWindowProgress } from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { euro, short } from '../lib/format';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone } from '../lib/useMediaQuery';
import { useParamState } from '../lib/useParamState';
import { ACCOUNT_LABEL, kindShareChart, netChart, networkChart, sankeyChart, timelineChart } from './charts';
import {
  accountHref,
  accountStats,
  accountsToResolve,
  shownPrivateAccounts,
  displayName,
  grouping,
  involves,
  kindOfAsin,
  kindSplit,
  netFlows,
  network,
  offMarket,
  ownerAccounts,
  pairs,
  parseAccount,
  REST_ID,
  roundTrips,
  sankey,
  selfTotals,
  splitTransfers,
  summary,
  timeline,
  type AccountInfo,
  type AccountKind,
  type AssetKind,
  type NetMetric,
  type Pair,
  type Trade,
} from './derive';
import { MiniStats } from '../app/phone';
import { PageNav, useFilters, usePageView, type PageFilter, type PageView } from '../app/pagenav';
import { filterSummary, readFilters } from '../lib/pagenav';
import { rangeMs, rangeOptions } from '../lib/ranges';
import { AccountButton, AccountView, TransferGroups } from './AccountView';
import './FlowsPage.css';

const NBSP = String.fromCharCode(0xa0);
const eur = (n: number) => `${short(n)}${NBSP}€`;
const count = (n: number) => n.toLocaleString('de-DE');
const clockOf = (span: number) => (ms: number) =>
  span > 20 * 3600_000
    ? new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

const RANGES = rangeOptions(['15m', '1h', '3h', '12h']);
/** One account comes from its own logs – there days are affordable. */
const ACCOUNT_RANGES = rangeOptions(['15m', '1h', '3h', '12h', '24h', '7T', '30T']);

const ARTS: { value: string; label: string; kind?: AssetKind }[] = [
  { value: 'aktien', label: 'Aktien', kind: 'STOCK' },
  { value: 'anleihen', label: 'Anleihen', kind: 'BOND' },
  { value: 'coins', label: 'Coins', kind: 'COIN' },
  { value: 'alle', label: 'Alle' },
];

const GROUPS = [
  { value: 'konten', label: 'Konten' },
  { value: 'personen', label: 'Personen' },
];

const METRICS = [
  { value: 'umsatz', label: 'nach €' },
  { value: 'trades', label: 'nach Trades' },
];

const SIDE = [
  { value: 'paare', label: 'Paare' },
  { value: 'netto', label: 'Netto' },
  { value: 'auffaellig', label: 'Auffällig' },
];
/** Views of the big card; on phones the lists of the side card are views of their own. */
const VIEWS: PageView[] = [
  { value: 'fluss', label: 'Geldfluss', description: 'Verkäufer → Wertpapiere → Käufer' },
  { value: 'netz', label: 'Netzwerk', description: 'Wer mit wem handelt – Konten als Kreise' },
  { value: 'verlauf', label: 'Verlauf', description: 'Umsatz und Trades über die Zeit' },
  { value: 'paare', label: 'Paare', parent: 'fluss', description: 'Konten, die am meisten miteinander handeln' },
  { value: 'netto', label: 'Netto', parent: 'fluss', description: 'Größte Netto-Käufer und -Verkäufer' },
  { value: 'auffaellig', label: 'Auffällig', parent: 'fluss', description: 'Hin und zurück, abseits vom Kurs, Übertragungen' },
];
/** Only with `?konto=`: that account up close – first, it is what the click was for. */
const ACCOUNT_VIEW: PageView = { value: 'konto', label: 'Herkunft', description: 'Woher Wertpapiere und Geld kommen, wohin sie gehen' };
const ACCOUNT_VIEWS = [ACCOUNT_VIEW, ...VIEWS];

const baseFilters = (ranges: typeof RANGES): PageFilter[] => [
  { key: 'art', label: 'Wertpapierart', fallback: 'aktien', options: ARTS, primary: true, bare: true },
  { key: 'zeitraum', label: 'Zeitraum', fallback: '1h', options: ranges, primary: true, bare: true },
  { key: 'gruppe', label: 'Zusammenfassen', fallback: 'konten', options: GROUPS, note: 'Personen: alle Konten mit demselben CEO bzw. Inhaber als ein Kreis.' },
];
const MARKET_FILTERS = baseFilters(RANGES);
const ACCOUNT_FILTERS = baseFilters(ACCOUNT_RANGES);

/**
 * Geldflüsse: who trades with whom in the whole market – all trades of the last 15 min to 12 hours
 * from the market-wide log, as a money flow sellers → securities → buyers, a network of accounts,
 * volume over time, net buyers/sellers and unusual activity. `?konto=` narrows everything to one
 * account (or `org:<name>` = all accounts of one person): then the data comes from that account's own
 * logs (complete, up to 30 days) and the view „Herkunft“ shows where its securities and money come from.
 */
export function FlowsPage() {
  const onLinkClick = useInternalLinks();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const [params, setParams] = useSearchParams();
  const konto = params.get('konto') ?? '';
  const [main, setMain, views] = usePageView(konto ? ACCOUNT_VIEWS : VIEWS, 'fluss');
  // the side card's list: a phone view (?ansicht=netto) opens the same list on wide screens
  const asked = params.get('ansicht');
  const [liste, setSide] = useParamState('liste', 'paare', SIDE);
  const side = SIDE.some((l) => l.value === asked) ? asked! : liste;
  const [metric, setMetric] = useParamState('gewicht', 'umsatz', METRICS);
  const baseDefs = konto ? ACCOUNT_FILTERS : MARKET_FILTERS;
  // read here already: names and grouping depend on them, and the konto chip (see `filters`) depends on the names
  const { art, zeitraum: range, gruppe: group } = readFilters(params, baseDefs);
  const minutes = rangeMs(range)! / 60_000;
  const kind = ARTS.find((a) => a.value === art)?.kind;

  // One account or one person: their own logs instead of the market window.
  const org = konto.startsWith('org:') ? konto.slice(4) : undefined;
  const found = useOwnerAccounts(org);
  const orgAccounts = useMemo(() => (org ? ownerAccounts(found.data ?? [], org) : []), [org, found.data]);
  const mine = useMemo(() => (!konto ? undefined : org ? orgAccounts.map((a) => a.id) : [konto]), [konto, org, orgAccounts]);
  const own = !!mine?.length;
  const marketWin = useTradeWindow(minutes, undefined, !konto || (!!org && found.isFetched && !own));
  const ownWin = useTradeWindow(minutes, mine, own);
  const win = own ? ownWin : marketWin;
  const progress = useTradeWindowProgress(minutes, own ? mine : undefined);
  const clock = clockOf(minutes * 60_000);

  const { trades: all, transfers } = useMemo(() => splitTransfers(win.data?.trades ?? []), [win.data]);
  const ofKind = useMemo(() => (kind ? all.filter((t) => kindOfAsin(t.asin) === kind) : all), [all, kind]);

  // Names: the largest and busiest accounts (for „Personen“ also the company accounts), plus the filter.
  // Also every private account the lists and the money flow show, so busy private accounts carry their player's name.
  const toResolve = useMemo(() => {
    const ids = accountsToResolve(ofKind, 25);
    const scopedTrades = konto ? ofKind.filter((t) => involves(t, konto)) : ofKind;
    const scopedTransfers = konto ? transfers.filter((t) => involves(t, konto)) : transfers;
    for (const id of shownPrivateAccounts(scopedTrades, scopedTransfers)) if (!ids.includes(id)) ids.push(id);
    if (konto && !konto.startsWith('org:') && !ids.includes(konto)) ids.push(konto);
    return ids;
  }, [ofKind, transfers, konto]);
  const details = useAccountDetails(toResolve);
  const infos = useMemo(() => {
    const out: Record<string, AccountInfo | undefined> = {};
    for (const a of orgAccounts) out[a.id] = a;
    for (const [id, d] of Object.entries(details.data)) out[id] = parseAccount(d);
    return out;
  }, [details.data, orgAccounts]);
  const grp = useMemo(() => grouping(infos, group === 'personen'), [infos, group]);
  const ownerOf = useCallback((id: string) => infos[id]?.owner, [infos]);
  const mineSet = useMemo(() => new Set(mine ?? []), [mine]);
  /** Whether an account is the filtered one (or one of the filtered person's accounts). */
  const isSelf = useCallback(
    (id: string) => (own ? mineSet.has(id) : id === konto || (!!org && ownerOf(id) === org)),
    [own, mineSet, konto, org, ownerOf],
  );
  const touches = useCallback((t: Trade) => !konto || (own ? isSelf(t.buyer) || isSelf(t.seller) : involves(t, konto, ownerOf)), [konto, own, isSelf, ownerOf]);
  // The node the filter stands for: with „Personen“ a company account is shown as its CEO.
  const focusId = konto && !konto.startsWith('org:') ? grp(konto, '').id : konto;

  const scoped = useMemo(() => ofKind.filter(touches), [ofKind, touches]);
  const stats = useMemo(() => accountStats(scoped, grp), [scoped, grp]);
  const sum = useMemo(() => summary(scoped, stats), [scoped, stats]);
  const scopedTransfers = useMemo(() => transfers.filter(touches), [transfers, touches]);

  const topAsins = useMemo(() => {
    const vol = new Map<string, number>();
    for (const t of scoped) vol.set(t.asin, (vol.get(t.asin) ?? 0) + t.volume);
    return [...vol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a]) => a);
  }, [scoped]);
  const listings = useListings(topAsins);
  const names = useMemo(() => Object.fromEntries(Object.entries(listings).map(([a, l]) => [a, l.name ?? a])), [listings]);

  // Picking an account drills in: filter on it and show „Herkunft“; picking it again goes back.
  const setKonto = useCallback(
    (id: string | undefined) => {
      if (id === REST_ID) return;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!id || id === prev.get('konto')) {
            next.delete('konto');
            if (next.get('ansicht') === ACCOUNT_VIEW.value) next.delete('ansicht');
          } else {
            next.set('konto', id);
            next.set('ansicht', ACCOUNT_VIEW.value);
          }
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  const kontoName = konto ? displayName(konto, stats.find((s) => s.id === konto)?.name ?? '', infos) : '';
  const kontoHref = konto ? accountHref(konto, infos) : undefined;
  const kontoStat = useMemo(() => (konto ? selfTotals(scoped, isSelf) : undefined), [konto, scoped, isSelf]);
  const banks = useMemo(() => [...new Set((mine ?? []).map((id) => infos[id]?.bank).filter((b): b is string => !!b))], [mine, infos]);

  const filterDefs = useMemo<PageFilter[]>(
    () => [
      ...baseDefs,
      {
        key: 'konto',
        label: 'Gefiltert auf',
        fallback: '',
        summary: () => `nur ${kontoName}`,
        chip: () => (
          <>
            <b>{kontoName}</b>
            {kontoHref && <a href={kontoHref}>Profil</a>}
          </>
        ),
      },
    ],
    [baseDefs, kontoName, kontoHref],
  );
  const filters = useFilters(filterDefs);
  const nav = <PageNav label="Ansicht" views={views} view={main} onView={setMain} filters={filters} />;

  const loading = win.isLoading || (!!org && found.isLoading);
  const covered = win.data;
  const meta = loading ? (
    <span>
      Lädt Trades {progress.data ? `… ${count(progress.data.loaded)}${own ? ` aus ${count(mine!.length)} ${mine!.length === 1 ? 'Konto' : 'Konten'}` : ` bis ${clock(progress.data.oldest)}`}` : '…'}
    </span>
  ) : covered && isPhone ? (
    <span>
      {count(all.length)} Trades · {clock(covered.from)}–{clock(covered.to)}
      {covered.complete ? '' : ' (gekürzt)'}
    </span>
  ) : covered ? (
    <span>
      {count(all.length)} Trades von {clock(covered.from)} bis {clock(covered.to)}
      {covered.complete ? '' : ' (Abrufgrenze erreicht)'} · {own ? `alle Trades von ${kontoName}` : 'ganzer Markt'} · {count(transfers.length)}{' '}
      Übertragungen nicht mitgezählt
    </span>
  ) : (
    <span>{NBSP}</span>
  );

  const stat = (label: string, value: React.ReactNode, hint: React.ReactNode) => <DS.StatTile label={label} value={value} hint={hint} />;
  const stats5 = (
    <DS.StatGroup columns="repeat(5, minmax(0, 1fr))" aria-label="Kennzahlen des Zeitraums">
      {stat('Umsatz', loading ? '–' : eur(sum.volume), loading ? NBSP : `${count(sum.trades)} Trades`)}
      {kontoStat ? (
        <>
          {stat('Gekauft', loading ? '–' : eur(kontoStat.bought), loading ? NBSP : 'bezahlt')}
          {stat('Verkauft', loading ? '–' : eur(kontoStat.sold), loading ? NBSP : 'erhalten')}
          {stat('Gegenparteien', loading ? '–' : count(kontoStat.counterparties), loading ? NBSP : `${count(kontoStat.securities)} Wertpapiere`)}
        </>
      ) : (
        <>
          {stat('Konten', loading ? '–' : count(sum.accounts), loading ? NBSP : `${count(stats.filter((s) => s.kind === 'player').length)} Privatdepots`)}
          {stat('Wertpapiere', loading ? '–' : count(sum.securities), loading ? NBSP : topAsins[0] ? `größtes: ${names[topAsins[0]] ?? topAsins[0]}` : NBSP)}
          {stat(
            'Top 10 Konten',
            loading ? '–' : `${Math.round(sum.top10Share * 100)}${NBSP}%`,
            'Anteil an Kauf und Verkauf',
          )}
        </>
      )}
      {stat('Übertragungen', loading ? '–' : count(scopedTransfers.length), 'zu 0 € oder 0,01 €')}
    </DS.StatGroup>
  );


  const empty = !loading && !scoped.length;
  const body = (view: string) => {
    if (loading) return <DS.Skeleton variant="block" />;
    if (win.isError) return <DS.EmptyState compact as="h3" title="Trades konnten nicht geladen werden" />;
    if (empty && view !== 'auffaellig' && view !== ACCOUNT_VIEW.value) return <DS.EmptyState compact as="h3" title="Keine Trades in diesem Zeitraum" />;
    switch (view) {
      case ACCOUNT_VIEW.value:
        return (
          <AccountView
            trades={scoped}
            transfers={scopedTransfers}
            isSelf={isSelf}
            selfLabel={kontoName}
            grp={grp}
            infos={infos}
            names={names}
            from={covered?.from ?? 0}
            banks={banks}
            onPick={setKonto}
            onSecurity={(a) => navigate(`/wertpapier/${a}`)}
          />
        );
      case 'netz':
        return (
          <NetworkView
            trades={scoped}
            grp={grp}
            focus={focusId || undefined}
            onPick={setKonto}
            control={metricControl}
            by={metric === 'trades' ? 'trades' : 'volume'}
          />
        );
      case 'fluss':
        return <SankeyView trades={scoped} grp={grp} names={names} onPick={setKonto} onSecurity={(a) => navigate(`/wertpapier/${a}`)} />;
      case 'verlauf':
        return <TimelineView trades={scoped} all={konto ? all.filter(touches) : all} from={covered!.from} to={covered!.to} byKind={!kind} names={names} />;
      case 'paare':
        return <PairsView list={pairs(scoped, grp)} infos={infos} konto={focusId} onPick={setKonto} />;
      case 'netto':
        return <NetView trades={scoped} grp={grp} infos={infos} onPick={setKonto} />;
      default:
        return <UnusualView trades={scoped} transfers={scopedTransfers} infos={infos} names={names} onPick={setKonto} />;
    }
  };

  const metricControl = (
    <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Größe der Kreise" options={METRICS} value={metric} onChange={setMetric} />
  );

  if (isPhone) {
    // One control row: the six views as scrolling tabs plus the filter button (Art, Zeitraum, Zusammenfassen,
    // Konto); the current choice is spelled out in the meta line.
    const artLabel = ARTS.find((a) => a.value === art)?.label ?? '';
    const chosen = filterSummary(
      filterDefs.filter((d) => d.key !== 'art'),
      filters.values,
    );
    const phoneMeta = loading ? (
      meta
    ) : covered ? (
      <span>
        {count(all.length)} Trades · {artLabel} · {clock(covered.from)}–{clock(covered.to)}
        {covered.complete ? '' : ' (gekürzt)'}
        {chosen && ` · ${chosen}`}
      </span>
    ) : (
      meta
    );
    return (
      <div className="page fl fl--phone" onClick={onLinkClick}>
        <DS.PageHeader size="md" title="Geldflüsse" meta={phoneMeta} />
        <div className="page__body fl__body">
          {nav}
          <MiniStats
            label="Kennzahlen des Zeitraums"
            columns="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)"
            items={[
              { label: 'Umsatz', value: loading ? '–' : eur(sum.volume) },
              ...(kontoStat
                ? [
                    { label: 'Gekauft', value: eur(kontoStat.bought) },
                    { label: 'Verkauft', value: eur(kontoStat.sold) },
                  ]
                : [
                    { label: 'Konten', value: loading ? '–' : count(sum.accounts) },
                    { label: 'Top 10', value: loading ? '–' : `${Math.round(sum.top10Share * 100)}${NBSP}%` },
                  ]),
            ]}
          />
          <DS.Card flush className="panel">
            <div className={`panel__fill fl__pad${['paare', 'auffaellig'].includes(main) ? ' scroll' : ''}${main === ACCOUNT_VIEW.value ? ' fl__pane' : ''}`}>{body(main)}</div>
          </DS.Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page fl" onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Geldflüsse" meta={meta} tabs={nav} />
      <div className="page__body fl__body">
        {stats5}
        <div className="fl__grid">
          <DS.Card flush className="panel">
            <div className="panel__fill fl__pane">{body(main)}</div>
          </DS.Card>
          <DS.Card
            flush
            className="panel"
            title="Konten"
            action={<DS.SegmentedControl size="sm" fullWidth={false} aria-label="Liste" options={SIDE} value={side} onChange={setSide} />}
          >
            <div className="panel__fill scroll fl__list">{body(side)}</div>
          </DS.Card>
        </div>
      </div>
    </div>
  );
}

type Grp = ReturnType<typeof grouping>;
const pickId = (p: PlotPoint): string | undefined => (Array.isArray(p.customdata) ? p.customdata[0] : undefined) || undefined;

function NetworkView({
  trades,
  grp,
  focus,
  onPick,
  control,
  by,
}: {
  trades: Trade[];
  grp: Grp;
  focus?: string;
  onPick: (id: string) => void;
  control: React.ReactNode;
  by: NetMetric;
}) {
  const net = useMemo(() => network(trades, grp, 32, focus, by), [trades, grp, focus, by]);
  const figure = useCallback((t: Parameters<typeof networkChart>[0], w: number) => networkChart(t, w, net.nodes, net.edges, focus, by), [net, focus, by]);
  const kinds = (['company', 'player', 'fund', 'rest'] as AccountKind[]).filter((k) => net.nodes.some((n) => n.kind === k));
  return (
    <div className="fl__stack">
      <div className="fl__row">
        <ul className="fl-keys" aria-label="Farben">
          {kinds.map((k) => (
            <li key={k} className={`fl-key fl-key--${k}`}>
              {ACCOUNT_LABEL[k]}
            </li>
          ))}
        </ul>
        {control}
      </div>
      <div className="fl__chart">
        <Plot aria-label="Netzwerk: Konten als Kreise, Linien zwischen Konten, die miteinander gehandelt haben" figure={figure} onPointClick={(p) => { const id = pickId(p); if (id) onPick(id); }} />
      </div>
      <p className="fl__note">
        {net.shown} {by === 'trades' ? 'aktivste' : 'größte'} Konten{net.rest ? `, dazu „Übrige“ (${count(net.rest)})` : ''} · Kreis ={' '}
        {by === 'trades' ? 'Zahl der Trades' : 'Umsatz'}, Linie = gehandelt (dicker = {by === 'trades' ? 'öfter' : 'mehr €'}) · Klick filtert auf ein Konto
      </p>
    </div>
  );
}

function SankeyView({ trades, grp, names, onPick, onSecurity }: { trades: Trade[]; grp: Grp; names: Record<string, string>; onPick: (id: string) => void; onSecurity: (asin: string) => void }) {
  const data = useMemo(() => sankey(trades, names, grp, 7), [trades, names, grp]);
  const figure = useCallback((t: Parameters<typeof sankeyChart>[0], w: number) => sankeyChart(t, w, data), [data]);
  return (
    <div className="fl__stack">
      <div className="fl__legend" aria-hidden="true">
        <span>Verkäufer</span>
        <span>Wertpapiere</span>
        <span>Käufer</span>
      </div>
      <div className="fl__chart">
        <Plot
          aria-label="Geldfluss von den Verkäufern über die Wertpapiere zu den Käufern, in Euro"
          figure={figure}
          onPointClick={(p) => {
            const cd = p.customdata as string[] | undefined;
            if (!cd?.[0]) return;
            if (cd[1] === 'security') onSecurity(cd[0]);
            else if (cd[1] === 'seller' || cd[1] === 'buyer') onPick(cd[0]);
          }}
        />
      </div>
      <p className="fl__note">Breite = € · Aktien fließen von links nach rechts, das Geld in die Gegenrichtung · Klick auf ein Wertpapier öffnet es</p>
    </div>
  );
}

function TimelineView({ trades, all, from, to, byKind, names }: { trades: Trade[]; all: Trade[]; from: number; to: number; byKind: boolean; names: Record<string, string> }) {
  const tl = useMemo(() => timeline(trades, from, to, byKind ? 'kind' : 'security', names, 5), [trades, from, to, byKind, names]);
  const split = useMemo(() => kindSplit(all), [all]);
  const tlFig = useCallback((t: Parameters<typeof timelineChart>[0], w: number) => timelineChart(t, w, tl.x, tl.series, tl.counts, tl.width, byKind), [tl, byKind]);
  const splitFig = useCallback((t: Parameters<typeof kindShareChart>[0], w: number) => kindShareChart(t, w, split), [split]);
  return (
    <div className="fl__stack">
      <div className="fl__split">
        <Plot aria-label="Anteil der Wertpapierarten an Trades und Umsatz" figure={splitFig} />
      </div>
      <div className="fl__chart">
        <Plot aria-label={byKind ? 'Umsatz je Zeitabschnitt nach Wertpapierart' : 'Umsatz je Zeitabschnitt nach den größten Wertpapieren'} figure={tlFig} />
      </div>
      <p className="fl__note">
        Oben: Anteil der Arten an allen Trades · darunter: Umsatz je {Math.round(tl.width / 60_000)} Min.
        {byKind ? ' nach Art' : ', die 5 größten Wertpapiere'} und die Zahl der Trades
      </p>
    </div>
  );
}

function PairsView({ list, infos, konto, onPick }: { list: Pair[]; infos: Record<string, AccountInfo | undefined>; konto: string; onPick: (id: string) => void }) {
  const top = list.slice(0, 25);
  const max = Math.max(1, ...top.map((p) => p.volume));
  if (!top.length) return <DS.EmptyState compact as="h3" title="Keine Paare" />;
  return (
    <ol className="fl-pairs">
      {top.map((p) => {
        const a = displayName(p.a, p.aName, infos);
        const b = displayName(p.b, p.bName, infos);
        return (
          <li key={`${p.a}|${p.b}`} className="fl-pair">
            <div className="fl-pair__names">
              <AccountButton id={p.a} name={a} onPick={onPick} active={p.a === konto} />
              <span className="fl-pair__sep" aria-label="handelt mit">
                ⇄
              </span>
              <AccountButton id={p.b} name={b} onPick={onPick} active={p.b === konto} />
            </div>
            <div className="fl-pair__bar" title={`${a} verkauft ${eur(p.aToB)} · ${b} verkauft ${eur(p.bToA)}`}>
              <span className="fl-pair__ab" style={{ width: `${(p.aToB / max) * 100}%` }} />
              <span className="fl-pair__ba" style={{ width: `${(p.bToA / max) * 100}%` }} />
            </div>
            <div className="fl-pair__meta">
              <span className="num">{eur(p.volume)}</span> · {count(p.trades)} {p.trades === 1 ? 'Trade' : 'Trades'} · {count(p.securities)} {p.securities === 1 ? 'Papier' : 'Papiere'}
            </div>
          </li>
        );
      })}
      <li className="fl__note">Balken: hell = links verkauft an rechts, dunkel = rechts verkauft an links. Klick auf einen Namen filtert.</li>
    </ol>
  );
}

function NetView({ trades, grp, infos, onPick }: { trades: Trade[]; grp: Grp; infos: Record<string, AccountInfo | undefined>; onPick: (id: string) => void }) {
  const rows = useMemo(
    () => netFlows(accountStats(trades, grp), 6).map((s) => ({ ...s, name: displayName(s.id, s.name, infos) })),
    [trades, grp, infos],
  );
  const figure = useCallback((t: Parameters<typeof netChart>[0], w: number) => netChart(t, w, rows), [rows]);
  if (!rows.length) return <DS.EmptyState compact as="h3" title="Keine Netto-Käufer oder -Verkäufer" />;
  return (
    <div className="fl__stack">
      <div className="fl__legend fl__legend--net" aria-hidden="true">
        <span className="fl-dot fl-dot--sell">verkauft netto (Geld herein)</span>
        <span className="fl-dot fl-dot--buy">kauft netto (Geld hinaus)</span>
      </div>
      <div className="fl__chart" style={{ minHeight: 30 * rows.length }}>
        <Plot aria-label="Größte Netto-Käufer und Netto-Verkäufer in Euro" figure={figure} onPointClick={(p) => { const id = pickId(p); if (id) onPick(id); }} />
      </div>
    </div>
  );
}

function UnusualView({ trades, transfers, infos, names, onPick }: { trades: Trade[]; transfers: Trade[]; infos: Record<string, AccountInfo | undefined>; names: Record<string, string>; onPick: (id: string) => void }) {
  const trips = useMemo(() => roundTrips(trades).slice(0, 8), [trades]);
  const off = useMemo(() => offMarket(trades).slice(0, 8), [trades]);
  const asins = useMemo(
    () => [...new Set([...trips.map((r) => r.asin), ...off.map((o) => o.trade.asin)])].filter((a) => !names[a]),
    [trips, off, names],
  );
  const more = useListings(asins);
  const n = (id: string, log: string) => displayName(id, log, infos);
  const sec = (asin: string) => (
    <a className="fl-sec" href={`/wertpapier/${asin}`}>
      {names[asin] ?? more[asin]?.name ?? asin}
    </a>
  );
  return (
    <div className="fl-unusual">
      <section>
        <h3 className="fl__h">Hin und zurück · {count(trips.length)}</h3>
        <p className="fl__note">Zwei Konten handeln dasselbe Papier in beide Richtungen – kann Kurspflege oder ein Scheingeschäft sein.</p>
        {trips.length ? (
          <ul className="fl-rows">
            {trips.map((r) => (
              <li key={`${r.a}|${r.b}|${r.asin}`}>
                <div>
                  <AccountButton id={r.a} name={n(r.a, r.aName)} onPick={onPick} /> ⇄ <AccountButton id={r.b} name={n(r.b, r.bName)} onPick={onPick} />
                </div>
                <div className="fl-rows__meta">
                  {sec(r.asin)} · {r.aToB}× hin, {r.bToA}× zurück · <span className="num">{eur(r.volume)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fl__none">Keine im Zeitraum.</p>
        )}
      </section>
      <section>
        <h3 className="fl__h">Abseits vom Kurs · {count(off.length)}</h3>
        <p className="fl__note">Preis mehr als doppelt oder weniger als halb so hoch wie der Median des Papiers – so lässt sich Geld zwischen Konten schieben.</p>
        {off.length ? (
          <ul className="fl-rows">
            {off.map((o) => (
              <li key={o.trade.id}>
                <div>
                  <AccountButton id={o.trade.seller} name={n(o.trade.seller, o.trade.sellerName)} onPick={onPick} /> →{' '}
                  <AccountButton id={o.trade.buyer} name={n(o.trade.buyer, o.trade.buyerName)} onPick={onPick} />
                </div>
                <div className="fl-rows__meta">
                  {sec(o.trade.asin)} · <span className="num">{euro(o.trade.price)}</span> statt ~<span className="num">{euro(o.median)}</span> (×
                  {(o.deviation + 1).toLocaleString('de-DE', { maximumFractionDigits: o.deviation + 1 < 10 ? 1 : 0 })}) ·{' '}
                  <span className="num">{eur(o.trade.volume)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fl__none">Keine im Zeitraum.</p>
        )}
      </section>
      <section>
        <h3 className="fl__h">Übertragungen · {count(transfers.length)}</h3>
        <p className="fl__note">
          Zu 0 € oder 0,01 € – kein Handel, sondern Geschenke, Coin-Auszahlungen oder Umbuchungen. Zählen nirgends als Umsatz. Je Empfänger und
          Wertpapier eine Zeile, die Absender klappen auf.
        </p>
        <TransferGroups transfers={transfers} infos={infos} names={names} onPick={onPick} />
      </section>
    </div>
  );
}
