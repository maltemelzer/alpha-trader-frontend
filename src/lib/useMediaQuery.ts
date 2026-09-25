import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
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

/** Below 720 px the design system switches to the phone layout (BottomNav, Sheet from below). */
export const useIsPhone = () => useMediaQuery('(max-width: 719.98px)');
