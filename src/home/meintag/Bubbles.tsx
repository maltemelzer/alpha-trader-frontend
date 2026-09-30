import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DS } from '../../ds';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { flatBelow, intensity, orbitLayout, orbitPoint, pctText, relTime, sparkPaths, type Bubble, type Circle } from './derive';

export type ColorBy = 'heute' | 'kauf';

/** One full turn of the ghost ring, in ms – a slow drift, not a spinner. */
const TURN_MS = 240_000;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const moveOf = (b: Bubble, colorBy: ColorBy) => (colorBy === 'kauf' ? b.sinceBuy : b.today);
/** Only a real move is written – „± 0 %“ on every quiet bubble says nothing. */
const shownMove = (m: number | undefined) => (m != null && Math.abs(m) >= flatBelow ? pctText(m) : undefined);

/** Mini line inside a big bubble: last closes, as a faint area in the lower half. */
function Spark({ values, d }: { values: number[]; d: number }) {
  // a band in the lower third, well inside the circle's edge
  const w = Math.round(d * 0.56);
  const h = Math.round(d * 0.14);
  const p = sparkPaths(values, w, h);
  if (!p) return null;
  return (
    <svg
      className="mt-bub__spark"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ left: Math.round((d - w) / 2), top: Math.round(d * 0.74) }}
      aria-hidden="true"
    >
      <path d={p.area} className="mt-bub__sparkarea" />
      <path d={p.line} className="mt-bub__sparkline" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function OwnBubble({ b, c, colorBy, pulse, now }: { b: Bubble; c: Circle; colorBy: ColorBy; pulse?: number; now: number }) {
  const move = moveOf(b, colorBy);
  const dir = move == null ? 'none' : move >= flatBelow ? 'up' : move <= -flatBelow ? 'down' : 'flat';
  const d = Math.round(c.r * 2);
  const big = c.r >= 56;
  const mid = c.r >= 34;
  const small = c.r >= 21;
  const moveText = shownMove(move);
  const aria = [
    b.label,
    b.sub,
    DS.format.money(b.value, '€', 2, 'auto'),
    moveText ? `${moveText} ${colorBy === 'kauf' ? 'seit Kauf' : 'heute'}` : undefined,
    b.last ? `letzter Trade ${relTime(Math.min(b.last, now), now)}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  const style = {
    left: Math.round(c.x - c.r),
    top: Math.round(c.y - c.r),
    width: d,
    height: d,
    '--mt-mix': `${Math.round(10 + intensity(move) * 32)}%`,
    '--mt-fs': `${Math.max(10, Math.min(20, c.r / 4.4)).toFixed(1)}px`,
  } as CSSProperties;
  return (
    <a href={b.href} className={`mt-bub mt-bub--${b.kind}`} data-dir={dir} style={style} aria-label={aria} title={aria}>
      {c.r >= 44 && b.spark && (
        <span className="mt-bub__clip" aria-hidden="true">
          <Spark values={b.spark} d={d} />
        </span>
      )}
      {pulse ? <span key={pulse} className="mt-bub__ring" aria-hidden="true" /> : null}
      {small && (
        <span className="mt-bub__in" aria-hidden="true">
          {(mid || !moveText) && (
            <span className={`mt-bub__name${big ? ' mt-bub__name--big' : ''}${mid ? '' : ' mt-bub__name--tiny'}`}>
              {big ? b.label : (b.short ?? b.label)}
            </span>
          )}
          {big && b.sub && <span className="mt-bub__sub">{b.sub}</span>}
          {moveText && <span className="mt-bub__move">{moveText}</span>}
          {big && <span className="mt-bub__val">{DS.format.money(b.value, '€', 0, 'auto')}</span>}
          {big && b.last && <span className="mt-bub__sub">zuletzt {relTime(Math.min(b.last, now), now)}</span>}
        </span>
      )}
    </a>
  );
}

/**
 * The depot as a field of bubbles, the market circling around it: own securities packed in the middle
 * (area ∝ √value, fill = move today or since purchase, a mini line in big ones), the most traded
 * securities as dashed ghosts drifting slowly on a ring around them. Every trade sends a ring out of
 * its bubble and lights a ghost up (`pulses`: bubble id → counter).
 */
export function Bubbles({
  own,
  ghosts,
  colorBy,
  pulses,
  loading,
  now,
  minRadius = 0,
  bottomPad = 0,
  empty,
}: {
  own: Bubble[];
  ghosts: Bubble[];
  colorBy: ColorBy;
  pulses: Record<string, number>;
  loading: boolean;
  now: number;
  /** smallest radius in px (22 on phones: 44 px tap targets) */
  minRadius?: number;
  /** px kept free at the bottom (phones: the host's floating bar) */
  bottomPad?: number;
  /** shown in the middle when there are no own securities */
  empty?: React.ReactNode;
}) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const layout = useMemo(() => orbitLayout(own, ghosts.length, w, h, minRadius, bottomPad), [own, ghosts.length, w, h, minRadius, bottomPad]);
  const orbit = layout.orbit;

  // Bubbles glide to new places on live updates – but not while the page is still settling.
  const [live, setLive] = useState(false);
  const has = layout.own.length > 0 || !!orbit;
  useEffect(() => {
    if (!has || live) return;
    const t = window.setTimeout(() => setLive(true), 1500);
    return () => window.clearTimeout(t);
  }, [has, live]);

  // The ghost ring turns by transform only (no layout, no layout shift), ~20 frames a second.
  const ghostRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const start = useRef(0);
  useEffect(() => {
    if (!orbit) return;
    const place = (turn: number) =>
      ghostRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = orbitPoint(orbit, i, ghosts.length, turn);
        el.style.transform = `translate(${(p.x - orbit.r).toFixed(1)}px, ${(p.y - orbit.r).toFixed(1)}px)`;
      });
    if (reduced) {
      place(0);
      return;
    }
    if (!start.current) start.current = performance.now();
    let raf = 0;
    let lastFrame = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - lastFrame < 50) return;
      lastFrame = t;
      place(((t - start.current) / TURN_MS) * Math.PI * 2);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [orbit, ghosts.length, reduced]);

  return (
    <div ref={ref} className={`mt-field${live ? ' mt-field--live' : ''}`}>
      {loading && <div className="mt-field__wait" aria-hidden="true" />}
      {!loading && orbit && (
        <svg className="mt-orbit" width={w} height={h} aria-hidden="true">
          <ellipse cx={orbit.cx} cy={orbit.cy} rx={orbit.rx} ry={orbit.ry} />
        </svg>
      )}
      {!loading && !own.length && empty && <div className="mt-field__empty">{empty}</div>}
      {!loading &&
        layout.own.map((c, i) => <OwnBubble key={own[i].id} b={own[i]} c={c} colorBy={colorBy} pulse={pulses[own[i].id]} now={now} />)}
      {!loading &&
        orbit &&
        ghosts.map((b, i) => {
          const p = orbitPoint(orbit, i, ghosts.length, 0);
          const d = Math.round(orbit.r * 2);
          const moveText = shownMove(b.today);
          const aria = [b.label, 'gerade viel gehandelt', moveText ? `${moveText} heute` : undefined].filter(Boolean).join(', ');
          return (
            <a
              key={b.id}
              ref={(el) => {
                ghostRefs.current[i] = el;
              }}
              href={b.href}
              className="mt-bub mt-bub--ghost"
              data-dir={moveText ? (b.today! > 0 ? 'up' : 'down') : 'none'}
              style={
                {
                  left: 0,
                  top: 0,
                  width: d,
                  height: d,
                  transform: `translate(${(p.x - orbit.r).toFixed(1)}px, ${(p.y - orbit.r).toFixed(1)}px)`,
                  '--mt-fs': `${Math.max(10, Math.min(13, orbit.r / 3.6)).toFixed(1)}px`,
                } as CSSProperties
              }
              aria-label={aria}
              title={aria}
            >
              {pulses[b.id] ? <span key={pulses[b.id]} className="mt-bub__ring mt-bub__ring--ghost" aria-hidden="true" /> : null}
              <span className="mt-bub__in" aria-hidden="true">
                <span className="mt-bub__name mt-bub__name--tiny mt-bub__name--ghost">{b.short ?? b.label}</span>
                {moveText && <span className="mt-bub__move">{moveText}</span>}
              </span>
            </a>
          );
        })}
    </div>
  );
}

/** Rings for new trades: bubble id → a counter that goes up with each trade in one of its securities. */
export function usePulses(
  trades: { id?: string; date: number; securityIdentifier: string; price: number }[] | undefined,
  bubbles: Bubble[],
): Record<string, number> {
  const seen = useRef<Set<string> | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const owner = useRef(new Map<string, string>());
  useEffect(() => {
    const m = new Map<string, string>();
    for (const b of bubbles) for (const a of b.asins) m.set(a, b.id);
    owner.current = m;
  }, [bubbles]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!trades) return;
    const key = (t: { id?: string; date: number; securityIdentifier: string }) => t.id ?? `${t.date}:${t.securityIdentifier}`;
    if (!seen.current) {
      seen.current = new Set(trades.map(key));
      return;
    }
    const hit: string[] = [];
    for (const t of trades) {
      const k = key(t);
      if (seen.current.has(k)) continue;
      seen.current.add(k);
      const id = owner.current.get(t.securityIdentifier);
      if (id && t.price > 0.01) hit.push(id);
    }
    // Spread the rings over the next seconds (one poll = 15 s) instead of all at once.
    const ids = hit.slice(0, 20);
    ids.forEach((id, n) =>
      window.setTimeout(() => {
        if (alive.current) setPulses((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
      }, (n * 14_000) / Math.max(1, ids.length)),
    );
  }, [trades]);
  return pulses;
}
