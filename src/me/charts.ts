// Plotly figures for the settings page.
import type { plotlyTheme } from '../charts/plotlyTheme';

type Theme = ReturnType<typeof plotlyTheme>;

const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};

/** Referred players per month as columns. */
export function referralsChart(t: Theme, _w: number, rows: { month: string; count: number }[]) {
  const v = t.tokens;
  return {
    data: [
      {
        type: 'bar',
        x: rows.map((r) => monthLabel(r.month)),
        y: rows.map((r) => r.count),
        marker: { color: v('chart-1') },
        hovertemplate: '%{x}: %{y} Spieler<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      bargap: 0.3,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, type: 'category', showspikes: false },
      yaxis: { ...t.layout.yaxis, side: 'left', rangemode: 'tozero', dtick: 1, tickformat: ',.0f' },
    },
  };
}
