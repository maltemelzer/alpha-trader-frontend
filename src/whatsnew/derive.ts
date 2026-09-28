import { htmlToText } from '../lib/html';
import type { UiChange } from './changelog';

// ---------- Engine updates from the newspaper ----------
// The operators post every engine change as „Updates on Alpha-Trader.com (20260928)“: English first,
// then after an <hr> the same in German, each topic under an <h2>.

const ENGINE_TITLE = /^Updates on Alpha-Trader\.com \((\d{4})(\d{2})(\d{2})\)/;

export interface EngineUpdate {
  id: string;
  /** dateCreated in ms – what „seen“ compares */
  date: number;
  /** day from the title, YYYY-MM-DD */
  day: string;
  sections: { heading: string; text: string }[];
}

/** German part of a bilingual post (after the last <hr>), else the whole post. */
export function germanPart(html: string): string {
  const parts = html.split(/<hr\s*\/?>/i);
  return parts.length > 1 ? parts[parts.length - 1] : html;
}

/** Topics of an update: one per <h2>; text before the first heading gets an empty heading. */
export function sections(html: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let last = 0;
  let heading = '';
  const push = (end: number) => {
    const text = htmlToText(html.slice(last, end));
    if (text || heading) out.push({ heading, text });
  };
  for (let m = re.exec(html); m; m = re.exec(html)) {
    push(m.index);
    heading = htmlToText(m[1]);
    last = m.index + m[0].length;
  }
  push(html.length);
  return out;
}

export function engineUpdates(
  posts: { id?: string; title?: string | null; content?: string | null; dateCreated?: number | null }[],
): EngineUpdate[] {
  const out: EngineUpdate[] = [];
  for (const p of posts) {
    const m = p.title ? ENGINE_TITLE.exec(p.title) : null;
    if (!m || !p.id || !p.dateCreated) continue;
    out.push({ id: p.id, date: p.dateCreated, day: `${m[1]}-${m[2]}-${m[3]}`, sections: sections(germanPart(p.content ?? '')) });
  }
  return out.sort((a, b) => b.date - a.date);
}

// ---------- What the player has seen ----------
// Stored twice: in localStorage (immediately, per browser) and as a user preference on the game
// server (per player, across devices). Both hold the newest seen engine post and UI entry; the
// later of the two wins.

export interface Seen {
  /** dateCreated of the newest engine update seen */
  engine: number;
  /** id of the newest UI entry seen */
  ui: string;
  /** open the dialog by itself when something is new (setting, default on) */
  auto?: boolean;
  /** when `auto` was last changed (ms) – the later setting wins across devices */
  at?: number;
}

export const SEEN_TYPE = 'AT_FRONTEND';
export const SEEN_IDENTIFIER = 'whatsnew';
export const SEEN_KEY = 'at.whatsnew';
/** Without any record (new player, new browser): only what is younger than this. */
export const FIRST_VISIT_DAYS = 14;

export function parseSeen(s: string | null | undefined): Seen | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s) as Partial<Seen>;
    if (typeof v.engine !== 'number' || typeof v.ui !== 'string') return null;
    const out: Seen = { engine: v.engine, ui: v.ui };
    if (typeof v.auto === 'boolean') out.auto = v.auto;
    if (typeof v.at === 'number') out.at = v.at;
    return out;
  } catch {
    return null;
  }
}

export function mergeSeen(a: Seen | null, b: Seen | null): Seen | null {
  if (!a || !b) return a ?? b;
  const setting = (b.at ?? 0) > (a.at ?? 0) ? b : a;
  const out: Seen = { engine: Math.max(a.engine, b.engine), ui: a.ui > b.ui ? a.ui : b.ui };
  if (setting.auto != null) out.auto = setting.auto;
  if (setting.at != null) out.at = setting.at;
  return out;
}

/** Everything the player hasn't seen yet. */
export function unseen(input: { engine: EngineUpdate[]; ui: UiChange[]; seen: Seen | null; now: number }) {
  const { engine, ui, seen, now } = input;
  const since = now - FIRST_VISIT_DAYS * 86_400_000;
  const sinceDay = new Date(since).toISOString().slice(0, 10);
  return {
    engine: engine.filter((u) => (seen ? u.date > seen.engine : u.date >= since)),
    ui: ui.filter((c) => (seen ? c.id > seen.ui : c.id >= sinceDay)),
  };
}

/** „Seen“ after reading everything shown (never goes back). */
export function seenAfter(prev: Seen | null, engine: EngineUpdate[], ui: UiChange[]): Seen {
  const next = {
    engine: Math.max(0, ...engine.map((u) => u.date)),
    ui: ui.reduce((m, c) => (c.id > m ? c.id : m), ''),
  };
  return mergeSeen(prev, next)!;
}

/** Opens by itself unless switched off in the settings. */
export const autoOpen = (s: Seen | null) => s?.auto !== false;

/**
 * Record after switching the automatic dialog on or off. Without any record so far, the first-visit
 * window counts as seen, so switching off doesn't turn old updates into „unread“.
 */
export function withAuto(prev: Seen | null, auto: boolean, now = Date.now()): Seen {
  const base = prev ?? {
    engine: now - FIRST_VISIT_DAYS * 86_400_000,
    ui: new Date(now - FIRST_VISIT_DAYS * 86_400_000).toISOString().slice(0, 10),
  };
  return { ...base, auto, at: now };
}

/** „28.09.2026“ from „2026-09-28“ (optional suffix -2 ignored). */
export const dayLabel = (id: string) => {
  const [y, m, d] = id.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
