// Plotly figure for the capital measures page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { clip, short } from '../lib/format';
import { KIND_LABEL, type AcquirerGroup, type DividendRow, type MeasureRow } from './derive';

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

const span = (a: number, b: number) => (day(a) === day(b) ? day(a) : `${day(a)} – ${day(b)}`);

/** Shared look of the horizontal bar charts: names on the left, values as text at the bar end. */
function hbarLayout(t: Theme, categories: string[], xaxis: Record<string, unknown>) {
  const v = t.tokens;
  return {
    hovermode: 'closest',
    showlegend: false,
    bargap: 0.3,
    margin: { l: 0, r: 72, t: 4, b: 0 },
    xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, ...xaxis },
    yaxis: {
      ...t.layout.yaxis,
      type: 'category',
      categoryorder: 'array',
      categoryarray: categories,
      side: 'left',
      showgrid: false,
      automargin: true,
      tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
    },
  };
}

/**
 * Announced dividends: the cap per company as dots on a log axis (caps range from Mrd. to Bio.;
 * bars would suggest lengths that a log axis does not keep), due date next to the name, next on top.
 */
export function dividendChart(t: Theme, w: number, rows: DividendRow[]) {
  const v = t.tokens;
  const dots = [...rows].reverse();
  const label = (r: DividendRow) => `${clip(r.name, w < 420 ? 14 : 24)} · ${day(r.startDate)}`;
  const vols = rows.map((r) => Math.max(1, r.maximalCashVolume));
  const lo = Math.floor(Math.log10(Math.min(...vols)));
  const hi = Math.ceil(Math.log10(Math.max(...vols)) + 0.01);
  const decades = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
  const step = Math.ceil(decades.length / (w < 420 ? 3 : 6));
  const ticks = decades.filter((_, i) => i % step === 0);
  const narrow = w < 420;
  const layout = hbarLayout(t, dots.map(label), {
    // On phones the values stand next to the dots; the log axis would only crowd the chart.
    visible: !narrow,
    type: 'log',
    range: [lo - 0.1, hi + 0.1],
    showgrid: true,
    gridcolor: v('line'),
    showline: false,
    tickvals: ticks,
    ticktext: ticks.map((d) => short(d)),
  });
  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers+text',
        y: dots.map(label),
        x: vols.slice().reverse(),
        marker: { color: v('chart-1'), size: 12, line: { color: v('bg-card'), width: 2 } },
        text: dots.map((r) => `${short(r.maximalCashVolume)} €`),
        textposition: 'middle right',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
        customdata: dots.map((r) => [r.name, day(r.startDate), r.asin]),
        hovertemplate: '%{customdata[0]}<br>Termin %{customdata[1]}<br>höchstens %{text}<extra></extra>',
      },
    ],
    layout: {
      ...layout,
      yaxis: { ...layout.yaxis, showgrid: true, gridcolor: v('line'), tickfont: { family: v('font-sans'), size: narrow ? 11 : 12, color: v('text-primary') } },
      margin: { l: 0, r: 88, t: 4, b: 0 },
    },
  };
}

/** Mergers per acquiring company: how many companies merge into it, the date span as text. */
export function mergerChart(t: Theme, w: number, groups: AcquirerGroup[]) {
  const v = t.tokens;
  const bars = [...groups].reverse();
  const label = (g: AcquirerGroup) => clip(g.name, w < 420 ? 16 : 26);
  const max = Math.max(1, ...groups.map((g) => g.count));
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: bars.map(label),
        x: bars.map((g) => g.count),
        marker: { color: bars.map((g) => v(g.rest ? 'line-strong' : 'chart-2')), line: { color: v('bg-card'), width: 2 } },
        text: bars.map((g) => `${g.count} · ${span(g.first, g.last)}`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-primary') },
        customdata: bars.map((g) => [g.name, span(g.first, g.last), `${short(g.volume)} €`, g.count === 1 ? 'Fusion' : 'Fusionen', g.asin ?? '']),
        hovertemplate:
          '%{customdata[0]}<br>%{x} %{customdata[3]} · %{customdata[1]}<br>Höchstvolumen zusammen %{customdata[2]}<extra></extra>',
      },
    ],
    layout: { ...hbarLayout(t, bars.map(label), { range: [0, max * 1.05] }), margin: { l: 0, r: 110, t: 4, b: 0 } },
  };
}
