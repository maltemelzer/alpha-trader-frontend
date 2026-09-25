// Plotly figures for the class-specific panels of the securities page (bond, index, ETF, building).
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { PricePoint } from '../api/types';
import { clip, short } from '../lib/format';
import type { Weight, YieldDot } from './derive';

export type { YieldDot };

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;

const pct = (n: number, d = 2) => `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

/** Deterministic jitter in −0.35…0.35, so dots with the same yield do not cover each other. */
const jitter = (i: number) => (((i * 2654435761) % 1000) / 1000 - 0.5) * 0.7;

/**
 * „Wie rentiert diese Anleihe im Vergleich?“: yield per day of every running bond at its ask as a
 * strip of dots, this bond as a large ring, the central bank reserve rate (paid daily) as a dotted
 * line, the market median as a thin line. Log axis – bonds due in minutes reach several hundred %
 * per day, long ones a tenth of a percent. Yields ≤ 0 (bought above the payout) sit at the left edge.
 */
export function yieldStrip(t: Theme, w: number, dots: YieldDot[], own: YieldDot | undefined, reserveRate: number | undefined, fmt: (n: number) => string) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const values = dots.map((d) => d.value).sort((a, b) => a - b);
  const median = values.length ? values[Math.floor((values.length - 1) / 2)] : undefined;
  const positive = [...values, own?.value, reserveRate].filter((x): x is number => x != null && x > 0);
  const lo = Math.log10(Math.min(...positive, 0.1)) - 0.2;
  const hi = Math.log10(Math.max(...positive, 1)) + 0.2;
  const edge = 10 ** lo;
  const at = (x: number) => (x > 0 ? x : edge);
  const positives = dots.filter((d) => d.value > 0);
  const negatives = dots.filter((d) => d.value <= 0);
  const hover = (d: YieldDot) => `${d.name}<br>${fmt(d.value)} pro Tag · fällig in ${d.left}${d.price === 'last' ? '<br>kein Angebot – zum letzten Kurs' : ''}${d.asin ? '<br><i>Klicken öffnet die Anleihe</i>' : ''}`;
  const ticks: number[] = [];
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) ticks.push(10 ** e);
  const refLine = (x: number, color: string, dash: string) => ({ type: 'line', x0: x, x1: x, yref: 'paper', y0: 0, y1: 1, line: { color, width: 1, dash } });
  const label = (x: number, text: string, y: number, anchor: 'left' | 'right') => ({
    x: Math.log10(x), y, yref: 'paper', xanchor: anchor, yanchor: 'middle', xshift: anchor === 'left' ? 4 : -4, showarrow: false, text,
    font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
  });
  const side = (x: number): 'left' | 'right' => (Math.log10(x) < (lo + hi) / 2 ? 'left' : 'right');
  return {
    data: [
      {
        type: 'scatter', mode: 'markers', name: 'Laufende Anleihen',
        x: positives.map((d) => d.value), y: positives.map((_, i) => jitter(i)),
        // Filled: priced at the ask (buyable now); hollow: no offer, priced at the last trade.
        marker: {
          size: 6,
          color: v('chart-2'),
          opacity: 0.55,
          symbol: positives.map((d) => (d.price === 'ask' ? 'circle' : 'circle-open')),
        },
        text: positives.map(hover), hovertemplate: '%{text}<extra></extra>', customdata: positives.map((d) => d.asin ?? ''),
      },
      {
        type: 'scatter', mode: 'markers', name: 'Rendite ≤ 0',
        x: negatives.map(() => edge), y: negatives.map((_, i) => jitter(i + 7)),
        marker: { size: 8, symbol: negatives.map((d) => (d.price === 'ask' ? 'triangle-left' : 'triangle-left-open')), color: v('chart-2'), opacity: 0.6 },
        text: negatives.map(hover), hovertemplate: '%{text}<extra></extra>', customdata: negatives.map((d) => d.asin ?? ''),
      },
      ...(own
        ? [{
            type: 'scatter', mode: 'markers', name: 'Diese Anleihe',
            x: [at(own.value)], y: [0],
            marker: { size: 16, color: v('bg-card'), line: { color: v('text-primary'), width: 3 } },
            text: [hover(own)], hovertemplate: '%{text}<extra></extra>',
          }]
        : []),
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      margin: { l: 0, r: narrow ? 8 : 16, t: 40, b: 0 },
      xaxis: {
        ...t.layout.xaxis, type: 'log', range: [lo, hi], showspikes: false,
        tickvals: ticks, ticktext: ticks.map((x) => `${x.toLocaleString('de-DE', { maximumFractionDigits: 3 })} %`),
      },
      yaxis: { ...t.layout.yaxis, visible: false, showgrid: false, range: [-0.6, 0.6] },
      shapes: [
        ...(reserveRate != null && reserveRate > 0 ? [refLine(reserveRate, v('text-secondary'), 'dot')] : []),
        ...(median != null && median > 0 ? [refLine(median, v('line-strong'), 'solid')] : []),
      ],
      // Two rows above the plot; each label runs towards the middle of the axis, so it stays inside.
      annotations: [
        ...(reserveRate != null && reserveRate > 0 ? [label(reserveRate, `Zentralbankeinlage ${fmt(reserveRate)}`, 1.2, side(reserveRate))] : []),
        ...(median != null && median > 0 ? [label(median, `Median Markt ${fmt(median)}`, 1.07, side(median))] : []),
      ],
    },
  };
}

/** Index weights as a treemap: one hue (a single category), the summed rest in line-strong, weight written in the tile. */
export function weightsTreemap(t: Theme, w: number, weights: Weight[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  return {
    data: [
      {
        type: 'treemap',
        labels: weights.map((x) => x.name),
        parents: weights.map(() => ''),
        values: weights.map((x) => x.weight),
        customdata: weights.map((x) => [x.asin, pct(x.weight, 1)]),
        text: weights.map((x) => pct(x.weight, 1)),
        texttemplate: narrow ? '%{label}<br>%{text}' : '<b>%{label}</b><br>%{text}',
        textposition: 'top left',
        hovertemplate: '%{label}<br>Gewicht %{customdata[1]}<extra></extra>',
        sort: false,
        tiling: { pad: 2 },
        marker: {
          colors: weights.map((x) => v(x.kind === 'rest' ? 'line-strong' : 'bg-raised')),
          line: { color: v('bg-card'), width: 2 },
          pad: { t: 0, l: 0, r: 0, b: 0 },
        },
        textfont: { family: v('font-sans'), size: narrow ? 11 : 13, color: v('text-primary') },
        pathbar: { visible: false },
        root: { color: 'rgba(0,0,0,0)' },
      },
    ],
    layout: { margin: { l: 0, r: 0, t: 0, b: 0 }, showlegend: false, uniformtext: { minsize: 9, mode: 'hide' } },
  };
}

/** ETF and index rebased to 100: the gap between the lines is the tracking difference. Line ends labelled, axis left (rule 12). */
export function trackingChart(t: Theme, w: number, etf: PricePoint[], index: PricePoint[], indexName: string) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const line = (pts: PricePoint[], name: string, color: string) => ({
    type: 'scatter',
    mode: 'lines',
    name,
    x: pts.map((p) => new Date(p.date)),
    y: pts.map((p) => p.value),
    line: { color: v(color), width: 2, shape: 'hv' },
    xhoverformat: '%d.%m. %H:%M',
    hovertemplate: `${name}: %{y:,.2f}<extra></extra>`,
  });
  const end = (pts: PricePoint[], label: string) => {
    const p = pts[pts.length - 1];
    return {
      x: new Date(p.date),
      y: p.value,
      xanchor: 'right',
      yanchor: 'bottom',
      showarrow: false,
      text: `${label} ${p.value.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}`,
      font: { family: v('font-mono'), size: 11, color: v('text-primary') },
    };
  };
  return {
    data: [line(index, clip(indexName, 18), 'chart-2'), line(etf, 'ETF', 'chart-1')],
    layout: {
      showlegend: narrow,
      legend: { orientation: 'h', x: 0, y: -0.15, font: { size: 11, color: v('text-secondary') } },
      margin: { l: 0, r: 0, t: 8, b: 0 },
      hovermode: 'x unified',
      xaxis: { ...t.layout.xaxis, tickformat: '%d.%m.' },
      yaxis: { ...t.layout.yaxis, side: 'left', tickformat: ',.0f' },
      shapes: [
        { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 100, y1: 100, line: { color: v('text-muted'), width: 1, dash: 'dot' } },
      ],
      annotations: narrow || !etf.length || !index.length ? [] : [end(etf, 'ETF'), end(index, 'Index')],
    },
  };
}

/**
 * Price distribution of buildings of the same size. Prices span many orders of magnitude, so the
 * histogram runs over log10(price) on a linear axis (Plotly would bin a log axis linearly) with
 * German labels; this building and the median are marked.
 */
export function buildingCompareChart(t: Theme, w: number, prices: number[], own: number | undefined, size: number) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const logs = prices.filter((p) => p > 0).map((p) => Math.log10(p)).sort((a, b) => a - b);
  const median = logs[Math.floor(logs.length / 2)];
  const ownLog = own && own > 0 ? Math.log10(own) : undefined;
  const rank = ownLog != null ? logs.filter((x) => x < ownLog).length / Math.max(1, logs.length) : undefined;
  const lo = Math.floor(Math.min(logs[0] ?? 0, ownLog ?? Infinity));
  const hi = Math.ceil(Math.max(logs[logs.length - 1] ?? 1, ownLog ?? -Infinity));
  const step = Math.max(1, Math.ceil((hi - lo) / (narrow ? 4 : 7)));
  const ticks: number[] = [];
  for (let k = lo; k <= hi; k += step) ticks.push(k);
  const mark = (x: number, text: string, color: string, y: number, dash: string) => ({
    shape: { type: 'line', xref: 'x', yref: 'paper', x0: x, x1: x, y0: 0, y1: 1, line: { color: v(color), width: dash === 'solid' ? 2 : 1, dash } },
    annotation: {
      xref: 'x', yref: 'paper', x, y, xanchor: x > (lo + hi) / 2 ? 'right' : 'left', yanchor: 'top', showarrow: false,
      text, font: { family: v('font-mono'), size: 11, color: v('text-primary') }, bgcolor: v('bg-card'),
    },
  });
  const marks = [
    ...(median != null ? [mark(median, `Median ${short(10 ** median)} €`, 'text-muted', 1, 'dot')] : []),
    ...(ownLog != null
      ? [mark(ownLog, `Dieses ${short(own!)} €${rank != null ? ` · teurer als ${Math.round(rank * 100)} %` : ''}`, 'chart-2', 0.8, 'solid')]
      : []),
  ];
  return {
    data: [
      {
        type: 'histogram',
        x: logs,
        xbins: { start: lo, end: hi, size: (hi - lo) / (narrow ? 20 : 40) },
        marker: { color: v('line-strong'), line: { color: v('bg-card'), width: 1 } },
        hovertemplate: `%{y} Gebäude à ${size.toLocaleString('de-DE')} m²<extra></extra>`,
      },
    ],
    layout: {
      showlegend: false,
      bargap: 0.05,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      hovermode: 'closest',
      xaxis: { ...t.layout.xaxis, range: [lo, hi], showspikes: false, tickvals: ticks, ticktext: ticks.map((k) => `${short(10 ** k)} €`), tickangle: 0 },
      yaxis: { ...t.layout.yaxis, side: 'left', tickformat: ',.0f' },
      shapes: marks.map((m) => m.shape),
      annotations: marks.map((m) => m.annotation),
    },
  };
}
