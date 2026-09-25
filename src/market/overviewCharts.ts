// Plotly figures for the class overviews above the market list (see overview.ts for the data).
import type { plotlyTheme } from '../charts/plotlyTheme';
import { rangeTicks } from '../charts/ticks';
import { changeShort, clip, euro, ratePct, short } from '../lib/format';
import { CHANGE_CLIP, clusterLog, type BondDot, type Cluster, type ClassRow, type Close, type EtfPair, type IndexBar, type MoverDot, type RepoDot } from './overview';

type Theme = ReturnType<typeof plotlyTheme>;

const DAY = 86_400_000;
const NB = String.fromCharCode(0xa0);
const NARROW = 520;
const de = (n: number) => n.toLocaleString('de-DE');
const CLICK = '<br><i>Klicken öffnet das Wertpapier</i>';

/** Price in a hover: full euros below a million, short form above. */
const priceText = (n: number) => (Math.abs(n) >= 1e6 ? `${short(n)}${NB}€` : euro(n));
const signedPct = (n: number, d = 0) => {
  const s = Math.abs(n).toLocaleString('de-DE', { maximumFractionDigits: d });
  return n > 0 ? `+${s}${NB}%` : n < 0 ? `−${s}${NB}%` : `0${NB}%`;
};
const pp = (n: number) => {
  const s = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return s === '0,0' ? `±${NB}0,0${NB}Pp.` : `${n > 0 ? '+' : '−'}${s}${NB}Pp.`;
};
const dayDate = (ms: number) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/** Powers of ten between lo and hi (log10 exponents), thinned to at most `max` ticks. */
function decades(lo: number, hi: number, max = 6): number[] {
  const out: number[] = [];
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) out.push(10 ** e);
  const step = Math.ceil(out.length / max);
  return step > 1 ? out.filter((_, i) => i % step === 0) : out;
}

/** Ticks on a log axis: 1–2–5 steps over a short range, decades over a long one. */
function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) for (const m of [1, 2, 5]) out.push(m * 10 ** e);
  const inside = out.filter((x) => Math.log10(x) >= lo && Math.log10(x) <= hi);
  return inside.length > 7 ? decades(lo, hi) : inside;
}

const pctTick = (x: number) => `${x.toLocaleString('de-DE', { maximumFractionDigits: 3 })}${NB}%`;

/** „×310“ beside clusters of five and more, so a big dot reads as many bonds, not one. */
function countLabels<T>(t: Theme, clusters: Cluster<T>[], x: (d: T) => number, y: (d: T) => number, base: number) {
  return clusters
    .filter((c) => c.count >= 5 && x(c.lead) > 0 && y(c.lead) > 0)
    .map((c) => ({
      x: Math.log10(x(c.lead)),
      y: Math.log10(y(c.lead)),
      xanchor: 'left',
      yanchor: 'bottom',
      // above-right of the dot: its neighbours on the same line stay readable
      xshift: clusterSize(base, c.count) / 2 - 2,
      yshift: clusterSize(base, c.count) / 2 - 4,
      showarrow: false,
      text: `×${c.count.toLocaleString('de-DE')}`,
      font: { family: t.tokens('font-mono'), size: 11, color: t.tokens('text-secondary') },
    }));
}

/** Marker size of a cluster: grows with the square root of its count. */
const clusterSize = (base: number, count: number) => Math.min(30, base + 3.2 * Math.sqrt(count - 1));

/** Log range with a little room around the positive values. */
function logRange(values: number[], pad = 0.15, fallback: [number, number] = [-1, 1]): [number, number] {
  const pos = values.filter((x) => x > 0 && Number.isFinite(x));
  if (!pos.length) return fallback;
  const lo = Math.log10(Math.min(...pos));
  const hi = Math.log10(Math.max(...pos));
  return hi - lo < 0.5 ? [lo - 0.5, hi + 0.5] : [lo - pad, hi + pad];
}

/** Time left on a log axis in days: ticks at 10 min, 1 h, 6 h, 1 day, 7 days, 30 days (within the range). */
function timeAxis(t: Theme, range: [number, number]) {
  const marks: [number, string][] = [
    [10 / 1440, `10${NB}Min.`],
    [1 / 24, `1${NB}Std.`],
    [6 / 24, `6${NB}Std.`],
    [1, `1${NB}T`],
    [7, `7${NB}T`],
    [30, `30${NB}T`],
  ];
  const shown = marks.filter(([d]) => Math.log10(d) >= range[0] && Math.log10(d) <= range[1]);
  return {
    ...t.layout.xaxis,
    type: 'log',
    range,
    showspikes: false,
    zeroline: false,
    tickvals: shown.map(([d]) => d),
    ticktext: shown.map(([, l]) => l),
    title: { text: 'Restlaufzeit', font: { size: 11, color: t.tokens('text-muted') }, standoff: 4 },
  };
}

const legend = (t: Theme) => ({
  orientation: 'h',
  x: 1,
  xanchor: 'right',
  y: 1,
  yanchor: 'bottom',
  font: { size: 11, color: t.tokens('text-secondary') },
});

const note = (t: Theme, text: string, x: number, y: number, xanchor: 'left' | 'right' = 'left', extra: Record<string, unknown> = {}) => ({
  x,
  y,
  xanchor,
  yanchor: 'bottom',
  showarrow: false,
  text,
  font: { family: t.tokens('font-mono'), size: 11, color: t.tokens('text-secondary') },
  ...extra,
});

// ---------- Shares ----------

/**
 * „Wo bewegt sich was?“: every share traded in 24 h as a dot – turnover (log) against change to the
 * previous day, area by number of trades, gain/loss colour (a price move), unchanged in muted.
 * Changes beyond ±50 % sit on the edge as triangles. The three biggest turnovers carry their name.
 */
export function moversChart(t: Theme, w: number, dots: MoverDot[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const maxTrades = Math.max(1, ...dots.map((d) => d.trades));
  const size = (d: MoverDot) => 5 + (narrow ? 8 : 12) * Math.sqrt(d.trades / maxTrades);
  const at = (c: number) => Math.max(-CHANGE_CLIP, Math.min(CHANGE_CLIP, c));
  const span = Math.max(2, ...dots.map((d) => Math.abs(at(d.change)))) * 1.15;
  const xr = logRange(dots.map((d) => d.volume), 0.2, [0, 6]);
  const hover = (d: MoverDot) =>
    `${d.name}<br>${changeShort(d.change)} zum Vortag${d.last != null ? ` · ${priceText(d.last)}` : ''}<br>Umsatz 24 h ${short(d.volume)}${NB}€${d.trades ? ` · ${d.trades.toLocaleString('de-DE')} Trades` : ''}${CLICK}`;
  const trace = (name: string, own: MoverDot[], color: string, up: boolean | null) => ({
    type: 'scatter',
    mode: 'markers',
    name,
    x: own.map((d) => d.volume),
    y: own.map((d) => at(d.change)),
    marker: {
      color,
      size: own.map(size),
      opacity: 0.8,
      line: { width: 0 },
      symbol: own.map((d) => (Math.abs(d.change) > CHANGE_CLIP ? (up ? 'triangle-up' : 'triangle-down') : 'circle')),
    },
    text: own.map(hover),
    hovertemplate: '%{text}<extra></extra>',
    customdata: own.map((d) => d.asin),
  });
  const up = dots.filter((d) => d.change > 0.005);
  const down = dots.filter((d) => d.change < -0.005);
  const flat = dots.filter((d) => Math.abs(d.change) <= 0.005);
  // Names for the biggest turnovers – skipping one that would sit on a label already placed.
  const top: MoverDot[] = [];
  for (const d of [...dots].sort((a, b) => b.volume - a.volume)) {
    if (top.length >= (narrow ? 2 : 3)) break;
    const near = top.some((o) => Math.abs(Math.log10(o.volume) - Math.log10(d.volume)) < (xr[1] - xr[0]) * 0.25 && Math.abs(at(o.change) - at(d.change)) < span * 0.25);
    if (!near) top.push(d);
  }
  const xTicks = decades(xr[0], xr[1], narrow ? 4 : 7);
  const yTicks = rangeTicks(-span, span, narrow ? 4 : 6).filter((x) => Math.abs(x) <= span);
  return {
    data: [trace('Unverändert', flat, v('text-muted'), null), trace('Gestiegen', up, v('gain'), true), trace('Gefallen', down, v('loss'), false)],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: 6, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        type: 'log',
        range: xr,
        showspikes: false,
        tickvals: xTicks,
        ticktext: xTicks.map((x) => `${short(x)}${NB}€`),
        title: { text: 'Umsatz 24 h', font: { size: 11, color: v('text-muted') }, standoff: 4 },
      },
      yaxis: {
        ...t.layout.yaxis,
        range: [-span, span],
        showspikes: false,
        zeroline: false,
        tickvals: yTicks,
        ticktext: yTicks.map((x) => signedPct(x)),
      },
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: v('line-strong'), width: 1 } }],
      annotations: top.map((d) =>
        note(t, clip(d.name, narrow ? 12 : 20), Math.log10(d.volume), at(d.change), 'right', { xshift: -size(d) / 2 - 2, yanchor: 'middle', font: { family: v('font-sans'), size: 11, color: v('text-secondary') } }),
      ),
    },
  };
}

// ---------- Bonds ----------

/**
 * „Wo gibt es Rendite?“: each running bond with an ask – yield per day (log) against time left (log).
 * Player bonds and system bonds in two category colours, the reserve rate per day as a dotted line,
 * the median as a thin line. Yields ≤ 0 (ask above the payout) sit on the lower edge as triangles.
 */
export function bondChart(t: Theme, w: number, dots: BondDot[], reserve: number | undefined, med: number | undefined) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const xr = logRange(dots.map((d) => d.left / DAY), 0.15, [-1, 1.5]);
  const yr = logRange([...dots.map((d) => d.perDay), ...(reserve ? [reserve] : [])], 0.2, [-2, 1]);
  const edge = 10 ** (yr[0] + 0.05);
  const hover = ({ lead: d, count }: Cluster<BondDot>) =>
    `${count > 1 ? `${de(count)} Anleihen, die beste:<br>` : ''}${d.name}<br>${ratePct(d.perDay)} pro Tag zum Brief · fällig in ${spanText(d.left)}${d.rate != null ? `<br>Zins bis Fälligkeit ${d.rate.toLocaleString('de-DE', { maximumFractionDigits: 4 })}${NB}%` : ''}${CLICK}`;
  const trace = (name: string, own: Cluster<BondDot>[], color: string) => ({
    type: 'scatter',
    mode: 'markers',
    name,
    x: own.map((c) => c.lead.left / DAY),
    y: own.map((c) => (c.lead.perDay > 0 ? c.lead.perDay : edge)),
    marker: {
      color,
      size: own.map((c) => clusterSize(narrow ? 7 : 8, c.count)),
      opacity: 0.75,
      line: { width: 0 },
      symbol: own.map((c) => (c.lead.perDay > 0 ? 'circle' : 'triangle-down')),
    },
    text: own.map(hover),
    hovertemplate: '%{text}<extra></extra>',
    customdata: own.map((c) => c.lead.asin),
  });
  // Best yield first, so each cluster opens its best bond.
  const clusters = clusterLog(
    [...dots].sort((a, b) => b.perDay - a.perDay),
    (d) => d.left,
    (d) => d.perDay,
    (d) => (d.system ? 's' : 'p'),
  );
  const player = clusters.filter((c) => !c.lead.system);
  const system = clusters.filter((c) => c.lead.system);
  const lines: Record<string, unknown>[] = [];
  const labels: Record<string, unknown>[] = [];
  if (reserve && reserve > 0) {
    lines.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: reserve, y1: reserve, line: { color: v('text-secondary'), width: 1, dash: 'dot' } });
    labels.push(note(t, `Einlagezins ${ratePct(reserve)}/Tag`, 0, Math.log10(reserve), 'left', { xref: 'paper' }));
  }
  if (med && med > 0) {
    lines.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: med, y1: med, line: { color: v('line-strong'), width: 1 } });
    labels.push(note(t, `Median ${ratePct(med)}`, 1, Math.log10(med), 'right', { xref: 'paper' }));
  }
  const ticks = logTicks(...yr);
  return {
    data: [trace('Anleihen', player, v('chart-2')), trace('Systemanleihen', system, v('chart-3'))].filter((d) => d.x.length),
    layout: {
      showlegend: !narrow,
      legend: legend(t),
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: narrow ? 6 : 22, b: 0 },
      xaxis: timeAxis(t, xr),
      yaxis: { ...t.layout.yaxis, type: 'log', range: yr, showspikes: false, tickvals: ticks, ticktext: ticks.map(pctTick) },
      shapes: lines,
      annotations: [...labels, ...countLabels(t, clusters, (d) => d.left / DAY, (d) => d.perDay, narrow ? 7 : 8)],
    },
  };
}

function spanText(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}${NB}Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}${NB}Std.`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}${NB}T ${h % 24}${NB}Std.` : `${d}${NB}T`;
}

/**
 * „Welcher Zins für welche Laufzeit?“: each running repo – the rate of its bond until maturity against
 * the time left, both log. The dotted line is the reserve rate paid for the same days (rate per day ×
 * days): repos above it pay more per day than the central bank deposit.
 */
export function repoChart(t: Theme, w: number, dots: RepoDot[], reserve: number | undefined) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const xr = logRange(dots.map((d) => d.left / DAY), 0.15, [-1, 1.5]);
  const yr = logRange(dots.map((d) => d.rate), 0.2, [-1, 1]);
  const edge = 10 ** (yr[0] + 0.05);
  const hover = ({ lead: d, count }: Cluster<RepoDot>) =>
    `${count > 1 ? `${de(count)} Repos, z. B.<br>` : ''}${d.name}<br>Zins bis Fälligkeit ${d.rate.toLocaleString('de-DE', { maximumFractionDigits: 4 })}${NB}% · fällig in ${spanText(d.left)}${d.issuer ? `<br>${d.issuer}` : ''}${CLICK}`;
  const trace = (name: string, own: Cluster<RepoDot>[], color: string) => ({
    type: 'scatter',
    mode: 'markers',
    name,
    x: own.map((c) => c.lead.left / DAY),
    y: own.map((c) => (c.lead.rate > 0 ? c.lead.rate : edge)),
    marker: {
      color,
      size: own.map((c) => clusterSize(narrow ? 7 : 8, c.count)),
      opacity: 0.75,
      line: { width: 0 },
      symbol: own.map((c) => (c.lead.rate > 0 ? 'circle' : 'triangle-down')),
    },
    text: own.map(hover),
    hovertemplate: '%{text}<extra></extra>',
    customdata: own.map((c) => c.lead.asin),
  });
  const clusters = clusterLog(
    dots,
    (d) => d.left,
    (d) => d.rate,
    (d) => (d.system ? 's' : 'p'),
  );
  const data: Record<string, unknown>[] = [
    trace('Repos', clusters.filter((c) => !c.lead.system), v('chart-2')),
    trace('System-Repos', clusters.filter((c) => c.lead.system), v('chart-3')),
  ].filter((d) => (d.x as number[]).length);
  const annotations: Record<string, unknown>[] = [];
  if (reserve && reserve > 0) {
    // rate = reserve × days: a straight line on log–log axes, drawn over the whole x range.
    const xs = [10 ** xr[0], 10 ** xr[1]];
    data.unshift({
      type: 'scatter',
      mode: 'lines',
      x: xs,
      y: xs.map((d) => reserve * d),
      line: { color: v('text-secondary'), width: 1, dash: 'dot' },
      hoverinfo: 'skip',
      // Named in the legend – a label on the line would sit on the dots.
      name: `Einlagezins ${ratePct(reserve)}/Tag × Laufzeit`,
    });
  }
  annotations.push(...countLabels(t, clusters, (d) => d.left / DAY, (d) => d.rate, narrow ? 7 : 8));
  const shown = logTicks(...yr);
  return {
    data,
    layout: {
      showlegend: !narrow,
      legend: legend(t),
      hovermode: 'closest',
      margin: { l: 0, r: 0, t: narrow ? 6 : 22, b: 0 },
      xaxis: timeAxis(t, xr),
      yaxis: { ...t.layout.yaxis, type: 'log', range: yr, showspikes: false, tickvals: shown, ticktext: shown.map(pctTick) },
      annotations,
    },
  };
}

// ---------- Coins ----------

export interface CoinSeries {
  asin: string;
  name: string;
  points: Close[];
}

/**
 * „Wie läuft der Coin?“ One coin: daily closes as a line (gain/loss by the direction over the window)
 * over the daily turnover as bars (a second chart below, same x). Several coins: lines on 100 at the
 * start, in category colours, labelled at their end.
 */
export function coinChart(t: Theme, w: number, series: CoinSeries[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const shown = series.filter((s) => s.points.length > 1);
  if (shown.length === 1) {
    const s = shown[0];
    const p = s.points;
    const up = p[p.length - 1].value >= p[0].value;
    return {
      data: [
        {
          type: 'scatter',
          mode: 'lines',
          name: s.name,
          x: p.map((x) => x.date),
          y: p.map((x) => x.value),
          line: { color: v(up ? 'gain' : 'loss'), width: 2 },
          customdata: p.map(() => s.asin),
          hovertemplate: `%{x|%d.%m.} · %{y:,.2f}${NB}€<extra></extra>`,
        },
        {
          type: 'bar',
          name: 'Umsatz',
          x: p.map((x) => x.date),
          y: p.map((x) => x.volume),
          width: DAY * 0.7,
          yaxis: 'y2',
          marker: { color: v('chart-2') },
          customdata: p.map(() => s.asin),
          text: p.map((x) => `${short(x.volume)}${NB}€`),
          textposition: 'none',
          hovertemplate: `%{x|%d.%m.} · Umsatz %{text}<extra></extra>`,
        },
      ],
      layout: {
        showlegend: false,
        hovermode: 'closest',
        margin: { l: 0, r: 0, t: 6, b: 0 },
        xaxis: { ...t.layout.xaxis, type: 'date', anchor: 'y2', tickformat: '%d.%m.', showspikes: false, nticks: narrow ? 4 : 8 },
        yaxis: { ...t.layout.yaxis, domain: [0.34, 1], showspikes: false, tickformat: ',.0f', ticksuffix: `${NB}€` },
        yaxis2: {
          ...t.layout.yaxis,
          domain: [0, 0.24],
          showspikes: false,
          rangemode: 'tozero',
          nticks: 2,
          tickvals: [Math.max(...p.map((x) => x.volume))],
          ticktext: [`${short(Math.max(...p.map((x) => x.volume)))}${NB}€`],
        },
      },
    };
  }
  const colors = [1, 2, 3, 4, 5].map((i) => v(`chart-${i}`));
  return {
    data: shown.map((s, i) => ({
      type: 'scatter',
      mode: 'lines',
      name: s.name,
      x: s.points.map((x) => x.date),
      y: s.points.map((x) => (x.value / s.points[0].value) * 100),
      line: { color: colors[i % 5], width: 2 },
      customdata: s.points.map(() => s.asin),
      hovertemplate: `${s.name}<br>%{x|%d.%m.} · %{y:,.1f} (Start = 100)<extra></extra>`,
    })),
    layout: {
      showlegend: false,
      hovermode: 'closest',
      margin: { l: 0, r: narrow ? 60 : 110, t: 6, b: 0 },
      xaxis: { ...t.layout.xaxis, type: 'date', tickformat: '%d.%m.', showspikes: false },
      yaxis: { ...t.layout.yaxis, side: 'left', showspikes: false },
      annotations: shown.map((s) => ({
        x: s.points[s.points.length - 1].date,
        y: (s.points[s.points.length - 1].value / s.points[0].value) * 100,
        xanchor: 'left',
        xshift: 4,
        showarrow: false,
        text: clip(s.name, narrow ? 8 : 14),
        font: { size: 11, color: v('text-secondary') },
      })),
    },
  };
}

// ---------- Indexes ----------

/**
 * „Wie laufen die Indizes?“: change since the last rebase (or the first close) as horizontal bars
 * in gain/loss, best on top; the label names the change, the members and whether an ETF tracks it.
 */
export function indexChart(t: Theme, w: number, bars: IndexBar[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const shown = [...bars].reverse();
  const label = (b: IndexBar) =>
    `${changeShort(b.change)}${b.members != null && !narrow ? ` · ${b.members.toLocaleString('de-DE')}${NB}Mitgl.` : ''}${b.etfs.length ? ' · ETF' : ''}`;
  // One index far ahead (> 3× the next) would squash all others: its bar is cut at 1,5× the next, the label keeps the value.
  const sorted = bars.map((b) => Math.abs(b.change)).sort((a, b) => b - a);
  const cap = sorted.length > 1 && sorted[0] > 3 * sorted[1] && sorted[1] > 0 ? sorted[1] * 1.5 : Infinity;
  const at = (c: number) => Math.sign(c) * Math.min(Math.abs(c), cap);
  const hi = Math.max(1, ...bars.map((b) => at(b.change)));
  const lo = Math.min(0, ...bars.map((b) => at(b.change)));
  const hasNeg = lo < 0;
  return {
    data: [
      {
        type: 'bar',
        orientation: 'h',
        y: shown.map((b) => b.asin),
        x: shown.map((b) => at(b.change)),
        marker: { color: shown.map((b) => v(b.change >= 0 ? 'gain' : 'loss')) },
        customdata: shown.map((b) => b.asin),
        hovertext: shown.map(
          (b) =>
            `${b.name}<br>${changeShort(b.change)} in ${b.days}${NB}T (seit Verkettung)${Math.abs(b.change) > cap ? ' – Balken gekürzt' : ''}${b.members != null ? `<br>${b.members.toLocaleString('de-DE')} Mitglieder` : ''}<br>${b.etfs.length ? `ETF: ${b.etfs.join(', ')}` : 'kein ETF'}${CLICK}`,
        ),
        hovertemplate: '%{hovertext}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.35,
      margin: { l: 0, r: narrow ? 96 : 190, t: 4, b: 0 },
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, range: [lo * 1.1, hi * 1.05] },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        tickmode: 'array',
        tickvals: shown.map((b) => b.asin),
        ticktext: shown.map((b) => clip(b.name, narrow ? 12 : 22)),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
      shapes: hasNeg ? [{ type: 'line', yref: 'paper', y0: 0, y1: 1, x0: 0, x1: 0, line: { color: v('line-strong'), width: 1 } }] : [],
      // Labels always right of the bar (or of zero for falling ones), never over the names on the left.
      annotations: shown.map((b) => ({
        x: Math.max(0, at(b.change)),
        y: b.asin,
        xanchor: 'left',
        xshift: 4,
        showarrow: false,
        text: label(b),
        font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
      })),
    },
  };
}

// ---------- ETFs ----------

/**
 * „Folgt der ETF seinem Index?“: per ETF a dumbbell from the base index's change to the ETF's change
 * over the same days (category colours – a comparison, not a direction); the gap in percentage points
 * written on the right.
 */
export function etfChart(t: Theme, w: number, pairs: EtfPair[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const shown = [...pairs].reverse();
  const hover = (p: EtfPair) =>
    `${p.name}<br>ETF ${changeShort(p.etf)} · ${p.indexName} ${changeShort(p.index)}<br>seit ${dayDate(p.start)} (${p.days}${NB}T) · Abstand ${pp(p.gap)}${p.fee != null ? `<br>Verwaltungsgebühr ${p.fee.toLocaleString('de-DE')}${NB}%` : ''}${p.indexEnded ? '<br>Basisindex beendet' : ''}${CLICK}`;
  const xs = pairs.flatMap((p) => [p.etf, p.index, 0]);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const pad = (hi - lo) * 0.08 || 1;
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        x: shown.flatMap((p) => [p.index, p.etf, null]),
        y: shown.flatMap((p) => [p.asin, p.asin, null]),
        line: { color: v('line-strong'), width: 3 },
        hoverinfo: 'skip',
        showlegend: false,
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Basisindex',
        x: shown.map((p) => p.index),
        y: shown.map((p) => p.asin),
        marker: { symbol: 'circle-open', size: 12, color: v('chart-2'), line: { width: 2 } },
        text: shown.map(hover),
        hovertemplate: '%{text}<extra></extra>',
        customdata: shown.map((p) => p.indexAsin),
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'ETF',
        x: shown.map((p) => p.etf),
        y: shown.map((p) => p.asin),
        marker: { size: 12, color: v('chart-1') },
        text: shown.map(hover),
        hovertemplate: '%{text}<extra></extra>',
        customdata: shown.map((p) => p.asin),
      },
    ],
    layout: {
      showlegend: true,
      legend: legend(t),
      hovermode: 'closest',
      margin: { l: 0, r: narrow ? 70 : 96, t: 22, b: 0 },
      xaxis: {
        ...t.layout.xaxis,
        range: [lo - pad, hi + pad],
        showspikes: false,
        zeroline: false,
        tickvals: rangeTicks(lo - pad, hi + pad, narrow ? 3 : 5),
        ticktext: rangeTicks(lo - pad, hi + pad, narrow ? 3 : 5).map((x) => signedPct(x, 1)),
      },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: true,
        tickmode: 'array',
        tickvals: shown.map((p) => p.asin),
        ticktext: shown.map((p) => clip(p.name, narrow ? 12 : 22)),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
      shapes: [{ type: 'line', yref: 'paper', y0: 0, y1: 1, x0: 0, x1: 0, line: { color: v('line-strong'), width: 1 } }],
      annotations: shown.map((p) => ({
        xref: 'paper',
        x: 1,
        y: p.asin,
        xanchor: 'left',
        xshift: 8,
        showarrow: false,
        text: pp(p.gap),
        font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
      })),
    },
  };
}

// ---------- Several classes ----------

/**
 * „Welche Klasse steigt, welche fällt?“: per class the number of rising (right, gain) and falling
 * (left, loss) securities; on the right the class's 24 h turnover and how many were traded.
 * Bonds and repos have no change to the previous day – they carry only the turnover note.
 * A click on a class selects it (customdata = group).
 */
export function classChart(t: Theme, w: number, rows: ClassRow[]) {
  const v = t.tokens;
  const narrow = w < NARROW;
  const shown = [...rows].reverse();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.up, r.down)));
  const hover = (r: ClassRow) =>
    `${r.label}: ${r.count.toLocaleString('de-DE')} in der Liste, ${r.traded.toLocaleString('de-DE')} mit Umsatz<br>${r.hasChange ? `▲ ${r.up.toLocaleString('de-DE')} gestiegen · ▼ ${r.down.toLocaleString('de-DE')} gefallen` : 'keine Tagesveränderung'}<br>${r.volumeKnown ? `Umsatz 24 h ${short(r.volume)}${NB}€` : 'Umsatz nicht erfasst'}<br><i>Klicken zeigt nur ${r.label}</i>`;
  const bar = (name: string, xs: number[], color: string, text: string[]) => ({
    type: 'bar',
    orientation: 'h',
    name,
    y: shown.map((r) => r.group),
    x: xs,
    marker: { color },
    text,
    textposition: 'outside',
    cliponaxis: false,
    textfont: { family: v('font-mono'), size: 11, color: v('text-secondary') },
    customdata: shown.map((r) => r.group),
    hovertext: shown.map(hover),
    hovertemplate: '%{hovertext}<extra></extra>',
  });
  return {
    data: [
      bar('Gefallen', shown.map((r) => -r.down), v('loss'), shown.map((r) => (r.down ? `▼${NB}${r.down.toLocaleString('de-DE')}` : ''))),
      bar('Gestiegen', shown.map((r) => r.up), v('gain'), shown.map((r) => (r.up ? `▲${NB}${r.up.toLocaleString('de-DE')}` : ''))),
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      barmode: 'overlay',
      bargap: 0.4,
      margin: { l: 0, r: narrow ? 88 : 200, t: 4, b: 0 },
      // room for the ▲/▼ counts beside the bars (wider share on the phone)
      xaxis: { ...t.layout.xaxis, visible: false, showspikes: false, range: [-max * (narrow ? 1.7 : 1.35), max * (narrow ? 1.7 : 1.35)] },
      yaxis: {
        ...t.layout.yaxis,
        side: 'left',
        showgrid: false,
        tickmode: 'array',
        tickvals: shown.map((r) => r.group),
        ticktext: shown.map((r) => r.label),
        tickfont: { family: v('font-sans'), size: 12, color: v('text-primary') },
      },
      shapes: [{ type: 'line', yref: 'paper', y0: 0, y1: 1, x0: 0, x1: 0, line: { color: v('line-strong'), width: 1 } }],
      annotations: [
        ...shown.map((r) => ({
          xref: 'paper',
          x: 1,
          y: r.group,
          xanchor: 'left',
          xshift: 8,
          showarrow: false,
          text: !r.volumeKnown ? (narrow ? '–' : 'Umsatz nicht erfasst') : narrow ? `${short(r.volume)}${NB}€` : `${short(r.volume)}${NB}€ · ${de(r.traded)} gehandelt`,
          font: { family: v('font-mono'), size: 11, color: v('text-secondary') },
        })),
        ...shown
          .filter((r) => !r.hasChange)
          .map((r) => ({ x: 0, y: r.group, xanchor: 'center', showarrow: false, text: 'ohne Tagesveränderung', bgcolor: v('bg-card'), font: { size: 11, color: v('text-muted') } })),
      ],
    },
  };
}
