import type { plotlyTheme } from '../charts/plotlyTheme';
import type { CompanyHistoryPoint } from '../api/queries';
import { alpha, euro, short } from '../lib/format';
import { depthChart, PERCENT_QUOTED } from '../security/charts';
import type { DepthSide } from '../security/derive';
import { rangeTicks, shortAxis } from '../charts/ticks';
import { changePct, type ValuationSeries } from './overview';
import { roundEdge, sharePct, type Bin, type ChronicleEvent, type HistoryLane, type RankRow } from './profile';

const NBSP = String.fromCharCode(0xa0);

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
 * Overview: share price against book value per share – one axis (both € per share), so the gap is
 * the premium or discount (KBV). Price in gain/loss by its direction over the range (diagram rule
 * 1), book value in ink blue; lines labelled at their end, axis left (rule 12), legend on phones.
 */
export function valuationChart(t: Theme, w: number, s: ValuationSeries) {
  const v = t.tokens;
  const narrow = w < 420;
  const up = (changePct(s.price) ?? 0) >= 0;
  const lines = [
    { name: 'Kurs', points: s.price, color: v(up ? 'gain' : 'loss'), shape: 'linear' },
    { name: 'Buchwert je Aktie', points: s.book, color: v('chart-2'), shape: 'hv' },
  ].filter((l) => l.points.length);
  const all = lines.flatMap((l) => l.points.map((p) => p.value));
  const dates = lines.flatMap((l) => l.points.map((p) => p.date));
  const fmt = (n: number) => (Math.abs(n) >= 1e6 ? `${short(n)}${NBSP}€` : euro(n, Math.abs(n) < 0.01 ? 4 : 2));
  return {
    data: lines.map((l) => ({
      type: 'scatter',
      mode: l.points.length > 1 ? 'lines' : 'markers',
      name: l.name,
      x: l.points.map((p) => new Date(p.date)),
      y: l.points.map((p) => p.value),
      line: { color: l.color, width: 2, shape: l.shape },
      marker: { color: l.color, size: 6 },
      customdata: l.points.map((p) => fmt(p.value)),
      hovertemplate: `${l.name} %{customdata}<extra></extra>`,
    })),
    layout: {
      showlegend: narrow,
      legend: { ...t.layout.legend, y: -0.18 },
      margin: { l: 0, r: narrow ? 0 : 118, t: 8, b: narrow ? 36 : 0 },
      // Plotly pads date axes by a week here – the range ends at the last point.
      xaxis: { ...t.layout.xaxis, tickformat: '%d.%m.', range: dates.length ? [new Date(Math.min(...dates)), new Date(Math.max(...dates))] : undefined },
      yaxis: { ...t.layout.yaxis, side: 'left', rangemode: 'tozero', ...shortAxis(all, `${NBSP}€`) },
      annotations: narrow
        ? []
        : lines.map((l) => {
            const last = l.points[l.points.length - 1];
            return {
              x: new Date(last.date),
              y: last.value,
              xanchor: 'left',
              xshift: 6,
              showarrow: false,
              text: `${l.name === 'Kurs' ? 'Kurs' : 'Buchwert'} ${fmt(last.value)}`,
              font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
            };
          }),
    },
  };
}

/**
 * Where the company stands: the distribution of one figure (log-spaced bins from the API) as the
 * share of all companies (or securities) per bin, on a linear axis – bar heights are what they
 * look like. Bins below the company's in pale ink blue („weniger als du“), its own bin in full ink
 * blue with a marker line through the whole chart, bins above neutral. Above the plot on either
 * side of the marker: how many have less and how many more. The value axis is labelled at the bin
 * edges, rounded to two digits („650 Tsd.“, „10 Mio.“).
 */
export function distributionChart(
  t: Theme,
  w: number,
  row: Pick<RankRow, 'bins' | 'highlight' | 'value' | 'unit' | 'standing'>,
) {
  const v = t.tokens;
  const n = row.bins.length;
  const total = row.bins.reduce((s, b) => s + b.count, 0) || 1;
  // Edge labels like „−33 Bio.“ need ~72 px each.
  const every = Math.max(1, Math.ceil(((n - 1) * 72) / Math.max(w, 1)));
  const unit = row.unit === '€' ? `${NBSP}€` : `${NBSP}Stk.`;
  const range = (b: Bin) => `${short(b.lo)} bis ${short(b.hi)}${unit}`;
  const idx = row.bins.map((_, i) => i);
  const edges = idx.slice(1).filter((i) => (i - 1) % every === 0);
  const h = row.highlight;
  const has = h >= 0 && h < n;
  const s = row.standing;
  const ink = v('chart-2');
  const color = (i: number) => (!has ? v('line-strong') : i < h ? alpha(ink, 0.45) : i === h ? ink : v('line-strong'));
  const where = (i: number) => (!has ? '' : i < h ? ' · weniger als hier' : i === h ? ' · hier' : ' · mehr als hier');
  const side = (text: string, left: boolean) => ({
    x: h,
    xref: 'x',
    y: 1,
    yref: 'paper',
    yanchor: 'bottom',
    xanchor: left ? 'right' : 'left',
    xshift: left ? -8 : 8,
    showarrow: false,
    text,
    font: { family: v('font-sans'), size: 12, color: v('text-secondary') },
  });
  return {
    data: [
      {
        type: 'bar',
        x: idx,
        y: row.bins.map((b) => (b.count / total) * 100),
        marker: { color: idx.map(color), line: { color: v('bg-card'), width: 1 } },
        customdata: row.bins.map((b, i) => [range(b), b.count.toLocaleString('de-DE'), sharePct(b.count / total), where(i)]),
        hovertemplate: '%{customdata[0]}%{customdata[3]}<br>%{customdata[2]} · %{customdata[1]} Einträge<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      bargap: 0.08,
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: 24, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        showspikes: false,
        tickvals: edges.map((i) => i - 0.5),
        ticktext: edges.map((i) => short(roundEdge(row.bins[i].lo))),
        tickangle: 0,
        range: [-0.6, n - 0.4],
      },
      yaxis: { ...t.layout.yaxis, side: 'left', rangemode: 'tozero', ticksuffix: `${NBSP}%`, tickformat: ',.0f' },
      shapes: has
        ? [{ type: 'line', x0: h, x1: h, yref: 'paper', y0: 0, y1: 1, line: { color: v('text-primary'), width: 1, dash: 'dot' } }]
        : [],
      annotations:
        has && s
          ? [
              // Next to the marker, where there is room (the header above the chart says it too).
              ...(s.below > 0 && h >= 3 ? [side(`← ${sharePct(s.below)} weniger`, true)] : []),
              ...(s.above > 0 && h <= n - 4 ? [side(`${sharePct(s.above)} mehr →`, false)] : []),
              {
                x: h,
                y: (row.bins[h].count / total) * 100,
                yanchor: 'bottom',
                xanchor: h > n * 0.7 ? 'right' : h < n * 0.3 ? 'left' : 'center',
                showarrow: false,
                text: `${short(row.value)}${unit}`,
                font: { family: v('font-mono'), size: 12, color: v('text-primary') },
                bgcolor: v('bg-card'),
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
