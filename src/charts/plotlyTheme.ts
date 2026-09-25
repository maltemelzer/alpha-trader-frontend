// Bankiersgrün Plotly theme (port of bankiersgruenPlotly() from vendor/bankiersgruen/diagramme.md).
// Reads the CSS tokens at draw time, so the colour-blind theme applies automatically.

export function tokens() {
  const cs = getComputedStyle(document.documentElement);
  return (name: string) => cs.getPropertyValue(`--${name}`).trim();
}

export function plotlyTheme() {
  const v = tokens();
  const sans = v('font-sans');
  const serif = v('font-serif');
  const mono = v('font-mono');
  const axis = {
    showgrid: false,
    zeroline: false,
    showline: true,
    linecolor: v('line-strong'),
    linewidth: 1,
    ticks: '',
    automargin: true,
    fixedrange: true,
    tickfont: { family: mono, size: 11, color: v('text-secondary') },
  };
  return {
    tokens: v,
    layout: {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: sans, size: 12, color: v('text-secondary') },
      title: { font: { family: serif, size: 18, color: v('text-primary') }, x: 0, xanchor: 'left' },
      colorway: [1, 2, 3, 4, 5].map((i) => v(`chart-${i}`)),
      separators: ',.',
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: {
        ...axis,
        showspikes: true,
        spikemode: 'across',
        spikesnap: 'cursor',
        spikedash: 'solid',
        spikecolor: v('line-strong'),
        spikethickness: 1,
      },
      yaxis: { ...axis, side: 'right', showline: false, showgrid: true, gridcolor: v('line'), gridwidth: 1 },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: v('bg-raised'),
        bordercolor: v('line-strong'),
        font: { family: mono, size: 12, color: v('text-primary') },
      },
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.12,
        bgcolor: 'rgba(0,0,0,0)',
        font: { family: sans, size: 12, color: v('text-secondary') },
      },
      dragmode: false,
    },
    config: { displayModeBar: false, responsive: true, scrollZoom: false },
  };
}

/** Calls `render` again when data-theme changes (e.g. colour-blind mode). Returns a disconnect function. */
export function watchTheme(render: () => void) {
  const mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
