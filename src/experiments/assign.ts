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

/** The variant a player is assigned to: same name → same variant, on every device. */
export function assignedVariant(exp: Experiment, username: string): string {
  return exp.variants[hash(`${exp.id}:${username.toLowerCase()}`) % exp.variants.length].id;
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
  /** true: the player picked it (bar or `?variante=`), not the assignment */
  chosen: boolean;
}

/**
 * Which variant to show: after the end the fallback; a valid `?variante=` or a stored own choice wins over
 * the assignment; without the name (still loading) the cached assignment, else undefined.
 */
export function pickVariant(
  exp: Experiment,
  username: string | undefined,
  opts: { override?: string | null; day: string; cached?: string },
): Choice | undefined {
  if (!isRunning(exp, opts.day)) return { variant: exp.fallback, chosen: false };
  const valid = (v?: string | null) => !!v && exp.variants.some((x) => x.id === v);
  if (valid(opts.override)) return { variant: opts.override!, chosen: true };
  if (username) return { variant: assignedVariant(exp, username), chosen: false };
  return valid(opts.cached) ? { variant: opts.cached!, chosen: false } : undefined;
}

/** Local memory of one experiment (per browser): own choice, seen variants, visible time, prompt shown. */
export interface LocalState {
  choice?: string;
  /** last known assignment – lets the page pick its variant before the player's name has loaded */
  assigned?: string;
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
      assigned: typeof v.assigned === 'string' ? v.assigned : undefined,
      seen: Array.isArray(v.seen) ? v.seen.filter((s) => typeof s === 'string') : [],
      dwell: v.dwell && typeof v.dwell === 'object' ? (v.dwell as Record<string, number>) : {},
      prompted: Array.isArray(v.prompted) ? v.prompted.filter((s) => typeof s === 'string') : [],
    };
  } catch {
    return empty;
  }
}

/** After this much visible time on one variant the player is asked (once) for a rating. */
export const PROMPT_AFTER_MS = 3 * 60_000;

export function shouldPrompt(state: LocalState, variant: string, rated: boolean): boolean {
  return !rated && !state.prompted.includes(variant) && (state.dwell[variant] ?? 0) >= PROMPT_AFTER_MS;
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
