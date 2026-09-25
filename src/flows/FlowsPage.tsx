import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useAccountDetails, useListings, useTradeWindow, useTradeWindowProgress } from '../api/queries';
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
  displayName,
  grouping,
  involves,
  kindOfAsin,
  kindSplit,
  netFlows,
  network,
  offMarket,
  pairs,
  parseAccount,
  REST_ID,
  roundTrips,
  sankey,
  splitTransfers,
  summary,
  timeline,
  transferGroups,
  type AccountInfo,
  type AccountKind,
  type AssetKind,
  type NetMetric,
  type Pair,
  type Trade,
} from './derive';
import './FlowsPage.css';

const NBSP = String.fromCharCode(0xa0);
const eur = (n: number) => `${short(n)}${NBSP}€`;
const count = (n: number) => n.toLocaleString('de-DE');
const clock = (ms: number) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

const RANGES = [
  { value: '15m', label: '15 Min', minutes: 15 },
  { value: '1h', label: '1 Std', minutes: 60 },
  { value: '3h', label: '3 Std', minutes: 180 },
];

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

const MAIN = [
  { value: 'netz', label: 'Netzwerk' },
  { value: 'fluss', label: 'Geldfluss' },
  { value: 'verlauf', label: 'Verlauf' },
];
const SIDE = [
  { value: 'paare', label: 'Paare' },
  { value: 'netto', label: 'Netto' },
  { value: 'auffaellig', label: 'Auffällig' },
];
const PHONE = [
  { value: 'netz', label: 'Netz' },
  { value: 'fluss', label: 'Fluss' },
  { value: 'verlauf', label: 'Zeit' },
  ...SIDE,
];

/**
 * Geldflüsse: who trades with whom in the whole market – all trades of the last 15 min / 1 / 3 hours
 * from the market-wide log, as a network of accounts, a money flow sellers → securities → buyers,
 * volume over time, net buyers/sellers and unusual activity. `?konto=` narrows everything to one
 * account (or `org:<name>` = all accounts of one person).
 */
export function FlowsPage() {
  const onLinkClick = useInternalLinks();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useParamState('zeitraum', '1h', RANGES);
  const [art, setArt] = useParamState('art', 'aktien', ARTS);
  const [group, setGroup] = useParamState('gruppe', 'konten', GROUPS);
  const [main, setMain] = useParamState('ansicht', 'netz', isPhone ? PHONE : MAIN);
  const [side, setSide] = useParamState('liste', 'paare', SIDE);
  const [metric, setMetric] = useParamState('gewicht', 'umsatz', METRICS);
  const konto = params.get('konto') ?? '';
  const minutes = RANGES.find((r) => r.value === range)!.minutes;
  const kind = ARTS.find((a) => a.value === art)?.kind;

  const win = useTradeWindow(minutes);
  const progress = useTradeWindowProgress(minutes);

  const { trades: all, transfers } = useMemo(() => splitTransfers(win.data?.trades ?? []), [win.data]);
  const ofKind = useMemo(() => (kind ? all.filter((t) => kindOfAsin(t.asin) === kind) : all), [all, kind]);

  // Names: the largest and busiest accounts (for „Personen“ also the company accounts), plus the filter.
  const toResolve = useMemo(() => {
    const ids = accountsToResolve(ofKind, 25);
    if (konto && !konto.startsWith('org:') && !ids.includes(konto)) ids.push(konto);
    return ids;
  }, [ofKind, konto]);
  const details = useAccountDetails(toResolve);
  const infos = useMemo(() => {
    const out: Record<string, AccountInfo | undefined> = {};
    for (const [id, d] of Object.entries(details.data)) out[id] = parseAccount(d);
    return out;
  }, [details.data]);
  const grp = useMemo(() => grouping(infos, group === 'personen'), [infos, group]);
  const ownerOf = useCallback((id: string) => infos[id]?.owner, [infos]);
  const touches = useCallback((t: Trade) => !konto || involves(t, konto, ownerOf), [konto, ownerOf]);
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

  const setKonto = useCallback(
    (id: string | undefined) => {
      if (id === REST_ID) return;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!id || id === prev.get('konto')) next.delete('konto');
          else next.set('konto', id);
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  const kontoName = konto ? displayName(konto, stats.find((s) => s.id === konto)?.name ?? '', infos) : '';
  const kontoHref = konto ? accountHref(konto, infos) : undefined;
  const kontoStat = konto ? stats.find((s) => s.id === focusId) : undefined;

  const loading = win.isLoading;
  const covered = win.data;
  const meta = loading ? (
    <span>
      Lädt Trades {progress.data ? `… ${count(progress.data.loaded)} bis ${clock(progress.data.oldest)}` : '…'}
    </span>
  ) : covered && isPhone ? (
    <span>
      {count(all.length)} Trades · {clock(covered.from)}–{clock(covered.to)}
      {covered.complete ? '' : ' (gekürzt)'}
    </span>
  ) : covered ? (
    <span>
      {count(all.length)} Trades von {clock(covered.from)} bis {clock(covered.to)}
      {covered.complete ? '' : ' (Abrufgrenze erreicht)'} · ganzer Markt · {count(transfers.length)} Übertragungen nicht mitgezählt
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
          {stat('Gekauft', eur(kontoStat.bought), 'bezahlt')}
          {stat('Verkauft', eur(kontoStat.sold), 'erhalten')}
          {stat('Gegenparteien', count(Math.max(0, stats.length - 1)), `${count(sum.securities)} Wertpapiere`)}
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

  const kontoBar = konto ? (
    <div className="fl-konto" role="status">
      <span className="fl-konto__label">Gefiltert auf</span>
      <b className="fl-konto__name">{kontoName}</b>
      {kontoHref && <a href={kontoHref}>Profil öffnen</a>}
      <DS.Button size="sm" variant="ghost" onClick={() => setKonto(undefined)}>
        Alle Konten
      </DS.Button>
    </div>
  ) : null;

  const empty = !loading && !scoped.length;
  const body = (view: string) => {
    if (loading) return <DS.Skeleton variant="block" />;
    if (win.isError) return <DS.EmptyState compact as="h3" title="Trades konnten nicht geladen werden" />;
    if (empty && view !== 'auffaellig') return <DS.EmptyState compact as="h3" title="Keine Trades in diesem Zeitraum" />;
    switch (view) {
      case 'netz':
        return (
          <NetworkView
            trades={scoped}
            grp={grp}
            focus={focusId || undefined}
            onPick={setKonto}
            control={<DS.SegmentedControl size="sm" fullWidth={false} aria-label="Größe der Kreise" options={METRICS} value={metric} onChange={setMetric} />}
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

  const artControl = <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Wertpapierart" options={ARTS} value={art} onChange={setArt} />;
  const rangeControl = <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Zeitraum" options={RANGES} value={range} onChange={setRange} />;
  const groupControl = <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Zusammenfassen" options={GROUPS} value={group} onChange={setGroup} />;

  if (isPhone) {
    return (
      <div className="page fl fl--phone" onClick={onLinkClick}>
        <DS.PageHeader size="md" title="Geldflüsse" meta={meta} />
        <div className="page__body fl__body">
          <div className="fl__controls">
            <DS.Select aria-label="Wertpapierart" options={ARTS} value={art} onChange={(e) => setArt(e.target.value)} />
            {rangeControl}
          </div>
          {kontoBar}
          <DS.Tabs aria-label="Ansicht" items={PHONE} value={main} onChange={setMain} />
          <DS.Card flush className="panel">
            <div className={`panel__fill fl__pad${['paare', 'auffaellig'].includes(main) ? ' scroll' : ''}`}>{body(main)}</div>
          </DS.Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page fl" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Geldflüsse"
        meta={meta}
        actions={
          <div className="fl__actions">
            {artControl}
            {rangeControl}
          </div>
        }
      />
      <div className={`page__body fl__body${konto ? ' fl__body--konto' : ''}`}>
        {stats5}
        {kontoBar}
        <div className="fl__grid">
          <DS.Card flush className="panel">
            <div className="panel__tabs fl__tabs">
              <DS.Tabs
                size="sm"
                aria-label="Ansicht"
                value={main}
                onChange={setMain}
                items={MAIN.map((m) => ({ value: m.value, label: m.label, content: <div className="fl__pane">{body(m.value)}</div> }))}
              />
              <div className="fl__tabaction">{groupControl}</div>
            </div>
          </DS.Card>
          <DS.Card flush className="panel">
            <div className="panel__tabs">
              <DS.Tabs
                size="sm"
                aria-label="Listen"
                value={side}
                onChange={setSide}
                items={SIDE.map((m) => ({ value: m.value, label: m.label, content: <div className="fl__list">{body(m.value)}</div> }))}
              />
            </div>
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

function AccountButton({ id, name, onPick, active }: { id: string; name: string; onPick: (id: string) => void; active?: boolean }) {
  return (
    <button type="button" className={`fl-acc${active ? ' fl-acc--active' : ''}`} onClick={() => onPick(id)} title={`Nur ${name} zeigen`}>
      {name}
    </button>
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
  const groups = useMemo(() => transferGroups(transfers).slice(0, 10), [transfers]);
  const asins = useMemo(
    () => [...new Set([...trips.map((r) => r.asin), ...off.map((o) => o.trade.asin), ...groups.map((g) => g.asin)])].filter((a) => !names[a]),
    [trips, off, groups, names],
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
        <p className="fl__note">Zu 0 € oder 0,01 € – kein Handel, sondern Geschenke, Coin-Auszahlungen oder Umbuchungen. Zählen nirgends als Umsatz.</p>
        {groups.length ? (
          <ul className="fl-rows">
            {groups.map((g) => (
              <li key={`${g.from}|${g.to}|${g.asin}`}>
                <div>
                  {g.from === g.to ? (
                    <AccountButton id={g.from} name={n(g.from, g.fromName)} onPick={onPick} />
                  ) : (
                    <>
                      <AccountButton id={g.from} name={n(g.from, g.fromName)} onPick={onPick} /> →{' '}
                      <AccountButton id={g.to} name={n(g.to, g.toName)} onPick={onPick} />
                    </>
                  )}
                </div>
                <div className="fl-rows__meta">
                  {sec(g.asin)} · {g.count}× · <span className="num">{short(g.shares)}</span> Stück{g.from === g.to ? ' · an sich selbst' : ''}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fl__none">Keine im Zeitraum.</p>
        )}
      </section>
    </div>
  );
}
