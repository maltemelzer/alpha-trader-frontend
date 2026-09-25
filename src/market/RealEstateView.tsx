// Market „Immobilien“ (?art=BUILDING without search): sizes, price per m², offers, recently traded.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useTradedBuildings } from '../api/queries';
import { Plot } from '../charts/Plot';
import { useParamState } from '../lib/useParamState';
import { toResult } from './derive';
import { BUILDING_SIZES, estateBySize, estateDots, estateOffers, sizeOfRow } from './realEstate';
import { estateChart } from './realEstateChart';

const href = (asin: string) => `/wertpapier/${asin}`;
const SIZE_OPTIONS = [{ value: 'alle', label: 'Alle Größen' }, ...BUILDING_SIZES.map((s) => ({ value: String(s), label: `${s.toLocaleString('de-DE')} m²` }))];
type Theme = Parameters<typeof estateChart>[0];
const perSqm = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;

export function RealEstateView() {
  const navigate = useNavigate();
  const traded = useTradedBuildings();
  const [sizeParam, setSize] = useParamState('groesse', 'alle', SIZE_OPTIONS);
  const size = sizeParam === 'alle' ? undefined : Number(sizeParam);
  const rows = useMemo(() => traded.data?.content ?? [], [traded.data]);
  const sizes = useMemo(() => estateBySize(rows), [rows]);
  const dots = useMemo(() => estateDots(rows), [rows]);
  const offers = useMemo(() => estateOffers(rows, size), [rows, size]);
  const recent = useMemo(
    () =>
      rows
        .filter((r) => !size || sizeOfRow(r) === size)
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .slice(0, 50)
        .map(toResult),
    [rows, size],
  );
  const figure = useCallback((t: Theme, w: number) => estateChart(t, w, dots, sizes), [dots, sizes]);

  if (traded.isLoading) return <DS.Loading rows={8} label="Immobilien werden geladen" />;
  if (traded.error) return <DS.Banner variant="error">Immobilien konnten nicht geladen werden: {traded.error.message}</DS.Banner>;

  return (
    <div className="estate">
      <DS.StatGroup className="estate__tiles" aria-label="Gebäude je Größe">
        {BUILDING_SIZES.map((s) => {
          const f = sizes.find((x) => x.size === s);
          return (
            <DS.StatTile
              key={s}
              label={`${s.toLocaleString('de-DE')} m² · ab`}
              value={f?.cheapestAsk != null ? f.cheapestAsk : '–'}
              compact
              hint={
                f?.cheapestPerSqm != null
                  ? `${perSqm(f.cheapestPerSqm)} je m² · ${f.offers} im Angebot`
                  : f?.medianPerSqm != null
                    ? `kein Angebot · Median ${perSqm(f.medianPerSqm)} je m²`
                    : 'kein Angebot'
              }
            />
          );
        })}
      </DS.StatGroup>
      <p className="market__hint estate__note">
        Günstigstes Angebot je Größe unter den {rows.length.toLocaleString('de-DE')} zuletzt gehandelten Gebäuden (je Größe gibt es rund
        11.000). Punkte: letzter Kurs je m², Ringe: Angebote.
      </p>
      <div className="estate__chart">
        {dots.length ? (
          <Plot
            aria-label="Preis je Quadratmeter der zuletzt gehandelten Gebäude nach Größe"
            figure={figure}
            onPointClick={(p) => p.customdata?.[0] && navigate(href(p.customdata[0]))}
          />
        ) : (
          <DS.EmptyState compact title="Keine Gebäude gehandelt" />
        )}
      </div>
      <div className="estate__head">
        <h3 className="estate__title">Im Angebot{offers.length ? ` · ${offers.length.toLocaleString('de-DE')}` : ''}</h3>
        <DS.Select aria-label="Größe" size="sm" fullWidth={false} options={SIZE_OPTIONS} value={sizeParam} onChange={(e) => setSize(e.target.value)} />
      </div>
      <DS.RealEstateList offers={offers} hrefFor={(o) => href(o.listing.securityIdentifier)} />
      <h3 className="estate__title estate__title--list">Zuletzt gehandelt</h3>
      <DS.MarketResults results={recent} hrefFor={(r) => href(r.id)} density="sm" />
    </div>
  );
}
