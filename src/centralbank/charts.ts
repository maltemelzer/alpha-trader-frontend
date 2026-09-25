// Plotly figures for the central bank page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { InterestRateSnapshot } from '../api/queries';
import { clip, short } from '../lib/format';
import type { BankShare } from './derive';

type Theme = ReturnType<typeof plotlyTheme>;
const NARROW = 520;

const pct = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const SERIES: { key: keyof InterestRateSnapshot; name: string; short: string; color: string; width: number }[] = [
  { key: 'systemBondInterestRate', name: 'Systemanleihe', short: 'Systemanl.', color: 'chart-2', width: 2 },
  { key: 'mainInterestRate', name: 'Leitzins', short: 'Leitzins', color: 'chart-1', width: 3 },
  { key: 'reserveInterestRate', name: 'Einlagezins / Tag', short: 'Einlage', color: 'chart-4', width: 2 },
];

/**
 * Main rate, system bond rate and reserve rate over time as step lines (they are set, not traded).
 * Line ends are labelled, so the axis moves to the left (diagram rule 12). No gain/loss colours:
 * a rising rate is not a price move.
 */
export function rateHistoryChart(t: Theme, w: number, points: InterestRateSnapshot[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const x = points.map((p) => new Date(p.date));
  const last = points[points.length - 1];
  const days = points.length > 1 ? (points[points.length - 1].date - points[0].date) / 86_400_000 : 0;
  return {
    data: SERIES.map((s) => ({
      type: 'scatter',
      mode: 'lines',
      name: s.name,
      x,
      y: points.map((p) => p[s.key] ?? null),
      line: { color: v(s.color), width: s.width, shape: 'hv' },
      hovertemplate: `${s.name} %{y:.2f} %<extra></extra>`,
    })),
    layout: {
      showlegend: narrow,
      margin: { l: 0, r: narrow ? 0 : 128, t: 8, b: narrow ? 32 : 0 },
      xaxis: { ...t.layout.xaxis, tickformat: days < 3 ? '%d.%m. %H:%M' : '%d.%m.', range: x.length ? [x[0], x[x.length - 1]] : undefined },
      yaxis: { ...t.layout.yaxis, side: 'left', ticksuffix: ' %', rangemode: 'tozero', zeroline: true, zerolinecolor: v('line-strong') },
      annotations:
        narrow || !last
          ? []
          : SERIES.filter((s) => last[s.key] != null).map((s) => ({
              x: new Date(last.date),
              y: last[s.key],
              xanchor: 'left',
              xshift: 6,
              showarrow: false,
              text: `${s.short} ${pct(last[s.key] as number)}`,
              font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
            })),
    },
  };
}

/** Who holds the central bank reserves: the largest banks as bars in %, the rest in line-strong. */
export function bankSharesChart(t: Theme, w: number, rows: BankShare[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const bars = [...rows].reverse(); // Plotly draws the first bar at the bottom
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: bars.map((r) => clip(r.name, narrow ? 14 : 22)),
        x: bars.map((r) => r.percent),
        marker: { color: bars.map((r) => v(r.rest ? 'line-strong' : 'chart-1')), line: { color: v('bg-card'), width: 2 } },
        text: bars.map((r) => `${r.percent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
        customdata: bars.map((r) => [r.name, `${short(r.reserves)} €`, r.asin ?? '']),
        hovertemplate: '%{customdata[0]}<br>Einlage %{customdata[1]}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      bargap: 0.3,
      margin: { l: 0, r: 56, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, range: [0, Math.max(1, ...rows.map((r) => r.percent)) * 1.05], showspikes: false },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        automargin: true,
        tickfont: { family: v('font-sans'), size: 13, color: v('text-primary') },
      },
    },
  };
}

/** Central bank credit falling due: system bond volume per day of maturity. */
export function dueChart(t: Theme, _w: number, days: { day: number; volume: number; count: number }[]) {
  const v = t.tokens;
  const max = Math.max(1, ...days.map((d) => d.volume));
  return {
    data: [
      {
        type: 'bar',
        x: days.map((d) => new Date(d.day)),
        y: days.map((d) => d.volume),
        marker: { color: v('chart-2'), line: { color: v('bg-card'), width: 2 } },
        customdata: days.map((d) => [`${short(d.volume)} €`, d.count]),
        hovertemplate: '%{x|%d.%m.}: %{customdata[0]} in %{customdata[1]} Systemanleihen<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      bargap: 0.3,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, tickformat: '%d.%m.', showspikes: false },
      yaxis: { ...t.layout.yaxis, tickvals: [0, max / 2, max], ticktext: ['0', short(max / 2), short(max)], rangemode: 'tozero' },
    },
  };
}

/** Bids on the interest tender: volume per bid, the bid read as rate (98 % ≙ +2 %, 102 % ≙ −2 %). */
export function tenderBidsChart(t: Theme, _w: number, bids: { rate: number; price: number; size: number }[]) {
  const v = t.tokens;
  const sorted = [...bids].sort((a, b) => b.rate - a.rate);
  const max = Math.max(1, ...sorted.map((b) => b.size));
  return {
    data: [
      {
        type: 'bar',
        x: sorted.map((b) => `${b.rate > 0 ? '+' : b.rate < 0 ? '−' : ''}${Math.abs(b.rate).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`),
        y: sorted.map((b) => b.size),
        marker: { color: v('chart-2'), line: { color: v('bg-card'), width: 2 } },
        text: sorted.map((b) => short(b.size)),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 12, color: v('text-primary') },
        customdata: sorted.map((b) => b.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
        hovertemplate: 'Gebot %{customdata} % ≙ Zins %{x}<br>Volumen %{text}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      bargap: 0.45,
      margin: { l: 0, r: 0, t: 20, b: 0 },
      xaxis: { ...t.layout.xaxis, type: 'category', showspikes: false },
      yaxis: { ...t.layout.yaxis, visible: false, range: [0, max * 1.2] },
    },
  };
}
