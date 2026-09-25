// Plotly figures for the market page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { changeShort, changeText, clip, euro, mix, short } from '../lib/format';
import { heatShare, tileArea, TYPE_LABEL, wrapLabel, type HeatTile, type Mover, type VolumeRow } from './derive';

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
        text: shown.map((r) => changeShort(r.change)),
        hovertext: shown.map((r) => changeText(r.change)),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: shown.map((r) => v(r.change >= 0 ? 'gain' : 'loss')) },
        customdata: shown.map((r) => r.asin),
        hovertemplate: `%{y} (%{customdata})<br>%{hovertext}<extra></extra>`,
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.35,
      margin: { l: 0, r: 8, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, range: [-CAP * 2.3, CAP * 2.3] },
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

/** Biggest 24 h volumes as bars (chart-2); one category per ASIN, so equal names (buildings) stay apart. */
export function volumeChart(t: Theme, w: number, rows: VolumeRow[], showType = false) {
  const v = t.tokens;
  const narrow = w < 420;
  const shown = [...rows].reverse();
  const label = (r: VolumeRow) => clip(r.name, narrow ? 14 : 24);
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: shown.map((r) => r.asin),
        x: shown.map((r) => r.volume),
        marker: { color: v('chart-2') },
        text: shown.map((r) => `${short(r.volume)}\u00a0€`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-secondary') },
        customdata: shown.map((r) => r.asin),
        hovertext: shown.map((r) => `${r.name}${showType && TYPE_LABEL[r.type] ? ` · ${TYPE_LABEL[r.type]}` : ''}`),
        hovertemplate: '%{hovertext} (%{customdata})<br>Umsatz 24 h: %{text}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.35,
      margin: { l: 0, r: 64, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, rangemode: 'tozero' },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        tickmode: 'array',
        tickvals: shown.map((r) => r.asin),
        ticktext: shown.map(label),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
    },
  };
}

/** Price in a hover: full euros below a million, short form above (building prices reach Mrd.). */
const priceText = (n: number) => (Math.abs(n) >= 1e6 ? `${short(n)}\u00a0€` : euro(n));

/**
 * Market heatmap (MarktHeatmap): treemap of the top 100, area by 24 h volume (fourth root),
 * colour = tint mixed with up to 42 % gain/loss by change, unchanged in bg-raised.
 * Label and change are written in the tile; tiles too small for text show them on hover/tap.
 */
export function heatmapChart(t: Theme, w: number, tiles: HeatTile[]) {
  const v = t.tokens;
  const narrow = w < 560;
  const color = (c: number | null) => {
    const share = heatShare(c);
    if (!share) return v('bg-raised');
    const up = c! > 0;
    return mix(v(up ? 'gain-tint' : 'loss-tint'), v(up ? 'gain' : 'loss'), share);
  };
  const change = (c: number | null) => (c == null ? 'neu' : changeText(c));
  return {
    data: [
      {
        type: 'treemap',
        ids: tiles.map((x) => x.asin),
        labels: tiles.map((x) => wrapLabel(x.name, narrow ? 13 : 16)),
        parents: tiles.map(() => ''),
        values: tiles.map((x) => tileArea(x.volume)),
        customdata: tiles.map((x) => [x.asin, change(x.change), priceText(x.last), `${short(x.volume)}\u00a0€`, x.name]),
        texttemplate: '%{label}<br>%{customdata[1]}',
        textposition: 'middle center',
        hovertemplate: '%{customdata[4]} (%{customdata[0]})<br>%{customdata[1]} in 24 h · %{customdata[2]}<br>Umsatz 24 h: %{customdata[3]}<extra></extra>',
        sort: true,
        tiling: { pad: 0 },
        marker: {
          colors: tiles.map((x) => color(x.change)),
          line: { color: v('bg-card'), width: 1.5 },
          pad: { t: 0, l: 0, r: 0, b: 0 },
        },
        textfont: { family: v('font-sans'), size: narrow ? 11 : 13, color: v('text-primary') },
        pathbar: { visible: false },
        root: { color: 'rgba(0,0,0,0)' },
      },
    ],
    layout: {
      margin: { l: 0, r: 0, t: 0, b: 0 },
      showlegend: false,
      hovermode: 'closest',
      uniformtext: { minsize: narrow ? 9 : 10, mode: 'hide' },
    },
  };
}
