// Pure rules of the experiments: who sees which variant, when to ask for a rating, click targets.
import type { Experiment } from './registry';

/** FNV-1a, 32 bit – stable across browsers and devices, good enough to spread players evenly. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const seed = (exp: Experiment, username: string) => hash(`${exp.id}:${username.toLowerCase()}`);

/** The variant a player is assigned to (mode ab): same name → same variant, on every device. */
export function assignedVariant(exp: Experiment, username: string): string {
  return exp.variants[seed(exp, username) % exp.variants.length].id;
}

/**
 * The order in which a player goes through the variants (mode compare): a rotation, forwards or backwards,
 * picked by name – so no variant is always first (fresh look) or always last (tired look).
 */
export function tourOrder(exp: Experiment, username: string): string[] {
  const ids = exp.variants.map((v) => v.id);
  const h = seed(exp, username);
  const start = h % ids.length;
  const rotated = [...ids.slice(start), ...ids.slice(0, start)];
  return (h >>> 8) & 1 ? [rotated[0], ...rotated.slice(1).reverse()] : rotated;
}

/** The next variant of the tour the player has not rated yet, if any. */
export function nextInTour(order: string[], rated: string[], after?: string): string | undefined {
  const open = order.filter((v) => !rated.includes(v) && v !== after);
  if (!after) return open[0];
  const i = order.indexOf(after);
  return open.find((v) => order.indexOf(v) > i) ?? open[0];
}

/** Is the experiment still running on `day` (JJJJ-MM-TT, local)? */
export function isRunning(exp: Experiment, day: string): boolean {
  return day <= exp.until;
}

export function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Choice {
  variant: string;
  /**
   * chosen: picked in the bar or by `?variante=` · tour: next unrated variant (compare) · favorite: the one the
   * player decided for (compare) · assigned: fixed by name (ab) · fallback: experiment over
   */
  source: 'chosen' | 'tour' | 'favorite' | 'assigned' | 'fallback';
}

/**
 * Which variant to show. After the end the fallback; a valid own choice wins; then (compare) the favourite or
 * the next unrated variant of the tour, (ab) the assignment. While name or ratings load: the variant shown
 * last (`cached`), else undefined.
 */
export function pickVariant(
  exp: Experiment,
  username: string | undefined,
  opts: { override?: string | null; day: string; cached?: string; rated?: string[]; favorite?: string | null },
): Choice | undefined {
  if (!isRunning(exp, opts.day)) return { variant: exp.fallback, source: 'fallback' };
  const valid = (v?: string | null): v is string => !!v && exp.variants.some((x) => x.id === v);
  if (valid(opts.override)) return { variant: opts.override, source: 'chosen' };
  const waiting = () => (valid(opts.cached) ? { variant: opts.cached, source: 'tour' as const } : undefined);
  if (!username) return waiting();
  if (exp.mode === 'ab') return { variant: assignedVariant(exp, username), source: 'assigned' };
  if (valid(opts.favorite)) return { variant: opts.favorite, source: 'favorite' };
  if (!opts.rated) return waiting();
  const order = tourOrder(exp, username);
  return { variant: nextInTour(order, opts.rated) ?? order[0], source: 'tour' };
}

/** Local memory of one experiment (per browser): own choice, seen variants, visible time, prompt shown. */
export interface LocalState {
  choice?: string;
  /** variant picked automatically last time – shown right away while name and ratings load */
  last?: string;
  seen: string[];
  /** visible milliseconds per variant */
  dwell: Record<string, number>;
  /** variants for which the rating prompt was already shown (once each) */
  prompted: string[];
}

export function parseLocal(raw: string | null): LocalState {
  const empty: LocalState = { seen: [], dwell: {}, prompted: [] };
  if (!raw) return empty;
  try {
    const v = JSON.parse(raw) as Partial<LocalState>;
    return {
      choice: typeof v.choice === 'string' ? v.choice : undefined,
      last: typeof v.last === 'string' ? v.last : undefined,
      seen: Array.isArray(v.seen) ? v.seen.filter((s) => typeof s === 'string') : [],
      dwell: v.dwell && typeof v.dwell === 'object' ? (v.dwell as Record<string, number>) : {},
      prompted: Array.isArray(v.prompted) ? v.prompted.filter((s) => typeof s === 'string') : [],
    };
  } catch {
    return empty;
  }
}

/**
 * After this much visible time on one variant the player is asked (once) for a rating: in a tour after a
 * minute (then on to the next), with a fixed variant after three.
 */
export const PROMPT_AFTER_MS = { compare: 60_000, ab: 3 * 60_000 };

export function shouldPrompt(state: LocalState, variant: string, rated: boolean, afterMs: number): boolean {
  return !rated && !state.prompted.includes(variant) && (state.dwell[variant] ?? 0) >= afterMs;
}

/**
 * What a click on the page counts as: `data-track` of the nearest element, else the first path segment of
 * a link (`/wertpapier/ABC` → `/wertpapier`), else nothing. Only these coarse targets leave the browser.
 */
export function clickTarget(track: string | null | undefined, href: string | null | undefined): string | null {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9/_:-]/g, '').slice(0, 60);
  if (track) return clean(track) || null;
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  const first = href.split(/[?#]/)[0].split('/')[1];
  return first ? clean(`/${first}`) : null;
}
