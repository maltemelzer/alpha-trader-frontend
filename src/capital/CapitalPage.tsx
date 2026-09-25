import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useCapitalMeasures, useDividendPayments, useMergers } from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone } from '../lib/useMediaQuery';
import { useParamState } from '../lib/useParamState';
import { dividendChart, mergerChart, timelineChart } from './charts';
import {
  STATUS_LABEL,
  dividendRows,
  measureRows,
  measureTotals,
  mergerRows,
  mergersByAcquirer,
  nextDate,
  type DividendRow,
  type MeasureRow,
  type MergerRow,
} from './derive';
import './CapitalPage.css';

const STATUS = { planned: 'pending', running: 'partial', ended: 'filled' } as const;

const ART = [
  { value: 'kapital', label: 'Kapital' },
  { value: 'dividenden', label: 'Dividenden' },
  { value: 'fusionen', label: 'Fusionen' },
];

const META: Record<string, string> = {
  kapital: 'Laufende und geplante Erhöhungen und Herabsetzungen',
  dividenden: 'Angenommene Gewinnausschüttungen mit Termin',
  fusionen: 'Angenommene Fusionen mit Termin',
};

/**
 * Corporate actions of all companies, one kind per view (?art=kapital|dividenden|fusionen): key
 * figures, a chart, the details as a table (row → company).
 */
export function CapitalPage() {
  const onLinkClick = useInternalLinks();
  const isPhone = useIsPhone();
  const [art, setArt] = useParamState('art', 'kapital', ART);
  const switcher = (
    <DS.SegmentedControl size="sm" aria-label="Art der Maßnahme" fullWidth={isPhone} options={ART} value={art} onChange={setArt} />
  );

  return (
    <div className="page capital" onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Kapitalmaßnahmen" meta={<span>{META[art]}</span>} actions={isPhone ? undefined : switcher} />
      <div className={`page__body capital__body${isPhone ? ' capital__body--seg' : ''}`}>
        {isPhone && switcher}
        {art === 'dividenden' ? <Dividends /> : art === 'fusionen' ? <Mergers /> : <Measures />}
      </div>
    </div>
  );
}

/** Capital increases and reductions: the subscription phases as a timeline. */
function Measures() {
  const inc = useCapitalMeasures('increase');
  const red = useCapitalMeasures('reduction');
  // "Now" is the time of the last fetch: status and the today line move with every poll.
  const now = Math.max(inc.dataUpdatedAt, red.dataUpdatedAt);
  const rows = useMemo(() => measureRows(inc.data?.content ?? [], red.data?.content ?? [], now), [inc.data, red.data, now]);
  const totals = measureTotals(rows);
  const loading = inc.isLoading || red.isLoading;

  return (
    <>
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
          {loading ? (
            <DS.Loading rows={4} />
          ) : (
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
          )}
        </div>
      </DS.Card>
    </>
  );
}

const termColumn = {
  key: 'startDate',
  label: 'Termin',
  mobileWide: true,
  sortValue: (r: DividendRow) => r.startDate,
  render: (r: DividendRow) => (
    <span className="capital__term">
      {new Date(r.startDate).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      <DS.Countdown to={r.startDate} label="in" short endedText="fällig" />
    </span>
  ),
};

/** Click on a dot or bar → the company page; the ASIN sits at `index` of the point's customdata. */
function useOpenCompany(index: number) {
  const navigate = useNavigate();
  return (p: PlotPoint) => {
    const asin = p.customdata?.[index];
    if (asin) navigate(`/unternehmen/${asin}`);
  };
}

const capColumn = { key: 'maximalCashVolume', label: 'Höchstvolumen', mobileLabel: 'Höchstens', type: 'currency' as const };

/** Dividends announced by the companies: cap and due date. */
function Dividends() {
  const q = useDividendPayments();
  const open = useOpenCompany(2);
  const rows = useMemo(() => dividendRows(q.data?.content), [q.data]);
  const next = nextDate(rows, q.dataUpdatedAt);
  const cap = rows.reduce((s, r) => s + r.maximalCashVolume, 0);

  return (
    <>
      <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Kennzahlen">
        <DS.StatTile label="Anzahl" value={q.isLoading ? '–' : String(rows.length)} hint="angekündigt" />
        <DS.StatTile label="Höchstvolumen" value={cap} compact hint="zusammen, Obergrenze" />
        <DS.StatTile label="Nächste" value={next ? <DS.Countdown to={next} short /> : '–'} hint={next ? rows.find((r) => r.startDate === next)?.name : ' '} />
      </DS.StatGroup>
      <DS.Card className="panel" title="Höchstvolumen je Unternehmen">
        <div className="panel__fill capital__chart">
          {q.isLoading ? (
            <DS.Loading rows={4} />
          ) : rows.length ? (
            <Plot
              aria-label="Höchstvolumen der angekündigten Ausschüttungen, logarithmisch"
              onPointClick={open}
              figure={(t, w) => dividendChart(t, w, rows)} />
          ) : (
            <DS.EmptyState compact as="h3" title="Keine Ausschüttungen angekündigt" />
          )}
        </div>
      </DS.Card>
      <DS.Card flush className="panel">
        <div className="panel__fill scroll capital__table">
          {q.isLoading ? (
            <DS.Loading rows={4} />
          ) : (
            <DS.DataTable
              density="sm"
              stack="auto"
              caption="Angekündigte Gewinnausschüttungen"
              rows={rows}
              rowKey="id"
              getRowHref={(r: DividendRow) => `/unternehmen/${r.asin}`}
              empty="Keine Ausschüttungen angekündigt."
              columns={[{ key: 'name', label: 'Unternehmen', mobile: 'title', sticky: true }, termColumn, capColumn]}
            />
          )}
        </div>
      </DS.Card>
    </>
  );
}

/** Mergers: which company merges into which, grouped by the acquiring company. */
function Mergers() {
  const q = useMergers();
  const open = useOpenCompany(4);
  const isPhone = useIsPhone();
  const rows = useMemo(() => mergerRows(q.data?.content), [q.data]);
  const groups = useMemo(() => mergersByAcquirer(rows, isPhone ? 5 : 8), [rows, isPhone]);
  const acquirers = new Set(rows.map((r) => r.acquirerAsin || r.acquirer)).size;
  const next = nextDate(rows, q.dataUpdatedAt);

  return (
    <>
      <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Kennzahlen">
        <DS.StatTile label="Fusionen" value={q.isLoading ? '–' : String(rows.length)} hint="angekündigt" />
        <DS.StatTile label="Übernehmende" value={q.isLoading ? '–' : String(acquirers)} hint="Unternehmen" />
        <DS.StatTile label="Nächste" value={next ? <DS.Countdown to={next} short /> : '–'} hint={next ? rows.find((r) => r.startDate === next)?.name : ' '} />
      </DS.StatGroup>
      <DS.Card className="panel" title="Wer übernimmt">
        <div className="panel__fill capital__chart">
          {q.isLoading ? (
            <DS.Loading rows={4} />
          ) : rows.length ? (
            <Plot aria-label="Anzahl der Fusionen je übernehmendem Unternehmen" onPointClick={open} figure={(t, w) => mergerChart(t, w, groups)} />
          ) : (
            <DS.EmptyState compact as="h3" title="Keine Fusionen angekündigt" />
          )}
        </div>
      </DS.Card>
      <DS.Card flush className="panel">
        <div className="panel__fill scroll capital__table">
          {q.isLoading ? (
            <DS.Loading rows={4} />
          ) : (
            <DS.DataTable
              density="sm"
              stack="auto"
              caption="Angekündigte Fusionen"
              rows={rows}
              rowKey="id"
              getRowHref={(r: MergerRow) => `/unternehmen/${r.asin}`}
              empty="Keine Fusionen angekündigt."
              columns={[
                { key: 'name', label: 'Unternehmen', mobile: 'title', sticky: true },
                {
                  key: 'acquirer',
                  label: 'Geht auf in',
                  render: (r: MergerRow) =>
                    r.acquirerAsin ? (
                      <a className="capital__link" href={`/unternehmen/${r.acquirerAsin}`}>
                        → {r.acquirer}
                      </a>
                    ) : (
                      r.acquirer
                    ),
                },
                termColumn,
                capColumn,
              ]}
            />
          )}
        </div>
      </DS.Card>
    </>
  );
}
