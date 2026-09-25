import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS, format } from '../ds';
import { Plot, type PlotPoint } from '../charts/Plot';
import {
  useAccountPortfolio,
  useMe,
  useMyCompanies,
  usePortfolio,
  useTradeResults,
  useTradeSummarySince,
  type TradeResultView,
} from '../api/queries';
import type { PortfolioView } from '../api/types';
import { useParamState } from '../lib/useParamState';
import { useNow } from '../lib/useNow';
import { useMediaQuery } from '../lib/useMediaQuery';
import { changeText } from '../lib/format';
import { plBarsChart } from './charts';
import { asinType, PERIODS, periodStart, plBars, tradeBars, unrealised, type PositionResult } from './performance';

const VIEWS = [
  { value: 'offen', label: 'Buchgewinn' },
  { value: 'realisiert', label: 'Realisiert' },
];
/** How many positions/trades get their own bar. */
const BARS = 10;
const TRADES_EACH = 5;

const num = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
const signedMoney = (n: number) => `${n > 0 ? '+' : ''}${format.money(n, '€', 2, 'auto')}`;

/**
 * „Performance“ of one securities account: unrealised result per position (Einstand from the
 * portfolio) or the realised result of closed trades (best/worst, wins vs. losses).
 * Views in the URL: ?gv=offen|realisiert, ?zeitraum=7T|30T|alle, ?konto=<securitiesAccountId>.
 */
export function Performance() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useParamState('gv', 'offen', VIEWS);
  const [period, setPeriod] = useParamState('zeitraum', 'alle', PERIODS);

  const me = useMe();
  const own = usePortfolio();
  const companies = useMyCompanies(me.data?.id);
  const privateId = own.data?.securitiesAccountId;
  const konto = params.get('konto') ?? privateId;
  const isPrivate = !konto || konto === privateId;
  const other = useAccountPortfolio(isPrivate ? undefined : konto);
  const portfolio = isPrivate ? own : other;

  const accounts = useMemo(() => {
    const list = [
      ...(privateId ? [{ value: privateId, label: 'Privatportfolio' }] : []),
      ...(companies.data ?? []).filter((c) => c.securitiesAccountId).map((c) => ({ value: c.securitiesAccountId!, label: c.name ?? 'Unternehmen' })),
    ];
    // A foreign account from the URL (the stats endpoints answer for any account) stays selectable.
    if (konto && !list.some((a) => a.value === konto)) list.push({ value: konto, label: `Konto ${konto.slice(0, 8)}…` });
    return list;
  }, [privateId, companies.data, konto]);

  const setKonto = (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === privateId) next.delete('konto');
        else next.set('konto', v);
        return next;
      },
      { replace: true },
    );

  const openPoint = useCallback((p: PlotPoint) => p.customdata && navigate(`/wertpapier/${p.customdata}`), [navigate]);

  return (
    <div className="perf">
      <div className="perf__bar">
        <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Ergebnis" options={VIEWS} value={view} onChange={setView} />
        {view === 'realisiert' && (
          <DS.SegmentedControl size="sm" fullWidth={false} aria-label="Zeitraum" options={PERIODS} value={period} onChange={setPeriod} />
        )}
        {accounts.length > 1 && (
          <DS.Select
            size="sm"
            fullWidth={false}
            aria-label="Konto"
            className="perf__account"
            options={accounts}
            value={konto}
            onChange={(e) => setKonto(e.target.value)}
          />
        )}
      </div>
      {view === 'offen' ? (
        <Unrealised portfolio={portfolio.data} loading={portfolio.isLoading || !konto} onPoint={openPoint} />
      ) : (
        <Realised account={konto} period={period} onPoint={openPoint} />
      )}
    </div>
  );
}

function Unrealised({ portfolio, loading, onPoint }: { portfolio?: PortfolioView; loading: boolean; onPoint: (p: PlotPoint) => void }) {
  const phone = useMediaQuery('(max-width: 719px)');
  const u = useMemo(() => unrealised(portfolio?.positions ?? []), [portfolio]);
  const detail = useCallback(
    (r: PositionResult) =>
      `${r.name} (${r.asin})<br>${num(r.shares)} Anteile · Einstand ${format.price(r.avg, r.type)} · Geld ${format.price(r.mark, r.type)}` +
      `<br>${signedMoney(r.pl)} · ${changeText(r.pct)}`,
    [],
  );
  const figure = useCallback<React.ComponentProps<typeof Plot>['figure']>((t, w) => plBarsChart(t, w, plBars(u.rows, BARS, detail)), [u, detail]);

  if (loading) return <DS.Loading rows={4} />;
  if (!u.rows.length)
    return (
      <DS.EmptyState compact as="h3" title="Kein Einstand bekannt">
        {u.noBasis
          ? `${num(u.noBasis)} Position${u.noBasis === 1 ? '' : 'en'} ohne Kaufpreis (z. B. geschürft oder geschenkt) – dafür gibt es keinen Buchgewinn.`
          : 'Gekaufte Wertpapiere erscheinen hier mit ihrem Buchgewinn.'}
      </DS.EmptyState>
    );
  return (
    <>
      <DS.StatGroup aria-label="Buchgewinn" className="perf__stats">
        <DS.StatTile
          label="Buchgewinn"
          value={u.pl}
          currency="€"
          signed
          change={u.pct ?? undefined}
          changeSuffix={phone ? undefined : 'auf Einstand'}
          hint={phone ? `Einstand ${format.money(u.cost, '€', 2, 'auto')}` : undefined}
        />
        {!phone && <DS.StatTile label="Einstand" value={u.cost} currency="€" hint="Ø Kaufkurs × Anteile" />}
        {!phone && <DS.StatTile label="Marktwert" value={u.value} currency="€" hint="zum Geldkurs" />}
        <DS.StatTile
          label="Im Plus"
          value={num(u.winners)}
          hint={`von ${num(u.rows.length)}${u.noBasis ? ` · ${num(u.noBasis)} ohne Einstand` : ''}`}
        />
      </DS.StatGroup>
      <p className="perf__caption">
        {phone ? 'Größte Buchgewinne und -verluste' : 'Größte Buchgewinne und -verluste je Position · Balken öffnet das Wertpapier'}
      </p>
      <div className="perf__chart">
        <Plot aria-label="Buchgewinn je Position; ein Balken öffnet das Wertpapier" figure={figure} onPointClick={onPoint} />
      </div>
    </>
  );
}

function Realised({ account, period, onPoint }: { account?: string; period: string; onPoint: (p: PlotPoint) => void }) {
  const now = useNow();
  const phone = useMediaQuery('(max-width: 719px)');
  const start = periodStart(period, now);
  const summary = useTradeSummarySince(account, start);
  const wins = useTradeResults('wins', account, start, TRADES_EACH);
  const losses = useTradeResults('losses', account, start, TRADES_EACH);

  const detail = useCallback(
    (t: TradeResultView) =>
      `${t.listingName ?? ''} (${t.securityIdentifier ?? ''})<br>${num(t.numberOfShares ?? 0)} Anteile · Einstand ${format.price(t.averageBuyingPrice ?? 0, asinType(t.securityIdentifier))} · Verkauf ${format.price(t.sellPrice ?? 0, asinType(t.securityIdentifier))}` +
      `<br>${t.dateCreated ? format.dateTime(Date.parse(t.dateCreated)) : ''}`,
    [],
  );
  const bars = useMemo(() => tradeBars(wins.data?.content ?? [], losses.data?.content ?? [], detail), [wins.data, losses.data, detail]);
  const figure = useCallback<React.ComponentProps<typeof Plot>['figure']>((t, w) => plBarsChart(t, w, bars), [bars]);
  const label = PERIODS.find((p) => p.value === period)?.label ?? '';

  const s = summary.data;
  if (summary.isLoading || !account) return <DS.Loading rows={4} />;
  if (!s?.totalTrades)
    return (
      <DS.EmptyState compact as="h3" title="Keine abgeschlossenen Trades">
        {period === 'alle' ? 'Gewinne und Verluste erscheinen, sobald du Wertpapiere wieder verkaufst.' : `In den letzten ${label} hast du nichts verkauft.`}
      </DS.EmptyState>
    );
  return (
    <>
      {phone ? (
        // TradeStats needs ~250 px on a phone – two tiles leave the chart above the fold.
        <DS.StatGroup aria-label="Realisiertes Ergebnis" className="perf__stats">
          <DS.StatTile label="Ergebnis" value={s.netProfitLoss} currency="€" signed hint={`${num(s.totalTrades)} Trades`} />
          <DS.StatTile
            label="Trefferquote"
            value={s.winRate <= 1 ? s.winRate * 100 : s.winRate /* percent (81,46); a fraction like TradeStats accepts, too */}
            unit="%"
            decimals={1}
            hint={`▲ ${num(s.winningTrades)} · ▼ ${num(s.losingTrades)}`}
          />
        </DS.StatGroup>
      ) : (
        <DS.TradeStats summary={s} periodLabel={period === 'alle' ? 'gesamt' : `letzte ${label}`} />
      )}
      <p className="perf__caption">{phone ? 'Beste und schlechteste Verkäufe' : 'Beste und schlechteste Verkäufe · Balken öffnet das Wertpapier'}</p>
      <div className="perf__chart">
        {wins.isLoading || losses.isLoading ? (
          <DS.Skeleton variant="block" height="100%" />
        ) : (
          <Plot aria-label="Beste und schlechteste Verkäufe; ein Balken öffnet das Wertpapier" figure={figure} onPointClick={onPoint} />
        )}
      </div>
    </>
  );
}
