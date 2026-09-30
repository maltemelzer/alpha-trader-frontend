import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { SecurityOrderLogEntryView } from '../../api/types';
import {
  ambientWindows,
  backdrop,
  flashCount,
  freshTrades,
  layoutCity,
  pickWindows,
    roofOf,
  signText,
  silhouette,
  towerLabel,
  tradeId,
  tradeVolume,
  windowAt,
  windowGrid,
  type Tower,
  type TowerData,
} from './derive';

const TOP_PAD = 24; // room above the tallest roof for flags and ▲/▼
const LABEL_H = 22; // district labels under the ground
const FLASH_MS = 2600;

interface Flash {
  id: string;
  asin: string;
  windows: number[];
  delay: number;
  until: number;
}

/** Size of an element, following resizes. */
function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const dirOf = (c: number | null) => (c == null ? 'na' : c > 0.005 ? 'up' : c < -0.005 ? 'down' : 'flat');

/**
 * The city: every tower a security, height = 24 h volume (log), roof and facade = change to the previous
 * day, windows light up with each trade. `panorama` lets it grow wider than the screen (phone: swipe).
 */
export function Skyline({
  towers,
  trades,
  keyOf,
  counts,
  highlight = null,
  selected,
  onSelect,
  onOpen,
  panorama = false,
  loading = false,
  children,
}: {
  towers: TowerData[];
  /** the live feed: new trades light windows */
  trades: SecurityOrderLogEntryView[];
  /** tower of a traded ASIN (buildings: their size) */
  keyOf: (asin: string | undefined) => string | undefined;
  /** trades per tower in the last minutes: busy towers keep more windows lit */
  counts: ReadonlyMap<string, number>;
  /** tower of the hovered headline: stands out, the others step back */
  highlight?: string | null;
  selected: string | null;
  /** hover, focus or tap on a tower (null: pointer left the city) */
  onSelect: (asin: string | null, via: 'hover' | 'tap') => void;
  /** click with a mouse, Enter: straight to the security */
  onOpen: (asin: string) => void;
  panorama?: boolean;
  loading?: boolean;
  /** overlay inside the city (tooltip), gets the selected tower's position */
  children?: (t: Tower, pos: { left: number; top: number; width: number }) => React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const size = useSize(wrap);
  const [scrollLeft, setScrollLeft] = useState(0);
  const H = size.h;
  const ground = H - LABEL_H;
  const layout = useMemo(
    () =>
      layoutCity(towers, {
        width: size.w,
        height: Math.max(40, ground - TOP_PAD),
        minUnit: panorama ? 22 : 12,
        maxUnit: panorama ? 30 : 48,
      }),
    [towers, size.w, ground, panorama],
  );
  const byAsin = useMemo(() => new Map(layout.towers.map((t) => [t.asin, t])), [layout]);
  const shapes = useMemo(() => {
    const tallest = layout.towers.filter((t) => t.type === 'STOCK').reduce<Tower | undefined>((a, t) => (!a || t.h > a.h ? t : a), undefined);
    return new Map(
      layout.towers.map((t) => {
        const capH = t.change != null && Math.abs(t.change) >= 5 ? 5 : 3;
        return [t.asin, silhouette(t, ground, roofOf(t, t === tallest), capH)];
      }),
    );
  }, [layout, ground]);
  const grids = useMemo(
    () =>
      new Map(
        layout.towers.map((t) => {
          const b = shapes.get(t.asin)!.body;
          return [t.asin, windowGrid({ x: b.x, w: b.w, h: b.h }, b.y, layout.unit)];
        }),
      ),
    [layout, shapes],
  );

  const far = useMemo(() => backdrop(layout.width, layout.maxHeight), [layout.width, layout.maxHeight]);

  // Busy towers keep more windows lit.

  // New trades → flashes, spread over the poll interval so the city twinkles instead of flashing in bursts.
  const seen = useRef<Set<string> | null>(null);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  useEffect(() => {
    if (!trades.length) return;
    if (!seen.current) {
      // First load: mark all as seen, light only the newest few so the city does not start dark.
      seen.current = new Set(trades.map(tradeId));
      const first = trades.filter((t) => tradeVolume(t) > 0).slice(0, 8).reverse();
      schedule(first);
      return;
    }
    const fresh = freshTrades(trades, seen.current);
    trades.forEach((t) => seen.current!.add(tradeId(t)));
    schedule(fresh);

    function schedule(list: SecurityOrderLogEntryView[]) {
      const at = Date.now();
      const step = list.length ? Math.min(900, 13_000 / list.length) : 0;
      const next: Flash[] = [];
      list.forEach((t, i) => {
        const asin = keyOf(t.securityIdentifier);
        const g = asin ? grids.get(asin) : undefined;
        if (!asin || !g) return;
        const total = g.cols * g.rows;
        const delay = Math.round(i * step);
        next.push({
          id: tradeId(t),
          asin,
          windows: pickWindows(tradeId(t), flashCount(tradeVolume(t)), total),
          delay,
          until: at + delay + FLASH_MS,
        });
      });
      if (next.length) setFlashes((old) => [...old.filter((f) => f.until > at), ...next]);
    }
    // grids change on resize only; flashes of that moment land in the new raster by index
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);
  useEffect(() => {
    if (!flashes.length) return;
    const id = window.setTimeout(() => {
      const at = Date.now();
      setFlashes((old) => old.filter((f) => f.until > at));
    }, 3000);
    return () => window.clearTimeout(id);
  }, [flashes]);

  // Phone panorama: start downtown (the shares).
  const centred = useRef(false);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!panorama || !el || centred.current || !layout.towers.length || !size.w || !size.h || layout.width <= size.w) return;
    const shares = layout.blocks.find((b) => b.key === 'STOCK');
    if (!shares) return;
    el.scrollTo({ left: Math.max(0, (shares.x0 + shares.x1) / 2 - size.w / 2) });
    centred.current = true;
  }, [panorama, layout, size.w, size.h]);

  // Every tower tall and wide enough carries its name as a vertical sign.
  const signs = useMemo(
    () => new Map(layout.towers.map((t) => [t.asin, signText(towerLabel(t), shapes.get(t.asin)!.body.h, t.w)])),
    [layout, shapes],
  );

  const tapRef = useRef(false);
  const onPointerDown = (e: ReactPointerEvent) => {
    tapRef.current = e.pointerType !== 'mouse';
  };
  const onKey = (e: KeyboardEvent, asin: string) => {
    if (e.key === 'Enter') onOpen(asin);
    if (e.key === ' ') {
      e.preventDefault();
      onSelect(asin, 'tap');
    }
  };

  const sel = selected ? byAsin.get(selected) : undefined;

  // Panorama: name the districts beyond the edges – a tap scrolls there.
  const edges = panorama && size.w
    ? {
        left: layout.blocks.filter((b) => b.x1 < scrollLeft + 24),
        right: layout.blocks.filter((b) => b.x0 > scrollLeft + size.w - 24),
      }
    : { left: [], right: [] };
  const scrollToBlock = (b: { x0: number; x1: number }) =>
    wrap.current?.scrollTo({ left: Math.max(0, (b.x0 + b.x1) / 2 - size.w / 2), behavior: 'smooth' });

  return (
    <>
    <div
      ref={wrap}
      className={`skyl-city${panorama ? ' skyl-city--pan' : ''}`}
      onScroll={panorama ? (e) => setScrollLeft(e.currentTarget.scrollLeft) : undefined}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') onSelect(null, 'hover');
      }}
    >
      {H > 0 && size.w > 0 && (
        <svg
          className={`skyl-svg${highlight && byAsin.has(highlight) ? ' skyl-svg--hl' : ''}`}
          width={layout.width}
          height={H}
          viewBox={`0 0 ${layout.width} ${H}`}
          role="group"
          aria-label="Die Stadt des Markts: jeder Turm ein Wertpapier, Höhe nach Umsatz in 24 Stunden, Dachfarbe nach Veränderung zum Vortag"
        >
          <defs>
            {layout.towers.map((t) => {
              const g = grids.get(t.asin)!;
              return (
                <pattern
                  key={t.asin}
                  id={`skyl-p-${t.asin}`}
                  patternUnits="userSpaceOnUse"
                  x={g.x0}
                  y={g.y0}
                  width={g.pitchX}
                  height={g.pitchY}
                >
                  <rect width={g.ww} height={g.wh} className="skyl-pane" />
                </pattern>
              );
            })}
          </defs>
          <g className="skyl-far" aria-hidden="true">
            {far.map((b, i) => (
              <rect key={i} x={b.x} y={ground + b.y} width={b.w} height={b.h} />
            ))}
          </g>
          {layout.towers.map((t) => {
            const g = grids.get(t.asin)!;
            const shape = shapes.get(t.asin)!;
            const top = shape.body.y;
            const roofTop = shape.cap.y;
            const total = g.cols * g.rows;
            const dir = dirOf(t.change);
            const amb = ambientWindows(t.asin, counts.get(t.asin) ?? 0, total);
            const lit = flashes.filter((f) => f.asin === t.asin);
            const label = towerLabel(t);
            const sign = signs.get(t.asin);
            return (
              <g
                key={t.asin}
                className={`skyl-tower skyl-tower--${dir}${t.own ? ' skyl-tower--own' : ''}${t.type === 'BUILDING' ? ' skyl-tower--back' : ''}${selected === t.asin ? ' is-sel' : ''}${highlight === t.asin ? ' is-hl' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={`${label}${t.own ? ', in deinem Depot' : ''}`}
                onPointerDown={onPointerDown}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onSelect(t.asin, 'hover')}
                onFocus={(e) => e.currentTarget.matches(':focus-visible') && onSelect(t.asin, 'tap')}
                onClick={() => (tapRef.current ? onSelect(t.asin, 'tap') : onOpen(t.asin))}
                onKeyDown={(e) => onKey(e, t.asin)}
              >
                {/* hit area up to the sky, so thin towers are easy to hit */}
                <rect className="skyl-hit" x={t.x - 1} y={TOP_PAD - 6} width={t.w + 2} height={ground - TOP_PAD + 6} />
                <rect className="skyl-facade" x={shape.body.x} y={shape.body.y} width={shape.body.w} height={shape.body.h} />
                {shape.crown.map((c, i) => (
                  <rect key={i} className="skyl-facade" x={c.x} y={c.y} width={c.w} height={c.h + 0.5} />
                ))}
                {shape.dome && (
                  <path
                    className="skyl-facade"
                    d={`M${shape.dome.cx - shape.dome.r} ${shape.dome.cy + 0.5} a${shape.dome.r} ${shape.dome.r} 0 0 1 ${2 * shape.dome.r} 0 z`}
                  />
                )}
                {shape.mast && <line className="skyl-mast" x1={shape.mast.x} x2={shape.mast.x} y1={shape.mast.y1} y2={shape.mast.y2} />}
                {total > 0 && (
                  <rect
                    x={g.x0}
                    y={g.y0}
                    width={g.cols * g.pitchX - (g.pitchX - g.ww)}
                    height={g.rows * g.pitchY - (g.pitchY - g.wh)}
                    fill={`url(#skyl-p-${t.asin})`}
                  />
                )}
                {amb.map((i) => {
                  const p = windowAt(g, i);
                  return <rect key={`a${i}`} className="skyl-lit" x={p.x} y={p.y} width={g.ww} height={g.wh} />;
                })}
                {lit.flatMap((f) =>
                  f.windows.map((i) => {
                    const p = windowAt(g, i);
                    return (
                      <rect
                        key={`${f.id}-${i}`}
                        className="skyl-flash"
                        style={{ animationDelay: `${f.delay}ms` }}
                        x={p.x - 0.5}
                        y={p.y - 0.5}
                        width={g.ww + 1}
                        height={g.wh + 1}
                      />
                    );
                  }),
                )}
                {sign && (
                  <g className="skyl-sign">
                    <rect x={t.x + t.w / 2 - 7.5} y={top + 10} width={15} height={sign.length * 6.4 + 10} />
                    <text
                      transform={`translate(${t.x + t.w / 2 - 3.6} ${top + 15}) rotate(90)`}
                      textLength={sign.length * 6.4}
                      lengthAdjust="spacingAndGlyphs"
                    >
                      {sign}
                    </text>
                  </g>
                )}
                {shape.dome ? (
                  <path
                    className="skyl-capline"
                    d={`M${shape.dome.cx - shape.dome.r} ${shape.dome.cy} a${shape.dome.r} ${shape.dome.r} 0 0 1 ${2 * shape.dome.r} 0`}
                    style={{ strokeWidth: shape.cap.h }}
                  />
                ) : (
                  <rect className="skyl-cap" x={shape.cap.x} y={shape.cap.y} width={shape.cap.w} height={shape.cap.h} />
                )}
                {t.own && (
                  <g className="skyl-flag">
                    <line x1={t.x + t.w / 2} x2={t.x + t.w / 2} y1={roofTop} y2={roofTop - 16} />
                    <path d={`M${t.x + t.w / 2} ${roofTop - 16} l9 3.5 l-9 3.5 z`} />
                  </g>
                )}
                {(dir === 'up' || dir === 'down') && (
                  <text className="skyl-dir" x={t.x + t.w / 2 - (t.own ? 6 : 0)} y={roofTop - 4} textAnchor="middle">
                    {dir === 'up' ? '▲' : '▼'}
                  </text>
                )}
              </g>
            );
          })}
          <line className="skyl-ground" x1={0} x2={layout.width} y1={ground + 0.5} y2={ground + 0.5} />
          {layout.blocks.map((b) => (
            <text
              key={b.key}
              className="skyl-block"
              x={Math.max(b.label.length * 3.5 + 2, Math.min(layout.width - b.label.length * 3.5 - 2, (b.x0 + b.x1) / 2))}
              y={ground + 14}
              textAnchor="middle"
            >
              {b.label}
            </text>
          ))}
          {!loading && !layout.towers.length && (
            <text className="skyl-block" x={layout.width / 2} y={ground - 20} textAnchor="middle">
              Gerade wird nichts gehandelt.
            </text>
          )}
        </svg>
      )}
      {loading && <p className="skyl-building">Die Stadt wird gebaut …</p>}
      {sel &&
        children?.(sel, {
          left: sel.x + sel.w / 2 - scrollLeft,
          top: ground - sel.h - 18,
          width: size.w,
        })}
    </div>
    {edges.left.length > 0 && (
      <button type="button" className="skyl-edge skyl-edge--left" onClick={() => scrollToBlock(edges.left[edges.left.length - 1])}>
        ‹ {edges.left.map((b) => b.label).join(', ')}
      </button>
    )}
    {edges.right.length > 0 && (
      <button type="button" className="skyl-edge skyl-edge--right" onClick={() => scrollToBlock(edges.right[0])}>
        {edges.right.map((b) => b.label).join(', ')} ›
      </button>
    )}
    </>
  );
}
