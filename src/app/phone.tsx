/**
 * Shared phone building blocks (< 720 px). One set for every page, so the phone looks the same everywhere:
 *
 * - `MiniStats`      one row of 2–3 key figures (label 11 px, value 16 px) instead of a 2×2 tile block
 * - `OptionsButton`  44 px „Optionen“/„Filter“ button with the number of non-default settings
 * - `Option`         one labelled setting inside an options sheet (wrap several in `.ph-sheet`)
 * - `ScrollTabs`     DS.Tabs that scroll sideways with a faded edge, active tab in view, optional ☰ sheet of all views
 * - `ViewPicker`     „Ansicht: Positionen ▾“ – one button that opens all views with a description
 * - `ViewList`       the list inside those sheets (also usable on its own)
 * - `PhoneProfile`   compact profile header for company, player and alliance pages
 * - `useEdgeFade`    `data-more="left|right|both"` on any horizontally scrolling row (CSS `.ph-fade` fades that edge)
 *
 * CSS classes for hand-made controls: `.ph-bar` (one control row), `.ph-btn` (44 px outlined button),
 * `.ph-pick` (picker button), `.ph-count` (count pill), `.ph-sheet`/`.ph-sheet__foot` (sheet content and footer).
 * Proposals for the design system: `StatGroup dense`, `OptionsButton`, `Tabs scroll`, `ViewPicker`.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DS } from '../ds';
import type { IconName } from '../../design-system/components';
import './phone.css';

const countText = (n: number | string) => (typeof n === 'number' ? n.toLocaleString('de-DE') : n);
const hasCount = (n: number | string | undefined): n is number | string => n != null && n !== '' && n !== 0;

/* ---------------------------------------------------------------- key figures */

export interface MiniStat {
  label: ReactNode;
  value: ReactNode;
  /** a second, small line under the value – only where the value needs it */
  hint?: ReactNode;
  key?: string;
}

/** Phone: one compact row of 2–3 key figures (label 11 px, value 16 px) between hairlines. */
export function MiniStats({
  items,
  label,
  plain = false,
  columns,
  className,
}: {
  items: MiniStat[];
  /** name of the row for screen readers */
  label: string;
  /** without the top and bottom rule (e.g. directly under a card head) */
  plain?: boolean;
  /** grid columns; default: as wide as the values, the rest shared – a long amount takes the room a short one leaves */
  columns?: string;
  className?: string;
}) {
  return (
    <dl
      className={`ph-stats${plain ? ' ph-stats--plain' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      style={{ gridTemplateColumns: columns ?? `repeat(${items.length}, minmax(0, auto))` }}
    >
      {items.map((i, n) => (
        <div key={i.key ?? (typeof i.label === 'string' ? i.label : n)} className="ph-stats__item">
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
          {i.hint != null && <dd className="ph-stats__hint">{i.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- options */

/**
 * Phone: 44 px button that opens an options/filter sheet, with the number of settings that differ from
 * the default. `iconOnly` in tight rows: a 44 × 44 square, the count as a badge at its corner, the name
 * for screen readers and as title.
 */
export function OptionsButton({
  active = 0,
  onClick,
  label = 'Optionen',
  iconOnly = false,
  icon = 'filter',
  description,
}: {
  active?: number;
  onClick: () => void;
  label?: string;
  iconOnly?: boolean;
  icon?: IconName;
  /** longer accessible name when nothing is changed, e.g. „Optionen: Art, Zeitraum“ */
  description?: string;
}) {
  return (
    <button
      type="button"
      className={`ph-btn${iconOnly ? ' ph-btn--icon' : ''}`}
      aria-haspopup="dialog"
      onClick={onClick}
      title={iconOnly ? label : undefined}
      aria-label={active ? `${label}, ${active} geändert` : (description ?? label)}
    >
      <DS.Icon name={icon} size={iconOnly ? 20 : 16} />
      {!iconOnly && <span>{label}</span>}
      {active > 0 && (
        <span className={`ph-count ph-count--on${iconOnly ? ' ph-count--corner' : ''}`} aria-hidden="true">
          {active}
        </span>
      )}
    </button>
  );
}

/** One labelled setting in an options sheet: title, control, optional line of explanation. */
export function Option({ title, children, note }: { title: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="ph-opt">
      <h3 className="ph-opt__title">{title}</h3>
      {children}
      {note && <p className="ph-opt__note">{note}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- views */

/** One view of a page: label, optional count and a short description for the view list. */
export interface PhoneView {
  value: string;
  label: ReactNode;
  count?: number | string;
  /** one line in the view list */
  description?: string;
  disabled?: boolean;
  /** tab content (ScrollTabs passes it on to DS.Tabs) */
  content?: ReactNode;
}

/** The list of views inside a sheet: label with count, description, the current one marked in brass. */
export function ViewList({ views, value, onPick, label }: { views: PhoneView[]; value: string; onPick: (value: string) => void; label?: string }) {
  return (
    <ul className="ph-views" aria-label={label}>
      {views.map((v) => (
        <li key={v.value}>
          <button type="button" className="ph-views__item" disabled={v.disabled} aria-current={v.value === value ? 'true' : undefined} onClick={() => onPick(v.value)}>
            <span className="ph-views__label">
              {v.label}
              {hasCount(v.count) && <span className="ph-count">{countText(v.count)}</span>}
            </span>
            {v.description && <span className="ph-views__desc">{v.description}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Phone: „Ansicht: Positionen ▾“ – one button instead of a row of tabs cut off at the edge.
 * Opens a sheet listing every view with a short description, so nothing of the desktop is hidden.
 */
export function ViewPicker({ views, value, onChange, title = 'Ansicht' }: { views: PhoneView[]; value: string; onChange: (value: string) => void; title?: string }) {
  const [open, setOpen] = useState(false);
  const current = views.find((v) => v.value === value) ?? views[0];
  return (
    <>
      <button type="button" className="ph-pick" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="ph-pick__label">{title}</span>
        <span className="ph-pick__value">
          {current?.label}
          {hasCount(current?.count) && <span className="ph-count">{countText(current.count)}</span>}
        </span>
        <span className="bnk-chev" aria-hidden="true" />
      </button>
      <DS.Sheet open={open} onClose={() => setOpen(false)} title={title} side="bottom">
        <ViewList
          views={views}
          value={current?.value ?? value}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </DS.Sheet>
    </>
  );
}

/**
 * Marks a horizontally scrolling row (`selector` inside `ref`, or `ref` itself) with `data-more="left|right|both"`
 * on `ref` while there is more to scroll to that side – `.ph-fade` fades that edge, so a cut-off item reads as
 * „it goes on“. `active` (a selector) is scrolled into view whenever `dep` changes.
 */
export function useEdgeFade(ref: RefObject<HTMLElement | null>, selector?: string, active?: string, dep?: unknown) {
  useEffect(() => {
    const host = ref.current;
    const row = (selector ? host?.querySelector<HTMLElement>(selector) : host) ?? null;
    if (!host || !row) return;
    const update = () => {
      const left = row.scrollLeft > 2;
      const right = row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
      const more = left && right ? 'both' : left ? 'left' : right ? 'right' : '';
      if (more) host.dataset.more = more;
      else delete host.dataset.more;
    };
    if (active) {
      const el = row.querySelector<HTMLElement>(active);
      if (el) {
        const r = el.offsetLeft - row.offsetLeft;
        if (r < row.scrollLeft || r + el.offsetWidth > row.scrollLeft + row.clientWidth)
          row.scrollTo?.({ left: Math.max(0, r - (row.clientWidth - el.offsetWidth) / 2) });
      }
    }
    update();
    row.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    ro?.observe(row);
    return () => {
      row.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [ref, selector, active, dep]);
}

/**
 * DS.Tabs that scroll sideways: the edge where more tabs follow fades out (left and right, by scroll
 * position), the chosen tab is scrolled into view (also for deep links). With `menu` a ☰ button sits at
 * the right end and opens all views as a list with their description. Tabs are 44 px high on phones.
 * Tab content (`items[].content`) is passed on, so it also works for tabs with panels (`.panel__tabs`).
 */
export function ScrollTabs({
  items,
  value,
  onChange,
  label,
  size,
  menu,
  className,
}: {
  items: PhoneView[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  size?: 'sm' | 'md';
  /** ☰ button with all views; a string is the sheet title (default „Ansichten“) */
  menu?: boolean | string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // counts arrive later and make tabs wider – measure and scroll again then
  const sig = `${value}|${items.map((i) => `${i.value}:${i.count ?? ''}`).join()}`;
  useEdgeFade(ref, ':scope > .bnk-tabs > .bnk-tabs__list', '.bnk-tabs__tab.is-on', sig);
  const title = typeof menu === 'string' ? menu : 'Ansichten';
  const current = items.find((i) => i.value === value);
  return (
    <div ref={ref} className={`ph-tabs ph-fade${menu ? ' ph-tabs--menu' : ''}${className ? ` ${className}` : ''}`}>
      <DS.Tabs
        size={size}
        aria-label={label}
        items={items.map(({ value: v, label: l, count, disabled, content }) => ({ value: v, label: l, count, disabled, content }))}
        value={value}
        onChange={onChange}
      />
      {menu && (
        <>
          <button
            type="button"
            className="ph-tabs__menu"
            aria-label={`Alle ${title}${current && typeof current.label === 'string' ? `, jetzt: ${current.label}` : ''}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <DS.Icon name="menue" size={20} />
          </button>
          <DS.Sheet open={open} onClose={() => setOpen(false)} title={title} side="auto">
            <ViewList
              views={items}
              value={value}
              onPick={(v) => {
                onChange(v);
                setOpen(false);
              }}
            />
          </DS.Sheet>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- profile header */

export interface PhoneStat {
  label: string;
  /** numbers are shown as a short amount (full value in the tooltip) */
  value: ReactNode | number;
  currency?: string;
}

/**
 * Profile header for phones (company, player, alliance): logo next to the name, one meta line,
 * up to three key figures in one row (`MiniStats`) – about 120 px instead of ~480 px of the full
 * `DS.ProfileHeader`. „Details“ (ⓘ) opens a sheet with the full header, so nothing of it is lost.
 */
export function PhoneProfile({
  kind,
  name,
  logoUrl,
  meta,
  stats,
  action,
  details,
  detailsTitle,
  back,
}: {
  kind: 'company' | 'user' | 'alliance';
  name: string;
  logoUrl?: string | null;
  /** one line; overflowing text is cut with „…“ */
  meta?: ReactNode;
  stats: PhoneStat[];
  /** at most one small button next to the name (e.g. „Nachricht“) */
  action?: ReactNode;
  /** content of the details sheet – usually the full `DS.ProfileHeader` */
  details?: ReactNode;
  detailsTitle?: string;
  /** „Zurück“: goes back in the history when there is one inside the app, otherwise to `href` */
  back?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="pprof">
      <div className="pprof__main">
        {back && (
          <a
            className="pprof__back"
            href={back.href}
            aria-label={back.label}
            onClick={(e) => {
              // React Router keeps its position in history.state.idx – back only when we came from inside the app
              if ((window.history.state as { idx?: number } | null)?.idx) {
                e.preventDefault();
                e.stopPropagation();
                window.history.back();
              }
            }}
          >
            <span className="bnk-chev pprof__chev" aria-hidden="true" />
          </a>
        )}
        {logoUrl ? <img className="pprof__logo" src={logoUrl} alt="" /> : <DS.Avatar name={name} size={40} group={kind === 'alliance'} />}
        <div className="pprof__id">
          <h1 className="pprof__name">{name}</h1>
          <p className="pprof__meta">{meta ?? ' '}</p>
        </div>
        {action}
        {details && (
          <button type="button" className="pprof__more" aria-label="Details" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <DS.Icon name="info" size={20} />
          </button>
        )}
      </div>
      {stats.length > 0 && (
        <MiniStats
          label={`${name} in Zahlen`}
          items={stats.map((s) => ({
            label: s.label,
            value: typeof s.value === 'number' ? <DS.Amount value={s.value} currency={s.currency ?? '€'} compact /> : s.value,
          }))}
        />
      )}
      {details && (
        <DS.Sheet open={open} onClose={() => setOpen(false)} title={detailsTitle ?? name} side="auto" className="pprof__sheet">
          {details}
        </DS.Sheet>
      )}
    </header>
  );
}
