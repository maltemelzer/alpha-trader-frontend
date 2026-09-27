/**
 * Page navigation in three levels – the pure part (URL in, URL out), used by `src/app/pagenav.tsx`:
 *
 * 1. page (path, header/bottom nav) – not here
 * 2. view   `?ansicht=` – one tab row per page; on phones a context card of a wide view may be a view of its own
 *           (`parent`: on wide screens that value shows its parent view, so a link lands in the same place)
 * 3. filter  page-wide data scope (`zeitraum`, `art`, `konto`, …) – always in the filter bar, never in a card
 *
 * A card may only switch its own presentation (a segmented control in its head) – that stays with the card.
 */

export interface ViewDef<L = unknown> {
  value: string;
  label: L;
  count?: number | string;
  description?: string;
  /** phone-only view: on wide screens this value shows the parent view (the card sits next to it there) */
  parent?: string;
}

export interface FilterOption<L = unknown> {
  value: string;
  label: L;
}

export interface FilterDef<L = unknown> {
  key: string;
  label: string;
  /** the value when the key is missing from the URL – never written to the URL */
  fallback: string;
  /** allowed values; without options any value is taken (set elsewhere, e.g. by clicking a node) and shown as a chip */
  options?: FilterOption<L>[];
  /** wide screens: shown in the bar itself (the rest sits behind „Filter“ once there are more than two) */
  primary?: boolean;
  /** wide screens: the options speak for themselves (Zeitraum, Art) – no label in front of the control */
  bare?: boolean;
  /** only these views use the filter; elsewhere it is hidden (not disabled) */
  views?: string[];
  /** old URL keys that still count (read) and are dropped on the next write */
  aliases?: string[];
  /** line of explanation in the filter sheet */
  note?: string;
  /** text for the chip and the phone meta line; default: the option label or the raw value */
  summary?: (value: string) => string;
}

/** Which view to show: aliases of old values, unknown → fallback, phone-only views → their parent on wide screens. */
export function resolveView(raw: string | null, views: ViewDef[], fallback: string, phone: boolean, aliases?: Record<string, string>): string {
  const v = raw == null ? fallback : (aliases?.[raw] ?? raw);
  const def = views.find((d) => d.value === v);
  if (!def) return fallback;
  if (!phone && def.parent) return def.parent;
  return def.value;
}

/** The views shown as tabs: on wide screens without the phone-only ones. */
export function visibleViews<V extends ViewDef>(views: V[], phone: boolean): V[] {
  return phone ? views : views.filter((v) => !v.parent);
}

const rawOf = (params: URLSearchParams, def: FilterDef) => {
  const own = params.get(def.key);
  if (own != null) return own;
  for (const a of def.aliases ?? []) {
    const v = params.get(a);
    if (v != null) return v;
  }
  return null;
};

/** Current value of every filter: validated against its options, fallback when missing or unknown. */
export function readFilters(params: URLSearchParams, defs: FilterDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of defs) {
    const raw = rawOf(params, d);
    out[d.key] = raw == null || raw === '' ? d.fallback : !d.options || d.options.some((o) => o.value === raw) ? raw : d.fallback;
  }
  return out;
}

/**
 * The URL after changing some filters – all in one step (several setSearchParams calls in one tick lose all
 * but the last). Fallbacks and empty values are removed, old alias keys dropped, and `reset` keys (the page
 * of a list) cleared, since a new scope starts at the top.
 */
export function applyFilters(prev: URLSearchParams, defs: FilterDef[], patch: Record<string, string | undefined>, reset: string[] = ['seite']): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const [key, value] of Object.entries(patch)) {
    const def = defs.find((d) => d.key === key);
    for (const a of def?.aliases ?? []) next.delete(a);
    if (value == null || value === '' || value === def?.fallback) next.delete(key);
    else next.set(key, value);
  }
  for (const k of reset) next.delete(k);
  return next;
}

/** Filters that apply in this view. */
export function filtersFor<F extends FilterDef>(defs: F[], view?: string): F[] {
  return defs.filter((d) => !d.views || view == null || d.views.includes(view));
}

/** Filters of this view that differ from their fallback. */
export function changedFilters<F extends FilterDef>(defs: F[], values: Record<string, string>): F[] {
  return defs.filter((d) => values[d.key] !== d.fallback);
}

/** Short text of one filter value: `summary`, else the option label (if it is text), else the value. */
export function filterText(def: FilterDef, value: string): string {
  if (def.summary) return def.summary(value);
  const label = def.options?.find((o) => o.value === value)?.label;
  return typeof label === 'string' ? label : value;
}

/** „7 T · Anleihen“ – the changed filters for a meta line (phones show no chip row). */
export function filterSummary(defs: FilterDef[], values: Record<string, string>): string {
  return changedFilters(defs, values)
    .map((d) => filterText(d, values[d.key]))
    .join(' · ');
}

/**
 * Wide screens: which filters sit in the bar and which behind „Filter“. Up to two fit in the bar anyway; with more,
 * only the primary ones do. Filters without options (set elsewhere) never get a control – they show as chips.
 */
export function splitFilters<F extends FilterDef>(defs: F[]): { inline: F[]; sheet: F[] } {
  const controls = defs.filter((d) => d.options);
  if (controls.length <= 2) return { inline: controls, sheet: [] };
  return { inline: controls.filter((d) => d.primary), sheet: controls.filter((d) => !d.primary) };
}
