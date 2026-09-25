import type { plotlyTheme } from '../charts/plotlyTheme';
import type { CompanyHistoryPoint } from '../api/queries';
import { alpha, euro, short } from '../lib/format';
import { depthChart, PERCENT_QUOTED } from '../security/charts';
import type { DepthSide } from '../security/derive';
import { rangeTicks } from '../charts/ticks';


type Theme = ReturnType<typeof plotlyTheme>;

const SERIES: { key: 'bookValue' | 'netCash' | 'cash'; name: string; color: string }[] = [
  { key: 'bookValue', name: 'Buchwert', color: 'chart-1' },
  { key: 'netCash', name: 'Net Cash', color: 'chart-2' },
  { key: 'cash', name: 'Bargeld', color: 'chart-4' },
];

/** Book value, net cash and cash over time; lines labelled at their end, axis on the left (diagram rule 12). */
export function developmentChart(t: Theme, w: number, points: CompanyHistoryPoint[]) {
  const v = t.tokens;
  const narrow = w < 520;
  const x = points.map((p) => new Date(p.date));
  const values = points.flatMap((p) => SERIES.map((s) => p[s.key]));
  const ticks = rangeTicks(Math.min(0, ...values), Math.max(0, ...values));
  const last = points[points.length - 1];
  return {
    data: SERIES.map((s) => ({
      type: 'scatter',
      mode: 'lines',
      name: s.name,
      x,
      y: points.map((p) => p[s.key]),
      line: { color: v(s.color), width: 2 },
      customdata: points.map((p) => short(p[s.key])),
      hovertemplate: `${s.name} %{customdata} €<extra></extra>`,
    })),
    layout: {
      showlegend: narrow,
      margin: { l: 0, r: narrow ? 0 : 96, t: 8, b: narrow ? 32 : 0 },
      xaxis: { ...t.layout.xaxis, tickformat: '%d.%m.' },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        tickvals: ticks,
        ticktext: ticks.map((n) => short(n)),
        zeroline: true,
        zerolinecolor: v('line-strong'),
      },
      annotations:
        narrow || !last
          ? []
          : SERIES.map((s) => ({
              x: new Date(last.date),
              y: last[s.key],
              xanchor: 'left',
              xshift: 6,
              showarrow: false,
              text: `${s.name} ${short(last[s.key])}`,
              font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
            })),
    },
  };
}

/**
 * Order book depth around the middle with the sponsor's quote on top: its buy and sell price as
 * lines, the quoted spread shaded between them. Depth colours as on the securities page.
 */
export function quoteChart(
  t: Theme,
  w: number,
  d: { bids: DepthSide; asks: DepthSide; range?: [number, number] },
  mid: number | undefined,
  quote: { buyPrice?: number; sellPrice?: number },
  type?: string,
) {
  const fig = depthChart(t, w, d, mid, type);
  const v = t.tokens;
  const ink = v('text-primary');
  const pct = PERCENT_QUOTED.includes(type ?? '');
  const price = (n: number) => (pct ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} %` : euro(n));
  const { buyPrice: b, sellPrice: s } = quote;
  const line = (x: number) => ({ type: 'line', x0: x, x1: x, yref: 'paper', y0: 0, y1: 1, line: { color: ink, width: 2 } });
  const label = (x: number, text: string, left: boolean) => ({
    x, yref: 'paper', y: 0.86, xanchor: left ? 'right' : 'left', yanchor: 'top', showarrow: false, text: left ? `${text} ` : ` ${text}`,
    font: { family: v('font-mono'), size: 11, color: ink },
  });
  const ok = (n: number | undefined): n is number => n != null && Number.isFinite(n) && n > 0;
  const narrow = w < 420;
  return {
    ...fig,
    layout: {
      ...fig.layout,
      shapes: [
        ...fig.layout.shapes,
        ...(ok(b) && ok(s) && s > b ? [{ type: 'rect', x0: b, x1: s, yref: 'paper', y0: 0, y1: 1, line: { width: 0 }, fillcolor: alpha(ink, 0.1) }] : []),
        ...(ok(b) ? [line(b)] : []),
        ...(ok(s) ? [line(s)] : []),
      ],
      annotations: [
        ...(ok(b) ? [label(b, narrow ? 'Geld' : `Dein Geld ${price(b)}`, true)] : []),
        ...(ok(s) ? [label(s, narrow ? 'Brief' : `Dein Brief ${price(s)}`, false)] : []),
      ],
    },
  };
}
