import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DS } from '../ds';
import { listingQuery, useListings, useRecentTrades } from '../api/queries';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import { tradesPerMinute, typeOfAsin, waiting, withTicks, type TapeTrade } from './tape';
import './MarketTape.css';

/** Pixels per second – slow enough to read a name while it passes. */
const SPEED = 32;
/** Items shown at once when motion is reduced. */
const STATIC = 12;
/** How long the next trade may wait for its name before it enters with its ASIN. */
const NAME_WAIT = 3_000;
const PAUSE_KEY = 'at:tape-paused';

const readPaused = () => {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Börsenband under the header: the market's trades pass by slowly, right to left, each with its
 * move against the previous trade of the same security. There are more trades than a calm band
 * can carry, so only the newest wait; the band stays near „now“. Pointer or focus on the band
 * stops it, the Live button pauses it for good. With reduced motion the newest trades stand still.
 */
export function MarketTape() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const onLinkClick = useInternalLinks();
  const qc = useQueryClient();
  const trades = useRecentTrades();
  const all = useMemo(() => withTicks(trades.data ?? []), [trades.data]);
  const perMinute = useMemo(() => tradesPerMinute(all, trades.dataUpdatedAt), [all, trades.dataUpdatedAt]);

  const [paused, setPaused] = useState(readPaused);
  const [held, setHeld] = useState(false);
  const [shown, setShown] = useState<TapeTrade[]>([]);
  const seen = useRef(new Set<string>());
  const queue = useRef<TapeTrade[]>([]);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const offset = useRef(0);
  // Width of items taken off at the left; the offset gives it back when React has removed them.
  const shift = useRef(0);
  const busy = useRef(false);
  // Set once the first items are in; before that the loop must not append (they would be overwritten).
  const filled = useRef(false);
  const stopped = useRef(false);
  useEffect(() => {
    stopped.current = paused || held;
  }, [paused, held]);

  // New trades wait in the queue; the first ones fill the band right away.
  useEffect(() => {
    const ids = new Set(all.map((t) => t.id));
    seen.current = new Set([...seen.current].filter((id) => ids.has(id)));
    queue.current = waiting(all, seen.current);
    // Names load before a trade enters: a name arriving later would widen a visible item and jolt the band.
    for (const asin of new Set(queue.current.map((t) => t.asin))) void qc.prefetchQuery(listingQuery(asin));
    if (seen.current.size === 0 && queue.current.length) {
      const first = queue.current.splice(0, 10);
      first.forEach((t) => seen.current.add(t.id));
      // Fill once the names are there (or after NAME_WAIT), so the first items do not widen in view.
      const names = Promise.allSettled(first.map((t) => qc.prefetchQuery(listingQuery(t.asin))));
      void Promise.race([names, new Promise((r) => setTimeout(r, NAME_WAIT))]).then(() => {
        filled.current = true;
        setShown(first);
      });
    }
  }, [all, qc]);

  useLayoutEffect(() => {
    offset.current -= shift.current;
    shift.current = 0;
    busy.current = false;
    if (track.current) track.current.style.transform = `translate3d(${-offset.current}px,0,0)`;
  }, [shown]);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let waitingSince = 0;
    const nameReady = (asin: string) => {
      const q = qc.getQueryState(listingQuery(asin).queryKey);
      return q?.status === 'success' || q?.status === 'error';
    };
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const vp = viewport.current;
      const tr = track.current;
      if (vp && tr && filled.current && !stopped.current && !busy.current) {
        // Content still hidden on the right: append the next trade before it runs out,
        // and slow down when nothing is waiting, so the band does not run empty.
        const room = tr.scrollWidth - offset.current - vp.clientWidth;
        const head = queue.current[0];
        if (room < 80 && head && !nameReady(head.asin) && !waitingSince) waitingSince = now;
        if (room < 80 && head && (nameReady(head.asin) || now - waitingSince > NAME_WAIT)) {
          waitingSince = 0;
          const next = queue.current.shift()!;
          seen.current.add(next.id);
          busy.current = true;
          setShown((s) => [...s, next]);
        }
        offset.current += SPEED * Math.min(1, Math.max(0.1, (room + 60) / 180)) * dt;
        // Exact (fractional) width: offsetWidth rounds, and the rounding would show as a small step.
        const firstWidth = (tr.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
        if (!busy.current && firstWidth && offset.current > firstWidth) {
          shift.current = firstWidth;
          busy.current = true;
          setShown((s) => s.slice(1));
        }
        tr.style.transform = `translate3d(${-offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, qc]);

  const items = reduced ? all.slice(0, STATIC) : shown;
  const asins = useMemo(() => [...new Set(items.map((t) => t.asin))], [items]);
  const listings = useListings(asins);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(PAUSE_KEY, next ? '1' : '0');
    } catch {
      /* private mode – only for this visit */
    }
  };

  // The band keeps its height from the start; it only fills when the first trades are there.
  return (
    <section className={`tape${reduced ? ' tape--static' : ''}`} aria-label="Börsenband: laufende Trades">
      <button
        type="button"
        className="tape__live"
        onClick={togglePause}
        aria-pressed={!paused}
        title={paused ? 'Börsenband fortsetzen' : 'Börsenband anhalten'}
      >
        <span className={`tape__dot${paused ? ' is-paused' : ''}`} aria-hidden="true" />
        <span className="tape__rate">
          <span className="tape__num">{trades.data ? perMinute.toLocaleString('de-DE') : '–'}</span>
          <span className="tape__unit"> Trades/min</span>
        </span>
      </button>
      <div
        className="tape__viewport"
        ref={viewport}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        onClick={onLinkClick}
      >
        <ul className="tape__track" ref={track}>
          {items.map((t) => (
            <TapeItem key={t.id} trade={t} name={listings[t.asin]?.name} type={listings[t.asin]?.type ?? typeOfAsin(t.asin)} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TapeItem({ trade: t, name, type }: { trade: TapeTrade; name?: string; type?: string }) {
  const time = new Date(t.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <li className="tape__item">
      <a href={`/wertpapier/${t.asin}`} title={`${t.count > 1 ? `${t.count} Trades · ` : ''}${t.shares.toLocaleString('de-DE')} Stück · ${time} Uhr`}>
        {name ? <span className="tape__name">{name}</span> : <span className="tape__asin">{t.asin}</span>}
        <span className="tape__px">{DS.format.price(t.price, type)}</span>
        {t.count > 1 && <span className="tape__count">×{t.count}</span>}
        {t.change != null && Math.abs(t.change) >= 0.005 && <DS.PriceChange value={t.change} size="sm" />}
      </a>
    </li>
  );
}
