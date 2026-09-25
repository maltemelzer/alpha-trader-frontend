// Plotly figures for warrants: the underlying against reference price and cap; corridors of many warrants.
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { PricePoint } from '../api/types';
import { alpha, clip } from '../lib/format';
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
export function corridorChart(t: Theme, w: number, rows: Corridor[]) {
  const v = t.tokens;
  const narrow = w < 520;
  const shown = [...rows].reverse(); // Plotly draws bottom-up
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
    data: [trace('CALL', 'Call', 'chart-1'), trace('PUT', 'Put', 'chart-2')],
    layout: {
      barmode: 'overlay',
      bargap: 0.35,
      showlegend: false,
      margin: { l: 0, r: 8, t: 20, b: 0 },
      hovermode: 'closest',
      xaxis: { ...t.layout.xaxis, ticksuffix: ' %', zeroline: false, showspikes: false },
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
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: 0, x1: 0, y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dot' } }],
      annotations: [
        { xref: 'x', yref: 'paper', x: 0, y: 1, yanchor: 'bottom', xanchor: 'center', showarrow: false, text: 'Kurs jetzt', font: { size: 11, color: v('text-secondary') } },
      ],
    },
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
