// Plotly figures for the money-flows page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { shortAxis } from '../charts/ticks';
import { alpha, clip, short } from '../lib/format';
import { KIND_LABEL, KINDS, REST_ID, type NetMetric, type AccountKind, type AccountStat, type AssetKind, type NetEdge, type NetNode, type SankeyData, type TimeSeries } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;

const eur = (n: number) => `${short(n)}${String.fromCharCode(0xa0)}€`;
const pct = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: n < 10 ? 1 : 0 })}${String.fromCharCode(0xa0)}%`;
const count = (n: number) => n.toLocaleString('de-DE');

/** Account colours: companies brass, players ink blue, the rest neutral (diagram rule 3 – fixed per category). */
export const ACCOUNT_COLOR: Record<AccountKind, string> = { company: 'chart-1', player: 'chart-2', fund: 'chart-4', rest: 'line-strong' };
export const ACCOUNT_LABEL: Record<AccountKind, string> = { company: 'Unternehmen', player: 'Spieler', fund: 'ETF-Fonds', rest: 'Übrige' };
/** Securities in the money flow: plum, apart from the account colours. */
const SECURITY_COLOR = 'chart-5';
export const KIND_COLOR: Record<AssetKind, string> = { STOCK: 'chart-1', BOND: 'chart-2', COIN: 'chart-3', BUILDING: 'chart-4', OTHER: 'chart-5' };

/**
 * Who trades with whom: accounts as circles (area ∝ € volume), lines between accounts that traded
 * (width ∝ log € between them). Hover on a line's middle shows the pair. Click → `customdata[0]` = id.
 */
export function networkChart(t: Theme, w: number, nodes: NetNode[], edges: NetEdge[], focus?: string, by: NetMetric = 'volume') {
  const v = t.tokens;
  const narrow = w < NARROW;
  const nodeW = (n: NetNode) => (by === 'trades' ? n.trades : n.volume);
  const edgeW = (e: NetEdge) => (by === 'trades' ? e.trades : e.volume);
  const maxVol = Math.max(1, ...nodes.map(nodeW));
  const maxEdge = Math.max(1, ...edges.map(edgeW));
  const logMax = Math.log10(1 + maxEdge);
  // Four line widths, one trace each (a trace has one width).
  const buckets = [0.25, 0.5, 0.75, 1.01].map((hi, i) => ({ hi, width: [1, 2, 3.5, 6][i], xs: [] as (number | null)[], ys: [] as (number | null)[] }));
  // Lines to „Übrige“ stand for many accounts at once: thin and dotted, so they don't read as one partner.
  const toRest = { xs: [] as (number | null)[], ys: [] as (number | null)[] };
  const mids = { x: [] as number[], y: [] as number[], text: [] as string[] };
  for (const e of edges) {
    const a = nodes[e.a];
    const b = nodes[e.b];
    const share = Math.log10(1 + edgeW(e)) / logMax;
    const bucket = a.id === REST_ID || b.id === REST_ID ? toRest : buckets.find((k) => share <= k.hi) ?? buckets[3];
    bucket.xs.push(a.x, b.x, null);
    bucket.ys.push(a.y, b.y, null);
    mids.x.push((a.x + b.x) / 2);
    mids.y.push((a.y + b.y) / 2);
    mids.text.push(`${a.name} ⇄ ${b.name}<br>${eur(e.volume)} · ${count(e.trades)} Trades`);
  }
  const edgeColor = alpha(v('text-secondary'), 0.4);
  const edgeTraces = [
    { type: 'scatter', mode: 'lines', x: toRest.xs, y: toRest.ys, line: { color: alpha(v('text-secondary'), 0.3), width: 1, dash: 'dot' }, hoverinfo: 'skip', showlegend: false },
    ...buckets
      .filter((k) => k.xs.length)
      .map((k) => ({ type: 'scatter', mode: 'lines', x: k.xs, y: k.ys, line: { color: edgeColor, width: k.width }, hoverinfo: 'skip', showlegend: false })),
  ];
  const size = (n: NetNode) => (narrow ? 6 : 8) + (narrow ? 18 : 38) * Math.sqrt(nodeW(n) / maxVol);
  const labelled = new Set(
    [...nodes]
      .filter((n) => n.kind !== 'rest')
      .sort((a, b) => nodeW(b) - nodeW(a))
      .slice(0, narrow ? 4 : 12)
      .map((n) => n.id),
  );
  if (focus) labelled.add(focus);
  const nodeTraces = (['company', 'player', 'fund', 'rest'] as AccountKind[])
    .map((kind) => {
      const list = nodes.filter((n) => n.kind === kind);
      return {
        type: 'scatter',
        mode: 'markers+text',
        name: ACCOUNT_LABEL[kind],
        x: list.map((n) => n.x),
        y: list.map((n) => n.y),
        text: list.map((n) => (labelled.has(n.id) || n.id === REST_ID ? clip(n.name, narrow ? 12 : 20) : '')),
        textposition: 'top center',
        textfont: { family: v('font-sans'), size: 11, color: v('text-primary') },
        cliponaxis: false,
        marker: {
          size: list.map(size),
          color: v(ACCOUNT_COLOR[kind]),
          line: { color: list.map((n) => (n.id === focus ? v('text-primary') : v('bg-card'))), width: list.map((n) => (n.id === focus ? 3 : 1.5)) },
        },
        customdata: list.map((n) => [n.id]),
        hovertext: list.map(
          (n) =>
            `<b>${n.name}</b>${n.members > 1 && n.id !== REST_ID ? ` (${n.members} Konten)` : ''}<br>Umsatz ${eur(n.volume)} · ${count(n.trades)} Trades<br>${
              n.net >= 0 ? 'netto gekauft' : 'netto verkauft'
            } ${eur(Math.abs(n.net))}`,
        ),
        hoverinfo: 'text',
      };
    })
    .filter((tr) => tr.x.length);
  return {
    data: [
      ...edgeTraces,
      { type: 'scatter', mode: 'markers', x: mids.x, y: mids.y, marker: { size: 12, opacity: 0 }, hovertext: mids.text, hoverinfo: 'text', showlegend: false },
      ...nodeTraces,
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      margin: { l: 8, r: 8, t: 8, b: 8 },
      xaxis: { visible: false, range: [-1.18, 1.18], fixedrange: true },
      yaxis: { visible: false, range: [-1.1, 1.16], fixedrange: true },
    },
  };
}

/** Sellers → securities → buyers in €. Node colours by kind; links in the colour of their source, translucent. */
/** Nodes of a money flow: the market (seller → security → buyer) or one account (`originSankey`, five columns). */
type FlowData = { nodes: { label: string; column: string; ref?: string; kind: SankeyData['nodes'][number]['kind']; value: number }[]; links: SankeyData['links'] };

export function sankeyChart(t: Theme, w: number, d: FlowData) {
  const v = t.tokens;
  const narrow = w < NARROW;
  // Label length from the width a column gets (five columns around one account, three for the market)
  const columns = new Set(d.nodes.map((n) => n.column)).size || 3;
  const hasBuyers = d.nodes.some((n) => n.column === 'buyer');
  const clipAt = Math.max(10, Math.min(24, Math.round(w / columns / 9)));
  const color = (k: FlowData['nodes'][number]['kind']) => v(k === 'security' ? SECURITY_COLOR : ACCOUNT_COLOR[k]);
  // Labels only for nodes with at least 2,5 % of their column – tiny ones would print on top of each other.
  const columnTotal = new Map<string, number>();
  for (const n of d.nodes) columnTotal.set(n.column, (columnTotal.get(n.column) ?? 0) + n.value);
  const big = (n: FlowData['nodes'][number]) => n.value >= 0.025 * (columnTotal.get(n.column) ?? 0);
  return {
    data: [
      {
        type: 'sankey',
        arrangement: 'fixed',
        node: {
          // Five columns on a phone: labels of „what went out“ (right of its node) run into those of „to whom“ (left of theirs)
          label: d.nodes.map((n) => (big(n) && !(narrow && n.column === 'sold' && hasBuyers) ? clip(n.label, clipAt) : '')),
          color: d.nodes.map((n) => color(n.kind)),
          line: { color: v('bg-card'), width: 1 },
          pad: narrow ? 8 : 12,
          thickness: narrow ? 10 : 14,
          customdata: d.nodes.map((n) => [n.ref ?? '', n.column, eur(n.value), n.label]),
          hovertemplate: '%{customdata[3]}<br>%{customdata[2]}<extra></extra>',
        },
        link: {
          source: d.links.map((l) => l.source),
          target: d.links.map((l) => l.target),
          value: d.links.map((l) => l.value),
          color: d.links.map((l) => alpha(color(d.nodes[l.source].kind), 0.3)),
          customdata: d.links.map((l) => ['', 'link', eur(l.value)]),
          hovertemplate: '%{source.customdata[3]} → %{target.customdata[3]}<br>%{customdata[2]}<extra></extra>',
        },
        textfont: { family: v('font-sans'), size: narrow ? 10 : 12, color: v('text-primary') },
      },
    ],
    layout: { margin: { l: 4, r: 4, t: 8, b: 8 }, hovermode: 'closest' },
  };
}

/** € volume per time bucket, stacked by kind or by the largest securities (rest in line-strong). */
export function timelineChart(t: Theme, w: number, x: number[], series: TimeSeries[], counts: number[], width: number, byKind: boolean) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const totals = x.map((_, i) => series.reduce((s, se) => s + se.values[i], 0));
  const colorOf = (s: TimeSeries, i: number) => v(byKind ? KIND_COLOR[s.key as AssetKind] : s.key === 'rest' ? 'line-strong' : `chart-${(i % 5) + 1}`);
  const dates = x.map((d) => new Date(d + width / 2));
  return {
    data: [
      ...series.map((s, i) => ({
        type: 'bar',
        name: clip(s.label, narrow ? 12 : 22),
        x: dates,
        y: s.values,
        width: width * 0.86,
        marker: { color: colorOf(s, i), line: { color: v('bg-card'), width: 1 } },
        customdata: s.values.map((val) => [eur(val)]),
        hovertemplate: `${s.label} %{customdata[0]}<extra></extra>`,
      })),
      // Below: how many trades – activity, independent of a few very large trades.
      {
        type: 'bar',
        name: 'Trades',
        x: dates,
        y: counts,
        width: width * 0.86,
        yaxis: 'y2',
        marker: { color: v('text-muted') },
        showlegend: false,
        hovertemplate: 'Trades %{y}<extra></extra>',
      },
    ],
    layout: {
      barmode: 'stack',
      bargap: 0,
      showlegend: true,
      legend: { ...t.layout.legend, y: -0.14 },
      margin: { l: 0, r: 0, t: 8, b: 8 },
      xaxis: { ...t.layout.xaxis, type: 'date', tickformat: '%H:%M', hoverformat: '%H:%M', anchor: 'y2' },
      yaxis: { ...t.layout.yaxis, domain: [0.34, 1], rangemode: 'tozero', ...shortAxis([0, ...totals], ' €') },
      yaxis2: { ...t.layout.yaxis, domain: [0, 0.24], rangemode: 'tozero', nticks: 3, ticksuffix: ' Tr.' },
      hovermode: 'x unified',
    },
  };
}

/** How the volume and the trades split by kind: two 100 % bars, labelled inside. */
export function kindShareChart(t: Theme, w: number, split: { kind: AssetKind; volume: number; trades: number }[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const vol = split.reduce((s, k) => s + k.volume, 0) || 1;
  const trades = split.reduce((s, k) => s + k.trades, 0) || 1;
  const rows = ['Trades', 'Umsatz'];
  return {
    data: KINDS.filter((k) => split.some((s) => s.kind === k)).map((k) => {
      const s = split.find((x) => x.kind === k)!;
      const shares = [(s.trades / trades) * 100, (s.volume / vol) * 100];
      return {
        type: 'bar',
        orientation: 'h',
        name: KIND_LABEL[k],
        y: rows,
        x: shares,
        marker: { color: v(KIND_COLOR[k]), line: { color: v('bg-card'), width: 2 } },
        text: shares.map((p) => (p >= (narrow ? 14 : 8) ? `${KIND_LABEL[k]} ${pct(p)}` : '')),
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { family: v('font-sans'), size: 11, color: v('bg-page') },
        customdata: [
          [count(s.trades), pct(shares[0])],
          [eur(s.volume), pct(shares[1])],
        ],
        hovertemplate: `${KIND_LABEL[k]}: %{customdata[0]} (%{customdata[1]})<extra></extra>`,
      };
    }),
    layout: {
      barmode: 'stack',
      showlegend: false,
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: 0, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, range: [0, 100] },
      yaxis: { ...t.layout.yaxis, side: 'left', showgrid: false, tickfont: { family: v('font-sans'), size: 12, color: v('text-secondary') } },
    },
  };
}

/** Net buyers (right) and net sellers (left) as diverging bars; no gain/loss colours – money is no price move. */
export function netChart(t: Theme, w: number, rows: AccountStat[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const bars = [...rows].reverse();
  const net = bars.map((r) => r.bought - r.sold);
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        // Categories by id (names repeat: „Privatdepot“, same company names), labels as tick text.
        y: bars.map((r) => r.id),
        x: net,
        marker: { color: net.map((n) => v(n >= 0 ? 'chart-2' : 'chart-3')), line: { color: v('bg-card'), width: 2 } },
        text: net.map((n) => `${n >= 0 ? '+' : '−'}${eur(Math.abs(n))}`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-primary') },
        customdata: bars.map((r) => [r.id, eur(r.bought), eur(r.sold), r.name || 'Privatdepot']),
        hovertemplate: '%{customdata[3]}<br>gekauft %{customdata[1]} · verkauft %{customdata[2]}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      margin: { l: 0, r: 0, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, zeroline: true, zerolinecolor: v('line-strong'), range: symmetric(net) },
      // Narrow (phone): names beside the zero line on the side without the bar – tick labels on the
      // left collided with the value labels of sellers' bars.
      annotations: narrow
        ? bars.map((r, i) => ({
            x: 0,
            y: r.id,
            text: clip(r.name || 'Privatdepot', 18),
            showarrow: false,
            xanchor: net[i] >= 0 ? 'right' : 'left',
            xshift: net[i] >= 0 ? -6 : 6,
            font: { family: v('font-sans'), size: 12, color: v('text-secondary') },
          }))
        : [],
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        automargin: true,
        type: 'category',
        showticklabels: !narrow,
        tickvals: bars.map((r) => r.id),
        ticktext: bars.map((r) => clip(r.name || 'Privatdepot', 22)),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-secondary') } },
    },
  };
}

/** Symmetric x range around 0 with room for the value labels. */
function symmetric(values: number[]): [number, number] {
  const m = Math.max(1, ...values.map(Math.abs)) * 2;
  return [-m, m];
}
