// Pure logic of the settings page: building the write requests, validating input, key figures.
import type { operations } from '../api/schema';

type UserChangeQuery = NonNullable<operations['changeUser']['parameters']['query']>;

/** Query of PATCH /api/v2/my/user – exactly one field per change. */
export type UserChange =
  | Pick<UserChangeQuery, 'username'>
  | Pick<UserChangeQuery, 'emailaddress'>
  | Pick<UserChangeQuery, 'password'>
  | Pick<UserChangeQuery, 'emailSubscriptionType'>;

export type AccountField = 'username' | 'emailaddress' | 'password';

/** The request for one changed field; `undefined` when the input is not valid (see `fieldProblem`). */
export function userChange(field: AccountField, value: string, repeat?: string, current?: string): UserChange | undefined {
  if (fieldProblem(field, value, repeat, current)) return undefined;
  if (field === 'password') return { password: value };
  return { [field]: value.trim() } as UserChange;
}

/** Why the input cannot be sent yet (German, for the field hint), or `null`. The server checks again. */
export function fieldProblem(field: AccountField, value: string, repeat?: string, current?: string): string | null {
  const v = field === 'password' ? value : value.trim();
  if (!v) return 'Bitte ausfüllen.';
  if (field === 'username') {
    if (v === current) return 'Das ist schon dein Name.';
    if (v.length < 3) return 'Mindestens 3 Zeichen.';
    if (v.length > 30) return 'Höchstens 30 Zeichen.';
    if (/\s/.test(v)) return 'Ohne Leerzeichen.';
    return null;
  }
  if (field === 'emailaddress') {
    if (current && v.toLowerCase() === current.toLowerCase()) return 'Das ist schon deine Adresse.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Keine gültige E-Mail-Adresse.';
  }
  if (v.length < 8) return 'Mindestens 8 Zeichen.';
  if (repeat !== undefined && repeat !== value) return 'Die Wiederholung stimmt nicht überein.';
  return null;
}

/** Newsletter switch: pending double opt-in counts as on. */
export const newsletterOn = (t: string | undefined) => t === 'SUBSCRIBED' || t === 'NOT_CONFIRMED_SUBSCRIBED';
export const newsletterChange = (on: boolean): UserChange => ({ emailSubscriptionType: on ? 'SUBSCRIBED' : 'UNSUBSCRIBED' });

/**
 * Languages the game writes texts in. `GET /api/locales` lists every Java locale (~1.000 entries,
 * „af_NA“ …) – not a useful choice; the account stores a BCP-47 tag like „de-DE“.
 */
export const LOCALES = [
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'en-US', label: 'English' },
] as const;

/** The option matching the stored tag („de“, „de_DE“, „de-DE“ all mean German). */
export function localeOption(tag: string | null | undefined): string | undefined {
  if (!tag) return undefined;
  const lang = tag.slice(0, 2).toLowerCase();
  return LOCALES.find((l) => l.value.startsWith(lang))?.value;
}

// ---------- Notes (user preferences) ----------

/** The original game stores notes as user preferences of this type, keyed by an identifier. */
export const NOTE_TYPE = 'NOTE';

export type NoteRequest =
  | { method: 'DELETE'; id: string }
  | { method: 'PUT'; id: string; query: { type: string; identifier: string; content: string } }
  | { method: 'POST'; query: { type: string; identifier: string; content: string } };

/** Like `saveNote()` of the original game: empty text deletes an existing note, a known id edits, else creates. */
export function noteRequest(existingId: string | undefined, identifier: string, content: string): NoteRequest | undefined {
  const text = content.trim();
  const query = { type: NOTE_TYPE, identifier: identifier.trim(), content: text };
  if (!query.identifier) return undefined;
  if (existingId) return text ? { method: 'PUT', id: existingId, query } : { method: 'DELETE', id: existingId };
  return text ? { method: 'POST', query } : undefined;
}

/** Where a note belongs: ASINs to the security page, anything else is treated as a player name. */
export function noteTarget(identifier: string | undefined): { label: string; href?: string } {
  const id = (identifier ?? '').trim();
  if (/^[A-Z]{2}[A-Z0-9]{8}$/.test(id)) return { label: id, href: `/wertpapier/${id}` };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) return { label: id };
  return id ? { label: id, href: `/spieler/${encodeURIComponent(id)}` } : { label: '–' };
}

// ---------- Referral ----------

/** GET /api/v2/my/referrer: a user view, or `{ code, message: null }` without referrer. */
export function referrerOf(r: unknown): { username: string; refId?: string } | null {
  return r && typeof r === 'object' && typeof (r as { username?: unknown }).username === 'string'
    ? (r as { username: string; refId?: string })
    : null;
}

/** Referred players per month (oldest first), for the bar chart. */
export function referralsByMonth(users: { registrationDate?: number }[]): { month: string; count: number }[] {
  const m = new Map<string, number>();
  for (const u of users) {
    if (!u.registrationDate) continue;
    const d = new Date(u.registrationDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
}

// ---------- Online time, membership, gold ----------

const DAY = 86_400_000;

/** Online time as hours and minutes per day since registration. */
export function onlineStats(onlineMinutes: number | undefined, registrationDate: number | undefined, now: number) {
  if (onlineMinutes == null) return undefined;
  const days = registrationDate != null ? Math.max(1, (now - registrationDate) / DAY) : undefined;
  return { hours: onlineMinutes / 60, perDay: days ? onlineMinutes / days : undefined, days };
}

/** „1 Std. 5 Min.“ / „12 Min.“ */
export function minutesText(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h.toLocaleString('de-DE')} Std. ${rest} Min.` : `${h.toLocaleString('de-DE')} Std.`;
}

/** Whole days of gold access left (0 when expired or unknown). */
export function premiumDaysLeft(end: number | null | undefined, now: number): number {
  return end && end > now ? Math.ceil((end - now) / DAY) : 0;
}

/** Deleting needs the exact player name – case and spaces count. */
export const deletionConfirmed = (typed: string, username: string | undefined) => !!username && typed === username;

/** Days of a voucher from GET /api/v2/premiumlicenses/{code} (field name as the original game reads it). */
export function licenseDays(license: Record<string, unknown> | undefined): number | undefined {
  const d = license?.days;
  return typeof d === 'number' && d > 0 ? d : undefined;
}

/**
 * The subscription id in the answer of GET /api/v2/subscriptions/status. The spec types the answer
 * only as `object`; the cancel endpoint takes a plain string. Not verified against a real
 * subscription – without an id the cancel button stays hidden.
 */
export function subscriptionIdOf(status: Record<string, unknown> | undefined): string | undefined {
  if (!status) return undefined;
  for (const k of ['subscriptionId', 'id']) if (typeof status[k] === 'string' && status[k]) return status[k] as string;
  const sub = status.subscription;
  if (sub && typeof sub === 'object') return subscriptionIdOf(sub as Record<string, unknown>);
  return undefined;
}

/** Payment events: German label of the processing state. */
export const PROCESSING_STATE: Record<string, string> = { PROCESSED: 'verbucht', UNPROCESSED: 'offen', FAILED: 'fehlgeschlagen' };
