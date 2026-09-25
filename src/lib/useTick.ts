import { useEffect, useRef, useState } from 'react';

export type Tick = 'up' | 'down' | null;

/**
 * Direction of the last change of `value`, for `ms` after it changed – then null again.
 * Drives the short tint on prices and totals (`.tick--up` / `.tick--down` in layout.css).
 * The first value and a change from or to „unknown“ are no tick.
 */
export function useTick(value: number | null | undefined, ms = 1600): Tick {
  const prev = useRef(value);
  const [tick, setTick] = useState<Tick>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (before == null || value == null || before === value) return;
    setTick(value > before ? 'up' : 'down');
    const t = setTimeout(() => setTick(null), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return tick;
}

/** Class for the element that should light up, e.g. `tickClass(useTick(price))`. */
export const tickClass = (tick: Tick) => (tick ? ` tick--${tick}` : '');
