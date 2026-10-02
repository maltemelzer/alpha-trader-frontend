// „Mein Tag“ – the timeline. Wide: one axis, „jetzt“ in the middle-right, what happened since the last visit to
// the left (the stretch since the visit tinted), what comes to the right; labels in lanes above and below.
// On load the day unrolls from „jetzt“ outwards; afterwards everything drifts left with the clock and new
// events glide in at „jetzt“. Phone: the same events as a vertical list.
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DS } from '../../ds';
import { relTime } from './derive';
import { placeLabels, ticks, xOf, type DayEvent, type EventKind, type Scale } from './events';

type IconName = Parameters<typeof DS.Icon>[0]['name'];

export const EVENT_ICON: Record<EventKind, IconName> = {
  fill: 'orders',
  cash: 'bank',
  news: 'zeitung',
  chat: 'chat',
  forum: 'community',
  poll: 'haken',
  maturity: 'anleihe',
  expiry: 'uhr',
  capital: 'kalender',
  dividend: 'kalender',
  merger: 'kalender',
};

/** Height of one lane of labels and of a label itself, px. */
const LANE_H = 52;
const LABEL_H = 46;
/** Gap between the axis and the first lane. */
const AXIS_GAP = 12;

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

/**
 * What was there when the data first arrived unrolls with the intro; whatever comes later is new and glides
 * in at „jetzt“ (it keeps that class, so a re-render never restarts its animation).
 */
function useArrivals(ids: string[], ready: boolean) {
  const [first, setFirst] = useState<Set<string> | null>(null);
  if (ready && !first) setFirst(new Set(ids));
  const arriving = new Set(first ? ids.filter((id) => !first.has(id)) : []);
  return { intro: first, arriving };
}

/** „18:40“, „gestern 18:40“, „Mo. 18:40“. */
export function clockText(ms: number, now: number): string {
  const d = new Date(ms);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const day = (t: number) => new Date(t).toDateString();
  if (day(ms) === day(now)) return time;
  if (day(ms) === day(now - 86_400_000)) return `gestern ${time}`;
  if (day(ms) === day(now + 86_400_000)) return `morgen ${time}`;
  return `${d.toLocaleDateString('de-DE', { weekday: 'short' })} ${time}`;
}

/** Money with direction, neutral colour – cash flows are no price moves. */
export function Flow({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) return null;
  return (
    <span className="tl-flow">
      <span aria-hidden="true">{value > 0 ? '▲ ' : '▼ '}</span>
      <DS.Amount value={value} signed compact="auto" />
    </span>
  );
}

interface Props {
  events: DayEvent[];
  scale: Scale;
  lastVisit?: number;
  loading: boolean;
  empty: ReactNode;
}

export function Timeline({ events, scale, lastVisit, loading, empty }: Props) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const now = scale.now;
  const px = (t: number) => xOf(scale, t) * w;
  const nowPx = scale.nowX * w;
  const mid = Math.round(h / 2);
  const labelW = w < 760 ? 168 : 196;
  const lanes = Math.max(1, Math.min(3, Math.floor((h / 2 - AXIS_GAP - 4) / LANE_H)));
  const isFresh = (e: DayEvent) => !!lastVisit && e.at > lastVisit && e.at <= now;
  const { placed, dots } = useMemo(
    () => (w ? placeLabels(events, (t) => xOf(scale, t) * w, w, { lanes, labelW, nowPx: scale.nowX * w, boost: (e) => (lastVisit && e.at > lastVisit && e.at <= scale.now ? 0.25 : 0) }) : { placed: [], dots: [] }),
    [events, scale, w, lanes, labelW, lastVisit],
  );
  const labelled = new Set(placed.map((p) => p.ev.id));
  const { intro, arriving } = useArrivals(
    events.map((e) => e.id),
    !loading && w > 0,
  );
  const tickList = w ? ticks(scale, w) : [];
  const visitPx = lastVisit && lastVisit >= scale.from ? px(lastVisit) : undefined;
  // intro delay: by distance from „jetzt“, the day unrolls outwards
  const delay = (x: number) => (intro ? `${Math.round((Math.abs(x - nowPx) / Math.max(w, 1)) * 1100)}ms` : '0ms');
  const anim = (id: string, x: number): { className: string; style: CSSProperties } =>
    arriving.has(id)
      ? { className: ' tl--arrive', style: { '--tl-from': `${nowPx - x}px` } as CSSProperties }
      : { className: '', style: { '--tl-d': delay(x) } as CSSProperties };
  const labelTop = (lane: number) =>
    lane > 0 ? mid + AXIS_GAP + (lane - 1) * LANE_H : mid - AXIS_GAP - LABEL_H - (-lane - 1) * LANE_H;
  const pastCount = events.filter((e) => e.at <= now).length;
  const newCount = events.filter(isFresh).length;
  const nextCount = events.length - pastCount;

  return (
    <section className="tl" aria-label="Dein Tag">
      <div className="tl__head">
        <h2 className="tl__side">
          {lastVisit ? 'Seit deinem Besuch' : 'Zuletzt'}
          {!loading && <span className="tl__count">{lastVisit ? newCount : pastCount}</span>}
          <span className="tl__hint">{lastVisit ? clockText(lastVisit, now) : ' '}</span>
        </h2>
        <h2 className="tl__side tl__side--next">
          Als Nächstes
          {!loading && <span className="tl__count">{nextCount}</span>}
        </h2>
      </div>
      <div className={`tl__plot${intro ? ' tl__plot--on' : ''}`} ref={ref}>
        {w > 0 && (
          <svg className="tl__svg" width={w} height={h} aria-hidden="true">
            {visitPx != null && <rect className="tl__new" x={visitPx} y={0} width={Math.max(0, nowPx - visitPx)} height={h} />}
            {tickList.map((t) => (
              <line key={t.label} className="tl__grid" x1={t.x} x2={t.x} y1={0} y2={h} />
            ))}
            <line className="tl__axis tl__axis--past" x1={nowPx} x2={0} y1={mid} y2={mid} pathLength={1} />
            <line className="tl__axis tl__axis--next" x1={nowPx} x2={w} y1={mid} y2={mid} pathLength={1} />
            {placed.map((p) => {
              const top = labelTop(p.lane);
              const y2 = p.lane > 0 ? top : top + LABEL_H;
              const a = anim(p.ev.id, p.x);
              return <line key={`c-${p.ev.id}`} className={`tl__stem${a.className}`} style={{ ...a.style, '--tl-x': `${p.x}px` } as CSSProperties} x1={p.x} x2={p.x} y1={mid} y2={y2} />;
            })}
            {dots.map(({ ev, x }) => {
              const a = anim(ev.id, x);
              const future = ev.at > now;
              const cls = `tl__dot${future ? ' tl__dot--next' : ''}${isFresh(ev) ? ' tl__dot--fresh' : ''}${labelled.has(ev.id) ? '' : ' tl__dot--quiet'}${a.className}`;
              return future ? (
                <rect key={`d-${ev.id}`} className={cls} style={{ ...a.style, '--tl-x': `${x}px` } as CSSProperties} x={x - 4} y={mid - 4} width={8} height={8} transform={`rotate(45 ${x} ${mid})`} />
              ) : (
                <circle key={`d-${ev.id}`} className={cls} style={{ ...a.style, '--tl-x': `${x}px` } as CSSProperties} cx={x} cy={mid} r={isFresh(ev) ? 5 : 4} />
              );
            })}
            <line className="tl__now" x1={nowPx} x2={nowPx} y1={0} y2={h} />
            <circle className="tl__pulse" cx={nowPx} cy={mid} r={6} />
            <circle className="tl__nowdot" cx={nowPx} cy={mid} r={4} />
          </svg>
        )}
        {w > 0 && (
          <span className="tl__nowlabel" style={{ left: nowPx }}>
            jetzt · {clockText(now, now)}
          </span>
        )}
        {w > 0 && visitPx != null && nowPx - visitPx > 90 && (
          <span className="tl__visit" style={{ left: visitPx }}>
            dein letzter Besuch
          </span>
        )}
        {placed.map((p) => {
          const a = anim(p.ev.id, p.x);
          return (
            <Link
              key={p.ev.id}
              to={p.ev.href}
              className={`tl-ev${p.ev.at > now ? ' tl-ev--next' : ''}${isFresh(p.ev) ? ' tl-ev--fresh' : ''}${p.left < p.x ? ' tl-ev--flip' : ''}${a.className}`}
              style={{ ...a.style, left: p.left, top: labelTop(p.lane), width: labelW } as CSSProperties}
            >
              <span className="tl-ev__top">
                <DS.Icon name={EVENT_ICON[p.ev.kind]} size={14} />
                <span className="tl-ev__when">{relTime(p.ev.at, now)}</span>
                {p.ev.amount != null && <Flow value={p.ev.amount} />}
              </span>
              <span className="tl-ev__title">{p.ev.title}</span>
              {p.ev.detail && <span className="tl-ev__detail">{p.ev.detail}</span>}
            </Link>
          );
        })}
        {w > 0 &&
          dots
            .filter((d) => !labelled.has(d.ev.id))
            .map(({ ev, x }) => (
              <Link key={`q-${ev.id}`} to={ev.href} className="tl-hit" style={{ left: x, top: mid }} title={`${ev.title} · ${relTime(ev.at, now)}`}>
                <span className="bnk-sr">
                  {ev.title}, {relTime(ev.at, now)}
                </span>
              </Link>
            ))}
        {loading && <div className="tl__wait" aria-hidden="true" />}
        {!loading && events.length === 0 && <div className="tl__empty">{empty}</div>}
      </div>
      <div className="tl__ticks" aria-hidden="true">
        {tickList.map((t) => (
          <span key={t.label} style={{ left: t.x }}>
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Upcoming events the phone list shows before „mehr“. */
const NEXT_SHOWN = 3;

/** Phone: the same events as a list – what comes first, then what happened, the last visit as a divider. */
export function TimelineList({ events, now, lastVisit, loading, empty }: { events: DayEvent[]; now: number; lastVisit?: number; loading: boolean; empty: ReactNode }) {
  const [allNext, setAllNext] = useState(false);
  const next = events.filter((e) => e.at > now).sort((a, b) => a.at - b.at);
  const shownNext = allNext ? next : next.slice(0, NEXT_SHOWN);
  const past = events.filter((e) => e.at <= now).sort((a, b) => b.at - a.at);
  const cut = lastVisit ? past.findIndex((e) => e.at <= lastVisit) : -1;
  const item = (e: DayEvent) => (
    <li key={e.id} className={`tlv__item${e.at > now ? ' tlv__item--next' : ''}${lastVisit && e.at > lastVisit && e.at <= now ? ' tlv__item--fresh' : ''}`}>
      <Link to={e.href} className="tlv__link">
        <span className="tlv__icon" aria-hidden="true">
          <DS.Icon name={EVENT_ICON[e.kind]} size={16} />
        </span>
        <span className="tlv__text">
          <span className="tlv__title">{e.title}</span>
          <span className="tlv__detail">
            {relTime(e.at, now)}
            {e.detail ? ` · ${e.detail}` : ''}
          </span>
        </span>
        {e.amount != null && <Flow value={e.amount} />}
      </Link>
    </li>
  );
  if (loading) return <DS.Skeleton variant="rows" rows={6} />;
  if (!events.length) return <div className="tlv__empty">{empty}</div>;
  return (
    <div className="tlv">
      {next.length > 0 && (
        <>
          <h2 className="tlv__head">Als Nächstes</h2>
          <ul className="tlv__list">{shownNext.map(item)}</ul>
          {next.length > NEXT_SHOWN && (
            <DS.Button variant="ghost" size="sm" className="tlv__more" onClick={() => setAllNext((v) => !v)} aria-expanded={allNext}>
              {allNext ? 'Weniger zeigen' : `${next.length - NEXT_SHOWN} weitere anstehende`}
            </DS.Button>
          )}
        </>
      )}
      <p className="tlv__now">
        <span>jetzt · {clockText(now, now)}</span>
      </p>
      {past.length > 0 && (
        <ul className="tlv__list">
          {past.map((e, i) => (
            <Fragment key={e.id}>
              {i === cut && cut > 0 && lastVisit && (
                <li className="tlv__visit" aria-hidden="true">
                  dein letzter Besuch · {clockText(lastVisit, now)}
                </li>
              )}
              {item(e)}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
