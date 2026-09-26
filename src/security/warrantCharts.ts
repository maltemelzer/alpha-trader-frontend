// Plotly figures for warrants: the underlying against reference price and cap; corridors of many warrants.
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { PricePoint } from '../api/types';
import { alpha, clip, short } from '../lib/format';
import { shortAxis } from '../charts/ticks';
import { breakEven, money, payoffPoints, payout, type ScenarioLabel, type Terms } from './payoff';
import type { Corridor } from './warrants';

/**
 * Market: running warrants per underlying, puts to the left and calls to the right of the middle
 * line (neutral chart colours – a count of products, not a price move). Click opens the underlying's
 * warrant tab.
 */
export function underlyingWarrantsChart(t: Theme, w: number, rows: { asin: string; name: string; type?: string; calls: number; puts: number }[]) {
  const v = t.tokens;
  const narrow = w < 520;
  const shown = [...rows].reverse();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.calls, r.puts)));
  const bar = (key: 'calls' | 'puts', name: string, color: string, sign: 1 | -1) => ({
    type: 'bar',
    orientation: 'h',
    name,
    y: shown.map((r) => r.asin),
    x: shown.map((r) => sign * r[key]),
    marker: { color: v(color) },
    text: shown.map((r) => (r[key] ? String(r[key]) : '')),
    textposition: 'outside',
    cliponaxis: false,
    textfont: { family: v('font-mono'), size: 11, color: v('text-secondary') },
    customdata: shown.map((r) => [r.asin, r.name, r.calls, r.puts, r.type]),
    hovertemplate: '%{customdata[1]}<br>%{customdata[2]} Calls · %{customdata[3]} Puts<br><i>Klicken zeigt die Scheine</i><extra></extra>',
  });
  return {
    data: [bar('puts', 'Puts', 'chart-2', -1), bar('calls', 'Calls', 'chart-1', 1)],
    layout: {
      barmode: 'relative',
      bargap: 0.3,
      showlegend: true,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1, yanchor: 'bottom', traceorder: 'normal', font: { size: 11, color: v('text-secondary') } },
      margin: { l: 0, r: 16, t: 20, b: 0 },
      hovermode: 'closest',
      xaxis: { ...t.layout.xaxis, visible: false, range: [-max * 1.25, max * 1.25], showspikes: false },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        type: 'category',
        tickvals: shown.map((r) => r.asin),
        ticktext: shown.map((r) => clip(r.name, narrow ? 16 : 28)),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
        showgrid: false,
        showline: false,
      },
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: 0, x1: 0, y0: 0, y1: 1, line: { color: v('line-strong'), width: 1 } }],
    },
  };
}

/** Height in px the corridor chart needs for n warrants. */
export const corridorHeight = (n: number) => Math.min(60 + n * 22, 1200);

/**
 * „Welche Scheine gibt es wofür?“: each warrant as a bar from reference price to cap, in % from the
 * underlying's price now (dotted line at 0). Calls and puts in two neutral chart colours – they are
 * products, not price moves. Click opens the warrant.
 */
export function corridorChart(t: Theme, w: number, rows: Corridor[], scenario?: { pct: number; labels: Record<string, ScenarioLabel> }) {
  const v = t.tokens;
  const narrow = w < 520;
  const shown = [...rows].reverse(); // Plotly draws bottom-up
  const extra = scenario ? scenarioLayer(t, w, shown, scenario) : undefined;
  const trace = (type: 'CALL' | 'PUT', name: string, color: string) => {
    const r = shown.filter((c) => c.type === type);
    return {
      type: 'bar',
      orientation: 'h',
      name,
      y: r.map((c) => c.asin),
      base: r.map((c) => Math.min(c.strikePct, c.capPct)),
      x: r.map((c) => Math.max(Math.abs(c.capPct - c.strikePct), 0.3)),
      marker: { color: v(color) },
      customdata: r.map((c) => [c.asin, c.label, c.strikePct.toLocaleString('de-DE', { maximumFractionDigits: 1 }), c.capPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })]),
      hovertemplate: '%{customdata[1]}<br>Referenzkurs %{customdata[2]} % · Cap %{customdata[3]} %<br><i>Klicken öffnet den Schein</i><extra></extra>',
    };
  };
  return {
    data: [trace('CALL', 'Call', 'chart-1'), trace('PUT', 'Put', 'chart-2'), ...(extra?.data ?? [])],
    layout: {
      barmode: 'overlay',
      bargap: 0.35,
      showlegend: false,
      margin: { l: 0, r: 8, t: extra && Math.abs(extra.pct) > 0.05 ? 34 : 20, b: 0 },
      hovermode: 'closest',
      xaxis: { ...t.layout.xaxis, ticksuffix: ' %', zeroline: false, showspikes: false, ...(extra ? { range: extra.range } : {}) },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        type: 'category',
        categoryorder: 'array',
        categoryarray: shown.map((c) => c.asin),
        tickvals: shown.map((c) => c.asin),
        ticktext: shown.map((c) => clip(c.label, narrow ? 22 : 40)),
        tickfont: { family: v('font-sans'), size: 11, color: v('text-primary') },
        showgrid: false,
      },
      shapes: [
        { type: 'line', xref: 'x', yref: 'paper', x0: 0, x1: 0, y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dot' } },
        ...(extra?.shapes ?? []),
      ],
      annotations: [
        { xref: 'x', yref: 'paper', x: 0, y: 1, yanchor: 'bottom', xanchor: 'center', showarrow: false, text: 'Kurs jetzt', font: { size: 11, color: v('text-secondary') } },
        ...(extra?.annotations ?? []),
      ],
    },
  };
}

/**
 * The scenario on the corridor chart: a line at the assumed move and, right of each bar, what the
 * warrant pays then and the result at its ask („0,57 € · ▲ +89 %“, gain/loss coloured). The x range
 * leaves room for the labels.
 */
function scenarioLayer(t: Theme, w: number, shown: Corridor[], s: { pct: number; labels: Record<string, ScenarioLabel> }) {
  const v = t.tokens;
  const ends = shown.flatMap((c) => [c.strikePct, c.capPct]);
  const lo = Math.min(0, s.pct, ...ends);
  const hi = Math.max(0, s.pct, ...ends);
  const span = hi - lo || 1;
  const labelled = shown.filter((c) => s.labels[c.asin]);
  const longest = Math.max(0, ...labelled.map((c) => s.labels[c.asin].text.length));
  // Plot width without the category labels on the left (≈ 40 % on wide cards).
  const plotPx = Math.max(120, w * (w < 520 ? 0.55 : 0.62));
  const textPx = longest * 6.8 + 8;
  const room = textPx < plotPx * 0.7 ? (span * textPx) / (plotPx - textPx) : span * 0.6;
  const color = (sign: number) => v(sign > 0 ? 'gain' : sign < 0 ? 'loss' : 'text-secondary');
  // Results as a right-aligned column at the edge, clear of bars and lines.
  const results = labelled.map((c) => ({
    xref: 'paper', yref: 'y', x: 1, y: c.asin, xanchor: 'right', showarrow: false, text: s.labels[c.asin].text,
    font: { family: v('font-mono'), size: 11, color: color(s.labels[c.asin].sign) }, bgcolor: v('bg-card'),
  }));
  const moved = Math.abs(s.pct) > 0.05;
  const pctText = `${s.pct > 0 ? '+' : '−'}${Math.abs(s.pct).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
  return {
    pct: s.pct,
    data: [] as Record<string, unknown>[],
    range: [lo - span * 0.04, hi + room + span * 0.06],
    shapes: moved ? [{ type: 'line', xref: 'x', yref: 'paper', x0: s.pct, x1: s.pct, y0: 0, y1: 1, line: { color: v('text-primary'), width: 1.5 } }] : [],
    annotations: [
      ...(moved
        ? [{ xref: 'x', yref: 'paper', x: s.pct, y: 1, yanchor: 'bottom', yshift: 14, xanchor: 'center', showarrow: false, text: `Wenn ${pctText}`, font: { size: 11, color: v('text-primary') } }]
        : []),
      ...results,
    ],
  };
}

type Theme = ReturnType<typeof plotlyTheme>;

const num = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });

/**
 * „Wo steht der Basiswert?“: its price over the last days as a line, the reference price (strike)
 * and the cap as horizontal lines with the corridor between them shaded, the end of the warrant as a
 * dotted vertical line. Only facts from the API – no modelled payout.
 */
export function warrantChart(
  t: Theme,
  w: number,
  prices: PricePoint[],
  strike: number | undefined,
  cap: number | undefined,
  end: number | undefined,
  name: string,
) {
  const v = t.tokens;
  const narrow = w < 520;
  const levels = [strike, cap].filter((x): x is number => x != null && x > 0);
  const values = [...prices.map((p) => p.value), ...levels];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || hi * 0.1 || 1) * 0.15;
  const first = prices[0]?.date ?? Date.now();
  const last = Math.max(end ?? 0, prices[prices.length - 1]?.date ?? first);
  const hline = (y: number, color: string, dash: string) => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: y, y1: y, line: { color: v(color), width: 1, dash } });
  // The higher line is labelled above, the lower one below – strike and cap are often close.
  const top = Math.max(...levels);
  const label = (y: number, text: string) => ({
    xref: 'paper', x: 0, y, xanchor: 'left', yanchor: y === top ? 'bottom' : 'top', showarrow: false, text,
    font: { family: v('font-mono'), size: 11, color: v('text-secondary') }, bgcolor: v('bg-card'),
  });
  const shapes: Record<string, unknown>[] = [];
  const annotations: Record<string, unknown>[] = [];
  if (strike && cap) {
    shapes.push({ type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: Math.min(strike, cap), y1: Math.max(strike, cap), fillcolor: alpha(v('chart-1'), 0.12), line: { width: 0 }, layer: 'below' });
  }
  if (strike) {
    shapes.push(hline(strike, 'text-secondary', 'solid'));
    annotations.push(label(strike, `Referenzkurs ${num(strike)}`));
  }
  if (cap) {
    shapes.push(hline(cap, 'text-muted', 'dash'));
    annotations.push(label(cap, `Cap ${num(cap)}`));
  }
  if (end) {
    shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: new Date(end), x1: new Date(end), y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dot' } });
    annotations.push({ xref: 'x', yref: 'paper', x: new Date(end), y: 1, xanchor: 'right', yanchor: 'top', showarrow: false, text: 'Fällig', font: { family: v('font-sans'), size: 11, color: v('text-secondary') } });
  }
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        name,
        x: prices.map((p) => new Date(p.date)),
        y: prices.map((p) => p.value),
        line: { color: v('chart-2'), width: 2, shape: 'hv' },
        xhoverformat: '%d.%m. %H:%M',
        hovertemplate: `${name}: %{y:,.2f}<extra></extra>`,
      },
    ],
    layout: {
      showlegend: false,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      hovermode: 'x unified',
      xaxis: { ...t.layout.xaxis, range: [new Date(first), new Date(last + (last - first) * 0.03)], tickformat: narrow ? '%d.%m.' : '%d.%m. %H:%M' },
      yaxis: { ...t.layout.yaxis, side: 'left', range: [lo - pad, hi + pad], tickformat: ',.2f' },
      shapes,
      annotations,
    },
  };
}

// ---------- „Wenn … dann …“: payoff at maturity ----------

export interface PayoffInput {
  terms: Terms;
  /** Price paid per warrant (ask or limit) – draws the price line and the gain/loss areas */
  price?: number;
  /** Underlying price now */
  spot?: number;
  /** Underlying price of the scenario – marked on the curve */
  scenario?: number;
  range: [number, number];
  /** Remaining time as text for the „jetzt“ marker, e.g. „noch 14 Std.“ */
  remaining?: string;
}

/** Underlying price for chart labels: „71,32“, „1.793,28“, „0,0412“, „127,8 Mio.“ */
const axisNum = (n: number) =>
  Math.abs(n) >= 1e6 ? short(n) : n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(n) >= 0.1 ? 2 : 4 });

/**
 * Payout per warrant over the underlying's price at maturity (x): the payout line, the price paid as
 * a dashed line, the area between them green where it pays more than it cost and red where less,
 * vertical markers for strike, cap, break-even and the price now, the scenario as a point. Click on
 * the curve → `customdata[0]` = underlying price.
 */
export function payoffChart(t: Theme, w: number, p: PayoffInput) {
  const v = t.tokens;
  const narrow = w < 520;
  const { terms, price, spot, scenario, range } = p;
  const pts = payoffPoints(terms, range[0], range[1], narrow ? 80 : 160);
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const max = Math.max(...ys, 0);
  const hasPrice = price != null && price > 0;
  // A price far above every payout (a limit typed by mistake) would flatten the curve: then the axis
  // ends above the payout and the price is named at the top edge instead.
  const priceAbove = hasPrice && max > 0 && price > max * 3;
  // The payout is the full value of the underlying: over the shown range it moves only a few percent
  // around the price, so the axis zooms onto payout and price instead of starting at 0.
  const shownYs = priceAbove || !hasPrice ? ys : [...ys, price];
  const yHi = Math.max(...shownYs, 0);
  const yLo = Math.min(...shownYs);
  const pad = (yHi - yLo) * 0.15 || yHi * 0.1 || 1;
  const top = priceAbove ? max * 1.6 : yHi + pad;
  const bottom = priceAbove ? 0 : Math.max(0, yLo - pad);
  const small = top < 0.5;
  const data: Record<string, unknown>[] = [];
  if (hasPrice) {
    // Areas between the price line and the payout: two filled traces each (tonexty fills to the previous one).
    const flat = xs.map(() => price);
    const area = (y: number[], color: string) => [
      { type: 'scatter', mode: 'lines', x: xs, y: flat, line: { width: 0 }, hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', mode: 'lines', x: xs, y, line: { width: 0 }, fill: 'tonexty', fillcolor: alpha(v(color), 0.22), hoverinfo: 'skip', showlegend: false },
    ];
    data.push(...area(ys.map((y) => Math.max(y, price)), 'gain'), ...area(ys.map((y) => Math.min(y, price)), 'loss'));
  }
  data.push({
    type: 'scatter',
    mode: 'lines',
    name: 'Auszahlung',
    x: xs,
    y: ys,
    line: { color: v('chart-1'), width: 2.5 },
    customdata: pts.map((q) => {
      const pl = hasPrice ? (q.y / price - 1) * 100 : undefined;
      const plText = pl == null ? '' : `<br>${pl > 0.005 ? '▲ +' : pl < -0.005 ? '▼ −' : '± '}${Math.abs(pl).toLocaleString('de-DE', { maximumFractionDigits: 0 })} % zum Preis`;
      return [q.x, `${axisNum(q.x)} €`, money(q.y), plText];
    }),
    hovertemplate: 'Basiswert am Ende %{customdata[1]}<br>Auszahlung <b>%{customdata[2]}</b> je Schein%{customdata[3]}<extra></extra>',
  });
  if (scenario != null && Number.isFinite(scenario)) {
    const y = payout(terms, scenario);
    const nearRight = (scenario - range[0]) / (range[1] - range[0]) > 0.85;
    data.push({
      type: 'scatter',
      mode: 'markers+text',
      x: [scenario],
      y: [y],
      text: [money(y)],
      textposition: nearRight ? 'top left' : 'top center',
      textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
      marker: { size: 12, color: v('text-primary'), line: { color: v('bg-card'), width: 2 } },
      hoverinfo: 'skip',
      cliponaxis: false,
    });
  }

  // Vertical markers with labels above the plot, staggered in rows when they would touch.
  const call = terms.type === 'CALL';
  const be = breakEven(terms, price);
  const marks: { x: number; text: string; color: string; dash: string; width?: number }[] = [
    { x: terms.strike, text: `${narrow ? 'Ref.' : 'Referenzkurs'} ${axisNum(terms.strike)}`, color: 'text-muted', dash: 'dash' },
  ];
  if (terms.cap != null) marks.push({ x: terms.cap, text: `Cap ${axisNum(terms.cap)}`, color: 'text-muted', dash: 'dash' });
  if (be != null && be > range[0] && be < range[1])
    marks.push({ x: be, text: `${narrow ? 'Schwelle' : 'Gewinnschwelle'} ${axisNum(be)}`, color: 'text-primary', dash: 'dot' });
  if (spot) marks.push({ x: spot, text: `jetzt ${axisNum(spot)}${p.remaining && !narrow ? ` · ${p.remaining}` : ''}`, color: 'text-secondary', dash: 'solid', width: 1.5 });
  const plotW = Math.max(120, w - 60);
  const px = (x: number) => ((x - range[0]) / (range[1] - range[0])) * plotW;
  const rows: number[] = []; // right edge (px) of the last label per row
  const annotations: Record<string, unknown>[] = [];
  const shapes: Record<string, unknown>[] = [];
  for (const m of [...marks].sort((a, b) => a.x - b.x)) {
    const width = m.text.length * 6.6 + 8;
    const left = px(m.x) - width / 2;
    let row = rows.findIndex((r) => r < left);
    if (row < 0) row = rows.length;
    rows[row] = left + width;
    shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: m.x, x1: m.x, y0: 0, y1: 1, line: { color: v(m.color), width: m.width ?? 1, dash: m.dash } });
    annotations.push({
      xref: 'x', yref: 'paper', x: m.x, y: 1, yanchor: 'bottom', yshift: row * 15, showarrow: false, text: m.text,
      font: { family: v('font-mono'), size: 11, color: v(m.color === 'text-muted' ? 'text-secondary' : m.color) },
    });
  }
  if (priceAbove) {
    annotations.push({
      xref: 'paper', yref: 'paper', x: call ? 0.01 : 0.99, xanchor: call ? 'left' : 'right', y: 0.98, yanchor: 'top', showarrow: false,
      text: `▲ Preis ${money(price)}${narrow ? '' : ' – weit über jeder Auszahlung'}`, font: { family: v('font-mono'), size: 11, color: v('text-primary') }, bgcolor: v('bg-card'),
    });
  } else if (hasPrice) {
    shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: price, y1: price, line: { color: v('text-secondary'), width: 1, dash: 'dash' } });
    annotations.push({
      xref: 'paper', yref: 'y', x: call ? 0 : 1, xanchor: call ? 'left' : 'right', y: price, yanchor: 'bottom', showarrow: false,
      text: `Preis ${money(price)}`, font: { family: v('font-mono'), size: 11, color: v('text-secondary') }, bgcolor: v('bg-card'),
    });
  }
  const xAxisShort = shortAxis(range, ' €');
  return {
    data,
    layout: {
      showlegend: false,
      margin: { l: 0, r: 8, t: 6 + Math.max(1, rows.length) * 15, b: 0 },
      hovermode: 'closest',
      xaxis: { ...t.layout.xaxis, range, showspikes: false, ...xAxisShort, tickformat: xAxisShort.tickvals ? undefined : ',.2f' },
      yaxis: { ...t.layout.yaxis, side: 'left', range: [bottom, top], ticksuffix: ' €', tickformat: small ? ',.4f' : ',.2f', nticks: 5 },
      shapes,
      annotations,
    },
  };
}
