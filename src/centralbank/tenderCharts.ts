// Plotly figures of the interest tender: what my bid does, how the main rate followed the tenders,
// and the bids in the running tender's book.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { alpha, clip, short } from '../lib/format';
import { bidEffect, bidPct, signedRate, type Tender } from './tender';

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;
const NBSP = String.fromCharCode(0xa0);
const pct = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`;
const stk = (n: number) => `${short(n)}${NBSP}Stk.`;

export interface EffectFigure {
  /** my bid price in % */
  price: number;
  /** my number of bonds (0 = no bid yet) */
  shares: number;
  /** resulting unrounded rate over the volume at 98 %, 102 % and at my price */
  low: { shares: number; rate: number }[];
  high: { shares: number; rate: number }[];
  line: { shares: number; rate: number }[];
  /** unrounded rate without my bid */
  base: number;
  /** unrounded rate with my bid */
  mine?: number;
  /** most bonds I may bid (credit line) */
  maxShares?: number;
  /** other bidders' last bids, for scale */
  refs: { label: string; shares: number }[];
}

/**
 * „Was bewirkt mein Gebot?“ – the next main rate over the number of bonds (log axis). The band is every
 * outcome between a bid at 98 % and at 102 %, the brass line is my price, the dot my bid. Other bidders'
 * last bids are marked on the axis for scale; a click on the line sets the volume.
 */
export function effectChart(t: Theme, w: number, f: EffectFigure) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const xs = f.line.map((p) => p.shares);
  const lo = Math.log10(xs[0] ?? 1);
  const hi = Math.log10(xs[xs.length - 1] ?? 10);
  const ticks = [1e3, 1e6, 1e9, 1e12, 1e15].filter((n) => Math.log10(n) >= lo - 0.01 && Math.log10(n) <= hi + 0.01);
  if (ticks.length && hi - Math.log10(ticks[ticks.length - 1]) >= 1) ticks.push(10 ** Math.round(hi));
  const rates = [...f.low, ...f.high].map((p) => p.rate);
  const yLo = Math.min(f.base, ...rates) - 0.15;
  const yHi = Math.max(f.base, ...rates) + 0.15;
  const shapes: object[] = [
    { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: f.base, y1: f.base, line: { color: v('text-secondary'), width: 1, dash: 'dot' } },
  ];
  const annotations: object[] = [
    {
      xref: 'paper',
      x: 0,
      y: f.base,
      xanchor: 'left',
      yanchor: 'bottom',
      showarrow: false,
      xshift: 6,
      text: `ohne dich ${pct(f.base)}`,
      font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
    },
  ];
  if (f.maxShares && Math.log10(f.maxShares) <= hi) {
    shapes.push({ type: 'line', yref: 'paper', x0: f.maxShares, x1: f.maxShares, y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dash' } });
    annotations.push({
      x: Math.log10(f.maxShares),
      yref: 'paper',
      y: 0,
      xanchor: 'right',
      yanchor: 'bottom',
      xshift: -4,
      showarrow: false,
      text: 'dein Rahmen',
      font: { size: 11, color: v('text-secondary') },
    });
  }
  // other bidders for scale – largest first, labels at least 1,5 decades apart so they don't overlap
  const refs: { label: string; shares: number }[] = [];
  for (const r of f.refs) {
    if (refs.length >= (narrow ? 2 : 3)) break;
    if (Math.log10(r.shares) < lo || refs.some((x) => Math.abs(Math.log10(x.shares) - Math.log10(r.shares)) < (narrow ? 2.5 : 1.5))) continue;
    refs.push(r);
  }
  for (const r of refs) {
    shapes.push({ type: 'line', yref: 'paper', x0: r.shares, x1: r.shares, y0: 0.9, y1: 1, line: { color: v('line-strong'), width: 1 } });
    annotations.push({
      x: Math.log10(r.shares),
      yref: 'paper',
      y: 1,
      xanchor: 'right',
      yanchor: 'top',
      xshift: -3,
      showarrow: false,
      text: clip(r.label, narrow ? 8 : 12),
      font: { size: 10, color: v('text-secondary') },
    });
  }
  const hover = (rate: number) => [pct(rate), signedRate(rate - f.base)];
  const data: object[] = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Gebot 102 %',
      x: f.high.map((p) => p.shares),
      y: f.high.map((p) => p.rate),
      line: { color: v('line-strong'), width: 1 },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Gebot 98 %',
      x: f.low.map((p) => p.shares),
      y: f.low.map((p) => p.rate),
      line: { color: v('line-strong'), width: 1 },
      fill: 'tonexty',
      fillcolor: alpha(v('chart-2'), 0.14),
      hoverinfo: 'skip',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: `Gebot ${bidPct(f.price)}`,
      x: xs,
      y: f.line.map((p) => p.rate),
      line: { color: v('chart-1'), width: 3 },
      customdata: f.line.map((p) => [stk(p.shares), ...hover(p.rate)]),
      hovertemplate: `${bidPct(f.price)} · %{customdata[0]}<br>Leitzins %{customdata[1]} (%{customdata[2]})<extra></extra>`,
    },
  ];
  if (f.mine != null && f.shares > 0) {
    data.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Dein Gebot',
      x: [f.shares],
      y: [f.mine],
      marker: { color: v('chart-1'), size: 13, line: { color: v('bg-card'), width: 2 } },
      customdata: [[stk(f.shares), ...hover(f.mine)]],
      hovertemplate: `Dein Gebot ${bidPct(f.price)} · %{customdata[0]}<br>Leitzins %{customdata[1]} (%{customdata[2]})<extra></extra>`,
    });
  }
  // the edges of the band, labelled at the right end
  const last = (a: { rate: number }[]) => a[a.length - 1]?.rate;
  if (!narrow) {
    for (const [label, r] of [
      ['102 %', last(f.high)],
      ['98 %', last(f.low)],
    ] as const) {
      if (r == null) continue;
      annotations.push({
        x: hi,
        y: r,
        xanchor: 'left',
        xshift: 4,
        showarrow: false,
        text: label,
        font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
      });
    }
  }
  return {
    data,
    layout: {
      hovermode: 'closest',
      showlegend: false,
      margin: { l: 0, r: narrow ? 0 : 44, t: 4, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        type: 'log',
        range: [lo, hi],
        tickvals: ticks,
        ticktext: ticks.map((n) => short(n)),
        showspikes: false,
      },
      yaxis: { ...t.layout.yaxis, side: 'left', ticksuffix: ' %', range: [yLo, yHi], zeroline: true, zerolinecolor: v('line-strong') },
      shapes,
      annotations,
    },
  };
}

export interface HistoryFigure {
  /** hourly main rate, oldest first */
  rates: { date: number; main?: number }[];
  tenders: Tender[];
  /** rate after each tender without the selected bidder */
  without?: { date: number; rate?: number; without?: number }[];
  selected?: string;
  colors: Record<string, string>;
}

/**
 * Leitzins against the tenders: above the main rate (step line) with each tender's weighted bid as a
 * dot (−2 … +2) and, for a chosen bidder, the rate without them (dashed); below each tender's bonds
 * per bidder – above the line what raises the rate (bids over 100 %), below what lowers it.
 */
export function tenderHistoryChart(t: Theme, w: number, f: HistoryFigure) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const x0 = f.tenders[0]?.date;
  const rates = f.rates.filter((r) => r.main != null && (x0 == null || r.date >= x0 - 86_400_000));
  const bidders = [...new Set(f.tenders.flatMap((t) => t.bids.map((b) => b.bidder)))];
  const color = (b: string) => v(f.colors[b] ?? 'line-strong');
  const faded = (b: string) => f.selected != null && f.selected !== b;
  const maxShares = Math.max(1, ...f.tenders.map((t) => t.shares));
  const data: object[] = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Leitzins',
      x: rates.map((r) => new Date(r.date)),
      y: rates.map((r) => r.main),
      line: { color: v('text-primary'), width: 2, shape: 'hv' },
      hovertemplate: 'Leitzins %{y:.2f} %<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'Tender des Tages',
      x: f.tenders.map((t) => new Date(t.date)),
      y: f.tenders.map((t) => t.effect),
      marker: {
        color: v('bg-card'),
        size: f.tenders.map((t) => 6 + 8 * Math.sqrt(t.shares / maxShares)),
        line: { color: v('text-secondary'), width: 1.5 },
      },
      customdata: f.tenders.map((t) => [signedRate(t.effect), stk(t.shares), t.bids.length]),
      hovertemplate: '%{x|%d.%m.} Tender: %{customdata[0]}<br>%{customdata[1]} von %{customdata[2]} Bietern<extra></extra>',
    },
  ];
  if (f.selected && f.without?.length) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      name: `ohne ${f.selected}`,
      x: f.without.map((p) => new Date(p.date)),
      y: f.without.map((p) => (p.without != null ? Math.round(p.without * 100) / 100 : null)),
      line: { color: color(f.selected), width: 2, dash: 'dash', shape: 'hv' },
      hovertemplate: `ohne ${f.selected.replace(/%/g, '%%')}: %{y:.2f} %<extra></extra>`,
    });
  }
  for (const b of bidders) {
    const rows = f.tenders.flatMap((t) =>
      t.bids.filter((x) => x.bidder === b).map((x) => ({ date: t.date, shares: x.shares, price: x.price })),
    );
    // one tender may hold two bids of the same bidder; Plotly stacks them in the same bar
    data.push({
      type: 'bar',
      name: b,
      x: rows.map((r) => new Date(r.date)),
      y: rows.map((r) => Math.sign(bidEffect(r.price)) * r.shares),
      width: rows.map(() => 16 * 3_600_000),
      yaxis: 'y2',
      marker: { color: faded(b) ? alpha(color(b), 0.25) : color(b) },
      customdata: rows.map((r) => [b, bidPct(r.price), stk(r.shares), signedRate(bidEffect(r.price))]),
      hovertemplate: '%{customdata[0]}<br>%{x|%d.%m.}: %{customdata[2]} zu %{customdata[1]} (%{customdata[3]})<extra></extra>',
    });
  }
  const maxBar = Math.max(1, ...f.tenders.map((t) => Math.max(...t.bids.map((b) => b.shares))));
  return {
    data,
    layout: {
      hovermode: 'closest',
      barmode: 'relative',
      showlegend: false,
      margin: { l: 0, r: narrow ? 0 : 4, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, type: 'date', tickformat: '%d.%m.', showspikes: false, nticks: narrow ? 4 : 8, anchor: 'y2' },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        domain: [0.42, 1],
        range: [-2.2, 2.2],
        tickvals: [-2, -1, 0, 1, 2],
        ticktext: ['−2 %', '−1 %', '0 %', '+1 %', '+2 %'],
        zeroline: true,
        zerolinecolor: v('line-strong'),
      },
      yaxis2: {
        ...t.layout.yaxis,
        side: 'left',
        domain: [0, 0.34],
        range: [-maxBar * 1.1, maxBar * 1.1],
        tickvals: [-maxBar, 0, maxBar],
        ticktext: [`▼ ${short(maxBar)}`, '0', `▲ ${short(maxBar)}`],
        zeroline: true,
        zerolinecolor: v('line-strong'),
        showgrid: false,
      },
    },
  };
}

/** Bids in the running tender's book per price as horizontal bars (high bids on top), my own share in brass. */
export function bookChart(t: Theme, _w: number, rows: { price: number; shares: number; mine: number }[]) {
  const v = t.tokens;
  const sorted = [...rows].sort((a, b) => a.price - b.price); // Plotly draws the first bar at the bottom
  const y = sorted.map((r) => `${bidPct(r.price)} (${signedRate(bidEffect(r.price))})`);
  const max = Math.max(1, ...sorted.map((r) => r.shares));
  const hover = sorted.map((r) => [stk(r.shares), stk(r.mine)]);
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        name: 'Andere',
        y,
        x: sorted.map((r) => r.shares - r.mine),
        marker: { color: v('chart-2') },
        customdata: hover,
        hovertemplate: '%{y}<br>%{customdata[0]} im Buch<extra></extra>',
      },
      {
        type: 'bar',
        orientation: 'h',
        name: 'Deine',
        y,
        x: sorted.map((r) => r.mine),
        marker: { color: v('chart-1') },
        text: sorted.map((r) => (r.mine ? `${short(r.shares)} (${r.mine >= r.shares ? 'alle' : short(r.mine)} deine)` : short(r.shares))),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
        customdata: hover,
        hovertemplate: '%{y}<br>%{customdata[0]} im Buch, davon deine %{customdata[1]}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      barmode: 'stack',
      showlegend: false,
      bargap: 0.3,
      margin: { l: 0, r: 150, t: 0, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, range: [0, max], showspikes: false },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        type: 'category',
        showgrid: false,
        automargin: true,
        tickfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
      },
    },
  };
}
