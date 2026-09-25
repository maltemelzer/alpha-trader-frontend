import { useMemo } from 'react';
import { DS } from '../ds';
import { useCapitalMeasures } from '../api/queries';
import { Plot } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { timelineChart } from './charts';
import { STATUS_LABEL, measureRows, measureTotals, type MeasureRow } from './derive';
import './CapitalPage.css';

const STATUS = { planned: 'pending', running: 'partial', ended: 'filled' } as const;

/**
 * Capital increases and reductions of all companies: key figures, the subscription phases as a
 * timeline, the details as a table (row → company).
 */
export function CapitalPage() {
  const onLinkClick = useInternalLinks();
  const inc = useCapitalMeasures('increase');
  const red = useCapitalMeasures('reduction');
  // "Now" is the time of the last fetch: status and the today line move with every poll.
  const now = Math.max(inc.dataUpdatedAt, red.dataUpdatedAt);
  const rows = useMemo(() => measureRows(inc.data?.content ?? [], red.data?.content ?? [], now), [inc.data, red.data, now]);
  const totals = measureTotals(rows);
  const loading = inc.isLoading || red.isLoading;

  return (
    <div className="page capital" onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Kapitalmaßnahmen" meta={<span>Laufende und geplante Erhöhungen und Herabsetzungen</span>} />
      <div className="page__body capital__body">
        <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Kennzahlen">
          <DS.StatTile label="Maßnahmen" value={loading ? '–' : String(totals.count)} />
          <DS.StatTile label="Erhöhungen" value={totals.increase} compact hint="Volumen" />
          <DS.StatTile label="Herabsetzungen" value={totals.reduction} compact hint="Volumen" />
        </DS.StatGroup>
        <DS.Card className="panel" title="Zeichnungsfristen">
          <div className="panel__fill capital__chart">
            {loading ? (
              <DS.Loading rows={4} />
            ) : rows.length ? (
              <Plot aria-label="Zeichnungsfristen als Zeitstrahl" figure={(t, w) => timelineChart(t, w, rows, now)} />
            ) : (
              <DS.EmptyState compact as="h3" title="Keine Kapitalmaßnahmen">
                Gerade läuft keine Kapitalerhöhung oder -herabsetzung.
              </DS.EmptyState>
            )}
          </div>
        </DS.Card>
        <DS.Card flush className="panel">
          <div className="panel__fill scroll capital__table">
            <DS.DataTable
              density="sm"
              stack="auto"
              caption="Kapitalmaßnahmen"
              rows={rows}
              rowKey="id"
              getRowHref={(r: MeasureRow) => `/unternehmen/${r.asin}`}
              empty="Keine Kapitalmaßnahmen."
              columns={[
                { key: 'name', label: 'Unternehmen', mobile: 'title', sticky: true },
                { key: 'kind', label: 'Art', render: (r: MeasureRow) => (r.kind === 'increase' ? '▲ Erhöhung' : '▼ Herabsetzung') },
                {
                  key: 'status',
                  label: 'Status',
                  sortValue: (r: MeasureRow) => r.startDate,
                  render: (r: MeasureRow) => <DS.StatusLabel status={STATUS[r.status]}>{STATUS_LABEL[r.status]}</DS.StatusLabel>,
                },
                {
                  key: 'endDate',
                  label: 'Frist',
                  mobileWide: true,
                  sortValue: (r: MeasureRow) => r.endDate,
                  render: (r: MeasureRow) =>
                    r.status === 'planned' ? (
                      <DS.Countdown to={r.startDate} label="Beginn in" short />
                    ) : (
                      <DS.Countdown to={r.endDate} label="Ende in" short endedText="beendet" />
                    ),
                },
                { key: 'numberOfShares', label: 'Stück', type: 'number', mobile: false },
                { key: 'price', label: 'Preis', type: 'currency', compact: true },
                { key: 'cashVolume', label: 'Volumen', type: 'currency' },
              ]}
            />
          </div>
        </DS.Card>
      </div>
    </div>
  );
}
