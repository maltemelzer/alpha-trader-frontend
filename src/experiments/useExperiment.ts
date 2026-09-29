// Which variant this player sees, the browser's memory of the experiment, and the usage figures.
import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { useSearchParams } from 'react-router';
import { useMe } from '../api/queries';
import { useNow } from '../lib/useNow';
import { sendUsage } from './api';
import { assignedVariant, clickTarget, isRunning, localDay, parseLocal, pickVariant, type Choice, type LocalState } from './assign';
import { experimentOf, type Experiment } from './registry';

// ---------- local memory (localStorage `at.exp.<id>`, shared by all hooks of the tab) ----------

const CHANGED = 'at:experiment';
const keyOf = (id: string) => `at.exp.${id}`;
const cache = new Map<string, { raw: string | null; state: LocalState }>();

function read(id: string): LocalState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(keyOf(id));
  } catch {
    /* storage unavailable */
  }
  const hit = cache.get(id);
  if (hit && hit.raw === raw) return hit.state;
  const state = parseLocal(raw);
  cache.set(id, { raw, state });
  return state;
}

export function updateLocal(id: string, fn: (s: LocalState) => LocalState) {
  const next = fn(read(id));
  try {
    localStorage.setItem(keyOf(id), JSON.stringify(next));
  } catch {
    cache.set(id, { raw: null, state: next }); // private window: lives for this page load
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(fn: () => void) {
  window.addEventListener(CHANGED, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(CHANGED, fn);
    window.removeEventListener('storage', fn);
  };
}

function useLocal(id: string): LocalState {
  return useSyncExternalStore(subscribe, () => read(id));
}

// ---------- the variant ----------

export interface ExperimentState {
  exp: Experiment;
  /** undefined while the player's name loads */
  choice?: Choice;
  /** variant the player was assigned to */
  assigned?: string;
  running: boolean;
  local: LocalState;
  /** show another variant (null = back to the assigned one) */
  choose: (variant: string | null) => void;
}

/**
 * The variant of experiment `id` for this player. `?variante=<id>` in the URL picks one and is remembered
 * (then removed from the URL); the bar switches through `choose`. `url: false` for readers outside the page.
 */
export function useExperiment(id: string, { url = true }: { url?: boolean } = {}): ExperimentState {
  const exp = experimentOf(id);
  if (!exp) throw new Error(`unknown experiment ${id}`);
  const me = useMe();
  const username = me.data?.username;
  const day = localDay(useNow(10 * 60_000));
  const local = useLocal(id);
  const [params, setParams] = useSearchParams();
  // Only the page of the experiment reads `?variante=` – the shell must not strip it on other pages.
  const fromUrl = url ? params.get('variante') : null;

  useEffect(() => {
    if (!fromUrl) return;
    if (exp.variants.some((v) => v.id === fromUrl)) updateLocal(id, (s) => ({ ...s, choice: fromUrl }));
    setParams(
      (p) => {
        p.delete('variante');
        return p;
      },
      { replace: true },
    );
  }, [fromUrl, exp, id, setParams]);

  // Remember the assignment, so the next load knows the variant before the name arrives (no layout jump).
  const assigned = username ? assignedVariant(exp, username) : undefined;
  useEffect(() => {
    if (assigned && local.assigned !== assigned) updateLocal(id, (s) => ({ ...s, assigned }));
  }, [assigned, local.assigned, id]);

  const choose = useCallback((variant: string | null) => updateLocal(id, (s) => ({ ...s, choice: variant ?? undefined })), [id]);
  const running = isRunning(exp, day);
  return {
    exp,
    running,
    local,
    choose,
    assigned: assigned ?? local.assigned,
    choice: pickVariant(exp, username, { override: fromUrl ?? local.choice, day, cached: local.assigned }),
  };
}

// ---------- usage figures ----------

const FLUSH_MS = 60_000;
const LOCAL_TICK_MS = 15_000;

/**
 * Counts, per variant: a visit, the time the page was visible, clicks on links/`data-track` inside `ref`.
 * Sent every minute and when the tab is hidden; the visible time also goes to local memory (rating prompt).
 */
export function useExperimentUsage(x: ExperimentState, ref: RefObject<HTMLElement | null>) {
  const variant = x.running ? x.choice?.variant : undefined;
  const expId = x.exp.id;
  const pending = useRef({ visit: false, dwellMs: 0, clicks: {} as Record<string, number> });
  const since = useRef<number | null>(null);

  useEffect(() => {
    if (!variant) return;
    pending.current = { visit: true, dwellMs: 0, clicks: {} };
    since.current = document.visibilityState === 'visible' ? Date.now() : null;
    updateLocal(expId, (s) => (s.seen.includes(variant) ? s : { ...s, seen: [...s.seen, variant] }));

    const collect = () => {
      if (since.current != null) {
        const now = Date.now();
        const ms = now - since.current;
        since.current = document.visibilityState === 'visible' ? now : null;
        pending.current.dwellMs += ms;
        updateLocal(expId, (s) => ({ ...s, dwell: { ...s.dwell, [variant]: (s.dwell[variant] ?? 0) + ms } }));
      }
    };
    const flush = () => {
      collect();
      const p = pending.current;
      if (!p.visit && p.dwellMs < 1000 && !Object.keys(p.clicks).length) return;
      sendUsage({ experiment: expId, variant, ...p });
      pending.current = { visit: false, dwellMs: 0, clicks: {} };
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') since.current = Date.now();
      else flush();
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      const tracked = el?.closest<HTMLElement>('[data-track]');
      const link = el?.closest<HTMLAnchorElement>('a[href]');
      const target = clickTarget(tracked?.dataset.track, link?.getAttribute('href'));
      if (target) pending.current.clicks[target] = (pending.current.clicks[target] ?? 0) + 1;
    };

    const node = ref.current;
    node?.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    const tick = setInterval(collect, LOCAL_TICK_MS);
    const send = setInterval(flush, FLUSH_MS);
    return () => {
      flush();
      node?.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      clearInterval(tick);
      clearInterval(send);
    };
  }, [variant, expId, ref]);
}
