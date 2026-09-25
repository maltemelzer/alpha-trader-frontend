import { useSyncExternalStore } from 'react';

// Whether the chat sidebar is open – a per-viewer convenience, kept in this browser.
const KEY = 'at.chatSidebar';
/** Width of the docked sidebar. At 1440 px the page column keeps 1100 px – the desktop layouts still fit. */
export const CHAT_SIDEBAR_WIDTH = 340;
/** Below this viewport width the sidebar does not dock (the page column would get too narrow). */
export const CHAT_SIDEBAR_MIN_VIEWPORT = 1200;

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let open = read();

export function setChatSidebarOpen(next: boolean) {
  if (next === open) return;
  open = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    /* private mode – stays open for this page only */
  }
  listeners.forEach((l) => l());
}

export function useChatSidebarOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      // Another tab toggled it.
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          open = read();
          cb();
        }
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', onStorage);
      };
    },
    () => open,
    () => false,
  );
}

/** Where the sidebar can dock: desktop width, and not on the chat page itself (it is the full chat). */
export function sidebarDocks(pathname: string, wideViewport: boolean): boolean {
  return wideViewport && !(pathname === '/nachrichten' || pathname.startsWith('/nachrichten/'));
}

/** Keyboard shortcut „C“ – not while typing and not with modifier keys. */
export function isChatShortcut(e: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'target'>): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'c' && e.key !== 'C')) return false;
  const t = e.target as HTMLElement | null;
  if (!t || typeof t.closest !== 'function') return true;
  return !t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]');
}
