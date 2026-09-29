import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useCapitalMeasures, useDividendPayments, useMergers } from '../api/queries';
import { Plot, type PlotPoint } from '../charts/Plot';
import { MiniStats, type MiniStat } from '../app/phone';
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

/** The view's key figures as one compact row (label over value) – not three big tiles. */
function Figures({ items }: { items: MiniStat[] }) {
  // wide: packed to the left; phone: the row shares the width
  const isPhone = useIsPhone();
  const columns = isPhone ? undefined : `repeat(${items.length}, max-content) minmax(0, 1fr)`;
  return <MiniStats className="capital__stats" label="Kennzahlen" items={items} columns={columns} />;
}

/** „2 T 17 h · Digital Savings Bank“ – countdown to the next date and whose it is. */
function Next({ at, name }: { at?: number; name?: string }) {
  if (!at) return <>–</>;
  return (
    <>
      <DS.Countdown to={at} short />
      {name && <span className="capital__next"> · {name}</span>}
    </>
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
      <Figures
        items={[
          { label: 'Maßnahmen', value: loading ? '–' : String(totals.count) },
          { label: 'Erhöhungen', value: loading ? '–' : <DS.Amount value={totals.increase} compact /> },
          { label: 'Herabsetzungen', value: loading ? '–' : <DS.Amount value={totals.reduction} compact /> },
        ]}
      />
      <ChartAndList
        title="Zeichnungsfristen"
        chart={
          <>
          {loading ? (
            <DS.Loading rows={4} />
          ) : rows.length ? (
            <Plot aria-label="Zeichnungsfristen als Zeitstrahl" figure={(t, w) => timelineChart(t, w, rows, now)} />
          ) : (
            <DS.EmptyState compact as="h3" title="Keine Kapitalmaßnahmen">
              Gerade läuft keine Kapitalerhöhung oder -herabsetzung.
            </DS.EmptyState>
          )}
          </>
        }
        table={
          <>
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
          </>
        }
        list={
          <>
          <List label="Kapitalmaßnahmen" head={['Unternehmen · Art · Preis', 'Volumen · Frist']} loading={loading} empty="Keine Kapitalmaßnahmen.">
            {rows.map((r) => (
              <Row
                key={r.id}
                href={`/unternehmen/${r.asin}`}
                name={r.name}
                // the countdown's label says the status (Beginn in = geplant, Ende in = läuft, beendet)
                meta={
                  <>
                    {r.kind === 'increase' ? '▲ Erhöhung' : '▼ Herabsetzung'} · zu <DS.Amount value={r.price} compact />
                  </>
                }
                value={<DS.Amount value={r.cashVolume} compact />}
                when={
                  r.status === 'planned' ? (
                    <DS.Countdown to={r.startDate} label="Beginn in" short />
                  ) : (
                    <DS.Countdown to={r.endDate} label="Ende in" short endedText="beendet" />
                  )
                }
              />
            ))}
          </List>
          </>
        }
      />
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
      <Figures
        items={[
          { label: 'Angekündigt', value: q.isLoading ? '–' : String(rows.length) },
          { label: 'Höchstvolumen', value: q.isLoading ? '–' : <DS.Amount value={cap} compact /> },
          { label: 'Nächste', value: <Next at={next} name={rows.find((r) => r.startDate === next)?.name} /> },
        ]}
      />
      <ChartAndList
        title="Höchstvolumen je Unternehmen"
        chart={
          <>
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
          </>
        }
        table={
          <>
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
          </>
        }
        list={
          <>
          <List label="Angekündigte Gewinnausschüttungen" head={['Unternehmen · Termin', 'Höchstvolumen']} loading={q.isLoading} empty="Keine Ausschüttungen angekündigt.">
            {rows.map((r) => (
              <Row
                key={r.id}
                href={`/unternehmen/${r.asin}`}
                name={r.name}
                meta={dateText(r.startDate)}
                value={<DS.Amount value={r.maximalCashVolume} compact />}
                when={<DS.Countdown to={r.startDate} label="in" short endedText="fällig" />}
              />
            ))}
          </List>
          </>
        }
      />
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
      <Figures
        items={[
          { label: 'Fusionen', value: q.isLoading ? '–' : String(rows.length) },
          { label: 'Übernehmende', value: q.isLoading ? '–' : String(acquirers) },
          { label: 'Nächste', value: <Next at={next} name={rows.find((r) => r.startDate === next)?.name} /> },
        ]}
      />
      <ChartAndList
        title="Wer übernimmt"
        chart={
          <>
          {q.isLoading ? (
            <DS.Loading rows={4} />
          ) : rows.length ? (
            <Plot aria-label="Anzahl der Fusionen je übernehmendem Unternehmen" onPointClick={open} figure={(t, w) => mergerChart(t, w, groups)} />
          ) : (
            <DS.EmptyState compact as="h3" title="Keine Fusionen angekündigt" />
          )}
          </>
        }
        table={
          <>
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
          </>
        }
        list={
          <>
          <List label="Angekündigte Fusionen" head={['Firma → geht auf in', 'Höchstens · Termin']} loading={q.isLoading} empty="Keine Fusionen angekündigt.">
            {rows.map((r) => (
              <Row
                key={r.id}
                href={`/unternehmen/${r.asin}`}
                name={r.name}
                meta={
                  r.acquirerAsin ? (
                    <a className="capital__link" href={`/unternehmen/${r.acquirerAsin}`}>
                      → {r.acquirer}
                    </a>
                  ) : (
                    `→ ${r.acquirer}`
                  )
                }
                value={<DS.Amount value={r.maximalCashVolume} compact />}
                when={
                  <>
                    {dateText(r.startDate)} · <DS.Countdown to={r.startDate} label="in" short endedText="fällig" />
                  </>
                }
              />
            ))}
          </List>
          </>
        }
      />
    </>
  );
}

/**
 * Chart + details. Wide: two cards (chart above, table below). Phone: one card that scrolls as a whole –
 * the chart first (scrolls away), then the rows as a compact list – so the list gets the full height
 * instead of a small box under the chart.
 */
function ChartAndList({ title, chart, table, list }: { title: string; chart: ReactNode; table: ReactNode; list: ReactNode }) {
  const isPhone = useIsPhone();
  if (isPhone)
    return (
      <DS.Card flush className="panel">
        <div className="panel__fill scroll capital__scroll">
          <section className="capital__phonechart" aria-label={title}>
            <h3 className="capital__h">{title}</h3>
            <div className="capital__plot">{chart}</div>
          </section>
          {list}
        </div>
      </DS.Card>
    );
  return (
    <>
      <DS.Card className="panel" title={title}>
        <div className="panel__fill capital__chart">{chart}</div>
      </DS.Card>
      <DS.Card flush className="panel">
        <div className="panel__fill scroll capital__table">{table}</div>
      </DS.Card>
    </>
  );
}

/** Phone row: name + meta left, amount + when right; the whole row opens the company. */
function Row({ href, name, meta, value, when }: { href: string; name: string; meta: ReactNode; value: ReactNode; when: ReactNode }) {
  return (
    <li className="capital__row">
      {/* the link covers the whole row (≥ 44 px tap target); the name is its visible label */}
      <a className="capital__rowlink" href={href} aria-label={name} />
      <span className="capital__rowname" aria-hidden>
        {name}
      </span>
      <span className="capital__rowmeta">{meta}</span>
      <span className="capital__rowval">{value}</span>
      <span className="capital__rowwhen">{when}</span>
    </li>
  );
}

/** Phone list with a one-line head naming the columns (the rows carry no labels). */
function List({
  label,
  head,
  loading,
  empty,
  children,
}: {
  label: string;
  head: [string, string];
  loading: boolean;
  empty: string;
  children: ReactNode[];
}) {
  if (loading) return <DS.Loading rows={4} />;
  if (!children.length) return <p className="capital__empty">{empty}</p>;
  return (
    <>
      <div className="capital__listhead" aria-hidden>
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      <ul className="capital__list" aria-label={label}>
        {children}
      </ul>
    </>
  );
}

const dateText = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
