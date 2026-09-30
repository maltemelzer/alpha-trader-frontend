// Plotly figures of the start page „Zeitung“, drawn like the graphics of a printed paper: one ink line,
// hairline grid, the reference as a dotted rule, the one accent (gain/loss) only on the latest value.
// Title and source line are HTML around the plot (figure caption).
import type { plotlyTheme } from '../../charts/plotlyTheme';
import type { PricePoint } from '../../api/types';
import { shortAxis } from '../../charts/ticks';
import { priceText, type RateDay } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;
const HOUR = 3_600_000;

const two = (n: number) => String(n).padStart(2, '0');
/** „01:37“ within a day, else „16.09.“ */
const stampOf = (ms: number, span: number) => {
  const d = new Date(ms);
  return span < 20 * HOUR ? `${two(d.getHours())}:${two(d.getMinutes())}` : `${two(d.getDate())}.${two(d.getMonth() + 1)}.`;
};

/** Price line of a lead story; `ref` (the last close) as a dotted rule with its label at the left. */
export function leadPriceChart(t: Theme, _w: number, points: PricePoint[], ref?: number, startLabel?: string, refLabel = 'Schluss') {
  const v = t.tokens;
  const last = points[points.length - 1];
  const dir = last && ref ? (last.value > ref ? 'gain' : last.value < ref ? 'loss' : 'text-secondary') : 'text-primary';
  const span = points.length > 1 ? last.date - points[0].date : 0;
  const values = points.map((p) => p.value).concat(ref ? [ref] : []);
  const mono = { family: v('font-mono'), size: 11, color: v('text-secondary') };
  return {
    data: [
      {
        x: points.map((p) => new Date(p.date)),
        y: points.map((p) => p.value),
        type: 'scatter',
        mode: 'lines',
        line: { color: v('text-primary'), width: 1.5, shape: 'hv' },
        xhoverformat: '%d.%m. %H:%M',
        hovertemplate: '%{y:,.2f} €<extra></extra>',
      },
      ...(last
        ? [
            {
              x: [new Date(last.date)],
              y: [last.value],
              type: 'scatter',
              mode: 'markers',
              marker: { color: v(dir), size: 7, line: { color: v('bg-page'), width: 2 } },
              hoverinfo: 'skip',
            },
          ]
        : []),
    ],
    layout: {
      showlegend: false,
      margin: { l: 0, r: 0, t: 18, b: 20 },
      xaxis: {
        ...t.layout.xaxis,
        showline: true,
        linecolor: v('text-secondary'),
        // no ticks: the start and „jetzt“ are written under the ends – a paper graphic names its span, not every hour
        showticklabels: false,
      },
      yaxis: { ...t.layout.yaxis, ...shortAxis(values, ' €'), nticks: 3, gridcolor: v('line') },
      shapes: ref
        ? [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: ref, y1: ref, line: { color: v('text-secondary'), width: 1, dash: 'dot' } }]
        : [],
      annotations: [
        ...(ref ? [{ xref: 'paper', x: 0, xanchor: 'left', y: ref, yanchor: 'bottom', showarrow: false, text: `${refLabel} ${priceText(ref)}`, font: mono }] : []),
        ...(points.length > 1
          ? [
              { xref: 'paper', yref: 'paper', x: 0, xanchor: 'left', y: 0, yanchor: 'top', yshift: -3, showarrow: false, text: startLabel ?? stampOf(points[0].date, span), font: mono },
              { xref: 'paper', yref: 'paper', x: 1, xanchor: 'right', y: 0, yanchor: 'top', yshift: -3, showarrow: false, text: 'jetzt', font: mono },
            ]
          : []),
      ],
    },
  };
}

/** Main rate per day as steps (ink); the latest value stands in the caption. */
export function rateChart(t: Theme, w: number, days: RateDay[]) {
  const v = t.tokens;
  const values = days.map((d) => d.rate);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(0.05, (hi - lo) * 0.25);
  return {
    data: [
      {
        x: days.map((d) => new Date(d.date)),
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: v('text-primary'), width: 1.5, shape: 'hv' },
        marker: { color: v('text-primary'), size: 4 },
        xhoverformat: '%d.%m.',
        hovertemplate: 'Leitzins %{y:,.2f} %<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      margin: { l: 0, r: 0, t: 18, b: 0 },
      xaxis: { ...t.layout.xaxis, showline: true, linecolor: v('text-secondary'), tickformat: '%d.%m.', nticks: w < 420 ? 3 : 4 },
      yaxis: { ...t.layout.yaxis, range: [Math.max(0, lo - pad), hi + pad], tickformat: ',.2f', ticksuffix: ' %', nticks: 3, gridcolor: v('line') },
    },
  };
}
