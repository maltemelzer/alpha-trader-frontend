// Market screener UI: search, type toggles, presets, filter chips, filter sheet, results.
// State lives in the URL (see screener.ts); number and text fields keep their text in state and
// follow into the URL after a pause (a field bound to the URL loses keystrokes).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DS, format } from '../ds';
import type { DataTableColumn } from '../../vendor/bankiersgruen';
import { parseDe, ratePct, short, span } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';
import {
  activePreset,
  chips,
  column,
  defaultColumns,
  filterCount,
  formatRange,
  GROUPS,
  groupOf,
  HIST,
  histogram,
  inRange,
  RANGE_KEYS,
  rangeValue,
  offeredColumns,
  presetChanges,
  PRESETS,
  sections,
  SCREEN_KEYS,
  sortParam,
  toggleType,
  typesParam,
  visibleColumns,
  type Bin,
  type ColKey,
  type Quote,
  type Range,
  type RangeKey,
  type Screen,
  type ScreenRow,
} from './screener';

type SetParam = (changes: Record<string, string | null>) => void;
const href = (asin: string) => `/wertpapier/${asin}`;
const NB = String.fromCharCode(0xa0);

// ---------- Toolbar pieces ----------

/** Type filter as toggle buttons (several at once); „Alle“ clears the choice. */
export function TypeToggles({ types, onChange }: { types: Screen['types']; onChange: (art: string) => void }) {
  return (
    <div className="scr-types" role="group" aria-label="Wertpapierart">
      <button type="button" className="scr-types__opt" aria-pressed={!types.length} onClick={() => onChange('alle')}>
        Alle
      </button>
      {GROUPS.map((g) => (
        <button
          key={g.value}
          type="button"
          className="scr-types__opt"
          aria-pressed={types.includes(g.value)}
          onClick={() => onChange(typesParam(toggleType(types, g.value)))}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

/** Active filters, each removable with one click; a click on the label opens the filter sheet. */
function Chips({ screen, setParam, onOpen }: { screen: Screen; setParam: SetParam; onOpen: () => void }) {
  const list = chips(screen);
  if (!list.length) return null;
  const clearAll: Record<string, null> = {};
  for (const c of list) clearAll[c.key] = null;
  return (
    <div className="scr-chips" aria-label="Aktive Filter">
      {list.map((c) => (
        <span key={c.key} className="scr-chip">
          <button type="button" className="scr-chip__label" onClick={onOpen}>
            {c.label}
          </button>
          <button type="button" className="scr-chip__x" aria-label={`Filter „${c.label}“ entfernen`} onClick={() => setParam({ [c.key]: null, seite: null })}>
            ×
          </button>
        </span>
      ))}
      {list.length > 1 && (
        <button type="button" className="scr-chips__clear" onClick={() => setParam({ ...clearAll, seite: null })}>
          Alle entfernen
        </button>
      )}
    </div>
  );
}

// ---------- Filter fields ----------

const deNum = (n: number | undefined) => (n == null ? '' : n.toLocaleString('de-DE', { maximumFractionDigits: 8 }));
const parse = (s: string) => {
  const t = s.replace(/−/g, '-').trim();
  return t === '' ? undefined : parseDe(t);
};
const same = (a: number | undefined, b: number | undefined) => a === b || (a != null && b != null && Math.abs(a - b) < 1e-9);

const axis = (n: number, unit: string) => {
  const a = Math.abs(n);
  const t = a >= 1e3 ? short(n) : n.toLocaleString('de-DE', { maximumFractionDigits: a >= 10 ? 0 : a >= 1 ? 1 : 3 });
  return `${n < 0 && a < 1e3 ? t.replace('-', '−') : t}${unit ? NB + unit : ''}`;
};

/** Distribution of a figure as small bars; bars inside the chosen range in chart colour. */
function Hist({ bins, range, unit }: { bins: Bin[]; range: Range | undefined; unit: string }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  const any = !!range && (range.min != null || range.max != null);
  return (
    <div className="scr-hist" aria-hidden="true">
      <div className="scr-hist__bars">
        {bins.map((b, i) => (
          <i
            key={i}
            className={any && inRange(b, range) ? 'is-in' : any ? 'is-out' : undefined}
            style={{ height: b.count ? `${Math.max(6, Math.sqrt(b.count / max) * 100)}%` : 0 }}
          />
        ))}
      </div>
      <div className="scr-hist__axis">
        <span>{axis(bins[0].from, unit)}</span>
        <span>{axis(bins[bins.length - 1].to, unit)}</span>
      </div>
    </div>
  );
}

/**
 * „von – bis“ pair for one range. Text stays in state; after a pause the parsed range goes into
 * the URL. When the URL changes elsewhere (chip removed, preset), the fields follow.
 */
function RangeField({
  k,
  label,
  unit,
  value,
  setParam,
  hint,
  step,
  bins,
}: {
  k: RangeKey;
  label: string;
  unit: string;
  value: Range | undefined;
  setParam: SetParam;
  hint?: ReactNode;
  step?: string;
  bins?: Bin[];
}) {
  const [min, setMin] = useState(deNum(value?.min));
  const [max, setMax] = useState(deNum(value?.max));
  const url = formatRange(value) ?? '';
  const [seen, setSeen] = useState(url);
  if (url !== seen) {
    setSeen(url);
    if (!same(parse(min), value?.min)) setMin(deNum(value?.min));
    if (!same(parse(max), value?.max)) setMax(deNum(value?.max));
  }
  const draft = useDebounced(JSON.stringify([min, max]), 450);
  const pMin = parse(min);
  const pMax = parse(max);
  const bad = (x: number | undefined) => x != null && Number.isNaN(x);
  useEffect(() => {
    if (draft !== JSON.stringify([min, max])) return;
    if (bad(pMin) || bad(pMax)) return;
    const next = formatRange({ min: pMin, max: pMax }) ?? '';
    if (next !== url) setParam({ [k]: next || null, seite: null });
  }, [draft, min, max, pMin, pMax, url, k, setParam]);
  const id = `scr-${k}`;
  return (
    <div className="scr-range">
      <div className="scr-range__label" id={id}>
        {label}
      </div>
      <div className="scr-range__pair" role="group" aria-labelledby={id}>
        <DS.Input
          aria-label={`${label} von`}
          numeric
          size="sm"
          prefix="≥"
          suffix={unit || undefined}
          placeholder="von"
          inputMode="decimal"
          step={step}
          value={min}
          error={bad(pMin) ? 'Keine Zahl' : undefined}
          onChange={(e) => setMin(e.target.value)}
        />
        <DS.Input
          aria-label={`${label} bis`}
          numeric
          size="sm"
          prefix="≤"
          suffix={unit || undefined}
          placeholder="bis"
          inputMode="decimal"
          value={max}
          error={bad(pMax) ? 'Keine Zahl' : undefined}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      {bins && bins.length > 1 && <Hist bins={bins} range={bad(pMin) || bad(pMax) ? value : { min: pMin, max: pMax }} unit={unit} />}
      {hint && <div className="scr-range__hint">{hint}</div>}
    </div>
  );
}

/** Free text filter (issuer) with the same delayed URL write. */
function TextFilter({ k, label, value, setParam, placeholder }: { k: string; label: string; value: string; setParam: SetParam; placeholder: string }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== text.trim()) setText(value);
  }
  const debounced = useDebounced(text, 450);
  useEffect(() => {
    if (debounced !== text) return;
    if (debounced.trim() !== value) setParam({ [k]: debounced.trim() || null, seite: null });
  }, [debounced, text, value, k, setParam]);
  return <DS.Input label={label} size="sm" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />;
}

const BUILDING_SIZES = [150, 1200, 5000, 7500];

/** The filter sheet: presets (phone), all filters for the chosen types, columns (wide). */
function FilterSheet({
  open,
  onClose,
  screen,
  params,
  setParam,
  count,
  isPhone,
  base,
  now,
}: {
  open: boolean;
  onClose: () => void;
  screen: Screen;
  params: URLSearchParams;
  setParam: SetParam;
  count: number | undefined;
  isPhone: boolean;
  base: ScreenRow[];
  now: number;
}) {
  const sec = sections(screen.types);
  // Distribution of each figure over the chosen types (other filters left out), only while open.
  const dist = useMemo(() => {
    const out: Partial<Record<RangeKey, Bin[]>> = {};
    if (!open) return out;
    for (const k of RANGE_KEYS) {
      const xs: number[] = [];
      for (const r of base) {
        const v = rangeValue(k, r, now);
        if (v != null) xs.push(v);
      }
      out[k] = histogram(xs, HIST[k]);
    }
    return out;
  }, [open, base, now]);
  const onlyBonds = screen.types.length > 0 && screen.types.every((t) => t === 'BOND' || t === 'REPO');
  const cols = visibleColumns(screen);
  const preset = activePreset(params);
  const toggleCol = (k: ColKey, on: boolean) => {
    const next = on ? [...cols, k] : cols.filter((c) => c !== k);
    const def = defaultColumns(screen.types);
    const isDefault = next.length === def.length && next.every((c) => def.includes(c));
    setParam({ sp: isDefault ? null : next.join(',') });
  };
  const reset = () => {
    const out: Record<string, null> = {};
    for (const k of SCREEN_KEYS) if (k !== 'art' && k !== 'q') out[k] = null;
    setParam(out);
  };
  return (
    <DS.Sheet
      open={open}
      onClose={onClose}
      title="Filter"
      side="auto"
      width={400}
      className="scr-sheet"
      footer={
        <div className="scr-sheet__foot">
          <DS.Button variant="secondary" onClick={reset}>
            Zurücksetzen
          </DS.Button>
          <DS.Button variant="primary" onClick={onClose}>
            {count == null ? 'Treffer anzeigen' : `${count.toLocaleString('de-DE')} Treffer anzeigen`}
          </DS.Button>
        </div>
      }
    >
      <div className="scr-sheet__body">
        {isPhone && (
          <fieldset className="scr-sec">
            <legend className="scr-sec__title">Vorlagen</legend>
            <div className="scr-presets">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className="scr-preset" aria-pressed={preset?.id === p.id} onClick={() => setParam(presetChanges(p))}>
                  <span className="scr-preset__label">{p.label}</span>
                  <span className="scr-preset__desc">{p.description}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="scr-sec">
          <legend className="scr-sec__title">Kurs und Handel</legend>
          <DS.SegmentedControl
            label="Angebot"
            size="sm"
            value={screen.quote || 'egal'}
            onChange={(v) => setParam({ mit: v === 'egal' ? null : (v as Quote), seite: null })}
            options={[
              { value: 'egal', label: 'Egal' },
              { value: 'brief', label: 'Mit Brief' },
              { value: 'geld', label: 'Mit Geld' },
              { value: 'beide', label: 'Beides' },
            ]}
          />
          <RangeField k="kurs" label="Letzter Kurs" unit={onlyBonds ? '%' : '€'} value={screen.ranges.kurs} bins={dist.kurs} setParam={setParam} hint={!onlyBonds && sec.bonds ? 'Anleihen und Repos in %' : undefined} />
          <RangeField k="ver" label="Veränderung zum Vortag" unit="%" value={screen.ranges.ver} bins={dist.ver} setParam={setParam} hint="Negativ mit Minus, z. B. −5" />
          <RangeField k="spr" label="Spread" unit="%" value={screen.ranges.spr} bins={dist.spr} setParam={setParam} hint="(Brief − Geld) ÷ Brief, nur mit beiden Seiten" />
          <RangeField k="ums" label="Umsatz 24 h" unit="€" value={screen.ranges.ums} bins={dist.ums} setParam={setParam} hint="≥ 1 = in den letzten 24 h gehandelt" />
          <RangeField k="tr" label="Trades" unit="" value={screen.ranges.tr} bins={dist.tr} setParam={setParam} />
        </fieldset>
        {sec.company && (
          <fieldset className="scr-sec">
            <legend className="scr-sec__title">Unternehmen</legend>
            <RangeField k="bw" label="Buchwert" unit="€" value={screen.ranges.bw} bins={dist.bw} setParam={setParam} hint="Bekannt für die 1.000 größten Unternehmen" />
          </fieldset>
        )}
        {sec.bonds && (
          <fieldset className="scr-sec">
            <legend className="scr-sec__title">Anleihen und Repos</legend>
            <RangeField k="zins" label="Zins bis Fälligkeit" unit="%" value={screen.ranges.zins} bins={dist.zins} setParam={setParam} hint="Für die ganze Laufzeit, nicht pro Jahr" />
            <RangeField k="rt" label="Rendite pro Tag" unit="%" value={screen.ranges.rt} bins={dist.rt} setParam={setParam} hint="Zum Brief gerechnet" />
            <RangeField k="lz" label="Restlaufzeit" unit="Tage" value={screen.ranges.lz} bins={dist.lz} setParam={setParam} hint="0,04 Tage ≈ 1 Stunde" />
            <TextFilter k="em" label="Emittent" value={screen.issuer} setParam={setParam} placeholder="Name enthält …" />
          </fieldset>
        )}
        {sec.buildings && (
          <fieldset className="scr-sec">
            <legend className="scr-sec__title">Immobilien</legend>
            <div className="scr-sizes">
              {BUILDING_SIZES.map((n) => (
                <DS.Checkbox
                  key={n}
                  label={`${n.toLocaleString('de-DE')} m²`}
                  checked={screen.sizes.includes(n)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...screen.sizes, n] : screen.sizes.filter((x) => x !== n);
                    setParam({ gr: next.length ? [...next].sort((a, b) => a - b).join(',') : null, seite: null });
                  }}
                />
              ))}
            </div>
            <RangeField k="qm" label="Preis je m²" unit="€" value={screen.ranges.qm} bins={dist.qm} setParam={setParam} hint="Brief (ohne Brief der letzte Kurs) ÷ Fläche" />
          </fieldset>
        )}
        {!isPhone && (
          <fieldset className="scr-sec">
            <legend className="scr-sec__title">Spalten</legend>
            <div className="scr-cols">
              {offeredColumns(screen.types).map((c) => (
                <DS.Checkbox key={c.key} label={c.label} checked={cols.includes(c.key)} onChange={(e) => toggleCol(c.key, e.target.checked)} />
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </DS.Sheet>
  );
}

// ---------- Results ----------

const MINUS = '−';
const pct = (n: number, d = 2) => `${n < 0 ? MINUS : ''}${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })}${NB}%`;

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="bnk-table__empty-cell">–</span>;
  const a = Math.abs(value);
  return <DS.PriceChange value={value} decimals={a >= 1000 ? 0 : a >= 100 ? 1 : 2} size="sm" />;
}

/** Price: bonds and repos in %, euro prices from a million on in short form (full value in the tooltip). */
function Price({ value, type }: { value: number | null; type: string }) {
  if (value == null) return <span className="bnk-table__empty-cell">–</span>;
  if (Math.abs(value) < 1e6 || groupOf(type) === 'BOND' || groupOf(type) === 'REPO') return <>{format.price(value, type)}</>;
  return <DS.Amount value={value} compact={1e6} />;
}

function Quoted({ price, size, type }: { price: number | null; size: number | null; type: string }) {
  if (price == null) return <span className="bnk-table__empty-cell">–</span>;
  return (
    <span className="scr-quote">
      <Price value={price} type={type} />
      {size != null && <span className="scr-quote__size">{`${format.compact(size) ?? size.toLocaleString('de-DE')}${NB}Stk.`}</span>}
    </span>
  );
}

/** Volume with a bar on a log scale (volumes span ten orders of magnitude). */
function VolumeBar({ value, max }: { value: number | null; max: number }) {
  if (value == null) return <span className="bnk-table__empty-cell">–</span>;
  const w = value > 0 && max > 1 ? Math.max(4, (Math.log10(value + 1) / Math.log10(max + 1)) * 100) : 0;
  return (
    <span className="scr-vol">
      <span className="scr-vol__bar" aria-hidden="true">
        <i style={{ width: `${w}%` }} />
      </span>
      <DS.Amount value={value} compact />
    </span>
  );
}

function cellFor(k: ColKey, now: number, maxVolume: number): DataTableColumn<ScreenRow> {
  const c = column(k);
  const base = { key: k, label: c.label, mobileLabel: c.short, sortable: true, defaultDir: c.dir, sortValue: (r: ScreenRow) => c.value(r) as number | string };
  switch (k) {
    case 'kurs':
      return { ...base, type: 'price', render: (r) => <Price value={r.last} type={r.type} /> };
    case 'ver':
      return { ...base, type: 'change', render: (r) => <Change value={r.change} /> };
    case 'geld':
      return { ...base, type: 'price', render: (r) => <Quoted price={r.bid} size={r.bidSize} type={r.type} /> };
    case 'brief':
      return { ...base, type: 'price', render: (r) => <Quoted price={r.ask} size={r.askSize} type={r.type} /> };
    case 'spr':
      return { ...base, type: 'percent', render: (r) => (r.spread == null ? '–' : pct(r.spread)) };
    case 'ums':
      return { ...base, type: 'currency', render: (r) => <VolumeBar value={r.volume} max={maxVolume} /> };
    case 'tr':
      return { ...base, type: 'number', accessor: (r) => r.trades };
    case 'bw':
      return { ...base, type: 'currency', accessor: (r) => r.bookValue };
    case 'zins':
      return { ...base, type: 'percent', render: (r) => (r.rate == null ? '–' : pct(r.rate, 2)) };
    case 'rt':
      return { ...base, type: 'percent', render: (r) => (r.yieldPerDay == null ? '–' : ratePct(r.yieldPerDay)) };
    case 'lz':
      return { ...base, type: 'number', render: (r) => (r.maturity == null ? '–' : span(r.maturity - now)) };
    case 'em':
      return {
        ...base,
        type: 'text',
        render: (r) =>
          r.issuer == null ? '–' : r.issuerAsin ? <a className="scr-issuer" href={`/unternehmen/${r.issuerAsin}`}>{r.issuer}</a> : r.issuer,
      };
    case 'gr':
      return { ...base, type: 'number', unit: 'm²', compact: false, accessor: (r) => r.size };
    case 'qm':
      return { ...base, type: 'currency', accessor: (r) => r.perSqm };
  }
}

const one = (g: ScreenRow['group']) => GROUPS.find((x) => x.value === g)?.one ?? g;

function ResultsTable({ rows, screen, now, sort, setParam, maxVolume }: { rows: ScreenRow[]; screen: Screen; now: number; sort: NonNullable<Screen['sort']>; setParam: SetParam; maxVolume: number }) {
  const mixed = screen.types.length !== 1;
  const columns = useMemo<DataTableColumn<ScreenRow>[]>(
    () => [
      {
        key: 'name',
        label: 'Wertpapier',
        type: 'stock',
        sticky: true,
        sortable: true,
        defaultDir: 'asc',
        sortValue: (r) => r.name,
        accessor: (r) => ({ name: r.name, ticker: r.asin, meta: mixed ? one(r.group) : undefined }),
      },
      ...visibleColumns(screen).map((k) => cellFor(k, now, maxVolume)),
    ],
    [screen, now, maxVolume, mixed],
  );
  return (
    <DS.DataTable
      className="scr-table"
      columns={columns}
      rows={rows}
      rowKey="asin"
      density="sm"
      sort={sort}
      onSortChange={(s) => setParam({ sort: sortParam(s as Screen['sort']), seite: null })}
      getRowHref={(r) => href(r.asin)}
      caption="Wertpapiere nach Filter"
      empty={<DS.EmptyState compact symbol={false} title="Nichts gefunden">Lockere einen Filter oder such nach Name oder ASIN.</DS.EmptyState>}
    />
  );
}

/** Phone: compact list – name, price and change; the sort figure (or volume) as meta. */
function PhoneList({ rows, sort, now }: { rows: ScreenRow[]; sort: NonNullable<Screen['sort']>; now: number }) {
  if (!rows.length)
    return (
      <DS.EmptyState compact symbol={false} title="Nichts gefunden">
        Lockere einen Filter oder such nach Name oder ASIN.
      </DS.EmptyState>
    );
  const metaKey: ColKey = sort.key === 'name' || sort.key === 'kurs' || sort.key === 'ver' ? 'ums' : sort.key;
  const c = column(metaKey);
  const metaText = (r: ScreenRow) => {
    const v = c.value(r);
    if (v == null) return `${c.short} –`;
    if (metaKey === 'lz') return `${c.short} ${span((v as number) - now)}`;
    if (metaKey === 'em') return String(v);
    if (metaKey === 'rt') return `${c.short} ${ratePct(v as number)}`;
    if (c.unit === '%') return `${c.short} ${pct(v as number)}`;
    if (c.unit === '€') return `${c.short} ${format.money(v as number, '€', 2, true)}`;
    return `${c.short} ${(v as number).toLocaleString('de-DE')}${c.unit ? NB + c.unit : ''}`;
  };
  return (
    <ul className="bnk-list scr-list">
      {rows.map((r) => (
        <DS.StockRow
          key={r.asin}
          name={r.name}
          ticker={r.asin}
          meta={metaText(r)}
          price={r.last ?? '–'}
          listingType={r.type}
          change={r.change ?? 0}
          href={href(r.asin)}
        />
      ))}
    </ul>
  );
}

// ---------- Screener ----------

export interface ScreenerProps {
  /** rows of the chosen types before the other filters (distributions in the filter sheet) */
  base: ScreenRow[];
  screen: Screen;
  params: URLSearchParams;
  setParam: SetParam;
  text: string;
  setText: (t: string) => void;
  /** filtered and sorted rows of the current page */
  pageRows: ScreenRow[];
  total: number | undefined;
  sort: NonNullable<Screen['sort']>;
  now: number;
  maxVolume: number;
  loading: boolean;
  error: Error | null;
  /** where the rows come from and what is missing */
  note: string;
  isPhone: boolean;
  /** own view instead of the table (buildings overview, warrants) */
  special: ReactNode;
  pagination: ReactNode;
  /** building overview ↔ list switch, shown for buildings only */
  estateSwitch: ReactNode;
}

export function Screener(p: ScreenerProps) {
  const { screen, params, setParam, isPhone } = p;
  // ?filter=1 opens the sheet on arrival (links, screenshots); closing does not touch the URL.
  const [open, setOpen] = useState(() => params.get('filter') === '1');
  const count = filterCount(screen);
  const preset = activePreset(params);
  const sortOptions = useMemo(
    () => [
      { value: 'name:asc', label: 'Name A–Z' },
      ...visibleColumns(screen)
        .filter((k) => k !== 'geld' && k !== 'em')
        .flatMap((k) => {
          const c = column(k);
          const [first, second] = c.dir === 'desc' ? ['desc', 'asc'] : ['asc', 'desc'];
          const word = (d: string) => (d === 'desc' ? 'absteigend' : 'aufsteigend');
          return [
            { value: `${k}:${first}`, label: `${c.short} ${first === 'desc' ? '↓' : '↑'} ${word(first)}` },
            { value: `${k}:${second}`, label: `${c.short} ${second === 'desc' ? '↓' : '↑'} ${word(second)}` },
          ];
        }),
    ],
    [screen],
  );
  const filterButton = (
    <DS.Button size="sm" variant="secondary" iconStart={<DS.Icon name="filter" size={16} />} onClick={() => setOpen(true)} aria-haspopup="dialog">
      Filter
      {count > 0 && <span className="scr-badge" aria-label={`${count} aktiv`}>{count}</span>}
    </DS.Button>
  );
  return (
    <>
      <div className="scr-bar">
        <div className="scr-bar__row">
          <DS.Input
            className="scr-bar__search"
            type="search"
            size="sm"
            aria-label="Name, ASIN oder Emittent"
            placeholder="Name, ASIN oder Emittent"
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
          />
          {!isPhone && (
            <DS.DropdownMenu
              size="sm"
              label={preset ? `Vorlage: ${preset.label}` : 'Vorlagen'}
              align="end"
              items={PRESETS.map((x) => ({
                label: x.label,
                description: x.description,
                meta: preset?.id === x.id ? '✓' : undefined,
                onSelect: () => setParam(presetChanges(x)),
              }))}
            />
          )}
          {filterButton}
        </div>
        <TypeToggles types={screen.types} onChange={(art) => setParam({ art, seite: null, sp: null, sort: null, immo: null })} />
        <Chips screen={screen} setParam={setParam} onOpen={() => setOpen(true)} />
      </div>
      <div className="scr-status">
        <span className="scr-status__count">
          {p.special ? '\u00a0' : p.total == null ? 'Lädt …' : `${p.total.toLocaleString('de-DE')} Treffer`}
          {!isPhone && !p.special && <span className="scr-status__note">{p.note}</span>}
        </span>
        {p.estateSwitch}
        {isPhone && !p.special && (
          <DS.Select
            aria-label="Sortieren"
            size="sm"
            fullWidth={false}
            value={`${p.sort.key}:${p.sort.dir}`}
            options={sortOptions.some((o) => o.value === `${p.sort.key}:${p.sort.dir}`) ? sortOptions : [{ value: `${p.sort.key}:${p.sort.dir}`, label: 'Sortierung' }, ...sortOptions]}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(':');
              setParam({ sort: sortParam({ key: key as ColKey, dir: dir as 'asc' | 'desc' }), seite: null });
            }}
          />
        )}
      </div>
      <div className="panel__fill scroll market__results">
        {p.special ??
          (p.loading ? (
            <DS.Loading rows={10} label="Wertpapiere werden geladen" />
          ) : p.error ? (
            <DS.Banner variant="error">Laden fehlgeschlagen: {p.error.message}</DS.Banner>
          ) : isPhone ? (
            <PhoneList rows={p.pageRows} sort={p.sort} now={p.now} />
          ) : (
            <ResultsTable rows={p.pageRows} screen={screen} now={p.now} sort={p.sort} setParam={setParam} maxVolume={p.maxVolume} />
          ))}
      </div>
      {p.pagination}
      <FilterSheet open={open} onClose={() => setOpen(false)} screen={screen} params={params} setParam={setParam} count={p.total} isPhone={isPhone} base={p.base} now={p.now} />
    </>
  );
}
