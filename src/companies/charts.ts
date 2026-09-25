import type { plotlyTheme } from '../charts/plotlyTheme';
import type { CompanyHistoryPoint } from '../api/queries';
import { short } from '../lib/format';
import { rangeTicks } from '../charts/ticks';
import type { Bin, ChronicleEvent, HistoryLane, RankRow } from './profile';


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
 * Where the company stands: the distribution of one figure over all companies (log-binned by the
 * API), the company's bin in ink blue, the others neutral. Counts span 1 to ~200.000, so the count
 * axis is logarithmic – on a linear axis the company's bin at the top end would be invisible.
 */
export function distributionChart(t: Theme, w: number, row: Pick<RankRow, 'bins' | 'highlight' | 'value' | 'unit'>) {
  const v = t.tokens;
  // Labels like „−32,8 Bio.“ need ~90 px each.
  const every = Math.max(1, Math.ceil((row.bins.length * 90) / Math.max(w, 1)));
  const unit = row.unit === '€' ? ' €' : ' Stk.';
  const range = (b: Bin) => `${short(b.lo)} bis ${short(b.hi)}${unit}`;
  const idx = row.bins.map((_, i) => i);
  const ticks = idx.filter((i) => i % every === 0);
  const hit = row.bins[row.highlight];
  return {
    data: [
      {
        type: 'bar',
        x: idx,
        y: row.bins.map((b) => (b.count > 0 ? b.count : null)),
        marker: {
          color: row.bins.map((_, i) => (i === row.highlight ? v('chart-2') : v('line-strong'))),
          line: { color: v('bg-card'), width: 1 },
        },
        customdata: row.bins.map((b, i) => `${range(b)}${i === row.highlight ? ' · hier' : ''}`),
        hovertemplate: '%{customdata}<br>%{y:,} Einträge<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      bargap: 0.08,
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: 20, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        showspikes: false,
        tickvals: ticks,
        ticktext: ticks.map((i) => short(row.bins[i].lo)),
        tickangle: 0,
        range: [-0.6, row.bins.length - 0.4],
      },
      yaxis: { ...t.layout.yaxis, type: 'log', side: 'left', dtick: 1, tickformat: ',d' },
      // The company's value above its bar (on a log axis annotations take log10 coordinates).
      annotations:
        hit && hit.count > 0
          ? [
              {
                x: row.highlight,
                y: Math.log10(hit.count),
                yanchor: 'bottom',
                xanchor: row.highlight > row.bins.length * 0.7 ? 'right' : row.highlight < row.bins.length * 0.3 ? 'left' : 'center',
                showarrow: false,
                text: `${short(row.value)}${unit}`,
                font: { family: v('font-mono'), size: 12, color: v('text-primary') },
              },
            ]
          : [],
    },
  };
}

/**
 * The company's chronicle as a timeline: one lane per kind of event (milestones, capital, mergers,
 * funds, CEO, name & logo), a dot per event. The lanes carry the meaning, so all dots share one
 * colour; milestones are diamonds, a CEO re-hired at a new salary is a hollow dot.
 */
export function chronicleChart(t: Theme, w: number, events: ChronicleEvent[], lanes: HistoryLane[]) {
  const v = t.tokens;
  const narrow = w < 520;
  const when = (ms: number) =>
    new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers',
        x: events.map((e) => new Date(e.date)),
        y: events.map((e) => e.lane),
        marker: {
          size: narrow ? 9 : 11,
          symbol: events.map((e) => (e.lane === 'Meilensteine' ? 'diamond' : e.minor ? 'circle-open' : 'circle')),
          color: v('chart-2'),
          line: { color: v('chart-2'), width: 2 },
        },
        customdata: events.map((e) => `${when(e.date)}<br>${wrapText(e.text, narrow ? 36 : 52)}`),
        hovertemplate: '%{customdata}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      margin: { l: 0, r: 12, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, showspikes: false, tickformat: '%d.%m.' },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        type: 'category',
        categoryorder: 'array',
        categoryarray: [...lanes].reverse(),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-secondary') },
      },
    },
  };
}

/** Breaks a sentence into lines of at most `max` characters for a Plotly hover label. */
export function wrapText(s: string, max: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(/\s+/)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('<br>');
}
