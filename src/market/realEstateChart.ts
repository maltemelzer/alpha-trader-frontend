// Plotly figure for the real estate market (own file – market/charts.ts belongs to the chart card).
import type { plotlyTheme } from '../charts/plotlyTheme';
import { short } from '../lib/format';
import type { EstateDot, EstateSize } from './realEstate';

type Theme = ReturnType<typeof plotlyTheme>;

/** Deterministic jitter in −0.3…0.3, so buildings with the same price do not cover each other. */
const jitter = (i: number) => (((i * 2654435761) % 1000) / 1000 - 0.5) * 0.6;
const sizeLabel = (s: number) => `${s.toLocaleString('de-DE')} m²`;

/**
 * „Was kostet ein m²?“: every recently traded building as a dot, price per m² at its last trade
 * (log axis – prices span several orders of magnitude), one column per size, dot area by number of
 * trades. Offers as rings at their ask per m², the median of each size as a short bar.
 * Click opens the building.
 */
export function estateChart(t: Theme, w: number, dots: EstateDot[], sizes: EstateSize[]) {
  const v = t.tokens;
  const narrow = w < 520;
  const cols = sizes.map((s) => s.size);
  const col = (size: number) => cols.indexOf(size);
  const maxTrades = Math.max(1, ...dots.map((d) => d.trades));
  const area = (n: number) => 5 + 13 * Math.sqrt(n / maxTrades);
  const offers = dots.filter((d) => d.askPerSqm != null);
  const hover = '%{customdata[1]}<br>%{customdata[2]} € je m² · %{customdata[3]} Trades<br><i>Klicken öffnet das Gebäude</i><extra></extra>';
  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  const values = [...dots.map((d) => d.perSqm), ...offers.map((d) => d.askPerSqm!)].filter((x) => x > 0);
  const lo = values.length ? Math.floor(Math.log10(Math.min(...values)) - 0.1) : 3;
  const hi = values.length ? Math.ceil(Math.log10(Math.max(...values)) + 0.1) : 6;
  const ticks: number[] = [];
  for (let e = lo; e <= hi; e++) ticks.push(10 ** e);
  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Letzter Kurs',
        x: dots.map((d, i) => col(d.size) + jitter(i)),
        y: dots.map((d) => d.perSqm),
        marker: { color: v('chart-1'), size: dots.map((d) => area(d.trades)), opacity: 0.75, line: { width: 0 } },
        customdata: dots.map((d) => [d.asin, d.name, fmt(d.perSqm), d.trades]),
        hovertemplate: hover,
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Angebot',
        x: offers.map((d) => col(d.size)),
        y: offers.map((d) => d.askPerSqm),
        marker: { symbol: 'circle-open', color: v('chart-2'), size: 14, line: { width: 2 } },
        customdata: offers.map((d) => [d.asin, `${d.name} – im Angebot`, fmt(d.askPerSqm!), d.trades]),
        hovertemplate: hover,
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Median',
        x: sizes.filter((s) => s.medianPerSqm).map((s) => col(s.size)),
        y: sizes.filter((s) => s.medianPerSqm).map((s) => s.medianPerSqm),
        marker: { symbol: 'line-ew', size: narrow ? 36 : 56, color: v('text-primary'), line: { width: 2, color: v('text-primary') } },
        hovertemplate: 'Median %{y:,.0f} € je m²<extra></extra>',
      },
    ],
    layout: {
      showlegend: !narrow,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1, yanchor: 'bottom', font: { size: 11, color: v('text-secondary') } },
      margin: { l: 0, r: 0, t: 20, b: 0 },
      hovermode: 'closest',
      xaxis: {
        ...t.layout.xaxis,
        range: [-0.5, cols.length - 0.5],
        tickvals: cols.map((_, i) => i),
        ticktext: cols.map(sizeLabel),
        showspikes: false,
        zeroline: false,
      },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        type: 'log',
        range: [lo, hi],
        tickvals: ticks,
        ticktext: ticks.map((x) => `${short(x)} €`),
        showspikes: false,
      },
    },
  };
}
