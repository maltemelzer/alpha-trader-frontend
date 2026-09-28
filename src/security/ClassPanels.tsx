// Class-specific panels of the securities page: bond yield, index weights and members, ETF tracking, building price.
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import {
  useBond,
  useBondUniverse,
  useBuildings,
  useCompanyByAsin,
  useDailyHistory,
  useEtf,
  useEtfManagement,
  useEtfUnits,
  useIndexes,
  useIndexDetails,
  useListingProfile,
  useMainInterestRate,
  usePortfolio,
  usePriceSpread,
} from '../api/queries';
import type { ListingProfile } from '../api/types';
import { Plot } from '../charts/Plot';
import { assetClass, bondOfRepo } from './assetClass';
import { buildingCompareChart, trackingChart, weightsTreemap, yieldStrip, type YieldDot } from './classCharts';
import { afterRebase, bondYield, buildingSize, coverageText, dailyYield, indexWeights, issuerCoverage, rebased, recentPrices, termProgress, yieldDots } from './derive';
import { useParamState } from '../lib/useParamState';
import { useIsPhone } from '../lib/useMediaQuery';
import { parseDe, ratePct, span } from '../lib/format';
import { Panel } from './Panel';

const DAY = 86_400_000;
const BOND_SETS = [
  { value: 'handelbar', label: 'Handelbar' },
  { value: 'alle', label: 'Alle' },
];
type Theme = Parameters<typeof yieldStrip>[0];
const pct = (n: number, d = 2) => `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

// ---------- Bonds and repos ----------

/** The bond behind a bond or repo listing, with its spread. */
export function useBondOf(profile: ListingProfile) {
  const cls = assetClass(profile.type);
  const repo = cls === 'repo';
  const asin = repo ? bondOfRepo(profile.securityIdentifier) : profile.securityIdentifier;
  const embedded = profile.type === 'SYSTEM_BOND' ? profile.systemBond : undefined;
  // Interest tender bonds have no bond record; other classes have no bond at all.
  const lookup = !embedded && (repo || (cls === 'bond' && profile.type !== 'INTEREST_TENDER_BOND'));
  const bond = useBond(lookup ? asin : undefined, profile.type);
  return { asin, bond: embedded ?? bond.data, isLoading: lookup && bond.isLoading, repo };
}

/**
 * „Lohnt sich die Anleihe?“ The coupon is paid once, at maturity, for the whole term – terms run
 * from minutes to 29 days. So the panel compares yield per day at the current ask: this bond among
 * all running bonds, next to the central bank reserve rate (paid daily). Above: per day and until
 * maturity, the rank in the market and how well the issuer's net cash covers the repayment.
 */
export function BondPanel({ profile, bare = false }: { profile: ListingProfile; bare?: boolean }) {
  const { asin, bond, isLoading, repo } = useBondOf(profile);
  const spread = usePriceSpread(asin ?? '');
  const issuer = useCompanyByAsin(bond?.issuer?.securityIdentifier ?? '');
  const main = useMainInterestRate();
  const universe = useBondUniverse(!!bond);
  const now = spread.dataUpdatedAt || universe.dataUpdatedAt || main.dataUpdatedAt;
  const reserveRate = main.data?.reserveInterestRate;
  const [set, setSet] = useParamState('anleihen', 'handelbar', BOND_SETS);
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  // Keep the comparison set when jumping from bond to bond.
  const openBond = useCallback(
    (p: { customdata?: unknown }) => {
      if (typeof p.customdata === 'string' && p.customdata && p.customdata !== asin)
        navigate(`/wertpapier/${p.customdata}${set === 'alle' ? '?anleihen=alle' : ''}`);
    },
    [navigate, asin, set],
  );

  const view = useMemo(() => {
    if (!bond || !now) return undefined;
    const left = bond.maturityDate - now;
    const ask = spread.data?.askPrice;
    const own: YieldDot | undefined =
      ask != null && dailyYield(ask, bond.interestRate, left) != null
        ? { name: 'Diese Anleihe', value: dailyYield(ask, bond.interestRate, left)!, left: span(left), price: 'ask' }
        : undefined;
    const dots = yieldDots(universe.data, now, set === 'alle' ? 'all' : 'tradable', asin, span);
    const beaten = own ? dots.filter((d) => d.value < own.value).length : 0;
    return { left, ask, own, dots, total: bondYield(ask, bond.interestRate), rank: dots.length && own ? (beaten / dots.length) * 100 : undefined };
  }, [bond, now, spread.data, universe.data, asin, set]);
  const figure = useCallback(
    (t: Theme, w: number) => yieldStrip(t, w, view?.dots ?? [], view?.own, reserveRate, ratePct),
    [view, reserveRate],
  );

  const title = bare ? undefined : 'Rendite pro Tag';
  if (isLoading) return <Panel title={title}><DS.Skeleton variant="block" /></Panel>;
  if (!bond)
    return (
      <Panel title={title} className="panel--class">
        <DS.EmptyState compact title="Anleihe zurückgezahlt">
          Die Anleihe ist fällig und wurde getilgt.
        </DS.EmptyState>
      </Panel>
    );
  const progress = termProgress(bond.issueDate, bond.maturityDate, now);
  const netCash = issuer.data?.companyCapabilities?.netCash;
  // All running bonds of the issuer are paid from the same net cash; this one counts even if the profile lags.
  const issued = issuer.data?.issuedBonds ?? [];
  const cover = issuerCoverage(
    netCash,
    issued.some((b) => b.listing?.securityIdentifier === bond.listing.securityIdentifier) ? issued : [...issued, bond],
    now,
  );
  const term = bond.issueDate ? span(bond.maturityDate - bond.issueDate) : undefined;
  return (
    <Panel
      title={title}
      className="panel--class"
      action={
        <div className="panel__actions">
          <span className="class__gap" title={`Laufzeit zu ${Math.round(progress * 100)} % vorbei`}>
            {now < bond.maturityDate ? <DS.Countdown to={bond.maturityDate} label="fällig in" short /> : 'fällig'}
          </span>
          <DS.SegmentedControl size="sm" aria-label="Vergleich mit" fullWidth={false} options={BOND_SETS} value={set} onChange={setSet} />
        </div>
      }
    >
      <div className="class__stack">
        {repo && (
          <p className="class__note">
            Rückkaufseite (Repo) der Anleihe <a href={`/wertpapier/${asin}`}>{asin}</a>
          </p>
        )}
        <div className="class__stats">
          <DS.StatGroup columns="repeat(4, minmax(0, 1fr))" aria-label="Rendite">
            <DS.StatTile
              label="Pro Tag"
              value={view?.own ? ratePct(view.own.value) : '–'}
              hint={view?.ask != null ? `Kauf zum Brief ${pct(view.ask, 4)}` : 'kein Verkaufsangebot'}
            />
            <DS.StatTile
              label={isPhone ? 'Bis Ende' : 'Bis Fälligkeit'}
              value={view?.total != null ? ratePct(view.total) : '–'}
              hint={`Kupon ${pct(bond.interestRate)}${term ? ` für ${term}` : ''}`}
            />
            <DS.StatTile
              label="Besser als"
              value={view?.rank != null ? `${Math.round(view.rank)} %` : '–'}
              hint={
                view?.dots.length
                  ? `${set === 'alle' ? 'aller' : 'der'} ${view.dots.length.toLocaleString('de-DE')} ${set === 'alle' ? 'laufenden' : 'handelbaren'} Anleihen`
                  : 'Markt wird geladen'
              }
            />
            <DS.StatTile
              label="Deckung"
              value={coverageText(cover.coverage == null ? null : cover.coverage * 100)}
              hint={
                netCash != null
                  ? `${cover.count > 1 ? `${cover.count.toLocaleString('de-DE')} Anleihen` : 'Rückzahlung'} ${DS.format.money(cover.due, '€', 2, true)} · Net Cash ${DS.format.money(netCash, '€', 2, true)}`
                  : 'Net Cash des Emittenten unbekannt'
              }
            />
          </DS.StatGroup>
        </div>
        <div className="class__chart">
          {view && (view.dots.length || view.own) ? (
            <Plot
              aria-label="Rendite pro Tag dieser Anleihe zwischen allen laufenden Anleihen, dazu der Zins auf Zentralbankeinlagen; ein Punkt öffnet seine Anleihe"
              figure={figure}
              onPointClick={openBond}
            />
          ) : (
            <DS.Loading rows={3} />
          )}
        </div>
      </div>
    </Panel>
  );
}

// ---------- Indexes ----------

/** „Wie breit ist der Index gestreut?“: treemap of the weights plus concentration figures. */
export function IndexWeightsPanel({ asin, bare = false }: { asin: string; bare?: boolean }) {
  const index = useIndexDetails(asin);
  const w = useMemo(() => indexWeights(index.data?.members ?? [], 15), [index.data]);
  const figure = useCallback((t: Theme, width: number) => weightsTreemap(t, width, w.weights), [w]);
  return (
    <Panel title={bare ? undefined : 'Gewichtung'} className="panel--class">
      {index.isLoading ? (
        <DS.Skeleton variant="block" />
      ) : !w.weights.length ? (
        <DS.EmptyState compact title="Keine Mitglieder" />
      ) : (
        <div className="class__stack">
          <p className="class__note">
            Größtes Mitglied <b>{pct(w.top1, 1)}</b> · Top 10 <b>{pct(w.top10, 1)}</b> · entspricht{' '}
            <b>{w.effective.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b> gleich gewichteten Werten
            {w.effective < 3 && w.count > 5 ? ' – stark konzentriert' : ''}
          </p>
          <div className="class__chart">
            <Plot aria-label="Gewichtung der Indexmitglieder nach Marktkapitalisierung" figure={figure} />
          </div>
        </div>
      )}
    </Panel>
  );
}

export function IndexMembersPanel({ asin, bare = false }: { asin: string; bare?: boolean }) {
  const index = useIndexDetails(asin);
  const members = index.data?.members ?? [];
  return (
    <Panel title={bare ? undefined : `Mitglieder${members.length ? ` · ${members.length.toLocaleString('de-DE')}` : ''}`} className="panel--class">
      <IndexMembersView asin={asin} />
    </Panel>
  );
}

/** The member list without its card (for a panel with tabs). */
export function IndexMembersView({ asin }: { asin: string }) {
  const index = useIndexDetails(asin);
  if (index.isLoading) return <DS.Skeleton variant="rows" />;
  return (
    <div className="scroll class__list">
      <DS.IndexMembers members={index.data?.members ?? []} density="sm" hrefFor={(m) => `/wertpapier/${m.listing.securityIdentifier}`} />
    </div>
  );
}

// ---------- ETFs ----------

/** „Bildet der ETF seinen Index ab?“: ETF and index rebased to 100 over 14 days, the gap as figure. */
export function EtfTrackingPanel({ profile, bare = false }: { profile: ListingProfile; bare?: boolean }) {
  const etf = useEtf(profile.securityIdentifier);
  const indexAsin = etf.data?.baseIndexAsin ?? '';
  const indexProfile = useListingProfile(indexAsin);
  const etfHistory = useDailyHistory(profile.securityIdentifier);
  const indexHistory = useDailyHistory(indexAsin);
  const now = etfHistory.dataUpdatedAt;

  const series = useMemo(() => {
    if (!indexProfile.data) return null;
    const val = (p: { value: number }) => p.value;
    const a = afterRebase(recentPrices(etfHistory.data, profile.prices14d, 14 * DAY, now), val);
    const b = afterRebase(recentPrices(indexHistory.data, indexProfile.data.prices14d, 14 * DAY, now), val);
    return rebased(a, b);
  }, [etfHistory.data, indexHistory.data, profile.prices14d, indexProfile.data, now]);
  const name = etf.data?.baseIndexName ?? 'Index';
  const figure = useCallback(
    (t: Theme, w: number) => trackingChart(t, w, series?.a ?? [], series?.b ?? [], name),
    [series, name],
  );
  // Tracking difference: ETF relative to its index since the common start, in %.
  const gap =
    series?.a.length && series.b.length
      ? (series.a[series.a.length - 1].value / series.b[series.b.length - 1].value - 1) * 100
      : undefined;

  return (
    <Panel
      title={bare ? undefined : 'ETF gegen Index'}
      className="panel--class"
      action={
        // Always rendered (non-breaking space while loading), so the head does not grow late.
        <span className="class__gap" title="Entwicklung des ETF gegenüber dem Index seit dem gemeinsamen Start">
          {gap != null ? (
            <>
              Abweichung {gap >= 0 ? '▲ +' : '▼ −'}
              {pct(Math.abs(gap))}
            </>
          ) : (
            String.fromCharCode(0xa0)
          )}
        </span>
      }
    >
      {etf.isLoading || indexProfile.isLoading ? (
        <DS.Skeleton variant="block" />
      ) : !series || series.a.length < 2 || series.b.length < 2 ? (
        <DS.EmptyState compact title="Noch zu wenig Kurse">Für den Vergleich braucht es Kurse von ETF und Index.</DS.EmptyState>
      ) : (
        <div className="class__stack">
          <p className="class__note">
            Beide auf 100 gesetzt am {new Date(series.a[0].date).toLocaleDateString('de-DE')} · Basisindex{' '}
            <a href={`/wertpapier/${indexAsin}`}>{name}</a>
            {etf.data?.managementFeePercent != null && ` · Verwaltungsgebühr ${pct(etf.data.managementFeePercent)}`}
          </p>
          <div className="class__chart">
            <Plot aria-label={`ETF und ${name} im Vergleich, beide auf 100 gesetzt`} figure={figure} />
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Subscribe new units or redeem them (units are created and destroyed, not traded). */
export function EtfUnitsPanel({ profile, onDone }: { profile: ListingProfile; onDone: (ok: boolean, text: string) => void }) {
  const etf = useEtf(profile.securityIdentifier);
  const portfolio = usePortfolio();
  const units = useEtfUnits(profile.securityIdentifier);
  const owned = portfolio.data?.positions.find((p) => p.securityIdentifier === profile.securityIdentifier);
  return (
    <DS.EtfUnitsForm
      navPerUnit={profile.lastPrice?.value}
      ownedUnits={owned ? owned.numberOfShares - owned.committedShares : 0}
      managementFeePercent={etf.data?.managementFeePercent}
      frozen={!!etf.data?.frozen}
      submitVariant="secondary"
      loading={units.isPending}
      onSubmit={(r) =>
        units.mutate(r, {
          onSuccess: () =>
            onDone(true, `${r.units.toLocaleString('de-DE')} Anteile ${r.mode === 'subscribe' ? 'gezeichnet' : 'zurückgegeben'}.`),
          onError: (e) => onDone(false, e.message),
        })
      }
    />
  );
}

/**
 * The owner of an ETF manages it here: switch the index it tracks, change the management fee
 * (not while frozen). Both are real changes in the game, so each asks for confirmation first.
 */
export function EtfManagePanel({ profile, onDone }: { profile: ListingProfile; onDone: (ok: boolean, text: string) => void }) {
  const etf = useEtf(profile.securityIdentifier);
  const indexes = useIndexes();
  const manage = useEtfManagement(profile.securityIdentifier);
  const [index, setIndex] = useState('');
  const [fee, setFee] = useState('');
  const [confirm, setConfirm] = useState<'index' | 'fee' | null>(null);
  const e = etf.data;
  const options = (indexes.data?.content ?? [])
    .filter((i) => i.listing?.securityIdentifier && i.listing.securityIdentifier !== e?.baseIndexAsin)
    .map((i) => ({ value: i.listing!.securityIdentifier, label: i.name ?? i.listing!.securityIdentifier }));
  const chosen = options.find((o) => o.value === index);
  const feeValue = parseDe(fee);
  const feeError = fee && (isNaN(feeValue) || feeValue < 0 || feeValue > 100) ? 'Bitte einen Wert zwischen 0 und 100 eingeben.' : undefined;
  if (!e) return <DS.Skeleton variant="block" />;
  const current = e.managementFeePercent;
  const run = () => {
    if (confirm === 'index' && chosen)
      manage.baseIndex.mutate(chosen.value, {
        onSuccess: () => onDone(true, `Basisindex auf ${chosen.label} gewechselt.`),
        onError: (err) => onDone(false, err.message),
      });
    if (confirm === 'fee' && fee && !feeError)
      manage.fee.mutate(feeValue, {
        onSuccess: () => onDone(true, `Verwaltungsgebühr auf ${pct(feeValue)} gesetzt.`),
        onError: (err) => onDone(false, err.message),
      });
    setConfirm(null);
  };
  return (
    <div className="etf-manage">
      <div className="etf-manage__group">
        <DS.Select
          label="Basisindex"
          size="sm"
          value={index}
          placeholder={e.baseIndexName ? `Jetzt: ${e.baseIndexName}` : 'Index wählen'}
          options={options}
          onChange={(ev) => setIndex(ev.target.value)}
          hint={e.baseIndexEnded ? 'Der bisherige Index ist beendet – bitte wechseln.' : 'Der ETF bildet danach diesen Index ab.'}
        />
        <DS.Button size="sm" variant="secondary" disabled={!chosen} loading={manage.baseIndex.isPending} onClick={() => setConfirm('index')}>
          Basisindex wechseln …
        </DS.Button>
      </div>
      <div className="etf-manage__group">
        <DS.Input
          label="Verwaltungsgebühr"
          size="sm"
          numeric
          suffix="%"
          value={fee}
          placeholder={current != null ? current.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : undefined}
          disabled={!!e.managementFeeFrozen}
          onChange={(ev) => setFee(ev.target.value)}
          error={feeError}
          hint={
            e.managementFeeFrozen
              ? e.nextFeeChangeAt
                ? `Gesperrt bis ${new Date(e.nextFeeChangeAt).toLocaleString('de-DE')}`
                : 'Derzeit gesperrt'
              : 'Wird von den Anteilen der Zeichner einbehalten.'
          }
        />
        <DS.Button
          size="sm"
          variant="secondary"
          disabled={!fee || !!feeError || !!e.managementFeeFrozen}
          loading={manage.fee.isPending}
          onClick={() => setConfirm('fee')}
        >
          Gebühr ändern …
        </DS.Button>
      </div>
      <DS.Dialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        role="alertdialog"
        size="sm"
        title={confirm === 'index' ? 'Basisindex wechseln?' : 'Verwaltungsgebühr ändern?'}
        description={
          confirm === 'index'
            ? `${e.name ?? 'Der ETF'} bildet danach ${chosen?.label ?? ''} statt ${e.baseIndexName ?? 'des bisherigen Index'} ab.`
            : `Neue Gebühr: ${isNaN(feeValue) ? '–' : pct(feeValue)} (bisher ${current != null ? pct(current) : '–'}).`
        }
        actions={
          <>
            <DS.Button variant="ghost" onClick={() => setConfirm(null)}>
              Abbrechen
            </DS.Button>
            <DS.Button variant="primary" onClick={run}>
              {confirm === 'index' ? 'Wechseln' : 'Ändern'}
            </DS.Button>
          </>
        }
      />
    </div>
  );
}

// ---------- Buildings ----------

/** „Ist der Preis angemessen?“: price against a sample of buildings of the same size. */
export function BuildingPanel({ profile, bare = false }: { profile: ListingProfile; bare?: boolean }) {
  const size = profile.building?.size ?? buildingSize(profile.name);
  const sample = useBuildings(size);
  const prices = useMemo(
    () => (sample.data?.content ?? []).map((r) => r.lastPrice?.value ?? 0).filter((p) => p > 0),
    [sample.data],
  );
  const own = profile.lastPrice?.value;
  const figure = useCallback(
    (t: Theme, w: number) => buildingCompareChart(t, w, prices, own, size ?? 0),
    [prices, own, size],
  );
  return (
    <Panel title={bare ? undefined : 'Preis im Vergleich'} className="panel--class">
      {sample.isLoading ? (
        <DS.Skeleton variant="block" />
      ) : prices.length < 5 || !size ? (
        <DS.EmptyState compact title="Kein Vergleich möglich" />
      ) : (
        <div className="class__stack">
          <p className="class__note">
            Letzte Kurse von {prices.length.toLocaleString('de-DE')} Gebäuden à {size.toLocaleString('de-DE')} m²
            {sample.data && sample.data.totalElements > prices.length && ` (Stichprobe aus ${sample.data.totalElements.toLocaleString('de-DE')})`}
            {own ? ` · dieses: ${DS.format.money(own / size, '€', 2)} je m²` : ''}
          </p>
          <div className="class__chart">
            <Plot aria-label={`Preisverteilung von Gebäuden mit ${size} m²`} figure={figure} />
          </div>
        </div>
      )}
    </Panel>
  );
}
