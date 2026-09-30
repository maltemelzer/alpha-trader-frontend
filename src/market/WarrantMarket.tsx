// Market „Optionsscheine“ (?art=WARRANT). The API lists warrants only per underlying (without
// `underlyingAsin` it answers 500), so the view asks for the most traded shares – or for the
// shares, coins and indexes found by the search.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useMostTraded, useWarrantsOnMany, type MarketRow } from '../api/queries';
import { Plot } from '../charts/Plot';
import { corridorHeight, underlyingWarrantsChart } from '../security/warrantCharts';
import { callPutCount, mergeWarrants, toWarrantView, underlyingsOf, warrantsByUnderlying } from '../security/warrants';
import { companyHref } from '../companies/views';

const TOP = 25;
const FOUND = 12;
type Theme = Parameters<typeof underlyingWarrantsChart>[0];

export function WarrantMarket({ searching, found }: { searching: boolean; found: MarketRow[] | undefined }) {
  const navigate = useNavigate();
  const top = useMostTraded('STOCK', TOP);
  const base = searching ? found : top.data?.content;
  const underlyings = useMemo(() => underlyingsOf(base ?? [], searching ? FOUND : TOP), [base, searching]);
  const { pages, isLoading, failed, updatedAt } = useWarrantsOnMany(underlyings);
  const loading = (!base && (searching || top.isLoading)) || isLoading;
  const list = useMemo(() => mergeWarrants(pages, updatedAt), [pages, updatedAt]);
  const perUnderlying = useMemo(() => warrantsByUnderlying(list), [list]);
  const rows = useMemo(() => list.map(toWarrantView), [list]);
  const figure = useCallback((t: Theme, w: number) => underlyingWarrantsChart(t, w, perUnderlying), [perUnderlying]);
  const { calls, puts } = callPutCount(list);

  if (loading) return <DS.Loading rows={8} label="Optionsscheine werden geladen" />;
  return (
    <div className="warrant-market">
      <p className="market__hint">
        {searching
          ? `Laufende Optionsscheine auf ${underlyings.length.toLocaleString('de-DE')} gefundene Basiswerte.`
          : `Laufende Optionsscheine auf die ${TOP} meistgehandelten Aktien – andere Basiswerte über die Suche.`}
        {list.length > 0 && ` ${calls.toLocaleString('de-DE')} Calls · ${puts.toLocaleString('de-DE')} Puts.`}
        {failed > 0 && ` ${failed} Basiswerte konnten nicht geladen werden.`}
      </p>
      {perUnderlying.length > 0 && (
        <div className="warrant-market__chart" style={{ height: corridorHeight(perUnderlying.length) }}>
          <Plot
            aria-label="Laufende Calls und Puts je Basiswert"
            figure={figure}
            onPointClick={(p) =>
              p.customdata?.[0] &&
              navigate(`/wertpapier/${p.customdata[0]}?karte=scheine&ansicht=${p.customdata[4] === 'INDEX' ? 'members' : 'holders'}`)
            }
          />
        </div>
      )}
      <DS.WarrantList
        warrants={rows}
        showUnderlying
        density="sm"
        issuerHref={(c) => (c.securityIdentifier ? companyHref(c.securityIdentifier) : '#')}
        empty={
          <DS.EmptyState compact symbol={false} title="Keine laufenden Optionsscheine">
            {searching ? 'Auf die gefundenen Basiswerte läuft gerade kein Schein.' : 'Auf die meistgehandelten Aktien läuft gerade kein Schein – such nach einem Basiswert.'}
          </DS.EmptyState>
        }
      />
    </div>
  );
}
