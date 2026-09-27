import { useMemo, useState } from 'react';
import { DS } from '../ds';
import {
  useCompaniesByAsin,
  useHighscores,
  useInterestHistory,
  useMainInterestRate,
  useMoneySupply,
  useMoneySupplyBreakdown,
  useMyBanks,
  useReservesPayment,
  useSystemBonds,
} from '../api/queries';
import { HelpTerm } from '../app/HelpTerm';
import { Plot } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { rangeMs } from '../lib/ranges';
import { filterSummary, filtersFor } from '../lib/pagenav';
import { PageNav, useFilters, usePageView, type PageView } from '../app/pagenav';
import { CB_FILTERS } from './filters';
import { bankSharesChart, dueChart, moneySupplyChart, potsChart, rateHistoryChart } from './charts';
import { bankShares, dueByDay, potRows, rateOnlyBelowTarget, rateWindow, signedPct, supplySeries, targetGrowthPct } from './derive';
import { CreditForm } from './CreditForm';
import { TenderBid, TenderPhone, TenderSide } from './TenderPanel';
import { MiniStats } from '../app/phone';
import './CentralBankPage.css';

const pct = (n: number | undefined, d = 2) =>
  n == null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

/** One set of views for every screen; „Banken“ is the context card of „Zinsen“ on wide screens. */
const VIEWS: PageView[] = [
  { value: 'zinsen', label: 'Zinsen', description: 'Leitzins, Einlagezins und Systemanleihe im Verlauf' },
  { value: 'banken', label: 'Banken', parent: 'zinsen', description: 'Wer die Einlagen hält und wie viel Kredit genutzt wird' },
  { value: 'tender', label: 'Zinstender', description: 'Was dein Gebot bewirkt, Verlauf und Buch' },
  { value: 'kredite', label: 'Kredite', description: 'Laufende Systemanleihen und Kredit aufnehmen' },
  { value: 'geld', label: 'Geldmenge', description: 'Geldmenge gegen Ziel und wo das Geld liegt' },
  { value: 'regeln', label: 'So funktioniert’s', description: 'Die Regeln in Kürze, mit Quellen' },
];

/** Forum posts of the game that explain the rules (Offizielles Forum). */
const FORUM = '/forum/08e13473-024a-4637-b8d7-b856d07b1b5b';

/**
 * Zentralbank: the rates the game sets (main rate, reserve rate per day, system bond rate) and how
 * they moved, who holds the central bank reserves, the credit the central bank gave through system
 * bonds, the running interest tender – and in short how banking works in the game.
 *
 * Navigation: one row of views under the title (each view picks its cards) and the page's filters
 * (Zeitraum, and for the tender „Übrige Gebote“) at its right end – see `PageNav`.
 */
export function CentralBankPage() {
  const onLinkClick = useInternalLinks();
  const isPhone = useIsPhone();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const main = useMainInterestRate();
  const history = useInterestHistory(1000);
  const payment = useReservesPayment();
  const [view, setView, views] = usePageView(VIEWS, 'zinsen');
  const filters = useFilters(CB_FILTERS);
  const range = filters.values.zeitraum;

  const now = history.dataUpdatedAt;
  const points = useMemo(() => rateWindow(history.data, rangeMs(range), now), [history.data, range, now]);
  const latest = history.data?.length ? rateWindow(history.data, undefined).at(-1) : undefined;
  const reserveRate = main.data?.reserveInterestRate ?? latest?.reserveInterestRate;
  const systemRate = latest?.systemBondInterestRate ?? (main.data ? main.data.value + 1 : undefined);
  const nav = <PageNav label="Ansicht" views={views} view={view} onView={setView} filters={filters} />;

  const stats = (
    <DS.StatGroup columns="repeat(4, minmax(0, 1fr))" aria-label="Zinsen der Zentralbank">
      <DS.StatTile label={<HelpTerm id="mainInterestRate">Leitzins</HelpTerm>} value={pct(main.data?.value)} hint="aus dem Zinstender" />
      <DS.StatTile label="Einlagezins" value={reserveRate != null ? `${pct(reserveRate)} / Tag` : '–'} hint="auf Zentralbankeinlagen, + Boost" />
      <DS.StatTile label={<HelpTerm id="systemBond">Systemanleihe</HelpTerm>} value={pct(systemRate)} hint="Kredit der Zentralbank · Leitzins + 1" />
      <DS.StatTile
        label="Zuletzt ausgezahlt"
        value={payment.data ? payment.data.paidInterest : '–'}
        compact
        hint={
          payment.data?.nextPaymentDate ? (
            <DS.Countdown to={payment.data.nextPaymentDate} label="nächste in" short />
          ) : (
            'Zinsen auf alle Einlagen'
          )
        }
      />
    </DS.StatGroup>
  );

  const chart = (
    <DS.Card className="panel" title={isPhone ? undefined : 'Zinsverlauf'}>
      <div className="panel__fill cb__chart">
        {history.isLoading ? (
          <DS.Skeleton variant="block" />
        ) : points.length > 1 ? (
          <Plot aria-label="Leitzins, Zins der Systemanleihe und Einlagezins im Verlauf" figure={(t, w) => rateHistoryChart(t, w, points)} />
        ) : (
          <DS.EmptyState compact as="h3" title="Kein Zinsverlauf" />
        )}
      </div>
    </DS.Card>
  );

  /** A card whose content scrolls – the building block of every view. */
  const card = (title: string | undefined, content: React.ReactNode, className = 'cb__pad') => (
    <DS.Card flush className="panel" title={title}>
      <div className={`panel__fill scroll ${className}`}>{content}</div>
    </DS.Card>
  );

  if (isPhone) {
    // Phone: one control row (views + filter button), the rest is the view. The main rates sit in the meta line;
    // the „Zinsen“ view shows them as one compact row above the chart, with the last payout in the meta line instead.
    const phoneStats = (
      <MiniStats
        label="Zinsen der Zentralbank"
        items={[
          { key: 'main', label: <HelpTerm id="mainInterestRate">Leitzins</HelpTerm>, value: pct(main.data?.value) },
          { key: 'reserve', label: 'Einlage / Tag', value: pct(reserveRate) },
          { key: 'system', label: <HelpTerm id="systemBond">Systemanl.</HelpTerm>, value: pct(systemRate) },
        ]}
      />
    );
    const chosen = filterSummary(filtersFor(CB_FILTERS, view), filters.values);
    const meta =
      view === 'zinsen' ? (
        <span className="cb__meta">
          Ausgezahlt {payment.data ? <DS.Amount value={payment.data.paidInterest} compact /> : '–'}
          {payment.data?.nextPaymentDate ? (
            <>
              {' · '}
              <DS.Countdown to={payment.data.nextPaymentDate} label="nächste in" short />
            </>
          ) : null}
          {chosen && ` · ${chosen}`}
        </span>
      ) : (
        <span className="cb__meta">
          Leitzins {pct(main.data?.value)} · Einlage {pct(reserveRate)} / Tag{chosen && ` · ${chosen}`}
        </span>
      );
    return (
      <div className="page cb cb--phone" onClick={onLinkClick}>
        <DS.PageHeader size="md" title="Zentralbank" meta={meta} />
        <div className={`page__body cb__body${view === 'zinsen' ? ' cb__body--stats' : ''}`}>
          {nav}
          {view === 'zinsen' ? (
            <>
              {phoneStats}
              {chart}
            </>
          ) : view === 'tender' ? (
            <TenderPhone />
          ) : view === 'kredite' ? (
            <CreditPhone />
          ) : view === 'banken' ? (
            card(undefined, <Banks />)
          ) : view === 'geld' ? (
            card(undefined, <MoneySupply />)
          ) : (
            card(undefined, <Rules mainRate={main.data?.value} reserveRate={reserveRate} />)
          )}
        </div>
      </div>
    );
  }

  // Wide and middle: every view is a main card and (except the rules) a context card beside it (below it in the middle).
  const cards: Record<string, React.ReactNode> = {
    zinsen: (
      <>
        {chart}
        {card('Banken', <Banks />)}
      </>
    ),
    tender: (
      <>
        {card('Was bewirkt dein Gebot?', <TenderBid />, 'cb__tender')}
        {card('Leitzins und Tender', <TenderSide />)}
      </>
    ),
    kredite: (
      <>
        {card('Systemanleihen', <Credit />)}
        {card('Kredit aufnehmen', <CreditForm heading={false} />)}
      </>
    ),
    geld: (
      <>
        {card('Geldmenge und Ziel', <MoneySupply part="supply" />)}
        {card('Wo das Geld liegt', <MoneySupply part="pots" />)}
      </>
    ),
    regeln: card('So funktioniert’s', <Rules mainRate={main.data?.value} reserveRate={reserveRate} />, 'cb__pad cb__read'),
  };

  return (
    <div className={`page cb${isWide ? ' cb--wide' : ''} cb--${view}`} onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Zentralbank" meta={<span>Leitzins, Einlagen der Banken und Kredite der Zentralbank</span>} tabs={nav} />
      <div className="page__body cb__body">
        {stats}
        <div className={`cb__grid cb__grid--${view}`}>{cards[view]}</div>
      </div>
    </div>
  );
}

/** Who holds the reserves: the largest holders as bars, then how much credit the largest banks use. */
function Banks() {
  const list = useHighscores('company', 'RESERVES', 0, '', 100);
  const entries = useMemo(
    () =>
      (list.data?.content ?? []).map((e) => ({
        name: e.company?.name ?? '–',
        asin: e.company?.securityIdentifier,
        reserves: e.value,
      })),
    [list.data],
  );
  const rows = useMemo(() => bankShares(entries, 7), [entries]);
  const total = entries.reduce((s, e) => s + e.reserves, 0);
  const top = useMemo(() => entries.slice(0, 12).flatMap((e) => (e.asin ? [e.asin] : [])), [entries]);
  const profiles = useCompaniesByAsin(top);
  const credit = top
    .map((asin, i) => ({ asin, name: profiles[i]?.name ?? entries[i]?.name ?? asin, caps: profiles[i]?.companyCapabilities }))
    .filter((c) => c.caps)
    .sort((a, b) => (b.caps!.takenCentralBankLoans ?? 0) - (a.caps!.takenCentralBankLoans ?? 0));
  const using = credit.filter((c) => (c.caps!.takenCentralBankLoans ?? 0) > 0);
  const idle = credit.length - using.length;

  if (list.isLoading) return <DS.Loading rows={6} />;
  if (!rows.length) return <DS.EmptyState compact as="h3" title="Keine Einlagen" />;
  return (
    <div className="cb__stack">
      <p className="cb__note">
        <b>
          <DS.Amount value={total} compact />
        </b>{' '}
        Zentralbankeinlagen bei den {entries.filter((e) => e.reserves > 0).length.toLocaleString('de-DE')} größten Einlegern
      </p>
      <div className="cb__bars" style={{ height: 32 * rows.length + 8 }}>
        <Plot aria-label="Anteil an allen Zentralbankeinlagen je Bank" figure={(t, w) => bankSharesChart(t, w, rows)} />
      </div>
      <h3 className="cb__h">Kreditrahmen genutzt</h3>
      {credit.length < top.length ? (
        <DS.Loading rows={2} />
      ) : (
        <ul className="cb__credit">
          {using.map((c) => {
            const max = c.caps!.maxCentralBankLoans ?? 0;
            const taken = c.caps!.takenCentralBankLoans ?? 0;
            return (
              <li key={c.asin}>
                <div className="cb__row">
                  <a href={`/unternehmen/${c.asin}`}>{c.name}</a>
                  <span>
                    <DS.Amount value={taken} compact /> von <DS.Amount value={max} compact />
                  </span>
                </div>
                <DS.ProgressBar size="sm" variant="neutral" value={max ? (taken / max) * 100 : 0} showValue={false} aria-label={`${c.name}: Kreditrahmen genutzt`} />
              </li>
            );
          })}
          {idle > 0 && (
            <li className="cb__note">
              {using.length ? `${idle} weitere` : `Keine der ${idle}`} der {top.length} größten Banken {using.length ? 'nutzen' : 'nutzt'} ihren
              Kreditrahmen nicht.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Phone: the credit view fills the card and scrolls; taking credit sits in a bar at the bottom (thumb zone)
 * and opens the form in a sheet – for non-banks the bar says why there is none.
 */
function CreditPhone() {
  const { banks, isLoading } = useMyBanks();
  const [open, setOpen] = useState(false);
  return (
    <DS.Card flush className="panel">
      <div className="panel__fill scroll cb__pad">
        <Credit phone />
      </div>
      <div className="cb-bar">
        {isLoading ? (
          <DS.Skeleton variant="text" />
        ) : banks.length ? (
          <DS.Button variant="primary" fullWidth onClick={() => setOpen(true)}>
            Kredit aufnehmen …
          </DS.Button>
        ) : (
          <span className="cb__note tdr__lock">
            <DS.Icon name="bank" size={16} /> Kredit nehmen können nur Banken – du führst keine.
          </span>
        )}
      </div>
      <DS.Sheet open={open} onClose={() => setOpen(false)} title="Kredit aufnehmen" side="bottom">
        <CreditForm heading={false} />
      </DS.Sheet>
    </DS.Card>
  );
}

/** Central bank credit: the running system bonds, their volume and when it falls due. */
function Credit({ phone }: { phone?: boolean }) {
  const bonds = useSystemBonds();
  const now = bonds.dataUpdatedAt;
  const running = useMemo(() => (bonds.data ?? []).filter((b) => (b.maturityDate ?? 0) > now), [bonds.data, now]);
  const days = useMemo(() => dueByDay(running, now), [running, now]);
  const volume = running.reduce((s, b) => s + (b.volume ?? 0), 0);
  const rates = [...new Set(running.map((b) => b.interestRate))].sort((a, b) => a - b);

  if (bonds.isLoading) return <DS.Loading rows={4} />;
  if (!running.length) return <DS.EmptyState compact as="h3" title="Keine laufenden Systemanleihen" />;
  return (
    <div className="cb__stack">
      {phone ? (
        <MiniStats
          label="Systemanleihen"
          columns="minmax(0, 0.6fr) minmax(0, 1fr) minmax(0, 1.15fr)"
          items={[
            { label: 'Laufend', value: String(running.length) },
            { label: 'Volumen', value: <DS.Amount value={volume} compact /> },
            { label: 'Zins', value: rates.length > 1 ? `${rates[0].toLocaleString('de-DE', { minimumFractionDigits: 2 })}–${pct(rates.at(-1))}` : pct(rates[0]) },
          ]}
        />
      ) : (
        <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Systemanleihen">
          <DS.StatTile label="Laufend" value={String(running.length)} hint="Systemanleihen" />
          <DS.StatTile label="Volumen" value={volume} compact hint="Kredit der Zentralbank" />
          <DS.StatTile label="Zins" value={rates.length > 1 ? `${rates[0].toLocaleString('de-DE', { minimumFractionDigits: 2 })}–${pct(rates.at(-1))}` : pct(rates[0])} hint="für die Laufzeit" />
        </DS.StatGroup>
      )}
      <h3 className="cb__h">Fällig nach Tag</h3>
      <div className="cb__due">
        <Plot aria-label="Volumen der Systemanleihen nach Fälligkeitstag" figure={(t, w) => dueChart(t, w, days)} />
      </div>
      <p className="cb__note">
        Banken leihen sich Geld bei der Zentralbank, indem sie Systemanleihen ausgeben – bis 10 % ihrer Einlage, zum Leitzins
        + 1 %, Laufzeit etwa 6½ Tage.
      </p>
    </div>
  );
}

/**
 * Money supply: the players' money supply against its target over the last snapshots, the bonds
 * sold at each step, and where all money sits now (pots). Only what the numbers show is claimed:
 * the target is the previous supply + 0,1 %, and a rate was applied only below the target.
 */
function MoneySupply({ part }: { part?: 'supply' | 'pots' }) {
  const phone = useIsPhone();
  const supply = useMoneySupply();
  const breakdown = useMoneySupplyBreakdown();
  const points = useMemo(() => supplySeries(supply.data?.snapshots), [supply.data]);
  const pots = useMemo(() => potRows(breakdown.data?.pots), [breakdown.data]);
  const last = points.at(-1);
  const growth = targetGrowthPct(points);
  const b = breakdown.data;
  const rate = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  if (supply.isLoading || breakdown.isLoading) return <DS.Loading rows={6} />;
  // wide screens show the two parts as two cards
  const showSupply = part !== 'pots';
  const showPots = part !== 'supply';
  return (
    <div className="cb__stack">
      {!showSupply ? null : phone ? (
        <MiniStats
          label="Geldmenge"
          columns="minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 0.8fr)"
          items={[
            { label: 'Geld gesamt', value: b ? <DS.Amount value={b.total} compact /> : '–' },
            { label: 'Geldmenge', value: last ? <DS.Amount value={last.supply} compact /> : '–' },
            { label: 'Zins zuletzt', value: last ? rate(last.ratePct) : '–' },
          ]}
        />
      ) : (
        <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Geldmenge">
          <DS.StatTile label="Geld gesamt" value={b ? b.total : '–'} compact hint="Konten + Einlagen" />
          <DS.StatTile label="Geldmenge" value={last ? last.supply : '–'} compact hint={last ? `${signedPct(last.gapPct)} zum Ziel` : ' '} />
          <DS.StatTile label="Zins zuletzt" value={last ? rate(last.ratePct) : '–'} hint="beim letzten Schritt" />
        </DS.StatGroup>
      )}
      {showSupply && !part && <h3 className="cb__h">Geldmenge und Ziel</h3>}
      {showSupply && (
        <>
          <div className="cb__supply">
            {points.length > 1 ? (
              <Plot aria-label="Geldmenge der Spieler und Zielmenge im Verlauf, darunter verkaufte Anleihen" figure={(t, w) => moneySupplyChart(t, w, points)} />
            ) : (
              <DS.EmptyState compact as="h3" title="Kein Verlauf" />
            )}
          </div>
          <p className="cb__note">
            Geldmenge und Ziel meldet das Spiel so; was genau zur Geldmenge zählt, sagt es nicht.
            {growth != null && ` Das Ziel ist jeweils die vorige Geldmenge ${signedPct(growth, 1)}.`}
            {rateOnlyBelowTarget(points) &&
              ` In diesen ${points.length} Schritten gab es nur einen Zins, wenn die Geldmenge unter dem Ziel lag (bis ${rate(
                Math.max(0, ...points.map((p) => p.ratePct)),
              )}), sonst 0 %.`}
          </p>
        </>
      )}
      {showPots && !part && <h3 className="cb__h">Wo das Geld liegt</h3>}
      {!showPots ? null : pots.length ? (
        <div className="cb__bars" style={{ height: 30 * pots.length + 8 }}>
          <Plot aria-label="Anteil am gesamten Geld je Topf" figure={(t, w) => potsChart(t, w, pots)} />
        </div>
      ) : (
        <DS.EmptyState compact as="h3" title="Keine Aufteilung" />
      )}
      {showPots && b && (
        <p className="cb__note">
          <b>
            <DS.Amount value={b.totalBankCash} compact />
          </b>{' '}
          liegen auf Konten,{' '}
          <b>
            <DS.Amount value={b.totalReserves} compact />
          </b>{' '}
          als Zentralbankeinlagen. In Klammern: Zahl der Konten.
        </p>
      )}
    </div>
  );
}

/** The rules in short, with the live figures; sources are the game's own forum posts. */
function Rules({ mainRate, reserveRate }: { mainRate?: number; reserveRate?: number }) {
  return (
    <div className="cb__stack">
      <dl className="cb__rules">
        <dt>Banklizenz</dt>
        <dd>
          Ein Unternehmen mit mindestens 5 Mio. € Bargeld kann sie beantragen – als CEO unter <b>Unternehmen → Führen → Bank</b>.
        </dd>
        <dt>Zentralbankeinlage</dt>
        <dd>
          Bargeld, das eine Bank bei der Zentralbank anlegt. Sie zahlt jeden Tag den Einlagezins darauf (jetzt {pct(reserveRate)},
          halb so viel wie der Leitzins). Mit AlphaCoins lässt er sich um je 0,01 % erhöhen, bis 2 % pro Tag – die Coins werden
          verbrannt.
        </dd>
        <dt>Kreditrahmen</dt>
        <dd>
          Bis 10 % der Einlage darf eine Bank als Kredit aufnehmen. Dafür gibt sie Systemanleihen aus: Zins Leitzins + 1 %
          (jetzt {pct(mainRate != null ? mainRate + 1 : undefined)}), Laufzeit etwa 6½ Tage.
        </dd>
        <dt>Leitzins</dt>
        <dd>
          Schnitt aus (Gebot − 100 %) aller Zuteilungen der Zinstender der letzten 7 Tage, nach Stück gewichtet (jetzt{' '}
          {pct(mainRate)}): Gebote über 100 % heben ihn, darunter senken sie ihn. Neu gesetzt wird er einmal am Tag, gegen 14 Uhr,
          wenn der Tender zugeteilt ist. Bieten dürfen nur Banken.
        </dd>
        <dt>Anleihen</dt>
        <dd>
          Der Zins einer Anleihe gilt für die ganze Laufzeit und wird bei Fälligkeit gezahlt. Vergleichbar wird er erst pro Tag –
          die Wertpapierseite jeder Anleihe zeigt die Rendite pro Tag neben dem Einlagezins.
        </dd>
      </dl>
      <p className="cb__note">
        Quellen: <a href={`${FORUM}/54117377-7142-43ab-b9a1-8901cae734a4`}>Zinstender-Verfahren</a> und{' '}
        <a href={`${FORUM}/9e43ea4b-0839-4598-8bf0-f518083bc9cb`}>Coin-Boost reformieren</a> im Offiziellen Forum, dazu der
        Zinsverlauf der Zentralbank.
      </p>
    </div>
  );
}
