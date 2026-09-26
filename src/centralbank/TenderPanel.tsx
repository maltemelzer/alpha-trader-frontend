import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  checkOrder,
  useAddOrder,
  useDeleteOrder,
  useInterestHistory,
  useInterestTender,
  useMainInterestRate,
  useMyBanks,
  useOrderbook,
  useOrdersOn,
  useTenderAllotments,
  type MyBank,
} from '../api/queries';
import type { OrderCheck } from '../api/types';
import { Plot } from '../charts/Plot';
import { Confirm } from '../companies/Confirm';
import { parseAmount } from '../companies/derive';
import { parseDe, short } from '../lib/format';
import { translate, type ApiMessage } from '../lib/messages';
import { useDebounced } from '../lib/useDebounced';
import { useNow } from '../lib/useNow';
import { useParamState } from '../lib/useParamState';
import {
  bidderColors,
  bidderShares,
  bidEffect,
  bidError,
  bidMoney,
  bidPct,
  effectCurve,
  groupTenders,
  logSpace,
  maxBidShares,
  MAX_BID,
  MIN_BID,
  project,
  projectionBase,
  rateAfterTenders,
  rateAt,
  signedRate,
  tenderTrades,
  type Assumption,
  type Bid,
} from './tender';
import { bookChart, effectChart, tenderHistoryChart } from './tenderCharts';
import { MiniStats, Option, OptionsButton, useEdgeFade } from '../app/phone';

const NBSP = String.fromCharCode(0xa0);
const DAY = 86_400_000;
const pct = (n: number | undefined) =>
  n == null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`;
const priceText = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ASSUME = [
  { value: 'buch', label: 'Buch jetzt' },
  { value: 'gestern', label: 'wie zuletzt' },
];
const RANGES = [
  { value: '14T', label: '14T', ms: 14 * DAY },
  { value: '30T', label: '30T', ms: 30 * DAY },
  { value: 'alle', label: 'Alle', ms: undefined },
];
const PHONE_VIEWS = [
  { value: 'wirkung', label: 'Dein Gebot' },
  { value: 'verlauf', label: 'Verlauf' },
];

/** Tender data shared by the bid view and the history: the running tender, its book, past allotments. */
function useTenderData() {
  const tender = useInterestTender();
  const asin = tender.data?.bondListing.securityIdentifier ?? '';
  const book = useOrderbook(asin);
  const allotments = useTenderAllotments();
  const trades = useMemo(() => tenderTrades(allotments.data), [allotments.data]);
  const tenders = useMemo(() => groupTenders(trades), [trades]);
  const bookBids = useMemo<Bid[]>(() => (book.data?.buyEntries ?? []).map((e) => ({ price: e.priceLimit, shares: e.size })), [book.data]);
  return { tender, asin, book, bookBids, allotments, trades, tenders };
}

/** Initial value from the URL, written back 400 ms after the last change (inputs never bind to the URL directly). */
function useUrlText(key: string, fallback: string) {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(() => params.get(key) ?? fallback);
  const settled = useDebounced(text, 400);
  const inUrl = params.get(key) ?? fallback;
  useEffect(() => {
    if (inUrl === settled) return; // nothing to write – no navigation
    setParams(
      (prev) => {
        if ((prev.get(key) ?? fallback) === settled) return prev;
        const next = new URLSearchParams(prev);
        if (settled === fallback) next.delete(key);
        else next.set(key, settled);
        return next;
      },
      { replace: true },
    );
    // only the settled text triggers a write; a URL change by others must not write the old text back
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, key, fallback, setParams]);
  return [text, setText] as const;
}

/** Which other bids the projection assumes for the running tender (URL ?annahme=). */
export function AssumeControl() {
  const [assume, setAssume] = useParamState('annahme', 'buch', ASSUME);
  return (
    <DS.SegmentedControl
      size="sm"
      fullWidth={false}
      aria-label="Übrige Gebote im laufenden Tender"
      options={ASSUME}
      value={assume}
      onChange={setAssume}
    />
  );
}

/**
 * Phone: the tender tab with two views – „Dein Gebot“ (simulator, bid in a bar at the bottom) and „Verlauf“
 * (history and the book). The switch and an „Optionen“ button (which other bids the projection assumes, the
 * history range) share the card's head, so the content gets the rest. Wide screens show both parts side by side.
 */
export function TenderPhone() {
  const [view, setView] = useParamState('tender', 'wirkung', PHONE_VIEWS);
  const [assume, setAssume] = useParamState('annahme', 'buch', ASSUME);
  const [range, setRange] = useParamState('verlauf', '30T', RANGES);
  const [open, setOpen] = useState(false);
  const changed = (view === 'verlauf' ? range !== '30T' : assume !== 'buch') ? 1 : 0;
  return (
    <DS.Card flush className="panel tdr-phone">
      <div className="tdr-phone__head">
        <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Zinstender" options={PHONE_VIEWS} value={view} onChange={setView} />
        <OptionsButton active={changed} onClick={() => setOpen(true)} />
      </div>
      {view === 'verlauf' ? (
        <div className="panel__fill scroll cb__pad">
          <TenderSide phone />
        </div>
      ) : (
        <TenderBid phone />
      )}
      <DS.Sheet open={open} onClose={() => setOpen(false)} title={view === 'verlauf' ? 'Verlauf' : 'Dein Gebot'} side="bottom">
        <div className="ph-sheet">
          {view === 'verlauf' ? (
            <Option title="Zeitraum" note="Welche Tender das Diagramm und die Anteile der Bieter zeigen.">
              <DS.SegmentedControl aria-label="Zeitraum" options={RANGES} value={range} onChange={setRange} />
            </Option>
          ) : (
            <Option
              title="Übrige Gebote"
              note="Womit die Schätzung für den laufenden Tender rechnet: mit den Geboten, die jetzt im Buch stehen, oder so wie beim letzten Tender."
            >
              <DS.SegmentedControl aria-label="Übrige Gebote im laufenden Tender" options={ASSUME} value={assume} onChange={setAssume} />
            </Option>
          )}
        </div>
      </DS.Sheet>
    </DS.Card>
  );
}

/** History of the tenders plus the bids in the running tender's book (mine highlighted). */
export function TenderSide({ phone }: { phone?: boolean }) {
  const { asin, bookBids } = useTenderData();
  const { banks } = useMyBanks();
  const own = useOrdersOn(
    useMemo(() => banks.map((b) => b.securitiesAccountId), [banks]),
    asin,
  );
  const bookRows = useMemo(() => {
    const mine = new Map<number, number>();
    for (const o of own.orders) if (o.action === 'BUY' && o.price != null) mine.set(o.price, (mine.get(o.price) ?? 0) + o.numberOfShares);
    return bookBids.map((b) => ({ ...b, mine: Math.min(b.shares, mine.get(b.price) ?? 0) }));
  }, [bookBids, own.orders]);
  return (
    <div className={`tdr__side${phone ? ' tdr__side--phone' : ''}`}>
      <TenderHistory phone={phone} />
      <h3 className="cb__h">Im Buch jetzt</h3>
      <div className="tdr__book" style={{ height: Math.max(1, bookRows.length) * 30 + 6 }}>
        {bookRows.length ? (
          <Plot aria-label="Gebote im laufenden Tender je Preis, deine hervorgehoben" figure={(t, w) => bookChart(t, w, bookRows)} />
        ) : (
          <DS.EmptyState compact as="h3" title="Noch keine Gebote" />
        )}
      </div>
    </div>
  );
}

/**
 * „Was bewirkt dein Gebot?“ – price and bonds move the projected main rate live (tiles + chart), banks
 * bid directly from here (with confirmation), own bids are listed and can be withdrawn.
 */
export function TenderBid({ phone }: { phone?: boolean }) {
  const { tender, asin, bookBids, allotments, tenders } = useTenderData();
  const main = useMainInterestRate();
  const { banks, isLoading: banksLoading } = useMyBanks();
  const [bankId, setBankId] = useState<string>();
  const bank = banks.find((b) => b.id === bankId) ?? banks[0];
  const maxShares = maxBidShares(bank?.maxCentralBankLoans);
  const accountIds = useMemo(() => banks.map((b) => b.securitiesAccountId), [banks]);
  const own = useOrdersOn(accountIds, asin);
  const now = useNow(30_000);

  const [priceRaw, setPriceRaw] = useUrlText('gebot', '100,00');
  const [sharesRaw, setSharesRaw] = useUrlText('stueck', '1 Bio.');
  const [assume] = useParamState('annahme', 'buch', ASSUME);
  const [confirm, setConfirm] = useState(false);

  const price = parseDe(priceRaw);
  const parsed = parseAmount(sharesRaw);
  const shares = parsed != null ? Math.round(parsed) : NaN;
  const priceOk = Number.isFinite(price) && price >= MIN_BID && price <= MAX_BID;
  const simPrice = priceOk ? price : Math.min(MAX_BID, Math.max(MIN_BID, Number.isFinite(price) ? price : 100));
  const simShares = Number.isFinite(shares) && shares > 0 ? shares : 0;

  const base = useMemo(() => projectionBase(tenders, bookBids, assume as Assumption), [tenders, bookBids, assume]);
  const without = useMemo(() => project(base), [base]);
  const withMe = useMemo(() => project(base, { price: simPrice, shares: simShares }), [base, simPrice, simShares]);
  const last = tenders.at(-1);
  const refs = useMemo(
    () =>
      [...(last?.bids ?? [])]
        .sort((a, b) => b.shares - a.shares)
        .filter((b, i, all) => all.findIndex((x) => x.bidder === b.bidder) === i)
        .map((b) => ({ label: b.bidder, shares: b.shares })),
    [last],
  );
  // x range: from where a bid starts to show (≈ 1/100.000 of the bonds counted) to well above the largest bidder
  const volumes = useMemo(() => {
    const counted = base.reduce((s, b) => s + b.shares, 0);
    const top = Math.max(1e13, (maxShares ?? 0) * 3, simShares * 3, ...refs.map((r) => r.shares * 3));
    const bottom = Math.min(Math.max(1e3, counted / 1e5), simShares > 0 ? simShares / 3 : Infinity, top / 1e6);
    return logSpace(10 ** Math.floor(Math.log10(bottom)), 10 ** Math.ceil(Math.log10(top)), 61);
  }, [base, maxShares, simShares, refs]);
  const curves = useMemo(
    () => ({
      low: effectCurve(base, MIN_BID, volumes),
      high: effectCurve(base, MAX_BID, volumes),
      line: effectCurve(base, simPrice, volumes),
    }),
    [base, volumes, simPrice],
  );

  const ended = !!tender.data && tender.data.endDate <= now;
  const money = bidMoney(simPrice, simShares);
  const error = bidError(price, shares, bank ? { maxShares, cash: bank.cash } : {});

  const wrap = (node: ReactNode) => (phone ? <div className="panel__fill scroll cb__pad">{node}</div> : node);
  if (tender.isLoading || allotments.isLoading) return wrap(<DS.Loading rows={6} />);
  if (!tender.data) return wrap(<DS.EmptyState compact as="h3" title="Gerade kein Zinstender" />);
  const setPrice = (n: number) => setPriceRaw(priceText(Math.round(n * 100) / 100));
  const setShares = (n: number) => setSharesRaw(Math.round(n).toLocaleString('de-DE'));
  const delta = withMe && without ? withMe.main - without.main : 0;
  const meta = (
    <span className="cb__note tdr__meta">
      <a className="cb__mono" href={`/wertpapier/${asin}`}>
        {asin}
      </a>
      <span>{ended ? 'Bieten beendet' : <DS.Countdown to={tender.data.endDate} label="noch" short endedText="beendet" />}</span>
    </span>
  );

  const act = (
    <div className="tdr__act">
      {banksLoading ? (
        <DS.Skeleton variant="text" />
      ) : bank ? (
        <>
          {banks.length > 1 && (
            <DS.Select
              size="sm"
              fullWidth={false}
              aria-label="Bietende Bank"
              value={bank.id}
              options={banks.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(e) => setBankId(e.target.value)}
            />
          )}
          <DS.Button variant="primary" disabled={ended || !!error} onClick={() => setConfirm(true)}>
            Gebot abgeben …
          </DS.Button>
          <span className="cb__note">{error ?? `${bank.name} · Rahmen ${maxShares != null ? short(maxShares) : '–'}${NBSP}Stk.`}</span>
        </>
      ) : (
        <span className="cb__note tdr__lock">
          <DS.Icon name="bank" size={16} />
          <span>
            {phone ? 'Bieten können nur Banken.' : 'Bieten können nur Banken – du führst keine.'} <a href="/unternehmen">Unternehmen</a>
          </span>
        </span>
      )}
      {meta}
    </div>
  );

  const body = (
    <div className="tdr">
      <div className="tdr__controls">
        <DS.Input
          className="tdr__price"
          label="Gebot"
          size="sm"
          numeric
          stepper={!phone}
          step={0.25}
          min={MIN_BID}
          max={MAX_BID}
          suffix="%"
          value={priceRaw}
          onChange={(e) => setPriceRaw(e.target.value)}
          error={!priceOk ? '98 bis 102 %' : undefined}
        />
        <label className="tdr__slider">
          <span className="tdr__slider-label">
            <span>98 % senkt</span>
            <span className="cb__mono">Leitzins {signedRate(bidEffect(simPrice))}</span>
            <span>102 % hebt</span>
          </span>
          <input
            type="range"
            className="tdr__range"
            aria-label="Gebot in Prozent"
            min={MIN_BID}
            max={MAX_BID}
            step={0.05}
            value={simPrice}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <DS.Input
          className="tdr__shares"
          label="Stück"
          size="sm"
          numeric
          suffix="Stk."
          value={sharesRaw}
          onChange={(e) => setSharesRaw(e.target.value)}
          error={parsed == null ? 'z. B. „5 Mrd.“' : undefined}
        />
        <div className="tdr__quick" role="group" aria-label="Stückzahl wählen">
          {[1e9, 1e12].map((n) => (
            <DS.Button key={n} size="sm" variant="ghost" onClick={() => setShares(n)}>
              {short(n)}
            </DS.Button>
          ))}
          {refs[0] && (
            <DS.Button size="sm" variant="ghost" onClick={() => setShares(refs[0].shares)} title={`so viel wie ${refs[0].label} zuletzt`}>
              wie {refs[0].label.split(' ')[0]}
            </DS.Button>
          )}
          {maxShares != null && (
            <DS.Button size="sm" variant="ghost" onClick={() => setShares(maxShares)}>
              Max.
            </DS.Button>
          )}
        </div>
      </div>
      {phone && (
        <MiniStats
          label="Zinsen nach dem Tender mit deinem Gebot"
          items={[
            {
              label: 'Leitzins',
              value: withMe ? pct(withMe.main) : '–',
              hint: withMe && without ? `du ${delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : ''}${signedRate(delta, 2, 'Pp.')}` : NBSP,
            },
            { label: 'Einlage / Tag', value: withMe ? pct(withMe.reserve) : '–', hint: withMe ? `Systemanl. ${pct(withMe.system)}` : NBSP },
            {
              label: 'Für dich',
              value: simShares ? <DS.Amount value={money.result} signed compact /> : '–',
              hint: simShares ? `Einsatz ${short(money.cost)}${NBSP}€` : NBSP,
            },
          ]}
        />
      )}
      <div className="tdr__effect">
        {without ? (
          <Plot
            aria-label="Neuer Leitzins je nach Stückzahl deines Gebots, zwischen 98 und 102 Prozent"
            figure={(t, w) =>
              effectChart(t, w, {
                price: simPrice,
                shares: simShares,
                ...curves,
                base: without.raw,
                mine: withMe?.raw,
                maxShares,
                refs,
              })
            }
            onPointClick={(p) => {
              if (p.curveNumber === 2) setShares(volumes[p.pointIndex]);
            }}
          />
        ) : (
          <DS.EmptyState compact as="h3" title="Keine Tenderdaten" />
        )}
      </div>
      {!phone && (
        <DS.StatGroup className="tdr__tiles" columns="repeat(4, minmax(0, 1fr))" aria-label="Zinsen nach dem Tender mit deinem Gebot">
          <DS.StatTile
            label="Leitzins"
            value={withMe ? pct(withMe.main) : '–'}
            hint={withMe && without ? `du: ${delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : ''}${signedRate(delta, 2, 'Pp.')}` : NBSP}
          />
          <DS.StatTile label="Einlage / Tag" value={withMe ? pct(withMe.reserve) : '–'} hint={`jetzt ${pct(main.data?.reserveInterestRate)}`} />
          <DS.StatTile label="Systemanleihe" value={withMe ? pct(withMe.system) : '–'} hint={`jetzt ${pct(main.data ? main.data.value + 1 : undefined)}`} />
          <DS.StatTile
            label="Für dich"
            value={simShares ? money.result : '–'}
            signed
            compact
            hint={simShares ? `Einsatz ${short(money.cost)}${NBSP}€` : NBSP}
          />
        </DS.StatGroup>
      )}
      {!phone && act}
      {own.orders.length > 0 && <OwnBids orders={own.orders} banks={banks} />}
      {bank && (
        <BidDialog
          open={confirm}
          onClose={() => setConfirm(false)}
          bank={bank}
          asin={asin}
          price={price}
          shares={shares}
          maturity={tender.data.bondListing.endDate ?? undefined}
          mainRate={withMe?.main}
        />
      )}
    </div>
  );
  if (!phone) return body;
  // Phone: the bid (or why there is none) stays in a bar at the bottom, the simulator scrolls above it.
  return (
    <>
      {wrap(body)}
      <div className="cb-bar tdr__bar">{act}</div>
    </>
  );
}

type OwnOrder = ReturnType<typeof useOrdersOn>['orders'][number];

/** My bids in the running tender, each withdrawable after confirming. */
function OwnBids({ orders, banks }: { orders: OwnOrder[]; banks: MyBank[] }) {
  const del = useDeleteOrder();
  const [pick, setPick] = useState<OwnOrder | null>(null);
  const name = (id: string) => banks.find((b) => b.securitiesAccountId === id)?.name ?? '';
  return (
    <>
      <h3 className="cb__h">Deine Gebote</h3>
      <ul className="tdr__own">
        {orders.map((o) => (
          <li key={o.id}>
            <span className="cb__mono">{o.price != null ? bidPct(o.price) : '–'}</span>
            <span className="cb__mono">{short(o.numberOfShares)}{NBSP}Stk.</span>
            <span className="tdr__own-name">{name(o.accountId)}</span>
            <DS.Button size="sm" variant="ghost" onClick={() => setPick(o)}>
              Zurückziehen …
            </DS.Button>
          </li>
        ))}
      </ul>
      <Confirm
        open={!!pick}
        danger
        title="Gebot zurückziehen?"
        description={pick ? `${pick.price != null ? bidPct(pick.price) : ''} für ${short(pick.numberOfShares)} Stück (${name(pick.accountId)}).` : undefined}
        confirmLabel="Zurückziehen"
        pending={del.isPending}
        error={del.error?.message}
        onClose={() => {
          setPick(null);
          del.reset();
        }}
        onConfirm={() => pick && del.mutate(pick.id, { onSuccess: () => setPick(null) })}
      />
    </>
  );
}

/** Confirmation before a bid: the order as the server will get it, checked first (read-only GET). */
export function BidDialog({
  open,
  onClose,
  bank,
  asin,
  price,
  shares,
  maturity,
  mainRate,
}: {
  open: boolean;
  onClose: () => void;
  bank: MyBank;
  asin: string;
  price: number;
  shares: number;
  maturity?: number;
  mainRate?: number;
}) {
  const add = useAddOrder();
  const [check, setCheck] = useState<{ key: string; result?: OrderCheck; error?: string } | null>(null);
  const [done, setDone] = useState(false);
  const query = {
    owner: bank.securitiesAccountId,
    securityIdentifier: asin,
    action: 'BUY' as const,
    type: 'LIMIT' as const,
    price: String(price),
    numberOfShares: shares,
  };
  const key = JSON.stringify(query);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    checkOrder(JSON.parse(key))
      .then((result) => alive && setCheck({ key, result }))
      .catch((e: Error) => alive && setCheck({ key, error: e.message }));
    return () => {
      alive = false;
    };
  }, [open, key]);
  const current = check?.key === key ? check : null;
  const failed = current?.result?.checkResult?.failed ? translate(current.result.checkResult.msg as ApiMessage) || 'Die Prüfung ist fehlgeschlagen.' : current?.error;
  const m = bidMoney(price, shares);
  const close = () => {
    add.reset();
    setDone(false);
    onClose();
  };
  return (
    <Confirm
      open={open}
      alert
      title={done ? 'Gebot abgegeben' : 'Gebot abgeben?'}
      description={done ? 'Es steht jetzt im Buch des Tenders und wird am Ende zu deinem Preis bedient.' : `${bank.name} bietet im Zinstender ${asin}.`}
      confirmLabel={done ? 'Fertig' : 'Verbindlich bieten'}
      pending={add.isPending}
      confirmDisabled={!done && !current}
      error={add.error?.message ?? (done ? null : failed)}
      onClose={close}
      onConfirm={() =>
        done
          ? close()
          : add.mutate(query, {
              onSuccess: () => setDone(true),
            })
      }
    >
      {!done && (
        <DS.SummaryList
          items={[
            { label: 'Gebot', value: `${bidPct(price)} (Leitzins ${signedRate(bidEffect(price))})` },
            { label: 'Stück', value: shares, unit: 'Stk.' },
            { label: 'Du zahlst', value: m.cost },
            { label: maturity ? `Zurück am ${new Date(maturity).toLocaleDateString('de-DE')}` : 'Zurück nach 7 Tagen', value: m.payout },
            { label: 'Ergebnis', value: m.result, total: true },
            ...(mainRate != null ? [{ label: 'Leitzins danach (Schätzung)', value: pct(mainRate) }] : []),
          ]}
        />
      )}
    </Confirm>
  );
}

/**
 * Leitzins und Tender: the main rate over time, each tender's weighted bid, the bonds per bidder
 * (up = raises the rate, down = lowers it). The bidder chips are legend and filter at once: a chosen
 * bidder stays coloured and a dashed line shows the rate without them.
 */
export function TenderHistory({ phone }: { phone?: boolean }) {
  const { trades, tenders, allotments } = useTenderData();
  const history = useInterestHistory(1000);
  const { banks } = useMyBanks();
  const [range, setRange] = useParamState('verlauf', '30T', RANGES);
  const now = allotments.dataUpdatedAt;
  const ms = RANGES.find((r) => r.value === range)?.ms;
  const shown = useMemo(() => (ms ? tenders.filter((t) => t.date >= now - ms) : tenders), [tenders, ms, now]);
  const shares = useMemo(() => bidderShares(shown), [shown]);
  const colors = useMemo(() => bidderColors(bidderShares(tenders), banks.map((b) => b.name)), [tenders, banks]);
  const options = useMemo(() => [{ value: '' }, ...shares.map((s) => ({ value: s.bidder }))], [shares]);
  const [selected, setSelected] = useParamState('bieter', '', options);
  const without = useMemo(
    () => (selected ? rateAfterTenders(trades, tenders, selected).filter((p) => !ms || p.date >= now - ms) : undefined),
    [trades, tenders, selected, ms, now],
  );
  const lastWithout = without?.at(-1)?.without;
  const current = trades.length ? rateAt(trades, trades[trades.length - 1].date) : undefined;
  const legend = useRef<HTMLDivElement>(null);
  useEdgeFade(legend, undefined, undefined, shares.length);

  if (allotments.isLoading || history.isLoading)
    return (
      <div className="tdr__hist">
        <div className="tdr__legend" />
        <DS.Skeleton variant="block" />
      </div>
    );
  if (!tenders.length) return <DS.EmptyState compact as="h3" title="Keine Tenderergebnisse" />;
  return (
    <div className="tdr__hist">
      <div ref={legend} className="tdr__legend ph-fade" role="group" aria-label="Bieter hervorheben">
        {shares.slice(0, 6).map((s) => (
          <button
            key={s.bidder}
            type="button"
            className="tdr__chip"
            aria-pressed={selected === s.bidder}
            title={`${s.bidder}: ${s.percent.toLocaleString('de-DE', { maximumFractionDigits: 1 })} % der Stücke, im Schnitt ${signedRate(s.effect)}`}
            onClick={() => setSelected(selected === s.bidder ? '' : s.bidder)}
          >
            <span className="tdr__swatch" style={{ background: `var(--${colors[s.bidder] ?? 'line-strong'})` }} aria-hidden />
            <span className="tdr__chip-name">{s.bidder}</span>
            <span className="tdr__chip-num">{s.percent < 1 ? '<1' : Math.round(s.percent)}{NBSP}%</span>
          </button>
        ))}
      </div>
      <div className="tdr__ruleline">
      <p className="cb__note tdr__rule">
        {selected && lastWithout != null ? (
          <>
            Ohne {selected}: Leitzins <b>{pct(Math.round(lastWithout * 100) / 100)}</b> statt <b>{pct(current != null ? Math.round(current * 100) / 100 : undefined)}</b>
          </>
        ) : (
          <>
            Leitzins = Ø (Gebot − 100 %) der letzten 7 Tage, je Stück{current != null && <> · nachgerechnet <b>{pct(Math.round(current * 100) / 100)}</b></>}
          </>
        )}
      </p>
        {!phone && <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Zeitraum" options={RANGES} value={range} onChange={setRange} />}
      </div>
      <div className="tdr__histchart">
        <Plot
          aria-label="Leitzins, Ergebnis jedes Tenders und Stücke je Bieter im Verlauf"
          figure={(t, w) =>
            tenderHistoryChart(t, w, {
              rates: (history.data ?? []).map((r) => ({ date: r.date, main: r.mainInterestRate })),
              tenders: shown,
              without,
              selected: selected || undefined,
              colors,
            })
          }
          onPointClick={(p) => {
            // bars carry the bidder in customdata[0]
            const b = Array.isArray(p.customdata) ? p.customdata[0] : undefined;
            if (typeof b === 'string' && shares.some((s) => s.bidder === b)) setSelected(selected === b ? '' : b);
          }}
        />
      </div>
    </div>
  );
}
