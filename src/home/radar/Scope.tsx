// The radar scope: canvas for the sweep and the echoes (redrawn per frame), SVG for the engraved dial,
// HTML for what can be clicked or read (contacts on the rim, depot in the centre, the echo card).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DS } from '../../ds';
import type { IconName } from '../../../design-system/components';
import {
  angleOf,
  bands,
  CONTACT_LABEL,
  DIAL_MARKS,
  dotSize,
  echoRadius,
  fade,
  GEOM,
  glow,
  hitTest,
  MIN,
  polar,
  pop,
  relTime,
  rimMarks,
  ownRings,
  NEXT_ARC,
  type Contact,
  type ContactKind,
  type RingId,
  type Echo,
  type Placed,
} from './derive';

export const CONTACT_ICON: Record<ContactKind, IconName> = {
  news: 'zeitung',
  chat: 'chat',
  tender: 'uhr',
  capital: 'kalender',
  dividend: 'coin',
  merger: 'organisation',
};

/** One turn of the sweep. */
const SWEEP_MS = 14_000;
/** New echoes of one poll are revealed one by one over this span, so the scope keeps blipping. */
const REVEAL_MS = 14_000;
const TAU = Math.PI * 2;

interface Palette {
  gain: string;
  loss: string;
  flat: string;
  brass: string;
  text: string;
}

function readPalette(el: Element): Palette {
  const s = getComputedStyle(el);
  const v = (n: string) => s.getPropertyValue(n).trim() || 'transparent';
  return { gain: v('--gain'), loss: v('--loss'), flat: v('--unchanged'), brass: v('--brass'), text: v('--text-primary') };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Side length of the square scope: the smaller side of its box. */
function useSquare(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize(Math.floor(Math.min(el.clientWidth, el.clientHeight)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export interface ScopeProps {
  echoes: Echo[];
  own: ReadonlySet<string>;
  contacts: Contact[];
  now: number;
  /** contact highlighted from the list */
  activeContact?: string;
  onContact?: (id: string | undefined) => void;
  /** centre of the scope (depot value) */
  center: ReactNode;
  /** the card for a selected echo */
  renderCard: (echo: Echo, close: () => void) => ReactNode;
  /** one sentence for screen readers */
  summary: string;
  /** true while the hour is still loading (the dial shows it in the core) */
  loading?: boolean;
}

export function Scope({ echoes, own, contacts, now, activeContact, onContact, center, renderCard, summary }: ScopeProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useSquare(box);
  const reduced = useReducedMotion();
  const R = size / 2;
  const bandList = useMemo(() => bands(), []);

  // pinned (click/tap/keyboard) and hovered echo
  const [pinned, setPinned] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const shown = pinned ?? hover;
  // leaving the dot for its card must not close the card: clearing the hover waits a moment
  const leave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverTo = useCallback((key: string | null) => {
    clearTimeout(leave.current);
    if (key) setHover(key);
    else leave.current = setTimeout(() => setHover(null), 300);
  }, []);
  useEffect(() => () => clearTimeout(leave.current), []);
  const placedRef = useRef<Placed[]>([]);

  // reveal: echoes that arrive after the first data are shown one by one
  const reveal = useRef(new Map<string, number>());
  const primed = useRef(false);
  const newest = useRef(0);
  useEffect(() => {
    const map = reveal.current;
    const t0 = performance.now();
    const initial = !primed.current;
    if (echoes.length) primed.current = true;
    // only trades newer than anything seen before blip in; back-filled older ones (the hour loading) just appear
    const fresh = echoes.filter((e) => !map.has(e.key));
    const live = initial || reduced ? [] : fresh.filter((e) => e.t > newest.current).sort((a, b) => a.t - b.t);
    for (const e of fresh) map.set(e.key, -Infinity);
    live.forEach((e, i) => map.set(e.key, t0 + (i * REVEAL_MS) / live.length));
    for (const e of echoes) newest.current = Math.max(newest.current, e.t);
  }, [echoes, reduced]);

  // the drawing loop
  const [focus, setFocus] = useState<RingId | null>(null);
  const rings = useMemo(() => ownRings(echoes, own), [echoes, own]);
  const state = useRef({ echoes, own, shown, rings, focus });
  useLayoutEffect(() => {
    state.current = { echoes, own, shown, rings, focus };
  }, [echoes, own, shown, rings, focus]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let palette = readPalette(c);
    let paletteAt = 0;
    let raf = 0;
    let last = 0;
    const start = performance.now();

    const draw = (t: number) => {
      const { echoes: list, own: mine, shown: sel, rings: ringed, focus: only } = state.current;
      if (t - paletteAt > 1000) {
        palette = readPalette(c);
        paletteAt = t;
      }
      const wall = Date.now();
      const cx = size / 2;
      const cy = size / 2;
      const r0 = (size / 2) * 0.985;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const sweep = reduced ? 0 : (((t - start) / SWEEP_MS) * TAU) % TAU;
      const inner = r0 * GEOM.core;
      const outer = r0 * GEOM.outer;

      // afterglow of the sweep: stepped wedges (flat, no gradient)
      if (!reduced) {
        const steps = 10;
        const width = Math.PI / 2 / steps;
        for (let i = 0; i < steps; i++) {
          const a1 = sweep - i * width;
          const a0 = a1 - width;
          ctx.globalAlpha = 0.085 * (1 - i / steps);
          ctx.fillStyle = palette.brass;
          ctx.beginPath();
          ctx.arc(cx, cy, outer, a0 - Math.PI / 2, a1 - Math.PI / 2);
          ctx.arc(cx, cy, inner, a1 - Math.PI / 2, a0 - Math.PI / 2, true);
          ctx.closePath();
          ctx.fill();
        }
        const p0 = polar(cx, cy, inner, sweep);
        const p1 = polar(cx, cy, outer, sweep);
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = palette.brass;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // echoes, oldest first so the newest lie on top
      const unit = Math.max(size / 640, 0.62);
      const placed: Placed[] = [];
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        const shownAt = reveal.current.get(e.key) ?? -Infinity;
        const since = t - shownAt;
        if (since < 0) continue;
        const a = angleOf(e.t, wall);
        const p = polar(cx, cy, echoRadius(e, bandList) * r0, a);
        const base = dotSize(e.volume, unit);
        const scale = reduced || !Number.isFinite(shownAt) ? 1 : pop(since);
        const r = base * scale;
        const g = reduced ? 0 : glow(a, sweep);
        const dim = only != null && e.ring !== only;
        const flat = e.change == null || e.change === 0;
        // unchanged echoes step back so ▲/▼ and the biggest stand out
        const alpha = Math.min(1, fade(wall - e.t) * (0.72 + 0.28 * g) + 0.35 * g) * (dim ? 0.12 : flat ? 0.5 : 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = flat ? palette.flat : e.change! > 0 ? palette.gain : palette.loss;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        if (mine.has(e.asin) && !dim) {
          // own papers: a thin ring on the biggest echo of each, a brass point in the others
          ctx.globalAlpha = Math.max(alpha, 0.7);
          if (ringed.has(e.key)) {
            ctx.strokeStyle = palette.brass;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 2.5, 0, TAU);
            ctx.stroke();
          } else {
            ctx.fillStyle = palette.brass;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.min(1.6, r * 0.45), 0, TAU);
            ctx.fill();
          }
        }
        // ripple of a fresh echo
        if (!reduced && !dim && Number.isFinite(shownAt) && since < 1400) {
          const x = since / 1400;
          ctx.globalAlpha = 0.6 * (1 - x);
          ctx.strokeStyle = palette.brass;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, base + 3 + x * 18 * unit, 0, TAU);
          ctx.stroke();
        }
        if (sel === e.key) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = palette.text;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, base + 5, 0, TAU);
          ctx.stroke();
        }
        if (!dim) placed.push({ echo: e, x: p.x, y: p.y, r: base });
      }
      ctx.globalAlpha = 1;
      placedRef.current = placed;
    };

    const loop = (t: number) => {
      // ~30 frames a second are plenty for a slow sweep
      if (t - last > 32) {
        draw(t);
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    if (reduced) {
      draw(performance.now());
      const id = setInterval(() => draw(performance.now()), 2000);
      return () => clearInterval(id);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, reduced, bandList]);

  const at = useCallback((ev: React.PointerEvent | React.MouseEvent) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return null;
    return hitTest(placedRef.current, ev.clientX - rect.left, ev.clientY - rect.top, 'pointerType' in ev && ev.pointerType === 'touch' ? 14 : 6);
  }, []);

  const byKey = useMemo(() => new Map(echoes.map((e) => [e.key, e])), [echoes]);
  const selected = shown ? byKey.get(shown) : undefined;
  const selPos = selected && polar(R, R, echoRadius(selected, bandList) * R * 0.985, angleOf(selected.t, now));

  // keyboard: ←/→ walk through the biggest echoes, Esc closes
  const ranked = useMemo(
    () => echoes.filter((e) => !focus || e.ring === focus).sort((a, b) => b.volume - a.volume).slice(0, 40),
    [echoes, focus],
  );
  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Escape') {
      if (!pinned) setFocus(null);
      setPinned(null);
      return;
    }
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const i = ranked.findIndex((e) => e.key === pinned);
    const next = ev.key === 'ArrowRight' ? i + 1 : i <= 0 ? ranked.length - 1 : i - 1;
    setPinned(ranked[next % Math.max(ranked.length, 1)]?.key ?? null);
  };

  // contacts on the rim
  const rimR = R * GEOM.rim * 0.985;
  const rim = useMemo(() => rimMarks(contacts, now).map((m) => ({ c: m.items[0], all: m.items, a: m.a, next: m.next })), [contacts, now]);
  const nextCount = rim.filter((m) => m.next).length;

  const cardStyle = (() => {
    if (!selPos || !size) return undefined;
    const w = Math.min(260, size - 16);
    const left = Math.min(Math.max(selPos.x - w / 2, 8), size - w - 8);
    const below = selPos.y < size / 2;
    return below
      ? { left, top: Math.min(selPos.y + 14, size - 8), width: w }
      : { left, bottom: Math.min(size - selPos.y + 14, size - 8), width: w };
  })();

  return (
    <div className="radar-scope" ref={box}>
      <div className="radar-scope__square" style={{ width: size, height: size }}>
        <Dial size={size} bandList={bandList} nextCount={nextCount} />
        <canvas
          ref={canvas}
          className="radar-scope__canvas"
          style={{ width: size, height: size }}
          tabIndex={0}
          role="img"
          aria-label={`${summary} Pfeiltasten gehen die größten Echos durch.`}
          onKeyDown={onKey}
          onPointerMove={(ev) => {
            if (ev.pointerType !== 'mouse') return;
            const hit = at(ev);
            hoverTo(hit?.echo.key ?? null);
            (ev.currentTarget as HTMLElement).style.cursor = hit ? 'pointer' : '';
          }}
          onPointerLeave={() => hoverTo(null)}
          onClick={(ev) => {
            const hit = at(ev);
            setPinned(hit ? (hit.echo.key === pinned ? null : hit.echo.key) : null);
          }}
        />
        <div className="radar-core" style={{ width: R * GEOM.core * 2 * 0.9, height: R * GEOM.core * 2 * 0.9 }}>
          {center}
        </div>
        {size > 0 &&
          // on a small scope the thin inner rings leave no room: only „Aktien“, the legend names the rest
          bandList.filter((b) => size >= 460 || b.id === 'stock').map((b) => (
            <button
              key={b.id}
              type="button"
              className={`radar-ringlabel${focus === b.id ? ' is-on' : ''}${focus && focus !== b.id ? ' is-off' : ''}`}
              style={{ left: R + 6, top: R - R * 0.985 * (b.inner + 0.024) }}
              aria-pressed={focus === b.id}
              title={focus === b.id ? 'Wieder alle Klassen zeigen' : `Nur ${b.label} zeigen`}
              onClick={() => {
                setFocus(focus === b.id ? null : b.id);
                setPinned(null);
              }}
            >
              {b.short}
            </button>
          ))}
        {rim.map(({ c, all, a, next }) => {
          const p = polar(R, R, rimR, a);
          const future = next;
          const active = all.some((x) => x.id === activeContact);
          const names = all.map((x) => x.title).join('\n');
          return (
            <Link
              key={c.id}
              to={c.href}
              className={`radar-blip${future ? ' radar-blip--future' : ''}${c.urgent ? ' radar-blip--urgent' : ''}${active ? ' is-active' : ''}`}
              style={{ left: p.x, top: p.y }}
              aria-label={`${CONTACT_LABEL[c.kind]}${all.length > 1 ? ` (${all.length})` : ''}: ${all.map((x) => x.title).join(', ')}, ${relTime(c.t, now)}`}
              title={`${CONTACT_LABEL[c.kind]} · ${relTime(c.t, now)}\n${names}`}
              onPointerEnter={() => onContact?.(c.id)}
              onPointerLeave={() => onContact?.(undefined)}
              onFocus={() => onContact?.(c.id)}
              onBlur={() => onContact?.(undefined)}
            >
              <DS.Icon name={CONTACT_ICON[c.kind]} size={14} />
              {all.length > 1 && <span className="radar-blip__count">{all.length}</span>}
            </Link>
          );
        })}
        {selected && cardStyle && (
          <div
            className="radar-card"
            style={cardStyle}
            onPointerEnter={() => {
              clearTimeout(leave.current);
              if (hover && !pinned) setPinned(hover);
            }}
          >
            {renderCard(selected, () => {
              setPinned(null);
              setHover(null);
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** The engraved dial: rings, minute scale, rim scale. Static per size. */
function Dial({ size, bandList, nextCount }: { size: number; bandList: ReturnType<typeof bands>; nextCount: number }) {
  if (!size) return null;
  const R = (size / 2) * 0.985;
  const c = size / 2;
  const small = size < 460;
  const ticks = [];
  for (let m = 0; m < 60; m++) {
    const a = angleOf(-m * MIN, 0);
    const long = m % 5 === 0;
    if (m % 15 === 0) continue;
    const p0 = polar(c, c, R * GEOM.outer, a);
    const p1 = polar(c, c, R * (GEOM.outer + (long ? 0.035 : 0.015)), a);
    ticks.push(<line key={`m${m}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} className={long ? 'radar-dial__tick radar-dial__tick--long' : 'radar-dial__tick'} />);
  }
  const minuteLabels = DIAL_MARKS.map((m) => {
    const a = angleOf(-m.min * MIN, 0);
    const p = polar(c, c, R * ((GEOM.outer + GEOM.rim) / 2 + 0.008), a);
    return (
      <text key={m.min} x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className={`radar-dial__label${m.min === 0 ? ' radar-dial__label--now' : ''}`}>
        {m.label}
      </text>
    );
  });
  // the arc of what comes next: clockwise of „jetzt“ on the rim, as long as there are marks
  const arc =
    nextCount > 0
      ? (() => {
          const rr = R * GEOM.rim;
          const a0 = NEXT_ARC.start - NEXT_ARC.step / 2;
          const a1 = NEXT_ARC.start + (nextCount - 0.5) * NEXT_ARC.step;
          const p0 = polar(c, c, rr, a0);
          const p1 = polar(c, c, rr, a1);
          return <path d={`M ${p0.x} ${p0.y} A ${rr} ${rr} 0 0 1 ${p1.x} ${p1.y}`} className="radar-dial__next" />;
        })()
      : null;
  return (
    <svg className="radar-dial" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={R * GEOM.rim} className="radar-dial__rim" />
      {bandList.map((b, i) => (
        <circle key={b.id} cx={c} cy={c} r={R * b.outer} className={i === bandList.length - 1 ? 'radar-dial__edge' : 'radar-dial__ring'} />
      ))}
      <circle cx={c} cy={c} r={R * GEOM.core} className="radar-dial__edge" />
      {/* „jetzt“: the fixed line at 12 o'clock */}
      <line x1={c} y1={c - R * GEOM.core} x2={c} y2={c - R * GEOM.outer} className="radar-dial__now" />
      {ticks}
      {minuteLabels}
      {arc}
      {nextCount > 0 && (
        <text x={c - 10} y={c - R * GEOM.rim + 2} dy="-0.45em" textAnchor="end" className="radar-dial__rimlabel">
          {small ? 'kommt ▸' : 'als Nächstes ▸'}
        </text>
      )}
    </svg>
  );
}

