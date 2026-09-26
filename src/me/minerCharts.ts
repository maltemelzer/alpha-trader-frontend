// Plotly figure for the miner planner.
import type { plotlyTheme } from '../charts/plotlyTheme';
import { short } from '../lib/format';
import { netAfter, type MinerStep } from './miner';

type Theme = ReturnType<typeof plotlyTheme>;

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±\u00a0'}${short(Math.abs(n))}\u00a0€`;
const days = (h: number) => `${(h / 24).toLocaleString('de-DE', { maximumFractionDigits: h < 240 ? 1 : 0 })}\u00a0T`;

export interface PlanInput {
  steps: MinerStep[];
  hours: number;
  coinPrice: number;
  best: number;
  selected: number;
  /** Highest level the cash covers; levels above are hatched. */
  affordable: number | null;
  cash?: number;
}

/**
 * Two panels over the target level (+1 … +n):
 * top – what building up to that level costs in total (log axis, since every level costs 1,5×),
 * your cash as a dashed line, profit after the horizon written on the chosen and the best bar;
 * bottom – how long each single level takes to pay for itself, with the horizon as a dashed line:
 * a level is worth it as long as its bar stays below the line. Worth it = ink blue, not = neutral,
 * best = brass, more than the cash = hatched. Profit is not a price move, so no gain/loss colours.
 * Bars carry their step as customdata.
 */
export function minerPlanChart(t: Theme, w: number, p: PlanInput) {
  const v = t.tokens;
  const narrow = w < 520;
  const { hours, coinPrice, best, selected, affordable, cash } = p;
  const steps = p.steps.slice(1);
  const x = steps.map((s) => s.step);
  const worth = (s: MinerStep) => (s.stepPaybackHours ?? Infinity) <= hours;
  const tooExpensive = (s: MinerStep) => affordable != null && s.step > affordable;
  const colour = (s: MinerStep) => (s.step === best ? v('chart-1') : worth(s) ? v('chart-2') : v('line-strong'));
  const outline = {
    color: steps.map((s) => (s.step === selected ? v('text-primary') : v('bg-card'))),
    width: steps.map((s) => (s.step === selected ? 2 : 1)),
  };
  const pattern = { shape: steps.map((s) => (tooExpensive(s) ? '/' : '')), fgcolor: v('bg-card'), size: 6, solidity: 0.35 };
  const paybackDays = steps.map((s) => (s.stepPaybackHours ?? 0) / 24);
  const horizonDays = hours / 24;
  const maxDays = Math.max(horizonDays * 1.2, ...paybackDays.slice(0, Math.max(1, best + 2)));
  const range: [number, number] = [0.4, steps.length + 0.6];
  const costs = steps.map((s) => s.totalCost);
  const lo = Math.min(...costs, cash ?? Infinity);
  const hi = Math.max(...costs, cash ?? 0);
  const decades: number[] = [];
  const e0 = Math.floor(Math.log10(lo));
  const e1 = Math.ceil(Math.log10(hi));
  const every = e1 - e0 > 4 ? 2 : 1; // at most about five labels, the panel is low
  for (let e = e0; e <= e1; e += every) decades.push(10 ** e);
  const marked = new Set([best, selected, affordable ?? -1]);
  const net = (s: MinerStep) => netAfter(s, hours, coinPrice);
  const label = (text: string, y: number, yref: string) => ({
    xref: 'paper',
    x: 0,
    xanchor: 'left',
    yref,
    y,
    yanchor: 'bottom',
    text,
    showarrow: false,
    bgcolor: v('bg-card'),
    font: { family: v('font-mono'), size: 11, color: v('brass') },
  });
  const title = (text: string, y: number) => ({
    xref: 'paper',
    x: 0,
    xanchor: 'left',
    yref: 'paper',
    y,
    yanchor: 'bottom',
    text,
    showarrow: false,
    font: { family: v('font-sans'), size: 12, color: v('text-secondary') },
  });

  return {
    data: [
      {
        type: 'bar',
        x,
        y: costs,
        marker: { color: steps.map(colour), line: outline, pattern },
        text: steps.map((s) => (marked.has(s.step) && (!narrow || s.step === selected) ? signed(net(s)) : '')),
        textposition: 'outside',
        constraintext: 'none',
        cliponaxis: false,
        textfont: { family: v('font-mono'), size: 11, color: v('text-primary') },
        customdata: x,
        hovertext: steps.map(
          (s) =>
            `<b>Bis Stufe +${s.step} ausbauen</b><br>` +
            `Kosten ${short(s.totalCost)} €${tooExpensive(s) ? ' – Bargeld reicht nicht' : ''}<br>` +
            `${s.rate.toLocaleString('de-DE', { maximumFractionDigits: 2 })} AC/Std.<br>` +
            `Gewinn nach ${days(hours)}: ${signed(net(s))}` +
            (s.paybackHours != null ? `<br>alles bezahlt nach ${days(s.paybackHours)}` : ''),
        ),
        hovertemplate: '%{hovertext}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      },
      {
        type: 'bar',
        x,
        y: paybackDays,
        marker: { color: steps.map(colour), line: outline },
        customdata: x,
        hovertext: steps.map(
          (s) =>
            `<b>Stufe +${s.step} allein</b><br>Kosten ${short(s.cost)} €<br>` +
            `bringt +${(s.rate - p.steps[s.step - 1].rate).toLocaleString('de-DE', { maximumFractionDigits: 2 })} AC/Std.<br>` +
            `rechnet sich nach ${days(s.stepPaybackHours ?? 0)}`,
        ),
        hovertemplate: '%{hovertext}<extra></extra>',
        xaxis: 'x2',
        yaxis: 'y2',
      },
    ],
    layout: {
      showlegend: false,
      hovermode: 'closest',
      bargap: 0.25,
      margin: { l: 0, r: 0, t: 18, b: 0 },
      xaxis: { ...t.layout.xaxis, anchor: 'y', showspikes: false, showticklabels: false, domain: [0, 1], range },
      yaxis: {
        ...t.layout.yaxis,
        type: 'log',
        domain: [0.46, 1],
        range: [Math.log10(lo) - 0.15, Math.log10(hi) + 0.35],
        tickmode: 'array',
        tickvals: decades,
        ticktext: decades.map((d) => `${short(d)}\u00a0€`),
      },
      xaxis2: {
        ...t.layout.xaxis,
        anchor: 'y2',
        showspikes: false,
        domain: [0, 1],
        range,
        tickmode: 'array',
        tickvals: x,
        ticktext: x.map((k) => (narrow && k % 2 === 0 && k !== selected ? '' : `+${k}`)),
      },
      yaxis2: { ...t.layout.yaxis, domain: [0, 0.34], range: [0, maxDays], ticksuffix: '\u00a0T' },
      shapes: [
        ...(cash != null && cash > 0
          ? [{ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: cash, y1: cash, line: { color: v('brass'), width: 1.5, dash: 'dash' } }]
          : []),
        { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y2', y0: horizonDays, y1: horizonDays, line: { color: v('brass'), width: 1.5, dash: 'dash' } },
      ],
      annotations: [
        title(
          narrow
            ? 'Kosten bis zur Stufe · Linie = dein Bargeld'
            : `Kosten bis zur Stufe (Gewinn nach ${days(hours)} am Balken)${cash != null && cash > 0 ? ` · Linie: dein Bargeld ${short(cash)}\u00a0€` : ''}`,
          1,
        ),
        title('Jede Stufe allein rechnet sich nach …', 0.37),
        label(`dein Zeitraum: ${days(hours)}`, horizonDays, 'y2'),
      ],
    },
  };
}
