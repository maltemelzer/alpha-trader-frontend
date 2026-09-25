import type { plotlyTheme } from '../charts/plotlyTheme';
import type { HighscoreHistoryEntry } from '../api/queries';

type Theme = ReturnType<typeof plotlyTheme>;

/** Own position over time; place 1 at the top (reversed axis), end labelled with the current place. */
export function positionChart(t: Theme, _w: number, history: HighscoreHistoryEntry[]) {
  const v = t.tokens;
  const last = history[history.length - 1];
  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        x: history.map((h) => new Date(h.date)),
        y: history.map((h) => h.position),
        line: { color: v('chart-2'), width: 2, shape: 'hv' },
        xhoverformat: '%d.%m.%Y',
        hovertemplate: 'Platz %{y:,.0f}<extra></extra>',
      },
    ],
    layout: {
      showlegend: false,
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: { ...t.layout.xaxis, tickformat: '%d.%m.' },
      yaxis: { ...t.layout.yaxis, autorange: 'reversed', tickformat: ',.0f', side: 'left' },
      annotations: last
        ? [
            {
              x: new Date(last.date),
              y: last.position,
              xanchor: 'right',
              yanchor: 'bottom',
              showarrow: false,
              text: `Platz ${last.position.toLocaleString('de-DE')}`,
              font: { family: v('font-mono'), size: 11, color: v('text-primary') },
            },
          ]
        : [],
    },
  };
}
