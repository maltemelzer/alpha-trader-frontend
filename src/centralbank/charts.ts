// Plotly figures for the central bank page.
import type { plotlyTheme } from '../charts/plotlyTheme';
import type { InterestRateSnapshot } from '../api/queries';
import { clip, short } from '../lib/format';
import { shortAxis } from '../charts/ticks';
import { POT_SHORT, signedPct, type BankShare, type PotRow, type SupplyPoint } from './derive';

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

/**
 * Money supply of the players against its target over the last snapshots (lines, no gain/loss
 * colours), below it the bond volume sold per snapshot. Snapshots come at irregular times.
 */
export function moneySupplyChart(t: Theme, w: number, points: SupplyPoint[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const x = points.map((p) => new Date(p.date));
  const levels = points.flatMap((p) => [p.supply, p.target]);
  const maxSold = Math.max(1, ...points.map((p) => p.soldBondVolume));
  const hover = points.map((p) => [
    `${short(p.supply)} €`,
    `${short(p.target)} €`,
    signedPct(p.gapPct),
    `${short(p.soldBondVolume)} €`,
    `${p.ratePct.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`,
  ]);
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Ziel',
        x,
        y: points.map((p) => p.target),
        line: { color: v('chart-2'), width: 2, dash: 'dot' },
        marker: { size: 4, color: v('chart-2') },
        hoverinfo: 'skip',
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Geldmenge',
        x,
        y: points.map((p) => p.supply),
        line: { color: v('chart-1'), width: 3 },
        marker: { size: 5, color: v('chart-1') },
        customdata: hover,
        hovertemplate:
          '%{x|%d.%m. %H:%M}<br>Geldmenge %{customdata[0]} (%{customdata[2]} zum Ziel)<br>Ziel %{customdata[1]}<br>Anleihen verkauft %{customdata[3]} · Zins %{customdata[4]}<extra></extra>',
      },
      {
        type: 'bar',
        name: narrow ? 'Anleihen' : 'Anleihen verkauft',
        x,
        y: points.map((p) => p.soldBondVolume),
        // Snapshots come at irregular times; a fixed width (4 h) keeps close ones from turning into hairlines.
        width: points.map(() => 4 * 3_600_000),
        yaxis: 'y2',
        marker: { color: v('chart-4') },
        customdata: hover,
        hovertemplate: '%{x|%d.%m. %H:%M}<br>Anleihen verkauft %{customdata[3]}<br>Zins %{customdata[4]}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: narrow ? 10 : 11, color: v('text-secondary') } },
      margin: { l: 0, r: 0, t: 24, b: 0 },
      // One date axis at the bottom, under the bond bars; both panels share it.
      xaxis: { ...t.layout.xaxis, type: 'date', tickformat: '%d.%m.', showspikes: false, nticks: narrow ? 4 : 7, anchor: 'y2' },
      yaxis: { ...t.layout.yaxis, domain: [0.32, 1], ...shortAxis(levels, ' €') },
      yaxis2: {
        ...t.layout.yaxis,
        domain: [0, 0.22],
        range: [0, maxSold * 1.05],
        showgrid: false,
        tickvals: [maxSold],
        ticktext: [`${short(maxSold)} €`],
      },
    },
  };
}

/** Where the money is: each pot's share of all money as bars in %, the amount and accounts in the hover. */
export function potsChart(t: Theme, w: number, rows: PotRow[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const bars = [...rows].reverse();
  const pct = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: n < 1 ? 2 : 1, maximumFractionDigits: n < 1 ? 2 : 1 })} %`;
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: bars.map((r) => `${narrow ? clip(POT_SHORT[r.pot] ?? r.label, 14) : r.label} (${r.accountCount.toLocaleString('de-DE')})`),
        x: bars.map((r) => r.percent),
        marker: { color: v('chart-1'), line: { color: v('bg-card'), width: 2 } },
        text: bars.map((r) => `${pct(r.percent)} · ${short(r.cash)} €`),
        textposition: 'outside',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-primary') },
        customdata: bars.map((r) => [r.label, `${short(r.cash)} €`, r.accountCount.toLocaleString('de-DE'), r.accountCount === 1 ? 'Konto' : 'Konten']),
        hovertemplate: '%{customdata[0]}<br>%{customdata[1]} auf %{customdata[2]} %{customdata[3]}<extra></extra>',
      },
    ],
    layout: {
      hovermode: 'closest',
      showlegend: false,
      bargap: 0.3,
      margin: { l: 0, r: 144, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, range: [0, Math.max(1, ...rows.map((r) => r.percent))], showspikes: false },
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
