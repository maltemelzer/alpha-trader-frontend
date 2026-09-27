/**
 * One navigation scheme for every page (rules in CLAUDE.md, „Navigation in drei Ebenen“):
 *
 * - `usePageView`  the page's view `?ansicht=` (one tab row, phone-only views map to their parent on wide screens)
 * - `useFilters`   page-wide filters (`zeitraum`, `art`, `konto`, …), all changes in one URL write
 * - `PageNav`      the row under the page title: views left, filter bar right (wide) – or on phones one control
 *                  row: scrolling views + one filter button with a sheet
 *
 * Cards never carry tabs; a card may switch only its own presentation (segmented control in its head).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useIsPhone } from '../lib/useMediaQuery';
import {
  applyFilters,
  changedFilters,
  filtersFor,
  filterText,
  readFilters,
  resolveView,
  splitFilters,
  visibleViews,
  type FilterDef,
  type ViewDef,
} from '../lib/pagenav';
import { Option, OptionsButton, ScrollTabs } from './phone';
import './pagenav.css';

export type PageView = ViewDef<ReactNode>;
export type PageFilter = FilterDef<ReactNode> & {
  /** chip content instead of the plain text (e.g. a name with a link) */
  chip?: (value: string) => ReactNode;
};

/** The page's view in `?ansicht=` (or `key`): validated, old values mapped, other URL keys kept. */
export function usePageView(views: PageView[], fallback: string, opts: { key?: string; aliases?: Record<string, string> } = {}) {
  const key = opts.key ?? 'ansicht';
  const phone = useIsPhone();
  const [params, setParams] = useSearchParams();
  const view = resolveView(params.get(key), views, fallback, phone, opts.aliases);
  const setView = useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === fallback) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  const shown = useMemo(() => visibleViews(views, phone), [views, phone]);
  return [view, setView, shown] as const;
}

export interface Filters {
  defs: PageFilter[];
  values: Record<string, string>;
  /** change one or more filters in one URL write */
  set: (patch: Record<string, string | undefined>) => void;
  /** all filters of `defs` back to their fallback */
  reset: (defs?: PageFilter[]) => void;
}

/** Page-wide filters in the URL. Changing them clears `reset` keys (default: the list page). */
export function useFilters(defs: PageFilter[], reset: string[] = ['seite']): Filters {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => readFilters(params, defs), [params, defs]);
  const resetKeys = reset.join(',');
  const set = useCallback(
    (patch: Record<string, string | undefined>) =>
      setParams((prev) => applyFilters(prev, defs, patch, resetKeys ? resetKeys.split(',') : []), { replace: true }),
    [defs, resetKeys, setParams],
  );
  const resetAll = useCallback((only?: PageFilter[]) => set(Object.fromEntries((only ?? defs).map((d) => [d.key, undefined]))), [defs, set]);
  return { defs, values, set, reset: resetAll };
}

function Control({ def, filters, size, fullWidth }: { def: PageFilter; filters: Filters; size?: 'sm'; fullWidth?: boolean }) {
  const options = def.options ?? [];
  const value = filters.values[def.key];
  const onChange = (v: string) => filters.set({ [def.key]: v });
  if (options.length <= 4)
    return <DS.SegmentedControl size={size} fullWidth={fullWidth} aria-label={def.label} options={options} value={value} onChange={onChange} />;
  return (
    <DS.Select
      size={size}
      aria-label={def.label}
      options={options.map((o) => ({ value: o.value, label: typeof o.label === 'string' ? o.label : o.value }))}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    />
  );
}

/** Settings sheet content: one labelled control per filter, chips-only filters with a „remove“ button. */
function FilterSheetBody({ defs, filters }: { defs: PageFilter[]; filters: Filters }) {
  return (
    <div className="ph-sheet">
      {defs.map((d) =>
        d.options ? (
          <Option key={d.key} title={d.label} note={d.note}>
            <Control def={d} filters={filters} fullWidth />
          </Option>
        ) : filters.values[d.key] !== d.fallback ? (
          <Option key={d.key} title={d.label} note={d.note}>
            <div className="pnav__sheetchip">
              <span>{d.chip ? d.chip(filters.values[d.key]) : filterText(d, filters.values[d.key])}</span>
              <DS.Button size="sm" variant="secondary" onClick={() => filters.set({ [d.key]: undefined })}>
                Entfernen
              </DS.Button>
            </div>
          </Option>
        ) : null,
      )}
    </div>
  );
}

function Chips({ defs, filters }: { defs: PageFilter[]; filters: Filters }) {
  if (!defs.length) return null;
  return (
    <ul className="pnav__chips" aria-label="Aktive Filter">
      {defs.map((d) => (
        <li key={d.key} className="pnav__chip">
          <span className="pnav__chip-key">{d.label}:</span>
          <span className="pnav__chip-val">{d.chip ? d.chip(filters.values[d.key]) : filterText(d, filters.values[d.key])}</span>
          <button type="button" className="pnav__chip-x" aria-label={`${d.label} entfernen`} onClick={() => filters.set({ [d.key]: undefined })}>
            <DS.Icon name="schliessen" size={14} />
          </button>
        </li>
      ))}
      {defs.length > 1 && (
        <li>
          <button type="button" className="pnav__clear" onClick={() => filters.reset(defs)}>
            Alle entfernen
          </button>
        </li>
      )}
    </ul>
  );
}

/**
 * The row under the page title. Wide: views as tabs (left), filter bar (right): up to two filters as controls,
 * with more only the primary ones plus „Filter (n)“ opening the rest; filters that differ and are not in the bar
 * show as removable chips below. Phone: one control row – views as scrolling tabs (☰ from five) and a filter
 * button with the number of changed filters; the choice is spelled out in the meta line (`filterSummary`).
 *
 * Wide screens pass it to `PageHeader tabs`; phones put it at the top of the page body.
 */
export function PageNav({
  label,
  views,
  view,
  onView,
  filters,
  extra,
}: {
  /** name of the view tabs for screen readers, e.g. „Ansicht“ */
  label: string;
  /** shown views (from `usePageView`); empty = the page has no views, only filters */
  views: PageView[];
  view: string;
  onView: (v: string) => void;
  filters?: Filters;
  /** one more control at the end of the row (wide) – e.g. a search field */
  extra?: ReactNode;
}) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const shown = filters ? filtersFor(filters.defs, view) : [];
  const changed = filters ? changedFilters(shown, filters.values) : [];
  const { inline, sheet } = splitFilters(shown);
  const tabs = views.length > 1 && (
    <ScrollTabs
      className="pnav__tabs"
      label={label}
      size="md"
      menu={phone && views.length > 4 ? 'Ansichten' : undefined}
      items={views.map(({ value, label: l, count, description }) => ({ value, label: l, count, description }))}
      value={view}
      onChange={onView}
    />
  );

  if (phone) {
    const withControls = shown.filter((d) => d.options || filters!.values[d.key] !== d.fallback);
    return (
      <div className="ph-bar pnav pnav--phone">
        {tabs}
        {extra}
        {filters && withControls.length > 0 && (
          <>
            <OptionsButton iconOnly label="Filter" active={changed.length} onClick={() => setOpen(true)} description={`Filter: ${withControls.map((d) => d.label).join(', ')}`} />
            <DS.Sheet
              open={open}
              onClose={() => setOpen(false)}
              title="Filter"
              side="auto"
              footer={
                <div className="ph-sheet__foot">
                  {changed.length > 0 && (
                    <DS.Button variant="secondary" onClick={() => filters.reset(shown)}>
                      Zurücksetzen
                    </DS.Button>
                  )}
                  <DS.Button variant="primary" onClick={() => setOpen(false)}>
                    Fertig
                  </DS.Button>
                </div>
              }
            >
              <FilterSheetBody defs={withControls} filters={filters} />
            </DS.Sheet>
          </>
        )}
      </div>
    );
  }

  const chips = changed.filter((d) => !inline.includes(d));
  const sheetChanged = changed.filter((d) => sheet.includes(d)).length;
  return (
    <div className="pnav">
      <div className="pnav__row">
        {tabs || <span />}
        <div className="pnav__bar">
          {extra}
          {filters &&
            inline.map((d) => (
              <div key={d.key} className="pnav__ctl">
                {!d.bare && <span className="pnav__lbl" aria-hidden="true">{d.label}</span>}
                <Control def={d} filters={filters} size="sm" fullWidth={false} />
              </div>
            ))}
          {filters && sheet.length > 0 && (
            <>
              <DS.Button size="sm" variant="secondary" aria-haspopup="dialog" onClick={() => setOpen(true)}>
                <DS.Icon name="filter" size={16} /> Filter{sheetChanged ? ` (${sheetChanged})` : ''}
              </DS.Button>
              <DS.Sheet open={open} onClose={() => setOpen(false)} title="Filter" side="right">
                <FilterSheetBody defs={sheet} filters={filters} />
              </DS.Sheet>
            </>
          )}
        </div>
      </div>
      {filters && <Chips defs={chips} filters={filters} />}
    </div>
  );
}
