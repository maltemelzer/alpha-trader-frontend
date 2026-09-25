// Plotly figures for the market page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { changeText, clip, short } from '../lib/format';
import type { Mover } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;

/** Winners and losers as horizontal bars in gain/loss, change written at the bar (GewinnerVerlierer). */
export function moversChart(t: Theme, w: number, rows: Mover[]) {
  const v = t.tokens;
  const narrow = w < 420;
  const shown = [...rows].reverse(); // Plotly draws bottom-up
  // Single moves reach thousands of percent; bars are capped at ±CAP so losers stay visible,
  // the text always shows the real change.
  const CAP = 100;
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: shown.map((r) => clip(r.name, narrow ? 14 : 24)),
        x: shown.map((r) => Math.max(-CAP, Math.min(CAP, r.change))),
        marker: { color: shown.map((r) => v(r.change >= 0 ? 'gain' : 'loss')) },
        text: shown.map((r) => changeText(r.change)),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: shown.map((r) => v(r.change >= 0 ? 'gain' : 'loss')) },
        customdata: shown.map((r) => r.asin),
        hovertemplate: `%{y} (%{customdata})<br>%{text}<extra></extra>`,
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.35,
      margin: { l: 0, r: 8, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, range: [-CAP * 1.9, CAP * 1.9] },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showline: false,
        showgrid: false,
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
    },
  };
}

/** Most active securities in the latest trades: volume bars, trade count in the hover. */
export function activityChart(t: Theme, w: number, rows: { name: string; asin: string; count: number; volume: number }[]) {
  const v = t.tokens;
  const shown = [...rows].reverse();
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: shown.map((r) => clip(r.name, w < 420 ? 14 : 24)),
        x: shown.map((r) => r.volume),
        marker: { color: v('chart-2') },
        text: shown.map((r) => `${short(r.volume)} €`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-secondary') },
        customdata: shown.map((r) => [r.asin, r.count]),
        hovertemplate: '%{y} (%{customdata[0]})<br>%{customdata[1]} Trades · %{text}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.35,
      margin: { l: 0, r: 56, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, rangemode: 'tozero' },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
    },
  };
}
