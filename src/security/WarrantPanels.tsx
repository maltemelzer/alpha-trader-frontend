// Warrants on the securities page: the warrant's own panel and the list of warrants on an underlying.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useDailyHistory, useListingProfile, useWarrant, useWarrantAsks, useWarrantsOn } from '../api/queries';
import type { ListingProfile } from '../api/types';
import { Plot } from '../charts/Plot';
import { parseDe, span } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useParamState } from '../lib/useParamState';
import { useUrlSearch } from '../lib/useUrlSearch';
import { movePicks, PAYOUT_MODEL, priceInput, scenarioLabels } from './payoff';
import { recentPrices } from './derive';
import { Panel } from './Panel';
import { corridorChart, corridorHeight, warrantChart } from './warrantCharts';
import { callPutCount, corridors, mergeWarrants, toWarrantView, warrantEnd, warrantPosition } from './warrants';
import { companyHref } from '../companies/views';

const DAY = 86_400_000;
/** Asks are looked up for at most this many warrants of one underlying (one request each). */
const MAX_SPREADS = 40;
type Theme = Parameters<typeof warrantChart>[0];
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

/** „Wo steht der Basiswert?“ – the underlying of 3 days against reference price and cap, until maturity. */
export function WarrantPanel({ profile, bare = false }: { profile: ListingProfile; bare?: boolean }) {
  const warrant = useWarrant(profile.securityIdentifier);
  const w = warrant.data;
  const uAsin = w?.underlying?.securityIdentifier ?? '';
  const uProfile = useListingProfile(uAsin);
  const uHistory = useDailyHistory(uAsin);
  const now = useNow();
  const prices = useMemo(
    () => recentPrices(uHistory.data, uProfile.data?.prices14d, 3 * DAY, now),
    [uHistory.data, uProfile.data, now],
  );
  const spot = uProfile.data?.lastPrice?.value;
  const pos = w ? warrantPosition(w, spot) : undefined;
  const end = w ? warrantEnd(w) : undefined;
  const name = w?.underlying?.name ?? 'Basiswert';
  const figure = useCallback(
    (t: Theme, width: number) => warrantChart(t, width, prices, w?.underlyingValue, w?.underlyingCapValue, end, name),
    [prices, w, end, name],
  );
  return (
    <Panel title={bare ? undefined : 'Basiswert gegen Referenzkurs'} className="panel--class">
      {warrant.isLoading || uProfile.isLoading ? (
        <DS.Skeleton variant="block" />
      ) : !w ? (
        <DS.EmptyState compact title="Keine Angaben zum Optionsschein">
          Die API kennt diesen Schein nicht (mehr) – vielleicht ist er schon fällig.
        </DS.EmptyState>
      ) : (
        <div className="class__stack">
          <p className="class__note">
            {w.type === 'PUT' ? 'Put' : 'Call'} auf <a href={`/wertpapier/${uAsin}`}>{name}</a>
            {pos && (
              <>
                {' · '}Basiswert <b>{signed(pos.toStrike)}</b> zum Referenzkurs
                {pos.toCap != null && (
                  <>
                    {' · '}Cap <b>{signed(pos.toCap)}</b> entfernt
                  </>
                )}
                {pos.beyondCap ? ' – Cap erreicht' : ''}
              </>
            )}
            {end ? ` · ${end > now ? `fällig in ${span(end - now)}` : 'fällig'}` : ''}
          </p>
          <div className="class__chart">
            {prices.length ? (
              <Plot aria-label={`Kurs von ${name} mit Referenzkurs und Cap des Optionsscheins`} figure={figure} />
            ) : (
              <DS.EmptyState compact title="Keine Kurse des Basiswerts" />
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Running warrants on an underlying, next to expire first. */
export function useWarrantsOf(asin: string, enabled = true) {
  const q = useWarrantsOn(asin, enabled);
  const now = q.dataUpdatedAt;
  const list = useMemo(() => mergeWarrants([q.data?.content], now), [q.data, now]);
  return { ...q, list };
}

export function WarrantsOnView({ asin }: { asin: string }) {
  const navigate = useNavigate();
  const { list, isLoading } = useWarrantsOf(asin);
  const profile = useListingProfile(asin);
  const spot = profile.data?.lastPrice?.value;
  const rows = useMemo(() => list.map(toWarrantView), [list]);
  const bars = useMemo(() => corridors(list, () => spot), [list, spot]);
  // „Wenn … dann …“ for all warrants at once: what each pays at an assumed price and the result at its ask.
  const asins = useMemo(() => list.slice(0, MAX_SPREADS).flatMap((w) => (w.listing?.securityIdentifier ? [w.listing.securityIdentifier] : [])), [list]);
  const asks = useWarrantAsks(asins);
  const [text, setText] = useUrlSearch('wenn', 400, []);
  const typed = parseDe(text);
  const s = Number.isFinite(typed) && typed > 0 ? typed : spot;
  const scenario = useMemo(
    () => (s && spot ? { pct: (s / spot - 1) * 100, labels: scenarioLabels(list, s, (a) => asks[a]) } : undefined),
    [s, spot, list, asks],
  );
  const figure = useCallback((t: Theme, width: number) => corridorChart(t, width, bars, scenario), [bars, scenario]);
  if (isLoading) return <DS.Skeleton variant="rows" />;
  const { calls, puts } = callPutCount(list);
  const name = profile.data?.name ?? 'der Basiswert';
  const picks = movePicks(spot);
  const same = (a: number, b: number) => Math.abs(a / b - 1) < 1e-4;
  return (
    <div className="scroll class__list warrants">
      {rows.length > 0 && (
        <p className="class__note warrants__note">
          {calls.toLocaleString('de-DE')} Calls · {puts.toLocaleString('de-DE')} Puts · Balken: Referenzkurs bis Cap in % vom Kurs jetzt · daneben{' '}
          <DS.Term title="Auszahlung" definition={PAYOUT_MODEL}>
            Auszahlung je Schein
          </DS.Term>{' '}
          und Ergebnis zum Brief
        </p>
      )}
      {bars.length > 0 && spot != null && (
        <div className="warrants__if">
          <span className="warrants__q">Wenn {name} am Ende bei</span>
          <DS.Input
            aria-label={`Kurs von ${name} am Ende`}
            size="sm"
            numeric
            suffix="€"
            value={text}
            placeholder={priceInput(spot)}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="warrants__q">steht:</span>
          <div className="scn__picks" role="group" aria-label="Schnellauswahl">
            {picks.map((q) => (
              <button
                key={q.label}
                type="button"
                className="scn__pick"
                aria-pressed={s != null && same(s, q.value)}
                onClick={() => setText(q.label === 'unverändert' ? '' : priceInput(q.value))}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {bars.length > 0 && (
        <div className="warrants__chart" style={{ height: corridorHeight(bars.length) }}>
          <Plot
            aria-label="Optionsscheine als Spanne von Referenzkurs bis Cap, in Prozent vom aktuellen Kurs"
            figure={figure}
            onPointClick={(p) => p.customdata?.[0] && navigate(`/wertpapier/${p.customdata[0]}`)}
          />
        </div>
      )}
      <DS.WarrantList
        warrants={rows}
        density="sm"
        issuerHref={(c) => (c.securityIdentifier ? companyHref(c.securityIdentifier) : '#')}
      />
    </div>
  );
}

const WARRANT_TAB = 'scheine';

/**
 * A class panel that gets a second tab „Optionsscheine“ when warrants on this security run
 * (?karte=scheine). Without warrants it is the plain panel.
 */
export function WithWarrants({
  asin,
  title,
  tabLabel,
  className,
  children,
}: {
  asin: string;
  title: string;
  /** Short label of the first tab (default: the title) */
  tabLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { list } = useWarrantsOf(asin);
  const tabs = useMemo(
    () => [
      { value: 'main', label: tabLabel ?? title },
      { value: WARRANT_TAB, label: `Scheine · ${list.length.toLocaleString('de-DE')}` },
    ],
    [title, tabLabel, list.length],
  );
  const [tab, setTab] = useParamState('karte', 'main', tabs);
  if (!list.length) return <Panel title={title} className={className}>{children}</Panel>;
  return (
    <Panel
      className={className}
      action={<DS.SegmentedControl size="sm" fullWidth={false} aria-label="Inhalt der Karte" options={tabs} value={tab} onChange={setTab} />}
    >
      {tab === WARRANT_TAB ? <WarrantsOnView asin={asin} /> : children}
    </Panel>
  );
}

/** Phone: the same switch without a card – a small segmented control above the view. */
export function WarrantTabs({ asin, label, children }: { asin: string; label: string; children: React.ReactNode }) {
  const { list } = useWarrantsOf(asin);
  const tabs = useMemo(
    () => [
      { value: 'main', label },
      { value: WARRANT_TAB, label: `Optionsscheine · ${list.length.toLocaleString('de-DE')}` },
    ],
    [label, list.length],
  );
  const [tab, setTab] = useParamState('karte', 'main', tabs);
  if (!list.length) return <>{children}</>;
  return (
    <div className="warrants__tabs">
      <DS.SegmentedControl size="sm" fullWidth aria-label="Inhalt" options={tabs} value={tab} onChange={setTab} />
      <div className="warrants__tab">{tab === WARRANT_TAB ? <WarrantsOnView asin={asin} /> : children}</div>
    </div>
  );
}
