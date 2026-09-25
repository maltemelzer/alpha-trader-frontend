import { useMemo } from 'react';
import { DS } from '../ds';
import {
  useCapitalMeasures,
  useCompanyHistograms,
  useDailyHistory,
  useDividendPayments,
  useEntityHistory,
  useMainInterestRate,
  useMergers,
  useShareholders,
  useWarrantsOn,
  type CompanyHistoryPoint,
  type CompanyProfile,
} from '../api/queries';
import type { PricePoint } from '../api/types';
import { Plot } from '../charts/Plot';
import { HelpTerm } from '../app/HelpTerm';
import { useNow } from '../lib/useNow';
import { holderSlices } from '../security/derive';
import { holdersBars } from '../security/charts';
import { reserveIncome } from '../centralbank/derive';
import { valuationChart } from './charts';
import { bondSummary, changePct, priceToBook, RANGES, upcoming, valuationSeries, type IssuedBond, type PollLike, type RangeKey } from './overview';
import { chronicle, rankRows } from './profile';
import { RankRowContent } from './ProfileViews';

const NBSP = String.fromCharCode(0xa0);

/** The profile as the API sends it – the overview also reads the issued bonds and the live price. */
type Profile = CompanyProfile & { issuedBonds?: IssuedBond[]; lastPrice?: PricePoint | null };

const money = (n: number) => DS.format.money(n, '€', 2, 'auto');

/**
 * „Überblick“ – the company at a glance, one screen on desktop:
 * left price vs. book value per share (30/90 days, KBV); middle where it stands among all companies
 * (the core figures as position bars, → Einordnung) and who owns it (largest holders, free float);
 * right what it issues and runs (stock, bonds, warrants, market makers, bank) and what happens next
 * (polls, capital measures, dividends, mergers, bond maturities) plus the latest chronicle entries.
 * Each column scrolls on its own; on phones the sections stack and the tab panel scrolls.
 */
export function Overview({
  company: c,
  asin,
  history,
  polls,
  range,
  onRange,
}: {
  company: Profile | undefined;
  asin: string;
  history: CompanyHistoryPoint[] | undefined;
  polls: PollLike[] | undefined;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
}) {
  const now = useNow();
  const base = `/unternehmen/${asin}`;
  return (
    <div className="ov">
      <Valuation company={c} asin={asin} history={history} range={range} onRange={onRange} now={now} />
      <div className="ov__col ov__col--a">
        <Standing companyId={c?.id} base={base} />
        <Owners asin={asin} freeFloat={(history?.at(-1) as (CompanyHistoryPoint & { freeFloatInPercent?: number }) | undefined)?.freeFloatInPercent} />
      </div>
      <div className="ov__col ov__col--b">
        <Issued company={c} asin={asin} now={now} />
        <Next company={c} asin={asin} polls={polls} now={now} />
        <BankBrief company={c} asin={asin} />
      </div>
    </div>
  );
}

function Section({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`ov-sec ${className}`} aria-label={title}>
      <div className="ov-sec__head">
        <h3 className="ov-sec__title">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Valuation({
  company: c,
  asin,
  history,
  range,
  onRange,
  now,
}: {
  company: Profile | undefined;
  asin: string;
  history: CompanyHistoryPoint[] | undefined;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  now: number;
}) {
  const daily = useDailyHistory(asin);
  const days = RANGES.find((r) => r.value === range)?.days ?? 30;
  const series = useMemo(
    () => valuationSeries(history, daily.data, days, now, c?.lastPrice ?? undefined),
    [history, daily.data, days, now, c?.lastPrice],
  );
  const change = changePct(series.price);
  const kbv = priceToBook(c?.lastPrice?.value, c?.companyCapabilities?.bookValuePerShare);
  const loading = daily.isLoading || !history;
  return (
    <Section
      title="Kurs & Buchwert je Aktie"
      className="ov__val"
      action={
        <DS.SegmentedControl
          size="sm"
          aria-label="Zeitraum"
          fullWidth={false}
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          value={range}
          onChange={(v) => onRange(v as RangeKey)}
        />
      }
    >
      <p className="ov-sec__sub">
        {change != null ? <DS.PriceChange value={change} suffix={`in ${days} Tagen`} size="sm" /> : NBSP}
        {kbv != null && (
          <span className="ov__kbv">
            KBV <b className="num">{kbv.toLocaleString('de-DE', { maximumFractionDigits: kbv < 10 ? 2 : 0 })}</b>
            {kbv < 1 ? ' · unter Buchwert' : ''}
          </span>
        )}
      </p>
      <div className="ov__plot">
        {series.price.length || series.book.length ? (
          <Plot aria-label={`Kurs und Buchwert je Aktie, letzte ${days} Tage`} figure={(t, w) => valuationChart(t, w, series)} />
        ) : loading ? (
          <DS.Skeleton variant="block" />
        ) : (
          <DS.EmptyState compact as="h4" title="Noch kein Kursverlauf" />
        )}
      </div>
    </Section>
  );
}

/** The company figures as position bars (Einordnung): each row links to its distribution. */
function Standing({ companyId, base }: { companyId: string | undefined; base: string }) {
  const q = useCompanyHistograms(companyId);
  const rows = useMemo(() => rankRows(q.data).filter((r) => r.population === 'companies'), [q.data]);
  return (
    <Section title="Unter allen Unternehmen" action={<a className="ov-sec__more" href={`${base}?ansicht=einordnung`}>Einordnung</a>}>
      {rows.length ? (
        <ul className="ov__rank ov__rank-loading">
          {rows.slice(0, 4).map((r) => (
            <li key={r.key}>
              <a className="rank-row" href={`${base}?ansicht=einordnung&kennzahl=${r.key}`}>
                <RankRowContent r={r} />
              </a>
            </li>
          ))}
          <li className="ov__asof">Werte vom letzten Tagesabschluss – oben stehen die aktuellen.</li>
        </ul>
      ) : q.isError ? (
        <p className="ov__none">Vergleich nicht verfügbar.</p>
      ) : (
        <div className="ov__rank-loading ov__rank-loading--wait">
          <DS.Loading rows={4} label="Einordnung wird geladen" />
        </div>
      )}
    </Section>
  );
}

function Owners({ asin, freeFloat }: { asin: string; freeFloat: number | undefined }) {
  const holders = useShareholders(asin);
  const slices = useMemo(() => holderSlices(holders.data), [holders.data]);
  const n = holders.data?.length;
  return (
    <Section
      title={n ? `Anteilseigner · ${n.toLocaleString('de-DE')}` : 'Anteilseigner'}
      action={
        <span className="ov-sec__meta">
          {freeFloat != null ? (
            <>
              <HelpTerm id="freeFloatInPercent">Streubesitz</HelpTerm>{' '}
              <b className="num">{freeFloat.toLocaleString('de-DE', { maximumFractionDigits: 2 })}{NBSP}%</b>
            </>
          ) : (
            NBSP
          )}
        </span>
      }
    >
      <div className="ov__holders" style={{ height: Math.max(3, slices.length) * 30 }}>
        {slices.length ? (
          <Plot aria-label="Größte Anteilseigner in Prozent" figure={(t, w) => holdersBars(t, w, slices)} />
        ) : holders.isLoading ? (
          <DS.Skeleton variant="block" />
        ) : (
          <p className="ov__none">Keine Anteilseigner.</p>
        )}
      </div>
    </Section>
  );
}

/** One fact line: label, value, a short note; the whole line links when there is somewhere to go. */
function Fact({ label, value, note, href }: { label: string; value: React.ReactNode; note?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="ov-fact__label">{label}</span>
      <span className="ov-fact__value">{value}</span>
      {note ? <span className="ov-fact__note">{note}</span> : null}
    </>
  );
  return <li>{href ? <a className="ov-fact ov-fact--link" href={href}>{body}</a> : <div className="ov-fact">{body}</div>}</li>;
}

function Issued({ company: c, asin, now }: { company: Profile | undefined; asin: string; now: number }) {
  const warrants = useWarrantsOn(asin);
  if (!c)
    return (
      <Section title="Ausgegeben">
        <ul className="ov__facts">
          {['Anleihen', 'Optionsscheine', 'Market Maker'].map((l) => (
            <Fact key={l} label={l} value={<DS.Skeleton width="6em" />} />
          ))}
        </ul>
      </Section>
    );
  const bonds = bondSummary(c.issuedBonds, now);
  const sponsors = c.designatedSponsors ?? [];
  const sponsored = c.sponsoredListings ?? [];
  const nWarrants = warrants.data?.totalElements ?? warrants.data?.content.length;
  return (
    <Section title="Ausgegeben">
      <ul className="ov__facts">
        <Fact
          label="Anleihen"
          value={bonds.count ? `${bonds.count.toLocaleString('de-DE')} laufend` : 'keine'}
          note={
            bonds.count
              ? `${money(bonds.volume)} · Ø ${bonds.rate?.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${NBSP}% bis Fälligkeit`
              : undefined
          }
          href={bonds.nextAsin ? `/wertpapier/${bonds.nextAsin}` : undefined}
        />
        <Fact
          label="Optionsscheine"
          value={nWarrants == null ? '…' : nWarrants ? `${nWarrants} auf die Aktie` : 'keine'}
          href={nWarrants ? `/wertpapier/${asin}?karte=scheine` : undefined}
        />
        <Fact
          label="Market Maker"
          value={sponsors.length ? `${sponsors.length} betreuen die Aktie` : c.marketMakerPolicy === 'CLOSED' ? 'geschlossen' : 'offen, keiner'}
          note={sponsored.length ? `selbst Sponsor für ${sponsored.length}` : undefined}
          href={`/unternehmen/${asin}?ansicht=marketmaker`}
        />
      </ul>
    </Section>
  );
}

/** Banks only, last in its column (it appears with the profile – nothing below it jumps). */
function BankBrief({ company: c, asin }: { company: Profile | undefined; asin: string }) {
  const rate = useMainInterestRate();
  const caps = c?.companyCapabilities;
  if (!caps?.bank) return null;
  const max = caps.maxCentralBankLoans ?? 0;
  const taken = caps.takenCentralBankLoans ?? 0;
  const income = reserveIncome(caps.reserves, rate.data?.reserveInterestRate);
  return (
    <Section title="Bank" action={<a className="ov-sec__more" href={`/unternehmen/${asin}?ansicht=bank`}>Details</a>}>
      <div className="ov__bank">
        <span className="ov__bank-row">
          <span>
            Einlage <b className="num">{money(caps.reserves ?? 0)}</b>
          </span>
          <span>{income != null ? <>Zins/Tag <b className="num">{money(income)}</b></> : NBSP}</span>
        </span>
        <DS.ProgressBar
          size="sm"
          variant="neutral"
          label="Kredit genutzt"
          value={max ? (taken / max) * 100 : 0}
          valueText={`${DS.format.money(taken, '€', 2, true)} von ${DS.format.money(max, '€', 2, true)}`}
        />
      </div>
    </Section>
  );
}

function Next({ company: c, asin, polls, now }: { company: Profile | undefined; asin: string; polls: PollLike[] | undefined; now: number }) {
  const inc = useCapitalMeasures('increase');
  const red = useCapitalMeasures('reduction');
  const div = useDividendPayments();
  const mer = useMergers();
  const hist = useEntityHistory(c?.id);
  const items = useMemo(
    () =>
      c
        ? upcoming(
            c.id,
            {
              polls,
              increases: inc.data?.content,
              reductions: red.data?.content,
              dividends: div.data?.content,
              mergers: mer.data?.content,
              bonds: bondSummary(c.issuedBonds, now),
              pollKinds: DS.POLL_KINDS,
              asin,
            },
            now,
          )
        : [],
    [c, polls, inc.data, red.data, div.data, mer.data, now, asin],
  );
  const recent = useMemo(() => chronicle(hist.data?.content).filter((e) => !e.minor).slice(-4).reverse(), [hist.data]);
  return (
    <Section title="Demnächst" action={<a className="ov-sec__more" href={`/unternehmen/${asin}?ansicht=chronik`}>Chronik</a>}>
      {items.length ? (
        <ul className="ov__events">
          {items.slice(0, 4).map((e) => (
            <li key={e.id} className="ov-ev">
              <span className="ov-ev__when">
                <DS.Countdown to={e.date} short />
              </span>
              <span className="ov-ev__text">
                {e.href ? <a href={e.href}>{e.label}</a> : e.label}
                {e.detail ? <span className="ov-ev__detail"> · {e.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ov__none ov__none--next">{c ? 'Nichts angekündigt – keine laufende Abstimmung, Kapitalmaßnahme oder Fusion.' : NBSP}</p>
      )}
      <h4 className="ov-sec__title ov-sec__title--minor">Zuletzt</h4>
      {recent.length ? (
        <ul className="ov__events">
          {recent.map((e) => (
            <li key={e.id} className="ov-ev">
              <span className="ov-ev__when">{DS.format.dateTime(e.date, false)}</span>
              <span className="ov-ev__text ov-ev__text--clamp" title={e.text}>
                {e.text}
              </span>
            </li>
          ))}
        </ul>
      ) : hist.isLoading || !c ? (
        <DS.Loading rows={3} label="Chronik wird geladen" />
      ) : (
        <p className="ov__none">Noch keine Ereignisse.</p>
      )}
    </Section>
  );
}
