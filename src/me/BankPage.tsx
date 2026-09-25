import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useCashLedger } from '../api/queries';
import { Plot } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { useParamState } from '../lib/useParamState';
import { useUrlSearch } from '../lib/useUrlSearch';
import {
  CATEGORY_LABEL,
  CATEGORY_SHORT,
  balanceLine,
  bucketSize,
  byCategory,
  colorOrder,
  filterRows,
  flowBuckets,
  inWindow,
  ledger,
  topSubjects,
  totals,
  type Direction,
  type LedgerRow,
} from './bank';
import { flowChart, inOutChart } from './bankCharts';
import { TransferSheet, useTransferAccounts } from './TransferSheet';
import './MePage.css';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RANGES = [
  { value: '24h', label: '24 Std.', ms: DAY },
  { value: '7T', label: '7 T', ms: 7 * DAY },
  { value: '30T', label: '30 T', ms: 30 * DAY },
  { value: 'alle', label: 'Alle', ms: undefined },
];
const WIDE_VIEWS = [
  { value: 'arten', label: 'Nach Art' },
  { value: 'posten', label: 'Größte Posten' },
];
const VIEWS = [
  { value: 'verlauf', label: 'Verlauf' },
  { value: 'arten', label: 'Arten' },
  { value: 'posten', label: 'Posten' },
  { value: 'buchungen', label: 'Buchungen' },
];
const DIRECTIONS = [
  { value: 'alle', label: 'Alle' },
  { value: 'ein', label: '▲ Ein' },
  { value: 'aus', label: '▼ Aus' },
];

const time = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
};
const date = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Amount with direction: „▲ +1,2 Mio. €“, neutral colour (cash flows are no price moves). */
function Flow({ value, compact = 'auto' }: { value: number; compact?: boolean | 'auto' }) {
  return (
    <span className="bank__flow">
      {value !== 0 && <span aria-hidden="true">{value > 0 ? '▲ ' : '▼ '}</span>}
      <DS.Amount value={value} signed compact={compact} />
    </span>
  );
}

/**
 * Bank: the money view of the player's organisation. Per account (private + companies run as CEO)
 * the balance over time with in- and outflows by category, in/out per category, the largest items
 * and a filterable statement with the running balance. Transfers from every own account to own
 * accounts or any player/company in a sheet.
 */
export function BankPage() {
  const onLinkClick = useInternalLinks();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const [params, setParams] = useSearchParams();
  const accounts = useTransferAccounts();
  const names = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const account = accounts.find((a) => a.id === params.get('konto')) ?? accounts[0];
  const logs = useCashLedger(account?.id);
  const [range, setRange] = useParamState('zeitraum', 'alle', RANGES);
  const [view, setView] = useParamState('ansicht', isWide ? 'arten' : 'verlauf', isWide ? WIDE_VIEWS : VIEWS);
  const [category, setCategory] = useParamState('art', 'alle', [{ value: 'alle' }, ...Object.keys(CATEGORY_LABEL).map((value) => ({ value }))]);
  const [direction, setDirection] = useParamState('richtung', 'alle', DIRECTIONS);
  const [text, setText, search] = useUrlSearch('suche', 400, []);
  const [sending, setSending] = useState(params.get('ueberweisen') === '1');
  const [done, setDone] = useState<string | null>(null);

  const now = logs.dataUpdatedAt;
  // the balance read together with the bookings; the account list may be a minute older
  const cash = logs.data?.cash ?? account?.cash ?? 0;
  const all = useMemo(
    () => (account ? ledger(logs.data?.content ?? [], account.id, cash, names) : []),
    [logs.data, account, cash, names],
  );
  const rows = useMemo(() => inWindow(all, RANGES.find((r) => r.value === range)?.ms, now), [all, range, now]);
  const sum = useMemo(() => totals(rows, cash), [rows, cash]);
  const cats = useMemo(() => byCategory(rows), [rows]);
  const subjects = useMemo(() => topSubjects(rows, isPhone ? 6 : 8), [rows, isPhone]);
  const flow = useMemo(() => {
    const span = rows.length ? Math.max(now, rows[0].date) - rows[rows.length - 1].date : 0;
    const size = bucketSize(span);
    return { line: balanceLine(rows, cash, now), buckets: flowBuckets(rows, size), size, order: colorOrder(cats, isPhone ? 3 : 5) };
  }, [rows, cash, now, cats, isPhone]);
  const listed = useMemo(
    () => filterRows(rows, { category, direction: direction as Direction, text: search }),
    [rows, category, direction, search],
  );
  const total = logs.data?.totalElements ?? 0;
  const truncated = total > (logs.data?.content.length ?? 0);
  const oldest = all.at(-1)?.date;
  const loading = !account || logs.isLoading;

  const pickAccount = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === accounts[0]?.id) next.delete('konto');
        else next.set('konto', id);
        return next;
      },
      { replace: true },
    );

  const accountSelect =
    accounts.length > 1 ? (
      <DS.Select
        aria-label="Konto"
        size="sm"
        fullWidth={isPhone}
        className="bank__account"
        value={account?.id}
        options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${DS.format.money(a.cash, '€', 2, true)}` }))}
        onChange={(e) => pickAccount(e.target.value)}
      />
    ) : null;

  const rangeControl = (
    <DS.SegmentedControl size="sm" aria-label="Zeitraum" fullWidth={false} options={RANGES} value={range} onChange={setRange} />
  );

  const stats = (
    <DS.StatGroup columns={isPhone ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'} aria-label="Kontostand und Geldfluss">
      <DS.StatTile
        label={account?.name ?? 'Kontostand'}
        value={account ? cash : <DS.Skeleton width="8em" />}
        compact={isPhone || 'auto'}
        hint={accounts.length > 1 ? `Alle Konten ${DS.format.money(accounts.reduce((s, a) => s + a.cash, 0), '€', 2, true)}` : 'Kontostand'}
      />
      <DS.StatTile
        label="Eingänge"
        value={loading ? <DS.Skeleton width="6em" /> : <Flow value={sum.inflow} compact={isPhone || 'auto'} />}
        hint={loading ? '\u00a0' : `${rows.filter((r) => r.amount > 0).length} Buchungen`}
      />
      <DS.StatTile
        label="Ausgänge"
        value={loading ? <DS.Skeleton width="6em" /> : <Flow value={-sum.outflow} compact={isPhone || 'auto'} />}
        hint={loading ? '\u00a0' : `${rows.filter((r) => r.amount < 0).length} Buchungen`}
      />
      <DS.StatTile
        label="Veränderung"
        value={loading ? <DS.Skeleton width="6em" /> : <Flow value={sum.net} compact={isPhone || 'auto'} />}
        hint={loading ? '\u00a0' : rows.length ? `${isPhone ? '' : `von ${DS.format.money(sum.start, '€', 2, true)} `}seit ${date(rows[rows.length - 1].date)}` : 'keine Buchungen'}
      />
    </DS.StatGroup>
  );

  const empty = (
    <DS.EmptyState compact as="h3" title="Keine Buchungen">
      {range === 'alle' ? 'Handel, Gehalt, Zinsen und Überweisungen erscheinen hier.' : 'Im gewählten Zeitraum ist nichts gebucht – wähle „Alle“.'}
    </DS.EmptyState>
  );

  const flowPanel = loading ? (
    <DS.Skeleton variant="block" />
  ) : rows.length ? (
    <>
      <Plot
        aria-label="Kontostand im Verlauf (aus den Buchungen zurückgerechnet), darunter Eingänge und Ausgänge je Zeitabschnitt nach Art"
        figure={(t, w) => flowChart(t, w, flow)}
      />
      {flow.line.some((p) => p.balance < -0.005) && (
        <p className="bank__note">
          Der Kontostand ist vom heutigen Stand aus den Buchungen zurückgerechnet. Werte unter 0 heißen: nicht jede Geldbewegung
          dieses Kontos steht im Kontoauszug.
        </p>
      )}
    </>
  ) : (
    empty
  );

  const catRows = cats.map((c) => ({ label: (isPhone ? CATEGORY_SHORT : CATEGORY_LABEL)[c.category], inflow: c.inflow, outflow: c.outflow, net: c.net, count: c.count, key: c.category }));
  const catPanel = loading ? (
    <DS.Loading rows={5} />
  ) : cats.length ? (
    <div className="bank__bars" style={{ minHeight: 26 * catRows.length + 40 }}>
      <Plot
        className="plot--clickable"
        aria-label="Eingänge und Ausgänge je Art der Buchung – Klick filtert die Buchungen"
        figure={(t, w) => inOutChart(t, w, catRows)}
        onPointClick={(p) => {
          const c = catRows[catRows.length - 1 - p.pointIndex];
          if (c) setParams((prev) => { const n = new URLSearchParams(prev); n.set('art', c.key); if (!isWide) n.set('ansicht', 'buchungen'); return n; }, { replace: true });
        }}
      />
    </div>
  ) : (
    empty
  );

  const subjectPanel = loading ? (
    <DS.Loading rows={5} />
  ) : subjects.length ? (
    <div className="bank__bars" style={{ minHeight: 26 * subjects.length + 40 }}>
      <Plot
        className="plot--clickable"
        aria-label="Größte Posten: Eingänge und Ausgänge je Wertpapier, Unternehmen oder Konto"
        figure={(t, w) => inOutChart(t, w, subjects.map((s) => ({ label: s.subject, inflow: s.inflow, outflow: s.outflow, net: s.net, count: s.count, asin: s.asin })))}
        onPointClick={(p) => {
          const asin = p.customdata?.[5];
          if (asin) navigate(`/wertpapier/${asin}`);
        }}
      />
    </div>
  ) : (
    empty
  );

  const categoryOptions = [
    { value: 'alle', label: `Alle Arten (${rows.length})` },
    ...cats.map((c) => ({ value: c.category, label: `${CATEGORY_LABEL[c.category]} (${c.count})` })),
  ];
  const filters = (
    <div className="bank__filters">
      <DS.Select aria-label="Art" size="sm" fullWidth={false} className="bank__cat" value={category} options={categoryOptions} onChange={(e) => setCategory(e.target.value)} />
      <DS.SegmentedControl size="sm" aria-label="Richtung" fullWidth={false} options={DIRECTIONS} value={direction} onChange={setDirection} />
      <DS.Input aria-label="Buchungen durchsuchen" size="sm" placeholder="Suchen" value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
  const statement = (
    <>
      {filters}
      <div className="panel__fill scroll bank__list">
      {loading ? (
        <DS.Loading rows={8} />
      ) : (
        <DS.DataTable
          className="bank__table"
          density="sm"
          stack={isPhone ? 'auto' : 'never'}
          caption="Buchungen"
          rows={listed}
          rowKey="id"
          empty={rows.length ? 'Keine Buchung passt zum Filter.' : empty}
          columns={[
            { key: 'date', label: 'Zeit', width: 92, render: (r: LedgerRow) => <time dateTime={new Date(r.date).toISOString()}>{time(r.date)}</time> },
            {
              key: 'text',
              label: 'Vorgang',
              mobile: 'title',
              render: (r: LedgerRow) => (
                <span className="bank__what">
                  <span>{r.text}</span>
                  <small>
                    {CATEGORY_LABEL[r.category]}
                    {r.asin && (
                      <>
                        {' · '}
                        <a className="bank__asin" href={`/wertpapier/${r.asin}`}>
                          {r.asin}
                        </a>
                      </>
                    )}
                  </small>
                </span>
              ),
            },
            { key: 'amount', label: 'Betrag', type: 'number', align: 'right', render: (r: LedgerRow) => <Flow value={r.amount} /> },
            { key: 'balance', label: 'Saldo', type: 'number', align: 'right', render: (r: LedgerRow) => <DS.Amount value={r.balance} compact /> },
          ]}
        />
      )}
      </div>
    </>
  );

  const source = loading
    ? '\u00a0'
    : truncated
      ? `Letzte ${(logs.data?.content.length ?? 0).toLocaleString('de-DE')} von ${total.toLocaleString('de-DE')} Buchungen, ab ${oldest ? date(oldest) : '–'}`
      : `${total.toLocaleString('de-DE')} Buchungen${oldest ? ` seit ${date(oldest)}` : ''}`;

  const transferButton = (
    <DS.Button variant="primary" size="sm" disabled={!accounts.length} onClick={() => setSending(true)}>
      Überweisen
    </DS.Button>
  );

  const sheet = (
    <TransferSheet
      open={sending}
      onClose={() => {
        setSending(false);
        if (params.has('ueberweisen')) setParams((prev) => { const n = new URLSearchParams(prev); n.delete('ueberweisen'); return n; }, { replace: true });
      }}
      accounts={accounts}
      defaultFrom={account?.id}
      onDone={setDone}
    />
  );
  const toast = done && (
    <DS.ToastRegion>
      <DS.Toast title="Überweisung" duration={5000} onClose={() => setDone(null)}>
        {done}
      </DS.Toast>
    </DS.ToastRegion>
  );

  const header = (
    <DS.PageHeader
      size="md"
      title="Bank"
      meta={<span>{source}</span>}
      actions={
        isPhone ? undefined : (
          <>
            {accountSelect}
            {transferButton}
          </>
        )
      }
    />
  );

  if (!isWide) {
    const panel =
      view === 'verlauf' ? (
        <DS.Card className="panel" title={isPhone ? undefined : 'Kontostand und Geldfluss'} action={rangeControl}>
          <div className="panel__fill bank__chart">{flowPanel}</div>
        </DS.Card>
      ) : (
        <DS.Card flush className="panel" action={view !== 'buchungen' ? rangeControl : undefined} title={isPhone ? undefined : view === 'arten' ? 'Nach Art' : view === 'posten' ? 'Größte Posten' : 'Buchungen'}>
          {view === 'buchungen' ? statement : <div className="panel__fill scroll bank__pad bank__fillpad">{view === 'arten' ? catPanel : subjectPanel}</div>}
        </DS.Card>
      );
    return (
      <div className={`page bank${isPhone ? ' bank--phone' : ''}`} onClick={onLinkClick}>
        {header}
        <div className="page__body bank__body">
          {isPhone && (
            <div className="bank__bar">
              {accountSelect}
              {transferButton}
            </div>
          )}
          {(!isPhone || view === 'verlauf') && stats}
          <DS.Tabs aria-label="Ansicht" size="sm" items={VIEWS} value={view} onChange={setView} />
          {panel}
        </div>
        {sheet}
        {toast}
      </div>
    );
  }

  return (
    <div className="page bank bank--wide" onClick={onLinkClick}>
      {header}
      <div className="page__body bank__body">
        {stats}
        <div className="bank__grid">
          <div className="bank__left">
            <DS.Card className="panel" title="Kontostand und Geldfluss" action={rangeControl}>
              <div className="panel__fill bank__chart">{flowPanel}</div>
            </DS.Card>
            <DS.Card flush className="panel">
              <div className="panel__tabs">
                <DS.Tabs
                  size="sm"
                  aria-label="Auswertung"
                  value={view}
                  onChange={setView}
                  items={WIDE_VIEWS.map((v) => ({
                    value: v.value,
                    label: v.label,
                    content: <div className="bank__pad bank__fillpad">{v.value === 'arten' ? catPanel : subjectPanel}</div>,
                  }))}
                />
              </div>
            </DS.Card>
          </div>
          <DS.Card flush className="panel" title="Buchungen">
            {statement}
          </DS.Card>
        </div>
      </div>
      {sheet}
      {toast}
    </div>
  );
}
