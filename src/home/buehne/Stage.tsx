// The stage's backdrop: the lead security's trades as a large step line with every trade as a dot (new ones
// ring in as they arrive), the main rate for the tender, and the market's pace as quiet bars along the floor.
// Own SVG instead of Plotly: it is a drawn stage with its own motion, not a chart to read values from.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useDailyHistory, useInterestHistory, useTrades } from '../../api/queries';
import type { SecurityOrderLogEntryView } from '../../api/types';
import { DS } from '../../ds';
import { useTradesSince } from './queries';
import { short, span } from '../../lib/format';
import { DAY, HOUR, ago, lastClose, stageGeometry, stagePoints, usableRef, withClose, withoutBlips, type Box, type StagePoint } from './derive';

/** Trades per stage chart (the same cache entry for the chart and the prefetch of the next scene). */
export const STAGE_TRADES = 300;

const NBSP = String.fromCharCode(0xa0);

/** Size of an element, following resizes. */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const priceLabel = (n: number, type?: string) =>
  type === 'BOND' || type === 'REPO' || type === 'SYSTEM_BOND'
    ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`
    : n >= 1e6
      ? `${short(n)}${NBSP}€`
      : DS.format.price(n, type);

interface LineProps {
  points: StagePoint[];
  box: Box;
  /** reference price (last daily close), dashed */
  refPrice?: number;
  refLabel?: string;
  /** colour class of the line: up, down, neutral */
  tone: 'up' | 'down' | 'rate';
  label: (n: number) => string;
  now: number;
  /** changes when a new scene comes on – the line draws itself in again */
  sceneKey: string;
  /** when the scene came on: trades after it ring in */
  since: number;
  title: string;
  /** a trade to single out (the big trade scene) and its label */
  highlight?: { id: string; label: string };
  /** reference price too far away to draw: named at the edge it lies beyond */
  offRef?: number;
}

/** Step line + dots + price labels. Dots that were not there when the scene started ring in. */
function StageLine({ points, box, refPrice, refLabel, tone, label, now, sceneKey, since, title, highlight, offRef }: LineProps) {
  const g = stageGeometry(points, box, refPrice, highlight ? [highlight.id] : []);
  const fresh = new Set(points.filter((p) => p.date > since).map((p) => p.id));
  const [, pr, pb, pl] = box.pad;
  const first = points[0];
  const right = box.width - pr;
  const labelX = right + 12;
  // Hi/lo marks only where they do not collide with the last price's or the close's label.
  const marks = [g.top, g.bottom].filter(
    (v, i, all) =>
      all.indexOf(v) === i && (!g.last || Math.abs(g.yOf(v) - g.last.y) > 20) && (!g.close || Math.abs(g.yOf(v) - g.close.y) > 30),
  );
  const timeY = box.height - pb + 20;
  const hl = highlight ? g.dots.find((d) => d.id === highlight.id) : undefined;
  return (
    <svg className={`buehne-svg buehne-svg--${tone}`} width={box.width} height={box.height} role="img" aria-label={title}>
      {marks.map((v) => (
        <g key={v}>
          <line className="buehne-grid" x1={0} x2={right + 6} y1={g.yOf(v)} y2={g.yOf(v)} />
          <text className="buehne-axis" x={labelX} y={g.yOf(v) + 4}>
            {label(v)}
          </text>
        </g>
      ))}
      {refPrice != null && refPrice > 0 && (
        <g>
          <line className="buehne-ref" x1={pl} x2={right + 6} y1={g.yOf(refPrice)} y2={g.yOf(refPrice)} />
          <text className="buehne-axis buehne-axis--ref" x={right} y={g.yOf(refPrice) - 7} textAnchor="end">
            {refLabel} {label(refPrice)}
          </text>
        </g>
      )}
      {offRef != null && (
        <text className="buehne-axis buehne-axis--ref" x={right} y={offRef > g.top ? 16 : box.height - pb - 8} textAnchor="end">
          {offRef > g.top ? '↑' : '↓'} {refLabel} {label(offRef)}
        </text>
      )}
      {g.gap && <path key={`gap-${sceneKey}`} className="buehne-gap" d={g.gap} />}
      {g.gathered && g.close && g.dots[0] && (
        <text className="buehne-axis buehne-axis--time" x={(g.close.x + g.dots[0].x) / 2 + 10} y={(g.close.y + g.dots[0].y) / 2}>
          {span(points[1].date - points[0].date)} gerafft
        </text>
      )}
      {g.close && (
        <g>
          <circle className="buehne-close" cx={g.close.x} cy={g.close.y} r={5} />
          {/* named on the right axis like the other marks – next to the marker it lay on the line; left out
              where it would collide with the last price */}
          {(!g.last || Math.abs(g.close.y - g.last.y) > 30) && (
            <>
              <line className="buehne-ref" x1={g.close.x} x2={right + 6} y1={g.close.y} y2={g.close.y} />
              <text className="buehne-axis buehne-axis--ref" x={labelX} y={g.close.y + 4}>
                {label(g.close.price)}
              </text>
              {/* „Tagesschluss“ does not fit the right column (72–100 px) */}
              <text className="buehne-axis buehne-axis--ref" x={labelX} y={g.close.y + 18}>
                Schluss
              </text>
            </>
          )}
        </g>
      )}
      <path key={sceneKey} className="buehne-line" d={g.line} pathLength={1} />
      {g.dots.map((d) =>
        !fresh.has(d.id) ? (
          <circle key={d.id} className="buehne-dot" cx={d.x} cy={d.y} r={d.r} />
        ) : (
          <g key={d.id} className="buehne-dot--new">
            <circle className="buehne-ring" cx={d.x} cy={d.y} r={d.r + 10} />
            <circle className="buehne-dot" cx={d.x} cy={d.y} r={d.r} />
          </g>
        ),
      )}
      {hl && (
        <g className="buehne-hl">
          <circle className="buehne-hl__ring" cx={hl.x} cy={hl.y} r={hl.r + 9} />
          <line className="buehne-hl__stem" x1={hl.x} x2={hl.x} y1={hl.y - hl.r - 10} y2={Math.max(14, hl.y - 64)} />
          <text className="buehne-hl__label" x={hl.x} y={Math.max(14, hl.y - 64) - 8} textAnchor={hl.x > right - 120 ? 'end' : 'middle'}>
            {highlight?.label}
          </text>
        </g>
      )}
      {g.last && (
        <g>
          <circle className="buehne-last__pulse" cx={g.last.x} cy={g.last.y} r={6} />
          <circle className="buehne-last" cx={g.last.x} cy={g.last.y} r={5} />
          <text className="buehne-axis buehne-axis--last" x={labelX} y={g.last.y + 5}>
            {label(g.last.price)}
          </text>
        </g>
      )}
      {first && (
        <text className="buehne-axis buehne-axis--time" x={pl} y={timeY}>
          {ago(first.date, now)}
        </text>
      )}
      <text className="buehne-axis buehne-axis--time" x={right} y={timeY} textAnchor="end">
        jetzt
      </text>
    </svg>
  );
}

export interface StageChartProps {
  /** security to draw, or 'rate' for the main rate */
  asin?: string;
  rate?: boolean;
  type?: string;
  /** reference price (e.g. last close) and its label */
  refPrice?: number;
  refLabel?: string;
  /** move shown with the scene: decides the colour of the line */
  change?: number;
  sceneKey: string;
  since: number;
  /** left room kept free for the text overlay (px) */
  inset: number;
  now: number;
  name: string;
  /** shown when there are no trades to draw */
  fallback?: ReactNode;
  highlight?: { id: string; label: string };
  /** draw the last daily close in front of the trades (moves since yesterday) */
  sinceClose?: boolean;
}

/** The backdrop chart of one scene, filling its box. */
export function StageChart({ asin, rate, type, refPrice, refLabel, change, sceneKey, since, inset, now, name, fallback, highlight, sinceClose }: StageChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const size = useSize(box);
  const trades = useTrades(asin ?? '', STAGE_TRADES);
  const history = useInterestHistory(240);
  const closes = useDailyHistory(sinceClose && asin ? asin : '');
  const close = useMemo(() => (sinceClose ? lastClose(closes.data, now) : undefined), [sinceClose, closes.data, now]);
  const earlier = useTradesSince(sinceClose ? asin : undefined, close?.date);

  const points = useMemo((): StagePoint[] => {
    if (rate) {
      const snaps = (history.data ?? [])
        .filter((h) => h.mainInterestRate != null)
        .map((h) => ({ id: String(h.date), date: h.date, price: h.mainInterestRate as number, volume: 0 }))
        .sort((a, b) => a.date - b.date);
      return withoutBlips(snaps).filter((p, i, all) => i === 0 || i === all.length - 1 || p.price !== all[i - 1].price);
    }
    // Moves: every trade since the close (loaded once per scene) plus the polled newest ones.
    const all = [...((earlier.data ?? []) as SecurityOrderLogEntryView[]), ...((trades.data ?? []) as SecurityOrderLogEntryView[])];
    const pts = stagePoints(asin ? all : [], now, close ? Math.max(DAY, now - close.date + HOUR) : DAY);
    return sinceClose ? withClose(pts, close) : pts;
  }, [rate, history.data, asin, trades.data, earlier.data, now, sinceClose, close]);

  const loading = rate ? history.isPending : !!asin && (trades.isPending || (!!sinceClose && (closes.isPending || (!!close && earlier.isPending))));
  // With the close drawn in front, the dashed reference line would say the same twice.
  const hasClose = !!points[0]?.close;
  const shownRef = hasClose ? undefined : usableRef(points, refPrice);
  const offRef = !hasClose && shownRef == null && refPrice != null && refPrice > 0 ? refPrice : undefined;
  const narrow = size.width < 520;
  const b: Box = { width: size.width, height: size.height, pad: [32, narrow ? 72 : 100, 56, inset] };
  const first = points[0]?.price;
  const last = points[points.length - 1]?.price;
  const dir = change ?? (first && last ? last - (refPrice ?? first) : 0);
  const tone = rate ? 'rate' : dir < 0 ? 'down' : 'up';
  const label = rate
    ? (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`
    : (n: number) => priceLabel(n, type);
  const title = rate
    ? `Leitzins der letzten Tage, zuletzt ${last != null ? label(last) : '–'}`
    : `Trades in ${name}: ${points.length} Punkte, zuletzt ${last != null ? label(last) : '–'}`;

  return (
    <div ref={box} className="buehne-chart">
      {loading && size.width > 0 && (
        <div className="buehne-chart__wait" style={{ left: inset }}>
          <DS.Skeleton variant="block" height="100%" />
        </div>
      )}
      {!loading && points.length < 2 && fallback}
      {!loading && size.width > 0 && points.length > 1 && (
        <StageLine points={points} box={b} refPrice={shownRef} offRef={offRef} refLabel={refLabel} tone={tone} label={label} now={now} sceneKey={sceneKey} since={since} title={title} highlight={highlight} />
      )}
    </div>
  );
}

/**
 * A deadline as a clock face on the right of the stage: the ring is one day, the arc the time still left,
 * the time of day in the middle. For dividends, mergers and capital measures – they have no line to draw.
 */
export function ClockStage({ to, now, inset, caption }: { to: number; now: number; inset: number; caption?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(box);
  const free = Math.max(0, width - inset);
  const r = Math.max(40, Math.min(height * 0.34, free * 0.32));
  const cx = inset + free / 2;
  const cy = height * 0.46;
  const left = Math.max(0, Math.min(1, (to - now) / 86_400_000));
  const d = new Date(to);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return (
    <div ref={box} className="buehne-chart buehne-clock">
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <circle className="buehne-clock__ring" cx={cx} cy={cy} r={r} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
            const inner = r - (i % 6 === 0 ? 14 : 7);
            return (
              <line
                key={i}
                className="buehne-clock__tick"
                x1={cx + Math.cos(a) * inner}
                y1={cy + Math.sin(a) * inner}
                x2={cx + Math.cos(a) * (r - 2)}
                y2={cy + Math.sin(a) * (r - 2)}
              />
            );
          })}
          <circle
            className="buehne-clock__arc"
            cx={cx}
            cy={cy}
            r={r}
            pathLength={1}
            strokeDasharray={`${left} 1`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text className="buehne-clock__time" x={cx} y={cy + 6} textAnchor="middle">
            {time}
          </text>
          <text className="buehne-clock__unit" x={cx} y={cy + 34} textAnchor="middle">
            Uhr
          </text>
        </svg>
      )}
      {caption && (
        <p className="buehne-clock__caption" style={{ left: inset, top: cy + r + 20 }}>
          {caption}
        </p>
      )}
    </div>
  );
}

/**
 * The article's own picture when it names no traded security: a sentence from further down as a large
 * quote, and how people react to it.
 */
export function NewsStage({ quote, likes, comments, tags, inset }: { quote?: string; likes: number; comments: number; tags: string[]; inset: number }) {
  return (
    <div className="buehne-chart buehne-news" style={{ left: inset }}>
      <figure className="buehne-quote">
        {quote && (
          <>
            <span className="buehne-quote__mark" aria-hidden="true">
              “
            </span>
            <blockquote>{quote}</blockquote>
          </>
        )}
        <figcaption className="buehne-quote__react">
          <span>
            <b>{likes.toLocaleString('de-DE')}</b> {likes === 1 ? 'Like' : 'Likes'}
          </span>
          <span>
            <b>{comments.toLocaleString('de-DE')}</b> {comments === 1 ? 'Kommentar' : 'Kommentare'}
          </span>
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="buehne-quote__tag">
              #{t}
            </span>
          ))}
        </figcaption>
      </figure>
    </div>
  );
}

/** The market's pace along the floor of every scene, labelled „Markt-Puls“: trades per 20 s over 12 minutes, the running bucket on the right. */
export function PaceFloor({ bars, tall, inset = 0 }: { bars: number[]; tall?: boolean; inset?: number }) {
  const max = Math.max(1, ...bars);
  return (
    <div className={`buehne-pace${tall ? ' buehne-pace--tall' : ''}`} aria-hidden="true" style={tall ? { left: inset } : undefined}>
      {tall ? (
        <span className="buehne-pace__label">Trades je 20 Sek. · letzte 12 Min.</span>
      ) : (
        <span className="buehne-pace__tag">Markt-Puls · Trades je 20 Sek.</span>
      )}
      {bars.map((n, i) => (
        <i key={i} style={{ height: `${Math.max(2, (n / max) * 100)}%` }} className={i === bars.length - 1 ? 'is-now' : undefined} />
      ))}
    </div>
  );
}

/** Ticks once a second while `on` – drives the countdowns without re-rendering the whole page. */
export function useSeconds(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}
