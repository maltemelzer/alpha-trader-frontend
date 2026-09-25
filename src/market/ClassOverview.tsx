// Class overview above the market list (Aktien, Anleihen, Repos, Coins, Indizes, ETFs, several classes):
// three key figures and one chart that answers the class's question. Built from the filtered screener
// rows; coins, indexes and ETFs add a few cached requests (daily closes, ETF details).
import { useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useDailyHistoriesState, useEtfs, useIndexes, useMainInterestRate, useMinimalStats, useMostTraded } from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { changeText, ratePct, short, span } from '../lib/format';
import {
  bondDots,
  breadth,
  classRows,
  closes,
  etfPair,
  indexBars,
  lastDays,
  median,
  moverDots,
  ratePerDay,
  repoDots,
  sumVolume,
  type EtfPair,
  type OverviewKind,
} from './overview';
import { bondChart, classChart, coinChart, etfChart, indexChart, moversChart, repoChart, type CoinSeries } from './overviewCharts';
import type { Group, ScreenRow } from './screener';

type Theme = Parameters<typeof moversChart>[0];
const NB = String.fromCharCode(0xa0);
const de = (n: number) => n.toLocaleString('de-DE');
const share = (x: number) => `${(x * 100).toLocaleString('de-DE', { maximumFractionDigits: x < 0.1 ? 1 : 0 })}${NB}%`;
/** Indexes and ETFs whose closes are loaded – each is one request, cached for five minutes. */
const MAX_SERIES = 8;
const COINS = 4;

export interface ClassOverviewProps {
  kind: OverviewKind;
  /** screener rows after all filters (unsorted) */
  rows: ScreenRow[];
  now: number;
  /** the screener's sources are still loading */
  loading: boolean;
  /** several classes: a click on a class selects it */
  onSelectType: (g: Group) => void;
}

export function ClassOverview(p: ClassOverviewProps) {
  switch (p.kind) {
    case 'stock':
      return <StockOverview {...p} />;
    case 'bond':
      return <BondOverview {...p} />;
    case 'repo':
      return <RepoOverview {...p} />;
    case 'coin':
      return <CoinOverview {...p} />;
    case 'index':
      return <IndexOverview {...p} />;
    case 'etf':
      return <EtfOverview {...p} />;
    default:
      return <MixedOverview {...p} />;
  }
}

/** Opens the security behind a clicked point (customdata = ASIN or [ASIN, …]). */
function useOpen() {
  const navigate = useNavigate();
  return useCallback(
    (pt: PlotPoint) => {
      const asin = Array.isArray(pt.customdata) ? pt.customdata[0] : pt.customdata;
      if (typeof asin === 'string' && asin) navigate(`/wertpapier/${asin}`);
    },
    [navigate],
  );
}

interface FrameProps {
  label: string;
  figs: ReactNode;
  loading: boolean;
  /** nothing to draw: the empty state's text */
  empty?: string;
  figure: (t: Theme, w: number) => { data: unknown[]; layout?: Record<string, unknown> };
  chartLabel: string;
  onPointClick?: (p: PlotPoint) => void;
  note: ReactNode;
}

/** Figures on the left (on top on the phone), chart beside them, one line of explanation below. */
function Frame(f: FrameProps) {
  return (
    <section className={f.loading ? 'ovw is-loading' : 'ovw'} aria-label={f.label} aria-busy={f.loading || undefined}>
      <DS.StatGroup className="ovw__figs" aria-label={`${f.label}: Kennzahlen`}>
        {f.figs}
      </DS.StatGroup>
      <div className="ovw__chart">
        {f.loading ? (
          <DS.Loading rows={4} label={`${f.label} wird geladen`} />
        ) : f.empty ? (
          <DS.EmptyState compact symbol={false} title="Nichts zu zeigen">
            {f.empty}
          </DS.EmptyState>
        ) : (
          <Plot aria-label={f.chartLabel} figure={f.figure as never} onPointClick={f.onPointClick} />
        )}
      </div>
      <p className="ovw__note">{f.note}</p>
    </section>
  );
}

const Tile = ({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) => (
  <DS.StatTile label={label} value={value} hint={hint ?? NB} />
);

// ---------- Aktien ----------

function StockOverview({ rows, loading }: ClassOverviewProps) {
  const open = useOpen();
  const dots = useMemo(() => moverDots(rows), [rows]);
  const b = useMemo(() => breadth(rows), [rows]);
  const total = useMemo(() => sumVolume(rows), [rows]);
  const traded = rows.filter((r) => (r.volume ?? 0) > 0).length;
  // The biggest move among the traded ones (token-price jumps are already unknown, see changeLookup).
  const move = dots.reduce<(typeof dots)[number] | undefined>((m, d) => (!m || Math.abs(d.change) > Math.abs(m.change) ? d : m), undefined);
  const figure = useCallback((t: Theme, w: number) => moversChart(t, w, dots), [dots]);
  const hidden = rows.length - traded;
  return (
    <Frame
      label="Aktien im Überblick"
      loading={loading}
      empty={dots.length ? undefined : 'Keine der gefilterten Aktien wurde in den letzten 24 Stunden gehandelt.'}
      figs={
        <>
          <Tile label="Marktbreite" value={`▲${NB}${de(b.up)} · ▼${NB}${de(b.down)}`} hint={`${de(b.flat)} unverändert`} />
          <Tile label="Gehandelt" value={`${de(traded)} von ${de(rows.length)}`} hint={total ? `Umsatz ${short(total)}${NB}€` : undefined} />
          <Tile label="Stärkste Bewegung" value={move ? changeText(move.change) : '–'} hint={move?.name} />
        </>
      }
      figure={figure}
      chartLabel="Aktien: Umsatz in 24 Stunden gegen Veränderung zum Vortag, Punktfläche nach Trades; ein Punkt öffnet die Aktie"
      onPointClick={open}
      note={
        <>
          Jeder Punkt eine in 24 h gehandelte Aktie: rechts viel Umsatz, oben gestiegen, Fläche nach Trades.
          {hidden > 0 && ` ${de(hidden)} ohne Umsatz nicht gezeigt.`}
        </>
      }
    />
  );
}

// ---------- Anleihen ----------

function BondOverview({ rows, now, loading }: ClassOverviewProps) {
  const open = useOpen();
  const rate = useMainInterestRate();
  const reserve = rate.data?.reserveInterestRate;
  const dots = useMemo(() => bondDots(rows, now), [rows, now]);
  const all = rows.filter((r) => r.group === 'BOND').length;
  const med = median(dots.map((d) => d.perDay));
  const better = reserve != null ? dots.filter((d) => d.perDay > reserve).length : undefined;
  const figure = useCallback((t: Theme, w: number) => bondChart(t, w, dots, reserve, med), [dots, reserve, med]);
  return (
    <Frame
      label="Anleihen im Überblick"
      loading={loading}
      empty={dots.length ? undefined : 'Keine der gefilterten Anleihen hat gerade einen Brief – ohne Angebot gibt es keine Rendite zum Kaufen.'}
      figs={
        <>
          <Tile label="Median / Tag" value={med == null ? '–' : ratePct(med)} hint="zum Brief" />
          <Tile label="Einlage / Tag" value={reserve == null ? '–' : ratePct(reserve)} hint="Zentralbank, täglich" />
          <Tile
            label="Besser als Einlage"
            value={better == null ? '–' : `${de(better)} von ${de(dots.length)}`}
            hint={`${de(dots.length)} von ${de(all)} mit Brief`}
          />
        </>
      }
      figure={figure}
      chartLabel="Anleihen: Rendite pro Tag zum Brief gegen Restlaufzeit, beide logarithmisch, mit Einlagezins pro Tag; ein Punkt öffnet die Anleihe"
      onPointClick={open}
      note="Rendite pro Tag zum Brief bis Fälligkeit, beide Achsen logarithmisch. Über der gepunkteten Linie bringt die Anleihe mehr als die Zentralbankeinlage."
    />
  );
}

// ---------- Repos ----------

function RepoOverview({ rows, now, loading }: ClassOverviewProps) {
  const open = useOpen();
  const rate = useMainInterestRate();
  const reserve = rate.data?.reserveInterestRate;
  const dots = useMemo(() => repoDots(rows, now), [rows, now]);
  const system = dots.filter((d) => d.system).length;
  const medRate = median(dots.map((d) => d.rate));
  const medLeft = median(dots.map((d) => d.left));
  const above = reserve != null ? dots.filter((d) => (ratePerDay(d.rate, d.left) ?? 0) > reserve).length : undefined;
  const figure = useCallback((t: Theme, w: number) => repoChart(t, w, dots, reserve), [dots, reserve]);
  return (
    <Frame
      label="Repos im Überblick"
      loading={loading}
      empty={dots.length ? undefined : 'Keine laufenden Repos unter diesem Filter.'}
      figs={
        <>
          <Tile label="Laufende Repos" value={de(dots.length)} hint={`davon ${de(system)} System-Repos`} />
          <Tile label="Zins · Median" value={medRate == null ? '–' : `${medRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${NB}%`} hint={medLeft == null ? 'bis Fälligkeit' : `bis Fälligkeit · ${span(medLeft)}`} />
          <Tile label="Über Einlage" value={above == null ? '–' : `${de(above)} von ${de(dots.length)}`} hint={reserve == null ? undefined : `pro Tag, Einlage ${ratePct(reserve)}`} />
        </>
      }
      figure={figure}
      chartLabel="Repos: Zins der Anleihe bis Fälligkeit gegen Restlaufzeit, beide logarithmisch, mit dem Einlagezins für dieselbe Zeit; ein Punkt öffnet das Repo"
      onPointClick={open}
      note="Zins der zugrunde liegenden Anleihe für die ganze Laufzeit. Punkte über der gepunkteten Linie zahlen pro Tag mehr als die Zentralbankeinlage."
    />
  );
}

// ---------- Coins ----------

function CoinOverview({ rows, now, loading }: ClassOverviewProps) {
  const open = useOpen();
  const stats = useMinimalStats();
  const coins = useMemo(() => [...rows].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, COINS), [rows]);
  const asins = useMemo(() => coins.map((c) => c.asin), [coins]);
  const hist = useDailyHistoriesState(asins);
  // hist.data is a new object on every render; the loaded keys say when its content changed.
  const histKey = `${Object.keys(hist.data).join(',')}|${hist.isLoading}`;
  const series: CoinSeries[] = useMemo(
    () => coins.map((c) => ({ asin: c.asin, name: c.name, points: lastDays(closes(hist.data[c.asin]), 30, now) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coins, now, histKey],
  );
  const main = coins[0];
  const market = stats.data?.tradeVolume24h;
  const figure = useCallback((t: Theme, w: number) => coinChart(t, w, series), [series]);
  return (
    <Frame
      label="Coins im Überblick"
      loading={loading || hist.isLoading}
      empty={series.some((s) => s.points.length > 1) ? undefined : 'Für die gefilterten Coins gibt es noch keine Tagesschlusskurse.'}
      figs={
        <>
          <DS.StatTile label={main ? `${main.name} · Kurs` : 'Kurs'} value={main?.last ?? '–'} change={main?.change ?? undefined} hint={main?.change == null ? NB : undefined} />
          <Tile
            label="Umsatz 24 h"
            value={main?.volume != null ? `${short(main.volume)}${NB}€` : '–'}
            hint={main?.volume != null && market ? `${share(main.volume / market)} des Marktumsatzes` : undefined}
          />
          <Tile
            label="Spread"
            value={main?.spread != null ? `${main.spread.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${NB}%` : '–'}
            hint={main?.bid != null && main?.ask != null ? `Geld ${short(main.bid)} · Brief ${short(main.ask)}` : undefined}
          />
        </>
      }
      figure={figure}
      chartLabel="Coins: Tagesschlusskurse der letzten 30 Tage, darunter der Tagesumsatz"
      onPointClick={open}
      note={coins.length > 1 ? 'Tagesschlusskurse der letzten 30 Tage, Start = 100.' : 'Tagesschlusskurse der letzten 30 Tage, darunter der Umsatz je Tag.'}
    />
  );
}

// ---------- Indizes ----------

/** ETFs (from the most traded list – there is no ETF list) with their base index. */
function useEtfCoverage() {
  const traded = useMostTraded('ETF', 50);
  const asins = useMemo(() => (traded.data?.content ?? []).map((r) => r.listing.securityIdentifier).slice(0, MAX_SERIES), [traded.data]);
  const etfs = useEtfs(asins);
  return { etfs: etfs.data, isLoading: traded.isLoading || etfs.isLoading };
}

function IndexOverview({ rows, loading }: ClassOverviewProps) {
  const open = useOpen();
  const list = useIndexes();
  const coverage = useEtfCoverage();
  // Indexes with a value (calculated in the last days), most often calculated first.
  const priced = useMemo(() => rows.filter((r) => r.last != null).sort((a, b) => (b.trades ?? 0) - (a.trades ?? 0)).slice(0, MAX_SERIES), [rows]);
  const asins = useMemo(() => priced.map((r) => r.asin), [priced]);
  const hist = useDailyHistoriesState(asins);
  // hist.data is a new object on every render; the loaded keys say when its content changed.
  const histKey = `${Object.keys(hist.data).join(',')}|${hist.isLoading}`;
  const members = useMemo(() => new Map((list.data?.content ?? []).map((i) => [i.listing.securityIdentifier, i.membersCount ?? 0])), [list.data]);
  const ended = useMemo(
    () => (list.data?.content ?? []).filter((i) => (i.listing as { endDate?: number | null }).endDate != null).length,
    [list.data],
  );
  const etfsByIndex = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of coverage.etfs) if (e.baseIndexAsin && !e.baseIndexEnded) m.set(e.baseIndexAsin, [...(m.get(e.baseIndexAsin) ?? []), e.name ?? e.listing?.name ?? '']);
    return m;
  }, [coverage.etfs]);
  const bars = useMemo(
    () => indexBars(priced.map((r) => ({ asin: r.asin, name: r.name })), hist.data, members, etfsByIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priced, members, etfsByIndex, histKey],
  );
  const med = median(bars.map((b) => b.change));
  const covered = rows.filter((r) => etfsByIndex.has(r.asin)).length;
  const figure = useCallback((t: Theme, w: number) => indexChart(t, w, bars), [bars]);
  const total = list.data?.content.length ?? rows.length;
  return (
    <Frame
      label="Indizes im Überblick"
      loading={loading || hist.isLoading}
      empty={bars.length ? undefined : 'Für die gefilterten Indizes gibt es noch keine zwei Tagesschlusskurse.'}
      figs={
        <>
          <Tile label="Indizes" value={`${de(total - ended)} laufend`} hint={`${de(ended)} beendet`} />
          <Tile label="Median" value={med == null ? '–' : changeText(med)} hint={`seit Verkettung, ${de(bars.length)} Indizes`} />
          <Tile label="Mit ETF" value={coverage.isLoading ? '…' : de(covered)} hint={`${de(coverage.etfs.length)} ETFs im Handel`} />
        </>
      }
      figure={figure}
      chartLabel="Indizes: Veränderung seit der letzten Verkettung als Balken, mit Mitgliederzahl und ETF; ein Balken öffnet den Index"
      onPointClick={open}
      note={`Veränderung seit der letzten Verkettung (Tagesschlusskurse) der ${de(bars.length)} zuletzt berechneten Indizes.`}
    />
  );
}

// ---------- ETFs ----------

function EtfOverview({ rows, loading }: ClassOverviewProps) {
  const open = useOpen();
  const shown = useMemo(() => [...rows].sort((a, b) => (b.trades ?? 0) - (a.trades ?? 0)).slice(0, MAX_SERIES), [rows]);
  const etfs = useEtfs(useMemo(() => shown.map((r) => r.asin), [shown]));
  const asins = useMemo(
    () => [...new Set([...shown.map((r) => r.asin), ...etfs.data.flatMap((e) => (e.baseIndexAsin ? [e.baseIndexAsin] : []))])],
    [shown, etfs.data],
  );
  const hist = useDailyHistoriesState(asins);
  // hist.data is a new object on every render; the loaded keys say when its content changed.
  const histKey = `${Object.keys(hist.data).join(',')}|${hist.isLoading}`;
  const pairs = useMemo(
    () =>
      etfs.data
        .flatMap((e) => {
          const pair = etfPair({ ...e, asin: e.listing?.securityIdentifier ?? '', name: e.name ?? e.listing?.name ?? '' }, hist.data);
          return pair ? [pair] : [];
        })
        .sort((a, b) => b.etf - a.etf) as EtfPair[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [etfs.data, histKey],
  );
  const gap = median(pairs.map((p) => Math.abs(p.gap)));
  const fees = etfs.data.map((e) => e.managementFeePercent).filter((x): x is number => x != null);
  const feeText = fees.length ? (Math.min(...fees) === Math.max(...fees) ? `${de(fees[0])}${NB}%` : `${de(Math.min(...fees))}–${de(Math.max(...fees))}${NB}%`) : '–';
  const ended = etfs.data.filter((e) => e.baseIndexEnded).length;
  const figure = useCallback((t: Theme, w: number) => etfChart(t, w, pairs), [pairs]);
  return (
    <Frame
      label="ETFs im Überblick"
      loading={loading || etfs.isLoading || hist.isLoading}
      empty={pairs.length ? undefined : 'Für die gefilterten ETFs gibt es noch keine gemeinsamen Tagesschlusskurse mit ihrem Index.'}
      figs={
        <>
          <Tile label="Abstand · Median" value={gap == null ? '–' : `${gap.toLocaleString('de-DE', { maximumFractionDigits: 1 })}${NB}Pp.`} hint="ETF zum Index, Betrag" />
          <Tile label="Gebühr" value={feeText} hint={`${de(etfs.data.length)} ETFs`} />
          <Tile label="Index beendet" value={de(ended)} hint={ended ? 'folgen keinem Index mehr' : 'alle folgen ihrem Index'} />
        </>
      }
      figure={figure}
      chartLabel="ETFs: Veränderung von ETF und Basisindex über dieselben Tage; ein Punkt öffnet ETF oder Index"
      onPointClick={open}
      note="Veränderung über dieselben Tage (seit dem späteren Start), Tagesschlusskurse. Rechts der Abstand in Prozentpunkten."
    />
  );
}

// ---------- Mehrere Klassen ----------

function MixedOverview({ rows, loading, onSelectType }: ClassOverviewProps) {
  const list = useMemo(() => classRows(rows), [rows]);
  const b = useMemo(() => breadth(rows), [rows]);
  const total = useMemo(() => sumVolume(rows), [rows]);
  const biggest = [...list].sort((a, c) => c.volume - a.volume)[0];
  const figure = useCallback((t: Theme, w: number) => classChart(t, w, list), [list]);
  const select = useCallback(
    (pt: PlotPoint) => {
      const g = Array.isArray(pt.customdata) ? pt.customdata[0] : pt.customdata;
      if (typeof g === 'string' && g) onSelectType(g as Group);
    },
    [onSelectType],
  );
  return (
    <Frame
      label="Klassen im Überblick"
      loading={loading}
      empty={list.length ? undefined : 'Keine Wertpapiere unter diesem Filter.'}
      figs={
        <>
          <Tile label="Marktbreite" value={`▲${NB}${de(b.up)} · ▼${NB}${de(b.down)}`} hint={`${de(b.flat)} unverändert`} />
          <Tile label="Umsatz 24 h" value={`${short(total)}${NB}€`} hint={`${de(rows.filter((r) => (r.volume ?? 0) > 0).length)} gehandelt`} />
          <Tile label="Größter Umsatz" value={biggest?.label ?? '–'} hint={biggest && total ? `${share(biggest.volume / total)} des Umsatzes` : undefined} />
        </>
      }
      figure={figure}
      chartLabel="Gestiegene und gefallene Wertpapiere je Klasse mit Umsatz; eine Klasse antippen zeigt nur diese"
      onPointClick={select}
      note="Gestiegen rechts, gefallen links, je Klasse zum Vortag – eine Klasse anklicken filtert die Liste."
    />
  );
}
