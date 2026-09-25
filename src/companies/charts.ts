import type { plotlyTheme } from '../charts/plotlyTheme';
import type { CompanyHistoryPoint } from '../api/queries';
import { short } from '../lib/format';

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

/** About five round tick values covering lo…hi (unlike security's niceTicks, which starts at 0). */
export function rangeTicks(lo: number, hi: number, n = 5): number[] {
  if (hi === lo) return [lo];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step / 2; t += step) out.push(Math.round(t / step) * step);
  return out;
}
