import { useSyncExternalStore } from 'react';

// Room taken on the right by a docked panel (chat sidebar). Pages decide their layout by the viewport
// width; with a docked panel their column is narrower, so width queries are shifted by that much.
let inset = 0;
const insetListeners = new Set<() => void>();

/** Sets the width of the docked panel (0 = none). Called by the shell in a layout effect. */
export function setLayoutInset(px: number) {
  if (px === inset) return;
  inset = px;
  insetListeners.forEach((l) => l());
}

/**
 * Same, during the shell's first render: before any page subscribes, so the pages' first render already
 * sees the narrower column (a layout effect alone would come one render late – the page would jump).
 */
export function primeLayoutInset(px: number) {
  if (insetListeners.size === 0) inset = px;
}

/** `(min-width: 1100px)` with 340 px docked → `(min-width: 1440px)`: the page column is what counts. */
export function shiftQuery(query: string, px: number): string {
  if (!px) return query;
  return query.replace(/\((min|max)-width:\s*([\d.]+)px\)/g, (_, kind: string, n: string) => `(${kind}-width: ${+n + px}px)`);
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      let mq = window.matchMedia(shiftQuery(query, inset));
      mq.addEventListener('change', cb);
      const onInset = () => {
        mq.removeEventListener('change', cb);
        mq = window.matchMedia(shiftQuery(query, inset));
        mq.addEventListener('change', cb);
        cb();
      };
      insetListeners.add(onInset);
      return () => {
        mq.removeEventListener('change', cb);
        insetListeners.delete(onInset);
      };
    },
    () => window.matchMedia(shiftQuery(query, inset)).matches,
    () => false,
  );
}

/** Below 720 px the design system switches to the phone layout (BottomNav, Sheet from below). */
export const useIsPhone = () => useMediaQuery('(max-width: 719.98px)');

/** The viewport itself, unshifted (the shell decides whether a panel can dock at all). */
export function useViewportQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
