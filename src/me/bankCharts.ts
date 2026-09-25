// Plotly figures for the bank page: balance over time with in-/outflows per day or hour, and
// in/out bars per category or item. Cash flows are no price moves → category colours, never gain/loss.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { shortAxis } from '../charts/ticks';
import { clip, short } from '../lib/format';
import { CATEGORY_LABEL, CATEGORY_SHORT, type CashCategory, type FlowBucket } from './bank';

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;
const HOUR = 3_600_000;

const eur = (n: number) => `${short(n)}\u00a0€`;
/** „▲ +1,2 Mio. €“ / „▼ −300 €“ – direction always with arrow and sign. */
export const flowText = (n: number) => (n > 0 ? `▲ +${eur(n)}` : n < 0 ? `▼ ${eur(n)}` : `± ${eur(0)}`);

export interface FlowChartInput {
  line: { date: number; balance: number }[];
  buckets: FlowBucket[];
  /** bucket size in ms (hour or day) */
  size: number;
  /** categories with their own colour (chart-1…5); all others go into „Sonstige“ */
  order: CashCategory[];
}

/**
 * Two panels on one time axis: the balance as a step line on top; below per bucket the inflows
 * stacked above zero and the outflows below, one colour per category.
 */
export function flowChart(t: Theme, w: number, { line, buckets, size, order }: FlowChartInput) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const x = buckets.map((b) => new Date(b.t + size / 2));
  const width = buckets.map(() => size * 0.8);
  const others = (side: Partial<Record<CashCategory, number>>) =>
    Object.entries(side).reduce((s, [k, n]) => (order.includes(k as CashCategory) ? s : s + (n ?? 0)), 0);
  const series: { key: string; name: string; color: string; get: (s: Partial<Record<CashCategory, number>>) => number }[] = [
    ...order.map((c, i) => ({ key: c, name: w < 800 ? CATEGORY_SHORT[c] : CATEGORY_LABEL[c], color: v(`chart-${i + 1}`), get: (s: Partial<Record<CashCategory, number>>) => s[c] ?? 0 })),
    { key: 'rest', name: 'Sonstige', color: v('line-strong'), get: others },
  ];
  const bars = series.flatMap((s) => {
    const inY = buckets.map((b) => s.get(b.inflow));
    const outY = buckets.map((b) => -s.get(b.outflow));
    if (!inY.some(Boolean) && !outY.some(Boolean)) return [];
    const fmt = size === HOUR ? '%d.%m. %H:00' : '%d.%m.';
    return [
      {
        type: 'bar',
        name: s.name,
        legendgroup: s.key,
        x,
        y: inY,
        width,
        yaxis: 'y2',
        marker: { color: s.color, line: { color: v('bg-card'), width: 1 } },
        customdata: inY.map((n) => flowText(n)),
        hovertemplate: `%{x|${fmt}} · ${s.name}<br>Eingang %{customdata}<extra></extra>`,
      },
      {
        type: 'bar',
        name: s.name,
        legendgroup: s.key,
        showlegend: false,
        x,
        y: outY,
        width,
        yaxis: 'y2',
        marker: { color: s.color, line: { color: v('bg-card'), width: 1 } },
        customdata: outY.map((n) => flowText(n)),
        hovertemplate: `%{x|${fmt}} · ${s.name}<br>Ausgang %{customdata}<extra></extra>`,
      },
    ];
  });
  const flows = buckets.flatMap((b) => [
    Object.values(b.inflow).reduce((s, n) => s + (n ?? 0), 0),
    -Object.values(b.outflow).reduce((s, n) => s + (n ?? 0), 0),
  ]);
  const maxFlow = Math.max(1, ...flows.map(Math.abs));
  const balances = line.map((p) => p.balance);
  const span = line.length ? line[line.length - 1].date - line[0].date : 0;
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Kontostand',
        x: line.map((p) => new Date(p.date)),
        y: balances,
        line: { color: v('text-primary'), width: 2, shape: 'hv' },
        showlegend: false,
        customdata: balances.map((b) => eur(b)),
        hovertemplate: '%{x|%d.%m. %H:%M}<br>Kontostand %{customdata} (zurückgerechnet)<extra></extra>',
      },
      ...bars,
    ],
    layout: {
      barmode: 'relative',
      hovermode: 'closest',
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0,
        y: 1.02,
        yanchor: 'bottom',
        traceorder: 'normal',
        font: { size: narrow ? 10 : 11, color: v('text-secondary') },
      },
      margin: { l: 0, r: 0, t: 28, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        type: 'date',
        anchor: 'y2',
        showspikes: false,
        nticks: narrow ? 4 : 8,
        tickformat: span < 2 * 24 * HOUR ? '%H:%M\n%d.%m.' : '%d.%m.',
      },
      yaxis: { ...t.layout.yaxis, side: 'left', domain: [0.46, 1], ...shortAxis(balances, ' €') },
      yaxis2: {
        ...t.layout.yaxis,
        side: 'left',
        domain: [0, 0.38],
        range: [-maxFlow * 1.08, maxFlow * 1.08],
        zeroline: true,
        zerolinecolor: v('line-strong'),
        showgrid: false,
        tickvals: [-maxFlow, 0, maxFlow],
        ticktext: [`−${eur(maxFlow)}`, '0', `+${eur(maxFlow)}`],
      },
    },
  };
}

/**
 * Axis labels cut to `max` characters; where two cut labels are the same (bonds of one issuer:
 * „Alpha Bank 0.0000% 26/0…“), rows with an ASIN show the ASIN instead.
 */
export function barLabels(rows: { label: string; asin?: string }[], max: number): string[] {
  const cut = rows.map((x) => clip(x.label, max));
  const seen = new Map<string, number>();
  for (const c of cut) seen.set(c, (seen.get(c) ?? 0) + 1);
  return cut.map((c, i) => ((seen.get(c) ?? 0) > 1 && rows[i].asin ? rows[i].asin! : c));
}

export interface InOutRow {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  /** clicking opens this security */
  asin?: string;
}

/**
 * Horizontal in/out bars: inflows to the right (chart-2), outflows to the left (chart-3), the net
 * as text with ▲/▼ next to the bars. Largest first (top).
 */
export function inOutChart(t: Theme, w: number, rows: InOutRow[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const r = [...rows].reverse();
  const labels = barLabels(r, narrow ? 12 : 22);
  // Rows are placed by index – equal labels (bonds of one issuer) would otherwise share a bar.
  const y = r.map((_, i) => i);
  const max = Math.max(1, ...rows.flatMap((x) => [x.inflow, x.outflow]));
  const custom = r.map((x) => [x.label, flowText(x.inflow), flowText(-x.outflow), flowText(x.net), x.count, x.asin ?? '']);
  const hover = '%{customdata[0]}<br>Eingang %{customdata[1]} · Ausgang %{customdata[2]}<br>Netto %{customdata[3]} · %{customdata[4]} Buchungen<extra></extra>';
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        name: 'Eingang',
        y,
        x: r.map((x) => x.inflow),
        marker: { color: v('chart-2') },
        customdata: custom,
        hovertemplate: hover,
      },
      {
        type: 'bar',
        orientation: 'h',
        name: 'Ausgang',
        y,
        x: r.map((x) => -x.outflow),
        marker: { color: v('chart-3') },
        customdata: custom,
        hovertemplate: hover,
      },
      {
        // net as text at the right edge
        type: 'scatter',
        mode: 'text',
        y,
        x: r.map(() => max * 1.02),
        text: r.map((x) => flowText(x.net)),
        textposition: 'middle right',
        textfont: { family: v('font-mono'), size: narrow ? 10 : 11, color: v('text-primary') },
        hoverinfo: 'skip',
        showlegend: false,
        cliponaxis: false,
      },
    ],
    layout: {
      barmode: 'relative',
      hovermode: 'closest',
      showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 11, color: v('text-secondary') } },
      bargap: 0.3,
      margin: { l: 0, r: narrow ? 84 : 110, t: 24, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        range: [-max * 1.02, max * 1.02],
        zeroline: true,
        zerolinecolor: v('line-strong'),
        showline: false,
        tickvals: [-max, 0, max],
        ticktext: [`−${eur(max)}`, '0', `+${eur(max)}`],
        showspikes: false,
      },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        showline: false,
        automargin: true,
        tickfont: { family: v('font-sans'), size: narrow ? 11 : 12, color: v('text-primary') },
        tickmode: 'array',
        tickvals: y,
        ticktext: labels,
        range: [-0.5, r.length - 0.5],
      },
    },
  };
}
