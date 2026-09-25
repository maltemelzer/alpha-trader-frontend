import { useEffect, useRef } from 'react';
import { plotlyTheme, watchTheme } from './plotlyTheme';

type Theme = ReturnType<typeof plotlyTheme>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Figure = { data: any[]; layout?: Record<string, any> };

/** The clicked point: its customdata (set per trace in the figure), trace and index. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlotPoint = { customdata?: any; curveNumber: number; pointIndex: number };

interface PlotProps {
  /** Builds the figure from the current theme; called again on theme change and resize. */
  figure: (theme: Theme, width: number) => Figure;
  /** Click on a data point (e.g. open the security behind it); the chart shows a pointer cursor. */
  onPointClick?: (point: PlotPoint) => void;
  className?: string;
  'aria-label': string;
}

// Plotly is large – load it once, on first use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let plotly: Promise<any> | null = null;
const loadPlotly = () => (plotly ??= import('plotly.js-dist-min').then((m) => m.default ?? m));

/** Plotly chart with the Bankiersgrün theme. The container sets the size (fills its parent). */
export function Plot({ figure, className, onPointClick, ...rest }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const figureRef = useRef(figure);
  const clickRef = useRef(onPointClick);
  useEffect(() => {
    figureRef.current = figure;
    clickRef.current = onPointClick;
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
      await Plotly.react(el, f.data, { ...t.layout, ...f.layout, width: el.clientWidth, height: el.clientHeight }, t.config);
      // Plotly attaches .on() to the div after the first plot; listen once, the handler comes from a ref.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const div = el as any;
      if (!div.__clickBound && typeof div.on === 'function') {
        div.__clickBound = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        div.on('plotly_click', (e: { points?: any[] }) => {
          const p = e.points?.[0];
          if (p && clickRef.current) clickRef.current({ customdata: p.customdata, curveNumber: p.curveNumber, pointIndex: p.pointIndex });
        });
      }
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

  return (
    <div
      ref={ref}
      className={[className, onPointClick ? 'plot--clickable' : ''].filter(Boolean).join(' ') || undefined}
      role="img"
      style={{ width: '100%', height: '100%' }}
      {...rest}
    />
  );
}
