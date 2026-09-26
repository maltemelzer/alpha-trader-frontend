import { useSyncExternalStore } from 'react';

/** Keyboard counts as open when it covers more than this much of the layout viewport. */
const KEYBOARD_MIN = 120;

function subscribe(cb: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener('resize', cb);
  vv.addEventListener('scroll', cb);
  return () => {
    vv.removeEventListener('resize', cb);
    vv.removeEventListener('scroll', cb);
  };
}

/** "top:height" of the visible part of the page while an on-screen keyboard covers it, else ''. */
function snapshot() {
  const vv = window.visualViewport;
  if (!vv || window.innerHeight - vv.height <= KEYBOARD_MIN) return '';
  return `${Math.round(vv.offsetTop)}:${Math.round(vv.height)}`;
}

/**
 * The area the on-screen keyboard leaves free (phones). iOS Safari and Chrome on Android shrink only
 * the visual viewport, so a 100dvh layout keeps its composer under the keyboard; a chat pins itself
 * to this box while typing. `null` when no keyboard is open (or `active` is false).
 */
export function useKeyboardViewport(active: boolean): { top: number; height: number } | null {
  const key = useSyncExternalStore(subscribe, snapshot, () => '');
  if (!active || !key) return null;
  const [top, height] = key.split(':').map(Number);
  return { top, height };
}
