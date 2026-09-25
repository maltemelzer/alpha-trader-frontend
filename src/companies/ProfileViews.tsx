import { useMemo, useRef, type CSSProperties } from 'react';
import { DS } from '../ds';
import { useCompanyHistograms, useEntityHistory } from '../api/queries';
import { Plot } from '../charts/Plot';
import { short } from '../lib/format';
import { chronicleChart, distributionChart } from './charts';
import {
  chronicle,
  rankRows,
  sharePct,
  standingText,
  usedLanes,
  type ChronicleEvent,
  type HistogramKey,
  type RankRow,
  type Standing,
} from './profile';

const NBSP = String.fromCharCode(0xa0);

/**
 * The company's position as one bar over all companies (or securities), 0 % left, 100 % right:
 * pale ink blue = have less, full ink blue = same size class, empty = have more; a tick marks the
 * estimated position. Same colours as the distribution chart.
 */
export function StandingBar({ s, className = '' }: { s: Standing | undefined; className?: string }) {
  const style = s
    ? ({ '--below': `${s.below * 100}%`, '--same': `${s.same * 100}%`, '--at': `${s.share * 100}%` } as CSSProperties)
    : undefined;
  return (
    <span className={`standing ${className}`} style={style} aria-hidden="true">
      {s && (
        <>
          <span className="standing__below" />
          <span className="standing__same" />
          <span className="standing__at" />
        </>
      )}
    </span>
  );
}

const unitOf = (r: Pick<RankRow, 'unit'>) => (r.unit === '€' ? `${NBSP}€` : `${NBSP}Stk.`);

/** One figure: label and value, the standing bar and „mehr als 87 %“ – a button (Einordnung) or a link (Überblick). */
export function RankRowContent({ r }: { r: RankRow }) {
  return (
    <>
      <span className="rank-row__label">{r.label}</span>
      <span className="rank-row__value">
        {short(r.value)}
        {unitOf(r)}
      </span>
      <StandingBar s={r.standing} className="rank-row__bar" />
      <span className="rank-row__place">{standingText(r.standing, r.population, false)}</span>
    </>
  );
}

/**
 * „Einordnung“: where the company stands, figure by figure. Left the chosen figure's distribution
 * (share per size class on a linear axis, the company's class marked, smaller classes shaded),
 * right every figure with its position as a bar – first against all companies, then the figures
 * the API compares with all securities. Phone: the distribution on top, the figures below.
 */
export function RankingView({
  companyId,
  selected,
  onSelect,
  asOf,
}: {
  companyId: string | undefined;
  selected: string | null;
  onSelect: (key: HistogramKey) => void;
  /** date of the latest daily snapshot – the histograms carry its values */
  asOf?: string;
}) {
  const q = useCompanyHistograms(companyId);
  const rows = useMemo(() => rankRows(q.data), [q.data]);
  const chartRef = useRef<HTMLElement>(null);
  if (q.isError) return <DS.EmptyState compact as="h3" title="Einordnung nicht verfügbar" />;
  if (!rows.length) return q.isLoading || !companyId ? <DS.Loading rows={6} label="Einordnung wird geladen" /> : <DS.EmptyState compact as="h3" title="Keine Vergleichsdaten" />;
  const row = rows.find((r) => r.key === selected) ?? rows[0];
  const s = row.standing;
  const groups = (['companies', 'securities'] as const)
    .map((p) => ({ population: p, rows: rows.filter((r) => r.population === p) }))
    .filter((g) => g.rows.length);
  const lead = standingText(s, row.population);
  return (
    <div className="rank">
      <section ref={chartRef} className="rank__chart" aria-label={`Verteilung ${row.label}`}>
        <div className="rank__head">
          <h3 className="rank__title">{row.label}</h3>
          <span className="rank__value">
            {short(row.value)}
            {unitOf(row)}
          </span>
        </div>
        <p className="rank__lead">{lead.charAt(0).toUpperCase() + lead.slice(1)}</p>
        <div className="rank__split">
          <StandingBar s={s} className="rank__bar" />
          <span className="rank__legend">
            {s ? (
              <>
                <span className="rank__key rank__key--below">{sharePct(s.below)} weniger</span>
                <span className="rank__key rank__key--same">{sharePct(s.same)} ähnlich</span>
                <span className="rank__key rank__key--above">{sharePct(s.above)} mehr</span>
              </>
            ) : (
              NBSP
            )}
          </span>
        </div>
        <p className="rank__asof">
          {row.population === 'securities'
            ? `Vergleich mit allen ${row.total.toLocaleString('de-DE')} Wertpapieren – auch Anleihen, Repos und Immobilien, nicht nur Aktien.`
            : `${row.total.toLocaleString('de-DE')} Unternehmen`}
          {asOf ? ` · Tagesabschluss ${DS.format.dateTime(Date.parse(asOf))}` : ''}
        </p>
        <div className="rank__plot">
          <Plot
            aria-label={`Verteilung ${row.label}: Anteil je Größenklasse, die Klasse dieses Unternehmens markiert`}
            figure={(t, w) => distributionChart(t, w, row)}
          />
        </div>
      </section>
      <div className="rank__list" aria-label="Kennzahlen im Vergleich" role="group">
        {groups.map((g) => (
          <section key={g.population} className="rank__group">
            <h4 className="rank__group-title">
              {g.population === 'companies' ? 'Unter allen Unternehmen' : 'Unter allen Wertpapieren'}
            </h4>
            <ul className="rank__rows">
              {g.rows.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    className="rank-row"
                    aria-pressed={r.key === row.key}
                    aria-label={`${r.label}: ${standingText(r.standing, r.population)}`}
                    onClick={() => {
                      onSelect(r.key);
                      // Phone: the panel scrolls as a whole – bring the chart back into view.
                      chartRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
                    }}
                  >
                    <RankRowContent r={r} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

const COLUMNS = [
  { key: 'date', label: 'Datum', width: 150, render: (e: ChronicleEvent) => DS.format.dateTime(e.date) },
  { key: 'lane', label: 'Art', width: 120 },
  { key: 'text', label: 'Ereignis', mobile: 'title' as const },
];

/**
 * „Chronik“: the company's history (GET /api/v2/history) as a timeline with one lane per kind of
 * event, the entries below, newest first.
 */
export function ChronicleView({ companyId }: { companyId: string | undefined }) {
  const q = useEntityHistory(companyId);
  const events = useMemo(() => chronicle(q.data?.content), [q.data]);
  const lanes = useMemo(() => usedLanes(events), [events]);
  const newestFirst = useMemo(() => [...events].reverse(), [events]);
  if (q.isError) return <DS.EmptyState compact as="h3" title="Chronik nicht verfügbar" />;
  if (!events.length) return q.isLoading || !companyId ? <DS.Loading rows={6} label="Chronik wird geladen" /> : <DS.EmptyState compact as="h3" title="Noch keine Ereignisse" />;
  return (
    <div className="chron" style={{ '--chron-lanes': lanes.length } as CSSProperties}>
      <div className="chron__plot">
        <Plot aria-label="Zeitstrahl der Ereignisse nach Art" figure={(t, w) => chronicleChart(t, w, events, lanes)} />
      </div>
      <div className="chron__list">
        <DS.DataTable columns={COLUMNS} rows={newestFirst} rowKey="id" density="sm" stack="auto" caption="Ereignisse, neueste zuerst" />
      </div>
    </div>
  );
}
