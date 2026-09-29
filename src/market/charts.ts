// Plotly figures for the market page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { changeText, euro, mix, short } from '../lib/format';
import { heatShare, tileArea, wrapLabel, type HeatTile } from './derive';
import type { MapNode } from './screener';

type Theme = ReturnType<typeof plotlyTheme>;

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
        hovertemplate: '%{customdata[4]} (%{customdata[0]})<br>%{customdata[1]} zum Vortag · %{customdata[2]}<br>Umsatz 24 h: %{customdata[3]}<extra></extra>',
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

/**
 * Market map: every security traded in 24 h, grouped by type (buildings by size), area by volume
 * (fourth root, see `marketMap`), colour by the day's change like the heatmap. Groups carry their
 * total volume; a click on a group zooms in (Plotly), a click on a tile opens the security.
 */
export function marketMapChart(t: Theme, w: number, nodes: MapNode[]) {
  const v = t.tokens;
  const narrow = w < 560;
  const color = (n: MapNode) => {
    if (!n.asin) return v('bg-page');
    const share = heatShare(n.change);
    if (!share) return v('bg-raised');
    const up = n.change! > 0;
    return mix(v(up ? 'gain-tint' : 'loss-tint'), v(up ? 'gain' : 'loss'), share);
  };
  const change = (n: MapNode) => (n.change == null ? 'Veränderung unbekannt' : changeText(n.change));
  const money = (n: number) => `${short(n)}\u00a0€`;
  return {
    data: [
      {
        type: 'treemap',
        ids: nodes.map((n) => n.id),
        parents: nodes.map((n) => n.parent),
        labels: nodes.map((n) => (n.asin ? wrapLabel(n.label, narrow ? 13 : 16) : `${n.label} · ${money(n.volume)}`)),
        values: nodes.map((n) => n.area),
        branchvalues: 'remainder',
        customdata: nodes.map((n) => [
          n.asin,
          n.asin ? change(n) : money(n.volume),
          n.last == null ? '–' : priceText(n.last),
          money(n.volume),
          n.label,
        ]),
        texttemplate: nodes.map((n) => (n.asin ? '%{label}<br>%{customdata[1]}' : '%{label}')),
        textposition: 'middle center',
        hovertemplate: nodes.map((n) =>
          n.asin
            ? '%{customdata[4]} (%{customdata[0]})<br>%{customdata[1]} zum Vortag · %{customdata[2]}<br>Umsatz 24 h: %{customdata[3]}<extra></extra>'
            : '%{customdata[4]}<br>Umsatz 24 h: %{customdata[3]}<extra></extra>',
        ),
        sort: true,
        tiling: { pad: 0 },
        marker: {
          colors: nodes.map(color),
          line: { color: v('bg-card'), width: 1 },
          pad: { t: 20, l: 2, r: 2, b: 2 },
        },
        textfont: { family: v('font-sans'), size: narrow ? 11 : 13, color: v('text-primary') },
        pathbar: { visible: true, side: 'top', thickness: 22, textfont: { family: v('font-sans'), size: 12, color: v('text-secondary') } },
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
