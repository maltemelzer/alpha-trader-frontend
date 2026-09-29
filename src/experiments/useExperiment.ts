// Which variant this player sees, the browser's memory of the experiment, and the usage figures.
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from 'react';
import { useSearchParams } from 'react-router';
import { useMe } from '../api/queries';
import { useNow } from '../lib/useNow';
import { sendUsage, useMyFeedback } from './api';
import { assignedVariant, clickTarget, isRunning, localDay, parseLocal, pickVariant, tourOrder, type Choice, type LocalState } from './assign';
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
  mode: 'compare' | 'ab';
  /** undefined while name or own ratings load (and nothing was shown before) */
  choice?: Choice;
  /** compare: this player's order of the variants · ab: the registry order */
  order: string[];
  /** variants this player has rated (server; empty while it cannot be reached) */
  rated: string[];
  favorite: string | null;
  /** ab: the variant fixed by name */
  assigned?: string;
  running: boolean;
  local: LocalState;
  /** show another variant (null = back to the automatic one: next in the tour, favourite, assignment) */
  choose: (variant: string | null) => void;
}

/**
 * The variant of experiment `id` for this player. `?variante=<id>` in the URL picks one and is remembered
 * (then removed from the URL); the bar switches through `choose`. `url: false` for readers outside the page.
 */
export function useExperiment(id: string, { url = true }: { url?: boolean } = {}): ExperimentState {
  const exp = experimentOf(id);
  if (!exp) throw new Error(`unknown experiment ${id}`);
  const mode = exp.mode ?? 'compare';
  const me = useMe();
  const username = me.data?.username;
  const day = localDay(useNow(10 * 60_000));
  const running = isRunning(exp, day);
  const local = useLocal(id);
  const mine = useMyFeedback(id, running);
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

  // Without the service the tour cannot know what was rated – it starts at the first variant then.
  const rated = useMemo(() => mine.data?.ratings.map((r) => r.variant) ?? (mine.isError ? [] : undefined), [mine.data, mine.isError]);
  const favorite = mine.data?.favorite ?? null;
  const choice = pickVariant(exp, username, { override: fromUrl ?? local.choice, day, cached: local.last, rated, favorite });

  // Remember what was picked automatically, so the next load shows it before name and ratings arrive.
  const auto = choice && choice.source !== 'chosen' && choice.source !== 'fallback' && username && rated ? choice.variant : undefined;
  useEffect(() => {
    if (auto && local.last !== auto) updateLocal(id, (s) => ({ ...s, last: auto }));
  }, [auto, local.last, id]);

  const choose = useCallback((variant: string | null) => updateLocal(id, (s) => ({ ...s, choice: variant ?? undefined })), [id]);
  const order = useMemo(() => (username && mode === 'compare' ? tourOrder(exp, username) : exp.variants.map((v) => v.id)), [exp, username, mode]);
  return {
    exp,
    mode,
    running,
    local,
    choose,
    order,
    rated: rated ?? [],
    favorite,
    choice,
    assigned: username && mode === 'ab' ? assignedVariant(exp, username) : undefined,
  };
}

// ---------- usage figures (only with consent) ----------

const CONSENT_KEY = 'at.exp.usage';

/** Did the player agree to count usage (visits, visible time, click targets)? Off until they switch it on. */
export function usageConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'ja';
  } catch {
    return false;
  }
}

export function setUsageConsent(on: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, on ? 'ja' : 'nein');
  } catch {
    /* storage unavailable – stays off */
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function useUsageConsent(): boolean {
  return useSyncExternalStore(subscribe, usageConsent);
}

const FLUSH_MS = 60_000;
const LOCAL_TICK_MS = 15_000;

/**
 * Counts, per variant: a visit, the time the page was visible, clicks on links/`data-track` inside `ref`.
 * Sent every minute and when the tab is hidden – only if the player agreed (`usageConsent`). The visible
 * time also goes to local memory, where it only decides when to ask for a rating.
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
      pending.current = { visit: false, dwellMs: 0, clicks: {} };
      // Without consent nothing leaves the browser; the visible time above only drives the rating prompt.
      if (!usageConsent()) return;
      if (!p.visit && p.dwellMs < 1000 && !Object.keys(p.clicks).length) return;
      sendUsage({ experiment: expId, variant, ...p });
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
