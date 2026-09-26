// Plotly figures for „Meine Organisation“ – performance view.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { changeShort, clip, short } from '../lib/format';
import type { PlBar } from './performance';

type Theme = ReturnType<typeof plotlyTheme>;

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±\u00a0'}${short(Math.abs(n))}\u00a0€`;

/**
 * Gains and losses as diverging horizontal bars around zero (gain/loss colours, ▲/▼ with sign
 * written at the bar); the summed-up rest bar in a neutral line colour. One category per id, so
 * equal names (buildings, repeated trades) stay apart. Bars carry their ASIN as customdata.
 */
export function plBarsChart(t: Theme, w: number, bars: PlBar[]) {
  const v = t.tokens;
  const narrow = w < 480;
  const shown = [...bars].reverse(); // Plotly draws the first bar at the bottom
  // One huge result (e.g. a company holding its own shares) would flatten all other bars: a bar
  // more than 3× the runner-up is cut to 1,4× of it; its text keeps the real amount.
  const sizes = bars.map((b) => Math.abs(b.pl)).sort((a, b) => b - a);
  const cap = sizes.length > 1 && sizes[1] > 0 && sizes[0] > sizes[1] * 3 ? sizes[1] * 1.4 : Infinity;
  const len = (b: PlBar) => Math.sign(b.pl) * Math.min(Math.abs(b.pl), cap);
  const colour = (b: PlBar) => (b.id === 'rest' ? v('line-strong') : v(b.pl >= 0 ? 'gain' : 'loss'));
  const text = (b: PlBar) => {
    const arrow = b.pl > 0 ? '▲' : b.pl < 0 ? '▼' : '';
    const pct = b.pct == null || narrow ? '' : ` · ${changeShort(b.pct).replace(/^[▲▼±]\s?/, '')}`;
    return `${arrow} ${signed(b.pl)}${pct}`.trim();
  };
  // Phone: short names without the date (it stays in the tooltip), so the amounts on both sides fit.
  const tick = (b: PlBar) => (narrow ? clip(b.label, 11) : b.date ? `${clip(b.label, 20)} · ${b.date}` : clip(b.label, 24));
  const range = plRange(
    bars.map((b) => ({ value: len(b), chars: text(b).length })),
    w - Math.max(0, ...bars.map((b) => tick(b).length)) * (narrow ? 7 : 6.5) - 16,
    narrow ? 1 / 5 : 1 / 3,
  );
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: shown.map((b) => b.id),
        x: shown.map(len),
        marker: { color: shown.map(colour) },
        text: shown.map(text),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: shown.map((b) => (b.id === 'rest' ? v('text-secondary') : colour(b))) },
        customdata: shown.map((b) => b.asin ?? ''),
        hovertext: shown.map((b) => (Math.abs(b.pl) > cap ? `${b.detail}<br>Balken gekürzt` : b.detail)),
        hovertemplate: '%{hovertext}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.3,
      margin: { l: 0, r: 8, t: 4, b: 0 },
      shapes: [{ type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1, line: { color: v('line-strong'), width: 1 } }],
      xaxis: {
        ...t.layout.xaxis,
        visible: false,
        showspikes: false,
        range,
      },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        showline: false,
        tickmode: 'array',
        tickvals: shown.map((b) => b.id),
        ticktext: shown.map(tick),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
    },
  };
}

/** Mono 11 px: about 6,8 px per character of the text written next to a bar. */
const CHAR_PX = 6.8;

/**
 * x-range for diverging bars whose text stands outside the bar: each side gets exactly the room
 * its longest bar plus text needs within `plotPx` (the width left of the category labels).
 */
export function plRange(bars: { value: number; chars: number }[], plotPx: number, minShare = 1 / 3): [number, number] {
  const pos = bars.filter((b) => b.value > 0);
  const neg = bars.filter((b) => b.value < 0);
  const maxR = Math.max(0, ...pos.map((b) => b.value));
  const maxL = Math.max(0, ...neg.map((b) => -b.value));
  const textR = Math.max(0, ...pos.map((b) => b.chars)) * CHAR_PX;
  const textL = Math.max(0, ...neg.map((b) => b.chars)) * CHAR_PX;
  const span = maxR + maxL || 1;
  // px per unit, keeping at least a share (a third) of the plot for the bars themselves
  const scale = Math.max(plotPx - textR - textL, plotPx * minShare) / span;
  const lo = maxL ? -(maxL + textL / scale) : -span * 0.02;
  const hi = maxR ? maxR + textR / scale : span * 0.02;
  return [lo, hi];
}
