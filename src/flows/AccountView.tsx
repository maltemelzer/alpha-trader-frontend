import { useCallback, useMemo, useState } from 'react';
import { DS } from '../ds';
import { useAccountDetails, useCashLedgers, useListings, usePriceSpreads } from '../api/queries';
import { Plot } from '../charts/Plot';
import { short } from '../lib/format';
import { useParamState } from '../lib/useParamState';
import { byCategory, CATEGORY_LABEL, ledger, topSubjects, type LedgerRow } from '../me/bank';
import { inOutChart } from '../me/bankCharts';
import { sankeyChart } from './charts';
import { labelOf, originSankey, parseAccount, priceNow, transferGroups, transferSides, type AccountInfo, type OriginData, type Grouping, type Trade, type TransferGroup, type TransferLine } from './derive';

const NBSP = String.fromCharCode(0xa0);
const eur = (n: number) => `${short(n)}${NBSP}€`;
const count = (n: number) => n.toLocaleString('de-DE');
const when = (ms: number) => new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const SHOW = [
  { value: 'handel', label: 'Wertpapiere' },
  { value: 'geld', label: 'Geld' },
  { value: 'uebertragungen', label: 'Übertragungen' },
];

/** Name buttons drill into another account. */
export function AccountButton({ id, name, onPick, active }: { id: string; name: string; onPick: (id: string) => void; active?: boolean }) {
  return (
    <button type="button" className={`fl-acc${active ? ' fl-acc--active' : ''}`} onClick={() => onPick(id)} title={`${name} untersuchen`}>
      {name}
    </button>
  );
}

/** Names for accounts a list shows beyond the ones the page resolved – looked up here, kept for the session. */
function useNames(ids: string[], infos: Record<string, AccountInfo | undefined>) {
  const missing = useMemo(() => ids.filter((id) => !infos[id]), [ids, infos]);
  const details = useAccountDetails(missing);
  return useCallback(
    (id: string, logName: string) => logName || labelOf(infos[id] ?? parseAccount(details.data[id])) || `Konto ${id.slice(0, 8)}`,
    [infos, details.data],
  );
}

/**
 * One account (or all accounts of one person) up close: which securities it got from whom and
 * to whom it sold them (money flow), what moved on its bank account (salary, transfers, interest …)
 * and which transfers at 0 € / 0,01 € it received and sent.
 */
export function AccountView({
  trades,
  transfers,
  isSelf,
  selfLabel,
  grp,
  infos,
  names,
  from,
  banks,
  onPick,
  onSecurity,
}: {
  trades: Trade[];
  transfers: Trade[];
  isSelf: (id: string) => boolean;
  selfLabel: string;
  grp: Grouping;
  infos: Record<string, AccountInfo | undefined>;
  names: Record<string, string>;
  from: number;
  /** bank accounts of the securities accounts (for „Geld“) */
  banks: string[];
  onPick: (id: string) => void;
  onSecurity: (asin: string) => void;
}) {
  const [show, setShow] = useParamState('herkunft', 'handel', SHOW);
  const control = <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Darstellung" options={SHOW} value={show} onChange={setShow} />;
  return (
    <div className="fl__stack">
      {show === 'handel' ? (
        <OriginFlow trades={trades} isSelf={isSelf} selfLabel={selfLabel} grp={grp} names={names} onPick={onPick} onSecurity={onSecurity} control={control} />
      ) : show === 'geld' ? (
        <Money banks={banks} infos={infos} from={from} onSecurity={onSecurity} control={control} />
      ) : (
        <Transfers
          transfers={transfers}
          isSelf={isSelf}
          selfLabel={selfLabel}
          grp={grp}
          infos={infos}
          names={names}
          onPick={onPick}
          onSecurity={onSecurity}
          control={control}
        />
      )}
    </div>
  );
}

/** Names of the securities a flow shows (the page knows only the largest of the market). */
function useSecurityNames(asins: string[], names: Record<string, string>) {
  const missing = useMemo(() => asins.filter((a) => !names[a]).slice(0, 30), [asins, names]);
  const more = useListings(missing);
  return useMemo(() => ({ ...Object.fromEntries(Object.entries(more).map(([a, l]) => [a, l.name ?? a])), ...names }), [more, names]);
}

/** The five-column flow around one account, with its column heads. */
function FlowSankey({
  data,
  legend,
  label,
  onPick,
  onSecurity,
}: {
  data: OriginData;
  /** heads: from whom, what came in, the account, what went out, to whom */
  legend: [string, string, string, string, string];
  label: string;
  onPick: (id: string) => void;
  onSecurity: (asin: string) => void;
}) {
  const figure = useCallback((t: Parameters<typeof sankeyChart>[0], w: number) => sankeyChart(t, w, data), [data]);
  const heads = legend.filter((_, i) => (i < 2 ? data.bought : i > 2 ? data.sold : true));
  return (
    <>
      <div className="fl__legend" aria-hidden="true">
        {heads.map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="fl__chart">
        <Plot
          aria-label={label}
          figure={figure}
          onPointClick={(p) => {
            const cd = p.customdata as string[] | undefined;
            if (!cd?.[0]) return;
            if (cd[1] === 'bought' || cd[1] === 'sold') onSecurity(cd[0]);
            else if (cd[1] === 'seller' || cd[1] === 'buyer') onPick(cd[0]);
          }}
        />
      </div>
    </>
  );
}

function OriginFlow({
  trades,
  isSelf,
  selfLabel,
  grp,
  names,
  onPick,
  onSecurity,
  control,
}: {
  trades: Trade[];
  isSelf: (id: string) => boolean;
  selfLabel: string;
  grp: Grouping;
  names: Record<string, string>;
  onPick: (id: string) => void;
  onSecurity: (asin: string) => void;
  control: React.ReactNode;
}) {
  const allNames = useSecurityNames(useMemo(() => [...new Set(trades.map((t) => t.asin))], [trades]), names);
  const data = useMemo(() => originSankey(trades, isSelf, selfLabel, allNames, grp, 8), [trades, isSelf, selfLabel, allNames, grp]);
  return (
    <>
      <div className="fl__row">
        <p className="fl__note">
          <b>{eur(data.bought)}</b> bei {count(data.sellers)} Konten gekauft · <b>{eur(data.sold)}</b> an {count(data.buyers)} Konten verkauft
          {data.internal ? ` · ${count(data.internal)} Trades zwischen eigenen Konten nicht gezeigt` : ''}
        </p>
        {control}
      </div>
      {data.links.length ? (
        <>
          <FlowSankey
            data={data}
            legend={['Von wem', 'Was gekauft', selfLabel, 'Was verkauft', 'An wen']}
            label={`Woher ${selfLabel} Wertpapiere bekommt und an wen es sie verkauft, in Euro`}
            onPick={onPick}
            onSecurity={onSecurity}
          />
          <p className="fl__note">
            Wertpapiere fließen von links nach rechts, das Geld in die Gegenrichtung: links die Quellen, rechts die Abnehmer · Klick auf ein Konto
            untersucht es, auf ein Wertpapier öffnet es
          </p>
        </>
      ) : (
        <DS.EmptyState compact as="h3" title="Keine Trades mit anderen Konten im Zeitraum" />
      )}
    </>
  );
}

function Money({
  banks,
  infos,
  from,
  onSecurity,
  control,
}: {
  banks: string[];
  infos: Record<string, AccountInfo | undefined>;
  from: number;
  onSecurity: (asin: string) => void;
  control: React.ReactNode;
}) {
  const logs = useCashLedgers(banks);
  const own = useMemo(() => new Set(banks), [banks]);
  // Names of bank accounts we know: the account's own and every resolved counterparty
  const bankNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const i of Object.values(infos)) if (i?.bank) out[i.bank] = labelOf(i) || i.name;
    return out;
  }, [infos]);
  const { rows, since } = useMemo(() => {
    let since = from;
    const all: LedgerRow[] = [];
    for (const l of logs.data) {
      const r = ledger(l.content, l.id, l.cash, bankNames);
      // 1.000 bookings per account: when they end inside the window, the window starts there
      if (l.content.length >= 1000 && r.length) since = Math.max(since, r[r.length - 1].date);
      // between two own accounts of one person: neither income nor spending
      all.push(...r.filter((x) => !(x.counterparty && own.has(x.counterparty) && banks.length > 1)));
    }
    return { rows: all.filter((r) => r.date >= since), since };
  }, [logs.data, bankNames, own, banks.length, from]);
  const cats = useMemo(
    () => byCategory(rows).map((c) => ({ label: CATEGORY_LABEL[c.category], inflow: c.inflow, outflow: c.outflow, net: c.net, count: c.count })),
    [rows],
  );
  const subjects = useMemo(
    () => topSubjects(rows, 8).map((s) => ({ label: s.subject, inflow: s.inflow, outflow: s.outflow, net: s.net, count: s.count, asin: s.asin })),
    [rows],
  );
  const inflow = rows.reduce((s, r) => s + Math.max(0, r.amount), 0);
  const outflow = rows.reduce((s, r) => s + Math.max(0, -r.amount), 0);
  const head = (
    <div className="fl__row">
      <p className="fl__note">
        {logs.isLoading ? (
          'Lädt Kontoauszug …'
        ) : (
          <>
            <b>▲ +{eur(inflow)}</b> herein · <b>▼ −{eur(outflow)}</b> hinaus · {count(rows.length)} Buchungen
            {since > from ? ` · ab ${when(since)} (mehr liefert der Auszug nicht)` : ''}
          </>
        )}
      </p>
      {control}
    </div>
  );
  if (!banks.length) return <>{head}<DS.EmptyState compact as="h3" title="Bankkonto unbekannt" /></>;
  if (logs.isLoading) return <>{head}<DS.Skeleton variant="block" /></>;
  if (logs.isError && !logs.data.length) return <>{head}<DS.EmptyState compact as="h3" title="Kontoauszug konnte nicht geladen werden" /></>;
  if (!rows.length) return <>{head}<DS.EmptyState compact as="h3" title="Keine Buchungen im Zeitraum" /></>;
  return (
    <>
      {head}
      <div className="fl__money">
        <section>
          <h3 className="fl__h">Nach Art</h3>
          <div className="fl__chart">
            <Plot aria-label="Geld herein und hinaus je Art" figure={(t, w) => inOutChart(t, w, cats)} />
          </div>
        </section>
        <section>
          <h3 className="fl__h">Größte Posten</h3>
          <div className="fl__chart">
            <Plot
              aria-label="Größte Posten: Wertpapiere, Firmen und Konten"
              figure={(t, w) => inOutChart(t, w, subjects)}
              onPointClick={(p) => {
                const a = (p.customdata as unknown[] | undefined)?.[5];
                if (typeof a === 'string' && a) onSecurity(a);
              }}
            />
          </div>
        </section>
      </div>
      <p className="fl__note">Kontoauszug des Bankkontos: Gehalt, Überweisungen, Zinsen, Handel … · Konten der Gegenseite nur mit Namen, wenn sie oben schon vorkamen</p>
    </>
  );
}

const TRANSFER_SHOW = [
  { value: 'fluss', label: 'Fluss' },
  { value: 'liste', label: 'Liste' },
];

function Transfers({
  transfers,
  isSelf,
  selfLabel,
  grp,
  infos,
  names,
  onPick,
  onSecurity,
  control,
}: {
  transfers: Trade[];
  isSelf: (id: string) => boolean;
  selfLabel: string;
  grp: Grouping;
  infos: Record<string, AccountInfo | undefined>;
  names: Record<string, string>;
  onPick: (id: string) => void;
  onSecurity: (asin: string) => void;
  control: React.ReactNode;
}) {
  const [show, setShow] = useParamState('uebertragungen', 'fluss', TRANSFER_SHOW);
  const sides = useMemo(() => transferSides(transfers, isSelf), [transfers, isSelf]);
  // Today's value: shares × current price of each security moved (at most 30 securities)
  const asins = useMemo(() => [...new Set([...sides.received, ...sides.sent].map((l) => l.asin))].slice(0, 30), [sides]);
  const spreads = usePriceSpreads(asins);
  const price = useCallback((asin: string) => priceNow(spreads[asin]), [spreads]);
  const secNames = useSecurityNames(asins, names);
  const data = useMemo(
    () =>
      originSankey(transfers, isSelf, selfLabel, secNames, grp, 8, (t) => {
        const p = price(t.asin);
        return p == null ? undefined : t.shares * p;
      }),
    [transfers, isSelf, selfLabel, secNames, grp, price],
  );
  const shown = useMemo(() => (show === 'liste' ? [...sides.received.slice(0, 60), ...sides.sent.slice(0, 60)] : []), [show, sides]);
  const nameOf = useNames(useMemo(() => [...new Set(shown.map((l) => l.id))], [shown]), infos);
  const valueOf = (l: TransferLine) => {
    const p = price(l.asin);
    return p == null ? undefined : l.shares * p;
  };
  const senders = new Set(sides.received.map((l) => l.id)).size;
  const receivers = new Set(sides.sent.map((l) => l.id)).size;
  const received = sides.received.reduce((s, l) => s + l.count, 0);
  const sent = sides.sent.reduce((s, l) => s + l.count, 0);
  const paidIn = sides.received.reduce((s, l) => s + l.paid, 0);
  const paidOut = sides.sent.reduce((s, l) => s + l.paid, 0);
  // prices still loading (a security without a price never gets one – then the note counts it)
  const pricing = asins.some((a) => !spreads[a]);
  const list = (lines: TransferLine[], title: string, empty: string) => {
    const max = Math.max(1, ...lines.map((l) => valueOf(l) ?? 0));
    return (
      <section>
        <h3 className="fl__h">{title}</h3>
        {lines.length ? (
          <ul className="fl-tl">
            {lines.slice(0, 60).map((l) => {
              const v = valueOf(l);
              return (
                <li key={`${l.id}|${l.asin}`}>
                  <div className="fl-tl__line">
                    <AccountButton id={l.id} name={nameOf(l.id, l.name)} onPick={onPick} />
                    <span className="num">{v == null ? '–' : `≈${NBSP}${eur(v)}`}</span>
                  </div>
                  <div className="fl-tl__bar" aria-hidden="true">
                    <span style={{ width: `${((v ?? 0) / max) * 100}%` }} />
                  </div>
                  <div className="fl-rows__meta">
                    <a className="fl-sec" href={`/wertpapier/${l.asin}`}>
                      {secNames[l.asin] ?? l.asin}
                    </a>{' '}
                    · {count(l.count)}× · <span className="num">{short(l.shares)}</span> Stück · bezahlt <span className="num">{eur(l.paid)}</span> · zuletzt{' '}
                    {when(l.last)}
                  </div>
                </li>
              );
            })}
            {lines.length > 60 && <li className="fl__note">… und {count(lines.length - 60)} weitere</li>}
          </ul>
        ) : (
          <p className="fl__none">{empty}</p>
        )}
      </section>
    );
  };
  return (
    <>
      <div className="fl__row">
        <p className="fl__note">
          <b>{count(received)}</b> erhalten von {count(senders)} Konten, heute <b>≈{NBSP}{eur(data.bought)}</b> wert (bezahlt {eur(paidIn)}) ·{' '}
          <b>{count(sent)}</b> gesendet an {count(receivers)} Konten, <b>≈{NBSP}{eur(data.sold)}</b> (erhalten {eur(paidOut)})
          {sides.own ? ` · ${count(sides.own)} an sich selbst` : ''}
        </p>
        <div className="fl__controls">
          <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Übertragungen als" options={TRANSFER_SHOW} value={show} onChange={setShow} />
          {control}
        </div>
      </div>
      {show === 'fluss' ? (
        data.links.length ? (
          <FlowSankey
            data={data}
            legend={['Von wem', 'Was erhalten', selfLabel, 'Was gesendet', 'An wen']}
            label={`Übertragungen an und von ${selfLabel}, bewertet zum heutigen Kurs`}
            onPick={onPick}
            onSecurity={onSecurity}
          />
        ) : pricing ? (
          <DS.Skeleton variant="block" />
        ) : (
          <DS.EmptyState compact as="h3" title="Keine Übertragungen mit anderen Konten im Zeitraum" />
        )
      ) : (
        <div className="fl__transfers scroll">
          {list(sides.received, 'Erhalten', 'Nichts erhalten im Zeitraum.')}
          {list(sides.sent, 'Gesendet', 'Nichts gesendet im Zeitraum.')}
        </div>
      )}
      <p className="fl__note">
        Übertragungen zu 0 € oder 0,01 € je Stück, bewertet zum heutigen Kurs (letzter Trade, sonst Geld)
        {data.unvalued ? ` · ${count(data.unvalued)} ohne Kurs nicht im Fluss` : ''} · Klick auf ein Konto untersucht es
      </p>
    </>
  );
}

/**
 * All transfers of the window by receiver: many senders to one account are one row („38 Konten →
 * Malte“), the senders open below. Self-transfers per security at the end.
 */
export function TransferGroups({
  transfers,
  infos,
  names,
  onPick,
  max = 40,
}: {
  transfers: Trade[];
  infos: Record<string, AccountInfo | undefined>;
  names: Record<string, string>;
  onPick: (id: string) => void;
  max?: number;
}) {
  const groups = useMemo(() => transferGroups(transfers), [transfers]);
  const shown = groups.slice(0, max);
  const ids = useMemo(() => [...new Set(shown.flatMap((g) => [g.to, ...(g.parts.length === 1 ? [g.parts[0].id] : [])]).filter(Boolean))], [shown]);
  const nameOf = useNames(ids, infos);
  const allAsins = useMemo(() => [...new Set(shown.map((g) => g.asin))], [shown]);
  const asins = useMemo(() => allAsins.filter((a) => !names[a]), [allAsins, names]);
  const more = useListings(asins);
  const spreads = usePriceSpreads(allAsins.slice(0, 30));
  const sec = (a: string) => (
    <a className="fl-sec" href={`/wertpapier/${a}`}>
      {names[a] ?? more[a]?.name ?? a}
    </a>
  );
  if (!groups.length) return <p className="fl__none">Keine im Zeitraum.</p>;
  return (
    <ul className="fl-rows">
      {shown.map((g) => (
        <TransferRow key={`${g.to}|${g.asin}`} g={g} nameOf={nameOf} infos={infos} onPick={onPick} sec={sec(g.asin)} price={priceNow(spreads[g.asin])} />
      ))}
      {groups.length > max && <li className="fl__note">… und {count(groups.length - max)} weitere Gruppen</li>}
    </ul>
  );
}

function TransferRow({
  g,
  nameOf,
  infos,
  onPick,
  sec,
  price,
}: {
  g: TransferGroup;
  /** today's price, for the value of the moved shares */
  price?: number;
  nameOf: (id: string, logName: string) => string;
  infos: Record<string, AccountInfo | undefined>;
  onPick: (id: string) => void;
  sec: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const many = g.parts.length > 1;
  const meta = (
    <div className="fl-rows__meta">
      {sec} · {count(g.count)}× · <span className="num">{short(g.shares)}</span> Stück
      {price != null && (
        <>
          {' '}
          · heute <span className="num">≈{NBSP}{eur(g.shares * price)}</span>
        </>
      )}
    </div>
  );
  if (!many) {
    const p = g.parts[0];
    return (
      <li>
        <div>
          {g.self ? (
            <>
              <AccountButton id={p.id} name={nameOf(p.id, p.name)} onPick={onPick} /> an sich selbst
            </>
          ) : (
            <>
              <AccountButton id={p.id} name={nameOf(p.id, p.name)} onPick={onPick} /> → <AccountButton id={g.to} name={nameOf(g.to, g.toName)} onPick={onPick} />
            </>
          )}
        </div>
        {meta}
      </li>
    );
  }
  return (
    <li>
      <div>
        <button type="button" className="fl-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▸'} {count(g.parts.length)} Konten
        </button>{' '}
        {g.self ? 'an sich selbst' : <>→ <AccountButton id={g.to} name={nameOf(g.to, g.toName)} onPick={onPick} /></>}
      </div>
      {meta}
      {open && <Senders parts={g.parts} infos={infos} onPick={onPick} />}
    </li>
  );
}

function Senders({ parts, infos, onPick }: { parts: TransferGroup['parts']; infos: Record<string, AccountInfo | undefined>; onPick: (id: string) => void }) {
  const shown = useMemo(() => parts.slice(0, 60), [parts]);
  const nameOf = useNames(useMemo(() => shown.map((p) => p.id), [shown]), infos);
  return (
    <ul className="fl-senders">
      {shown.map((p) => (
        <li key={p.id}>
          <AccountButton id={p.id} name={nameOf(p.id, p.name)} onPick={onPick} />
          <span className="fl-rows__meta">
            {count(p.count)}× · <span className="num">{short(p.shares)}</span> Stück
          </span>
        </li>
      ))}
      {parts.length > 60 && <li className="fl__note">… und {count(parts.length - 60)} weitere</li>}
    </ul>
  );
}
