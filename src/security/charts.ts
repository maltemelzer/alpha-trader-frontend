// Plotly figures for the securities page. Each builder gets the theme (tokens) and the width.
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { HistorizedListingDataView, PricePoint, SecurityOrderLogEntryView } from '../api/types';
import { alpha, changeText, clip, euro, short } from '../lib/format';
import { niceTicks, type DepthSide, type HolderSlice } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;

/** Bonds and repos are quoted in % of face value with four decimals, everything else in €. */
export const PERCENT_QUOTED = ['BOND', 'INTEREST_TENDER_BOND', 'REPO', 'SYSTEM_BOND', 'SYSTEM_REPO'];
const unitOf = (type?: string) =>
  PERCENT_QUOTED.includes(type ?? '') ? { suffix: ' %', fmt: ',.4f', price: (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} %` } : { suffix: ' €', fmt: ',.2f', price: (n: number) => euro(n) };

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

function bookValueLine(t: Theme, value: number | undefined) {
  if (!value || value <= 0) return { shapes: [], annotations: [] };
  const v = t.tokens;
  return {
    shapes: [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: value, y1: value, line: { color: v('text-muted'), width: 1, dash: 'dot' } },
    ],
    annotations: [
      {
        xref: 'paper', x: 0, xanchor: 'left', y: value, yanchor: 'bottom', showarrow: false,
        text: `Buchwert/Aktie ${euro(value)}`,
        font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
      },
    ],
  };
}

export function priceLine(t: Theme, _w: number, points: PricePoint[], bookValue?: number, type?: string) {
  const v = t.tokens;
  const u = unitOf(type);
  const span = points.length > 1 ? points[points.length - 1].date - points[0].date : 0;
  const intraday = span < 36 * 3_600_000;
  const up = points.length < 2 || points[points.length - 1].value >= points[0].value;
  const ref = bookValueLine(t, bookValue);
  return {
    data: [
      {
        x: points.map((p) => new Date(p.date)),
        y: points.map((p) => p.value),
        type: 'scatter', mode: 'lines', name: 'Kurs',
        line: { color: v(up ? 'gain' : 'loss'), width: 2, shape: 'hv' },
        xhoverformat: '%d.%m.%Y %H:%M',
        hovertemplate: `%{y:${u.fmt}}${u.suffix}<extra></extra>`,
      },
    ],
    layout: {
      showlegend: false,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, tickformat: intraday ? '%H:%M' : '%d.%m.' },
      yaxis: { ...t.layout.yaxis, ticksuffix: u.suffix },
      ...ref,
    },
  };
}

export function candles(t: Theme, w: number, days: HistorizedListingDataView[], bookValue?: number, type?: string) {
  const v = t.tokens;
  const u = unitOf(type);
  const ref = bookValueLine(t, bookValue);
  const text = days.map((d) => {
    const ch = d.openPrice ? ((d.closePrice! / d.openPrice - 1) * 100) : 0;
    return `Eröffnung ${u.price(d.openPrice ?? 0)}<br>Hoch ${u.price(d.highPrice ?? 0)}<br>Tief ${u.price(d.lowPrice ?? 0)}<br>Schluss ${u.price(d.closePrice ?? 0)}<br>${changeText(ch)}`;
  });
  return {
    data: [
      {
        x: days.map((d) => new Date(d.date!)),
        open: days.map((d) => d.openPrice), high: days.map((d) => d.highPrice),
        low: days.map((d) => d.lowPrice), close: days.map((d) => d.closePrice),
        type: 'candlestick', name: 'Kurs', text, hoverinfo: 'x+text',
        increasing: { line: { color: v('gain'), width: 1 }, fillcolor: v('gain') },
        decreasing: { line: { color: v('loss'), width: 1 }, fillcolor: v('loss') },
        whiskerwidth: 0,
      },
    ],
    layout: {
      showlegend: false,
      xaxis: { ...t.layout.xaxis, rangeslider: { visible: false }, tickformat: w < NARROW ? '%d.%m.' : '%d.%m.%y' },
      yaxis: { ...t.layout.yaxis, ticksuffix: u.suffix },
      ...ref,
    },
  };
}

export function depthChart(
  t: Theme,
  w: number,
  d: { bids: DepthSide; asks: DepthSide; range?: [number, number] },
  mid?: number,
  type?: string,
) {
  const v = t.tokens;
  const u = unitOf(type);
  const max = Math.max(d.bids.cumulative.at(-1) ?? 0, d.asks.cumulative.at(-1) ?? 0);
  const ticks = niceTicks(max);
  const side = (s: DepthSide, name: string, color: string, shape: 'vh' | 'hv') => ({
    x: s.price, y: s.cumulative, name, type: 'scatter', mode: 'lines',
    line: { color, width: 2, shape },
    fill: 'tozeroy', fillcolor: alpha(color, 0.16),
    customdata: s.cumulative.map(short),
    hovertemplate: `${name}: %{customdata} Stück bis %{x:${u.fmt}}${u.suffix}<extra></extra>`,
  });
  return {
    data: [side(d.bids, 'Kaufaufträge', v('chart-2'), 'vh'), side(d.asks, 'Verkaufsaufträge', v('chart-3'), 'hv')],
    layout: {
      hovermode: 'closest',
      showlegend: true,
      legend: { ...t.layout.legend, y: -0.18 },
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, showspikes: false, ticksuffix: u.suffix, ...(d.range ? { range: d.range } : {}) },
      yaxis: { ...t.layout.yaxis, tickvals: ticks, ticktext: ticks.map(short), rangemode: 'tozero' },
      shapes: mid
        ? [{ type: 'line', x0: mid, x1: mid, yref: 'paper', y0: 0, y1: 1, line: { color: v('text-muted'), width: 1, dash: 'dot' } }]
        : [],
      annotations: mid
        ? [{ x: mid, yref: 'paper', y: 1, yanchor: 'top', xanchor: 'left', showarrow: false, text: w < NARROW ? '' : ` Mitte ${u.price(mid)}`,
            font: { family: v('font-mono'), size: 11, color: v('text-secondary') } }]
        : [],
    },
  };
}

export function tradesChart(t: Theme, _w: number, trades: SecurityOrderLogEntryView[], type?: string) {
  const v = t.tokens;
  const u = unitOf(type);
  const vols = trades.map((x) => x.volume ?? 0);
  const maxVol = Math.max(1, ...vols);
  return {
    data: [
      {
        x: trades.map((x) => new Date(x.date!)),
        y: trades.map((x) => x.price),
        type: 'scatter', mode: 'markers', name: 'Trades',
        marker: {
          color: alpha(v('chart-2'), 0.55),
          line: { color: v('chart-2'), width: 1 },
          // area ∝ volume, 4–28 px diameter
          size: vols.map((x) => 4 + 24 * Math.sqrt(x / maxVol)),
        },
        customdata: trades.map((x) => [
          short(x.numberOfShares ?? 0),
          short(x.volume ?? 0),
          x.buyerSecuritiesAccountName || '–',
          x.sellerSecuritiesAccountName || '–',
          dateTime(x.date!),
        ]),
        hovertemplate:
          `%{customdata[4]}<br>%{customdata[0]} Stück zu %{y:${u.fmt}}${u.suffix}<br>Volumen %{customdata[1]} €<br>%{customdata[3]} → %{customdata[2]}<extra></extra>`,
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      xaxis: { ...t.layout.xaxis, showspikes: false, tickformat: '%d.%m. %H:%M' },
      yaxis: { ...t.layout.yaxis, ticksuffix: u.suffix },
    },
  };
}

export function holdersBars(t: Theme, w: number, slices: HolderSlice[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const rows = [...slices].reverse(); // Plotly draws the first bar at the bottom
  return {
    data: [
      {
        type: 'bar', orientation: 'h',
        y: rows.map((s) => (narrow ? clip(s.name, 14) : clip(s.name, 24))),
        x: rows.map((s) => s.percent),
        marker: { color: rows.map((s) => (s.kind === 'rest' ? v('line-strong') : v('chart-1'))), line: { color: v('bg-card'), width: 2 } },
        text: rows.map((s) => `${s.percent.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`),
        textposition: 'outside', cliponaxis: false,
        textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
        customdata: rows.map((s) => [short(s.shares), s.name]),
        hovertemplate: '%{customdata[1]}<br>%{customdata[0]} Anteile<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      bargap: 0.35,
      margin: { l: 0, r: 56, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, range: [0, Math.max(...slices.map((s) => s.percent)) * 1.05], showspikes: false },
      yaxis: {
        ...t.layout.yaxis, side: 'left', showgrid: false, automargin: true,
        tickfont: { family: v('font-sans'), size: 13, color: v('text-primary') },
      },
    },
  };
}
