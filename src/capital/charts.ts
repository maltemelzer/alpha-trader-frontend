// Plotly figure for the capital measures page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { clip, short } from '../lib/format';
import { KIND_LABEL, type MeasureRow } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;

const day = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/** Subscription phases as bars on a time axis (Gantt), a line marks today. Increases chart-1, reductions chart-3. */
export function timelineChart(t: Theme, w: number, rows: MeasureRow[], now: number) {
  const v = t.tokens;
  const shown = [...rows].reverse(); // Plotly draws bottom-up
  const label = (r: MeasureRow) => `${clip(r.name, w < 420 ? 14 : 26)} · ${r.kind === 'increase' ? '▲' : '▼'}`;
  const trace = (kind: MeasureRow['kind'], color: string) => {
    const rs = shown.filter((r) => r.kind === kind);
    return {
      type: 'bar',
      orientation: 'h',
      name: KIND_LABEL[kind],
      y: rs.map(label),
      base: rs.map((r) => new Date(r.startDate)),
      x: rs.map((r) => r.endDate - r.startDate),
      marker: { color: v(color) },
      customdata: rs.map((r) => [day(r.startDate), day(r.endDate), short(r.cashVolume), r.asin]),
      hovertemplate: `%{y}<br>%{customdata[0]} – %{customdata[1]}<br>Volumen %{customdata[2]} €<extra>${KIND_LABEL[kind]}</extra>`,
    };
  };
  return {
    data: [trace('increase', 'chart-1'), trace('reduction', 'chart-3')],
    layout: {
      barmode: 'overlay',
      showlegend: true,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1.02, yanchor: 'bottom', font: { size: 11, color: v('text-secondary') } },
      hovermode: 'closest',
      bargap: 0.4,
      margin: { l: 0, r: 8, t: 24, b: 0 },
      xaxis: { ...t.layout.xaxis, type: 'date', tickformat: '%d.%m.', showspikes: false },
      yaxis: {
        ...t.layout.yaxis,
        type: 'category',
        categoryorder: 'array',
        categoryarray: shown.map(label),
        side: 'left',
        showgrid: false,
        showline: false,
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
      shapes: [
        { type: 'line', xref: 'x', yref: 'paper', x0: new Date(now), x1: new Date(now), y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dot' } },
      ],
      annotations: [
        { xref: 'x', yref: 'paper', x: new Date(now), y: 1, yanchor: 'bottom', xanchor: 'left', showarrow: false, text: 'heute', font: { size: 11, color: v('text-muted') } },
      ],
    },
  };
}
