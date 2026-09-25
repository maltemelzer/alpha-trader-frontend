import { useMemo, useRef, type CSSProperties } from 'react';
import { DS } from '../ds';
import { useCompanyHistograms, useEntityHistory } from '../api/queries';
import { Plot } from '../charts/Plot';
import { short } from '../lib/format';
import { chronicleChart, distributionChart } from './charts';
import { chronicle, placement, rankRows, usedLanes, type ChronicleEvent, type HistogramKey } from './profile';

const NBSP = String.fromCharCode(0xa0);
const CELLS = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * „Einordnung“: where the company stands among all companies, figure by figure. Left the chosen
 * figure's distribution (the company's bin highlighted), right every figure with its decile as a
 * ten-cell gauge. Phone: the distribution on top, the figures below.
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
  return (
    <div className="rank">
      <section ref={chartRef} className="rank__chart" aria-label={`Verteilung ${row.label}`}>
        <div className="rank__head">
          <h3 className="rank__title">{row.label} aller Unternehmen</h3>
          <span className="rank__place">{placement(row.decile)}</span>
        </div>
        <p className="rank__asof">{asOf ? `Tagesabschluss ${DS.format.dateTime(Date.parse(asOf))} · Anzahl logarithmisch` : NBSP}</p>
        <div className="rank__plot">
          <Plot aria-label={`Verteilung ${row.label}, Säule dieses Unternehmens hervorgehoben`} figure={(t, w) => distributionChart(t, w, row)} />
        </div>
      </section>
      <ul className="rank__list" aria-label="Kennzahlen im Vergleich">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" className="rank-row" aria-pressed={r.key === row.key} onClick={() => {
                onSelect(r.key);
                // Phone: the panel scrolls as a whole – bring the chart back into view.
                chartRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
              }}
            >
              <span className="rank-row__label">{r.label}</span>
              <span className="rank-row__value">
                {short(r.value)}
                {r.unit === '€' ? NBSP + '€' : NBSP + 'Stk.'}
              </span>
              <span className="rank-row__cells" aria-hidden="true">
                {CELLS.map((c) => (
                  <span key={c} className={`rank-row__cell${c <= r.decile ? ' rank-row__cell--on' : ''}`} />
                ))}
              </span>
              <span className="rank-row__place">{placement(r.decile)}</span>
            </button>
          </li>
        ))}
      </ul>
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
