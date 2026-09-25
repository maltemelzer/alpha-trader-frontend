import { useEffect, useRef } from 'react';
import { plotlyTheme, watchTheme } from './plotlyTheme';

type Theme = ReturnType<typeof plotlyTheme>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Figure = { data: any[]; layout?: Record<string, any> };

interface PlotProps {
  /** Builds the figure from the current theme; called again on theme change and resize. */
  figure: (theme: Theme, width: number) => Figure;
  className?: string;
  'aria-label': string;
}

// Plotly is large – load it once, on first use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let plotly: Promise<any> | null = null;
const loadPlotly = () => (plotly ??= import('plotly.js-dist-min').then((m) => m.default ?? m));

/** Plotly chart with the Bankiersgrün theme. The container sets the size (fills its parent). */
export function Plot({ figure, className, ...rest }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const figureRef = useRef(figure);
  useEffect(() => {
    figureRef.current = figure;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const draw = async () => {
      const Plotly = await loadPlotly();
      if (!alive || !el.clientWidth || !el.clientHeight) return;
      const t = plotlyTheme();
      const f = figureRef.current(t, el.clientWidth);
      Plotly.react(el, f.data, { ...t.layout, ...f.layout, width: el.clientWidth, height: el.clientHeight }, t.config);
    };

    draw();
    const unwatch = watchTheme(draw);
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(draw, 150);
    });
    ro.observe(el);
    return () => {
      alive = false;
      clearTimeout(timer);
      unwatch();
      ro.disconnect();
      loadPlotly().then((P) => P.purge(el));
    };
  }, []);

  // Redraw when the figure function changes (new data).
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    loadPlotly().then((Plotly) => {
      const t = plotlyTheme();
      const f = figure(t, el.clientWidth);
      Plotly.react(el, f.data, { ...t.layout, ...f.layout, width: el.clientWidth, height: el.clientHeight }, t.config);
    });
  }, [figure]);

  return <div ref={ref} className={className} role="img" style={{ width: '100%', height: '100%' }} {...rest} />;
}
